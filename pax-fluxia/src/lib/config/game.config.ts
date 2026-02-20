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
        ORDERS_PERSIST_AFTER_CONQUEST: GAME_CONFIG.ORDERS_PERSIST_AFTER_CONQUEST,
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
        ALLOW_OPPOSING_ORDERS: GAME_CONFIG.ALLOW_OPPOSING_ORDERS,
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

    // Combat V4 - Symmetric Model
    AGGRESSOR_ADVANTAGE: number;    // Tilts damage toward attacker (>1) or defender (<1)
    DAMAGE_PER_SHIP: number;        // Base damage output per engaged ship
    LETHALITY: number;              // % of damage that destroys (rest disables)
    FORCE_RATIO_EFFECT: number;     // How much numerical superiority matters
    CONQUEST_THRESHOLD: number;     // Overwhelm ratio for instant capture

    // Production
    BASE_PRODUCTION: number;

    // Repair
    REPAIR_RATE: number;
    MIN_REPAIR: number;
    REPAIR_COMBAT_PENALTY: number;

    // Conquest
    CONQUEST_TRANSFER_PERCENTAGE: number;
    CONQUEST_DAMAGED_CAPTURE_RATE: number;  // % of damaged ships captured at conquest (0-1)
    CONQUEST_DAMAGED_DESTROY_RATE: number;  // % of damaged ships destroyed at conquest (0-1)
    OVERWHELM_THRESHOLD: number;

    // Order Persistence
    ORDERS_PERSIST_AFTER_CONQUEST: boolean;

    /** When attacker conquers defender, retain attack order as movement order */
    RETAIN_ORDER_ON_CONQUEST: boolean;

    /** Allow A→B and B→A movement orders to coexist (default: false = opposing cancels) */
    ALLOW_OPPOSING_ORDERS: boolean;

    // Scatter/Retreat (on conquest)
    RETREAT_CAPTURE_RATE: number;      // % captured when defender is retreating (default 0.35)
    SCATTER_CAPTURE_RATE: number;      // % captured when escape routes exist (default 0.50)
    SCATTER_DESTROY_RATE: number;      // % of remaining destroyed on scatter (default 0.50)
    RETREAT_DAMAGED_ACTIVATION_RATE: number; // % of damaged ships activated on retreat/scatter (0-1)
    DAMAGED_SHIP_EFFECTIVENESS: number; // Fraction of damaged ships counting toward defense (1/7 ≈ 0.14)
    STARTING_SHIPS: number;            // Ships per star at game start

    // AI Behavior
    AI_MUST_ATTACK_RATIO: number;      // Power ratio at which AI MUST attack (e.g. 1.25 = 5:4 advantage)
    AI_ATTACK_UPPER_BOUNDS: number;    // Min ratio for AI to consider attacking (e.g. 0.8 = 4:5)
    AI_ATTACK_STICKINESS: number;      // 0=disengage immediately, 1=fight until one side falls (0-1)
    AI_EVALUATION_FREQUENCY: number;   // Chance per tick to evaluate decisions (0-1)
    AI_TACTICAL_AGGRESSION: number;    // Chance to target weakest neighbor (0-1)
    AI_RANDOM_AGGRESSION: number;      // Chance to ignore ratio rules and attack anyway (0-1)

    // Visual
    SHIP_BASE_SIZE: number;
    STAR_RENDER_RADIUS: number;    // Visual radius of stars on canvas (default 20)
    ORBIT_RING_MULT: number;       // Orbit ring spacing = SHIP_BASE_SIZE * ORBIT_RING_MULT (default 1.4)
    TRANSFER_ANIMATION_MS: number;
    STATIC_ORBITS: boolean;  // When true, ships don't rotate around stars (performance)
    SHOW_SELECTION_HEX: boolean;  // Show hex border on selected star (above ships)

    // Animation tuning
    ORBIT_BIAS_STRENGTH: number;   // How much ships cluster toward target (0=none, 1=max, default 0.6)
    DEPART_FRACTION: number;       // Fraction of half-tick spent departing (rest is travel, default 0.3)
    DEPART_JITTER_MS: number;      // Max random jitter on departure timing (ms, default 80)
    LANE_OFFSET_PX: number;        // Max perpendicular offset for lane variation (px, default 8)
    DEPART_MODE: 'lifo' | 'fifo' | 'nearside';  // Ship departure selection mode
    SETTLE_DURATION_MS: number;    // How fast ships snap into orbit slot (ms, default 150)
    ARRIVAL_SPREAD: number;        // Fraction of tick used to stagger arrivals (0=instant, 1=full tick, 2=2 ticks)
    WOBBLE_AMP: number;            // Amplitude of sinusoidal wobble on travel path (px, default 12)
    // Travel animation mode
    TRAVEL_MODE: 'bezier' | 'lane';  // 'bezier' = single-pass arc, 'lane' = old convergence+straight
    // Travel easing controls
    TRAVEL_EASING: 'easeInOut' | 'easeIn' | 'easeOut' | 'linear';  // Easing curve for travel arc
    TRAVEL_EASING_POWER: number;    // Easing curve steepness (1=gentle, 3=aggressive, default 2)
    TRAVEL_DURATION_MULT: number;   // Multiplier on total travel time (1=one tick, 2=two ticks, default 1)
    TRAVEL_ARC_INTENSITY: number;   // How much curvature in the bezier arc (0=straight, 1=max, default 0.5)
    // Lane convergence controls
    LANE_CONVERGENCE: number;       // How tightly ships converge to lane (0=straight to orbit slot, 1=full lane, default 1)
    LANE_CONVERGENCE_POINT: number; // Where along origin→dest center the convergence point sits (0-100, default 0)
    ORBIT_DENSITY: number;         // Ship spacing factor per ring: circumference / (BASE_SIZE * ORBIT_DENSITY). Higher = fewer per ring (default 1.5)
    ATTACK_SURGE_MULT: number;     // Attack surge displacement as fraction of star radius (default 0.4)
    ATTACK_SURGE_PROPORTIONAL: boolean; // Scale surge by force disparity ratio (default true)
    ATTACK_SURGE_FORCE_COFACTOR: number; // How much force ratio amplifies surge (0=none, 1=full, default 0.5)
    ATTACK_SURGE_RAMP_MS: number;        // Ramp-in duration for attack surge (ms, 0=instant/old behavior, default 300)
    ATTACK_SURGE_SHAPE: number;          // Surge pulse shape power (1=sine, 2=sharper peak, 0.5=flatter, default 1)
    SURGE_PULSE_DURATION_MS: number;     // Duration of one surge sine cycle (ms, default = BASE_TICK_MS)
    // Conquest animation
    CONQUEST_ANIMATION_MODE: 'immediate' | 'surge' | 'travel' | 'arrowhead'; // Strategy for transferring attacker ships to conquered star
    CONQUEST_SETTLE_MS: number;          // How long conquest ships take to settle into orbit in surge mode (ms, default 500)
    CONQUEST_SURGE_RADIUS: number;       // Initial spawn radius above orbit for surge mode (px, default 40)
    CONQUEST_SURGE_STAGGER_MS: number;   // Per-ship stagger delay for organic arrival spread (ms, default 30)
    CONQUEST_TRAVEL_SPEED: number;       // Duration multiplier vs normal transfer (lower = faster, default 0.7)
    CONQUEST_LERP_DELAY_MS: number;      // Delay before conquest ships start moving (ms, default 200)
    CONQUEST_COLOR_DELAY_MS: number;     // Delay before conquered star changes to new owner color (ms, default 400)
    CONQUEST_FLASH_DURATION_MS: number;  // Duration of bright conquest flash on star (ms, 0=disabled, default 600)
    // Arrowhead conquest animation
    ARROW_TAPER: number;                 // Wedge shape: 0=column, 1=sharp V (default 0.7)
    ARROW_WIDTH: number;                 // Base width in px (0=auto from star+orbit diameter, default 0)
    ARROW_SPEED: number;                 // Duration multiplier (lower=faster, default 0.6)
    ARROW_EASING: 'easeIn' | 'easeInOut' | 'linear'; // Travel easing (default 'easeIn' = accelerating)
    ARROW_ENGULF_MODE: 'fan' | 'collapse'; // 'fan'=surround, 'collapse'=pile on (default 'fan')
    ARROW_ENGULF_RADIUS: number;         // Initial radius around target at engulf (px, default 50)
    ARROW_SPIRAL_MIN_DEG: number;        // Min spiral degrees per ship (default 180)
    ARROW_SPIRAL_MAX_DEG: number;        // Max spiral degrees per ship (default 720)
    ARROW_SPIRAL_RANDOM: boolean;        // Random vs orderly spiral amount (default true)
    ARROW_SPIRAL_DURATION_MS: number;    // How long spiral settle lasts (ms, default 800)
    ARROW_STAGGER_MS: number;            // Per-ship delay entering formation (ms, default 20)
    // Conquest slowmo
    CONQUEST_SLOWMO_ENABLED: boolean;    // Auto-slow game when conquest fires (default true)
    CONQUEST_SLOWMO_FACTOR: number;      // How much to slow (multiplier on ANIMATION_SPEED_MS, default 5)
    CONQUEST_SLOWMO_DURATION_MS: number; // How long slowmo lasts (ms, default 5000)
    CONQUEST_FORCE_GLOW: boolean;        // Scale glow intensity by conquering force size (default true)
    CONQUEST_FORCE_GLOW_MULT: number;    // Log₂ coefficient for force glow scaling (default 0.15)
    // Orbit bias oscillation
    DEPART_STAGGER: boolean;       // Stream departure mode: ships depart at even intervals across tick (default false)
    DEPART_ARC_INTENSITY: number;  // Arc intensity during departure phase (0–1, default 0)
    ARRIVAL_ARC_INTENSITY: number; // Arc intensity during arrival phase (0–1, default 0)
    ORBIT_BIAS_OSCILLATE: boolean; // Enable oscillation between min/max bias (default false)
    ORBIT_BIAS_MIN: number;        // Min bias strength for oscillation (default 0.0)
    ORBIT_BIAS_MAX: number;        // Max bias strength for oscillation (default 1.0)
    ORBIT_BIAS_FREQ: number;       // Oscillation frequency relative to ticks (default 1.0)
    ORB_TRAVEL: boolean;           // Ships merge into glowing orb during travel, fragment on arrival (default true)
    ORB_DRAW_MODE: string;          // Which orb draw mode to use: 'mode1' etc. (default 'mode1')

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

    // Ship appearance
    SHIP_OUTLINE_ON: boolean;      // Show player-color outline behind each ship (default true)
    SHIP_OUTLINE_PX: number;       // Outline thickness in px (default 1.0)
    SHIP_GLOW_INTENSITY: number;   // Multiplier brightness glow (0=none, 1=max hue-brighten, default 0.3)
    SHIP_GLOW_RADIUS: number;      // Radial glow sprite radius multiplier per ship (0=off, default 6)
    MIN_COLOR_LIGHTNESS: number;   // Minimum HSL lightness for player colors (0-1, default 0.35)
    SHIP_SCALE_MULT: number;       // Global ship size multiplier (default 1.0)
    MAX_VISUAL_SHIPS: number;      // Max visual ship sprites per star (overflow → brightness, default 100)

    // Ship density VFX — HSL color graduation for representing high ship counts
    DENSITY_HUE_STEP: number;      // Degrees of hue shift per density tier (default 4)
    DENSITY_SAT_STEP: number;      // Saturation change per tier (±, default 0.05)
    DENSITY_LIGHT_STEP: number;    // Lightness change per tier (±, default 0.05)
    DENSITY_TIERS: number;         // Number of tiers per direction on the color wheel (default 3)
    DENSITY_DARKEN_ALT: boolean;   // Alternate ships get darkened instead of lightened (default true)
    SHIP_VISUAL_RADIUS: number;    // Cosmetic ship circle radius in px (default 3) — independent of orbit spacing

    // Star glow — radial gradient behind ships showing fleet power
    STAR_GLOW_ON: boolean;         // Enable star glow effect (default true)
    STAR_GLOW_RADIUS_MULT: number; // Glow radius as multiplier of outermost orbit ring (default 1.3)
    STAR_GLOW_INTENSITY: number;   // Peak glow alpha (0-1, default 0.25)
    STAR_GLOW_LAYERS: number;      // Number of concentric gradient layers (default 4)

    /** How far order arrows extend along the lane (0.0-1.0, 1.0 = full distance to target edge) */
    ARROW_LENGTH_FRACTION: number;



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

    // ── Territory Overlay ────────────────────────────────────────────────────
    SHOW_TERRITORY: boolean;       // Show territory alpha overlay behind stars (default true)
    TERRITORY_ALPHA: number;       // Alpha for territory overlay (default 0.08)
    TERRITORY_RADIUS_MULT: number; // Radius multiplier for territory circles (default 3.0)
    HALO_FLEET_SCALE: boolean;     // Scale halo alpha with fleet size (default true)
    HALO_FLEET_INTENSITY: number;  // Alpha added per 500 ships (default 0.03)

    // ── Voronoi Territory ───────────────────────────────────────────────────
    SHOW_VORONOI: boolean;         // Show contiguous Voronoi territory fill (default true)
    VORONOI_ALPHA: number;         // Alpha for Voronoi territory (default 0.15)
    VORONOI_RESOLUTION: number;    // Downscale factor for Voronoi canvas (default 4, higher = faster/blockier)
    VORONOI_EDGE_BLEND: number;    // Edge blend factor (0=hard edges, 1+=soft, default 0)
    VORONOI_BORDER_WIDTH: number;  // Border line width between territories in pixels (0=off, default 2)
    VORONOI_BORDER_ALPHA: number;  // Alpha for territory border lines (default 0.4)
    VORONOI_SATURATION: number;    // Saturation multiplier for Voronoi colors (0=grey, 1=normal, 2=vivid, default 1.0)
    VORONOI_LIGHTNESS: number;     // Lightness multiplier for Voronoi colors (0=dark, 1=normal, 2=bright, default 0.7)
    SHOW_HEX_GRID: boolean;
    STARS_PER_PLAYER: number;

    // Map gen metadata (populated at runtime, used by debug hex grid overlay)
    _MAP_HEX_RADIUS: number;
    _MAP_WIDTH: number;
    _MAP_HEIGHT: number;
    _MAP_PADDING_X: number;
    _MAP_PADDING_Y: number;

    // Link Connectivity
    MIN_LINKS_PER_STAR: number;
    MAX_LINKS_PER_STAR: number;
}

