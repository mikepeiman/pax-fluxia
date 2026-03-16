/**
 * Canonical Territory Data + Render Mode Contract
 *
 * V3 Master Plan — Section 2: Two-Layer Architecture
 *   Data Engine → CanonicalTerritoryData → RenderMode
 *
 * Every data engine (FG2, future FG1/FG3/etc.) must produce
 * CanonicalTerritoryData. Every render mode must consume it.
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

/** Single source of truth for territory geometry. All render modes consume this. */
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

// ── Render mode contract ────────────────────────────────────────────────────

export type RenderModeId =
    | 'vector_stroke'
    | 'distance_field_glow'
    | 'pressure_wave'
    | 'pixel_art'
    | 'terrain_shader'
    | 'metaball'
    | 'none';

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

/**
 * Contract for all render modes.
 * Each mode handles both steady-state display and animated transitions
 * as a single continuous pipeline.
 */
export interface RenderMode {
    readonly id: RenderModeId;
    readonly label: string;

    /** Render current territory state (fills + borders) from canonical data */
    draw(data: CanonicalTerritoryData, ctx: RenderModeContext): void;

    /** Clear all cached state and graphics */
    reset(): void;
}
