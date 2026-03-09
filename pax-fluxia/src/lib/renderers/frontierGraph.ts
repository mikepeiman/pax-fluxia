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
                    ownerA: pairSample!.ownerA,
                    ownerB: pairSample!.ownerB,
                    points: worldPoints,
                });
            }
        };

        // Start from branching/junction vertices first for stable output
        for (const vertex of sortedVertices) {
            const neighbors = adjacency.get(vertex) ?? [];
            if (neighbors.length === 2) continue;
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPolyline(consumePath(vertex, neighbor));
            }
        }

        // Pick up remaining cycles
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

export interface CanonicalPolylineSmoothingOptions {
    simplifyTolerance: number;
    straightnessPasses: number;
    maxAlignmentDriftCells: number;
}

const DEFAULT_CANONICAL_SMOOTHING_OPTIONS: CanonicalPolylineSmoothingOptions = {
    simplifyTolerance: 2.0,
    straightnessPasses: 2,
    maxAlignmentDriftCells: 0.35,
};

function segmentMaxError(points: number[], startPointIndex: number, endPointIndex: number): number {
    const sx = points[startPointIndex * 2];
    const sy = points[startPointIndex * 2 + 1];
    const ex = points[endPointIndex * 2];
    const ey = points[endPointIndex * 2 + 1];
    const dx = ex - sx;
    const dy = ey - sy;
    const lenSq = dx * dx + dy * dy;

    if (lenSq <= EPS) return 0;

    let maxError = 0;
    for (let i = startPointIndex + 1; i < endPointIndex; i++) {
        const px = points[i * 2];
        const py = points[i * 2 + 1];
        const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lenSq));
        const lx = sx + dx * t;
        const ly = sy + dy * t;
        const err = Math.hypot(px - lx, py - ly);
        if (err > maxError) maxError = err;
    }

    return maxError;
}

