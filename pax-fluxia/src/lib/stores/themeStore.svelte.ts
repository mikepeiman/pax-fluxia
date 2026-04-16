// ============================================================================
// Theme Store — Single source of truth for theme state
// ============================================================================
// Replaces duplicated theme state in +page.svelte and GameSettingsPanel.svelte.
// Both components now import from this reactive store.
// ============================================================================

import { getBuiltinGameThemes } from '$lib/config/builtinThemes';
import {
    buildThemeDisplayName,
    ensureUniqueThemeDisplayName,
} from '$lib/config/themeNames';
import { normalizeThemeValues } from '$lib/config/themeRouting';
import {
    type GameTheme,
    applyTheme as applyThemeToConfig,
    loadThemes,
    saveThemes,
    saveTheme as persistTheme,
    deleteTheme as removeTheme,
    extractTheme,
    exportThemeJSON,
} from '$lib/config/themes';
import { audioManager } from '$lib/services/audioManager.svelte';


// ── One-time migration from old themePresets system ─────────────────────────

const OLD_PRESETS_KEY = 'pax_themePresets';

function buildReservedUserThemeNames(excludedName?: string): Set<string> {
    const reserved = new Set<string>(getBuiltinGameThemes().map((theme) => theme.name));
    for (const theme of _userThemes) {
        if (excludedName && theme.name === excludedName) continue;
        reserved.add(theme.name);
    }
    return reserved;
}

function prepareUserThemeForStorage(
    theme: GameTheme,
    options?: {
        sourceName?: string;
        preserveName?: boolean;
        reservedNames?: Set<string>;
    },
): GameTheme {
    const created =
        typeof theme.created === 'string' && !Number.isNaN(Date.parse(theme.created))
            ? theme.created
            : new Date().toISOString();
    const values = normalizeThemeValues(
        theme.values as Record<string, number | string | boolean>,
    );

    let name = options?.preserveName
        ? theme.name.trim()
        : buildThemeDisplayName({
            providedName: theme.name,
            sourceName: options?.sourceName,
            createdAt: created,
            values,
        });

    if (options?.reservedNames && !options.preserveName) {
        name = ensureUniqueThemeDisplayName(
            name,
            options.reservedNames,
            {
                providedName: name,
                sourceName: options.sourceName,
                createdAt: created,
                values,
            },
        );
        options.reservedNames.add(name);
    }

    return {
        ...theme,
        name,
        created,
        values,
    };
}

function loadUserThemesNormalized(): GameTheme[] {
    const rawThemes = loadThemes();
    if (rawThemes.length === 0) return [];

    const reservedNames = new Set<string>(
        getBuiltinGameThemes().map((theme) => theme.name),
    );
    const normalizedThemes = rawThemes.map((theme) =>
        prepareUserThemeForStorage(theme, { reservedNames }),
    );

    if (JSON.stringify(rawThemes) !== JSON.stringify(normalizedThemes)) {
        saveThemes(normalizedThemes);
    }

    return normalizedThemes;
}

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

// Run migration and apply default theme on first load
if (typeof window !== 'undefined') {
    migrateOldPresets();
    // Auto-apply default theme only if nothing has been selected yet
    // (first launch or after a reset). Use setTimeout to allow all stores to initialize.
    setTimeout(() => {
        if (!_selectedThemeName) {
            const DEFAULT_THEME_NAME = 'Mar 16 Default (DY4)';
            const allBuiltins = getBuiltinGameThemes();
            const defaultTheme = allBuiltins.find(t => t.name === DEFAULT_THEME_NAME);
            if (defaultTheme) {
                import('$lib/config/themes').then(({ applyTheme }) => {
                    applyTheme(defaultTheme);
                    _selectedThemeName = DEFAULT_THEME_NAME;
                });
            }
        }
    }, 0);
}

let _userThemes = $state<GameTheme[]>(
    typeof window !== 'undefined' ? loadUserThemesNormalized() : [],
);

let _selectedThemeName = $state('');

// ── Derived ─────────────────────────────────────────────────────────────────

const allThemes = $derived([
    ...getBuiltinGameThemes(),
    ..._userThemes,
]);

// ── Callbacks ───────────────────────────────────────────────────────────────

type SyncCallback = (() => void) | null;
type ApplyCallback = ((values: Record<string, number | string | boolean>) => void) | null;
let _syncCallback: SyncCallback = null;
let _applyCallback: ApplyCallback = null;

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

    /** Register a canonical apply callback so theme values update panel + runtime together */
    registerApplyCallback(cb: ApplyCallback) {
        _applyCallback = cb;
    },

    /** Apply a theme by name — writes to GAME_CONFIG, triggers sync */
    applyTheme(name: string): boolean {
        const theme = allThemes.find(t => t.name === name);
        if (!theme) return false;
        if (_applyCallback) _applyCallback(theme.values as Record<string, number | string | boolean>);
        else applyThemeToConfig(theme);
        // Sync AudioManager's reactive state mirrors from the freshly-written GAME_CONFIG
        audioManager.syncFromConfig();
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
        const isExistingUserTheme = _userThemes.some((theme) => theme.name === name);
        const theme = prepareUserThemeForStorage(
            extractTheme(name, description),
            {
                preserveName: isExistingUserTheme,
                reservedNames: buildReservedUserThemeNames(
                    isExistingUserTheme ? name : undefined,
                ),
            },
        );
        persistTheme(theme);
        _userThemes = loadUserThemesNormalized();
        _selectedThemeName = theme.name;
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

    /** Export a theme as JSON download — always snapshots current GAME_CONFIG */
    exportTheme(name?: string): void {
        const t = name
            ? extractTheme(name, 'Exported settings')
            : prepareUserThemeForStorage(
                extractTheme('Custom', 'Exported settings'),
            );
        exportThemeJSON(t);
    },

    /** Import a theme from parsed JSON */
    importTheme(theme: GameTheme, sourceName?: string): GameTheme | null {
        if (!theme.name || !theme.values || typeof theme.values !== 'object') {
            return null;
        }
        const provisionalTheme = prepareUserThemeForStorage(theme, { sourceName });
        const normalizedTheme = prepareUserThemeForStorage(theme, {
            sourceName,
            reservedNames: buildReservedUserThemeNames(provisionalTheme.name),
        });
        persistTheme(normalizedTheme);
        if (_applyCallback) _applyCallback(normalizedTheme.values as Record<string, number | string | boolean>);
        else applyThemeToConfig(normalizedTheme);
        // Sync AudioManager after import too
        audioManager.syncFromConfig();
        _userThemes = loadUserThemesNormalized();
        _selectedThemeName = normalizedTheme.name;
        _syncCallback?.();
        return normalizedTheme;
    },

    /** Check if a theme is user-created (not built-in) */
    isUserTheme(name: string): boolean {
        return _userThemes.some(t => t.name === name);
    },
};

