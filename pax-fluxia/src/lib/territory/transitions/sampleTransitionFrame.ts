// ---------------------------------------------------------------------------
// Sample one animation frame from a territory transition plan.
// ---------------------------------------------------------------------------
// Reconstructs per-frame ring geometry:
//   - Static segments: copied verbatim from prev (no interpolation)
//   - Changed patch: interpolated between from/to samples with easing
// ---------------------------------------------------------------------------

import type {
    Vec2,
    TerritoryTransitionPlanSet,
    TerritoryFrameRing,
    TerritoryFrameGeometry,
    AnimatedRingPlan,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Stitch a full ring from static segments and an animated patch.
 * Order: static prefix + animated patch + static suffix.
 * Closes the ring by ensuring last point matches first.
 */
function stitchRing(staticSegments: Vec2[][], patch: Vec2[]): Vec2[] {
    const full: Vec2[] = [];

    // Static prefix (segment 0, if any)
    if (staticSegments.length > 0) {
        for (const pt of staticSegments[0]) {
            full.push(pt);
        }
    }

    // Animated patch
    for (const pt of patch) {
        full.push(pt);
    }

    // Static suffix (segment 1, if any)
    if (staticSegments.length > 1) {
        for (const pt of staticSegments[1]) {
            full.push(pt);
        }
    }

    return full;
}

/**
 * Interpolate a single ring for a given frame.
 */
function sampleRingFrame(ringPlan: AnimatedRingPlan, t: number): Vec2[] {
    // No patch morph or transition complete → use target ring directly
    if (!ringPlan.patchMorph || t >= 1) {
        return [...ringPlan.targetRing.points];
    }

    // At t=0, use prev geometry (static segments + from patch)
    const { fromSamples, toSamples } = ringPlan.patchMorph;

    // Interpolate patch
    const patch: Vec2[] = [];
    for (let i = 0; i < fromSamples.length; i++) {
        patch.push({
            x: fromSamples[i].x + (toSamples[i].x - fromSamples[i].x) * t,
            y: fromSamples[i].y + (toSamples[i].y - fromSamples[i].y) * t,
        });
    }

    // Stitch: static segments (from prev, verbatim) + animated patch
    return stitchRing(ringPlan.staticSegmentsPrev, patch);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Sample all territory transition plans at a given time.
 *
 * @param planSet  All transition plans for this tick
 * @param rawT     Normalized time [0..1]
 * @param easing   Easing function applied to rawT
 * @returns        Per-territory draw-ready ring geometry
 */
export function sampleTransitionFrame(
    planSet: TerritoryTransitionPlanSet,
    rawT: number,
    easing: (t: number) => number,
): TerritoryFrameGeometry {
    const t = easing(clamp01(rawT));
    const result = new Map<string, TerritoryFrameRing[]>();

    for (const [territoryId, plan] of planSet.plansByTerritoryId) {
        const rings: TerritoryFrameRing[] = [];

        for (const ringPlan of plan.rings) {
            const points = sampleRingFrame(ringPlan, t);
            rings.push({ ringId: ringPlan.ringId, points });
        }

        result.set(territoryId, rings);
    }

    return { byTerritoryId: result };
}
