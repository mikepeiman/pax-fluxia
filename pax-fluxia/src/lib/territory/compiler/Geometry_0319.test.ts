import { describe, expect, it } from 'vitest';
import { computeGeometry0319 } from './Geometry_0319';

describe('computeGeometry0319', () => {
    it('builds territory geometry when DX is enabled', () => {
        const result = computeGeometry0319(
            [
                { id: 'a', x: 120, y: 120, ownerId: 'A', size: 10 } as any,
                { id: 'b', x: 320, y: 120, ownerId: 'B', size: 10 } as any,
                { id: 'c', x: 120, y: 320, ownerId: 'A', size: 10 } as any,
                { id: 'd', x: 320, y: 320, ownerId: 'B', size: 10 } as any,
            ],
            [
                { sourceId: 'a', targetId: 'c', distance: 200 } as any,
                { sourceId: 'b', targetId: 'd', distance: 200 } as any,
            ],
            {
                starWeight: 45,
                msrPx: 45,
                cxEnabled: true,
                cxSpacingPx: 60,
                cxPointCount: 0,
                cxWeight: 0.5,
                lpMidpointPairEnabled: true,
                lpPairCount: 1,
                lpPairSpacingPx: 75,
                lpPairWeight: 0.5,
                dxEnabled: true,
                dxMaxDistancePx: 400,
                dxWeight: 0.3,
                clusterSplit: false,
                chaikinPasses: 2,
                frontierResolution: 5,
                boundaryPad: 50,
                boundaryEps: 6,
                worldWidth: 500,
                worldHeight: 500,
            } as any,
        );

        expect((result as any).kind).not.toBe('error');
        expect((result as any).mergedTerritories.length).toBeGreaterThan(0);
        expect((result as any).sharedPolylines.length).toBeGreaterThan(0);
    });
});
