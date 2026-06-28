import { describe, expect, it, vi } from 'vitest';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { TerritoryWorkerGeometryRequest } from './TerritoryWorkerProtocol';
import { TEST_TUNABLES } from '../pvFrontline/testFixtures';
import { TerritoryWorker } from './TerritoryWorker';

function buildGeometry(version: string): GeometrySnapshot {
    return {
        version,
        territoryRegions: [],
        frontierPolylines: [],
        worldBorderPolylines: [],
    } as unknown as GeometrySnapshot;
}

function buildRequest(
    overrides: Partial<TerritoryWorkerGeometryRequest> = {},
): TerritoryWorkerGeometryRequest {
    return {
        requestId: 'request-1',
        nowMs: 100,
        stars: [
            {
                id: 'alpha',
                x: 10,
                y: 20,
                radius: 8,
                ownerId: 'red',
            },
            {
                id: 'beta',
                x: 90,
                y: 80,
                radius: 8,
                ownerId: 'blue',
            },
        ] as unknown as TerritoryWorkerGeometryRequest['stars'],
        lanes: [
            {
                sourceId: 'alpha',
                targetId: 'beta',
                distance: 100,
                laneWaypoints: [[50, 50]],
                lanePathKind: 'straight',
                laneConstraintStatus: 'ok',
            },
        ] as unknown as TerritoryWorkerGeometryRequest['lanes'],
        world: { width: 100, height: 100 },
        tunables: TEST_TUNABLES,
        ownership: {
            version: 'ownership:same',
            starOwners: new Map([
                ['alpha', 'red'],
                ['beta', 'blue'],
            ]),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        },
        selection: {
            ownershipMode: 'star_ownership_snapshot',
            geometryMode: 'resolved_power_voronoi',
            fillTransitionMode: 'pv_frontline',
            borderTransitionMode: 'off',
            styleMode: 'vector',
        },
        previousGeometry: null,
        ...overrides,
    };
}

describe('TerritoryWorker geometry cache', () => {
    it('hits for identical spatial input and invalidates when star positions change', () => {
        const compute = vi.fn((request: { stars: readonly { x: number }[] }) =>
            buildGeometry(`geometry:${request.stars[0]?.x ?? 0}`),
        );
        const worker = new TerritoryWorker({ compute } as never);

        const first = worker.computeGeometrySync(buildRequest());
        const repeated = worker.computeGeometrySync(
            buildRequest({ requestId: 'request-2' }),
        );
        const moved = worker.computeGeometrySync(
            buildRequest({
                requestId: 'request-3',
                stars: [
                    {
                        id: 'alpha',
                        x: 11,
                        y: 20,
                        radius: 8,
                        ownerId: 'red',
                    },
                    {
                        id: 'beta',
                        x: 90,
                        y: 80,
                        radius: 8,
                        ownerId: 'blue',
                    },
                ] as unknown as TerritoryWorkerGeometryRequest['stars'],
            }),
        );

        expect(first.fromCache).toBe(false);
        expect(repeated.fromCache).toBe(true);
        expect(repeated.geometry).toBe(first.geometry);
        expect(moved.fromCache).toBe(false);
        expect(moved.geometry.version).toBe('geometry:11');
        expect(compute).toHaveBeenCalledTimes(2);
        expect(worker.stats()).toMatchObject({
            spatialTopologySignatureScanCount: 3,
            spatialTopologySignatureReuseCount: 0,
            repeatedSpatialTopologySignatureScanCount: 1,
        });
    });

    it('reuses spatial topology identity while the same board arrays are stable', () => {
        const compute = vi.fn(() => buildGeometry('geometry:same'));
        const worker = new TerritoryWorker({ compute } as never);
        const request = buildRequest();

        const first = worker.computeGeometrySync(request);
        const repeated = worker.computeGeometrySync({
            ...request,
            requestId: 'request-2',
        });

        expect(repeated.fromCache).toBe(true);
        expect(repeated.geometry).toBe(first.geometry);
        expect(compute).toHaveBeenCalledTimes(1);
        expect(worker.stats()).toMatchObject({
            spatialTopologySignatureScanCount: 1,
            spatialTopologySignatureReuseCount: 1,
            repeatedSpatialTopologySignatureScanCount: 0,
        });
    });

    it('uses the board layout key without scanning when game-frame arrays are rebuilt', () => {
        const compute = vi.fn(() => buildGeometry('geometry:session'));
        const worker = new TerritoryWorker({ compute } as never);
        const boardLayoutKey = 'session:42:stars:2:lanes:1:world:100:100';

        const first = worker.computeGeometrySync(
            buildRequest({ boardLayoutKey }),
        );
        const repeated = worker.computeGeometrySync(
            buildRequest({ requestId: 'request-2', boardLayoutKey }),
        );
        const nextSession = worker.computeGeometrySync(
            buildRequest({
                requestId: 'request-3',
                boardLayoutKey: 'session:43:stars:2:lanes:1:world:100:100',
            }),
        );

        expect(first.fromCache).toBe(false);
        expect(repeated.fromCache).toBe(true);
        expect(repeated.geometry).toBe(first.geometry);
        expect(nextSession.fromCache).toBe(false);
        expect(compute).toHaveBeenCalledTimes(2);
        expect(worker.stats()).toMatchObject({
            spatialTopologySignatureScanCount: 0,
            spatialTopologySignatureReuseCount: 1,
            repeatedSpatialTopologySignatureScanCount: 0,
            boardLayoutKeyUseCount: 3,
            boardLayoutKeyChangeCount: 1,
        });
    });

    it('invalidates when lane topology changes with the same ownership and counts', () => {
        const compute = vi.fn((request: TerritoryWorkerGeometryRequest) =>
            buildGeometry(
                `geometry:${request.lanes[0]?.laneWaypoints?.[0]?.[0] ?? 0}`,
            ),
        );
        const worker = new TerritoryWorker({ compute } as never);

        const first = worker.computeGeometrySync(buildRequest());
        const rerouted = worker.computeGeometrySync(
            buildRequest({
                requestId: 'request-2',
                lanes: [
                    {
                        sourceId: 'alpha',
                        targetId: 'beta',
                        distance: 100,
                        laneWaypoints: [[55, 50]],
                        lanePathKind: 'straight',
                        laneConstraintStatus: 'ok',
                    },
                ] as unknown as TerritoryWorkerGeometryRequest['lanes'],
            }),
        );

        expect(first.fromCache).toBe(false);
        expect(rerouted.fromCache).toBe(false);
        expect(rerouted.geometry.version).toBe('geometry:55');
        expect(compute).toHaveBeenCalledTimes(2);
        expect(worker.stats()).toMatchObject({
            spatialTopologySignatureScanCount: 2,
            spatialTopologySignatureReuseCount: 0,
            repeatedSpatialTopologySignatureScanCount: 0,
        });
    });
});
