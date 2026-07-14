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
    { key: 'RETREAT_DAMAGED_ACTIVATION_RATE', label: 'Damaged Activation', min: 0, max: 1, step: 0.05 },
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
    { key: 'sys', label: 'System', desc: 'Lifecycle, init' },
    { key: 'state', label: 'State', desc: 'Logic, transitions' },
    { key: 'data', label: 'Data', desc: 'Data flow' },
    { key: 'net', label: 'Network', desc: 'API, IO' },
    { key: 'error', label: 'Error', desc: 'Errors (keep ON)' },
    { key: 'success', label: 'Success', desc: 'Verifications' },
    { key: 'combat', label: 'Combat', desc: 'Battle events' },
    { key: 'conquest', label: 'Conquest', desc: 'Capture details' },
    { key: 'input', label: 'Input', desc: 'User clicks' },
    { key: 'repair', label: 'Repair', desc: 'Ship repair' },
    { key: 'canvas', label: 'Canvas', desc: 'Viewport, scale, center' },
    { key: 'renderer', label: 'Renderer', desc: 'Territory borders, fills' },
    { key: 'transition', label: 'Transition', desc: 'Kinetic conquest morph: commit/settle/retarget + cost (PowerCore)' },
    { key: 'pipeline', label: 'Pipeline', desc: 'Per-frame geometry→family→render trace (copy-paste diagnostic)' },
    { key: 'ui', label: 'UI', desc: 'Your settings toggles/clicks. Keeps printing while settings pause the game' },
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
 * renames like tickInterval for BASE_TICK_MS).
 */
