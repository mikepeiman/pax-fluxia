// ---------------------------------------------------------------------------
// interpolatePolylines.ts — Border polyline interpolation for transitions
// ---------------------------------------------------------------------------
//
// Core principle: Borders Lead, Fills Follow.
// This module provides the interpolation primitives used by both
// OptimalTransportBorderMode and FrontierMorphFillMode.
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
// Match polylines by ownerPairKey
// ---------------------------------------------------------------------------

/**
 * Match previous and next frontier polylines by their ownerPairKey.
 * Returns matched pairs classified as persisting, spawned, or vanished.
 */
export function matchPolylinesByKey(
    prev: readonly FrontierPolylineShape[],
    next: readonly FrontierPolylineShape[],
): MatchedPolylinePair[] {
    const prevMap = new Map<string, [number, number][]>();
    for (const p of prev) {
        prevMap.set(p.ownerPairKey, p.points);
    }

    const nextMap = new Map<string, [number, number][]>();
    for (const n of next) {
        nextMap.set(n.ownerPairKey, n.points);
    }

    const result: MatchedPolylinePair[] = [];

    // Persisting/static/drifted + vanished (iterate prev)
    for (const [key, prevPts] of prevMap) {
        const nextPts = nextMap.get(key);
        if (nextPts) {
            const isStatic = arePolylinesSame(prevPts, nextPts);
            result.push({
                ownerPairKey: key,
                prev: prevPts,
                next: nextPts,
                status: isStatic ? 'static' : 'drifted',
            });
        } else {
            // Vanished: collapse to midpoint of prev
            const mid = polylineMidpoint(prevPts);
            result.push({
                ownerPairKey: key,
                prev: prevPts,
                next: [mid, mid],
                status: 'vanished',
            });
        }
    }

    // Spawned (in next but not in prev)
    for (const [key, nextPts] of nextMap) {
        if (!prevMap.has(key)) {
            const mid = polylineMidpoint(nextPts);
            result.push({
                ownerPairKey: key,
                prev: [mid, mid],
                next: nextPts,
                status: 'spawned',
            });
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Arc-length resampling
// ---------------------------------------------------------------------------

/**
 * Resample a polyline to exactly `targetCount` points using arc-length
 * parameterization. This ensures uniform spacing and allows direct
 * vertex-to-vertex lerp between two resampled polylines.
 */
export function resamplePolyline(
    points: [number, number][],
    targetCount: number,
): [number, number][] {
    if (points.length < 2 || targetCount < 2) {
        // Degenerate: return copies of the first point
        const p: [number, number] = points.length > 0 ? points[0] : [0, 0];
        return Array.from({ length: Math.max(targetCount, 2) }, () => [p[0], p[1]] as [number, number]);
    }

    // Compute cumulative arc lengths
    const arcLengths = new Float64Array(points.length);
    arcLengths[0] = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        arcLengths[i] = arcLengths[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }
    const totalLength = arcLengths[points.length - 1];

    if (totalLength < 1e-9) {
        // Zero-length polyline: all points are the same
        const p = points[0];
        return Array.from({ length: targetCount }, () => [p[0], p[1]] as [number, number]);
    }

    // Sample at uniform arc-length intervals
    const result: [number, number][] = new Array(targetCount);
    result[0] = [points[0][0], points[0][1]];
    result[targetCount - 1] = [points[points.length - 1][0], points[points.length - 1][1]];

    let segIdx = 0;
    for (let i = 1; i < targetCount - 1; i++) {
        const targetArc = (i / (targetCount - 1)) * totalLength;

        // Advance segment index
        while (segIdx < points.length - 2 && arcLengths[segIdx + 1] < targetArc) {
            segIdx++;
        }

        // Interpolate within segment
        const segStart = arcLengths[segIdx];
        const segEnd = arcLengths[segIdx + 1];
        const segLen = segEnd - segStart;
        const t = segLen > 1e-12 ? (targetArc - segStart) / segLen : 0;

        result[i] = [
            points[segIdx][0] + t * (points[segIdx + 1][0] - points[segIdx][0]),
            points[segIdx][1] + t * (points[segIdx + 1][1] - points[segIdx][1]),
        ];
    }

    return result;
}

// ---------------------------------------------------------------------------
// Vertex lerp
// ---------------------------------------------------------------------------

/**
 * Linear interpolation between two polylines of equal length.
 * @param a Source polyline (at t=0)
 * @param b Target polyline (at t=1)
 * @param t Progress [0, 1]
 */
export function lerpPolyline(
    a: [number, number][],
    b: [number, number][],
    t: number,
): [number, number][] {
    const n = Math.min(a.length, b.length);
    const result: [number, number][] = new Array(n);
    const s = 1 - t;
    for (let i = 0; i < n; i++) {
        result[i] = [
            s * a[i][0] + t * b[i][0],
            s * a[i][1] + t * b[i][1],
        ];
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
 * For each matched pair:
 * 1. Resample both to the same vertex count
 * 2. Lerp between the resampled versions
 *
 * Spawned/vanished pairs fade from/to midpoint.
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

        // Drifted, spawned, or vanished — resample and lerp
        const targetCount = Math.max(pair.prev.length, pair.next.length, 4);

        const prevResampled = resamplePolyline(pair.prev, targetCount);
        const nextResampled = resamplePolyline(pair.next, targetCount);
        const interpolated = lerpPolyline(prevResampled, nextResampled, t);

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
