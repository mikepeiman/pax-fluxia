// ---------------------------------------------------------------------------
// regionIdentity.ts — Stable territory-region identity (single source of truth)
// ---------------------------------------------------------------------------
// Both territory-geometry assemblers (the render-family
// buildPowerVoronoi0319AuthoritySnapshot and the PVV4
// compiler_UnifiedVectorGeometry) derive a region's stable id from the SAME
// logic here, so the same region gets the same id regardless of which
// assembler produced it (hybrid-converge Phase 1).
//
// Identity is anchored to the region's REAL star set, not its centroid:
//  - centroid ids drift as a territory's geometry shifts under conquest
//    morphing, breaking stable identity (the anti-pattern this replaces);
//  - a sorted real-star-id set is invariant under geometry jitter, iteration
//    order, and re-computation.
//
// Layer: Geometry (compiler-adjacent). Does NOT render, import PIXI, or mutate.
// ---------------------------------------------------------------------------

/** Stable 32-bit FNV-1a hash of a string, as 8 hex chars. */
export function hashString32(value: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Virtual (synthetic) sites injected by the constraint stage — corridors,
 * disconnect seams, MSR support points. These are geometry scaffolding, not
 * gameplay stars, so they are excluded from a region's identity anchor.
 */
export function isVirtualSiteId(id: string): boolean {
    return (
        id.startsWith('corridor_') ||
        id.startsWith('disconnect_') ||
        id.startsWith('msr_support_')
    );
}

/**
 * Stable region id anchored to the real (non-virtual) star set.
 *
 * Order-independent (the star ids are sorted) and free of any
 * iteration-order / collision-suffix counter, so identical ownership of the
 * same stars always yields the same id. Callers that may pass an empty star
 * set should guard with {@link deriveRegionFallbackId} (both assemblers do).
 */
export function deriveStableRegionId(
    ownerId: string,
    starIds: ReadonlyArray<string>,
): string {
    const anchors = starIds.filter((id) => !isVirtualSiteId(id));
    const identity = anchors.length > 0 ? anchors : [...starIds];
    if (identity.length === 0) {
        return `region:${ownerId}:empty`;
    }
    return `region:${ownerId}:${[...identity].sort().join('+')}`;
}

/**
 * Geometry-derived fallback id for the rare region with no anchoring stars.
 * Stable for a given polygon (quantized to 2dp) and distinct per geometry, so
 * two star-less regions of one owner do not collide.
 */
export function deriveRegionFallbackId(
    ownerId: string,
    points: ReadonlyArray<[number, number]>,
): string {
    const key = points
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
        .join('|');
    return `region:${ownerId}:poly:${hashString32(key)}`;
}
