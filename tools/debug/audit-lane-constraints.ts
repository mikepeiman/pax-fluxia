import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
    buildLaneAwareConnections,
    debugResolveLaneConnection,
    generateConnections,
    listDelaunayConnections,
    pointToSegmentDistance,
    type Connectable,
    type LaneAdjustmentStyle,
    type LaneBuildMode,
    type LaneConstraintStatus,
    type LaneDecisionTrace,
    type LanePathKind,
    type MapConnection,
    type MapLaneMode,
} from '../../common/src/mapgen/index.ts';

type JsonMap = Record<string, unknown>;
type SavedMap = { metadata?: { name?: string }; stars: Array<{ id: string; x: number; y: number }>; connections: Array<{ sourceId: string; targetId: string; distance?: number; laneWaypoints?: Array<[number, number]>; lanePathKind?: LanePathKind; laneConstraintStatus?: LaneConstraintStatus }> };
type AuditOptions = { width: number; height: number; minLinksPerStar: number; maxLinksPerStar: number; laneMode: MapLaneMode; laneMarginPx: number; reshapeBias: number; adjustedPathStyle: LaneAdjustmentStyle; connectivityMode: LaneBuildMode; metricsDir: string; savedMapPath?: string; label: string };
type BlockingStar = { starId: string; distancePx: number; point: { x: number; y: number } };
type AuditedConnection = { key: string; sourceId: string; targetId: string; origin: 'authored' | 'generated' | 'bridge' | 'connectivity_restore'; laneConstraintStatus: LaneConstraintStatus; finalPathKind: LanePathKind | 'missing'; waypointCount: number; straightLineDistancePx: number; straightLineMinDistancePx: number; straightLinePassesRequested: boolean; finalMinDistancePx: number; closestStarId: string | null; closestPoint: { x: number; y: number } | null; blockingStars: BlockingStar[]; attemptCount: number; rejectionReasons: string[]; trace: LaneDecisionTrace; laneWaypoints: Array<[number, number]> };
type AuditResult = { label: string; savedMapPath?: string; connectivityMode: LaneBuildMode; laneMarginPx: number; reshapeBias: number; adjustedPathStyle: LaneAdjustmentStyle; connectionCount: number; componentCount: number; straightOkCount: number; reshapedAngularCount: number; reshapedCurvedCount: number; constraintUnsatisfiedAuthoredCount: number; removedForConstraintCount: number; connectivityRestoreCount: number; falsePositiveCurveCount: number; falseNegativeStraightCount: number; adjustedButStillViolatingCount: number; auditedConnections: AuditedConnection[] };

const ROOT = path.resolve(import.meta.dir, '..', '..');
const DEFAULT_METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');
const CURRENT_SETTINGS_PATH = path.join(ROOT, 'common', 'resources', 'settings-live', 'current-settings.json');
const EPS = 0.1;

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const edgeKey = (a: string, b: string) => (a <= b ? `${a}|${b}` : `${b}|${a}`);

function parseArgs(argv: string[]): Record<string, string> {
    const args: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]!;
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) args[key] = 'true';
        else { args[key] = next; i += 1; }
    }
    return args;
}

function loadCurrentSettings(): JsonMap {
    try { return JSON.parse(readFileSync(CURRENT_SETTINGS_PATH, 'utf8')) as JsonMap; }
    catch { return {}; }
}

