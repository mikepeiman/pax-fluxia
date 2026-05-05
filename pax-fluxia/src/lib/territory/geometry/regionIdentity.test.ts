import { describe, expect, it } from 'vitest';

import {
    deriveStableRegionId,
    isVirtualSiteId,
    splitRegionSiteIds,
} from './regionIdentity';

describe('regionIdentity', () => {
    it('treats corridor and disconnect site ids as virtual contributors', () => {
        expect(isVirtualSiteId('corridor_star-1_star-2')).toBe(true);
        expect(isVirtualSiteId('disconnect_star-4_star-9')).toBe(true);
        expect(isVirtualSiteId('star-12')).toBe(false);
    });

    it('splits real anchor stars from virtual contributor ids and sorts them numerically', () => {
        expect(
            splitRegionSiteIds([
                'star-10',
                'disconnect_star-10_star-14',
                'star-2',
                'corridor_star-2_star-10',
            ]),
        ).toEqual({
            anchorStarIds: ['star-2', 'star-10'],
            contributingSiteIds: [
                'corridor_star-2_star-10',
                'disconnect_star-10_star-14',
            ],
        });
    });

    it('derives region identity from real star membership instead of geometry position', () => {
        expect(
            deriveStableRegionId('red', [
                'star-10',
                'corridor_star-10_star-12',
                'star-2',
            ]),
        ).toBe('region:red:star-2+star-10');
    });

    it('falls back to contributor ids only when no real stars are present', () => {
        expect(
            deriveStableRegionId('blue', [
                'disconnect_star-7_star-9',
                'corridor_star-7_star-9',
            ]),
        ).toBe(
            'region:blue:corridor_star-7_star-9+disconnect_star-7_star-9',
        );
    });
});
