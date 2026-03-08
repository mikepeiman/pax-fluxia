import * as PIXI from 'pixi.js';
import { compileHighShaderGlProgram, localUniformBitGl, roundPixelsBitGl } from 'pixi.js';
import type { CenterlineGraphPair } from './centerlineGraph';

export interface FittedPath {
    id: string;
    ownerA: number;
    ownerB: number;
    points: number[];
}

export interface StraightFitterOptions {
    gridW: number;
    gridH: number;
    originX: number;
    originY: number;
    extentW: number;
    extentH: number;
    simplifyTolerance: number;
    straightnessPasses: number;
    maxAlignmentDriftCells: number;
}

export interface StrokeMeshBuildOptions {
    width: number;
    softness: number;
    miterLimit?: number;
}

export interface StrokeMeshGeometryBuffers {
    positions: Float32Array;
    side: Float32Array;
    indices: Uint32Array;
}

const EPS = 0.00001;

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

/**
 * Deterministic straight-path fitter built on top of centerline graphs.
 * Output path IDs are stable for a fixed graph and options set.
 */
export function fitStraightPathsFromCenterlineGraphs(
    graphs: CenterlineGraphPair[],
    options: StraightFitterOptions,
): FittedPath[] {
    const toWorldPoints = (path: string[], nodes: Map<string, { x: number; y: number }>): number[] => {
        const out: number[] = [];
        for (const nodeId of path) {
            const node = nodes.get(nodeId);
            if (!node) continue;
            out.push(
                options.originX + (node.x / options.gridW) * options.extentW,
                options.originY + (node.y / options.gridH) * options.extentH,
            );
        }
        return out;
    };

    const fitted: FittedPath[] = [];
    const cellSize = Math.max(
        options.extentW / Math.max(options.gridW, 1),
        options.extentH / Math.max(options.gridH, 1),
    );
    const maxAlignmentTolerance = cellSize * options.maxAlignmentDriftCells;

    for (const graph of graphs) {
        const adjacency = graph.adjacency;
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

        let pathOrdinal = 0;
        const tryAddPath = (path: string[]) => {
            if (path.length < 2) return;

            const isClosed = path[0] === path[path.length - 1];
            const uniquePath = isClosed ? path.slice(0, -1) : path;
            if (uniquePath.length < 2) return;

            let worldPoints = toWorldPoints(uniquePath, graph.nodes);
            const requestedTolerance = Math.max(0, options.simplifyTolerance);
            const baseTolerance = Math.min(requestedTolerance, maxAlignmentTolerance);
            worldPoints = simplifyOpenPolyline(worldPoints, baseTolerance);

            const passes = Math.max(1, options.straightnessPasses + 1);
            for (let pass = 0; pass < passes; pass++) {
                const passTolerance = Math.min(baseTolerance * (1 + pass * 0.35), maxAlignmentTolerance);
                worldPoints = linearizeOpenPolyline(worldPoints, passTolerance);
            }

            if (isClosed && worldPoints.length >= 4) {
                worldPoints = [...worldPoints, worldPoints[0], worldPoints[1]];
            }

            if (worldPoints.length >= 4) {
                fitted.push({
                    id: `${graph.pairId}:path:${pathOrdinal++}`,
                    ownerA: graph.ownerA,
                    ownerB: graph.ownerB,
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
                tryAddPath(consumePath(vertex, neighbor));
            }
        }

        for (const vertex of sortedVertices) {
            const neighbors = adjacency.get(vertex) ?? [];
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPath(consumePath(vertex, neighbor));
            }
        }
    }

    return fitted;
}

function normalize2(dx: number, dy: number): [number, number] {
    const len = Math.hypot(dx, dy);
    if (len <= EPS) return [0, 0];
    return [dx / len, dy / len];
}

/**
 * Builds a centered stroke strip mesh for fitted paths.
 *
 * Note: round joins/caps are handled in a follow-up pass. This builder currently
 * emits a high-quality miter/bevel-capable strip as the canonical base geometry.
 */
export function buildStrokeMeshGeometryBuffers(
    paths: FittedPath[],
    options: StrokeMeshBuildOptions,
): StrokeMeshGeometryBuffers {
    const positions: number[] = [];
    const side: number[] = [];
    const indices: number[] = [];

    const halfWidth = Math.max(0, options.width * 0.5);
    const halfExtent = halfWidth + Math.max(0, options.softness);
    const miterLimit = Math.max(1, options.miterLimit ?? 3);

    if (halfExtent <= EPS) {
        return {
            positions: new Float32Array(),
            side: new Float32Array(),
            indices: new Uint32Array(),
        };
    }

    for (const path of paths) {
        const pointCount = path.points.length / 2;
        if (pointCount < 2) continue;

        const baseVertex = positions.length / 2;

        for (let i = 0; i < pointCount; i++) {
            const px = path.points[i * 2];
            const py = path.points[i * 2 + 1];

            const prevIdx = Math.max(0, i - 1);
            const nextIdx = Math.min(pointCount - 1, i + 1);

            const prevX = path.points[prevIdx * 2];
            const prevY = path.points[prevIdx * 2 + 1];
            const nextX = path.points[nextIdx * 2];
            const nextY = path.points[nextIdx * 2 + 1];

            const [dirPrevX, dirPrevY] = normalize2(px - prevX, py - prevY);
            const [dirNextX, dirNextY] = normalize2(nextX - px, nextY - py);

            const prevValid = Math.abs(dirPrevX) + Math.abs(dirPrevY) > EPS;
            const nextValid = Math.abs(dirNextX) + Math.abs(dirNextY) > EPS;

            let dirAX = dirPrevX;
            let dirAY = dirPrevY;
            let dirBX = dirNextX;
            let dirBY = dirNextY;

            if (!prevValid && nextValid) {
                dirAX = dirBX;
                dirAY = dirBY;
            } else if (!nextValid && prevValid) {
                dirBX = dirAX;
                dirBY = dirAY;
            } else if (!prevValid && !nextValid) {
                dirAX = 1;
                dirAY = 0;
                dirBX = 1;
                dirBY = 0;
            }

            const normalAX = -dirAY;
            const normalAY = dirAX;
            const normalBX = -dirBY;
            const normalBY = dirBX;

            let tangentX = dirAX + dirBX;
            let tangentY = dirAY + dirBY;
            const tangentLen = Math.hypot(tangentX, tangentY);
            if (tangentLen <= EPS) {
                tangentX = dirBX;
                tangentY = dirBY;
            } else {
                tangentX /= tangentLen;
                tangentY /= tangentLen;
            }

            const miterX = -tangentY;
            const miterY = tangentX;
            const denom = miterX * normalBX + miterY * normalBY;

            let miterScale = halfExtent;
            if (Math.abs(denom) > EPS) {
                miterScale = halfExtent / Math.abs(denom);
            }

            const maxMiter = halfExtent * miterLimit;
            miterScale = Math.min(miterScale, maxMiter);

            const ox = miterX * miterScale;
            const oy = miterY * miterScale;

            // Left vertex (+side)
            positions.push(px + ox, py + oy);
            side.push(1);
            // Right vertex (-side)
            positions.push(px - ox, py - oy);
            side.push(-1);
        }

        for (let i = 0; i < pointCount - 1; i++) {
            const i0 = baseVertex + i * 2;
            const i1 = i0 + 1;
            const i2 = i0 + 2;
            const i3 = i0 + 3;

            indices.push(i0, i1, i2);
            indices.push(i2, i1, i3);
        }
    }

    return {
        positions: new Float32Array(positions),
        side: new Float32Array(side),
        indices: new Uint32Array(indices),
    };
}

export function createStrokeMeshGeometryFromBuffers(
    buffers: StrokeMeshGeometryBuffers,
    previousPositions?: Float32Array,
): PIXI.MeshGeometry {
    const prev = previousPositions && previousPositions.length === buffers.positions.length
        ? previousPositions
        : buffers.positions;

    const geometry = new PIXI.MeshGeometry({
        positions: buffers.positions,
        indices: buffers.indices,
    });
    // Custom vertex attributes for morph + SDF edge
    (geometry as any).addAttribute('aPrevPosition', new Float32Array(prev));
    (geometry as any).addAttribute('aSide', buffers.side);
    return geometry;
}

export function createStrokeMeshGeometry(
    paths: FittedPath[],
    options: StrokeMeshBuildOptions,
    previousPositions?: Float32Array,
): PIXI.MeshGeometry {
    const buffers = buildStrokeMeshGeometryBuffers(paths, options);
    return createStrokeMeshGeometryFromBuffers(buffers, previousPositions);
}

const strokeMeshBitGl = {
    name: 'stroke-mesh-border-bit',
    vertex: {
        header: /* glsl */ `
            in vec2 aPrevPosition;
            in float aSide;
            uniform float uMorphMix;
            out float vSideAbs;
        `,
        main: /* glsl */ `
            position = mix(aPrevPosition, position, uMorphMix);
            vSideAbs = abs(aSide);
        `,
    },
    fragment: {
        header: /* glsl */ `
            in float vSideAbs;
            uniform vec3 uStrokeColor;
            uniform float uStrokeAlpha;
            uniform float uInnerSide;
        `,
        main: /* glsl */ `
            float edgeMask = 1.0 - smoothstep(uInnerSide, 1.0, vSideAbs);
            float alpha = edgeMask * uStrokeAlpha;
            outColor = vec4(uStrokeColor * alpha, alpha);
        `,
    },
};

export interface StrokeMeshShaderOptions {
    color: [number, number, number];
    alpha: number;
    width: number;
    softness: number;
    morphMix?: number;
}

export function createStrokeMeshShader(options: StrokeMeshShaderOptions): PIXI.Shader {
    const safeWidth = Math.max(0, options.width);
    const safeSoftness = Math.max(0, options.softness);
    const halfWidth = safeWidth * 0.5;
    const halfExtent = Math.max(EPS, halfWidth + safeSoftness);
    const innerSide = Math.max(0, Math.min(1, halfWidth / halfExtent));

    const glProgram = compileHighShaderGlProgram({
        bits: [localUniformBitGl, strokeMeshBitGl, roundPixelsBitGl],
        name: 'distance-field-border-stroke-mesh',
    });

    return new PIXI.Shader({
        glProgram,
        resources: {
            strokeMeshUniforms: {
                uStrokeColor: { value: new Float32Array(options.color), type: 'vec3<f32>' },
                uStrokeAlpha: { value: options.alpha, type: 'f32' },
                uInnerSide: { value: innerSide, type: 'f32' },
                uMorphMix: { value: Math.max(0, Math.min(1, options.morphMix ?? 1)), type: 'f32' },
            },
        },
    });
}
