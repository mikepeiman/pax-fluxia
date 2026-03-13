import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { TerritoryPipelineRuntime, TerritoryPipelineStageId } from '../types';

type FG2StageRuntime = TerritoryPipelineRuntime;
type FG2BoundarySide = 'top' | 'right' | 'bottom' | 'left';
type FG2CornerKind = 'top_left' | 'top_right' | 'bottom_right' | 'bottom_left';

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
    nodeType: 'seed' | 'junction' | 'boundary' | 'corner';
    x: number;
    y: number;
    starId?: string;
    boundarySide?: FG2BoundarySide;
    cornerKind?: FG2CornerKind;
}

interface FG2TopologyLink {
    linkId: string;
    ownerPair: string;
    nodeAId: string;
    nodeBId: string;
    linkKind: 'star_arc' | 'boundary_extension' | 'boundary_perimeter';
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
    cornerIds: string[];
    junctionIds: string[];
    boundaryPerimeterLinkCount: number;
}

interface FG2SharedStarJunction {
    starId: string;
    junctionId: string;
    seedAId: string;
    seedBId: string;
    x: number;
    y: number;
    localAngleSpan: number;
}

interface FG2HalfEdge {
    halfEdgeId: string;
    ownerPair: string;
    linkId: string;
    fromNodeId: string;
    toNodeId: string;
    twinHalfEdgeId: string;
    angle: number;
    leftNextHalfEdgeId: string | null;
    rightNextHalfEdgeId: string | null;
}

interface FG2FaceWalk {
    faceWalkId: string;
    ownerPair: string;
    closed: boolean;
    halfEdgeIds: string[];
    nodeIds: string[];
    area: number;
    absArea: number;
    seedNodeCount: number;
    junctionNodeCount: number;
    boundaryNodeCount: number;
    cornerNodeCount: number;
    starArcLinkCount: number;
    boundaryExtensionLinkCount: number;
    boundaryPerimeterLinkCount: number;
    touchesWorldBoundary: boolean;
    isExteriorCandidate: boolean;
    isCanonicalCandidate: boolean;
}

interface FG2PairHalfEdgeGraph {
    ownerPair: string;
    halfEdges: FG2HalfEdge[];
    leftFaceWalks: FG2FaceWalk[];
    canonicalFaceWalks: FG2FaceWalk[];
    exteriorFaceWalkId: string | null;
    closedLeftFaceCount: number;
    openLeftWalkCount: number;
    canonicalFaceWalkCount: number;
}

interface FG2RegionLoopArtifact {
    loopId: string;
    ownerPair: string;
    ownerA: string;
    ownerB: string;
    sourceFaceWalkId: string;
    kind: 'canonical_candidate' | 'exterior_candidate';
    points: [number, number][];
    area: number;
    absArea: number;
    touchesWorldBoundary: boolean;
    boundaryPerimeterLinkCount: number;
}

