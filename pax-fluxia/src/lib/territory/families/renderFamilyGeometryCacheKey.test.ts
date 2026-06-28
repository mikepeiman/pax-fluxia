import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    RenderFamilyGeometryCacheKeyBuilder,
    buildRenderFamilyGeometryFingerprint,
} from './renderFamilyGeometryCacheKey';

function star(
    id: string,
    ownerId: string,
    x: number,
    y: number,
): StarState {
    return {
        id,
        ownerId,
        x,
        y,
        radius: 12,
    } as StarState;
}

function lane(sourceId: string, targetId: string): StarConnection {
    return {
        sourceId,
        targetId,
    } as StarConnection;
}

function source(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        PERIMETER_FIELD_GEOMETRY_SOURCE: '0319',
        TERRITORY_GEOMETRY_MODE: 'constraint_aligned',
        TERRITORY_ENGINE_METHOD: 'power',
        __GEOMETRY_REFRESH_TOKEN: 0,
        ...overrides,
    };
}

describe('RenderFamilyGeometryCacheKeyBuilder', () => {
    it('reuses the previous key when stable arrays and geometry fingerprint match', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const stars = [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)];
        const lanes = [lane('a', 'b')];
        const config = source();

        const first = builder.build({
            stars,
            lanes,
            source: config,
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 3,
        });
        const second = builder.build({
            stars,
            lanes,
            source: config,
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 3,
        });

        expect(second).toBe(first);
        expect(builder.getStats()).toMatchObject({
            buildCount: 2,
            hitCount: 1,
            missCount: 1,
            lastStarCount: 2,
            lastLaneCount: 1,
            topologySignatureScanCount: 1,
            topologySignatureReuseCount: 1,
            repeatedTopologySignatureScanCount: 0,
        });
        expect(builder.getStats().topologySignatureScanMs).toBeGreaterThanOrEqual(0);
        expect(builder.getStats().estimatedTopologySignatureScanMsSaved).toBeGreaterThanOrEqual(0);
    });

    it('recomputes when arrays are replaced even if semantic contents match', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const config = source();
        const first = builder.build({
            stars: [star('a', 'p1', 10, 20)],
            lanes: [lane('a', 'b')],
            source: config,
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 0,
        });
        const second = builder.build({
            stars: [star('a', 'p1', 10, 20)],
            lanes: [lane('a', 'b')],
            source: config,
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 0,
        });

        expect(second).toBe(first);
        expect(builder.getStats()).toMatchObject({
            buildCount: 2,
            hitCount: 0,
            missCount: 2,
            topologySignatureScanCount: 2,
            topologySignatureReuseCount: 0,
            repeatedTopologySignatureScanCount: 1,
        });
    });

    it('recomputes when config or visual epoch changes', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const stars = [star('a', 'p1', 10, 20)];
        const lanes = [lane('a', 'b')];
        const base = {
            stars,
            lanes,
            source: source(),
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 1,
        };

        const first = builder.build(base);
        const configChanged = builder.build({
            ...base,
            source: source({ __GEOMETRY_REFRESH_TOKEN: 1 }),
        });
        const epochChanged = builder.build({
            ...base,
            source: source({ __GEOMETRY_REFRESH_TOKEN: 1 }),
            visualEpoch: 2,
        });

        expect(configChanged).not.toBe(first);
        expect(epochChanged).not.toBe(configChanged);
        expect(builder.getStats()).toMatchObject({
            hitCount: 0,
            missCount: 3,
        });
    });

    it('reuses physical layout identity while the same board arrays are stable', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const stars = [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)];
        const lanes = [lane('a', 'b')];
        const base = {
            stars,
            lanes,
            source: source(),
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 1,
        };

        const first = builder.build(base);
        const second = builder.build(base);

        expect(second).toBe(first);
        expect(builder.getStats()).toMatchObject({
            hitCount: 1,
            missCount: 1,
            topologySignatureScanCount: 1,
            topologySignatureReuseCount: 1,
            repeatedTopologySignatureScanCount: 0,
        });
    });

    it('uses an exact fixed-board key without scanning replaced arrays', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const config = source();
        const base = {
            boardLayoutKey: 'fixed-board:test-board',
            source: config,
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 1,
        };

        const first = builder.build({
            ...base,
            stars: [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)],
            lanes: [lane('a', 'b')],
        });
        const second = builder.build({
            ...base,
            stars: [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)],
            lanes: [lane('a', 'b')],
        });
        const changedBoard = builder.build({
            ...base,
            boardLayoutKey: 'fixed-board:test-board-2',
            stars: [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)],
            lanes: [lane('a', 'b')],
        });

        expect(second).toBe(first);
        expect(changedBoard).not.toBe(second);
        expect(builder.getStats()).toMatchObject({
            buildCount: 3,
            hitCount: 1,
            missCount: 2,
            topologySignatureScanCount: 0,
            topologySignatureReuseCount: 0,
            repeatedTopologySignatureScanCount: 0,
            boardLayoutKeyUseCount: 3,
        });
    });

    it('recomputes when star ownership mutates in place', () => {
        const builder = new RenderFamilyGeometryCacheKeyBuilder();
        const stars = [star('a', 'p1', 10, 20), star('b', 'p2', 40, 20)];
        const lanes = [lane('a', 'b')];
        const base = {
            stars,
            lanes,
            source: source(),
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 1,
        };

        const first = builder.build(base);
        stars[0]!.ownerId = 'p2';
        const second = builder.build(base);

        expect(second).not.toBe(first);
        expect(builder.getStats()).toMatchObject({
            hitCount: 0,
            missCount: 2,
        });
    });
});

describe('buildRenderFamilyGeometryFingerprint', () => {
    it('keeps the expensive star and lane data out of the reusable fingerprint', () => {
        const fingerprint = buildRenderFamilyGeometryFingerprint({
            source: source(),
            worldWidth: 100,
            worldHeight: 80,
            visualEpoch: 5,
        });

        expect(fingerprint).toContain('5:100:80');
        expect(fingerprint).toContain('0319');
        expect(fingerprint).not.toContain('a->b');
    });
});
