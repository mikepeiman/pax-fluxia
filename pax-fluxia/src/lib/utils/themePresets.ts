// ============================================================================
// Theme Presets — Save/load named snapshots of GAME_CONFIG visual settings
// F-73
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

/** Keys that constitute a "theme" — all visual/animation keys, no gameplay */
const THEME_KEYS: string[] = [
    // Visual basics
    'SHIP_BASE_SIZE', 'STAR_RENDER_RADIUS', 'SHOW_SELECTION_HEX', 'ORBIT_RING_MULT',
    'TRANSFER_ANIMATION_MS', 'STATIC_ORBITS',
    // Animation tuning
    'ORBIT_BIAS_STRENGTH', 'DEPART_FRACTION', 'DEPART_JITTER_MS', 'LANE_OFFSET_PX',
    'DEPART_MODE', 'SETTLE_DURATION_MS', 'ARRIVAL_SPREAD', 'WOBBLE_AMP',
    'DEPART_STAGGER', 'DEPART_ARC_INTENSITY', 'ARRIVAL_ARC_INTENSITY',
    // Travel
    'TRAVEL_MODE', 'TRAVEL_EASING', 'TRAVEL_EASING_POWER', 'TRAVEL_DURATION_MULT',
    'TRAVEL_ARC_INTENSITY', 'LANE_CONVERGENCE', 'LANE_CONVERGENCE_POINT',
    // Orbit & density
    'ORBIT_DENSITY', 'ORBIT_BIAS_OSCILLATE', 'ORBIT_BIAS_MIN', 'ORBIT_BIAS_MAX', 'ORBIT_BIAS_FREQ',
    // Attack surge
    'ATTACK_SURGE_MULT', 'ATTACK_SURGE_PROPORTIONAL', 'ATTACK_SURGE_FORCE_COFACTOR',
    'ATTACK_SURGE_RAMP_MS', 'ATTACK_SURGE_SHAPE', 'SURGE_PULSE_DURATION_MS',
    // Conquest animation
    'CONQUEST_ANIMATION_MODE', 'CONQUEST_SETTLE_MS', 'CONQUEST_SURGE_RADIUS',
    'CONQUEST_SURGE_STAGGER_MS', 'CONQUEST_TRAVEL_SPEED', 'CONQUEST_LERP_DELAY_MS',
    'CONQUEST_COLOR_DELAY_MS', 'CONQUEST_FLASH_DURATION_MS',
    'CONQUEST_SLOWMO_ENABLED', 'CONQUEST_SLOWMO_FACTOR', 'CONQUEST_SLOWMO_DURATION_MS',
    'CONQUEST_FORCE_GLOW', 'CONQUEST_FORCE_GLOW_MULT',
    // Arrow
    'ARROW_TAPER', 'ARROW_WIDTH', 'ARROW_SPEED', 'ARROW_EASING',
    'ARROW_ENGULF_MODE', 'ARROW_ENGULF_RADIUS',
    'ARROW_SPIRAL_MIN_DEG', 'ARROW_SPIRAL_MAX_DEG', 'ARROW_SPIRAL_RANDOM',
    'ARROW_SPIRAL_DURATION_MS', 'ARROW_STAGGER_MS', 'ARROW_LENGTH_FRACTION',
    // Ship appearance
    'SHIP_OUTLINE_ON', 'SHIP_OUTLINE_PX', 'SHIP_GLOW_INTENSITY', 'SHIP_SCALE_MULT',
    'MAX_VISUAL_SHIPS', 'SHIP_VISUAL_RADIUS',
    // Density VFX
    'DENSITY_HUE_STEP', 'DENSITY_SAT_STEP', 'DENSITY_LIGHT_STEP', 'DENSITY_TIERS', 'DENSITY_DARKEN_ALT',
    // Star glow
    'STAR_GLOW_ON', 'STAR_GLOW_RADIUS_MULT', 'STAR_GLOW_INTENSITY', 'STAR_GLOW_LAYERS',
    // Orb travel
    'ORB_TRAVEL', 'ORB_DRAW_MODE', 'ORB_BASE_RADIUS', 'ORB_RADIUS_SCALE',
    'ORB_GLOW_MULT', 'ORB_OUTER_ALPHA', 'ORB_MID_ALPHA', 'ORB_CORE_ALPHA',
    'ORB_CENTER_ALPHA', 'ORB_OUTER_SCALE', 'ORB_MID_SCALE', 'ORB_CORE_SCALE',
    // Connections
    'CONNECTION_WIDTH', 'CONNECTION_ALPHA', 'CONNECTION_SHADOW_WIDTH', 'CONNECTION_SHADOW_ALPHA',
    'SHOW_CONNECTIONS',
];

export interface ThemePreset {
    name: string;
    createdAt: string;
    values: Record<string, unknown>;
    builtIn?: boolean;
}

const STORAGE_KEY = 'pax_themePresets';

// ── Persistence ──────────────────────────────────────────────────────────────

