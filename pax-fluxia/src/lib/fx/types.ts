// ============================================================================
// FX System — Shared Types
// ============================================================================
// Context object passed to all FX handlers so they can read/write shared
// animation state without coupling to GameCanvas.svelte internals.
// ============================================================================

import type { VisualShipState } from '$lib/utils/render.utils';
import type { StarState } from '$lib/types/game.types';

/**
 * Shared context passed to every FX handler.
 * Handlers read/write these maps to manage visual animation state.
 */
export interface FXContext {
    /** Current high-resolution timestamp (performance.now()) */
    now: number;
    /** Star lookup by ID */
    starsById: Map<string, StarState>;
    /** Per-star visual ship arrays (orbit ships) */
    visualShips: Map<string, VisualShipState[]>;
    /** Ships currently in transit (departing/traveling/arriving) */
    travelingShips: VisualShipState[];
    /** Stars currently engaged in combat (for surge animation) */
    starsInCombat: Set<string>;
    /** Pending conquest color delays (star keeps old owner color until ships arrive) */
    pendingConquests: Map<string, { previousOwner: string; transitionTime: number }>;
    /** Active conquest flash effects (bright white pulse on conquered star) */
    conquestFlashes: Map<string, { startTime: number; duration: number }>;
    /** Effective tick duration in ms (accounting for speed multiplier) */
    effectiveTickMs: number;
}
