// ============================================================================
// Built-in themes - filesystem-resident, survives localStorage wipes
// ============================================================================
//
// Uses Vite's import.meta.glob to load all JSON files from builtin-themes/
// recursively at build time. Theme JSON files can be in either format:
//   (a) Standard: { name, description?, created?, createdAt?, values: { ... } }
//   (b) Legacy flat: { KEY: val, ... }
//
// All themes are converted to ComposedTheme / GameTheme-like objects for the
// theme picker while preserving non-category keys in the flat loader path.
// ============================================================================

import { type ComposedTheme, type ThemeCategory, CATEGORY_KEYS } from './categoryThemes';
import { normalizeThemeValues, type ThemePrimitiveValues } from './themeRouting';

const themeModules = import.meta.glob<Record<string, unknown>>('./builtin-themes/**/*.json', { eager: true });

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
    'mar16-new-arch': 'Mar 16 Default (DY4)',
    'classic-mar15-v2': 'Classic Mar 15 v2',
    'classic-3': 'Classic 3',
};

const GENERIC_THEME_NAMES = new Set(['custom', 'theme', 'preset']);
const FILE_TIMESTAMP_RE =
    /(?:^|[-_])(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(?:$|[-_])/;

interface BuiltinThemeEntry {
    name: string;
    description: string;
    createdAt: string;
    values: Record<string, number | string | boolean>;
    builtIn: true;
}

interface RawBuiltinThemeEntry extends BuiltinThemeEntry {
    baseName: string;
    isImported: boolean;
    sourcePath: string;
    sourceSlug: string;
}

function splitIntoCategories(
    values: Record<string, unknown>,
): Partial<Record<ThemeCategory, Record<string, unknown>>> {
    const result: Partial<Record<ThemeCategory, Record<string, unknown>>> = {};
    const keyToCategory = new Map<string, ThemeCategory>();

    for (const [category, keys] of Object.entries(CATEGORY_KEYS) as [ThemeCategory, string[]][]) {
        for (const key of keys) {
            keyToCategory.set(key, category);
        }
    }

    for (const [key, value] of Object.entries(values)) {
        const category = keyToCategory.get(key);
        if (!category) continue;
        if (!result[category]) result[category] = {};
        result[category]![key] = value;
    }

    return result;
}

function getSourcePath(modulePath: string): string {
    return modulePath
        .replace(/^\.\//, '')
        .replace(/^builtin-themes\//, '')
        .replace(/\.json$/i, '');
}

function getFileStem(sourcePath: string): string {
    return sourcePath.replace(/^.*\//, '');
}

function getThemeData(mod: Record<string, unknown>): Record<string, unknown> {
    return (mod as { default?: Record<string, unknown> }).default ?? mod;
}

function getRawValues(data: Record<string, unknown>): Record<string, unknown> {
    if (typeof data.values === 'object' && data.values !== null) {
        return data.values as Record<string, unknown>;
    }
    return data;
}

function coercePrimitiveValues(
    rawValues: Record<string, unknown>,
): Record<string, number | string | boolean> {
    const values: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(rawValues)) {
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
            values[key] = value;
        }
    }
    return normalizeThemeValues(
        values as ThemePrimitiveValues,
    ) as Record<string, number | string | boolean>;
}

function parseCreatedAtFromFilename(sourceSlug: string): string | null {
    const match = sourceSlug.match(FILE_TIMESTAMP_RE);
    if (!match) return null;
    const [, date, hours, minutes, seconds] = match;
    return `${date}T${hours}:${minutes}:${seconds}.000Z`;
}

function resolveCreatedAt(
    data: Record<string, unknown>,
    sourceSlug: string,
): string {
    const direct =
        typeof data.created === 'string'
            ? data.created
            : typeof data.createdAt === 'string'
              ? data.createdAt
              : null;
    if (direct && !Number.isNaN(Date.parse(direct))) return direct;
    const fromFileName = parseCreatedAtFromFilename(sourceSlug);
    if (fromFileName) return fromFileName;
    return '1970-01-01T00:00:00.000Z';
}

function prettifySourceSlug(fileStem: string): string {
    return fileStem
        .replace(/^pax-theme-/, '')
        .replace(FILE_TIMESTAMP_RE, '')
        .replace(/[_-]+/g, ' ')
        .trim() || fileStem;
}

function formatCreatedAtLabel(createdAt: string, fallback: string): string {
    const parsed = Date.parse(createdAt);
    if (Number.isNaN(parsed)) return fallback;
    return new Date(parsed).toISOString().slice(0, 16).replace('T', ' ');
}

function resolveBaseName(
    data: Record<string, unknown>,
    fileStem: string,
): string {
    const named =
        typeof data.name === 'string'
            ? data.name.trim()
            : '';
    return NAME_OVERRIDES[fileStem] || named || prettifySourceSlug(fileStem);
}

function needsDisambiguation(baseName: string, duplicateCount: number): boolean {
    return duplicateCount > 1 || GENERIC_THEME_NAMES.has(baseName.trim().toLowerCase());
}

function loadRawBuiltinThemeEntries(): RawBuiltinThemeEntry[] {
    return Object.entries(themeModules).map(([modulePath, mod]) => {
        const sourcePath = getSourcePath(modulePath);
        const sourceSlug = getFileStem(sourcePath);
        const data = getThemeData(mod);
        const rawValues = getRawValues(data);

        return {
            name: '',
            baseName: resolveBaseName(data, sourceSlug),
            description: typeof data.description === 'string' ? data.description : '',
            createdAt: resolveCreatedAt(data, sourceSlug),
            values: coercePrimitiveValues(rawValues),
            builtIn: true as const,
            isImported: sourcePath.startsWith('imported/'),
            sourcePath,
            sourceSlug,
        };
    });
}

function resolveDisplayNames(rawEntries: RawBuiltinThemeEntry[]): BuiltinThemeEntry[] {
    const grouped = new Map<string, RawBuiltinThemeEntry[]>();
    for (const entry of rawEntries) {
        const key = entry.baseName.trim().toLowerCase();
        const list = grouped.get(key) ?? [];
        list.push(entry);
        grouped.set(key, list);
    }

    const resolvedNames = new Map<RawBuiltinThemeEntry, string>();
    const usedNames = new Set<string>();

    for (const entries of grouped.values()) {
        entries.sort((a, b) => {
            if (a.isImported !== b.isImported) {
                return a.isImported ? 1 : -1;
            }
            return a.sourcePath.localeCompare(b.sourcePath);
        });

        const keepPrimaryName =
            entries.length > 1
            && !GENERIC_THEME_NAMES.has(entries[0].baseName.trim().toLowerCase());

        entries.forEach((entry, index) => {
            let name = entry.baseName;
            if (!keepPrimaryName || index > 0 || needsDisambiguation(entry.baseName, entries.length)) {
                name = `${entry.baseName} - ${formatCreatedAtLabel(entry.createdAt, entry.sourceSlug)}`;
            }
            if (usedNames.has(name)) {
                name = `${name} [${entry.sourceSlug}]`;
            }
            usedNames.add(name);
            resolvedNames.set(entry, name);
        });
    }

    return rawEntries.map((entry) => ({
        name: resolvedNames.get(entry) ?? entry.baseName,
        description: entry.description,
        createdAt: entry.createdAt,
        values: entry.values,
        builtIn: true as const,
    }));
}

function loadBuiltinThemeEntries(): BuiltinThemeEntry[] {
    const entries = resolveDisplayNames(loadRawBuiltinThemeEntries());
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name));
    return entries;
}

