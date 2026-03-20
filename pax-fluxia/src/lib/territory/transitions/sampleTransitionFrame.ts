// ---------------------------------------------------------------------------
// Sample one animation frame from a territory transition plan.
// ---------------------------------------------------------------------------
// Handles all 5 ring transition kinds:
//   unchanged     → copy prev ring exactly (swap to target at t=1)
//   splice-replace → stitch static segments + interpolated patch
//   splice-insert  → grow patch from degenerate line to target arc
//   splice-delete  → shrink patch from source arc to degenerate line
//   fallback-snap  → lerp whole ring (better than instant snap)
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
    if (staticSegments.length > 0) {
        for (const pt of staticSegments[0]) full.push(pt);
    }
    for (const pt of patch) full.push(pt);
    if (staticSegments.length > 1) {
        for (const pt of staticSegments[1]) full.push(pt);
    }
    return full;
}

/**
 * Resample a closed ring to N equidistant points for whole-ring interpolation.
 */
function resampleClosedRing(pts: Vec2[], n: number): Vec2[] {
    if (pts.length < 3 || n < 3) return [...pts];
    const closed = [...pts, pts[0]];
    const cumLen: number[] = [0];
    for (let i = 1; i < closed.length; i++) {
        const dx = closed[i].x - closed[i - 1].x;
        const dy = closed[i].y - closed[i - 1].y;
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 1e-6) return [...pts];
    const result: Vec2[] = [];
    for (let j = 0; j < n; j++) {
        const targetLen = (j / n) * totalLen;
        let segIdx = 0;
        while (segIdx < cumLen.length - 2 && cumLen[segIdx + 1] < targetLen) segIdx++;
        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segFrac = (segEnd - segStart) > 1e-6 ? (targetLen - segStart) / (segEnd - segStart) : 0;
        result.push({
            x: closed[segIdx].x + (closed[segIdx + 1].x - closed[segIdx].x) * segFrac,
            y: closed[segIdx].y + (closed[segIdx + 1].y - closed[segIdx].y) * segFrac,
        });
    }
    return result;
}

/**
 * Interpolate a single ring for a given frame, respecting transition kind.
 */
function sampleRingFrame(ringPlan: AnimatedRingPlan, t: number): Vec2[] {
    const { kind, patchMorph, staticSegmentsPrev, targetRing, prevRingPoints } = ringPlan;

    // ── Transition complete → use target ──
    if (t >= 1) {
        return [...targetRing.points];
    }

    switch (kind) {
        case 'unchanged':
            // No animation — use prev geometry until t=1 swap
            return [...prevRingPoints];

        case 'splice-replace': {
            if (!patchMorph) return [...targetRing.points];
            const { fromSamples, toSamples } = patchMorph;
            const patch: Vec2[] = [];
            for (let i = 0; i < fromSamples.length; i++) {
                patch.push({
                    x: fromSamples[i].x + (toSamples[i].x - fromSamples[i].x) * t,
                    y: fromSamples[i].y + (toSamples[i].y - fromSamples[i].y) * t,
                });
            }
            return stitchRing(staticSegmentsPrev, patch);
        }

        case 'splice-insert': {
            if (!patchMorph) {
                // No patch was built — grow from nothing, just use target directly
                // At t=0, empty; at t→1, full target
                return [...targetRing.points];
            }
            const { fromSamples, toSamples } = patchMorph;
            const patch: Vec2[] = [];
            for (let i = 0; i < fromSamples.length; i++) {
                patch.push({
                    x: fromSamples[i].x + (toSamples[i].x - fromSamples[i].x) * t,
                    y: fromSamples[i].y + (toSamples[i].y - fromSamples[i].y) * t,
                });
            }
            return stitchRing(staticSegmentsPrev, patch);
        }

        case 'splice-delete': {
            if (!patchMorph) {
                // No patch — shrink from source to nothing
                // At t=0, full prev; at t=1, target
                return [...prevRingPoints];
            }
            const { fromSamples, toSamples } = patchMorph;
            const patch: Vec2[] = [];
            for (let i = 0; i < fromSamples.length; i++) {
                patch.push({
                    x: fromSamples[i].x + (toSamples[i].x - fromSamples[i].x) * t,
                    y: fromSamples[i].y + (toSamples[i].y - fromSamples[i].y) * t,
                });
            }
            return stitchRing(staticSegmentsPrev, patch);
        }

        case 'fallback-snap': {
            // Graceful whole-ring interpolation — better than instant snap
            if (prevRingPoints.length < 3 || targetRing.points.length < 3) {
                return [...targetRing.points];
            }
            const N = Math.max(prevRingPoints.length, targetRing.points.length, 64);
            const fromResampled = resampleClosedRing(prevRingPoints, N);
            const toResampled = resampleClosedRing(targetRing.points, N);
            const result: Vec2[] = [];
            for (let i = 0; i < N; i++) {
                result.push({
                    x: fromResampled[i].x + (toResampled[i].x - fromResampled[i].x) * t,
                    y: fromResampled[i].y + (toResampled[i].y - fromResampled[i].y) * t,
                });
            }
            return result;
        }

        default:
            return [...targetRing.points];
    }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Sample all territory transition plans at a given time.
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
