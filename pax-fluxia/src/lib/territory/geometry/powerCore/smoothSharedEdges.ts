/**
 * smoothSharedEdges — Chaikin corner-cutting on the border graph's shared
 * edges, with JUNCTION PINNING.
 *
 * Why pinning endpoints pins junctions: in this graph, junction vertices
 * (where 3+ owner borders meet) are always EDGE ENDPOINTS — buildSharedEdgeGraph
 * emits one edge per undirected endpoint-pair, so every spoke of a junction
 * terminates exactly at the junction vertex. Chaikin is run in OPEN-polyline
 * mode, which never moves the first or last point, therefore every edge that
 * meets a junction keeps the EXACT junction coordinate and adjacent loops stay
 * watertight (no gap can open at a junction, by construction).
 *
 * Only SharedEdges are smoothed. WorldEdges are left as straight segments so
 * the owner↔world border stays exactly on the world rectangle; their endpoints
 * coincide with pinned shared-edge endpoints, so the seam is still exact.
 *
 * The corner-cutting itself is the frontier pipeline's Chaikin
 * (smoothTerritoryFrontierPolyline / chaikinOnce in
 * src/lib/territory/frontier/chaikin.ts), imported rather than duplicated. Its
 * open-mode pass emits [p0, 25%/75% points per segment..., pN] — endpoints are
 * copied verbatim, which is precisely the pinning we rely on.
 */

import { smoothTerritoryFrontierPolyline } from '../../frontier/chaikin';
import type { Point, SharedEdgeGraph } from './powerCoreTypes';

/**
 * Open-polyline Chaikin with pinned endpoints. Pure: returns a NEW array;
 * passes <= 0 (or fewer than 3 points) returns an identical copy of the input.
 * Exported for direct testing.
 */
export function chaikinOpenPinned(points: readonly Point[], passes: number): Point[] {
    if (passes <= 0 || points.length < 3) {
        return points.map((p) => [p[0], p[1]] as Point);
    }
    const flat: number[] = [];
    for (const p of points) flat.push(p[0], p[1]);
    const smoothed = smoothTerritoryFrontierPolyline(
        { points: flat, closed: false },
        passes,
    );
    const out: Point[] = [];
    for (let i = 0; i < smoothed.points.length; i += 2) {
        out.push([smoothed.points[i], smoothed.points[i + 1]]);
    }
    return out;
}

/**
 * Rewrite every SharedEdge's `smoothedPts` as Chaikin(pts, passes) with pinned
 * endpoints (see module header). `passes = 0` resets smoothedPts to an exact
 * copy of pts. Deterministic: output depends only on (pts, passes).
 *
 * Mutates the graph in place — every RegionLoop referencing an edge sees the
 * new points on its next reconstructLoopPolygon, both sides identically (the
 * single-source invariant).
 */
export function smoothSharedEdges(graph: SharedEdgeGraph, passes: number): void {
    for (const edge of graph.sharedEdges) {
        edge.smoothedPts = chaikinOpenPinned(edge.pts, passes);
    }
}
