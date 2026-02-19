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
    { key: 'DAMAGE_PER_SHIP', label: 'Damage Per Ship', min: 0, max: 1, step: 0.01 },
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
    { key: 'CONQUEST_COLOR_DELAY_MS', label: 'Color Delay', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Conquest' },
    { key: 'CONQUEST_FLASH_DURATION_MS', label: 'Flash Duration', min: 0, max: 5000, step: 10, unit: 'ms', group: 'Conquest' },
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
    { panelKey: 'production', configKey: 'BASE_PRODUCTION' },
    { panelKey: 'repair', configKey: 'REPAIR_RATE' },
    { panelKey: 'defense', configKey: 'AGGRESSOR_ADVANTAGE', transform: 'inverse' },
    { panelKey: 'attack', configKey: 'DAMAGE_PER_SHIP' },
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
    { panelKey: 'conquestColorDelayMs', configKey: 'CONQUEST_COLOR_DELAY_MS' },
    { panelKey: 'conquestFlashDurationMs', configKey: 'CONQUEST_FLASH_DURATION_MS' },
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
    { panelKey: 'orbitRingMult', configKey: 'ORBIT_RING_MULT' },
    { panelKey: 'shipOutlineOn', configKey: 'SHIP_OUTLINE_ON' },
    { panelKey: 'shipOutlinePx', configKey: 'SHIP_OUTLINE_PX' },
    { panelKey: 'shipGlowIntensity', configKey: 'SHIP_GLOW_INTENSITY' },
    { panelKey: 'shipScaleMult', configKey: 'SHIP_SCALE_MULT' },
    { panelKey: 'maxVisualShips', configKey: 'MAX_VISUAL_SHIPS' },
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
        'AGGRESSOR_ADVANTAGE', 'DAMAGE_PER_SHIP', 'LETHALITY', 'FORCE_RATIO_EFFECT',
        'CONQUEST_THRESHOLD', 'CONQUEST_TRANSFER_PERCENTAGE',
    ],
    Production: ['BASE_PRODUCTION', 'REPAIR_RATE', 'MIN_REPAIR', 'REPAIR_COMBAT_PENALTY'],
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
