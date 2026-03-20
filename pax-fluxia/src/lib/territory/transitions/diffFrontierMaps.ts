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
// Edge comparison
// ---------------------------------------------------------------------------

/**
 * Compare two edges' curve geometry.
 * Returns true if they have the same point count and all points are
 * within epsilon distance.
 */
function curvesEqual(a: CanonicalEdge, b: CanonicalEdge, epsilon: number = 0.5): boolean {
    if (a.curvePoints.length !== b.curvePoints.length) return false;
    for (let i = 0; i < a.curvePoints.length; i++) {
        const dx = a.curvePoints[i][0] - b.curvePoints[i][0];
        const dy = a.curvePoints[i][1] - b.curvePoints[i][1];
        if (dx * dx + dy * dy > epsilon * epsilon) return false;
    }
    return true;
}

/**
 * Normalize an edge ID for matching across maps.
 *
 * Edge IDs are directional (`start->end:ownerPairKey`), but the same
 * physical edge may appear with opposite direction in different loops.
 * For diffing, we match by the UNDIRECTED edge identity:
 * sort the vertex IDs and combine with the ownerPairKey.
 */
function undirectedEdgeKey(edgeId: string): string {
    // Parse: "vtxA->vtxB:ownerPairKey"
    const arrowIdx = edgeId.indexOf('->');
    const colonIdx = edgeId.indexOf(':', arrowIdx);
    if (arrowIdx < 0 || colonIdx < 0) return edgeId;

    const vtxA = edgeId.substring(0, arrowIdx);
    const vtxB = edgeId.substring(arrowIdx + 2, colonIdx);
    const ownerKey = edgeId.substring(colonIdx + 1);

    // Sort vertices for undirected comparison
    const sorted = vtxA < vtxB ? `${vtxA}|${vtxB}` : `${vtxB}|${vtxA}`;
    return `${sorted}:${ownerKey}`;
}

// ---------------------------------------------------------------------------
// Main differ
// ---------------------------------------------------------------------------

/**
 * Diff two TerritoryFrontierMaps by edge identity.
 *
 * Matching strategy:
 * 1. Build undirected edge key for each edge in both maps
 * 2. Edges with same undirected key are "potentially matched"
 * 3. Compare curve geometry for matched edges → unchanged vs modified
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

    // Build undirected key → edge mapping for both maps
    const prevByUndirected = new Map<string, CanonicalEdge>();
    const nextByUndirected = new Map<string, CanonicalEdge>();

    for (const [eid, edge] of prev.edges) {
        const ukey = undirectedEdgeKey(eid);
        // If multiple directed edges share the same undirected key, keep one
        if (!prevByUndirected.has(ukey)) {
            prevByUndirected.set(ukey, edge);
        }
    }
    for (const [eid, edge] of next.edges) {
        const ukey = undirectedEdgeKey(eid);
        if (!nextByUndirected.has(ukey)) {
            nextByUndirected.set(ukey, edge);
        }
    }

    // Compare
    const matchedUndirectedKeys = new Set<string>();

    for (const [ukey, prevEdge] of prevByUndirected) {
        const nextEdge = nextByUndirected.get(ukey);
        if (nextEdge) {
            matchedUndirectedKeys.add(ukey);
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

    for (const [ukey, nextEdge] of nextByUndirected) {
        if (!matchedUndirectedKeys.has(ukey)) {
            insertedEdgeIds.add(nextEdge.id);
            anchorVertexIds.add(nextEdge.startVertexId);
            anchorVertexIds.add(nextEdge.endVertexId);
        }
    }

    // Find affected loops: any loop containing a changed edge
    const changedEdgeUndirectedKeys = new Set<string>();
    for (const eid of [...modifiedEdgeIds, ...deletedEdgeIds]) {
        changedEdgeUndirectedKeys.add(undirectedEdgeKey(eid));
    }
    for (const eid of insertedEdgeIds) {
        changedEdgeUndirectedKeys.add(undirectedEdgeKey(eid));
    }

    // Check prev loops
    for (const loop of prev.loops) {
        for (const eid of loop.edgeIds) {
            if (changedEdgeUndirectedKeys.has(undirectedEdgeKey(eid))) {
                affectedLoopIds.add(loop.loopId);
                break;
            }
        }
    }
    // Check next loops
    for (const loop of next.loops) {
        for (const eid of loop.edgeIds) {
            if (changedEdgeUndirectedKeys.has(undirectedEdgeKey(eid))) {
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
