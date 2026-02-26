// ============================================================================
// Category Themes — Per-category partial theme presets
// ============================================================================
//
// Each panel section has its own theme store. Users can save/load/apply
// presets per-category (e.g. "Territory: Deep Space", "Ships: Neon Fleet").
//
// CATEGORY_KEYS maps each category to the exact GAME_CONFIG keys it owns.
// A key belongs to exactly ONE category (no overlap).
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

// ── Category IDs ────────────────────────────────────────────────────────────

export type ThemeCategory =
    | 'timing'
    | 'combat'
    | 'economy'
    | 'travel'
    | 'surge'
    | 'conquest'
    | 'territory'
    | 'ships'
    | 'visuals'
    | 'ai'
    | 'rules'
    | 'logging';

// ── Category Metadata ───────────────────────────────────────────────────────

export interface CategoryMeta {
    id: ThemeCategory;
    icon: string;
    label: string;
    color: string;
}

export const CATEGORY_META: Record<ThemeCategory, CategoryMeta> = {
    timing: { id: 'timing', icon: '⚡', label: 'Timing', color: '#ffcc44' },
    combat: { id: 'combat', icon: '⚔️', label: 'Battle', color: '#ff4466' },
    economy: { id: 'economy', icon: '💰', label: 'Economy', color: '#44dd88' },
    travel: { id: 'travel', icon: '✈️', label: 'Travel', color: '#44aaff' },
    surge: { id: 'surge', icon: '💥', label: 'Surge & Orbs', color: '#ff6644' },
    conquest: { id: 'conquest', icon: '🏰', label: 'Conquest', color: '#ff66aa' },
    territory: { id: 'territory', icon: '🌍', label: 'Territory', color: '#66ccaa' },
    ships: { id: 'ships', icon: '🚀', label: 'Ships', color: '#44ccff' },
    visuals: { id: 'visuals', icon: '🗺️', label: 'Map & Grid', color: '#cc66ff' },
    ai: { id: 'ai', icon: '🤖', label: 'AI Behavior', color: '#ff8844' },
    rules: { id: 'rules', icon: '📜', label: 'Rules', color: '#aabb44' },
    logging: { id: 'logging', icon: '📋', label: 'Logging', color: '#88aacc' },
};

// ── Category → Config Keys Mapping ──────────────────────────────────────────

export const CATEGORY_KEYS: Record<ThemeCategory, string[]> = {
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
        'DAMAGE_PER_SHIP',
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
    ],

    surge: [
        'ATTACK_SURGE_MULT',
        'ATTACK_SURGE_PROPORTIONAL',
        'ATTACK_SURGE_FORCE_COFACTOR',
        'ATTACK_SURGE_RAMP_MS',
        'ATTACK_SURGE_SHAPE',
        'SURGE_PULSE_DURATION_MS',
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
        'CONQUEST_COLOR_DELAY_MS',
        'CONQUEST_FLASH_DURATION_MS',
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
        'ARROW_LENGTH_FRACTION',
    ],

    territory: [
        // Territory toggles
        'TERRITORY_VORONOI',
        'TERRITORY_METABALL',
        'TERRITORY_PIXEL',
        'PIXEL_ALPHA',
        'PIXEL_RESOLUTION',
        'PIXEL_EDGE_BLEND',
        'PIXEL_BLUR',
        'PIXEL_BLEND_POWER',
        'TERRITORY_MODE',
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
        'SHOW_VORONOI',
        'VORONOI_ALPHA',
        'VORONOI_RESOLUTION',
        'VORONOI_EDGE_BLEND',
        'VORONOI_BORDER_WIDTH',
        'VORONOI_BORDER_ALPHA',
        'VORONOI_BORDER_BRIGHTEN',
        'VORONOI_SATURATION',
        'VORONOI_LIGHTNESS',
        'VORONOI_GLOW_RADIUS',
        'VORONOI_GLOW_ALPHA',
        'VORONOI_GLOW_LAYERS',
        'VORONOI_BLUR',
        'VORONOI_SMOOTHING',
        'VORONOI_GRADIENT_BLEND',
        'VORONOI_BLEND_WIDTH',
        // Metaball
        'METABALL_INFLUENCE_RADIUS',
        'METABALL_FALLOFF',
        'METABALL_BLEND_SHARPNESS',
        'METABALL_ALPHA',
        'METABALL_CELL_SIZE',
        'METABALL_THRESHOLD',
        'METABALL_STRENGTH_MULT',
        'METABALL_EDGE_FADE',
        'METABALL_BLUR',
        'METABALL_BORDER_WIDTH',
        'METABALL_BORDER_ALPHA',
        'METABALL_COVERAGE',
    ],

    ships: [
        'SHIP_BASE_SIZE',
        'STAR_RENDER_RADIUS',
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
    ],

    visuals: [
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
        'ORDERS_PERSIST_AFTER_CONQUEST',
        'RETAIN_ORDER_ON_CONQUEST',
        'ALLOW_OPPOSING_ORDERS',
        'RETREAT_CAPTURE_RATE',
        'SCATTER_CAPTURE_RATE',
        'SCATTER_DESTROY_RATE',
        'RETREAT_DAMAGED_ACTIVATION_RATE',
        'STARTING_SHIPS',
    ],

    logging: [
        // Logging keys are UI-only, no GAME_CONFIG keys currently
        // This category exists for the panel but has no themeable keys
    ],
};

