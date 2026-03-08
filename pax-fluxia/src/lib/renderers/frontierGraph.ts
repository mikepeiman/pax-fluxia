import type { StarConnection, StarState } from '$lib/types/game.types';

const EPS = 1e-5;

export interface NodeTop2DistanceView {
    ownerIdx: number;
    distance: number;
}

export interface NodeTop2PairView {
    best: NodeTop2DistanceView | null;
    second: NodeTop2DistanceView | null;
}

export interface GraphNativeDistanceView {
    distToPlayer: number[][];
    top2ByStar: NodeTop2PairView[];
}

export interface LaneFrontierPoint {
    connectionId: string;
    sourceStarId: string;
    targetStarId: string;
    t: number;
    x: number;
    y: number;
    ownerA: number;
    ownerB: number;
    source: 'lane';
}

export interface FieldFrontierPoint {
    id: string;
    x: number;
    y: number;
    ownerA: number;
    ownerB: number;
    source: 'field';
    sourceRef: string;
    sortKey: number;
}

export interface FrontierNode {
    id: string;
    x: number;
    y: number;
    ownerA: number;
    ownerB: number;
    pairId: string;
    source: 'lane' | 'field';
    sourceRef: string;
    sortKey: number;
}

export interface FrontierEdge {
    id: string;
    a: string;
    b: string;
    ownerA: number;
    ownerB: number;
    pairId: string;
    source: 'lane' | 'field';
    sourceRef: string;
}

export interface FrontierGraph {
    nodes: Map<string, FrontierNode>;
    edges: Map<string, FrontierEdge>;
    adjacency: Map<string, string[]>;
}

export interface FrontierGraphBuildOptions {
    includeFieldFrontiers?: boolean;
    fieldFrontiers?: FieldFrontierPoint[];
}

function makePairId(ownerA: number, ownerB: number): string {
    return `pair:${Math.min(ownerA, ownerB)}:${Math.max(ownerA, ownerB)}`;
}

