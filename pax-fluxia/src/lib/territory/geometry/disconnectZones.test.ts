import { describe, expect, it } from 'vitest';
import {
    applyExplicitDisconnectZones,
    buildDisconnectZones,
} from './disconnectZones';

describe('buildDisconnectZones', () => {
    it('creates a zone for same-owner stars that are not lane-connected', () => {
        const zones = buildDisconnectZones(
            [
                { id: 'a', x: 0, y: 0, ownerId: 'A' } as any,
                { id: 'b', x: 100, y: 0, ownerId: 'A' } as any,
                { id: 'c', x: 220, y: 0, ownerId: 'A' } as any,
            ],
            [
                { sourceId: 'b', targetId: 'c', distance: 120 } as any,
            ],
            150,
        );

        expect(zones).toHaveLength(1);
        expect(zones[0]).toMatchObject({
            ownerId: 'A',
            sourceStarA: 'a',
            sourceStarB: 'b',
            midpoint: { x: 50, y: 0 },
        });
    });
});

describe('applyExplicitDisconnectZones', () => {
    it('carves the owning territory away from the midpoint zone', () => {
        const territories = [
            {
                ownerId: 'A',
                points: [
                    [20, -20],
                    [45, -10],
                    [80, -20],
                    [80, 20],
                    [55, 10],
                    [20, 20],
                    [20, -20],
                ] as [number, number][],
            },
        ];

        const applied = applyExplicitDisconnectZones(territories, [
            {
                ownerId: 'A',
                sourceStarA: 'a',
                sourceStarB: 'b',
                midpoint: { x: 50, y: 0 },
                tangentAxis: { x: 1, y: 0 },
                normalAxis: { x: 0, y: 1 },
                depthPx: 30,
                halfWidthPx: 12,
            },
        ]);

        expect(applied).toBe(1);
        expect(territories[0]!.points[1]![0]).toBe(35);
        expect(territories[0]!.points[4]![0]).toBe(65);
        expect(
            territories[0]!.points.some(
                ([x, y]) => x > 35 && x < 65 && Math.abs(y) < 12,
            ),
        ).toBe(false);
    });
});
