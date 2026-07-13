// ============================================================================
// Geometry kernel — polygon area (shoelace). SINGLE SOURCE.
// ----------------------------------------------------------------------------
// Consolidates the ~14 hand-rolled shoelace copies that had drifted across the
// codebase (cleanup campaign Stage 1, 2026-07-13). Every copy used the identical
// cross-product accumulator Σ(aₓ·bᵧ − bₓ·aᵧ); they differed only in the final
// scale/sign convention. The three exports below cover every convention
// BIT-EXACTLY (÷2 ≡ ×0.5 in IEEE-754, so callers that used either are preserved):
//   - shoelace    → the raw sum = TWICE the signed area (positive = CCW)
//   - signedArea  → shoelace / 2  (positive = CCW)
//   - polygonArea → |shoelace / 2| (unsigned)
// Pure; no PIXI, no allocation beyond the loop.
// ============================================================================

/** A 2D point as an [x, y] tuple (structurally compatible with callers' Point). */
export type Vec2 = readonly [number, number];

/** Raw shoelace sum — TWICE the signed area of the ring (positive = CCW). */
export function shoelace(ring: ReadonlyArray<Vec2>): number {
    let s = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        s += a[0] * b[1] - b[0] * a[1];
    }
    return s;
}

/** Signed area of the ring (positive = CCW winding). */
export function signedArea(ring: ReadonlyArray<Vec2>): number {
    return shoelace(ring) / 2;
}

/** Absolute (unsigned) area of the ring. */
export function polygonArea(ring: ReadonlyArray<Vec2>): number {
    return Math.abs(shoelace(ring) / 2);
}
