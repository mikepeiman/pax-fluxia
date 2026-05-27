import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { StarState } from '$lib/types/game.types';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { RenderFamilyActiveTransition } from '../families/RenderFamilyTypes';
import {
    ownershipSnapshotHasPreviousConquestOwners,
    transitionHasPostConquestOwners,
} from './renderFamilyPreviousFrame';

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

function star(id: string, ownerId: string): StarState {
    return {
        id,
        ownerId,
        x: 0,
        y: 0,
        type: 'standard',
        ships: 0,
        maxShips: 0,
        shipProduction: 0,
        radius: 10,
    } as StarState;
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
    it('requires every conquest star to have the new owner before rendering the transition', () => {
        const transition = activeTransition([
            conquest(),
            conquest({
                tick: 12,
                starId: 's2',
                previousOwner: 'p3',
                newOwner: 'p4',
            }),
        ]);

        expect(
            transitionHasPostConquestOwners({
                activeTransition: transition,
                stars: [star('s1', 'p2'), star('s2', 'p3')],
            }),
        ).toBe(false);

        expect(
            transitionHasPostConquestOwners({
                activeTransition: transition,
                stars: [star('s1', 'p2'), star('s2', 'p4')],
            }),
        ).toBe(true);
    });

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
