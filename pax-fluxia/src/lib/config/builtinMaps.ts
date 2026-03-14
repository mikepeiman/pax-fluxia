// ============================================================================
// Built-In Maps — Filesystem-resident, survives localStorage wipes
// ============================================================================
//
// Loads classic Pax Galaxia .txt maps from builtin-maps/ at build time.
// Also loads any .json maps placed in the same directory.
// ============================================================================

import type { MapDefinition } from '$lib/types/map.types';
import { parseClassicMap } from './classic-map-parser';

// ── Load all map files at build time ───────────────────────────────────────

const classicMapModules = import.meta.glob<string>(
    './builtin-maps/*.txt',
    { query: '?raw', import: 'default', eager: true }
);

const jsonMapModules = import.meta.glob<Record<string, unknown>>(
    './builtin-maps/*.json',
    { eager: true }
);

// ── Human-readable names for classic maps ──────────────────────────────────

const NAME_OVERRIDES: Record<string, string> = {
    'arena': 'Arena (Classic)',
    'bigun': 'Big Un (Classic)',
    'boxed': 'Boxed (Classic)',
    'crazy': 'Crazy (Classic)',
    'crisscross': 'Criss Cross (Classic)',
    'dspokes': 'Double Spokes (Classic)',
    'empire': 'Empire (Classic)',
    'frontline': 'Frontline (Classic)',
};

// ── Build maps lazily ──────────────────────────────────────────────────────

let _cache: MapDefinition[] | null = null;

function buildBuiltinMaps(): MapDefinition[] {
    const maps: MapDefinition[] = [];

    // Parse classic .txt maps
    for (const [path, raw] of Object.entries(classicMapModules)) {
        const slug = path.replace(/^.*\//, '').replace(/\.txt$/, '').toLowerCase();
        const name = NAME_OVERRIDES[slug] || slug;
        try {
            const map = parseClassicMap(name, raw);
            (map as any).builtIn = true;
            maps.push(map);
        } catch (e) {
            console.warn(`[BuiltinMaps] Failed to parse classic map "${slug}":`, e);
        }
    }

    // Load any JSON maps (future hand-crafted maps)
    for (const [path, mod] of Object.entries(jsonMapModules)) {
        const slug = path.replace(/^.*\//, '').replace(/\.json$/, '');
        try {
            const data = (mod as any).default ?? mod;
            const map: MapDefinition = data as MapDefinition;
            if (!map.metadata) continue; // Skip non-MapDefinition JSON
            (map as any).builtIn = true;
            maps.push(map);
        } catch (e) {
            console.warn(`[BuiltinMaps] Failed to load JSON map "${slug}":`, e);
        }
    }

    // Sort alphabetically
    maps.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

    console.log(`[BuiltinMaps] Loaded ${maps.length} built-in maps`);
    return maps;
}

/** Get all built-in maps (lazily computed, cached). */
export function getBuiltinMaps(): MapDefinition[] {
    if (!_cache) _cache = buildBuiltinMaps();
    return _cache;
}
