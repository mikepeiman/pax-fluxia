/**
 * powerCore — pure algorithmic core of the clean power-Voronoi territory engine.
 *
 * Phase 1 (no PIXI / d3 / Svelte / DOM / Worker). Takes already-computed power
 * (weighted Voronoi) cells as input and produces a single-source-of-truth border
 * graph plus the region loops derived FROM that graph.
 *
 * Design rationale (F-138 CORRECTIONS_GROUND_TRUTH): a power diagram tiles the
 * plane with ZERO gaps. Every historical gap was introduced downstream by editing
 * a shared border's vertices independently per polygon, and by a greedy
 * "first-unused" junction walk that mis-joins 3-way+ junctions. This module fixes
 * BOTH by construction:
 *   1. ONE `SharedEdge` object per inter-owner border — both regions reference it,
 *      so smoothing/morphing it mutates both fills identically (divergence is
 *      impossible).
 *   2. An ANGULAR-ORDER DCEL face traversal — the standard planar-subdivision rule
 *      that is provably correct at junctions of any degree.
 */

/** A 2D point. Immutable pair. */
export type Point = readonly [number, number];

/**
 * World bounds. By default the origin is (0, 0) and the extent is
 * (width, height). When the diagram was clipped to a rectangle that does NOT
 * start at the origin (e.g. 0319's padded clip [-pad … width+pad]), pass the
 * true boundary lines via minX/minY/maxX/maxY — world-edge classification
 * tests against those.
 */
export interface WorldRect {
    readonly width: number;
    readonly height: number;
    readonly minX?: number;
    readonly minY?: number;
    readonly maxX?: number;
    readonly maxY?: number;
}

/**
 * One Voronoi / power cell (exactly one per site) — the INPUT to this module.
 * `points` is the cell polygon ring; winding may be CCW or CW (both handled).
 * The ring is treated as closed (last point implicitly connects to first).
 */
export interface PowerCell {
    readonly siteId: string;
    readonly ownerId: string;
    readonly points: Point[];
}

/** Sentinel owner for the unbounded exterior / world rectangle boundary. */
export const WORLD_OWNER = 'world';

/**
 * Atomic inter-owner border unit. A SINGLE object referenced by BOTH adjacent
 * regions. `ownerA` < `ownerB` lexicographically for determinism. `pts` is the
 * raw polyline — buildSharedEdgeGraph emits exactly the 2 segment endpoints;
 * later phases may insert INTERIOR points (subdivision), but the FIRST and LAST
 * points are always the junction vertices and must never move. `smoothedPts` is
 * what loops read for their polygon (initialized to a copy of `pts`; rewritten
 * by smoothSharedEdges). Mutating `smoothedPts` updates every loop that
 * references this edge, identically.
 */
export interface SharedEdge {
    readonly edgeId: string;
    readonly ownerA: string;
    readonly ownerB: string;
    pts: Point[];
    smoothedPts: Point[];
}

/**
 * An owner↔world border (a cell edge lying on the world rectangle). The real
 * owner is on the inside; `WORLD_OWNER` is on the outside. Same `pts` /
 * `smoothedPts` convention as SharedEdge (first/last points are pinned).
 */
export interface WorldEdge {
    readonly edgeId: string;
    readonly owner: string;
    pts: Point[];
    smoothedPts: Point[];
}

/** Whether a loop traverses an edge p→q (`forward`) or q→p, and which graph it lives in. */
export interface RegionLoopEdgeRef {
    readonly edgeId: string;
    readonly forward: boolean;
    readonly kind: 'shared' | 'world';
}

/**
 * A region fill. Its polygon is NEVER stored directly — it is DERIVED from the
 * referenced edges' `smoothedPts` in traversal order (see `reconstructLoopPolygon`).
 * `loopId` is a stable hash of the SORTED set of member `starIds` (NOT centroid,
 * NOT enumeration order) so equivalent snapshots yield identical ids.
 */
export interface RegionLoop {
    readonly loopId: string;
    readonly ownerId: string;
    readonly starIds: string[];
    readonly orderedEdgeRefs: RegionLoopEdgeRef[];
}

/** The single-source border graph: every inter-owner + owner↔world edge, deduped. */
export interface SharedEdgeGraph {
    readonly sharedEdges: SharedEdge[];
    readonly worldEdges: WorldEdge[];
}
