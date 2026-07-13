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
import { shoelace } from '../kernel';

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

/**
 * The front's arrival-time field over a ring: T(x) and the threshold c at
 * progress q, computed EXACTLY as the corresponding split does (linear:
 * projection span over vertices; radial: boundary-segment minD → vertex maxD).
 * Points with T(x) ≤ c are on the INCOMING owner's side. Exported so the
 * deferred-cut path (round-then-cut, END_SNAP_FIX_EVAL) classifies border
 * portions BY CONSTRUCTION from the same field that shapes the fill split —
 * never by hand-enumerated rules.
 */
export function frontFieldOn(
    ring: readonly Point[],
    front: ConquestFront,
    q: number,
): { T: (p: readonly [number, number]) => number; c: number } {
    if (front.mode === 'radial') {
        const sx = front.originX;
        const sy = front.originY;
        const T = (p: readonly [number, number]) => Math.hypot(p[0] - sx, p[1] - sy);
        let minD = Infinity;
        let maxD = -Infinity;
        const n = ring.length;
        for (let i = 0; i < n; i++) {
            const d = segDist(sx, sy, ring[i]!, ring[(i + 1) % n]!);
            if (d < minD) minD = d;
            const dv = T(ring[i]!);
            if (dv > maxD) maxD = dv;
        }
        return { T, c: maxD - minD < 1e-6 ? maxD : minD + (maxD - minD) * q };
    }
    const ux = front.dirX;
    const uy = front.dirY;
    const T = (p: readonly [number, number]) => p[0] * ux + p[1] * uy;
    let minP = Infinity;
    let maxP = -Infinity;
    for (const p of ring) {
        const v = T(p);
        if (v < minP) minP = v;
        if (v > maxP) maxP = v;
    }
    return { T, c: maxP - minP < 1e-9 ? maxP : minP + (maxP - minP) * q };
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

// ── Mode 2: radial (curved arrival-time front, exact disk∩polygon walk) ─────
//
// {T ≤ c} = cell ∩ disk(source, c). Both are convex, so the intersection is one
// convex region whose boundary ALTERNATES cell-boundary runs (inside the disk)
// and circle arcs (inside the cell). We walk the cell ring once, recording every
// circle crossing in walk order (a long edge can carry TWO — a "lens" where the
// disk pokes through its middle with both endpoints outside; routine for world-
// edge columns). Crossings alternate entry/exit by construction; arcs connect
// exit→next-entry traversed in the RING'S orientation (interior stays on the
// same side — determined, not guessed; a sampled inside-test heuristic failed
// twice). The old-owner side is the complement: one cap polygon per outside run,
// its arc traversed opposite. No fan triangulation, no chord fallback — on any
// numeric degeneracy (tangency breaking alternation) we fall back to the
// watertight splitLinear, never to self-intersecting chord rings.

/** Min distance from (sx,sy) to segment ab. */
function segDist(sx: number, sy: number, a: Point, b: Point): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) return Math.hypot(a[0] - sx, a[1] - sy);
    let t = ((sx - a[0]) * dx + (sy - a[1]) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(a[0] + t * dx - sx, a[1] + t * dy - sy);
}

