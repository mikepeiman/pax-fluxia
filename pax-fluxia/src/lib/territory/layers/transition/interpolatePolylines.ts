// ---------------------------------------------------------------------------
// interpolatePolylines.ts - CDF-based Optimal Transport border interpolation
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
// All functions are pure - no PIXI, no state, no side effects.
// ---------------------------------------------------------------------------

import type { ResolvedFrontierPolyline } from '../../contracts/GeometryContracts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchedPolylinePair {
    ownerPairKey: string;
    prevShape?: ResolvedFrontierPolyline;
    nextShape?: ResolvedFrontierPolyline;
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
    cdf[n - 1] = 1.0;

    return cdf;
}

/**
 * Evaluate a polyline at a given arc-fraction u in [0, 1].
 * Uses the CDF to find the correct segment and interpolates within it.
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

    let lo = 0;
    let hi = n - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= u) lo = mid;
        else hi = mid;
    }

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

export function otInterpolatePolyline(
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

export function matchPolylinesByKey(
    prev: readonly ResolvedFrontierPolyline[],
    next: readonly ResolvedFrontierPolyline[],
): MatchedPolylinePair[] {
    const prevMap = new Map<string, ResolvedFrontierPolyline[]>();
    for (const p of prev) {
        const arr = prevMap.get(p.ownerPairKey);
        if (arr) arr.push(p);
        else prevMap.set(p.ownerPairKey, [p]);
    }

    const nextMap = new Map<string, ResolvedFrontierPolyline[]>();
    for (const n of next) {
        const arr = nextMap.get(n.ownerPairKey);
        if (arr) arr.push(n);
        else nextMap.set(n.ownerPairKey, [n]);
    }

    const result: MatchedPolylinePair[] = [];

    for (const [key, prevSegments] of prevMap) {
        const nextSegments = nextMap.get(key);
        if (nextSegments) {
            const maxLen = Math.max(prevSegments.length, nextSegments.length);
            for (let i = 0; i < maxLen; i++) {
                if (i >= prevSegments.length) {
                    const nextShape = nextSegments[i];
                    const mid = polylineMidpoint(nextShape.points);
                    result.push({
                        ownerPairKey: key,
                        nextShape,
                        prev: [mid, mid],
                        next: nextShape.points,
                        status: 'spawned',
                    });
                } else if (i >= nextSegments.length) {
                    const prevShape = prevSegments[i];
                    const mid = polylineMidpoint(prevShape.points);
                    result.push({
                        ownerPairKey: key,
                        prevShape,
                        prev: prevShape.points,
                        next: [mid, mid],
                        status: 'vanished',
                    });
                } else {
                    const prevShape = prevSegments[i];
                    const nextShape = nextSegments[i];
                    const isStatic = arePolylinesSame(prevShape.points, nextShape.points);
                    result.push({
                        ownerPairKey: key,
                        prevShape,
                        nextShape,
                        prev: prevShape.points,
                        next: nextShape.points,
                        status: isStatic ? 'static' : 'drifted',
                    });
                }
            }
        } else {
            for (const prevShape of prevSegments) {
                const mid = polylineMidpoint(prevShape.points);
                result.push({
                    ownerPairKey: key,
                    prevShape,
                    prev: prevShape.points,
                    next: [mid, mid],
                    status: 'vanished',
                });
            }
        }
    }

    for (const [key, nextSegments] of nextMap) {
        if (!prevMap.has(key)) {
            for (const nextShape of nextSegments) {
                const mid = polylineMidpoint(nextShape.points);
                result.push({
                    ownerPairKey: key,
                    nextShape,
                    prev: [mid, mid],
                    next: nextShape.points,
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

export function interpolateMatchedPolylines(
    prev: readonly ResolvedFrontierPolyline[],
    next: readonly ResolvedFrontierPolyline[],
    t: number,
): ResolvedFrontierPolyline[] {
    if (t <= 0) return prev.map(clonePolyline);
    if (t >= 1) return next.map(clonePolyline);

    const matched = matchPolylinesByKey(prev, next);
    const result: ResolvedFrontierPolyline[] = [];

    for (const pair of matched) {
        const prototype = pair.nextShape ?? pair.prevShape ?? {
            frontierId: `frontier:${pair.ownerPairKey}`,
            ownerA: pair.ownerPairKey.split('|')[0] ?? 'unknown',
            ownerB: pair.ownerPairKey.split('|')[1] ?? '__world__',
            ownerPairKey: pair.ownerPairKey,
            confidence: 1,
        };

        if (pair.status === 'static') {
            result.push({
                ...prototype,
                points: clonePoints(pair.next),
            });
            continue;
        }

        const sampleCount = Math.max(pair.prev.length, pair.next.length, 4);
        const interpolated = otInterpolatePolyline(pair.prev, pair.next, t, sampleCount);

        result.push({
            ...prototype,
            points: interpolated,
        });
    }

    return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function polylineMidpoint(points: [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    let sx = 0;
    let sy = 0;
    for (const [x, y] of points) {
        sx += x;
        sy += y;
    }
    return [sx / points.length, sy / points.length];
}

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

function clonePolyline(polyline: ResolvedFrontierPolyline): ResolvedFrontierPolyline {
    return {
        ...polyline,
        points: clonePoints(polyline.points),
    };
}

function clonePoints(points: [number, number][]): [number, number][] {
    return points.map(([x, y]) => [x, y]);
}