function buildOptions(): AuditOptions {
    const current = loadCurrentSettings();
    const args = parseArgs(process.argv.slice(2));
    const savedMapArg = args['saved-map'];
    const savedMapPath = savedMapArg ? (path.isAbsolute(savedMapArg) ? savedMapArg : path.resolve(ROOT, savedMapArg)) : undefined;
    const connectivityMode = (args['connectivity-mode'] ?? (args['recompute-connectivity'] === 'true' ? 'recompute_connectivity' : 'preserve_authored')) === 'recompute_connectivity' ? 'recompute_connectivity' : 'preserve_authored';
    const parseNumber = (value: string | undefined, fallback: number) => value === undefined ? fallback : (Number.isFinite(Number(value)) ? Number(value) : fallback);
    return {
        width: parseNumber(args['width'], 1600),
        height: parseNumber(args['height'], 900),
        minLinksPerStar: parseNumber(args['min-links'], Number(current.MIN_LINKS_PER_STAR ?? 1)),
        maxLinksPerStar: parseNumber(args['max-links'], Number(current.MAX_LINKS_PER_STAR ?? 6)),
        laneMode: (args['lane-mode'] === 'straight' ? 'straight' : String(current.MAPGEN_LANE_MODE ?? 'curved')) as MapLaneMode,
        laneMarginPx: parseNumber(args['lane-margin'], Number(current.MAPGEN_LANE_MARGIN_PX ?? 75)),
        reshapeBias: clamp01(parseNumber(args['reshape-bias'] ?? args['remap-bias'], Number(current.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 1))),
        adjustedPathStyle: (args['adjusted-style'] === 'angular' ? 'angular' : String(current.MAPGEN_LANE_ADJUSTED_PATH_STYLE ?? 'curved')) as LaneAdjustmentStyle,
        connectivityMode,
        metricsDir: args['metrics-dir'] ? path.resolve(args['metrics-dir']) : DEFAULT_METRICS_DIR,
        savedMapPath,
        label: args['label'] ?? (savedMapPath ? path.basename(savedMapPath, path.extname(savedMapPath)) : 'lane-constraint-audit'),
    };
}

function loadSavedMap(savedMapPath: string): SavedMap {
    return JSON.parse(readFileSync(savedMapPath, 'utf8')) as SavedMap;
}

function nearestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-9) return { x: ax, y: ay, distance: Math.hypot(px - ax, py - ay) };
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const x = ax + dx * t, y = ay + dy * t;
    return { x, y, distance: Math.hypot(px - x, py - y) };
}

function nearestPointOnPolyline(px: number, py: number, pts: Array<[number, number]>) {
    let best = { x: pts[0]![0], y: pts[0]![1], distance: Number.POSITIVE_INFINITY };
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i]!, [bx, by] = pts[i + 1]!;
        const candidate = nearestPointOnSegment(px, py, ax, ay, bx, by);
        if (candidate.distance < best.distance) best = candidate;
    }
    return best;
}

function countComponents(nodes: Connectable[], connections: MapConnection[]): number {
    const adj = new Map<string, string[]>(); for (const node of nodes) adj.set(node.id, []);
    for (const connection of connections) { adj.get(connection.sourceId)?.push(connection.targetId); adj.get(connection.targetId)?.push(connection.sourceId); }
    const seen = new Set<string>(); let count = 0;
    for (const node of nodes) {
        if (seen.has(node.id)) continue;
        count += 1; const stack = [node.id]; seen.add(node.id);
        while (stack.length) { const current = stack.pop()!; for (const next of adj.get(current) ?? []) if (!seen.has(next)) { seen.add(next); stack.push(next); } }
    }
    return count;
}

function buildSavedConnections(savedMap: SavedMap, pos: Map<string, Connectable>): MapConnection[] {
    return savedMap.connections.map((connection) => ({
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        distance: connection.distance ?? Math.hypot((pos.get(connection.targetId)?.x ?? 0) - (pos.get(connection.sourceId)?.x ?? 0), (pos.get(connection.targetId)?.y ?? 0) - (pos.get(connection.sourceId)?.y ?? 0)),
        laneWaypoints: connection.laneWaypoints?.map(([x, y]) => [x, y] as [number, number]),
        lanePathKind: connection.lanePathKind,
        laneConstraintStatus: connection.laneConstraintStatus,
    }));
}

function blockingStars(connection: Pick<MapConnection, 'sourceId' | 'targetId' | 'laneWaypoints'>, nodes: Connectable[]): BlockingStar[] {
    const pts = connection.laneWaypoints ?? [];
    if (pts.length < 2) return [];
    return nodes
        .filter((node) => node.id !== connection.sourceId && node.id !== connection.targetId)
        .map((node) => {
            const nearest = nearestPointOnPolyline(node.x, node.y, pts);
            return { starId: node.id, distancePx: round(nearest.distance), point: { x: round(nearest.x), y: round(nearest.y) } };
        })
        .sort((a, b) => a.distancePx - b.distancePx);
}

