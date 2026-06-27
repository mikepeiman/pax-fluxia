import { describe, expect, it } from 'vitest';
import { readTerritoryRuntimeSettings } from './TerritorySettingsBridge';

describe('readTerritoryRuntimeSettings', () => {
    it('normalizes legacy geometry keys to unified_vector', () => {
        for (const mode of ['new_frontiers_0319', 'unified_polygon', 'power_voronoi'] as const) {
            const snap = readTerritoryRuntimeSettings({ TERRITORY_GEOMETRY_MODE: mode });
            expect(snap.selection.geometryMode).toBe('unified_vector');
        }
    });

    it('maps legacy fill and border transition keys to clean transition ids', () => {
        const settings = readTerritoryRuntimeSettings({
            TERRITORY_FILL_MODE: 'frontier',
            TERRITORY_BORDER_TRANSITION: 'pixi_mesh_rope',
        });

        expect(settings.selection.fillTransitionMode).toBe('active_front');
        expect(settings.selection.borderTransitionMode).toBe('rope_morph');
    });

    it('preserves resolved PV geometry and fill transition ids when configured directly', () => {
        const settings = readTerritoryRuntimeSettings({
            TERRITORY_GEOMETRY_MODE: 'resolved_power_voronoi',
            TERRITORY_FILL_TRANSITION_MODE: 'pv_frontline',
        });

        expect(settings.selection.geometryMode).toBe('resolved_power_voronoi');
        expect(settings.selection.fillTransitionMode).toBe('pv_frontline');
    });

    it('preserves the power-core candidate mode when configured directly', () => {
        const settings = readTerritoryRuntimeSettings({
            TERRITORY_GEOMETRY_MODE: 'power_core_candidate',
        });

        expect(settings.selection.geometryMode).toBe('power_core_candidate');
    });

    it('maps render-mode aliases to clean style ids', () => {
        const vector = readTerritoryRuntimeSettings({
            TERRITORY_RENDER_MODE: 'territory_runtime',
        });
        const distanceField = readTerritoryRuntimeSettings({
            TERRITORY_STYLE_MODE: 'distance_field',
        });
        const pixel = readTerritoryRuntimeSettings({
            TERRITORY_STYLE_MODE: 'pixel',
        });

        expect(vector.selection.styleMode).toBe('vector');
        expect(distanceField.selection.styleMode).toBe('distance_field');
        expect(pixel.selection.styleMode).toBe('pixel');
    });

    it('reads tunables from config and falls back safely', () => {
        const configured = readTerritoryRuntimeSettings({
            TERRITORY_TRANSITION_MS: 720,
            VORONOI_BORDER_WIDTH: 3.5,
            VORONOI_ALPHA: 0.31,
            VORONOI_BORDER_ALPHA: 0.78,
            VORONOI_BORDER_SMOOTH: 4,
            FRONTIER_RESOLUTION: 12,
            CHAIKIN_BOUNDARY_PAD: 44,
            CHAIKIN_BOUNDARY_EPS: 8,
            MODIFIED_VORONOI_STAR_MARGIN: 75,
        });

        expect(configured.tunables).toEqual({
            transitionDurationMs: 720,
            borderWidth: 3.5,
            fillAlpha: 0.31,
            borderAlpha: 0.78,
            geometrySmoothingPasses: 4,
            frontierResolution: 12,
            boundaryPad: 44,
            boundaryEps: 8,
            starCoreGuardRadius: 20,
            starMargin: 75,
            msrStarBias: 0,
            corridorEnabled: true,
            corridorSpacing: 10,
            corridorCount: 0,
            corridorWeight: 0.5,
            cxContestMidpointVstars: true,
            cxContestPairCount: 1,
            cxContestPairWeight: 0.5,
            cxContestPairSpacing: 75,
            disconnectEnabled: true,
            disconnectDistance: 295,
            disconnectWeight: 3,
            clusterSplitThreshold: 0,
        });

        const fallback = readTerritoryRuntimeSettings({});
        expect(fallback.tunables.transitionDurationMs).toBe(600);
        expect(fallback.tunables.borderWidth).toBe(2);
    });

    it('uses tick duration for transition when TERRITORY_TRANSITION_BIND_TO_TICK is true', () => {
        const bound = readTerritoryRuntimeSettings({
            TERRITORY_TRANSITION_BIND_TO_TICK: true,
            BASE_TICK_MS: 2000,
            TERRITORY_TRANSITION_MS: 400,
        });
        expect(bound.tunables.transitionDurationMs).toBe(2000);
    });

    it('prefers speed-adjusted tick duration for tick-bound transitions', () => {
        const bound = readTerritoryRuntimeSettings(
            {
                TERRITORY_TRANSITION_BIND_TO_TICK: true,
                BASE_TICK_MS: 2000,
                TERRITORY_TRANSITION_MS: 400,
            },
            500,
        );

        expect(bound.tunables.transitionDurationMs).toBe(500);
    });

    it('preserves surfaced topology maxima as real runtime geometry values', () => {
        const settings = readTerritoryRuntimeSettings({
            FRONTIER_RESOLUTION: 32,
            TERRITORY_MSR_STAR_BIAS: 2,
            TERRITORY_CX_COUNT: 20,
            TERRITORY_CX_WEIGHT: 2,
            TERRITORY_CX_CONTEST_PAIR_WEIGHT: 2,
            TERRITORY_CX_CONTEST_PAIR_SPACING: 500,
            TERRITORY_DX_WEIGHT: 5,
        });

        expect(settings.tunables.frontierResolution).toBe(32);
        expect(settings.tunables.msrStarBias).toBe(2);
        expect(settings.tunables.corridorCount).toBe(20);
        expect(settings.tunables.corridorWeight).toBe(2);
        expect(settings.tunables.cxContestPairWeight).toBe(2);
        expect(settings.tunables.cxContestPairSpacing).toBe(500);
        expect(settings.tunables.disconnectWeight).toBe(5);
    });

    it('derives normalized star bias from legacy saved star-power settings when needed', () => {
        const settings = readTerritoryRuntimeSettings({
            TERRITORY_MSR_STAR_POWER_ENABLED: true,
            TERRITORY_MSR_STAR_POWER_MODE: 'linear',
            TERRITORY_MSR_STAR_POWER_GAIN: 0.5,
            TERRITORY_MSR_STAR_POWER_EXPONENT: 2,
            TERRITORY_MSR_STAR_POWER_CAP_PX: 500,
        });

        expect(settings.tunables.msrStarBias).toBeGreaterThan(0);
        expect(settings.tunables.msrStarBias).toBeLessThanOrEqual(2);
    });
});
