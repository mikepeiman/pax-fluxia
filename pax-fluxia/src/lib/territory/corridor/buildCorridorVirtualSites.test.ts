import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { buildCorridorVirtualSites } from './buildCorridorVirtualSites';

function star(id: string, x: number, y: number, ownerId: string): StarState {
    return {
        id,
        x,
        y,
        radius: 20,
        ownerId,
        starType: 'yellow',
        activeShips: 10,
        damagedShips: 0,
        productionOverflow: 0,
        repairOverflow: 0,
        lastCombatTick: -1,
        lastAttackTick: -1,
        targetId: null,
        queuedOrderTargetId: null,
        productionRate: 1,
        repairRate: 1,
        transferRate: 1,
        activationRate: 1,
        defensivePosture: 0,
        defenseStrength: 1,
    };
}

describe('buildCorridorVirtualSites', () => {
    it('emits contested midpoint pairs even on short lanes with endpoint exclusion', () => {
        const stars = [star('a', 0, 0, 'p1'), star('b', 30, 0, 'p2')];
        const connections: StarConnection[] = [
            { sourceId: 'a', targetId: 'b', distance: 30 },
        ];

        const sites = buildCorridorVirtualSites(
            stars,
            connections,
            60,
            1,
            undefined,
            undefined,
            true,
            false,
            false,
            1,
            1,
            75,
            20,
        );

        expect(sites).toHaveLength(2);
        expect(sites.map((site) => site.ownerId).sort()).toEqual(['p1', 'p2']);
        expect(sites[0].x).toBeLessThan(sites[1].x);
        expect(sites[1].x - sites[0].x).toBeGreaterThan(0);
    });
});