function emptyTrace(connection: MapConnection, source: Connectable, target: Connectable, nodes: Connectable[], laneMarginPx: number): LaneDecisionTrace {
    const straightLineMinDistancePx = nodes.filter((node) => node.id !== connection.sourceId && node.id !== connection.targetId).reduce((nearest, node) => Math.min(nearest, pointToSegmentDistance(node.x, node.y, source.x, source.y, target.x, target.y)), Number.POSITIVE_INFINITY);
    return { requestedClearancePx: laneMarginPx, effectiveClearancePx: laneMarginPx, chordDistancePx: connection.distance, chordMinClearancePx: straightLineMinDistancePx, chordPassesRequested: straightLineMinDistancePx >= laneMarginPx, chordPassesEffective: straightLineMinDistancePx >= laneMarginPx, straightBlockedByClearance: straightLineMinDistancePx < laneMarginPx, straightBlockedByLaneCross: false, finalPathKind: 'missing', finalMinClearancePx: straightLineMinDistancePx, finalPassesRequested: straightLineMinDistancePx >= laneMarginPx, finalReason: 'removed_for_constraint', attempts: [] };
}

function auditConnections(nodes: Connectable[], savedMap: SavedMap, options: AuditOptions): AuditResult {
    const pos = new Map(nodes.map((node) => [node.id, node]));
    const authoredConnections = buildSavedConnections(savedMap, pos);
    const preferredConnections = options.connectivityMode === 'preserve_authored'
        ? authoredConnections
        : generateConnections(nodes, Infinity, options.minLinksPerStar, options.maxLinksPerStar, options.laneMarginPx, options.reshapeBias);
    const preferredKeys = new Set(preferredConnections.map((connection) => edgeKey(connection.sourceId, connection.targetId)));
    const candidateConnections = listDelaunayConnections(nodes, Infinity).filter((connection) => !preferredKeys.has(edgeKey(connection.sourceId, connection.targetId)));
    const finalConnections = buildLaneAwareConnections(nodes, preferredConnections, candidateConnections, options.laneMode, options.laneMarginPx, options.reshapeBias, options.adjustedPathStyle, { buildMode: options.connectivityMode });
    const finalByKey = new Map(finalConnections.map((connection) => [edgeKey(connection.sourceId, connection.targetId), connection]));
    const auditedConnections: AuditedConnection[] = [];

    const pushAudit = (connection: MapConnection, trace: LaneDecisionTrace, origin: AuditedConnection['origin'], statusOverride?: LaneConstraintStatus, pathKindOverride?: LanePathKind | 'missing') => {
        const key = edgeKey(connection.sourceId, connection.targetId);
        const source = pos.get(connection.sourceId)!, target = pos.get(connection.targetId)!;
        const laneWaypoints = connection.laneWaypoints ?? [[source.x, source.y], [target.x, target.y]];
        const straightLineMinDistancePx = nodes.filter((node) => node.id !== connection.sourceId && node.id !== connection.targetId).reduce((nearest, node) => Math.min(nearest, pointToSegmentDistance(node.x, node.y, source.x, source.y, target.x, target.y)), Number.POSITIVE_INFINITY);
        const blockers = blockingStars({ sourceId: connection.sourceId, targetId: connection.targetId, laneWaypoints }, nodes);
        auditedConnections.push({
            key,
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            origin,
            laneConstraintStatus: statusOverride ?? connection.laneConstraintStatus ?? 'straight_ok',
            finalPathKind: pathKindOverride ?? connection.lanePathKind ?? 'straight',
            waypointCount: laneWaypoints.length,
            straightLineDistancePx: round(connection.distance),
            straightLineMinDistancePx: round(straightLineMinDistancePx),
            straightLinePassesRequested: straightLineMinDistancePx >= options.laneMarginPx - EPS,
            finalMinDistancePx: blockers[0]?.distancePx ?? Number.POSITIVE_INFINITY,
            closestStarId: blockers[0]?.starId ?? null,
            closestPoint: blockers[0]?.point ?? null,
            blockingStars: blockers,
            attemptCount: trace.attempts.length,
            rejectionReasons: trace.attempts.filter((attempt) => !attempt.accepted).map((attempt) => `${attempt.candidateKind}:${attempt.reason}`),
            trace,
            laneWaypoints,
        });
    };

    for (const preferred of preferredConnections.slice().sort((a, b) => a.distance - b.distance)) {
        const key = edgeKey(preferred.sourceId, preferred.targetId);
        const source = pos.get(preferred.sourceId), target = pos.get(preferred.targetId);
        if (!source || !target) continue;
        const { connection, trace } = debugResolveLaneConnection(source, target, nodes, [], nodes.map((node) => ({ x: node.x, y: node.y })), options.laneMode, options.laneMarginPx, options.reshapeBias, options.adjustedPathStyle);
        const finalConnection = finalByKey.get(key);
        if (finalConnection) pushAudit(finalConnection, connection ? trace : { ...trace, finalReason: 'constraint_preserved_in_final_graph' }, options.connectivityMode === 'preserve_authored' ? 'authored' : 'generated');
        else if (options.connectivityMode === 'preserve_authored') {
            const unresolved: MapConnection = { sourceId: preferred.sourceId, targetId: preferred.targetId, distance: preferred.distance, laneWaypoints: [[source.x, source.y], [target.x, target.y]], lanePathKind: 'straight', laneConstraintStatus: 'constraint_unsatisfied_authored' };
            const unresolvedTrace = { ...(connection ? trace : emptyTrace(preferred, source, target, nodes, options.laneMarginPx)), finalPathKind: 'straight', finalReason: 'constraint_unsatisfied_authored' } as LaneDecisionTrace;
            pushAudit(unresolved, unresolvedTrace, 'authored', 'constraint_unsatisfied_authored');
        } else {
            pushAudit({ sourceId: preferred.sourceId, targetId: preferred.targetId, distance: preferred.distance, laneWaypoints: [[source.x, source.y], [target.x, target.y]], lanePathKind: 'straight', laneConstraintStatus: 'removed_for_constraint' }, emptyTrace(preferred, source, target, nodes, options.laneMarginPx), 'generated', 'removed_for_constraint', 'missing');
        }
    }

    for (const finalConnection of finalConnections) {
        const key = edgeKey(finalConnection.sourceId, finalConnection.targetId);
        if (auditedConnections.some((connection) => connection.key === key)) continue;
        const source = pos.get(finalConnection.sourceId), target = pos.get(finalConnection.targetId);
        if (!source || !target) continue;
        const { trace } = debugResolveLaneConnection(source, target, nodes, [], nodes.map((node) => ({ x: node.x, y: node.y })), options.laneMode, options.laneMarginPx, options.reshapeBias, options.adjustedPathStyle);
        pushAudit(finalConnection, { ...trace, finalReason: finalConnection.laneConstraintStatus ?? trace.finalReason }, finalConnection.laneConstraintStatus === 'connectivity_restore' ? 'connectivity_restore' : 'bridge');
    }

    const result: AuditResult = {
        label: options.label,
        savedMapPath: options.savedMapPath,
        connectivityMode: options.connectivityMode,
        laneMarginPx: options.laneMarginPx,
        reshapeBias: options.reshapeBias,
        adjustedPathStyle: options.adjustedPathStyle,
        connectionCount: auditedConnections.length,
        componentCount: countComponents(nodes, finalConnections),
        straightOkCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'straight_ok').length,
        reshapedAngularCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'reshaped_ok_angular').length,
        reshapedCurvedCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'reshaped_ok_curved').length,
        constraintUnsatisfiedAuthoredCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'constraint_unsatisfied_authored').length,
        removedForConstraintCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'removed_for_constraint').length,
        connectivityRestoreCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'connectivity_restore').length,
        falsePositiveCurveCount: auditedConnections.filter((c) => (c.laneConstraintStatus === 'reshaped_ok_angular' || c.laneConstraintStatus === 'reshaped_ok_curved') && c.straightLinePassesRequested).length,
        falseNegativeStraightCount: auditedConnections.filter((c) => c.laneConstraintStatus === 'straight_ok' && !c.straightLinePassesRequested).length,
        adjustedButStillViolatingCount: auditedConnections.filter((c) => (c.laneConstraintStatus === 'reshaped_ok_angular' || c.laneConstraintStatus === 'reshaped_ok_curved') && c.finalMinDistancePx < options.laneMarginPx - EPS).length,
        auditedConnections,
    };
    return result;
}

