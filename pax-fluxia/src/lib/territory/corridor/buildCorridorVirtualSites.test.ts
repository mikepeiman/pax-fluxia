import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildCorridorVirtualSites,
    buildCxVirtualSites,
    buildLpVirtualSites,
} from './buildCorridorVirtualSites';

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

describe('buildCorridorVirtualSites', () => {
    it('builds only CX samples for same-owner lanes', () => {
        const stars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 120, y: 0, ownerId: 'human' }),
        ];
        const connections: StarConnection[] = [{ sourceId: 'a', targetId: 'b', distance: 120 }];

        const cxSites = buildCxVirtualSites(stars, connections, 40, 0.5);
        const lpSites = buildLpVirtualSites(stars, connections, 40, 0.5);

        expect(cxSites).toHaveLength(2);
        expect(cxSites.every((site) => site.laneRule === 'cx')).toBe(true);
        expect(cxSites.every((site) => site.ownerId === 'human')).toBe(true);
        expect(lpSites).toHaveLength(0);
    });

    it('builds only LP samples for contested lanes', () => {
        const stars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 120, y: 0, ownerId: 'ai-1' }),
        ];
        const connections: StarConnection[] = [{ sourceId: 'a', targetId: 'b', distance: 120 }];

        const cxSites = buildCxVirtualSites(stars, connections, 40, 0.5);
        const lpSites = buildLpVirtualSites(stars, connections, 40, 0.5, undefined, undefined, true, true, 0.75, 1, 30);

        expect(cxSites).toHaveLength(0);
        expect(lpSites.length).toBeGreaterThanOrEqual(2);
        expect(lpSites.every((site) => site.laneRule === 'lp')).toBe(true);
        expect(new Set(lpSites.map((site) => site.ownerId))).toEqual(new Set(['human', 'ai-1']));
    });

    it('keeps the legacy combined builder as a compatibility wrapper', () => {
        const stars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'human' }),
            makeStar({ id: 'b', x: 120, y: 0, ownerId: 'human' }),
            makeStar({ id: 'c', x: 240, y: 0, ownerId: 'ai-1' }),
        ];
        const connections: StarConnection[] = [
            { sourceId: 'a', targetId: 'b', distance: 120 },
            { sourceId: 'b', targetId: 'c', distance: 120 },
        ];

        const combined = buildCorridorVirtualSites(stars, connections, 40, 0.5);

        expect(combined.some((site) => site.laneRule === 'cx')).toBe(true);
        expect(combined.some((site) => site.laneRule === 'lp')).toBe(true);
    });
});