interface FG2OwnerRegionLoopArtifact {
    regionLoopId: string;
    ownerId: string;
    opposingOwnerId: string;
    ownerPair: string;
    sourceFaceWalkId: string;
    points: [number, number][];
    area: number;
    absArea: number;
    touchesWorldBoundary: boolean;
    ownerHintCount: number;
    opposingHintCount: number;
    confidence: number;
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
const BOUNDARY_SIDE_CLOCKWISE_ORDER: FG2BoundarySide[] = ['top', 'right', 'bottom', 'left'];

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

function getNextClockwiseBoundarySide(side: FG2BoundarySide): FG2BoundarySide {
    const sideIndex = BOUNDARY_SIDE_CLOCKWISE_ORDER.indexOf(side);
    if (sideIndex < 0) return 'top';
    return BOUNDARY_SIDE_CLOCKWISE_ORDER[
        (sideIndex + 1) % BOUNDARY_SIDE_CLOCKWISE_ORDER.length
    ];
}

function getBoundaryCornerAfterSide(
    side: FG2BoundarySide,
    bounds: FG2WorldBounds,
): { cornerKind: FG2CornerKind; x: number; y: number } {
    if (side === 'top') {
        return { cornerKind: 'top_right', x: bounds.maxX, y: bounds.minY };
    }
    if (side === 'right') {
        return { cornerKind: 'bottom_right', x: bounds.maxX, y: bounds.maxY };
    }
    if (side === 'bottom') {
        return { cornerKind: 'bottom_left', x: bounds.minX, y: bounds.maxY };
    }
    return { cornerKind: 'top_left', x: bounds.minX, y: bounds.minY };
}

function getBoundaryPerimeterLength(bounds: FG2WorldBounds): number {
    const width = Math.max(0, bounds.maxX - bounds.minX);
    const height = Math.max(0, bounds.maxY - bounds.minY);
    return width * 2 + height * 2;
}

function getBoundaryPerimeterPosition(node: FG2GraphNode, bounds: FG2WorldBounds): number {
    const width = Math.max(0, bounds.maxX - bounds.minX);
    const height = Math.max(0, bounds.maxY - bounds.minY);
    const clampedX = clamp(node.x, bounds.minX, bounds.maxX);
    const clampedY = clamp(node.y, bounds.minY, bounds.maxY);

    if (node.boundarySide === 'top') {
        return clampedX - bounds.minX;
    }
    if (node.boundarySide === 'right') {
        return width + (clampedY - bounds.minY);
    }
    if (node.boundarySide === 'bottom') {
        return width + height + (bounds.maxX - clampedX);
    }
    if (node.boundarySide === 'left') {
        return width + height + width + (bounds.maxY - clampedY);
    }
    return 0;
}

function getClockwiseBoundaryDistance(
    startNode: FG2GraphNode,
    endNode: FG2GraphNode,
    bounds: FG2WorldBounds,
): number {
    const perimeter = Math.max(EPSILON, getBoundaryPerimeterLength(bounds));
    const startPosition = getBoundaryPerimeterPosition(startNode, bounds);
    const endPosition = getBoundaryPerimeterPosition(endNode, bounds);
    return endPosition >= startPosition
        ? endPosition - startPosition
        : perimeter - startPosition + endPosition;
}

function buildBoundaryAnchorPairs(
    boundaryNodes: FG2GraphNode[],
    bounds: FG2WorldBounds,
): Array<[FG2GraphNode, FG2GraphNode]> {
    const orderedNodes = boundaryNodes
        .slice()
        .sort((nodeA, nodeB) => {
            const positionDelta =
                getBoundaryPerimeterPosition(nodeA, bounds) -
                getBoundaryPerimeterPosition(nodeB, bounds);
            if (Math.abs(positionDelta) > EPSILON) {
                return positionDelta;
            }
            return nodeA.nodeId.localeCompare(nodeB.nodeId);
        });

    if (orderedNodes.length < 2) {
        return [];
    }

    if (orderedNodes.length % 2 !== 0) {
        const fallbackPairs: Array<[FG2GraphNode, FG2GraphNode]> = [];
        for (let i = 0; i + 1 < orderedNodes.length; i += 2) {
            fallbackPairs.push([orderedNodes[i], orderedNodes[i + 1]]);
        }
        return fallbackPairs;
    }

    function buildPairs(offset: 0 | 1): {
        pairs: Array<[FG2GraphNode, FG2GraphNode]>;
        totalDistance: number;
    } {
        const pairs: Array<[FG2GraphNode, FG2GraphNode]> = [];
        let totalDistance = 0;

        if (offset === 0) {
            for (let i = 0; i < orderedNodes.length; i += 2) {
                const startNode = orderedNodes[i];
                const endNode = orderedNodes[i + 1];
                pairs.push([startNode, endNode]);
                totalDistance += getClockwiseBoundaryDistance(startNode, endNode, bounds);
            }
            return { pairs, totalDistance };
        }

        for (let i = 1; i < orderedNodes.length; i += 2) {
            const startNode = orderedNodes[i];
            const endNode = orderedNodes[(i + 1) % orderedNodes.length];
            pairs.push([startNode, endNode]);
            totalDistance += getClockwiseBoundaryDistance(startNode, endNode, bounds);
        }

        return { pairs, totalDistance };
    }

    const pairingA = buildPairs(0);
    const pairingB = buildPairs(1);
    return pairingB.totalDistance + EPSILON < pairingA.totalDistance ? pairingB.pairs : pairingA.pairs;
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

function buildGlobalStarIncidence(seeds: FG2SeedPoint[]): Record<string, string[]> {
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

    for (const incidentSeedIds of Object.values(starIncidence)) {
        incidentSeedIds.sort((a, b) => a.localeCompare(b));
    }

    return starIncidence;
}

function computeJunctionRadius(star: StarState | undefined): number {
    const starRadius = star?.radius ?? 20;
    const starMargin = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 0;
    return starRadius + Math.max(8, starMargin * 0.28);
}

function buildGlobalStarJunctionCatalog(
    seeds: FG2SeedPoint[],
    starById: Map<string, StarState>,
): Record<string, FG2SharedStarJunction[]> {
    const starIncidence = buildGlobalStarIncidence(seeds);
    const seedById = new Map(seeds.map((seed) => [seed.seedId, seed]));
    const junctionsByStarId: Record<string, FG2SharedStarJunction[]> = {};

    for (const [starId, incidentSeedIds] of Object.entries(starIncidence)) {
        if (incidentSeedIds.length < 2) continue;

        const star = starById.get(starId);
        if (!star) continue;

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
        const starJunctions: FG2SharedStarJunction[] = [];
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
            const orderedPair =
                seedAId <= seedBId ? `${seedAId}::${seedBId}` : `${seedBId}::${seedAId}`;
            starJunctions.push({
                starId,
                junctionId: `global|junction|${starId}|${orderedPair}`,
                seedAId,
                seedBId,
                x: star.x + Math.cos(midAngle) * junctionRadius,
                y: star.y + Math.sin(midAngle) * junctionRadius,
                localAngleSpan,
            });
        }

        if (starJunctions.length > 0) {
            junctionsByStarId[starId] = starJunctions.sort((a, b) =>
                a.junctionId.localeCompare(b.junctionId),
            );
        }
    }

    return junctionsByStarId;
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
        const boundaryPenalty =
            link.linkKind === 'boundary_extension' || link.linkKind === 'boundary_perimeter'
                ? 0.05
                : 0;
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
    globalStarIncidence: Record<string, string[]>,
    globalStarJunctionsByStarId: Record<string, FG2SharedStarJunction[]>,
    bounds: FG2WorldBounds,
): FG2PairTopologyGraph {
    const [ownerA, ownerB] = ownerPair.split('::');
    const seedById = new Map(seeds.map((seed) => [seed.seedId, seed]));
    const pairStarIncidence: Record<string, string[]> = {};
    const nodes: FG2GraphNode[] = [];
    const nodeById = new Map<string, FG2GraphNode>();
    const links: FG2TopologyLink[] = [];
    const linkById = new Map<string, FG2TopologyLink>();
    const adjacency: Record<string, string[]> = {};
    const junctionIds: string[] = [];
    const boundaryAnchorIds: string[] = [];
    const cornerIds: string[] = [];
    let boundaryPerimeterLinkCount = 0;

    function addNode(node: FG2GraphNode): void {
        if (nodeById.has(node.nodeId)) return;
        nodeById.set(node.nodeId, node);
        nodes.push(node);
        adjacency[node.nodeId] = [];
        if (node.nodeType === 'junction') junctionIds.push(node.nodeId);
        if (node.nodeType === 'boundary') boundaryAnchorIds.push(node.nodeId);
        if (node.nodeType === 'corner') cornerIds.push(node.nodeId);
    }

    function addLink(link: FG2TopologyLink): void {
        if (linkById.has(link.linkId)) return;
        linkById.set(link.linkId, link);
        links.push(link);
        adjacency[link.nodeAId].push(link.linkId);
        adjacency[link.nodeBId].push(link.linkId);
        if (link.linkKind === 'boundary_perimeter') {
            boundaryPerimeterLinkCount += 1;
        }
    }

    function addBoundaryPerimeterLink(nodeA: FG2GraphNode, nodeB: FG2GraphNode): void {
        if (nodeA.nodeId === nodeB.nodeId) return;
        addLink({
            linkId: `${ownerPair}|boundary_perimeter|${nodeA.nodeId}|${nodeB.nodeId}`,
            ownerPair,
            nodeAId: nodeA.nodeId,
            nodeBId: nodeB.nodeId,
            linkKind: 'boundary_perimeter',
            linkLength: Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y),
            angleSpan: 0,
        });
    }

