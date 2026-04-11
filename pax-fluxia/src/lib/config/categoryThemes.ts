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

import { GAME_CONFIG, DEFAULT_GAME_CONFIG } from '$lib/config/game.config';
import { getBuiltinThemes, getBuiltinCategoryPresets } from './builtinThemes';

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
        'ARROW_LENGTH_FRACTION',
    ],

    territory: [
        // Territory toggles
        'TERRITORY_VORONOI',
        'TERRITORY_MODIFIED_VORONOI',
        'TERRITORY_POWER_VORONOI',
        'TERRITORY_METABALL',
        'TERRITORY_PIXEL',
        'PIXEL_ALPHA',
        'PIXEL_RESOLUTION',
        'PIXEL_EDGE_BLEND',
        'PIXEL_BLUR',
        'PIXEL_BLEND_POWER',
        'PIXEL_CORRIDOR_BOOST',
        'PIXEL_HUE_SHIFT',
        'PIXEL_BORDER_WIDTH',
        'PIXEL_BORDER_ALPHA',
        'PIXEL_BORDER_BRIGHTEN',
        'PIXEL_PATTERN',
        'PIXEL_PATTERN_SCALE',
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
        'VORONOI_BORDER_SMOOTH',
        'VORONOI_SATURATION',
        'VORONOI_LIGHTNESS',
        'VORONOI_GLOW_RADIUS',
        'VORONOI_GLOW_ALPHA',
        'VORONOI_GLOW_LAYERS',
        'VORONOI_BLUR',
        'VORONOI_SMOOTHING',
        'VORONOI_GRADIENT_BLEND',
        'VORONOI_BLEND_WIDTH',
        // Modified Voronoi (F-138)
        'MODIFIED_VORONOI_STAR_MARGIN',
        'MODIFIED_VORONOI_ARC_STRENGTH',
        'MODIFIED_VORONOI_ARC_THRESHOLD',
        'MODIFIED_VORONOI_ARC_MIN_SEGMENT',
        'MODIFIED_VORONOI_CORRIDOR_ENABLED',
        'MODIFIED_VORONOI_CORRIDOR_SPACING',
        'MODIFIED_VORONOI_DISCONNECT_ENABLED',
        'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
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
        'METABALL_BLUR_AFFECTS_BORDERS',
        'METABALL_BORDER_WIDTH',
        'METABALL_BORDER_ALPHA',
        'METABALL_COVERAGE',
        'METABALL_SATURATION',
        'METABALL_LIGHTNESS',
        'METABALL_BORDER_SATURATION',
        'METABALL_BORDER_LIGHTNESS',
        'METABALL_CHAIKIN_PASSES',
        'METABALL_COMBAT_BORDER_TICKS',
        'METABALL_COMBAT_BORDER_PROXIMITY_PX',
        'METABALL_COMBAT_BORDER_WIDTH_BOOST',
        'METABALL_COMBAT_BORDER_ALPHA_BOOST',
        'METABALL_BORDER_FORCE_RATIO',
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
    ],

    visuals: [
        'MAPGEN_LANE_MARGIN_PX',
        'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS',
        'MAPGEN_LANE_MODE',
        'MODIFIED_VORONOI_STAR_MARGIN',
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

    debug: [
        'DEBUG_MORPH_VERTICES',
        'DEBUG_MORPH_VERTEX_SIZE',
        'DEBUG_MORPH_PIN_THRESHOLD',
        'DEBUG_MORPH_TRACE_LOG',
        'DEBUG_MORPH_SLOWMO',
        'DEBUG_MORPH_VERTEX_NTH',
        'DEBUG_MORPH_VERTEX_COLOR_MODE',
        'MORPH_CONQUEST_RADIUS',
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
        children: ['ships', 'territory', 'visuals', 'audio'],
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
    // Merge user themes (first) with filesystem built-ins (last)
    const userThemes = [..._composedCache];
    const builtInNames = new Set(getBuiltinThemes().map(t => t.name));
    // Don't duplicate if user saved one with same name as built-in
    const merged = userThemes.filter(t => !builtInNames.has(t.name));
    merged.push(...getBuiltinThemes());
    return merged;
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
    // Block deletion of built-in themes
    if (getBuiltinThemes().some(t => t.name === name)) return;
    const userOnly = (_composedCache ?? loadComposedThemes()).filter(t => t.name !== name);
    _composedCache = userOnly;
    persistComposedThemes(userOnly);
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

// ── Starred Themes (per-category, separate from presets) ────────────────────

const STARRED_PREFIX = 'pax_starredThemes_';

export function getStarredNames(category: ThemeCategory): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(STARRED_PREFIX + category);
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
}

export function setStarred(category: ThemeCategory, name: string, starred: boolean): void {
    const names = getStarredNames(category);
    if (starred) names.add(name);
    else names.delete(name);
    if (typeof window !== 'undefined') {
        localStorage.setItem(STARRED_PREFIX + category, JSON.stringify([...names]));
    }
}

export function isStarred(category: ThemeCategory, name: string): boolean {
    return getStarredNames(category).has(name);
}

// Lazy-init cache
const _cache = new Map<ThemeCategory, CategoryPreset[]>();

type CategoryPresetApplyCallback = ((preset: CategoryPreset) => void) | null;
let _applyPresetCallback: CategoryPresetApplyCallback = null;

export function registerCategoryPresetApplyCallback(cb: CategoryPresetApplyCallback): void {
    _applyPresetCallback = cb;
}

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
    if (_applyPresetCallback) {
        _applyPresetCallback(preset);
        return;
    }
    const allowedKeys = new Set(CATEGORY_KEYS[preset.category]);
    for (const [key, val] of Object.entries(preset.values)) {
        if (allowedKeys.has(key) && key in GAME_CONFIG) {
            (GAME_CONFIG as any)[key] = val;
        }
    }
}

