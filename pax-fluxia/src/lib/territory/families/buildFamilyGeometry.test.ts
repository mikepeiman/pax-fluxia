import { describe, expect, it } from 'vitest';
import { buildPowerVoronoi0319Settings } from './buildFamilyGeometry';

describe('buildPowerVoronoi0319Settings', () => {
    it('respects mode-scoped DX overrides from the supplied config source', () => {
        const settings = buildPowerVoronoi0319Settings({
            lanes: [{ sourceId: 'a', targetId: 'b', distance: 120 }],
            worldWidth: 640,
            worldHeight: 360,
            configSource: {
                MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
                MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
                TERRITORY_DX_WEIGHT: 0.3,
            },
        });

        expect(settings.dxEnabled).toBe(true);
        expect(settings.dxMaxDistancePx).toBe(295);
        expect(settings.dxWeight).toBe(0.3);
    });
});