    function addBoundaryPerimeterPath(startNode: FG2GraphNode, endNode: FG2GraphNode): void {
        const startPosition = getBoundaryPerimeterPosition(startNode, bounds);
        const endPosition = getBoundaryPerimeterPosition(endNode, bounds);
        const wraps = endPosition < startPosition - EPSILON;
        let previousNode = startNode;
        let currentSide = startNode.boundarySide ?? 'top';
        let firstStep = true;

        while (!(currentSide === (endNode.boundarySide ?? currentSide) && (!wraps || !firstStep))) {
            const corner = getBoundaryCornerAfterSide(currentSide, bounds);
            const cornerNodeId = `${ownerPair}|corner|${corner.cornerKind}`;
            addNode({
                nodeId: cornerNodeId,
                ownerPair,
                nodeType: 'corner',
                x: corner.x,
                y: corner.y,
                cornerKind: corner.cornerKind,
            });
            const cornerNode = nodeById.get(cornerNodeId);
            if (!cornerNode) break;
            addBoundaryPerimeterLink(previousNode, cornerNode);
            previousNode = cornerNode;
            currentSide = getNextClockwiseBoundarySide(currentSide);
            firstStep = false;
        }

        addBoundaryPerimeterLink(previousNode, endNode);
    }

    for (const seed of seeds) {
        addNode({
            nodeId: seed.seedId,
            ownerPair: seed.ownerPair,
            nodeType: 'seed',
            x: seed.x,
            y: seed.y,
        });
        if (!pairStarIncidence[seed.sourceId]) {
            pairStarIncidence[seed.sourceId] = [];
        }
        if (!pairStarIncidence[seed.targetId]) {
            pairStarIncidence[seed.targetId] = [];
        }
        pairStarIncidence[seed.sourceId].push(seed.seedId);
        pairStarIncidence[seed.targetId].push(seed.seedId);
    }

    for (const [starId, starJunctions] of Object.entries(globalStarJunctionsByStarId)) {
        const star = starById.get(starId);
        if (!star) continue;

        for (const starJunction of starJunctions) {
            const seedA = seedById.get(starJunction.seedAId);
            const seedB = seedById.get(starJunction.seedBId);
            if (!seedA && !seedB) continue;

            const junctionNode: FG2GraphNode = {
                nodeId: starJunction.junctionId,
                ownerPair,
                nodeType: 'junction',
                x: starJunction.x,
                y: starJunction.y,
                starId,
            };
            addNode(junctionNode);

            if (seedA) {
                addLink({
                    linkId: `${ownerPair}|star_arc|${starId}|${seedA.seedId}|${starJunction.junctionId}`,
                    ownerPair,
                    nodeAId: seedA.seedId,
                    nodeBId: starJunction.junctionId,
                    linkKind: 'star_arc',
                    viaStarId: starId,
                    viaOwner: star.ownerId ?? '',
                    linkLength: Math.hypot(junctionNode.x - seedA.x, junctionNode.y - seedA.y),
                    angleSpan: starJunction.localAngleSpan * 0.5,
                });
            }
            if (seedB) {
                addLink({
                    linkId: `${ownerPair}|star_arc|${starId}|${starJunction.junctionId}|${seedB.seedId}`,
                    ownerPair,
                    nodeAId: starJunction.junctionId,
                    nodeBId: seedB.seedId,
                    linkKind: 'star_arc',
                    viaStarId: starId,
                    viaOwner: star.ownerId ?? '',
                    linkLength: Math.hypot(junctionNode.x - seedB.x, junctionNode.y - seedB.y),
                    angleSpan: starJunction.localAngleSpan * 0.5,
                });
            }
        }
    }

    for (const seed of seeds) {
        const sourceIncidentCount = globalStarIncidence[seed.sourceId]?.length ?? 0;
        const targetIncidentCount = globalStarIncidence[seed.targetId]?.length ?? 0;

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

    const boundaryNodes = boundaryAnchorIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is FG2GraphNode => Boolean(node));
    for (const [startNode, endNode] of buildBoundaryAnchorPairs(boundaryNodes, bounds)) {
        addBoundaryPerimeterPath(startNode, endNode);
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
        starIncidence: pairStarIncidence,
        isolatedSeedIds,
        openSeedIds,
        boundaryAnchorIds: boundaryAnchorIds.sort((a, b) => a.localeCompare(b)),
        cornerIds: cornerIds.sort((a, b) => a.localeCompare(b)),
        junctionIds: junctionIds.sort((a, b) => a.localeCompare(b)),
        boundaryPerimeterLinkCount,
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
        corner: 1,
        seed: 2,
        junction: 3,
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

function computeSignedArea(points: [number, number][]): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current[0] * next[1] - next[0] * current[1];
    }

    return area * 0.5;
}

