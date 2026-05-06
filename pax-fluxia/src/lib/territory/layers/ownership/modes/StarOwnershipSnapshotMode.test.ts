import { describe, expect, it } from 'vitest';

import { StarOwnershipSnapshotMode } from './StarOwnershipSnapshotMode';

describe('StarOwnershipSnapshotMode', () => {
    it('prefers authoritative conquest events and does not spawn virtual stars', () => {
        const mode = new StarOwnershipSnapshotMode();

        const snapshot = mode.compute({
            nowMs: 1234,
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [],
            authoritativeConquests: [
                {
                    tick: 7,
                    starId: 'star-1',
                    attackerStarId: 'star-9',
                    attackerStarIds: ['star-9', 'star-8'],
                    attackerShipTransfers: [5, 2],
                    previousOwner: 'red',
                    newOwner: 'blue',
                    shipsCaptured: 3,
                    shipsEscaped: 1,
                    shipsDestroyed: 2,
                    shipsTransferred: 7,
                    conquestType: 'scatter',
                    scatterTargetIds: ['star-2'],
                    scatterShipCounts: [1],
                },
            ],
            previousSnapshot: {
                version: 'ownership:prev',
                starOwners: new Map([['star-1', 'red']]),
                contestedLaneIds: [],
                conquestEvents: [],
                virtualStars: [
                    {
                        id: 'vs-old',
                        starId: 'star-1',
                        ownerId: 'red',
                        pos: { x: 0, y: 0 },
                        weight: 1,
                        conquestEventAtMs: 1111,
                    },
                ],
            },
        });

        expect(snapshot.conquestEvents).toEqual([
            {
                tick: 7,
                starId: 'star-1',
                previousOwner: 'red',
                newOwner: 'blue',
                atMs: 1234,
                attackerStarId: 'star-9',
                attackerStarIds: ['star-9', 'star-8'],
                attackerShipTransfers: [5, 2],
                shipsCaptured: 3,
                shipsEscaped: 1,
                shipsDestroyed: 2,
                shipsTransferred: 7,
                conquestType: 'scatter',
                scatterTargetIds: ['star-2'],
                scatterShipCounts: [1],
            },
        ]);
        expect(snapshot.virtualStars).toEqual([]);
    });

    it('supplements authoritative conquest events with uncovered owner diffs', () => {
        const mode = new StarOwnershipSnapshotMode();

        const snapshot = mode.compute({
            nowMs: 2222,
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'blue' } as any,
                { id: 'star-2', x: 10, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [],
            authoritativeConquests: [
                {
                    tick: 8,
                    starId: 'star-1',
                    attackerStarId: 'star-9',
                    attackerStarIds: ['star-9'],
                    attackerShipTransfers: [4],
                    previousOwner: 'red',
                    newOwner: 'blue',
                    shipsCaptured: 2,
                    shipsEscaped: 0,
                    shipsDestroyed: 0,
                    shipsTransferred: 4,
                    conquestType: 'complete',
                },
            ],
            previousSnapshot: {
                version: 'ownership:prev',
                starOwners: new Map([
                    ['star-1', 'red'],
                    ['star-2', 'red'],
                ]),
                contestedLaneIds: [],
                conquestEvents: [],
                virtualStars: [],
            },
        });

        expect(snapshot.conquestEvents).toEqual([
            {
                tick: 8,
                starId: 'star-1',
                previousOwner: 'red',
                newOwner: 'blue',
                atMs: 2222,
                attackerStarId: 'star-9',
                attackerStarIds: ['star-9'],
                attackerShipTransfers: [4],
                shipsCaptured: 2,
                shipsEscaped: 0,
                shipsDestroyed: 0,
                shipsTransferred: 4,
                conquestType: 'complete',
            },
            {
                starId: 'star-2',
                previousOwner: 'red',
                newOwner: 'blue',
                atMs: 2222,
            },
        ]);
    });

    it('builds the same ownership version regardless of helper virtual stars', () => {
        const mode = new StarOwnershipSnapshotMode();

        const withoutHelpers = mode.compute({
            nowMs: 2000,
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'red' } as any,
                { id: 'star-2', x: 10, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [{ sourceId: 'star-1', targetId: 'star-2' } as any],
            previousSnapshot: null,
        });

        const withHelperResidue = mode.compute({
            nowMs: 2000,
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'red' } as any,
                { id: 'star-2', x: 10, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [{ sourceId: 'star-1', targetId: 'star-2' } as any],
            previousSnapshot: {
                ...withoutHelpers,
                virtualStars: [
                    {
                        id: 'vs-old',
                        starId: 'star-1',
                        ownerId: 'red',
                        pos: { x: 0, y: 0 },
                        weight: 1,
                        conquestEventAtMs: 1000,
                    },
                ],
            },
        });

        expect(withHelperResidue.version).toBe(withoutHelpers.version);
        expect(withHelperResidue.virtualStars).toEqual([]);
    });
});
