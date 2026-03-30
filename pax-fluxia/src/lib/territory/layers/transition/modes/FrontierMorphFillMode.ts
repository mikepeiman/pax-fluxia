import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../FillTransitionMode';
import type { TerritoryRegionShape, FrontierPolylineShape } from '../../geometry/GeometryMode';

/**
 * Territory region matched by ownerId for interpolation.
 * When a territory region exists in both prev and next, we OT-interpolate
 * the closed polygon. When it only exists in one, we fade in/out.
 */
interface FrontierMorphFillPlan extends FillTransitionPlan {
    /** Previous territory regions (closed fill polygons) */
    previousRegions: readonly TerritoryRegionShape[];
    /** Target territory regions (closed fill polygons) */
    targetRegions: readonly TerritoryRegionShape[];
}

export class FrontierMorphFillMode implements FillTransitionMode {
    readonly id = 'frontier_morph' as const;
    readonly label = 'Frontier Topology Morph Fill';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        const plan: FrontierMorphFillPlan = {
            planId: `fill:frontier_morph:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            previousRegions: input.previousGeometry?.territoryRegions ?? input.nextGeometry.territoryRegions,
            targetRegions: input.nextGeometry.territoryRegions,
        };

        return plan;
    }

    sample(
        plan: FillTransitionPlan,
        ctx: TransitionSampleContext,
    ): FillTransitionFrame {
        const typedPlan = plan as FrontierMorphFillPlan;
        const t = ctx.progress;

        // Edge cases: snap to source or target
        if (t <= 0) {
            return { regions: [...typedPlan.previousRegions] };
        }
        if (t >= 1) {
            return { regions: [...typedPlan.targetRegions] };
        }

        // D-92: ownerId is NOT unique — an owner can have multiple disconnected
        // territory regions (cluster split). Accumulate arrays per owner.
        const prevByOwner = new Map<string, TerritoryRegionShape[]>();
        for (const r of typedPlan.previousRegions) {
            const arr = prevByOwner.get(r.ownerId);
            if (arr) arr.push(r);
            else prevByOwner.set(r.ownerId, [r]);
        }
        const nextByOwner = new Map<string, TerritoryRegionShape[]>();
        for (const r of typedPlan.targetRegions) {
            const arr = nextByOwner.get(r.ownerId);
            if (arr) arr.push(r);
            else nextByOwner.set(r.ownerId, [r]);
        }

        const regions: TerritoryRegionShape[] = [];
        const allOwnerIds = new Set([...prevByOwner.keys(), ...nextByOwner.keys()]);

        for (const ownerId of allOwnerIds) {
            const prevRegions = prevByOwner.get(ownerId) ?? [];
            const nextRegions = nextByOwner.get(ownerId) ?? [];

            if (prevRegions.length === 0) {
                // All new — spawning (grow from centroid)
                for (const nextRegion of nextRegions) {
                    const centroid = polygonCentroid(nextRegion.points);
                    regions.push({
                        ...nextRegion,
                        points: nextRegion.points.map(([x, y]) => [
                            centroid[0] + t * (x - centroid[0]),
                            centroid[1] + t * (y - centroid[1]),
                        ] as [number, number]),
                    });
                }
                continue;
            }
            if (nextRegions.length === 0) {
                // All gone — vanishing (shrink toward centroid)
                for (const prevRegion of prevRegions) {
                    const centroid = polygonCentroid(prevRegion.points);
                    regions.push({
                        ...prevRegion,
                        points: prevRegion.points.map(([x, y]) => [
                            x + t * (centroid[0] - x),
                            y + t * (centroid[1] - y),
                        ] as [number, number]),
                    });
                }
                continue;
            }

            // ── Common case: 1 prev ↔ 1 next — direct pair by ownerId ──
            if (prevRegions.length === 1 && nextRegions.length === 1) {
                regions.push({
                    ...nextRegions[0],
                    points: otInterpolateClosedPolygon(prevRegions[0].points, nextRegions[0].points, t),
                });
                continue;
            }

            // ── Multi-region (cluster splits): centroid-proximity matching ──
            // When an owner has multiple disconnected regions, match by
            // nearest centroid. Each next-region finds its closest prev-region.
            const prevCentroids = prevRegions.map(r => polygonCentroid(r.points));
            const nextCentroids = nextRegions.map(r => polygonCentroid(r.points));
            const usedPrev = new Set<number>();

            for (let ni = 0; ni < nextRegions.length; ni++) {
                let bestPi = -1;
                let bestDist = Infinity;
                for (let pi = 0; pi < prevRegions.length; pi++) {
                    if (usedPrev.has(pi)) continue;
                    const dx = nextCentroids[ni][0] - prevCentroids[pi][0];
                    const dy = nextCentroids[ni][1] - prevCentroids[pi][1];
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDist) { bestDist = dist; bestPi = pi; }
                }
                if (bestPi >= 0) {
                    usedPrev.add(bestPi);
                    regions.push({
                        ...nextRegions[ni],
                        points: otInterpolateClosedPolygon(prevRegions[bestPi].points, nextRegions[ni].points, t),
                    });
                } else {
                    // No match — spawning
                    const centroid = nextCentroids[ni];
                    regions.push({
                        ...nextRegions[ni],
                        points: nextRegions[ni].points.map(([x, y]) => [
                            centroid[0] + t * (x - centroid[0]),
                            centroid[1] + t * (y - centroid[1]),
                        ] as [number, number]),
                    });
                }
            }
            // Unmatched prev regions — vanishing
            for (let pi = 0; pi < prevRegions.length; pi++) {
                if (usedPrev.has(pi)) continue;
                const centroid = prevCentroids[pi];
                regions.push({
                    ...prevRegions[pi],
                    points: prevRegions[pi].points.map(([x, y]) => [
                        x + t * (centroid[0] - x),
                        y + t * (centroid[1] - y),
                    ] as [number, number]),
                });
            }
        }

        return { regions };
    }
}

// ---------------------------------------------------------------------------
// CDF-based polygon interpolation (same math as border interpolation)
// ---------------------------------------------------------------------------

/**
 * OT-interpolate two closed polygons at progress t.
 * Uses arc-length CDF parameterization — same approach as border
 * interpolation — applied to closed polygon perimeters.
 *
 * D-92: Adds closing vertex so the polygon is guaranteed closed every frame.
 */
function otInterpolateClosedPolygon(
    prev: [number, number][],
    next: [number, number][],
    t: number,
): [number, number][] {
    const sampleCount = Math.max(prev.length, next.length, 4);
    const prevCDF = buildPerimeterCDF(prev);
    const nextCDF = buildPerimeterCDF(next);
    const s = 1 - t;

    const result: [number, number][] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
        const u = i / sampleCount; // [0, 1) for closed polygon
        const [px, py] = evaluateClosedAtFraction(prev, prevCDF, u);
        const [nx, ny] = evaluateClosedAtFraction(next, nextCDF, u);
        result[i] = [s * px + t * nx, s * py + t * ny];
    }

    // D-92: Close the polygon — add a closing vertex matching the first point
    if (result.length > 0) {
        result.push([result[0][0], result[0][1]]);
    }

    return result;
}

/** Build perimeter CDF for a closed polygon. */
function buildPerimeterCDF(points: [number, number][]): Float64Array {
    const n = points.length;
    const cdf = new Float64Array(n + 1);
    if (n < 2) return cdf;

    cdf[0] = 0;
    for (let i = 1; i <= n; i++) {
        const p0 = points[(i - 1) % n];
        const p1 = points[i % n];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        cdf[i] = cdf[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }

    const total = cdf[n];
    if (total > 1e-9) {
        for (let i = 1; i <= n; i++) {
            cdf[i] /= total;
        }
    }
    cdf[n] = 1.0;

    return cdf;
}

/** Evaluate a closed polygon at perimeter fraction u ∈ [0, 1). */
function evaluateClosedAtFraction(
    points: [number, number][],
    cdf: Float64Array,
    u: number,
): [number, number] {
    const n = points.length;
    if (n === 0) return [0, 0];
    if (n === 1) return [points[0][0], points[0][1]];

    // Clamp u to [0, 1)
    const uu = ((u % 1) + 1) % 1;

    // Find segment via binary search on CDF
    let lo = 0;
    let hi = n;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= uu) lo = mid;
        else hi = mid;
    }

    const segFrac = cdf[lo + 1] - cdf[lo];
    const tt = segFrac > 1e-12 ? (uu - cdf[lo]) / segFrac : 0;

    const p0 = points[lo % n];
    const p1 = points[(lo + 1) % n];
    return [
        p0[0] + tt * (p1[0] - p0[0]),
        p0[1] + tt * (p1[1] - p0[1]),
    ];
}

/** Compute the centroid of a polygon. */
function polygonCentroid(points: [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    let sx = 0, sy = 0;
    for (const [x, y] of points) {
        sx += x;
        sy += y;
    }
    return [sx / points.length, sy / points.length];
}
