// ============================================================================
// Game Configuration - Centralized tunable game variables
// ============================================================================

import { calculateCombat as sharedCalculateCombat } from '@pax/common';
import type { EngineConfig } from '@pax/common';
import type {
    MetaballBurstBoundaryBasis,
    VsTransitionModeId,
} from '../territory/transitions/territoryTransitionModes';
import type {
    TerritoryFrontierBorderGeometryMode,
    TerritoryFrontierFxMode,
    TerritoryFrontierJunctionRenderMode,
    TerritoryFrontierPhaseSamplingMode,
    TerritoryFrontierTechniqueId,
    TerritoryFrontierTriangleDiagonalPolicy,
} from '../territory/frontier/types';
import { normalizePerimeterFieldGeometrySource } from '../territory/geometry/geometrySource';
import { aiConfigDefaults } from './ai.config';
import { audioConfigDefaults } from './audio.config';
import { gameplayConfigDefaults } from './gameplay.config';
import { rendererConfigDefaults } from './renderer.config';
import { territoryConfigDefaults } from './territory.config';

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
        REPAIR_SUPPRESS_ATTACKER: GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER,
        REPAIR_SUPPRESS_DEFENDER: GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER,
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
        GLOBAL_DAMAGE_MODIFIER: GAME_CONFIG.GLOBAL_DAMAGE_MODIFIER,
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

    /** Bind animation speed to tick duration (default true) */
    BIND_ANIMATION_TO_TICK: boolean;
    NUMBER_TRANSITION_MS: number;     // Smooth transition duration for ship count labels (ms, 0=instant, default 120)
    LABEL_ANIM_MODE: 'rolling' | 'fade' | 'instant'; // Label animation mode: rolling=lerp, fade=alpha flash, instant=snap

    // Transfer
    TRANSFER_RATE: number;
    MIN_SHIPS_PER_TRANSFER: number;
    MAX_SHIPS_PER_TRANSFER: number;

    // Combat V4 - Symmetric Model
    AGGRESSOR_ADVANTAGE: number;    // Tilts damage toward attacker (>1) or defender (<1)
    GLOBAL_DAMAGE_MODIFIER: number; // Global damage scalar (percentage, 100 = full)
    LETHALITY: number;              // % of damage that destroys (rest disables)
    FORCE_RATIO_EFFECT: number;     // How much numerical superiority matters
    CONQUEST_THRESHOLD: number;     // Overwhelm ratio for instant capture

    // Production
    BASE_PRODUCTION: number;

    // Repair
    REPAIR_RATE: number;
    MIN_REPAIR: number;
    REPAIR_COMBAT_PENALTY: number;
    REPAIR_SUPPRESS_ATTACKER: number;
    REPAIR_SUPPRESS_DEFENDER: number;

    // Conquest
    CONQUEST_TRANSFER_PERCENTAGE: number;
    CONQUEST_DAMAGED_CAPTURE_RATE: number;  // % of damaged ships captured at conquest (0-1)
    CONQUEST_DAMAGED_DESTROY_RATE: number;  // % of damaged ships destroyed at conquest (0-1)
    OVERWHELM_THRESHOLD: number;

    // Order continuity compatibility
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
    ORBIT_BASE_RADIUS: number;     // Inner orbit offset to clear player color ring (0-20)
    STAR_RENDER_RADIUS: number;    // Visual radius of stars on canvas (default 20)
    STAR_SHAPE_MODE: 'polygon' | 'circle';  // Star body shape: 'polygon' = type-specific shape, 'circle' = classic (default 'polygon')
    STAR_ICON_SCALE: number;       // Type icon size as fraction of star radius (0.2-0.8, default 0.55)
    STAR_CORNER_RADIUS: number;    // Polygon corner rounding (0=sharp, 1=fully round like circle, default 0.3)
    ORBIT_RING_MULT: number;       // Orbit ring spacing = SHIP_BASE_SIZE * ORBIT_RING_MULT (default 1.4)
    DAMAGED_ORBIT_RADIUS: number;  // Radius where damaged ships orbit (default 15)
    DAMAGED_ORBIT_EVADE: boolean;  // Whether damaged ships cluster away from combat (default true)
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
    TRAVEL_FOLLOW_LANE_PATHS: boolean; // Follow published lane polylines for travel/surge when available
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
    SURGE_PULSE_BIND_TO_TICK: boolean;   // Bind surge pulse duration to BASE_TICK_MS (default true)
    // Conquest animation
    CONQUEST_ANIMATION_MODE: 'immediate' | 'surge' | 'travel' | 'arrowhead'; // Strategy for transferring attacker ships to conquered star
    CONQUEST_SETTLE_MS: number;          // How long conquest ships take to settle into orbit in surge mode (ms, default 500)
    CONQUEST_SURGE_RADIUS: number;       // Initial spawn radius above orbit for surge mode (px, default 40)
    CONQUEST_SURGE_STAGGER_MS: number;   // Per-ship stagger delay for organic arrival spread (ms, default 30)
    CONQUEST_TRAVEL_SPEED: number;       // Duration multiplier vs normal transfer (lower = faster, default 0.7)
    CONQUEST_LERP_DELAY_MS: number;      // Delay before conquest ships start moving (ms, default 200)
    CONQUEST_COLOR_DELAY_TICKS: number;  // Delay before color change, in ticks (auto-scales with game speed, default 2)
    CONQUEST_FLASH_TICKS: number;        // Duration of flash in ticks (auto-scales with game speed, 0=disabled, default 3)
    // Arrowhead conquest animation
    ARROW_TAPER: number;                 // Wedge shape: 0=column, 1=sharp V (default 0.7)
    ARROW_WIDTH: number;                 // Base width in px (0=auto from star+orbit diameter, default 0)
    ARROW_SPEED: number;                 // Duration multiplier (lower=faster, default 0.6)
    ARROW_EASING: 'easeIn' | 'easeInOut' | 'linear'; // Travel easing (default 'easeIn' = accelerating)
    ARROW_ENGULF_MODE: 'fan' | 'collapse' | 'ring' | 'swarm'; // Engulf arrival pattern (default 'fan')
    ARROW_ENGULF_RADIUS: number;         // Initial radius around target at engulf (px, default 50)
    ARROW_SPIRAL_MIN_DEG: number;        // Min spiral degrees per ship (default 180)
    ARROW_SPIRAL_MAX_DEG: number;        // Max spiral degrees per ship (default 720)
    ARROW_SPIRAL_RANDOM: boolean;        // Random vs orderly spiral amount (default true)
    ARROW_SPIRAL_DURATION_MS: number;    // How long spiral settle lasts (ms, default 800)
    ARROW_STAGGER_MS: number;            // Per-ship delay entering formation (ms, default 20)
    ARROW_STAGGER_AUTO: boolean;         // Auto-calculate stagger to fit departures within one tick (default true)
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
    STAR_RING_RADIUS: number;       // Absolute ownership-ring radius from star center in px (default 30)
    STAR_RING_OFFSET: number;       // LEGACY — kept for compat, prefer STAR_RING_RADIUS
    STAR_RING_WIDTH: number;        // Ownership-ring stroke width in px (default 2)
    STAR_RING_ALPHA: number;        // Ownership-ring opacity (0-1, default 0.8)
    STAR_RING_SATURATION: number;   // Ownership-ring saturation multiplier (0-2, default 1.0)
    STAR_RING_LIGHTNESS: number;    // Ownership-ring lightness multiplier (0-2, default 1.0)
    STAR_SYSTEM_SCALE: number;      // Master scale for entire star system (0.3-3.0, default 1.0)
    STAR_LABEL_OFFSET_X: number;    // Label offset from star center X (default 45)
    STAR_LABEL_OFFSET_Y: number;    // Label offset from star center Y (default 35)
    STAR_LABEL_FONT_SIZE: number;   // Active ships font size (default 14)
    STAR_LABEL_ID_FONT_SIZE: number;// Star ID font size (default 13)
    STAR_LABEL_DAMAGED_FONT_SIZE: number; // Damaged ships font size (default 12)
    STAR_LABEL_ANGLE: number;       // Label group angle in degrees (0=right, 90=down, default 35)
    STAR_LABEL_DISTANCE: number;    // Label group radial distance from star center (default 55)
    STAR_LABEL_SCALE: number;       // Master font scale (1.0 = default, drives all sub-fonts)
    STAR_LABEL_LAYOUT: 'horizontal' | 'vertical'; // Label layout mode: pill badge or stacked rows
    STAR_LABEL_PAD_X: number;       // Horizontal padding inside pill background (default 4)
    STAR_LABEL_PAD_Y: number;       // Vertical padding inside pill background (default 2)
    STAR_LABEL_GAP: number;         // Gap between text elements (default 2)
    STAR_LABEL_BG_ALPHA: number;    // Pill background opacity (default 0.75)
    STAR_LABEL_BORDER_ALPHA: number;// Pill border opacity (default 0.5)
    STAR_LABEL_BORDER_WIDTH: number;// Pill border stroke width in px (default 1)
    STAR_LABEL_LEASH: boolean;      // Show leash line from star to label (default false)
    STAR_LABEL_SHOW_ID: boolean;     // Show star ID (#N) in label (default true)
    STAR_LABEL_SHOW_ACTIVE: boolean; // Show active ship count in label (default true)
    STAR_LABEL_SHOW_DAMAGED: boolean;// Show damaged ship count in label (default true)
    STAR_LABEL_FONT_FAMILY: string; // Font family for label text
    STAR_LABEL_COLOR_MODE: 'player' | 'universal'; // Color mode: owner color vs fixed HSLA
    STAR_LABEL_UNIVERSAL_H: number; // Universal mode hue (0-360, default 220)
    STAR_LABEL_UNIVERSAL_S: number; // Universal mode saturation (0-100, default 30)
    STAR_LABEL_UNIVERSAL_L: number; // Universal mode lightness (0-100, default 25)
    STAR_LABEL_UNIVERSAL_A: number; // Universal mode alpha (0-1, default 0.75)
    STAR_LABEL_LINE_HEIGHT: number; // Vertical spacing between label rows (default 18)
    CLASSIC_MAP_SPACING: number;    // Classic map coordinate spacing multiplier (0.5-2.0, default 1.0)
    STAR_HIT_RADIUS: number;        // Click/drag hit zone radius in px (default 50)
    STAR_GLOW_RADIUS_MULT: number;  // Glow radius as multiplier of outermost orbit ring (default 1.3)
    STAR_GLOW_INTENSITY: number;    // Peak glow alpha (0-1, default 0.25)
    STAR_GLOW_LAYERS: number;       // Number of concentric gradient layers (default 4)

    /** How far order arrows extend along the lane (0.0-1.0, 1.0 = full distance to target edge) */
    ARROW_LENGTH: number;
    /** Arrowhead size in px (default 30) */
    ARROW_HEAD_SIZE: number;
    /** Arrow shaft width in px (default 6) */
    ARROW_SHAFT_WIDTH: number;
    /** Arrow shaft alpha (0-1, default 0.6) */
    ARROW_ALPHA: number;
    /** When true, order arrows follow lane polylines instead of straight chords */
    ORDER_ARROWS_FOLLOW_LANE_PATHS: boolean;
    /** Extra arc-length padding from each star rim before arrow path starts/ends (px) */
    ARROW_PATH_PADDING: number;
    /** Deferred arrow dash length in px (default 15) */
    ARROW_DASH_LENGTH: number;
    /** Deferred arrow dash gap in px (default 10) */
    ARROW_DASH_GAP: number;
    /** Arrowhead fill alpha (default = ARROW_ALPHA to match shaft) */
    ARROW_HEAD_ALPHA: number;
    /** Arrow outline stroke width in px (0=off, default 0) */
    ARROW_OUTLINE_WIDTH: number;
    /** Arrow outline color (default 0x000000) */
    ARROW_OUTLINE_COLOR: number;
    /** Arrow outline alpha (default = ARROW_ALPHA) */
    ARROW_OUTLINE_ALPHA: number;
    /** Arrowhead wing spread angle in degrees (default 30) */
    ARROW_HEAD_SPREAD_DEG: number;
    /** Arrowhead style variant: triangle, chevron, kite, or spear */
    ARROW_HEAD_STYLE: 'triangle' | 'chevron' | 'kite' | 'spear';
    /** Arrowhead rear-notch depth (0 = flat, 1 = deep notch) */
    ARROW_HEAD_NOTCH: number;
    /** Number of shaft gradient steps (1 = solid shaft) */
    ARROW_SHAFT_STEPS: number;
    /** Animated flow speed along the shaft (0 = static) */
    ARROW_FLOW_SPEED: number;
    /** Arrowhead glow / VFX alpha */
    ARROW_HEAD_VFX_ALPHA: number;
    /** How strongly arrow visuals react to attacking force size */
    ARROW_FORCE_INTENSITY: number;
    /** Ship count that reaches full force-reactive intensity */
    ARROW_FORCE_INTENSITY_MAX_SHIPS: number;
    /** When true, metaball fill follows geometry ownership instead of requiring real-star and geom agreement */
    METABALL_FILL_FOLLOWS_GEOM: boolean;
    /** Damaged ship render scale multiplier (default 0.7) */
    DAMAGED_SHIP_SCALE: number;



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
    /**
     * Minimum distance (px) from mapgen lane chords / sampled centerlines to non-endpoint stars.
     * Drives Delaunay pass-through prune and curved-lane solver only when enabled.
     * Independent from territory MSR; defaults inactive.
     */
    MAPGEN_LANE_MARGIN_ENABLED: boolean;
    MAPGEN_LANE_MARGIN_PX: number;
    /**
     * Lane centerline: `straight` = chord only. `curved` = chord when it clears other
     * stars at lane margin and does not cross other lanes; else Bézier or a short detour.
     */
    MAPGEN_LANE_MODE: 'straight' | 'curved';
    /**
     * 0..1 — Phase 4 tests only the **straight chord** vs stars using `laneMargin * (1 - bias)`.
     * **0** = prune/reconnect when chord is tight (topology). **1** = keep edges; **curved** lane mode
     * then satisfies full **lane margin** on sampled paths. Does not relax lane margin itself.
     */
    MAPGEN_LANE_CURVE_VS_PRUNE_BIAS: number;

    // ── Territory Overlay ────────────────────────────────────────────────────
    SHOW_STAR_POWER: boolean;       // Show star power alpha overlay behind stars (default true)
    STAR_POWER_ALPHA: number;       // Alpha for star power overlay (default 0.08)
    STAR_POWER_RADIUS_MULT: number; // Radius multiplier for star power circles (default 3.0)
    STAR_POWER_LAYERS: number;      // Number of concentric gradient layers (1-12, default 4)
    STAR_POWER_BLUR: number;        // GPU blur on halos (0=off, default 4)
    STAR_POWER_LAYER_CURVE: number; // Exponent applied to halo layer falloff (default 1.0)
    STAR_POWER_EDGE_BAND_STRENGTH: number; // Extra alpha bias for the halo outer band (default 0)
    STAR_POWER_EDGE_BAND_WIDTH: number; // Fraction of outer halo radius affected by the edge band (default 0.2)
    HALO_FLEET_SCALE: boolean;     // Bind halo alpha to ship count (default true)
    HALO_FLEET_MODE: string;       // 'stepped' (original: +intensity per step) or 'linear' (smooth)
    HALO_FLEET_INTENSITY: number;  // Intensity multiplier for ship-count binding (0-2, default 1.0)
    HALO_FLEET_STEP_SIZE: number;  // Ships per step for 'stepped' mode (default 500)
    HALO_FLEET_MAX_SHIPS: number;  // Ship count for full alpha in 'linear' mode (default 500)

    // ── Territory Toggles ──────────────────────────────────────────────────────
    TERRITORY_VORONOI: boolean;    // Enable Voronoi territory renderer (default true)
    TERRITORY_MODIFIED_VORONOI: boolean; // Enable Modified Voronoi territory renderer (F-138, default false)
    TERRITORY_POWER_VORONOI: boolean;    // Enable Power Voronoi V2 territory renderer (F-138v2, default false)
    TERRITORY_PVV3: boolean;              // Enable PVV3 frontier-first territory renderer (default false)
    TERRITORY_ENGINE_ENABLED: boolean;    // Enable modular territory engine router (default false)
    TERRITORY_ENGINE_METHOD: string;       // Unified method ID (replaces ENGINE_MODE + STATIC_METHOD + DYNAMIC_METHOD)
    // ── OBSOLETE (kept for config migration) ──
    TERRITORY_ENGINE_STATIC_METHOD: string;  // @deprecated Use TERRITORY_ENGINE_METHOD
    TERRITORY_ENGINE_TRACE_MODE: boolean; // Emit staged trace snapshots for the modular engine (default false)
    TERRITORY_ENGINE_MODE: string;         // @deprecated Use TERRITORY_ENGINE_METHOD
    TERRITORY_ENGINE_DYNAMIC_METHOD: string; // @deprecated Use TERRITORY_ENGINE_METHOD
    TERRITORY_ENGINE_HYBRID_PLAN: string;    // @deprecated Removed — hybrid plans are obsolete
    TERRITORY_ENGINE_STEP_MODE: boolean; // Interactive stage stepping for territory engine diagnostics
    TERRITORY_ENGINE_STEP_ADVANCE_TOKEN: number; // Increment to advance one stage when step mode is enabled
    TERRITORY_TRANSITION_MS: number;      // Duration of territory morph animation in ms (0 = instant, default 400)
    TERRITORY_TRANSITION_SETTLE_PCT: number; // Metaball conquest end-settle easing, percent (0 = off)
    /** When true, territory conquest transition duration tracks BASE_TICK_MS (Timing panel) */
    TERRITORY_TRANSITION_BIND_TO_TICK: boolean;
    /** PowerCore conquest FRONT shape: 'push' (default) = the pre-conquest
     *  border ITSELF is pushed across the cell like a wave, endpoints sliding
     *  along the bounding borders; 'linear' = straight windshield-wiper sweep;
     *  'radial' = curved front advancing from the attack origin. */
    TERRITORY_CONQUEST_FRONT_MODE: 'push' | 'linear' | 'radial';
    // ── Virtual Star Transition (F-165) ──────────────────────────────────────
    VS_VICTOR_TRAVEL_MS: number;          // Duration of victor VS travel (ms, 0 = use TERRITORY_TRANSITION_MS)
    VS_LOSER_TRAVEL_MS: number;           // Duration of loser VS travel (ms, 0 = use TERRITORY_TRANSITION_MS)
    VS_POWER_LERP_START: number;          // Loser VS starting power (0-max, default = full weight)
    VS_POWER_LERP_END: number;            // Loser VS ending power (0-max, default 0 = dissolve)
    VS_POWER_LERP_DURATION_MS: number;    // Duration of power lerp (ms, 0 = use VS_LOSER_TRAVEL_MS)
    VS_BIND_TO_TICK: boolean;             // Bind VS durations to tick duration (default true)
    VS_TRANSITION_MODE: VsTransitionModeId; // Shared transition-mode selector; UI options are contextual to the active renderer
    METABALL_BURST_BOUNDARY_BASIS: MetaballBurstBoundaryBasis; // How six-slice burst measures common loser travel distance
    PERIMETER_FIELD_TRANSITION_ENGINE: 'legacy' | 'plan'; // Which transition implementation perimeter_field uses
    PERIMETER_FIELD_GEOMETRY_SOURCE: 'power_core' | 'power_voronoi_0319'; // UNIFIED on PowerCore (2026-07-08); every value normalizes to power_core at read boundaries (selector retired)
    PERIMETER_FIELD_SAMPLE_SPACING: number; // Arc-length spacing between derived perimeter samples (px)
    PERIMETER_FIELD_INWARD_OFFSET_PX: number; // Inward offset applied to derived perimeter samples so they sit inside the source boundary
    PERIMETER_FIELD_INFLUENCE_RADIUS: number; // Displayed field radius for each perimeter sample (px)
    PERIMETER_FIELD_INFLUENCE_WEIGHT: number; // Influence strength for each perimeter sample
    PERIMETER_FIELD_TRANSITION_RAY_COUNT: number; // Number of local conquest rays used to build boundary override handles
    PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION: boolean; // Hold T0 perimeter field static while local override animates
    PERIMETER_FIELD_OLD_BOUNDARY_FADE: number; // Multiplier on old-owner local boundary fade
    PERIMETER_FIELD_NEW_BOUNDARY_GROW: number; // Multiplier on new-owner local boundary grow
    PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY: boolean; // Show the source geometry used to derive perimeter samples
    PERIMETER_FIELD_DEBUG_SHOW_VSTARS: boolean; // Show derived perimeter vstars and transition-local override points
    PERIMETER_FIELD_DEBUG_SCRUB_ENABLED: boolean; // When paused, override transition progress with the scrub slider
    PERIMETER_FIELD_DEBUG_REPLAY_SLOT: number; // 0 = live, 1..3 = replay one of the last captured conquests
    PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX: number; // Exact captured frame index used for paused scrub/replay
    PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS: number; // 0..1 scrub position used when paused and scrub is enabled
    CELL_GRID_ENABLED: boolean; // Master gate for the cell-grid render family
    CELL_GRID_SPACING_PX: number; // Requested world-space spacing between grid cell centers
    CELL_GRID_PATTERN_SPACING_PX: number; // Visible fill-pattern spacing for phase-field presentation
    CELL_GRID_ORIGIN_MODE: 'centered' | 'corner'; // Grid anchor mode in world space
    CELL_GRID_DISTRIBUTION: 'square' | 'hex_offset' | 'jittered'; // Planner lattice distribution
    CELL_GRID_POSITION_JITTER: number; // Deterministic scatter amplitude as a fraction of spacing
    CELL_GRID_MAX_CELLS: number; // Optional planner cap; coarsens spacing upward when exceeded
    CELL_GRID_INWARD_OFFSET_PX: number; // Extra inset applied to boundary / in-transition cells
    CELL_GRID_BOUNDARY_FILL_FLUSH: boolean; // Keep owner-boundary fills flush to the visible border unless explicit inward pullback is requested
    CELL_GRID_CELL_SHAPE: 'square' | 'circle' | 'diamond' | 'hex'; // Primitive painted for each cell
    CELL_GRID_CELL_INSET_PX: number; // Base inset applied to all cells
    CELL_GRID_CELL_CORNER_PX: number; // Corner radius for square cells
    CELL_GRID_BORDER_MODE: 'off' | 'per_cell' | 'territory_edge'; // Border rendering strategy
    CELL_GRID_BORDER_BLEND: boolean; // Blend opposing-owner border colors along territory edges
    CELL_GRID_EDGE_SMOOTHING_PASSES: number; // Extra smoothing applied to shared boundary corners
    CELL_GRID_EDGE_TRIM_PX: number; // Endpoint trim for shared-edge chains and junction shaping
    CELL_GRID_BORDER_CHAIKIN_PASSES: number; // Smoothing passes for blended edge polylines
    CELL_GRID_ADJACENCY: '4' | '8'; // Wave adjacency for BFS-based flip planning
    CELL_GRID_WAVE_GEOMETRY:
        | 'grid_bfs'
        | 'euclidean_band'
        | 'conquered_star_radial'
        | 'pre_to_post_frontier'; // Flip-time rank geometry
    CELL_GRID_WAVE_SEEDING: 'winner_natives' | 'conquered_star_center' | 'winner_nearest_edge'; // Seed selection mode
    CELL_GRID_FLIP_TRANSITION: 'hard' | 'lerp_per_cell' | 'dual_pass_blend'; // Per-cell ownership transition style
    CELL_GRID_FLIP_WINDOW: number; // Blend window around each cell's flip time
    CELL_GRID_WAVE_EASE: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'back_out' | 'elastic_out'; // Easing applied to transition progress before cell flips
    CELL_GRID_FLIP_WINDOW_JITTER: number; // Deterministic per-cell flip-time jitter
    CELL_GRID_PHASE_FIELD_FINISH_FADE_START: number; // Normalized conquest time when PRE-cell fade-out begins
    CELL_GRID_PHASE_FIELD_FINISH_FADE_END: number; // Normalized conquest time when PRE-cell fade-out finishes
    CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START: number; // Normalized conquest time when transition cells begin shrinking
    CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END: number; // Normalized conquest time when transition cells finish shrinking
    CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX: number; // Final cell size in px at the end of the phase-field completion tail
    CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT: boolean; // Draw a winner-side highlight rim at the active frontier
    CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START: number; // Normalized conquest time when the frontier accent begins fading
    CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END: number; // Normalized conquest time when the frontier accent fully fades
    GRID_GRADIENT_ENABLED: boolean; // Master gate for the Grid Gradient render family
    GRID_GRADIENT_DEBUG_TRANSITIONS: boolean; // Emit scoped Grid Gradient transition diagnostics without enabling the broad renderer logger
    GRID_GRADIENT_DRAW_BACKEND: 'graphics' | 'shader_field' | 'mesh_quads'; // Grid Gradient fill presentation backend
    GRID_GRADIENT_FILL_STYLE: 'pointillist' | 'solid'; // Fill style: point marks or resolved-region solid fill
    GRID_GRADIENT_SPACING_PX: number; // Requested invisible grid spacing in world px
    GRID_GRADIENT_MAX_CELLS: number; // Optional cell cap; coarsens spacing upward when exceeded
    GRID_GRADIENT_ORIGIN_MODE: 'centered' | 'corner'; // Grid anchor mode in world space
    GRID_GRADIENT_DISTRIBUTION: 'square' | 'hex_offset' | 'jittered'; // Grid point distribution
    GRID_GRADIENT_POSITION_JITTER: number; // Deterministic point scatter as a fraction of spacing
    GRID_GRADIENT_CENTER_SIZE_PX: number; // Largest fill primitive size at region centers
    GRID_GRADIENT_EDGE_SIZE_PX: number; // Smallest fill primitive size at borders
    GRID_GRADIENT_CURVE_POWER: number; // Distance-to-border size curve power
    GRID_GRADIENT_FILL_HUE_SHIFT_DEG: number; // Fill and border hue shift in degrees
    GRID_GRADIENT_BORDER_OFFSET_PX: number; // Fill pullback from territory borders
    GRID_GRADIENT_CELL_SHAPE: 'circle' | 'square' | 'noise'; // Primitive shape used for fill samples
    GRID_GRADIENT_VECTOR_BORDERS_ENABLED: boolean; // Draw smoothed vector borders from resolved geometry
    GRID_GRADIENT_BORDER_DOTS_ENABLED: boolean; // Overlay grid-derived dotted borders
    GRID_GRADIENT_BORDER_DOT_SIZE_PX: number; // Dotted-border primitive size
    GRID_GRADIENT_BORDER_DOT_STYLE: 'blended' | 'butted'; // One blended line or two owner-colored lines
    GRID_GRADIENT_SHADER_NEIGHBOR_MODE: 'center' | 'cross' | 'eight'; // Shader mark neighbor sampling radius
    GRID_GRADIENT_SHADER_MARK_SOFTNESS: number; // Shader mark edge softness as a radius fraction
    GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX: number; // Extra shader mark softness in world px
    GRID_GRADIENT_SHADER_NOISE_STRENGTH: number; // Procedural edge wobble for noise marks
    GRID_GRADIENT_SHADER_PULSE_STRENGTH: number; // Per-mark shader pulse amplitude
    GRID_GRADIENT_SHADER_PULSE_SPEED: number; // Per-mark shader pulse speed
    GRID_GRADIENT_SHADER_FIELD_DRIFT_PX: number; // Optional shader-only mark drift amplitude
    GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED: number; // Optional shader-only mark drift speed
    GRID_GRADIENT_SHADER_GLOW_STRENGTH: number; // Extra fill-color brightness in shader marks
    GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST: number; // Alpha boost near region interiors
    GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST: number; // Alpha boost near borders
    TERRITORY_FRONTIER_TECHNIQUE: TerritoryFrontierTechniqueId; // Frontier technique selector for shared frontier processing
    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: TerritoryFrontierBorderGeometryMode; // Control-path border geometry selector: straight shared-edge vs rounded contour-matched
    TERRITORY_FRONTIER_PHASE_SAMPLING: TerritoryFrontierPhaseSamplingMode; // Texture filtering strategy for shader frontier bands
    TERRITORY_FRONTIER_BLUR_PASSES: number; // Number of 3-tap separable blur passes on scalar phase fields
    TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: TerritoryFrontierTriangleDiagonalPolicy; // Marching-triangles diagonal selection policy
    TERRITORY_FRONTIER_CHAIKIN_PASSES: number; // Post-contour Chaikin smoothing passes
    TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: number; // Softness of shader frontier band in phase-distance units
    TERRITORY_FRONTIER_BAND_WIDTH_PX: number; // Half-width of the shader frontier band in phase-distance units
    TERRITORY_FRONTIER_JUNCTION_RENDER_MODE: TerritoryFrontierJunctionRenderMode; // Shared-junction presentation on straight shared-edge frontiers
    TERRITORY_FRONTIER_JUNCTION_RADIUS_PX: number; // Bubble radius for multi-owner shared-edge junction markers
    TERRITORY_FRONTIER_OUTER_BORDER_ENABLED: boolean; // Draw owner-vs-world outer perimeter borders instead of limiting strokes to inter-owner frontiers
    TERRITORY_FRONTIER_FX_MODE: TerritoryFrontierFxMode; // Border-inward frontier surface FX mode
    TERRITORY_FRONTIER_FX_WIDTH_PX: number; // Width of the inward frontier FX region in px
    TERRITORY_FRONTIER_FX_STRENGTH: number; // Intensity of the selected frontier FX mode
    TERRITORY_FRONTIER_FX_STEPS: number; // Quantized bands for stepped moat mode
    TERRITORY_FRONTIER_FX_SOFTNESS: number; // Falloff power for smooth inward frontier effects
    TERRITORY_FRONTIER_FX_EMISSIVE: number; // Extra glow / hot-blend weighting for animated frontier FX
    TERRITORY_FRONTIER_FX_PARTICLE_DENSITY: number; // Spark / drift density for frontier FX modes that use procedural particles
    TERRITORY_FRONTIER_FX_PULSE_SPEED: number; // Pulse speed for animated plasma rim mode
    TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE: boolean; // Apply frontier FX when no conquest transition is active
    TERRITORY_FRONTIER_FX_APPLY_TRANSITION: boolean; // Apply frontier FX during conquest transitions
    TERRITORY_MORPH_CONTROL_POINTS: number; // Number of control points for frontier loop morphing (5-300, default 32)
    TERRITORY_BOUNDARY_MODE: 'segment' | 'smooth';  // 'segment' = edge-level lerp, 'smooth' = flubber polygon morph
    TERRITORY_FILL_MODE: 'crossfade' | 'frontier';  // 'crossfade' = alpha-fade fills, 'frontier' = infill from frontier loops
    TERRITORY_FILL_TRANSITION_MODE:
        | 'frontier_morph'
        | 'active_front'
        | 'unified_topology'
        | 'pv_frontline'
        | 'crossfade'
        | 'legacy_fill_active_front'
        | 'topology_fill_rebuild'
        | 'legacy_fill_crossfade'
        | 'off'; // Fill transition selector spanning legacy and clean-arch ids
    TERRITORY_BORDER_TRANSITION_MODE: 'optimal_transport' | 'rope_morph' | 'off'; // Clean-arch border transition selector
    TERRITORY_STYLE_MODE: 'vector' | 'distance_field' | 'pixel'; // Clean-arch presentation style selector
    // ── Morph Diagnostics ─────────────────────────────────────────────────────
    DEBUG_MORPH_VERTICES: boolean;        // Show numbered vertex dots on territory polygons during morph
    DEBUG_MORPH_VERTEX_SIZE: number;      // Radius of vertex dots (px, default 3)
    DEBUG_MORPH_PIN_THRESHOLD: number;    // Displacement below which a vertex is "pinned" (green) vs "morph" (red)
    MORPH_CONQUEST_RADIUS: number;        // Max distance from conquered star for morph (0=disabled, px)
    DEBUG_MORPH_TRACE_LOG: boolean;       // Log per-vertex start/end/distance trace on transition start
    DEBUG_MORPH_SLOWMO: boolean;          // 10X slow-motion: multiply TERRITORY_TRANSITION_MS by 10
    DEBUG_MORPH_VERTEX_NTH: number;       // Show label on every Nth vertex (1=all, 10=every 10th, default 10)
    DEBUG_MORPH_VERTEX_COLOR_MODE: string; // Vertex dot color mode: 'pinmorph' | 'owner' | 'neutral'
    DEBUG_MORPH_VERTEX_LABELS: boolean;    // Draw numeric index labels on vertex dots (default true)
    
    // ── DY4 Transition Isolation (F-138) ──────────────────────────────────────
    DEBUG_DY4_DISABLE_FILL_CROSSFADE: boolean;
    DEBUG_DY4_DISABLE_BORDER_TRANSITION: boolean;
    DEBUG_DY4_FORCE_TRANSITION_START: boolean;
    TERRITORY_METABALL: boolean;   // Enable Metaball territory renderer (default false)
    TERRITORY_PIXEL: boolean;      // Enable Pixel (nearest-neighbor) territory renderer (default false)
    TERRITORY_CLUSTER_SPLIT: boolean; // Split disconnected same-owner stars into separate territory blobs (default false)
    TERRITORY_MODE: 'voronoi' | 'metaball' | 'off';  // LEGACY — kept for compat
    TERRITORY_DISTANCE_FIELD: boolean; // Enable distance-field territory renderer (default false)
    TERRITORY_RENDER_MODE: string;    // Active render mode: 'none' | 'vs_pvv3' | 'power_voronoi' | 'distance_field' | 'voronoi' | 'metaball' | 'cell_grid' | 'phase_edges' | 'ember_lattice' | 'phase_field' | 'grid_gradient' | 'perimeter_field' | 'pixel' | 'graph' | 'contour'
    /** When true, legacy modes without a registered RenderFamily adapter are gated in UI; metaball may use family path. Default false. */
    USE_RENDER_FAMILIES: boolean;
    TERRITORY_ARCHITECTURE_PATH: 'clean' | 'legacy'; // Master architecture selector for runtime territory mode

    // ── Distance Field Territory ──────────────────────────────────────────────
    DF_RESOLUTION: number;          // Grid resolution divisor (4 = quarter res, default 4)
    DF_ALPHA: number;               // Fill opacity (default 0.3)
    DF_BORDER_WIDTH: number;        // Border band width in world px (default 15)
    DF_BORDER_SOFTNESS: number;     // Border feather width in world px (default 8)
    DF_BORDER_ALPHA: number;        // Border opacity multiplier (default 0.8)
    DF_BORDER_BRIGHTEN: number;     // Border color brightening amount 0-255 (default 40)
    DF_BORDER_MODE: number;         // Border rendering mode: 0=gap (organic), 1=even (uniform width), 2=layered (fwidth-diff)
    DF_BORDER_FAMILY: 'straight' | 'curved' | 'segmented'; // Vector border family dispatch (default 'straight')
    DF_BORDER_ENGINE: 'mesh' | 'legacy_field' | 'legacy_grid'; // Border engine routing: mesh vector + legacy reference modes
    DF_VECTOR_FRONTIER_RUNTIME_MODE: 'disabled' | 'diagnostic' | 'production'; // Vector frontier rollout gate (default 'disabled')
    DF_VECTOR_FRONTIER_DIAGNOSTIC_SHOW: boolean; // Render vector frontier in diagnostic mode when true
    DF_BORDER_HQ_ENABLED: boolean;  // Enable supersampled border field for smoother edges (default false)
    DF_BORDER_HQ_SCALE: number;     // Supersample factor for ownership/JFA pass (1.0-4.0, default 2.0)
    DF_BORDER_HQ_MAX_DIM: number;   // Max ownership/JFA texture dimension in HQ mode (default 8192)
    DF_VECTOR_BORDERS_ENABLED: boolean; // Draw DF borders using vector polylines (default false)
    DF_VECTOR_GRID_RESOLUTION: number;  // Ownership sampling grid on long axis (default 192)
    DF_VECTOR_SMOOTHING: number;        // Straight-line regularization passes for vector borders (default 1)
    DF_VECTOR_SIMPLIFY: number;         // Polyline simplify tolerance in world px (default 0.5)
    DF_VECTOR_UPDATE_MS: number;        // Rebuild interval while morphing (ms, default 33)
    DF_MORPH_EASING: 'linear' | 'easeInOutQuad' | 'easeInOutCubic' | 'smoothstep'; // Fill/border morph easing curve (default 'linear')
    DF_DISTANCE_METRIC: 'hops' | 'length'; // Distance metric (default 'length')
    DF_BLUR: number;                // Post-render blur strength (default 2)
    DF_HUE: number;                 // Hue shift in degrees -180..180 (default 0)
    DF_SATURATION: number;          // Color saturation mult (default 0.7)
    DF_LIGHTNESS: number;           // Color lightness mult (default 0.5)
    DF_EDGE_FADE: number;           // Edge fade padding in px (default 200)
    DF_ROUNDING: number;            // Canvas-level blur to round sharp territory corners (default 3)
    DF_INFLUENCE_WEIGHT: number;    // How much graph distance matters (0 = pure Voronoi, 1.0 = full influence, default 1.0)
    DF_EXPANSION: number;           // Mesh quad expansion factor beyond padding (0.0 = none, 0.5 = 50%, default 0.10)
    DF_SMOOTHING: number;           // Junction corner smoothing radius in influence units (0 = sharp, default 30)
    DF_MIN_STAR_RADIUS: number;     // Minimum guaranteed territory radius around each star in px (default 40)
    DF_CORRIDOR_ENABLED: boolean;   // Enable corridor virtual sites along same-owner lanes
    DF_CORRIDOR_MODE: string;       // 'spacing' = fixed px distance, 'count' = fixed count per lane
    DF_CORRIDOR_SPACING: number;    // Distance between corridor virtual sites in px (default 60)
    DF_CORRIDOR_COUNT: number;      // Fixed number of virtual stars per lane (default 3)
    DF_CORRIDOR_WEIGHT: number;     // Corridor influence weight multiplier (default 1.0)
    DF_DISCONNECT_ENABLED: boolean; // Enable disconnect virtual sites between unconnected same-owner stars
    DF_DISCONNECT_DISTANCE: number; // Max distance for disconnect detection in px (default 400)
    DF_DISCONNECT_WEIGHT: number;   // Disconnect influence weight multiplier (default 0.3)

    // ── Modified Voronoi Territory (F-138) ────────────────────────────────────
    MODIFIED_VORONOI_STAR_MARGIN: number;      // Territory/frontier breathing room around owned stars (px, 0-500); independent from lane margin
    TERRITORY_MSR_STAR_BIAS: number;           // Optional advanced solve-time star resistance against corridor / lane-pair / disconnect shaping (0.0-2.0, default 0.0)
    TERRITORY_MSR_STAR_POWER_ENABLED: boolean; // Legacy compatibility only; replaced in surfaced UI by TERRITORY_MSR_STAR_BIAS
    TERRITORY_MSR_STAR_POWER_MODE: string;     // Legacy compatibility only; old MSR star-power conversion mode ('linear'|'squared'|'exponent')
    TERRITORY_MSR_STAR_POWER_GAIN: number;     // Legacy compatibility only; old gain before converting MSR into real-star power
    TERRITORY_MSR_STAR_POWER_EXPONENT: number; // Legacy compatibility only; old exponent used when mode='exponent'
    TERRITORY_MSR_STAR_POWER_CAP_PX: number;   // Legacy compatibility only; old max MSR value in px allowed to feed star-power conversion
    MODIFIED_VORONOI_ARC_STRENGTH: number;     // How far to retract sharp vertex toward origin (0-1)
    MODIFIED_VORONOI_ARC_THRESHOLD: number;    // Interior angle below which arc smoothing activates (°)
    MODIFIED_VORONOI_ARC_MIN_SEGMENT: number;  // Min line-segment length for Bézier tessellation (px)
    MODIFIED_VORONOI_ARC_MAX_SEGMENTS: number; // Cap Bézier samples per corner (4-64, higher=smoother/slower)
    MODIFIED_VORONOI_CORRIDOR_ENABLED: boolean; // Inject virtual sites along same-owner lanes for corridor effect
    MODIFIED_VORONOI_CORRIDOR_SPACING: number;  // Distance between virtual corridor sites in px (10-200)
    TERRITORY_CX_COUNT: number;     // Number of corridor vstars per lane (0 = auto from spacing, range 0-20)
    TERRITORY_CX_WEIGHT: number;    // Corridor vstar weight multiplier against the fixed virtual-site reference weight (0.0-2.0, default 0.5)
    TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: boolean; // Add paired midpoint contest vstars on cross-owner lanes
    TERRITORY_CX_CONTEST_PAIR_COUNT: number; // Number of paired midpoint samples per owner on contested lanes (1-10)
    TERRITORY_CX_CONTEST_PAIR_WEIGHT: number; // Weight multiplier for contested midpoint-pair vstars (0.0-2.0, default 0.5)
    TERRITORY_CX_CONTEST_PAIR_SPACING: number; // Spacing in px used to offset contested midpoint pairs around the lane midpoint (10-500)
    MODIFIED_VORONOI_DISCONNECT_ENABLED: boolean; // Inject enemy virtual sites to separate non-connected same-owner territories
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: number; // Max distance between same-owner stars for disconnect injection (px, 0-1000)
    TERRITORY_DX_WEIGHT: number;    // Disconnect vstar weight multiplier against the fixed virtual-site reference weight (0.0-5.0, default 3.0)

    // ── Voronoi Territory ───────────────────────────────────────────────────
    SHOW_VORONOI: boolean;         // Show contiguous Voronoi territory fill (default true)
    NEUTRAL_TERRITORY_TRANSPARENT: boolean; // When true, neutral/unowned territory has no fill (fully transparent)
    VORONOI_ALPHA: number;         // Alpha for Voronoi territory (default 0.15)
    VORONOI_RESOLUTION: number;    // Pixel territory downscale factor (4=fastest, 1=sharpest)
    VORONOI_EDGE_BLEND: number;    // Edge blend radius for pixel territory (0=off)
    VORONOI_BORDER_WIDTH: number;  // Border line width between territories in pixels (0=off, default 2)
    VORONOI_BORDER_ALPHA: number;  // Alpha for territory border lines (default 0.4)
    VORONOI_BORDER_BRIGHTEN: number; // How much to brighten border color (0-255, default 80)
    VORONOI_BORDER_SMOOTH: number;   // Chaikin smoothing passes for PVV2 shared-edge borders (0=angular, 1-5=rounded, default 3)
    CHAIKIN_BOUNDARY_PAD: number;     // World-clip boundary padding in px for Voronoi diagram (default 50)
    CHAIKIN_BOUNDARY_EPS: number;     // Proximity threshold in px for detecting points on world boundary (default 6)
    BORDER_TRANS_EASING: string;     // Easing function for border transitions ('cubic'|'back'|'elastic', default 'back')
    BORDER_TRANS_RESAMPLE_N: number; // Number of resample points per polyline for morphing (8-64, default 32)
    BORDER_TRANS_OVERSHOOT: number;  // Back easing overshoot amount (0-5, default 1.7)
    TERRITORY_BORDER_TRANSITION: string; // Border transition mode ('pixi_graphics_morph'|'pixi_mesh_rope'|'smooth_morph'|'none')
    FRONTIER_RESOLUTION: number;     // Frontier vertex spacing in pixels (1-32, default 1). Lower = denser vertices = smoother morphing
    TERRITORY_GEOMETRY_MODE: string;  // Geometry data mode: 'power_voronoi' (dual-path) | 'unified_polygon' (single-path dense resampled)
    VORONOI_SATURATION: number;    // Saturation multiplier for Voronoi colors (0=grey, 1=normal, 2=vivid, default 1.0)
    VORONOI_LIGHTNESS: number;     // Lightness multiplier for Voronoi colors (0=dark, 1=normal, 2=bright, default 0.7)
    VORONOI_GLOW_RADIUS: number;   // Territory glow bleed radius as fraction of map size (0-1, default 0.3)
    VORONOI_GLOW_ALPHA: number;    // Peak glow alpha (0-0.2, default 0.04)
    VORONOI_GLOW_LAYERS: number;   // Number of concentric glow layers (1-8, default 4)
    VORONOI_BLUR: number;          // GPU blur strength for smooth territory edges (0=sharp, 8=soft, default 8)
    VORONOI_SMOOTHING: number;     // Chaikin smoothing iterations (0=angular, 1-4=rounded, default 2)
    VORONOI_GRADIENT_BLEND: boolean; // Enable gradient blending at territory borders (default true)
    VORONOI_BLEND_WIDTH: number;   // Gradient blend strip width in px (default 30)

    // ── Visual Overrides ────────────────────────────────────────────────────────────
    BG_IMAGE_URL: string;          // Background image url relative to /assets/
    BG_IMAGE_ALPHA: number;        // Background image opacity (0-1, default 0.5)

    // ── Metaball Territory ──────────────────────────────────────────────────
    METABALL_INFLUENCE_RADIUS: number;  // How far each star's field extends in px (default 120)
    METABALL_FALLOFF: 'inverse-square' | 'gaussian' | 'smoothstep';  // Falloff curve (default 'inverse-square')
    METABALL_BLEND_SHARPNESS: number;   // Higher = sharper faction boundaries (default 3.0)
    TERRITORY_SURFACE_ALPHA: number;             // Overall territory transparency (default 0.5)
    METABALL_CELL_SIZE: number;         // Grid cell size in px — lower = higher res but slower (default 8)
    /**
     * Metaball dominance gate: per cell, winnerShare = w1/(w1+w2) for top two factions.
     * Values ≤0.5 disable the gate (no cells dropped for being “too close”).
     * Above 0.5, cells with winnerShare below this stay empty (hides stalemate bands).
     */
    METABALL_THRESHOLD: number;
    METABALL_STRENGTH_MULT: number;     // Star strength multiplier (default 1.0)
    METABALL_EDGE_FADE: number;         // Edge alpha falloff multiplier (default 3.0)
    METABALL_BLUR: number;              // GPU blur strength (0=sharp). Target: fill only, or fill+borders — see METABALL_BLUR_AFFECTS_BORDERS
    /** When true and METABALL_BLUR > 0, blur applies to a shared layer (fill + borders). When false, only fill Graphics is blurred. */
    METABALL_BLUR_AFFECTS_BORDERS: boolean;
    TERRITORY_SURFACE_FILL_ENABLED: boolean;     // Master fill visibility gate for metaball-style territory surfaces
    TERRITORY_SURFACE_BORDER_WIDTH: number;       // Border line width between territories (default 1.5)
    TERRITORY_SURFACE_BORDER_ALPHA: number;       // Border line alpha (default 0.6)
    TERRITORY_SURFACE_BORDER_ENABLED: boolean;   // Master border visibility gate for metaball-style territory surfaces
    TERRITORY_SURFACE_BORDER_BLEND?: boolean;    // Draw an inter-owner frontier as a single stroke in the 50/50 mix of both owners' colors (opponent-blended borders)
    METABALL_COVERAGE: number;           // Grid padding factor (0=compact, 0.3=extended, default 0.3)
    TERRITORY_SURFACE_SATURATION: number;         // Saturation multiplier (0=grey, 1=normal, 2=vivid, default 1.0)
    TERRITORY_SURFACE_LIGHTNESS: number;          // Lightness multiplier (0=dark, 1=normal, 2=bright, default 1.0)
    TERRITORY_SURFACE_BORDER_SATURATION: number; // Border saturation multiplier (default 1)
    TERRITORY_SURFACE_BORDER_LIGHTNESS: number;  // Border lightness multiplier (default 1)
    METABALL_CHAIKIN_PASSES: number;    // Chaikin smoothing passes on border polylines (0=off, 1-4, default 0)
    /** 0 = no combat border boost; else tick window for lastCombatTick / lastAttackTick */
    METABALL_COMBAT_BORDER_TICKS: number;
    /**
     * Max distance (px) from a border segment to a “hot” star for combat width/alpha boost.
     * 0 = use METABALL_INFLUENCE_RADIUS as the distance (no extra literals in renderer).
     */
    METABALL_COMBAT_BORDER_PROXIMITY_PX: number;
    METABALL_COMBAT_BORDER_WIDTH_BOOST: number; // Extra border width when stars on edge are "hot" (default 0)
    METABALL_COMBAT_BORDER_ALPHA_BOOST: number; // Extra border alpha when hot (default 0)
    /** Scale border emphasis by fleet imbalance across edge: 0=off, 1=moderate (default 0) */
    METABALL_BORDER_FORCE_RATIO: number;
    // ── Pixel Territory ────────────────────────────────────────────────────
    PIXEL_ALPHA: number;             // Pixel territory alpha (0-1, default 0.15)
    PIXEL_RESOLUTION: number;        // Downscale factor (1=sharpest, 8=fastest, default 4)
    PIXEL_EDGE_BLEND: number;        // Edge blend softness (0=off, 1-10, default 0)
    PIXEL_BLUR: number;              // GPU blur strength (0=sharp, default 4)
    PIXEL_BLEND_POWER: number;       // DEPRECATED — replaced by PIXEL_CORRIDOR_BOOST
    PIXEL_CORRIDOR_BOOST: number;    // Same-owner distance discount for corridor guarantee (0=off, 0.3=natural, 0.6=strong, default 0.3)
    PIXEL_HUE_SHIFT: number;         // Hue rotation offset in degrees (0-360, default 0)
    PIXEL_BORDER_WIDTH: number;      // Territory border thickness in pixels (0=off, 1-4, default 1)
    PIXEL_BORDER_ALPHA: number;      // Border line alpha (0-1, default 0.6)
    PIXEL_BORDER_BRIGHTEN: number;   // How much to brighten border color (0-255, default 80)
    PIXEL_PATTERN: 'none' | 'stripes' | 'crosshatch' | 'dots';  // Pattern overlay on territory fill
    PIXEL_PATTERN_SCALE: number;     // Pattern size/density (1=fine, 10=coarse, default 4)
    PIXEL_PATTERN_ROTATION: number;  // Per-player pattern rotation (0=off, 1=golden angle, 0-1=blend)
    PIXEL_EDGE_FADE: number;         // Edge fade padding beyond gameboard in world pixels (0=off, 200=default)
    PIXEL_LANE_CONSTRAIN: number;    // Constrain territory to connection directions (0=off, 0.5=moderate, 1=strict lane-only)
    PIXEL_PRESSURE: number;          // Shift boundaries by ship count (0=off, 0.5=moderate, 1=full proportional)
    PIXEL_SATURATION: number;        // Saturation multiplier (0=grey, 1=normal, 2=vivid, default 1.0)
    PIXEL_LIGHTNESS: number;         // Lightness multiplier (0=dark, 1=normal, 2=bright, default 1.0)

    // ── Graph Territory (4th mode — connection-graph-constrained) ──
    TERRITORY_GRAPH: boolean;        // Enable graph-constrained territory renderer (default false)
    GRAPH_ALPHA: number;             // Fill alpha (0-0.5, default 0.15)
    GRAPH_RESOLUTION: number;        // Downsample factor (1-8, default 4)
    GRAPH_BLUR: number;              // GPU blur strength (0-20, default 4)
    GRAPH_PRESSURE: number;          // Ship-count boundary shifting (0=off, 1=moderate, 5=extreme)
    GRAPH_CORRIDOR_BOOST: number;    // Same-owner corridor capsule width (0-0.9, default 0.3)
    GRAPH_BORDER_WIDTH: number;      // Border pixel width (0-4, default 1)
    GRAPH_BORDER_ALPHA: number;      // Border alpha (0-1, default 0.6)
    GRAPH_BORDER_BRIGHTEN: number;   // Border brighten amount (0-255, default 80)
    GRAPH_EDGE_FADE: number;         // Edge fade padding in world px (0-500, default 120)
    GRAPH_BARRIER_EXTENT: number;    // (legacy, kept for Graph mode) Barrier length multiplier
    GRAPH_PATTERN: 'none' | 'stripes' | 'crosshatch' | 'dots';
    GRAPH_PATTERN_SCALE: number;
    GRAPH_PATTERN_ROTATION: number;
    // Lane-specific influence parameters
    LANE_INFLUENCE: number;          // How strong lane corridor influence is vs direct (1-10, default 5)
    LANE_WIDTH: number;              // Half-width of lane influence corridor in world px (20-200, default 60)
    LANE_DIRECT_FALLOFF: number;     // How fast direct star influence fades (0.1-5, default 1.0)
    LANE_THRESHOLD: number;          // Minimum influence to claim territory (0-0.5, default 0.01)
    GRAPH_SATURATION: number;        // Graph/Lane saturation multiplier (0=grey, 1=normal, 2=vivid, default 1.0)
    GRAPH_LIGHTNESS: number;         // Graph/Lane lightness multiplier (0=dark, 1=normal, 2=bright, default 1.0)
    // Border feel post-processing
    BORDER_FEEL: 'raw' | 'smooth' | 'angular';  // Border shape style: raw=pixel edges, smooth=morphological, angular=geometric segments
    BORDER_SMOOTH: number;           // Smoothing iterations for border feel (0-5, default 2)

    // ── Contour Territory (5th mode — vector contour extraction) ──
    TERRITORY_CONTOUR: boolean;      // Enable contour territory renderer (default false)
    CONTOUR_RESOLUTION: number;      // Grid size for ownership computation (64-256, default 128)
    CONTOUR_SIMPLIFY: number;        // Douglas-Peucker tolerance (0-20, default 5)
    CONTOUR_SMOOTH: number;          // Chaikin subdivision iterations (0-4, default 2)
    CONTOUR_FILL_ALPHA: number;      // Fill opacity (0-1, default 0.15)
    CONTOUR_BORDER_WIDTH: number;    // Border stroke width (0-8, default 2)
    CONTOUR_BORDER_ALPHA: number;    // Border opacity (0-1, default 0.6)
    CONTOUR_BORDER_BRIGHTEN: number; // Border brighten amount (0-255, default 80)
    CONTOUR_SATURATION: number;      // Saturation multiplier (0-2, default 1.0)
    CONTOUR_LIGHTNESS: number;       // Lightness multiplier (0-2, default 1.0)
    CONTOUR_CORNER_RADIUS: number;   // Corner rounding radius in grid cells (0=off, 1-10)
    CONTOUR_CORNER_THRESHOLD: number;// Angle threshold in degrees below which corners are rounded (0-180, default 120)
    CONTOUR_PERIPHERY_STRENGTH: number; // Periphery ownership strength (0=off, 1=full hull override)
    CONTOUR_PERIPHERY_INSET: number; // How far inside the lane the periphery boundary sits (px, default 0)
    CONTOUR_JUNCTION_CORRECTION: number; // F-135: Angle equalization at multi-owner junctions (0=off, 1=full, default 0.5)

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

    // ── Audio Settings ──────────────────────────────────────────────────────
    AUDIO_MASTER_VOLUME: number;         // Master volume (0-1, default 0.5)
    AUDIO_MUTED: boolean;                // Global mute (default false)
    AUDIO_SEPARATE_CONQUEST: boolean;    // Use subtype-specific conquest sounds (default true)

    // Per-sound volumes (0-1)
    AUDIO_VOL_CLICK: number;
    AUDIO_VOL_MOVE: number;
    AUDIO_VOL_ATTACK: number;
    AUDIO_VOL_CHAT: number;
    AUDIO_VOL_TICK: number;
    AUDIO_VOL_PLAY: number;
    AUDIO_VOL_LOSE: number;
    AUDIO_VOL_WIN: number;
    AUDIO_VOL_NEW_PLAYER: number;
    AUDIO_VOL_CONQUEST: number;
    AUDIO_VOL_CONQUEST_RETREAT: number;
    AUDIO_VOL_CONQUEST_SCATTER: number;
    AUDIO_VOL_CONQUEST_COMPLETE: number;
    AUDIO_VOL_STARLOSS: number;

    // Per-sound file paths (relative to /sounds/)
    AUDIO_FILE_CLICK: string;
    AUDIO_FILE_MOVE: string;
    AUDIO_FILE_ATTACK: string;
    AUDIO_FILE_CHAT: string;
    AUDIO_FILE_TICK: string;
    AUDIO_FILE_PLAY: string;
    AUDIO_FILE_LOSE: string;
    AUDIO_FILE_WIN: string;
    AUDIO_FILE_NEW_PLAYER: string;
    AUDIO_FILE_CONQUEST: string;
    AUDIO_FILE_CONQUEST_RETREAT: string;
    AUDIO_FILE_CONQUEST_SCATTER: string;
    AUDIO_FILE_CONQUEST_COMPLETE: string;
    AUDIO_FILE_STARLOSS: string;

    // Per-sound start offset in seconds — keyed to the current file.
    // When loading a theme, offsets only apply if the file path matches.
    AUDIO_OFFSET_CLICK: number;
    AUDIO_OFFSET_MOVE: number;
    AUDIO_OFFSET_ATTACK: number;
    AUDIO_OFFSET_CHAT: number;
    AUDIO_OFFSET_TICK: number;
    AUDIO_OFFSET_PLAY: number;
    AUDIO_OFFSET_LOSE: number;
    AUDIO_OFFSET_WIN: number;
    AUDIO_OFFSET_NEW_PLAYER: number;
    AUDIO_OFFSET_CONQUEST: number;
    AUDIO_OFFSET_CONQUEST_RETREAT: number;
    AUDIO_OFFSET_CONQUEST_SCATTER: number;
    AUDIO_OFFSET_CONQUEST_COMPLETE: number;
    AUDIO_OFFSET_STARLOSS: number;
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
        if (raw) {
            const o = JSON.parse(raw) as Record<string, unknown>;
            // Lane margin split from MSR (2026-04-10): old saves had additive buffer only
            if ('MAPGEN_LANE_BUFFER_PX' in o && !('MAPGEN_LANE_MARGIN_PX' in o)) {
                const buf = Number(o.MAPGEN_LANE_BUFFER_PX) || 30;
                const msr = Number(o.MODIFIED_VORONOI_STAR_MARGIN) || 45;
                o.MAPGEN_LANE_MARGIN_PX = msr + buf;
                if (!('MAPGEN_LANE_MARGIN_ENABLED' in o)) {
                    o.MAPGEN_LANE_MARGIN_ENABLED = true;
                }
                delete o.MAPGEN_LANE_BUFFER_PX;
            }
            if ('PERIMETER_FIELD_GEOMETRY_SOURCE' in o) {
                o.PERIMETER_FIELD_GEOMETRY_SOURCE =
                    normalizePerimeterFieldGeometrySource(
                        o.PERIMETER_FIELD_GEOMETRY_SOURCE,
                    );
            }
            return o as Partial<GameConfigType>;
        }
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
    ...gameplayConfigDefaults,
    ...aiConfigDefaults,
    ...rendererConfigDefaults,
    ...territoryConfigDefaults,
    ...audioConfigDefaults,
};

export const DEFAULT_GAME_CONFIG: Readonly<GameConfigType> = Object.freeze({ ..._rawConfig });

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
            GLOBAL_DAMAGE_MODIFIER: GAME_CONFIG.GLOBAL_DAMAGE_MODIFIER,
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


