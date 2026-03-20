// ---------------------------------------------------------------------------
// Create the full territory transition plan from prev/next geometry.
// ---------------------------------------------------------------------------
// Orchestrates: delta context → splice detection → patch morph plans
// for all affected territories.
// ---------------------------------------------------------------------------

import type {
    Vec2,
    TerritoryBoundarySnapshot,
    TerritoryDeltaContext,
    AnimatedRingPlan,
    TerritoryBoundaryTransitionPlan,
    TerritoryTransitionPlanSet,
} from './types';

import { findRingSpliceWindow } from './findRingSpliceWindow';
import { buildPatchMorphPlan } from './buildPatchMorphPlan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract static (unchanged) segments from a ring given the splice window.
 * Returns the vertex sequences that should not be animated.
 */
function extractStaticSegments(
    points: Vec2[],
    anchorStart: number,
    anchorEnd: number,
    totalPoints: number,
): Vec2[][] {
    const segments: Vec2[][] = [];

    // Prefix: everything before the changed window
    if (anchorStart > 0) {
        segments.push(points.slice(0, anchorStart));
    }

    // Suffix: everything after the changed window
    if (anchorEnd < totalPoints) {
        segments.push(points.slice(anchorEnd));
    }

    return segments;
}

/**
 * Match prev and next snapshots by ownerId (not territoryId, since indices may shift).
 */
function matchSnapshotsByOwner(
    prev: TerritoryBoundarySnapshot[],
    next: TerritoryBoundarySnapshot[],
): Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }> {
    const matches = new Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }>();

    // Index next snapshots by ownerId
    const nextByOwner = new Map<string, TerritoryBoundarySnapshot[]>();
    for (const s of next) {
        let arr = nextByOwner.get(s.ownerId);
        if (!arr) { arr = []; nextByOwner.set(s.ownerId, arr); }
        arr.push(s);
    }

    for (const prevT of prev) {
        const candidates = nextByOwner.get(prevT.ownerId);
        if (!candidates || candidates.length === 0) continue;

        // Find best match by starIds overlap
        let bestMatch: TerritoryBoundarySnapshot | null = null;
        let bestOverlap = 0;
        for (const nextT of candidates) {
            let overlap = 0;
            for (const sid of prevT.starIds) {
                if (nextT.starIds.includes(sid)) overlap++;
            }
            if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestMatch = nextT;
            }
        }
        if (bestMatch) {
            matches.set(prevT.territoryId, { prev: prevT, next: bestMatch });
        }
    }

    return matches;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Create a full set of territory transition plans.
 *
 * For each affected territory:
 *   1. Match prev → next rings
 *   2. Find splice windows via span identity
 *   3. Build local patch morph plans for changed arcs
 *   4. Extract static segments from prev geometry
 */
export function createTerritoryTransitionPlan(
    prevSnapshots: TerritoryBoundarySnapshot[],
    nextSnapshots: TerritoryBoundarySnapshot[],
    delta: TerritoryDeltaContext,
    durationMs: number,
    conquestOrigin?: Vec2,
    sampleCount: number = 32,
): TerritoryTransitionPlanSet {
    const plans = new Map<string, TerritoryBoundaryTransitionPlan>();

    // Match prev ↔ next snapshots
    const matched = matchSnapshotsByOwner(prevSnapshots, nextSnapshots);

    for (const [territoryId, { prev: prevT, next: nextT }] of matched) {
        // Skip unaffected territories
        if (!delta.affectedTerritoryIds.has(territoryId) &&
            !delta.affectedTerritoryIds.has(nextT.territoryId)) {
            continue;
        }

        const animatedRings: AnimatedRingPlan[] = [];

        // Match rings by index (outer first, then holes)
        const ringCount = Math.min(prevT.rings.length, nextT.rings.length);
        for (let ri = 0; ri < ringCount; ri++) {
            const prevRing = prevT.rings[ri];
            const nextRing = nextT.rings[ri];

            const window = findRingSpliceWindow(prevRing, nextRing);

            if (!window) {
                // No matching spans — snap to target (safe fallback)
                animatedRings.push({
                    ringId: prevRing.ringId,
                    staticSegmentsPrev: [],
                    patchMorph: null,
                    targetRing: nextRing,
                });
                continue;
            }

            const patchMorph = buildPatchMorphPlan(
                prevRing, nextRing, window, sampleCount, conquestOrigin,
            );

            const staticSegments = extractStaticSegments(
                prevRing.points,
                window.anchorStartPrev,
                window.anchorEndPrev,
                prevRing.points.length,
            );

            const staticPts = staticSegments.reduce((acc, s) => acc + s.length, 0);
            const patchPts = patchMorph?.fromSamples.length ?? 0;
            console.log(
                `[SPLICE PLAN] ring=${prevRing.ringId} total=${prevRing.points.length} static=${staticPts} patch=${patchPts} ` +
                `window=[${window.anchorStartPrev}..${window.anchorEndPrev}]/${prevRing.points.length} ` +
                `(${((staticPts / prevRing.points.length) * 100).toFixed(0)}% stationary)`
            );

            animatedRings.push({
                ringId: prevRing.ringId,
                staticSegmentsPrev: staticSegments,
                patchMorph,
                targetRing: nextRing,
            });
        }

        plans.set(territoryId, {
            territoryId,
            ownerId: nextT.ownerId,
            durationMs,
            rings: animatedRings,
        });
    }

    return { plansByTerritoryId: plans };
}
