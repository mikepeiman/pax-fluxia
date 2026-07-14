import { describe, it, expect } from 'vitest';
import { getSearchableSettingRecords } from './settingMetadata';
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
});
