// ---------------------------------------------------------------------------
// buildFrontierMap.ts — Canonical Frontier Map Builder
// ---------------------------------------------------------------------------
// Thin wrapper over chainWalkCore that assembles a TerritoryFrontierMap
// from the shared chain-walk result. Does NOT duplicate the walk logic.
//
// Layer: Geometry (compiler output)
// Does NOT: render, import PIXI, mutate inputs, change existing outputs
// ---------------------------------------------------------------------------

import type { SharedPolyline } from './powerVoronoiTerritoryGeometryGenerator';
import { ptKey } from './powerVoronoiTerritoryGeometryGenerator';
import { executeChainWalk } from './chainWalkCore';
import type { ChainWalkResult, ChainWalkLoop, ChainWalkSegment } from './chainWalkCore';
import type {
    CanonicalVertex,
    CanonicalVertexKind,
    CanonicalEdge,
    CanonicalLoop,
    CanonicalLoopValidity,
    TerritoryFrontierMap,
} from './canonicalTypes';
import { log } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Classify a vertex by its topological role.
 */
function classifyVertex(
    key: string,
    junctionVertexKeys: Set<string>,
    worldEndpoints: Set<string>,
    closureVertices: Set<string>,
): CanonicalVertexKind {
    if (junctionVertexKeys.has(key)) return 'junction-3way';
    if (worldEndpoints.has(key)) return 'frontier-mapedge';
    if (closureVertices.has(key)) return 'loop-closure';
    return 'endpoint';
}

/**
 * Build the set of polyline endpoint keys from world-border polylines.
 */
function collectWorldEndpoints(worldBorderPolylines: SharedPolyline[]): Set<string> {
    const eps = new Set<string>();
    for (const pl of worldBorderPolylines) {
        if (pl.points.length < 2) continue;
        eps.add(ptKey(pl.points[0][0], pl.points[0][1]));
        eps.add(ptKey(pl.points[pl.points.length - 1][0], pl.points[pl.points.length - 1][1]));
    }
    return eps;
}

/**
 * Resolve left/right owner for a directed edge in the context of a loop.
 * The loop owner is always the "interior" (left) side.
 */
function resolveOwnerSides(
    ownerPairKey: string,
    loopOwnerId: string,
): { leftOwnerId: string; rightOwnerId: string | null } {
    const [a, b] = ownerPairKey.split('|');
    if (a === loopOwnerId) {
        return { leftOwnerId: a, rightOwnerId: b === 'world' ? null : b };
    }
    return { leftOwnerId: b, rightOwnerId: a === 'world' ? null : a };
}

/**
 * Generate a stable edge ID from segment data.
 */
function edgeIdFromSegment(seg: ChainWalkSegment): string {
    return `${seg.startVertexKey}->${seg.endVertexKey}:${seg.ownerPairKey}`;
}

/**
 * Determine loop validity from the chain walk closure status.
 */
function loopValidity(loop: ChainWalkLoop): CanonicalLoopValidity {
    if (loop.closed) return 'valid-closed';
    return 'partial-open';
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Build a TerritoryFrontierMap from the same shared chain-walk core
 * that constructFillsFromFrontierChain uses.
 *
 * This consumes the same ChainWalkResult — no duplicated walk logic.
 * The result is emitted alongside (not instead of) existing outputs.
 *
 * @param sharedPolylines       Chaikin-smoothed owner-owner border polylines
 * @param worldBorderPolylines  World-boundary edge polylines
 * @param junctionVertexKeys    Set of ptKeys for 3+ cell vertices (from extractJunctionVertices)
 * @param fingerprint           Geometry fingerprint for change detection
 */
export function buildFrontierMap(
    sharedPolylines: SharedPolyline[],
    worldBorderPolylines: SharedPolyline[],
    junctionVertexKeys: Set<string>,
    fingerprint: string,
): TerritoryFrontierMap {
    const vertices = new Map<string, CanonicalVertex>();
    const edges = new Map<string, CanonicalEdge>();
    const loops: CanonicalLoop[] = [];

    // Execute the shared chain walk (same walk as constructFillsFromFrontierChain)
    const walkResult = executeChainWalk(sharedPolylines, worldBorderPolylines);

    if (walkResult.loops.length === 0) {
        return { vertices, edges, loops, fingerprint };
    }

    const worldEndpoints = collectWorldEndpoints(worldBorderPolylines);

    // Collect closure vertices (headKey of each closed loop)
    const closureVertices = new Set<string>();
    for (const loop of walkResult.loops) {
        if (loop.closed && loop.junctionVertexKeys.length > 0) {
            closureVertices.add(loop.junctionVertexKeys[0]);
        }
    }

    // --- Assemble vertices ---
    // Count degree from all segments
    const vertexDegree = new Map<string, number>();
    for (const loop of walkResult.loops) {
        for (const seg of loop.segments) {
            vertexDegree.set(seg.startVertexKey, (vertexDegree.get(seg.startVertexKey) ?? 0) + 1);
            vertexDegree.set(seg.endVertexKey, (vertexDegree.get(seg.endVertexKey) ?? 0) + 1);
        }
    }

    for (const [key, degree] of vertexDegree) {
        const [xStr, yStr] = key.split(',');
        vertices.set(key, {
            id: key,
            x: parseFloat(xStr),
            y: parseFloat(yStr),
            degree,
            kind: classifyVertex(key, junctionVertexKeys, worldEndpoints, closureVertices),
        });
    }

    // --- Assemble edges and loops ---
    for (let li = 0; li < walkResult.loops.length; li++) {
        const wLoop = walkResult.loops[li];
        const loopEdgeIds: string[] = [];
        const loopVertexIds: string[] = [];

        for (const seg of wLoop.segments) {
            const eid = edgeIdFromSegment(seg);
            const sides = resolveOwnerSides(seg.ownerPairKey, wLoop.ownerId);
            const isWorld = seg.ownerPairKey.includes('world');

            if (!edges.has(eid)) {
                edges.set(eid, {
                    id: eid,
                    startVertexId: seg.startVertexKey,
                    endVertexId: seg.endVertexKey,
                    leftOwnerId: sides.leftOwnerId,
                    rightOwnerId: sides.rightOwnerId,
                    kind: isWorld ? 'owner-world' : 'owner-owner',
                    curvePoints: seg.points,
                    sourcePolylineIdx: seg.polylineIdx,
                    orientation: seg.direction,
                });
            }

            loopEdgeIds.push(eid);
            loopVertexIds.push(seg.startVertexKey);
        }

        loops.push({
            loopId: `${wLoop.ownerId}:${li}`,
            ownerId: wLoop.ownerId,
            kind: 'outer', // enclave detection can reclassify in Phase 2
            edgeIds: loopEdgeIds,
            vertexIds: loopVertexIds,
            validity: loopValidity(wLoop),
        });
    }

    log.renderer('TMAP', `vertices=${vertices.size} edges=${edges.size} loops=${loops.length} (${loops.filter(l => l.validity === 'valid-closed').length} valid-closed, ${loops.filter(l => l.validity === 'partial-open').length} partial-open)`);

    return { vertices, edges, loops, fingerprint };
}
