// ============================================================================
// Built-In Themes — Filesystem-resident, survives localStorage wipes
// ============================================================================
//
// Uses Vite's import.meta.glob to load all JSON files from builtin-themes/
// at build time. Theme JSON files can be in either format:
//   (a) Standard: { name, description?, created?, values: { ... } }
//   (b) Legacy flat: { KEY: val, ... }
//
// All themes are converted to ComposedTheme format for the theme picker.
// ============================================================================

import { type ComposedTheme, type ThemeCategory, CATEGORY_KEYS } from './categoryThemes';

// ── Load all JSON files at build time ──────────────────────────────────────

const themeModules = import.meta.glob<Record<string, unknown>>('./builtin-themes/*.json', { eager: true });

// ── Human-readable names (override the JSON "name" field for keepers) ──────

const NAME_OVERRIDES: Record<string, string> = {
    'clean-mode': 'Clean Mode (Mar 14)',
    'smooth-bezier': 'Smooth Bezier',
    'arrow-capture': 'Arrow Capture',
    'flow-ships': 'Flow Ships',
    'feb27-default': 'Feb 27 Default',
    'mar07-default': 'Mar 07 Default',
    'clean-voronoi': 'Clean Voronoi',
    'distance-field': 'Distance Field',
    'streaming-ships': 'Streaming Ships',
};

// ── Helper: split flat values into per-category snapshots ──────────────────

function splitIntoCategories(
    values: Record<string, unknown>,
): Partial<Record<ThemeCategory, Record<string, unknown>>> {
    const result: Partial<Record<ThemeCategory, Record<string, unknown>>> = {};
    const keyToCategory = new Map<string, ThemeCategory>();

    for (const [cat, keys] of Object.entries(CATEGORY_KEYS) as [ThemeCategory, string[]][]) {
        for (const k of keys) {
            keyToCategory.set(k, cat);
        }
    }

    for (const [key, val] of Object.entries(values)) {
        const cat = keyToCategory.get(key);
        if (cat) {
            if (!result[cat]) result[cat] = {};
            result[cat]![key] = val;
        }
    }

    return result;
}

// ── Convert loaded modules to ComposedTheme[] ──────────────────────────────

function buildBuiltinThemes(): ComposedTheme[] {
    const themes: ComposedTheme[] = [];

    for (const [path, mod] of Object.entries(themeModules)) {
        // Extract slug from path: './builtin-themes/clean-mode.json' → 'clean-mode'
        const slug = path.replace(/^.*\//, '').replace(/\.json$/, '');
        const data = (mod as any).default ?? mod;

        // Detect format: standard (has "values" key) vs legacy flat
        const isStandard = typeof data.values === 'object' && data.values !== null;
        const values: Record<string, unknown> = isStandard ? data.values : data;

        // Determine name
        const name = NAME_OVERRIDES[slug]
            ?? (isStandard && data.name ? String(data.name) : slug);

        const theme: ComposedTheme = {
            name,
            createdAt: isStandard && data.created ? String(data.created) : new Date().toISOString(),
            builtIn: true,
            categories: splitIntoCategories(values),
        };

        themes.push(theme);
    }

    // Sort: newest first
    themes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return themes;
}

/** All built-in themes, computed once at module load. */
export const BUILTIN_THEMES: ComposedTheme[] = buildBuiltinThemes();

/**
 * Extract per-category built-in presets from full themes.
 * Returns built-in CategoryPresets for a given category.
 */
export function getBuiltinCategoryPresets(category: ThemeCategory) {
    const presets: Array<{
        name: string;
        category: ThemeCategory;
        values: Record<string, unknown>;
        createdAt: string;
        builtIn: true;
    }> = [];

    for (const theme of BUILTIN_THEMES) {
        const catValues = theme.categories[category];
        if (catValues && Object.keys(catValues).length > 0) {
            presets.push({
                name: `${theme.name}`,
                category,
                values: { ...catValues },
                createdAt: theme.createdAt,
                builtIn: true,
            });
        }
    }

    return presets;
}
