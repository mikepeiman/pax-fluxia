import type { StarState } from '$lib/types/game.types';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { RenderFamilyActiveTransition } from '../families/RenderFamilyTypes';

function starOwnerById(stars: ReadonlyArray<StarState>): Map<string, string | null> {
    const ownerById = new Map<string, string | null>();
    for (const star of stars) ownerById.set(star.id, star.ownerId ?? null);
    return ownerById;
}

export function transitionHasPostConquestOwners(params: {
    readonly activeTransition: RenderFamilyActiveTransition | null;
    readonly stars: ReadonlyArray<StarState>;
}): boolean {
    const events = params.activeTransition?.events ?? [];
    if (events.length === 0) return false;

    const ownerById = starOwnerById(params.stars);
    for (const entry of events) {
        if ((ownerById.get(entry.event.starId) ?? null) !== entry.event.newOwner) {
            return false;
        }
    }
    return true;
}

export function ownershipSnapshotHasPreviousConquestOwners(params: {
    readonly activeTransition: RenderFamilyActiveTransition | null;
    readonly ownership: OwnershipSnapshot | null;
}): boolean {
    const events = params.activeTransition?.events ?? [];
    if (events.length === 0 || !params.ownership) return false;

    for (const entry of events) {
        if (
            (params.ownership.starOwners.get(entry.event.starId) ?? null) !==
            entry.event.previousOwner
        ) {
            return false;
        }
    }
    return true;
}
