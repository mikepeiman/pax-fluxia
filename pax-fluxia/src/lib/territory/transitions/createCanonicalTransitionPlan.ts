// ---------------------------------------------------------------------------
// createCanonicalTransitionPlan.ts — TMAP-Diff-Driven Transition Planner
// ---------------------------------------------------------------------------
// Uses the FrontierMapDiff to partition each affected loop's edges into
// unchanged (copy verbatim) and changed (resample + interpolate) segments.
//
// This replaces the span-proximity-matching approach: identity comes from
// canonical edges, not from vertex-to-polyline proximity.
//
// Layer: Transition (planning)
// Does NOT: render, import PIXI, modify geometry
// ---------------------------------------------------------------------------

import type {
    TerritoryFrontierMap,
    CanonicalLoop,
    CanonicalEdge,
} from '../compiler/canonicalTypes';
import type { FrontierMapDiff } from './diffFrontierMaps';
import type {
    Vec2,
    AnimatedRingPlan,
    PatchMorphPlan,
    TerritoryBoundaryTransitionPlan,
    TerritoryTransitionPlanSet,
    BoundaryRingSnapshot,
    RingPlanDiagnostics,
    RingTransitionKind,
} from './types';
import { resamplePolylineByArcLength } from './buildPatchMorphPlan';
import { log } from '$lib/utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toVec2(pt: [number, number]): Vec2 {
    return { x: pt[0], y: pt[1] };
}

function computeCumulativeLengths(points: Vec2[]): number[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return lengths;
}

/**
 * Extract ownerPairKey from an edge ID.
 */
function extractOwnerPairKey(edgeId: string): string {
    const arrowIdx = edgeId.indexOf('->');
    const colonIdx = edgeId.indexOf(':', arrowIdx);
    if (arrowIdx < 0 || colonIdx < 0) return edgeId;
    return edgeId.substring(colonIdx + 1);
}

/**
 * Check if this edge is unchanged in the diff.
 * Uses pair-level classification: an edge is unchanged ONLY if its owner
 * pair polyline is classified as 'unchanged' (RMS < threshold).
 *
 * Modified pairs are the conquest boundary — they MUST animate.
 * The pair-level RMS threshold correctly separates Voronoi jitter
 * (unchanged) from real conquest changes (modified).
 */
function isEdgeUnchanged(edgeId: string, diff: FrontierMapDiff): boolean {
    const opk = extractOwnerPairKey(edgeId);
    const status = diff.pairStatus.get(opk);
    return status === 'unchanged';
}

/**
 * Collect curvePoints from a contiguous run of edges.
 * First edge: all points. Subsequent: skip first (junction duplicate).
 */
