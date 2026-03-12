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
    seedId: string;
    laneId: string;
    sourceId: string;
    targetId: string;
    sourceOwner: string;
    targetOwner: string;
    ownerPair: string;
    t: number;
    x: number;
    y: number;
    biasA: number;
    biasB: number;
    laneDistance: number;
    sourceAngle: number;
    targetAngle: number;
}

interface FG2TopologyLink {
    linkId: string;
    ownerPair: string;
    viaStarId: string;
    viaOwner: string;
    seedAId: string;
    seedBId: string;
    linkLength: number;
    angleSpan: number;
}

interface FG2PairTopologyGraph {
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    seedIds: string[];
    links: FG2TopologyLink[];
    adjacency: Record<string, string[]>;
    starIncidence: Record<string, string[]>;
    isolatedSeedIds: string[];
    openSeedIds: string[];
}

interface FG2FrontierPolyline {
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    closed: boolean;
    points: [number, number][];
}

export interface FG2StageRuntime {
    input: TerritoryEngineInput;
    selection: TerritoryMethodSelection;
    artifacts: TerritoryPipelineArtifacts;
}

const FG2_GRAPHICS_NAME = 'territory-engine-fg2-frontier-graphics';
const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function toOwnerPair(ownerA: string, ownerB: string): string {
    return ownerA <= ownerB ? `${ownerA}::${ownerB}` : `${ownerB}::${ownerA}`;
}

function toLaneId(starAId: string, starBId: string): string {
    return starAId <= starBId ? `${starAId}::${starBId}` : `${starBId}::${starAId}`;
}

function normalizeAngle(angle: number): number {
    const normalized = angle % TAU;
    return normalized < 0 ? normalized + TAU : normalized;
}

function angleSpan(angleA: number, angleB: number): number {
    const diff = Math.abs(angleA - angleB) % TAU;
    return diff > Math.PI ? TAU - diff : diff;
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

function getSeedAngleAtStar(seed: FG2SeedPoint, starId: string): number {
    return seed.sourceId === starId ? seed.sourceAngle : seed.targetAngle;
}

function getOppositeSeedId(link: FG2TopologyLink, seedId: string): string {
    return link.seedAId === seedId ? link.seedBId : link.seedAId;
}

function chooseNextLink(
    previousSeedId: string | null,
    currentSeedId: string,
    candidateLinkIds: string[],
    linkById: Map<string, FG2TopologyLink>,
    seedById: Map<string, FG2SeedPoint>,
): string | null {
    if (candidateLinkIds.length === 0) return null;
    if (!previousSeedId || candidateLinkIds.length === 1) {
        return candidateLinkIds.slice().sort((a, b) => a.localeCompare(b))[0];
    }

    const previousSeed = seedById.get(previousSeedId);
    const currentSeed = seedById.get(currentSeedId);
    if (!previousSeed || !currentSeed) {
        return candidateLinkIds.slice().sort((a, b) => a.localeCompare(b))[0];
    }

    const incomingX = currentSeed.x - previousSeed.x;
    const incomingY = currentSeed.y - previousSeed.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    if (incomingLength <= 0.0001) {
        return candidateLinkIds.slice().sort((a, b) => a.localeCompare(b))[0];
    }

    let bestLinkId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const linkId of candidateLinkIds) {
        const link = linkById.get(linkId);
        if (!link) continue;
        const nextSeed = seedById.get(getOppositeSeedId(link, currentSeedId));
        if (!nextSeed) continue;

        const outgoingX = nextSeed.x - currentSeed.x;
        const outgoingY = nextSeed.y - currentSeed.y;
        const outgoingLength = Math.hypot(outgoingX, outgoingY);
        if (outgoingLength <= 0.0001) continue;

        const straightness =
            (incomingX * outgoingX + incomingY * outgoingY) /
            (incomingLength * outgoingLength);
        const score = straightness - link.angleSpan * 0.01 - link.linkLength * 0.0001;

        if (
            score > bestScore ||
            (Math.abs(score - bestScore) <= 1e-9 &&
                bestLinkId !== null &&
                linkId.localeCompare(bestLinkId) < 0)
        ) {
            bestScore = score;
            bestLinkId = linkId;
        }
    }

    return bestLinkId ?? candidateLinkIds.slice().sort((a, b) => a.localeCompare(b))[0];
}

