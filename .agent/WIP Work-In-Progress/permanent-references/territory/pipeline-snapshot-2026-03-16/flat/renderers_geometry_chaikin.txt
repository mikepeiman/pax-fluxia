// ============================================================================
// Chaikin smoothing for polylines and polygons
// ============================================================================

/**
 * Chaikin corner-cutting subdivision for open polylines.
 * Preserves first and last points; interior corners are smoothed by
 * replacing each segment midpoint region with 25%/75% cut points.
 * @param pts Open polyline as array of [x, y] tuples
 * @param passes Number of smoothing iterations (0 = no change)
 */
export function chaikinSmoothPolyline(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [current[0]]; // preserve start
        for (let i = 0; i < n - 1; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[i + 1];
            // For first/last segment: keep the original endpoint and add one cut point
            if (i === 0) {
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            } else if (i === n - 2) {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            } else {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            }
        }
        next.push(current[n - 1]); // preserve end
        current = next;
    }
    return current;
}

/** Closed-polygon Chaikin: every edge including last->first gets corner-cut uniformly. */
export function chaikinSmoothPolygon(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[(i + 1) % n];
            next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}
