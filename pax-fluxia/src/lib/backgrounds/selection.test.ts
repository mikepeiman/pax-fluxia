import { describe, expect, it } from 'vitest';
import {
    getSupportedBackgroundModeIdsForRenderMode,
    isBackgroundModeSupportedForRenderMode,
} from './catalog';
import {
    buildBackgroundChangeDetail,
    buildLegacyImageSelection,
    extractLegacyBackgroundImage,
    normalizeBackgroundSelection,
} from './selection';

describe('background selection helpers', () => {
    it('migrates a legacy string into legacy_image mode', () => {
        const selection = normalizeBackgroundSelection('pax-fluxia-bg-25.jpg', {
            surface: 'game',
        });

        expect(selection.modeId).toBe('legacy_image');
        expect(selection.legacyImage).toBe('pax-fluxia-bg-25.jpg');
        expect(selection.tunables).toEqual({});
    });

    it('drops unsupported menu modes back to the primary menu default', () => {
        const selection = normalizeBackgroundSelection(
            { modeId: 'storm_current', tunables: { chargeDensity: 1 } },
            { surface: 'menu' },
        );

        expect(selection.modeId).toBe('nebula_veil');
    });

    it('normalizes tunables for a supported primary mode', () => {
        const selection = normalizeBackgroundSelection(
            {
                modeId: 'nebula_veil',
                tunables: {
                    intensity: 99,
                    density: 0.7,
                },
            },
            { surface: 'menu' },
        );

        expect(selection.modeId).toBe('nebula_veil');
        expect(selection.tunables.intensity).toBe(24);
        expect(selection.tunables.density).toBe(0.7);
        expect(selection.tunables.driftSpeed).toBeTypeOf('number');
    });

    it('builds change details with a compatibility image payload', () => {
        const detail = buildBackgroundChangeDetail(
            buildLegacyImageSelection('/assets/pax-fluxia-bg-25.jpg'),
            'game',
        );

        expect(detail.surface).toBe('game');
        expect(detail.selection.modeId).toBe('legacy_image');
        expect(detail.legacyImage).toBe('pax-fluxia-bg-25.jpg');
        expect(
            extractLegacyBackgroundImage(detail.selection, 'nebula-bg.png'),
        ).toBe('pax-fluxia-bg-25.jpg');
    });

    it('exposes full live-mode support only on the maintained gameplay runtimes', () => {
        expect(
            getSupportedBackgroundModeIdsForRenderMode(
                'power_voronoi_canonical',
            ),
        ).toContain('storm_current');
        expect(
            getSupportedBackgroundModeIdsForRenderMode(
                'metaball_grid_phase_edges',
            ),
        ).toContain('nebula_veil');
        expect(
            getSupportedBackgroundModeIdsForRenderMode(
                'metaball_grid_phase_field',
            ),
        ).toContain('ember_kingdom');
        expect(
            getSupportedBackgroundModeIdsForRenderMode('distance_field'),
        ).toEqual([]);
    });

    it('always permits legacy_image and rejects out-of-scope territory runtimes', () => {
        expect(
            isBackgroundModeSupportedForRenderMode('graph', 'legacy_image'),
        ).toBe(true);
        expect(
            isBackgroundModeSupportedForRenderMode(
                'distance_field',
                'banner_light',
            ),
        ).toBe(false);
        expect(
            isBackgroundModeSupportedForRenderMode(
                'territory_engine',
                'nebula_veil',
            ),
        ).toBe(false);
        expect(
            isBackgroundModeSupportedForRenderMode(
                'metaball_grid_ember_lattice',
                'storm_current',
            ),
        ).toBe(true);
    });
});
