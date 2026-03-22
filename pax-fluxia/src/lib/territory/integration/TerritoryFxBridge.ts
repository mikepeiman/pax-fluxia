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