/**
 * Reset a category to its default values from DEFAULT_GAME_CONFIG.
 * Constructs a synthetic preset from defaults and applies it through the
 * same callback path used by applyCategoryPreset.
 */
export function resetCategoryToDefaults(category: ThemeCategory): void {
    const keys = CATEGORY_KEYS[category];
    const values: Record<string, unknown> = {};
    for (const key of keys) {
        if (key in DEFAULT_GAME_CONFIG) {
            values[key] = (DEFAULT_GAME_CONFIG as any)[key];
        }
    }
    const defaultPreset: CategoryPreset = {
        name: '__defaults__',
        category,
        values,
        builtIn: true,
        createdAt: new Date().toISOString(),
    };
    applyCategoryPreset(defaultPreset);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * List all presets (builtin + user) for a category.
 */
export function listCategoryPresets(category: ThemeCategory): CategoryPreset[] {
    const userPresets = getUserPresets(category);
    const builtinPresets = getBuiltinCategoryPresets(category);
    // User presets first, built-ins after
    const userNames = new Set(userPresets.map(p => p.name));
    const merged = [...userPresets];
    for (const bp of builtinPresets) {
        if (!userNames.has(bp.name)) merged.push(bp);
    }
    return merged;
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
 * Import a category preset from a parsed JSON object (e.g. from file upload).
 * Validates structure, saves to localStorage, and optionally applies it.
 * Returns the imported preset, or null if invalid.
 */
export function importCategoryPreset(
    json: Record<string, unknown>,
    apply = true,
): CategoryPreset | null {
    // Validate required fields
    const name = typeof json.name === 'string' ? json.name : null;
    const category = typeof json.category === 'string' ? json.category as ThemeCategory : null;
    const values = typeof json.values === 'object' && json.values !== null
        ? json.values as Record<string, unknown>
        : null;

    if (!name || !category || !values) return null;
    if (!(category in CATEGORY_KEYS)) return null;

    const preset: CategoryPreset = {
        name,
        category,
        values,
        createdAt: typeof json.createdAt === 'string' ? json.createdAt : new Date().toISOString(),
    };

    // Save to localStorage (overwrites if same name exists)
    const presets = getUserPresets(category).filter(p => p.name !== name);
    presets.unshift(preset);
    _cache.set(category, presets);
    persistPresets(category, presets);

    // Apply immediately if requested
    if (apply) {
        applyCategoryPreset(preset);
    }

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

