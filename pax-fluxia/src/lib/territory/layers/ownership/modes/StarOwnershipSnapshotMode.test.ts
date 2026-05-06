import { describe, expect, it } from 'vitest';

import { StarOwnershipSnapshotMode } from './StarOwnershipSnapshotMode';

describe('StarOwnershipSnapshotMode', () => {
    it('does not spawn virtual stars on conquest', () => {
        const mode = new StarOwnershipSnapshotMode();

        const snapshot = mode.compute({
            nowMs: 1234,
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [],
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
                starId: 'star-1',
                previousOwner: 'red',
                newOwner: 'blue',
                atMs: 1234,
            },
        ]);
        expect(snapshot.virtualStars).toEqual([]);
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
