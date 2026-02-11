// ============================================================================
// Game Configuration - Centralized tunable game variables
// ============================================================================

import { calculateCombat as sharedCalculateCombat } from '@pax/common';
import type { EngineConfig } from '@pax/common';

/**
 * Build an EngineConfig from the current GAME_CONFIG values.
 * Used to send config to the server on room creation and
 * by the client engine when calling shared logic.
 */
export function buildEngineConfig(): EngineConfig {
    return {
        BASE_PRODUCTION: GAME_CONFIG.BASE_PRODUCTION,
        REPAIR_RATE: GAME_CONFIG.REPAIR_RATE,
        MIN_REPAIR: GAME_CONFIG.MIN_REPAIR,
        REPAIR_COMBAT_PENALTY: GAME_CONFIG.REPAIR_COMBAT_PENALTY,
        TRANSFER_RATE: GAME_CONFIG.TRANSFER_RATE,
        MIN_SHIPS_PER_TRANSFER: GAME_CONFIG.MIN_SHIPS_PER_TRANSFER,
        CONQUEST_TRANSFER_PERCENTAGE: GAME_CONFIG.CONQUEST_TRANSFER_PERCENTAGE,
        CONQUEST_DAMAGED_CAPTURE_RATE: GAME_CONFIG.CONQUEST_DAMAGED_CAPTURE_RATE,
        CONQUEST_DAMAGED_DESTROY_RATE: GAME_CONFIG.CONQUEST_DAMAGED_DESTROY_RATE,
        RETAIN_ORDER_ON_CONQUEST: GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST,
        RETREAT_CAPTURE_RATE: GAME_CONFIG.RETREAT_CAPTURE_RATE,
        SCATTER_CAPTURE_RATE: GAME_CONFIG.SCATTER_CAPTURE_RATE,
        SCATTER_DESTROY_RATE: GAME_CONFIG.SCATTER_DESTROY_RATE,
        RETREAT_DAMAGED_ACTIVATION_RATE: GAME_CONFIG.RETREAT_DAMAGED_ACTIVATION_RATE,
        DAMAGED_SHIP_EFFECTIVENESS: GAME_CONFIG.DAMAGED_SHIP_EFFECTIVENESS,
        DAMAGE_PER_SHIP: GAME_CONFIG.DAMAGE_PER_SHIP,
        LETHALITY: GAME_CONFIG.LETHALITY,
        AGGRESSOR_ADVANTAGE: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
        FORCE_RATIO_EFFECT: GAME_CONFIG.FORCE_RATIO_EFFECT,
        CONQUEST_THRESHOLD: GAME_CONFIG.CONQUEST_THRESHOLD,
        MINIMUM_DAMAGE: 1,
    };
}
/**
 * Game configuration interface for type safety
 */
interface GameConfigType {
    // Timing
    BASE_TICK_MS: number;
    MIN_TICK_MS: number;
    ANIMATION_SPEED_MS: number;

    // Transfer
    TRANSFER_RATE: number;
    MIN_SHIPS_PER_TRANSFER: number;
    MAX_SHIPS_PER_TRANSFER: number;
    TRANSFER_PULSE_INTERVAL: number;
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
    CONQUEST_DAMAGED_CAPTURE_RATE: number;  // % of damaged ships captured at conquest (0-1)
    CONQUEST_DAMAGED_DESTROY_RATE: number;  // % of damaged ships destroyed at conquest (0-1)
    OVERWHELM_THRESHOLD: number;
    CLEAR_ORDER_ON_CAPTURE: boolean;

    // Order Persistence
    ORDERS_PERSIST_AFTER_CONQUEST: boolean;

    /** When attacker conquers defender, retain attack order as movement order */
    RETAIN_ORDER_ON_CONQUEST: boolean;

    // Scatter/Retreat (on conquest)
    RETREAT_CAPTURE_RATE: number;      // % captured when defender is retreating (default 0.35)
    SCATTER_CAPTURE_RATE: number;      // % captured when escape routes exist (default 0.50)
    SCATTER_DESTROY_RATE: number;      // % of remaining destroyed on scatter (default 0.50)
    RETREAT_DAMAGED_ACTIVATION_RATE: number; // % of damaged ships activated on retreat/scatter (0-1)
    DAMAGED_SHIP_EFFECTIVENESS: number; // Fraction of damaged ships counting toward defense (1/7 ≈ 0.14)
    STARTING_SHIPS: number;            // Ships per star at game start

