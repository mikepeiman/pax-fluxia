import { describe, expect, it } from 'vitest';
import {
    patchTouchesLaneTopology,
    resolveEffectiveLaneMarginPx,
} from './laneMargin';

describe('resolveEffectiveLaneMarginPx', () => {
    it('defaults to inactive lane margin', () => {
        expect(resolveEffectiveLaneMarginPx({})).toBe(0);
    });

    it('uses dedicated lane margin when enabled', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: true,
                MAPGEN_LANE_MARGIN_PX: 88,
            }),
        ).toBe(88);
    });

    it('returns zero when lane margin is disabled', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: false,
                MAPGEN_LANE_MARGIN_PX: 88,
            }),
        ).toBe(0);
    });

    it('clamps negative values to zero', () => {
        expect(
            resolveEffectiveLaneMarginPx({
                MAPGEN_LANE_MARGIN_ENABLED: true,
                MAPGEN_LANE_MARGIN_PX: -12,
            }),
        ).toBe(0);
    });
});

describe('patchTouchesLaneTopology', () => {
    const current = {
        MAPGEN_LANE_MARGIN_ENABLED: true,
        MAPGEN_LANE_MARGIN_PX: 75,
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

    it('does not rebuild lane topology for MSR-only changes', () => {
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
        ).toBe(false);
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
