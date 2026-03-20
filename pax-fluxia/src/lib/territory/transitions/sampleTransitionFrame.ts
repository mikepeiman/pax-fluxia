// ---------------------------------------------------------------------------
// Sample one animation frame from a territory transition plan.
// ---------------------------------------------------------------------------
// Uses per-point static/dynamic mask:
//   - Static points: copied from prev (bitwise stationary, no jitter)
//   - Dynamic points: interpolated between prev and target with easing
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
 * Interpolate a single ring for a given frame.
 *
 * Static points come from prevSampled (bitwise identical each frame).
 * Dynamic points are linearly interpolated between prev and target.
 */
function sampleRingFrame(ringPlan: AnimatedRingPlan, t: number): Vec2[] {
    // Transition complete → use target directly
    if (t >= 1) {
        return ringPlan.targetSampled;
    }

    // At t=0 → use prev directly
    if (t <= 0) {
        return ringPlan.prevSampled;
    }

    // Per-point interpolation with static mask
    const N = ringPlan.prevSampled.length;
    const result: Vec2[] = new Array(N);

    for (let i = 0; i < N; i++) {
        if (ringPlan.isStaticMask[i]) {
            // Static: copy from prev (no interpolation, no jitter)
            result[i] = ringPlan.prevSampled[i];
        } else {
            // Dynamic: lerp between prev and target
            const prev = ringPlan.prevSampled[i];
            const tgt = ringPlan.targetSampled[i];
            result[i] = {
                x: prev.x + (tgt.x - prev.x) * t,
                y: prev.y + (tgt.y - prev.y) * t,
            };
        }
    }

    return result;
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
