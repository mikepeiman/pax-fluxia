import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    OwnershipModeId,
} from './TerritoryModeSelection';

export interface TerritoryConquestEvent {
    starId: string;
    previousOwner: string;
    newOwner: string;
    atMs: number;
}

export interface OwnershipSnapshot {
    version: string;
    starOwners: ReadonlyMap<string, string>;
    contestedLaneIds: readonly string[];
    conquestEvents: readonly TerritoryConquestEvent[];
}

export interface OwnershipLayerInput {
    nowMs: number;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    previousSnapshot?: OwnershipSnapshot | null;
}

export interface OwnershipMode {
    readonly id: OwnershipModeId;
    readonly label: string;
    compute(input: OwnershipLayerInput): OwnershipSnapshot;
}
