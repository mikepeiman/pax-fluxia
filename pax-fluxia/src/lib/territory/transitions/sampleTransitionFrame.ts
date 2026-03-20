// ---------------------------------------------------------------------------
// Sample one animation frame from a territory transition plan.
// ---------------------------------------------------------------------------
// Reconstructs per-frame ring geometry:
//   - Static segments: copied verbatim from prev (no interpolation)
//   - Changed patch: interpolated between from/to samples with easing
//   - Fallback: whole-ring interpolation when splice detection fails
// ---------------------------------------------------------------------------

import type {
    Vec2,
    TerritoryTransitionPlanSet,
    TerritoryFrameRing,
    TerritoryFrameGeometry,
    AnimatedRingPlan,
} from './types';

import { resamplePolylineByArcLength } from './buildPatchMorphPlan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Stitch a full ring from static segments and an animated patch.
 * Order: static prefix + animated patch + static suffix.
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
 * Whole-ring interpolation fallback: resample both prev and target to equal
 * point counts and lerp. Used when splice detection fails completely.
 * Not as precise as local splice, but provides smooth animation instead of snap.
 */
function interpolateWholeRing(prevPoints: Vec2[], targetPoints: Vec2[], t: number): Vec2[] {
    const N = Math.max(prevPoints.length, targetPoints.length, 32);

    const fromSampled = resamplePolylineByArcLength(prevPoints, N);
    const toSampled = resamplePolylineByArcLength(targetPoints, N);

    const result: Vec2[] = [];
    for (let i = 0; i < N; i++) {
        result.push({
            x: fromSampled[i].x + (toSampled[i].x - fromSampled[i].x) * t,
            y: fromSampled[i].y + (toSampled[i].y - fromSampled[i].y) * t,
        });
    }
    return result;
}

/**
 * Interpolate a single ring for a given frame.
 */
function sampleRingFrame(ringPlan: AnimatedRingPlan, t: number): Vec2[] {
    // Transition complete → use target ring directly
    if (t >= 1) {
        return [...ringPlan.targetRing.points];
    }

    // Has a local patch morph → stitch static segments + interpolated patch
    if (ringPlan.patchMorph) {
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

    // No patch morph — fallback to whole-ring interpolation instead of snap
    if (ringPlan.prevRingPoints && ringPlan.prevRingPoints.length >= 3) {
        return interpolateWholeRing(ringPlan.prevRingPoints, ringPlan.targetRing.points, t);
    }

    // Last resort: snap to target
    return [...ringPlan.targetRing.points];
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
