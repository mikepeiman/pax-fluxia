// ============================================================================
// Theme Presets â€” Save/load named snapshots of GAME_CONFIG settings
// F-73
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Keys to EXCLUDE from theme snapshots.
 * These are map-specific, internal, or identity-level keys that shouldn't
 * be part of a visual/animation theme.
 */
const DENYLIST: Set<string> = new Set([
    // Map generation internals
    '_MAP_HEX_RADIUS', '_MAP_PADDING_X', '_MAP_PADDING_Y',
    '_MAP_WIDTH', '_MAP_HEIGHT',
    // Game setup (not visual)
    'STARS_PER_PLAYER', 'MAX_LINKS_PER_STAR', 'BASE_TICK_MS', 'MIN_TICK_MS',
    // Map structure
    'SHOW_HEX_GRID',
    // Player count / AI setup
    'AI_MUST_ATTACK_RATIO', 'AI_ATTACK_UPPER_BOUNDS', 'AI_ATTACK_STICKINESS',
    'AI_EVALUATION_FREQUENCY', 'AI_TACTICAL_AGGRESSION', 'AI_RANDOM_AGGRESSION',
    // Gameplay balance (not visual)
    'BASE_PRODUCTION', 'REPAIR_RATE', 'MIN_REPAIR', 'REPAIR_COMBAT_PENALTY',
    'REPAIR_SUPPRESS_ATTACKER', 'REPAIR_SUPPRESS_DEFENDER',
    'AGGRESSOR_ADVANTAGE', 'DAMAGE_PER_SHIP', 'LETHALITY', 'FORCE_RATIO_EFFECT',
    'CONQUEST_THRESHOLD', 'CONQUEST_TRANSFER_PERCENTAGE',
    'OVERWHELM_THRESHOLD', 'RETREAT_CAPTURE_RATE', 'SCATTER_CAPTURE_RATE',
    'SCATTER_DESTROY_RATE', 'RETREAT_DAMAGED_ACTIVATION_RATE',
    'CONQUEST_DAMAGED_CAPTURE_RATE', 'CONQUEST_DAMAGED_DESTROY_RATE',
    'DAMAGED_SHIP_EFFECTIVENESS',
    'TRANSFER_RATE', 'MIN_SHIPS_PER_TRANSFER', 'MAX_SHIPS_PER_TRANSFER',
    'ALLOW_OPPOSING_ORDERS',
    // Multiplayer/server
    'ANIMATION_SPEED_MS',
]);

export interface ThemePreset {
    name: string;
    createdAt: string;
    values: Record<string, unknown>;
    builtIn?: boolean;
}

const STORAGE_KEY = 'pax_themePresets';

// â”€â”€ Persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function loadUserPresets(): ThemePreset[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistUserPresets(presets: ThemePreset[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// â”€â”€ Snapshot / Apply â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Snapshot ALL GAME_CONFIG keys except the denylist.
 * This ensures themes are always complete and never fall behind new config keys.
 */
function snapshotTheme(): Record<string, unknown> {
    const snap: Record<string, unknown> = {};
    for (const key of Object.keys(GAME_CONFIG)) {
        if (!DENYLIST.has(key)) {
            snap[key] = (GAME_CONFIG as any)[key];
        }
    }
    return snap;
}

/**
 * Apply theme values to GAME_CONFIG.
 * Only applies keys that are present in the theme snapshot AND exist in GAME_CONFIG.
 * Denylist keys are never applied even if present in old data.
 */
export function applyTheme(preset: ThemePreset): void {
    for (const [key, val] of Object.entries(preset.values)) {
        if (!DENYLIST.has(key) && key in GAME_CONFIG) {
            (GAME_CONFIG as any)[key] = val;
        }
    }
}