function buildPairHalfEdgeGraph(graph: FG2PairTopologyGraph): FG2PairHalfEdgeGraph {
    const nodeById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
    const topologyLinkById = new Map(graph.links.map((link) => [link.linkId, link]));
    const halfEdges: FG2HalfEdge[] = [];
    const halfEdgeById = new Map<string, FG2HalfEdge>();
    const outgoingByNodeId: Record<string, string[]> = {};

    function registerHalfEdge(halfEdge: FG2HalfEdge): void {
        halfEdges.push(halfEdge);
        halfEdgeById.set(halfEdge.halfEdgeId, halfEdge);
        if (!outgoingByNodeId[halfEdge.fromNodeId]) {
            outgoingByNodeId[halfEdge.fromNodeId] = [];
        }
        outgoingByNodeId[halfEdge.fromNodeId].push(halfEdge.halfEdgeId);
    }

    for (const link of graph.links) {
        const nodeA = nodeById.get(link.nodeAId);
        const nodeB = nodeById.get(link.nodeBId);
        if (!nodeA || !nodeB) continue;

        const forwardHalfEdgeId = `${link.linkId}|forward`;
        const reverseHalfEdgeId = `${link.linkId}|reverse`;
        registerHalfEdge({
            halfEdgeId: forwardHalfEdgeId,
            ownerPair: graph.ownerPair,
            linkId: link.linkId,
            fromNodeId: link.nodeAId,
            toNodeId: link.nodeBId,
            twinHalfEdgeId: reverseHalfEdgeId,
            angle: normalizeAngle(Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x)),
            leftNextHalfEdgeId: null,
            rightNextHalfEdgeId: null,
        });
        registerHalfEdge({
            halfEdgeId: reverseHalfEdgeId,
            ownerPair: graph.ownerPair,
            linkId: link.linkId,
            fromNodeId: link.nodeBId,
            toNodeId: link.nodeAId,
            twinHalfEdgeId: forwardHalfEdgeId,
            angle: normalizeAngle(Math.atan2(nodeA.y - nodeB.y, nodeA.x - nodeB.x)),
            leftNextHalfEdgeId: null,
            rightNextHalfEdgeId: null,
        });
    }

    for (const halfEdgeIds of Object.values(outgoingByNodeId)) {
        halfEdgeIds.sort((halfEdgeAId, halfEdgeBId) => {
            const halfEdgeA = halfEdgeById.get(halfEdgeAId);
            const halfEdgeB = halfEdgeById.get(halfEdgeBId);
            if (!halfEdgeA || !halfEdgeB) {
                return halfEdgeAId.localeCompare(halfEdgeBId);
            }
            if (Math.abs(halfEdgeA.angle - halfEdgeB.angle) > 1e-6) {
                return halfEdgeA.angle - halfEdgeB.angle;
            }
            return halfEdgeAId.localeCompare(halfEdgeBId);
        });
    }

    for (const halfEdge of halfEdges) {
        const outgoingAtDestination = outgoingByNodeId[halfEdge.toNodeId] ?? [];
        if (outgoingAtDestination.length <= 1) continue;
        const twinIndex = outgoingAtDestination.indexOf(halfEdge.twinHalfEdgeId);
        if (twinIndex === -1) continue;

        halfEdge.leftNextHalfEdgeId =
            outgoingAtDestination[
                (twinIndex - 1 + outgoingAtDestination.length) % outgoingAtDestination.length
            ] ?? null;
        halfEdge.rightNextHalfEdgeId =
            outgoingAtDestination[(twinIndex + 1) % outgoingAtDestination.length] ?? null;
    }

    const leftFaceWalks: FG2FaceWalk[] = [];
    const visitedLeftHalfEdgeIds = new Set<string>();
    const orderedHalfEdgeIds = halfEdges
        .map((halfEdge) => halfEdge.halfEdgeId)
        .sort((a, b) => a.localeCompare(b));

    for (const startHalfEdgeId of orderedHalfEdgeIds) {
        if (visitedLeftHalfEdgeIds.has(startHalfEdgeId)) continue;

        const walkHalfEdgeIds: string[] = [];
        const walkNodeIds: string[] = [];
        const seenIndices = new Map<string, number>();
        let currentHalfEdgeId: string | null = startHalfEdgeId;
        let closed = false;
        let terminatedAtNodeId: string | null = null;

        while (currentHalfEdgeId) {
            if (seenIndices.has(currentHalfEdgeId)) {
                closed = currentHalfEdgeId === startHalfEdgeId;
                break;
            }
            seenIndices.set(currentHalfEdgeId, walkHalfEdgeIds.length);

            const halfEdge = halfEdgeById.get(currentHalfEdgeId);
            if (!halfEdge) break;

            walkHalfEdgeIds.push(currentHalfEdgeId);
            walkNodeIds.push(halfEdge.fromNodeId);
            visitedLeftHalfEdgeIds.add(currentHalfEdgeId);

            if (!halfEdge.leftNextHalfEdgeId) {
                terminatedAtNodeId = halfEdge.toNodeId;
                break;
            }

            currentHalfEdgeId = halfEdge.leftNextHalfEdgeId;
            if (currentHalfEdgeId === startHalfEdgeId) {
                closed = true;
                break;
            }
        }

        const nodeIds = closed
            ? walkNodeIds
            : terminatedAtNodeId
              ? [...walkNodeIds, terminatedAtNodeId]
              : walkNodeIds;
        if (walkHalfEdgeIds.length === 0 || nodeIds.length === 0) continue;

        const walkNodes = nodeIds
            .map((nodeId) => nodeById.get(nodeId))
            .filter((node): node is FG2GraphNode => Boolean(node));
        const points = walkNodes.map((node) => [node.x, node.y] as [number, number]);
        const area = closed ? computeSignedArea(points) : 0;
        const absArea = Math.abs(area);
        const seedNodeCount = walkNodes.filter((node) => node.nodeType === 'seed').length;
        const junctionNodeCount = walkNodes.filter((node) => node.nodeType === 'junction').length;
        const boundaryNodeCount = walkNodes.filter((node) => node.nodeType === 'boundary').length;
        const cornerNodeCount = walkNodes.filter((node) => node.nodeType === 'corner').length;
        let starArcLinkCount = 0;
        let boundaryExtensionLinkCount = 0;
        let boundaryPerimeterLinkCount = 0;

        for (const halfEdgeId of walkHalfEdgeIds) {
            const halfEdge = halfEdgeById.get(halfEdgeId);
            const link = halfEdge ? topologyLinkById.get(halfEdge.linkId) : null;
            if (!link) continue;
            if (link.linkKind === 'star_arc') starArcLinkCount += 1;
            if (link.linkKind === 'boundary_extension') boundaryExtensionLinkCount += 1;
            if (link.linkKind === 'boundary_perimeter') boundaryPerimeterLinkCount += 1;
        }

        leftFaceWalks.push({
            faceWalkId: `${graph.ownerPair}|face|${walkHalfEdgeIds[0] ?? nodeIds[0] ?? 'empty'}`,
            ownerPair: graph.ownerPair,
            closed,
            halfEdgeIds: walkHalfEdgeIds,
            nodeIds,
            area,
            absArea,
            seedNodeCount,
            junctionNodeCount,
            boundaryNodeCount,
            cornerNodeCount,
            starArcLinkCount,
            boundaryExtensionLinkCount,
            boundaryPerimeterLinkCount,
            touchesWorldBoundary: boundaryNodeCount + cornerNodeCount > 0,
            isExteriorCandidate: false,
            isCanonicalCandidate: false,
        });
    }

    const closedWalksByPriority = leftFaceWalks
        .filter((walk) => walk.closed && walk.absArea > EPSILON)
        .slice()
        .sort((walkA, walkB) => {
            const perimeterBiasA = walkA.boundaryPerimeterLinkCount > 0 ? 1 : 0;
            const perimeterBiasB = walkB.boundaryPerimeterLinkCount > 0 ? 1 : 0;
            if (perimeterBiasA !== perimeterBiasB) {
                return perimeterBiasB - perimeterBiasA;
            }
            if (walkA.touchesWorldBoundary !== walkB.touchesWorldBoundary) {
                return walkA.touchesWorldBoundary ? -1 : 1;
            }
            if (Math.abs(walkA.absArea - walkB.absArea) > EPSILON) {
                return walkB.absArea - walkA.absArea;
            }
            return walkA.faceWalkId.localeCompare(walkB.faceWalkId);
        });
    const exteriorFaceWalkId = closedWalksByPriority[0]?.faceWalkId ?? null;
    const canonicalFaceWalks: FG2FaceWalk[] = [];

    for (const walk of leftFaceWalks) {
        walk.isExteriorCandidate = walk.closed && walk.faceWalkId === exteriorFaceWalkId;
        walk.isCanonicalCandidate =
            walk.closed &&
            !walk.isExteriorCandidate &&
            walk.absArea > EPSILON &&
            walk.boundaryPerimeterLinkCount === 0;
        if (walk.isCanonicalCandidate) {
            canonicalFaceWalks.push(walk);
        }
    }

    const closedLeftFaceCount = leftFaceWalks.filter((walk) => walk.closed).length;
    return {
        ownerPair: graph.ownerPair,
        halfEdges,
        leftFaceWalks,
        canonicalFaceWalks,
        exteriorFaceWalkId,
        closedLeftFaceCount,
        openLeftWalkCount: leftFaceWalks.length - closedLeftFaceCount,
        canonicalFaceWalkCount: canonicalFaceWalks.length,
    };
}