function makeConnectionId(connection: StarConnection): string {
    const a = connection.sourceId;
    const b = connection.targetId;
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function makeLaneNodeId(pairId: string, connectionId: string, t: number): string {
    return `frontier:lane:${pairId}:${connectionId}:${t.toFixed(6)}`;
}

function makeFieldNodeId(point: FieldFrontierPoint, pairId: string): string {
    return `frontier:field:${pairId}:${point.sourceRef}:${point.sortKey.toFixed(6)}`;
}

function buildAdjacency(edges: Map<string, FrontierEdge>): Map<string, string[]> {
    const adjacencySets = new Map<string, Set<string>>();

    for (const edge of edges.values()) {
        let aSet = adjacencySets.get(edge.a);
        if (!aSet) {
            aSet = new Set<string>();
            adjacencySets.set(edge.a, aSet);
        }
        aSet.add(edge.b);

        let bSet = adjacencySets.get(edge.b);
        if (!bSet) {
            bSet = new Set<string>();
            adjacencySets.set(edge.b, bSet);
        }
        bSet.add(edge.a);
    }

    const adjacency = new Map<string, string[]>();
    for (const [nodeId, neighbors] of adjacencySets.entries()) {
        adjacency.set(nodeId, [...neighbors].sort((a, b) => a.localeCompare(b)));
    }
    return adjacency;
}

function activeBranch(distanceA: number, distanceB: number, weight: number, t: number): 'A' | 'B' {
    const viaA = distanceA + t * weight;
    const viaB = distanceB + (1 - t) * weight;
    return viaA <= viaB ? 'A' : 'B';
}

function branchLine(distanceA: number, distanceB: number, weight: number, branch: 'A' | 'B'): { intercept: number; slope: number } {
    if (branch === 'A') {
        return { intercept: distanceA, slope: weight };
    }
    return { intercept: distanceB + weight, slope: -weight };
}

function laneBreakpoint(distanceA: number, distanceB: number, weight: number): number | null {
    if (!Number.isFinite(distanceA) || !Number.isFinite(distanceB) || weight <= EPS) return null;
    const t = (distanceB + weight - distanceA) / (2 * weight);
    if (t <= EPS || t >= 1 - EPS) return null;
    return t;
}

function pushUniqueRoot(roots: number[], t: number): void {
    if (!Number.isFinite(t) || t <= EPS || t >= 1 - EPS) return;
    for (const existing of roots) {
        if (Math.abs(existing - t) <= 1e-4) return;
    }
    roots.push(t);
}

function solvePlayerPairRoots(
    distancePA: number,
    distancePB: number,
    distanceQA: number,
    distanceQB: number,
    weight: number,
): number[] {
    if (weight <= EPS) return [];

    const breakpoints = [0, 1];
    const pBreak = laneBreakpoint(distancePA, distancePB, weight);
    const qBreak = laneBreakpoint(distanceQA, distanceQB, weight);
    if (pBreak != null) breakpoints.push(pBreak);
    if (qBreak != null) breakpoints.push(qBreak);
    breakpoints.sort((a, b) => a - b);

    const uniqueBreakpoints: number[] = [];
    for (const bp of breakpoints) {
        if (uniqueBreakpoints.length === 0 || Math.abs(uniqueBreakpoints[uniqueBreakpoints.length - 1] - bp) > 1e-6) {
            uniqueBreakpoints.push(bp);
        }
    }

    const roots: number[] = [];
    for (let i = 0; i < uniqueBreakpoints.length - 1; i++) {
        const start = uniqueBreakpoints[i];
        const end = uniqueBreakpoints[i + 1];
        if (end - start <= EPS) continue;

        const mid = 0.5 * (start + end);
        const pBranch = activeBranch(distancePA, distancePB, weight, mid);
        const qBranch = activeBranch(distanceQA, distanceQB, weight, mid);
        const pLine = branchLine(distancePA, distancePB, weight, pBranch);
        const qLine = branchLine(distanceQA, distanceQB, weight, qBranch);

        const slope = pLine.slope - qLine.slope;
        const intercept = pLine.intercept - qLine.intercept;

        if (Math.abs(slope) <= EPS) {
            if (Math.abs(intercept) <= 1e-4) {
                pushUniqueRoot(roots, mid);
            }
            continue;
        }

        const t = -intercept / slope;
        if (t > start + EPS && t < end - EPS) {
            pushUniqueRoot(roots, t);
        }
    }

    return roots.sort((a, b) => a - b);
}

export function computeLaneFrontiers(
    stars: StarState[],
    connections: StarConnection[],
    graphResult: GraphNativeDistanceView,
): LaneFrontierPoint[] {
    const starIndexById = new Map<string, number>();
    for (let i = 0; i < stars.length; i++) {
        starIndexById.set(stars[i].id, i);
    }

    const points: LaneFrontierPoint[] = [];

    for (const connection of connections) {
        const idxA = starIndexById.get(connection.sourceId);
        const idxB = starIndexById.get(connection.targetId);
        if (idxA == null || idxB == null) continue;

        const starA = stars[idxA];
        const starB = stars[idxB];
        const weight = connection.distance ?? Math.hypot(starB.x - starA.x, starB.y - starA.y);
        if (!Number.isFinite(weight) || weight <= EPS) continue;

        const candidates: number[] = [];
        const ownerCount = Math.max(
            graphResult.distToPlayer[idxA]?.length ?? 0,
            graphResult.distToPlayer[idxB]?.length ?? 0,
        );
        for (let ownerIdx = 0; ownerIdx < ownerCount; ownerIdx++) {
            const dA = graphResult.distToPlayer[idxA]?.[ownerIdx] ?? Infinity;
            const dB = graphResult.distToPlayer[idxB]?.[ownerIdx] ?? Infinity;
            if (Number.isFinite(dA) || Number.isFinite(dB)) {
                candidates.push(ownerIdx);
            }
        }

        if (candidates.length < 2) continue;
        const connectionId = makeConnectionId(connection);

        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const ownerA = candidates[i];
                const ownerB = candidates[j];
                const distPA = graphResult.distToPlayer[idxA]?.[ownerA] ?? Infinity;
                const distPB = graphResult.distToPlayer[idxB]?.[ownerA] ?? Infinity;
                const distQA = graphResult.distToPlayer[idxA]?.[ownerB] ?? Infinity;
                const distQB = graphResult.distToPlayer[idxB]?.[ownerB] ?? Infinity;
                const roots = solvePlayerPairRoots(distPA, distPB, distQA, distQB, weight);

                for (const t of roots) {
                    const x = starA.x + (starB.x - starA.x) * t;
                    const y = starA.y + (starB.y - starA.y) * t;
                    points.push({
                        connectionId,
                        sourceStarId: connection.sourceId,
                        targetStarId: connection.targetId,
                        t,
                        x,
                        y,
                        ownerA,
                        ownerB,
                        source: 'lane',
                    });
                }
            }
        }
    }

    return points.sort((a, b) => {
        if (a.connectionId !== b.connectionId) return a.connectionId.localeCompare(b.connectionId);
        if (a.ownerA !== b.ownerA) return a.ownerA - b.ownerA;
        if (a.ownerB !== b.ownerB) return a.ownerB - b.ownerB;
        return a.t - b.t;
    });
}