// ── Super-Categories (Tier 2) ───────────────────────────────────────────────
// Group related base categories into ~4 higher-order categories.
// Super-category themes apply all child categories at once.

export type ThemeSuperCategory = 'gameplay' | 'animation' | 'appearance' | 'intelligence';

export interface SuperCategoryMeta {
    id: ThemeSuperCategory;
    icon: string;
    label: string;
    color: string;
    children: ThemeCategory[];
}

export const SUPER_CATEGORIES: Record<ThemeSuperCategory, SuperCategoryMeta> = {
    gameplay: {
        id: 'gameplay',
        icon: '🎮',
        label: 'Gameplay',
        color: '#ffaa44',
        children: ['timing', 'combat', 'economy', 'rules'],
    },
    animation: {
        id: 'animation',
        icon: '🎬',
        label: 'Animation',
        color: '#44aaff',
        children: ['travel', 'surge', 'conquest'],
    },
    appearance: {
        id: 'appearance',
        icon: '✨',
        label: 'Appearance',
        color: '#cc66ff',
        children: ['ships', 'territory', 'visuals'],
    },
    intelligence: {
        id: 'intelligence',
        icon: '🧠',
        label: 'Intelligence',
        color: '#ff8844',
        children: ['ai', 'logging'],
    },
};

/** Get all config keys for a super-category (union of child category keys). */
export function getSuperCategoryKeys(sc: ThemeSuperCategory): string[] {
    return SUPER_CATEGORIES[sc].children.flatMap(c => CATEGORY_KEYS[c]);
}

/** Snapshot all keys belonging to a super-category. */
export function snapshotSuperCategory(sc: ThemeSuperCategory): Record<string, unknown> {
    const snap: Record<string, unknown> = {};
    for (const key of getSuperCategoryKeys(sc)) {
        if (key in GAME_CONFIG) snap[key] = (GAME_CONFIG as any)[key];
    }
    return snap;
}

// ── Composed Theme (Tier 3 — Full Theme) ────────────────────────────────────
// A full theme is composed of per-category snapshots.
// It can combine any selection of category presets into one.

export interface ComposedTheme {
    name: string;
    createdAt: string;
    builtIn?: boolean;
    /** Per-category values — each key is a ThemeCategory, value is a config snapshot */
    categories: Partial<Record<ThemeCategory, Record<string, unknown>>>;
}

/** Snapshot ALL categories into a composed theme. */
export function snapshotFullTheme(name: string): ComposedTheme {
    const categories: Partial<Record<ThemeCategory, Record<string, unknown>>> = {};
    for (const cat of Object.keys(CATEGORY_KEYS) as ThemeCategory[]) {
        const snap = snapshotCategory(cat);
        if (Object.keys(snap).length > 0) categories[cat] = snap;
    }
    return { name, createdAt: new Date().toISOString(), categories };
}

/** Apply a composed theme — only touches categories present in the theme. */
export function applyComposedTheme(theme: ComposedTheme): void {
    for (const [cat, values] of Object.entries(theme.categories) as [ThemeCategory, Record<string, unknown>][]) {
        const allowedKeys = new Set(CATEGORY_KEYS[cat] ?? []);
        for (const [key, val] of Object.entries(values)) {
            if (allowedKeys.has(key) && key in GAME_CONFIG) {
                (GAME_CONFIG as any)[key] = val;
            }
        }
    }
}