export function derivePanelKey(configKey: string): string {
    return configKey.toLowerCase().replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Bidirectional mapping between panel keys and GAME_CONFIG keys.
 * Used by panelDefaults, applyPanelToConfig, and syncAllFromConfig.
 *
 * panelKey is optional — if omitted, it is auto-derived via derivePanelKey(configKey).
 * Only supply panelKey explicitly for intentional semantic renames. Panel and config
 * hold the SAME value for every key: the 'inverse' transform (panel = 1/config) was
 * removed 2026-07-14 with its only user — it made the panel a second value space,
 * which is exactly how the AGGRESSOR_ADVANTAGE flip-on-reload bug happened.
 */
export interface PanelConfigMapping {
    configKey: string;
    panelKey?: string;
}

export const PANEL_CONFIG_MAP: PanelConfigMapping[] = [
    { panelKey: 'tickInterval', configKey: 'BASE_TICK_MS' },
    { panelKey: 'bindAnimToTick', configKey: 'BIND_ANIMATION_TO_TICK' },
    { panelKey: 'production', configKey: 'BASE_PRODUCTION' },
    { panelKey: 'repair', configKey: 'REPAIR_RATE' },
    // AGGRESSOR_ADVANTAGE was { panelKey: 'defense', transform: 'inverse' } until
    // 2026-07-14. The Battle slider passed a CONFIG-space value into that mapping,
    // so the mapped write stored 1/v and a raw write papered over it live — the
    // value then FLIPPED to 1/v on every reload when the panel rehydrated config.
    // Plain mapping + a defense→aggressorAdvantage rename migration fixed it.
    { configKey: 'AGGRESSOR_ADVANTAGE' },
    { configKey: 'REPAIR_SUPPRESS_ATTACKER' },
    { configKey: 'REPAIR_SUPPRESS_DEFENDER' },
    { configKey: 'GLOBAL_DAMAGE_MODIFIER' },
    { configKey: 'ARROW_LENGTH', panelKey: 'arrowLengthFraction' },
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
    { configKey: 'SURGE_PULSE_BIND_TO_TICK' },
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
    { panelKey: 'mapgenLaneMarginEnabled', configKey: 'MAPGEN_LANE_MARGIN_ENABLED' },
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
    { configKey: 'STAR_POWER_LAYER_CURVE' },
    { configKey: 'STAR_POWER_EDGE_BAND_STRENGTH' },
    { configKey: 'STAR_POWER_EDGE_BAND_WIDTH' },
    { configKey: 'HALO_FLEET_SCALE' },
    { configKey: 'HALO_FLEET_INTENSITY' },
    { configKey: 'HALO_FLEET_MODE' },
    { configKey: 'HALO_FLEET_STEP_SIZE' },
    { configKey: 'HALO_FLEET_MAX_SHIPS' },
    { configKey: 'VORONOI_ALPHA' },
    { configKey: 'VORONOI_BORDER_WIDTH' },
    { configKey: 'VORONOI_BORDER_ALPHA' },
    { configKey: 'VORONOI_BORDER_SMOOTH' },
    // Territory toggles
    { configKey: 'TERRITORY_FILL_MODE' },
    { configKey: 'TERRITORY_RENDER_MODE' },
    { configKey: 'TERRITORY_BORDER_TRANSITION' },
    // DY4 Isolation
    // Territory invariants (MSR / CX / DX)
    { configKey: 'FRONTIER_RESOLUTION' },
    { panelKey: 'worldExtentPx', configKey: 'CHAIKIN_BOUNDARY_PAD' },
    { panelKey: 'starMargin', configKey: 'MODIFIED_VORONOI_STAR_MARGIN' },
    {
        panelKey: 'msrStarBias',
        configKey: 'TERRITORY_MSR_STAR_BIAS',
    },
    { panelKey: 'corridorEnabled', configKey: 'MODIFIED_VORONOI_CORRIDOR_ENABLED' },
    { panelKey: 'corridorSpacing', configKey: 'MODIFIED_VORONOI_CORRIDOR_SPACING' },
    { panelKey: 'cxCount', configKey: 'TERRITORY_CX_COUNT' },
    { panelKey: 'cxWeight', configKey: 'TERRITORY_CX_WEIGHT' },
    { panelKey: 'cxContestMidpointVstars', configKey: 'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS' },
    { panelKey: 'cxContestPairCount', configKey: 'TERRITORY_CX_CONTEST_PAIR_COUNT' },
    { panelKey: 'cxContestPairWeight', configKey: 'TERRITORY_CX_CONTEST_PAIR_WEIGHT' },
    { panelKey: 'cxContestPairSpacing', configKey: 'TERRITORY_CX_CONTEST_PAIR_SPACING' },
    { panelKey: 'disconnectEnabled', configKey: 'MODIFIED_VORONOI_DISCONNECT_ENABLED' },
    { panelKey: 'disconnectDistance', configKey: 'MODIFIED_VORONOI_DISCONNECT_DISTANCE' },
    { panelKey: 'dxWeight', configKey: 'TERRITORY_DX_WEIGHT' },
    // Territory transition / style selectors
    { configKey: 'TERRITORY_FILL_TRANSITION_MODE' },
    { configKey: 'TERRITORY_BORDER_TRANSITION_MODE' },
    { configKey: 'TERRITORY_STYLE_MODE' },
    // Pixel params
    // Metaball params
    { configKey: 'TERRITORY_SURFACE_ALPHA' },
    { panelKey: 'territorySurfaceBorderWidth', configKey: 'TERRITORY_SURFACE_BORDER_WIDTH' },
    { panelKey: 'territorySurfaceBorderAlpha', configKey: 'TERRITORY_SURFACE_BORDER_ALPHA' },
    {
        panelKey: 'metaballBlurAffectsBorders',
        configKey: 'METABALL_BLUR_AFFECTS_BORDERS',
    },
    { configKey: 'TERRITORY_SURFACE_SATURATION' },
    { configKey: 'TERRITORY_SURFACE_LIGHTNESS' },
    { panelKey: 'territorySurfaceFillEnabled', configKey: 'TERRITORY_SURFACE_FILL_ENABLED' },
    { panelKey: 'territorySurfaceBorderEnabled', configKey: 'TERRITORY_SURFACE_BORDER_ENABLED' },
    { panelKey: 'territorySurfaceBorderBlend', configKey: 'TERRITORY_SURFACE_BORDER_BLEND' },
    { configKey: 'TERRITORY_SURFACE_BORDER_SATURATION' },
    { configKey: 'TERRITORY_SURFACE_BORDER_LIGHTNESS' },
    {
        panelKey: 'metaballCombatBorderProximityPx',
        configKey: 'METABALL_COMBAT_BORDER_PROXIMITY_PX',
    },
    { configKey: 'NUMBER_TRANSITION_MS' },
    // Pixel extras
    // Graph Territory
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
    // Distance Field Territory (F-138)
    { configKey: 'TERRITORY_TRANSITION_MS' },
    { configKey: 'TERRITORY_TRANSITION_BIND_TO_TICK' },
    { panelKey: 'territoryConquestFrontMode', configKey: 'TERRITORY_CONQUEST_FRONT_MODE' },
    { configKey: 'TERRITORY_MORPH_COMPLETE_PCT' },
    // Contour Territory
    { configKey: 'TERRITORY_GEOMETRY_MODE' },
    { configKey: 'TERRITORY_CLUSTER_SPLIT' },
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
    // VS Transition (F-165)
    { configKey: 'PERIMETER_FIELD_GEOMETRY_SOURCE' },
    { configKey: 'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY' },
    { configKey: 'CELL_GRID_ENABLED' },
    { configKey: 'CELL_GRID_SPACING_PX' },
    { configKey: 'CELL_GRID_PATTERN_SPACING_PX' },
    { configKey: 'CELL_GRID_ORIGIN_MODE' },
    { configKey: 'CELL_GRID_DISTRIBUTION' },
    { configKey: 'CELL_GRID_POSITION_JITTER' },
    { configKey: 'CELL_GRID_MAX_CELLS' },
    { configKey: 'CELL_GRID_INWARD_OFFSET_PX' },
    { configKey: 'CELL_GRID_BOUNDARY_FILL_FLUSH' },
    { configKey: 'CELL_GRID_CELL_SHAPE' },
    { configKey: 'CELL_GRID_CELL_INSET_PX' },
    { configKey: 'CELL_GRID_CELL_CORNER_PX' },
    { configKey: 'CELL_GRID_BORDER_MODE' },
    { configKey: 'CELL_GRID_BORDER_BLEND' },
    { configKey: 'CELL_GRID_EDGE_SMOOTHING_PASSES' },
    { configKey: 'CELL_GRID_EDGE_TRIM_PX' },
    { configKey: 'CELL_GRID_BORDER_CHAIKIN_PASSES' },
    { configKey: 'CELL_GRID_ADJACENCY' },
    { configKey: 'CELL_GRID_WAVE_GEOMETRY' },
    { configKey: 'CELL_GRID_WAVE_SEEDING' },
    { configKey: 'CELL_GRID_FLIP_TRANSITION' },
    { configKey: 'CELL_GRID_FLIP_WINDOW' },
    { configKey: 'CELL_GRID_WAVE_EASE' },
    { configKey: 'CELL_GRID_FLIP_WINDOW_JITTER' },
    { configKey: 'CELL_GRID_PHASE_FIELD_FINISH_FADE_START' },
    { configKey: 'CELL_GRID_PHASE_FIELD_FINISH_FADE_END' },
    { configKey: 'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START' },
    { configKey: 'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END' },
    { configKey: 'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX' },
    {
        panelKey: 'cellGridPhaseFieldFrontierHighlight',
        configKey: 'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
    },
    { configKey: 'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START' },
    { configKey: 'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END' },
    { configKey: 'GRID_GRADIENT_ENABLED' },
    { configKey: 'GRID_GRADIENT_DEBUG_TRANSITIONS' },
    { configKey: 'GRID_GRADIENT_FILL_STYLE' },
    { configKey: 'GRID_GRADIENT_SPACING_PX' },
    { configKey: 'GRID_GRADIENT_MAX_CELLS' },
    { configKey: 'GRID_GRADIENT_ORIGIN_MODE' },
    { configKey: 'GRID_GRADIENT_DISTRIBUTION' },
    { configKey: 'GRID_GRADIENT_POSITION_JITTER' },
    { configKey: 'GRID_GRADIENT_CENTER_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_EDGE_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_CURVE_POWER' },
    { configKey: 'GRID_GRADIENT_FILL_HUE_SHIFT_DEG' },
    { configKey: 'GRID_GRADIENT_BORDER_OFFSET_PX' },
    { configKey: 'GRID_GRADIENT_CELL_SHAPE' },
    { configKey: 'GRID_GRADIENT_VECTOR_BORDERS_ENABLED' },
    { configKey: 'GRID_GRADIENT_BORDER_DOTS_ENABLED' },
    { configKey: 'GRID_GRADIENT_BORDER_DOT_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_BORDER_DOT_STYLE' },
    { configKey: 'GRID_GRADIENT_SHADER_NEIGHBOR_MODE' },
    { configKey: 'GRID_GRADIENT_SHADER_MARK_SOFTNESS' },
    { configKey: 'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX' },
    { configKey: 'GRID_GRADIENT_SHADER_NOISE_STRENGTH' },
    { configKey: 'GRID_GRADIENT_SHADER_PULSE_STRENGTH' },
    { configKey: 'GRID_GRADIENT_SHADER_PULSE_SPEED' },
    { configKey: 'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX' },
    { configKey: 'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED' },
    { configKey: 'GRID_GRADIENT_SHADER_GLOW_STRENGTH' },
    { configKey: 'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST' },
    { configKey: 'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST' },
    { configKey: 'TERRITORY_FRONTIER_TECHNIQUE' },
    { configKey: 'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE' },
    { configKey: 'TERRITORY_FRONTIER_PHASE_SAMPLING' },
    { configKey: 'TERRITORY_FRONTIER_BLUR_PASSES' },
    { configKey: 'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY' },
    { configKey: 'TERRITORY_FRONTIER_CHAIKIN_PASSES' },
    { configKey: 'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX' },
    { configKey: 'TERRITORY_FRONTIER_BAND_WIDTH_PX' },
    { configKey: 'TERRITORY_FRONTIER_JUNCTION_RENDER_MODE' },
    { configKey: 'TERRITORY_FRONTIER_JUNCTION_RADIUS_PX' },
    { configKey: 'TERRITORY_FRONTIER_OUTER_BORDER_ENABLED' },
    { configKey: 'TERRITORY_FRONTIER_FX_MODE' },
    { configKey: 'TERRITORY_FRONTIER_FX_WIDTH_PX' },
    { configKey: 'TERRITORY_FRONTIER_FX_STRENGTH' },
    { configKey: 'TERRITORY_FRONTIER_FX_STEPS' },
    { configKey: 'TERRITORY_FRONTIER_FX_SOFTNESS' },
    { configKey: 'TERRITORY_FRONTIER_FX_EMISSIVE' },
    { configKey: 'TERRITORY_FRONTIER_FX_PARTICLE_DENSITY' },
    { configKey: 'TERRITORY_FRONTIER_FX_PULSE_SPEED' },
    { configKey: 'TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE' },
    { configKey: 'TERRITORY_FRONTIER_FX_APPLY_TRANSITION' },
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
    { configKey: 'BG_IMAGE_ALPHA' },
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
    basic: { label: 'Basic', icon: 'B', color: '#4ade80' },
    advanced: { label: 'Advanced', icon: 'A', color: '#fbbf24' },
    developer: { label: 'Developer', icon: 'D', color: '#f87171' },
};

// The markdown-export section grouping lives in configTransfer.ts
// (CONFIG_EXPORT_SECTIONS) — the copy here had drifted from the one that
// actually ran and was imported without being used.

// ── Format Helpers ──────────────────────────────────────────────────────────

export function formatAnimValue(val: number, unit: string): string {
    if (unit === 'ms') return `${Math.round(val)}${unit}`;
    if (unit === 'ticks') {
        const rounded = Math.abs(val - Math.round(val)) < 0.001 ? `${Math.round(val)}` : val.toFixed(1);
        return `${rounded} ${unit}`;
    }
    return `${val.toFixed(2)}${unit}`;
}