function splitRadial(cell: PowerCell, front: ConquestFront, q: number): PowerCell[] {
    const pts = cell.points;
    if (pts.length < 3) return [part(cell, front.starId, front.ownerOld, [...pts])];
    const sx = front.originX;
    const sy = front.originY;
    const T = (p: Point) => Math.hypot(p[0] - sx, p[1] - sy);
    const n = pts.length;

    // Ring orientation (shoelace sign) — arcs follow it so interiors stay left.
    let area2 = 0;
    for (let i = 0; i < n; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % n]!;
        area2 += a[0] * b[1] - b[0] * a[1];
    }
    const orient = area2 >= 0 ? 1 : -1;

    // Threshold span: minD = nearest point of the BOUNDARY (edge interiors
    // included — vertex-only minD made q=0 instantly swallow everything nearer
    // than the first corner on long cells), maxD = farthest vertex (max distance
    // to a convex polygon is at a vertex). q=0 ⇒ tangent, nothing captured;
    // q=1 ⇒ everything.
    let minD = Infinity;
    let maxD = -Infinity;
    for (let i = 0; i < n; i++) {
        const d = segDist(sx, sy, pts[i]!, pts[(i + 1) % n]!);
        if (d < minD) minD = d;
        const dv = T(pts[i]!);
        if (dv > maxD) maxD = dv;
    }
    if (maxD - minD < 1e-6) {
        return [part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...pts])];
    }
    const c = minD + (maxD - minD) * q;

    // All circle crossings per segment, ascending t. Distance along a segment is
    // convex ⇒ both-in: 0; opposite sides: 1; both-out: 0 or 2 (lens).
    const crossSeg = (a: Point, b: Point, aIn: boolean, bIn: boolean): Point[] => {
        if (aIn && bIn) return [];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const A = dx * dx + dy * dy;
        if (A < 1e-12) return [];
        const fx = a[0] - sx;
        const fy = a[1] - sy;
        const B = 2 * (fx * dx + fy * dy);
        const C = fx * fx + fy * fy - c * c;
        const disc = B * B - 4 * A * C;
        if (disc <= 0) return [];
        const sq = Math.sqrt(disc);
        const roots: number[] = [];
        for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
            if (t > 1e-9 && t < 1 - 1e-9) roots.push(t);
        }
        if (aIn !== bIn) {
            // Exactly one true crossing; if both roots survived numerically, the
            // transition crossing is the exit (larger t) when leaving, the entry
            // (smaller t) when entering.
            if (roots.length === 0) return [];
            const t = roots.length === 1 ? roots[0]! : aIn ? roots[1]! : roots[0]!;
            return [[a[0] + t * dx, a[1] + t * dy]];
        }
        // both out: need the full lens pair or nothing (tangency).
        if (roots.length !== 2) return [];
        return roots.map((t) => [a[0] + t * dx, a[1] + t * dy] as Point);
    };

    // Single ordered boundary walk: vertices classified in/out; crossings in walk
    // order. State flips at each crossing; verify vertex classes stay consistent
    // (tangency degeneracy ⇒ watertight linear fallback).
    interface Crossing {
        readonly p: Point;
        /** true = out→in (entry into the disk). */
        entry: boolean;
        /** Index into the walk position (after which vertex). */
        readonly afterVertex: number;
    }
    const inV: boolean[] = [];
    for (let i = 0; i < n; i++) inV.push(T(pts[i]!) <= c);
    const crossings: Crossing[] = [];
    for (let i = 0; i < n; i++) {
        const roots = crossSeg(pts[i]!, pts[(i + 1) % n]!, inV[i]!, inV[(i + 1) % n]!);
        if (roots.length === 1) {
            crossings.push({ p: roots[0]!, entry: !inV[i]!, afterVertex: i });
        } else if (roots.length === 2) {
            // lens on an out-out segment: entry then exit.
            crossings.push({ p: roots[0]!, entry: true, afterVertex: i });
            crossings.push({ p: roots[1]!, entry: false, afterVertex: i });
        }
    }

    if (crossings.length === 0) {
        // No boundary intersection: all-in or all-out (source is outside the
        // cell — the attack origin sits a full outradius back — so a fully
        // interior disk cannot occur).
        const allIn = inV.every(Boolean);
        return [
            part(cell, front.starId, allIn ? front.ownerIn : front.ownerOld, [...pts]),
        ];
    }

    // Alternation sanity (numeric tangency can break it) → linear fallback.
    let alternates = crossings.length % 2 === 0;
    for (let i = 0; alternates && i < crossings.length; i++) {
        if (crossings[i]!.entry === crossings[(i + 1) % crossings.length]!.entry) {
            alternates = false;
        }
    }
    if (!alternates) return splitLinear(cell, front, q);

    // Arc from `from` to `to` around the circle in direction `dir` (+1 = angle
    // increasing). Endpoints exclusive. Density ~15°/step, adaptive to span.
    const arcPts = (from: Point, to: Point, dir: number): Point[] => {
        const aA = Math.atan2(from[1] - sy, from[0] - sx);
        const aB = Math.atan2(to[1] - sy, to[0] - sx);
        let d = aB - aA;
        const TAU = Math.PI * 2;
        if (dir > 0) {
            while (d <= 0) d += TAU;
            while (d > TAU) d -= TAU;
        } else {
            while (d >= 0) d -= TAU;
            while (d < -TAU) d += TAU;
        }
        const steps = Math.max(2, Math.min(64, Math.ceil((Math.abs(d) * 24) / Math.PI)));
        const out: Point[] = [];
        for (let k = 1; k < steps; k++) {
            const a = aA + (d * k) / steps;
            out.push([sx + c * Math.cos(a), sy + c * Math.sin(a)]);
        }
        return out;
    };

    /** Cell vertices strictly between two crossings, in walk order (cyclic). */
    const vertsBetween = (a: Crossing, b: Crossing): Point[] => {
        const out: Point[] = [];
        let v = (a.afterVertex + 1) % n;
        // walk vertices until we pass b's segment. b lies after vertex
        // b.afterVertex, so vertices up to and including b.afterVertex qualify —
        // unless a and b share a segment with a before b (lens): then none.
        if (a.afterVertex === b.afterVertex && sameLensOrder(a, b)) return out;
        for (let guard = 0; guard < n; guard++) {
            out.push([pts[v]![0], pts[v]![1]]);
            if (v === b.afterVertex) break;
            v = (v + 1) % n;
        }
        return out;
    };
    const sameLensOrder = (a: Crossing, b: Crossing): boolean => {
        // On the same segment, the walk meets a first iff its parameter along the
        // segment is smaller — equivalent to being closer to the segment start.
        const s = pts[a.afterVertex]!;
        const da = (a.p[0] - s[0]) ** 2 + (a.p[1] - s[1]) ** 2;
        const db = (b.p[0] - s[0]) ** 2 + (b.p[1] - s[1]) ** 2;
        return da <= db;
    };

    // Rotate so crossings[0] is an ENTRY.
    const first = crossings.findIndex((x) => x.entry);
    const ordered = [...crossings.slice(first), ...crossings.slice(0, first)];
    const pairs = ordered.length / 2;

    // INCOMING: entry_k → in-verts → exit_k, then arc exit_k → entry_{k+1}.
    const incoming: Point[] = [];
    for (let k = 0; k < pairs; k++) {
        const entry = ordered[2 * k]!;
        const exit = ordered[2 * k + 1]!;
        const nextEntry = ordered[(2 * k + 2) % ordered.length]!;
        incoming.push([entry.p[0], entry.p[1]]);
        for (const v of vertsBetween(entry, exit)) incoming.push(v);
        incoming.push([exit.p[0], exit.p[1]]);
        for (const a of arcPts(exit.p, nextEntry.p, orient)) incoming.push(a);
    }

    // OLD caps: one per outside run — exit_k → out-verts → entry_{k+1}, then the
    // shared arc back (opposite direction).
    const parts: PowerCell[] = [];
    if (incoming.length >= 3) {
        parts.push(part(cell, front.starId, front.ownerIn, incoming));
    }
    for (let k = 0; k < pairs; k++) {
        const exit = ordered[2 * k + 1]!;
        const nextEntry = ordered[(2 * k + 2) % ordered.length]!;
        const cap: Point[] = [[exit.p[0], exit.p[1]]];
        for (const v of vertsBetween(exit, nextEntry)) cap.push(v);
        cap.push([nextEntry.p[0], nextEntry.p[1]]);
        for (const a of arcPts(nextEntry.p, exit.p, -orient)) cap.push(a);
        if (cap.length >= 3) parts.push(part(cell, front.starId, front.ownerOld, cap));
    }
    if (parts.length === 0) {
        parts.push(part(cell, front.starId, q >= 0.5 ? front.ownerIn : front.ownerOld, [...pts]));
    }

    // INVARIANT GUARD (the 1% degeneracy the walk can't rule out): the sweep's
    // threshold c passes through EVERY vertex's T at some frame; on the frame
    // where c lands within float noise of a vertex, entry/exit pairing can
    // misfire even with alternation intact — producing self-intersecting parts
    // that render as a one-frame overlap fragment. The split is exact, so the
    // parts MUST tile the cell: if their total area deviates from the cell's by
    // more than 0.5%, discard and fall back to the watertight linear split for
    // this frame (a one-frame straight front, visually invisible).
    const cellArea = Math.abs(shoelace(pts)) / 2;
    if (cellArea > 1e-9) {
        let partArea = 0;
        for (const piece of parts) partArea += Math.abs(shoelace(piece.points)) / 2;
        if (Math.abs(partArea - cellArea) / cellArea > 0.005) {
            return splitLinear(cell, front, q);
        }
    }
    return parts;
}
