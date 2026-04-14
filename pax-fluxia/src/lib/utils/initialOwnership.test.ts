import { describe, expect, it } from 'vitest';
import {
    NEUTRAL_OWNER_ID,
    normalizeInitialOwnerId,
    normalizeUnownedStarsToNeutral,
} from '@pax/common';

describe('initial ownership normalization', () => {
    it('normalizes missing owners to neutral', () => {
        expect(normalizeInitialOwnerId(undefined)).toBe(NEUTRAL_OWNER_ID);
        expect(normalizeInitialOwnerId(null)).toBe(NEUTRAL_OWNER_ID);
        expect(normalizeInitialOwnerId('')).toBe(NEUTRAL_OWNER_ID);
        expect(normalizeInitialOwnerId('   ')).toBe(NEUTRAL_OWNER_ID);
        expect(normalizeInitialOwnerId('ai-1')).toBe('ai-1');
    });

    it('sweeps unowned stars to neutral in-place', () => {
        const stars = [
            { id: 'a', ownerId: 'human-player' },
            { id: 'b', ownerId: '' },
            { id: 'c', ownerId: 'neutral' },
            { id: 'd', ownerId: undefined as string | undefined },
        ];

        const normalizedCount = normalizeUnownedStarsToNeutral(stars);

        expect(normalizedCount).toBe(2);
        expect(stars.map((star) => star.ownerId)).toEqual([
            'human-player',
            'neutral',
            'neutral',
            'neutral',
        ]);
    });
});
