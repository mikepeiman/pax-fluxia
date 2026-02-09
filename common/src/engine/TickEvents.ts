// ============================================================================
// Tick Events — Emitted by shared GameEngine for client-side visualization
// ============================================================================
// These events are produced each tick and broadcast to clients for animations,
// combat logs, and other visual feedback that the schema sync alone can't convey.

export interface TransferEvent {
    sourceId: string;
    targetId: string;
    ownerId: string;
    shipCount: number;
}

export interface CombatEvent {
    tick: number;
    attackerIds: string[];
    attackerOwnerId: string;
    defenderId: string;
    defenderOwnerId: string;
    totalAttackForce: number;
    defenderForce: number;
    killsOnDefender: number;
    disabledOnDefender: number;
    killsOnAttacker: number;
    disabledOnAttacker: number;
    conquered: boolean;
}

export interface ConquestEvent {
    tick: number;
    starId: string;
    previousOwner: string;
    newOwner: string;
    shipsCaptured: number;
    shipsEscaped: number;
    shipsDestroyed: number;
    retreatTargetId?: string;
    scatterTargetIds?: string[];
    scatterShipCounts?: number[];
}

export interface TickEvents {
    transfers: TransferEvent[];
    combats: CombatEvent[];
    conquests: ConquestEvent[];
}

export function createEmptyTickEvents(): TickEvents {
    return {
        transfers: [],
        combats: [],
        conquests: [],
    };
}