function collectEdgePoints(
    edgeIds: string[],
    edges: Map<string, CanonicalEdge>,
): Vec2[] {
    const result: Vec2[] = [];
    for (let i = 0; i < edgeIds.length; i++) {
        const edge = edges.get(edgeIds[i]);
        if (!edge) continue;
        if (i === 0) {
            for (const pt of edge.curvePoints) result.push(toVec2(pt));
        } else {
            for (let j = 1; j < edge.curvePoints.length; j++) {
                result.push(toVec2(edge.curvePoints[j]));
            }
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// Edge run partitioning
// ---------------------------------------------------------------------------

interface EdgeRun {
    kind: 'unchanged' | 'changed';
    edgeIds: string[];
}

/**
 * Partition a loop's edges into contiguous runs of unchanged and changed.
 */
function partitionLoopEdges(
    loop: CanonicalLoop,
    diff: FrontierMapDiff,
): EdgeRun[] {
    const runs: EdgeRun[] = [];
    let currentKind: 'unchanged' | 'changed' | null = null;
    let currentEdges: string[] = [];

    for (const edgeId of loop.edgeIds) {
        const unchanged = isEdgeUnchanged(edgeId, diff);
        const kind: 'unchanged' | 'changed' = unchanged ? 'unchanged' : 'changed';

        if (kind !== currentKind) {
            if (currentKind !== null && currentEdges.length > 0) {
                runs.push({ kind: currentKind, edgeIds: [...currentEdges] });
            }
            currentKind = kind;
            currentEdges = [edgeId];
        } else {
            currentEdges.push(edgeId);
        }
    }
    if (currentKind !== null && currentEdges.length > 0) {
        runs.push({ kind: currentKind, edgeIds: currentEdges });
    }

    return runs;
}

/**
 * Find the corresponding loop in the next TMAP for the same owner.
 * Matches by ownerId and loop index within that owner's loops.
 */
function findMatchingNextLoop(
    prevLoop: CanonicalLoop,
    prevLoopIdx: number,
    prevTMAP: TerritoryFrontierMap,
    nextTMAP: TerritoryFrontierMap,
): CanonicalLoop | null {
    // Count how many loops before this one have the same owner
    let ownerLoopIdx = 0;
    for (let i = 0; i < prevLoopIdx; i++) {
        if (prevTMAP.loops[i].ownerId === prevLoop.ownerId) ownerLoopIdx++;
    }
    // Find the same-indexed loop for this owner in next
    let nextIdx = 0;
    for (const loop of nextTMAP.loops) {
        if (loop.ownerId === prevLoop.ownerId) {
            if (nextIdx === ownerLoopIdx) return loop;
            nextIdx++;
        }
    }
    return null;
}

/**
 * Find corresponding edges in next TMAP for a changed edge from prev.
 * Uses ownerPairKey matching (stable across frames).
 */
function findNextEdgesByPairKey(
    prevEdgeId: string,
    nextEdges: Map<string, CanonicalEdge>,
): CanonicalEdge[] {
    const opk = extractOwnerPairKey(prevEdgeId);
    const results: CanonicalEdge[] = [];
    for (const [eid, edge] of nextEdges) {
        if (extractOwnerPairKey(eid) === opk) results.push(edge);
    }
    return results;
}

// ---------------------------------------------------------------------------
// Main planner
// ---------------------------------------------------------------------------

/**
 * Create transition plans driven by TMAP diff.
 *
 * For each affected loop:
 * 1. Partition edges into unchanged/changed runs
 * 2. Unchanged runs → static segments (copy curvePoints verbatim)
 * 3. Changed run → prev arc + next arc, resampled to equal counts
 * 4. Per-frame: static segments copied, changed patch interpolated
 */
export function createCanonicalTransitionPlan(
    prevTMAP: TerritoryFrontierMap,
    nextTMAP: TerritoryFrontierMap,
    diff: FrontierMapDiff,
    durationMs: number,
    conquestOrigin?: Vec2,
    resampleN: number = 32,
): TerritoryTransitionPlanSet {
    const plans = new Map<string, TerritoryBoundaryTransitionPlan>();

    if (diff.identical) {
        return { plansByTerritoryId: plans };
    }

    // Process each prev loop that is affected
    for (let li = 0; li < prevTMAP.loops.length; li++) {
        const prevLoop = prevTMAP.loops[li];
        if (!diff.affectedLoopIds.has(prevLoop.loopId)) continue;

        const nextLoop = findMatchingNextLoop(prevLoop, li, prevTMAP, nextTMAP);
        if (!nextLoop) {
            // Loop was deleted or completely new — fallback snap
            log.sys('TMAP-Plan', `Loop ${prevLoop.loopId}: no matching next loop, will snap`);
            continue;
        }

        const runs = partitionLoopEdges(prevLoop, diff);
        const staticSegments: Vec2[][] = [];
        let patchMorph: PatchMorphPlan | null = null;
        let kind: RingTransitionKind = 'unchanged';

        const unchangedRunCount = runs.filter(r => r.kind === 'unchanged').length;
        const changedRunCount = runs.filter(r => r.kind === 'changed').length;

        if (changedRunCount === 0) {
            kind = 'unchanged';
        } else if (changedRunCount === 1) {
            // Ideal case: single changed window
            for (const run of runs) {
                if (run.kind === 'unchanged') {
                    // Copy verbatim
                    staticSegments.push(collectEdgePoints(run.edgeIds, prevTMAP.edges));
                } else {
                    // Changed patch — collect prev and next arcs
                    const prevArc = collectEdgePoints(run.edgeIds, prevTMAP.edges);

                    // Find corresponding changed edges in next loop
                    const nextRuns = partitionLoopEdges(nextLoop, diff);
                    const nextChangedRun = nextRuns.find(r => r.kind === 'changed');
                    const nextArc = nextChangedRun
                        ? collectEdgePoints(nextChangedRun.edgeIds, nextTMAP.edges)
                        : prevArc; // fallback: no change in next

                    if (prevArc.length >= 2 && nextArc.length >= 2) {
                        const fromSamples = resamplePolylineByArcLength(prevArc, resampleN);
                        const toSamples = resamplePolylineByArcLength(nextArc, resampleN);

                        patchMorph = {
                            ringId: prevLoop.loopId,
                            anchorA: fromSamples[0],
                            anchorB: fromSamples[fromSamples.length - 1],
                            fromSamples,
                            toSamples,
                            localOrigin: conquestOrigin,
                        };

                        kind = 'splice-replace';
                    } else {
                        // Degenerate arc — snap
                        kind = 'fallback-snap';
                    }
                }
            }
        } else {
            // Multiple changed windows — morph the entire loop
            const prevArc = collectEdgePoints(prevLoop.edgeIds, prevTMAP.edges);
            const nextArc = collectEdgePoints(nextLoop.edgeIds, nextTMAP.edges);

            if (prevArc.length >= 2 && nextArc.length >= 2) {
                const fromSamples = resamplePolylineByArcLength(prevArc, resampleN);
                const toSamples = resamplePolylineByArcLength(nextArc, resampleN);

                patchMorph = {
                    ringId: prevLoop.loopId,
                    anchorA: fromSamples[0],
                    anchorB: fromSamples[fromSamples.length - 1],
                    fromSamples,
                    toSamples,
                    localOrigin: conquestOrigin,
                };
                kind = 'splice-replace';
                log.sys('TMAP-Plan', `Loop ${prevLoop.loopId}: ${changedRunCount} changed runs → full-loop morph`);
            } else {
                kind = 'fallback-snap';
                log.sys('TMAP-Plan', `Loop ${prevLoop.loopId}: degenerate arcs, falling back to snap`);
            }
        }

        // Build ring snapshot for target
        const nextPoints = collectEdgePoints(nextLoop.edgeIds, nextTMAP.edges);
        const targetRing: BoundaryRingSnapshot = {
            ringId: nextLoop.loopId,
            kind: nextLoop.kind === 'hole' ? 'hole' : 'outer',
            points: nextPoints,
            cumulativeLengths: computeCumulativeLengths(nextPoints),
            spans: [], // spans not needed for target ring in canonical path
        };

        // Build prev points for diagnostics
        const prevPoints = collectEdgePoints(prevLoop.edgeIds, prevTMAP.edges);

        const diagnostics: RingPlanDiagnostics = {
            kind,
            rotation: 0,
            matchedSpansPrefix: unchangedRunCount,
            matchedSpansSuffix: 0,
            prevChangedSamples: patchMorph?.fromSamples.length ?? 0,
            nextChangedSamples: patchMorph?.toSamples.length ?? 0,
            staticSamples: staticSegments.reduce((n, s) => n + s.length, 0),
            anchorsPrev: [0, 0],
            anchorsNext: [0, 0],
            geomEqualOutsidePatch: kind === 'unchanged',
            valid: kind !== 'fallback-snap',
        };

        const ringPlan: AnimatedRingPlan = {
            ringId: prevLoop.loopId,
            kind,
            staticSegmentsPrev: staticSegments,
            patchMorph,
            targetRing,
            prevRingPoints: prevPoints,
            diagnostics,
        };

        // Group into territory plans by owner
        const territoryId = prevLoop.ownerId;
        if (!plans.has(territoryId)) {
            plans.set(territoryId, {
                territoryId,
                ownerId: prevLoop.ownerId,
                durationMs,
                rings: [],
            });
        }
        plans.get(territoryId)!.rings.push(ringPlan);

        log.sys('TMAP-Plan',
            `Loop ${prevLoop.loopId}: kind=${kind} ` +
            `unchanged=${unchangedRunCount} changed=${changedRunCount} ` +
            `static=${staticSegments.reduce((n, s) => n + s.length, 0)}pts ` +
            `patch=${patchMorph ? `${patchMorph.fromSamples.length}→${patchMorph.toSamples.length}` : 'none'}`
        );
    }

    // Also handle loops that only exist in next (newly appeared territories)
    for (const nextLoop of nextTMAP.loops) {
        if (!diff.affectedLoopIds.has(nextLoop.loopId)) continue;

        // Check if already handled via prev matching
        const alreadyHandled = prevTMAP.loops.some(
            pl => pl.ownerId === nextLoop.ownerId
        );
        if (alreadyHandled) continue;

        // New territory — snap to target
        const nextPoints = collectEdgePoints(nextLoop.edgeIds, nextTMAP.edges);
        const targetRing: BoundaryRingSnapshot = {
            ringId: nextLoop.loopId,
            kind: nextLoop.kind === 'hole' ? 'hole' : 'outer',
            points: nextPoints,
            cumulativeLengths: computeCumulativeLengths(nextPoints),
            spans: [],
        };

        const diagnostics: RingPlanDiagnostics = {
            kind: 'splice-insert',
            rotation: 0,
            matchedSpansPrefix: 0,
            matchedSpansSuffix: 0,
            prevChangedSamples: 0,
            nextChangedSamples: nextPoints.length,
            staticSamples: 0,
            anchorsPrev: [0, 0],
            anchorsNext: [0, 0],
            geomEqualOutsidePatch: false,
            valid: true,
        };

        const ringPlan: AnimatedRingPlan = {
            ringId: nextLoop.loopId,
            kind: 'splice-insert',
            staticSegmentsPrev: [],
            patchMorph: null,
            targetRing,
            prevRingPoints: [],
            diagnostics,
        };

        const territoryId = nextLoop.ownerId;
        if (!plans.has(territoryId)) {
            plans.set(territoryId, {
                territoryId,
                ownerId: nextLoop.ownerId,
                durationMs,
                rings: [],
            });
        }
        plans.get(territoryId)!.rings.push(ringPlan);
    }

    log.sys('TMAP-Plan', `Total: ${plans.size} territory plans, ${[...plans.values()].reduce((n, p) => n + p.rings.length, 0)} ring plans`);

    return { plansByTerritoryId: plans };
}
