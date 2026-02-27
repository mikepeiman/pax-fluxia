// ============================================================================
// Theme Store — Single source of truth for theme state
// ============================================================================
// Replaces duplicated theme state in +page.svelte and GameSettingsPanel.svelte.
// Both components now import from this reactive store.
// ============================================================================

import { BUILTIN_THEMES } from '$lib/config/builtinThemes';
import {
    type GameTheme,
    applyTheme as applyThemeToConfig,
    loadThemes,
    saveTheme as persistTheme,
    deleteTheme as removeTheme,
    extractTheme,
    exportThemeJSON,
} from '$lib/config/themes';

// ── One-time migration from old themePresets system ─────────────────────────

const OLD_PRESETS_KEY = 'pax_themePresets';

function migrateOldPresets(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const raw = localStorage.getItem(OLD_PRESETS_KEY);
        if (!raw) return;
        const oldPresets = JSON.parse(raw) as Array<{
            name: string;
            createdAt?: string;
            values: Record<string, unknown>;
            builtIn?: boolean;
        }>;
        // Only migrate user presets (not built-in duplicates)
        const userPresets = oldPresets.filter(p => !p.builtIn);
        if (userPresets.length === 0) {
            localStorage.removeItem(OLD_PRESETS_KEY);
            return;
        }
        // Convert to GameTheme format and save
        const existing = loadThemes();
        const existingNames = new Set(existing.map(t => t.name));
        for (const old of userPresets) {
            if (existingNames.has(old.name)) continue; // don't overwrite
            const theme: GameTheme = {
                name: old.name,
                description: '',
                created: old.createdAt ?? new Date().toISOString(),
                values: old.values as Record<string, number | string | boolean>,
            };
            persistTheme(theme);
        }
        // Remove old storage key
        localStorage.removeItem(OLD_PRESETS_KEY);
        console.log(`[themeStore] Migrated ${userPresets.length} presets from old system`);
    } catch (e) {
        console.warn('[themeStore] Failed to migrate old presets:', e);
    }
}

// ── Reactive State ──────────────────────────────────────────────────────────

// Run migration on first load
if (typeof window !== 'undefined') {
    migrateOldPresets();
}

let _userThemes = $state<GameTheme[]>(
    typeof window !== 'undefined' ? loadThemes() : [],
);

let _selectedThemeName = $state('');

// ── Derived ─────────────────────────────────────────────────────────────────

const allThemes = $derived([...BUILTIN_THEMES, ..._userThemes]);

// ── Callbacks ───────────────────────────────────────────────────────────────

type SyncCallback = () => void;
let _syncCallback: SyncCallback | null = null;

// ── Public API ──────────────────────────────────────────────────────────────

export const themeStore = {
    get userThemes() { return _userThemes; },
    get allThemes() { return allThemes; },
    get selectedThemeName() { return _selectedThemeName; },
    set selectedThemeName(name: string) { _selectedThemeName = name; },

    /** Register a callback to sync UI after theme application */
    registerSyncCallback(cb: SyncCallback) {
        _syncCallback = cb;
    },

    /** Apply a theme by name — writes to GAME_CONFIG, triggers sync */
    applyTheme(name: string): boolean {
        const theme = allThemes.find(t => t.name === name);
        if (!theme) return false;
        applyThemeToConfig(theme);
        _selectedThemeName = name;
        _syncCallback?.();
        // Dispatch event for any listeners (e.g., sidebar ↔ settings panel)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('pax-theme-applied', { detail: name }),
            );
        }
        return true;
    },

    /** Save current GAME_CONFIG as a theme */
    saveTheme(name: string, description = ''): GameTheme {
        const theme = extractTheme(name, description);
        persistTheme(theme);
        _userThemes = loadThemes();
        _selectedThemeName = name;
        return theme;
    },

    /** Delete a user theme by name */
    deleteTheme(name: string): void {
        removeTheme(name);
        _userThemes = loadThemes();
        if (_selectedThemeName === name) _selectedThemeName = '';
    },

    /** Refresh user themes from localStorage */
    refresh(): void {
        _userThemes = loadThemes();
    },

    /** Export a theme as JSON download */
    exportTheme(name?: string): void {
        if (name) {
            const theme = allThemes.find(t => t.name === name);
            if (theme) {
                exportThemeJSON(theme);
                return;
            }
        }
        // Export current config as "Custom"
        const t = extractTheme('Custom', 'Exported settings');
        exportThemeJSON(t);
    },

    /** Import a theme from parsed JSON */
    importTheme(theme: GameTheme): boolean {
        if (!theme.name || !theme.values || typeof theme.values !== 'object') {
            return false;
        }
        persistTheme(theme);
        applyThemeToConfig(theme);
        _userThemes = loadThemes();
        _selectedThemeName = theme.name;
        _syncCallback?.();
        return true;
    },

    /** Check if a theme is user-created (not built-in) */
    isUserTheme(name: string): boolean {
        return _userThemes.some(t => t.name === name);
    },
};
