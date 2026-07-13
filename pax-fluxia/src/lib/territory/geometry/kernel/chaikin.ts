// ============================================================================
// Geometry kernel — Chaikin corner-cutting. SINGLE SOURCE.
// ----------------------------------------------------------------------------
// Consolidates the drifted Chaikin copies (cleanup campaign Stage 1, 2026-07-13).
// THREE genuinely-distinct functions are kept because they are NOT bit-identical
// to each other (verified — the flat form's `x0+t*(x1-x0)` differs from the tuple
// form's `a*w+b*(1-w)` in the last IEEE-754 ULP, which would move subpixels):
//
//   - chaikinSmoothPolyline : tuple [x,y][], OPEN, endpoints preserved.
//   - chaikinSmoothPolygon  : tuple [x,y][], CLOSED, with optional world-boundary
//                             + junction PINNING (the superset — default args
//                             reduce bit-exactly to a plain uniform corner-cut).
//   - chaikinFlat           : flat number[] (x,y,x,y…) with a `closed` flag — the
//                             PIXI-friendly form used by the cellGrid families and
//                             the frontier layer.
//
// StarRenderer keeps its own roundness-parameterized variant (map-display tuning,
// out of scope by ruling). Pure; no PIXI, no external deps.
// ============================================================================

export type Vec2 = readonly [number, number];

/** Point key for pin-set membership. MUST match callers that build pin sets. */
export function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}

/**
 * Chaikin corner-cutting for OPEN polylines. Preserves first/last points;
 * interior corners smoothed by 25/75 cut pairs. A geometry op — moves positions.
 */
export function chaikinSmoothPolyline(
    pts: [number, number][],
    passes: number,
): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [current[0]!];
        for (let i = 0; i < n - 1; i++) {
            const [ax, ay] = current[i]!;
            const [bx, by] = current[i + 1]!;
            if (i === 0) {
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            } else if (i === n - 2) {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            } else {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            }
        }
        next.push(current[n - 1]!);
        current = next;
    }
    return current;
}

/**
 * Chaikin corner-cutting for CLOSED polygons. Every edge (incl. last→first) is
 * uniformly cut, EXCEPT vertices that are "pinned":
 *  - on the world-clip boundary (within `boundaryEps` of the padded bounds), or
 *  - present in `pinnedPtKeys` (e.g. Voronoi junctions shared by 3+ cells) —
 * pinned vertices are preserved each pass, preventing fill gaps at junctions.
 * With the default (unbounded, no pins) this is a plain uniform corner-cut.
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
            const [ax, ay] = current[i]!;
            const [bx, by] = current[(i + 1) % n]!;
            const aPin = isPinned(ax, ay);
            const bPin = isPinned(bx, by);
            next.push(aPin ? [ax, ay] : [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push(bPin ? [bx, by] : [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}

/**
 * Chaikin on a FLAT coordinate array (x,y,x,y…). `closed=false` preserves the
 * first/last vertex (polyline); `closed=true` cuts the wrap edge too (polygon).
 * Bit-exact with the cellGrid/frontier form it replaces — do not "simplify" the
 * arithmetic (that would change subpixel output).
 */
export function chaikinFlatOnce(pts: readonly number[], closed: boolean): number[] {
    const n = pts.length >> 1;
    if (n < 3) return pts.slice();
    const out: number[] = [];
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0]!, pts[1]!);
    for (let i = 0; i < last; i++) {
        const i0 = i * 2;
        const i1 = ((i + 1) % n) * 2;
        const x0 = pts[i0]!, y0 = pts[i0 + 1]!;
        const x1 = pts[i1]!, y1 = pts[i1 + 1]!;
        out.push(
            x0 + 0.25 * (x1 - x0),
            y0 + 0.25 * (y1 - y0),
            x0 + 0.75 * (x1 - x0),
            y0 + 0.75 * (y1 - y0),
        );
    }
    if (!closed) out.push(pts[pts.length - 2]!, pts[pts.length - 1]!);
    return out;
}

/** Run `passes` iterations of {@link chaikinFlatOnce}. */
export function chaikinFlat(pts: readonly number[], passes: number, closed: boolean): number[] {
    let current: readonly number[] = pts;
    for (let i = 0; i < passes; i++) current = chaikinFlatOnce(current, closed);
    return current.slice();
}
