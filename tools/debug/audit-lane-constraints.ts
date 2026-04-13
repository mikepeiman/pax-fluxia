import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
    debugResolveLaneConnection,
    generateConnections,
    listDelaunayConnections,
    pointToSegmentDistance,
    type Connectable,
    type LaneAdjustmentStyle,
    type LaneDecisionTrace,
    type LanePathKind,
    type MapConnection,
    type MapLaneMode,
} from '../../common/src/mapgen/index.ts';

type JsonMap = Record<string, unknown>;

interface SavedMapStar {
    id: string;
    x: number;
    y: number;
}

interface SavedMapDefinition {
    metadata?: {
        name?: string;
    };
    stars: SavedMapStar[];
}

interface AuditOptions {
    width: number;
    height: number;
    minLinksPerStar: number;
    maxLinksPerStar: number;
    laneMode: MapLaneMode;
    laneMarginPx: number;
    remapBias: number;
    adjustedPathStyle: LaneAdjustmentStyle;
    metricsDir: string;
    savedMapPath?: string;
    label: string;
}

interface SegmentWitness {
    x: number;
    y: number;
    distance: number;
    t: number;
    segmentIndex: number;
}

interface LaneWitness {
    starId: string;
    distancePx: number;
    point: { x: number; y: number };
}

interface AuditedConnection {
    key: string;
    sourceId: string;
    targetId: string;
    origin: 'preferred' | 'bridge';
    pathKind: LanePathKind;
    waypointCount: number;
    chordDistancePx: number;
    chordMinClearancePx: number;
    finalMinClearancePx: number;
    closestStarId: string | null;
    closestPoint: { x: number; y: number } | null;
    classification:
        | 'ok_straight'
        | 'ok_adjusted'
        | 'connectivity_override_straight'
        | 'false_positive_curve'
        | 'false_negative_straight'
        | 'adjusted_but_still_violating';
    trace: LaneDecisionTrace;
    laneWaypoints: Array<[number, number]>;
}

interface AuditResult {
    label: string;
    savedMapPath?: string;
    laneMarginPx: number;
    remapBias: number;
    adjustedPathStyle: LaneAdjustmentStyle;
    connectionCount: number;
    componentCount: number;
    straightCount: number;
    angularCount: number;
    curvedCount: number;
    falsePositiveCurveCount: number;
    falseNegativeStraightCount: number;
    connectivityOverrideStraightCount: number;
    adjustedButStillViolatingCount: number;
    auditedConnections: AuditedConnection[];
}

const ROOT = path.resolve(import.meta.dir, '..', '..');
const DEFAULT_METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');
const CLEARANCE_EPSILON_PX = 0.1;
const CURRENT_SETTINGS_PATH = path.join(
    ROOT,
    'common',
    'resources',
    'settings-live',
    'current-settings.json',
);

function parseArgs(argv: string[]): Record<string, string> {
    const args: Record<string, string> = {};
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index]!;
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[index + 1];
        if (!next || next.startsWith('--')) {
            args[key] = 'true';
            continue;
        }
        args[key] = next;
        index += 1;
    }
    return args;
}

function parseNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function round(value: number, digits: number = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function loadCurrentSettings(): JsonMap {
    try {
        return JSON.parse(readFileSync(CURRENT_SETTINGS_PATH, 'utf8')) as JsonMap;
    } catch {
        return {};
    }
}

function buildOptions(): AuditOptions {
    const current = loadCurrentSettings();
    const args = parseArgs(process.argv.slice(2));
    const savedMapArg = args['saved-map'];
    const savedMapPath = savedMapArg
        ? path.isAbsolute(savedMapArg)
            ? savedMapArg
            : path.resolve(ROOT, savedMapArg)
        : undefined;
    const label = args['label']
        ?? (savedMapPath ? path.basename(savedMapPath, path.extname(savedMapPath)) : 'lane-constraint-audit');

    return {
        width: parseNumber(args['width'], 1600),
        height: parseNumber(args['height'], 900),
        minLinksPerStar: parseNumber(args['min-links'], Number(current.MIN_LINKS_PER_STAR ?? 1)),
        maxLinksPerStar: parseNumber(args['max-links'], Number(current.MAX_LINKS_PER_STAR ?? 6)),
        laneMode: (args['lane-mode'] === 'straight' ? 'straight' : String(current.MAPGEN_LANE_MODE ?? 'curved')) as MapLaneMode,
        laneMarginPx: parseNumber(args['lane-margin'], Number(current.MAPGEN_LANE_MARGIN_PX ?? 75)),
        remapBias: clamp01(parseNumber(args['remap-bias'], Number(current.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 1))),
        adjustedPathStyle: (args['adjusted-style'] === 'angular' ? 'angular' : String(current.MAPGEN_LANE_ADJUSTED_PATH_STYLE ?? 'curved')) as LaneAdjustmentStyle,
        metricsDir: args['metrics-dir'] ? path.resolve(args['metrics-dir']) : DEFAULT_METRICS_DIR,
        savedMapPath,
        label,
    };
}

function loadNodesFromSavedMap(savedMapPath: string): Connectable[] {
    const savedMap = JSON.parse(readFileSync(savedMapPath, 'utf8')) as SavedMapDefinition;
    return savedMap.stars.map((star) => ({
        id: star.id,
        x: star.x,
        y: star.y,
    }));
}

function edgeKey(a: string, b: string): string {
    return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function polylineToSegments(pts: Array<[number, number]>) {
    const out: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
        out.push({ ax: pts[i]![0], ay: pts[i]![1], bx: pts[i + 1]![0], by: pts[i + 1]![1] });
    }
    return out;
}

function buildComponentIndex(
    nodes: Connectable[],
    connections: MapConnection[],
): Map<string, number> {
    const adj = new Map<string, string[]>();
    for (const node of nodes) adj.set(node.id, []);
    for (const connection of connections) {
        adj.get(connection.sourceId)?.push(connection.targetId);
        adj.get(connection.targetId)?.push(connection.sourceId);
    }

    const componentIndex = new Map<string, number>();
    let componentId = 0;
    for (const node of nodes) {
        if (componentIndex.has(node.id)) continue;
        const stack = [node.id];
        componentIndex.set(node.id, componentId);
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const next of adj.get(current) ?? []) {
                if (componentIndex.has(next)) continue;
                componentIndex.set(next, componentId);
                stack.push(next);
            }
        }
        componentId += 1;
    }
    return componentIndex;
}

function countComponents(nodes: Connectable[], connections: MapConnection[]): number {
    return new Set(buildComponentIndex(nodes, connections).values()).size;
}

function buildFallbackBridgeCandidates(
    nodes: Connectable[],
    componentIndex: Map<string, number>,
    acceptedKeys: Set<string>,
): MapConnection[] {
    const out: MapConnection[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            const key = edgeKey(a.id, b.id);
            if (acceptedKeys.has(key)) continue;
            const aComponent = componentIndex.get(a.id);
            const bComponent = componentIndex.get(b.id);
            if (aComponent === undefined || bComponent === undefined || aComponent === bComponent) continue;
            out.push({
                sourceId: a.id,
                targetId: b.id,
                distance: Math.hypot(b.x - a.x, b.y - a.y),
            });
        }
    }
    out.sort((left, right) => left.distance - right.distance);
    return out;
}

function buildConnectivityOverrideCandidates(
    nodes: Connectable[],
    componentIndex: Map<string, number>,
    acceptedKeys: Set<string>,
): Array<MapConnection & { chordMinClearancePx: number }> {
    const out: Array<MapConnection & { chordMinClearancePx: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            const key = edgeKey(a.id, b.id);
            if (acceptedKeys.has(key)) continue;
            const aComponent = componentIndex.get(a.id);
            const bComponent = componentIndex.get(b.id);
            if (aComponent === undefined || bComponent === undefined || aComponent === bComponent) continue;
            const chordMinClearancePx = nodes
                .filter((node) => node.id !== a.id && node.id !== b.id)
                .reduce(
                    (nearest, node) => Math.min(nearest, pointToSegmentDistance(node.x, node.y, a.x, a.y, b.x, b.y)),
                    Number.POSITIVE_INFINITY,
                );
            out.push({
                sourceId: a.id,
                targetId: b.id,
                distance: Math.hypot(b.x - a.x, b.y - a.y),
                chordMinClearancePx,
            });
        }
    }
    out.sort((left, right) => {
        if (right.chordMinClearancePx !== left.chordMinClearancePx) {
            return right.chordMinClearancePx - left.chordMinClearancePx;
        }
        return left.distance - right.distance;
    });
    return out;
}

function nearestPointOnSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): SegmentWitness {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        const distance = Math.hypot(px - ax, py - ay);
        return { x: ax, y: ay, distance, t: 0, segmentIndex: -1 };
    }
    const rawT = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const t = Math.max(0, Math.min(1, rawT));
    const x = ax + dx * t;
    const y = ay + dy * t;
    return { x, y, distance: Math.hypot(px - x, py - y), t, segmentIndex: -1 };
}

function nearestPointOnPolyline(
    px: number,
    py: number,
    pts: Array<[number, number]>,
): SegmentWitness {
    let best: SegmentWitness = {
        x: pts[0]![0],
        y: pts[0]![1],
        distance: Number.POSITIVE_INFINITY,
        t: 0,
        segmentIndex: 0,
    };
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[i + 1]!;
        const candidate = nearestPointOnSegment(px, py, ax, ay, bx, by);
        if (candidate.distance < best.distance) {
            best = { ...candidate, segmentIndex: i };
        }
    }
    return best;
}

function computeWitness(
    connection: MapConnection,
    nodes: Connectable[],
): LaneWitness | null {
    const pts = connection.laneWaypoints ?? [];
    if (pts.length < 2) return null;
    let best: LaneWitness | null = null;
    for (const node of nodes) {
        if (node.id === connection.sourceId || node.id === connection.targetId) continue;
        const nearest = nearestPointOnPolyline(node.x, node.y, pts);
        if (!best || nearest.distance < best.distancePx) {
            best = {
                starId: node.id,
                distancePx: nearest.distance,
                point: { x: nearest.x, y: nearest.y },
            };
        }
    }
    return best;
}

