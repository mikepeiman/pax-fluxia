import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { RenderFamilyActiveTransition } from '../families/RenderFamilyTypes';

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
