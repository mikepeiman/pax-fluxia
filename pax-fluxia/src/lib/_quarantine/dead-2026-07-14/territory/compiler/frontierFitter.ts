/**
 * territory/compiler/frontierFitter.ts
 *
 * Stage 4: Geometry fitting.
 *
 * Transforms raw FrontierGraph polylines into the selected geometry family:
 * - straight: Ramer-Douglas-Peucker simplification for clean piecewise-linear edges
 * - segmented: angle quantization for tactile artistic style
 * - curved: Bezier/biarc fitting (stub — treated as straight for now)
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Preserves owner pairing, adjacency, and topological order
 */

import type {
    FrontierGraph,
    FittedFrontier,
    GeometryFamily,
    FitterConfig,
    CompileError,
} from './types';

// ---------------------------------------------------------------------------
// Ramer-Douglas-Peucker simplification
// ---------------------------------------------------------------------------

function perpendicularDistanceSq(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        const ex = px - ax;
        const ey = py - ay;
        return ex * ex + ey * ey;
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx - px;
    const cy = ay + t * dy - py;
    return cx * cx + cy * cy;
}

function rdpSimplify(points: number[], toleranceSq: number): number[] {
    if (points.length < 6) return points; // need at least 3 points (6 coords)
    const n = points.length / 2;

    let maxDistSq = 0;
    let maxIdx = 0;
    const ax = points[0], ay = points[1];
    const bx = points[(n - 1) * 2], by = points[(n - 1) * 2 + 1];

    for (let i = 1; i < n - 1; i++) {
        const d = perpendicularDistanceSq(
            points[i * 2], points[i * 2 + 1],
            ax, ay, bx, by
        );
        if (d > maxDistSq) { maxDistSq = d; maxIdx = i; }
    }

    if (maxDistSq <= toleranceSq) {
        return [ax, ay, bx, by];
    }

    const left = rdpSimplify(points.slice(0, (maxIdx + 1) * 2), toleranceSq);
    const right = rdpSimplify(points.slice(maxIdx * 2), toleranceSq);
    // Merge: drop duplicate midpoint (last of left = first of right)
    return [...left.slice(0, -2), ...right];
}

// ---------------------------------------------------------------------------
// Angle quantization (segmented family)
// ---------------------------------------------------------------------------

function quantizeAngle(angle: number, step: number): number {
    return Math.round(angle / step) * step;
}

function segmentedSimplify(points: number[], stepRad: number): number[] {
    if (points.length < 4) return points;
    const result: number[] = [points[0], points[1]];
    for (let i = 2; i < points.length - 2; i += 2) {
        const angle = Math.atan2(points[i + 1] - points[i - 1], points[i] - points[i - 2]);
        const qAngle = quantizeAngle(angle, stepRad);
        // Keep point only if its direction differs from the quantized normalized direction
        // (simplified: keep all for now, RDP pre-pass reduces point count)
        result.push(points[i], points[i + 1]);
    }
    result.push(points[points.length - 2], points[points.length - 1]);
    return result;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Convert raw FrontierGraph edges into FittedFrontier[] for the selected family.
 */
export function fitFrontiers(
    frontier: FrontierGraph,
    family: GeometryFamily,
    config: FitterConfig = {}
): FittedFrontier[] | CompileError {
    try {
        const rdpTolerance = config.rdpTolerance ?? 2.0; // px
        const toleranceSq = rdpTolerance * rdpTolerance;
        const angleStepDeg = config.angleQuantization ?? 15;
        const angleStepRad = (angleStepDeg * Math.PI) / 180;

        // Group edges by pairId — each pair → one FittedFrontier
        const pairPolylines = new Map<string, number[]>();
        const pairOwners = new Map<string, { ownerA: number; ownerB: number }>();

        for (const edge of frontier.edges.values()) {
            const nodeA = frontier.nodes.get(edge.a);
            const nodeB = frontier.nodes.get(edge.b);
            if (!nodeA || !nodeB) continue;

            const existing = pairPolylines.get(edge.pairId);
            if (existing) {
                // Extend polyline (simple append — ordering is handled by regionStage)
                existing.push(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
            } else {
                pairPolylines.set(edge.pairId, [nodeA.x, nodeA.y, nodeB.x, nodeB.y]);
                pairOwners.set(edge.pairId, { ownerA: edge.ownerA, ownerB: edge.ownerB });
            }
        }

        const fitted: FittedFrontier[] = [];

        for (const [pairId, rawPoints] of pairPolylines) {
            const owners = pairOwners.get(pairId)!;
            let simplified: number[];

            switch (family) {
                case 'straight':
                    simplified = rdpSimplify(rawPoints, toleranceSq);
                    break;
                case 'segmented': {
                    const rdpd = rdpSimplify(rawPoints, toleranceSq);
                    simplified = segmentedSimplify(rdpd, angleStepRad);
                    break;
                }
                case 'curved':
                    // Stub: treat as straight until biarc fitting is implemented
                    simplified = rdpSimplify(rawPoints, toleranceSq);
                    break;
                default:
                    simplified = rawPoints;
            }

            fitted.push({
                pairId,
                family,
                ownerA: owners.ownerA,
                ownerB: owners.ownerB,
                polylines: [simplified],
            });
        }

        return fitted;
    } catch (err) {
        return {
            kind: 'error',
            stage: 'fitter',
            message: err instanceof Error ? err.message : String(err),
            recoverable: true, // fitter failure is recoverable — use previous fitted state
        } satisfies CompileError;
    }
}
