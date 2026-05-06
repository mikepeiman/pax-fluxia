import { describe, expect, it } from 'vitest';
import { buildPowerVoronoi0319AuthoritySnapshot } from './buildPowerVoronoi0319AuthoritySnapshot';
import type { TerritoryGeometryData } from '../compiler/powerVoronoiTerritoryGeometryGenerator';

function makeGeometryData(): TerritoryGeometryData {
    return {
        cells: [],
        mergedTerritories: [
            {
                ownerId: 'red',
                color: 0xff0000,
                starIds: ['red-star'],
                points: [
                    [0, 0],
                    [4, 0],
                    [4, 10],
                    [0, 10],
                ],
            },
            {
                ownerId: 'blue',
                color: 0x0000ff,
                starIds: ['blue-star'],
                points: [
                    [6, 0],
                    [10, 0],
                    [10, 10],
                    [6, 10],
                ],
            },
        ],
        sharedEdges: [],
        rawSharedPolylines: [
            {
                ownerPairKey: 'blue|red',
                color: 0,
                points: [
                    [5, 0],
                    [5, 10],
                ],
            },
        ],
        sharedPolylines: [
            {
                ownerPairKey: 'blue|red',
                color: 0,
                points: [
                    [5, 0],
                    [5, 10],
                ],
            },
        ],
        worldBorderPolylines: [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 0],
                    [5, 0],
                ],
            },
            {
                ownerPairKey: 'blue|world',
                color: 0,
                points: [
                    [5, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [5, 10],
                    [0, 10],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 10],
                    [0, 0],
                ],
            },
            {
                ownerPairKey: 'blue|world',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
            {
                ownerPairKey: 'blue|world',
                color: 0,
                points: [
                    [10, 10],
                    [5, 10],
                ],
            },
        ],
        enclaveMap: new Map(),
        fingerprint: 'geo:test',
        frontierMap: undefined,
    };
}

describe('buildPowerVoronoi0319AuthoritySnapshot', () => {
    it('promotes one resolved shared-boundary seam into the live snapshot', () => {
        const snapshot = buildPowerVoronoi0319AuthoritySnapshot({
            geometry: makeGeometryData(),
            stars: [
                { id: 'red-star', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'blue-star', x: 8, y: 5, ownerId: 'blue' } as any,
            ],
            ownershipVersion: 'own:test',
            sourceStyle: 'vector',
            worldWidth: 10,
            worldHeight: 10,
            requestedMarginPx: 0,
        });

        expect(snapshot.diagnostics.stageLadder).toBeDefined();
        expect(snapshot.diagnostics.stageLadder?.authoritativeSeamFingerprint).toContain(
            'geo:test:resolved:0.00',
        );
        expect(snapshot.frontierPolylines).toEqual(
            snapshot.diagnostics.stageLadder?.resolvedSharedBoundaryFrontiers,
        );

        const redRegion = snapshot.territoryRegions.find(
            (region) => region.ownerId === 'red',
        );
        const blueRegion = snapshot.territoryRegions.find(
            (region) => region.ownerId === 'blue',
        );
        expect(redRegion?.anchorStarIds).toEqual(['red-star']);
        expect(blueRegion?.anchorStarIds).toEqual(['blue-star']);
        expect(redRegion?.points.some(([x]) => x === 5)).toBe(true);
        expect(blueRegion?.points.some(([x]) => x === 5)).toBe(true);
        expect(redRegion?.points.some(([x]) => x === 4)).toBe(false);
        expect(blueRegion?.points.some(([x]) => x === 6)).toBe(false);
    });
});
