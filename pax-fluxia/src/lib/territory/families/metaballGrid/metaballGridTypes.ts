/**
 * metaball-grid — type contracts (MG1)
 *
 * Additive render family. Not a replacement for perimeter_field.
 *
 * Two-layer architecture (per ./METABALL_GRID_MODE_PLAN_2026-04-17.md):
 *
 *  1. Ownership-geometry truth underlayer (`CanonicalGeometrySnapshot`,
 *     authoritative — e.g. tuned `power_voronoi_0319`).
 *  2. Visual-truth grid layer — a fixed, world-anchored grid of vstars with
 *     PREV and NEXT owner resolved by point-in-polygon against the
 *     `territoryRegions` of each snapshot. A wave planner assigns each
 *     dispossessed vstar a `flipTime ∈ [0, 1]`, and a scene builder emits
 *     per-frame `{colorIdx, alpha, strength}` for each grid vstar.
 *
 * The underlayer is never mutated by this layer.
 */

import type { ConquestEvent } from '@pax/common';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';

// ─────────────────────────────────────────────────────────────────────────────
// Config option unions — mirror `METABALL_GRID_*` keys in `game.config.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export type GridOriginMode = 'centered' | 'corner';

/**
 * Cell-position distribution mode. `square` is the classical row-major grid.
 * `hex_offset` shifts odd rows by half-spacing to produce honeycomb packing
 * (pairs naturally with `METABALL_GRID_CELL_SHAPE === 'hex'`). `jittered`
 * applies a deterministic per-cell scatter whose amplitude is controlled by
 * `METABALL_GRID_POSITION_JITTER` (fraction of spacing).
 */
export type GridDistribution = 'square' | 'hex_offset' | 'jittered';

/** BFS connectivity used by `grid_bfs` wave geometry. */
export type GridAdjacency = '4' | '8';

/** Rank source for flip-time assignment. */
export type GridWaveGeometry = 'grid_bfs' | 'euclidean_band';

/** Which cells seed the wave for an event. */
export type GridWaveSeeding =
    | 'winner_natives'
    | 'conquered_star_center'
    | 'winner_nearest_edge';

/** Per-cell flip style at `flipTime`. */
export type GridFlipTransition = 'hard' | 'lerp_per_cell' | 'dual_pass_blend';

// ─────────────────────────────────────────────────────────────────────────────
// Role classification.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Role of a grid vstar in a PREV→NEXT ownership transition.
 *
 * - `native` — `prevOwnerId === nextOwnerId`, non-null. Never changes.
 * - `dispossessed` — both defined and different. Participates in a wave.
 * - `emergent` — `prevOwnerId === null`, `nextOwnerId !== null`. Treated as
 *   dispossessed with PREV alpha = 0.
 * - `vacating` — `prevOwnerId !== null`, `nextOwnerId === null`. Treated as
 *   dispossessed with NEXT alpha = 0.
 * - `outside` — both null. Not emitted into the metaball field.
 */
export type GridVRole = 'native' | 'dispossessed' | 'emergent' | 'vacating' | 'outside';

// ─────────────────────────────────────────────────────────────────────────────
// Grid vstar.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One vertex of the world-anchored visual grid. Positions are fixed for the
 * session; classification is refreshed per conquest.
 */
