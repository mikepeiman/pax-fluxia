/**
 * conquestFrontField — the arrival-time-field conquest front (toward the
 * "water wave on a beach" feel).
 *
 * A conquest is rendered as a SHAPE change: at progress q the captured cell is
 * split into the INCOMING owner's region {x : T(x) ≤ threshold(q)} and the OLD
 * owner's region {x : T(x) > threshold(q)}, where T is an arrival-time field
 * over the cell. Different fields give different fronts — all deterministic,
 * all pure SHAPE (never a color blend):
 *
 *  - 'linear' : T = projection onto the unit attack direction. The iso-contour
 *               is a straight line ⇒ the mode-1 windshield-wiper sweep (the
 *               exact original behavior; the two-part convex split is preserved
 *               bit-for-bit so the coverage tests are unchanged).
 *  - 'radial' : T = distance from the attack SOURCE point. The iso-contour is a
 *               circular arc ⇒ a curved front advancing out from the attacker.
 *
 * Later modes (multiple attackers = min over sources; variable-speed = scaled
 * T; rounded fronts = smoothed T) slot in as new field evaluators without
 * touching the caller — that is the whole point of moving the front into a
 * field rather than a bespoke line split.
 *
 * Pure TS: no PIXI, no config, no Svelte. Fully offline-testable.
 */

import type { PowerCell, Point } from './powerCoreTypes';

export type ConquestFrontMode = 'linear' | 'radial';

export interface ConquestFront {
    readonly mode: ConquestFrontMode;
    /** Unit attack direction (attacker → captured star); used by 'linear'. */
    readonly dirX: number;
    readonly dirY: number;
    /** Attack source point (the attacker's position); used by 'radial'. */
    readonly originX: number;
    readonly originY: number;
    /** siteId stamped on every emitted part. */
    readonly starId: string;
    /** Incoming (new) owner — the region that grows. */
    readonly ownerIn: string;
    /** Outgoing (old) owner — the region that shrinks. */
    readonly ownerOld: string;
    /** Extra subdivisions per cell edge for the curved ('radial') marcher. */
    readonly subdiv?: number;
}

/** Split the captured (convex) cell at progress q. Returns single-owner parts. */
export function splitCellByFront(
    cell: PowerCell,
    front: ConquestFront,
    q: number,
): PowerCell[] {
    if (front.mode === 'radial') return splitRadial(cell, front, q);
    return splitLinear(cell, front, q);
}

function part(cell: PowerCell, starId: string, ownerId: string, points: Point[]): PowerCell {
    return { ...cell, siteId: starId, ownerId, points };
}

// ── Mode 1: linear (exact original two-part convex split) ───────────────────

function splitLinear(cell: PowerCell, front: ConquestFront, q: number): PowerCell[] {
    const ux = front.dirX;
    const uy = front.dirY;
    if (ux === 0 && uy === 0) {
        return [part(cell, front.starId, q < 0.5 ? front.ownerOld : front.ownerIn, [...cell.points])];
    }
    let minP = Infinity;
    let maxP = -Infinity;
    for (const [x, y] of cell.points) {
        const proj = x * ux + y * uy;
        if (proj < minP) minP = proj;
        if (proj > maxP) maxP = proj;
    }
    const c = minP + (maxP - minP) * q;
    const low: Point[] = []; // attack side → incoming owner
    const high: Point[] = []; // far side → old owner
    const n = cell.points.length;
    for (let i = 0; i < n; i++) {
        const a = cell.points[i]!;
        const b = cell.points[(i + 1) % n]!;
        const pa = a[0] * ux + a[1] * uy;
        const pb = b[0] * ux + b[1] * uy;
        if (pa <= c) low.push(a);
        if (pa >= c) high.push(a);
        if ((pa < c && pb > c) || (pa > c && pb < c)) {
            const t = (c - pa) / (pb - pa);
            const ip: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            low.push(ip);
            high.push(ip);
        }
    }
    const parts: PowerCell[] = [];
    if (low.length >= 3) parts.push(part(cell, front.starId, front.ownerIn, low));
    if (high.length >= 3) parts.push(part(cell, front.starId, front.ownerOld, high));
    if (parts.length === 0) {
        parts.push(part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...cell.points]));
    }
    return parts;
}

