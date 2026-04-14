import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { buildDisconnectVirtualSites } from './buildDisconnectVirtualSites';

function makeStar(params: {
    id: string;
    x: number;
    y: number;
    ownerId: string;
}): StarState {
    return {
        id: params.id,
        x: params.x,
        y: params.y,
        ownerId: params.ownerId,
        activeShips: 10,
        damagedShips: 0,
        radius: 20,
        starType: 'blue',
    } as StarState;
}

describe('buildDisconnectVirtualSites', () => {
    it('builds a perpendicular pair around the Euclidean midpoint even with no graph edges', () => {
        const ownedStars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 100, y: 0, ownerId: 'human' }),
        ];
        const allStars = [
            ...ownedStars,
            makeStar({ id: 'enemy-top', x: 50, y: 80, ownerId: 'enemy-top' }),
            makeStar({ id: 'enemy-bottom', x: 50, y: -70, ownerId: 'enemy-bottom' }),
        ];
        const connections: StarConnection[] = [];

        const sites = buildDisconnectVirtualSites(
            ownedStars,
            allStars,
            connections,
            200,
            0.5,
        );

        expect(sites).toHaveLength(2);
        expect(sites.map((site) => site.pairSide)).toEqual(['negative', 'positive']);
        expect(sites[0].x).toBeCloseTo(50, 5);
        expect(sites[1].x).toBeCloseTo(50, 5);
        expect(sites[0].y).toBeCloseTo(-16.6667, 3);
        expect(sites[1].y).toBeCloseTo(16.6667, 3);
    });

    it('emits a deterministic perpendicular pair when same-owner stars are disconnected in a larger graph', () => {
        const ownedStars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 100, y: 0, ownerId: 'human' }),
            makeStar({ id: 'c', x: 240, y: 0, ownerId: 'human' }),
        ];
        const allStars = [
            ...ownedStars,
            makeStar({ id: 'enemy-top', x: 50, y: 80, ownerId: 'enemy-top' }),
            makeStar({ id: 'enemy-bottom', x: 50, y: -70, ownerId: 'enemy-bottom' }),
        ];
        const connections: StarConnection[] = [
            { sourceId: 'b', targetId: 'c', distance: 140 },
        ];

        const sites = buildDisconnectVirtualSites(
            ownedStars,
            allStars,
            connections,
            200,
            0.5,
        );

        expect(sites).toHaveLength(2);
        expect(sites.map((site) => site.pairSide)).toEqual(['negative', 'positive']);

        const negative = sites[0];
        const positive = sites[1];

        expect(negative.sourceStarA).toBe('a');
        expect(negative.sourceStarB).toBe('b');
        expect(positive.sourceStarA).toBe('a');
        expect(positive.sourceStarB).toBe('b');
        expect(negative.anchorStarId).toBe('enemy-bottom');
        expect(positive.anchorStarId).toBe('enemy-top');
        expect(negative.ownerId).toBe('enemy-bottom');
        expect(positive.ownerId).toBe('enemy-top');
        expect(negative.x).toBeCloseTo(50, 5);
        expect(positive.x).toBeCloseTo(50, 5);
        expect(negative.y).toBeCloseTo(-16.6667, 3);
        expect(positive.y).toBeCloseTo(16.6667, 3);
    });

    it('falls back to the global nearest enemy when one half-plane has no enemy star', () => {
        const ownedStars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 100, y: 0, ownerId: 'human' }),
            makeStar({ id: 'c', x: 240, y: 0, ownerId: 'human' }),
        ];
        const allStars = [
            ...ownedStars,
            makeStar({ id: 'enemy-top', x: 50, y: 80, ownerId: 'enemy-top' }),
        ];
        const connections: StarConnection[] = [
            { sourceId: 'b', targetId: 'c', distance: 140 },
        ];

        const sites = buildDisconnectVirtualSites(
            ownedStars,
            allStars,
            connections,
            200,
            0.5,
        );

        expect(sites).toHaveLength(2);
        expect(sites[0].ownerId).toBe('enemy-top');
        expect(sites[1].ownerId).toBe('enemy-top');
        expect(sites[0].anchorStarId).toBe('enemy-top');
        expect(sites[1].anchorStarId).toBe('enemy-top');
    });
});