export function buildFrontierGraphFromGraph(
    stars: StarState[],
    connections: StarConnection[],
    graphResult: GraphNativeDistanceView,
    options: FrontierGraphBuildOptions = {},
): FrontierGraph {
    const nodes = new Map<string, FrontierNode>();
    const edges = new Map<string, FrontierEdge>();
    const lanePoints = computeLaneFrontiers(stars, connections, graphResult);
    const pointsByLanePair = new Map<string, LaneFrontierPoint[]>();

    for (const point of lanePoints) {
        const pairId = makePairId(point.ownerA, point.ownerB);
        const nodeId = makeLaneNodeId(pairId, point.connectionId, point.t);
        nodes.set(nodeId, {
            id: nodeId,
            x: point.x,
            y: point.y,
            ownerA: point.ownerA,
            ownerB: point.ownerB,
            pairId,
            source: 'lane',
            sourceRef: point.connectionId,
            sortKey: point.t,
        });

        const lanePairKey = `${point.connectionId}|${pairId}`;
        let grouped = pointsByLanePair.get(lanePairKey);
        if (!grouped) {
            grouped = [];
            pointsByLanePair.set(lanePairKey, grouped);
        }
        grouped.push(point);
    }

    for (const [lanePairKey, grouped] of pointsByLanePair.entries()) {
        const ordered = grouped.sort((a, b) => a.t - b.t);
        const [, pairId] = lanePairKey.split('|', 2);
        for (let i = 1; i < ordered.length; i++) {
            const prev = ordered[i - 1];
            const next = ordered[i];
            const prevId = makeLaneNodeId(pairId, prev.connectionId, prev.t);
            const nextId = makeLaneNodeId(pairId, next.connectionId, next.t);
            const edgeId = `frontier:edge:lane:${pairId}:${prev.connectionId}:${prev.t.toFixed(6)}:${next.t.toFixed(6)}`;
            edges.set(edgeId, {
                id: edgeId,
                a: prevId,
                b: nextId,
                ownerA: prev.ownerA,
                ownerB: prev.ownerB,
                pairId,
                source: 'lane',
                sourceRef: prev.connectionId,
            });
        }
    }

    if (options.includeFieldFrontiers && options.fieldFrontiers?.length) {
        const fieldGroups = new Map<string, FieldFrontierPoint[]>();
        for (const point of options.fieldFrontiers) {
            const pairId = makePairId(point.ownerA, point.ownerB);
            const nodeId = makeFieldNodeId(point, pairId);
            nodes.set(nodeId, {
                id: nodeId,
                x: point.x,
                y: point.y,
                ownerA: point.ownerA,
                ownerB: point.ownerB,
                pairId,
                source: 'field',
                sourceRef: point.sourceRef,
                sortKey: point.sortKey,
            });

            const groupKey = `${pairId}|${point.sourceRef}`;
            let grouped = fieldGroups.get(groupKey);
            if (!grouped) {
                grouped = [];
                fieldGroups.set(groupKey, grouped);
            }
            grouped.push(point);
        }

        for (const [groupKey, grouped] of fieldGroups.entries()) {
            const ordered = grouped.sort((a, b) => a.sortKey - b.sortKey);
            const [pairId, sourceRef] = groupKey.split('|', 2);
            for (let i = 1; i < ordered.length; i++) {
                const prev = ordered[i - 1];
                const next = ordered[i];
                const prevId = makeFieldNodeId(prev, pairId);
                const nextId = makeFieldNodeId(next, pairId);
                const edgeId = `frontier:edge:field:${pairId}:${sourceRef}:${prev.sortKey.toFixed(6)}:${next.sortKey.toFixed(6)}`;
                edges.set(edgeId, {
                    id: edgeId,
                    a: prevId,
                    b: nextId,
                    ownerA: prev.ownerA,
                    ownerB: prev.ownerB,
                    pairId,
                    source: 'field',
                    sourceRef,
                });
            }
        }
    }

    return {
        nodes,
        edges,
        adjacency: buildAdjacency(edges),
    };
}



