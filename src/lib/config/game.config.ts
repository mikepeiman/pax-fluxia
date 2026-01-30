// ============================================================================
// Game Configuration - Centralized tunable game variables
// ============================================================================

/**
 * Game configuration interface for type safety
 */
interface GameConfigType {
    // Timing
    BASE_TICK_MS: number;
    MIN_TICK_MS: number;

    // Flow
    FLOW_PERCENTAGE: number;
    MIN_FLOW_SHIPS: number;
    MAX_FLOW_SHIPS: number;

    // Combat
    DEFENSE_MULTIPLIER: number;
    DAMAGE_RATE: number;
    MIN_DAMAGE: number;
    CONQUEST_THRESHOLD: number;

    // Production
    BASE_PRODUCTION: number;
    TICKS_PER_SHIP: number;

    // Repair
    REPAIR_RATE: number;
    MIN_REPAIR: number;

    // Conquest
    CONQUEST_TRANSFER_PERCENTAGE: number;
    CLEAR_ORDER_ON_CAPTURE: boolean;

    // Visual
    MAX_RENDERED_SHIPS: number;
    SHIPS_PER_RING: number;
    SHIP_BASE_SIZE: number;
    TRANSFER_ANIMATION_MS: number;

    // Hex Grid
    HEX_RADIUS: number;
    HEX_PADDING: number;
    CONNECTION_MAX_DISTANCE: number;
    SHOW_CONNECTIONS: boolean;
    SHOW_HEX_GRID: boolean;
}

/**
 * All tunable game variables in one place.
 * These are exposed via Tweakpane for real-time balancing.
 */
export const GAME_CONFIG: GameConfigType = {
    // ========================================================================
    // TIMING
    // ========================================================================

    /** Base tick interval at 1x speed (ms) - slower = more strategic */
    BASE_TICK_MS: 1200,

    /** Minimum tick interval at max speed (ms) */
    MIN_TICK_MS: 100,

    // ========================================================================
    // FLOW MECHANICS
    // ========================================================================

    /** Percentage of ships that flow per tick (0.0 - 1.0) */
    FLOW_PERCENTAGE: 0.10,

    /** Minimum ships to flow per tick */
    MIN_FLOW_SHIPS: 1,

    /** Maximum ships to flow per tick (0 = unlimited) */
    MAX_FLOW_SHIPS: 0,

    // ========================================================================
    // COMBAT
    // ========================================================================

    /** Defense multiplier - defenders hit this many times harder */
    DEFENSE_MULTIPLIER: 2.0,

    /** Damage reduction factor per tick (0.0 - 1.0) - lower = less attrition */
    DAMAGE_RATE: 0.3,

    /** Minimum ships destroyed per combat exchange */
    MIN_DAMAGE: 1,

    /** Conquest threshold - attackers need N times defender count to capture */
    CONQUEST_THRESHOLD: 3,

    // ========================================================================
    // PRODUCTION
    // ========================================================================

    /** Base ships produced per tick (modified by star type) */
    BASE_PRODUCTION: 0.5,

    /** Production ticks required per ship at base rate */
    TICKS_PER_SHIP: 2,

    // ========================================================================
    // REPAIR
    // ========================================================================

    /** Percentage of damaged ships repaired per tick */
    REPAIR_RATE: 0.10,

    /** Minimum ships repaired per tick */
    MIN_REPAIR: 1,

    // ========================================================================
    // CONQUEST
    // ========================================================================

    /** Percentage of remaining ships that transfer on capture */
    CONQUEST_TRANSFER_PERCENTAGE: 0.5,

    /** Whether to clear flow order after capture */
    CLEAR_ORDER_ON_CAPTURE: true,

    // ========================================================================
    // VISUAL
    // ========================================================================

    /** Maximum ships to render per star */
    MAX_RENDERED_SHIPS: 200,

    /** Ships per orbital ring */
    SHIPS_PER_RING: 12,

    /** Base ship render size */
    SHIP_BASE_SIZE: 4,

    /** Ship transfer animation duration (ms) */
    TRANSFER_ANIMATION_MS: 600,

    // ========================================================================
    // HEX GRID
    // ========================================================================

    /** Hex cell radius for star positioning */
    HEX_RADIUS: 50,

    /** Edge padding for hex grid */
    HEX_PADDING: 30,

    /** Maximum distance for star connections */
    CONNECTION_MAX_DISTANCE: 150,

    /** Show connection lines */
    SHOW_CONNECTIONS: true,

    /** Show hex grid (debug) */
    SHOW_HEX_GRID: false,
};

/**
 * Get the current tick interval based on speed multiplier
 */
export function getTickInterval(speed: number): number {
    if (speed === 0) return Infinity;
    return Math.max(GAME_CONFIG.MIN_TICK_MS, GAME_CONFIG.BASE_TICK_MS / speed);
}

/**
 * Calculate flow amount for a star
 */
export function calculateFlowAmount(activeShips: number): number {
    const flowAmount = Math.floor(activeShips * GAME_CONFIG.FLOW_PERCENTAGE);
    const clamped = Math.max(GAME_CONFIG.MIN_FLOW_SHIPS, flowAmount);

    if (GAME_CONFIG.MAX_FLOW_SHIPS > 0) {
        return Math.min(clamped, GAME_CONFIG.MAX_FLOW_SHIPS);
    }

    return clamped;
}

/**
 * Calculate damage in combat (with defense multiplier)
 */
export function calculateDamage(
    attackerCount: number,
    defenderCount: number,
    isDefending: boolean
): number {
    const baseMultiplier = isDefending ? GAME_CONFIG.DEFENSE_MULTIPLIER : 1;
    const effectiveDamage = Math.min(attackerCount, defenderCount) * GAME_CONFIG.DAMAGE_RATE;
    return Math.max(GAME_CONFIG.MIN_DAMAGE, Math.floor(effectiveDamage * baseMultiplier));
}
