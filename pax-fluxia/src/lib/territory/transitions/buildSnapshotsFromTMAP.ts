// ---------------------------------------------------------------------------
// buildSnapshotsFromTMAP.ts — TMAP-Backed Snapshot Builder
// ---------------------------------------------------------------------------
// Alternative to buildTerritoryBoundarySnapshots that reads span identity
// directly from the TerritoryFrontierMap instead of re-deriving it via
// vertex proximity matching.
//
// Outputs the same TerritoryBoundarySnapshot[] type — drop-in replacement.
// Falls back to legacy path if frontierMap is absent.
//
// Layer: Transition (snapshot construction)
// Does NOT: render, import PIXI, modify geometry
// ---------------------------------------------------------------------------

import type { TerritoryGeometryData } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { TerritoryFrontierMap, CanonicalLoop, CanonicalEdge } from '../compiler/canonicalTypes';
import { buildTerritoryBoundarySnapshots } from './buildTerritoryBoundarySnapshots';
import type {
    Vec2,
    BoundarySpan,
    BoundaryRingSnapshot,
    TerritoryBoundarySnapshot,
} from './types';
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
 * Normalize ring start: rotate points so the lowest-x (then lowest-y) vertex
 * is first. Matches legacy normalizeRingStart for cross-frame consistency.
 */
function normalizeRingStart(points: Vec2[]): Vec2[] {
    if (points.length < 3) return points;
    let minIdx = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].x < points[minIdx].x ||
            (points[i].x === points[minIdx].x && points[i].y < points[minIdx].y)) {
            minIdx = i;
        }
    }
    if (minIdx === 0) return points;
    return [...points.slice(minIdx), ...points.slice(0, minIdx)];
}

/**
 * Generate a stable territory ID from sorted starIds.
 * Matches legacy stableTerritoryId for compatibility.
 */
function stableTerritoryId(ownerId: string, starIds: string[]): string {
    if (starIds.length === 0) return ownerId;
    return `${ownerId}:${[...starIds].sort().join(',')}`;
}

/**
 * Resolve left/right owner for a directed edge in context of a loop.
 * The loop owner is the interior (left) side.
 */
function resolveOwnerForSpan(
    edge: CanonicalEdge,
    loopOwnerId: string,
): { leftOwnerId: string; rightOwnerId: string | null } {
    // The edge already stores left/right from the TMAP builder.
    // But we need to verify the loop owner is on the left.
    if (edge.leftOwnerId === loopOwnerId) {
        return { leftOwnerId: edge.leftOwnerId, rightOwnerId: edge.rightOwnerId };
    }
    // Edge was stored with opposite direction for this loop — flip
    return {
        leftOwnerId: edge.rightOwnerId ?? edge.leftOwnerId,
        rightOwnerId: edge.leftOwnerId === 'world' ? null : edge.leftOwnerId,
    };
}

// ---------------------------------------------------------------------------
// TMAP-backed span builder
// ---------------------------------------------------------------------------

/**
 * Build BoundarySpans for a ring directly from canonical loop/edge metadata.
 * No vertex proximity matching — spans come straight from the TMAP.
 */
function buildSpansFromCanonicalLoop(
    loop: CanonicalLoop,
    edges: Map<string, CanonicalEdge>,
    ringId: string,
    points: Vec2[],
): BoundarySpan[] {
    const spans: BoundarySpan[] = [];
    let sampleIdx = 0;

    for (let i = 0; i < loop.edgeIds.length; i++) {
        const edgeId = loop.edgeIds[i];
        const edge = edges.get(edgeId);
        if (!edge) continue;

        const edgePtCount = edge.curvePoints.length;
        // First edge: all points. Subsequent: skip first (duplicate junction vertex).
        const startOffset = i === 0 ? 0 : 1;
        const spanPointCount = edgePtCount - startOffset;

        const spanStart = sampleIdx;
        sampleIdx += spanPointCount;

        const { leftOwnerId, rightOwnerId } = resolveOwnerForSpan(edge, loop.ownerId);

        // Reconstruct ownerPairKey for sharedKey compatibility
        const ownerA = edge.leftOwnerId;
        const ownerB = edge.rightOwnerId ?? 'world';
        const sharedKey = ownerA < ownerB ? `${ownerA}|${ownerB}` : `${ownerB}|${ownerA}`;

        spans.push({
            spanId: `${ringId}:span${i}`,
            startSample: spanStart,
            endSample: sampleIdx,
            leftOwnerId,
            rightOwnerId,
            sharedKey,
        });
    }

    return spans;
}

