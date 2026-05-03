import type {
    TerritoryFrontierContourLayerResult,
    TerritoryFrontierContourRequest,
    TerritoryFrontierContourResult,
    TerritoryFrontierContourTechniqueId,
    TerritoryFrontierPhaseFieldLayer,
    TerritoryFrontierPolyline,
    TerritoryFrontierTriangleDiagonalPolicy,
} from './types';

interface Point {
    readonly x: number;
    readonly y: number;
}

interface Segment {
    readonly a: Point;
    readonly b: Point;
}

const EDGE_PAIRS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
    0: [],
    1: [[3, 0]],
    2: [[0, 1]],
    3: [[3, 1]],
    4: [[1, 2]],
    5: [[3, 0], [1, 2]],
    6: [[0, 2]],
    7: [[3, 2]],
    8: [[2, 3]],
    9: [[0, 2]],
    10: [[0, 1], [2, 3]],
    11: [[1, 2]],
    12: [[1, 3]],
    13: [[0, 1]],
    14: [[3, 0]],
    15: [],
};

function pointKey(point: Point): string {
    const qx = Math.round(point.x * 1024);
    const qy = Math.round(point.y * 1024);
    return `${qx}:${qy}`;
}

function interpolate(
    aValue: number,
    bValue: number,
    threshold: number,
    mode: 'midpoint' | 'scalar',
): number {
    if (mode === 'midpoint') return 0.5;
    const delta = bValue - aValue;
    if (Math.abs(delta) < 1e-6) return 0.5;
    const t = (threshold - aValue) / delta;
    return Math.max(0, Math.min(1, t));
}

function buildGridPoint(
    layer: TerritoryFrontierPhaseFieldLayer,
    gx: number,
    gy: number,
): Point {
    return {
        x: layer.originX + gx * layer.cellSizePx,
        y: layer.originY + gy * layer.cellSizePx,
    };
}

function edgePoint(
    layer: TerritoryFrontierPhaseFieldLayer,
    x: number,
    y: number,
    edge: number,
    values: readonly [number, number, number, number],
    mode: 'midpoint' | 'scalar',
): Point {
    const [a, b, c, d] = values;
    switch (edge) {
        case 0: {
            const t = interpolate(a, b, layer.threshold, mode);
            const p0 = buildGridPoint(layer, x, y);
            const p1 = buildGridPoint(layer, x + 1, y);
            return {
                x: p0.x + (p1.x - p0.x) * t,
                y: p0.y + (p1.y - p0.y) * t,
            };
        }
        case 1: {
            const t = interpolate(b, c, layer.threshold, mode);
            const p0 = buildGridPoint(layer, x + 1, y);
            const p1 = buildGridPoint(layer, x + 1, y + 1);
            return {
                x: p0.x + (p1.x - p0.x) * t,
                y: p0.y + (p1.y - p0.y) * t,
            };
        }
        case 2: {
            const t = interpolate(d, c, layer.threshold, mode);
            const p0 = buildGridPoint(layer, x, y + 1);
            const p1 = buildGridPoint(layer, x + 1, y + 1);
            return {
                x: p0.x + (p1.x - p0.x) * t,
                y: p0.y + (p1.y - p0.y) * t,
            };
        }
        default: {
            const t = interpolate(a, d, layer.threshold, mode);
            const p0 = buildGridPoint(layer, x, y);
            const p1 = buildGridPoint(layer, x, y + 1);
            return {
                x: p0.x + (p1.x - p0.x) * t,
                y: p0.y + (p1.y - p0.y) * t,
            };
        }
    }
}

function chooseSquareTopology(
    caseId: number,
    values: readonly [number, number, number, number],
    threshold: number,
): ReadonlyArray<readonly [number, number]> {
    if (caseId !== 5 && caseId !== 10) {
        return EDGE_PAIRS[caseId] ?? [];
    }
    const centerValue = (values[0] + values[1] + values[2] + values[3]) * 0.25;
    if (
        (centerValue >= threshold && caseId === 5) ||
        (centerValue < threshold && caseId === 10)
    ) {
        return [[3, 2], [0, 1]];
    }
    return [[3, 0], [1, 2]];
}

function extractMarchingSquaresSegments(
    layer: TerritoryFrontierPhaseFieldLayer,
    mode: 'midpoint' | 'scalar',
): Segment[] {
    const segments: Segment[] = [];
    if (layer.cols < 2 || layer.rows < 2) return segments;
    for (let y = 0; y < layer.rows - 1; y++) {
        for (let x = 0; x < layer.cols - 1; x++) {
            const aIndex = y * layer.cols + x;
            const bIndex = aIndex + 1;
            const dIndex = aIndex + layer.cols;
            const cIndex = dIndex + 1;
            if (layer.validMask) {
                if (
                    layer.validMask[aIndex] === 0 ||
                    layer.validMask[bIndex] === 0 ||
                    layer.validMask[cIndex] === 0 ||
                    layer.validMask[dIndex] === 0
                ) {
                    continue;
                }
            }
            const values = [
                layer.values[aIndex],
                layer.values[bIndex],
                layer.values[cIndex],
                layer.values[dIndex],
            ] as const;
            const caseId =
                (values[0] >= layer.threshold ? 1 : 0) |
                (values[1] >= layer.threshold ? 2 : 0) |
                (values[2] >= layer.threshold ? 4 : 0) |
                (values[3] >= layer.threshold ? 8 : 0);
            const edgePairs = chooseSquareTopology(caseId, values, layer.threshold);
            for (const [edgeA, edgeB] of edgePairs) {
                segments.push({
                    a: edgePoint(layer, x, y, edgeA, values, mode),
                    b: edgePoint(layer, x, y, edgeB, values, mode),
                });
            }
        }
    }
    return segments;
}

