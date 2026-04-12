import { afterEach, describe, expect, it } from 'vitest';
import {
    normalizeLanePathKind,
    normalizeLaneWaypoints,
    seedLaneCacheFromConnections,
    toLaneAwareConnection,
} from '$lib/lanes/laneConnectionSync';
import {
    clearLanePolylineCache,
    getDirectedLanePolyline,
    getLanePolyline,
} from '$lib/lanes/lanePolylineCache';

describe('laneConnectionSync', () => {
    afterEach(() => {
        clearLanePolylineCache();
    });

    it('normalizes schema-style lane waypoint objects into tuple arrays', () => {
        expect(
            normalizeLaneWaypoints([
                { x: 10, y: 20 },
                { x: 30, y: 40 },
                { x: 50, y: 60 },
            ]),
        ).toEqual([
            [10, 20],
            [30, 40],
            [50, 60],
        ]);
    });

    it('normalizes lane path kind and preserves lane data on connections', () => {
        expect(
            toLaneAwareConnection({
                sourceId: 'star-a',
                targetId: 'star-b',
                distance: 100,
                lanePathKind: 'curved',
                laneWaypoints: [
                    { x: 0, y: 0 },
                    { x: 50, y: 20 },
                    { x: 100, y: 0 },
                ],
            }),
        ).toEqual({
            sourceId: 'star-a',
            targetId: 'star-b',
            distance: 100,
            lanePathKind: 'curved',
            laneWaypoints: [
                [0, 0],
                [50, 20],
                [100, 0],
            ],
        });
        expect(normalizeLanePathKind('unknown')).toBeUndefined();
    });

    it('seeds the runtime lane cache from normalized multiplayer connections', () => {
        seedLaneCacheFromConnections([
            {
                sourceId: 'star-a',
                targetId: 'star-b',
                distance: 100,
                lanePathKind: 'curved',
                laneWaypoints: [
                    { x: 0, y: 0 },
                    { x: 50, y: 25 },
                    { x: 100, y: 0 },
                ],
            },
        ]);

        expect(getLanePolyline('star-a', 'star-b')).toEqual([
            [0, 0],
            [50, 25],
            [100, 0],
        ]);
        expect(getLanePolyline('star-b', 'star-a')).toEqual([
            [0, 0],
            [50, 25],
            [100, 0],
        ]);
        expect(getDirectedLanePolyline('star-a', 'star-b')).toEqual([
            [0, 0],
            [50, 25],
            [100, 0],
        ]);
        expect(getDirectedLanePolyline('star-b', 'star-a')).toEqual([
            [100, 0],
            [50, 25],
            [0, 0],
        ]);
    });
});
