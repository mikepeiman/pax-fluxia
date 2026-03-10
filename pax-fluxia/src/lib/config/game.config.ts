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
    STAR_RING_OFFSET: number;      // Distance of ownership ring from star center in % of radius (default 20)
    STAR_RING_WIDTH: number;       // Ownership ring stroke width in px (default 2)
    STAR_RING_ALPHA: number;       // Ownership ring opacity (0-1, default 0.8)
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
    SHOW_STAR_POWER: boolean;       // Show star power alpha overlay behind stars (default true)
    STAR_POWER_ALPHA: number;       // Alpha for star power overlay (default 0.08)
    STAR_POWER_RADIUS_MULT: number; // Radius multiplier for star power circles (default 3.0)
    STAR_POWER_LAYERS: number;      // Number of concentric gradient layers (1-12, default 4)
    STAR_POWER_BLUR: number;        // GPU blur on halos (0=off, default 4)
    HALO_FLEET_SCALE: boolean;     // Bind halo alpha to ship count (default true)
    HALO_FLEET_MODE: string;       // 'stepped' (original: +intensity per step) or 'linear' (smooth)
    HALO_FLEET_INTENSITY: number;  // Intensity multiplier for ship-count binding (0-2, default 1.0)
    HALO_FLEET_STEP_SIZE: number;  // Ships per step for 'stepped' mode (default 500)
    HALO_FLEET_MAX_SHIPS: number;  // Ship count for full alpha in 'linear' mode (default 500)

    // ── Territory Toggles ──────────────────────────────────────────────────────
    TERRITORY_VORONOI: boolean;    // Enable Voronoi territory renderer (default true)
    TERRITORY_MODIFIED_VORONOI: boolean; // Enable Modified Voronoi territory renderer (F-138, default false)
    TERRITORY_POWER_VORONOI: boolean;    // Enable Power Voronoi V2 territory renderer (F-138v2, default false)
    TERRITORY_TRANSITION_MS: number;      // Duration of territory morph animation in ms (0 = instant, default 400)
    TERRITORY_MORPH_CONTROL_POINTS: number; // Number of control points for frontier loop morphing (5-300, default 32)
    TERRITORY_BOUNDARY_MODE: 'segment' | 'smooth';  // 'segment' = edge-level lerp, 'smooth' = flubber polygon morph
    TERRITORY_FILL_MODE: 'crossfade' | 'frontier';  // 'crossfade' = alpha-fade fills, 'frontier' = infill from frontier loops
    TERRITORY_METABALL: boolean;   // Enable Metaball territory renderer (default false)
    TERRITORY_PIXEL: boolean;      // Enable Pixel (nearest-neighbor) territory renderer (default false)
    TERRITORY_CLUSTER_SPLIT: boolean; // Split disconnected same-owner stars into separate territory blobs (default false)
    TERRITORY_MODE: 'voronoi' | 'metaball' | 'off';  // LEGACY — kept for compat
    TERRITORY_DISTANCE_FIELD: boolean; // Enable distance-field territory renderer (default false)

    // ── Distance Field Territory ──────────────────────────────────────────────
    DF_RESOLUTION: number;          // Grid resolution divisor (4 = quarter res, default 4)
    DF_ALPHA: number;               // Fill opacity (default 0.3)
    DF_BORDER_WIDTH: number;        // Border band width in world px (default 15)
    DF_BORDER_SOFTNESS: number;     // Border feather width in world px (default 8)
    DF_BORDER_ALPHA: number;        // Border opacity multiplier (default 0.8)
    DF_BORDER_BRIGHTEN: number;     // Border color brightening amount 0-255 (default 40)
    DF_BORDER_MODE: number;         // Border rendering mode: 0=gap (organic), 1=even (uniform width), 2=layered (fwidth-diff)
    DF_BORDER_FAMILY: 'straight' | 'curved' | 'segmented'; // Vector border family dispatch (default 'straight')
    DF_BORDER_ENGINE: 'mesh' | 'legacy_field' | 'legacy_grid'; // Border engine routing: mesh canonical + legacy reference modes
    DF_CANONICAL_FRONTIER_RUNTIME_MODE: 'disabled' | 'diagnostic' | 'production'; // Canonical frontier rollout gate (default 'disabled')
    DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW: boolean; // Render canonical frontier in diagnostic mode when true
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
    MODIFIED_VORONOI_STAR_MARGIN: number;      // Min boundary distance from star centers in px (0-500)
    MODIFIED_VORONOI_ARC_STRENGTH: number;     // How far to retract sharp vertex toward origin (0-1)
    MODIFIED_VORONOI_ARC_THRESHOLD: number;    // Interior angle below which arc smoothing activates (°)
    MODIFIED_VORONOI_ARC_MIN_SEGMENT: number;  // Min line-segment length for Bézier tessellation (px)
    MODIFIED_VORONOI_CORRIDOR_ENABLED: boolean; // Inject virtual sites along same-owner lanes for corridor effect
    MODIFIED_VORONOI_CORRIDOR_SPACING: number;  // Distance between virtual corridor sites in px (20-200)
    MODIFIED_VORONOI_DISCONNECT_ENABLED: boolean; // Inject enemy virtual sites to separate non-connected same-owner territories
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: number; // Max distance between same-owner stars for disconnect injection (px)

    // ── Voronoi Territory ───────────────────────────────────────────────────
    SHOW_VORONOI: boolean;         // Show contiguous Voronoi territory fill (default true)
    VORONOI_ALPHA: number;         // Alpha for Voronoi territory (default 0.15)
    VORONOI_RESOLUTION: number;    // Pixel territory downscale factor (4=fastest, 1=sharpest)
    VORONOI_EDGE_BLEND: number;    // Edge blend radius for pixel territory (0=off)
    VORONOI_BORDER_WIDTH: number;  // Border line width between territories in pixels (0=off, default 2)
    VORONOI_BORDER_ALPHA: number;  // Alpha for territory border lines (default 0.4)
    VORONOI_BORDER_BRIGHTEN: number; // How much to brighten border color (0-255, default 80)
    VORONOI_BORDER_SMOOTH: number;   // Chaikin smoothing passes for PVV2 shared-edge borders (0=angular, 1-5=rounded, default 3)
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

    // ── Metaball Territory ──────────────────────────────────────────────────
    METABALL_INFLUENCE_RADIUS: number;  // How far each star's field extends in px (default 120)
    METABALL_FALLOFF: 'inverse-square' | 'gaussian' | 'smoothstep';  // Falloff curve (default 'inverse-square')
    METABALL_BLEND_SHARPNESS: number;   // Higher = sharper faction boundaries (default 3.0)
    METABALL_ALPHA: number;             // Overall territory transparency (default 0.5)
    METABALL_CELL_SIZE: number;         // Grid cell size in px — lower = higher res but slower (default 8)
    METABALL_THRESHOLD: number;         // Minimum influence to draw (0-1, default 0.05)
    METABALL_STRENGTH_MULT: number;     // Star strength multiplier (default 1.0)
    METABALL_EDGE_FADE: number;         // Edge alpha falloff multiplier (default 3.0)
    METABALL_BLUR: number;              // GPU blur on metaball container (0=sharp, default 4)
    METABALL_BORDER_WIDTH: number;       // Border line width between territories (default 1.5)
    METABALL_BORDER_ALPHA: number;       // Border line alpha (default 0.6)
    METABALL_COVERAGE: number;           // Grid padding factor (0=compact, 0.3=extended, default 0.3)
    METABALL_SATURATION: number;         // Saturation multiplier (0=grey, 1=normal, 2=vivid, default 1.0)
    METABALL_LIGHTNESS: number;          // Lightness multiplier (0=dark, 1=normal, 2=bright, default 1.0)

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
    BASE_TICK_MS: 1050,

    /** Minimum tick interval at max speed (ms) */
    MIN_TICK_MS: 100,

    /** Animation interpolation speed (ms) - controls visual smoothness of tick progress.
     *  Lower = faster visual transitions. Separate from actual tick rate. */
    ANIMATION_SPEED_MS: 1050,

    /** Bind animation speed to tick duration */
    BIND_ANIMATION_TO_TICK: true,

    /** Smooth transition duration for ship count labels (ms, 0=instant) */
    NUMBER_TRANSITION_MS: 120,

    /** Label animation mode: 'rolling' = smooth lerp, 'fade' = alpha flash, 'instant' = snap */
    LABEL_ANIM_MODE: 'rolling' as const,

    // ========================================================================
    // TRANSFER MECHANICS
    // ========================================================================

    /** Percentage of ships that transfer per tick (0.0 - 1.0) */
    TRANSFER_RATE: 0.1,

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
    // 2. LETHALITY: % of damage that destroys ships (rest disables).
    //    High = decisive battles. Low = attrition + repair matters.
    //
    // 3. FORCE_RATIO_EFFECT: Non-linear bonus for numerical superiority.
    //    Uses log2(ratio) so 8:1 only gives 3x bonus of 2:1.
    //
    // 4. CONQUEST_THRESHOLD: Attackers need Nx defender ships to overwhelm.
    // ========================================================================

    /** Tilts damage toward attacker (>1) or defender (<1). 1.0 = symmetric. */
    AGGRESSOR_ADVANTAGE: 0.7,

    /** Global damage scalar (percentage). 100 = full, 50 = half, 200 = double */
    GLOBAL_DAMAGE_MODIFIER: 8,

    /** Fraction of damage that destroys ships (rest disables). Range: 0-1 */
    LETHALITY: 0.25,

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
    REPAIR_RATE: 7,

    /** Minimum ships repaired per tick */
    MIN_REPAIR: 1,

    /** Repair multiplier when under attack (0.0 - 1.0) */
    REPAIR_COMBAT_PENALTY: 0.1,
    REPAIR_SUPPRESS_ATTACKER: 0.5,
    REPAIR_SUPPRESS_DEFENDER: 0.9,

    // ========================================================================
    // CONQUEST
    // ========================================================================

    /** Percentage of remaining ships that transfer on capture */
    CONQUEST_TRANSFER_PERCENTAGE: 40,

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
    SCATTER_DESTROY_RATE: 0.5,

    /** % of damaged ships converted to active on retreat/scatter (0=stay damaged, 1=all activate) */
    RETREAT_DAMAGED_ACTIVATION_RATE: 0.1,


    /** Starting ships per star at game start */
    STARTING_SHIPS: 70,

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
    AI_TACTICAL_AGGRESSION: 0.29,

    /** Chance per evaluation to ignore ratio rules and attack anyway (0-1) */
    AI_RANDOM_AGGRESSION: 0.24,

    // ========================================================================
    // VISUAL
    // ========================================================================

    /** Base ship render size */
    SHIP_BASE_SIZE: 3.3,

    /** Visual radius of stars on canvas */
    STAR_RENDER_RADIUS: 25,

    /** Background Image */
    BG_IMAGE_URL: "",

    /** Star body shape: 'polygon' = type-specific shape, 'circle' = classic */
    STAR_SHAPE_MODE: 'polygon' as 'polygon' | 'circle',
    /** Type icon size as fraction of star radius */
    STAR_ICON_SCALE: 0.8,
    /** Polygon corner rounding (0=sharp, 1=fully round) */
    STAR_CORNER_RADIUS: 0.3,

    /** Show hex selection border on active star (renders above ships) */
    SHOW_SELECTION_HEX: true,

    /** Inner orbit radius offset */
    ORBIT_BASE_RADIUS: 9,

    /** Orbit ring spacing multiplier (ringSpacing = shipBaseSize * this) */
    ORBIT_RING_MULT: 1.6,
    DAMAGED_ORBIT_RADIUS: 15,
    DAMAGED_ORBIT_EVADE: false,

    /** Ship transfer animation duration (ms) */
    TRANSFER_ANIMATION_MS: 1050,
    STATIC_ORBITS: false,

    /** How much ships cluster toward target (0=none, 1=max) */
    ORBIT_BIAS_STRENGTH: 0,
    /** Fraction of half-tick spent departing vs traveling */
    DEPART_FRACTION: 0.55,
    /** Max random departure jitter (ms) */
    DEPART_JITTER_MS: 175,
    /** Max perpendicular lane offset (px per side) */
    LANE_OFFSET_PX: 25,
    /** Ship departure mode: lifo (newest first), fifo (oldest first), nearside (closest to target) */
    DEPART_MODE: 'nearside' as const,
    /** How fast ships settle into orbit slot (ms) */
    SETTLE_DURATION_MS: 0,
    /** Fraction of tick used to stagger arrival settle (0=instant, 1=full tick spread) */
    ARRIVAL_SPREAD: 1.1,
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
    TRAVEL_EASING: 'easeOut' as const,
    TRAVEL_EASING_POWER: 0.7,
    TRAVEL_DURATION_MULT: 2.2,
    TRAVEL_ARC_INTENSITY: 2,
    /** How tightly ships converge to lane (0=straight to orbit slot, 1=full lane convergence) */
    LANE_CONVERGENCE: 0.45,
    /** Where along origin→dest center the convergence point sits (0=origin, 100=dest) */
    LANE_CONVERGENCE_POINT: 80,
    /** Ship spacing factor per ring: higher = fewer ships per ring = more spread out (default 1.5) */
    ORBIT_DENSITY: 1.7,
    /** Attack surge displacement as fraction of star radius (default 0.4) */
    ATTACK_SURGE_MULT: 0.7,
    ATTACK_SURGE_PROPORTIONAL: true,
    ATTACK_SURGE_FORCE_COFACTOR: 0.6,
    /** Ramp-in duration for attack surge (ms, 0=instant/old behavior) */
    ATTACK_SURGE_RAMP_MS: 1050,
    /** Surge pulse shape power (1=sine, 2=sharper peak, 0.5=flatter) */
    ATTACK_SURGE_SHAPE: 1,
    /** Duration of one surge sine pulse cycle (ms, default = BASE_TICK_MS) */
    SURGE_PULSE_DURATION_MS: 1050,
    /** Conquest animation strategy: 'immediate' = pop, 'surge' = settle from above, 'travel' = fly through lane */
    CONQUEST_ANIMATION_MODE: 'arrowhead' as const,
    /** How long conquest ships settle into orbit in surge mode (ms) */
    CONQUEST_SETTLE_MS: 500,
    /** Initial spawn radius above orbit for surge mode (px above star edge) */
    CONQUEST_SURGE_RADIUS: 35,
    /** Per-ship stagger delay for organic arrival spread in surge mode (ms) */
    CONQUEST_SURGE_STAGGER_MS: 30,
    /** Conquest travel speed multiplier (>1 = faster, <1 = slower, 1 = normal) */
    CONQUEST_TRAVEL_SPEED: 0.93,
    /** Delay before conquest ships start moving (ms) — ships hold surged position */
    CONQUEST_LERP_DELAY_MS: 0,
    CONQUEST_COLOR_DELAY_TICKS: 0,
    CONQUEST_FLASH_TICKS: 2.5,
    // ── Arrowhead conquest animation ──
    ARROW_TAPER: 0.8,
    ARROW_WIDTH: 35,
    ARROW_SPEED: 0.6,
    ARROW_EASING: 'easeIn' as const,
    ARROW_ENGULF_MODE: 'ring' as const,
    ARROW_ENGULF_RADIUS: 45,
    ARROW_SPIRAL_MIN_DEG: 120,
    ARROW_SPIRAL_MAX_DEG: 450,
    ARROW_SPIRAL_RANDOM: true,
    ARROW_SPIRAL_DURATION_MS: 800,
    ARROW_STAGGER_MS: 0,
    ARROW_STAGGER_AUTO: true,
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
    SHIP_GLOW_INTENSITY: 0.2,
    /** Radial glow sprite radius multiplier per ship */
    SHIP_GLOW_RADIUS: 0,
    /** Minimum HSL lightness for player colors — prevents dark colors vanishing on dark bg */
    MIN_COLOR_LIGHTNESS: 0.5,
    /** Global ship size multiplier */
    SHIP_SCALE_MULT: 0.4,
    /** Max visual ship sprites per star — overflow represented as brightness multiplier */
    MAX_VISUAL_SHIPS: 500,
    /** Degrees of hue shift per density tier */
    DENSITY_HUE_STEP: 4,
    /** Saturation change per density tier (positive direction = increase, negative = decrease) */
    DENSITY_SAT_STEP: 0.05,
    /** Lightness change per density tier */
    DENSITY_LIGHT_STEP: 0.05,
    /** Number of density tiers per direction on the color wheel */
    DENSITY_TIERS: 3,
    DENSITY_DARKEN_ALT: true,
    SHIP_VISUAL_RADIUS: 3,
    /** Star glow settings */
    STAR_GLOW_ON: true,
    /** Ownership ring offset from star center (% of radius) */
    STAR_RING_OFFSET: 18,
    /** Ownership ring stroke width (px) */
    STAR_RING_WIDTH: 2.5,
    /** Ownership ring alpha (0-1) */
    STAR_RING_ALPHA: 1,
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
    ORB_TRAVEL: false,
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
    CONNECTION_ALPHA: 0.25,

    /** Connection shadow/border width (added to CONNECTION_WIDTH) */
    CONNECTION_SHADOW_WIDTH: 3,

    /** Connection shadow alpha */
    CONNECTION_SHADOW_ALPHA: 0.25,

    /** Show connection lines */
    SHOW_CONNECTIONS: true,

    /** Show star power alpha overlay behind stars (F-47) */
    SHOW_STAR_POWER: true,
    /** Star power overlay alpha (0-1) */
    STAR_POWER_ALPHA: 0.195,
    /** Star power radius multiplier relative to star radius */
    STAR_POWER_RADIUS_MULT: 2.5,
    /** Number of concentric gradient layers */
    STAR_POWER_LAYERS: 8,
    /** GPU blur on star power halos (0=off) */
    STAR_POWER_BLUR: 16,
    HALO_FLEET_SCALE: false,
    /** Fleet halo mode: 'stepped' or 'linear' */
    HALO_FLEET_MODE: 'stepped',
    /** Fleet halo intensity multiplier (0=off, 1=default, 2=strong) */
    HALO_FLEET_INTENSITY: 2,
    /** Ships per step for stepped mode */
    HALO_FLEET_STEP_SIZE: 100,
    /** Ship count for full alpha in linear mode */
    HALO_FLEET_MAX_SHIPS: 500,

    /** Enable Voronoi territory renderer */
    TERRITORY_VORONOI: false,
    /** Enable Modified Voronoi territory renderer (F-138) */
    TERRITORY_MODIFIED_VORONOI: false,
    /** Enable Power Voronoi V2 territory renderer (F-138v2) */
    TERRITORY_POWER_VORONOI: true,
    /** Duration of territory morph/crossfade animation in ms (0=instant) */
    TERRITORY_TRANSITION_MS: 350,
    /** Number of control points for frontier loop morphing (5-300) */
    TERRITORY_MORPH_CONTROL_POINTS: 32,
    TERRITORY_BOUNDARY_MODE: 'segment' as const,
    /** Fill transition mode: 'crossfade' = alpha-fade, 'frontier' = infill from frontier loops */
    TERRITORY_FILL_MODE: 'frontier' as const,
    /** Enable Metaball territory renderer */
    TERRITORY_METABALL: false,
    /** Enable Pixel (nearest-neighbor) territory renderer */
    TERRITORY_PIXEL: false,
    /** Split disconnected same-owner stars into separate territory blobs */
    TERRITORY_CLUSTER_SPLIT: false,
    /** LEGACY territory mode — kept for compat */
    TERRITORY_MODE: 'metaball' as 'voronoi' | 'metaball' | 'off',

    /** Show contiguous Voronoi territory fill */
    SHOW_VORONOI: false,
    /** Voronoi territory alpha (0-1) */
    VORONOI_ALPHA: 0.23,
    /** Voronoi canvas downscale factor (higher = faster/blockier) */
    VORONOI_RESOLUTION: 2,
    /** Legacy (unused with d3-delaunay) */
    VORONOI_EDGE_BLEND: 2.3,
    /** Voronoi border line width between territories (0=off) */
    VORONOI_BORDER_WIDTH: 2,
    /** Voronoi border alpha */
    VORONOI_BORDER_ALPHA: 0.35,
    /** How much to brighten border color (0-255) */
    VORONOI_BORDER_BRIGHTEN: 20,
    /** Chaikin smoothing passes for PVV2 shared-edge borders (0=angular, 3=rounded, 5=very smooth) */
    VORONOI_BORDER_SMOOTH: 3,
    /** Voronoi color saturation multiplier (0=grey, 1=original, 2=vivid) */
    VORONOI_SATURATION: 1,
    /** Voronoi color lightness multiplier (0=dark, 1=original, 2=bright) */
    VORONOI_LIGHTNESS: 0.75,
    /** Territory glow bleed radius as fraction of map size */
    VORONOI_GLOW_RADIUS: 0.15,
    /** Peak glow alpha per layer */
    VORONOI_GLOW_ALPHA: 0.045,
    /** Number of concentric glow layers */
    VORONOI_GLOW_LAYERS: 7,
    /** GPU blur for smooth territory edges (0=sharp, higher=softer) */
    VORONOI_BLUR: 6,
    /** Chaikin smoothing iterations (0=angular polygons, 2=rounded, 4=very smooth) */
    VORONOI_SMOOTHING: 0,
    /** Enable gradient blending at territory borders */
    VORONOI_GRADIENT_BLEND: true,
    /** Gradient blend strip width in px */
    VORONOI_BLEND_WIDTH: 15,

    // ── Modified Voronoi Territory (F-138) ──
    /** Min boundary distance from star centers in px (0=off, 45=default) */
    MODIFIED_VORONOI_STAR_MARGIN: 45,
    /** How far to retract sharp vertex toward origin (0=none, 0.3=default, 1=full) */
    MODIFIED_VORONOI_ARC_STRENGTH: 0.3,
    /** Interior angle below which arc smoothing activates (degrees) */
    MODIFIED_VORONOI_ARC_THRESHOLD: 150,
    /** Min line-segment length for Bézier tessellation (px, lower=smoother) */
    MODIFIED_VORONOI_ARC_MIN_SEGMENT: 4,
    /** Whether to inject virtual Voronoi sites along same-owner lanes */
    MODIFIED_VORONOI_CORRIDOR_ENABLED: true,
    /** Distance between virtual corridor sites in px (lower=more sites=denser corridor) */
    MODIFIED_VORONOI_CORRIDOR_SPACING: 20,
    /** Whether to inject enemy virtual sites to separate non-connected same-owner territories */
    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
    /** Max distance between same-owner stars for disconnect injection (px) */
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 50,

    // ── Metaball Territory ──
    /** How far each star's influence field extends (px) */
    METABALL_INFLUENCE_RADIUS: 90,
    /** Falloff curve for influence: 'inverse-square' (organic), 'gaussian' (fluid), 'smoothstep' (defined edges) */
    METABALL_FALLOFF: 'gaussian' as 'inverse-square' | 'gaussian' | 'smoothstep',
    /** Faction boundary sharpness (higher = crisper borders, lower = softer blend) */
    METABALL_BLEND_SHARPNESS: 20,
    /** Overall metaball territory alpha (0-1) */
    METABALL_ALPHA: 0.5,
    /** Grid resolution in px per cell (lower = sharper but slower, 4-16 typical) */
    METABALL_CELL_SIZE: 2,
    /** Minimum influence to draw (lower = more coverage, 0.01-0.2 typical) */
    METABALL_THRESHOLD: 0.01,
    /** Star strength multiplier (scales all influence, default 1.0) */
    METABALL_STRENGTH_MULT: 4.3,
    /** Edge alpha falloff steepness (higher = sharper edges, default 3.0) */
    METABALL_EDGE_FADE: 0.5,
    /** GPU blur on metaball output (0=pixelated, 4=smooth, higher=very soft) */
    METABALL_BLUR: 0,
    /** Border line width between metaball territories */
    METABALL_BORDER_WIDTH: 3,
    /** Border line alpha */
    METABALL_BORDER_ALPHA: 1,
    /** Grid padding factor (0=compact, 0.3=extended) */
    METABALL_COVERAGE: 0,
    /** Metaball color saturation multiplier (0=grey, 1=original, 2=vivid) */
    METABALL_SATURATION: 1.05,
    /** Metaball color lightness multiplier (0=dark, 1=original, 2=bright) */
    METABALL_LIGHTNESS: 0.65,

    // ── Pixel Territory ──
    /** Pixel territory alpha (0-1, lower = more transparent) */
    PIXEL_ALPHA: 0.5,
    /** Downscale factor (1=full res/slow, 4=balanced, 8=fast/blocky) */
    PIXEL_RESOLUTION: 1,
    /** Edge blend softness at territory boundaries (0=hard edges, 1-10=soft) */
    PIXEL_EDGE_BLEND: 1.5,
    /** GPU blur strength (0=sharp pixel edges, 4+=smooth) */
    PIXEL_BLUR: 0,
    /** DEPRECATED — kept for compat */
    PIXEL_BLEND_POWER: 4,
    /** Same-owner distance discount for corridor guarantee (0=off, 0.3=natural, 0.6=strong) */
    PIXEL_CORRIDOR_BOOST: 0.9,
    /** Hue rotation offset in degrees (0-360) */
    PIXEL_HUE_SHIFT: 0,
    /** Territory border thickness (0=off) */
    PIXEL_BORDER_WIDTH: 0,
    /** Border line alpha */
    PIXEL_BORDER_ALPHA: 0,
    /** How much to brighten border color (0-255) */
    PIXEL_BORDER_BRIGHTEN: 50,
    /** Pattern overlay on territory ('none' | 'stripes' | 'crosshatch' | 'dots') */
    PIXEL_PATTERN: 'crosshatch' as const,
    /** Pattern density (1=fine, 10=coarse) */
    PIXEL_PATTERN_SCALE: 14,
    /** Per-player pattern rotation amount (0=same for all, 1=max golden angle separation) */
    PIXEL_PATTERN_ROTATION: 0,
    /** Edge fade: how far past the gameboard edges territory extends (px, 0=off) */
    PIXEL_EDGE_FADE: 120,
    /** Constrain territory to connection directions (0=off, 1=strict) */
    PIXEL_LANE_CONSTRAIN: 0.5,
    /** Shift boundaries by ship count pressure (0=off, 1=full) */
    PIXEL_PRESSURE: 0,
    /** Pixel color saturation multiplier (0=grey, 1=original, 2=vivid) */
    PIXEL_SATURATION: 1.0,
    /** Pixel color lightness multiplier (0=dark, 1=original, 2=bright) */
    PIXEL_LIGHTNESS: 1.0,

    // ── Graph Territory (4th mode) ──
    TERRITORY_GRAPH: false,
    GRAPH_ALPHA: 0.5,
    GRAPH_RESOLUTION: 1,
    GRAPH_BLUR: 1,
    GRAPH_PRESSURE: 1,
    GRAPH_CORRIDOR_BOOST: 0.3,
    GRAPH_BORDER_WIDTH: 4,
    GRAPH_BORDER_ALPHA: 0.3,
    GRAPH_BORDER_BRIGHTEN: 80,
    GRAPH_EDGE_FADE: 120,
    GRAPH_BARRIER_EXTENT: 1.5,
    GRAPH_PATTERN: 'crosshatch' as const,
    GRAPH_PATTERN_SCALE: 14,
    GRAPH_PATTERN_ROTATION: 0,
    LANE_INFLUENCE: 1,
    LANE_WIDTH: 105,
    LANE_DIRECT_FALLOFF: 3.1,
    LANE_THRESHOLD: 0.01,
    /** Graph/Lane color saturation multiplier (0=grey, 1=original, 2=vivid) */
    GRAPH_SATURATION: 1.0,
    /** Graph/Lane color lightness multiplier (0=dark, 1=original, 2=bright) */
    GRAPH_LIGHTNESS: 1.0,
    /** Border shape style: raw=pixel edges, smooth=morphological, angular=geometric segments */
    BORDER_FEEL: 'raw' as 'raw' | 'smooth' | 'angular',
    /** Smoothing iterations for border feel (0=none, 5=max) */
    BORDER_SMOOTH: 0,

    // ── Distance Field Territory (6th mode) ──
    TERRITORY_DISTANCE_FIELD: false,
    DF_RESOLUTION: 1,
    DF_ALPHA: 0.56,
    DF_BORDER_WIDTH: 11,
    DF_BORDER_SOFTNESS: 0,
    DF_BORDER_ALPHA: 0.5,
    DF_BORDER_BRIGHTEN: 15,
    DF_BORDER_MODE: 0,
    DF_BORDER_FAMILY: 'straight',
    DF_BORDER_ENGINE: 'legacy_field',
    DF_CANONICAL_FRONTIER_RUNTIME_MODE: 'disabled',
    DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW: false,
    DF_BORDER_HQ_ENABLED: false,
    DF_BORDER_HQ_SCALE: 3,
    DF_BORDER_HQ_MAX_DIM: 5120,
    DF_VECTOR_BORDERS_ENABLED: true,
    DF_VECTOR_GRID_RESOLUTION: 192,
    DF_VECTOR_SMOOTHING: 2,
    DF_VECTOR_SIMPLIFY: 0,
    DF_VECTOR_UPDATE_MS: 45,
    DF_MORPH_EASING: 'linear',
    DF_DISTANCE_METRIC: 'length' as const,
    DF_BLUR: 0,
    DF_HUE: 0,
    DF_SATURATION: 1.7,
    DF_LIGHTNESS: 0.4,
    DF_EDGE_FADE: 0,
    DF_ROUNDING: 0,
    DF_INFLUENCE_WEIGHT: 0,
    DF_EXPANSION: 0,
    DF_SMOOTHING: 0,
    DF_MIN_STAR_RADIUS: 90,
    DF_CORRIDOR_ENABLED: true,
    DF_CORRIDOR_MODE: 'spacing',
    DF_CORRIDOR_SPACING: 90,
    DF_CORRIDOR_COUNT: 1,
    DF_CORRIDOR_WEIGHT: 0.1,
    DF_DISCONNECT_ENABLED: true,
    DF_DISCONNECT_DISTANCE: 225,
    DF_DISCONNECT_WEIGHT: 0.05,

    // ── Contour Territory (5th mode — vector contour extraction) ──
    TERRITORY_CONTOUR: false,
    CONTOUR_RESOLUTION: 128,
    CONTOUR_SIMPLIFY: 0,
    CONTOUR_SMOOTH: 0,
    CONTOUR_FILL_ALPHA: 0.15,
    CONTOUR_BORDER_WIDTH: 2,
    CONTOUR_BORDER_ALPHA: 0.6,
    CONTOUR_BORDER_BRIGHTEN: 80,
    CONTOUR_SATURATION: 1.0,
    CONTOUR_LIGHTNESS: 1.0,
    CONTOUR_CORNER_RADIUS: 3,
    CONTOUR_CORNER_THRESHOLD: 120,
    CONTOUR_PERIPHERY_STRENGTH: 0,
    CONTOUR_PERIPHERY_INSET: 0,
    CONTOUR_JUNCTION_CORRECTION: 50,

    /** Show hex grid (debug) */
    SHOW_HEX_GRID: false,

    /** Stars per player (Map Size) */
    STARS_PER_PLAYER: 7,

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
    MAX_LINKS_PER_STAR: 8,

    // ========================================================================
    // AUDIO
    // ========================================================================

    /** Master audio volume (0-1) */
    AUDIO_MASTER_VOLUME: 0.5,
    /** Global mute */
    AUDIO_MUTED: false,
    /** Use subtype-specific conquest sounds instead of generic */
    AUDIO_SEPARATE_CONQUEST: true,

    // Per-sound volumes
    AUDIO_VOL_CLICK: 0.3,
    AUDIO_VOL_MOVE: 0.5,
    AUDIO_VOL_ATTACK: 0.3,
    AUDIO_VOL_CHAT: 0.6,
    AUDIO_VOL_TICK: 0.4,
    AUDIO_VOL_PLAY: 0.6,
    AUDIO_VOL_LOSE: 0.6,
    AUDIO_VOL_WIN: 0.6,
    AUDIO_VOL_NEW_PLAYER: 0.8,
    AUDIO_VOL_CONQUEST: 0.8,
    AUDIO_VOL_CONQUEST_RETREAT: 0.7,
    AUDIO_VOL_CONQUEST_SCATTER: 0.7,
    AUDIO_VOL_CONQUEST_COMPLETE: 0.8,
    AUDIO_VOL_STARLOSS: 0.6,

    // Per-sound file paths (relative to /sounds/)
    AUDIO_FILE_CLICK: 'ui/click.wav',
    AUDIO_FILE_MOVE: 'move/move.wav',
    AUDIO_FILE_ATTACK: 'attack/attack.wav',
    AUDIO_FILE_CHAT: 'ui/chat.wav',
    AUDIO_FILE_TICK: 'tick/tick.wav',
    AUDIO_FILE_PLAY: 'ui/PLAY.WAV',
    AUDIO_FILE_LOSE: 'gameloss/lose.ogg',
    AUDIO_FILE_WIN: 'gamewin/win.ogg',
    AUDIO_FILE_NEW_PLAYER: 'ui/new_player.ogg',
    AUDIO_FILE_CONQUEST: 'conquest/mixkit-fast-small-sweep-transition-166.wav',
    AUDIO_FILE_CONQUEST_RETREAT: 'conquest/SWSH_Swish Fused Small 04_RSCPC_PX.wav',
    AUDIO_FILE_CONQUEST_SCATTER: 'conquest/WHSH_Whoosh Plasma 04_RSCPC_SFEW.wav',
    AUDIO_FILE_CONQUEST_COMPLETE: 'conquest/SWSH_Swish Crisp Large 01_RSCPC_PX.wav',
    AUDIO_FILE_STARLOSS: 'starloss/mixkit-arcade-mechanical-bling-210.wav',

    // Per-sound start offsets in seconds (file-linked: only applied when file matches)
    AUDIO_OFFSET_CLICK: 0,
    AUDIO_OFFSET_MOVE: 0,
    AUDIO_OFFSET_ATTACK: 0,
    AUDIO_OFFSET_CHAT: 0,
    AUDIO_OFFSET_TICK: 0,
    AUDIO_OFFSET_PLAY: 0,
    AUDIO_OFFSET_LOSE: 0,
    AUDIO_OFFSET_WIN: 0,
    AUDIO_OFFSET_NEW_PLAYER: 0,
    AUDIO_OFFSET_CONQUEST: 0,
    AUDIO_OFFSET_CONQUEST_RETREAT: 0,
    AUDIO_OFFSET_CONQUEST_SCATTER: 0,
    AUDIO_OFFSET_CONQUEST_COMPLETE: 0,
    AUDIO_OFFSET_STARLOSS: 0,
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

