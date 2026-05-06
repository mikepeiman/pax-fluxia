import type {
    OwnershipLayerInput,
    OwnershipMode,
    OwnershipSnapshot,
    TerritoryConquestEvent,
} from '../OwnershipMode';
import {
    buildOwnershipContestedLaneIds,
    buildOwnershipStarOwners,
    buildOwnershipVersion,
} from '../ownershipSnapshotUtils';

export class StarOwnershipSnapshotMode implements OwnershipMode {
    readonly id = 'star_ownership_snapshot' as const;
    readonly label = 'Star Ownership Snapshot';

    compute(input: OwnershipLayerInput): OwnershipSnapshot {
        const starOwners = buildOwnershipStarOwners(input.stars);
        const contestedLaneIds = buildOwnershipContestedLaneIds(
            input.lanes,
            starOwners,
        );

        const conquestEvents = this.computeConquestEvents(
            input,
            starOwners,
        );

        return {
            // Ownership identity must reflect ownership truth only.
            version: buildOwnershipVersion(starOwners),
            starOwners,
            contestedLaneIds,
            conquestEvents,
            // Virtual stars are not part of the PVV4 conquest mechanism.
            virtualStars: [],
        };
    }

    private computeConquestEvents(
        input: OwnershipLayerInput,
        starOwners: ReadonlyMap<string, string>,
    ): TerritoryConquestEvent[] {
        if (!input.previousSnapshot) {
            return [];
        }

        const events: TerritoryConquestEvent[] = [];
        for (const [starId, newOwner] of starOwners.entries()) {
            const previousOwner = input.previousSnapshot.starOwners.get(starId);
            if (previousOwner && previousOwner !== newOwner) {
                events.push({
                    starId,
                    previousOwner,
                    newOwner,
                    atMs: input.nowMs,
                });
            }
        }

        return events;
    }
}
