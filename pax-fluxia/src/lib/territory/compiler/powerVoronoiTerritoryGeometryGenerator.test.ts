import { describe, expect, it } from 'vitest';
import {
    constructFillsFromFrontierChain,
    type SharedPolyline,
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
});
