import { describe, expect, it } from 'vitest';
import { resolveTerritoryArchitectureRoute } from './TerritoryArchitectureRouter';

describe('resolveTerritoryArchitectureRoute', () => {
    it('routes vector style to clean bridge when architecture is clean', () => {
        const decision = resolveTerritoryArchitectureRoute({
            renderMode: 'territory_runtime',
            architecturePath: 'clean',
        });

        expect(decision.route).toBe('runtime_clean_bridge');
        expect(decision.isRuntimeSurfaceStyle).toBe(true);
    });

    it('routes vector style to the clean bridge even when a legacy architecture value is persisted', () => {
        const decision = resolveTerritoryArchitectureRoute({
            renderMode: 'territory_runtime',
            architecturePath: 'legacy',
        });

        expect(decision.route).toBe('runtime_clean_bridge');
        expect(decision.isRuntimeSurfaceStyle).toBe(true);
    });

    it('routes resolved PV mode through the clean bridge regardless of architecture toggle', () => {
        const cleanDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'power_voronoi_runtime',
            architecturePath: 'clean',
        });
        const legacyDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'power_voronoi_runtime',
            architecturePath: 'legacy',
        });

        expect(cleanDecision.route).toBe('runtime_clean_bridge');
        expect(legacyDecision.route).toBe('runtime_clean_bridge');
        expect(cleanDecision.isRuntimeSurfaceStyle).toBe(true);
        expect(legacyDecision.isRuntimeSurfaceStyle).toBe(true);
    });

    it('routes reversed-order style to legacy renderer regardless of architecture toggle', () => {
        const cleanDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'distance_field',
            architecturePath: 'clean',
        });
        const legacyDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'distance_field',
            architecturePath: 'legacy',
        });

        expect(cleanDecision.route).toBe('legacy_style_renderer');
        expect(legacyDecision.route).toBe('legacy_style_renderer');
        expect(cleanDecision.isRuntimeSurfaceStyle).toBe(false);
        expect(legacyDecision.isRuntimeSurfaceStyle).toBe(false);
    });

    it('routes render-family modes through the family renderer route', () => {
        const gridGradientDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'grid_gradient',
            architecturePath: 'clean',
        });
        const metaballGridDecision = resolveTerritoryArchitectureRoute({
            renderMode: 'metaball_grid',
            architecturePath: 'legacy',
        });

        expect(gridGradientDecision.route).toBe('render_family_renderer');
        expect(metaballGridDecision.route).toBe('render_family_renderer');
        expect(gridGradientDecision.isRenderFamilySurfaceStyle).toBe(true);
        expect(metaballGridDecision.isRenderFamilySurfaceStyle).toBe(true);
        expect(gridGradientDecision.isRuntimeSurfaceStyle).toBe(false);
    });

    it('defaults to the runtime clean route for missing values', () => {
        const decision = resolveTerritoryArchitectureRoute({});
        expect(decision.route).toBe('runtime_clean_bridge');
    });
});
