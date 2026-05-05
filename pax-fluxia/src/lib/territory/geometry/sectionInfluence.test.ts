import { describe, expect, it } from 'vitest';

import { buildSectionInfluence } from './sectionInfluence';

describe('buildSectionInfluence', () => {
    it('picks the nearest owned stars at the section midpoint', () => {
        const influence = buildSectionInfluence({
            ownerId: 'blue',
            points: [
                [0, 0],
                [100, 0],
            ],
            stars: [
                { id: 'blue-left', x: 10, y: 0, ownerId: 'blue' },
                { id: 'blue-right', x: 90, y: 0, ownerId: 'blue' },
                { id: 'red-mid', x: 50, y: 0, ownerId: 'red' },
            ],
        });

        expect(influence.ownerId).toBe('blue');
        expect([influence.primaryStarId, influence.secondaryStarId]).toEqual([
            'blue-left',
            'blue-right',
        ]);
        expect(influence.primaryScore).toBeCloseTo(0.5, 3);
        expect(influence.secondaryScore).toBeCloseTo(0.5, 3);
    });

    it('returns a world influence without star attribution', () => {
        const influence = buildSectionInfluence({
            ownerId: 'world',
            points: [
                [0, 0],
                [100, 0],
            ],
            stars: [{ id: 'blue', x: 50, y: 50, ownerId: 'blue' }],
        });

        expect(influence).toEqual({
            ownerId: 'world',
            primaryStarId: '',
            primaryScore: 0,
        });
    });
});
