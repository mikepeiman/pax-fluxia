/**
 * @file perimeterFieldTransitionTypes.ts
 * First-class types for the perimeter_field transition plan.
 *
 * These types form the substrate of the corrected transition architecture:
 *   - PerimeterV: the ownership/render control point (not a conquest-only construct).
 *   - TransitionPlan: the pure, immutable artifact computed once at transition start
 *     and replayed at each frame.
 *
 * Design authority:
 *   - .agent/docs/project/implementation-plans/2026-04-15/PERIMETER_FIELD_EXECUTION_PLAN_2026-04-15.md
 *   - .agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md
 *
 * Invariants (enforced by construction and validated by T1..T8 invariants):
 *   - Preserved V's: sectionId ∈ unchangedSectionIds ⇒ zero displacement across all frames.
 *   - Bijective pairing within each SpanPair after local remesh.
 *   - buildPerimeterFieldFrame(plan, t) is a pure function of (plan, t).
 */

import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';

// ─── Ownership Role ─────────────────────────────────────────────────────────

/**
 * The role a V (or mover derived from it) plays in the current conquest event.
 * Drives owner-attribution during transition playback.
 */
export type PerimeterVOwnerRole = 'loser' | 'victor' | 'neighbor';

// ─── Frontier Section Classification ────────────────────────────────────────

/**
 * How a FrontierSection relates to the kind of polyline it lives on.
 * Mirrors FrontierSectionKind in FrontierTopologyContracts for local convenience.
 */
export type PerimeterVSectionKind = 'owner_border' | 'world_border';

// ─── Perimeter Control Point ────────────────────────────────────────────────

/**
 * A perimeter control point sampled from source geometry.
 *
 * Identity:
 *   id = `v:${loopId}:${sectionId}:${indexInSection}`
 * This is deterministic from (topology, sampling parameters). Stable across
 * equivalent snapshots; changes only when the underlying section/loop changes.
 *
 * Coordinate system:
 *   World-space position is the identity for preserved-V matching. The arclength
 *   fields are placement parameters, NOT identity — arclength is meaningless as
 *   identity when the underlying polyline shape changes.
 */
export interface PerimeterV {
    /** Deterministic ID derived from loop + section + index-in-section. */
    id: string;
    /** World-space X. */
    x: number;
    /** World-space Y. */
    y: number;
    /** Owner of the region this V belongs to (its side of the section). */
    ownerId: string;
    /** Player index used by MetaballRenderer color attribution. */
    playerIdx: number;
    /** Influence strength for this V (tunable base value). */
    strength: number;
    /** The RegionLoop this V lives on. */
    loopId: string;
    /** The FrontierSection this V was sampled from. */
    sectionId: string;
    /** Deterministic index of this sample within its section-local sampling pass. */
    indexInSection: number;
    /** Which kind of section this V sits on. */
    sectionKind: PerimeterVSectionKind;
    /** Arclength position within the section polyline [0, section.length]. */
    arclengthInSection: number;
    /** Arclength position within the full loop polyline [0, loopPerimeter]. */
    arclengthInLoop: number;
    /** Inward normal unit vector x-component at this point. */
    normalX: number;
    /** Inward normal unit vector y-component at this point. */
    normalY: number;
}

// ─── Changed-Section Sets ───────────────────────────────────────────────────

/**
 * Output of the frontier-topology diff step. A section is a "changed section"
 * if its ID exists only in PREV (removed) or only in NEXT (added). Sections
 * whose IDs appear in both are structurally unchanged; V's on them are
 * guaranteed zero-displacement preserved V's.
 */
export interface ChangedSectionSets {
    readonly removedSectionIds: ReadonlySet<string>;
    readonly addedSectionIds: ReadonlySet<string>;
    readonly unchangedSectionIds: ReadonlySet<string>;
}

// ─── Unmatched Span ─────────────────────────────────────────────────────────

/**
 * A contiguous run of changed-area V's on a single loop, bounded by preserved
 * V's (anchors). If the whole loop has no preserved V's (e.g. every section on
 * that loop changed), anchorBeforeId and anchorAfterId are both null.
 */
export interface UnmatchedSpan {
    /** `span:${loopId}:${anchorBeforeId ?? '_'}:${anchorAfterId ?? '_'}`. */
    spanId: string;
    /** The loop this span lies on. */
    loopId: string;
    /** Preserved V immediately before this span in arclength order (null = whole-loop span). */
    anchorBeforeId: string | null;
    /** Preserved V immediately after this span in arclength order (null = whole-loop span). */
    anchorAfterId: string | null;
    /** V's inside this span, in arclength order. */
    vs: readonly PerimeterV[];
}

// ─── Span Pair ──────────────────────────────────────────────────────────────

/**
 * A paired PREV/NEXT unmatched span ready for local remesh. Matched by shared
 * anchor IDs (preserved-V-anchor identity is stable because unchanged sections
 * have stable IDs between PREV and NEXT).
 */