/**
 * Auto-persistence for GAME_CONFIG.
 * Every property write is debounce-saved to localStorage.
 * Runtime fields (_MAP_*) are excluded.
 */
const CONFIG_STORAGE_KEY = 'pax-fluxia-game-config';

function loadSavedConfig(): Partial<GameConfigType> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore corrupt data */ }
    return {};
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(config: GameConfigType) {
    if (typeof window === 'undefined') return;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        try {
            // Save only non-runtime keys
            const toSave: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(config)) {
                if (!k.startsWith('_')) toSave[k] = v;
            }
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(toSave));
        } catch { /* quota exceeded etc */ }
    }, 300);
}

/**
 * All tunable game variables in one place.
 * Wrapped in a Proxy for automatic localStorage persistence.
 */
const _rawConfig: GameConfigType = {
    // ========================================================================
    // TIMING
    // ========================================================================

    /** Base tick interval at 1x speed (ms) - slower = more strategic */
    BASE_TICK_MS: 1400,

    /** Minimum tick interval at max speed (ms) */
    MIN_TICK_MS: 100,

    /** Animation interpolation speed (ms) - controls visual smoothness of tick progress.
     *  Lower = faster visual transitions. Separate from actual tick rate. */
    ANIMATION_SPEED_MS: 1150,

    // ========================================================================
    // TRANSFER MECHANICS
    // ========================================================================

    /** Percentage of ships that transfer per tick (0.0 - 1.0) */
    TRANSFER_RATE: 0.07,

    /** Minimum ships to transfer per tick */
    MIN_SHIPS_PER_TRANSFER: 0,

    /** Maximum ships to transfer per tick (0 = unlimited) */
    MAX_SHIPS_PER_TRANSFER: 0,



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
    AGGRESSOR_ADVANTAGE: 0.8333333333333334,

    /** Base damage per engaged ship per tick. Range: 0.05-2.0 */
    DAMAGE_PER_SHIP: 0.075,

    /** Fraction of damage that destroys ships (rest disables). Range: 0-1 */
    LETHALITY: 0.35,

    /** How much numerical superiority matters. 0 = none, 1 = dominant */
    FORCE_RATIO_EFFECT: 0,

    /** Overwhelm ratio for instant conquest (need Nx enemy ships) */
    CONQUEST_THRESHOLD: 25,

    /** percentage each damaged ship contributes to defense, as a percentage x 100 */
    DAMAGED_SHIP_EFFECTIVENESS: 0.5,

    // ========================================================================
    // PRODUCTION
    // ========================================================================

    /** Base ships produced per tick (modified by star type) */
    BASE_PRODUCTION: 0.6,


    // ========================================================================
    // REPAIR
    // ========================================================================

    /** Percentage of damaged ships repaired per tick (0-100 integer) */
    REPAIR_RATE: 31,

    /** Minimum ships repaired per tick */
    MIN_REPAIR: 1,

    /** Repair multiplier when under attack (0.0 - 1.0) */
    REPAIR_COMBAT_PENALTY: 0.1,

    // ========================================================================
    // CONQUEST
    // ========================================================================

    /** Percentage of remaining ships that transfer on capture */
    CONQUEST_TRANSFER_PERCENTAGE: 60,

    /** Defender strength ratio below which they are instantly overwhelmed (e.g. 0.1 = 10% of attackers) */
    OVERWHELM_THRESHOLD: 0.1,

    /** Default behavior: orders persist through star conquest (Ctrl-click inverts this per-order) */
    ORDERS_PERSIST_AFTER_CONQUEST: true,

    /** When attacker conquers defender, retain attack order as movement order (default: true) */
    RETAIN_ORDER_ON_CONQUEST: true,

    /** Allow A→B and B→A movement orders to coexist (default: false) */
    ALLOW_OPPOSING_ORDERS: false,

    /** % of damaged ships captured (transferred to new owner) at conquest (0-1) */
    CONQUEST_DAMAGED_CAPTURE_RATE: 1.0,
    /** % of damaged ships destroyed at conquest (0-1) */
    CONQUEST_DAMAGED_DESTROY_RATE: 0,

    // ========================================================================
    // SCATTER / RETREAT
    // ========================================================================

    /** % of ships captured when defender is actively retreating to friendly star */
    RETREAT_CAPTURE_RATE: 0.1,

    /** % of ships captured when defender has escape routes but not retreating */
    SCATTER_CAPTURE_RATE: 0.2,

    /** % of non-captured ships destroyed during scatter (rest escape) */
    SCATTER_DESTROY_RATE: 0.50,

    /** % of damaged ships converted to active on retreat/scatter (0=stay damaged, 1=all activate) */
    RETREAT_DAMAGED_ACTIVATION_RATE: 0.1,


    /** Starting ships per star at game start */
    STARTING_SHIPS: 50,

    // ========================================================================
    // AI BEHAVIOR
    // ========================================================================

    /** Power ratio at which AI MUST attack (5:4 = 1.25) */
    AI_MUST_ATTACK_RATIO: 1.25,

    /** Min power ratio for AI to consider attacking (4:5 = 0.8) */
    AI_ATTACK_UPPER_BOUNDS: 0.8,

    /** How persistent AI is with attacks: 0=disengage, 1=fight to the death (0-1) */
    AI_ATTACK_STICKINESS: 0.5,

    /** Chance per tick to evaluate attack decisions (0-1, difficulty-based override) */
    AI_EVALUATION_FREQUENCY: 0.5,

    /** Chance to target weakest neighbor (0-1) */
    AI_TACTICAL_AGGRESSION: 0.1,

    /** Chance per evaluation to ignore ratio rules and attack anyway (0-1) */
    AI_RANDOM_AGGRESSION: 0.05,

    // ========================================================================
    // VISUAL
    // ========================================================================

    /** Base ship render size */
    SHIP_BASE_SIZE: 3,

    /** Visual radius of stars on canvas */
    STAR_RENDER_RADIUS: 25,

    /** Show hex selection border on active star (renders above ships) */
    SHOW_SELECTION_HEX: true,

    /** Orbit ring spacing multiplier (ringSpacing = shipBaseSize * this) */
    ORBIT_RING_MULT: 1.6,

    /** Ship transfer animation duration (ms) */
    TRANSFER_ANIMATION_MS: 2880,
    STATIC_ORBITS: false,

    /** How much ships cluster toward target (0=none, 1=max) */
    ORBIT_BIAS_STRENGTH: 0,
    /** Fraction of half-tick spent departing vs traveling */
    DEPART_FRACTION: 0.55,
    /** Max random departure jitter (ms) */
    DEPART_JITTER_MS: 0,
    /** Max perpendicular lane offset (px per side) */
    LANE_OFFSET_PX: 12,
    /** Ship departure mode: lifo (newest first), fifo (oldest first), nearside (closest to target) */
    DEPART_MODE: 'fifo' as const,
    /** How fast ships settle into orbit slot (ms) */
    SETTLE_DURATION_MS: 100,
    /** Fraction of tick used to stagger arrival settle (0=instant, 1=full tick spread) */
    ARRIVAL_SPREAD: 0.65,
    /** Amplitude of sinusoidal wobble on travel path (px) */
    WOBBLE_AMP: 0,

    /** Stream departure: ships depart at even intervals (tickMs / shipsToTransfer) instead of jittered burst */
    DEPART_STAGGER: true,
    /** Arc intensity during departure phase (0=straight, 1=max arc) */
    DEPART_ARC_INTENSITY: 0.1,
    /** Arc intensity during arrival phase (0=straight, 1=max arc) */



    ARRIVAL_ARC_INTENSITY: 0.1,

    // Travel easing controls
    // Travel animation mode
    TRAVEL_MODE: 'lane' as const,
    TRAVEL_EASING: 'easeInOut' as const,
    TRAVEL_EASING_POWER: 0.5,
    TRAVEL_DURATION_MULT: 1.6,
    TRAVEL_ARC_INTENSITY: 0.75,
    /** How tightly ships converge to lane (0=straight to orbit slot, 1=full lane convergence) */
    LANE_CONVERGENCE: 0.85,
    /** Where along origin→dest center the convergence point sits (0=origin, 100=dest) */
    LANE_CONVERGENCE_POINT: 100,
    /** Ship spacing factor per ring: higher = fewer ships per ring = more spread out (default 1.5) */
    ORBIT_DENSITY: 1.7,
    /** Attack surge displacement as fraction of star radius (default 0.4) */
    ATTACK_SURGE_MULT: 0.6,
    ATTACK_SURGE_PROPORTIONAL: true,
    ATTACK_SURGE_FORCE_COFACTOR: 0.6,
    /** Ramp-in duration for attack surge (ms, 0=instant/old behavior) */
    ATTACK_SURGE_RAMP_MS: 2600,
    /** Surge pulse shape power (1=sine, 2=sharper peak, 0.5=flatter) */
    ATTACK_SURGE_SHAPE: 1,
    /** Duration of one surge sine pulse cycle (ms, default = BASE_TICK_MS) */
    SURGE_PULSE_DURATION_MS: 1150,
    /** Conquest animation strategy: 'immediate' = pop, 'surge' = settle from above, 'travel' = fly through lane */
    CONQUEST_ANIMATION_MODE: 'travel' as const,
    /** How long conquest ships settle into orbit in surge mode (ms) */
    CONQUEST_SETTLE_MS: 500,
    /** Initial spawn radius above orbit for surge mode (px above star edge) */
    CONQUEST_SURGE_RADIUS: 50,
    /** Per-ship stagger delay for organic arrival spread in surge mode (ms) */
    CONQUEST_SURGE_STAGGER_MS: 70,
    /** Conquest travel speed multiplier (>1 = faster, <1 = slower, 1 = normal) */
    CONQUEST_TRAVEL_SPEED: 0.1,
    /** Delay before conquest ships start moving (ms) — ships hold surged position */
    CONQUEST_LERP_DELAY_MS: 0,
    CONQUEST_COLOR_DELAY_MS: 400,
    CONQUEST_FLASH_DURATION_MS: 600,
    // ── Arrowhead conquest animation ──
    ARROW_TAPER: 0.35,
    ARROW_WIDTH: 115,
    ARROW_SPEED: 2.8,
    ARROW_EASING: 'easeIn' as const,
    ARROW_ENGULF_MODE: 'collapse' as const,
    ARROW_ENGULF_RADIUS: 85,
    ARROW_SPIRAL_MIN_DEG: 60,
    ARROW_SPIRAL_MAX_DEG: 300,
    ARROW_SPIRAL_RANDOM: true,
    ARROW_SPIRAL_DURATION_MS: 250,
    ARROW_STAGGER_MS: 60,
    /** Auto-slow game when conquest fires (for tuning/debugging) */
    CONQUEST_SLOWMO_ENABLED: false,
    /** How much to slow animation on conquest (multiplier on tick duration) */
    CONQUEST_SLOWMO_FACTOR: 5,
    /** How long conquest slowmo lasts (ms) */
    CONQUEST_SLOWMO_DURATION_MS: 5000,
    /** Scale glow intensity by conquering force size */
    CONQUEST_FORCE_GLOW: true,
    /** Log₂ coefficient for force glow scaling (higher = more dramatic) */
    CONQUEST_FORCE_GLOW_MULT: 0.15,
    /** Show player-color outline behind each ship */
    SHIP_OUTLINE_ON: true,
    /** Outline thickness in px */
    SHIP_OUTLINE_PX: 1,
    /** Multiplier brightness glow: 0 = none, 1 = max (brightens within hue, not toward white) */
    SHIP_GLOW_INTENSITY: 0.44,
    /** Radial glow sprite radius multiplier per ship */
    SHIP_GLOW_RADIUS: 8,
    /** Minimum HSL lightness for player colors — prevents dark colors vanishing on dark bg */
    MIN_COLOR_LIGHTNESS: 0.5,
    /** Global ship size multiplier */
    SHIP_SCALE_MULT: 0.4,
    /** Max visual ship sprites per star — overflow represented as brightness multiplier */
    MAX_VISUAL_SHIPS: 500,
    /** Degrees of hue shift per density tier */
    DENSITY_HUE_STEP: 20,
    /** Saturation change per density tier (positive direction = increase, negative = decrease) */
    DENSITY_SAT_STEP: 0.13,
    /** Lightness change per density tier */
    DENSITY_LIGHT_STEP: 0.06,
    /** Number of density tiers per direction on the color wheel */
    DENSITY_TIERS: 6,
    DENSITY_DARKEN_ALT: true,
    SHIP_VISUAL_RADIUS: 3,
    /** Star glow settings */
    STAR_GLOW_ON: true,
    STAR_GLOW_RADIUS_MULT: 1.3,
    STAR_GLOW_INTENSITY: 0.25,
    STAR_GLOW_LAYERS: 4,
    /** Enable orbit bias oscillation between min/max */
    ORBIT_BIAS_OSCILLATE: false,
    /** Min bias strength for oscillation */
    ORBIT_BIAS_MIN: 0.0,
    /** Max bias strength for oscillation */
    ORBIT_BIAS_MAX: 0.95,
    /** Oscillation frequency relative to ticks (0.25 = once per 4 ticks, 2.0 = twice per tick) */
    ORBIT_BIAS_FREQ: 0.25,
    /** Ships merge into single glowing orb during travel, fragment into ships on arrival */
    ORB_TRAVEL: true,
    /** Which orb draw mode visual to use */
    ORB_DRAW_MODE: 'mode1' as string,
    /** Base orb radius in px before ship count scaling */
    ORB_BASE_RADIUS: 1.5,
    /** Sqrt multiplier for ship count → radius */
    ORB_RADIUS_SCALE: 0.5,
    /** Overall glow multiplier for orb layers */
    ORB_GLOW_MULT: 1.3,
    /** Outer glow ring alpha */
    ORB_OUTER_ALPHA: 0.32,
    /** Middle glow ring alpha */
    ORB_MID_ALPHA: 0.34,
    /** Inner core alpha */
    ORB_CORE_ALPHA: 0.74,
    /** Bright center dot alpha */
    ORB_CENTER_ALPHA: 1.2,
    /** Outer glow ring radius multiplier */
    ORB_OUTER_SCALE: 3.6,
    /** Middle glow ring radius multiplier */
    ORB_MID_SCALE: 1.5,
    /** Core radius as fraction of base */
    ORB_CORE_SCALE: 0.4,

    /** Order arrow length as fraction of lane distance (0.0-1.0, default 0.5 = halfway) */
    ARROW_LENGTH_FRACTION: 0.5,



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
    CONNECTION_WIDTH: 3,

    /** Connection line alpha */
    CONNECTION_ALPHA: 0.3,

    /** Connection shadow/border width (added to CONNECTION_WIDTH) */
    CONNECTION_SHADOW_WIDTH: 3,

    /** Connection shadow alpha */
    CONNECTION_SHADOW_ALPHA: 0.3,

    /** Show connection lines */
    SHOW_CONNECTIONS: true,

    /** Show territory alpha overlay behind stars (F-47) */
    SHOW_TERRITORY: true,
    /** Territory overlay alpha (0-1) */
    TERRITORY_ALPHA: 0.07,
    /** Territory radius multiplier relative to star radius */
    TERRITORY_RADIUS_MULT: 3,
    /** Scale halo alpha with fleet size */
    HALO_FLEET_SCALE: true,
    /** Alpha added per 500 ships */
    HALO_FLEET_INTENSITY: 0.03,

    /** Show contiguous Voronoi territory fill */
    SHOW_VORONOI: true,
    /** Voronoi territory alpha (0-1) */
    VORONOI_ALPHA: 0.1,
    /** Voronoi canvas downscale factor (higher = faster/blockier) */
    VORONOI_RESOLUTION: 1,
    /** Voronoi edge blend (0=hard edges, higher=softer) */
    VORONOI_EDGE_BLEND: 2.3,
    /** Voronoi border line width between territories (0=off) */
    VORONOI_BORDER_WIDTH: 0,
    /** Voronoi border alpha */
    VORONOI_BORDER_ALPHA: 0.15,
    /** Voronoi color saturation multiplier (0=grey, 1=original, 2=vivid) */
    VORONOI_SATURATION: 1.0,
    /** Voronoi color lightness multiplier (0=dark, 1=original, 2=bright) */
    VORONOI_LIGHTNESS: 0.7,

    /** Show hex grid (debug) */
    SHOW_HEX_GRID: false,

    /** Stars per player (Map Size) */
    STARS_PER_PLAYER: 3,

    // Runtime: populated by map generation (do not save to localStorage)
    _MAP_HEX_RADIUS: 0,
    _MAP_WIDTH: 0,
    _MAP_HEIGHT: 0,
    _MAP_PADDING_X: 0,
    _MAP_PADDING_Y: 0,

    // ========================================================================
    // LINK CONNECTIVITY
    // ========================================================================

    /** Minimum connections per star (1-3 typical) */
    MIN_LINKS_PER_STAR: 1,

    /** Maximum connections per star (4-8 typical) */
    MAX_LINKS_PER_STAR: 5,
};

// Apply saved settings on top of defaults
const _savedOverrides = loadSavedConfig();
for (const [k, v] of Object.entries(_savedOverrides)) {
    if (k in _rawConfig && !k.startsWith('_')) {
        (_rawConfig as any)[k] = v;
    }
}

// Export as Proxy — auto-saves to localStorage on any property change
export const GAME_CONFIG: GameConfigType = new Proxy(_rawConfig, {
    set(target, prop, value) {
        (target as any)[prop as string] = value;
        debouncedSave(target);
        return true;
    },
});

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

