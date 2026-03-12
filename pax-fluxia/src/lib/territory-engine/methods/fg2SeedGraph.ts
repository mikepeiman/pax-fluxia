import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type {
    TerritoryEngineInput,
    TerritoryMethodSelection,
    TerritoryPipelineArtifacts,
    TerritoryPipelineStageId,
} from '../types';

interface FG2SeedPoint {
    sourceId: string;
    targetId: string;
    ownerA: string;
    ownerB: string;
    ownerPair: string;
    t: number;
    x: number;
    y: number;
    biasA: number;
    biasB: number;
    laneDistance: number;
}

interface FG2FrontierPolyline {
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    points: [number, number][];
}

export interface FG2StageRuntime {
    input: TerritoryEngineInput;
    selection: TerritoryMethodSelection;
    artifacts: TerritoryPipelineArtifacts;
}

const FG2_GRAPHICS_NAME = 'territory-engine-fg2-frontier-graphics';

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function toOwnerPair(ownerA: string, ownerB: string): string {
    return ownerA <= ownerB ? `${ownerA}::${ownerB}` : `${ownerB}::${ownerA}`;
}

function blendColors(colorA: number, colorB: number): number {
    const r = (((colorA >> 16) & 0xff) + ((colorB >> 16) & 0xff)) >> 1;
    const g = (((colorA >> 8) & 0xff) + ((colorB >> 8) & 0xff)) >> 1;
    const b = ((colorA & 0xff) + (colorB & 0xff)) >> 1;
    return (r << 16) | (g << 8) | b;
}

function getOrCreateGraphics(container: PIXI.Container): PIXI.Graphics {
    for (const child of container.children) {
        if (child instanceof PIXI.Graphics && child.name === FG2_GRAPHICS_NAME) {
            child.visible = true;
            return child;
        }
    }

    const graphics = new PIXI.Graphics();
    graphics.name = FG2_GRAPHICS_NAME;
    graphics.visible = true;
    container.addChild(graphics);
    return graphics;
}

function orderSeedsByNearest(seedPoints: FG2SeedPoint[]): FG2SeedPoint[] {
    if (seedPoints.length <= 2) return seedPoints.slice();

    const remaining = seedPoints.slice();
    const ordered: FG2SeedPoint[] = [];
    ordered.push(remaining.shift()!);

    while (remaining.length > 0) {
        const current = ordered[ordered.length - 1];
        let nearestIdx = 0;
        let nearestDist = Number.POSITIVE_INFINITY;

        for (let i = 0; i < remaining.length; i += 1) {
            const candidate = remaining[i];
            const dx = candidate.x - current.x;
            const dy = candidate.y - current.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < nearestDist) {
                nearestDist = distSq;
                nearestIdx = i;
            }
        }

        ordered.push(remaining.splice(nearestIdx, 1)[0]);
    }

    return ordered;
}

function computeLaneBias(star: StarState, opposite: StarState): number {
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 0;
    const activePower = Math.sqrt(Math.max(0, star.activeShips ?? 0));
    const damagedPower = Math.sqrt(Math.max(0, star.damagedShips ?? 0)) * 0.2;
    const radiusPower = (star.radius ?? 20) * 0.05;
    const attackBoost = star.targetId === opposite.id ? 0.8 : 0;
    const defenseBoost = opposite.targetId === star.id ? 0.25 : 0;
    const corridorBoost =
        (GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ? 1 : 0) *
        ((GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 80) / 120) *
        0.25;

    // Lower effective bias means this star projects more influence along this lane.
    return (
        1.2 -
        (activePower + damagedPower + radiusPower) * 0.12 -
        starMargin * 0.002 -
        attackBoost -
        corridorBoost +
        defenseBoost
    );
}

function solveLaneTieParameter(source: StarState, target: StarState, laneDistance: number): {
    t: number;
    biasA: number;
    biasB: number;
} {
    const safeDistance = Math.max(1, laneDistance);
    const biasA = computeLaneBias(source, target);
    const biasB = computeLaneBias(target, source);

    // Solve dA(t) = dB(t), where dA=biasA+t*L and dB=biasB+(1-t)*L.
    const rawT = (safeDistance + biasB - biasA) / (2 * safeDistance);
    const t = clamp(Number.isFinite(rawT) ? rawT : 0.5, 0.1, 0.9);

    return {
        t,
        biasA,
        biasB,
    };
}

function executeMetricStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const starById = new Map(runtime.input.stars.map((star) => [star.id, star]));
    const contestedLaneCount = (runtime.input.connections ?? []).filter((connection) => {
        const source = starById.get(connection.sourceId);
        const target = starById.get(connection.targetId);
        return Boolean(source && target && source.ownerId !== target.ownerId);
    }).length;

    runtime.artifacts.metric = {
        starCount: runtime.input.stars.length,
        contestedLaneCount,
        connectionCount: runtime.input.connections?.length ?? 0,
    };

    summary.fg2 = true;
    summary.contestedLaneCount = contestedLaneCount;
}

function executeWorldExtensionStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    runtime.artifacts.world_extension = {
        minX: 0,
        minY: 0,
        maxX: runtime.input.worldWidth,
        maxY: runtime.input.worldHeight,
        width: runtime.input.worldWidth,
        height: runtime.input.worldHeight,
    };

    summary.worldWidth = runtime.input.worldWidth;
    summary.worldHeight = runtime.input.worldHeight;
}

function executeSeedStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const starById = new Map(runtime.input.stars.map((star) => [star.id, star]));
    const seeds: FG2SeedPoint[] = [];

    for (const connection of runtime.input.connections ?? []) {
        const source = starById.get(connection.sourceId);
        const target = starById.get(connection.targetId);
        if (!source || !target) continue;
        if (source.ownerId === target.ownerId) continue;

        const laneDistance = Math.max(
            Number(connection.distance ?? 0),
            Math.hypot(target.x - source.x, target.y - source.y),
        );

        const { t, biasA, biasB } = solveLaneTieParameter(source, target, laneDistance);
        seeds.push({
            sourceId: source.id,
            targetId: target.id,
            ownerA: source.ownerId,
            ownerB: target.ownerId,
            ownerPair: toOwnerPair(source.ownerId, target.ownerId),
            t,
            x: source.x + (target.x - source.x) * t,
            y: source.y + (target.y - source.y) * t,
            biasA,
            biasB,
            laneDistance,
        });
    }

    runtime.artifacts.seed = {
        seedCount: seeds.length,
        seeds,
    };

    summary.seedCount = seeds.length;
}

function executeTopologyStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const seeds = seedArtifact?.seeds ?? [];
    const pairGroups: Record<string, FG2SeedPoint[]> = {};

    for (const seed of seeds) {
        if (!pairGroups[seed.ownerPair]) {
            pairGroups[seed.ownerPair] = [];
        }
        pairGroups[seed.ownerPair].push(seed);
    }

    const adjacency: Record<string, string[]> = {};
    for (const seed of seeds) {
        const key = `${seed.sourceId}:${seed.targetId}`;
        if (!adjacency[key]) adjacency[key] = [];
        for (const other of seeds) {
            if (other === seed) continue;
            const sharesStar =
                other.sourceId === seed.sourceId ||
                other.sourceId === seed.targetId ||
                other.targetId === seed.sourceId ||
                other.targetId === seed.targetId;
            if (!sharesStar) continue;
            adjacency[key].push(`${other.sourceId}:${other.targetId}`);
        }
    }

    runtime.artifacts.topology = {
        pairGroups,
        pairCount: Object.keys(pairGroups).length,
        adjacency,
    };

    summary.ownerPairCount = Object.keys(pairGroups).length;
}

function executeGeometryStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const topologyArtifact = runtime.artifacts.topology as
        | { pairGroups?: Record<string, FG2SeedPoint[]> }
        | undefined;
    const pairGroups = topologyArtifact?.pairGroups ?? {};
    const frontiers: FG2FrontierPolyline[] = [];

    for (const [ownerPair, seeds] of Object.entries(pairGroups)) {
        if (seeds.length === 0) continue;
        const ordered = orderSeedsByNearest(seeds);
        const [ownerA, ownerB] = ownerPair.split('::');
        frontiers.push({
            ownerPair,
            ownerA,
            ownerB,
            points: ordered.map((seed) => [seed.x, seed.y]),
        });
    }

    runtime.artifacts.geometry = {
        frontierCount: frontiers.length,
        frontiers,
    };

    summary.frontierCount = frontiers.length;
}

function executeLoopStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const geometryArtifact = runtime.artifacts.geometry as
        | { frontiers?: FG2FrontierPolyline[] }
        | undefined;
    const frontiers = geometryArtifact?.frontiers ?? [];
    const ownerLoopHints: Record<string, number> = {};

    for (const frontier of frontiers) {
        ownerLoopHints[frontier.ownerA] = (ownerLoopHints[frontier.ownerA] ?? 0) + 1;
        ownerLoopHints[frontier.ownerB] = (ownerLoopHints[frontier.ownerB] ?? 0) + 1;
    }

    runtime.artifacts.loop = {
        ownerLoopHints,
        ownerCount: Object.keys(ownerLoopHints).length,
    };

    summary.ownerLoopHintCount = Object.keys(ownerLoopHints).length;
}

function executeAnimationStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    runtime.artifacts.animation = {
        transitionMode: runtime.selection.mode,
        gameNowMs: runtime.input.gameNowMs,
    };

    summary.animationReady = true;
}

function executeRenderStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const geometryArtifact = runtime.artifacts.geometry as
        | { frontiers?: FG2FrontierPolyline[] }
        | undefined;
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const frontiers = geometryArtifact?.frontiers ?? [];
    const seeds = seedArtifact?.seeds ?? [];

    const graphics = getOrCreateGraphics(runtime.input.container);
    graphics.clear();

    const borderWidth = Math.max(1, GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 3);
    const borderAlpha = Math.max(0, Math.min(1, GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.9));

    for (const frontier of frontiers) {
        const colorA = runtime.input.colorUtils.getPlayerColor(frontier.ownerA);
        const colorB = runtime.input.colorUtils.getPlayerColor(frontier.ownerB);
        const color = blendColors(colorA, colorB);

        if (frontier.points.length === 1) {
            const [x, y] = frontier.points[0];
            graphics.circle(x, y, Math.max(2, borderWidth));
            graphics.fill({ color, alpha: borderAlpha });
            continue;
        }

        graphics.moveTo(frontier.points[0][0], frontier.points[0][1]);
        for (let i = 1; i < frontier.points.length; i += 1) {
            const point = frontier.points[i];
            graphics.lineTo(point[0], point[1]);
        }
        graphics.stroke({
            color,
            width: borderWidth,
            alpha: borderAlpha,
            cap: 'round',
            join: 'round',
        });
    }

    if (GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE) {
        for (const seed of seeds) {
            graphics.circle(seed.x, seed.y, 1.5);
            graphics.fill({ color: 0xffffff, alpha: 0.95 });
        }
    }

    runtime.artifacts.render = {
        renderer: 'fg2_seed_graph_native',
        frontierCount: frontiers.length,
        seedCount: seeds.length,
    };

    summary.nativeRenderer = 'fg2_seed_graph_native';
    summary.frontierCount = frontiers.length;
    summary.seedCount = seeds.length;
}

export function executeFG2Stage(
    stageId: TerritoryPipelineStageId,
    runtime: FG2StageRuntime,
    summary: Record<string, unknown>,
): boolean {
    if (runtime.selection.mode !== 'static') return false;
    if (runtime.selection.staticMethodId !== 'fg2_seed_graph') return false;

    if (stageId === 'metric') {
        executeMetricStage(runtime, summary);
        return true;
    }

    if (stageId === 'world_extension') {
        executeWorldExtensionStage(runtime, summary);
        return true;
    }

    if (stageId === 'seed') {
        executeSeedStage(runtime, summary);
        return true;
    }

    if (stageId === 'topology') {
        executeTopologyStage(runtime, summary);
        return true;
    }

    if (stageId === 'geometry') {
        executeGeometryStage(runtime, summary);
        return true;
    }

    if (stageId === 'loop') {
        executeLoopStage(runtime, summary);
        return true;
    }

    if (stageId === 'animation') {
        executeAnimationStage(runtime, summary);
        return true;
    }

    if (stageId === 'render') {
        executeRenderStage(runtime, summary);
        return true;
    }

    return false;
}