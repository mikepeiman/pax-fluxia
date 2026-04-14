import { describe, expect, it } from 'vitest';
import {
    METABALL_BURST_BOUNDARY_BASIS_OPTIONS,
    coerceVsTransitionModeForRenderMode,
    getTransitionModeOptionsForRenderMode,
} from './territoryTransitionModes';

describe('territoryTransitionModes', () => {
    it('coerces metaball transition mode to lane push when a legacy mode is persisted', () => {
        expect(
            coerceVsTransitionModeForRenderMode('metaball', 'no_loser'),
        ).toBe('metaball_lane_push');
    });

    it('coerces legacy renderers back to no_loser when a metaball mode is persisted', () => {
        expect(
            coerceVsTransitionModeForRenderMode(
                'power_voronoi',
                'metaball_six_slice_burst',
            ),
        ).toBe('no_loser');
    });

    it('returns metaball-only options for the metaball renderer', () => {
        expect(
            getTransitionModeOptionsForRenderMode('metaball').map(
                (option) => option.id,
            ),
        ).toEqual([
            'metaball_lane_push',
            'metaball_hold_then_switch',
            'metaball_six_slice_burst',
        ]);
    });

    it('exports all requested burst boundary basis options', () => {
        expect(METABALL_BURST_BOUNDARY_BASIS_OPTIONS.map((option) => option.id)).toEqual(
            ['t0_region_contour', 'per_ray_contour_hits', 'approximate_radius'],
        );
    });
});
