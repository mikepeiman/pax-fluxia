/**
 * pushedBorderFront — the PUSH conquest front (the default): the pre-conquest
 * border ITSELF is the front, and it travels.
 *
 * USER model (2026-07-10, verbatim): "a conquest is not a *thing*, it is an
 * *event* with a duration. It is a *force* that changes the map over time,
 * from one state to another, through intermediate states. The conquest should
 * just push the border along like a wave and 'smear' or blend it into the
 * bounding borders as it goes, until it completes." And: "a 'front' is the
 * part of the boundary that moves with conquest, period" — endpoints sliding
 * along the bounding borders as moving junctions, colour blend travelling with
 * the line.
 *
 * Construction (all on the captured cell's SMOOTHED ring — one geometry
 * domain):
 *   - ENTRY chain E = the pre-conquest attacker↔defender border (whatever
 *     compound shape it has).
 *   - EXIT chain X = the post-conquest border on the far side (empty when the
 *     attacker fully surrounds — the wave then collapses to the far pole and
 *     vanishes into the bounding borders).
 *   - Side paths S0 (E-end → X-start) and S1 (X-end → E-start) along the ring.
 *   - Front F(q): E morphed toward X (arc-length resampled lerp), with its two
 *     endpoints pinned to A(q)/B(q) — points sliding along S0/S1 by fraction q.
 *     F(0) == E exactly (the map IS the pre map — no start discontinuity);
 *     F(1) == X exactly (the front ARRIVES at the new border and becomes it —
 *     no end discontinuity).
 *   - Behind piece (new owner) = E + S0[..A] + F reversed + S1[B..];
 *     Ahead piece (old owner) = F + S0[A..] + X + S1[..B]. The pieces and the
 *     stroked front share F verbatim — fill seam == border by construction.
 *
 * Vertex-correspondence lerp is safe HERE (unlike whole-map morphs): power
 * cells are convex, both curves lie on one convex ring, and endpoints are
 * pinned to the rim.
 *
 * Pure: no PIXI, no config. Offline-testable.
 */

import type { Point } from './powerCoreTypes';

export type PushSegClass = 'entry' | 'exit' | 'side';

export interface PushedFrontInput {
    /**
     * The captured cell's smoothed ring: ordered, open (no closing duplicate),
     * ROTATED so the entry chain starts at vertex 0 (segClass[0] === 'entry').
     */
    readonly ring: readonly Point[];
    /** Per segment i (ring[i] → ring[(i+1)%n]). */
    readonly segClass: readonly PushSegClass[];
    /** Front progress 0..1 (already eased upstream). */
    readonly q: number;
}

export interface PushedFrontResult {
    /** The moving border, oriented B (E-start side) → A (E-end side). */
    readonly front: Point[];
    /** New-owner piece (degenerate near q=0 — callers drop tiny rings). */
    readonly behindRing: Point[];
    /** Old-owner piece (degenerate near q=1). */
    readonly aheadRing: Point[];
    /** Arc position of the sliding junction A on S0 (ring coords, 0..L). */
    readonly posA: number;
    /** Arc position of the sliding junction B on S1 (ring coords, 0..L). */
    readonly posB: number;
    /** Cumulative arc position per vertex; cum[n] = total length L. */
    readonly cum: number[];
}

/** Arc-length resample an open polyline to exactly m points. */
function resample(pts: readonly Point[], m: number): Point[] {
    if (pts.length === 1) {
        const out: Point[] = [];
        for (let i = 0; i < m; i++) out.push([pts[0]![0], pts[0]![1]]);
        return out;
    }
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        cum.push(
            cum[i - 1]! +
                Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]),
        );
    }
    const total = cum[cum.length - 1]!;
    if (total < 1e-12) return resample([pts[0]!], m);
    const out: Point[] = [];
    for (let k = 0; k < m; k++) {
        const target = (total * k) / (m - 1);
        let i = 1;
        while (i < cum.length - 1 && cum[i]! < target) i++;
        const t0 = cum[i - 1]!;
        const t1 = cum[i]!;
        const f = t1 - t0 < 1e-12 ? 0 : (target - t0) / (t1 - t0);
        out.push([
            pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * f,
            pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * f,
        ]);
    }
    return out;
}