function trianglePoint(
    layer: TerritoryFrontierPhaseFieldLayer,
    x: number,
    y: number,
    pointIndex: 0 | 1 | 2 | 3,
): Point {
    switch (pointIndex) {
        case 0:
            return buildGridPoint(layer, x, y);
        case 1:
            return buildGridPoint(layer, x + 1, y);
        case 2:
            return buildGridPoint(layer, x + 1, y + 1);
        default:
            return buildGridPoint(layer, x, y + 1);
    }
}

function triangleSegments(
    layer: TerritoryFrontierPhaseFieldLayer,
    x: number,
    y: number,
    triangle: readonly [number, number, number],
    values: readonly [number, number, number, number],
): Segment[] {
    const vertexValues = [
        values[triangle[0]],
        values[triangle[1]],
        values[triangle[2]],
    ] as const;
    const points = [
        trianglePoint(layer, x, y, triangle[0] as 0 | 1 | 2 | 3),
        trianglePoint(layer, x, y, triangle[1] as 0 | 1 | 2 | 3),
        trianglePoint(layer, x, y, triangle[2] as 0 | 1 | 2 | 3),
    ] as const;
    const intersections: Point[] = [];
    const edges: ReadonlyArray<readonly [0 | 1 | 2, 0 | 1 | 2]> = [
        [0, 1],
        [1, 2],
        [2, 0],
    ];

    for (const [aIndex, bIndex] of edges) {
        const aValue = vertexValues[aIndex];
        const bValue = vertexValues[bIndex];
        const aInside = aValue >= layer.threshold;
        const bInside = bValue >= layer.threshold;
        if (aInside === bInside) continue;
        const t = interpolate(aValue, bValue, layer.threshold, 'scalar');
        intersections.push({
            x: points[aIndex].x + (points[bIndex].x - points[aIndex].x) * t,
            y: points[aIndex].y + (points[bIndex].y - points[aIndex].y) * t,
        });
    }

    if (intersections.length !== 2) return [];
    return [{ a: intersections[0], b: intersections[1] }];
}

function pickTriangleDiagonal(
    policy: TerritoryFrontierTriangleDiagonalPolicy,
    x: number,
    y: number,
    values: readonly [number, number, number, number],
): 'forward' | 'backward' {
    switch (policy) {
        case 'checkerboard':
            return (x + y) % 2 === 0 ? 'forward' : 'backward';
        case 'gradient': {
            const gx = (values[1] + values[2]) - (values[0] + values[3]);
            const gy = (values[3] + values[2]) - (values[0] + values[1]);
            return gx * gy >= 0 ? 'forward' : 'backward';
        }
        default:
            return 'forward';
    }
}

function extractMarchingTriangleSegments(
    layer: TerritoryFrontierPhaseFieldLayer,
    policy: TerritoryFrontierTriangleDiagonalPolicy,
): Segment[] {
    const segments: Segment[] = [];
    if (layer.cols < 2 || layer.rows < 2) return segments;
    for (let y = 0; y < layer.rows - 1; y++) {
        for (let x = 0; x < layer.cols - 1; x++) {
            const aIndex = y * layer.cols + x;
            const bIndex = aIndex + 1;
            const dIndex = aIndex + layer.cols;
            const cIndex = dIndex + 1;
            if (layer.validMask) {
                if (
                    layer.validMask[aIndex] === 0 ||
                    layer.validMask[bIndex] === 0 ||
                    layer.validMask[cIndex] === 0 ||
                    layer.validMask[dIndex] === 0
                ) {
                    continue;
                }
            }
            const values = [
                layer.values[aIndex],
                layer.values[bIndex],
                layer.values[cIndex],
                layer.values[dIndex],
            ] as const;
            const diagonal = pickTriangleDiagonal(policy, x, y, values);
            if (diagonal === 'forward') {
                segments.push(
                    ...triangleSegments(layer, x, y, [0, 1, 2], values),
                    ...triangleSegments(layer, x, y, [0, 2, 3], values),
                );
            } else {
                segments.push(
                    ...triangleSegments(layer, x, y, [0, 1, 3], values),
                    ...triangleSegments(layer, x, y, [1, 2, 3], values),
                );
            }
        }
    }
    return segments;
}