function walkChain(
    startSeedId: string,
    startLinkId: string,
    adjacency: Record<string, string[]>,
    linkById: Map<string, FG2TopologyLink>,
    seedById: Map<string, FG2SeedPoint>,
    visitedLinkIds: Set<string>,
): { seedIds: string[]; closed: boolean } {
    const seedIds = [startSeedId];
    let previousSeedId: string | null = null;
    let currentSeedId = startSeedId;
    let currentLinkId: string | null = startLinkId;
    let closed = false;

    while (currentLinkId) {
        if (visitedLinkIds.has(currentLinkId)) break;
        visitedLinkIds.add(currentLinkId);

        const currentLink = linkById.get(currentLinkId);
        if (!currentLink) break;

        const nextSeedId = getOppositeSeedId(currentLink, currentSeedId);
        if (nextSeedId === startSeedId && seedIds.length > 2) {
            closed = true;
            break;
        }

        seedIds.push(nextSeedId);

        const candidateLinkIds = (adjacency[nextSeedId] ?? []).filter(
            (linkId) => !visitedLinkIds.has(linkId),
        );
        if (candidateLinkIds.length === 0) {
            break;
        }

        const nextLinkId = chooseNextLink(
            currentSeedId,
            nextSeedId,
            candidateLinkIds,
            linkById,
            seedById,
        );
        if (!nextLinkId) {
            break;
        }

        previousSeedId = currentSeedId;
        currentSeedId = nextSeedId;
        currentLinkId = nextLinkId;
    }

    return { seedIds, closed };
}

function buildPairTopologyGraph(
    ownerPair: string,
    seeds: FG2SeedPoint[],
    starById: Map<string, StarState>,
): FG2PairTopologyGraph {
    const [ownerA, ownerB] = ownerPair.split('::');
    const seedById = new Map(seeds.map((seed) => [seed.seedId, seed]));
    const starIncidence: Record<string, string[]> = {};

    for (const seed of seeds) {
        if (!starIncidence[seed.sourceId]) {
            starIncidence[seed.sourceId] = [];
        }
        if (!starIncidence[seed.targetId]) {
            starIncidence[seed.targetId] = [];
        }
        starIncidence[seed.sourceId].push(seed.seedId);
        starIncidence[seed.targetId].push(seed.seedId);
    }

    const links: FG2TopologyLink[] = [];

    for (const [starId, incidentSeedIds] of Object.entries(starIncidence)) {
        if (incidentSeedIds.length < 2) continue;

        const sortedSeedIds = incidentSeedIds.slice().sort((seedAId, seedBId) => {
            const seedA = seedById.get(seedAId);
            const seedB = seedById.get(seedBId);
            if (!seedA || !seedB) return seedAId.localeCompare(seedBId);
            const angleA = getSeedAngleAtStar(seedA, starId);
            const angleB = getSeedAngleAtStar(seedB, starId);
            if (Math.abs(angleA - angleB) > 1e-6) {
                return angleA - angleB;
            }
            return seedAId.localeCompare(seedBId);
        });

        const segmentCount = sortedSeedIds.length === 2 ? 1 : sortedSeedIds.length;
        for (let i = 0; i < segmentCount; i += 1) {
            const seedAId = sortedSeedIds[i];
            const seedBId = sortedSeedIds[(i + 1) % sortedSeedIds.length];
            if (!seedAId || !seedBId || seedAId === seedBId) continue;

            const seedA = seedById.get(seedAId);
            const seedB = seedById.get(seedBId);
            if (!seedA || !seedB) continue;

            const linkId = `${ownerPair}|${starId}|${seedAId <= seedBId ? `${seedAId}::${seedBId}` : `${seedBId}::${seedAId}`}`;
            const linkLength = Math.hypot(seedB.x - seedA.x, seedB.y - seedA.y);
            const seedAngleA = getSeedAngleAtStar(seedA, starId);
            const seedAngleB = getSeedAngleAtStar(seedB, starId);

            links.push({
                linkId,
                ownerPair,
                viaStarId: starId,
                viaOwner: starById.get(starId)?.ownerId ?? '',
                seedAId,
                seedBId,
                linkLength,
                angleSpan: angleSpan(seedAngleA, seedAngleB),
            });
        }
    }

    const adjacency: Record<string, string[]> = {};
    for (const seed of seeds) {
        adjacency[seed.seedId] = [];
    }

    for (const link of links) {
        adjacency[link.seedAId].push(link.linkId);
        adjacency[link.seedBId].push(link.linkId);
    }

    for (const linkIds of Object.values(adjacency)) {
        linkIds.sort((a, b) => a.localeCompare(b));
    }

    const isolatedSeedIds = seeds
        .map((seed) => seed.seedId)
        .filter((seedId) => (adjacency[seedId]?.length ?? 0) === 0)
        .sort((a, b) => a.localeCompare(b));
    const openSeedIds = seeds
        .map((seed) => seed.seedId)
        .filter((seedId) => (adjacency[seedId]?.length ?? 0) <= 1)
        .sort((a, b) => a.localeCompare(b));

    return {
        ownerPair,
        ownerA,
        ownerB,
        seedIds: seeds.map((seed) => seed.seedId).sort((a, b) => a.localeCompare(b)),
        links,
        adjacency,
        starIncidence,
        isolatedSeedIds,
        openSeedIds,
    };
}

