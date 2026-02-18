// ============================================================================
// Theme System — Named presets for animation/mechanics settings
// ============================================================================
// A "theme" is a subset of GAME_CONFIG that covers animation style, timing,
// ship densities, combat feel — NOT map generation, star count, connections.
// ============================================================================

import { GAME_CONFIG } from './game.config';

// ── Theme Key Categories ────────────────────────────────────────────────────

/** Keys that belong to a "theme" — animation, timing, combat feel, densities */
export const THEME_KEYS = [
    // Timing
    'BASE_TICK_MS',
    'MIN_TICK_MS',
    'ANIMATION_SPEED_MS',

    // Transfer mechanics
    'TRANSFER_RATE',
    'MIN_SHIPS_PER_TRANSFER',
    'MAX_SHIPS_PER_TRANSFER',

    // Combat
    'AGGRESSOR_ADVANTAGE',
    'DAMAGE_PER_SHIP',
    'LETHALITY',
    'FORCE_RATIO_EFFECT',
    'CONQUEST_THRESHOLD',
    'DAMAGED_SHIP_EFFECTIVENESS',

    // Production & Repair
    'BASE_PRODUCTION',
    'REPAIR_RATE',
    'MIN_REPAIR',
    'REPAIR_COMBAT_PENALTY',

    // Conquest mechanics
    'CONQUEST_TRANSFER_PERCENTAGE',
    'CONQUEST_DAMAGED_CAPTURE_RATE',
    'CONQUEST_DAMAGED_DESTROY_RATE',
    'OVERWHELM_THRESHOLD',
    'ORDERS_PERSIST_AFTER_CONQUEST',
    'RETAIN_ORDER_ON_CONQUEST',
    'ALLOW_OPPOSING_ORDERS',
    'RETREAT_CAPTURE_RATE',
    'SCATTER_CAPTURE_RATE',
    'SCATTER_DESTROY_RATE',
    'RETREAT_DAMAGED_ACTIVATION_RATE',

    // Starting conditions
    'STARTING_SHIPS',

    'SHIP_BASE_SIZE',
    'STAR_RENDER_RADIUS',
    'ORBIT_RING_MULT',
    'TRANSFER_ANIMATION_MS',
    'STATIC_ORBITS',
    'ORBIT_DENSITY',
    'MAX_VISUAL_SHIPS',

    // Animation tuning
    'ORBIT_BIAS_STRENGTH',
    'DEPART_FRACTION',
    'DEPART_JITTER_MS',
    'LANE_OFFSET_PX',
    'DEPART_MODE',
    'SETTLE_DURATION_MS',
    'ARRIVAL_SPREAD',
    'WOBBLE_AMP',
    'TRAVEL_MODE',
    'TRAVEL_EASING',
    'TRAVEL_EASING_POWER',
    'TRAVEL_DURATION_MULT',
    'TRAVEL_ARC_INTENSITY',
    'LANE_CONVERGENCE',
    'LANE_CONVERGENCE_POINT',

    // Attack surge
    'ATTACK_SURGE_MULT',
    'ATTACK_SURGE_PROPORTIONAL',
    'ATTACK_SURGE_FORCE_COFACTOR',
    'ATTACK_SURGE_RAMP_MS',
    'ATTACK_SURGE_SHAPE',

    // Conquest animation
    'CONQUEST_ANIMATION_MODE',
    'CONQUEST_SETTLE_MS',
    'CONQUEST_SURGE_RADIUS',
    'CONQUEST_SURGE_STAGGER_MS',
    'CONQUEST_TRAVEL_SPEED',
    'CONQUEST_LERP_DELAY_MS',
    'CONQUEST_COLOR_DELAY_MS',
    'CONQUEST_FLASH_DURATION_MS',
    'CONQUEST_SLOWMO_ENABLED',
    'CONQUEST_SLOWMO_FACTOR',
    'CONQUEST_SLOWMO_DURATION_MS',

    // Ship appearance
    'SHIP_OUTLINE_ON',
    'SHIP_OUTLINE_PX',
    'SHIP_GLOW_INTENSITY',
    'SHIP_SCALE_MULT',
    'SHIP_VISUAL_RADIUS',

    // Density VFX
    'DENSITY_HUE_STEP',
    'DENSITY_SAT_STEP',
    'DENSITY_LIGHT_STEP',
    'DENSITY_TIERS',
    'DENSITY_DARKEN_ALT',

    // Star glow
    'STAR_GLOW_ON',
    'STAR_GLOW_RADIUS_MULT',
    'STAR_GLOW_INTENSITY',
    'STAR_GLOW_LAYERS',

    // Orbit bias oscillation
    'ORBIT_BIAS_OSCILLATE',
    'ORBIT_BIAS_MIN',
    'ORBIT_BIAS_MAX',
    'ORBIT_BIAS_FREQ',

    // Orb travel
    'ORB_TRAVEL',
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

    // Arrow
    'ARROW_LENGTH_FRACTION',
] as const;