// ── Composed Theme Persistence ──────────────────────────────────────────────

const COMPOSED_STORAGE_KEY = 'pax_composedThemes';

function loadComposedThemes(): ComposedTheme[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(COMPOSED_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistComposedThemes(themes: ComposedTheme[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(COMPOSED_STORAGE_KEY, JSON.stringify(themes));
}

let _composedCache: ComposedTheme[] | null = null;

export function listComposedThemes(): ComposedTheme[] {
    if (_composedCache === null) _composedCache = loadComposedThemes();
    return [..._composedCache];
}

export function saveComposedTheme(name: string): ComposedTheme {
    const theme = snapshotFullTheme(name);
    const themes = listComposedThemes().filter(t => t.name !== name);
    themes.unshift(theme);
    _composedCache = themes;
    persistComposedThemes(themes);
    return theme;
}

export function deleteComposedTheme(name: string): void {
    _composedCache = listComposedThemes().filter(t => t.name !== name);
    persistComposedThemes(_composedCache);
}

// ── Category Preset ─────────────────────────────────────────────────────────

export interface CategoryPreset {
    name: string;
    category: ThemeCategory;
    values: Record<string, unknown>;
    createdAt: string;
    builtIn?: boolean;
}

// ── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'pax_categoryThemes_';

function loadPresets(category: ThemeCategory): CategoryPreset[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + category);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function persistPresets(category: ThemeCategory, presets: CategoryPreset[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_PREFIX + category, JSON.stringify(presets));
}

// Lazy-init cache
const _cache = new Map<ThemeCategory, CategoryPreset[]>();

function getUserPresets(category: ThemeCategory): CategoryPreset[] {
    if (!_cache.has(category)) {
        _cache.set(category, loadPresets(category));
    }
    return _cache.get(category)!;
}

// ── Snapshot / Apply ────────────────────────────────────────────────────────

/**
 * Snapshot current GAME_CONFIG values for a given category.
 * Returns only the keys that belong to the category.
 */
export function snapshotCategory(category: ThemeCategory): Record<string, unknown> {
    const keys = CATEGORY_KEYS[category];
    const snap: Record<string, unknown> = {};
    for (const key of keys) {
        if (key in GAME_CONFIG) {
            snap[key] = (GAME_CONFIG as any)[key];
        }
    }
    return snap;
}

/**
 * Apply a category preset to GAME_CONFIG.
 * Only touches keys belonging to the preset's category.
 */
export function applyCategoryPreset(preset: CategoryPreset): void {
    const allowedKeys = new Set(CATEGORY_KEYS[preset.category]);
    for (const [key, val] of Object.entries(preset.values)) {
        if (allowedKeys.has(key) && key in GAME_CONFIG) {
            (GAME_CONFIG as any)[key] = val;
        }
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * List all presets (builtin + user) for a category.
 */
export function listCategoryPresets(category: ThemeCategory): CategoryPreset[] {
    // Built-in presets will be added in builtinCategoryThemes.ts
    // For now, just return user presets
    return [...getUserPresets(category)];
}

/**
 * Save current config as a named preset for a category.
 */
export function saveCategoryPreset(category: ThemeCategory, name: string): CategoryPreset {
    const preset: CategoryPreset = {
        name,
        category,
        values: snapshotCategory(category),
        createdAt: new Date().toISOString(),
    };
    const presets = getUserPresets(category).filter(p => p.name !== name);
    presets.unshift(preset);
    _cache.set(category, presets);
    persistPresets(category, presets);
    return preset;
}

/**
 * Load a category preset by name and apply it.
 * Returns the preset if found, null otherwise.
 */
export function loadCategoryPreset(category: ThemeCategory, name: string): CategoryPreset | null {
    const all = listCategoryPresets(category);
    const preset = all.find(p => p.name === name);
    if (preset) {
        applyCategoryPreset(preset);
        return preset;
    }
    return null;
}

/**
 * Delete a user-saved category preset.
 */
export function deleteCategoryPreset(category: ThemeCategory, name: string): void {
    const presets = getUserPresets(category).filter(p => p.name !== name);
    _cache.set(category, presets);
    persistPresets(category, presets);
}