    // AI Behavior
    AI_ATTACK_THRESHOLD: number;       // Min ship ratio to initiate attack (e.g., 1.33 = need 33% advantage)
    AI_DESIST_THRESHOLD: number;       // Ratio at which AI stops attacking (e.g., 1.0 = retreat at parity)
    AI_RANDOM_AGGRESSION: number;      // Chance per tick to make a random attack (0-1)
    AI_TACTICAL_AGGRESSION: number;    // Chance to attack weaker target to bait others (0-1)

    // Visual
    MAX_RENDERED_SHIPS: number;
    SHIPS_PER_RING: number;
    SHIP_BASE_SIZE: number;
    TRANSFER_ANIMATION_MS: number;
    STATIC_ORBITS: boolean;  // When true, ships don't rotate around stars (performance)

    // Animation tuning
    ORBIT_BIAS_STRENGTH: number;   // How much ships cluster toward target (0=none, 1=max, default 0.6)
    DEPART_FRACTION: number;       // Fraction of half-tick spent departing (rest is travel, default 0.3)
    DEPART_JITTER_MS: number;      // Max random jitter on departure timing (ms, default 80)
    LANE_OFFSET_PX: number;        // Max perpendicular offset for lane variation (px, default 8)
    FACING_DEPARTURE: boolean;     // Ships depart from facing side (causes dance effect, default false)
    // Orbit bias oscillation
    ORBIT_BIAS_OSCILLATE: boolean; // Enable oscillation between min/max bias (default false)
    ORBIT_BIAS_MIN: number;        // Min bias strength for oscillation (default 0.0)
    ORBIT_BIAS_MAX: number;        // Max bias strength for oscillation (default 1.0)
    ORBIT_BIAS_FREQ: number;       // Oscillation frequency relative to ticks (default 1.0)
    ORB_TRAVEL: boolean;           // Ships merge into glowing orb during travel, fragment on arrival (default true)
    ORB_BASE_RADIUS: number;       // Base orb radius in px before ship count scaling (default 4)
    ORB_RADIUS_SCALE: number;      // Sqrt multiplier for ship count → radius (default 1.6)
    ORB_GLOW_MULT: number;         // Overall glow multiplier for orb layers (default 1.0)
    ORB_OUTER_ALPHA: number;       // Outer glow ring alpha (default 0.12)
    ORB_MID_ALPHA: number;         // Middle glow ring alpha (default 0.25)
    ORB_CORE_ALPHA: number;        // Inner core alpha (default 0.6)
    ORB_CENTER_ALPHA: number;      // Bright center dot alpha (default 1.0)
    ORB_OUTER_SCALE: number;       // Outer glow ring radius multiplier (default 2.5)
    ORB_MID_SCALE: number;         // Middle glow ring radius multiplier (default 1.6)
    ORB_CORE_SCALE: number;        // Core radius as fraction of base (default 0.75)

    /** How far order arrows extend along the lane (0.0-1.0, 1.0 = full distance to target edge) */
    ARROW_LENGTH_FRACTION: number;

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
    CONNECTION_SHADOW_WIDTH: number;
    CONNECTION_SHADOW_ALPHA: number;
    SHOW_CONNECTIONS: boolean;
    SHOW_HEX_GRID: boolean;
    STARS_PER_PLAYER: number;

    // Link Connectivity
    MIN_LINKS_PER_STAR: number;
    MAX_LINKS_PER_STAR: number;
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

    /** Animation interpolation speed (ms) - controls visual smoothness of tick progress.
     *  Lower = faster visual transitions. Separate from actual tick rate. */
    ANIMATION_SPEED_MS: 1200,

    // ========================================================================
    // TRANSFER MECHANICS
    // ========================================================================

    /** Percentage of ships that transfer per tick (0.0 - 1.0) */
    TRANSFER_RATE: 0.25,

    /** Minimum ships to transfer per tick */
    MIN_SHIPS_PER_TRANSFER: 1,

