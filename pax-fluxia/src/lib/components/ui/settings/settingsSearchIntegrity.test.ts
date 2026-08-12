import { describe, it, expect } from 'vitest';
import { getSearchableSettingRecords } from './settingMetadata';
import { SETTINGS_CONTROLS } from './settingsControlRegistry';
import { searchSettings } from './settingsSearch';
import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * TOTALITY GUARD for the settings search index.
 *
 * Every searchable record promises the user a destination. If its key is not a
 * real GAME_CONFIG key, the search hit navigates to a control that does not
 * exist — the user searches, clicks, and lands on nothing. This drifts silently
 * because the index is a hand-written label→key map that the type checker cannot
 * relate to GameConfigType (the keys are string literals).
 *
 * It HAD drifted: 30 entries pointed at keys deleted with their renderers,
 * plus two (TERRITORY_MIN_DOMINANCE, MAPGEN_RECOMPUTE_CONNECTIVITY_ON_AUTHORED_MAPS)
 * that predated the cleanup campaign entirely.
 *
 * `local.*` keys are exempt by design: they address runtime state (log flags,
 * palette editors) that never lived in GAME_CONFIG.
 */
describe('settings search index integrity', () => {
    const records = getSearchableSettingRecords();
    const configKeys = new Set(Object.keys(GAME_CONFIG as unknown as Record<string, unknown>));
    const isLocal = (key: string) => key.startsWith('local.');

    it('every searchable record resolves to a real GAME_CONFIG key', () => {
        const orphans = records
            .filter((r) => !isLocal(r.key) && !configKeys.has(r.key))
            .map((r) => `${r.key}  ("${r.label}", scope=${r.scope})`);

        expect(
            orphans,
            `search entries whose config key does not exist — each is a hit that navigates to nothing:\n${orphans.join('\n')}`,
        ).toEqual([]);
    });

    it('no searchable record is unlabelled', () => {
        expect(records.filter((r) => !r.label.trim())).toEqual([]);
    });

    it('indexes the render mode — the marquee territory setting', () => {
        // Guards against the assertions above passing vacuously on an empty index,
        // and pins a real gap: TERRITORY_RENDER_MODE had NO entry, so searching
        // "render mode" found nothing, even though settingsSearch carried an
        // isTerritoryRenderModeRecord() classifier expecting exactly that key.
        expect(records.length).toBeGreaterThan(50);
        expect(records.some((r) => r.key === 'TERRITORY_RENDER_MODE')).toBe(true);
    });

    /**
     * `aliases` exist so a control is findable by a word that is deliberately NOT
     * in its visible label — "msr" for Minimum Star Margin, "backdrop" for
     * Background Asset. They were inert: the registry computed them into a
     * searchText the search never used, so every alias in the registry was
     * decoration and "msr" returned unrelated fuzzy hits.
     */
    it('every alias actually finds its own control', () => {
        const misses: string[] = [];
        for (const control of SETTINGS_CONTROLS) {
            for (const alias of control.aliases ?? []) {
                // Generous limit: a word shared by a whole family ("chaikin")
                // must not fail merely because 24 slots ran out.
                const hits = searchSettings(alias, 200);
                if (!hits.some((hit) => hit.configKey === control.configKey)) {
                    misses.push(`${control.configKey} <- "${alias}"`);
                }
            }
        }
        expect(
            misses,
            `aliases that do not reach their control — the field promises findability it does not deliver:\n${misses.join('\n')}`,
        ).toEqual([]);
    });
});
