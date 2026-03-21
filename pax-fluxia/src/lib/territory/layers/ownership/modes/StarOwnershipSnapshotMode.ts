import type {
    OwnershipLayerInput,
    OwnershipMode,
    OwnershipSnapshot,
    TerritoryConquestEvent,
} from '../OwnershipMode';

export class StarOwnershipSnapshotMode implements OwnershipMode {
    readonly id = 'star_ownership_snapshot' as const;
    readonly label = 'Star Ownership Snapshot';

    compute(input: OwnershipLayerInput): OwnershipSnapshot {
        const starOwners = new Map<string, string>();
        for (const star of input.stars) {
            if (star.ownerId) {
                starOwners.set(star.id, star.ownerId);
            }
        }

        const contestedLaneIds: string[] = [];
        for (const lane of input.lanes) {
            const ownerA = starOwners.get(lane.sourceId);
            const ownerB = starOwners.get(lane.targetId);
            if (ownerA && ownerB && ownerA !== ownerB) {
                contestedLaneIds.push(`${lane.sourceId}:${lane.targetId}`);
            }
        }

        const conquestEvents = this.computeConquestEvents(
            input,
            starOwners,
        );

        return {
            version: `ownership:${input.nowMs}:${input.stars.length}`,
            starOwners,
            contestedLaneIds,
            conquestEvents,
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