function simplifyOpenPolyline(points: number[], tolerance: number): number[] {
    const n = points.length / 2;
    if (n <= 2 || tolerance <= EPS) return points;

    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;

    const stack: number[] = [0, n - 1];
    while (stack.length > 0) {
        const endIdx = stack.pop()!;
        const startIdx = stack.pop()!;

        let bestIdx = -1;
        let bestDist = 0;

        const sx = points[startIdx * 2];
        const sy = points[startIdx * 2 + 1];
        const ex = points[endIdx * 2];
        const ey = points[endIdx * 2 + 1];
        const dx = ex - sx;
        const dy = ey - sy;
        const lenSq = dx * dx + dy * dy;

        for (let i = startIdx + 1; i < endIdx; i++) {
            const px = points[i * 2];
            const py = points[i * 2 + 1];
            let dist: number;
            if (lenSq <= EPS) {
                dist = Math.hypot(px - sx, py - sy);
            } else {
                const t = ((px - sx) * dx + (py - sy) * dy) / lenSq;
                const cx = sx + t * dx;
                const cy = sy + t * dy;
                dist = Math.hypot(px - cx, py - cy);
            }
            if (dist > bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }

        if (bestIdx >= 0 && bestDist > tolerance) {
            keep[bestIdx] = 1;
            stack.push(startIdx, bestIdx, bestIdx, endIdx);
        }
    }

    const out: number[] = [];
    for (let i = 0; i < n; i++) {
        if (keep[i]) out.push(points[i * 2], points[i * 2 + 1]);
    }

    return out.length >= 4 ? out : points;
}

function linearizeOpenPolyline(points: number[], maxError: number): number[] {
    const n = points.length / 2;
    if (n <= 2 || maxError <= EPS) return points;

    const out: number[] = [points[0], points[1]];
    let startIdx = 0;

    for (let endIdx = 2; endIdx < n; endIdx++) {
        const err = segmentMaxError(points, startIdx, endIdx);
        if (err > maxError) {
            const keepIdx = endIdx - 1;
            out.push(points[keepIdx * 2], points[keepIdx * 2 + 1]);
            startIdx = keepIdx;
        }
    }

    out.push(points[(n - 1) * 2], points[(n - 1) * 2 + 1]);

    const deduped: number[] = [out[0], out[1]];
    for (let i = 2; i < out.length; i += 2) {
        const px = deduped[deduped.length - 2];
        const py = deduped[deduped.length - 1];
        const nx = out[i];
        const ny = out[i + 1];
        if (Math.hypot(nx - px, ny - py) < 0.01) continue;
        deduped.push(nx, ny);
    }

    return deduped.length >= 4 ? deduped : points;
}

function smoothCanonicalFrontierPolylines(
    polylines: FrontierPolyline[],
    ownerGridInfo?: OwnerGridInfo,
    options: CanonicalPolylineSmoothingOptions = DEFAULT_CANONICAL_SMOOTHING_OPTIONS,
): FrontierPolyline[] {
    if (polylines.length === 0) return polylines;

    const requestedTolerance = Math.max(0, options.simplifyTolerance);
    const passes = Math.max(1, options.straightnessPasses + 1);

    let maxAlignmentTolerance = requestedTolerance;
    if (ownerGridInfo) {
        const cellW = ownerGridInfo.extentW / Math.max(ownerGridInfo.gridW, 1);
        const cellH = ownerGridInfo.extentH / Math.max(ownerGridInfo.gridH, 1);
        const cellSize = Math.max(cellW, cellH);
        maxAlignmentTolerance = Math.max(0, cellSize * Math.max(0, options.maxAlignmentDriftCells));
    }

    const baseTolerance = Math.min(requestedTolerance, maxAlignmentTolerance);

    return polylines.map((polyline) => {
        if (polyline.points.length < 4) return polyline;

        const isClosed = polyline.points.length >= 4
            && Math.abs(polyline.points[0] - polyline.points[polyline.points.length - 2]) <= EPS
            && Math.abs(polyline.points[1] - polyline.points[polyline.points.length - 1]) <= EPS;

        const openPoints = isClosed
            ? polyline.points.slice(0, polyline.points.length - 2)
            : [...polyline.points];

        let smoothed = simplifyOpenPolyline(openPoints, baseTolerance);
        for (let pass = 0; pass < passes; pass++) {
            const passTolerance = Math.min(baseTolerance * (1 + pass * 0.35), maxAlignmentTolerance);
            smoothed = linearizeOpenPolyline(smoothed, passTolerance);
        }

        const points = isClosed && smoothed.length >= 4
            ? [...smoothed, smoothed[0], smoothed[1]]
            : smoothed;

        return {
            ownerA: polyline.ownerA,
            ownerB: polyline.ownerB,
            points,
        };
    }).filter((polyline) => polyline.points.length >= 4);
}

// ============================================================================
// Stage 2B: Field Frontier Extraction from CPU Owner Grid
// ============================================================================

export interface OwnerGridInfo {
    ownerGrid: Int16Array;
    gridW: number;
    gridH: number;
    originX: number;
    originY: number;
    extentW: number;
    extentH: number;
}

interface GridFrontierSegment {
    pairId: string;
    ownerA: number;
    ownerB: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface GridFrontierNode {
    id: string;
    x: number;
    y: number;
}

function makeGridFrontierNodeId(pairId: string, x: number, y: number): string {
    return `field-node:${pairId}:${x}:${y}`;
}

function parsePairOwners(pairId: string): { ownerA: number; ownerB: number } | null {
    const parts = pairId.split(':');
    if (parts.length !== 3) return null;
    const ownerA = Number(parts[1]);
    const ownerB = Number(parts[2]);
    if (!Number.isFinite(ownerA) || !Number.isFinite(ownerB)) return null;
    return { ownerA, ownerB };
}

function compareGridNodePosition(a: GridFrontierNode, b: GridFrontierNode): number {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
}

function extractOrderedPathsFromAdjacency(adjacency: Map<string, string[]>): string[][] {
    const usedEdges = new Set<string>();
    const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const sortedVertices = [...adjacency.keys()].sort((a, b) => a.localeCompare(b));

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

    const paths: string[][] = [];

    for (const vertex of sortedVertices) {
        const neighbors = adjacency.get(vertex) ?? [];
        if (neighbors.length === 2) continue;
        for (const neighbor of neighbors) {
            const key = edgeKey(vertex, neighbor);
            if (usedEdges.has(key)) continue;
            paths.push(consumePath(vertex, neighbor));
        }
    }

    for (const vertex of sortedVertices) {
        const neighbors = adjacency.get(vertex) ?? [];
        for (const neighbor of neighbors) {
            const key = edgeKey(vertex, neighbor);
            if (usedEdges.has(key)) continue;
            paths.push(consumePath(vertex, neighbor));
        }
    }

    return paths;
}

function buildFieldFrontierPointsFromSegments(
    segments: GridFrontierSegment[],
    info: OwnerGridInfo,
): FieldFrontierPoint[] {
    const { gridW, gridH, originX, originY, extentW, extentH } = info;
    const points: FieldFrontierPoint[] = [];
    const segmentsByPair = new Map<string, GridFrontierSegment[]>();

    for (const segment of segments) {
        let grouped = segmentsByPair.get(segment.pairId);
        if (!grouped) {
            grouped = [];
            segmentsByPair.set(segment.pairId, grouped);
        }
        grouped.push(segment);
    }

    const sortedPairs = [...segmentsByPair.keys()].sort((a, b) => a.localeCompare(b));
    for (const pairId of sortedPairs) {
        const pairSegments = segmentsByPair.get(pairId);
        if (!pairSegments || pairSegments.length === 0) continue;

        const pairOwners = parsePairOwners(pairId);
        if (!pairOwners) continue;

        const nodesByCoord = new Map<string, GridFrontierNode>();
        const nodesById = new Map<string, GridFrontierNode>();
        const adjacencySets = new Map<string, Set<string>>();

        const ensureNode = (x: number, y: number): GridFrontierNode => {
            const coordKey = `${x},${y}`;
            const existing = nodesByCoord.get(coordKey);
            if (existing) return existing;

            const node: GridFrontierNode = {
                id: makeGridFrontierNodeId(pairId, x, y),
                x,
                y,
            };
            nodesByCoord.set(coordKey, node);
            nodesById.set(node.id, node);
            return node;
        };

        const addAdjacency = (fromNodeId: string, toNodeId: string): void => {
            let neighbors = adjacencySets.get(fromNodeId);
            if (!neighbors) {
                neighbors = new Set<string>();
                adjacencySets.set(fromNodeId, neighbors);
            }
            neighbors.add(toNodeId);
        };

        for (const segment of pairSegments) {
            const nodeA = ensureNode(segment.x1, segment.y1);
            const nodeB = ensureNode(segment.x2, segment.y2);
            addAdjacency(nodeA.id, nodeB.id);
            addAdjacency(nodeB.id, nodeA.id);
        }

        const adjacency = new Map<string, string[]>();
        for (const [nodeId, neighbors] of adjacencySets.entries()) {
            const sortedNeighbors = [...neighbors].sort((a, b) => {
                const na = nodesById.get(a);
                const nb = nodesById.get(b);
                if (!na || !nb) return a.localeCompare(b);
                return compareGridNodePosition(na, nb);
            });
            adjacency.set(nodeId, sortedNeighbors);
        }

        const orderedPaths = extractOrderedPathsFromAdjacency(adjacency)
            .filter((path) => path.length >= 2)
            .sort((a, b) => {
                const a0 = nodesById.get(a[0]);
                const b0 = nodesById.get(b[0]);
                if (!a0 || !b0) return a.length - b.length;
                if (a0.y !== b0.y) return a0.y - b0.y;
                if (a0.x !== b0.x) return a0.x - b0.x;
                return a.length - b.length;
            });

        let contourIndex = 0;
        for (const rawPath of orderedPaths) {
            const isClosed = rawPath[0] === rawPath[rawPath.length - 1];
            const uniquePath = isClosed ? rawPath.slice(0, -1) : rawPath;
            if (uniquePath.length < 2) continue;

            const sourceRef = `grid:${pairId}:contour:${String(contourIndex).padStart(4, '0')}`;
            contourIndex++;

            let localOrder = 0;
            for (const nodeId of uniquePath) {
                const node = nodesById.get(nodeId);
                if (!node) continue;
                points.push({
                    id: `field:${pairId}:c${contourIndex}:p${localOrder}`,
                    x: originX + (node.x / gridW) * extentW,
                    y: originY + (node.y / gridH) * extentH,
                    ownerA: pairOwners.ownerA,
                    ownerB: pairOwners.ownerB,
                    source: 'field',
                    sourceRef,
                    sortKey: localOrder,
                });
                localOrder++;
            }

            if (isClosed && uniquePath.length >= 2) {
                const firstNode = nodesById.get(uniquePath[0]);
                if (firstNode) {
                    points.push({
                        id: `field:${pairId}:c${contourIndex}:p${localOrder}`,
                        x: originX + (firstNode.x / gridW) * extentW,
                        y: originY + (firstNode.y / gridH) * extentH,
                        ownerA: pairOwners.ownerA,
                        ownerB: pairOwners.ownerB,
                        source: 'field',
                        sourceRef,
                        sortKey: localOrder,
                    });
                }
            }
        }
    }

    return points;
}

export function extractFieldFrontiersFromOwnerGrid(info: OwnerGridInfo): FieldFrontierPoint[] {
    const { ownerGrid, gridW, gridH } = info;
    if (!ownerGrid || gridW <= 0 || gridH <= 0 || ownerGrid.length < gridW * gridH) {
        return [];
    }

    const getOwner = (gx: number, gy: number): number => {
        if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) return -1;
        return ownerGrid[gy * gridW + gx];
    };

    const segments: GridFrontierSegment[] = [];

    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const owner = getOwner(gx, gy);
            if (owner < 0) continue;

            const rightOwner = getOwner(gx + 1, gy);
            if (rightOwner >= 0 && rightOwner !== owner) {
                const ownerA = Math.min(owner, rightOwner);
                const ownerB = Math.max(owner, rightOwner);
                segments.push({
                    pairId: makePairId(ownerA, ownerB),
                    ownerA,
                    ownerB,
                    x1: gx + 1,
                    y1: gy,
                    x2: gx + 1,
                    y2: gy + 1,
                });
            }

            const downOwner = getOwner(gx, gy + 1);
            if (downOwner >= 0 && downOwner !== owner) {
                const ownerA = Math.min(owner, downOwner);
                const ownerB = Math.max(owner, downOwner);
                segments.push({
                    pairId: makePairId(ownerA, ownerB),
                    ownerA,
                    ownerB,
                    x1: gx,
                    y1: gy + 1,
                    x2: gx + 1,
                    y2: gy + 1,
                });
            }
        }
    }

    return buildFieldFrontierPointsFromSegments(segments, info);
}