export interface GridVStar {
    /** Deterministic id: `g:${ix}:${iy}`. */
    readonly id: string;
    /** Column index in the grid (0-based). */
    readonly ix: number;
    /** Row index in the grid (0-based). */
    readonly iy: number;
    /** World-space x (px). */
    readonly x: number;
    /** World-space y (px). */
    readonly y: number;
    /** Owner under PREV snapshot, or null if no region contains this point. */
    readonly prevOwnerId: string | null;
    /** Owner under NEXT snapshot, or null if no region contains this point. */
    readonly nextOwnerId: string | null;
    /** Role under this PREV→NEXT transition. */
    readonly role: GridVRole;
    /** For dispossessed/emergent/vacating cells, the attributed event id. */
    readonly eventId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification result.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Output of `buildGridClassification`. Deterministic and pure: identical inputs
 * produce identical outputs.
 */
export interface GridClassification {
    /** Column count: `ceil(width / spacing)`. */
    readonly cols: number;
    /** Row count: `ceil(height / spacing)`. */
    readonly rows: number;
    /**
     * Spacing actually used to build this classification, in world px. Equal to
     * the requested spacing unless the `METABALL_GRID_MAX_CELLS` cap coarsened
     * it. See `requestedSpacingPx` for the uncoarsened input.
     */
    readonly spacingPx: number;
    /** Spacing as requested by the caller (before maxCells coarsening). */
    readonly requestedSpacingPx: number;
    /** Origin offset mode used. */
    readonly originMode: GridOriginMode;
    /** Distribution mode used when computing cell positions. */
    readonly distribution: GridDistribution;
    /** All grid vstars in row-major order (`iy * cols + ix`). */
    readonly vstars: readonly GridVStar[];
    /**
     * PERF-hot path: vstars that can contribute to the metaball field at
     * any progress value (native + dispossessed + emergent + vacating).
     * Excludes only `outside`. The per-frame scene builder iterates this
     * array instead of all `vstars`, skipping the null-null cells that
     * would early-return anyway.
     */
    readonly emittableVstars: readonly GridVStar[];
    /** By-role bins, each carrying vstar ids (not positions) for fast iteration. */
    readonly byRole: Readonly<Record<GridVRole, readonly string[]>>;
    /** `eventId → dispossessed vstar ids`, including the synthetic default bucket. */
    readonly dispossessedByEventId: Readonly<Record<string, readonly string[]>>;
    /** Synthetic default event id used for unmatched `(prev, next)` pairs. */
    readonly defaultEventId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave plan.
// ─────────────────────────────────────────────────────────────────────────────

/** Per-event wave plan: flip-time rank for each dispossessed vstar of the event. */
export interface GridWavePlanEvent {
    /** Attributed conquest event id. */
    readonly eventId: string;
    /** Seeding option used when the plan was built. */
    readonly seeding: GridWaveSeeding;
    /** Wave geometry option used when the plan was built. */
    readonly geometry: GridWaveGeometry;
    /** Adjacency option used when the plan was built (only meaningful for `grid_bfs`). */
    readonly adjacency: GridAdjacency;
    /** Max rank across the event (used to normalize `flipTime`). */
    readonly maxRank: number;
    /**
     * `gridVStar.id → flipTime ∈ [0, 1]`.
     * Ties broken deterministically by `(gridIy, gridIx)`.
     */
    readonly flipTimeByVId: ReadonlyMap<string, number>;
    /** Seed vstar ids (flipTime = 0), exposed for diagnostics. */
    readonly seedVIds: readonly string[];
}

/** Full wave plan for one transition (all events). */
export interface GridWavePlan {
    /** Per-event sub-plans, ordered by input event order. */
    readonly perEvent: readonly GridWavePlanEvent[];
    /** Flat lookup: `gridVStar.id → flipTime ∈ [0, 1]`. Natives absent. */
    readonly flipTimeByVId: ReadonlyMap<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition truth payload (captured upstream at conquest start).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic truth payload for one metaball-grid transition. Produced by
 * the canvas upstream layer (MG5) and consumed by `MetaballGridFamily`.
 *
 * Structurally analogous to `PerimeterFieldTransitionTruth` but with a grid
 * classification and wave plan in place of perimeter section plans.
 */
export interface GridMetaballTransitionTruth {
    /** Stable key: tick-scoped, stable across replays (e.g. `t=${tick}:c=${starIdsSorted}`). */
    readonly conquestKey: string;
    /** PREV ownership geometry snapshot. */
    readonly prevGeometry: CanonicalGeometrySnapshot;
    /** NEXT ownership geometry snapshot. */
    readonly nextGeometry: CanonicalGeometrySnapshot;
    /** Deterministic ordered conquest events this transition covers. */
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    /** Classification under PREV and NEXT. */
    readonly classification: GridClassification;
    /** Wave plan derived from the classification + config. */
    readonly wavePlan: GridWavePlan;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-frame renderable cell.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One renderable contribution to the metaball field at a given `progress`.
 * Produced by `renderMetaballGridScene`.
 *
 * For `dual_pass_blend`, two `GridRenderCell`s may be emitted per vstar
 * (one PREV-side, one NEXT-side) with `pass` marking which side.
 */
export interface GridRenderCell {
    /** Source vstar id. */
    readonly vId: string;
    /** World-space x. */
    readonly x: number;
    /** World-space y. */
    readonly y: number;
    /** Owner color palette index this cell contributes. */
    readonly colorIdx: number;
    /** Alpha 0..1. */
    readonly alpha: number;
    /** Metaball influence strength for this cell. */
    readonly strength: number;
    /** For `dual_pass_blend`: which side this cell represents. */
    readonly pass: 'single' | 'prev' | 'next';
}

/** Complete scene emitted per frame. */
export interface GridMetaballScene {
    /** Scrub position this scene was built at, `∈ [0, 1]`. */
    readonly progress: number;
    /**
     * Emitted cells: native (every frame, static NEXT color) + active roles
     * (dispossessed / emergent / vacating) under their flip mechanics.
     * Outside cells are never emitted.
     */
    readonly cells: readonly GridRenderCell[];
    /** Flip style the scene was built under. */
    readonly flipTransition: GridFlipTransition;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build-input bundles (keep external callers terse).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ownership snapshot of a star at one of the PREV/NEXT time points. Used for
 * nearest-owned-star fallback when polygon coverage has gaps created by
 * minimum-star-margin clearance, including MSR-style moats in the source geometry.
 */
export interface GridOwnedStar {
    readonly id: string;
    readonly ownerId: string;
    readonly x: number;
    readonly y: number;
}

export interface BuildGridClassificationParams {
    readonly world: { width: number; height: number };
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly nextGeometry: CanonicalGeometrySnapshot;
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    /**
     * Resolver for conquested-star world position given `starId`. Used for
     * tiebreak during event attribution. Returning `null` falls back to
     * first-match event.
     */
    readonly resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
    /**
     * Owned stars under PREV snapshot. When provided, cells that fall outside
     * every PREV polygon but are within `coverageRadiusPx` of an owned star
     * inherit that star's owner. This fills geometry gaps left around stars,
     * including weighted-voronoi MSR holes, so the grid layer remains continuous.
     */
    readonly prevOwnedStars?: ReadonlyArray<GridOwnedStar>;
    /** Owned stars under NEXT snapshot — same behavior as `prevOwnedStars`. */
    readonly nextOwnedStars?: ReadonlyArray<GridOwnedStar>;
    /**
     * Max distance (world px) a grid cell may be from an owned star to
     * inherit its owner via the nearest-star fallback. Cells farther than
     * this from any owned star remain `outside`. Default: 3 × spacingPx.
     */
    readonly coverageRadiusPx?: number;
    /**
     * Hard cap on total cell count (cols × rows). When the grid built from
     * `spacingPx` would exceed this, the builder coarsens spacing upward to
     * stay under the cap. The effective spacing is reported as
     * `GridClassification.spacingPx`; the requested spacing is preserved as
     * `requestedSpacingPx`. Default: no cap.
     */
    readonly maxCells?: number;
    /**
     * Distribution mode for cell positions. See {@link GridDistribution}.
     * Default: `'square'`.
     */
    readonly distribution?: GridDistribution;
    /**
     * Deterministic per-cell position scatter, expressed as a fraction of
     * spacing. 0 = none; 0.5 ≈ neighbours can overlap. Seeded by `(ix, iy)`
     * so positions are stable across frames and sessions. Only applied when
     * `distribution === 'jittered'`. Default: 0.
     */
    readonly positionJitter?: number;
}

export interface PlanGridWaveParams {
    readonly classification: GridClassification;
    readonly seeding: GridWaveSeeding;
    readonly geometry: GridWaveGeometry;
    readonly adjacency: GridAdjacency;
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    readonly resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}

export interface RenderMetaballGridSceneParams {
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly progress: number;
    readonly flipTransition: GridFlipTransition;
    readonly flipWindow: number;
    readonly strength: number;
    readonly inwardOffsetPx: number;
    /** Owner id → palette color index. */
    readonly ownerColorIdx: ReadonlyMap<string, number>;
}
