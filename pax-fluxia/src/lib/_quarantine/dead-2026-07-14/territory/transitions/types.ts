// ---------------------------------------------------------------------------
// Localized Boundary Transition — Core Types (2-Pass Model)
// ---------------------------------------------------------------------------
// Pass 1 (topological): cyclic span matching → candidate changed window
// Pass 2 (geometric): point comparison → refined window + classification
// ---------------------------------------------------------------------------

/** 2D point. */
export interface Vec2 {
    x: number;
    y: number;
}

// ---------------------------------------------------------------------------
// Span metadata (for topological matching)
// ---------------------------------------------------------------------------

/** A tagged span along a boundary ring, identified by ownership and stable ID. */
export interface BoundarySpan {
    spanId: string;
    startSample: number;      // inclusive index into ring points
    endSample: number;        // exclusive index into ring points
    leftOwnerId: string;
    rightOwnerId: string | null;  // null for world-border spans
    sharedKey?: string;           // e.g. ownerPairKey from SharedPolyline
}

/** A sampled boundary ring with span metadata. */
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

// ---------------------------------------------------------------------------
// 2-Pass splice model
// ---------------------------------------------------------------------------

/** Result of Pass 1: topological span matching. */
export interface TopologicalSpliceResult {
    rotation: number;
    prefixLen: number;
    suffixLen: number;
    /** Candidate changed window in SPAN indices (not point indices). */
    candidateChangedPrevSpanRange: [number, number] | null;  // [startSpanIdx, endSpanIdx) in prev
    candidateChangedNextSpanRange: [number, number] | null;  // [startSpanIdx, endSpanIdx) in rotated next
    allSpansMatch: boolean;
}

/** Result of Pass 2: geometric refinement within the candidate window. */
export interface GeometricRefinementResult {
    /** Exact point index boundaries for the changed region on prev ring. */
    prevChangedRange: [number, number] | null;    // [start, end) in point indices
    /** Exact point index boundaries for the changed region on next ring. */
    nextChangedRange: [number, number] | null;    // [start, end) in point indices
    /** Static prefix: points before the changed window. */
    staticPrefixEnd: number;     // exclusive end of static prefix in prev points
    /** Static suffix: points after the changed window. */
    staticSuffixStart: number;   // inclusive start of static suffix in prev points
    /** Whether geometry outside the changed region is identical within epsilon. */
    geomEqualOutsidePatch: boolean;
}

/** Ring-local splice window used by legacy transition helpers. */
export interface RingSpliceWindow {
    ringId: string;
    anchorStartPrev: number;
    anchorEndPrev: number;
    anchorStartNext: number;
    anchorEndNext: number;
    changedPrevRange: [number, number] | null;
    changedNextRange: [number, number] | null;
}

// ---------------------------------------------------------------------------
// Ring transition classification
// ---------------------------------------------------------------------------

/**
 * Explicit classification for each ring's transition.
 * Every ring gets exactly one kind — no ambiguous "changed window" paths.
 */
export type RingTransitionKind =
    | 'unchanged'        // same topology AND geometry — no animation needed
    | 'splice-replace'   // localized boundary replacement — animate the changed arc
    | 'splice-insert'    // new boundary arc appeared (territory gained area)
    | 'splice-delete'    // boundary arc disappeared (territory lost area)
    | 'fallback-snap';   // degenerate or invalid — snap to target, no animation

/** Invariant-checked diagnostics for each ring plan. */
export interface RingPlanDiagnostics {
    kind: RingTransitionKind;
    rotation: number;
    matchedSpansPrefix: number;
    matchedSpansSuffix: number;
    prevChangedSamples: number;
    nextChangedSamples: number;
    staticSamples: number;
    anchorsPrev: [number, number];
    anchorsNext: [number, number];
    geomEqualOutsidePatch: boolean;
    valid: boolean;
    reason?: string;  // only set for invalid/fallback
}

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

/** A local morph plan for the changed patch between two anchor points. */
export interface PatchMorphPlan {
    ringId: string;
    anchorA: Vec2;
    anchorB: Vec2;
    fromSamples: Vec2[];    // changed arc from prev, resampled
    toSamples: Vec2[];      // changed arc from next, resampled
    localOrigin?: Vec2;     // conquest star position for optional falloff
}

/** Plan for one animated ring with explicit transition kind. */
export interface AnimatedRingPlan {
    ringId: string;
    kind: RingTransitionKind;
    staticSegmentsPrev: Vec2[][];   // segments from prev that stay exactly as-is
    patchMorph: PatchMorphPlan | null;
    targetRing: BoundaryRingSnapshot;
    prevRingPoints: Vec2[];         // full prev ring for fallback and diagnostics
    diagnostics: RingPlanDiagnostics;
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
