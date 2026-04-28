import { afterEach, describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    assignShipLaneGeometry,
    type StarLaneRef,
} from '$lib/lanes/applyLaneTravelPath';
import {
    clearLanePolylineCache,
    seedLanePolylineCacheFromMapGen,
} from '$lib/lanes/lanePolylineCache';
import type { VisualShipState } from '$lib/utils/render.utils';

function makeShip(): VisualShipState {
    return {
        id: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        targetIndex: 0,
        scale: 1,
        alpha: 1,
        spawnTime: 0,
        state: 'departing',
        fromStarId: 'star-a',
        toStarId: 'star-b',
        departTime: 0,
        travelDuration: 0,
        departDuration: 0,
        laneStartX: 0,
        laneStartY: 0,
        laneEndX: 0,
        laneEndY: 0,
        departFromX: 0,
        departFromY: 0,
        arriveToX: 0,
        arriveToY: 0,
        arriveStarId: null,
        laneOffset: 0,
        staggerDelay: 0,
        ownerId: 'p1',
        settleStartTime: 0,
        settleStartAngle: 0,
        settleStartRadius: 0,
    };
}

function distanceTo(point: { x: number; y: number }, star: StarLaneRef): number {
    return Math.hypot(point.x - star.x, point.y - star.y);
}

const originalConvergence = GAME_CONFIG.LANE_CONVERGENCE;
const originalConvergencePoint = GAME_CONFIG.LANE_CONVERGENCE_POINT;

describe('assignShipLaneGeometry', () => {
    afterEach(() => {
        clearLanePolylineCache();
        GAME_CONFIG.LANE_CONVERGENCE = originalConvergence;
        GAME_CONFIG.LANE_CONVERGENCE_POINT = originalConvergencePoint;
    });

    it('converges onto the trimmed lane start instead of skipping deep into a cached polyline', () => {
        GAME_CONFIG.LANE_CONVERGENCE = 1;
        GAME_CONFIG.LANE_CONVERGENCE_POINT = 80;

        seedLanePolylineCacheFromMapGen([
            {
                sourceId: 'star-a',
                targetId: 'star-b',
                laneWaypoints: [
                    [0, 0],
                    [50, 0],
                    [100, 0],
                ],
            },
        ]);

        const source: StarLaneRef = { id: 'star-a', x: 0, y: 0, radius: 10 };
        const target: StarLaneRef = { id: 'star-b', x: 100, y: 0, radius: 10 };
        const ship = makeShip();

        assignShipLaneGeometry(ship, source, target);

        expect(ship.lanePolyline).toBeDefined();
        expect(ship.lanePolyline!.length).toBeGreaterThanOrEqual(3);
        expect(ship.lanePolyline![0]![0]).toBeCloseTo(15, 3);
        expect(ship.lanePolyline![0]![1]).toBeCloseTo(0, 6);
        expect(ship.lanePolyline![ship.lanePolyline!.length - 1]![0]).toBeCloseTo(
            85,
            3,
        );
        expect(ship.lanePolyline![ship.lanePolyline!.length - 1]![1]).toBeCloseTo(
            0,
            6,
        );
        expect(ship.laneStartX).toBeCloseTo(15, 3);
        expect(ship.laneStartY).toBeCloseTo(0, 6);
        expect(distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, source)).toBeLessThan(
            distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, target),
        );
    });

    it('preserves caller direction for non-canonical lane reads', () => {
        GAME_CONFIG.LANE_CONVERGENCE = 1;
        GAME_CONFIG.LANE_CONVERGENCE_POINT = 80;

        seedLanePolylineCacheFromMapGen([
            {
                sourceId: 'star-b',
                targetId: 'star-a',
                laneWaypoints: [
                    [100, 0],
                    [50, 0],
                    [0, 0],
                ],
            },
        ]);

        const source: StarLaneRef = { id: 'star-b', x: 100, y: 0, radius: 10 };
        const target: StarLaneRef = { id: 'star-a', x: 0, y: 0, radius: 10 };
        const ship = makeShip();
        ship.departFromX = 100;
        ship.departFromY = 0;

        assignShipLaneGeometry(ship, source, target);

        expect(ship.lanePolyline).toBeDefined();
        expect(ship.lanePolyline!.length).toBeGreaterThanOrEqual(3);
        expect(ship.lanePolyline![0]![0]).toBeCloseTo(85, 3);
        expect(ship.lanePolyline![0]![1]).toBeCloseTo(0, 6);
        expect(ship.lanePolyline![ship.lanePolyline!.length - 1]![0]).toBeCloseTo(
            15,
            3,
        );
        expect(ship.lanePolyline![ship.lanePolyline!.length - 1]![1]).toBeCloseTo(
            0,
            6,
        );
        expect(distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, source)).toBeLessThan(
            distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, target),
        );
        expect(distanceTo({ x: ship.laneEndX, y: ship.laneEndY }, target)).toBeLessThan(
            distanceTo({ x: ship.laneEndX, y: ship.laneEndY }, source),
        );
    });

    it('keeps straight-line fallback lane starts near the source even with a large convergence point', () => {
        GAME_CONFIG.LANE_CONVERGENCE = 0.45;
        GAME_CONFIG.LANE_CONVERGENCE_POINT = 80;

        const source: StarLaneRef = { id: 'star-a', x: 0, y: 0, radius: 10 };
        const target: StarLaneRef = { id: 'star-b', x: 100, y: 0, radius: 10 };
        const ship = makeShip();

        assignShipLaneGeometry(ship, source, target);

        expect(ship.lanePolyline).toBeUndefined();
        expect(distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, source)).toBeLessThan(
            distanceTo({ x: ship.laneStartX, y: ship.laneStartY }, target),
        );
    });
});
