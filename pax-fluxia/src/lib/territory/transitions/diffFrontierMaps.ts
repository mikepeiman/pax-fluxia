// ---------------------------------------------------------------------------
// diffFrontierMaps.ts — Canonical Frontier Map Differ
// ---------------------------------------------------------------------------
// Compares two TerritoryFrontierMaps by edge identity to identify what
// changed between two geometry states. Returns a structured diff that
// the transition system can use to determine:
// - Which edges are unchanged (copy verbatim)
// - Which edges were modified (animate curve change)
// - Which edges were deleted (animate removal)
// - Which edges were inserted (animate appearance)
// - Which vertices anchor the change (splice points)
//
// IMPORTANT: Edge IDs contain coordinate-derived vertex keys (ptKey).
// After Voronoi recalculation, even structurally identical junctions
// have slightly shifted coordinates, so edge IDs are NOT stable across
// frames. This differ matches edges by ownerPairKey (stable sorted
// owner IDs) and endpoint proximity instead of exact string equality.
//
// Layer: Transition (diff computation)
// Does NOT: render, import PIXI, modify geometry
// ---------------------------------------------------------------------------

import type { TerritoryFrontierMap, CanonicalEdge } from '../compiler/canonicalTypes';
import { log } from '$lib/utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of diffing two TerritoryFrontierMaps. */
export interface FrontierMapDiff {
    /** Edges present in both maps with identical curve geometry */
    unchangedEdgeIds: Set<string>;
    /** Edges present in both maps but with different curve geometry */
    modifiedEdgeIds: Set<string>;
    /** Edges in prev only — removed in next */
    deletedEdgeIds: Set<string>;
    /** Edges in next only — new in next */
    insertedEdgeIds: Set<string>;
    /** Vertices that border at least one changed (modified/deleted/inserted) edge */
    anchorVertexIds: Set<string>;
    /** Loop IDs that contain at least one changed edge */
    affectedLoopIds: Set<string>;
    /** Whether the two maps are completely identical */
    identical: boolean;
}

// ---------------------------------------------------------------------------
// Edge matching by ownerPairKey + endpoint proximity
// ---------------------------------------------------------------------------

/**
 * Extract the ownerPairKey from an edge ID.
 * Edge ID format: "startVertexKey->endVertexKey:ownerPairKey"
 */
function extractOwnerPairKey(edgeId: string): string {
    const arrowIdx = edgeId.indexOf('->');
    const colonIdx = edgeId.indexOf(':', arrowIdx);
    if (arrowIdx < 0 || colonIdx < 0) return edgeId;
    return edgeId.substring(colonIdx + 1);
}

/**
 * Get the midpoint of an edge's curve for proximity matching.
 * Using midpoint is more robust than endpoints because Voronoi
 * junction vertices shift more than interior curve points.
 */
function edgeMidpoint(edge: CanonicalEdge): [number, number] {
    const pts = edge.curvePoints;
    const midIdx = Math.floor(pts.length / 2);
    return pts[midIdx];
}

/**
 * Get both endpoint vertices of an edge for proximity matching.
 */
function edgeEndpoints(edge: CanonicalEdge): { start: [number, number]; end: [number, number] } {
    const pts = edge.curvePoints;
    return {
        start: pts[0],
        end: pts[pts.length - 1],
    };
}

/**
 * Distance squared between two points.
 */
