import type { ConquestEvent as EngineConquestEvent } from '@pax/common';
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
        const authoritativeEvents = this.buildAuthoritativeConquestEvents(
            input.authoritativeConquests ?? [],
            input.nowMs,
        );
        if (!input.previousSnapshot) {
            return authoritativeEvents;
        }

        const authoritativeStarIds = new Set(
            authoritativeEvents.map((event) => event.starId),
        );
        const diffEvents = this.buildDiffConquestEvents(
            input.previousSnapshot.starOwners,
            starOwners,
            input.nowMs,
            authoritativeStarIds,
        );
        if (authoritativeEvents.length === 0) {
            return diffEvents;
        }
        return [...authoritativeEvents, ...diffEvents];
    }

    private buildAuthoritativeConquestEvents(
        conquests: readonly EngineConquestEvent[],
        atMs: number,
    ): TerritoryConquestEvent[] {
        const events: TerritoryConquestEvent[] = [];
        for (const conquest of conquests) {
            events.push({
                tick: conquest.tick,
                starId: conquest.starId,
                previousOwner: conquest.previousOwner,
                newOwner: conquest.newOwner,
                atMs,
                attackerStarId: conquest.attackerStarId,
                attackerStarIds: conquest.attackerStarIds,
                attackerShipTransfers: conquest.attackerShipTransfers,
                shipsCaptured: conquest.shipsCaptured,
                shipsEscaped: conquest.shipsEscaped,
                shipsDestroyed: conquest.shipsDestroyed,
                shipsTransferred: conquest.shipsTransferred,
                conquestType: conquest.conquestType,
                retreatTargetId: conquest.retreatTargetId,
                scatterTargetIds: conquest.scatterTargetIds,
                scatterShipCounts: conquest.scatterShipCounts,
            });
        }
        return events;
    }

    private buildDiffConquestEvents(
        previousStarOwners: ReadonlyMap<string, string>,
        starOwners: ReadonlyMap<string, string>,
        atMs: number,
        excludedStarIds: ReadonlySet<string>,
    ): TerritoryConquestEvent[] {
        const events: TerritoryConquestEvent[] = [];
        for (const [starId, newOwner] of starOwners.entries()) {
            if (excludedStarIds.has(starId)) {
                continue;
            }
            const previousOwner = previousStarOwners.get(starId);
            if (previousOwner && previousOwner !== newOwner) {
                events.push({
                    starId,
                    previousOwner,
                    newOwner,
                    atMs,
                });
            }
        }
        return events;
    }
}