function buildOwnerRegionLoopArtifact(
    pairGraph: FG2PairTopologyGraph,
    walk: FG2FaceWalk,
    nodeById: Map<string, FG2GraphNode>,
    halfEdgeById: Map<string, FG2HalfEdge>,
    topologyLinkById: Map<string, FG2TopologyLink>,
): FG2OwnerRegionLoopArtifact | null {
    if (!walk.closed || !walk.isCanonicalCandidate || walk.absArea <= EPSILON) return null;

    const points = walk.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is FG2GraphNode => Boolean(node))
        .map((node) => [node.x, node.y] as [number, number]);
    if (points.length < 3) return null;

    let ownerAHintCount = 0;
    let ownerBHintCount = 0;
    for (const halfEdgeId of walk.halfEdgeIds) {
        const halfEdge = halfEdgeById.get(halfEdgeId);
        const link = halfEdge ? topologyLinkById.get(halfEdge.linkId) : null;
        if (!link?.viaOwner) continue;
        if (link.viaOwner === pairGraph.ownerA) ownerAHintCount += 1;
        if (link.viaOwner === pairGraph.ownerB) ownerBHintCount += 1;
    }

    if (ownerAHintCount === ownerBHintCount) return null;

    const ownerId = ownerAHintCount > ownerBHintCount ? pairGraph.ownerA : pairGraph.ownerB;
    const opposingOwnerId = ownerId === pairGraph.ownerA ? pairGraph.ownerB : pairGraph.ownerA;
    const ownerHintCount = Math.max(ownerAHintCount, ownerBHintCount);
    const opposingHintCount = Math.min(ownerAHintCount, ownerBHintCount);
    const totalHintCount = ownerHintCount + opposingHintCount;

    return {
        regionLoopId: `${pairGraph.ownerPair}|owner-region|${ownerId}|${walk.faceWalkId}`,
        ownerId,
        opposingOwnerId,
        ownerPair: pairGraph.ownerPair,
        sourceFaceWalkId: walk.faceWalkId,
        points,
        area: walk.area,
        absArea: walk.absArea,
        touchesWorldBoundary: walk.touchesWorldBoundary,
        ownerHintCount,
        opposingHintCount,
        confidence: totalHintCount > 0 ? ownerHintCount / totalHintCount : 0,
    };
}

