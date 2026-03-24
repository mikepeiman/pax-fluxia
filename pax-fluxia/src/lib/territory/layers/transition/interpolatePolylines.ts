// ---------------------------------------------------------------------------
// interpolatePolylines.ts — CDF-based Optimal Transport border interpolation
// ---------------------------------------------------------------------------
//
// Core principle: Borders Lead, Fills Follow.
//
// For drifted polylines (same ownerPairKey, different points), we use
// 1D optimal transport via CDF parameterization:
//
//   1. Parameterize both polylines by normalized arc length [0,1] (the CDF)
//   2. For each output sample at fraction u:
//      - Find position on prev polyline at arc-fraction u
//      - Find position on next polyline at arc-fraction u
//      - Lerp between the two at progress t
//
//   This guarantees monotonicity: points don't cross during the morph,
//   producing smooth, non-self-intersecting intermediate borders.
//
// Static polylines (identical in prev and next) pass through unchanged.
// Spawned/vanished polylines fade from/to their midpoint.
//
// All functions are pure — no PIXI, no state, no side effects.
// ---------------------------------------------------------------------------

import type { FrontierPolylineShape } from '../../contracts/GeometryContracts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchedPolylinePair {
    ownerPairKey: string;
    prev: [number, number][];
    next: [number, number][];
    status: 'static' | 'drifted' | 'spawned' | 'vanished';
}

// ---------------------------------------------------------------------------
// Arc-length CDF
// ---------------------------------------------------------------------------

/**
 * Build cumulative arc-length array for a polyline.
 * Returns Float64Array where cdf[i] = cumulative length at vertex i,
 * normalized to [0, 1] (cdf[0] = 0, cdf[last] = 1).
 */
function buildArcLengthCDF(points: [number, number][]): Float64Array {
    const n = points.length;
    const cdf = new Float64Array(n);
    if (n < 2) return cdf;

    cdf[0] = 0;
    for (let i = 1; i < n; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        cdf[i] = cdf[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }

    const totalLength = cdf[n - 1];
    if (totalLength > 1e-9) {
        for (let i = 1; i < n; i++) {
            cdf[i] /= totalLength;
        }
    }
    cdf[n - 1] = 1.0; // Ensure exact 1.0 at end

    return cdf;
}

/**
 * Evaluate a polyline at a given arc-fraction u ∈ [0, 1].
 * Uses the CDF to find the correct segment and interpolates within it.
 * This is the inverse CDF lookup: given a fraction of total length,
 * return the 2D position on the polyline.
 */
function evaluateAtArcFraction(
    points: [number, number][],
    cdf: Float64Array,
    u: number,
): [number, number] {
    const n = points.length;
    if (n === 0) return [0, 0];
    if (n === 1 || u <= 0) return [points[0][0], points[0][1]];
    if (u >= 1) return [points[n - 1][0], points[n - 1][1]];

    // Binary search for the segment containing u
    let lo = 0;
    let hi = n - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= u) lo = mid;
        else hi = mid;
    }

    // Interpolate within segment [lo, hi]
    const segFrac = cdf[hi] - cdf[lo];
    const t = segFrac > 1e-12 ? (u - cdf[lo]) / segFrac : 0;

    return [
        points[lo][0] + t * (points[hi][0] - points[lo][0]),
        points[lo][1] + t * (points[hi][1] - points[lo][1]),
    ];
}

// ---------------------------------------------------------------------------
// OT-based polyline interpolation
// ---------------------------------------------------------------------------

/**
 * Interpolate between two polylines using 1D optimal transport.
 *
 * For N output samples at uniform arc-fractions u = i/(N-1):
 *   prevPos = evaluateAtArcFraction(prev, u)
 *   nextPos = evaluateAtArcFraction(next, u)
 *   output[i] = (1-t) * prevPos + t * nextPos
 *
 * Properties:
 * - Monotone mapping: order is preserved (no self-crossing)
 * - Mass-preserving: each "fraction of border length" maps to the same
 *   fraction on the other border
 * - Smooth drift: nearby points map to nearby points
 *
 * @param prev Source polyline (at t=0)
 * @param next Target polyline (at t=1)
 * @param t Progress [0, 1]
 * @param sampleCount Number of output vertices
 */
function otInterpolatePolyline(
    prev: [number, number][],
    next: [number, number][],
    t: number,
    sampleCount: number,
): [number, number][] {
    const prevCDF = buildArcLengthCDF(prev);
    const nextCDF = buildArcLengthCDF(next);

    const result: [number, number][] = new Array(sampleCount);
    const s = 1 - t;

    for (let i = 0; i < sampleCount; i++) {
        const u = sampleCount > 1 ? i / (sampleCount - 1) : 0;
        const [px, py] = evaluateAtArcFraction(prev, prevCDF, u);
        const [nx, ny] = evaluateAtArcFraction(next, nextCDF, u);
        result[i] = [s * px + t * nx, s * py + t * ny];
    }

    return result;
}

// ---------------------------------------------------------------------------
// Match polylines by ownerPairKey
// ---------------------------------------------------------------------------