function escapeXml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function auditConnections(nodes: Connectable[], options: AuditOptions): AuditResult {
    const preferredConnections = generateConnections(
        nodes,
        Infinity,
        options.minLinksPerStar,
        options.maxLinksPerStar,
        options.laneMarginPx,
        options.remapBias,
    );
    const preferredKeys = new Set(preferredConnections.map((connection) => edgeKey(connection.sourceId, connection.targetId)));
    const candidateConnections = listDelaunayConnections(nodes, Infinity)
        .filter((connection) => !preferredKeys.has(edgeKey(connection.sourceId, connection.targetId)));

    const pos = new Map(nodes.map((node) => [node.id, node]));
    const starCenters = nodes.map((node) => ({ x: node.x, y: node.y }));
    const placed: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
    const accepted: MapConnection[] = [];
    const acceptedKeys = new Set<string>();
    const auditedConnections: AuditedConnection[] = [];

    const acceptResolved = (
        connection: MapConnection,
        trace: LaneDecisionTrace,
        origin: 'preferred' | 'bridge',
    ) => {
        const key = edgeKey(connection.sourceId, connection.targetId);
        accepted.push(connection);
        acceptedKeys.add(key);
        placed.push(...polylineToSegments(connection.laneWaypoints ?? []));

        const source = pos.get(connection.sourceId)!;
        const target = pos.get(connection.targetId)!;
        const chordMinClearancePx = nodes
            .filter((node) => node.id !== connection.sourceId && node.id !== connection.targetId)
            .reduce((nearest, node) => Math.min(
                nearest,
                pointToSegmentDistance(node.x, node.y, source.x, source.y, target.x, target.y),
            ), Number.POSITIVE_INFINITY);
        const witness = computeWitness(connection, nodes);
        const finalMinClearancePx = witness?.distancePx ?? Number.POSITIVE_INFINITY;

        let classification: AuditedConnection['classification'];
        if (trace.finalReason === 'connectivity_override_best_clearance') {
            classification = 'connectivity_override_straight';
        } else if ((connection.lanePathKind ?? 'straight') === 'straight' && chordMinClearancePx < options.laneMarginPx - CLEARANCE_EPSILON_PX) {
            classification = 'false_negative_straight';
        } else if ((connection.lanePathKind ?? 'straight') !== 'straight' && chordMinClearancePx >= options.laneMarginPx - CLEARANCE_EPSILON_PX) {
            classification = 'false_positive_curve';
        } else if (finalMinClearancePx < options.laneMarginPx - CLEARANCE_EPSILON_PX) {
            classification = 'adjusted_but_still_violating';
        } else if ((connection.lanePathKind ?? 'straight') === 'straight') {
            classification = 'ok_straight';
        } else {
            classification = 'ok_adjusted';
        }

        auditedConnections.push({
            key,
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            origin,
            pathKind: connection.lanePathKind ?? 'straight',
            waypointCount: connection.laneWaypoints?.length ?? 0,
            chordDistancePx: connection.distance,
            chordMinClearancePx: round(chordMinClearancePx),
            finalMinClearancePx: round(finalMinClearancePx),
            closestStarId: witness?.starId ?? null,
            closestPoint: witness?.point ?? null,
            classification,
            trace,
            laneWaypoints: connection.laneWaypoints ?? [],
        });
    };

    const preferredSorted = preferredConnections.slice().sort((a, b) => a.distance - b.distance);
    for (const preferred of preferredSorted) {
        const key = edgeKey(preferred.sourceId, preferred.targetId);
        if (acceptedKeys.has(key)) continue;
        const source = pos.get(preferred.sourceId);
        const target = pos.get(preferred.targetId);
        if (!source || !target) continue;
        const { connection, trace } = debugResolveLaneConnection(
            source,
            target,
            nodes,
            placed,
            starCenters,
            options.laneMode,
            options.laneMarginPx,
            options.remapBias,
            options.adjustedPathStyle,
        );
        if (!connection) continue;
        acceptResolved(connection, trace, 'preferred');
    }

    const candidateSorted = candidateConnections.slice().sort((a, b) => a.distance - b.distance);
    while (countComponents(nodes, accepted) > 1) {
        const componentIndex = buildComponentIndex(nodes, accepted);
        let progressed = false;
        for (const candidate of candidateSorted) {
            const key = edgeKey(candidate.sourceId, candidate.targetId);
            if (acceptedKeys.has(key)) continue;
            const sourceComponent = componentIndex.get(candidate.sourceId);
            const targetComponent = componentIndex.get(candidate.targetId);
            if (sourceComponent === undefined || targetComponent === undefined || sourceComponent === targetComponent) {
                continue;
            }
            const source = pos.get(candidate.sourceId);
            const target = pos.get(candidate.targetId);
            if (!source || !target) continue;
            const { connection, trace } = debugResolveLaneConnection(
                source,
                target,
                nodes,
                placed,
                starCenters,
                options.laneMode,
                options.laneMarginPx,
                options.remapBias,
                options.adjustedPathStyle,
            );
            if (!connection) continue;
            acceptResolved(connection, trace, 'bridge');
            progressed = true;
            break;
        }
        if (!progressed) {
            const fallbackCandidates = buildFallbackBridgeCandidates(
                nodes,
                componentIndex,
                acceptedKeys,
            );
            for (const candidate of fallbackCandidates) {
                const source = pos.get(candidate.sourceId);
                const target = pos.get(candidate.targetId);
                if (!source || !target) continue;
                const { connection, trace } = debugResolveLaneConnection(
                    source,
                    target,
                    nodes,
                    placed,
                    starCenters,
                    options.laneMode,
                    options.laneMarginPx,
                    options.remapBias,
                    options.adjustedPathStyle,
                );
                if (!connection) continue;
                acceptResolved(connection, trace, 'bridge');
                progressed = true;
                break;
            }
        }
        if (!progressed) {
            const overrideCandidates = buildConnectivityOverrideCandidates(
                nodes,
                componentIndex,
                acceptedKeys,
            );
            for (const candidate of overrideCandidates) {
                const source = pos.get(candidate.sourceId);
                const target = pos.get(candidate.targetId);
                if (!source || !target) continue;
                const trace: LaneDecisionTrace = {
                    requestedClearancePx: options.laneMarginPx,
                    effectiveClearancePx: options.laneMarginPx,
                    chordDistancePx: candidate.distance,
                    chordMinClearancePx: candidate.chordMinClearancePx,
                    chordPassesRequested: candidate.chordMinClearancePx >= options.laneMarginPx,
                    chordPassesEffective: candidate.chordMinClearancePx >= options.laneMarginPx,
                    straightBlockedByClearance: candidate.chordMinClearancePx < options.laneMarginPx,
                    straightBlockedByLaneCross: false,
                    finalPathKind: 'straight',
                    finalMinClearancePx: candidate.chordMinClearancePx,
                    finalPassesRequested: candidate.chordMinClearancePx >= options.laneMarginPx,
                    finalReason: 'connectivity_override_best_clearance',
                    attempts: [
                        {
                            candidateKind: 'straight',
                            minimumClearancePx: candidate.chordMinClearancePx,
                            requiredClearancePx: options.laneMarginPx,
                            waypointCount: 2,
                            accepted: true,
                            reason: 'connectivity_override_best_clearance',
                        },
                    ],
                };
                acceptResolved(
                    {
                        sourceId: source.id,
                        targetId: target.id,
                        distance: candidate.distance,
                        laneWaypoints: [[source.x, source.y], [target.x, target.y]],
                        lanePathKind: 'straight',
                    },
                    trace,
                    'bridge',
                );
                progressed = true;
                break;
            }
        }
        if (!progressed) break;
    }

    return {
        label: options.label,
        savedMapPath: options.savedMapPath,
        laneMarginPx: options.laneMarginPx,
        remapBias: options.remapBias,
        adjustedPathStyle: options.adjustedPathStyle,
        connectionCount: auditedConnections.length,
        componentCount: countComponents(nodes, accepted),
        straightCount: auditedConnections.filter((connection) => connection.pathKind === 'straight').length,
        angularCount: auditedConnections.filter((connection) => connection.pathKind === 'angular').length,
        curvedCount: auditedConnections.filter((connection) => connection.pathKind === 'curved').length,
        falsePositiveCurveCount: auditedConnections.filter((connection) => connection.classification === 'false_positive_curve').length,
        falseNegativeStraightCount: auditedConnections.filter((connection) => connection.classification === 'false_negative_straight').length,
        connectivityOverrideStraightCount: auditedConnections.filter((connection) => connection.classification === 'connectivity_override_straight').length,
        adjustedButStillViolatingCount: auditedConnections.filter((connection) => connection.classification === 'adjusted_but_still_violating').length,
        auditedConnections,
    };
}

