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
    FLOW_PULSE_FREQUENCY: number;
    FLEET_SPEED: number;

    // Combat V4 - Symmetric Model
    AGGRESSOR_ADVANTAGE: number;    // Tilts damage toward attacker (>1) or defender (<1)
    DAMAGE_PER_SHIP: number;        // Base damage output per engaged ship
    LETHALITY: number;              // % of damage that destroys (rest disables)
    FORCE_RATIO_EFFECT: number;     // How much numerical superiority matters
    CONQUEST_THRESHOLD: number;     // Overwhelm ratio for instant capture

    // Production
    BASE_PRODUCTION: number;
    TICKS_PER_SHIP: number;

    // Repair
    REPAIR_RATE: number;
    MIN_REPAIR: number;
    REPAIR_COMBAT_PENALTY: number;

    // Conquest
    CONQUEST_TRANSFER_PERCENTAGE: number;
    OVERWHELM_THRESHOLD: number;
    CLEAR_ORDER_ON_CAPTURE: boolean;

    // Visual
    MAX_RENDERED_SHIPS: number;
    SHIPS_PER_RING: number;
    SHIP_BASE_SIZE: number;
    TRANSFER_ANIMATION_MS: number;

    // Combat Legacy (kept for compatibility)
    COMBAT_MODIFIER: number;            // DEPRECATED - use DAMAGE_PER_SHIP
    CONQUEST_TRANSFER_MODIFIER: number; // Post-conquest ship transfer modifier

    // Hex Grid
    HEX_RADIUS: number;
    HEX_PADDING: number;
    CONNECTION_MAX_DISTANCE: number;
    CONNECTION_COLOR: string;
    CONNECTION_WIDTH: number;
    CONNECTION_ALPHA: number;
    SHOW_CONNECTIONS: boolean;
    SHOW_HEX_GRID: boolean;
    STARS_PER_PLAYER: number;
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
    FLOW_PERCENTAGE: 0.25,

    /** Minimum ships to flow per tick */
    MIN_FLOW_SHIPS: 1,

    /** Maximum ships to flow per tick (0 = unlimited) */
    MAX_FLOW_SHIPS: 0,

    /** Pulse frequency (ticks between flow batches, 1 = every tick) */
    FLOW_PULSE_FREQUENCY: 1,

    /** Fleet travel speed (pixels per tick) */
    FLEET_SPEED: 25,

    // ========================================================================
    // COMBAT V4 - SYMMETRIC DAMAGE MODEL
    // ========================================================================
    // Both sides take damage from the same base formula. These 5 variables
    // control the core combat experience:
    //
    // 1. AGGRESSOR_ADVANTAGE: Tilts damage ratio. >1 = attacker deals more.
    //    Both sides attacking = both get bonus (explosive battles).
    //
    // 2. DAMAGE_PER_SHIP: Base damage output per engaged ship per tick.
    //    Higher = faster kills, shorter battles.
    //
    // 3. LETHALITY: % of damage that destroys ships (rest disables).
    //    High = decisive battles. Low = attrition + repair matters.
    //
    // 4. FORCE_RATIO_EFFECT: Non-linear bonus for numerical superiority.
    //    Uses log2(ratio) so 8:1 only gives 3x bonus of 2:1.
    //
    // 5. CONQUEST_THRESHOLD: Attackers need Nx defender ships to overwhelm.
    // ========================================================================

    /** Tilts damage toward attacker (>1) or defender (<1). 1.0 = symmetric. */
    AGGRESSOR_ADVANTAGE: 1.0,

    /** Base damage per engaged ship per tick. Range: 0.05-2.0 */
    DAMAGE_PER_SHIP: 0.2,

    /** Fraction of damage that destroys ships (rest disables). Range: 0-1 */
    LETHALITY: 0.25,

    /** How much numerical superiority matters. 0 = none, 1 = dominant */
    FORCE_RATIO_EFFECT: 0.3,

    /** Overwhelm ratio for instant conquest (need Nx enemy ships) */
    CONQUEST_THRESHOLD: 7,

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
    REPAIR_RATE: 0.20,

    /** Minimum ships repaired per tick */
    MIN_REPAIR: 1,

    /** Repair multiplier when under attack (0.0 - 1.0) */
    REPAIR_COMBAT_PENALTY: 0.1,

    // ========================================================================
    // CONQUEST
    // ========================================================================

    /** Percentage of remaining ships that transfer on capture */
    CONQUEST_TRANSFER_PERCENTAGE: 50,

    /** Defender strength ratio below which they are instantly overwhelmed (e.g. 0.1 = 10% of attackers) */
    OVERWHELM_THRESHOLD: 0.1,

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
    // COMBAT V2
    // ========================================================================

    /** Global combat lethality modifier (scales damage formula) */
    COMBAT_MODIFIER: 0.1,

    /** Modifier for post-conquest ship transfer */
    CONQUEST_TRANSFER_MODIFIER: 1.0,

    // ========================================================================
    // HEX GRID
    // ========================================================================

    /** Hex cell radius for star positioning */
    HEX_RADIUS: 50,

    /** Edge padding for hex grid */
    HEX_PADDING: 50,

    /** Maximum distance for star connections */
    CONNECTION_MAX_DISTANCE: 150, // Ignored by Delaunay but kept for Types

    /** Connection line color (hex) */
    CONNECTION_COLOR: '0xffffff',

    /** Connection line width */
    CONNECTION_WIDTH: 1,

    /** Connection line alpha */
    CONNECTION_ALPHA: 0.2,

    /** Show connection lines */
    SHOW_CONNECTIONS: true,

    /** Show hex grid (debug) */
    SHOW_HEX_GRID: false,

    /** Stars per player (Map Size) */
    STARS_PER_PLAYER: 2,
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
 * COMBAT V4 - Symmetric Damage Calculation (FIXED)
 * 
 * CORRECT LOGIC:
 * - Side A and Side B exchange fire simultaneously
 * - Each side's DAMAGE OUTPUT = their ships * DAMAGE_PER_SHIP
 * - Aggressor bonus: Attacker deals more damage (not receives less)
 * - Force ratio: Larger force deals MORE damage proportionally
 * 
 * @param sideAShips - Ships on side A (typically defender)
 * @param sideBShips - Ships on side B (typically attacker)
 * @param sideAIsAttacking - Whether side A has an active attack order
 * @param sideBIsAttacking - Whether side B has an active attack order
 * @returns Object with damage to each side, split into kills and disabled
 */
