import { describe, it, expect } from 'vitest';
import {
    buildConfigMarkdown,
    parseConfigImport,
    CONFIG_EXPORT_SECTIONS,
    clearResettableSettingsStorage,
} from './configTransfer';

const EXISTING = {
    TRANSFER_RATE: 0.1,
    BASE_PRODUCTION: 2,
    NEUTRAL_TERRITORY_TRANSPARENT: true,
    TERRITORY_RENDER_MODE: 'power_vector',
};

describe('parseConfigImport — the typed merge', () => {
    it('accepts keys whose value type matches the live config', () => {
        const result = parseConfigImport(
            JSON.stringify({
                TRANSFER_RATE: 0.25,
                NEUTRAL_TERRITORY_TRANSPARENT: false,
                TERRITORY_RENDER_MODE: 'phase_edges',
            }),
            EXISTING,
        );
        expect(result).toEqual({
            ok: true,
            patch: {
                TRANSFER_RATE: 0.25,
                NEUTRAL_TERRITORY_TRANSPARENT: false,
                TERRITORY_RENDER_MODE: 'phase_edges',
            },
            applied: 3,
            skipped: 0,
            typeErrors: 0,
        });
    });

    it('skips unknown keys instead of failing the import', () => {
        const result = parseConfigImport(
            JSON.stringify({ NOT_A_KEY: 1, TRANSFER_RATE: 0.2 }),
            EXISTING,
        );
        expect(result.ok && result.applied).toBe(1);
        expect(result.ok && result.skipped).toBe(1);
        expect(result.ok && result.patch).toEqual({ TRANSFER_RATE: 0.2 });
    });

    it('counts type mismatches without applying them', () => {
        const result = parseConfigImport(
            JSON.stringify({ TRANSFER_RATE: 'fast', BASE_PRODUCTION: true }),
            EXISTING,
        );
        expect(result.ok && result.typeErrors).toBe(2);
        expect(result.ok && result.patch).toEqual({});
    });

    it('rejects non-finite numbers (null becomes NaN nowhere — JSON has no NaN, but null is not a number)', () => {
        // JSON cannot encode NaN/Infinity directly; null against a number key
        // is a type error, and a string "Infinity" is a type error too.
        const result = parseConfigImport(
            JSON.stringify({ TRANSFER_RATE: null, BASE_PRODUCTION: 'Infinity' }),
            EXISTING,
        );
        expect(result.ok && result.typeErrors).toBe(2);
    });

    it('rejects malformed JSON with a parse error', () => {
        const result = parseConfigImport('{ not json', EXISTING);
        expect(result).toEqual({
            ok: false,
            error: 'Invalid JSON - could not parse file',
        });
    });

    it('rejects arrays and primitives at the top level', () => {
        for (const raw of ['[1,2]', '42', '"config"', 'null']) {
            const result = parseConfigImport(raw, EXISTING);
            expect(result.ok, raw).toBe(false);
        }
    });
});

describe('clearResettableSettingsStorage', () => {
    function createStorage(entries: Record<string, string>): Storage {
        const data = new Map(Object.entries(entries));
        return {
            get length() {
                return data.size;
            },
            clear: () => data.clear(),
            getItem: (key) => data.get(key) ?? null,
            key: (index) => Array.from(data.keys())[index] ?? null,
            removeItem: (key) => void data.delete(key),
            setItem: (key, value) => void data.set(key, String(value)),
        };
    }

    it('preserves saved maps, games, gameplay presets, and map-editor content byte-for-byte', () => {
        const protectedEntries = {
            pax_savedMaps: '{"map":"exact bytes"}',
            pax_savedGames: '{"game":"exact bytes"}',
            'pax-game-themes': '[{"name":"user preset"}]',
            pax_composedThemes: '[{"name":"composed"}]',
            pax_categoryThemes_visuals: '[{"name":"category"}]',
            pax_starredThemes_visuals: '["category"]',
            pax_themePresets: '[{"name":"legacy preset"}]',
            'pax-map-editor-autosaves-v1': '[{"revision":1}]',
            'pax-map-editor-recent-v1': '["map-a"]',
        };
        const storage = createStorage({
            ...protectedEntries,
            'pax-ui-theme-id': 'cyber-flux',
            'pax-fluxia-panel-settings': '{"tickInterval":500}',
            'pax-sidebar-width': '520',
            unrelated_app_key: 'untouched',
        });

        clearResettableSettingsStorage(storage);

        for (const [key, value] of Object.entries(protectedEntries)) {
            expect(storage.getItem(key), key).toBe(value);
        }
        expect(storage.getItem('unrelated_app_key')).toBe('untouched');
    });

    it('removes Pax settings and UI preferences without touching unrelated storage', () => {
        const storage = createStorage({
            'pax-ui-theme-id': 'cyber-flux',
            'pax-fluxia-panel-settings': '{"tickInterval":500}',
            'pax-sidebar-width': '520',
            PAX_LEGACY_SETTING: '1',
            unrelated_app_key: 'untouched',
        });

        const result = clearResettableSettingsStorage(storage);

        expect(result.removedKeys).toEqual([
            'PAX_LEGACY_SETTING',
            'pax-fluxia-panel-settings',
            'pax-sidebar-width',
            'pax-ui-theme-id',
        ]);
        expect(storage.getItem('unrelated_app_key')).toBe('untouched');
    });
});

describe('buildConfigMarkdown', () => {
    const cfg = {
        TRANSFER_RATE: 0.1,
        BASE_PRODUCTION: 2,
        SOME_UNGROUPED_KEY: 'x',
    };

    it('groups known keys under their curated section', () => {
        const md = buildConfigMarkdown(cfg, new Date('2026-07-14T12:00:00Z'));
        expect(md).toContain('## Transfer');
        expect(md).toContain('| `TRANSFER_RATE` | 0.1 |');
    });

    it('collects everything else under Other, so no key is silently dropped', () => {
        const md = buildConfigMarkdown(cfg);
        expect(md).toContain('## Other');
        expect(md).toContain('| `SOME_UNGROUPED_KEY` | x |');
    });

    it('omits the Other section when every key is grouped', () => {
        const md = buildConfigMarkdown({ TRANSFER_RATE: 0.1 });
        expect(md).not.toContain('## Other');
    });

    it('stamps the export time', () => {
        const md = buildConfigMarkdown({}, new Date('2026-07-14T12:00:00Z'));
        expect(md).toContain('2026-07-14T12:00:00.000Z');
    });

    it('section table has no duplicate keys across sections', () => {
        const all = Object.values(CONFIG_EXPORT_SECTIONS).flat();
        expect(new Set(all).size).toBe(all.length);
    });
});
