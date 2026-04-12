import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateMap, pointToSegmentDistance } from '../../common/src/mapgen/index.ts';
import { effectiveLaneClearanceForChord } from '../../common/src/mapgen/lanePolylines.ts';
import type { MapGenConfig } from '../../common/src/mapgen/types.ts';

type JsonMap = Record<string, unknown>;

interface SeedRow {
    seed: number;
    margin: number;
    effectiveTopologyClearancePx: number;
    connectionCount: number;
    curvedCount: number;
    straightCount: number;
    configuredBlockedChordCount: number;
    solverBlockedChordCount: number;
    solverBlockedChordCurvedCount: number;
    unsafeStraightCount: number;
    minChordClearancePx: number;
    medianChordClearancePx: number;
    maxChordClearancePx: number;
    sampleUnsafeEdges: Array<{
        key: string;
        nearestChordClearancePx: number;
        lanePathKind: string;
    }>;
}

interface AggregatedRow {
    margin: number;
    effectiveTopologyClearancePx: number;
    avgConnectionCount: number;
    minConnectionCount: number;
    maxConnectionCount: number;
    avgCurvedCount: number;
    maxCurvedCount: number;
    avgUnsafeStraightCount: number;
    maxUnsafeStraightCount: number;
    avgConfiguredBlockedChordCount: number;
    avgSolverBlockedChordCount: number;
}

interface DiagnoseOptions {
    width: number;
    height: number;
    playerCount: number;
    starsPerPlayer: number;
    neutralStars: number;
    spacingMultiplier: number;
    boardFit: number;
    minLinksPerStar: number;
    maxLinksPerStar: number;
    hexRadius: number;
    starMarginPx: number;
    laneMode: 'straight' | 'curved';
    bias: number;
    margins: number[];
    seedStart: number;
    seedCount: number;
    metricsDir: string;
}

const ROOT = path.resolve(import.meta.dir, '..', '..');
const DEFAULT_METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');
const CURRENT_SETTINGS_PATH = path.join(
    ROOT,
    'common',
    'resources',
    'settings-live',
    'current-settings.json',
);

