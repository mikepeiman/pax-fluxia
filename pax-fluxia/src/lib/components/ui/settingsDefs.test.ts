import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ANIM_SLIDERS, LOG_CATEGORIES, PANEL_CONFIG_MAP, CONFIG_TO_PANEL_KEY, derivePanelKey } from './settingsDefs';
import { logFlags } from '$lib/utils/logger';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_DIR = path.join(THIS_DIR, 'settings');
const GAME_CONFIG_PATH = path.join(THIS_DIR, '..', '..', 'config', 'game.config.ts');

function walkSvelteFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walkSvelteFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.svelte') ? [fullPath] : [];
    });
}

describe('settingsDefs', () => {
    it('every ANIM_SLIDER configKey has a panel mapping in CONFIG_TO_PANEL_KEY', () => {
        const unmapped = ANIM_SLIDERS.filter(s => !CONFIG_TO_PANEL_KEY[s.key]);
        expect(unmapped.map(s => s.key)).toEqual([]);
    });

    // The Logging section renders one toggle per LOG_CATEGORIES entry, but the
    // logger's own `logFlags` is the real set of channels. Two hand-maintained
    // lists that must agree: they drifted, and `ui` shipped with no toggle at all
    // — a channel the user was told to enable and could not. Totality, both ways.
    it('LOG_CATEGORIES exposes a toggle for EVERY logger channel', () => {
        const toggled = LOG_CATEGORIES.map((c) => c.key).sort();
        const channels = Object.keys(logFlags).sort();
        expect(toggled).toEqual(channels);
    });

    it('LOG_CATEGORIES has no duplicate or unlabelled entries', () => {
        const keys = LOG_CATEGORIES.map((c) => c.key);
        expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
        expect(LOG_CATEGORIES.filter((c) => !c.label.trim() || !c.desc.trim())).toEqual([]);
    });

    it('PANEL_CONFIG_MAP has no duplicate configKeys', () => {
        const keys = PANEL_CONFIG_MAP.map(m => m.configKey);
        const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
        expect(dupes).toEqual([]);
    });

    it('derivePanelKey converts SCREAMING_SNAKE_CASE to camelCase', () => {
        expect(derivePanelKey('TERRITORY_TRANSITION_MS')).toBe('territoryTransitionMs');
        expect(derivePanelKey('ATTACK_SURGE_RAMP_MS')).toBe('attackSurgeRampMs');
        expect(derivePanelKey('BASE_TICK_MS')).toBe('baseTickMs');
        expect(derivePanelKey('DF_ALPHA')).toBe('dfAlpha');
        expect(derivePanelKey('SHOW_HEX_GRID')).toBe('showHexGrid');
        expect(derivePanelKey('METABALL_BURST_BOUNDARY_BASIS')).toBe('metaballBurstBoundaryBasis');
    });

    it('entries without explicit panelKey auto-derive correctly', () => {
        const noExplicit = PANEL_CONFIG_MAP.filter(m => m.panelKey === undefined);
        for (const m of noExplicit) {
            const derived = derivePanelKey(m.configKey);
            expect(CONFIG_TO_PANEL_KEY[m.configKey]).toBe(derived);
        }
    });

    it('theme-critical controls stay wired into the panel mapping', () => {
        expect(CONFIG_TO_PANEL_KEY.BG_IMAGE_ALPHA).toBe('bgImageAlpha');
        expect(CONFIG_TO_PANEL_KEY.FRONTIER_RESOLUTION).toBe('frontierResolution');
        expect(CONFIG_TO_PANEL_KEY.MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS).toBe(
            'mapgenRecomputeConnectivityOnAuthoredMaps',
        );
    });

    it('settings controls do not reference unmapped panel keys', () => {
        const usedPanelKeys = new Set<string>();
        for (const file of walkSvelteFiles(SETTINGS_DIR)) {
            const text = readFileSync(file, 'utf8');
            for (const match of text.matchAll(/\bpanel\.([A-Za-z0-9_]+)/g)) {
                usedPanelKeys.add(match[1]);
            }
        }

        const missing = [...usedPanelKeys].filter((key) => !Object.values(CONFIG_TO_PANEL_KEY).includes(key));
        expect(missing).toEqual([]);
    });

    it('settings controls only reference declared GAME_CONFIG keys', () => {
        const gameConfigSource = readFileSync(GAME_CONFIG_PATH, 'utf8');
        const declaredConfigKeys = new Set(
            [...gameConfigSource.matchAll(/^\s{4}([A-Z_][A-Z0-9_]*)\s*:/gm)].map((match) => match[1]),
        );
        const usedConfigKeys = new Set<string>();

        for (const file of walkSvelteFiles(SETTINGS_DIR)) {
            const text = readFileSync(file, 'utf8');
            for (const match of text.matchAll(/GAME_CONFIG\.([A-Z_][A-Z0-9_]*)/g)) {
                usedConfigKeys.add(match[1]);
            }
        }

        const missing = [...usedConfigKeys].filter((key) => !declaredConfigKeys.has(key)).sort();
        expect(missing).toEqual([]);
    });
});
