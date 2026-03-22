import { describe, expect, it } from 'vitest';
import { readTerritoryRuntimeSettings } from './TerritorySettingsBridge';

describe('readTerritoryRuntimeSettings', () => {
    it('maps legacy geometry aliases to clean geometry mode ids', () => {
        const frontier = readTerritoryRuntimeSettings({
            TERRITORY_GEOMETRY_MODE: 'new_frontiers_0319',
        });
        const seedGraph = readTerritoryRuntimeSettings({
            TERRITORY_GEOMETRY_MODE: 'unified_polygon',
        });
        const powerVoronoi = readTerritoryRuntimeSettings({
            TERRITORY_GEOMETRY_MODE: 'power_voronoi',
        });

        expect(frontier.selection.geometryMode).toBe('boundary_aware_frontier');
        expect(seedGraph.selection.geometryMode).toBe('seed_graph');
        expect(powerVoronoi.selection.geometryMode).toBe('power_voronoi');
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
        });

        const fallback = readTerritoryRuntimeSettings({});
        expect(fallback.tunables.transitionDurationMs).toBe(600);
        expect(fallback.tunables.borderWidth).toBe(2);
    });
});