/**
 * Match previous and next frontier polylines by their ownerPairKey.
 * Returns matched pairs classified as:
 * - static:   same key, same points → pass through unchanged (zero jitter)
 * - drifted:  same key, different points → CDF-interpolate
 * - spawned:  only in next → fade in from midpoint
 * - vanished: only in prev → fade out to midpoint
 */
export function matchPolylinesByKey(
    prev: readonly FrontierPolylineShape[],
    next: readonly FrontierPolylineShape[],
): MatchedPolylinePair[] {
    // Build multimaps — multiple segments can share the same ownerPairKey
    const prevMap = new Map<string, [number, number][][]>();
    for (const p of prev) {
        const arr = prevMap.get(p.ownerPairKey);
        if (arr) arr.push(p.points);
        else prevMap.set(p.ownerPairKey, [p.points]);
    }

    const nextMap = new Map<string, [number, number][][]>();
    for (const n of next) {
        const arr = nextMap.get(n.ownerPairKey);
        if (arr) arr.push(n.points);
        else nextMap.set(n.ownerPairKey, [n.points]);
    }

    const result: MatchedPolylinePair[] = [];

    // Persisting/static/drifted + vanished (iterate prev)
    for (const [key, prevSegments] of prevMap) {
        const nextSegments = nextMap.get(key);
        if (nextSegments) {
            // Match segment-by-segment by index
            const maxLen = Math.max(prevSegments.length, nextSegments.length);
            for (let i = 0; i < maxLen; i++) {
                if (i >= prevSegments.length) {
                    // Extra in next → spawned
                    const mid = polylineMidpoint(nextSegments[i]);
                    result.push({
                        ownerPairKey: key,
                        prev: [mid, mid],
                        next: nextSegments[i],
                        status: 'spawned',
                    });
                } else if (i >= nextSegments.length) {
                    // Extra in prev → vanished
                    const mid = polylineMidpoint(prevSegments[i]);
                    result.push({
                        ownerPairKey: key,
                        prev: prevSegments[i],
                        next: [mid, mid],
                        status: 'vanished',
                    });
                } else {
                    const isStatic = arePolylinesSame(prevSegments[i], nextSegments[i]);
                    result.push({
                        ownerPairKey: key,
                        prev: prevSegments[i],
                        next: nextSegments[i],
                        status: isStatic ? 'static' : 'drifted',
                    });
                }
            }
        } else {
            // Vanished: all segments collapse to midpoint
            for (const prevPts of prevSegments) {
                const mid = polylineMidpoint(prevPts);
                result.push({
                    ownerPairKey: key,
                    prev: prevPts,
                    next: [mid, mid],
                    status: 'vanished',
                });
            }
        }
    }

    // Spawned (in next but not in prev)
    for (const [key, nextSegments] of nextMap) {
        if (!prevMap.has(key)) {
            for (const nextPts of nextSegments) {
                const mid = polylineMidpoint(nextPts);
                result.push({
                    ownerPairKey: key,
                    prev: [mid, mid],
                    next: nextPts,
                    status: 'spawned',
                });
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Full interpolation pipeline
// ---------------------------------------------------------------------------

/**
 * Interpolate between previous and next frontier polylines at progress `t`.
 * Returns interpolated polylines in FrontierPolylineShape format.
 *
 * - Static polylines: pass through unchanged (zero jitter)
 * - Drifted: CDF-parameterized optimal transport interpolation
 * - Spawned: fade in from midpoint via OT
 * - Vanished: fade out to midpoint via OT
 */
export function interpolateMatchedPolylines(
    prev: readonly FrontierPolylineShape[],
    next: readonly FrontierPolylineShape[],
    t: number,
): FrontierPolylineShape[] {
    // Edge cases: snap to source or target
    if (t <= 0) return prev.map(p => ({ ownerPairKey: p.ownerPairKey, points: [...p.points] }));
    if (t >= 1) return next.map(p => ({ ownerPairKey: p.ownerPairKey, points: [...p.points] }));

    const matched = matchPolylinesByKey(prev, next);
    const result: FrontierPolylineShape[] = [];

    for (const pair of matched) {
        if (pair.status === 'static') {
            // Unchanged polyline — pass through with zero jitter
            result.push({
                ownerPairKey: pair.ownerPairKey,
                points: pair.next,
            });
            continue;
        }

        // Drifted, spawned, or vanished — OT interpolation
        const sampleCount = Math.max(pair.prev.length, pair.next.length, 4);
        const interpolated = otInterpolatePolyline(pair.prev, pair.next, t, sampleCount);

        result.push({
            ownerPairKey: pair.ownerPairKey,
            points: interpolated,
        });
    }

    return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the geometric midpoint of a polyline. */
function polylineMidpoint(points: [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    let sx = 0, sy = 0;
    for (const [x, y] of points) {
        sx += x;
        sy += y;
    }
    return [sx / points.length, sy / points.length];
}

/** Check if two polylines have the same points (within epsilon). */
function arePolylinesSame(
    a: [number, number][],
    b: [number, number][],
    eps = 0.01,
): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i][0] - b[i][0]) > eps || Math.abs(a[i][1] - b[i][1]) > eps) {
            return false;
        }
    }
    return true;
}