function dist2(a: [number, number], b: [number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

/**
 * Compare two edges' curve geometry.
 * Returns true if they have the same point count and all points are
 * within epsilon distance.
 */
function curvesEqual(a: CanonicalEdge, b: CanonicalEdge, epsilon: number = 1.0): boolean {
    if (a.curvePoints.length !== b.curvePoints.length) return false;
    const eps2 = epsilon * epsilon;
    for (let i = 0; i < a.curvePoints.length; i++) {
        if (dist2(a.curvePoints[i], b.curvePoints[i]) > eps2) return false;
    }
    return true;
}

/**
 * Check if two edges' curves are similar enough to consider "same edge"
 * even if point counts differ. Uses arc midpoint proximity.
 */
function edgesProximateMatch(a: CanonicalEdge, b: CanonicalEdge, threshold: number = 15): boolean {
    const midA = edgeMidpoint(a);
    const midB = edgeMidpoint(b);
    if (dist2(midA, midB) > threshold * threshold) return false;
    // Also check endpoints are reasonably close
    const epA = edgeEndpoints(a);
    const epB = edgeEndpoints(b);
    const thr2 = threshold * threshold;
    // Check both orientations (edge may be traversed in opposite direction)
    const fwdMatch = dist2(epA.start, epB.start) < thr2 && dist2(epA.end, epB.end) < thr2;
    const revMatch = dist2(epA.start, epB.end) < thr2 && dist2(epA.end, epB.start) < thr2;
    return fwdMatch || revMatch;
}

// ---------------------------------------------------------------------------
// Main differ
// ---------------------------------------------------------------------------

/**
 * Diff two TerritoryFrontierMaps by edge identity.
 *
 * Matching strategy:
 * 1. Group edges by ownerPairKey (stable across frames)
 * 2. Within each owner pair group, match by endpoint proximity
 * 3. Matched pairs: compare geometry → unchanged vs modified
 * 4. Unmatched prev edges → deleted
 * 5. Unmatched next edges → inserted
 * 6. Anchor vertices = vertices bordering any changed edge
 * 7. Affected loops = loops containing any changed edge
 */
export function diffFrontierMaps(
    prev: TerritoryFrontierMap,
    next: TerritoryFrontierMap,
): FrontierMapDiff {
    const unchangedEdgeIds = new Set<string>();
    const modifiedEdgeIds = new Set<string>();
    const deletedEdgeIds = new Set<string>();
    const insertedEdgeIds = new Set<string>();
    const anchorVertexIds = new Set<string>();
    const affectedLoopIds = new Set<string>();

    // Group edges by ownerPairKey
    const prevByOwnerPair = new Map<string, CanonicalEdge[]>();
    const nextByOwnerPair = new Map<string, CanonicalEdge[]>();

    for (const [_eid, edge] of prev.edges) {
        const opk = extractOwnerPairKey(edge.id);
        if (!prevByOwnerPair.has(opk)) prevByOwnerPair.set(opk, []);
        prevByOwnerPair.get(opk)!.push(edge);
    }
    for (const [_eid, edge] of next.edges) {
        const opk = extractOwnerPairKey(edge.id);
        if (!nextByOwnerPair.has(opk)) nextByOwnerPair.set(opk, []);
        nextByOwnerPair.get(opk)!.push(edge);
    }

    // Track matched prev/next edge IDs to find unmatched later
    const matchedPrevIds = new Set<string>();
    const matchedNextIds = new Set<string>();

    // For each owner pair key present in both maps, match edges by proximity
    for (const [opk, prevEdges] of prevByOwnerPair) {
        const nextEdges = nextByOwnerPair.get(opk);
        if (!nextEdges) {
            // Entire owner pair deleted
            for (const pe of prevEdges) {
                deletedEdgeIds.add(pe.id);
                anchorVertexIds.add(pe.startVertexId);
                anchorVertexIds.add(pe.endVertexId);
            }
            continue;
        }

        // Match prev edges to next edges by proximity
        const usedNext = new Set<number>();
        for (const prevEdge of prevEdges) {
            let bestIdx = -1;
            let bestDist = Infinity;

            for (let ni = 0; ni < nextEdges.length; ni++) {
                if (usedNext.has(ni)) continue;
                const nextEdge = nextEdges[ni];
                if (edgesProximateMatch(prevEdge, nextEdge)) {
                    const d = dist2(edgeMidpoint(prevEdge), edgeMidpoint(nextEdge));
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = ni;
                    }
                }
            }

            if (bestIdx >= 0) {
                usedNext.add(bestIdx);
                const nextEdge = nextEdges[bestIdx];
                matchedPrevIds.add(prevEdge.id);
                matchedNextIds.add(nextEdge.id);

                if (curvesEqual(prevEdge, nextEdge)) {
                    unchangedEdgeIds.add(prevEdge.id);
                } else {
                    modifiedEdgeIds.add(prevEdge.id);
                    anchorVertexIds.add(prevEdge.startVertexId);
                    anchorVertexIds.add(prevEdge.endVertexId);
                }
            } else {
                deletedEdgeIds.add(prevEdge.id);
                anchorVertexIds.add(prevEdge.startVertexId);
                anchorVertexIds.add(prevEdge.endVertexId);
            }
        }

        // Unmatched next edges → inserted
        for (let ni = 0; ni < nextEdges.length; ni++) {
            if (!usedNext.has(ni)) {
                insertedEdgeIds.add(nextEdges[ni].id);
                anchorVertexIds.add(nextEdges[ni].startVertexId);
                anchorVertexIds.add(nextEdges[ni].endVertexId);
            }
        }
    }

    // Owner pair keys only in next → all inserted
    for (const [opk, nextEdges] of nextByOwnerPair) {
        if (!prevByOwnerPair.has(opk)) {
            for (const ne of nextEdges) {
                insertedEdgeIds.add(ne.id);
                anchorVertexIds.add(ne.startVertexId);
                anchorVertexIds.add(ne.endVertexId);
            }
        }
    }

    // Find affected loops: any loop containing a changed edge
    const changedPrevEdgeIds = new Set<string>([...modifiedEdgeIds, ...deletedEdgeIds]);
    const changedNextEdgeIds = new Set<string>(insertedEdgeIds);

    // Check prev loops
    for (const loop of prev.loops) {
        for (const eid of loop.edgeIds) {
            if (changedPrevEdgeIds.has(eid)) {
                affectedLoopIds.add(loop.loopId);
                break;
            }
        }
    }
    // Check next loops
    for (const loop of next.loops) {
        for (const eid of loop.edgeIds) {
            if (changedNextEdgeIds.has(eid)) {
                affectedLoopIds.add(loop.loopId);
                break;
            }
        }
    }

    const identical = modifiedEdgeIds.size === 0 &&
        deletedEdgeIds.size === 0 &&
        insertedEdgeIds.size === 0;

    log.sys('TMAP-Diff',
        `unchanged=${unchangedEdgeIds.size} modified=${modifiedEdgeIds.size} ` +
        `deleted=${deletedEdgeIds.size} inserted=${insertedEdgeIds.size} ` +
        `anchors=${anchorVertexIds.size} affectedLoops=${affectedLoopIds.size} ` +
        `identical=${identical}`
    );

    return {
        unchangedEdgeIds,
        modifiedEdgeIds,
        deletedEdgeIds,
        insertedEdgeIds,
        anchorVertexIds,
        affectedLoopIds,
        identical,
    };
}