function extractFrontiersFromPairGraph(
    graph: FG2PairTopologyGraph,
    seedById: Map<string, FG2SeedPoint>,
): FG2FrontierPolyline[] {
    const frontiers: FG2FrontierPolyline[] = [];
    const linkById = new Map(graph.links.map((link) => [link.linkId, link]));
    const visitedLinkIds = new Set<string>();
    const degreeBySeedId = new Map(
        graph.seedIds.map((seedId) => [seedId, graph.adjacency[seedId]?.length ?? 0]),
    );

    const singletonSeedIds = graph.seedIds
        .filter((seedId) => (degreeBySeedId.get(seedId) ?? 0) === 0)
        .sort((a, b) => a.localeCompare(b));

    for (const seedId of singletonSeedIds) {
        const seed = seedById.get(seedId);
        if (!seed) continue;
        frontiers.push({
            ownerPair: graph.ownerPair,
            ownerA: graph.ownerA,
            ownerB: graph.ownerB,
            closed: false,
            points: [[seed.x, seed.y]],
        });
    }

    const orderedStartSeedIds = graph.seedIds
        .filter((seedId) => (degreeBySeedId.get(seedId) ?? 0) > 0)
        .sort((seedAId, seedBId) => {
            const degreeA = degreeBySeedId.get(seedAId) ?? 0;
            const degreeB = degreeBySeedId.get(seedBId) ?? 0;
            if ((degreeA === 2) !== (degreeB === 2)) {
                return degreeA === 2 ? 1 : -1;
            }
            if (degreeA !== degreeB) {
                return degreeA - degreeB;
            }
            return seedAId.localeCompare(seedBId);
        });

    for (const startSeedId of orderedStartSeedIds) {
        let remainingLinkIds = (graph.adjacency[startSeedId] ?? []).filter(
            (linkId) => !visitedLinkIds.has(linkId),
        );
        while (remainingLinkIds.length > 0) {
            const startLinkId = chooseNextLink(
                null,
                startSeedId,
                remainingLinkIds,
                linkById,
                seedById,
            );
            if (!startLinkId) break;

            const chain = walkChain(
                startSeedId,
                startLinkId,
                graph.adjacency,
                linkById,
                seedById,
                visitedLinkIds,
            );
            const points = chain.seedIds
                .map((seedId) => seedById.get(seedId))
                .filter((seed): seed is FG2SeedPoint => Boolean(seed))
                .map((seed) => [seed.x, seed.y] as [number, number]);

            if (points.length > 0) {
                frontiers.push({
                    ownerPair: graph.ownerPair,
                    ownerA: graph.ownerA,
                    ownerB: graph.ownerB,
                    closed: chain.closed,
                    points,
                });
            }

            remainingLinkIds = (graph.adjacency[startSeedId] ?? []).filter(
                (linkId) => !visitedLinkIds.has(linkId),
            );
        }
    }

    const remainingLinks = graph.links
        .map((link) => link.linkId)
        .filter((linkId) => !visitedLinkIds.has(linkId))
        .sort((a, b) => a.localeCompare(b));

    for (const linkId of remainingLinks) {
        if (visitedLinkIds.has(linkId)) continue;
        const link = linkById.get(linkId);
        if (!link) continue;

        const chain = walkChain(
            link.seedAId,
            link.linkId,
            graph.adjacency,
            linkById,
            seedById,
            visitedLinkIds,
        );
        const points = chain.seedIds
            .map((seedId) => seedById.get(seedId))
            .filter((seed): seed is FG2SeedPoint => Boolean(seed))
            .map((seed) => [seed.x, seed.y] as [number, number]);

        if (points.length > 0) {
            frontiers.push({
                ownerPair: graph.ownerPair,
                ownerA: graph.ownerA,
                ownerB: graph.ownerB,
                closed: chain.closed,
                points,
            });
        }
    }

    return frontiers;
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
            seedId: `${toLaneId(source.id, target.id)}|${toOwnerPair(source.ownerId, target.ownerId)}`,
            laneId: toLaneId(source.id, target.id),
            sourceId: source.id,
            targetId: target.id,
            sourceOwner: source.ownerId,
            targetOwner: target.ownerId,
            ownerPair: toOwnerPair(source.ownerId, target.ownerId),
            t,
            x: source.x + (target.x - source.x) * t,
            y: source.y + (target.y - source.y) * t,
            biasA,
            biasB,
            laneDistance,
            sourceAngle: normalizeAngle(Math.atan2(target.y - source.y, target.x - source.x)),
            targetAngle: normalizeAngle(Math.atan2(source.y - target.y, source.x - target.x)),
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
    const starById = new Map(runtime.input.stars.map((star) => [star.id, star]));
    const pairGroups: Record<string, FG2SeedPoint[]> = {};

    for (const seed of seeds) {
        if (!pairGroups[seed.ownerPair]) {
            pairGroups[seed.ownerPair] = [];
        }
        pairGroups[seed.ownerPair].push(seed);
    }

    const pairGraphs: Record<string, FG2PairTopologyGraph> = {};
    let topologyLinkCount = 0;

    for (const [ownerPair, pairSeeds] of Object.entries(pairGroups)) {
        const pairGraph = buildPairTopologyGraph(ownerPair, pairSeeds, starById);
        pairGraphs[ownerPair] = pairGraph;
        topologyLinkCount += pairGraph.links.length;
    }

    runtime.artifacts.topology = {
        pairGroups,
        pairGraphs,
        pairCount: Object.keys(pairGraphs).length,
        topologyLinkCount,
    };

    summary.ownerPairCount = Object.keys(pairGraphs).length;
    summary.topologyLinkCount = topologyLinkCount;
    summary.isolatedSeedCount = Object.values(pairGraphs).reduce(
        (sum, pairGraph) => sum + pairGraph.isolatedSeedIds.length,
        0,
    );
}

function executeGeometryStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const topologyArtifact = runtime.artifacts.topology as
        | {
              pairGraphs?: Record<string, FG2PairTopologyGraph>;
          }
        | undefined;
    const seeds = seedArtifact?.seeds ?? [];
    const seedById = new Map(seeds.map((seed) => [seed.seedId, seed]));
    const pairGraphs = topologyArtifact?.pairGraphs ?? {};
    const frontiers: FG2FrontierPolyline[] = [];

    for (const pairGraph of Object.values(pairGraphs)) {
        frontiers.push(...extractFrontiersFromPairGraph(pairGraph, seedById));
    }

    const closedFrontierCount = frontiers.filter((frontier) => frontier.closed).length;
    const openFrontierCount = frontiers.length - closedFrontierCount;
    const frontierPointCount = frontiers.reduce((sum, frontier) => sum + frontier.points.length, 0);

    runtime.artifacts.geometry = {
        frontierCount: frontiers.length,
        frontiers,
        frontierPointCount,
        closedFrontierCount,
        openFrontierCount,
    };

    summary.frontierCount = frontiers.length;
    summary.frontierPointCount = frontierPointCount;
    summary.closedFrontierCount = closedFrontierCount;
    summary.openFrontierCount = openFrontierCount;
}

function executeLoopStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const geometryArtifact = runtime.artifacts.geometry as
        | { frontiers?: FG2FrontierPolyline[] }
        | undefined;
    const frontiers = geometryArtifact?.frontiers ?? [];
    const ownerLoopHints: Record<string, number> = {};
    let closedFrontierCount = 0;

    for (const frontier of frontiers) {
        ownerLoopHints[frontier.ownerA] = (ownerLoopHints[frontier.ownerA] ?? 0) + 1;
        ownerLoopHints[frontier.ownerB] = (ownerLoopHints[frontier.ownerB] ?? 0) + 1;
        if (frontier.closed) {
            closedFrontierCount += 1;
        }
    }

    runtime.artifacts.loop = {
        ownerLoopHints,
        ownerCount: Object.keys(ownerLoopHints).length,
        closedFrontierCount,
    };

    summary.ownerLoopHintCount = Object.keys(ownerLoopHints).length;
    summary.closedFrontierCount = closedFrontierCount;
}

function executeAnimationStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    runtime.artifacts.animation = {
        transitionMode: runtime.selection.mode,
        gameNowMs: runtime.input.gameNowMs,
    };

    summary.animationReady = true;
}

function executeRenderStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const topologyArtifact = runtime.artifacts.topology as
        | {
              pairGraphs?: Record<string, FG2PairTopologyGraph>;
          }
        | undefined;
    const geometryArtifact = runtime.artifacts.geometry as
        | { frontiers?: FG2FrontierPolyline[] }
        | undefined;
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const pairGraphs = topologyArtifact?.pairGraphs ?? {};
    const frontiers = geometryArtifact?.frontiers ?? [];
    const seeds = seedArtifact?.seeds ?? [];

    const graphics = getOrCreateGraphics(runtime.input.container);
    graphics.clear();

    const borderWidth = Math.max(1, GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 3);
    const borderAlpha = Math.max(0, Math.min(1, GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.9));

    if (GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE) {
        for (const pairGraph of Object.values(pairGraphs)) {
            const traceColor = blendColors(
                runtime.input.colorUtils.getPlayerColor(pairGraph.ownerA),
                runtime.input.colorUtils.getPlayerColor(pairGraph.ownerB),
            );
            for (const link of pairGraph.links) {
                const seedA = seeds.find((seed) => seed.seedId === link.seedAId);
                const seedB = seeds.find((seed) => seed.seedId === link.seedBId);
                if (!seedA || !seedB) continue;
                graphics.moveTo(seedA.x, seedA.y);
                graphics.lineTo(seedB.x, seedB.y);
                graphics.stroke({
                    color: traceColor,
                    width: Math.max(1, borderWidth * 0.33),
                    alpha: borderAlpha * 0.2,
                    cap: 'round',
                    join: 'round',
                });
            }
        }
    }

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
        if (frontier.closed && frontier.points.length > 2) {
            graphics.lineTo(frontier.points[0][0], frontier.points[0][1]);
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
