/**
 * Settings Panel Data Definitions
 *
 * Pure data arrays extracted from GameSettingsPanel.svelte.
 * Contains slider metadata, variable definitions, and config mappings.
 */

// ── Slider Variable Type ────────────────────────────────────────────────────

export interface SliderVarDef {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
}

// ── Combat Variables ────────────────────────────────────────────────────────

export const COMBAT_VARIABLES: SliderVarDef[] = [
    { key: 'AGGRESSOR_ADVANTAGE', label: 'Aggressor Advantage', min: 0, max: 3, step: 0.1 },
    { key: 'GLOBAL_DAMAGE_MODIFIER', label: 'Global Damage Modifier', min: 0, max: 200, step: 1 },
    { key: 'LETHALITY', label: 'Lethality', min: 0, max: 1, step: 0.05 },
    { key: 'FORCE_RATIO_EFFECT', label: 'Force Ratio Effect', min: 0, max: 1, step: 0.1 },
    { key: 'CONQUEST_THRESHOLD', label: 'Conquest Threshold', min: 1, max: 50, step: 1 },
    { key: 'CONQUEST_TRANSFER_PERCENTAGE', label: 'Transfer %', min: 0, max: 100, step: 10 },
    { key: 'RETREAT_CAPTURE_RATE', label: 'Retreat Capture', min: 0, max: 1, step: 0.05 },
    { key: 'SCATTER_CAPTURE_RATE', label: 'Scatter Capture', min: 0, max: 1, step: 0.05 },
    { key: 'SCATTER_DESTROY_RATE', label: 'Scatter Destroy', min: 0, max: 1, step: 0.05 },
    { key: 'RETREAT_DAMAGED_ACTIVATION_RATE', label: '🔄 Damaged Activation', min: 0, max: 1, step: 0.05 },
    { key: 'DAMAGED_SHIP_EFFECTIVENESS', label: 'Damaged Ship Defense', min: 0, max: 1, step: 0.01 },
];

// ── AI Variables ────────────────────────────────────────────────────────────

export const AI_VARIABLES: SliderVarDef[] = [
    { key: 'AI_MUST_ATTACK_RATIO', label: 'Must-Attack Ratio', min: 0.5, max: 3, step: 0.05 },
    { key: 'AI_ATTACK_UPPER_BOUNDS', label: 'May-Attack Bounds', min: 0.3, max: 2, step: 0.05 },
    { key: 'AI_ATTACK_STICKINESS', label: 'Attack Stickiness', min: 0, max: 1, step: 0.05 },
    { key: 'AI_EVALUATION_FREQUENCY', label: 'Eval Frequency', min: 0, max: 1, step: 0.05 },
    { key: 'AI_TACTICAL_AGGRESSION', label: 'Tactical Aggression', min: 0, max: 0.5, step: 0.01 },
    { key: 'AI_RANDOM_AGGRESSION', label: 'Random Aggression', min: 0, max: 0.5, step: 0.01 },
];

// ── Density Variables ───────────────────────────────────────────────────────

export const DENSITY_VARIABLES: SliderVarDef[] = [
    { key: 'DENSITY_HUE_STEP', label: 'Hue Step (°)', min: 0, max: 20, step: 1 },
    { key: 'DENSITY_SAT_STEP', label: 'Saturation Step', min: 0, max: 0.2, step: 0.01 },
    { key: 'DENSITY_LIGHT_STEP', label: 'Lightness Step', min: 0, max: 0.2, step: 0.01 },
    { key: 'DENSITY_TIERS', label: 'Max Tiers', min: 1, max: 6, step: 1 },
];

// ── Log Categories ──────────────────────────────────────────────────────────

export const LOG_CATEGORIES = [
    { key: 'sys', label: '🔵 System', desc: 'Lifecycle, init' },
    { key: 'state', label: '🟣 State', desc: 'Logic, transitions' },
    { key: 'data', label: '🟢 Data', desc: 'Data flow' },
    { key: 'net', label: '🟡 Network', desc: 'API, IO' },
    { key: 'error', label: '🔴 Error', desc: 'Errors (keep ON)' },
    { key: 'success', label: '✅ Success', desc: 'Verifications' },
    { key: 'combat', label: '⚔️ Combat', desc: 'Battle events' },
    { key: 'conquest', label: '🏰 Conquest', desc: 'Capture details' },
    { key: 'input', label: '🖱️ Input', desc: 'User clicks' },
    { key: 'repair', label: '🔧 Repair', desc: 'Ship repair' },
    { key: 'canvas', label: '🖥️ Canvas', desc: 'Viewport, scale, center' },
    { key: 'renderer', label: '🎨 Renderer', desc: 'Territory borders, fills' },
] as const;

// ── Animation Slider Definitions ────────────────────────────────────────────

export interface AnimSliderDef {
    key: string;
    label: string;
    type?: 'slider' | 'toggle';
    min?: number;
    max?: number;
    step?: number;
    unit?: string;    // 'ms', '×', '×tick'
    desc?: string;   // optional tooltip description
    group: string;
}

