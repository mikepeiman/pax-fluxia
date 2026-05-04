import type { ConquestEvent } from '@pax/common';
import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';

export class TerritoryFxBridge {
    private pendingConquests: TerritoryConquestEvent[] = [];

    ingestConquest(event: ConquestEvent, nowMs: number): void {
        this.pendingConquests.push({
            starId: event.starId,
            previousOwner: event.previousOwner,
            newOwner: event.newOwner,
            atMs: nowMs,
            attackerStarId: event.attackerStarId,
            attackerStarIds: event.attackerStarIds
                ? [...event.attackerStarIds]
                : event.attackerStarId
                  ? [event.attackerStarId]
                  : undefined,
            attackerShipTransfers: event.attackerShipTransfers
                ? [...event.attackerShipTransfers]
                : undefined,
        });
    }

    consumeConquests(): TerritoryConquestEvent[] {
        const payload = this.pendingConquests;
        this.pendingConquests = [];
        return payload;
    }

    reset(): void {
        this.pendingConquests = [];
    }
}