// ── Mode 2: radial (curved arrival-time front, marching triangles) ──────────

function splitRadial(cell: PowerCell, front: ConquestFront, q: number): PowerCell[] {
    const pts = cell.points;
    if (pts.length < 3) return [part(cell, front.starId, front.ownerOld, [...pts])];
    const sx = front.originX;
    const sy = front.originY;
    const T = (p: Point) => Math.hypot(p[0] - sx, p[1] - sy);

    // Threshold sweeps the cell's full distance span, so q=0 ⇒ nothing captured,
    // q=1 ⇒ everything captured (exact coverage endpoints, like linear).
    let minD = Infinity;
    let maxD = -Infinity;
    for (const p of pts) {
        const d = T(p);
        if (d < minD) minD = d;
        if (d > maxD) maxD = d;
    }
    if (maxD - minD < 1e-6) {
        return [part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...pts])];
    }
    const c = minD + (maxD - minD) * q;

    // Fan-triangulate around the centroid, subdividing edges so the arc reads
    // as a smooth curve rather than a single chord.
    const sub = Math.max(1, front.subdiv ?? 4);
    let cx = 0;
    let cy = 0;
    for (const p of pts) {
        cx += p[0];
        cy += p[1];
    }
    cx /= pts.length;
    cy /= pts.length;
    const centroid: Point = [cx, cy];

    const inParts: Point[][] = [];
    const oldParts: Point[][] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % n]!;
        for (let s = 0; s < sub; s++) {
            const e0: Point = [a[0] + ((b[0] - a[0]) * s) / sub, a[1] + ((b[1] - a[1]) * s) / sub];
            const e1: Point = [
                a[0] + ((b[0] - a[0]) * (s + 1)) / sub,
                a[1] + ((b[1] - a[1]) * (s + 1)) / sub,
            ];
            marchTriangle(centroid, e0, e1, T, c, inParts, oldParts);
        }
    }

    const parts: PowerCell[] = [];
    for (const poly of inParts) if (poly.length >= 3) parts.push(part(cell, front.starId, front.ownerIn, poly));
    for (const poly of oldParts) if (poly.length >= 3) parts.push(part(cell, front.starId, front.ownerOld, poly));
    if (parts.length === 0) {
        parts.push(part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...pts]));
    }
    return parts;
}

/** Split one triangle by the iso-line T=c into ≤ incoming + ≤ old sub-polys. */
function marchTriangle(
    p0: Point,
    p1: Point,
    p2: Point,
    T: (p: Point) => number,
    c: number,
    inParts: Point[][],
    oldParts: Point[][],
): void {
    const tri = [p0, p1, p2];
    const below = tri.map((p) => T(p) <= c); // "below" = incoming (T ≤ c)
    const count = (below[0] ? 1 : 0) + (below[1] ? 1 : 0) + (below[2] ? 1 : 0);
    if (count === 3) {
        inParts.push([p0, p1, p2]);
        return;
    }
    if (count === 0) {
        oldParts.push([p0, p1, p2]);
        return;
    }
    // Mixed: the iso-line crosses two edges. Interpolate the crossings (linear
    // in T along the edge — exact enough at this subdivision).
    const cross = (a: Point, b: Point): Point => {
        const ta = T(a);
        const tb = T(b);
        const t = Math.abs(tb - ta) < 1e-9 ? 0.5 : (c - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    // Identify the lone vertex (the one on its own side).
    const lone = below[0] === below[1] ? 2 : below[1] === below[2] ? 0 : 1;
    const loneP = tri[lone]!;
    const o1 = tri[(lone + 1) % 3]!;
    const o2 = tri[(lone + 2) % 3]!;
    const x1 = cross(loneP, o1);
    const x2 = cross(loneP, o2);
    const loneTri: Point[] = [loneP, x1, x2];
    const quad: Point[] = [x1, o1, o2, x2];
    if (below[lone]) {
        inParts.push(loneTri);
        oldParts.push(quad);
    } else {
        oldParts.push(loneTri);
        inParts.push(quad);
    }
}
