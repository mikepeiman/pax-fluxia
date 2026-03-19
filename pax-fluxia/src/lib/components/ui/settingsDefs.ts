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
];

// ── Panel ↔ Config Mapping ──────────────────────────────────────────────────

/**
 * Bidirectional mapping between panel keys and GAME_CONFIG keys.
 * Used by panelDefaults, applyPanelToConfig, and syncAllFromConfig.
 * 'transform' describes how config values map to panel display values.
 */
export interface PanelConfigMapping {
    panelKey: string;
    configKey: string;
    /** 'direct' = same value; 'inverse' = panel = 1/config; leaving undefined = direct */
    transform?: 'direct' | 'inverse';
}

export const PANEL_CONFIG_MAP: PanelConfigMapping[] = [
    { panelKey: 'tickInterval', configKey: 'BASE_TICK_MS' },
    { panelKey: 'bindAnimToTick', configKey: 'BIND_ANIMATION_TO_TICK' },
    { panelKey: 'production', configKey: 'BASE_PRODUCTION' },
    { panelKey: 'repair', configKey: 'REPAIR_RATE' },
    { panelKey: 'defense', configKey: 'AGGRESSOR_ADVANTAGE', transform: 'inverse' },
    { panelKey: 'repairSuppressAttacker', configKey: 'REPAIR_SUPPRESS_ATTACKER' },
    { panelKey: 'repairSuppressDefender', configKey: 'REPAIR_SUPPRESS_DEFENDER' },
    { panelKey: 'globalDamage', configKey: 'GLOBAL_DAMAGE_MODIFIER' },
    { panelKey: 'arrowLength', configKey: 'ARROW_LENGTH_FRACTION' },
    { panelKey: 'departMode', configKey: 'DEPART_MODE' },
    { panelKey: 'settleDuration', configKey: 'SETTLE_DURATION_MS' },
    { panelKey: 'arrivalSpread', configKey: 'ARRIVAL_SPREAD' },
    { panelKey: 'wobbleAmp', configKey: 'WOBBLE_AMP' },
    { panelKey: 'travelEasing', configKey: 'TRAVEL_EASING' },
    { panelKey: 'travelMode', configKey: 'TRAVEL_MODE' },
    { panelKey: 'travelEasingPower', configKey: 'TRAVEL_EASING_POWER' },
    { panelKey: 'travelDurationMult', configKey: 'TRAVEL_DURATION_MULT' },
    { panelKey: 'travelArcIntensity', configKey: 'TRAVEL_ARC_INTENSITY' },
    { panelKey: 'departStagger', configKey: 'DEPART_STAGGER' },
    { panelKey: 'departArcIntensity', configKey: 'DEPART_ARC_INTENSITY' },
    { panelKey: 'arrivalArcIntensity', configKey: 'ARRIVAL_ARC_INTENSITY' },
    { panelKey: 'orbitDensity', configKey: 'ORBIT_DENSITY' },
    { panelKey: 'attackSurgeMult', configKey: 'ATTACK_SURGE_MULT' },
    { panelKey: 'attackSurgeProportional', configKey: 'ATTACK_SURGE_PROPORTIONAL' },
    { panelKey: 'attackSurgeForceCofactor', configKey: 'ATTACK_SURGE_FORCE_COFACTOR' },
    { panelKey: 'attackSurgeRampMs', configKey: 'ATTACK_SURGE_RAMP_MS' },
    { panelKey: 'attackSurgeShape', configKey: 'ATTACK_SURGE_SHAPE' },
    { panelKey: 'conquestTravelSpeed', configKey: 'CONQUEST_TRAVEL_SPEED' },
    { panelKey: 'conquestLerpDelayMs', configKey: 'CONQUEST_LERP_DELAY_MS' },
    { panelKey: 'conquestColorDelayTicks', configKey: 'CONQUEST_COLOR_DELAY_TICKS' },
    { panelKey: 'conquestFlashTicks', configKey: 'CONQUEST_FLASH_TICKS' },
    { panelKey: 'conquestAnimMode', configKey: 'CONQUEST_ANIMATION_MODE' },
    { panelKey: 'conquestSettleMs', configKey: 'CONQUEST_SETTLE_MS' },
    { panelKey: 'conquestSurgeRadius', configKey: 'CONQUEST_SURGE_RADIUS' },
    { panelKey: 'conquestSurgeStaggerMs', configKey: 'CONQUEST_SURGE_STAGGER_MS' },
    { panelKey: 'arrowTaper', configKey: 'ARROW_TAPER' },
    { panelKey: 'arrowWidth', configKey: 'ARROW_WIDTH' },
    { panelKey: 'arrowSpeed', configKey: 'ARROW_SPEED' },
    { panelKey: 'arrowEasing', configKey: 'ARROW_EASING' },
    { panelKey: 'arrowEngulfMode', configKey: 'ARROW_ENGULF_MODE' },
    { panelKey: 'arrowEngulfRadius', configKey: 'ARROW_ENGULF_RADIUS' },
    { panelKey: 'arrowSpiralMinDeg', configKey: 'ARROW_SPIRAL_MIN_DEG' },
    { panelKey: 'arrowSpiralMaxDeg', configKey: 'ARROW_SPIRAL_MAX_DEG' },
    { panelKey: 'arrowSpiralRandom', configKey: 'ARROW_SPIRAL_RANDOM' },
    { panelKey: 'arrowSpiralDurationMs', configKey: 'ARROW_SPIRAL_DURATION_MS' },
    { panelKey: 'arrowStaggerMs', configKey: 'ARROW_STAGGER_MS' },
    { panelKey: 'arrowStaggerAuto', configKey: 'ARROW_STAGGER_AUTO' },
    { panelKey: 'orbTravel', configKey: 'ORB_TRAVEL' },
    { panelKey: 'orbitBias', configKey: 'ORBIT_BIAS_STRENGTH' },
    { panelKey: 'oscillate', configKey: 'ORBIT_BIAS_OSCILLATE' },
    { panelKey: 'oscMin', configKey: 'ORBIT_BIAS_MIN' },
    { panelKey: 'oscMax', configKey: 'ORBIT_BIAS_MAX' },
    { panelKey: 'oscFreq', configKey: 'ORBIT_BIAS_FREQ' },
    { panelKey: 'departFraction', configKey: 'DEPART_FRACTION' },
    { panelKey: 'departJitter', configKey: 'DEPART_JITTER_MS' },
    { panelKey: 'orbBaseRadius', configKey: 'ORB_BASE_RADIUS' },
    { panelKey: 'orbRadiusScale', configKey: 'ORB_RADIUS_SCALE' },
    { panelKey: 'orbGlowMult', configKey: 'ORB_GLOW_MULT' },
    { panelKey: 'orbOuterAlpha', configKey: 'ORB_OUTER_ALPHA' },
    { panelKey: 'orbMidAlpha', configKey: 'ORB_MID_ALPHA' },
    { panelKey: 'orbCoreAlpha', configKey: 'ORB_CORE_ALPHA' },
    { panelKey: 'orbCenterAlpha', configKey: 'ORB_CENTER_ALPHA' },
    { panelKey: 'orbOuterScale', configKey: 'ORB_OUTER_SCALE' },
    { panelKey: 'orbMidScale', configKey: 'ORB_MID_SCALE' },
    { panelKey: 'orbCoreScale', configKey: 'ORB_CORE_SCALE' },
    { panelKey: 'shipBaseSize', configKey: 'SHIP_BASE_SIZE' },
    { panelKey: 'starRenderRadius', configKey: 'STAR_RENDER_RADIUS' },
    { panelKey: 'starShapeMode', configKey: 'STAR_SHAPE_MODE' },
    { panelKey: 'starIconScale', configKey: 'STAR_ICON_SCALE' },
    { panelKey: 'starCornerRadius', configKey: 'STAR_CORNER_RADIUS' },
    { panelKey: 'starRingOffset', configKey: 'STAR_RING_OFFSET' },
    { panelKey: 'starRingWidth', configKey: 'STAR_RING_WIDTH' },
    { panelKey: 'starRingAlpha', configKey: 'STAR_RING_ALPHA' },
    { panelKey: 'orbitRingMult', configKey: 'ORBIT_RING_MULT' },
    { panelKey: 'damagedOrbitRadius', configKey: 'DAMAGED_ORBIT_RADIUS' },
    { panelKey: 'damagedOrbitEvade', configKey: 'DAMAGED_ORBIT_EVADE' },
    { panelKey: 'shipOutlineOn', configKey: 'SHIP_OUTLINE_ON' },
    { panelKey: 'shipOutlinePx', configKey: 'SHIP_OUTLINE_PX' },
    { panelKey: 'shipGlowIntensity', configKey: 'SHIP_GLOW_INTENSITY' },
    { panelKey: 'shipGlowRadius', configKey: 'SHIP_GLOW_RADIUS' },
    { panelKey: 'minColorLightness', configKey: 'MIN_COLOR_LIGHTNESS' },
    { panelKey: 'shipScaleMult', configKey: 'SHIP_SCALE_MULT' },
    { panelKey: 'shipVisualRadius', configKey: 'SHIP_VISUAL_RADIUS' },
    { panelKey: 'maxVisualShips', configKey: 'MAX_VISUAL_SHIPS' },
    { panelKey: 'starGlowRadiusMult', configKey: 'STAR_GLOW_RADIUS_MULT' },
    { panelKey: 'starGlowIntensity', configKey: 'STAR_GLOW_INTENSITY' },
    { panelKey: 'starGlowOn', configKey: 'STAR_GLOW_ON' },
    { panelKey: 'densityDarkenAlt', configKey: 'DENSITY_DARKEN_ALT' },
    { panelKey: 'showHexGrid', configKey: 'SHOW_HEX_GRID' },
    { panelKey: 'staticOrbits', configKey: 'STATIC_ORBITS' },
    { panelKey: 'showSelectionHex', configKey: 'SHOW_SELECTION_HEX' },
    { panelKey: 'laneOffsetPx', configKey: 'LANE_OFFSET_PX' },
    { panelKey: 'laneConvergence', configKey: 'LANE_CONVERGENCE' },
    { panelKey: 'laneConvergencePoint', configKey: 'LANE_CONVERGENCE_POINT' },
    { panelKey: 'showStarPower', configKey: 'SHOW_STAR_POWER' },
    { panelKey: 'starPowerAlpha', configKey: 'STAR_POWER_ALPHA' },
    { panelKey: 'starPowerRadiusMult', configKey: 'STAR_POWER_RADIUS_MULT' },
    { panelKey: 'starPowerLayers', configKey: 'STAR_POWER_LAYERS' },
    { panelKey: 'starPowerBlur', configKey: 'STAR_POWER_BLUR' },
    { panelKey: 'haloFleetScale', configKey: 'HALO_FLEET_SCALE' },
    { panelKey: 'haloFleetIntensity', configKey: 'HALO_FLEET_INTENSITY' },
    { panelKey: 'haloFleetMode', configKey: 'HALO_FLEET_MODE' },
    { panelKey: 'haloFleetStepSize', configKey: 'HALO_FLEET_STEP_SIZE' },
    { panelKey: 'haloFleetMaxShips', configKey: 'HALO_FLEET_MAX_SHIPS' },
    { panelKey: 'showVoronoi', configKey: 'SHOW_VORONOI' },
    { panelKey: 'voronoiAlpha', configKey: 'VORONOI_ALPHA' },
    { panelKey: 'neutralTerritoryTransparent', configKey: 'NEUTRAL_TERRITORY_TRANSPARENT' },
    { panelKey: 'voronoiResolution', configKey: 'VORONOI_RESOLUTION' },
    { panelKey: 'voronoiEdgeBlend', configKey: 'VORONOI_EDGE_BLEND' },
    { panelKey: 'voronoiBorderWidth', configKey: 'VORONOI_BORDER_WIDTH' },
    { panelKey: 'voronoiBorderAlpha', configKey: 'VORONOI_BORDER_ALPHA' },
    { panelKey: 'voronoiBorderBrighten', configKey: 'VORONOI_BORDER_BRIGHTEN' },
    { panelKey: 'voronoiBorderSmooth', configKey: 'VORONOI_BORDER_SMOOTH' },
    { panelKey: 'voronoiSaturation', configKey: 'VORONOI_SATURATION' },
    { panelKey: 'voronoiLightness', configKey: 'VORONOI_LIGHTNESS' },
    { panelKey: 'voronoiGlowRadius', configKey: 'VORONOI_GLOW_RADIUS' },
    { panelKey: 'voronoiGlowAlpha', configKey: 'VORONOI_GLOW_ALPHA' },
    { panelKey: 'voronoiGlowLayers', configKey: 'VORONOI_GLOW_LAYERS' },
    { panelKey: 'voronoiBlur', configKey: 'VORONOI_BLUR' },
    { panelKey: 'voronoiSmoothing', configKey: 'VORONOI_SMOOTHING' },
    { panelKey: 'voronoiGradientBlend', configKey: 'VORONOI_GRADIENT_BLEND' },
    { panelKey: 'voronoiBlendWidth', configKey: 'VORONOI_BLEND_WIDTH' },
    // Territory toggles
    { panelKey: 'territoryBoundaryMode', configKey: 'TERRITORY_BOUNDARY_MODE' },
    { panelKey: 'territoryFillMode', configKey: 'TERRITORY_FILL_MODE' },
    { panelKey: 'territoryMorphControlPoints', configKey: 'TERRITORY_MORPH_CONTROL_POINTS' },
    { panelKey: 'territoryMode', configKey: 'TERRITORY_MODE' },
    { panelKey: 'territoryRenderMode', configKey: 'TERRITORY_RENDER_MODE' },
    { panelKey: 'territoryFillTransition', configKey: 'TERRITORY_FILL_TRANSITION' },
    { panelKey: 'territoryBorderTransition', configKey: 'TERRITORY_BORDER_TRANSITION' },
    { panelKey: 'territoryEngine', configKey: 'TERRITORY_ENGINE_ENABLED' },
    { panelKey: 'territoryEngineMode', configKey: 'TERRITORY_ENGINE_MODE' },
    { panelKey: 'territoryEngineStaticMethod', configKey: 'TERRITORY_ENGINE_STATIC_METHOD' },
    { panelKey: 'territoryEngineDynamicMethod', configKey: 'TERRITORY_ENGINE_DYNAMIC_METHOD' },
    { panelKey: 'territoryEngineHybridPlan', configKey: 'TERRITORY_ENGINE_HYBRID_PLAN' },
    { panelKey: 'territoryEngineTraceMode', configKey: 'TERRITORY_ENGINE_TRACE_MODE' },
    { panelKey: 'territoryEngineStepMode', configKey: 'TERRITORY_ENGINE_STEP_MODE' },
    { panelKey: 'territoryEngineStepAdvanceToken', configKey: 'TERRITORY_ENGINE_STEP_ADVANCE_TOKEN' },
    { panelKey: 'territoryVoronoi', configKey: 'TERRITORY_VORONOI' },
    { panelKey: 'territoryMetaball', configKey: 'TERRITORY_METABALL' },
    { panelKey: 'territoryPixel', configKey: 'TERRITORY_PIXEL' },
    // Pixel params
    { panelKey: 'pixelAlpha', configKey: 'PIXEL_ALPHA' },
    { panelKey: 'pixelResolution', configKey: 'PIXEL_RESOLUTION' },
    { panelKey: 'pixelEdgeBlend', configKey: 'PIXEL_EDGE_BLEND' },
    { panelKey: 'pixelBlur', configKey: 'PIXEL_BLUR' },
    { panelKey: 'pixelBlendPower', configKey: 'PIXEL_BLEND_POWER' },
    { panelKey: 'pixelCorridorBoost', configKey: 'PIXEL_CORRIDOR_BOOST' },
    { panelKey: 'pixelHueShift', configKey: 'PIXEL_HUE_SHIFT' },
    { panelKey: 'pixelBorderWidth', configKey: 'PIXEL_BORDER_WIDTH' },
    { panelKey: 'pixelBorderAlpha', configKey: 'PIXEL_BORDER_ALPHA' },
    { panelKey: 'pixelBorderBrighten', configKey: 'PIXEL_BORDER_BRIGHTEN' },
    { panelKey: 'pixelPattern', configKey: 'PIXEL_PATTERN' },
    { panelKey: 'pixelPatternScale', configKey: 'PIXEL_PATTERN_SCALE' },
    { panelKey: 'pixelPatternRotation', configKey: 'PIXEL_PATTERN_ROTATION' },
    { panelKey: 'pixelEdgeFade', configKey: 'PIXEL_EDGE_FADE' },
    // Metaball params
    { panelKey: 'metaballRadius', configKey: 'METABALL_INFLUENCE_RADIUS' },
    { panelKey: 'metaballFalloff', configKey: 'METABALL_FALLOFF' },
    { panelKey: 'metaballSharpness', configKey: 'METABALL_BLEND_SHARPNESS' },
    { panelKey: 'metaballAlpha', configKey: 'METABALL_ALPHA' },
    { panelKey: 'metaballCellSize', configKey: 'METABALL_CELL_SIZE' },
    { panelKey: 'metaballThreshold', configKey: 'METABALL_THRESHOLD' },
    { panelKey: 'metaballStrength', configKey: 'METABALL_STRENGTH_MULT' },
    { panelKey: 'metaballEdgeFade', configKey: 'METABALL_EDGE_FADE' },
    { panelKey: 'metaballBorderWidth', configKey: 'METABALL_BORDER_WIDTH' },
    { panelKey: 'metaballBorderAlpha', configKey: 'METABALL_BORDER_ALPHA' },
    { panelKey: 'metaballBlur', configKey: 'METABALL_BLUR' },
    { panelKey: 'metaballCoverage', configKey: 'METABALL_COVERAGE' },
    { panelKey: 'metaballSaturation', configKey: 'METABALL_SATURATION' },
    { panelKey: 'metaballLightness', configKey: 'METABALL_LIGHTNESS' },
    { panelKey: 'numberTransitionMs', configKey: 'NUMBER_TRANSITION_MS' },
    // Pixel extras
    { panelKey: 'pixelLaneConstrain', configKey: 'PIXEL_LANE_CONSTRAIN' },
    { panelKey: 'pixelPressure', configKey: 'PIXEL_PRESSURE' },
    { panelKey: 'pixelSaturation', configKey: 'PIXEL_SATURATION' },
    { panelKey: 'pixelLightness', configKey: 'PIXEL_LIGHTNESS' },
    // Graph Territory
    { panelKey: 'territoryGraph', configKey: 'TERRITORY_GRAPH' },
    { panelKey: 'graphAlpha', configKey: 'GRAPH_ALPHA' },
    { panelKey: 'graphResolution', configKey: 'GRAPH_RESOLUTION' },
    { panelKey: 'graphBlur', configKey: 'GRAPH_BLUR' },
    { panelKey: 'graphPressure', configKey: 'GRAPH_PRESSURE' },
    { panelKey: 'graphCorridorBoost', configKey: 'GRAPH_CORRIDOR_BOOST' },
    { panelKey: 'graphBorderWidth', configKey: 'GRAPH_BORDER_WIDTH' },
    { panelKey: 'graphBorderAlpha', configKey: 'GRAPH_BORDER_ALPHA' },
    { panelKey: 'graphBorderBrighten', configKey: 'GRAPH_BORDER_BRIGHTEN' },
    { panelKey: 'graphEdgeFade', configKey: 'GRAPH_EDGE_FADE' },
    { panelKey: 'graphBarrierExtent', configKey: 'GRAPH_BARRIER_EXTENT' },
    { panelKey: 'graphPattern', configKey: 'GRAPH_PATTERN' },
    { panelKey: 'graphPatternScale', configKey: 'GRAPH_PATTERN_SCALE' },
    { panelKey: 'graphPatternRotation', configKey: 'GRAPH_PATTERN_ROTATION' },
    { panelKey: 'borderFeel', configKey: 'BORDER_FEEL' },
    { panelKey: 'borderSmooth', configKey: 'BORDER_SMOOTH' },
    { panelKey: 'laneInfluence', configKey: 'LANE_INFLUENCE' },
    { panelKey: 'laneWidth', configKey: 'LANE_WIDTH' },
    { panelKey: 'laneDirectFalloff', configKey: 'LANE_DIRECT_FALLOFF' },
    { panelKey: 'graphSaturation', configKey: 'GRAPH_SATURATION' },
    { panelKey: 'graphLightness', configKey: 'GRAPH_LIGHTNESS' },
    // Connection visuals
    { panelKey: 'showConnections', configKey: 'SHOW_CONNECTIONS' },
    { panelKey: 'connectionWidth', configKey: 'CONNECTION_WIDTH' },
    { panelKey: 'connectionAlpha', configKey: 'CONNECTION_ALPHA' },
    { panelKey: 'connectionShadowWidth', configKey: 'CONNECTION_SHADOW_WIDTH' },
    { panelKey: 'connectionShadowAlpha', configKey: 'CONNECTION_SHADOW_ALPHA' },
    // Star glow
    { panelKey: 'starGlowOn', configKey: 'STAR_GLOW_ON' },
    { panelKey: 'starGlowLayers', configKey: 'STAR_GLOW_LAYERS' },
    // Star ownership ring
    { panelKey: 'starRingOffset', configKey: 'STAR_RING_OFFSET' },
    { panelKey: 'starRingWidth', configKey: 'STAR_RING_WIDTH' },
    { panelKey: 'starRingAlpha', configKey: 'STAR_RING_ALPHA' },
    // Density
    { panelKey: 'densityHueStep', configKey: 'DENSITY_HUE_STEP' },
    { panelKey: 'densitySatStep', configKey: 'DENSITY_SAT_STEP' },
    { panelKey: 'densityLightStep', configKey: 'DENSITY_LIGHT_STEP' },
    { panelKey: 'densityTiers', configKey: 'DENSITY_TIERS' },
    { panelKey: 'densityDarkenAlt', configKey: 'DENSITY_DARKEN_ALT' },
    // Orbit
    { panelKey: 'orbitBaseRadius', configKey: 'ORBIT_BASE_RADIUS' },
    { panelKey: 'staticOrbits', configKey: 'STATIC_ORBITS' },
    { panelKey: 'orbDrawMode', configKey: 'ORB_DRAW_MODE' },
    // Surge pulse
    { panelKey: 'surgePulseDurationMs', configKey: 'SURGE_PULSE_DURATION_MS' },
    // Anim speed
    { panelKey: 'animSpeed', configKey: 'ANIMATION_SPEED_MS' },
    // Transfer
    { panelKey: 'transferAnimMs', configKey: 'TRANSFER_ANIMATION_MS' },
    // Show hex selection
    { panelKey: 'showSelectionHex', configKey: 'SHOW_SELECTION_HEX' },
    // Modified Voronoi Territory (F-138)
    { panelKey: 'territoryModifiedVoronoi', configKey: 'TERRITORY_MODIFIED_VORONOI' },
    { panelKey: 'territoryPowerVoronoi', configKey: 'TERRITORY_POWER_VORONOI' },
    { panelKey: 'territoryPVV3', configKey: 'TERRITORY_PVV3' },
    { panelKey: 'modifiedVoronoiStarMargin', configKey: 'MODIFIED_VORONOI_STAR_MARGIN' },
    { panelKey: 'modifiedVoronoiArcStrength', configKey: 'MODIFIED_VORONOI_ARC_STRENGTH' },
    { panelKey: 'modifiedVoronoiArcThreshold', configKey: 'MODIFIED_VORONOI_ARC_THRESHOLD' },
    { panelKey: 'modifiedVoronoiArcMinSegment', configKey: 'MODIFIED_VORONOI_ARC_MIN_SEGMENT' },
    { panelKey: 'modifiedVoronoiCorridorEnabled', configKey: 'MODIFIED_VORONOI_CORRIDOR_ENABLED' },
    { panelKey: 'modifiedVoronoiCorridorSpacing', configKey: 'MODIFIED_VORONOI_CORRIDOR_SPACING' },
    { panelKey: 'modifiedVoronoiDisconnectEnabled', configKey: 'MODIFIED_VORONOI_DISCONNECT_ENABLED' },
    { panelKey: 'modifiedVoronoiDisconnectDistance', configKey: 'MODIFIED_VORONOI_DISCONNECT_DISTANCE' },
    // Distance Field Territory (F-138)
    { panelKey: 'territoryDistanceField', configKey: 'TERRITORY_DISTANCE_FIELD' },
    { panelKey: 'dfResolution', configKey: 'DF_RESOLUTION' },
    { panelKey: 'dfBlur', configKey: 'DF_BLUR' },
    { panelKey: 'dfEdgeFade', configKey: 'DF_EDGE_FADE' },
    { panelKey: 'dfAlpha', configKey: 'DF_ALPHA' },
    { panelKey: 'dfHue', configKey: 'DF_HUE' },
    { panelKey: 'dfSaturation', configKey: 'DF_SATURATION' },
    { panelKey: 'dfLightness', configKey: 'DF_LIGHTNESS' },
    { panelKey: 'dfExpansion', configKey: 'DF_EXPANSION' },
    { panelKey: 'dfSmoothing', configKey: 'DF_SMOOTHING' },
    { panelKey: 'dfRounding', configKey: 'DF_ROUNDING' },
    { panelKey: 'dfMinStarRadius', configKey: 'DF_MIN_STAR_RADIUS' },
    { panelKey: 'dfBorderWidth', configKey: 'DF_BORDER_WIDTH' },
    { panelKey: 'dfBorderSoftness', configKey: 'DF_BORDER_SOFTNESS' },
    { panelKey: 'dfBorderAlpha', configKey: 'DF_BORDER_ALPHA' },
    { panelKey: 'dfBorderBrighten', configKey: 'DF_BORDER_BRIGHTEN' },
    { panelKey: 'dfBorderHqEnabled', configKey: 'DF_BORDER_HQ_ENABLED' },
    { panelKey: 'dfBorderHqScale', configKey: 'DF_BORDER_HQ_SCALE' },
    { panelKey: 'dfBorderHqMaxDim', configKey: 'DF_BORDER_HQ_MAX_DIM' },
    { panelKey: 'dfVectorBordersEnabled', configKey: 'DF_VECTOR_BORDERS_ENABLED' },
    { panelKey: 'dfVectorGridResolution', configKey: 'DF_VECTOR_GRID_RESOLUTION' },
    { panelKey: 'dfVectorSmoothing', configKey: 'DF_VECTOR_SMOOTHING' },
    { panelKey: 'dfVectorSimplify', configKey: 'DF_VECTOR_SIMPLIFY' },
    { panelKey: 'dfVectorUpdateMs', configKey: 'DF_VECTOR_UPDATE_MS' },
    { panelKey: 'dfInfluenceWeight', configKey: 'DF_INFLUENCE_WEIGHT' },
    { panelKey: 'dfDistanceMetric', configKey: 'DF_DISTANCE_METRIC' },
    { panelKey: 'territoryTransitionMs', configKey: 'TERRITORY_TRANSITION_MS' },
    { panelKey: 'borderTransResampleN', configKey: 'BORDER_TRANS_RESAMPLE_N' },
    { panelKey: 'borderTransEasing', configKey: 'BORDER_TRANS_EASING' },
    { panelKey: 'borderTransOvershoot', configKey: 'BORDER_TRANS_OVERSHOOT' },
    { panelKey: 'dfMorphEasing', configKey: 'DF_MORPH_EASING' },
    { panelKey: 'dfCorridorEnabled', configKey: 'DF_CORRIDOR_ENABLED' },
    { panelKey: 'dfCorridorMode', configKey: 'DF_CORRIDOR_MODE' },
    { panelKey: 'dfCorridorSpacing', configKey: 'DF_CORRIDOR_SPACING' },
    { panelKey: 'dfCorridorCount', configKey: 'DF_CORRIDOR_COUNT' },
    { panelKey: 'dfCorridorWeight', configKey: 'DF_CORRIDOR_WEIGHT' },
    { panelKey: 'dfDisconnectEnabled', configKey: 'DF_DISCONNECT_ENABLED' },
    { panelKey: 'dfBorderMode', configKey: 'DF_BORDER_MODE' },
    { panelKey: 'dfBorderFamily', configKey: 'DF_BORDER_FAMILY' },
    { panelKey: 'dfBorderEngine', configKey: 'DF_BORDER_ENGINE' },
    { panelKey: 'dfCanonicalFrontierRuntimeMode', configKey: 'DF_CANONICAL_FRONTIER_RUNTIME_MODE' },
    { panelKey: 'dfCanonicalFrontierDiagnosticShow', configKey: 'DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW' },
    { panelKey: 'dfDisconnectDistance', configKey: 'DF_DISCONNECT_DISTANCE' },
    { panelKey: 'dfDisconnectWeight', configKey: 'DF_DISCONNECT_WEIGHT' },
    // Contour Territory
    { panelKey: 'territoryContour', configKey: 'TERRITORY_CONTOUR' },
    { panelKey: 'territoryGeometryMode', configKey: 'TERRITORY_GEOMETRY_MODE' },
    { panelKey: 'territoryEngineMethod', configKey: 'TERRITORY_ENGINE_METHOD' },
    { panelKey: 'territoryClusterSplit', configKey: 'TERRITORY_CLUSTER_SPLIT' },
    { panelKey: 'contourSaturation', configKey: 'CONTOUR_SATURATION' },
    { panelKey: 'contourLightness', configKey: 'CONTOUR_LIGHTNESS' },
    { panelKey: 'contourFillAlpha', configKey: 'CONTOUR_FILL_ALPHA' },
    { panelKey: 'contourResolution', configKey: 'CONTOUR_RESOLUTION' },
    { panelKey: 'contourSimplify', configKey: 'CONTOUR_SIMPLIFY' },
    { panelKey: 'contourSmooth', configKey: 'CONTOUR_SMOOTH' },
    { panelKey: 'contourBorderWidth', configKey: 'CONTOUR_BORDER_WIDTH' },
    { panelKey: 'contourBorderAlpha', configKey: 'CONTOUR_BORDER_ALPHA' },
    { panelKey: 'contourBorderBrighten', configKey: 'CONTOUR_BORDER_BRIGHTEN' },
    { panelKey: 'contourCornerRadius', configKey: 'CONTOUR_CORNER_RADIUS' },
    { panelKey: 'contourCornerThreshold', configKey: 'CONTOUR_CORNER_THRESHOLD' },
    { panelKey: 'contourPeripheryStrength', configKey: 'CONTOUR_PERIPHERY_STRENGTH' },
    { panelKey: 'contourPeripheryInset', configKey: 'CONTOUR_PERIPHERY_INSET' },
    { panelKey: 'contourJunctionCorrection', configKey: 'CONTOUR_JUNCTION_CORRECTION' },
    // Combat & Balance
    { panelKey: 'transferRate', configKey: 'TRANSFER_RATE' },
    { panelKey: 'lethality', configKey: 'LETHALITY' },
    { panelKey: 'forceRatioEffect', configKey: 'FORCE_RATIO_EFFECT' },
    { panelKey: 'conquestThreshold', configKey: 'CONQUEST_THRESHOLD' },
    { panelKey: 'conquestTransferPercentage', configKey: 'CONQUEST_TRANSFER_PERCENTAGE' },
    { panelKey: 'retreatCaptureRate', configKey: 'RETREAT_CAPTURE_RATE' },
    { panelKey: 'scatterCaptureRate', configKey: 'SCATTER_CAPTURE_RATE' },
    { panelKey: 'scatterDestroyRate', configKey: 'SCATTER_DESTROY_RATE' },
    { panelKey: 'retreatDamagedActivationRate', configKey: 'RETREAT_DAMAGED_ACTIVATION_RATE' },
    { panelKey: 'damagedShipEffectiveness', configKey: 'DAMAGED_SHIP_EFFECTIVENESS' },
    { panelKey: 'minimumDamage', configKey: 'MINIMUM_DAMAGE' },
    { panelKey: 'overwhelmThreshold', configKey: 'OVERWHELM_THRESHOLD' },
    { panelKey: 'minRepair', configKey: 'MIN_REPAIR' },
    { panelKey: 'repairCombatPenalty', configKey: 'REPAIR_COMBAT_PENALTY' },
    // AI
    { panelKey: 'aiMustAttackRatio', configKey: 'AI_MUST_ATTACK_RATIO' },
    { panelKey: 'aiAttackUpperBounds', configKey: 'AI_ATTACK_UPPER_BOUNDS' },
    { panelKey: 'aiAttackStickiness', configKey: 'AI_ATTACK_STICKINESS' },
    { panelKey: 'aiEvaluationFrequency', configKey: 'AI_EVALUATION_FREQUENCY' },
    { panelKey: 'aiTacticalAggression', configKey: 'AI_TACTICAL_AGGRESSION' },
    { panelKey: 'aiRandomAggression', configKey: 'AI_RANDOM_AGGRESSION' },
    // Economy & Transfer
    { panelKey: 'startingShips', configKey: 'STARTING_SHIPS' },
    { panelKey: 'starsPerPlayer', configKey: 'STARS_PER_PLAYER' },
    { panelKey: 'minShipsPerTransfer', configKey: 'MIN_SHIPS_PER_TRANSFER' },
    { panelKey: 'maxShipsPerTransfer', configKey: 'MAX_SHIPS_PER_TRANSFER' },
    // Conquest rules
    { panelKey: 'conquestForceGlow', configKey: 'CONQUEST_FORCE_GLOW' },
    { panelKey: 'conquestForceGlowMult', configKey: 'CONQUEST_FORCE_GLOW_MULT' },
    { panelKey: 'conquestSlowmoEnabled', configKey: 'CONQUEST_SLOWMO_ENABLED' },
    { panelKey: 'conquestSlowmoFactor', configKey: 'CONQUEST_SLOWMO_FACTOR' },
    { panelKey: 'conquestSlowmoDurationMs', configKey: 'CONQUEST_SLOWMO_DURATION_MS' },
    { panelKey: 'conquestDamagedCaptureRate', configKey: 'CONQUEST_DAMAGED_CAPTURE_RATE' },
    { panelKey: 'conquestDamagedDestroyRate', configKey: 'CONQUEST_DAMAGED_DESTROY_RATE' },
    { panelKey: 'ordersPersistAfterConquest', configKey: 'ORDERS_PERSIST_AFTER_CONQUEST' },
    { panelKey: 'retainOrderOnConquest', configKey: 'RETAIN_ORDER_ON_CONQUEST' },
    { panelKey: 'allowOpposingOrders', configKey: 'ALLOW_OPPOSING_ORDERS' },
    // Arrow appearance
    { panelKey: 'arrowHeadSize', configKey: 'ARROW_HEAD_SIZE' },
    { panelKey: 'arrowShaftWidth', configKey: 'ARROW_SHAFT_WIDTH' },
    { panelKey: 'arrowAlpha', configKey: 'ARROW_ALPHA' },
    { panelKey: 'arrowDashGap', configKey: 'ARROW_DASH_GAP' },
    { panelKey: 'arrowDashLength', configKey: 'ARROW_DASH_LENGTH' },
    // Star labels
    { panelKey: 'starLabelScale', configKey: 'STAR_LABEL_SCALE' },
    { panelKey: 'starLabelFontSize', configKey: 'STAR_LABEL_FONT_SIZE' },
    { panelKey: 'starLabelDistance', configKey: 'STAR_LABEL_DISTANCE' },
    { panelKey: 'starLabelAngle', configKey: 'STAR_LABEL_ANGLE' },
    { panelKey: 'starLabelDamagedFontSize', configKey: 'STAR_LABEL_DAMAGED_FONT_SIZE' },
    { panelKey: 'starLabelIdFontSize', configKey: 'STAR_LABEL_ID_FONT_SIZE' },
    { panelKey: 'starLabelInline', configKey: 'STAR_LABEL_INLINE' },
    { panelKey: 'starLabelLineHeight', configKey: 'STAR_LABEL_LINE_HEIGHT' },
    { panelKey: 'starLabelOffsetX', configKey: 'STAR_LABEL_OFFSET_X' },
    { panelKey: 'starLabelOffsetY', configKey: 'STAR_LABEL_OFFSET_Y' },
    // Star system
    { panelKey: 'starSystemScale', configKey: 'STAR_SYSTEM_SCALE' },
    { panelKey: 'starHitRadius', configKey: 'STAR_HIT_RADIUS' },
    { panelKey: 'starRingRadius', configKey: 'STAR_RING_RADIUS' },
    { panelKey: 'starRingLightness', configKey: 'STAR_RING_LIGHTNESS' },
    { panelKey: 'starRingSaturation', configKey: 'STAR_RING_SATURATION' },
    // Visuals
    { panelKey: 'connectionColor', configKey: 'CONNECTION_COLOR' },
    { panelKey: 'connectionMaxDistance', configKey: 'CONNECTION_MAX_DISTANCE' },
    { panelKey: 'bgImageUrl', configKey: 'BG_IMAGE_URL' },
    { panelKey: 'classicMapSpacing', configKey: 'CLASSIC_MAP_SPACING' },
    { panelKey: 'labelAnimMode', configKey: 'LABEL_ANIM_MODE' },
    // ── Audio ──
    { panelKey: 'audioMasterVolume', configKey: 'AUDIO_MASTER_VOLUME' },
    { panelKey: 'audioMuted', configKey: 'AUDIO_MUTED' },
    { panelKey: 'audioSeparateConquest', configKey: 'AUDIO_SEPARATE_CONQUEST' },
    // Audio volumes (14)
    { panelKey: 'audioVolClick', configKey: 'AUDIO_VOL_CLICK' },
    { panelKey: 'audioVolMove', configKey: 'AUDIO_VOL_MOVE' },
    { panelKey: 'audioVolAttack', configKey: 'AUDIO_VOL_ATTACK' },
    { panelKey: 'audioVolChat', configKey: 'AUDIO_VOL_CHAT' },
    { panelKey: 'audioVolTick', configKey: 'AUDIO_VOL_TICK' },
    { panelKey: 'audioVolPlay', configKey: 'AUDIO_VOL_PLAY' },
    { panelKey: 'audioVolLose', configKey: 'AUDIO_VOL_LOSE' },
    { panelKey: 'audioVolWin', configKey: 'AUDIO_VOL_WIN' },
    { panelKey: 'audioVolNewPlayer', configKey: 'AUDIO_VOL_NEW_PLAYER' },
    { panelKey: 'audioVolConquest', configKey: 'AUDIO_VOL_CONQUEST' },
    { panelKey: 'audioVolConquestRetreat', configKey: 'AUDIO_VOL_CONQUEST_RETREAT' },
    { panelKey: 'audioVolConquestScatter', configKey: 'AUDIO_VOL_CONQUEST_SCATTER' },
    { panelKey: 'audioVolConquestComplete', configKey: 'AUDIO_VOL_CONQUEST_COMPLETE' },
    { panelKey: 'audioVolStarloss', configKey: 'AUDIO_VOL_STARLOSS' },
    // Audio file paths (14)
    { panelKey: 'audioFileClick', configKey: 'AUDIO_FILE_CLICK' },
    { panelKey: 'audioFileMove', configKey: 'AUDIO_FILE_MOVE' },
    { panelKey: 'audioFileAttack', configKey: 'AUDIO_FILE_ATTACK' },
    { panelKey: 'audioFileChat', configKey: 'AUDIO_FILE_CHAT' },
    { panelKey: 'audioFileTick', configKey: 'AUDIO_FILE_TICK' },
    { panelKey: 'audioFilePlay', configKey: 'AUDIO_FILE_PLAY' },
    { panelKey: 'audioFileLose', configKey: 'AUDIO_FILE_LOSE' },
    { panelKey: 'audioFileWin', configKey: 'AUDIO_FILE_WIN' },
    { panelKey: 'audioFileNewPlayer', configKey: 'AUDIO_FILE_NEW_PLAYER' },
    { panelKey: 'audioFileConquest', configKey: 'AUDIO_FILE_CONQUEST' },
    { panelKey: 'audioFileConquestRetreat', configKey: 'AUDIO_FILE_CONQUEST_RETREAT' },
    { panelKey: 'audioFileConquestScatter', configKey: 'AUDIO_FILE_CONQUEST_SCATTER' },
    { panelKey: 'audioFileConquestComplete', configKey: 'AUDIO_FILE_CONQUEST_COMPLETE' },
    { panelKey: 'audioFileStarloss', configKey: 'AUDIO_FILE_STARLOSS' },
    // Audio offsets (14)
    { panelKey: 'audioOffsetClick', configKey: 'AUDIO_OFFSET_CLICK' },
    { panelKey: 'audioOffsetMove', configKey: 'AUDIO_OFFSET_MOVE' },
    { panelKey: 'audioOffsetAttack', configKey: 'AUDIO_OFFSET_ATTACK' },
    { panelKey: 'audioOffsetChat', configKey: 'AUDIO_OFFSET_CHAT' },
    { panelKey: 'audioOffsetTick', configKey: 'AUDIO_OFFSET_TICK' },
    { panelKey: 'audioOffsetPlay', configKey: 'AUDIO_OFFSET_PLAY' },
    { panelKey: 'audioOffsetLose', configKey: 'AUDIO_OFFSET_LOSE' },
    { panelKey: 'audioOffsetWin', configKey: 'AUDIO_OFFSET_WIN' },
    { panelKey: 'audioOffsetNewPlayer', configKey: 'AUDIO_OFFSET_NEW_PLAYER' },
    { panelKey: 'audioOffsetConquest', configKey: 'AUDIO_OFFSET_CONQUEST' },
    { panelKey: 'audioOffsetConquestRetreat', configKey: 'AUDIO_OFFSET_CONQUEST_RETREAT' },
    { panelKey: 'audioOffsetConquestScatter', configKey: 'AUDIO_OFFSET_CONQUEST_SCATTER' },
    { panelKey: 'audioOffsetConquestComplete', configKey: 'AUDIO_OFFSET_CONQUEST_COMPLETE' },
    { panelKey: 'audioOffsetStarloss', configKey: 'AUDIO_OFFSET_STARLOSS' },
];

// ── ConfigKey → PanelKey lookup (for animSliderToPanelKey) ──────────────────

export const CONFIG_TO_PANEL_KEY: Record<string, string> = Object.fromEntries(
    PANEL_CONFIG_MAP.map(m => [m.configKey, m.panelKey])
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
    return `${val.toFixed(2)}${unit}`;
}


