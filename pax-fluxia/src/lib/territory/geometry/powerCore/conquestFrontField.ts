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

// ── Mode 2: radial (curved arrival-time front, ONE clean polygon per side) ──
//
// The captured cell is convex, so {T ≤ c} = cell ∩ disk(source, c) is a single
// convex region bounded by the near cell edges + one circle arc. We build BOTH
// sides as ONE polygon each by walking the boundary, inserting the exact circle
// crossings, then replacing the straight cut between the two crossings with a
// sampled arc. NO fan triangulation — that produced dozens of thin sub-cells
// that rendered as a radiating "star" and blew up PIXI's earcut fill.

function pointInPoly(p: Point, ring: readonly Point[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i]![0];
        const yi = ring[i]![1];
        const xj = ring[j]![0];
        const yj = ring[j]![1];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function splitRadial(cell: PowerCell, front: ConquestFront, q: number): PowerCell[] {
    const pts = cell.points;
    if (pts.length < 3) return [part(cell, front.starId, front.ownerOld, [...pts])];
    const sx = front.originX;
    const sy = front.originY;
    const T = (p: Point) => Math.hypot(p[0] - sx, p[1] - sy);

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

    // Exact circle-segment crossing at distance c from the source (t ∈ (0,1)).
    const crossSeg = (a: Point, b: Point): Point | null => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const A = dx * dx + dy * dy;
        if (A < 1e-12) return null;
        const fx = a[0] - sx;
        const fy = a[1] - sy;
        const B = 2 * (fx * dx + fy * dy);
        const C = fx * fx + fy * fy - c * c;
        const disc = B * B - 4 * A * C;
        if (disc < 0) return null;
        const sq = Math.sqrt(disc);
        for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
            if (t > 1e-9 && t < 1 - 1e-9) return [a[0] + t * dx, a[1] + t * dy];
        }
        return null;
    };

    // Walk the boundary → incoming (T≤c) / old (T>c) vertex rings, inserting the
    // exact crossings into BOTH at each transition.
    const low: Point[] = [];
    const high: Point[] = [];
    const lowCross: number[] = [];
    const highCross: number[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % n]!;
        const aIn = T(a) <= c;
        if (aIn) low.push([a[0], a[1]]);
        else high.push([a[0], a[1]]);
        if (aIn !== (T(b) <= c)) {
            const cp = crossSeg(a, b);
            if (cp) {
                lowCross.push(low.length);
                low.push(cp);
                highCross.push(high.length);
                high.push(cp);
            }
        }
    }

    // Circle arc between two crossings, on the side INSIDE the cell, endpoints
    // exclusive (they're already the crossing points in the ring). There are two
    // candidate arcs (the two ways around the circle); pick the one whose sampled
    // points actually lie inside the cell. A single-midpoint test is unreliable
    // when the crossings converge near q→1 (the midpoint sits on the boundary) and
    // can flip to the LONG way ⇒ a giant arc spanning the whole circle ⇒ a bloated
    // blotch + an earcut stall. Sampling both directions is robust.
    const steps = Math.max(8, front.subdiv ?? 8);
    const buildArc = (aStart: number, span: number): Point[] => {
        const out: Point[] = [];
        for (let k = 1; k < steps; k++) {
            const a = aStart + (span * k) / steps;
            out.push([sx + c * Math.cos(a), sy + c * Math.sin(a)]);
        }
        return out;
    };
    const insideCount = (arc: Point[]): number => {
        let n = 0;
        for (const p of arc) if (pointInPoly(p, pts)) n++;
        return n;
    };
    const sampleArc = (pA: Point, pB: Point): Point[] => {
        const aA = Math.atan2(pA[1] - sy, pA[0] - sx);
        const aB = Math.atan2(pB[1] - sy, pB[0] - sx);
        let d = aB - aA;
        while (d <= -Math.PI) d += 2 * Math.PI;
        while (d > Math.PI) d -= 2 * Math.PI;
        const shortArc = buildArc(aA, d);
        const longArc = buildArc(aA, d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI);
        return insideCount(shortArc) >= insideCount(longArc) ? shortArc : longArc;
    };

    // Splice the arc into a side's ring (its own verts are contiguous, bracketed
    // by the two crossings; the arc replaces the straight cut on the other side).
    const spliceArc = (ring: Point[], crossIdx: number[]): Point[] => {
        const [i0, i1] = crossIdx as [number, number];
        if (i1 - i0 - 1 > 0) {
            return [...ring.slice(i0, i1 + 1), ...sampleArc(ring[i1]!, ring[i0]!)];
        }
        return [...ring.slice(i1), ...ring.slice(0, i0 + 1), ...sampleArc(ring[i0]!, ring[i1]!)];
    };

    const parts: PowerCell[] = [];
    if (lowCross.length === 2 && highCross.length === 2) {
        const lowPoly = spliceArc(low, lowCross);
        const highPoly = spliceArc(high, highCross);
        if (lowPoly.length >= 3) parts.push(part(cell, front.starId, front.ownerIn, lowPoly));
        if (highPoly.length >= 3) parts.push(part(cell, front.starId, front.ownerOld, highPoly));
    } else {
        // Rare: circle meets the cell boundary at ≠2 points. Clean straight
        // chords (no fan) — occasionally less curved, never a starburst.
        if (low.length >= 3) parts.push(part(cell, front.starId, front.ownerIn, low));
        if (high.length >= 3) parts.push(part(cell, front.starId, front.ownerOld, high));
    }
    if (parts.length === 0) {
        parts.push(part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...pts]));
    }
    return parts;
}
