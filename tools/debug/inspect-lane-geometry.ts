import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateMap } from '../../common/src/mapgen/index.ts';
import type { LaneAdjustmentStyle, MapGenConfig, MapLaneMode } from '../../common/src/mapgen/index.ts';

type JsonMap = Record<string, unknown>;

interface InspectOptions {
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
    laneMode: MapLaneMode;
    laneMarginPx: number;
    remapBias: number;
    adjustedPathStyle: LaneAdjustmentStyle;
    seed?: number;
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

function loadCurrentSettings(): JsonMap {
    try {
        return JSON.parse(readFileSync(CURRENT_SETTINGS_PATH, 'utf8')) as JsonMap;
    } catch {
        return {};
    }
}

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

function buildOptions(): InspectOptions {
    const current = loadCurrentSettings();
    const args = parseArgs(process.argv.slice(2));
    return {
        width: parseNumber(args['width'], 1600),
        height: parseNumber(args['height'], 900),
        playerCount: parseNumber(args['player-count'], Number(current.PLAYER_COUNT ?? 6)),
        starsPerPlayer: parseNumber(args['stars-per-player'], Number(current.STARS_PER_PLAYER ?? 5)),
        neutralStars: parseNumber(args['neutral-stars'], 0),
        spacingMultiplier: parseNumber(args['spacing'], Number(current.SPACING_MULTIPLIER ?? 1)),
        boardFit: parseNumber(args['board-fit'], Number(current.BOARD_FILL ?? 0.55)),
        minLinksPerStar: parseNumber(args['min-links'], Number(current.MIN_LINKS_PER_STAR ?? 1)),
        maxLinksPerStar: parseNumber(args['max-links'], Number(current.MAX_LINKS_PER_STAR ?? 6)),
        hexRadius: parseNumber(args['hex-radius'], Number(current.HEX_RADIUS ?? 50)),
        laneMode: (args['lane-mode'] === 'straight' ? 'straight' : String(current.MAPGEN_LANE_MODE ?? 'curved')) as MapLaneMode,
        laneMarginPx: parseNumber(args['lane-margin'], Number(current.MAPGEN_LANE_MARGIN_PX ?? 75)),
        remapBias: clamp01(parseNumber(args['remap-bias'], Number(current.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55))),
        adjustedPathStyle: (args['adjusted-style'] === 'angular' ? 'angular' : String(current.MAPGEN_LANE_ADJUSTED_PATH_STYLE ?? 'curved')) as LaneAdjustmentStyle,
        seed: args['seed'] !== undefined ? parseNumber(args['seed'], 0) : undefined,
        metricsDir: args['metrics-dir'] ? path.resolve(args['metrics-dir']) : DEFAULT_METRICS_DIR,
    };
}

function toMapConfig(options: InspectOptions): MapGenConfig {
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
        mapgenLaneMarginPx: options.laneMarginPx,
        mapgenLaneCurveVsPruneBias: options.remapBias,
        mapgenLaneAdjustedPathStyle: options.adjustedPathStyle,
        mapLaneMode: options.laneMode,
    };
}

function escapeXml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function renderSvg(
    options: InspectOptions,
    result: ReturnType<typeof generateMap>,
): string {
    const strokeByKind: Record<string, string> = {
        straight: '#f8fafc',
        angular: '#f59e0b',
        curved: '#38bdf8',
    };

    const lanePaths = result.connections.map((connection) => {
        const pts = connection.laneWaypoints ?? [];
        const d = pts.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
        const stroke = strokeByKind[connection.lanePathKind ?? 'straight'] ?? '#f8fafc';
        return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');

    const stars = result.positions.map((position, index) => (
        `<g><circle cx="${position.x.toFixed(2)}" cy="${position.y.toFixed(2)}" r="10" fill="#111827" stroke="#94a3b8" stroke-width="2" />` +
        `<text x="${(position.x + 14).toFixed(2)}" y="${(position.y + 4).toFixed(2)}" fill="#cbd5e1" font-size="12" font-family="Consolas, monospace">s${index}</text></g>`
    )).join('\n');

    const legend = [
        `Lane mode: ${options.laneMode}`,
        `Adjusted style: ${options.adjustedPathStyle}`,
        `Lane margin: ${options.laneMarginPx}px`,
        `Remap bias: ${options.remapBias}`,
        `Connections: ${result.connections.length}`,
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
  <rect x="0" y="0" width="${options.width}" height="${options.height}" fill="#020617" />
  ${lanePaths}
  ${stars}
  <g transform="translate(24 24)">
    <rect x="0" y="0" width="320" height="110" rx="12" fill="rgba(2,6,23,0.85)" stroke="#334155" stroke-width="1" />
    ${legend.map((line, index) => `<text x="16" y="${26 + index * 18}" fill="#e2e8f0" font-size="14" font-family="Consolas, monospace">${escapeXml(line)}</text>`).join('\n')}
    <text x="16" y="104" fill="#f8fafc" font-size="12" font-family="Consolas, monospace">straight=#f8fafc angular=#f59e0b curved=#38bdf8</text>
  </g>
</svg>`;
}

function main(): void {
    const options = buildOptions();
    const result = options.seed !== undefined
        ? withSeed(options.seed, () => generateMap(toMapConfig(options)))
        : generateMap(toMapConfig(options));

    const counts = { straight: 0, angular: 0, curved: 0 };
    for (const connection of result.connections) {
        counts[connection.lanePathKind ?? 'straight' as keyof typeof counts] += 1;
    }

    mkdirSync(options.metricsDir, { recursive: true });
    const svgPath = path.join(options.metricsDir, 'lane-geometry-snapshot-latest.svg');
    const markdownPath = path.join(options.metricsDir, 'lane-geometry-snapshot-latest.md');
    const jsonPath = path.join(options.metricsDir, 'lane-geometry-snapshot-latest.json');

    writeFileSync(svgPath, renderSvg(options, result), 'utf8');
    writeFileSync(jsonPath, JSON.stringify({
        options,
        counts,
        positions: result.positions.length,
        connections: result.connections.length,
        lanePathKinds: result.connections.map((connection) => ({
            key: `${connection.sourceId}|${connection.targetId}`,
            kind: connection.lanePathKind ?? 'straight',
            waypointCount: connection.laneWaypoints?.length ?? 0,
        })),
    }, null, 2), 'utf8');
    writeFileSync(markdownPath, [
        '# Lane Geometry Snapshot',
        '',
        `- seed: ${options.seed ?? 'runtime-random'}`,
        `- lane mode: ${options.laneMode}`,
        `- adjusted style: ${options.adjustedPathStyle}`,
        `- lane margin: ${options.laneMarginPx}px`,
        `- remap bias: ${options.remapBias}`,
        `- stars: ${result.positions.length}`,
        `- connections: ${result.connections.length}`,
        `- straight: ${counts.straight}`,
        `- angular: ${counts.angular}`,
        `- curved: ${counts.curved}`,
        '',
        `SVG: ${svgPath}`,
        `JSON: ${jsonPath}`,
    ].join('\n'), 'utf8');

    console.log(JSON.stringify({
        ok: true,
        svgPath,
        markdownPath,
        jsonPath,
        counts,
        connections: result.connections.length,
    }));
}

main();