function buildGlobalTopologyGraph(
    pairGraphs: Record<string, FG2PairTopologyGraph>,
): FG2PairTopologyGraph {
    const nodeById = new Map<string, FG2GraphNode>();
    const linkById = new Map<string, FG2TopologyLink>();
    const adjacency: Record<string, string[]> = {};
    const boundaryAnchorIds: string[] = [];
    const cornerIds: string[] = [];
    const junctionIds: string[] = [];
    let boundaryPerimeterLinkCount = 0;

    function addNode(node: FG2GraphNode): void {
        if (nodeById.has(node.nodeId)) return;
        nodeById.set(node.nodeId, node);
        adjacency[node.nodeId] = [];
        if (node.nodeType === 'boundary') boundaryAnchorIds.push(node.nodeId);
        if (node.nodeType === 'corner') cornerIds.push(node.nodeId);
        if (node.nodeType === 'junction') junctionIds.push(node.nodeId);
    }

    function addLink(link: FG2TopologyLink): void {
        if (linkById.has(link.linkId)) return;
        linkById.set(link.linkId, link);
        adjacency[link.nodeAId].push(link.linkId);
        adjacency[link.nodeBId].push(link.linkId);
        if (link.linkKind === 'boundary_perimeter') {
            boundaryPerimeterLinkCount += 1;
        }
    }

    for (const pairGraph of Object.values(pairGraphs)) {
        for (const node of pairGraph.nodes) {
            addNode(node);
        }
        for (const link of pairGraph.links) {
            addLink(link);
        }
    }

    for (const linkIds of Object.values(adjacency)) {
        linkIds.sort((a, b) => a.localeCompare(b));
    }

    const nodes = Array.from(nodeById.values());
    const links = Array.from(linkById.values());
    const nodeIds = nodes.map((node) => node.nodeId).sort((a, b) => a.localeCompare(b));
    const isolatedSeedIds = nodeIds
        .filter((nodeId) => {
            const node = nodeById.get(nodeId);
            return node?.nodeType === 'seed' && (adjacency[nodeId]?.length ?? 0) === 0;
        })
        .sort((a, b) => a.localeCompare(b));
    const openSeedIds = nodeIds
        .filter((nodeId) => {
            const node = nodeById.get(nodeId);
            return node?.nodeType === 'seed' && (adjacency[nodeId]?.length ?? 0) <= 1;
        })
        .sort((a, b) => a.localeCompare(b));

    return {
        ownerPair: 'global',
        ownerA: '__global__',
        ownerB: '__global__',
        nodeIds,
        nodes,
        links,
        adjacency,
        starIncidence: {},
        isolatedSeedIds,
        openSeedIds,
        boundaryAnchorIds: boundaryAnchorIds.sort((a, b) => a.localeCompare(b)),
        cornerIds: cornerIds.sort((a, b) => a.localeCompare(b)),
        junctionIds: junctionIds.sort((a, b) => a.localeCompare(b)),
        boundaryPerimeterLinkCount,
    };
}

