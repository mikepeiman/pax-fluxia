// ---------------------------------------------------------------------------
// Localized Boundary Transition — Core Types
// ---------------------------------------------------------------------------
// These types define the data contract for the proximity-based territory
// transition pipeline. Both rings are resampled and aligned at the conquest
// origin; per-point static/dynamic classification controls which points
// interpolate vs stay bitwise-stationary.
// ---------------------------------------------------------------------------

/** 2D point. */
export interface Vec2 {
    x: number;
    y: number;
}

/** A tagged span along a boundary ring, identified by ownership and stable ID. */
export interface BoundarySpan {
    spanId: string;
    startSample: number;      // inclusive index into ring points
    endSample: number;        // exclusive index into ring points
    leftOwnerId: string;
    rightOwnerId: string | null;  // null for world-border spans
    sharedKey?: string;           // e.g. ownerPairKey from SharedPolyline
}

/** A sampled boundary ring with span metadata for splice detection. */
export interface BoundaryRingSnapshot {
    ringId: string;
    kind: 'outer' | 'hole';
    points: Vec2[];
    cumulativeLengths: number[];
    spans: BoundarySpan[];
}

/** Full boundary snapshot for one territory. */
export interface TerritoryBoundarySnapshot {
    territoryId: string;
    ownerId: string;
    starIds: string[];
    rings: BoundaryRingSnapshot[];
    fingerprint: string;
}

/** Identifies which territories are affected by the conquest. */
export interface TerritoryDeltaContext {
    changedSiteIds: Set<string>;
    affectedTerritoryIds: Set<string>;
}

/** The splice window between prev and next rings: unchanged prefix/suffix + changed window. */
export interface RingSpliceWindow {
    ringId: string;
    anchorStartPrev: number;
    anchorEndPrev: number;
    anchorStartNext: number;
    anchorEndNext: number;
    changedPrevRange: [number, number] | null;   // [start, end) sample indices
    changedNextRange: [number, number] | null;
}

/** A local morph plan for the changed patch between two junction/anchor points. */
export interface PatchMorphPlan {
    ringId: string;
    anchorA: Vec2;
    anchorB: Vec2;
    fromSamples: Vec2[];    // changed arc from prev, resampled
    toSamples: Vec2[];      // changed arc from next, resampled
    localOrigin?: Vec2;     // conquest star position for optional falloff
}

/**
 * Plan for one animated ring: per-point proximity-based static/interpolate mask.
 * Both prevSampled and targetSampled have the same length and are aligned
 * at the conquest origin (nearest point at index 0).
 */
export interface AnimatedRingPlan {
    ringId: string;
    prevSampled: Vec2[];       // prev ring, resampled & aligned at conquest
    targetSampled: Vec2[];     // next ring, resampled & aligned at conquest
    isStaticMask: boolean[];   // per-point: true = copy from prev, false = interpolate
    targetRing: BoundaryRingSnapshot;
}

/** Full transition plan for one territory. */
export interface TerritoryBoundaryTransitionPlan {
    territoryId: string;
    ownerId: string;
    durationMs: number;
    rings: AnimatedRingPlan[];
}

/** All transition plans for this tick, keyed by territory. */
export interface TerritoryTransitionPlanSet {
    plansByTerritoryId: Map<string, TerritoryBoundaryTransitionPlan>;
}

/** Per-frame output: draw-ready ring geometry. */
export interface TerritoryFrameRing {
    ringId: string;
    points: Vec2[];   // closed, draw-ready
}

/** All per-frame geometry keyed by territory. */
export interface TerritoryFrameGeometry {
    byTerritoryId: Map<string, TerritoryFrameRing[]>;
}
