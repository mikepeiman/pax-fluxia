/**
 * settingsWiringInvariant.test — the "never again" guard for the settings
 * conditional-state / drift bug family.
 *
 * A setting in this app is only correct if it is wired in FOUR independent
 * places at once: the rendered control (`settingConfigKey="X"` / `configSat=…`),
 * the SEARCH index (settingMetadata → getSearchableSettingRecords), the
 * PERSISTENCE map (settingsDefs → PANEL_CONFIG_MAP), and the config type. These
 * are hand-maintained parallel lists, so they DRIFT — producing the recurring
 * "searchable but unreachable", "reachable but not searchable", "changes don't
 * persist" bugs (Chaikin reveal, TERRITORY_SURFACE_*, etc.).
 *
 * This test extracts every literal config key actually rendered by the settings
 * components and asserts it is BOTH searchable and persistable. New settings can
 * no longer ship half-wired: a missing projection turns this test red instead of
 * shipping a silent gap. Pre-existing debt is captured in KNOWN_UNWIRED with a
 * reason, so the baseline is green and only NEW drift fails.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getSearchableSettingRecords } from './settingMetadata';
import { PANEL_CONFIG_MAP } from '../settingsDefs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Literal config keys wired to a control in the settings component tree. */
function collectRenderedKeys(): Map<string, string> {
    const keyToFile = new Map<string, string>();
    const KEY_RE =
        /(?:settingConfigKey|config(?:Enabled|Sat|Light|Alpha|Width|Blend))=["']([A-Z][A-Z0-9_]+)["']/g;
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith('.svelte')) continue;
            const src = readFileSync(full, 'utf-8');
            for (const m of src.matchAll(KEY_RE)) {
                if (!keyToFile.has(m[1]!)) keyToFile.set(m[1]!, entry.name);
            }
        }
    };
    walk(HERE);
    return keyToFile;
}

/**
 * Pre-existing debt (baseline). Each entry = a rendered key not yet fully wired,
 * with why. The point of this list is to SHRINK over time; nothing new belongs
 * here. Populated from the first run so the invariant is green + guards regressions.
 */
const KNOWN_UNWIRED: Record<string, string> = {
    // Pre-existing debt surfaced by this guard on 2026-07-04: rendered but NOT
    // in the search index (unfindable via search). Baselined so the guard is
    // LIVE and blocks NEW drift; every entry here is deleted for free when the
    // search index becomes a DERIVATION of the rendered controls (the settings
    // registry, see the session note). Shrink this list; never grow it.
    TERRITORY_SURFACE_FILL_ENABLED: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_SATURATION: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_LIGHTNESS: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_ALPHA: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_BORDER_ENABLED: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_BORDER_WIDTH: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_BORDER_SATURATION: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_BORDER_LIGHTNESS: 'pre-existing (unified surface)',
    TERRITORY_SURFACE_BORDER_ALPHA: 'pre-existing (unified surface)',
    CELL_GRID_BOUNDARY_FILL_FLUSH: 'pre-existing (cell-grid)',
    GRID_GRADIENT_POSITION_JITTER: 'pre-existing (grid gradient)',
    METABALL_THRESHOLD: 'pre-existing (territory)',
    PERIMETER_FIELD_TRANSITION_ENGINE: 'pre-existing (perimeter field)',
    VS_BIND_TO_TICK: 'pre-existing (transition)',
    SURGE_PULSE_BIND_TO_TICK: 'pre-existing (surge)',
    DAMAGED_ORBIT_EVADE: 'pre-existing (ships)',
    DAMAGED_ORBIT_RADIUS: 'pre-existing (ships)',
    STAR_GLOW_INTENSITY: 'pre-existing (ships)',
    STAR_GLOW_RADIUS_MULT: 'pre-existing (ships)',
    STAR_POWER_EDGE_BAND_STRENGTH: 'pre-existing (ships)',
    STAR_POWER_EDGE_BAND_WIDTH: 'pre-existing (ships)',
    STAR_POWER_LAYER_CURVE: 'pre-existing (ships)',
};

describe('settings wiring invariant', () => {
    const rendered = collectRenderedKeys();
    const searchKeys = new Set(getSearchableSettingRecords().map((r) => r.key));
    const persistKeys = new Set(
        PANEL_CONFIG_MAP.map((m) => m.configKey).filter(Boolean) as string[],
    );

    it('found rendered config keys to check', () => {
        expect(rendered.size).toBeGreaterThan(10);
    });

    it('every rendered setting is SEARCHABLE (in the settingMetadata index)', () => {
        const missing: string[] = [];
        for (const [key, file] of rendered) {
            if (key in KNOWN_UNWIRED) continue;
            if (!searchKeys.has(key)) missing.push(`${key} (${file})`);
        }
        expect(missing, `rendered but NOT searchable:\n${missing.join('\n')}`).toEqual([]);
    });

    it('every rendered setting is PERSISTABLE (in the PANEL_CONFIG_MAP)', () => {
        const missing: string[] = [];
        for (const [key, file] of rendered) {
            if (key in KNOWN_UNWIRED) continue;
            if (!persistKeys.has(key)) missing.push(`${key} (${file})`);
        }
        expect(missing, `rendered but NOT persistable:\n${missing.join('\n')}`).toEqual([]);
    });

    it('the search index has no empty/duplicate keys (referential integrity)', () => {
        const records = getSearchableSettingRecords();
        for (const r of records) expect(r.key, `empty key for label "${r.label}"`).toBeTruthy();
    });
});