    /** Maximum ships to transfer per tick (0 = unlimited) */
    MAX_SHIPS_PER_TRANSFER: 0,

    /** Pulse interval (ticks between transfer batches, 1 = every tick) */
    TRANSFER_PULSE_INTERVAL: 1,

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
    AGGRESSOR_ADVANTAGE: 0.7,

    /** Base damage per engaged ship per tick. Range: 0.05-2.0 */
    DAMAGE_PER_SHIP: 0.1,

    /** Fraction of damage that destroys ships (rest disables). Range: 0-1 */
    LETHALITY: 0.25,

    /** How much numerical superiority matters. 0 = none, 1 = dominant */
    FORCE_RATIO_EFFECT: 0,

    /** Overwhelm ratio for instant conquest (need Nx enemy ships) */
    CONQUEST_THRESHOLD: 8,

    /** Fraction of damaged ships that count toward defensive force (1/7 ≈ 0.14) */
    DAMAGED_SHIP_EFFECTIVENESS: 0.14,

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

    /** Whether to clear flow order after capture - DEPRECATED, use ORDERS_PERSIST_AFTER_CONQUEST */
    CLEAR_ORDER_ON_CAPTURE: true,

    /** Default behavior: orders persist through star conquest (Ctrl-click inverts this per-order) */
    ORDERS_PERSIST_AFTER_CONQUEST: true,

    /** When attacker conquers defender, retain attack order as movement order (default: true) */
    RETAIN_ORDER_ON_CONQUEST: true,

    /** % of damaged ships captured (transferred to new owner) at conquest (0-1) */
    CONQUEST_DAMAGED_CAPTURE_RATE: 1.0,
    /** % of damaged ships destroyed at conquest (0-1) */
    CONQUEST_DAMAGED_DESTROY_RATE: 0,

    // ========================================================================
    // SCATTER / RETREAT
    // ========================================================================

    /** % of ships captured when defender is actively retreating to friendly star */
    RETREAT_CAPTURE_RATE: 0.35,

    /** % of ships captured when defender has escape routes but not retreating */
    SCATTER_CAPTURE_RATE: 0.50,

    /** % of non-captured ships destroyed during scatter (rest escape) */
    SCATTER_DESTROY_RATE: 0.50,

    /** % of damaged ships converted to active on retreat/scatter (0=stay damaged, 1=all activate) */
    RETREAT_DAMAGED_ACTIVATION_RATE: 0,


    /** Starting ships per star at game start */
    STARTING_SHIPS: 40,

    // ========================================================================
    // AI BEHAVIOR
    // ========================================================================

    /** Min ship ratio to initiate attack (1.33 = need 33% more ships than enemy) */
    AI_ATTACK_THRESHOLD: 1.33,

    /** Ship ratio at which AI stops attacking and retreats (1.0 = retreat at parity) */
    AI_DESIST_THRESHOLD: 1.0,

    /** Chance per tick to make a random attack even without advantage (0-1) */
    AI_RANDOM_AGGRESSION: 0.05,

    /** Chance to attack weaker target to bait other players (0-1) */
    AI_TACTICAL_AGGRESSION: 0.1,

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
    STATIC_ORBITS: false,