/**
 * Assemble ring points from canonical edges in loop order.
 * First edge: all curvePoints. Subsequent edges: skip first point (junction duplicate).
 */
function assembleRingPoints(
    loop: CanonicalLoop,
    edges: Map<string, CanonicalEdge>,
): Vec2[] {
    const points: Vec2[] = [];
    for (let i = 0; i < loop.edgeIds.length; i++) {
        const edge = edges.get(loop.edgeIds[i]);
        if (!edge) continue;

        if (i === 0) {
            for (const pt of edge.curvePoints) {
                points.push(toVec2(pt));
            }
        } else {
            // Skip first point (duplicate of previous edge's last point)
            for (let j = 1; j < edge.curvePoints.length; j++) {
                points.push(toVec2(edge.curvePoints[j]));
            }
        }
    }
    return points;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build transition-ready boundary snapshots using the TMAP's canonical
 * loop/edge metadata for span identity.
 *
 * Falls back to legacy `buildTerritoryBoundarySnapshots` if no frontierMap
 * is present in the geometry data.
 *
 * Outputs the same `TerritoryBoundarySnapshot[]` type — drop-in compatible.
 */
export function buildSnapshotsFromTMAP(
    geom: TerritoryGeometryData,
): TerritoryBoundarySnapshot[] {
    const { frontierMap, mergedTerritories, fingerprint } = geom;

    // Fallback to legacy path if no TMAP
    if (!frontierMap || frontierMap.loops.length === 0) {
        return buildTerritoryBoundarySnapshots(geom);
    }

    const snapshots: TerritoryBoundarySnapshot[] = [];

    // Group loops by owner for territory construction
    const loopsByOwner = new Map<string, CanonicalLoop[]>();
    for (const loop of frontierMap.loops) {
        if (!loopsByOwner.has(loop.ownerId)) loopsByOwner.set(loop.ownerId, []);
        loopsByOwner.get(loop.ownerId)!.push(loop);
    }

    // Build a starIds lookup from mergedTerritories (same owner matching)
    const ownerStarIds = new Map<string, string[][]>();
    for (const mt of mergedTerritories) {
        if (!ownerStarIds.has(mt.ownerId)) ownerStarIds.set(mt.ownerId, []);
        ownerStarIds.get(mt.ownerId)!.push(mt.starIds);
    }

    for (const [ownerId, loops] of loopsByOwner) {
        const starIdGroups = ownerStarIds.get(ownerId) ?? [[]];
        const rings: BoundaryRingSnapshot[] = [];

        for (let li = 0; li < loops.length; li++) {
            const loop = loops[li];

            // Use starIds from the matching mergedTerritory (by index or first available)
            const starIds = li < starIdGroups.length ? starIdGroups[li] : (starIdGroups[0] ?? []);
            const stableId = stableTerritoryId(ownerId, starIds);
            const ringId = `${stableId}:${loop.kind}${loop.kind === 'hole' ? li : ''}`;

            // Assemble points from canonical edges
            const rawPoints = assembleRingPoints(loop, frontierMap.edges);
            const points = normalizeRingStart(rawPoints);

            // Build spans directly from canonical loop metadata
            const spans = buildSpansFromCanonicalLoop(loop, frontierMap.edges, ringId, points);

            rings.push({
                ringId,
                kind: loop.kind === 'hole' ? 'hole' : 'outer',
                points,
                cumulativeLengths: computeCumulativeLengths(points),
                spans,
            });
        }

        // Use first loop's starIds for territory-level identity
        const starIds = starIdGroups[0] ?? [];
        const stableId = stableTerritoryId(ownerId, starIds);

        snapshots.push({
            territoryId: stableId,
            ownerId,
            starIds,
            rings,
            fingerprint,
        });
    }

    log.sys('TMAP-Snap', `Built ${snapshots.length} snapshots from TMAP (${frontierMap.loops.length} loops → ${snapshots.reduce((n, s) => n + s.rings.length, 0)} rings)`);

    return snapshots;
}
