/**
 * territory/geometry/morphUtils.ts
 *
 * Animation-layer geometry helpers for territory morph transitions.
 * These operate on world-coordinate point arrays — they are geometry
 * operations, not rendering operations.
 *
 * Used by: TerritoryTransitionPlanner, TerritoryRenderer transition pass,
 *          PVV2 border transition (`buildLerpedPolylines`).
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Stateless pure functions only
 */

/** Resample a CLOSED polygon to `n` evenly-spaced points along its perimeter. */
export function resamplePolygon(pts: [number, number][], n: number): [number, number][] {
    if (pts.length <= 1 || n <= 1) return pts.slice();

    const arcLens: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        arcLens.push(arcLens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = arcLens[arcLens.length - 1];
    if (totalLen === 0) return pts.slice();

    const result: [number, number][] = [];
    let segIdx = 0;
    for (let i = 0; i < n; i++) {
        const targetLen = (i / n) * totalLen;
        while (segIdx < arcLens.length - 2 && arcLens[segIdx + 1] < targetLen) segIdx++;
        const segLen = arcLens[segIdx + 1] - arcLens[segIdx];
        const t = segLen > 0 ? (targetLen - arcLens[segIdx]) / segLen : 0;
        result.push([
            pts[segIdx][0] + (pts[segIdx + 1][0] - pts[segIdx][0]) * t,
            pts[segIdx][1] + (pts[segIdx + 1][1] - pts[segIdx][1]) * t,
        ]);
    }
    // Close the polygon
    result.push([result[0][0], result[0][1]]);
    return result;
}

/** Resample an OPEN polyline to `n` evenly-spaced points (no wrap). */
export function resamplePolyline(pts: [number, number][], n: number): [number, number][] {
    if (pts.length <= 1 || n <= 1) return pts.slice();

    const arcLens: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        arcLens.push(arcLens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = arcLens[arcLens.length - 1];
    if (totalLen === 0) return pts.slice();

    const result: [number, number][] = [];
    let segIdx = 0;
    for (let i = 0; i < n; i++) {
        const targetLen = (i / (n - 1)) * totalLen;
        while (segIdx < arcLens.length - 2 && arcLens[segIdx + 1] < targetLen) segIdx++;
        const segLen = arcLens[segIdx + 1] - arcLens[segIdx];
        const t = segLen > 0 ? (targetLen - arcLens[segIdx]) / segLen : 0;
        result.push([
            pts[segIdx][0] + (pts[segIdx + 1][0] - pts[segIdx][0]) * t,
            pts[segIdx][1] + (pts[segIdx + 1][1] - pts[segIdx][1]) * t,
        ]);
    }
    return result;
}

/** Lerp two equal-length point arrays (polygon or polyline). */
export function lerpPolygon(from: [number, number][], to: [number, number][], t: number): [number, number][] {
    const result: [number, number][] = [];
    const len = Math.min(from.length, to.length);
    for (let i = 0; i < len; i++) {
        result.push([
            from[i][0] + (to[i][0] - from[i][0]) * t,
            from[i][1] + (to[i][1] - from[i][1]) * t,
        ]);
    }
    return result;
}

/** Centroid of a polygon (handles closed polygons where last === first). */
export function polygonCentroid(pts: [number, number][]): [number, number] {
    let cx = 0, cy = 0;
    const n = pts.length - 1; // last point = first (closed)
    for (let i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    return n > 0 ? [cx / n, cy / n] : [0, 0];
}
