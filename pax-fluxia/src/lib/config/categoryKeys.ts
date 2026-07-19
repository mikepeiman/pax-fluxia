// ============================================================================
// Category keys — the pure GAME_CONFIG-key partition used by category presets.
// ============================================================================
//
// Extracted from categoryThemes.ts so it can be imported without pulling in the
// builtin-theme loader (which uses Vite-only import.meta.glob and cannot run
// under `bun test`). categoryThemes.ts re-exports everything here, so existing
// `from './categoryThemes'` imports keep working.
//
// CATEGORY_KEYS maps each category to the exact GAME_CONFIG keys it owns. A key
// belongs to exactly ONE category (no overlap); keys that belong to no category
// preset live in EXCLUDED_FROM_CATEGORIES. categoryThemesCoverage.test.ts proves
// this is a complete, non-overlapping partition of GAME_CONFIG.

// ── Category IDs ────────────────────────────────────────────────────────────

export type ThemeCategory =
    | 'players'
    | 'timing'
    | 'combat'
    | 'economy'
    | 'travel'
    | 'surge'
    | 'conquest'
    | 'territory'
    | 'ships'
    | 'visuals'
    | 'audio'
    | 'ai'
    | 'rules'
    | 'logging'
    | 'debug';

// ── Category Metadata ───────────────────────────────────────────────────────

export interface CategoryMeta {
    id: ThemeCategory;
    icon: string;
    label: string;
    color: string;
}

export const CATEGORY_META: Record<ThemeCategory, CategoryMeta> = {
    players: { id: 'players', icon: '👥', label: 'Players', color: '#7dd3fc' },
    timing: { id: 'timing', icon: '⚡', label: 'Timing', color: '#ffcc44' },
    combat: { id: 'combat', icon: '⚔️', label: 'Battle', color: '#ff4466' },
    economy: { id: 'economy', icon: '💰', label: 'Economy', color: '#44dd88' },
    travel: { id: 'travel', icon: '✈️', label: 'Travel', color: '#44aaff' },
    surge: { id: 'surge', icon: '💥', label: 'Surge & Orbs', color: '#ff6644' },
    conquest: { id: 'conquest', icon: '🏰', label: 'Conquest', color: '#ff66aa' },
    territory: { id: 'territory', icon: '🌍', label: 'Territory', color: '#66ccaa' },
    ships: { id: 'ships', icon: '🚀', label: 'Ships', color: '#44ccff' },
    visuals: { id: 'visuals', icon: '🗺️', label: 'Map & Grid', color: '#cc66ff' },
    audio: { id: 'audio', icon: '🔊', label: 'Audio', color: '#44ddbb' },
    ai: { id: 'ai', icon: '🤖', label: 'AI Behavior', color: '#ff8844' },
    rules: { id: 'rules', icon: '📜', label: 'Rules', color: '#aabb44' },
    logging: { id: 'logging', icon: '📋', label: 'Logging', color: '#88aacc' },
    debug: { id: 'debug', icon: '🔬', label: 'Debug', color: '#ff4444' },
};

// ── Category → Config Keys Mapping ──────────────────────────────────────────