function mulberry32(seed: number): () => number {
    return function next(): number {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function withSeed<T>(seed: number, fn: () => T): T {
    const previousRandom = Math.random;
    Math.random = mulberry32(seed) as typeof Math.random;
    try {
        return fn();
    } finally {
        Math.random = previousRandom;
    }
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function round(value: number, digits: number = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid]!;
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseNumber(value: string | undefined, fallback: number): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMargins(raw: string | undefined): number[] {
    if (!raw) {
        const margins: number[] = [];
        for (let margin = 0; margin <= 260; margin += 5) margins.push(margin);
        return margins;
    }
    const values = raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, Math.round(value)));
    return values.length > 0 ? values : [0, 35, 40, 45, 80, 100, 140, 160, 175, 200, 230];
}

function loadCurrentSettings(): JsonMap {
    try {
        return JSON.parse(readFileSync(CURRENT_SETTINGS_PATH, 'utf8')) as JsonMap;
    } catch {
        return {};
    }
}

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

function buildOptions(): DiagnoseOptions {
    const current = loadCurrentSettings();
    const args = parseArgs(process.argv.slice(2));

    return {
        width: parseNumber(args['width'], 1600),
        height: parseNumber(args['height'], 900),
        playerCount: parseNumber(args['player-count'], 6),
        starsPerPlayer: parseNumber(args['stars-per-player'], Number(current.STARS_PER_PLAYER ?? 5)),
        neutralStars: parseNumber(args['neutral-stars'], 0),
        spacingMultiplier: parseNumber(args['spacing'], 1.0),
        boardFit: parseNumber(args['board-fit'], 0.55),
        minLinksPerStar: parseNumber(args['min-links'], Number(current.MIN_LINKS_PER_STAR ?? 1)),
        maxLinksPerStar: parseNumber(args['max-links'], Number(current.MAX_LINKS_PER_STAR ?? 6)),
        hexRadius: parseNumber(args['hex-radius'], Number(current.HEX_RADIUS ?? 50)),
        starMarginPx: parseNumber(
            args['star-margin'],
            Number(current.MODIFIED_VORONOI_STAR_MARGIN ?? 45),
        ),
        laneMode: (args['lane-mode'] === 'straight' ? 'straight' : String(
            current.MAPGEN_LANE_MODE ?? 'curved',
        )) as 'straight' | 'curved',
        bias: clamp01(
            parseNumber(
                args['curve-vs-prune-bias'],
                Number(current.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55),
            ),
        ),
        margins: parseMargins(args['margins']),
        seedStart: parseNumber(args['seed-start'], 12001),
        seedCount: parseNumber(args['seed-count'], 8),
        metricsDir: args['metrics-dir'] ? path.resolve(args['metrics-dir']) : DEFAULT_METRICS_DIR,
    };
}

function toMapConfig(options: DiagnoseOptions, margin: number): MapGenConfig {
    return {
        width: options.width,
        height: options.height,
        playerCount: options.playerCount,
        starsPerPlayer: options.starsPerPlayer,
        extraNeutralStars: options.neutralStars,
        spacingMultiplier: options.spacingMultiplier,
        hexRadius: options.hexRadius,
        minLinksPerStar: options.minLinksPerStar,
        maxLinksPerStar: options.maxLinksPerStar,
        boardFit: options.boardFit,
        mapgenStarMarginPx: options.starMarginPx,
        mapgenLaneMarginPx: margin,
        mapgenLaneCurveVsPruneBias: options.bias,
        mapLaneMode: options.laneMode,
    };
}

function analyzeSeed(options: DiagnoseOptions, seed: number, margin: number): SeedRow {
    const result = withSeed(seed, () => generateMap(toMapConfig(options, margin)));
    const nodes = result.positions.map((position, index) => ({
        id: `star-${index}`,
        x: position.x,
        y: position.y,
    }));
    const positionsById = new Map(nodes.map((node) => [node.id, node]));
    const chordClearances: number[] = [];
    let curvedCount = 0;
    let configuredBlockedChordCount = 0;
    let solverBlockedChordCount = 0;
    let solverBlockedChordCurvedCount = 0;
    let unsafeStraightCount = 0;
    const unsafeEdges: SeedRow['sampleUnsafeEdges'] = [];

    for (const connection of result.connections) {
        const source = positionsById.get(connection.sourceId)!;
        const target = positionsById.get(connection.targetId)!;
        let nearestChordClearance = Number.POSITIVE_INFINITY;

        for (const node of nodes) {
            if (node.id === connection.sourceId || node.id === connection.targetId) continue;
            const clearance = pointToSegmentDistance(
                node.x,
                node.y,
                source.x,
                source.y,
                target.x,
                target.y,
            );
            if (clearance < nearestChordClearance) nearestChordClearance = clearance;
        }

        chordClearances.push(nearestChordClearance);
        const solverClearance = effectiveLaneClearanceForChord(connection.distance, margin);
        const blockedByConfiguredMargin = nearestChordClearance < margin;
        const blockedBySolverClearance = nearestChordClearance < solverClearance;
        const curved = connection.lanePathKind === 'curved';

        if (curved) curvedCount += 1;
        if (blockedByConfiguredMargin) configuredBlockedChordCount += 1;
        if (blockedBySolverClearance) solverBlockedChordCount += 1;
        if (blockedBySolverClearance && curved) solverBlockedChordCurvedCount += 1;
        if (blockedBySolverClearance && !curved) {
            unsafeStraightCount += 1;
            if (unsafeEdges.length < 5) {
                unsafeEdges.push({
                    key: `${connection.sourceId}|${connection.targetId}`,
                    nearestChordClearancePx: round(nearestChordClearance),
                    lanePathKind: connection.lanePathKind ?? 'straight',
                });
            }
        }
    }

    return {
        seed,
        margin,
        effectiveTopologyClearancePx: round(margin * (1 - options.bias)),
        connectionCount: result.connections.length,
        curvedCount,
        straightCount: result.connections.length - curvedCount,
        configuredBlockedChordCount,
        solverBlockedChordCount,
        solverBlockedChordCurvedCount,
        unsafeStraightCount,
        minChordClearancePx: round(Math.min(...chordClearances)),
        medianChordClearancePx: round(median(chordClearances)),
        maxChordClearancePx: round(Math.max(...chordClearances)),
        sampleUnsafeEdges: unsafeEdges,
    };
}

function aggregateRows(rows: SeedRow[]): AggregatedRow[] {
    const grouped = new Map<number, SeedRow[]>();
    for (const row of rows) {
        const bucket = grouped.get(row.margin) ?? [];
        bucket.push(row);
        grouped.set(row.margin, bucket);
    }

    return Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([margin, bucket]) => ({
            margin,
            effectiveTopologyClearancePx: bucket[0]!.effectiveTopologyClearancePx,
            avgConnectionCount: round(mean(bucket.map((row) => row.connectionCount))),
            minConnectionCount: Math.min(...bucket.map((row) => row.connectionCount)),
            maxConnectionCount: Math.max(...bucket.map((row) => row.connectionCount)),
            avgCurvedCount: round(mean(bucket.map((row) => row.curvedCount))),
            maxCurvedCount: Math.max(...bucket.map((row) => row.curvedCount)),
            avgUnsafeStraightCount: round(mean(bucket.map((row) => row.unsafeStraightCount))),
            maxUnsafeStraightCount: Math.max(...bucket.map((row) => row.unsafeStraightCount)),
            avgConfiguredBlockedChordCount: round(mean(bucket.map((row) => row.configuredBlockedChordCount))),
            avgSolverBlockedChordCount: round(mean(bucket.map((row) => row.solverBlockedChordCount))),
        }));
}