function loadUserPresets(): ThemePreset[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistUserPresets(presets: ThemePreset[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// ── Snapshot / Apply ─────────────────────────────────────────────────────────

function snapshotTheme(): Record<string, unknown> {
    const snap: Record<string, unknown> = {};
    for (const key of THEME_KEYS) {
        snap[key] = (GAME_CONFIG as any)[key];
    }
    return snap;
}

function applyTheme(values: Record<string, unknown>): void {
    for (const [key, val] of Object.entries(values)) {
        if (THEME_KEYS.includes(key)) {
            (GAME_CONFIG as any)[key] = val;
        }
    }
}

// ── Built-in Presets ─────────────────────────────────────────────────────────

const BUILTIN_PRESETS: ThemePreset[] = [
    {
        name: 'Default',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 3, STAR_RENDER_RADIUS: 25, ORBIT_RING_MULT: 1.6,
            SHIP_SCALE_MULT: 0.6, SHIP_GLOW_INTENSITY: 1, SHIP_OUTLINE_ON: true, SHIP_OUTLINE_PX: 0.4,
            STAR_GLOW_ON: true, STAR_GLOW_INTENSITY: 0.25, STAR_GLOW_LAYERS: 4,
            ORB_TRAVEL: false, TRAVEL_MODE: 'bezier', TRAVEL_ARC_INTENSITY: 0.5,
            CONNECTION_WIDTH: 3.5, CONNECTION_ALPHA: 0.3, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 8, DENSITY_TIERS: 3,
            CONQUEST_ANIMATION_MODE: 'travel', CONQUEST_FLASH_DURATION_MS: 600,
        },
    },
    {
        name: 'Neon Blitz',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 4, STAR_RENDER_RADIUS: 22, ORBIT_RING_MULT: 1.4,
            SHIP_SCALE_MULT: 0.8, SHIP_GLOW_INTENSITY: 1, SHIP_OUTLINE_ON: true, SHIP_OUTLINE_PX: 0.8,
            STAR_GLOW_ON: true, STAR_GLOW_INTENSITY: 0.5, STAR_GLOW_LAYERS: 6,
            ORB_TRAVEL: true, ORB_GLOW_MULT: 1.8, ORB_OUTER_ALPHA: 0.2, ORB_MID_ALPHA: 0.5,
            TRAVEL_MODE: 'bezier', TRAVEL_ARC_INTENSITY: 0.8,
            CONNECTION_WIDTH: 2, CONNECTION_ALPHA: 0.15, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 12, DENSITY_TIERS: 4,
            CONQUEST_ANIMATION_MODE: 'arrowhead', CONQUEST_FLASH_DURATION_MS: 900,
            CONQUEST_SLOWMO_ENABLED: true, CONQUEST_SLOWMO_FACTOR: 3,
            ATTACK_SURGE_MULT: 0.9, ATTACK_SURGE_PROPORTIONAL: true,
        },
    },
    {
        name: 'Minimal',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 2, STAR_RENDER_RADIUS: 18, ORBIT_RING_MULT: 1.3,
            SHIP_SCALE_MULT: 0.5, SHIP_GLOW_INTENSITY: 0, SHIP_OUTLINE_ON: false, SHIP_OUTLINE_PX: 0,
            STAR_GLOW_ON: false, STAR_GLOW_INTENSITY: 0, STAR_GLOW_LAYERS: 0,
            ORB_TRAVEL: false, TRAVEL_MODE: 'lane', TRAVEL_ARC_INTENSITY: 0,
            CONNECTION_WIDTH: 1.5, CONNECTION_ALPHA: 0.12, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 0, DENSITY_TIERS: 0,
            CONQUEST_ANIMATION_MODE: 'immediate', CONQUEST_FLASH_DURATION_MS: 0,
            CONQUEST_SLOWMO_ENABLED: false,
            ATTACK_SURGE_MULT: 0, ATTACK_SURGE_PROPORTIONAL: false,
        },
    },
];

// ── Public API ───────────────────────────────────────────────────────────────

let _userPresets: ThemePreset[] | null = null;
function getUserPresets(): ThemePreset[] {
    if (_userPresets === null) _userPresets = loadUserPresets();
    return _userPresets;
}

export function listThemePresets(): ThemePreset[] {
    return [...BUILTIN_PRESETS, ...getUserPresets()];
}

export function saveThemePreset(name: string): void {
    const preset: ThemePreset = {
        name,
        createdAt: new Date().toISOString(),
        values: snapshotTheme(),
    };
    const presets = getUserPresets().filter(p => p.name !== name);
    presets.unshift(preset);
    _userPresets = presets;
    persistUserPresets(presets);
}

export function loadThemePreset(name: string): void {
    const all = listThemePresets();
    const preset = all.find(p => p.name === name);
    if (preset) applyTheme(preset.values);
}

export function deleteThemePreset(name: string): void {
    _userPresets = getUserPresets().filter(p => p.name !== name);
    persistUserPresets(_userPresets);
}
