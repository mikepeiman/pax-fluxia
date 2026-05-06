import { describe, expect, it } from 'vitest';
import {
    normalizeLaneWaypointsForStorage,
    waypointsNeedReverseForEndpoints,
} from '$lib/lanes/lanePolylineCache';

describe('lanePolylineCache waypoint normalization', () => {
    it('detects legacy reversed waypoints against real source and target endpoints', () => {
        const reversed = [
            [90, 0],
            [50, 12],
            [10, 0],
        ] as [number, number][];

        expect(
            waypointsNeedReverseForEndpoints(
                reversed,
                { x: 0, y: 0 },
                { x: 100, y: 0 },
            ),
        ).toBe(true);
    });

    it('re-normalizes legacy reversed normalized connections for cache storage', () => {
        const normalized = normalizeLaneWaypointsForStorage(
            'star-a',
            'star-b',
            [
                [90, 0],
                [50, 12],
                [10, 0],
            ],
            {
                source: { x: 0, y: 0 },
                target: { x: 100, y: 0 },
            },
        );

        expect(normalized).toEqual([
            [10, 0],
            [50, 12],
            [90, 0],
        ]);
    });

    it('keeps normalized storage direction correct for reversed-order caller ids', () => {
        const normalized = normalizeLaneWaypointsForStorage(
            'star-b',
            'star-a',
            [
                [90, 0],
                [50, 12],
                [10, 0],
            ],
            {
                source: { x: 100, y: 0 },
                target: { x: 0, y: 0 },
            },
        );

        expect(normalized).toEqual([
            [10, 0],
            [50, 12],
            [90, 0],
        ]);
    });
});