    /** How much ships cluster toward target (0=none, 1=max) */
    ORBIT_BIAS_STRENGTH: 0.6,
    /** Fraction of half-tick spent departing vs traveling */
    DEPART_FRACTION: 0.3,
    /** Max random departure jitter (ms) */
    DEPART_JITTER_MS: 80,
    /** Max perpendicular lane offset (px per side) */
    LANE_OFFSET_PX: 8,
    /** Ships depart from facing side — causes orbit dance effect (default OFF) */
    FACING_DEPARTURE: false,
    /** Enable orbit bias oscillation between min/max */
    ORBIT_BIAS_OSCILLATE: false,
    /** Min bias strength for oscillation */
    ORBIT_BIAS_MIN: 0.0,
    /** Max bias strength for oscillation */
    ORBIT_BIAS_MAX: 1.0,
    /** Oscillation frequency relative to ticks (0.25 = once per 4 ticks, 2.0 = twice per tick) */
    ORBIT_BIAS_FREQ: 1.0,
    /** Ships merge into single glowing orb during travel, fragment into ships on arrival */
    ORB_TRAVEL: true,
    /** Base orb radius in px before ship count scaling */
    ORB_BASE_RADIUS: 4,
    /** Sqrt multiplier for ship count → radius */
    ORB_RADIUS_SCALE: 1.6,
    /** Overall glow multiplier for orb layers */
    ORB_GLOW_MULT: 1.0,
    /** Outer glow ring alpha */
    ORB_OUTER_ALPHA: 0.12,
    /** Middle glow ring alpha */
    ORB_MID_ALPHA: 0.25,
    /** Inner core alpha */
    ORB_CORE_ALPHA: 0.6,
    /** Bright center dot alpha */
    ORB_CENTER_ALPHA: 1.0,
    /** Outer glow ring radius multiplier */
    ORB_OUTER_SCALE: 2.5,
    /** Middle glow ring radius multiplier */
    ORB_MID_SCALE: 1.6,
    /** Core radius as fraction of base */
    ORB_CORE_SCALE: 0.75,

    /** Order arrow length as fraction of lane distance (0.0-1.0, default 0.5 = halfway) */
    ARROW_LENGTH_FRACTION: 0.5,

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
    CONNECTION_WIDTH: 2,

    /** Connection line alpha */
    CONNECTION_ALPHA: 0.35,

    /** Connection shadow/border width (added to CONNECTION_WIDTH) */
    CONNECTION_SHADOW_WIDTH: 4,

    /** Connection shadow alpha */
    CONNECTION_SHADOW_ALPHA: 0.5,

    /** Show connection lines */
    SHOW_CONNECTIONS: true,

    /** Show hex grid (debug) */
    SHOW_HEX_GRID: false,

    /** Stars per player (Map Size) */
    STARS_PER_PLAYER: 5,

    // ========================================================================
    // LINK CONNECTIVITY
    // ========================================================================

    /** Minimum connections per star (1-3 typical) */
    MIN_LINKS_PER_STAR: 1,

    /** Maximum connections per star (4-8 typical) */
    MAX_LINKS_PER_STAR: 6,
};

/**
 * Get the current tick interval based on speed multiplier
 */
export function getTickInterval(speed: number): number {
    if (speed === 0) return Infinity;
    return Math.max(GAME_CONFIG.MIN_TICK_MS, GAME_CONFIG.BASE_TICK_MS / speed);
}

/**
 * Calculate transfer amount for a star
 */
export function calculateTransferAmount(activeShips: number): number {
    const transferAmount = Math.floor(activeShips * GAME_CONFIG.TRANSFER_RATE);
    const clamped = Math.max(GAME_CONFIG.MIN_SHIPS_PER_TRANSFER, transferAmount);

    if (GAME_CONFIG.MAX_SHIPS_PER_TRANSFER > 0) {
        return Math.min(clamped, GAME_CONFIG.MAX_SHIPS_PER_TRANSFER);
    }

    return clamped;
}

/**
 * COMBAT V4 - Wrapper around shared combat logic from @pax/common
 * 
 * This ensures single-player uses the exact same combat calculation as multiplayer.
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
    // Use the shared combat function from @pax/common for parity
    // Pass GAME_CONFIG values as overrides so UI panel sliders take effect
    const result = sharedCalculateCombat(
        sideAShips,
        sideBShips,
        sideAIsAttacking,
        sideBIsAttacking,
        {
            DAMAGE_PER_SHIP: GAME_CONFIG.DAMAGE_PER_SHIP,
            LETHALITY: GAME_CONFIG.LETHALITY,
            AGGRESSOR_ADVANTAGE: GAME_CONFIG.AGGRESSOR_ADVANTAGE,
            FORCE_RATIO_EFFECT: GAME_CONFIG.FORCE_RATIO_EFFECT,
        }
    );

    // Map the shared result format to the local expected format
    return {
        damageToA: result.killsOnA + result.disabledOnA,
        damageToB: result.killsOnB + result.disabledOnB,
        killsOnA: result.killsOnA,
        killsOnB: result.killsOnB,
        disabledOnA: result.disabledOnA,
        disabledOnB: result.disabledOnB
    };
}