function renderSvg(nodes: Connectable[], audit: AuditResult, options: AuditOptions): string {
    const stroke: Record<LaneConstraintStatus, string> = { straight_ok: '#f8fafc', reshaped_ok_angular: '#f59e0b', reshaped_ok_curved: '#38bdf8', constraint_unsatisfied_authored: '#ef4444', removed_for_constraint: '#ef4444', connectivity_restore: '#e879f9' };
    const straightLines = audit.auditedConnections.filter((c) => c.finalPathKind !== 'missing').map((c) => { const a = nodes.find((n) => n.id === c.sourceId)!; const b = nodes.find((n) => n.id === c.targetId)!; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 5" opacity="0.55" />`; }).join('\n');
    const lanes = audit.auditedConnections.filter((c) => c.finalPathKind !== 'missing').map((c) => `<path d="${c.laneWaypoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')}" fill="none" stroke="${stroke[c.laneConstraintStatus]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`).join('\n');
    const witnesses = audit.auditedConnections.filter((c) => c.closestStarId && c.closestPoint).map((c, i) => { const star = nodes.find((n) => n.id === c.closestStarId)!; const color = stroke[c.laneConstraintStatus]; return `<line x1="${star.x}" y1="${star.y}" x2="${c.closestPoint!.x}" y2="${c.closestPoint!.y}" stroke="${color}" stroke-width="2" stroke-dasharray="6 4" /><text x="${c.closestPoint!.x + 8}" y="${c.closestPoint!.y - 8 - i * 2}" fill="${color}" font-size="12" font-family="Consolas, monospace">${edgeKey(c.sourceId, c.targetId)} ${c.finalMinDistancePx}/${options.laneMarginPx}</text>`; }).join('\n');
    const stars = nodes.map((n) => `<g><circle cx="${n.x}" cy="${n.y}" r="10" fill="#111827" stroke="#94a3b8" stroke-width="2" /><text x="${n.x + 14}" y="${n.y + 4}" fill="#cbd5e1" font-size="12" font-family="Consolas, monospace">${n.id}</text></g>`).join('\n');
    const legend = [`Label: ${audit.label}`, `Map: ${audit.savedMapPath ? path.basename(audit.savedMapPath) : 'none'}`, `Connectivity mode: ${audit.connectivityMode}`, `Lane margin: ${options.laneMarginPx}px`, `Reshape bias: ${options.reshapeBias}`, `Adjusted style: ${options.adjustedPathStyle}`, `straight_ok: ${audit.straightOkCount}`, `reshaped_ok_angular: ${audit.reshapedAngularCount}`, `reshaped_ok_curved: ${audit.reshapedCurvedCount}`, `constraint_unsatisfied_authored: ${audit.constraintUnsatisfiedAuthoredCount}`, `removed_for_constraint: ${audit.removedForConstraintCount}`, `connectivity_restore: ${audit.connectivityRestoreCount}`];
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}"><rect x="0" y="0" width="${options.width}" height="${options.height}" fill="#020617" />${straightLines}${lanes}${witnesses}${stars}<g transform="translate(24 24)"><rect x="0" y="0" width="440" height="236" rx="12" fill="rgba(2,6,23,0.86)" stroke="#334155" stroke-width="1" />${legend.map((line, i) => `<text x="16" y="${26 + i * 18}" fill="#e2e8f0" font-size="14" font-family="Consolas, monospace">${line}</text>`).join('')}<text x="16" y="226" fill="#f8fafc" font-size="12" font-family="Consolas, monospace">gray dashed = straight line, white = straight_ok, amber = angular, cyan = curved, red = authored unresolved/removed, magenta = connectivity_restore</text></g></svg>`;
}

function writeOutputs(nodes: Connectable[], audit: AuditResult, options: AuditOptions) {
    mkdirSync(options.metricsDir, { recursive: true });
    const jsonPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.json');
    const svgPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.svg');
    const markdownPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.md');
    writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
    writeFileSync(svgPath, renderSvg(nodes, audit, options), 'utf8');
    const lines = [`# Lane Constraint Audit`, ``, `- label: ${audit.label}`, `- saved map: ${audit.savedMapPath ?? 'none'}`, `- connectivity mode: ${audit.connectivityMode}`, `- lane margin: ${audit.laneMarginPx}px`, `- reshape bias: ${audit.reshapeBias}`, `- adjusted style: ${audit.adjustedPathStyle}`, `- connections: ${audit.connectionCount}`, `- components: ${audit.componentCount}`, `- straight_ok: ${audit.straightOkCount}`, `- reshaped_ok_angular: ${audit.reshapedAngularCount}`, `- reshaped_ok_curved: ${audit.reshapedCurvedCount}`, `- constraint_unsatisfied_authored: ${audit.constraintUnsatisfiedAuthoredCount}`, `- removed_for_constraint: ${audit.removedForConstraintCount}`, `- connectivity_restore: ${audit.connectivityRestoreCount}`, `- false_positive_curve: ${audit.falsePositiveCurveCount}`, `- false_negative_straight: ${audit.falseNegativeStraightCount}`, `- adjusted_but_still_violating: ${audit.adjustedButStillViolatingCount}`, ``, `## Connections`, ``, ...audit.auditedConnections.flatMap((c) => [`### ${c.key}`, `- status: ${c.laneConstraintStatus}`, `- origin: ${c.origin}`, `- final path kind: ${c.finalPathKind}`, `- straight-line min distance: ${c.straightLineMinDistancePx}px`, `- final min distance: ${c.finalMinDistancePx}px`, `- straight-line passes requested margin: ${c.straightLinePassesRequested}`, `- attempts: ${c.attemptCount}`, `- rejection reasons: ${c.rejectionReasons.join(', ') || 'none'}`, `- final reason: ${c.trace.finalReason}`, `- closest star: ${c.closestStarId ?? 'n/a'}`, ``])];
    writeFileSync(markdownPath, lines.join('\n'), 'utf8');
    return { jsonPath, svgPath, markdownPath };
}

function main(): void {
    const options = buildOptions();
    if (!options.savedMapPath) throw new Error('This audit requires --saved-map so the star layout is frozen.');
    const savedMap = loadSavedMap(options.savedMapPath);
    const nodes = savedMap.stars.map((star) => ({ id: star.id, x: star.x, y: star.y }));
    const audit = auditConnections(nodes, savedMap, options);
    const outputs = writeOutputs(nodes, audit, options);
    console.log(JSON.stringify({ ok: true, ...outputs, summary: { componentCount: audit.componentCount, straightOkCount: audit.straightOkCount, reshapedAngularCount: audit.reshapedAngularCount, reshapedCurvedCount: audit.reshapedCurvedCount, constraintUnsatisfiedAuthoredCount: audit.constraintUnsatisfiedAuthoredCount, removedForConstraintCount: audit.removedForConstraintCount, connectivityRestoreCount: audit.connectivityRestoreCount, falsePositiveCurveCount: audit.falsePositiveCurveCount, falseNegativeStraightCount: audit.falseNegativeStraightCount, adjustedButStillViolatingCount: audit.adjustedButStillViolatingCount, connectionCount: audit.connectionCount } }));
}

main();