function segmentsToPolylines(segments: readonly Segment[]): TerritoryFrontierPolyline[] {
    if (segments.length === 0) return [];
    const adjacency = new Map<string, string[]>();
    const pointsByKey = new Map<string, Point>();
    const edgeKeys = new Set<string>();

    const addEdge = (a: Point, b: Point): void => {
        const keyA = pointKey(a);
        const keyB = pointKey(b);
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        if (edgeKeys.has(edgeKey)) return;
        edgeKeys.add(edgeKey);
        pointsByKey.set(keyA, a);
        pointsByKey.set(keyB, b);
        const listA = adjacency.get(keyA) ?? [];
        listA.push(keyB);
        adjacency.set(keyA, listA);
        const listB = adjacency.get(keyB) ?? [];
        listB.push(keyA);
        adjacency.set(keyB, listB);
    };

    for (const segment of segments) {
        addEdge(segment.a, segment.b);
    }

    const visitedEdges = new Set<string>();
    const consumeEdge = (a: string, b: string): boolean => {
        const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (visitedEdges.has(edgeKey)) return false;
        visitedEdges.add(edgeKey);
        return true;
    };

    const walk = (start: string, next: string): string[] => {
        const chain = [start, next];
        let prev = start;
        let current = next;
        while (true) {
            const neighbors = adjacency.get(current) ?? [];
            let candidate: string | null = null;
            for (const neighbor of neighbors) {
                if (neighbor === prev && neighbors.length > 1) continue;
                const edgeKey = current < neighbor
                    ? `${current}|${neighbor}`
                    : `${neighbor}|${current}`;
                if (visitedEdges.has(edgeKey)) continue;
                candidate = neighbor;
                break;
            }
            if (!candidate) break;
            if (!consumeEdge(current, candidate)) break;
            prev = current;
            current = candidate;
            chain.push(current);
            if (current === start) break;
        }
        return chain;
    };

    const polylines: TerritoryFrontierPolyline[] = [];
    for (const [key, neighbors] of adjacency) {
        if (neighbors.length !== 1) continue;
        const next = neighbors[0];
        if (!consumeEdge(key, next)) continue;
        const keys = walk(key, next);
        polylines.push({
            points: keys.flatMap((entry) => {
                const point = pointsByKey.get(entry)!;
                return [point.x, point.y];
            }),
            closed: false,
        });
    }

    for (const [key, neighbors] of adjacency) {
        for (const next of neighbors) {
            if (!consumeEdge(key, next)) continue;
            const keys = walk(key, next);
            const closed = keys.length > 2 && keys[keys.length - 1] === key;
            if (closed) {
                keys.pop();
            }
            polylines.push({
                points: keys.flatMap((entry) => {
                    const point = pointsByKey.get(entry)!;
                    return [point.x, point.y];
                }),
                closed,
            });
        }
    }

    return polylines.filter((polyline) => polyline.points.length >= 4);
}

function extractSegmentsForLayer(
    layer: TerritoryFrontierPhaseFieldLayer,
    technique: TerritoryFrontierContourTechniqueId,
    triangleDiagonalPolicy: TerritoryFrontierTriangleDiagonalPolicy,
): Segment[] {
    switch (technique) {
        case 'marching_squares_midpoint':
            return extractMarchingSquaresSegments(layer, 'midpoint');
        case 'marching_squares_scalar':
            return extractMarchingSquaresSegments(layer, 'scalar');
        case 'marching_triangles_checkerboard':
            return extractMarchingTriangleSegments(layer, 'checkerboard');
        case 'marching_triangles_gradient':
            return extractMarchingTriangleSegments(layer, 'gradient');
        case 'marching_triangles_fixed':
        default:
            return extractMarchingTriangleSegments(layer, triangleDiagonalPolicy);
    }
}

export function extractTerritoryFrontierContours(
    request: TerritoryFrontierContourRequest,
): TerritoryFrontierContourResult {
    const layers: TerritoryFrontierContourLayerResult[] = [];
    let totalPolylines = 0;
    let totalVertices = 0;
    let totalSegments = 0;

    for (const layer of request.phaseField.layers) {
        const segments = extractSegmentsForLayer(
            layer,
            request.technique,
            request.triangleDiagonalPolicy,
        );
        const polylines = segmentsToPolylines(segments);
        const vertexCount = polylines.reduce(
            (total, polyline) => total + (polyline.points.length >> 1),
            0,
        );
        totalPolylines += polylines.length;
        totalVertices += vertexCount;
        totalSegments += segments.length;
        layers.push({
            id: layer.id,
            label: layer.label,
            ownerIndex: layer.ownerIndex,
            opposingOwnerIndex: layer.opposingOwnerIndex,
            threshold: layer.threshold,
            polylines,
            segmentCount: segments.length,
            vertexCount,
        });
    }

    return {
        technique: request.technique,
        layers,
        polylineCount: totalPolylines,
        vertexCount: totalVertices,
        segmentCount: totalSegments,
    };
}
