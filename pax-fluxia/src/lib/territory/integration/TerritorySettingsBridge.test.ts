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

        expect(settings.selection.fillTransitionMode).toBe('frontier_morph');
        expect(settings.selection.borderTransitionMode).toBe('rope_morph');
    });

    it('maps render-mode aliases to clean style ids', () => {
        const canonical = readTerritoryRuntimeSettings({
            TERRITORY_RENDER_MODE: 'territory_canonical',
        });
        const distanceField = readTerritoryRuntimeSettings({
            TERRITORY_STYLE_MODE: 'distance_field',
        });
        const pixel = readTerritoryRuntimeSettings({
            TERRITORY_STYLE_MODE: 'pixel',
        });

        expect(canonical.selection.styleMode).toBe('canonical');
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
            starMargin: 45,
            corridorEnabled: true,
            corridorSpacing: 60,
            corridorCount: 0,
            corridorWeight: 0.5,
            disconnectEnabled: false,
            disconnectDistance: 400,
            disconnectWeight: 0.3,
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
});