export function calculateCombatV4(
    sideAShips: number,
    sideBShips: number,
    sideAIsAttacking: boolean,
    sideBIsAttacking: boolean
): {
    damageToA: number;
    damageToB: number;
    killsOnA: number;
    killsOnB: number;
    disabledOnA: number;
    disabledOnB: number;
} {
    if (sideAShips <= 0 || sideBShips <= 0) {
        return { damageToA: 0, damageToB: 0, killsOnA: 0, killsOnB: 0, disabledOnA: 0, disabledOnB: 0 };
    }

    // ========================================================================
    // DAMAGE OUTPUT CALCULATION
    // Each side's damage output = their ship count * damage per ship
    // ========================================================================
    const baseOutputA = sideAShips * GAME_CONFIG.DAMAGE_PER_SHIP;
    const baseOutputB = sideBShips * GAME_CONFIG.DAMAGE_PER_SHIP;

    // ========================================================================
    // AGGRESSOR ADVANTAGE
    // Attacking side deals MORE damage (bonus to output, not reduction to input)
    // ========================================================================
    const aggressorA = sideAIsAttacking ? GAME_CONFIG.AGGRESSOR_ADVANTAGE : 1.0;
    const aggressorB = sideBIsAttacking ? GAME_CONFIG.AGGRESSOR_ADVANTAGE : 1.0;

    const outputA = baseOutputA * aggressorA;  // A's damage output
    const outputB = baseOutputB * aggressorB;  // B's damage output

    // ========================================================================
    // FORCE RATIO MODIFIER (non-linear via log2)
    // Larger force has advantage: deals more damage, takes less
    // ========================================================================
    const ratio = Math.max(sideAShips, sideBShips) / Math.min(sideAShips, sideBShips);
    const forceBonus = 1 + (Math.log2(ratio) * GAME_CONFIG.FORCE_RATIO_EFFECT);

    const aIsLarger = sideAShips > sideBShips;

    // Larger force: output multiplied by bonus, input divided by bonus
    // Smaller force: output divided by bonus, input multiplied by bonus
    const outputModA = aIsLarger ? forceBonus : (1 / forceBonus);
    const outputModB = aIsLarger ? (1 / forceBonus) : forceBonus;

    // ========================================================================
    // FINAL DAMAGE CALCULATION
    // A's output affects B (damageToB), B's output affects A (damageToA)
    // ========================================================================
    const damageToA = Math.max(1, outputB * outputModB);  // B attacks A
    const damageToB = Math.max(1, outputA * outputModA);  // A attacks B

    // ========================================================================
    // SPLIT INTO KILLS VS DISABLED
    // Lethality determines percentage destroyed vs. converted to damaged
    // ========================================================================
    const killsOnA = Math.floor(damageToA * GAME_CONFIG.LETHALITY);
    const disabledOnA = Math.floor(damageToA * (1 - GAME_CONFIG.LETHALITY));
    const killsOnB = Math.floor(damageToB * GAME_CONFIG.LETHALITY);
    const disabledOnB = Math.floor(damageToB * (1 - GAME_CONFIG.LETHALITY));

    return { damageToA, damageToB, killsOnA, killsOnB, disabledOnA, disabledOnB };
}