export const ANIM_SLIDERS: AnimSliderDef[] = [
    // Travel & Departure
    { key: 'TRANSFER_ANIMATION_MS', label: 'Transfer Anim', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Travel & Departure' },
    { key: 'TRAVEL_DURATION_MULT', label: 'Travel Duration', min: 0.1, max: 10, step: 0.1, unit: '×tick', group: 'Travel & Departure' },
    { key: 'DEPART_JITTER_MS', label: 'Depart Jitter', min: 0, max: 5000, step: 5, unit: 'ms', group: 'Travel & Departure' },
    // Settle & Orbit
    { key: 'SETTLE_DURATION_MS', label: 'Settle Duration', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Settle & Orbit' },
    { key: 'ARRIVAL_SPREAD', label: 'Arrival Stagger', min: 0, max: 2, step: 0.05, unit: '×tick', group: 'Settle & Orbit' },
    // Surge
    { key: 'SURGE_PULSE_DURATION_MS', label: 'Surge Pulse Cycle', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Attack Surge' },
    { key: 'ATTACK_SURGE_RAMP_MS', label: 'Surge Ramp', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Attack Surge' },
    { key: 'ATTACK_SURGE_MULT', label: 'Surge Displacement', min: 0, max: 2, step: 0.05, unit: '×', group: 'Attack Surge' },
    // Conquest
    { key: 'CONQUEST_SETTLE_MS', label: 'Conquest Settle', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Conquest' },
    { key: 'CONQUEST_SURGE_STAGGER_MS', label: 'Surge Stagger', min: 0, max: 5000, step: 1, unit: 'ms', group: 'Conquest' },
    { key: 'CONQUEST_TRAVEL_SPEED', label: 'Conquest Speed', min: 0.1, max: 10, step: 0.1, unit: '×', group: 'Conquest' },
    { key: 'CONQUEST_LERP_DELAY_MS', label: 'Lerp Delay', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Conquest' },
    { key: 'CONQUEST_COLOR_DELAY_TICKS', label: 'Color Delay', min: 0, max: 10, step: 0.5, unit: 'ticks', group: 'Conquest' },
    { key: 'CONQUEST_FLASH_TICKS', label: 'Flash Duration', min: 0, max: 10, step: 0.5, unit: 'ticks', group: 'Conquest' },
    // Arrow
    { key: 'ARROW_SPEED', label: 'Arrow Speed', min: 0.1, max: 10, step: 0.05, unit: '×', group: 'Arrow Formation' },
    { key: 'ARROW_SPIRAL_DURATION_MS', label: 'Spiral Duration', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Arrow Formation' },
    { key: 'ARROW_STAGGER_MS', label: 'Arrow Stagger', min: 0, max: 5000, step: 1, unit: 'ms', group: 'Arrow Formation' },
    // Territory Transition
    { key: 'TERRITORY_TRANSITION_MS', label: 'Animation Duration', min: 0, max: 3000, step: 50, unit: 'ms', group: 'Conquest Transition', desc: 'Animation duration for the conquest transition.' },
    { key: 'TERRITORY_TRANSITION_SETTLE_PCT', label: 'End Settle', min: 0, max: 30, step: 1, unit: '%', group: 'Conquest Transition', desc: 'Percent of the transition reserved for converging cleanly into the final ownership state.' },
    // VS Transition (F-165) — rendered in Territory panel under mode selection, not Timing
    { key: 'VS_VICTOR_TRAVEL_MS', label: 'Victor Travel', min: 0, max: 5000, step: 10, unit: 'ms', group: 'VS Transition', desc: 'How long the attacker\'s virtual star takes to travel from the attacking star to the conquered star. Longer = slower territory expansion animation.' },
    { key: 'VS_LOSER_TRAVEL_MS', label: 'Loser Travel', min: 0, max: 5000, step: 10, unit: 'ms', group: 'VS Transition', desc: 'How long the loser\'s virtual star takes to retreat from the conquered star to a connected ally star. Longer = slower territory shrinkage.' },
    { key: 'VS_POWER_LERP_START', label: 'Power Start', min: 0, max: 500, step: 5, unit: '', group: 'VS Transition', desc: 'Starting Voronoi weight of the loser\'s retreating virtual star. Higher = loser territory stays larger at the start of the transition. 0 = use default (starMargin²).' },
    { key: 'VS_POWER_LERP_END', label: 'Power End', min: 0, max: 500, step: 5, unit: '', group: 'VS Transition', desc: 'Ending Voronoi weight of the loser\'s retreating virtual star. 0 = territory dissolves completely. Higher = loser retains some territory area at transition end.' },
    { key: 'VS_POWER_LERP_DURATION_MS', label: 'Power Lerp', min: 0, max: 5000, step: 10, unit: 'ms', group: 'VS Transition', desc: 'Duration of the transition-vstar influence lerp. Metaball uses it for victor/loser weight timing; legacy VS uses it for loser fade. 0 = uses the active travel duration.' },
];

// ── Star Label Slider Definitions ───────────────────────────────────────────

export const STAR_LABEL_SLIDERS: AnimSliderDef[] = [
    { key: 'STAR_LABEL_ANGLE', label: 'Angle', min: 0, max: 360, step: 1, unit: '°', group: 'Position' },
    { key: 'STAR_LABEL_DISTANCE', label: 'Distance', min: 10, max: 150, step: 1, unit: 'px', group: 'Position' },
    { key: 'STAR_LABEL_SCALE', label: 'Scale', min: 0.3, max: 3, step: 0.05, unit: '×', group: 'Size' },
    { key: 'STAR_LABEL_FONT_SIZE', label: 'Active Font', min: 8, max: 32, step: 1, unit: 'px', group: 'Size' },
    { key: 'STAR_LABEL_ID_FONT_SIZE', label: 'ID Font', min: 6, max: 24, step: 1, unit: 'px', group: 'Size' },
    { key: 'STAR_LABEL_DAMAGED_FONT_SIZE', label: 'Damaged Font', min: 6, max: 24, step: 1, unit: 'px', group: 'Size' },
    { key: 'STAR_LABEL_LINE_HEIGHT', label: 'Line Height', min: 8, max: 40, step: 1, unit: 'px', group: 'Size' },
    { key: 'STAR_LABEL_PAD_X', label: 'Pad X', min: 0, max: 20, step: 1, unit: 'px', group: 'Spacing' },
    { key: 'STAR_LABEL_PAD_Y', label: 'Pad Y', min: 0, max: 20, step: 1, unit: 'px', group: 'Spacing' },
    { key: 'STAR_LABEL_GAP', label: 'Gap', min: 0, max: 12, step: 1, unit: 'px', group: 'Spacing' },
    { key: 'STAR_LABEL_BG_ALPHA', label: 'BG Opacity', min: 0, max: 1, step: 0.05, unit: '', group: 'Appearance' },
    { key: 'STAR_LABEL_BORDER_ALPHA', label: 'Border Opacity', min: 0, max: 1, step: 0.05, unit: '', group: 'Appearance' },
    { key: 'STAR_LABEL_BORDER_WIDTH', label: 'Border Width', min: 0, max: 5, step: 0.5, unit: 'px', group: 'Appearance' },
    { key: 'STAR_LABEL_UNIVERSAL_H', label: 'Uni Hue', min: 0, max: 360, step: 1, unit: '°', group: 'Universal Color' },
    { key: 'STAR_LABEL_UNIVERSAL_S', label: 'Uni Saturation', min: 0, max: 100, step: 1, unit: '%', group: 'Universal Color' },
    { key: 'STAR_LABEL_UNIVERSAL_L', label: 'Uni Lightness', min: 0, max: 100, step: 1, unit: '%', group: 'Universal Color' },
    { key: 'STAR_LABEL_UNIVERSAL_A', label: 'Uni Alpha', min: 0, max: 1, step: 0.05, unit: '', group: 'Universal Color' },
    { key: 'STAR_LABEL_SHOW_ID', label: 'Show Star ID', type: 'toggle', group: 'Visibility' },
    { key: 'STAR_LABEL_SHOW_ACTIVE', label: 'Show Active Ships', type: 'toggle', group: 'Visibility' },
    { key: 'STAR_LABEL_SHOW_DAMAGED', label: 'Show Damaged Ships', type: 'toggle', group: 'Visibility' },
    { key: 'STAR_LABEL_LEASH', label: 'Leash Line', type: 'toggle', group: 'Appearance' },
];

// ── Panel ↔ Config Mapping ──────────────────────────────────────────────────

/**
 * Derive the panel state key from a GAME_CONFIG key by converting
 * SCREAMING_SNAKE_CASE to camelCase.
 *
 * Example: TERRITORY_TRANSITION_MS → territoryTransitionMs
 *
 * This is the convention for all new controls. Entries in PANEL_CONFIG_MAP
 * only need an explicit panelKey when they intentionally differ (semantic
 * renames like tickInterval for BASE_TICK_MS, or inverse-transform keys).
 */
export function derivePanelKey(configKey: string): string {
    return configKey.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Bidirectional mapping between panel keys and GAME_CONFIG keys.
 * Used by panelDefaults, applyPanelToConfig, and syncAllFromConfig.
 *
 * panelKey is optional — if omitted, it is auto-derived via derivePanelKey(configKey).
 * Only supply panelKey explicitly for intentional semantic renames or inverse transforms.
 * 'transform' describes how config values map to panel display values.
 */
export interface PanelConfigMapping {
    configKey: string;
    panelKey?: string;
    /** 'direct' = same value; 'inverse' = panel = 1/config; leaving undefined = direct */
    transform?: 'direct' | 'inverse';
}

export const PANEL_CONFIG_MAP: PanelConfigMapping[] = [
    { panelKey: 'tickInterval', configKey: 'BASE_TICK_MS' },
    { panelKey: 'bindAnimToTick', configKey: 'BIND_ANIMATION_TO_TICK' },
    { panelKey: 'production', configKey: 'BASE_PRODUCTION' },
    { panelKey: 'repair', configKey: 'REPAIR_RATE' },
    { panelKey: 'defense', configKey: 'AGGRESSOR_ADVANTAGE', transform: 'inverse' },
    { configKey: 'REPAIR_SUPPRESS_ATTACKER' },
    { configKey: 'REPAIR_SUPPRESS_DEFENDER' },
    { configKey: 'GLOBAL_DAMAGE_MODIFIER' },
    { configKey: 'ARROW_LENGTH_FRACTION' },
    { configKey: 'ORDER_ARROWS_FOLLOW_LANE_PATHS' },
    { configKey: 'ARROW_PATH_PADDING' },
    { configKey: 'ARROW_HEAD_SPREAD_DEG' },
    { configKey: 'DEPART_MODE' },
    { configKey: 'SETTLE_DURATION_MS' },
    { configKey: 'ARRIVAL_SPREAD' },
    { configKey: 'WOBBLE_AMP' },
    { configKey: 'TRAVEL_FOLLOW_LANE_PATHS' },
    { configKey: 'TRAVEL_EASING' },
    { configKey: 'TRAVEL_MODE' },
    { configKey: 'TRAVEL_EASING_POWER' },
    { configKey: 'TRAVEL_DURATION_MULT' },
    { configKey: 'TRAVEL_ARC_INTENSITY' },
    { configKey: 'DEPART_STAGGER' },
    { configKey: 'DEPART_ARC_INTENSITY' },
    { configKey: 'ARRIVAL_ARC_INTENSITY' },
    { configKey: 'ORBIT_DENSITY' },
    { configKey: 'ATTACK_SURGE_MULT' },
    { configKey: 'ATTACK_SURGE_PROPORTIONAL' },
    { configKey: 'ATTACK_SURGE_FORCE_COFACTOR' },
    { configKey: 'ATTACK_SURGE_RAMP_MS' },
    { configKey: 'ATTACK_SURGE_SHAPE' },
    { configKey: 'CONQUEST_TRAVEL_SPEED' },
    { configKey: 'CONQUEST_LERP_DELAY_MS' },
    { configKey: 'CONQUEST_COLOR_DELAY_TICKS' },
    { configKey: 'CONQUEST_FLASH_TICKS' },
    { panelKey: 'conquestAnimMode', configKey: 'CONQUEST_ANIMATION_MODE' },
    { configKey: 'CONQUEST_SETTLE_MS' },
    { configKey: 'CONQUEST_SURGE_RADIUS' },
    { configKey: 'CONQUEST_SURGE_STAGGER_MS' },
    { configKey: 'ARROW_TAPER' },
    { configKey: 'ARROW_WIDTH' },
    { configKey: 'ARROW_SPEED' },
    { configKey: 'ARROW_EASING' },
    { configKey: 'ARROW_ENGULF_MODE' },
    { configKey: 'ARROW_ENGULF_RADIUS' },
    { configKey: 'ARROW_SPIRAL_MIN_DEG' },
    { configKey: 'ARROW_SPIRAL_MAX_DEG' },
    { configKey: 'ARROW_SPIRAL_RANDOM' },
    { configKey: 'ARROW_SPIRAL_DURATION_MS' },
    { configKey: 'ARROW_STAGGER_MS' },
    { configKey: 'ARROW_STAGGER_AUTO' },
    { configKey: 'ORB_TRAVEL' },
    { configKey: 'ORBIT_BIAS_STRENGTH' },
    { panelKey: 'oscillate', configKey: 'ORBIT_BIAS_OSCILLATE' },
    { panelKey: 'oscMin', configKey: 'ORBIT_BIAS_MIN' },
    { panelKey: 'oscMax', configKey: 'ORBIT_BIAS_MAX' },
    { panelKey: 'oscFreq', configKey: 'ORBIT_BIAS_FREQ' },
    { configKey: 'DEPART_FRACTION' },
    { configKey: 'DEPART_JITTER_MS' },
    { configKey: 'ORB_BASE_RADIUS' },
    { configKey: 'ORB_RADIUS_SCALE' },
    { configKey: 'ORB_GLOW_MULT' },
    { configKey: 'ORB_OUTER_ALPHA' },
    { configKey: 'ORB_MID_ALPHA' },
    { configKey: 'ORB_CORE_ALPHA' },
    { configKey: 'ORB_CENTER_ALPHA' },
    { configKey: 'ORB_OUTER_SCALE' },
    { configKey: 'ORB_MID_SCALE' },
    { configKey: 'ORB_CORE_SCALE' },
    { configKey: 'SHIP_BASE_SIZE' },
    { configKey: 'STAR_RENDER_RADIUS' },
    { configKey: 'STAR_SHAPE_MODE' },
    { configKey: 'STAR_ICON_SCALE' },
    { configKey: 'STAR_CORNER_RADIUS' },
    { configKey: 'STAR_RING_OFFSET' },
    { configKey: 'STAR_RING_WIDTH' },
    { configKey: 'STAR_RING_ALPHA' },
    { configKey: 'ORBIT_RING_MULT' },
    { configKey: 'DAMAGED_ORBIT_RADIUS' },
    { configKey: 'DAMAGED_ORBIT_EVADE' },
    { configKey: 'SHIP_OUTLINE_ON' },
    { configKey: 'SHIP_OUTLINE_PX' },
    { configKey: 'SHIP_GLOW_INTENSITY' },
    { configKey: 'SHIP_GLOW_RADIUS' },
    { configKey: 'MIN_COLOR_LIGHTNESS' },
    { configKey: 'SHIP_SCALE_MULT' },
    { configKey: 'SHIP_VISUAL_RADIUS' },
    { configKey: 'MAX_VISUAL_SHIPS' },
    { configKey: 'STAR_GLOW_RADIUS_MULT' },
    { configKey: 'STAR_GLOW_INTENSITY' },
    { configKey: 'STAR_GLOW_ON' },
    { configKey: 'DENSITY_DARKEN_ALT' },
    { configKey: 'SHOW_HEX_GRID' },
    { configKey: 'BG_IMAGE_ALPHA' },
    { panelKey: 'mapgenLaneMarginPx', configKey: 'MAPGEN_LANE_MARGIN_PX' },
    { panelKey: 'mapgenLaneCurveVsPruneBias', configKey: 'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS' },
    { panelKey: 'mapgenLaneMode', configKey: 'MAPGEN_LANE_MODE' },
    { configKey: 'MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS' },
    { configKey: 'STATIC_ORBITS' },
    { configKey: 'SHOW_SELECTION_HEX' },
    { configKey: 'LANE_OFFSET_PX' },
    { configKey: 'LANE_CONVERGENCE' },
    { configKey: 'LANE_CONVERGENCE_POINT' },
    { configKey: 'SHOW_STAR_POWER' },
    { configKey: 'STAR_POWER_ALPHA' },
    { configKey: 'STAR_POWER_RADIUS_MULT' },
    { configKey: 'STAR_POWER_LAYERS' },
    { configKey: 'STAR_POWER_BLUR' },
    { configKey: 'HALO_FLEET_SCALE' },
    { configKey: 'HALO_FLEET_INTENSITY' },
    { configKey: 'HALO_FLEET_MODE' },
    { configKey: 'HALO_FLEET_STEP_SIZE' },
    { configKey: 'HALO_FLEET_MAX_SHIPS' },
    { configKey: 'SHOW_VORONOI' },
    { configKey: 'VORONOI_ALPHA' },
    { configKey: 'NEUTRAL_TERRITORY_TRANSPARENT' },
    { configKey: 'VORONOI_RESOLUTION' },
    { configKey: 'VORONOI_EDGE_BLEND' },
    { configKey: 'VORONOI_BORDER_WIDTH' },
    { configKey: 'VORONOI_BORDER_ALPHA' },
    { configKey: 'VORONOI_BORDER_BRIGHTEN' },
    { configKey: 'VORONOI_BORDER_SMOOTH' },
    { configKey: 'VORONOI_SATURATION' },
    { configKey: 'VORONOI_LIGHTNESS' },
    { configKey: 'VORONOI_GLOW_RADIUS' },
    { configKey: 'VORONOI_GLOW_ALPHA' },
    { configKey: 'VORONOI_GLOW_LAYERS' },
    { configKey: 'VORONOI_BLUR' },
    { configKey: 'VORONOI_SMOOTHING' },
    { configKey: 'VORONOI_GRADIENT_BLEND' },
    { configKey: 'VORONOI_BLEND_WIDTH' },
    // Territory toggles
    { configKey: 'TERRITORY_BOUNDARY_MODE' },
    { configKey: 'TERRITORY_FILL_MODE' },
    { configKey: 'TERRITORY_MORPH_CONTROL_POINTS' },
    { configKey: 'TERRITORY_MODE' },
    { configKey: 'TERRITORY_RENDER_MODE' },
    { configKey: 'USE_RENDER_FAMILIES' },
    { configKey: 'TERRITORY_FILL_TRANSITION' },
    { configKey: 'TERRITORY_BORDER_TRANSITION' },
    { panelKey: 'territoryEngine', configKey: 'TERRITORY_ENGINE_ENABLED' },
    { configKey: 'TERRITORY_ENGINE_MODE' },
    { configKey: 'TERRITORY_ENGINE_STATIC_METHOD' },
    { configKey: 'TERRITORY_ENGINE_DYNAMIC_METHOD' },
    { configKey: 'TERRITORY_ENGINE_HYBRID_PLAN' },
    { configKey: 'TERRITORY_ENGINE_TRACE_MODE' },
    { configKey: 'TERRITORY_ENGINE_STEP_MODE' },
    { configKey: 'TERRITORY_ENGINE_STEP_ADVANCE_TOKEN' },
    { configKey: 'TERRITORY_VORONOI' },
    { configKey: 'TERRITORY_METABALL' },
    { configKey: 'TERRITORY_PIXEL' },
    // DY4 Isolation
    { configKey: 'DEBUG_DY4_DISABLE_FILL_CROSSFADE' },
    { configKey: 'DEBUG_DY4_DISABLE_BORDER_TRANSITION' },
    { configKey: 'DEBUG_DY4_FORCE_TRANSITION_START' },
    // Territory invariants (MSR / CX / DX)
    { panelKey: 'starMargin', configKey: 'MODIFIED_VORONOI_STAR_MARGIN' },
    { panelKey: 'mapgenLaneMarginEnabled', configKey: 'MAPGEN_LANE_MARGIN_ENABLED' },
    { panelKey: 'corridorEnabled', configKey: 'MODIFIED_VORONOI_CORRIDOR_ENABLED' },
    { panelKey: 'corridorSpacing', configKey: 'MODIFIED_VORONOI_CORRIDOR_SPACING' },
    { panelKey: 'cxCount', configKey: 'TERRITORY_CX_COUNT' },
    { panelKey: 'cxWeight', configKey: 'TERRITORY_CX_WEIGHT' },
    { panelKey: 'cxContestMidpointVstars', configKey: 'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS' },
    { panelKey: 'cxContestPairCount', configKey: 'TERRITORY_CX_CONTEST_PAIR_COUNT' },
    { panelKey: 'cxContestPairWeight', configKey: 'TERRITORY_CX_CONTEST_PAIR_WEIGHT' },
    { panelKey: 'disconnectEnabled', configKey: 'MODIFIED_VORONOI_DISCONNECT_ENABLED' },
    { panelKey: 'disconnectDistance', configKey: 'MODIFIED_VORONOI_DISCONNECT_DISTANCE' },
    { panelKey: 'dxWeight', configKey: 'TERRITORY_DX_WEIGHT' },
    // Clean-architecture selectors
    { configKey: 'TERRITORY_ARCHITECTURE_PATH' },
    { configKey: 'TERRITORY_FILL_TRANSITION_MODE' },
    { configKey: 'TERRITORY_BORDER_TRANSITION_MODE' },
    { configKey: 'TERRITORY_STYLE_MODE' },
    // Pixel params
    { configKey: 'PIXEL_ALPHA' },
    { configKey: 'PIXEL_RESOLUTION' },
    { configKey: 'PIXEL_EDGE_BLEND' },
    { configKey: 'PIXEL_BLUR' },
    { configKey: 'PIXEL_BLEND_POWER' },
    { configKey: 'PIXEL_CORRIDOR_BOOST' },
    { configKey: 'PIXEL_HUE_SHIFT' },
    { configKey: 'PIXEL_BORDER_WIDTH' },
    { configKey: 'PIXEL_BORDER_ALPHA' },
    { configKey: 'PIXEL_BORDER_BRIGHTEN' },
    { configKey: 'PIXEL_PATTERN' },
    { configKey: 'PIXEL_PATTERN_SCALE' },
    { configKey: 'PIXEL_PATTERN_ROTATION' },
    { configKey: 'PIXEL_EDGE_FADE' },
    // Metaball params
    { configKey: 'METABALL_INFLUENCE_RADIUS' },
    { configKey: 'METABALL_FALLOFF' },
    { panelKey: 'metaballSharpness', configKey: 'METABALL_BLEND_SHARPNESS' },
    { configKey: 'METABALL_FILL_ENABLED' },
    { configKey: 'METABALL_ALPHA' },
    { configKey: 'METABALL_CELL_SIZE' },
    { configKey: 'METABALL_THRESHOLD' },
    { configKey: 'METABALL_STRENGTH_MULT' },
    { configKey: 'METABALL_EDGE_FADE' },
    { configKey: 'METABALL_BORDER_ENABLED' },
    { panelKey: 'metaballBorderWidth', configKey: 'METABALL_BORDER_WIDTH' },
    { panelKey: 'metaballBorderAlpha', configKey: 'METABALL_BORDER_ALPHA' },
    { panelKey: 'metaballBlur', configKey: 'METABALL_BLUR' },
    {
        panelKey: 'metaballBlurAffectsBorders',
        configKey: 'METABALL_BLUR_AFFECTS_BORDERS',
    },
    { configKey: 'METABALL_COVERAGE' },
    { configKey: 'METABALL_SATURATION' },
    { configKey: 'METABALL_LIGHTNESS' },
    { configKey: 'METABALL_BORDER_SATURATION' },
    { configKey: 'METABALL_BORDER_LIGHTNESS' },
    { configKey: 'METABALL_CHAIKIN_PASSES' },
    { configKey: 'METABALL_FILL_FOLLOWS_GEOM' },
    { panelKey: 'metaballCombatBorderTicks', configKey: 'METABALL_COMBAT_BORDER_TICKS' },
    {
        panelKey: 'metaballCombatBorderProximityPx',
        configKey: 'METABALL_COMBAT_BORDER_PROXIMITY_PX',
    },
    { configKey: 'METABALL_COMBAT_BORDER_WIDTH_BOOST' },
    { configKey: 'METABALL_COMBAT_BORDER_ALPHA_BOOST' },
    { configKey: 'METABALL_BORDER_FORCE_RATIO' },
    { configKey: 'NUMBER_TRANSITION_MS' },
    // Pixel extras
    { configKey: 'PIXEL_LANE_CONSTRAIN' },
    { configKey: 'PIXEL_PRESSURE' },
    { configKey: 'PIXEL_SATURATION' },
    { configKey: 'PIXEL_LIGHTNESS' },
    // Graph Territory
    { configKey: 'TERRITORY_GRAPH' },
    { configKey: 'GRAPH_ALPHA' },
    { configKey: 'GRAPH_RESOLUTION' },
    { configKey: 'GRAPH_BLUR' },
    { configKey: 'GRAPH_PRESSURE' },
    { configKey: 'GRAPH_CORRIDOR_BOOST' },
    { configKey: 'GRAPH_BORDER_WIDTH' },
    { configKey: 'GRAPH_BORDER_ALPHA' },
    { configKey: 'GRAPH_BORDER_BRIGHTEN' },
    { configKey: 'GRAPH_EDGE_FADE' },
    { configKey: 'GRAPH_BARRIER_EXTENT' },
    { configKey: 'GRAPH_PATTERN' },
    { configKey: 'GRAPH_PATTERN_SCALE' },
    { configKey: 'GRAPH_PATTERN_ROTATION' },
    { configKey: 'BORDER_FEEL' },
    { configKey: 'BORDER_SMOOTH' },
    { configKey: 'LANE_INFLUENCE' },
    { configKey: 'LANE_WIDTH' },
    { configKey: 'LANE_DIRECT_FALLOFF' },
    { configKey: 'GRAPH_SATURATION' },
    { configKey: 'GRAPH_LIGHTNESS' },
    // Connection visuals
    { configKey: 'SHOW_CONNECTIONS' },
    { configKey: 'CONNECTION_WIDTH' },
    { configKey: 'CONNECTION_ALPHA' },
    { configKey: 'CONNECTION_SHADOW_WIDTH' },
    { configKey: 'CONNECTION_SHADOW_ALPHA' },
    // Star glow
    { configKey: 'STAR_GLOW_LAYERS' },
    // Star ownership ring
    // Density
    { configKey: 'DENSITY_HUE_STEP' },
    { configKey: 'DENSITY_SAT_STEP' },
    { configKey: 'DENSITY_LIGHT_STEP' },
    { configKey: 'DENSITY_TIERS' },
    // Orbit
    { configKey: 'ORBIT_BASE_RADIUS' },
    { configKey: 'ORB_DRAW_MODE' },
    // Surge pulse
    { configKey: 'SURGE_PULSE_DURATION_MS' },
    // Anim speed
    { panelKey: 'animSpeed', configKey: 'ANIMATION_SPEED_MS' },
    // Transfer
    { configKey: 'TRANSFER_ANIMATION_MS' },
    // Show hex selection
    // Modified Voronoi Territory (F-138)
    { configKey: 'TERRITORY_MODIFIED_VORONOI' },
    { configKey: 'TERRITORY_POWER_VORONOI' },
    { panelKey: 'territoryPVV3', configKey: 'TERRITORY_PVV3' },
    { configKey: 'MODIFIED_VORONOI_ARC_STRENGTH' },
    { configKey: 'MODIFIED_VORONOI_ARC_THRESHOLD' },
    { configKey: 'MODIFIED_VORONOI_ARC_MIN_SEGMENT' },
    { configKey: 'MODIFIED_VORONOI_ARC_MAX_SEGMENTS' },
    // Distance Field Territory (F-138)
    { configKey: 'TERRITORY_DISTANCE_FIELD' },
    { configKey: 'DF_RESOLUTION' },
    { configKey: 'DF_BLUR' },
    { configKey: 'DF_EDGE_FADE' },
    { configKey: 'DF_ALPHA' },
    { configKey: 'DF_HUE' },
    { configKey: 'DF_SATURATION' },
    { configKey: 'DF_LIGHTNESS' },
    { configKey: 'DF_EXPANSION' },
    { configKey: 'DF_SMOOTHING' },
    { configKey: 'DF_ROUNDING' },
    { configKey: 'DF_MIN_STAR_RADIUS' },
    { configKey: 'DF_BORDER_WIDTH' },
    { configKey: 'DF_BORDER_SOFTNESS' },
    { configKey: 'DF_BORDER_ALPHA' },
    { configKey: 'DF_BORDER_BRIGHTEN' },
    { configKey: 'DF_BORDER_HQ_ENABLED' },
    { configKey: 'DF_BORDER_HQ_SCALE' },
    { configKey: 'DF_BORDER_HQ_MAX_DIM' },
    { configKey: 'DF_VECTOR_BORDERS_ENABLED' },
    { configKey: 'DF_VECTOR_GRID_RESOLUTION' },
    { configKey: 'DF_VECTOR_SMOOTHING' },
    { configKey: 'DF_VECTOR_SIMPLIFY' },
    { configKey: 'DF_VECTOR_UPDATE_MS' },
    { configKey: 'DF_INFLUENCE_WEIGHT' },
    { configKey: 'DF_DISTANCE_METRIC' },
    { configKey: 'TERRITORY_TRANSITION_MS' },
    { configKey: 'TERRITORY_TRANSITION_BIND_TO_TICK' },
    { configKey: 'TERRITORY_TRANSITION_SETTLE_PCT' },
    { configKey: 'BORDER_TRANS_RESAMPLE_N' },
    { configKey: 'BORDER_TRANS_EASING' },
    { configKey: 'BORDER_TRANS_OVERSHOOT' },
    { configKey: 'FRONTIER_RESOLUTION' },
    { configKey: 'DF_MORPH_EASING' },
    { configKey: 'DF_CORRIDOR_ENABLED' },
    { configKey: 'DF_CORRIDOR_MODE' },
    { configKey: 'DF_CORRIDOR_SPACING' },
    { configKey: 'DF_CORRIDOR_COUNT' },
    { configKey: 'DF_CORRIDOR_WEIGHT' },
    { configKey: 'DF_DISCONNECT_ENABLED' },
    { configKey: 'DF_BORDER_MODE' },
    { configKey: 'DF_BORDER_FAMILY' },
    { configKey: 'DF_BORDER_ENGINE' },
    { configKey: 'DF_CANONICAL_FRONTIER_RUNTIME_MODE' },
    { configKey: 'DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW' },
    { configKey: 'DF_DISCONNECT_DISTANCE' },
    { configKey: 'DF_DISCONNECT_WEIGHT' },
    // Contour Territory
    { configKey: 'TERRITORY_CONTOUR' },
    { configKey: 'TERRITORY_GEOMETRY_MODE' },
    { configKey: 'TERRITORY_ENGINE_METHOD' },
    { configKey: 'TERRITORY_CLUSTER_SPLIT' },
    { configKey: 'CONTOUR_SATURATION' },
    { configKey: 'CONTOUR_LIGHTNESS' },
    { configKey: 'CONTOUR_FILL_ALPHA' },
    { configKey: 'CONTOUR_RESOLUTION' },
    { configKey: 'CONTOUR_SIMPLIFY' },
    { configKey: 'CONTOUR_SMOOTH' },
    { configKey: 'CONTOUR_BORDER_WIDTH' },
    { configKey: 'CONTOUR_BORDER_ALPHA' },
    { configKey: 'CONTOUR_BORDER_BRIGHTEN' },
    { configKey: 'CONTOUR_CORNER_RADIUS' },
    { configKey: 'CONTOUR_CORNER_THRESHOLD' },
    { configKey: 'CONTOUR_PERIPHERY_STRENGTH' },
    { configKey: 'CONTOUR_PERIPHERY_INSET' },
    { configKey: 'CONTOUR_JUNCTION_CORRECTION' },
    // Combat & Balance
    { configKey: 'TRANSFER_RATE' },
    { configKey: 'LETHALITY' },
    { configKey: 'FORCE_RATIO_EFFECT' },
    { configKey: 'CONQUEST_THRESHOLD' },
    { configKey: 'CONQUEST_TRANSFER_PERCENTAGE' },
    { configKey: 'RETREAT_CAPTURE_RATE' },
    { configKey: 'SCATTER_CAPTURE_RATE' },
    { configKey: 'SCATTER_DESTROY_RATE' },
    { configKey: 'RETREAT_DAMAGED_ACTIVATION_RATE' },
    { configKey: 'DAMAGED_SHIP_EFFECTIVENESS' },
    { configKey: 'MINIMUM_DAMAGE' },
    { configKey: 'OVERWHELM_THRESHOLD' },
    { configKey: 'MIN_REPAIR' },
    { configKey: 'REPAIR_COMBAT_PENALTY' },
    // AI
    { configKey: 'AI_MUST_ATTACK_RATIO' },
    { configKey: 'AI_ATTACK_UPPER_BOUNDS' },
    { configKey: 'AI_ATTACK_STICKINESS' },
    { configKey: 'AI_EVALUATION_FREQUENCY' },
    { configKey: 'AI_TACTICAL_AGGRESSION' },
    { configKey: 'AI_RANDOM_AGGRESSION' },
    // Economy & Transfer
    { configKey: 'STARTING_SHIPS' },
    { configKey: 'STARS_PER_PLAYER' },
    { configKey: 'MIN_SHIPS_PER_TRANSFER' },
    { configKey: 'MAX_SHIPS_PER_TRANSFER' },
    // Conquest rules
    { configKey: 'CONQUEST_FORCE_GLOW' },
    { configKey: 'CONQUEST_FORCE_GLOW_MULT' },
    { configKey: 'CONQUEST_SLOWMO_ENABLED' },
    { configKey: 'CONQUEST_SLOWMO_FACTOR' },
    { configKey: 'CONQUEST_SLOWMO_DURATION_MS' },
    { configKey: 'CONQUEST_DAMAGED_CAPTURE_RATE' },
    { configKey: 'CONQUEST_DAMAGED_DESTROY_RATE' },
    { configKey: 'ORDERS_PERSIST_AFTER_CONQUEST' },
    { configKey: 'RETAIN_ORDER_ON_CONQUEST' },
    { configKey: 'ALLOW_OPPOSING_ORDERS' },
    // VS Transition (F-165)
    { configKey: 'VS_VICTOR_TRAVEL_MS' },
    { configKey: 'VS_LOSER_TRAVEL_MS' },
    { configKey: 'VS_POWER_LERP_START' },
    { configKey: 'VS_POWER_LERP_END' },
    { configKey: 'VS_POWER_LERP_DURATION_MS' },
    { configKey: 'VS_BIND_TO_TICK' },
    { configKey: 'VS_TRANSITION_MODE' },
    { configKey: 'METABALL_BURST_BOUNDARY_BASIS' },
    { configKey: 'PERIMETER_FIELD_TRANSITION_ENGINE' },
    { configKey: 'PERIMETER_FIELD_GEOMETRY_SOURCE' },
    { configKey: 'PERIMETER_FIELD_SAMPLE_SPACING' },
    { configKey: 'PERIMETER_FIELD_SAMPLE_COUNT_PER_LOOP' },
    { configKey: 'PERIMETER_FIELD_INWARD_OFFSET_PX' },
    { configKey: 'PERIMETER_FIELD_INFLUENCE_RADIUS' },
    { configKey: 'PERIMETER_FIELD_INFLUENCE_WEIGHT' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SHOW_VSTARS' },
    { configKey: 'PERIMETER_FIELD_DEBUG_CAPTURE_ENABLED' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED' },
    { configKey: 'PERIMETER_FIELD_DEBUG_REPLAY_SLOT' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SCRUB_FRAME_INDEX' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS' },
    { configKey: 'PERIMETER_FIELD_DEBUG_ONION_SKIN_COUNT' },
    { configKey: 'PERIMETER_FIELD_DEBUG_STROBE_STRIDE' },
    { configKey: 'PERIMETER_FIELD_DEBUG_VECTOR_WIDTH' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SNAPSHOT_MODE' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SNAPSHOT_ALPHA' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_IDS' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_VECTORS' },
    { configKey: 'PERIMETER_FIELD_OLD_BOUNDARY_FADE' },
    { configKey: 'PERIMETER_FIELD_NEW_BOUNDARY_GROW' },
    // Metaball Grid
    { configKey: 'METABALL_GRID_ENABLED' },
    { configKey: 'METABALL_GRID_SPACING_PX' },
    { configKey: 'METABALL_GRID_ORIGIN_MODE' },
    { configKey: 'METABALL_GRID_ADJACENCY' },
    { configKey: 'METABALL_GRID_WAVE_GEOMETRY' },
    { configKey: 'METABALL_GRID_WAVE_SEEDING' },
    { configKey: 'METABALL_GRID_FLIP_TRANSITION' },
    { configKey: 'METABALL_GRID_FLIP_WINDOW' },
    { configKey: 'METABALL_GRID_INWARD_OFFSET_PX' },
    { configKey: 'METABALL_GRID_CELL_SHAPE' },
    { configKey: 'METABALL_GRID_CELL_INSET_PX' },
    { configKey: 'METABALL_GRID_CELL_CORNER_PX' },
    { configKey: 'METABALL_GRID_BORDER_MODE' },
    { configKey: 'METABALL_GRID_BORDER_BLEND' },
    { configKey: 'METABALL_GRID_BORDER_CHAIKIN_PASSES' },
    { configKey: 'METABALL_GRID_WAVE_EASE' },
    { configKey: 'METABALL_GRID_FLIP_WINDOW_JITTER' },
    { configKey: 'METABALL_GRID_DISTRIBUTION' },
    { configKey: 'METABALL_GRID_POSITION_JITTER' },
    { configKey: 'METABALL_GRID_MAX_CELLS' },
    // Arrow appearance
    { configKey: 'ARROW_HEAD_SIZE' },
    { configKey: 'ARROW_SHAFT_WIDTH' },
    { configKey: 'ARROW_ALPHA' },
    { configKey: 'ARROW_DASH_GAP' },
    { configKey: 'ARROW_HEAD_ALPHA' },
    { configKey: 'ARROW_OUTLINE_WIDTH' },
    { configKey: 'ARROW_OUTLINE_COLOR' },
    { configKey: 'ARROW_OUTLINE_ALPHA' },
    { configKey: 'ARROW_HEAD_STYLE' },
    { configKey: 'ARROW_HEAD_NOTCH' },
    { configKey: 'ARROW_SHAFT_STEPS' },
    { configKey: 'ARROW_FLOW_SPEED' },
    { configKey: 'ARROW_HEAD_VFX_ALPHA' },
    { configKey: 'ARROW_FORCE_INTENSITY' },
    { configKey: 'ARROW_FORCE_INTENSITY_MAX_SHIPS' },
    { configKey: 'DAMAGED_SHIP_SCALE' },
    { configKey: 'ARROW_DASH_LENGTH' },
    // Star labels (F-159)
    { configKey: 'STAR_LABEL_LAYOUT' },
    { configKey: 'STAR_LABEL_ANGLE' },
    { configKey: 'STAR_LABEL_DISTANCE' },
    { configKey: 'STAR_LABEL_SCALE' },
    { configKey: 'STAR_LABEL_FONT_SIZE' },
    { configKey: 'STAR_LABEL_ID_FONT_SIZE' },
    { configKey: 'STAR_LABEL_DAMAGED_FONT_SIZE' },
    { configKey: 'STAR_LABEL_PAD_X' },
    { configKey: 'STAR_LABEL_PAD_Y' },
    { configKey: 'STAR_LABEL_GAP' },
    { configKey: 'STAR_LABEL_BG_ALPHA' },
    { configKey: 'STAR_LABEL_BORDER_ALPHA' },
    { configKey: 'STAR_LABEL_BORDER_WIDTH' },
    { configKey: 'STAR_LABEL_LEASH' },
    { configKey: 'STAR_LABEL_SHOW_ID' },
    { configKey: 'STAR_LABEL_SHOW_ACTIVE' },
    { configKey: 'STAR_LABEL_SHOW_DAMAGED' },
    { configKey: 'STAR_LABEL_FONT_FAMILY' },
    { configKey: 'STAR_LABEL_COLOR_MODE' },
    { configKey: 'STAR_LABEL_UNIVERSAL_H' },
    { configKey: 'STAR_LABEL_UNIVERSAL_S' },
    { configKey: 'STAR_LABEL_UNIVERSAL_L' },
    { configKey: 'STAR_LABEL_UNIVERSAL_A' },
    { configKey: 'STAR_LABEL_LINE_HEIGHT' },
    { configKey: 'STAR_LABEL_OFFSET_X' },
    { configKey: 'STAR_LABEL_OFFSET_Y' },
    // Star system
    { configKey: 'STAR_SYSTEM_SCALE' },
    { configKey: 'STAR_HIT_RADIUS' },
    { configKey: 'STAR_RING_RADIUS' },
    { configKey: 'STAR_RING_LIGHTNESS' },
    { configKey: 'STAR_RING_SATURATION' },
    // Visuals
    { configKey: 'CONNECTION_COLOR' },
    { configKey: 'CONNECTION_MAX_DISTANCE' },
    { configKey: 'BG_IMAGE_URL' },
    { configKey: 'CLASSIC_MAP_SPACING' },
    { configKey: 'LABEL_ANIM_MODE' },
    // ── Audio ──
    { configKey: 'AUDIO_MASTER_VOLUME' },
    { configKey: 'AUDIO_MUTED' },
    { configKey: 'AUDIO_SEPARATE_CONQUEST' },
    // Audio volumes (14)
    { configKey: 'AUDIO_VOL_CLICK' },
    { configKey: 'AUDIO_VOL_MOVE' },
    { configKey: 'AUDIO_VOL_ATTACK' },
    { configKey: 'AUDIO_VOL_CHAT' },
    { configKey: 'AUDIO_VOL_TICK' },
    { configKey: 'AUDIO_VOL_PLAY' },
    { configKey: 'AUDIO_VOL_LOSE' },
    { configKey: 'AUDIO_VOL_WIN' },
    { configKey: 'AUDIO_VOL_NEW_PLAYER' },
    { configKey: 'AUDIO_VOL_CONQUEST' },
    { configKey: 'AUDIO_VOL_CONQUEST_RETREAT' },
    { configKey: 'AUDIO_VOL_CONQUEST_SCATTER' },
    { configKey: 'AUDIO_VOL_CONQUEST_COMPLETE' },
    { configKey: 'AUDIO_VOL_STARLOSS' },
    // Audio file paths (14)
    { configKey: 'AUDIO_FILE_CLICK' },
    { configKey: 'AUDIO_FILE_MOVE' },
    { configKey: 'AUDIO_FILE_ATTACK' },
    { configKey: 'AUDIO_FILE_CHAT' },
    { configKey: 'AUDIO_FILE_TICK' },
    { configKey: 'AUDIO_FILE_PLAY' },
    { configKey: 'AUDIO_FILE_LOSE' },
    { configKey: 'AUDIO_FILE_WIN' },
    { configKey: 'AUDIO_FILE_NEW_PLAYER' },
    { configKey: 'AUDIO_FILE_CONQUEST' },
    { configKey: 'AUDIO_FILE_CONQUEST_RETREAT' },
    { configKey: 'AUDIO_FILE_CONQUEST_SCATTER' },
    { configKey: 'AUDIO_FILE_CONQUEST_COMPLETE' },
    { configKey: 'AUDIO_FILE_STARLOSS' },
    // Audio offsets (14)
    { configKey: 'AUDIO_OFFSET_CLICK' },
    { configKey: 'AUDIO_OFFSET_MOVE' },
    { configKey: 'AUDIO_OFFSET_ATTACK' },
    { configKey: 'AUDIO_OFFSET_CHAT' },
    { configKey: 'AUDIO_OFFSET_TICK' },
    { configKey: 'AUDIO_OFFSET_PLAY' },
    { configKey: 'AUDIO_OFFSET_LOSE' },
    { configKey: 'AUDIO_OFFSET_WIN' },
    { configKey: 'AUDIO_OFFSET_NEW_PLAYER' },
    { configKey: 'AUDIO_OFFSET_CONQUEST' },
    { configKey: 'AUDIO_OFFSET_CONQUEST_RETREAT' },
    { configKey: 'AUDIO_OFFSET_CONQUEST_SCATTER' },
    { configKey: 'AUDIO_OFFSET_CONQUEST_COMPLETE' },
    { configKey: 'AUDIO_OFFSET_STARLOSS' },
];

// ── Resolved map: fills in auto-derived panelKeys where none were declared ──

/** PANEL_CONFIG_MAP with every panelKey guaranteed to be set (derived if not explicit). */
export const RESOLVED_PANEL_CONFIG_MAP: (Required<Pick<PanelConfigMapping, 'panelKey' | 'configKey'>> & PanelConfigMapping)[] =
    PANEL_CONFIG_MAP.map(m => ({ ...m, panelKey: m.panelKey ?? derivePanelKey(m.configKey) }));

// ── ConfigKey → PanelKey lookup (for animSliderToPanelKey) ──────────────────

export const CONFIG_TO_PANEL_KEY: Record<string, string> = Object.fromEntries(
    RESOLVED_PANEL_CONFIG_MAP.map(m => [m.configKey, m.panelKey])
);

// ── Settings Tier ───────────────────────────────────────────────────────────

export type SettingsTier = 'basic' | 'advanced' | 'developer';

export const TIER_LABELS: Record<SettingsTier, { label: string; icon: string; color: string }> = {
    basic: { label: 'Basic', icon: '🎮', color: '#4ade80' },
    advanced: { label: 'Advanced', icon: '⚙️', color: '#fbbf24' },
    developer: { label: 'Developer', icon: '🛠️', color: '#f87171' },
};

// ── Markdown Export Sections ────────────────────────────────────────────────

export const MD_EXPORT_SECTIONS: Record<string, string[]> = {
    Combat: [
        'AGGRESSOR_ADVANTAGE', 'GLOBAL_DAMAGE_MODIFIER', 'LETHALITY', 'FORCE_RATIO_EFFECT',
        'CONQUEST_THRESHOLD', 'CONQUEST_TRANSFER_PERCENTAGE',
    ],
    Production: ['BASE_PRODUCTION', 'REPAIR_RATE', 'MIN_REPAIR', 'REPAIR_COMBAT_PENALTY', 'REPAIR_SUPPRESS_ATTACKER', 'REPAIR_SUPPRESS_DEFENDER'],
    Transfer: ['TRANSFER_RATE', 'MIN_SHIPS_PER_TRANSFER', 'MAX_SHIPS_PER_TRANSFER'],
    AI: [
        'AI_MUST_ATTACK_RATIO', 'AI_ATTACK_UPPER_BOUNDS', 'AI_ATTACK_STICKINESS',
        'AI_EVALUATION_FREQUENCY', 'AI_TACTICAL_AGGRESSION', 'AI_RANDOM_AGGRESSION',
    ],
};

// ── Format Helpers ──────────────────────────────────────────────────────────

export function formatAnimValue(val: number, unit: string): string {
    if (unit === 'ms') return `${Math.round(val)}${unit}`;
    if (unit === 'ticks') {
        const rounded = Math.abs(val - Math.round(val)) < 0.001 ? `${Math.round(val)}` : val.toFixed(1);
        return `${rounded} ${unit}`;
    }
    return `${val.toFixed(2)}${unit}`;
}