function buildBuiltinThemes(): ComposedTheme[] {
    return loadBuiltinThemeEntries().map((entry) => ({
        name: entry.name,
        createdAt: entry.createdAt,
        builtIn: true,
        categories: splitIntoCategories(entry.values),
    }));
}

let _builtinThemesCache: ComposedTheme[] | null = null;
export function getBuiltinThemes(): ComposedTheme[] {
    if (!_builtinThemesCache) _builtinThemesCache = buildBuiltinThemes();
    return _builtinThemesCache;
}

let _builtinGameThemesCache: Array<{
    name: string;
    description: string;
    created: string;
    values: Record<string, number | string | boolean>;
    builtIn: true;
}> | null = null;

export function getBuiltinGameThemes() {
    if (!_builtinGameThemesCache) {
        _builtinGameThemesCache = loadBuiltinThemeEntries().map((entry) => ({
            name: entry.name,
            description: entry.description,
            created: entry.createdAt,
            values: entry.values,
            builtIn: true as const,
        }));
    }
    return _builtinGameThemesCache;
}

export function getBuiltinCategoryPresets(category: ThemeCategory) {
    const presets: Array<{
        name: string;
        category: ThemeCategory;
        values: Record<string, unknown>;
        createdAt: string;
        builtIn: true;
    }> = [];

    for (const theme of getBuiltinThemes()) {
        const categoryValues = theme.categories[category];
        if (!categoryValues || Object.keys(categoryValues).length === 0) continue;
        presets.push({
            name: theme.name,
            category,
            values: { ...categoryValues },
            createdAt: theme.createdAt,
            builtIn: true,
        });
    }

    return presets;
}