// ============================================================================
// Canonical Polyline Build + Validation
// ============================================================================

export interface CanonicalFrontierValidation {
    valid: boolean;
    reasons: string[];
    polylineCount: number;
    pairCount: number;
    maxPointsPerPolyline: number;
    maxPolylinesPerPair: number;
    maxPointsPerPair: number;
}

export interface CanonicalFrontierBuildResult {
    polylines: FrontierPolyline[];
    validation: CanonicalFrontierValidation;
}

function validateCanonicalFrontierPolylines(
    polylines: FrontierPolyline[],
    ownerGridInfo?: OwnerGridInfo,
): CanonicalFrontierValidation {
    const reasons: string[] = [];

    const pairStats = new Map<string, { polylines: number; points: number }>();
    let maxPointsPerPolyline = 0;

    let minX = -Infinity;
    let minY = -Infinity;
    let maxX = Infinity;
    let maxY = Infinity;

    if (ownerGridInfo) {
        const { originX, originY, extentW, extentH, gridW, gridH } = ownerGridInfo;
        const cellW = extentW / Math.max(gridW, 1);
        const cellH = extentH / Math.max(gridH, 1);
        const margin = Math.max(cellW, cellH, 1) * 2;
        minX = originX - margin;
        minY = originY - margin;
        maxX = originX + extentW + margin;
        maxY = originY + extentH + margin;
    }

    for (const polyline of polylines) {
        const pointCount = Math.floor(polyline.points.length / 2);
        if (!Number.isFinite(polyline.ownerA) || !Number.isFinite(polyline.ownerB)) {
            reasons.push('polyline owner ids must be finite numbers');
            continue;
        }
        if (polyline.ownerA > polyline.ownerB) {
            reasons.push('polyline owner ordering must be canonical (ownerA <= ownerB)');
        }
        if (polyline.points.length < 4 || polyline.points.length % 2 !== 0) {
            reasons.push('polyline must contain at least two world-space points');
            continue;
        }

        maxPointsPerPolyline = Math.max(maxPointsPerPolyline, pointCount);

        const pairKey = `${polyline.ownerA}|${polyline.ownerB}`;
        const stats = pairStats.get(pairKey) ?? { polylines: 0, points: 0 };
        stats.polylines += 1;
        stats.points += pointCount;
        pairStats.set(pairKey, stats);

        for (let i = 0; i < polyline.points.length; i += 2) {
            const x = polyline.points[i];
            const y = polyline.points[i + 1];
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                reasons.push('polyline points must be finite numbers');
                break;
            }
            if (x < minX || x > maxX || y < minY || y > maxY) {
                reasons.push('polyline points escaped expected ownership-grid world bounds');
                break;
            }
        }
    }

    if (polylines.length === 0) {
        reasons.push('canonical frontier build produced no polylines');
    }

    const maxPolylinesPerPair = [...pairStats.values()].reduce((m, s) => Math.max(m, s.polylines), 0);
    const maxPointsPerPair = [...pairStats.values()].reduce((m, s) => Math.max(m, s.points), 0);

    const chainThreshold = ownerGridInfo
        ? Math.max(256, 4 * (ownerGridInfo.gridW + ownerGridInfo.gridH))
        : 4096;

    if (maxPointsPerPolyline > chainThreshold) {
        reasons.push('detected oversized frontier chain; possible pair-global stitching regression');
    }

    if (maxPointsPerPair > chainThreshold * 4) {
        reasons.push('detected oversized owner-pair frontier budget; possible contour merge regression');
    }

    return {
        valid: reasons.length === 0,
        reasons: [...new Set(reasons)],
        polylineCount: polylines.length,
        pairCount: pairStats.size,
        maxPointsPerPolyline,
        maxPolylinesPerPair,
        maxPointsPerPair,
    };
}

