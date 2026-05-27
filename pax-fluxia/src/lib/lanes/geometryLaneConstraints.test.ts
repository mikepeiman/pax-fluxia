import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    measureLaneMarginPx,
    resolveGeometryLaneConstraints,
} from './geometryLaneConstraints';

function star(id: string, x: number, y: number): StarState {
    return {
        id,
        x,
        y,
        radius: 20,
        ownerId: 'p1',
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

describe('resolveGeometryLaneConstraints', () => {
    it('keeps a straight lane when non-endpoint stars already clear MSR', () => {
        const stars = [star('a', 0, 0), star('b', 200, 0), star('c', 100, 100)];
        const connections: StarConnection[] = [
            { sourceId: 'a', targetId: 'b', distance: 200 },
        ];

        const resolved = resolveGeometryLaneConstraints({
            stars,
            connections,
            laneMarginPx: 50,
        });

        const lane = resolved.resolver('a', 'b');
        expect(lane).toEqual([
            [0, 0],
            [200, 0],
        ]);
        expect(resolved.stats.straightCount).toBe(1);
    });

    it('adjusts an obstructed lane while preserving the same connection', () => {
        const stars = [star('a', 0, 0), star('b', 200, 0), star('c', 100, 0)];
        const connections: StarConnection[] = [
            { sourceId: 'a', targetId: 'b', distance: 200 },
        ];

        const resolved = resolveGeometryLaneConstraints({
            stars,
            connections,
            laneMarginPx: 50,
        });
        const adjusted = resolved.resolver('a', 'b');

        expect(adjusted).toBeDefined();
        expect(adjusted!.length).toBeGreaterThan(2);
        expect(resolved.connections[0].sourceId).toBe('a');
        expect(resolved.connections[0].targetId).toBe('b');
        expect(
            measureLaneMarginPx({
                polyline: adjusted!,
                stars,
                sourceId: 'a',
                targetId: 'b',
            }),
        ).toBeGreaterThanOrEqual(49.75);
    });

    it('preserves an existing valid adjusted lane instead of re-straightening it', () => {
        const stars = [star('a', 0, 0), star('b', 100, 0), star('c', 50, 0)];
        const connections: StarConnection[] = [
            {
                sourceId: 'a',
                targetId: 'b',
                distance: 100,
                laneWaypoints: [
                    [0, 0],
                    [0, 80],
                    [100, 80],
                    [100, 0],
                ],
            },
        ];

        const resolved = resolveGeometryLaneConstraints({
            stars,
            connections,
            laneMarginPx: 50,
        });

        expect(resolved.resolver('a', 'b')).toEqual(connections[0].laneWaypoints);
        expect(resolved.stats.preservedExistingCount).toBe(1);
    });
});
