import {
    AI_VARIABLES,
    COMBAT_VARIABLES,
    CONFIG_TO_PANEL_KEY,
    DENSITY_VARIABLES,
    derivePanelKey,
    LOG_CATEGORIES,
    STAR_LABEL_SLIDERS,
} from '../settingsDefs';

export type SettingScope =
    | 'ai'
    | 'audio'
    | 'battle'
    | 'conquest'
    | 'diagnostics'
    | 'economy'
    | 'logging'
    | 'players'
    | 'rules'
    | 'ships'
    | 'surge'
    | 'territory'
    | 'timing'
    | 'travel'
    | 'visuals';

type SettingMeta = {
    key: string;
    panelKey?: string;
    description?: string;
};

type SettingMetaMap = Record<string, SettingMeta>;

export type SearchableSettingRecord = {
    scope: SettingScope;
    label: string;
    key: string;
    panelKey: string;
    description?: string;
};

type LabelScopeMap = Partial<Record<SettingScope, SettingMetaMap>>;

function normalizeLabel(label: string): string {
    return label
        .replace(/^[^\p{L}\p{N}]+/u, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSliderMeta(
    defs: Array<{ key: string; label: string; desc?: string }>,
): SettingMetaMap {
    return Object.fromEntries(
        defs.map((def) => [
            normalizeLabel(def.label),
            { key: def.key, description: def.desc },
        ]),
    );
}

const AI_META = buildSliderMeta(AI_VARIABLES);
const BATTLE_META = buildSliderMeta(COMBAT_VARIABLES);
const LOGGING_META = {
    ...Object.fromEntries(
        LOG_CATEGORIES.map((category) => [
            normalizeLabel(category.label),
            {
                key: `local.logFlags.${category.key}`,
                description: `Local log channel toggle for ${category.desc.toLowerCase()}.`,
            },
        ]),
    ),
    'Grid Gradient transition trace': {
        key: 'GRID_GRADIENT_DEBUG_TRANSITIONS',
        description:
            'Detailed Grid Gradient conquest transition trace logs. Does not enable the broad Render log channel.',
    },
} as SettingMetaMap;
const STAR_LABEL_META = buildSliderMeta(STAR_LABEL_SLIDERS);
const DENSITY_META = buildSliderMeta(DENSITY_VARIABLES);

const SCOPE_LABEL_META: LabelScopeMap = {
    ai: AI_META,
    audio: {
        'Master Volume': {
            key: 'AUDIO_MASTER_VOLUME',
            description: 'Master volume multiplier applied to all game sounds.',
        },
        'Sound Enabled': {
            key: 'AUDIO_MUTED',
            description:
                'Inverse control for AUDIO_MUTED. Turning this off mutes the full audio mixer.',
        },
        Separate: {
            key: 'AUDIO_SEPARATE_CONQUEST',
            description:
                'Splits conquest audio into subtype-specific sounds instead of one shared conquest clip.',
        },
    },
    battle: BATTLE_META,
    conquest: {
        'Conquest Mode': { key: 'CONQUEST_ANIMATION_MODE' },
        'Color Delay': { key: 'CONQUEST_COLOR_DELAY_TICKS' },
        'Flash Duration': { key: 'CONQUEST_FLASH_TICKS' },
        'Settle Duration': { key: 'CONQUEST_SETTLE_MS' },
        'Surge Stagger': { key: 'CONQUEST_SURGE_STAGGER_MS' },
        'Scale Glow With Force': { key: 'CONQUEST_FORCE_GLOW' },
        'Glow Multiplier': { key: 'CONQUEST_FORCE_GLOW_MULT' },
        Taper: { key: 'ARROW_TAPER' },
        'Formation Width': { key: 'ARROW_WIDTH' },
        'Arrowhead Speed': { key: 'ARROW_SPEED' },
        'Arrowhead Easing': { key: 'ARROW_EASING' },
        'Auto Stagger': { key: 'ARROW_STAGGER_AUTO' },
        'Arrowhead Stagger': { key: 'ARROW_STAGGER_MS' },
        'Engulf Mode': { key: 'ARROW_ENGULF_MODE' },
        'Engulf Radius': { key: 'ARROW_ENGULF_RADIUS' },
        'Min Degrees': { key: 'ARROW_SPIRAL_MIN_DEG' },
        'Max Degrees': { key: 'ARROW_SPIRAL_MAX_DEG' },
        'Random Spiral': { key: 'ARROW_SPIRAL_RANDOM' },
        'Spiral Duration': { key: 'ARROW_SPIRAL_DURATION_MS' },
    },
    diagnostics: {
        // The DEBUG_MORPH_* / DEBUG_DY4_* / MORPH_CONQUEST_RADIUS entries were
        // removed 2026-07-14: their config keys died with the morph-vertex and
        // DY4 diagnostics, so each was a search hit that navigated to nothing.
        'Continuous Settings Dump': {
            key: 'local.settingsDump.enabled',
            description:
                'Dev-only automatic dump of live settings changes to common/resources/settings-live/current-settings.json.',
        },
    },
    economy: {
        Production: {
            key: 'BASE_PRODUCTION',
            description:
                'Base production applied to each owned star before star-type multipliers.',
        },
        'Transfer Rate': {
            key: 'TRANSFER_RATE',
            description:
                'Share of a star’s active ships moved each tick when issuing reinforcements.',
        },
        'Min Transfer': { key: 'MIN_SHIPS_PER_TRANSFER' },
        'Max Transfer': { key: 'MAX_SHIPS_PER_TRANSFER' },
        'Repair Rate': { key: 'REPAIR_RATE' },
        'Repair Suppress (Attacking)': { key: 'REPAIR_SUPPRESS_ATTACKER' },
        'Repair Suppress (Defending)': { key: 'REPAIR_SUPPRESS_DEFENDER' },
        'Starting Ships': { key: 'STARTING_SHIPS' },
    },
    logging: LOGGING_META,
    players: {
        'Anchor Hue': {
            key: 'local.playerPalette.anchorHue',
            description:
                'Persisted local palette anchor hue used to generate the six-player roster colors.',
        },
        'Hue Nudge': {
            key: 'local.playerPalette.nudges[selected]',
            description:
                'Per-player local hue offset applied on top of the anchored palette spread.',
        },
        Saturation: {
            key: 'local.playerPalette.saturation',
            description:
                'Persisted local palette saturation used when generating player colors.',
        },
        Lightness: {
            key: 'local.playerPalette.lightness',
            description:
                'Persisted local palette lightness used when generating player colors.',
        },
    },
    rules: {},
    ships: {
        ...STAR_LABEL_META,
        ...DENSITY_META,
        'System Scale': { key: 'STAR_SYSTEM_SCALE' },
        'Visual Radius': { key: 'SHIP_VISUAL_RADIUS' },
        'Scale Multiplier': { key: 'SHIP_SCALE_MULT' },
        'Ship Outline': { key: 'SHIP_OUTLINE_ON' },
        'Outline px': { key: 'SHIP_OUTLINE_PX' },
        'Glow Intensity': { key: 'SHIP_GLOW_INTENSITY' },
        'Glow Radius': { key: 'SHIP_GLOW_RADIUS' },
        'Min Contrast': { key: 'MIN_COLOR_LIGHTNESS' },
        'Show Halos': { key: 'SHOW_STAR_POWER' },
        'Halo Alpha': { key: 'STAR_POWER_ALPHA' },
        'Halo Radius': { key: 'STAR_POWER_RADIUS_MULT' },
        'Halo Layers': { key: 'STAR_POWER_LAYERS' },
        'Halo Blur': { key: 'STAR_POWER_BLUR' },
        'Fleet Glow': { key: 'HALO_FLEET_SCALE' },
        'Fleet Intensity': { key: 'HALO_FLEET_INTENSITY' },
        'Fleet Mode': { key: 'HALO_FLEET_MODE' },
        'Step Size': { key: 'HALO_FLEET_STEP_SIZE' },
        'Max Ships': { key: 'HALO_FLEET_MAX_SHIPS' },
        'Inner Orbit Padding': { key: 'ORBIT_BASE_RADIUS' },
        'Orbit Spacing Size': { key: 'SHIP_BASE_SIZE' },
        'Ring Spacing': { key: 'ORBIT_RING_MULT' },
        'Ship Spacing': { key: 'ORBIT_DENSITY' },
        'Max Ships/Star': { key: 'MAX_VISUAL_SHIPS' },
        'Star Radius': { key: 'STAR_RENDER_RADIUS' },
        'Shape Mode': { key: 'STAR_SHAPE_MODE' },
        'Icon Scale': { key: 'STAR_ICON_SCALE' },
        'Corner Radius': { key: 'STAR_CORNER_RADIUS' },
        'Ring Radius': { key: 'STAR_RING_RADIUS' },
        'Ring Width': { key: 'STAR_RING_WIDTH' },
        'Ring Alpha': { key: 'STAR_RING_ALPHA' },
        'Ring Saturation': { key: 'STAR_RING_SATURATION' },
        'Ring Lightness': { key: 'STAR_RING_LIGHTNESS' },
        'Tag Color': { key: 'STAR_LABEL_COLOR_MODE' },
        'Arrowhead Size': { key: 'ARROW_HEAD_SIZE' },
        'Arrowhead Style': { key: 'ARROW_HEAD_STYLE' },
        'Arrowhead Spread': { key: 'ARROW_HEAD_SPREAD_DEG' },
        'Arrowhead Notch': { key: 'ARROW_HEAD_NOTCH' },
        'Shaft Width': { key: 'ARROW_SHAFT_WIDTH' },
        'Arrow Opacity': { key: 'ARROW_ALPHA' },
        'Gradient Steps': { key: 'ARROW_SHAFT_STEPS' },
        'Flow Speed': { key: 'ARROW_FLOW_SPEED' },
        'Dash Length': { key: 'ARROW_DASH_LENGTH' },
        'Dash Gap': { key: 'ARROW_DASH_GAP' },
        'Head Opacity': { key: 'ARROW_HEAD_ALPHA' },
        'Head VFX': { key: 'ARROW_HEAD_VFX_ALPHA' },
        'Outline Width': { key: 'ARROW_OUTLINE_WIDTH' },
        'Outline Opacity': { key: 'ARROW_OUTLINE_ALPHA' },
        'Outline Tone': { key: 'ARROW_OUTLINE_COLOR' },
        'Force Reactivity': { key: 'ARROW_FORCE_INTENSITY' },
        'Force Ceiling': { key: 'ARROW_FORCE_INTENSITY_MAX_SHIPS' },
        'Damaged Scale': { key: 'DAMAGED_SHIP_SCALE' },
        'Hit Zone Radius': { key: 'STAR_HIT_RADIUS' },
        'Alternate Darkening': { key: 'DENSITY_DARKEN_ALT' },
        'Glow Enabled': { key: 'STAR_GLOW_ON' },
        'Active Ships': { key: 'STAR_LABEL_SHOW_ACTIVE' },
    },
    surge: {
        'Force-Reactive Surge': { key: 'ATTACK_SURGE_PROPORTIONAL' },
        'Surge Displacement': { key: 'ATTACK_SURGE_MULT' },
        'Force Cofactor': { key: 'ATTACK_SURGE_FORCE_COFACTOR' },
        'Surge Ramp': { key: 'ATTACK_SURGE_RAMP_MS' },
        'Surge Shape': { key: 'ATTACK_SURGE_SHAPE' },
        'Pulse Duration': { key: 'SURGE_PULSE_DURATION_MS' },
        'Merge Ships Into Orb': { key: 'ORB_TRAVEL' },
        'Base Radius': { key: 'ORB_BASE_RADIUS' },
        'Radius Scale': { key: 'ORB_RADIUS_SCALE' },
        'Glow Multiplier': { key: 'ORB_GLOW_MULT' },
        'Outer Alpha': { key: 'ORB_OUTER_ALPHA' },
        'Outer Scale': { key: 'ORB_OUTER_SCALE' },
        'Mid Alpha': { key: 'ORB_MID_ALPHA' },
        'Mid Scale': { key: 'ORB_MID_SCALE' },
        'Core Alpha': { key: 'ORB_CORE_ALPHA' },
        'Core Scale': { key: 'ORB_CORE_SCALE' },
        'Center Alpha': { key: 'ORB_CENTER_ALPHA' },
    },
    territory: {
        // The marquee territory setting was absent from the index entirely, so
        // searching "render mode" found nothing — while settingsSearch carried a
        // whole isTerritoryRenderModeRecord() classifier waiting for a key that
        // was never emitted. (The selector itself lives in Territory → Mode.)
        'Render mode': {
            key: 'TERRITORY_RENDER_MODE',
            description:
                'The active renderer family for territory fills and borders. Each family exposes its own tuning below.',
        },
        'Extent Beyond Map': {
            key: 'CHAIKIN_BOUNDARY_PAD',
            description:
                'How far territory fill and world-edge border extend past the map rectangle (they share one boundary, so they extend together). 0 = stop at the map edge.',
        },
        // 'Geometry Source' selector RETIRED (2026-07-08): unified on PowerCore.
        'Minimum Star Margin': { key: 'MODIFIED_VORONOI_STAR_MARGIN' },
  'Star Bias': { key: 'TERRITORY_MSR_STAR_BIAS' },
        'Corridor Virtual Sites (CX)': { key: 'MODIFIED_VORONOI_CORRIDOR_ENABLED' },
        'Lane Midpoint Pairs': {
            key: 'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
        },
        'Lane Midpoint Pair Count': {
            key: 'TERRITORY_CX_CONTEST_PAIR_COUNT',
        },
        'Lane Midpoint Pair Weight': {
            key: 'TERRITORY_CX_CONTEST_PAIR_WEIGHT',
        },
        'Lane Midpoint Pair Spacing': {
            key: 'TERRITORY_CX_CONTEST_PAIR_SPACING',
        },
        'Corridor Sample Count': { key: 'TERRITORY_CX_COUNT' },
        'Corridor Weight': { key: 'TERRITORY_CX_WEIGHT' },
        'Corridor Spacing': { key: 'MODIFIED_VORONOI_CORRIDOR_SPACING' },
        'Disconnect Gaps (DX)': {
            key: 'MODIFIED_VORONOI_DISCONNECT_ENABLED',
        },
        'Disconnect Weight': { key: 'TERRITORY_DX_WEIGHT' },
        'Disconnect Distance': { key: 'MODIFIED_VORONOI_DISCONNECT_DISTANCE' },
        'Transition Duration': { key: 'TERRITORY_TRANSITION_MS' },
        'Show Underlying Geometry': {
            key: 'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY',
        },
        'Cell Grid Enabled': { key: 'CELL_GRID_ENABLED' },
        'Cell Spacing': { key: 'CELL_GRID_SPACING_PX' },
        'Base Resolution': {
            key: 'CELL_GRID_SPACING_PX',
            description:
                'Authoritative phase-field lattice spacing for ownership classification, conquest timing density, transition-cell size, and grid-derived border/frontier detail.',
        },
        'Transition Spacing': {
            key: 'CELL_GRID_SPACING_PX',
            description:
                'Authoritative phase-field lattice spacing for ownership classification, conquest timing density, transition-cell size, and grid-derived border/frontier detail.',
        },
        'Pattern Spacing': {
            key: 'CELL_GRID_PATTERN_SPACING_PX',
            description:
                'Visible interior fill-pattern spacing for settled and masked PRE/NEXT fills; changes pattern density but not conquest timing density or active frontier cell size.',
        },
        'Grid Density': {
            key: 'CELL_GRID_SPACING_PX',
            description:
                'Density alias for transition spacing. Higher density means more cells, sharper ownership edges, and heavier CPU.',
        },
        'Origin Mode': { key: 'CELL_GRID_ORIGIN_MODE' },
        Distribution: { key: 'CELL_GRID_DISTRIBUTION' },
        'Position Jitter': { key: 'CELL_GRID_POSITION_JITTER' },
        'Max Cells': { key: 'CELL_GRID_MAX_CELLS' },
        'Inward Offset': { key: 'CELL_GRID_INWARD_OFFSET_PX' },
        'Cell Shape': { key: 'CELL_GRID_CELL_SHAPE' },
        'Cell Inset': { key: 'CELL_GRID_CELL_INSET_PX' },
        'Square Corner': { key: 'CELL_GRID_CELL_CORNER_PX' },
        'Border Mode': { key: 'CELL_GRID_BORDER_MODE' },
        'Centered-blended borders': { key: 'CELL_GRID_BORDER_BLEND' },
        'Shared Edge Smoothing': {
            key: 'CELL_GRID_EDGE_SMOOTHING_PASSES',
        },
        'Shared Edge Trim': {
            key: 'CELL_GRID_EDGE_TRIM_PX',
        },
        'Border Chaikin Passes': {
            key: 'CELL_GRID_BORDER_CHAIKIN_PASSES',
        },
        Adjacency: { key: 'CELL_GRID_ADJACENCY' },
        'Wave Geometry': { key: 'CELL_GRID_WAVE_GEOMETRY' },
        'Wave Seeding': { key: 'CELL_GRID_WAVE_SEEDING' },
        'Flip Transition': { key: 'CELL_GRID_FLIP_TRANSITION' },
        'Flip Window': { key: 'CELL_GRID_FLIP_WINDOW' },
        'Wave Easing': { key: 'CELL_GRID_WAVE_EASE' },
        'FlipTime Jitter': { key: 'CELL_GRID_FLIP_WINDOW_JITTER' },
        'Frontier Highlight': {
            key: 'CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
        },
        'Finish Fade Start': {
            key: 'CELL_GRID_PHASE_FIELD_FINISH_FADE_START',
        },
        'Finish Fade End': {
            key: 'CELL_GRID_PHASE_FIELD_FINISH_FADE_END',
        },
        'Size Collapse Start': {
            key: 'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START',
        },
        'Size Collapse End': {
            key: 'CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END',
        },
        'Final Cell Size': {
            key: 'CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX',
        },
        'Frontier Fade Start': {
            key: 'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START',
        },
        'Frontier Fade End': {
            key: 'CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
        },
        'Grid Gradient Enabled': { key: 'GRID_GRADIENT_ENABLED' },
        'Grid Spacing': { key: 'GRID_GRADIENT_SPACING_PX' },
        // Collision: CELL_GRID_MAX_CELLS also renders as "Max Cells". The flat
        // label→key map can't hold two identical keys; disambiguated until the
        // registry (section/subsection-scoped) carries both.
        'Max Cells (Grid Gradient)': { key: 'GRID_GRADIENT_MAX_CELLS' },
        'Shape': { key: 'GRID_GRADIENT_CELL_SHAPE' },
        'Center Size': { key: 'GRID_GRADIENT_CENTER_SIZE_PX' },
        'Edge Size': { key: 'GRID_GRADIENT_EDGE_SIZE_PX' },
        'Gradient Curve': { key: 'GRID_GRADIENT_CURVE_POWER' },
        'Hue Shift': { key: 'GRID_GRADIENT_FILL_HUE_SHIFT_DEG' },
        'Border Offset': { key: 'GRID_GRADIENT_BORDER_OFFSET_PX' },
        'Vector borders': {
            key: 'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
        },
        'Border dots': { key: 'GRID_GRADIENT_BORDER_DOTS_ENABLED' },
        'Fill Style': { key: 'GRID_GRADIENT_FILL_STYLE' },
        'Dot Size': { key: 'GRID_GRADIENT_BORDER_DOT_SIZE_PX' },
        'Dot Style': { key: 'GRID_GRADIENT_BORDER_DOT_STYLE' },
        'Shader Neighbor Mode': { key: 'GRID_GRADIENT_SHADER_NEIGHBOR_MODE' },
        'Shader Mark Softness': { key: 'GRID_GRADIENT_SHADER_MARK_SOFTNESS' },
        'Edge Feather': { key: 'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX' },
        'Shader Noise Roughness (Noise)': { key: 'GRID_GRADIENT_SHADER_NOISE_STRENGTH' },
        'Shader Pulse': { key: 'GRID_GRADIENT_SHADER_PULSE_STRENGTH' },
        'Shader Pulse Speed': { key: 'GRID_GRADIENT_SHADER_PULSE_SPEED' },
        'Shader Drift': { key: 'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX' },
        'Shader Drift Speed': { key: 'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED' },
        'Shader Glow': { key: 'GRID_GRADIENT_SHADER_GLOW_STRENGTH' },
        'Shader Interior Alpha': { key: 'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST' },
        'Shader Edge Alpha': { key: 'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST' },
        'Frontier Technique': { key: 'TERRITORY_FRONTIER_TECHNIQUE' },
        'Frontier Border Geometry': {
            key: 'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE',
        },
        'Phase Sampling': { key: 'TERRITORY_FRONTIER_PHASE_SAMPLING' },
        'Frontier Chaikin': {
            key: 'TERRITORY_FRONTIER_CHAIKIN_PASSES',
        },
        'Blur Passes': { key: 'TERRITORY_FRONTIER_BLUR_PASSES' },
        'Triangle Diagonal': {
            key: 'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
        },
        'Shader Softness': { key: 'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX' },
        'Band Width': { key: 'TERRITORY_FRONTIER_BAND_WIDTH_PX' },
        'Outer perimeter border': {
            key: 'TERRITORY_FRONTIER_OUTER_BORDER_ENABLED',
        },
        'Junction Render': {
            key: 'TERRITORY_FRONTIER_JUNCTION_RENDER_MODE',
        },
        'Junction Gap Trim': { key: 'CELL_GRID_EDGE_TRIM_PX' },
        'Junction Bubble Radius': {
            key: 'TERRITORY_FRONTIER_JUNCTION_RADIUS_PX',
        },
        'Frontier FX Mode': { key: 'TERRITORY_FRONTIER_FX_MODE' },
        'Width': { key: 'TERRITORY_FRONTIER_FX_WIDTH_PX' },
        'Strength': { key: 'TERRITORY_FRONTIER_FX_STRENGTH' },
        'Softness': { key: 'TERRITORY_FRONTIER_FX_SOFTNESS' },
        'Steps': { key: 'TERRITORY_FRONTIER_FX_STEPS' },
        'Glow / Emissive': {
            key: 'TERRITORY_FRONTIER_FX_EMISSIVE',
        },
        'Particle Density': {
            key: 'TERRITORY_FRONTIER_FX_PARTICLE_DENSITY',
        },
        'Pulse Speed': {
            key: 'TERRITORY_FRONTIER_FX_PULSE_SPEED',
        },
        'Apply in steady state': {
            key: 'TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE',
        },
        'Apply during transition': {
            key: 'TERRITORY_FRONTIER_FX_APPLY_TRANSITION',
        },
        'Use dedicated lane margin': { key: 'MAPGEN_LANE_MARGIN_ENABLED' },
        'Lane margin (mapgen)': { key: 'MAPGEN_LANE_MARGIN_PX' },
        'Fill Path': { key: 'TERRITORY_FILL_TRANSITION_MODE' },
        'Border Path': { key: 'TERRITORY_BORDER_TRANSITION' },
        'Fill Alpha': { key: 'VORONOI_ALPHA' },
        'Border Width': { key: 'VORONOI_BORDER_WIDTH' },
        'Border Alpha': { key: 'VORONOI_BORDER_ALPHA' },
        'Border Rounding (Chaikin passes)': { key: 'VORONOI_BORDER_SMOOTH' },
        'Blended Opponent Borders': { key: 'TERRITORY_SURFACE_BORDER_BLEND' },
        'Front Shape': { key: 'TERRITORY_CONQUEST_FRONT_MODE' },
        'Motion Completion (% of window)': { key: 'TERRITORY_MORPH_COMPLETE_PCT' },
    },
    timing: {
        'Tick Interval': {
            key: 'BASE_TICK_MS',
            description: 'Authoritative tick duration used by the engine loop.',
        },
        'Bind Animation Speed To Tick': { key: 'BIND_ANIMATION_TO_TICK' },
        'Animation Speed': { key: 'ANIMATION_SPEED_MS' },
        'Bind Territory Transition To Tick': {
            key: 'TERRITORY_TRANSITION_BIND_TO_TICK',
        },
    },
    travel: {
        'Travel Mode': { key: 'TRAVEL_MODE' },
        'Travel Easing': { key: 'TRAVEL_EASING' },
        'Easing Power': { key: 'TRAVEL_EASING_POWER' },
        'Travel Duration': { key: 'TRAVEL_DURATION_MULT' },
        'Ships follow lane paths': { key: 'TRAVEL_FOLLOW_LANE_PATHS' },
        'Arc Intensity': { key: 'TRAVEL_ARC_INTENSITY' },
        'Depart Mode': { key: 'DEPART_MODE' },
        'Stream Departure': { key: 'DEPART_STAGGER' },
        'Depart Fraction': { key: 'DEPART_FRACTION' },
        'Depart Arc': { key: 'DEPART_ARC_INTENSITY' },
        'Depart Jitter': { key: 'DEPART_JITTER_MS' },
        'Settle Duration': { key: 'SETTLE_DURATION_MS' },
        'Arrival Spread': { key: 'ARRIVAL_SPREAD' },
        'Arrival Arc': { key: 'ARRIVAL_ARC_INTENSITY' },
        'Wobble Amplitude': { key: 'WOBBLE_AMP' },
        'Lane Offset': { key: 'LANE_OFFSET_PX' },
        'Bias Strength': { key: 'ORBIT_BIAS_STRENGTH' },
        'Oscillate Bias': { key: 'ORBIT_BIAS_OSCILLATE' },
        'Bias Min': { key: 'ORBIT_BIAS_MIN' },
        'Bias Max': { key: 'ORBIT_BIAS_MAX' },
        'Oscillation Frequency': { key: 'ORBIT_BIAS_FREQ' },
    },
    visuals: {
        'Background Asset': {
            key: 'BG_IMAGE_URL',
            description:
                'Background image asset path shown behind the battlefield.',
        },
        'BG Opacity': { key: 'BG_IMAGE_ALPHA' },
        'Show Hex Grid': { key: 'SHOW_HEX_GRID' },
        'Star Inspector': {
            key: 'local.ui.starInspectorVisible',
            description:
                'Local-only toggle owned by the uiPreferences store (pax-ui-prefs-v1).',
        },
        'Rotate Map (Transpose)': {
            key: 'local.mapTranspose.active',
            description:
                'Local-only transpose flag that swaps display axes without mutating star data.',
        },
        'Use dedicated lane margin': {
            key: 'MAPGEN_LANE_MARGIN_ENABLED',
        },
        'Lane margin (mapgen)': { key: 'MAPGEN_LANE_MARGIN_PX' },
        'Reshape bias': { key: 'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS' },
        'Lane path': { key: 'MAPGEN_LANE_MODE' },
        'Label Anim Mode': { key: 'LABEL_ANIM_MODE' },
        'Label Transition': { key: 'NUMBER_TRANSITION_MS' },
        'Arrow Length': { key: 'ARROW_LENGTH' },
        'Arrows follow lane paths': { key: 'ORDER_ARROWS_FOLLOW_LANE_PATHS' },
        'Arrow Path Padding': { key: 'ARROW_PATH_PADDING' },
        'Static Orbits': { key: 'STATIC_ORBITS' },
        'Selection Hex': { key: 'SHOW_SELECTION_HEX' },
        'Lane Width': { key: 'CONNECTION_WIDTH' },
        'Lane Opacity': { key: 'CONNECTION_ALPHA' },
        'Shadow Width': { key: 'CONNECTION_SHADOW_WIDTH' },
        'Shadow Opacity': { key: 'CONNECTION_SHADOW_ALPHA' },
    },
};

function findExistingDescription(target: HTMLElement): string | undefined {
    const explicit =
        target.dataset.settingDescription
        || target.getAttribute('title')
        || target.getAttribute('aria-label')
        || undefined;
    if (explicit) return explicit.trim();

    const row = target.closest('.var-row, .setting-row, .offset-row, .capture-strip');
    const detail = row?.querySelector<HTMLElement>(
        '.var-desc, .future-desc, .capture-desc, .row-bottom',
    );
    return detail?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
}

function buildFallbackDescription(label: string, meta: SettingMeta): string {
    if (meta.description) return meta.description;
    if (meta.key.startsWith('local.logFlags.')) {
        return `Local-only log channel toggle for ${label}.`;
    }
    if (meta.key.startsWith('local.')) {
        return `Local-only control for ${label}.`;
    }
    return `Controls ${label}.`;
}

function resolvePanelKey(configKey: string, explicitPanelKey?: string): string {
    if (explicitPanelKey) return explicitPanelKey;
    if (configKey.startsWith('local.')) return configKey;
    return CONFIG_TO_PANEL_KEY[configKey] ?? derivePanelKey(configKey);
}

function enhanceTarget(target: HTMLElement, scope: SettingScope): void {
    const normalizedLabel = normalizeLabel(
        target.dataset.settingLabel || target.textContent || '',
    );
    if (!normalizedLabel) return;

    const explicitKey = target.dataset.settingConfigKey;
    const scopedMeta = explicitKey
        ? {
              key: explicitKey,
              panelKey: target.dataset.settingPanelKey,
              description: target.dataset.settingDescription,
          }
        : SCOPE_LABEL_META[scope]?.[normalizedLabel];

    if (!scopedMeta) return;

    const description =
        target.dataset.settingDescription
        || findExistingDescription(target)
        || buildFallbackDescription(normalizedLabel, scopedMeta);
    target.title = description;
}

export function enhanceSettingMetadata(
    node: HTMLElement,
    options: { scope: SettingScope | null },
): { update: (next: { scope: SettingScope | null }) => void; destroy: () => void } {
    let scope = options.scope;

    const run = () => {
        const activeScope = scope;
        if (!activeScope) return;
        const targets = new Set<HTMLElement>();
        node.querySelectorAll<HTMLElement>(
            '.var-name, .toggle-label, .offset-label, .capture-label, .slider-label, .log-label, [data-setting-config-key]',
        ).forEach((element) => targets.add(element));
        targets.forEach((element) => enhanceTarget(element, activeScope));
    };

    const observer = new MutationObserver(() => run());
    run();
    observer.observe(node, { childList: true, subtree: true });

    return {
        update(next) {
            scope = next.scope;
            run();
        },
        destroy() {
            observer.disconnect();
        },
    };
}

export function getSearchableSettingRecords(): SearchableSettingRecord[] {
    const records: SearchableSettingRecord[] = [];

    for (const [scope, labelMap] of Object.entries(SCOPE_LABEL_META) as Array<
        [SettingScope, SettingMetaMap | undefined]
    >) {
        if (!labelMap) continue;
        for (const [label, meta] of Object.entries(labelMap)) {
            records.push({
                scope,
                label,
                key: meta.key,
                panelKey: resolvePanelKey(meta.key, meta.panelKey),
                description: meta.description || buildFallbackDescription(label, meta),
            });
        }
    }

    return records;
}