export const CATEGORY_KEYS: Record<ThemeCategory, string[]> = {
    players: [],

    timing: [
        'BASE_TICK_MS',
        'MIN_TICK_MS',
        'ANIMATION_SPEED_MS',
        'BIND_ANIMATION_TO_TICK',
        'NUMBER_TRANSITION_MS',
        'TRANSFER_ANIMATION_MS',
    ],

    combat: [
        'AGGRESSOR_ADVANTAGE',
        'GLOBAL_DAMAGE_MODIFIER',
        'LETHALITY',
        'FORCE_RATIO_EFFECT',
        'CONQUEST_THRESHOLD',
        'DAMAGED_SHIP_EFFECTIVENESS',
    ],

    economy: [
        'TRANSFER_RATE',
        'MIN_SHIPS_PER_TRANSFER',
        'MAX_SHIPS_PER_TRANSFER',
        'BASE_PRODUCTION',
        'REPAIR_RATE',
        'MIN_REPAIR',
        'REPAIR_COMBAT_PENALTY',
        'REPAIR_SUPPRESS_ATTACKER',
        'REPAIR_SUPPRESS_DEFENDER',
    ],

    travel: [
        'TRAVEL_MODE',
        'TRAVEL_EASING',
        'TRAVEL_EASING_POWER',
        'TRAVEL_DURATION_MULT',
        'TRAVEL_ARC_INTENSITY',
        'LANE_CONVERGENCE',
        'LANE_CONVERGENCE_POINT',
        'LANE_OFFSET_PX',
        'DEPART_MODE',
        'DEPART_FRACTION',
        'DEPART_JITTER_MS',
        'DEPART_STAGGER',
        'DEPART_ARC_INTENSITY',
        'ARRIVAL_ARC_INTENSITY',
        'SETTLE_DURATION_MS',
        'ARRIVAL_SPREAD',
        'WOBBLE_AMP',
        'ORBIT_BIAS_STRENGTH',
        'ORBIT_BIAS_OSCILLATE',
        'ORBIT_BIAS_MIN',
        'ORBIT_BIAS_MAX',
        'ORBIT_BIAS_FREQ',
        'ORBIT_DENSITY',
        'STATIC_ORBITS',
        'TRAVEL_FOLLOW_LANE_PATHS',
    ],

    surge: [
        'ATTACK_SURGE_MULT',
        'ATTACK_SURGE_PROPORTIONAL',
        'ATTACK_SURGE_FORCE_COFACTOR',
        'ATTACK_SURGE_RAMP_MS',
        'ATTACK_SURGE_SHAPE',
        'SURGE_PULSE_DURATION_MS',
        'SURGE_PULSE_BIND_TO_TICK',
        // Orb travel VFX
        'ORB_TRAVEL',
        'ORB_DRAW_MODE',
        'ORB_BASE_RADIUS',
        'ORB_RADIUS_SCALE',
        'ORB_GLOW_MULT',
        'ORB_OUTER_ALPHA',
        'ORB_MID_ALPHA',
        'ORB_CORE_ALPHA',
        'ORB_CENTER_ALPHA',
        'ORB_OUTER_SCALE',
        'ORB_MID_SCALE',
        'ORB_CORE_SCALE',
    ],

    conquest: [
        'CONQUEST_ANIMATION_MODE',
        'CONQUEST_SETTLE_MS',
        'CONQUEST_SURGE_RADIUS',
        'CONQUEST_SURGE_STAGGER_MS',
        'CONQUEST_TRAVEL_SPEED',
        'CONQUEST_LERP_DELAY_MS',
        'CONQUEST_COLOR_DELAY_TICKS',
        'CONQUEST_FLASH_TICKS',
        'CONQUEST_SLOWMO_ENABLED',
        'CONQUEST_SLOWMO_FACTOR',
        'CONQUEST_SLOWMO_DURATION_MS',
        'CONQUEST_FORCE_GLOW',
        'CONQUEST_FORCE_GLOW_MULT',
        // Arrowhead
        'ARROW_TAPER',
        'ARROW_WIDTH',
        'ARROW_SPEED',
        'ARROW_EASING',
        'ARROW_ENGULF_MODE',
        'ARROW_ENGULF_RADIUS',
        'ARROW_SPIRAL_MIN_DEG',
        'ARROW_SPIRAL_MAX_DEG',
        'ARROW_SPIRAL_RANDOM',
        'ARROW_SPIRAL_DURATION_MS',
        'ARROW_STAGGER_MS',
        'ARROW_STAGGER_AUTO',
        'ARROW_LENGTH',
        // Order-arrow rendering
        'ARROW_HEAD_SIZE',
        'ARROW_SHAFT_WIDTH',
        'ARROW_ALPHA',
        'ARROW_PATH_PADDING',
        'ARROW_DASH_LENGTH',
        'ARROW_DASH_GAP',
        'ARROW_HEAD_ALPHA',
        'ARROW_OUTLINE_WIDTH',
        'ARROW_OUTLINE_COLOR',
        'ARROW_OUTLINE_ALPHA',
        'ARROW_HEAD_SPREAD_DEG',
        'ARROW_HEAD_STYLE',
        'ARROW_HEAD_NOTCH',
        'ARROW_SHAFT_STEPS',
        'ARROW_FLOW_SPEED',
        'ARROW_HEAD_VFX_ALPHA',
        'ARROW_FORCE_INTENSITY',
        'ARROW_FORCE_INTENSITY_MAX_SHIPS',
        'ORDER_ARROWS_FOLLOW_LANE_PATHS',
    ],

    territory: [
        // Territory toggles
        // Star power / halos
        'SHOW_STAR_POWER',
        'STAR_POWER_ALPHA',
        'STAR_POWER_RADIUS_MULT',
        'STAR_POWER_LAYERS',
        'STAR_POWER_BLUR',
        'HALO_FLEET_SCALE',
        'HALO_FLEET_MODE',
        'HALO_FLEET_INTENSITY',
        'HALO_FLEET_STEP_SIZE',
        'HALO_FLEET_MAX_SHIPS',
        // Voronoi
        'VORONOI_ALPHA',
        'VORONOI_BORDER_WIDTH',
        'VORONOI_BORDER_ALPHA',
        'VORONOI_BORDER_SMOOTH',
        // Modified Voronoi (F-138)
        'MODIFIED_VORONOI_STAR_MARGIN',
        'TERRITORY_MSR_STAR_BIAS',
        'MODIFIED_VORONOI_CORRIDOR_ENABLED',
        'MODIFIED_VORONOI_CORRIDOR_SPACING',
        'MODIFIED_VORONOI_DISCONNECT_ENABLED',
        'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
        // Metaball
        'TERRITORY_SURFACE_FILL_ENABLED',
        'TERRITORY_SURFACE_ALPHA',
        'TERRITORY_SURFACE_BORDER_ENABLED',
        'TERRITORY_SURFACE_BORDER_BLEND',
        'TERRITORY_SURFACE_BORDER_WIDTH',
        'TERRITORY_SURFACE_BORDER_ALPHA',
        'TERRITORY_SURFACE_SATURATION',
        'TERRITORY_SURFACE_LIGHTNESS',
        'TERRITORY_SURFACE_BORDER_SATURATION',
        'TERRITORY_SURFACE_BORDER_LIGHTNESS',
        // Cell grid
        'CELL_GRID_ENABLED',
        'CELL_GRID_SPACING_PX',
        'CELL_GRID_ORIGIN_MODE',
        'CELL_GRID_DISTRIBUTION',
        'CELL_GRID_POSITION_JITTER',
        'CELL_GRID_MAX_CELLS',
        'CELL_GRID_INWARD_OFFSET_PX',
        'CELL_GRID_CELL_SHAPE',
        'CELL_GRID_CELL_INSET_PX',
        'CELL_GRID_CELL_CORNER_PX',
        'CELL_GRID_BORDER_MODE',
        'CELL_GRID_BORDER_BLEND',
        'CELL_GRID_BORDER_CHAIKIN_PASSES',
        'CELL_GRID_ADJACENCY',
        'CELL_GRID_WAVE_GEOMETRY',
        'CELL_GRID_WAVE_SEEDING',
        'CELL_GRID_FLIP_TRANSITION',
        'CELL_GRID_FLIP_WINDOW',
        'CELL_GRID_WAVE_EASE',
        'CELL_GRID_FLIP_WINDOW_JITTER',
        'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
        // Grid Gradient
        'GRID_GRADIENT_ENABLED',
        'GRID_GRADIENT_FILL_STYLE',
        'GRID_GRADIENT_SPACING_PX',
        'GRID_GRADIENT_MAX_CELLS',
        'GRID_GRADIENT_ORIGIN_MODE',
        'GRID_GRADIENT_DISTRIBUTION',
        'GRID_GRADIENT_POSITION_JITTER',
        'GRID_GRADIENT_CENTER_SIZE_PX',
        'GRID_GRADIENT_EDGE_SIZE_PX',
        'GRID_GRADIENT_CURVE_POWER',
        'GRID_GRADIENT_FILL_HUE_SHIFT_DEG',
        'GRID_GRADIENT_BORDER_OFFSET_PX',
        'GRID_GRADIENT_CELL_SHAPE',
        'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
        'GRID_GRADIENT_BORDER_DOTS_ENABLED',
        'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
        'GRID_GRADIENT_BORDER_DOT_STYLE',
        'GRID_GRADIENT_SHADER_NEIGHBOR_MODE',
        'GRID_GRADIENT_SHADER_MARK_SOFTNESS',
        'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX',
        'GRID_GRADIENT_SHADER_NOISE_STRENGTH',
        'GRID_GRADIENT_SHADER_PULSE_STRENGTH',
        'GRID_GRADIENT_SHADER_PULSE_SPEED',
        'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX',
        'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED',
        'GRID_GRADIENT_SHADER_GLOW_STRENGTH',
        'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST',
        'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST',
        'GRID_GRADIENT_DRAW_BACKEND',
        // Render/style/geometry mode selectors
        'TERRITORY_RENDER_MODE',
        'TERRITORY_STYLE_MODE',
        'TERRITORY_GEOMETRY_MODE',
        'TERRITORY_FILL_MODE',
        'TERRITORY_CLUSTER_SPLIT',
        // Transition
        'TERRITORY_TRANSITION_MS',
        'TERRITORY_TRANSITION_BIND_TO_TICK',
        'TERRITORY_CONQUEST_FRONT_MODE',
        'TERRITORY_MORPH_COMPLETE_PCT',
        'TERRITORY_END_SNAP_FIX',
        'TERRITORY_FILL_TRANSITION_MODE',
        'TERRITORY_BORDER_TRANSITION_MODE',
        'TERRITORY_BORDER_TRANSITION',
        // Frontier technique/geometry
        'TERRITORY_FRONTIER_TECHNIQUE',
        'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE',
        'TERRITORY_FRONTIER_PHASE_SAMPLING',
        'TERRITORY_FRONTIER_BLUR_PASSES',
        'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
        'TERRITORY_FRONTIER_CHAIKIN_PASSES',
        'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
        'TERRITORY_FRONTIER_BAND_WIDTH_PX',
        'TERRITORY_FRONTIER_JUNCTION_RENDER_MODE',
        'TERRITORY_FRONTIER_JUNCTION_RADIUS_PX',
        'TERRITORY_FRONTIER_OUTER_BORDER_ENABLED',
        // Frontier FX
        'TERRITORY_FRONTIER_FX_MODE',
        'TERRITORY_FRONTIER_FX_WIDTH_PX',
        'TERRITORY_FRONTIER_FX_STRENGTH',
        'TERRITORY_FRONTIER_FX_STEPS',
        'TERRITORY_FRONTIER_FX_SOFTNESS',
        'TERRITORY_FRONTIER_FX_EMISSIVE',
        'TERRITORY_FRONTIER_FX_PARTICLE_DENSITY',
        'TERRITORY_FRONTIER_FX_PULSE_SPEED',
        'TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE',
        'TERRITORY_FRONTIER_FX_APPLY_TRANSITION',
        // Topology rules (MSR / CX / DX) — the "Territory Topology" settings
        'FRONTIER_RESOLUTION',
        'CHAIKIN_BOUNDARY_PAD',
        'CHAIKIN_BOUNDARY_EPS',
        'TERRITORY_MSR_STAR_POWER_ENABLED',
        'TERRITORY_MSR_STAR_POWER_MODE',
        'TERRITORY_MSR_STAR_POWER_GAIN',
        'TERRITORY_MSR_STAR_POWER_EXPONENT',
        'TERRITORY_MSR_STAR_POWER_CAP_PX',
        'TERRITORY_CX_COUNT',
        'TERRITORY_CX_WEIGHT',
        'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
        'TERRITORY_CX_CONTEST_PAIR_COUNT',
        'TERRITORY_CX_CONTEST_PAIR_WEIGHT',
        'TERRITORY_CX_CONTEST_PAIR_SPACING',
        'TERRITORY_DX_WEIGHT',
        // Star power edge banding (companion to the STAR_POWER_* keys above)
        'STAR_POWER_LAYER_CURVE',
        'STAR_POWER_EDGE_BAND_STRENGTH',
        'STAR_POWER_EDGE_BAND_WIDTH',
        // Cell grid finishing / phase-field collapse
        'CELL_GRID_PATTERN_SPACING_PX',
        'CELL_GRID_BOUNDARY_FILL_FLUSH',
        'CELL_GRID_EDGE_SMOOTHING_PASSES',
        'CELL_GRID_EDGE_TRIM_PX',
        'CELL_GRID_PHASE_FIELD_FINISH_FADE_START',
        'CELL_GRID_PHASE_FIELD_FINISH_FADE_END',
        'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
        'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
        'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
        'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
        'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
        // Perimeter field
        'PERIMETER_FIELD_GEOMETRY_SOURCE',
    ],

    ships: [
        'SHIP_BASE_SIZE',
        'STAR_RENDER_RADIUS',
        'ORBIT_BASE_RADIUS',
        'DAMAGED_ORBIT_RADIUS',
        'DAMAGED_ORBIT_EVADE',
        'ORBIT_RING_MULT',
        'SHIP_OUTLINE_ON',
        'SHIP_OUTLINE_PX',
        'SHIP_GLOW_INTENSITY',
        'SHIP_GLOW_RADIUS',
        'MIN_COLOR_LIGHTNESS',
        'SHIP_SCALE_MULT',
        'MAX_VISUAL_SHIPS',
        'SHIP_VISUAL_RADIUS',
        // Density VFX
        'DENSITY_HUE_STEP',
        'DENSITY_SAT_STEP',
        'DENSITY_LIGHT_STEP',
        'DENSITY_TIERS',
        'DENSITY_DARKEN_ALT',
        // Star glow (per-star fleet glow)
        'STAR_GLOW_ON',
        'STAR_GLOW_RADIUS_MULT',
        'STAR_GLOW_INTENSITY',
        'STAR_GLOW_LAYERS',
        // Star shape (polygon body)
        'STAR_SHAPE_MODE',
        'STAR_ICON_SCALE',
        'STAR_CORNER_RADIUS',
        'STAR_SYSTEM_SCALE',
        'STAR_HIT_RADIUS',
        'DAMAGED_SHIP_SCALE',
        // Star rings
        'STAR_RING_RADIUS',
        'STAR_RING_OFFSET',
        'STAR_RING_WIDTH',
        'STAR_RING_ALPHA',
        'STAR_RING_SATURATION',
        'STAR_RING_LIGHTNESS',
        // Star labels
        'LABEL_ANIM_MODE',
        'STAR_LABEL_OFFSET_X',
        'STAR_LABEL_OFFSET_Y',
        'STAR_LABEL_FONT_SIZE',
        'STAR_LABEL_ID_FONT_SIZE',
        'STAR_LABEL_DAMAGED_FONT_SIZE',
        'STAR_LABEL_ANGLE',
        'STAR_LABEL_DISTANCE',
        'STAR_LABEL_SCALE',
        'STAR_LABEL_LAYOUT',
        'STAR_LABEL_PAD_X',
        'STAR_LABEL_PAD_Y',
        'STAR_LABEL_GAP',
        'STAR_LABEL_BG_ALPHA',
        'STAR_LABEL_BORDER_ALPHA',
        'STAR_LABEL_BORDER_WIDTH',
        'STAR_LABEL_LEASH',
        'STAR_LABEL_SHOW_ID',
        'STAR_LABEL_SHOW_ACTIVE',
        'STAR_LABEL_SHOW_DAMAGED',
        'STAR_LABEL_FONT_FAMILY',
        'STAR_LABEL_COLOR_MODE',
        'STAR_LABEL_UNIVERSAL_H',
        'STAR_LABEL_UNIVERSAL_S',
        'STAR_LABEL_UNIVERSAL_L',
        'STAR_LABEL_UNIVERSAL_A',
        'STAR_LABEL_LINE_HEIGHT',
    ],

    visuals: [
        'MAPGEN_LANE_MARGIN_ENABLED',
        'MAPGEN_LANE_MARGIN_PX',
        'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS',
        'MAPGEN_LANE_MODE',
        // NOTE: MODIFIED_VORONOI_STAR_MARGIN / TERRITORY_MSR_STAR_BIAS moved to the
        // `territory` category (they are territory-geometry topology knobs) to
        // satisfy the exactly-one-category invariant.
        // Connections / Lanes
        'CONNECTION_MAX_DISTANCE',
        'CONNECTION_COLOR',
        'CONNECTION_WIDTH',
        'CONNECTION_ALPHA',
        'CONNECTION_SHADOW_WIDTH',
        'CONNECTION_SHADOW_ALPHA',
        'SHOW_CONNECTIONS',
        // Selection
        'SHOW_SELECTION_HEX',
        // Hex grid
        'SHOW_HEX_GRID',
        'HEX_RADIUS',
        'HEX_PADDING',
        // Map background image
        'BG_IMAGE_URL',
        'BG_IMAGE_ALPHA',
    ],

    ai: [
        'AI_MUST_ATTACK_RATIO',
        'AI_ATTACK_UPPER_BOUNDS',
        'AI_ATTACK_STICKINESS',
        'AI_EVALUATION_FREQUENCY',
        'AI_TACTICAL_AGGRESSION',
        'AI_RANDOM_AGGRESSION',
    ],

    rules: [
        'CONQUEST_TRANSFER_PERCENTAGE',
        'CONQUEST_DAMAGED_CAPTURE_RATE',
        'CONQUEST_DAMAGED_DESTROY_RATE',
        'OVERWHELM_THRESHOLD',
        'RETREAT_CAPTURE_RATE',
        'SCATTER_CAPTURE_RATE',
        'SCATTER_DESTROY_RATE',
        'RETREAT_DAMAGED_ACTIVATION_RATE',
        'STARTING_SHIPS',
        // Order persistence rules
        'ORDERS_PERSIST_AFTER_CONQUEST',
        'RETAIN_ORDER_ON_CONQUEST',
        'ALLOW_OPPOSING_ORDERS',
    ],

    logging: [
        // Logging keys are UI-only, no GAME_CONFIG keys currently
        // This category exists for the panel but has no themeable keys
    ],

    debug: [
        // Debug-only visualization toggles (no user-facing preset bar; kept out
        // of the territory category so a territory look preset stays clean).
        'GRID_GRADIENT_DEBUG_TRANSITIONS',
        'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY',
    ],

    audio: [
        'AUDIO_MASTER_VOLUME',
        'AUDIO_MUTED',
        'AUDIO_SEPARATE_CONQUEST',
        // Per-sound volumes
        'AUDIO_VOL_CLICK',
        'AUDIO_VOL_MOVE',
        'AUDIO_VOL_ATTACK',
        'AUDIO_VOL_CHAT',
        'AUDIO_VOL_TICK',
        'AUDIO_VOL_PLAY',
        'AUDIO_VOL_LOSE',
        'AUDIO_VOL_WIN',
        'AUDIO_VOL_NEW_PLAYER',
        'AUDIO_VOL_CONQUEST',
        'AUDIO_VOL_CONQUEST_RETREAT',
        'AUDIO_VOL_CONQUEST_SCATTER',
        'AUDIO_VOL_CONQUEST_COMPLETE',
        'AUDIO_VOL_STARLOSS',
        // Per-sound file paths
        'AUDIO_FILE_CLICK',
        'AUDIO_FILE_MOVE',
        'AUDIO_FILE_ATTACK',
        'AUDIO_FILE_CHAT',
        'AUDIO_FILE_TICK',
        'AUDIO_FILE_PLAY',
        'AUDIO_FILE_LOSE',
        'AUDIO_FILE_WIN',
        'AUDIO_FILE_NEW_PLAYER',
        'AUDIO_FILE_CONQUEST',
        'AUDIO_FILE_CONQUEST_RETREAT',
        'AUDIO_FILE_CONQUEST_SCATTER',
        'AUDIO_FILE_CONQUEST_COMPLETE',
        'AUDIO_FILE_STARLOSS',
        // Per-sound start offsets (file-linked)
        'AUDIO_OFFSET_CLICK',
        'AUDIO_OFFSET_MOVE',
        'AUDIO_OFFSET_ATTACK',
        'AUDIO_OFFSET_CHAT',
        'AUDIO_OFFSET_TICK',
        'AUDIO_OFFSET_PLAY',
        'AUDIO_OFFSET_LOSE',
        'AUDIO_OFFSET_WIN',
        'AUDIO_OFFSET_NEW_PLAYER',
        'AUDIO_OFFSET_CONQUEST',
        'AUDIO_OFFSET_CONQUEST_RETREAT',
        'AUDIO_OFFSET_CONQUEST_SCATTER',
        'AUDIO_OFFSET_CONQUEST_COMPLETE',
        'AUDIO_OFFSET_STARLOSS',
    ],
};

/**
 * GAME_CONFIG keys that intentionally belong to NO category preset. These are
 * map-generation structure applied only at map creation (not live-applicable),
 * so they must not ride along in a per-category visual/gameplay preset. A full-
 * config snapshot preset still captures them for exact restore.
 *
 * `categoryThemesCoverage.test.ts` enforces that every GAME_CONFIG key is either
 * in exactly one category above OR listed here — so coverage can never silently
 * drift again.
 */
export const EXCLUDED_FROM_CATEGORIES: ReadonlySet<string> = new Set([
    // Map-generation structure — applied at map creation, not live-tunable.
    'STARS_PER_PLAYER',
    'MIN_LINKS_PER_STAR',
    'MAX_LINKS_PER_STAR',
    'CLASSIC_MAP_SPACING',
    // Internal/derived map geometry (computed, not user-editable).
    '_MAP_HEX_RADIUS',
    '_MAP_WIDTH',
    '_MAP_HEIGHT',
    '_MAP_PADDING_X',
    '_MAP_PADDING_Y',
]);