function renderSvg(nodes: Connectable[], audit: AuditResult, options: AuditOptions): string {
    const strokeByKind: Record<LanePathKind, string> = {
        straight: '#f8fafc',
        angular: '#f59e0b',
        curved: '#38bdf8',
    };

    const lanePaths = audit.auditedConnections.map((connection) => {
        const d = connection.laneWaypoints
            .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
            .join(' ');
        return `<path d="${d}" fill="none" stroke="${strokeByKind[connection.pathKind]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');

    const violationWitnesses = audit.auditedConnections
        .filter((connection) => connection.classification !== 'ok_straight' && connection.classification !== 'ok_adjusted')
        .map((connection, index) => {
            if (!connection.closestStarId || !connection.closestPoint) return '';
            const star = nodes.find((node) => node.id === connection.closestStarId);
            if (!star) return '';
            const color = connection.classification === 'false_positive_curve' ? '#f97316' : '#ef4444';
            const label = `${connection.key} ${connection.finalMinClearancePx}/${options.laneMarginPx}`;
            return [
                `<line x1="${star.x.toFixed(2)}" y1="${star.y.toFixed(2)}" x2="${connection.closestPoint.x.toFixed(2)}" y2="${connection.closestPoint.y.toFixed(2)}" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 4" />`,
                `<circle cx="${connection.closestPoint.x.toFixed(2)}" cy="${connection.closestPoint.y.toFixed(2)}" r="4" fill="${color}" />`,
                `<text x="${(connection.closestPoint.x + 8).toFixed(2)}" y="${(connection.closestPoint.y - 8 - index * 2).toFixed(2)}" fill="${color}" font-size="12" font-family="Consolas, monospace">${escapeXml(label)}</text>`,
            ].join('\n');
        })
        .join('\n');

    const stars = nodes.map((node) => (
        `<g><circle cx="${node.x.toFixed(2)}" cy="${node.y.toFixed(2)}" r="10" fill="#111827" stroke="#94a3b8" stroke-width="2" />` +
        `<text x="${(node.x + 14).toFixed(2)}" y="${(node.y + 4).toFixed(2)}" fill="#cbd5e1" font-size="12" font-family="Consolas, monospace">${escapeXml(node.id)}</text></g>`
    )).join('\n');

    const legend = [
        `Label: ${audit.label}`,
        `Lane margin: ${options.laneMarginPx}px`,
        `Remap bias: ${options.remapBias}`,
        `Adjusted style: ${options.adjustedPathStyle}`,
        `False positive curve: ${audit.falsePositiveCurveCount}`,
        `False negative straight: ${audit.falseNegativeStraightCount}`,
        `Connectivity override straight: ${audit.connectivityOverrideStraightCount}`,
        `Adjusted but violating: ${audit.adjustedButStillViolatingCount}`,
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
  <rect x="0" y="0" width="${options.width}" height="${options.height}" fill="#020617" />
  ${lanePaths}
  ${violationWitnesses}
  ${stars}
  <g transform="translate(24 24)">
    <rect x="0" y="0" width="360" height="164" rx="12" fill="rgba(2,6,23,0.85)" stroke="#334155" stroke-width="1" />
    ${legend.map((line, index) => `<text x="16" y="${26 + index * 18}" fill="#e2e8f0" font-size="14" font-family="Consolas, monospace">${escapeXml(line)}</text>`).join('\n')}
    <text x="16" y="156" fill="#f8fafc" font-size="12" font-family="Consolas, monospace">white=straight amber=angular cyan=curved red/orange=witnesses</text>
  </g>
</svg>`;
}

function writeOutputs(nodes: Connectable[], audit: AuditResult, options: AuditOptions) {
    mkdirSync(options.metricsDir, { recursive: true });
    const jsonPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.json');
    const svgPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.svg');
    const markdownPath = path.join(options.metricsDir, 'lane-constraint-audit-latest.md');

    writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
    writeFileSync(svgPath, renderSvg(nodes, audit, options), 'utf8');

    const lines = [
        '# Lane Constraint Audit',
        '',
        `- label: ${audit.label}`,
        `- saved map: ${audit.savedMapPath ?? 'none'}`,
        `- lane margin: ${audit.laneMarginPx}px`,
        `- remap bias: ${audit.remapBias}`,
        `- adjusted style: ${audit.adjustedPathStyle}`,
        `- connections: ${audit.connectionCount}`,
        `- components: ${audit.componentCount}`,
        `- straight: ${audit.straightCount}`,
        `- angular: ${audit.angularCount}`,
        `- curved: ${audit.curvedCount}`,
        `- false_positive_curve: ${audit.falsePositiveCurveCount}`,
        `- false_negative_straight: ${audit.falseNegativeStraightCount}`,
        `- connectivity_override_straight: ${audit.connectivityOverrideStraightCount}`,
        `- adjusted_but_still_violating: ${audit.adjustedButStillViolatingCount}`,
        '',
        '## Violations',
        '',
        ...audit.auditedConnections
            .filter((connection) => connection.classification !== 'ok_straight' && connection.classification !== 'ok_adjusted')
            .flatMap((connection) => [
                `### ${connection.key}`,
                `- classification: ${connection.classification}`,
                `- path kind: ${connection.pathKind}`,
                `- chord min clearance: ${connection.chordMinClearancePx}px`,
                `- final min clearance: ${connection.finalMinClearancePx}px`,
                `- closest star: ${connection.closestStarId ?? 'n/a'}`,
                `- trace reason: ${connection.trace.finalReason}`,
                `- attempt reasons: ${connection.trace.attempts.map((attempt) => `${attempt.candidateKind}:${attempt.reason}`).join(', ') || 'none'}`,
                '',
            ]),
    ];

    writeFileSync(markdownPath, lines.join('\n'), 'utf8');
    return { jsonPath, svgPath, markdownPath };
}

function main(): void {
    const options = buildOptions();
    if (!options.savedMapPath) {
        throw new Error('This audit requires --saved-map so the star layout is frozen.');
    }

    const nodes = loadNodesFromSavedMap(options.savedMapPath);
    const audit = auditConnections(nodes, options);
    const outputs = writeOutputs(nodes, audit, options);

    console.log(JSON.stringify({
        ok: true,
        ...outputs,
        summary: {
            componentCount: audit.componentCount,
            falsePositiveCurveCount: audit.falsePositiveCurveCount,
            falseNegativeStraightCount: audit.falseNegativeStraightCount,
            connectivityOverrideStraightCount: audit.connectivityOverrideStraightCount,
            adjustedButStillViolatingCount: audit.adjustedButStillViolatingCount,
            connectionCount: audit.connectionCount,
        },
    }));
}

main();