export interface SpanPair {
    /** `sp:${index}`. */
    pairId: string;
    /** Unmatched span on the PREV side. */
    prevSpan: UnmatchedSpan;
    /** Unmatched span on the NEXT side. */
    nextSpan: UnmatchedSpan;
    /** Arclength-ordered V's in PREV span (may be resampled before pairing). */
    prevVs: readonly PerimeterV[];
    /** Arclength-ordered V's in NEXT span (may be resampled before pairing). */
    nextVs: readonly PerimeterV[];
}

// ─── Motion Path ────────────────────────────────────────────────────────────

/** The kind of path a mover takes from prevPos to nextPos. */
export type TransitionMoverPathType = 'straight' | 'arc';

/**
 * A single mover: a PREV/NEXT position pair computed from unmatched-span
 * remesh, with a planned motion path that does not cross unchanged frontiers.
 */
export interface TransitionMover {
    /** `P${paddedIndex}` e.g. "P07". Deterministic within a plan. */
    moverId: string;
    /** Position at t=0. */
    prevPos: { x: number; y: number };
    /** Position at t=1. */
    nextPos: { x: number; y: number };
    /** Primary owner (used for diagnostics when prev/next owners are identical). */
    ownerId: string;
    /** Player index for the primary owner. */
    playerIdx: number;
    /** Owner and player index at t=0. */
    prevOwnerId: string;
    prevPlayerIdx: number;
    /** Owner and player index at t=1. */
    nextOwnerId: string;
    nextPlayerIdx: number;
    /** Whether this V represents the losing side, winning side, or an uninvolved neighbor. */
    ownerRole: PerimeterVOwnerRole;
    /** Influence strength for this mover. */
    strength: number;
    /** Motion path shape. */
    pathType: TransitionMoverPathType;
    /** Quadratic bezier control point for arc paths; absent for straight. */
    pathControlPoint?: { x: number; y: number };
}

// ─── Appearing / Disappearing V's ───────────────────────────────────────────

/** Reason a V exists only in NEXT. */
export type AppearingVReason =
    | 'new_section'
    | 'region_created'
    | 'dx_midpoint_added';

/** Reason a V exists only in PREV. */
export type DisappearingVReason =
    | 'section_removed'
    | 'region_eliminated'
    | 'dx_midpoint_removed';

/** A V that exists only in NEXT. Fades in over the transition at its NEXT position. */
export interface AppearingV {
    v: PerimeterV;
    reason: AppearingVReason;
}

/** A V that exists only in PREV. Fades out over the transition at its PREV position. */
export interface DisappearingV {
    v: PerimeterV;
    reason: DisappearingVReason;
}

// ─── Transition Plan ────────────────────────────────────────────────────────

/**
 * The complete, immutable transition plan computed once at transition start.
 *
 * Purity contract:
 *   The plan, together with a progress value t ∈ [0, 1], is sufficient to
 *   produce the rendered frame deterministically. No additional live-engine
 *   reads are permitted in the frame builder.
 *
 * Identity contract:
 *   conquestKey uniquely identifies this plan within a session. The same plan
 *   is re-used across every frame of the transition; only t varies.
 */
export interface TransitionPlan {
    /** Key from buildTransitionKey(input) - identifies the conquest batch. */
    conquestKey: string;
    /** All PREV V's, arclength-ordered per loop, including preserved V's. */
    prevVSet: readonly PerimeterV[];
    /** All NEXT V's, arclength-ordered per loop, including preserved V's. */
    nextVSet: readonly PerimeterV[];
    /** Set of PREV-side V IDs that are preserved across the transition. */
    preservedVIds: ReadonlySet<string>;
    /** Resolved preserved match keys (`sectionId:indexInSection`) shared by PREV and NEXT. */
    preservedMatchKeys: ReadonlySet<string>;
    /** Paired movers within unmatched spans. Bijective within each SpanPair. */
    movers: readonly TransitionMover[];
    /** NEXT-only V's (fade in). */
    appearing: readonly AppearingV[];
    /** PREV-only V's (fade out). */
    disappearing: readonly DisappearingV[];
    /** PREV geometry snapshot — carried for diagnostic/export only. */
    prevGeometry: ResolvedGeometrySnapshot;
    /** NEXT geometry snapshot — carried for diagnostic/export only. */
    nextGeometry: ResolvedGeometrySnapshot;
    /** Snapshot of the changed-section sets used to build this plan. */
    changedSections: ChangedSectionSets;
}

// ─── Diagnostic Roles ───────────────────────────────────────────────────────

/**
 * Transition role tag used for diagnostic overlays and labels. One of:
 *   - 'static'      : V on an unchanged section, outside any affected area.
 *   - 'preserved'   : V on an unchanged section inside (or adjacent to) an affected area.
 *                     Behaviourally identical to 'static' but labeled for inspection.
 *   - 'mover'       : V inside an unmatched span, driven by a TransitionMover.
 *   - 'appearing'   : V that exists only in NEXT.
 *   - 'disappearing': V that exists only in PREV.
 */
export type TransitionRole =
    | 'static'
    | 'preserved'
    | 'mover'
    | 'appearing'
    | 'disappearing';
