import type {
    OwnershipLayerInput,
    OwnershipMode,
    OwnershipSnapshot,
    TerritoryConquestEvent,
    VirtualStar,
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
        const virtualStars = this.computeVirtualStars(input, conquestEvents);

        return {
            version: `ownership:${input.nowMs}:${input.stars.length}:${virtualStars.length}`,
            starOwners,
            contestedLaneIds,
            conquestEvents,
            virtualStars,
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

    private computeVirtualStars(
        input: OwnershipLayerInput,
        conquestEvents: readonly TerritoryConquestEvent[],
    ): VirtualStar[] {
        const starById = new Map(input.stars.map((star) => [star.id, star]));

        // Carry forward existing virtual stars (transition layer manages expiry)
        const ongoing = (input.previousSnapshot?.virtualStars ?? [])
            .map((virtualStar) => {
                const anchorStar = starById.get(virtualStar.starId);
                return {
                    ...virtualStar,
                    pos: anchorStar
                        ? { x: anchorStar.x, y: anchorStar.y }
                        : virtualStar.pos,
                };
            });

        // Spawn new virtual stars from conquest events
        const spawned = conquestEvents.flatMap((event): VirtualStar[] => {
            const star = starById.get(event.starId);
            if (!star) {
                return [];
            }

            return [
                {
                    id: `vs:${event.starId}:${event.atMs}`,
                    starId: event.starId,
                    ownerId: event.newOwner,
                    pos: { x: star.x, y: star.y },
                    weight: 1, // Initial weight — transition layer applies decay
                    conquestEventAtMs: event.atMs,
                },
            ];
        });

        return [...ongoing, ...spawned];
    }
}