export function buildPushedFront(input: PushedFrontInput): PushedFrontResult | null {
    const { ring, segClass, q: rawQ } = input;
    const n = ring.length;
    if (n < 3 || segClass.length !== n) return null;
    if (segClass[0] !== 'entry') return null; // caller must rotate E to the front
    const q = rawQ < 0 ? 0 : rawQ > 1 ? 1 : rawQ;

    // Cumulative arc positions.
    const cum: number[] = [0];
    for (let i = 0; i < n; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        cum.push(cum[i]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const L = cum[n]!;
    if (L < 1e-9) return null;

    /** Point at arc position p (0..L, cyclic). */
    const pointAt = (pRaw: number): Point => {
        let p = pRaw % L;
        if (p < 0) p += L;
        let i = 0;
        while (i < n - 1 && cum[i + 1]! < p) i++;
        // p lies on segment i (ring[i] → ring[(i+1)%n]).
        const segLen = cum[i + 1]! - cum[i]!;
        const f = segLen < 1e-12 ? 0 : (p - cum[i]!) / segLen;
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };

    // Entry chain: consecutive 'entry' segments from 0.
    let eSegEnd = 0;
    while (eSegEnd + 1 < n && segClass[eSegEnd + 1] === 'entry') eSegEnd++;
    const eV = eSegEnd + 1; // E spans vertices 0..eV
    const posEEnd = cum[eV]!;
    if (posEEnd < 1e-9 || L - posEEnd < 1e-9) return null;

    // Exit chain: LONGEST run of 'exit' segments outside E (no wrap into E).
    let xs = -1;
    let xe = -1;
    {
        let bestLen = 0;
        let runStart = -1;
        for (let i = eV; i < n; i++) {
            if (segClass[i] === 'exit') {
                if (runStart < 0) runStart = i;
                const len = cum[i + 1]! - cum[runStart]!;
                if (len > bestLen) {
                    bestLen = len;
                    xs = runStart;
                    xe = i;
                }
            } else {
                runStart = -1;
            }
        }
    }

    let posXStart: number;
    let posXEnd: number;
    /** Target curve for the morph, oriented X-end → X-start (B side → A side). */
    let target: Point[];
    if (xs >= 0) {
        posXStart = cum[xs]!;
        posXEnd = cum[xe + 1]!;
        target = [];
        for (let v = xe + 1; v >= xs; v--) target.push([ring[v % n]![0], ring[v % n]![1]]);
    } else {
        // No far border (attacker surrounds the cell): the wave collapses to
        // the pole — the arc-length midpoint of the non-entry rim — and
        // vanishes into the bounding borders as it completes.
        const polePos = (posEEnd + L) / 2;
        posXStart = polePos;
        posXEnd = polePos;
        target = [pointAt(polePos)];
    }

    // Sliding junctions: A along S0 (E-end → X-start), B along S1 backwards
    // (E-start → X-end). q=0 ⇒ at E's own endpoints; q=1 ⇒ at X's endpoints.
    const s0Len = posXStart - posEEnd;
    const s1Len = L - posXEnd;
    const posA = posEEnd + q * Math.max(0, s0Len);
    const posB = L - q * Math.max(0, s1Len); // ≡ E-start (pos L ≡ 0) at q=0
    const A = pointAt(posA);
    const B = pointAt(posB);

    // The moving border: E (oriented E-start → E-end … wait, F runs B→A which
    // is E-start-side → E-end-side) morphed toward the target, endpoints
    // pinned to the sliding junctions with a linear falloff correction.
    const source: Point[] = [];
    for (let v = 0; v <= eV; v++) source.push([ring[v]![0], ring[v]![1]]);
    const m = Math.max(9, Math.min(96, Math.max(source.length, target.length) * 2));
    const S = resample(source, m);
    const T = resample(target, m);
    const front: Point[] = [];
    for (let i = 0; i < m; i++) {
        front.push([
            S[i]![0] + (T[i]![0] - S[i]![0]) * q,
            S[i]![1] + (T[i]![1] - S[i]![1]) * q,
        ]);
    }
    const cB: Point = [B[0] - front[0]![0], B[1] - front[0]![1]];
    const cA: Point = [A[0] - front[m - 1]![0], A[1] - front[m - 1]![1]];
    for (let i = 0; i < m; i++) {
        const t = i / (m - 1);
        front[i] = [
            front[i]![0] + (1 - t) * cB[0] + t * cA[0],
            front[i]![1] + (1 - t) * cB[1] + t * cA[1],
        ];
    }
    front[0] = [B[0], B[1]];
    front[m - 1] = [A[0], A[1]];

    // Ring pieces. verts(from,to): vertices with arc position strictly inside
    // (from,to), walking forward; wrap handled by the behind ring explicitly.
    const vertsIn = (from: number, to: number): Point[] => {
        const out: Point[] = [];
        for (let v = 0; v < n; v++) {
            const p = cum[v]!;
            if (p > from + 1e-9 && p < to - 1e-9) out.push([ring[v]![0], ring[v]![1]]);
        }
        return out;
    };
    const dedupe = (pts: Point[]): Point[] => {
        const out: Point[] = [];
        for (const p of pts) {
            const last = out[out.length - 1];
            if (last && Math.abs(last[0] - p[0]) < 1e-9 && Math.abs(last[1] - p[1]) < 1e-9) continue;
            out.push(p);
        }
        while (
            out.length >= 2 &&
            Math.abs(out[0]![0] - out[out.length - 1]![0]) < 1e-9 &&
            Math.abs(out[0]![1] - out[out.length - 1]![1]) < 1e-9
        ) {
            out.pop();
        }
        return out;
    };

    // Behind (new owner): B → rim through E-start/E/E-end → A → front reversed.
    // Rim interval (posB → L) ∪ [0 → posA]; vertex 0 (pos 0) always included.
    const behindRim: Point[] = [B];
    for (const p of vertsIn(posB, L)) behindRim.push(p);
    behindRim.push([ring[0]![0], ring[0]![1]]);
    for (const p of vertsIn(0, posA)) behindRim.push(p);
    behindRim.push(A);
    const behindRing = dedupe([
        ...behindRim,
        ...[...front].reverse().slice(1, -1),
    ]);

    // Ahead (old owner): A → rim through X → B → front forward (B→A interior).
    const aheadRim: Point[] = [A];
    for (const p of vertsIn(posA, posB)) aheadRim.push(p);
    aheadRim.push(B);
    const aheadRing = dedupe([...aheadRim, ...front.slice(1, -1)]);

    return {
        front,
        behindRing: behindRing.length >= 3 ? behindRing : [],
        aheadRing: aheadRing.length >= 3 ? aheadRing : [],
        posA,
        posB,
        cum,
    };
}
