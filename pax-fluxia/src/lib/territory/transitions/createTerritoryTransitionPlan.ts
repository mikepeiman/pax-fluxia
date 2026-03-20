// ---------------------------------------------------------------------------
// Create territory transition plans using the 2-pass splice model.
// ---------------------------------------------------------------------------
// Pipeline (per ring):
//   1. findRingSpliceWindowTopological  — span identity matching
//   2. refineSpliceWindowGeometrically  — point displacement comparison
//   3. classifyRingTransitionKind       — explicit kind + invariant check
//   4. buildPatchMorphPlan              — resample changed arcs (if applicable)
// ---------------------------------------------------------------------------

import type {
    Vec2,
    TerritoryBoundarySnapshot,
    TerritoryDeltaContext,
    AnimatedRingPlan,
    TerritoryBoundaryTransitionPlan,
    TerritoryTransitionPlanSet,
    BoundaryRingSnapshot,
    BoundarySpan,
} from './types';

import { findRingSpliceWindowTopological } from './findRingSpliceWindowTopological';
import { refineSpliceWindowGeometrically } from './refineSpliceWindowGeometrically';
import { classifyRingTransitionKind } from './classifyRingTransitionKind';
import { buildPatchMorphPlan } from './buildPatchMorphPlan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rotate points array to match topological rotation offset.
 */
function rotatePoints(points: Vec2[], offset: number): Vec2[] {
    if (offset === 0 || points.length === 0) return points;
    const idx = ((offset % points.length) + points.length) % points.length;
    return [...points.slice(idx), ...points.slice(0, idx)];
}

/**
 * Extract static segments from prev ring given the changed window boundaries.
 */
function extractStaticSegments(
    points: Vec2[],
    staticPrefixEnd: number,
    staticSuffixStart: number,
): Vec2[][] {
    const segments: Vec2[][] = [];
    if (staticPrefixEnd > 0) {
        segments.push(points.slice(0, staticPrefixEnd));
    }
    if (staticSuffixStart < points.length) {
        segments.push(points.slice(staticSuffixStart));
    }
    return segments;
}

/**
 * Match prev and next snapshots by ownerId with starIds overlap for disambiguation.
 */
