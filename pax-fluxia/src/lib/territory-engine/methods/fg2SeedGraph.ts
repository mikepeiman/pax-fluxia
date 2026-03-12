import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { TerritoryPipelineRuntime, TerritoryPipelineStageId } from '../types';

type FG2StageRuntime = TerritoryPipelineRuntime;
type FG2BoundarySide = 'top' | 'right' | 'bottom' | 'left';

interface FG2WorldBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

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

interface FG2GraphNode {
    nodeId: string;
    ownerPair: string;
    nodeType: 'seed' | 'junction' | 'boundary';
    x: number;
    y: number;
    starId?: string;
    boundarySide?: FG2BoundarySide;
}

interface FG2TopologyLink {
    linkId: string;
    ownerPair: string;
    nodeAId: string;
    nodeBId: string;
    linkKind: 'star_arc' | 'boundary_extension';
    viaStarId?: string;
    viaOwner?: string;
    linkLength: number;
    angleSpan: number;
}

interface FG2PairTopologyGraph {
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    nodeIds: string[];
    nodes: FG2GraphNode[];
    links: FG2TopologyLink[];
    adjacency: Record<string, string[]>;
    starIncidence: Record<string, string[]>;
    isolatedSeedIds: string[];
    openSeedIds: string[];
    boundaryAnchorIds: string[];
    junctionIds: string[];
}

interface FG2FrontierPolyline {
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    closed: boolean;
    points: [number, number][];
}

interface FG2BoundaryAnchorResult {
    x: number;
    y: number;
    boundarySide: FG2BoundarySide;
    distance: number;
}

const FG2_GRAPHICS_NAME = 'territory-engine-fg2-frontier-graphics';
const TAU = Math.PI * 2;
const EPSILON = 0.0001;

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

function orderedAngleDelta(angleA: number, angleB: number): number {
    const normalizedA = normalizeAngle(angleA);
    const normalizedB = normalizeAngle(angleB);
    const delta = normalizedB - normalizedA;
    return delta < 0 ? delta + TAU : delta;
}

function shortestSignedAngleDelta(angleA: number, angleB: number): number {
    let delta = normalizeAngle(angleB) - normalizeAngle(angleA);
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    return delta;
}

function directedMidAngle(angleA: number, angleB: number): number {
    return normalizeAngle(angleA + orderedAngleDelta(angleA, angleB) * 0.5);
}

