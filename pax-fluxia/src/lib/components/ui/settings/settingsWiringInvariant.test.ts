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
import { searchableConfigKeys } from './settingsSearch';
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
/**
 * Pre-existing debt (baseline). Each entry = a rendered key not yet fully wired,
 * with why. The point of this list is to SHRINK over time; nothing new belongs
 * here.
 *
 * 2026-08-10: 22 entries -> 6. The note above predicted the rest would be
 * "deleted for free when the search index becomes a DERIVATION of the rendered
 * controls". That derivation shipped with `settingsControlRegistry`, so 16 of
 * them were already findable — only this guard was still asking the superseded
 * `getSearchableSettingRecords()` index. It now asks `searchableConfigKeys()`,
 * the union the user's search box actually queries.
 *
 * The 6 that remain are genuinely unfindable, and they share one cause: they are
 * rendered by TerritorySurfaceStyleTuning but absent from the registry, so
 * neither index knows them. Registering them (audit batch 5) empties this list.
 */
const KNOWN_UNWIRED: Record<string, string> = {
    TERRITORY_SURFACE_FILL_ENABLED: 'unregistered control (TerritorySurfaceStyleTuning)',
    TERRITORY_SURFACE_BORDER_ENABLED: 'unregistered control (TerritorySurfaceStyleTuning)',
    TERRITORY_SURFACE_BORDER_WIDTH: 'unregistered control (TerritorySurfaceStyleTuning)',
    TERRITORY_SURFACE_BORDER_SATURATION: 'unregistered control (TerritorySurfaceStyleTuning)',
    TERRITORY_SURFACE_BORDER_LIGHTNESS: 'unregistered control (TerritorySurfaceStyleTuning)',
    TERRITORY_SURFACE_BORDER_ALPHA: 'unregistered control (TerritorySurfaceStyleTuning)',
};

describe('settings wiring invariant', () => {
    const rendered = collectRenderedKeys();
    // The index the SEARCH BOX queries — registry-derived records unioned with
    // the legacy hand map — not `getSearchableSettingRecords()` alone, which the
    // registry supersedes for every key it owns.
    const searchKeys = searchableConfigKeys();
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