function matchSnapshotsByOwner(
    prev: TerritoryBoundarySnapshot[],
    next: TerritoryBoundarySnapshot[],
): Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }> {
    const matches = new Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }>();

    const nextByOwner = new Map<string, TerritoryBoundarySnapshot[]>();
    for (const s of next) {
        let arr = nextByOwner.get(s.ownerId);
        if (!arr) { arr = []; nextByOwner.set(s.ownerId, arr); }
        arr.push(s);
    }

    for (const prevT of prev) {
        const candidates = nextByOwner.get(prevT.ownerId);
        if (!candidates || candidates.length === 0) continue;

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

/**
 * Get the point offset for rotating next ring to match span alignment.
 */
function getRotationPointOffset(spans: BoundarySpan[], rotation: number): number {
    if (rotation === 0 || spans.length === 0) return 0;
    return spans[rotation % spans.length].startSample;
}

/**
 * Build a plan for a single ring using the 2-pass model.
 */
function buildRingPlan(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    conquestOrigin: Vec2 | undefined,
    sampleCount: number,
): AnimatedRingPlan {
    // ── Pass 1: Topological splice detection ──
    const topo = findRingSpliceWindowTopological(prevRing, nextRing);

    if (!topo || (topo.prefixLen === 0 && topo.suffixLen === 0 && !topo.allSpansMatch)) {
        // No span matches at all — fallback snap
        const diag = {
            kind: 'fallback-snap' as const,
            rotation: 0,
            matchedSpansPrefix: 0,
            matchedSpansSuffix: 0,
            prevChangedSamples: prevRing.points.length,
            nextChangedSamples: nextRing.points.length,
            staticSamples: 0,
            anchorsPrev: [0, prevRing.points.length] as [number, number],
            anchorsNext: [0, nextRing.points.length] as [number, number],
            geomEqualOutsidePatch: false,
            valid: true,
            reason: topo ? 'no-matching-spans' : 'no-spans-available',
        };
        console.log(
            `[RING PLAN]\n  ring=${prevRing.ringId}\n  kind=fallback-snap\n  reason=${diag.reason}`
        );
        return {
            ringId: prevRing.ringId,
            kind: 'fallback-snap',
            staticSegmentsPrev: [],
            patchMorph: null,
            targetRing: nextRing,
            prevRingPoints: prevRing.points,
            diagnostics: diag,
        };
    }

    // ── Pass 2: Geometric refinement ──
    const geom = refineSpliceWindowGeometrically(prevRing, nextRing, topo);

    // ── Classification ──
    const diag = classifyRingTransitionKind(
        prevRing.ringId, topo, geom,
        prevRing.points.length, nextRing.points.length,
    );

    // ── Build plan based on kind ──
    const pointOffset = getRotationPointOffset(nextRing.spans, topo.rotation);
    const nextPtsAligned = rotatePoints(nextRing.points, pointOffset);
    const alignedNextRing: BoundaryRingSnapshot = { ...nextRing, points: nextPtsAligned };

    if (diag.kind === 'unchanged') {
        return {
            ringId: prevRing.ringId,
            kind: 'unchanged',
            staticSegmentsPrev: [prevRing.points],
            patchMorph: null,
            targetRing: alignedNextRing,
            prevRingPoints: prevRing.points,
            diagnostics: diag,
        };
    }

    if (diag.kind === 'fallback-snap') {
        return {
            ringId: prevRing.ringId,
            kind: 'fallback-snap',
            staticSegmentsPrev: [],
            patchMorph: null,
            targetRing: alignedNextRing,
            prevRingPoints: prevRing.points,
            diagnostics: diag,
        };
    }

    // splice-replace, splice-insert, or splice-delete
    const staticSegments = extractStaticSegments(
        prevRing.points,
        geom.staticPrefixEnd,
        geom.staticSuffixStart,
    );

    // Build RingSpliceWindow for buildPatchMorphPlan compatibility
    const window = {
        ringId: prevRing.ringId,
        anchorStartPrev: geom.staticPrefixEnd,
        anchorEndPrev: geom.staticSuffixStart,
        anchorStartNext: geom.nextChangedRange?.[0] ?? 0,
        anchorEndNext: geom.nextChangedRange?.[1] ?? nextPtsAligned.length,
        changedPrevRange: geom.prevChangedRange,
        changedNextRange: geom.nextChangedRange,
    };

    const patchMorph = (diag.kind === 'splice-replace' || diag.kind === 'splice-insert' || diag.kind === 'splice-delete')
        ? buildPatchMorphPlan(prevRing, alignedNextRing, window, sampleCount, conquestOrigin)
        : null;

    return {
        ringId: prevRing.ringId,
        kind: diag.kind,
        staticSegmentsPrev: staticSegments,
        patchMorph,
        targetRing: alignedNextRing,
        prevRingPoints: prevRing.points,
        diagnostics: diag,
    };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Create territory transition plans using the 2-pass splice model.
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
    const matched = matchSnapshotsByOwner(prevSnapshots, nextSnapshots);

    for (const [territoryId, { prev: prevT, next: nextT }] of matched) {
        if (!delta.affectedTerritoryIds.has(territoryId) &&
            !delta.affectedTerritoryIds.has(nextT.territoryId)) {
            continue;
        }

        const animatedRings: AnimatedRingPlan[] = [];
        const ringCount = Math.min(prevT.rings.length, nextT.rings.length);

        for (let ri = 0; ri < ringCount; ri++) {
            animatedRings.push(
                buildRingPlan(prevT.rings[ri], nextT.rings[ri], conquestOrigin, sampleCount)
            );
        }

        // Handle rings that only exist in next (new holes appearing)
        for (let ri = ringCount; ri < nextT.rings.length; ri++) {
            const nextRing = nextT.rings[ri];
            animatedRings.push({
                ringId: nextRing.ringId,
                kind: 'splice-insert',
                staticSegmentsPrev: [],
                patchMorph: null,
                targetRing: nextRing,
                prevRingPoints: [],
                diagnostics: {
                    kind: 'splice-insert',
                    rotation: 0,
                    matchedSpansPrefix: 0,
                    matchedSpansSuffix: 0,
                    prevChangedSamples: 0,
                    nextChangedSamples: nextRing.points.length,
                    staticSamples: 0,
                    anchorsPrev: [0, 0],
                    anchorsNext: [0, nextRing.points.length],
                    geomEqualOutsidePatch: false,
                    valid: true,
                },
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
