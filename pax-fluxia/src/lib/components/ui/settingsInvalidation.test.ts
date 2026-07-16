import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    RESOLVED_PANEL_CONFIG_MAP,
    isTerritoryVisualKey,
    resolveInvalidations,
    resolveInvalidationsForKeys,
} from './settingsDefs';

/**
 * "Which renderers care about this setting" is data on the settings registry.
 * It used to be a `||` ladder of key prefixes written inline at the one call
 * site that needed it (GameSettingsPanel.applyConfigPatch), with a second,
 * already-divergent copy in settingsState. These tests exist because that
 * ladder rotted silently: nothing failed when a whole config family was added
 * and nobody remembered to extend it.
 */
describe('resolveInvalidations — territory families', () => {
    it('wakes the territory renderers for the cell-grid family (the ladder did NOT)', () => {
        // The regression that motivated this: CELL_GRID_* keys existed and were
        // absent from the ladder, so a theme or config import that tuned them
        // never repainted. Live edits masked it — ControlsSection-Territory's
        // write path bumps unconditionally.
        expect(resolveInvalidations('CELL_GRID_SPACING_PX')).toContain('territory');
    });

    it('wakes the territory renderers for the grid-gradient family (the ladder did NOT)', () => {
        expect(resolveInvalidations('GRID_GRADIENT_DEBUG_TRANSITIONS')).toContain(
            'territory',
        );
    });

    it('covers every territory-visual config key that exists today', () => {
        const uncovered = Object.keys(GAME_CONFIG as unknown as Record<string, unknown>)
            .filter((key) => isTerritoryVisualKey(key))
            .filter((key) => !resolveInvalidations(key).includes('territory'));

        expect(uncovered).toEqual([]);
    });

    it('does not invalidate anything for an ordinary non-visual setting', () => {
        expect(resolveInvalidations('BASE_TICK_MS')).toEqual([]);
        expect(resolveInvalidations('LETHALITY')).toEqual([]);
    });
});

describe('resolveInvalidations — background', () => {
    it('reloads the image and repaints territory for BG_IMAGE_URL', () => {
        const domains = resolveInvalidations('BG_IMAGE_URL');
        expect(domains).toContain('background');
        expect(domains).toContain('territory');
    });

    it('re-applies opacity and repaints territory for BG_IMAGE_ALPHA', () => {
        const domains = resolveInvalidations('BG_IMAGE_ALPHA');
        expect(domains).toContain('backgroundAlpha');
        expect(domains).toContain('territory');
    });

    it('treats MIN_COLOR_LIGHTNESS as territory-visual despite its prefix-less name', () => {
        expect(resolveInvalidations('MIN_COLOR_LIGHTNESS')).toContain('territory');
    });
});

describe('resolveInvalidationsForKeys — the patch path', () => {
    it('unions every domain a patch touches', () => {
        const domains = resolveInvalidationsForKeys([
            'BASE_TICK_MS',
            'BG_IMAGE_URL',
            'TERRITORY_SURFACE_ALPHA',
        ]);

        expect([...domains].sort()).toEqual(['background', 'territory']);
    });

    it('invalidates for keys that are NOT in PANEL_CONFIG_MAP', () => {
        // A config import can carry any key. Resolution derives from the key
        // itself rather than looking it up, so unmapped keys still repaint.
        const mapped = new Set(RESOLVED_PANEL_CONFIG_MAP.map((m) => m.configKey));
        expect(mapped.has('TERRITORY_MSR_STAR_POWER_MODE')).toBe(false);

        expect(
            resolveInvalidationsForKeys(['TERRITORY_MSR_STAR_POWER_MODE']).has(
                'territory',
            ),
        ).toBe(true);
    });

    it('is empty for a patch that touches nothing visual', () => {
        expect(resolveInvalidationsForKeys(['BASE_TICK_MS', 'LETHALITY']).size).toBe(0);
    });
});