/** Keys EXCLUDED from themes (map gen, connections, AI) */
export const NON_THEME_KEYS = [
    'HEX_RADIUS',
    'HEX_PADDING',
    'CONNECTION_MAX_DISTANCE',
    'CONNECTION_COLOR',
    'CONNECTION_WIDTH',
    'CONNECTION_ALPHA',
    'CONNECTION_SHADOW_WIDTH',
    'CONNECTION_SHADOW_ALPHA',
    'SHOW_CONNECTIONS',
    'SHOW_HEX_GRID',
    'STARS_PER_PLAYER',
    'MIN_LINKS_PER_STAR',
    'MAX_LINKS_PER_STAR',
    'AI_MUST_ATTACK_RATIO',
    'AI_ATTACK_UPPER_BOUNDS',
    'AI_ATTACK_STICKINESS',
    'AI_EVALUATION_FREQUENCY',
    'AI_TACTICAL_AGGRESSION',
    'AI_RANDOM_AGGRESSION',
] as const;

// ── Theme Type ──────────────────────────────────────────────────────────────

export type ThemeKey = typeof THEME_KEYS[number];
export type ThemeValues = Record<ThemeKey, number | string | boolean>;

export interface GameTheme {
    name: string;
    description: string;
    created: string;
    values: Partial<ThemeValues>;
}

// ── Theme Operations ────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = 'pax-game-themes';

/** Extract theme-eligible values from current GAME_CONFIG */
export function extractTheme(name: string, description: string): GameTheme {
    const values: Partial<ThemeValues> = {};
    for (const key of THEME_KEYS) {
        if (key in GAME_CONFIG) {
            values[key] = (GAME_CONFIG as any)[key];
        }
    }
    return {
        name,
        description,
        created: new Date().toISOString(),
        values,
    };
}

/** Apply a theme to GAME_CONFIG (only theme keys, non-theme left alone) */
export function applyTheme(theme: GameTheme): void {
    for (const [key, value] of Object.entries(theme.values)) {
        if (THEME_KEYS.includes(key as any) && key in GAME_CONFIG) {
            (GAME_CONFIG as any)[key] = value;
        }
    }
}

/** Save themes to localStorage */
export function saveThemes(themes: GameTheme[]): void {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
    } catch (e) {
        console.warn('Failed to save themes:', e);
    }
}

/** Load themes from localStorage */
export function loadThemes(): GameTheme[] {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to load themes:', e);
    }
    return [];
}

/** Delete a theme by name */
export function deleteTheme(name: string): void {
    const themes = loadThemes().filter(t => t.name !== name);
    saveThemes(themes);
}

/** Save a theme (add or replace by name) */
export function saveTheme(theme: GameTheme): void {
    const themes = loadThemes().filter(t => t.name !== theme.name);
    themes.push(theme);
    saveThemes(themes);
}

/** Export theme as JSON file download */
export function exportThemeJSON(theme: GameTheme): void {
    const data = JSON.stringify(theme, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `pax-theme-${theme.name}-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
