import { describe, expect, it } from 'vitest';

import {
    buildOwnershipSnapshotFromStarState,
    buildOwnershipVersion,
} from './ownershipSnapshotUtils';

describe('ownershipSnapshotUtils', () => {
    it('derives deterministic ownership state including contested lanes', () => {
        const snapshot = buildOwnershipSnapshotFromStarState({
            stars: [
                { id: 'star-1', x: 0, y: 0, ownerId: 'red' } as any,
                { id: 'star-2', x: 10, y: 0, ownerId: 'red' } as any,
                { id: 'star-3', x: 20, y: 0, ownerId: 'blue' } as any,
            ],
            lanes: [
                { sourceId: 'star-1', targetId: 'star-2' } as any,
                { sourceId: 'star-2', targetId: 'star-3' } as any,
            ],
        });

        expect(Object.fromEntries(snapshot.starOwners.entries())).toEqual({
            'star-1': 'red',
            'star-2': 'red',
            'star-3': 'blue',
        });
        expect(snapshot.contestedLaneIds).toEqual(['star-2:star-3']);
        expect(snapshot.version).toBe(
            buildOwnershipVersion(snapshot.starOwners, 0),
        );
    });
});