function writeOutputs(options: DiagnoseOptions, seedRows: SeedRow[], aggregates: AggregatedRow[]): {
    ndjsonPath: string;
    markdownPath: string;
} {
    mkdirSync(options.metricsDir, { recursive: true });
    const ndjsonPath = path.join(options.metricsDir, 'lane-margin-diagnostics-latest.ndjson');
    const markdownPath = path.join(options.metricsDir, 'lane-margin-diagnostics-latest.md');

    writeFileSync(
        ndjsonPath,
        seedRows.map((row) => JSON.stringify(row)).join('\n') + '\n',
        'utf8',
    );

    const suspiciousRows = aggregates.filter((row) => row.avgUnsafeStraightCount > 0);
    const peakCurved = aggregates.reduce(
        (best, row) => (row.avgCurvedCount > best.avgCurvedCount ? row : best),
        aggregates[0]!,
    );
    const firstUnsafe = suspiciousRows[0] ?? null;

    const lines = [
        '# Lane Margin Diagnostics',
        '',
        `Generated on ${new Date().toISOString()}.`,
        '',
        '## Baseline',
        '',
        `- width: ${options.width}`,
        `- height: ${options.height}`,
        `- playerCount: ${options.playerCount}`,
        `- starsPerPlayer: ${options.starsPerPlayer}`,
        `- neutralStars: ${options.neutralStars}`,
        `- spacingMultiplier: ${options.spacingMultiplier}`,
        `- boardFit: ${options.boardFit}`,
        `- minLinksPerStar: ${options.minLinksPerStar}`,
        `- maxLinksPerStar: ${options.maxLinksPerStar}`,
        `- laneMode: ${options.laneMode}`,
        `- curveVsPruneBias: ${round(options.bias, 3)}`,
        `- seeds: ${options.seedStart}..${options.seedStart + options.seedCount - 1}`,
        '',
        '## Findings',
        '',
        `- Peak average curved-lane count occurs around margin ${peakCurved.margin}px with ${peakCurved.avgCurvedCount} curved connections on average.`,
        firstUnsafe
            ? `- Unsafe straight fallbacks begin at margin ${firstUnsafe.margin}px, using the solver's chord-length-scaled lane-clearance target.`
            : '- No unsafe straight fallbacks were observed in this sweep.',
        `- Effective topology prune clearance is margin * (1 - bias), so with the current bias ${round(options.bias, 3)} it tops out at ${round((1 - options.bias) * Math.max(...options.margins))} px.`,
        '',
        '## Sweep Summary',
        '',
        '| margin | eff prune px | avg conn | avg curved | avg configured-blocked | avg solver-blocked | avg unsafe straight | conn range |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |',
        ...aggregates.map((row) =>
            `| ${row.margin} | ${row.effectiveTopologyClearancePx} | ${row.avgConnectionCount} | ${row.avgCurvedCount} | ${row.avgConfiguredBlockedChordCount} | ${row.avgSolverBlockedChordCount} | ${row.avgUnsafeStraightCount} | ${row.minConnectionCount}-${row.maxConnectionCount} |`,
        ),
        '',
    ];

    if (firstUnsafe) {
        const example = seedRows.find(
            (row) => row.margin === firstUnsafe.margin && row.unsafeStraightCount > 0,
        );
        if (example) {
            lines.push('## Example Unsafe Straight Fallbacks', '');
            for (const edge of example.sampleUnsafeEdges) {
                lines.push(
                    `- seed ${example.seed}, margin ${example.margin}: ${edge.key} stayed ${edge.lanePathKind} with nearest chord clearance ${edge.nearestChordClearancePx}px`,
                );
            }
            lines.push('');
        }
    }

    writeFileSync(markdownPath, lines.join('\n'), 'utf8');
    return { ndjsonPath, markdownPath };
}

function main(): void {
    const options = buildOptions();
    const rows: SeedRow[] = [];
    for (let seedOffset = 0; seedOffset < options.seedCount; seedOffset++) {
        const seed = options.seedStart + seedOffset;
        for (const margin of options.margins) {
            rows.push(analyzeSeed(options, seed, margin));
        }
    }

    const aggregates = aggregateRows(rows);
    const { ndjsonPath, markdownPath } = writeOutputs(options, rows, aggregates);

    console.log(
        JSON.stringify({
            ok: true,
            margins: options.margins.length,
            seeds: options.seedCount,
            ndjsonPath,
            markdownPath,
        }),
    );
}

main();
