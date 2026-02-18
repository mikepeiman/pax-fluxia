// ============================================================================
// FX System — Shared Types (V2)
// ============================================================================
// Context object passed to all FX handlers. Uses game time (pausable),
// VisualStateManager for safe mutation, and read-only star access.
// ============================================================================

import type { VisualStateManager } from './VisualStateManager';
import type { StarState } from '$lib/types/game.types';

/**
 * Shared context passed to every FX handler.
 * - Use `gameTime` instead of performance.now() for pause-safe animations.
 * - Use `vsm.*` methods for visual state mutation instead of raw array ops.
 */
export interface FXContext {
    /** Pausable game time in ms — stops when paused, scales with speed */
    gameTime: number;
    /** Frame delta in ms — 0 when paused */
    dt: number;
    /** Star lookup by ID (read-only for handlers) */
    starsById: Map<string, StarState>;
    /** Visual State Manager — safe mutation API */
    vsm: VisualStateManager;
    /** Effective tick duration in ms (accounting for speed multiplier) */
    effectiveTickMs: number;
    /** Unscaled wall time in ms (pause-aware but not speed-scaled) */
    wallTime: number;
}
