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

// ── Category keys/metadata (extracted to a bun-test-safe leaf module) ────────
import {
    type ThemeCategory,
    type CategoryMeta,
    CATEGORY_META,
    CATEGORY_KEYS,
    EXCLUDED_FROM_CATEGORIES,
} from './categoryKeys';
export {
    type ThemeCategory,
    type CategoryMeta,
    CATEGORY_META,
    CATEGORY_KEYS,
    EXCLUDED_FROM_CATEGORIES,
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
        children: ['players', 'ships', 'territory', 'visuals', 'audio'],
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