export interface FrontierPolyline {
    ownerA: number;
    ownerB: number;
    points: number[];
}

export function extractPolylinesFromFrontierGraph(frontier: FrontierGraph): FrontierPolyline[] {
    const pairAdjacency = new Map<string, Map<string, string[]>>();
    const pairNodes = new Map<string, Map<string, FrontierNode>>();

    for (const node of frontier.nodes.values()) {
        let nodes = pairNodes.get(node.pairId);
        if (!nodes) {
            nodes = new Map<string, FrontierNode>();
            pairNodes.set(node.pairId, nodes);
        }
        nodes.set(node.id, node);
    }

    for (const edge of frontier.edges.values()) {
        let adjacency = pairAdjacency.get(edge.pairId);
        if (!adjacency) {
            adjacency = new Map<string, string[]>();
            pairAdjacency.set(edge.pairId, adjacency);
        }

        const addNeighbor = (from: string, to: string) => {
            const neighbors = adjacency!.get(from) ?? [];
            neighbors.push(to);
            neighbors.sort((a, b) => a.localeCompare(b));
            adjacency!.set(from, neighbors);
        };

        addNeighbor(edge.a, edge.b);
        addNeighbor(edge.b, edge.a);
    }

    const polylines: FrontierPolyline[] = [];
    for (const [pairId, adjacency] of pairAdjacency.entries()) {
        const nodes = pairNodes.get(pairId);
        if (!nodes) continue;

        let pairSample: FrontierEdge | null = null;
        for (const edge of frontier.edges.values()) {
            if (edge.pairId === pairId) {
                pairSample = edge;
                break;
            }
        }
        if (!pairSample) continue;

        const usedEdges = new Set<string>();
        const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
        const sortedVertices = [...adjacency.keys()].sort((a, b) => a.localeCompare(b));

        const toWorldPoints = (path: string[]): number[] => {
            const points: number[] = [];
            for (const nodeId of path) {
                const node = nodes.get(nodeId);
                if (!node) continue;
                points.push(node.x, node.y);
            }
            return points;
        };

        const consumePath = (start: string, next: string): string[] => {
            const path = [start, next];
            usedEdges.add(edgeKey(start, next));

            let safety = 0;
            while (safety++ < 100000) {
                const prev = path[path.length - 2];
                const current = path[path.length - 1];
                const neighbors = adjacency.get(current) ?? [];

                let candidate: string | null = null;
                for (const neighbor of neighbors) {
                    const key = edgeKey(current, neighbor);
                    if (usedEdges.has(key)) continue;
                    if (neighbor === prev && neighbors.length > 1) continue;
                    candidate = neighbor;
                    break;
                }

                if (!candidate) break;
                path.push(candidate);
                usedEdges.add(edgeKey(current, candidate));
                if (candidate === start) break;
            }

            return path;
        };

        const tryAddPolyline = (path: string[]) => {
            if (path.length < 2) return;
            const isClosed = path[0] === path[path.length - 1];
            const uniquePath = isClosed ? path.slice(0, -1) : path;
            if (uniquePath.length < 2) return;

            let worldPoints = toWorldPoints(uniquePath);
            if (isClosed && worldPoints.length >= 4) {
                worldPoints = [...worldPoints, worldPoints[0], worldPoints[1]];
            }
            if (worldPoints.length >= 4) {
                polylines.push({
                    ownerA: pairSample.ownerA,
                    ownerB: pairSample.ownerB,
                    points: worldPoints,
                });
            }
        };

        for (const vertex of sortedVertices) {
            const neighbors = adjacency.get(vertex) ?? [];
            if (neighbors.length === 2) continue;
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPolyline(consumePath(vertex, neighbor));
            }
        }

        for (const vertex of sortedVertices) {
            const neighbors = adjacency.get(vertex) ?? [];
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPolyline(consumePath(vertex, neighbor));
            }
        }
    }

    return polylines;
}



