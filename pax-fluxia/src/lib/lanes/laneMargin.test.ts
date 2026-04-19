import { describe, expect, it } from 'vitest';
import {
    patchTouchesLaneTopology,
    resolveEffectiveLaneMarginPx,
} from './laneMargin';

describe('resolveEffectiveLaneMarginPx', () => {
    it('uses dedicated lane margin when enabled', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: true,
                MAPGEN_LANE_MARGIN_PX: 88,
                MODIFIED_VORONOI_STAR_MARGIN: 45,
            }),
        ).toBe(88);
    });

    it('falls back to MSR when dedicated lane margin is disabled', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: false,
                MAPGEN_LANE_MARGIN_PX: 88,
                MODIFIED_VORONOI_STAR_MARGIN: 52,
            }),
        ).toBe(52);
    });

    it('clamps negative values to zero', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: false,
                MODIFIED_VORONOI_STAR_MARGIN: -12,
            }),
        ).toBe(0);
    });
});

describe('patchTouchesLaneTopology', () => {
    const current = {
        MAPGEN_LANE_MARGIN_ENABLED: true,
        MAPGEN_LANE_MARGIN_PX: 75,
        MODIFIED_VORONOI_STAR_MARGIN: 45,
    };

    it('rebuilds for direct lane-topology keys', () => {
        expect(
            patchTouchesLaneTopology(
                { MAPGEN_LANE_MARGIN_PX: 90 },
                current,
            ),
        ).toBe(true);
        expect(
            patchTouchesLaneTopology(
                { MAPGEN_LANE_MARGIN_ENABLED: false },
                current,
            ),
        ).toBe(true);
        expect(
            patchTouchesLaneTopology(
                { MAPGEN_LANE_CURVE_VS_PRUNE_BIAS: 0.75 },
                current,
            ),
        ).toBe(true);
    });

    it('rebuilds for MSR only when LM fallback is active', () => {
        expect(
            patchTouchesLaneTopology(
                { MODIFIED_VORONOI_STAR_MARGIN: 60 },
                current,
            ),
        ).toBe(false);
        expect(
            patchTouchesLaneTopology(
                { MODIFIED_VORONOI_STAR_MARGIN: 60 },
                { ...current, MAPGEN_LANE_MARGIN_ENABLED: false },
            ),
        ).toBe(true);
        expect(
            patchTouchesLaneTopology(
                {
                    MAPGEN_LANE_MARGIN_ENABLED: false,
                    MODIFIED_VORONOI_STAR_MARGIN: 60,
                },
                current,
            ),
        ).toBe(true);
    });
});
