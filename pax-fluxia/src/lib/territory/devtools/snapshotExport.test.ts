import { describe, expect, it } from 'vitest';
import {
    serializeOwnershipSnapshotForExport,
    toSerializableExportValue,
} from './snapshotExport';

describe('toSerializableExportValue', () => {
    it('converts string-keyed maps and sets into deterministic JSON-friendly values', () => {
        const value = {
            sections: new Map([
                ['b', { active: true }],
                ['a', { active: false }],
            ]),
            tags: new Set(['delta', 'alpha']),
        };

        expect(toSerializableExportValue(value)).toEqual({
            sections: {
                a: { active: false },
                b: { active: true },
            },
            tags: ['alpha', 'delta'],
        });
    });
});

describe('serializeOwnershipSnapshotForExport', () => {
    it('preserves ownership truth while converting maps to a deterministic export shape', () => {
        const snapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                ['star-2', 'ai-2'],
                ['star-1', 'human-player'],
            ]),
            contestedLaneIds: ['lane-2', 'lane-1'],
            conquestEvents: [
                {
                    starId: 'star-9',
                    previousOwner: 'ai-4',
                    newOwner: 'ai-3',
                    atMs: 1234,
                    attackerStarIds: ['star-7', 'star-6'],
                    attackerShipTransfers: [4, 2],
                },
            ],
            virtualStars: [
                {
                    id: 'vs-2',
                    starId: 'star-9',
                    ownerId: 'ai-4',
                    pos: { x: 10, y: 20 },
                    weight: 0.5,
                    conquestEventAtMs: 1234,
                },
                {
                    id: 'vs-1',
                    starId: 'star-8',
                    ownerId: 'ai-3',
                    pos: { x: 30, y: 40 },
                    weight: 0.25,
                    conquestEventAtMs: 1234,
                },
            ],
        };

        expect(serializeOwnershipSnapshotForExport(snapshot)).toEqual({
            version: 'ownership:test',
            starOwners: {
                'star-1': 'human-player',
                'star-2': 'ai-2',
            },
            contestedLaneIds: ['lane-1', 'lane-2'],
            conquestEvents: [
                {
                    starId: 'star-9',
                    previousOwner: 'ai-4',
                    newOwner: 'ai-3',
                    atMs: 1234,
                    attackerStarIds: ['star-6', 'star-7'],
                    attackerShipTransfers: [4, 2],
                },
            ],
            virtualStars: [
                {
                    id: 'vs-1',
                    starId: 'star-8',
                    ownerId: 'ai-3',
                    pos: { x: 30, y: 40 },
                    weight: 0.25,
                    conquestEventAtMs: 1234,
                },
                {
                    id: 'vs-2',
                    starId: 'star-9',
                    ownerId: 'ai-4',
                    pos: { x: 10, y: 20 },
                    weight: 0.5,
                    conquestEventAtMs: 1234,
                },
            ],
        });
    });
});
