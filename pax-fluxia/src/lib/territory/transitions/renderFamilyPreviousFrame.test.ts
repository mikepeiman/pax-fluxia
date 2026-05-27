import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { RenderFamilyActiveTransition } from '../families/RenderFamilyTypes';
import { ownershipSnapshotHasPreviousConquestOwners } from './renderFamilyPreviousFrame';

function conquest(overrides: Partial<ConquestEvent> = {}): ConquestEvent {
    return {
        tick: 12,
        starId: 's1',
        previousOwner: 'p1',
        newOwner: 'p2',
        ...overrides,
    };
}

function activeTransition(
    events: ReadonlyArray<ConquestEvent>,
): RenderFamilyActiveTransition {
    return {
        sessionKey: 'tick:12',
        conquestEvents: events,
        events: events.map((event) => ({
            event,
            startedAtMs: 100,
            durationMs: 1000,
            progress: 0.25,
            rawProgress: 0.25,
        })),
        startedAtMs: 100,
        durationMs: 1000,
        progress: 0.25,
        rawProgress: 0.25,
    };
}

function ownership(entries: ReadonlyArray<readonly [string, string]>): OwnershipSnapshot {
    return {
        version: 'test',
        starOwners: new Map(entries),
        contestedLaneIds: [],
        conquestEvents: [],
        virtualStars: [],
    };
}

describe('renderFamilyPreviousFrame helpers', () => {
    it('validates that a cached ownership snapshot still represents PREV owners', () => {
        const transition = activeTransition([conquest()]);

        expect(
            ownershipSnapshotHasPreviousConquestOwners({
                activeTransition: transition,
                ownership: ownership([['s1', 'p1']]),
            }),
        ).toBe(true);

        expect(
            ownershipSnapshotHasPreviousConquestOwners({
                activeTransition: transition,
                ownership: ownership([['s1', 'p2']]),
            }),
        ).toBe(false);
    });
});