function buildResolvedOwnerRegionLoopArtifact(
    walk: FG2FaceWalk,
    nodeById: Map<string, FG2GraphNode>,
    halfEdgeById: Map<string, FG2HalfEdge>,
    topologyLinkById: Map<string, FG2TopologyLink>,
): FG2OwnerRegionLoopArtifact | null {
    if (!walk.closed || walk.absArea <= EPSILON) return null;

    const points = walk.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is FG2GraphNode => Boolean(node))
        .map((node) => [node.x, node.y] as [number, number]);
    if (points.length < 3) return null;

    const ownerHintCounts: Record<string, number> = {};
    for (const halfEdgeId of walk.halfEdgeIds) {
        const halfEdge = halfEdgeById.get(halfEdgeId);
        const link = halfEdge ? topologyLinkById.get(halfEdge.linkId) : null;
        if (!link?.viaOwner) continue;
        ownerHintCounts[link.viaOwner] = (ownerHintCounts[link.viaOwner] ?? 0) + 1;
    }

    const rankedOwners = Object.entries(ownerHintCounts)
        .filter((entry) => entry[0])
        .sort((ownerA, ownerB) => {
            if (ownerA[1] !== ownerB[1]) {
                return ownerB[1] - ownerA[1];
            }
            return ownerA[0].localeCompare(ownerB[0]);
        });
    const primaryOwner = rankedOwners[0];
    const secondaryOwner = rankedOwners[1] ?? null;
    if (!primaryOwner) return null;
    if (secondaryOwner && secondaryOwner[1] === primaryOwner[1]) return null;

    const ownerId = primaryOwner[0];
    const ownerHintCount = primaryOwner[1];
    const opposingOwnerId = secondaryOwner?.[0] ?? '__uncontested__';
    const opposingHintCount = secondaryOwner?.[1] ?? 0;
    const totalHintCount = ownerHintCount + opposingHintCount;

    return {
        regionLoopId: `global|owner-region|${ownerId}|${walk.faceWalkId}`,
        ownerId,
        opposingOwnerId,
        ownerPair: 'global',
        sourceFaceWalkId: walk.faceWalkId,
        points,
        area: walk.area,
        absArea: walk.absArea,
        touchesWorldBoundary: walk.touchesWorldBoundary,
        ownerHintCount,
        opposingHintCount,
        confidence: totalHintCount > 0 ? ownerHintCount / totalHintCount : 0,
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
    const globalStarIncidence = buildGlobalStarIncidence(seeds);
    const globalStarJunctionsByStarId = buildGlobalStarJunctionCatalog(seeds, starById);

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
    let sharedJunctionCount = 0;
    let boundaryAnchorCount = 0;
    let cornerCount = 0;
    let boundaryPerimeterLinkCount = 0;

    sharedJunctionCount = Object.values(globalStarJunctionsByStarId).reduce(
        (sum, starJunctions) => sum + starJunctions.length,
        0,
    );

    for (const [ownerPair, pairSeeds] of Object.entries(pairGroups)) {
        const pairGraph = buildPairTopologyGraph(
            ownerPair,
            pairSeeds,
            starById,
            globalStarIncidence,
            globalStarJunctionsByStarId,
            bounds,
        );
        pairGraphs[ownerPair] = pairGraph;
        topologyLinkCount += pairGraph.links.length;
        graphNodeCount += pairGraph.nodes.length;
        junctionCount += pairGraph.junctionIds.length;
        boundaryAnchorCount += pairGraph.boundaryAnchorIds.length;
        cornerCount += pairGraph.cornerIds.length;
        boundaryPerimeterLinkCount += pairGraph.boundaryPerimeterLinkCount;
    }

    runtime.artifacts.topology = {
        pairGroups,
        pairGraphs,
        globalStarIncidence,
        globalStarJunctionsByStarId,
        pairCount: Object.keys(pairGraphs).length,
        topologyLinkCount,
        graphNodeCount,
        junctionCount,
        sharedJunctionCount,
        boundaryAnchorCount,
        cornerCount,
        boundaryPerimeterLinkCount,
    };

    summary.ownerPairCount = Object.keys(pairGraphs).length;
    summary.topologyLinkCount = topologyLinkCount;
    summary.graphNodeCount = graphNodeCount;
    summary.junctionCount = junctionCount;
    summary.sharedJunctionCount = sharedJunctionCount;
    summary.boundaryAnchorCount = boundaryAnchorCount;
    summary.cornerCount = cornerCount;
    summary.boundaryPerimeterLinkCount = boundaryPerimeterLinkCount;
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
    const topologyArtifact = runtime.artifacts.topology as
        | {
              pairGraphs?: Record<string, FG2PairTopologyGraph>;
          }
        | undefined;
    const geometryArtifact = runtime.artifacts.geometry as
        | { frontiers?: FG2FrontierPolyline[] }
        | undefined;
    const pairGraphs = topologyArtifact?.pairGraphs ?? {};
    const frontiers = geometryArtifact?.frontiers ?? [];
    const pairHalfEdgeGraphs: Record<string, FG2PairHalfEdgeGraph> = {};
    const regionLoops: FG2RegionLoopArtifact[] = [];
    const pairOwnerRegionLoops: FG2OwnerRegionLoopArtifact[] = [];
    const resolvedOwnerRegionLoops: FG2OwnerRegionLoopArtifact[] = [];
    let closedFrontierCount = 0;
    let halfEdgeCount = 0;
    let faceWalkCount = 0;
    let closedFaceWalkCount = 0;
    let canonicalFaceWalkCount = 0;
    let exteriorFaceWalkCount = 0;
    let ambiguousCanonicalFaceWalkCount = 0;
    let globalHalfEdgeCount = 0;
    let globalFaceWalkCount = 0;
    let globalClosedFaceWalkCount = 0;
    let ambiguousGlobalFaceWalkCount = 0;

    for (const [ownerPair, pairGraph] of Object.entries(pairGraphs)) {
        const pairHalfEdgeGraph = buildPairHalfEdgeGraph(pairGraph);
        pairHalfEdgeGraphs[ownerPair] = pairHalfEdgeGraph;
        halfEdgeCount += pairHalfEdgeGraph.halfEdges.length;
        faceWalkCount += pairHalfEdgeGraph.leftFaceWalks.length;
        closedFaceWalkCount += pairHalfEdgeGraph.closedLeftFaceCount;
        canonicalFaceWalkCount += pairHalfEdgeGraph.canonicalFaceWalkCount;
        if (pairHalfEdgeGraph.exteriorFaceWalkId) {
            exteriorFaceWalkCount += 1;
        }

        const nodeById = new Map(pairGraph.nodes.map((node) => [node.nodeId, node]));
        const halfEdgeById = new Map(
            pairHalfEdgeGraph.halfEdges.map((halfEdge) => [halfEdge.halfEdgeId, halfEdge]),
        );
        const topologyLinkById = new Map(pairGraph.links.map((link) => [link.linkId, link]));
        for (const walk of pairHalfEdgeGraph.leftFaceWalks) {
            if (!walk.closed || walk.absArea <= EPSILON) continue;
            if (!walk.isExteriorCandidate && !walk.isCanonicalCandidate) continue;
            const points = walk.nodeIds
                .map((nodeId) => nodeById.get(nodeId))
                .filter((node): node is FG2GraphNode => Boolean(node))
                .map((node) => [node.x, node.y] as [number, number]);
            if (points.length < 3) continue;

            regionLoops.push({
                loopId: `${ownerPair}|region-loop|${walk.faceWalkId}`,
                ownerPair,
                ownerA: pairGraph.ownerA,
                ownerB: pairGraph.ownerB,
                sourceFaceWalkId: walk.faceWalkId,
                kind: walk.isExteriorCandidate ? 'exterior_candidate' : 'canonical_candidate',
                points,
                area: walk.area,
                absArea: walk.absArea,
                touchesWorldBoundary: walk.touchesWorldBoundary,
                boundaryPerimeterLinkCount: walk.boundaryPerimeterLinkCount,
            });

            if (!walk.isCanonicalCandidate) continue;
            const ownerRegionLoop = buildOwnerRegionLoopArtifact(
                pairGraph,
                walk,
                nodeById,
                halfEdgeById,
                topologyLinkById,
            );
            if (!ownerRegionLoop) {
                ambiguousCanonicalFaceWalkCount += 1;
                continue;
            }

            pairOwnerRegionLoops.push(ownerRegionLoop);
        }
    }

    const globalTopologyGraph = buildGlobalTopologyGraph(pairGraphs);
    const globalHalfEdgeGraph = buildPairHalfEdgeGraph(globalTopologyGraph);
    globalHalfEdgeCount = globalHalfEdgeGraph.halfEdges.length;
    globalFaceWalkCount = globalHalfEdgeGraph.leftFaceWalks.length;
    globalClosedFaceWalkCount = globalHalfEdgeGraph.closedLeftFaceCount;

    const globalNodeById = new Map(globalTopologyGraph.nodes.map((node) => [node.nodeId, node]));
    const globalHalfEdgeById = new Map(
        globalHalfEdgeGraph.halfEdges.map((halfEdge) => [halfEdge.halfEdgeId, halfEdge]),
    );
    const globalTopologyLinkById = new Map(
        globalTopologyGraph.links.map((link) => [link.linkId, link]),
    );
    for (const walk of globalHalfEdgeGraph.leftFaceWalks) {
        walk.isExteriorCandidate = walk.closed && walk.faceWalkId === globalHalfEdgeGraph.exteriorFaceWalkId;
        walk.isCanonicalCandidate = walk.closed && !walk.isExteriorCandidate && walk.absArea > EPSILON;
        if (!walk.isCanonicalCandidate) continue;

        const resolvedOwnerRegionLoop = buildResolvedOwnerRegionLoopArtifact(
            walk,
            globalNodeById,
            globalHalfEdgeById,
            globalTopologyLinkById,
        );
        if (!resolvedOwnerRegionLoop) {
            ambiguousGlobalFaceWalkCount += 1;
            continue;
        }

        resolvedOwnerRegionLoops.push(resolvedOwnerRegionLoop);
    }

    const ownerRegionLoops =
        resolvedOwnerRegionLoops.length > 0 ? resolvedOwnerRegionLoops : pairOwnerRegionLoops;
    const ownerLoopHints: Record<string, number> = {};
    for (const ownerRegionLoop of ownerRegionLoops) {
        ownerLoopHints[ownerRegionLoop.ownerId] = (ownerLoopHints[ownerRegionLoop.ownerId] ?? 0) + 1;
    }

    for (const frontier of frontiers) {
        if (frontier.closed) {
            closedFrontierCount += 1;
        }
    }

    runtime.artifacts.loop = {
        ownerLoopHints,
        ownerCount: Object.keys(ownerLoopHints).length,
        closedFrontierCount,
        pairHalfEdgeGraphs,
        regionLoops,
        ownerRegionLoops,
        pairOwnerRegionLoops,
        resolvedOwnerRegionLoops,
        halfEdgeCount,
        faceWalkCount,
        closedFaceWalkCount,
        canonicalFaceWalkCount,
        exteriorFaceWalkCount,
        ambiguousCanonicalFaceWalkCount,
        globalHalfEdgeCount,
        globalFaceWalkCount,
        globalClosedFaceWalkCount,
        resolvedOwnerRegionLoopCount: resolvedOwnerRegionLoops.length,
        ambiguousGlobalFaceWalkCount,
    };

    summary.ownerLoopHintCount = Object.keys(ownerLoopHints).length;
    summary.closedFrontierCount = closedFrontierCount;
    summary.halfEdgeCount = halfEdgeCount;
    summary.faceWalkCount = faceWalkCount;
    summary.closedFaceWalkCount = closedFaceWalkCount;
    summary.canonicalFaceWalkCount = canonicalFaceWalkCount;
    summary.exteriorFaceWalkCount = exteriorFaceWalkCount;
    summary.regionLoopCount = regionLoops.length;
    summary.ownerRegionLoopCount = ownerRegionLoops.length;
    summary.pairOwnerRegionLoopCount = pairOwnerRegionLoops.length;
    summary.resolvedOwnerRegionLoopCount = resolvedOwnerRegionLoops.length;
    summary.ambiguousCanonicalFaceWalkCount = ambiguousCanonicalFaceWalkCount;
    summary.globalHalfEdgeCount = globalHalfEdgeCount;
    summary.globalFaceWalkCount = globalFaceWalkCount;
    summary.globalClosedFaceWalkCount = globalClosedFaceWalkCount;
    summary.ambiguousGlobalFaceWalkCount = ambiguousGlobalFaceWalkCount;
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
    const loopArtifact = runtime.artifacts.loop as
        | {
              regionLoops?: FG2RegionLoopArtifact[];
              ownerRegionLoops?: FG2OwnerRegionLoopArtifact[];
          }
        | undefined;
    const seedArtifact = runtime.artifacts.seed as { seeds?: FG2SeedPoint[] } | undefined;
    const pairGraphs = topologyArtifact?.pairGraphs ?? {};
    const frontiers = geometryArtifact?.frontiers ?? [];
    const regionLoops = loopArtifact?.regionLoops ?? [];
    const ownerRegionLoops = loopArtifact?.ownerRegionLoops ?? [];
    const seeds = seedArtifact?.seeds ?? [];

    const graphics = getOrCreateGraphics(runtime.input.container);
    graphics.clear();

    const borderWidth = Math.max(1, GAME_CONFIG.VORONOI_BORDER_WIDTH ?? 3);
    const borderAlpha = Math.max(0, Math.min(1, GAME_CONFIG.VORONOI_BORDER_ALPHA ?? 0.9));

    if (GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE) {
        for (const ownerRegionLoop of ownerRegionLoops) {
            const loopColor = runtime.input.colorUtils.getPlayerColor(ownerRegionLoop.ownerId);
            graphics.moveTo(ownerRegionLoop.points[0][0], ownerRegionLoop.points[0][1]);
            for (let i = 1; i < ownerRegionLoop.points.length; i += 1) {
                const point = ownerRegionLoop.points[i];
                graphics.lineTo(point[0], point[1]);
            }
            graphics.lineTo(ownerRegionLoop.points[0][0], ownerRegionLoop.points[0][1]);
            graphics.fill({
                color: loopColor,
                alpha: 0.04 + ownerRegionLoop.confidence * 0.08,
            });
            graphics.stroke({
                color: loopColor,
                width: Math.max(1, borderWidth * (0.4 + ownerRegionLoop.confidence * 0.3)),
                alpha: 0.18 + ownerRegionLoop.confidence * 0.24,
                cap: 'round',
                join: 'round',
            });
        }

        for (const regionLoop of regionLoops) {
            const loopColor = blendColors(
                runtime.input.colorUtils.getPlayerColor(regionLoop.ownerA),
                runtime.input.colorUtils.getPlayerColor(regionLoop.ownerB),
            );
            graphics.moveTo(regionLoop.points[0][0], regionLoop.points[0][1]);
            for (let i = 1; i < regionLoop.points.length; i += 1) {
                const point = regionLoop.points[i];
                graphics.lineTo(point[0], point[1]);
            }
            graphics.lineTo(regionLoop.points[0][0], regionLoop.points[0][1]);
            graphics.fill({
                color: loopColor,
                alpha: regionLoop.kind === 'exterior_candidate' ? 0.015 : 0.035,
            });
            graphics.stroke({
                color: loopColor,
                width: regionLoop.kind === 'exterior_candidate' ? 1 : Math.max(1, borderWidth * 0.3),
                alpha: regionLoop.kind === 'exterior_candidate' ? 0.12 : 0.18,
                cap: 'round',
                join: 'round',
            });
        }

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
                let color = 0x7bdff2;
                let radius = 2.1;
                if (node.nodeType === 'junction') {
                    color = 0xffd166;
                    radius = 1.4;
                } else if (node.nodeType === 'corner') {
                    color = 0xcdb4db;
                    radius = 1.9;
                }
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
        regionLoopCount: regionLoops.length,
        ownerRegionLoopCount: ownerRegionLoops.length,
        seedCount: seeds.length,
    };

    summary.nativeRenderer = 'fg2_seed_graph_native';
    summary.frontierCount = frontiers.length;
    summary.regionLoopCount = regionLoops.length;
    summary.ownerRegionLoopCount = ownerRegionLoops.length;
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
