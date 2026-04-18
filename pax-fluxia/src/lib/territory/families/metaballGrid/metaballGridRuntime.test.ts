import { describe, expect, it } from 'vitest';
import {
    buildMetaballGridPlanKey,
    computeGridInwardOffset,
} from './metaballGridRuntime';

describe('buildMetaballGridPlanKey', () => {
    const base = {
        transitionKey: 'steady',
        geometryVersion: 'geom:v1',
        geometrySource: 'power_voronoi_0319',
        spacingPx: 48,
        originMode: 'centered' as const,
    };

    it('changes when steady-state geometry-generation knobs change', () => {
        const key = buildMetaballGridPlanKey(base);
        expect(
            buildMetaballGridPlanKey({ ...base, spacingPx: 32 }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({ ...base, originMode: 'corner' }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({ ...base, geometryVersion: 'geom:v2' }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({
                ...base,
                geometrySource: 'canonical_vector',
            }),
        ).not.toBe(key);
    });

    it('changes when transition wave-generation knobs change', () => {
        const key = buildMetaballGridPlanKey({
            ...base,
            transitionKey: 'event:a',
            adjacency: '8',
            waveGeometry: 'grid_bfs',
            waveSeeding: 'winner_natives',
        });
        expect(
            buildMetaballGridPlanKey({
                ...base,
                transitionKey: 'event:a',
                adjacency: '4',
                waveGeometry: 'grid_bfs',
                waveSeeding: 'winner_natives',
            }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({
                ...base,
                transitionKey: 'event:a',
                adjacency: '8',
                waveGeometry: 'euclidean_band',
                waveSeeding: 'winner_natives',
            }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({
                ...base,
                transitionKey: 'event:a',
                adjacency: '8',
                waveGeometry: 'grid_bfs',
                waveSeeding: 'conquered_star_center',
            }),
        ).not.toBe(key);
    });
});

describe('computeGridInwardOffset', () => {
    it('returns no offset for an interior cell', () => {
        const colors = new Int32Array([
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
        ]);
        expect(
            computeGridInwardOffset({
                ix: 1,
                iy: 1,
                cols: 3,
                rows: 3,
                selfColorIdx: 1,
                colorIdxByGridIdx: colors,
                distancePx: 6,
            }),
        ).toEqual({ x: 0, y: 0 });
    });

    it('pushes a boundary cell inward away from an exposed left edge', () => {
        const colors = new Int32Array([
            -1, 1, 1,
            -1, 1, 1,
            -1, 1, 1,
        ]);
        expect(
            computeGridInwardOffset({
                ix: 1,
                iy: 1,
                cols: 3,
                rows: 3,
                selfColorIdx: 1,
                colorIdxByGridIdx: colors,
                distancePx: 5,
            }),
        ).toEqual({ x: 5, y: 0 });
    });

    it('pushes a corner cell diagonally inward', () => {
        const colors = new Int32Array([
            1, 1, -1,
            1, 1, -1,
            -1, -1, -1,
        ]);
        const offset = computeGridInwardOffset({
            ix: 0,
            iy: 0,
            cols: 3,
            rows: 3,
            selfColorIdx: 1,
            colorIdxByGridIdx: colors,
            distancePx: 4,
        });
        expect(offset.x).toBeCloseTo(2.828427, 5);
        expect(offset.y).toBeCloseTo(2.828427, 5);
    });
});
