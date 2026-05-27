import { describe, expect, it } from 'vitest';
import { buildTerritoryConfigFingerprint } from './buildTerritoryConfigFingerprint';

describe('buildTerritoryConfigFingerprint', () => {
    it('changes when perimeter-field geometry-driving keys change', () => {
        const base = {
            TERRITORY_RENDER_MODE: 'perimeter_field',
            PERIMETER_FIELD_GEOMETRY_SOURCE: 'power_voronoi_0319',
            FRONTIER_RESOLUTION: 5,
            CHAIKIN_BOUNDARY_PAD: 50,
            CHAIKIN_BOUNDARY_EPS: 6,
            TERRITORY_FILL_MODE: 'frontier',
            TERRITORY_FILL_TRANSITION_MODE: 'topology_fill_rebuild',
            TERRITORY_BORDER_TRANSITION_MODE: 'optimal_transport',
            TERRITORY_STYLE_MODE: 'vector',
        };

        const baseFp = buildTerritoryConfigFingerprint(base, {
            geometryRefreshToken: 0,
            visualEpoch: 0,
        });

        expect(
            buildTerritoryConfigFingerprint(
                { ...base, FRONTIER_RESOLUTION: 15 },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                { ...base, CHAIKIN_BOUNDARY_PAD: 88 },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                {
                    ...base,
                    PERIMETER_FIELD_GEOMETRY_SOURCE: 'resolved_vector',
                },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                { ...base, TERRITORY_FILL_MODE: 'body' },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                {
                    ...base,
                    TERRITORY_FILL_TRANSITION_MODE: 'legacy_fill_active_front',
                },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                {
                    ...base,
                    TERRITORY_BORDER_TRANSITION_MODE: 'none',
                },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
        expect(
            buildTerritoryConfigFingerprint(
                { ...base, TERRITORY_STYLE_MODE: 'legacy' },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).not.toBe(baseFp);
    });

    it('ignores unrelated config keys', () => {
        const base = buildTerritoryConfigFingerprint(
            {
                TERRITORY_RENDER_MODE: 'perimeter_field',
                FRONTIER_RESOLUTION: 5,
                SHIP_BASE_SIZE: 2.6,
            },
            { geometryRefreshToken: 0, visualEpoch: 0 },
        );

        expect(
            buildTerritoryConfigFingerprint(
                {
                    TERRITORY_RENDER_MODE: 'perimeter_field',
                    FRONTIER_RESOLUTION: 5,
                    SHIP_BASE_SIZE: 9.9,
                },
                { geometryRefreshToken: 0, visualEpoch: 0 },
            ),
        ).toBe(base);
    });

    it('includes runtime invalidation tokens', () => {
        const baseConfig = {
            TERRITORY_RENDER_MODE: 'perimeter_field',
            FRONTIER_RESOLUTION: 5,
        };

        const base = buildTerritoryConfigFingerprint(baseConfig, {
            geometryRefreshToken: 0,
            visualEpoch: 0,
        });

        expect(
            buildTerritoryConfigFingerprint(baseConfig, {
                geometryRefreshToken: 1,
                visualEpoch: 0,
            }),
        ).not.toBe(base);
        expect(
            buildTerritoryConfigFingerprint(baseConfig, {
                geometryRefreshToken: 0,
                visualEpoch: 1,
            }),
        ).not.toBe(base);
    });
});
