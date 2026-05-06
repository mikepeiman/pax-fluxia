import { describe, expect, it } from 'vitest';
import {
    buildMetaballGridPlanKey,
    computeGridInwardOffset,
    resolveMetaballGridDisplayProgress,
    summarizeMetaballGridFrontier,
} from './metaballGridRuntime';

describe('buildMetaballGridPlanKey', () => {
    const base = {
        transitionKey: 'steady',
        geometryVersion: 'geom:v1',
        geometrySource: 'power_voronoi_0319',
        spacingPx: 48,
        originMode: 'centered' as const,
        distribution: 'square' as const,
        positionJitter: 0,
        maxCells: 0,
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
            buildMetaballGridPlanKey({ ...base, distribution: 'hex_offset' }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({ ...base, positionJitter: 0.15 }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({ ...base, maxCells: 60000 }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({ ...base, geometryVersion: 'geom:v2' }),
        ).not.toBe(key);
        expect(
            buildMetaballGridPlanKey({
                ...base,
                geometrySource: 'resolved_vector',
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

describe('resolveMetaballGridDisplayProgress', () => {
    it('uses scheduler progress when the requested plan is already active', () => {
        expect(
            resolveMetaballGridDisplayProgress({
                schedulerRawProgress: 0.35,
                requestedPlanKey: 'transition:a',
                cachedPlanKey: 'transition:a',
                activeVisualTransition: null,
                nowMs: 500,
            }),
        ).toEqual({
            rawProgress: 0.35,
            holdingForPlan: false,
            usingVisualTransition: false,
        });
    });

    it('freezes at t=0 while waiting for the matching plan', () => {
        expect(
            resolveMetaballGridDisplayProgress({
                schedulerRawProgress: 0.72,
                requestedPlanKey: 'transition:b',
                cachedPlanKey: 'steady',
                activeVisualTransition: null,
                nowMs: 500,
            }),
        ).toEqual({
            rawProgress: 0,
            holdingForPlan: true,
            usingVisualTransition: false,
        });
    });

    it('uses the family-local visual clock when a late plan becomes active', () => {
        expect(
            resolveMetaballGridDisplayProgress({
                schedulerRawProgress: 0.9,
                requestedPlanKey: null,
                cachedPlanKey: 'transition:c',
                activeVisualTransition: {
                    planKey: 'transition:c',
                    startedAtMs: 1000,
                    durationMs: 1000,
                },
                nowMs: 1250,
            }),
        ).toEqual({
            rawProgress: 0.25,
            holdingForPlan: false,
            usingVisualTransition: true,
        });
    });
});

describe('summarizeMetaballGridFrontier', () => {
    it('reports empty frontier stats for transitions with no changed cells', () => {
        expect(
            summarizeMetaballGridFrontier({
                orderedFlipTimes: [],
                flipWindow: 0.14,
            }),
        ).toEqual({
            transitionTotalCount: 0,
            min: null,
            p25: null,
            p50: null,
            p75: null,
            p95: null,
            max: null,
            bins: {
                '0-0.1': 0,
                '0.1-0.25': 0,
                '0.25-0.5': 0,
                '0.5-0.75': 0,
                '0.75-1': 0,
            },
            visibleStartProgress: null,
            visibleEndProgress: null,
            visibleLifetimeProgress: null,
        });
    });

    it('summarizes percentiles, bins, and visible frontier lifetime', () => {
        const summary = summarizeMetaballGridFrontier({
            orderedFlipTimes: [0.02, 0.08, 0.22, 0.41, 0.58, 0.73, 0.91],
            flipWindow: 0.1,
        });

        expect(summary.transitionTotalCount).toBe(7);
        expect(summary.min).toBeCloseTo(0.02);
        expect(summary.p25).toBeCloseTo(0.15);
        expect(summary.p50).toBeCloseTo(0.41);
        expect(summary.p75).toBeCloseTo(0.655);
        expect(summary.p95).toBeCloseTo(0.856);
        expect(summary.max).toBeCloseTo(0.91);
        expect(summary.bins).toEqual({
            '0-0.1': 2,
            '0.1-0.25': 1,
            '0.25-0.5': 1,
            '0.5-0.75': 2,
            '0.75-1': 1,
        });
        expect(summary.visibleStartProgress).toBe(0);
        expect(summary.visibleEndProgress).toBe(1);
        expect(summary.visibleLifetimeProgress).toBe(1);
    });
});
