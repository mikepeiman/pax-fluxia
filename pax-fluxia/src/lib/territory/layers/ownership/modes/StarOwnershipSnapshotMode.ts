import type {
    OwnershipLayerInput,
    OwnershipMode,
    OwnershipSnapshot,
    TerritoryConquestEvent,
    VirtualStar,
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
        const virtualStars = this.computeVirtualStars(input, conquestEvents);

        // Deterministic version from actual state — NOT from nowMs.
        // This allows downstream geometry caching to hit when ownership
        // is unchanged, while still invalidating on any conquest or
        // virtual-star change.
        return {
            version: buildOwnershipVersion(starOwners, virtualStars.length),
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
