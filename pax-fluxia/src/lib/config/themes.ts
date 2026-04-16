// ============================================================================
// Theme System — Named presets for animation/visual/mechanics settings
// ============================================================================
// A "theme" is a complete snapshot of GAME_CONFIG minus a small set of
// map-generation and internal keys. Uses a denylist so new config keys
// are automatically included without manual maintenance.
// ============================================================================

import { GAME_CONFIG } from './game.config';

// ── Denylist — Keys excluded from themes ────────────────────────────────────

/**
 * Keys to EXCLUDE from theme snapshots.
 * These are map-specific, internal/computed, or AI tuning keys
 * that should not be part of a saveable theme.
 */
const THEME_DENYLIST: Set<string> = new Set([
    // Map generation internals (computed, not user-settable)
    '_MAP_HEX_RADIUS', '_MAP_PADDING_X', '_MAP_PADDING_Y',
    '_MAP_WIDTH', '_MAP_HEIGHT',
    // Map structure (set in main menu, not theme)
    'STARS_PER_PLAYER', 'MAX_LINKS_PER_STAR',
    'SHOW_HEX_GRID',
    // AI tuning (separate from theme)
    'AI_MUST_ATTACK_RATIO', 'AI_ATTACK_UPPER_BOUNDS', 'AI_ATTACK_STICKINESS',
    'AI_EVALUATION_FREQUENCY', 'AI_TACTICAL_AGGRESSION', 'AI_RANDOM_AGGRESSION',
]);

function isThemeEligibleKey(key: string): boolean {
    // Internal/runtime keys are prefixed with "_" and should never round-trip through themes.
    return !key.startsWith('_') && !THEME_DENYLIST.has(key);
}

export function filterThemeValues(
    values: Record<string, unknown>,
): Record<string, number | string | boolean> {
    const filtered: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(values)) {
        if (!isThemeEligibleKey(key)) continue;
        if (
            typeof value === 'number'
            || typeof value === 'string'
            || typeof value === 'boolean'
        ) {
            filtered[key] = value;
        }
    }
    return filtered;
}

// ── Theme Type ──────────────────────────────────────────────────────────────

export interface GameTheme {
    name: string;
    description: string;
    created: string;
    values: Partial<Record<string, number | string | boolean>>;
}

// ── Theme Operations ────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = 'pax-game-themes';

/**
 * Extract ALL theme-eligible values from current GAME_CONFIG.
 * Uses denylist — automatically includes any new config keys.
 */
export function extractTheme(name: string, description: string): GameTheme {
    const values = filterThemeValues(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );
    return {
        name,
        description,
        created: new Date().toISOString(),
        values,
    };
}

/**
 * Apply a theme to GAME_CONFIG.
 * Only applies keys that exist in GAME_CONFIG and aren't on the denylist.
 */
export function applyTheme(theme: GameTheme): void {
    for (const [key, value] of Object.entries(theme.values)) {
        if (isThemeEligibleKey(key) && key in GAME_CONFIG) {
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
