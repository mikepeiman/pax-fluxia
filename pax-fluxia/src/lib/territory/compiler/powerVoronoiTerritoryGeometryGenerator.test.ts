import { describe, expect, it } from 'vitest';
import {
    chainSharedEdgesIntoPolylines,
    constructFillsFromFrontierChain,
    mergeSameOwnerCells,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryCell,
} from './powerVoronoiTerritoryGeometryGenerator';

describe('constructFillsFromFrontierChain', () => {
    it('drops clearly open chain-walk loops instead of emitting bogus fill chords', () => {
        const sharedPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|blue',
                color: 0,
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|blue',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
        ];

        expect(constructFillsFromFrontierChain(sharedPolylines, [])).toEqual([]);
    });

    it('repairs near-closed loops by explicitly closing them', () => {
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [10, 10],
                    [0, 0.5],
                ],
            },
        ];

        const fills = constructFillsFromFrontierChain([], worldBorderPolylines);

        expect(fills).toHaveLength(1);
        expect(fills[0]?.ownerId).toBe('red');
        expect(fills[0]?.points[0]).toEqual(fills[0]?.points.at(-1));
    });

    it('walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur', () => {
        const sharedPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|blue',
                color: 0,
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|cyan',
                color: 0,
                points: [
                    [10, 0],
                    [20, 0],
                ],
            },
            {
                ownerPairKey: 'red|yellow',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
            {
                ownerPairKey: 'red|green',
                color: 0,
                points: [
                    [10, 10],
                    [0, 10],
                ],
            },
        ];
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 10],
                    [0, 0],
                ],
            },
        ];

        const fills = constructFillsFromFrontierChain(
            sharedPolylines,
            worldBorderPolylines,
        );

        expect(fills).toHaveLength(1);
        expect(fills[0]?.ownerId).toBe('red');
        expect(fills[0]?.points).toEqual([
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
        ]);
    });
});

describe('chainSharedEdgesIntoPolylines', () => {
    it('keeps a closed loop intact instead of crossing into the first spur by insertion order', () => {
        const edges: SharedBorderEdge[] = [
            {
                x1: 0,
                y1: 0,
                x2: 10,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 0,
                x2: 20,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 0,
                x2: 10,
                y2: 10,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 10,
                x2: 0,
                y2: 10,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 0,
                y1: 10,
                x2: 0,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
        ];

        const polylines = chainSharedEdgesIntoPolylines(edges, 0);

        expect(polylines).toHaveLength(2);
        expect(polylines[0]?.points).toEqual([
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
        ]);
        expect(polylines[1]?.points).toEqual([
            [10, 0],
            [20, 0],
        ]);
    });
});

describe('mergeSameOwnerCells', () => {
    it('repairs near-closed owner shells instead of dropping them', () => {
        const cells: TerritoryCell[] = [
            {
                ownerId: 'red',
                siteId: 'star-0',
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [0, 0.5],
                ],
            },
            {
                ownerId: 'blue',
                siteId: 'star-1',
                points: [
                    [10, 0],
                    [20, 0],
                    [20, 20],
                    [10, 20],
                    [10, 10],
                    [10, 0],
                ],
            },
        ];

        const merged = mergeSameOwnerCells(cells, false, new Map());
        const red = merged.find((territory) => territory.ownerId === 'red');

        expect(red).toBeDefined();
        expect(red?.points[0]).toEqual(red?.points.at(-1));
    });
});
