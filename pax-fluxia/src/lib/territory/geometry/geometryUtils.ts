/**
 * @file geometryUtils.ts
 * Stateless geometric utilities for territory construction.
 *
 * Phase 1 of the Geometry Pipeline Consolidation:
 * Extract pure math from powerVoronoiTerritoryGeometryGenerator.ts,
 * ModifiedVoronoiRenderer.ts, and interpolatePolylines.ts.
 *
 * All functions are stateless, have no PIXI dependency, and operate
 * on plain coordinate arrays.
 */

// ── Coordinate Key Helpers ──────────────────────────────────────────────────

/**
 * Build a canonical, direction-independent key for an edge between two points.
 * Snaps coordinates to 2 decimal places.
 */
export function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) return `${ax},${ay}-${bx},${by}`;
    return `${bx},${by}-${ax},${ay}`;
}

/**
 * Build a canonical key for a point, snapped to 2 decimal places.
 */
export function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}

// ── Polyline / Polygon Comparison ───────────────────────────────────────────

/**
 * Compute the geometric midpoint (centroid) of a polyline.
 */
export function polylineMidpoint(points: readonly [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    let sx = 0, sy = 0;
    for (const [x, y] of points) {
        sx += x;
        sy += y;
    }
    return [sx / points.length, sy / points.length];
}

/**
 * Check if two polylines have the same points (within epsilon).
 */
export function arePolylinesSame(
    a: readonly [number, number][],
    b: readonly [number, number][],
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

/**
 * Point-in-polygon test using ray casting.
 */
export function pointInPolygon(px: number, py: number, polygon: readonly [number, number][]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Compute the centroid of a closed polygon.
 * Handles both closed (last=first) and open polygon representations.
 */
export function polygonCentroid(pts: readonly [number, number][]): [number, number] {
    let cx = 0, cy = 0;
    const len = pts.length > 0 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
        ? pts.length - 1 : pts.length;
    for (let i = 0; i < len; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    return len > 0 ? [cx / len, cy / len] : [0, 0];
}

// ── Chaikin Smoothing ───────────────────────────────────────────────────────

/**
 * Chaikin corner-cutting subdivision for OPEN polylines.
 * Preserves endpoints. Interior corners smoothed by 25/75 cut pairs.
 * This is a GEOMETRY operation — it changes world-coordinate positions.
 */
export function chaikinSmoothPolyline(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [current[0]];
        for (let i = 0; i < n - 1; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[i + 1];
            if (i === 0) {
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            } else if (i === n - 2) {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            } else {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            }
        }
        next.push(current[n - 1]);
        current = next;
    }
    return current;
}

/**
 * Chaikin corner-cutting for CLOSED polygons.
 * Every edge including last→first is uniformly cut.
 *
 * Boundary-pinned variant: vertices on the world-clip boundary
 * are preserved each pass instead of being replaced by cut points.
 *
 * Junction-pinned variant: caller may pass a Set of ptKey strings for
 * Voronoi junction vertices (shared by 3+ cells). These are also preserved,
 * preventing fill gaps at 3-way territory junctions.
 */
export function chaikinSmoothPolygon(
    pts: [number, number][],
    passes: number,
    worldW: number = Infinity,
    worldH: number = Infinity,
    pad: number = 50,
    pinnedPtKeys?: Set<string>,
    boundaryEps: number = 6,
): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    const hasBounds = isFinite(worldW) && isFinite(worldH);
    const eps = boundaryEps;

    function isPinned(x: number, y: number): boolean {
        if (hasBounds && (
            x <= -pad + eps || x >= worldW + pad - eps ||
            y <= -pad + eps || y >= worldH + pad - eps
        )) return true;
        if (pinnedPtKeys?.has(ptKey(x, y))) return true;
        return false;
    }

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[(i + 1) % n];
            const aPin = isPinned(ax, ay);
            const bPin = isPinned(bx, by);
            next.push(aPin ? [ax, ay] : [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push(bPin ? [bx, by] : [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}

// ── Polygon Resampling ──────────────────────────────────────────────────────

/**
 * Resample a CLOSED polygon so vertices are spaced ~`spacingPx` pixels apart.
 * Walks the perimeter at equal arc-length intervals.
 * Returns the resampled points (closed — last point ≈ first point).
 */
export function resampleClosedPolygonBySpacing(pts: [number, number][], spacingPx: number): [number, number][] {
    if (pts.length < 3 || spacingPx <= 0) return pts;

    const first = pts[0], last = pts[pts.length - 1];
    const isClosed = Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01;
    const closed = isClosed ? pts : [...pts, [first[0], first[1]] as [number, number]];

    const segCount = closed.length - 1;
    const cumLen: number[] = [0];
    for (let i = 1; i < closed.length; i++) {
        const dx = closed[i][0] - closed[i - 1][0];
        const dy = closed[i][1] - closed[i - 1][1];
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[segCount];
    if (totalLen < spacingPx * 2) return pts;

    const n = Math.max(4, Math.round(totalLen / spacingPx));
    const step = totalLen / n;
    const result: [number, number][] = [];
    let segIdx = 0;

    for (let i = 0; i < n; i++) {
        const targetLen = i * step;
        while (segIdx < segCount - 1 && cumLen[segIdx + 1] < targetLen) segIdx++;

        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segLen = segEnd - segStart;
        const t = segLen > 0 ? (targetLen - segStart) / segLen : 0;

        result.push([
            closed[segIdx][0] + (closed[segIdx + 1][0] - closed[segIdx][0]) * t,
            closed[segIdx][1] + (closed[segIdx + 1][1] - closed[segIdx][1]) * t,
        ]);
    }

    result.push([result[0][0], result[0][1]]);
    return result;
}

// ── Junction Vertex Detection ───────────────────────────────────────────────

/** Minimal cell shape for junction detection — any polygon with ownership. */
export interface CellShape {
    points: [number, number][];
    siteId?: string;
}

/**
 * Compute the set of Voronoi junction vertices — points shared by 3+ cells.
 * At these points, 3+ territory fills meet. Without pinning, Chaikin would
 * cut all three corners and leave a visible triangular gap.
 */
export function extractJunctionVertices(cells: readonly CellShape[]): Set<string> {
    const vertexCount = new Map<string, number>();
    for (const cell of cells) {
        const seen = new Set<string>();
        for (const [x, y] of cell.points) {
            const k = ptKey(x, y);
            if (!seen.has(k)) {
                seen.add(k);
                vertexCount.set(k, (vertexCount.get(k) ?? 0) + 1);
            }
        }
    }
    const junctions = new Set<string>();
    for (const [k, count] of vertexCount) {
        if (count >= 3) junctions.add(k);
    }
    return junctions;
}

// ── Bézier Utilities ────────────────────────────────────────────────────────

/**
 * Evaluate a quadratic Bézier curve at parameter t.
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
export function quadBezier(
    p0: readonly number[], p1: readonly number[], p2: readonly number[], t: number,
): number[] {
    const u = 1 - t;
    return [
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ];
}

/**
 * Compute interior angle at vertex i of a polygon (in degrees).
 * Returns 0-180, where small values mean sharp/acute corners.
 */
export function interiorAngle(pts: readonly (readonly number[])[], i: number): number {
    const n = pts.length;
    const isClosed = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1];
    const len = isClosed ? n - 1 : n;

    const prev = (i - 1 + len) % len;
    const next = (i + 1) % len;

    const ax = pts[prev][0] - pts[i][0];
    const ay = pts[prev][1] - pts[i][1];
    const bx = pts[next][0] - pts[i][0];
    const by = pts[next][1] - pts[i][1];

    const dot = ax * bx + ay * by;
    const magA = Math.hypot(ax, ay);
    const magB = Math.hypot(bx, by);
    if (magA === 0 || magB === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/** Minimal polygon shape for smoothSharpVertices. */
export interface PolygonShape {
    points: number[][];
    ownerId: string;
}

/** Minimal star position for smoothSharpVertices origin finding. */
export interface StarPosition {
    x: number;
    y: number;
    ownerId?: string;
}

/**
 * Smooth sharp vertices by replacing them with quadratic Bézier arcs.
 * For each vertex with interior angle < threshold:
 *   1. Retract vertex toward the nearest star center by arcStrength
 *   2. Tessellate a Bézier arc from prev vertex through retracted point to next vertex
 *   3. Splice arc segments into the polygon
 *
 * Mutates polygons in place.
 */
export function smoothSharpVertices(
    polygons: PolygonShape[],
    starPositions: readonly StarPosition[],
    arcStrength: number,
    arcThreshold: number,
    arcMinSegment: number,
): void {
    if (arcStrength <= 0) return;

    for (const poly of polygons) {
        let pts = poly.points;
        const isClosed = pts.length > 1 &&
            pts[0][0] === pts[pts.length - 1][0] &&
            pts[0][1] === pts[pts.length - 1][1];
        if (isClosed) pts = pts.slice(0, -1);

        const newPts: number[][] = [];
        const len = pts.length;

        const ownerStars = starPositions.filter(s => s.ownerId === poly.ownerId);

        for (let i = 0; i < len; i++) {
            const angle = interiorAngle(pts, i);

            if (angle < arcThreshold && angle > 0) {
                const prev = pts[(i - 1 + len) % len];
                const curr = pts[i];
                const next = pts[(i + 1) % len];

                let nearestStar = ownerStars[0];
                let minDist = Infinity;
                for (const s of ownerStars) {
                    const d = Math.hypot(s.x - curr[0], s.y - curr[1]);
                    if (d < minDist) { minDist = d; nearestStar = s; }
                }

                const origin = [nearestStar?.x ?? curr[0], nearestStar?.y ?? curr[1]];
                const controlPt = [
                    curr[0] + arcStrength * (origin[0] - curr[0]),
                    curr[1] + arcStrength * (origin[1] - curr[1]),
                ];

                const arcLen = Math.hypot(next[0] - prev[0], next[1] - prev[1]) +
                    Math.hypot(controlPt[0] - prev[0], controlPt[1] - prev[1]);
                const segments = Math.max(3, Math.ceil(arcLen / Math.max(1, arcMinSegment)));

                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    newPts.push(quadBezier(prev, controlPt, next, t));
                }
            } else {
                newPts.push(pts[i]);
            }
        }

        if (newPts.length > 0) {
            newPts.push([newPts[0][0], newPts[0][1]]);
        }
        poly.points = newPts;
    }
}