// â”€â”€ Built-in Presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BUILTIN_PRESETS: ThemePreset[] = [
    {
        name: 'Default',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 3, STAR_RENDER_RADIUS: 25, ORBIT_RING_MULT: 1.6,
            SHIP_SCALE_MULT: 0.6, SHIP_GLOW_INTENSITY: 1, SHIP_GLOW_RADIUS: 6,
            MIN_COLOR_LIGHTNESS: 0.35,
            SHIP_OUTLINE_ON: true, SHIP_OUTLINE_PX: 0.4,
            STAR_GLOW_ON: true, STAR_GLOW_INTENSITY: 0.25, STAR_GLOW_LAYERS: 4,
            ORB_TRAVEL: false, TRAVEL_MODE: 'bezier', TRAVEL_ARC_INTENSITY: 0.5,
            CONNECTION_WIDTH: 3.5, CONNECTION_ALPHA: 0.3, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 8, DENSITY_TIERS: 3,
            CONQUEST_ANIMATION_MODE: 'travel', CONQUEST_FLASH_TICKS: 3,
            SHOW_STAR_POWER: true, STAR_POWER_ALPHA: 0.08, STAR_POWER_RADIUS_MULT: 3.0,
        },
    },
    {
        name: 'Neon Blitz',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 4, STAR_RENDER_RADIUS: 22, ORBIT_RING_MULT: 1.4,
            SHIP_SCALE_MULT: 0.8, SHIP_GLOW_INTENSITY: 1, SHIP_GLOW_RADIUS: 10,
            MIN_COLOR_LIGHTNESS: 0.4,
            SHIP_OUTLINE_ON: true, SHIP_OUTLINE_PX: 0.8,
            STAR_GLOW_ON: true, STAR_GLOW_INTENSITY: 0.5, STAR_GLOW_LAYERS: 6,
            ORB_TRAVEL: true, ORB_GLOW_MULT: 1.8, ORB_OUTER_ALPHA: 0.2, ORB_MID_ALPHA: 0.5,
            TRAVEL_MODE: 'bezier', TRAVEL_ARC_INTENSITY: 0.8,
            CONNECTION_WIDTH: 2, CONNECTION_ALPHA: 0.15, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 12, DENSITY_TIERS: 4,
            CONQUEST_ANIMATION_MODE: 'arrowhead', CONQUEST_FLASH_TICKS: 4.5,
            CONQUEST_SLOWMO_ENABLED: true, CONQUEST_SLOWMO_FACTOR: 3,
            ATTACK_SURGE_MULT: 0.9, ATTACK_SURGE_PROPORTIONAL: true,
            SHOW_STAR_POWER: true, STAR_POWER_ALPHA: 0.12, STAR_POWER_RADIUS_MULT: 4.0,
        },
    },
    {
        name: 'Arrow Capture',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            CONQUEST_ANIMATION_MODE: 'arrowhead',
            ARROW_TAPER: 0.6, ARROW_WIDTH: 1.2, ARROW_SPEED: 2.0,
            ARROW_EASING: 'easeInOut',
            ARROW_ENGULF_MODE: 'collapse', ARROW_ENGULF_RADIUS: 0.8,
            ARROW_SPIRAL_MIN_DEG: 180, ARROW_SPIRAL_MAX_DEG: 720,
            ARROW_SPIRAL_RANDOM: true,
            ARROW_SPIRAL_DURATION_MS: 800, ARROW_STAGGER_MS: 30,
            ARROW_LENGTH: 0.8,
            CONQUEST_FLASH_TICKS: 4,
            CONQUEST_TRAVEL_SPEED: 3.0,
            CONQUEST_SLOWMO_ENABLED: true, CONQUEST_SLOWMO_FACTOR: 2,
        },
    },
    {
        name: 'Minimal',
        createdAt: '2026-01-01T00:00:00.000Z',
        builtIn: true,
        values: {
            SHIP_BASE_SIZE: 2, STAR_RENDER_RADIUS: 18, ORBIT_RING_MULT: 1.3,
            SHIP_SCALE_MULT: 0.5, SHIP_GLOW_INTENSITY: 0, SHIP_GLOW_RADIUS: 0,
            MIN_COLOR_LIGHTNESS: 0.3,
            SHIP_OUTLINE_ON: false, SHIP_OUTLINE_PX: 0,
            STAR_GLOW_ON: false, STAR_GLOW_INTENSITY: 0, STAR_GLOW_LAYERS: 0,
            ORB_TRAVEL: false, TRAVEL_MODE: 'lane', TRAVEL_ARC_INTENSITY: 0,
            CONNECTION_WIDTH: 1.5, CONNECTION_ALPHA: 0.12, SHOW_CONNECTIONS: true,
            DENSITY_HUE_STEP: 0, DENSITY_TIERS: 0,
            CONQUEST_ANIMATION_MODE: 'immediate', CONQUEST_FLASH_TICKS: 0,
            CONQUEST_SLOWMO_ENABLED: false,
            ATTACK_SURGE_MULT: 0, ATTACK_SURGE_PROPORTIONAL: false,
            SHOW_STAR_POWER: false, STAR_POWER_ALPHA: 0, STAR_POWER_RADIUS_MULT: 1.0,
        },
    },
];

// â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

/**
 * Load a theme preset by name â€” applies values to GAME_CONFIG.
 * Returns the preset if found (caller should call syncAllFromConfig).
 */
export function loadThemePreset(name: string): ThemePreset | null {
    const all = listThemePresets();
    const preset = all.find(p => p.name === name);
    if (preset) {
        applyTheme(preset);
        return preset;
    }
    return null;
}

export function deleteThemePreset(name: string): void {
    _userPresets = getUserPresets().filter(p => p.name !== name);
    persistUserPresets(_userPresets);
}