function shortestMidAngle(angleA: number, angleB: number): number {
    return normalizeAngle(angleA + shortestSignedAngleDelta(angleA, angleB) * 0.5);
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

function getOppositeNodeId(link: FG2TopologyLink, nodeId: string): string {
    return link.nodeAId === nodeId ? link.nodeBId : link.nodeAId;
}

function computeJunctionRadius(star: StarState | undefined): number {
    const starRadius = star?.radius ?? 20;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 0;
    return starRadius + Math.max(8, starMargin * 0.28);
}

function projectRayToWorldBounds(
    originX: number,
    originY: number,
    directionX: number,
    directionY: number,
    bounds: FG2WorldBounds,
): FG2BoundaryAnchorResult {
    const candidates: FG2BoundaryAnchorResult[] = [];

    if (Math.abs(directionX) > EPSILON) {
        const targetX = directionX > 0 ? bounds.maxX : bounds.minX;
        const t = (targetX - originX) / directionX;
        if (t > EPSILON) {
            const y = originY + directionY * t;
            if (y >= bounds.minY - EPSILON && y <= bounds.maxY + EPSILON) {
                candidates.push({
                    x: targetX,
                    y: clamp(y, bounds.minY, bounds.maxY),
                    boundarySide: directionX > 0 ? 'right' : 'left',
                    distance: Math.hypot(directionX * t, directionY * t),
                });
            }
        }
    }

    if (Math.abs(directionY) > EPSILON) {
        const targetY = directionY > 0 ? bounds.maxY : bounds.minY;
        const t = (targetY - originY) / directionY;
        if (t > EPSILON) {
            const x = originX + directionX * t;
            if (x >= bounds.minX - EPSILON && x <= bounds.maxX + EPSILON) {
                candidates.push({
                    x: clamp(x, bounds.minX, bounds.maxX),
                    y: targetY,
                    boundarySide: directionY > 0 ? 'bottom' : 'top',
                    distance: Math.hypot(directionX * t, directionY * t),
                });
            }
        }
    }

    if (candidates.length > 0) {
        return candidates.sort((a, b) => a.distance - b.distance)[0];
    }

    const fallback = [
        {
            x: bounds.minX,
            y: clamp(originY, bounds.minY, bounds.maxY),
            boundarySide: 'left' as const,
            distance: Math.abs(originX - bounds.minX),
        },
        {
            x: bounds.maxX,
            y: clamp(originY, bounds.minY, bounds.maxY),
            boundarySide: 'right' as const,
            distance: Math.abs(bounds.maxX - originX),
        },
        {
            x: clamp(originX, bounds.minX, bounds.maxX),
            y: bounds.minY,
            boundarySide: 'top' as const,
            distance: Math.abs(originY - bounds.minY),
        },
        {
            x: clamp(originX, bounds.minX, bounds.maxX),
            y: bounds.maxY,
            boundarySide: 'bottom' as const,
            distance: Math.abs(bounds.maxY - originY),
        },
    ];

    return fallback.sort((a, b) => a.distance - b.distance)[0];
}

function createBoundaryAnchor(
    seed: FG2SeedPoint,
    star: StarState,
    bounds: FG2WorldBounds,
): FG2BoundaryAnchorResult {
    const rawDirectionX = seed.x - star.x;
    const rawDirectionY = seed.y - star.y;
    const magnitude = Math.hypot(rawDirectionX, rawDirectionY);
    const directionX = magnitude > EPSILON ? rawDirectionX / magnitude : 1;
    const directionY = magnitude > EPSILON ? rawDirectionY / magnitude : 0;

    return projectRayToWorldBounds(seed.x, seed.y, directionX, directionY, bounds);
}

function chooseNextLink(
    previousNodeId: string | null,
    previousLinkId: string | null,
    currentNodeId: string,
    candidateLinkIds: string[],
    linkById: Map<string, FG2TopologyLink>,
    nodeById: Map<string, FG2GraphNode>,
): string | null {
    if (candidateLinkIds.length === 0) return null;

    let eligibleLinkIds = candidateLinkIds.slice();
    const currentNode = nodeById.get(currentNodeId);
    const previousLink = previousLinkId ? linkById.get(previousLinkId) : null;
    if (currentNode?.nodeType === 'seed' && previousLink?.viaStarId) {
        const oppositeSideLinks = eligibleLinkIds.filter((linkId) => {
            const link = linkById.get(linkId);
            return link?.viaStarId !== previousLink.viaStarId;
        });
        if (oppositeSideLinks.length > 0) {
            eligibleLinkIds = oppositeSideLinks;
        }
    }

    if (!previousNodeId || eligibleLinkIds.length === 1) {
        return eligibleLinkIds.sort((a, b) => a.localeCompare(b))[0];
    }

    const previousNode = nodeById.get(previousNodeId);
    if (!previousNode || !currentNode) {
        return eligibleLinkIds.sort((a, b) => a.localeCompare(b))[0];
    }

    const incomingX = currentNode.x - previousNode.x;
    const incomingY = currentNode.y - previousNode.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    if (incomingLength <= EPSILON) {
        return eligibleLinkIds.sort((a, b) => a.localeCompare(b))[0];
    }

    let bestLinkId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const linkId of eligibleLinkIds) {
        const link = linkById.get(linkId);
        if (!link) continue;
        const nextNode = nodeById.get(getOppositeNodeId(link, currentNodeId));
        if (!nextNode) continue;

        const outgoingX = nextNode.x - currentNode.x;
        const outgoingY = nextNode.y - currentNode.y;
        const outgoingLength = Math.hypot(outgoingX, outgoingY);
        if (outgoingLength <= EPSILON) continue;

        const straightness =
            (incomingX * outgoingX + incomingY * outgoingY) /
            (incomingLength * outgoingLength);
        const sideSwitchBonus =
            currentNode.nodeType === 'seed' &&
            previousLink?.viaStarId &&
            link.viaStarId &&
            link.viaStarId !== previousLink.viaStarId
                ? 0.35
                : 0;
        const boundaryPenalty = link.linkKind === 'boundary_extension' ? 0.05 : 0;
        const score =
            straightness +
            sideSwitchBonus -
            boundaryPenalty -
            link.angleSpan * 0.002 -
            link.linkLength * 0.0001;

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

    return bestLinkId ?? eligibleLinkIds.sort((a, b) => a.localeCompare(b))[0];
}

function walkChain(
    startNodeId: string,
    startLinkId: string,
    adjacency: Record<string, string[]>,
    linkById: Map<string, FG2TopologyLink>,
    nodeById: Map<string, FG2GraphNode>,
    visitedLinkIds: Set<string>,
): { nodeIds: string[]; closed: boolean } {
    const nodeIds = [startNodeId];
    let currentNodeId = startNodeId;
    let currentLinkId: string | null = startLinkId;
    let closed = false;

    while (currentLinkId) {
        if (visitedLinkIds.has(currentLinkId)) break;
        visitedLinkIds.add(currentLinkId);

        const currentLink = linkById.get(currentLinkId);
        if (!currentLink) break;

        const nextNodeId = getOppositeNodeId(currentLink, currentNodeId);
        if (nextNodeId === startNodeId && nodeIds.length > 2) {
            closed = true;
            break;
        }

        nodeIds.push(nextNodeId);

        const candidateLinkIds = (adjacency[nextNodeId] ?? []).filter(
            (linkId) => !visitedLinkIds.has(linkId),
        );
        if (candidateLinkIds.length === 0) {
            break;
        }

        const nextLinkId = chooseNextLink(
            currentNodeId,
            currentLinkId,
            nextNodeId,
            candidateLinkIds,
            linkById,
            nodeById,
        );
        if (!nextLinkId) {
            break;
        }

        currentNodeId = nextNodeId;
        currentLinkId = nextLinkId;
    }

    return { nodeIds, closed };
}

function buildPairTopologyGraph(
    ownerPair: string,
    seeds: FG2SeedPoint[],
    starById: Map<string, StarState>,
    bounds: FG2WorldBounds,
): FG2PairTopologyGraph {
    const [ownerA, ownerB] = ownerPair.split('::');
    const seedById = new Map(seeds.map((seed) => [seed.seedId, seed]));
    const starIncidence: Record<string, string[]> = {};
    const nodes: FG2GraphNode[] = [];
    const nodeById = new Map<string, FG2GraphNode>();
    const links: FG2TopologyLink[] = [];
    const linkById = new Map<string, FG2TopologyLink>();
    const adjacency: Record<string, string[]> = {};
    const junctionIds: string[] = [];
    const boundaryAnchorIds: string[] = [];

    function addNode(node: FG2GraphNode): void {
        if (nodeById.has(node.nodeId)) return;
        nodeById.set(node.nodeId, node);
        nodes.push(node);
        adjacency[node.nodeId] = [];
        if (node.nodeType === 'junction') junctionIds.push(node.nodeId);
        if (node.nodeType === 'boundary') boundaryAnchorIds.push(node.nodeId);
    }

    function addLink(link: FG2TopologyLink): void {
        if (linkById.has(link.linkId)) return;
        linkById.set(link.linkId, link);
        links.push(link);
        adjacency[link.nodeAId].push(link.linkId);
        adjacency[link.nodeBId].push(link.linkId);
    }

    for (const seed of seeds) {
        addNode({
            nodeId: seed.seedId,
            ownerPair: seed.ownerPair,
            nodeType: 'seed',
            x: seed.x,
            y: seed.y,
        });
        if (!starIncidence[seed.sourceId]) {
            starIncidence[seed.sourceId] = [];
        }
        if (!starIncidence[seed.targetId]) {
            starIncidence[seed.targetId] = [];
        }
        starIncidence[seed.sourceId].push(seed.seedId);
        starIncidence[seed.targetId].push(seed.seedId);
    }

    for (const [starId, incidentSeedIds] of Object.entries(starIncidence)) {
        if (incidentSeedIds.length < 2) continue;

        const star = starById.get(starId);
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

        const pairCount = sortedSeedIds.length === 2 ? 1 : sortedSeedIds.length;
        for (let i = 0; i < pairCount; i += 1) {
            const seedAId = sortedSeedIds[i];
            const seedBId = sortedSeedIds[(i + 1) % sortedSeedIds.length];
            if (!seedAId || !seedBId || seedAId === seedBId) continue;

            const seedA = seedById.get(seedAId);
            const seedB = seedById.get(seedBId);
            if (!seedA || !seedB) continue;

            const seedAngleA = getSeedAngleAtStar(seedA, starId);
            const seedAngleB = getSeedAngleAtStar(seedB, starId);
            const localAngleSpan =
                sortedSeedIds.length === 2
                    ? angleSpan(seedAngleA, seedAngleB)
                    : orderedAngleDelta(seedAngleA, seedAngleB);
            const midAngle =
                sortedSeedIds.length === 2
                    ? shortestMidAngle(seedAngleA, seedAngleB)
                    : directedMidAngle(seedAngleA, seedAngleB);
            const junctionRadius = computeJunctionRadius(star);
            const junctionId =
                `${ownerPair}|junction|${starId}|` +
                `${seedAId <= seedBId ? `${seedAId}::${seedBId}` : `${seedBId}::${seedAId}`}`;
            const junctionNode: FG2GraphNode = {
                nodeId: junctionId,
                ownerPair,
                nodeType: 'junction',
                x: (star?.x ?? 0) + Math.cos(midAngle) * junctionRadius,
                y: (star?.y ?? 0) + Math.sin(midAngle) * junctionRadius,
                starId,
            };
            addNode(junctionNode);

            const linkA: FG2TopologyLink = {
                linkId: `${ownerPair}|star_arc|${starId}|${seedAId}|${junctionId}`,
                ownerPair,
                nodeAId: seedAId,
                nodeBId: junctionId,
                linkKind: 'star_arc',
                viaStarId: starId,
                viaOwner: star?.ownerId ?? '',
                linkLength: Math.hypot(junctionNode.x - seedA.x, junctionNode.y - seedA.y),
                angleSpan: localAngleSpan * 0.5,
            };
            const linkB: FG2TopologyLink = {
                linkId: `${ownerPair}|star_arc|${starId}|${junctionId}|${seedBId}`,
                ownerPair,
                nodeAId: junctionId,
                nodeBId: seedBId,
                linkKind: 'star_arc',
                viaStarId: starId,
                viaOwner: star?.ownerId ?? '',
                linkLength: Math.hypot(junctionNode.x - seedB.x, junctionNode.y - seedB.y),
                angleSpan: localAngleSpan * 0.5,
            };
            addLink(linkA);
            addLink(linkB);
        }
    }

    for (const seed of seeds) {
        const sourceIncidentCount = starIncidence[seed.sourceId]?.length ?? 0;
        const targetIncidentCount = starIncidence[seed.targetId]?.length ?? 0;

        if (sourceIncidentCount <= 1) {
            const star = starById.get(seed.sourceId);
            if (star) {
                const boundaryAnchor = createBoundaryAnchor(seed, star, bounds);
                const boundaryNodeId =
                    `${ownerPair}|boundary|${seed.seedId}|${star.id}|${boundaryAnchor.boundarySide}`;
                addNode({
                    nodeId: boundaryNodeId,
                    ownerPair,
                    nodeType: 'boundary',
                    x: boundaryAnchor.x,
                    y: boundaryAnchor.y,
                    starId: star.id,
                    boundarySide: boundaryAnchor.boundarySide,
                });
                addLink({
                    linkId: `${ownerPair}|boundary_extension|${star.id}|${seed.seedId}|${boundaryNodeId}`,
                    ownerPair,
                    nodeAId: seed.seedId,
                    nodeBId: boundaryNodeId,
                    linkKind: 'boundary_extension',
                    viaStarId: star.id,
                    viaOwner: star.ownerId,
                    linkLength: boundaryAnchor.distance,
                    angleSpan: 0,
                });
            }
        }

        if (targetIncidentCount <= 1) {
            const star = starById.get(seed.targetId);
            if (star) {
                const boundaryAnchor = createBoundaryAnchor(seed, star, bounds);
                const boundaryNodeId =
                    `${ownerPair}|boundary|${seed.seedId}|${star.id}|${boundaryAnchor.boundarySide}`;
                addNode({
                    nodeId: boundaryNodeId,
                    ownerPair,
                    nodeType: 'boundary',
                    x: boundaryAnchor.x,
                    y: boundaryAnchor.y,
                    starId: star.id,
                    boundarySide: boundaryAnchor.boundarySide,
                });
                addLink({
                    linkId: `${ownerPair}|boundary_extension|${star.id}|${seed.seedId}|${boundaryNodeId}`,
                    ownerPair,
                    nodeAId: seed.seedId,
                    nodeBId: boundaryNodeId,
                    linkKind: 'boundary_extension',
                    viaStarId: star.id,
                    viaOwner: star.ownerId,
                    linkLength: boundaryAnchor.distance,
                    angleSpan: 0,
                });
            }
        }
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
        nodeIds: nodes.map((node) => node.nodeId).sort((a, b) => a.localeCompare(b)),
        nodes,
        links,
        adjacency,
        starIncidence,
        isolatedSeedIds,
        openSeedIds,
        boundaryAnchorIds: boundaryAnchorIds.sort((a, b) => a.localeCompare(b)),
        junctionIds: junctionIds.sort((a, b) => a.localeCompare(b)),
    };
}

function extractFrontiersFromPairGraph(graph: FG2PairTopologyGraph): FG2FrontierPolyline[] {
    const frontiers: FG2FrontierPolyline[] = [];
    const nodeById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
    const linkById = new Map(graph.links.map((link) => [link.linkId, link]));
    const visitedLinkIds = new Set<string>();
    const degreeByNodeId = new Map(
        graph.nodeIds.map((nodeId) => [nodeId, graph.adjacency[nodeId]?.length ?? 0]),
    );
    const nodeTypePriority: Record<FG2GraphNode['nodeType'], number> = {
        boundary: 0,
        seed: 1,
        junction: 2,
    };

    const singletonNodeIds = graph.nodeIds
        .filter((nodeId) => (degreeByNodeId.get(nodeId) ?? 0) === 0)
        .sort((nodeAId, nodeBId) => {
            const nodeA = nodeById.get(nodeAId);
            const nodeB = nodeById.get(nodeBId);
            if (nodeA && nodeB && nodeA.nodeType !== nodeB.nodeType) {
                return nodeTypePriority[nodeA.nodeType] - nodeTypePriority[nodeB.nodeType];
            }
            return nodeAId.localeCompare(nodeBId);
        });

    for (const nodeId of singletonNodeIds) {
        const node = nodeById.get(nodeId);
        if (!node) continue;
        frontiers.push({
            ownerPair: graph.ownerPair,
            ownerA: graph.ownerA,
            ownerB: graph.ownerB,
            closed: false,
            points: [[node.x, node.y]],
        });
    }

    const orderedStartNodeIds = graph.nodeIds
        .filter((nodeId) => (degreeByNodeId.get(nodeId) ?? 0) > 0)
        .sort((nodeAId, nodeBId) => {
            const degreeA = degreeByNodeId.get(nodeAId) ?? 0;
            const degreeB = degreeByNodeId.get(nodeBId) ?? 0;
            if ((degreeA === 2) !== (degreeB === 2)) {
                return degreeA === 2 ? 1 : -1;
            }
            const nodeA = nodeById.get(nodeAId);
            const nodeB = nodeById.get(nodeBId);
            if (nodeA && nodeB && nodeA.nodeType !== nodeB.nodeType) {
                return nodeTypePriority[nodeA.nodeType] - nodeTypePriority[nodeB.nodeType];
            }
            if (degreeA !== degreeB) {
                return degreeA - degreeB;
            }
            return nodeAId.localeCompare(nodeBId);
        });

    for (const startNodeId of orderedStartNodeIds) {
        let remainingLinkIds = (graph.adjacency[startNodeId] ?? []).filter(
            (linkId) => !visitedLinkIds.has(linkId),
        );
        while (remainingLinkIds.length > 0) {
            const startLinkId = chooseNextLink(
                null,
                null,
                startNodeId,
                remainingLinkIds,
                linkById,
                nodeById,
            );
            if (!startLinkId) break;

            const chain = walkChain(
                startNodeId,
                startLinkId,
                graph.adjacency,
                linkById,
                nodeById,
                visitedLinkIds,
            );
            const points = chain.nodeIds
                .map((nodeId) => nodeById.get(nodeId))
                .filter((node): node is FG2GraphNode => Boolean(node))
                .map((node) => [node.x, node.y] as [number, number]);

            if (points.length > 0) {
                frontiers.push({
                    ownerPair: graph.ownerPair,
                    ownerA: graph.ownerA,
                    ownerB: graph.ownerB,
                    closed: chain.closed,
                    points,
                });
            }

            remainingLinkIds = (graph.adjacency[startNodeId] ?? []).filter(
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
            link.nodeAId,
            link.linkId,
            graph.adjacency,
            linkById,
            nodeById,
            visitedLinkIds,
        );
        const points = chain.nodeIds
            .map((nodeId) => nodeById.get(nodeId))
            .filter((node): node is FG2GraphNode => Boolean(node))
            .map((node) => [node.x, node.y] as [number, number]);

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
    const worldExtensionArtifact = runtime.artifacts.world_extension as FG2WorldBounds | undefined;
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const seeds = seedArtifact?.seeds ?? [];
    const starById = new Map(runtime.input.stars.map((star) => [star.id, star]));
    const pairGroups: Record<string, FG2SeedPoint[]> = {};
    const bounds: FG2WorldBounds = worldExtensionArtifact ?? {
        minX: 0,
        minY: 0,
        maxX: runtime.input.worldWidth,
        maxY: runtime.input.worldHeight,
    };

    for (const seed of seeds) {
        if (!pairGroups[seed.ownerPair]) {
            pairGroups[seed.ownerPair] = [];
        }
        pairGroups[seed.ownerPair].push(seed);
    }

    const pairGraphs: Record<string, FG2PairTopologyGraph> = {};
    let topologyLinkCount = 0;
    let graphNodeCount = 0;
    let junctionCount = 0;
    let boundaryAnchorCount = 0;

    for (const [ownerPair, pairSeeds] of Object.entries(pairGroups)) {
        const pairGraph = buildPairTopologyGraph(ownerPair, pairSeeds, starById, bounds);
        pairGraphs[ownerPair] = pairGraph;
        topologyLinkCount += pairGraph.links.length;
        graphNodeCount += pairGraph.nodes.length;
        junctionCount += pairGraph.junctionIds.length;
        boundaryAnchorCount += pairGraph.boundaryAnchorIds.length;
    }

    runtime.artifacts.topology = {
        pairGroups,
        pairGraphs,
        pairCount: Object.keys(pairGraphs).length,
        topologyLinkCount,
        graphNodeCount,
        junctionCount,
        boundaryAnchorCount,
    };

    summary.ownerPairCount = Object.keys(pairGraphs).length;
    summary.topologyLinkCount = topologyLinkCount;
    summary.graphNodeCount = graphNodeCount;
    summary.junctionCount = junctionCount;
    summary.boundaryAnchorCount = boundaryAnchorCount;
    summary.isolatedSeedCount = Object.values(pairGraphs).reduce(
        (sum, pairGraph) => sum + pairGraph.isolatedSeedIds.length,
        0,
    );
}

function executeGeometryStage(runtime: FG2StageRuntime, summary: Record<string, unknown>): void {
    const topologyArtifact = runtime.artifacts.topology as
        | {
              pairGraphs?: Record<string, FG2PairTopologyGraph>;
          }
        | undefined;
    const pairGraphs = topologyArtifact?.pairGraphs ?? {};
    const frontiers: FG2FrontierPolyline[] = [];

    for (const pairGraph of Object.values(pairGraphs)) {
        frontiers.push(...extractFrontiersFromPairGraph(pairGraph));
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
            const nodeById = new Map(pairGraph.nodes.map((node) => [node.nodeId, node]));
            for (const link of pairGraph.links) {
                const nodeA = nodeById.get(link.nodeAId);
                const nodeB = nodeById.get(link.nodeBId);
                if (!nodeA || !nodeB) continue;
                graphics.moveTo(nodeA.x, nodeA.y);
                graphics.lineTo(nodeB.x, nodeB.y);
                graphics.stroke({
                    color: traceColor,
                    width: Math.max(1, borderWidth * 0.3),
                    alpha: borderAlpha * 0.18,
                    cap: 'round',
                    join: 'round',
                });
            }

            for (const node of pairGraph.nodes) {
                if (node.nodeType === 'seed') continue;
                const color = node.nodeType === 'junction' ? 0xffd166 : 0x7bdff2;
                const radius = node.nodeType === 'junction' ? 1.4 : 2.1;
                graphics.circle(node.x, node.y, radius);
                graphics.fill({ color, alpha: 0.9 });
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
