// ============================================================================
// Built-In Maps — loaded from static/maps/ at runtime
// ============================================================================
//
// Classic Pax Galaxia .txt maps are served from /maps/ as static assets.
// This module fetches and parses them asynchronously.
// ============================================================================

import type { MapDefinition } from '$lib/types/map.types';
import { parseClassicMap } from './classic-map-parser';

// ── Known map files ─────────────────────────────────────────────────────────
// These files live in static/maps/ and are served as-is by the static adapter.
// To add a new map, drop the .txt file in static/maps/ and add it here.

const BUILTIN_MAP_FILES: { filename: string; name: string }[] = [
    { filename: 'arena.txt', name: 'Arena (Classic)' },
    { filename: 'bigun.txt', name: 'Big Un (Classic)' },
    { filename: 'Boxed.txt', name: 'Boxed (Classic)' },
    { filename: 'crazy.txt', name: 'Crazy (Classic)' },
    { filename: 'CrissCross.txt', name: 'Criss Cross (Classic)' },
    { filename: 'DSpokes.txt', name: 'Double Spokes (Classic)' },
    { filename: 'empire.txt', name: 'Empire (Classic)' },
    { filename: 'frontline.txt', name: 'Frontline (Classic)' },
];

// ── Async loader ────────────────────────────────────────────────────────────

let _cache: MapDefinition[] | null = null;
let _loading: Promise<MapDefinition[]> | null = null;

async function fetchBuiltinMaps(): Promise<MapDefinition[]> {
    const maps: MapDefinition[] = [];

    const results = await Promise.allSettled(
        BUILTIN_MAP_FILES.map(async ({ filename, name }) => {
            const res = await fetch(`/maps/${filename}`);
            if (!res.ok) {
                console.warn(`[BuiltinMaps] Failed to fetch "${filename}": ${res.status}`);
                return null;
            }
            const raw = await res.text();
            try {
                const map = parseClassicMap(name, raw);
                (map as any).builtIn = true;
                return map;
            } catch (e) {
                console.warn(`[BuiltinMaps] Failed to parse "${filename}":`, e);
                return null;
            }
        })
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            maps.push(result.value);
        }
    }

    maps.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    console.log(`[BuiltinMaps] Loaded ${maps.length} built-in maps`);
    return maps;
}

/**
 * Get all built-in maps (async, cached after first load).
 * Returns [] synchronously if not yet loaded — call loadBuiltinMaps() at init.
 */
export function getBuiltinMaps(): MapDefinition[] {
    return _cache ?? [];
}

/**
 * Trigger async loading of built-in maps. Safe to call multiple times.
 * Returns the loaded maps once complete.
 */
export async function loadBuiltinMaps(): Promise<MapDefinition[]> {
    if (_cache) return _cache;
    if (!_loading) {
        _loading = fetchBuiltinMaps().then(maps => {
            _cache = maps;
            _loading = null;
            return maps;
        });
    }
    return _loading;
}