// ============================================================================
// Convenience: Build canonical polylines from graph distances + owner grid
// ============================================================================

export function buildCanonicalFrontierPolylineSet(
    stars: StarState[],
    connections: StarConnection[],
    graphResult: GraphNativeDistanceView,
    ownerGridInfo?: OwnerGridInfo,
): CanonicalFrontierBuildResult {
    const fieldFrontiers = ownerGridInfo
        ? extractFieldFrontiersFromOwnerGrid(ownerGridInfo)
        : [];

    const frontier = buildFrontierGraphFromGraph(stars, connections, graphResult, {
        includeFieldFrontiers: fieldFrontiers.length > 0,
        fieldFrontiers,
    });

    const rawPolylines = extractPolylinesFromFrontierGraph(frontier);
    const polylines = smoothCanonicalFrontierPolylines(rawPolylines, ownerGridInfo);
    const validation = validateCanonicalFrontierPolylines(polylines, ownerGridInfo);

    return {
        polylines,
        validation,
    };
}

export function buildCanonicalFrontierPolylines(
    stars: StarState[],
    connections: StarConnection[],
    graphResult: GraphNativeDistanceView,
    ownerGridInfo?: OwnerGridInfo,
): FrontierPolyline[] {
    return buildCanonicalFrontierPolylineSet(
        stars,
        connections,
        graphResult,
        ownerGridInfo,
    ).polylines;
}

