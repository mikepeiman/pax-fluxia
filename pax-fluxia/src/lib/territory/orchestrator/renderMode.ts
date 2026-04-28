/**
 * V3.1 Three-Concern Territory Architecture
 *
 * Three independent contracts:
 *   1. TerritoryStyle  — how fills/borders look (steady state)
 *   2. FillTransition   — how fills animate on conquest
 *   3. BorderTransition — how borders animate on conquest
 *
 * All consume CanonicalTerritoryData from the data engine.
 * Transitions transform data; styles render data.
 */

import type * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';

// ── Canonical data produced by the data engine ──────────────────────────────

export interface CanonicalShell {
    shellId: string;
    ownerId: string;
    points: [number, number][];
    area: number;
    absArea: number;
    confidence: number;
    holeLoopIds: string[];
}

export interface CanonicalShellLoop {
    shellLoopId: string;
    ownerId: string;
    points: [number, number][];
    classification: string;
}

export interface CanonicalAnimatedShell {
    shellId: string;
    ownerId: string;
    points: [number, number][];
    area: number;
    absArea: number;
    confidence: number;
    holeLoops: Array<{ holeLoopId: string; points: [number, number][] }>;
}

/** Single source of truth for territory geometry. All concerns consume this. */
export interface CanonicalTerritoryData {
    /** Closed polygons per player territory — each shell is one connected region */
    shells: CanonicalShell[];
    /** Individual loops with classification (outer/hole) */
    shellLoops: CanonicalShellLoop[];
    /** Interpolated shells during ownership transitions */
    animatedShells: CanonicalAnimatedShell[];
    /** Whether a transition animation is currently active */
    transitionActive: boolean;
}

// ── ID unions ───────────────────────────────────────────────────────────────

/** How territories look in steady state */
export type TerritoryStyleId =
    | 'vector_stroke'
    | 'distance_field_glow'
    | 'pixel_art'
    | 'metaball'
    | 'pressure_wave'
    | 'terrain_shader';

/** How fills animate during conquest */
export type FillTransitionId =
    | 'legacy_fill_active_front'
    | 'topology_fill_rebuild'
    | 'legacy_fill_crossfade'
    | 'tile_flip'
    | 'none';

/** How borders animate during conquest */
export type BorderTransitionId =
    | 'smooth_morph'
    | 'optimal_transport'
    | 'pressure_wave'
    | 'none';

// ── Shared context ──────────────────────────────────────────────────────────

export interface RenderModeTunables {
    borderWidth: number;
    borderAlpha: number;
    fillAlpha: number;
    saturation: number;
    lightness: number;
    smoothPasses: number;
    transitionMs: number;
}

export interface RenderModeContext {
    container: PIXI.Container;
    colorUtils: ColorUtils;
    worldWidth: number;
    worldHeight: number;
    tunables: RenderModeTunables;
}

// ── Three independent contracts ─────────────────────────────────────────────

/**
 * Concern 1: How territories look in steady state (fills + borders).
 * The style always does the final rendering — transitions just feed it data.
 */
export interface TerritoryStyle {
    readonly id: TerritoryStyleId;
    readonly label: string;

    /** Render current territory state (fills + borders) from canonical data */
    draw(data: CanonicalTerritoryData, ctx: RenderModeContext): void;

    /** Clear all cached state and graphics */
    reset(): void;
}

/**
 * Concern 2: How fills transition during conquest.
 * Produces modified canonical data — the style draws it.
 */
export interface FillTransition {
    readonly id: FillTransitionId;
    readonly label: string;

    /** Interpolate fill data from old → new state. progress: 0..1 */
    interpolate(
        oldData: CanonicalTerritoryData,
        newData: CanonicalTerritoryData,
        progress: number,
    ): CanonicalTerritoryData;
}

/**
 * Concern 3: How borders transition during conquest.
 * Produces modified canonical data — the style draws it.
 */
export interface BorderTransition {
    readonly id: BorderTransitionId;
    readonly label: string;

    /** Interpolate border data from old → new state. progress: 0..1 */
    interpolate(
        oldData: CanonicalTerritoryData,
        newData: CanonicalTerritoryData,
        progress: number,
    ): CanonicalTerritoryData;
}

// ── Legacy compat (kept for existing PVV3 consumer) ─────────────────────────

/** @deprecated Use TerritoryStyleId instead */
export type RenderModeId = TerritoryStyleId | 'none';

/** @deprecated Use TerritoryStyle instead */
export interface RenderMode {
    readonly id: RenderModeId;
    readonly label: string;
    draw(data: CanonicalTerritoryData, ctx: RenderModeContext): void;
    reset(): void;
}
