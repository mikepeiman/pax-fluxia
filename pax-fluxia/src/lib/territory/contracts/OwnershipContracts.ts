import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    OwnershipModeId,
} from './TerritoryModeSelection';

export interface TerritoryConquestEvent {
    starId: string;
    previousOwner: string;
    newOwner: string;
    atMs: number;
    attackerStarId?: string;
    attackerStarIds?: readonly string[];
    attackerShipTransfers?: readonly number[];
}

/**
 * Spatial identity of a virtual star — WHO it belongs to, WHERE it is.
 * Lifecycle timing (how long it lives, weight decay) belongs in the transition layer.
 */
export interface VirtualStar {
    id: string;
    /** The real star this virtual star is anchored to */
    starId: string;
    /** The owner this virtual star represents */
    ownerId: string;
    /** Current position (may track the anchor star) */
    pos: {
        x: number;
        y: number;
    };
    /** Geometry weight (how much it influences Voronoi) — set by transition layer */
    weight: number;
    /** The conquest event that spawned this virtual star */
    conquestEventAtMs: number;
}

export interface OwnershipSnapshot {
    version: string;
    starOwners: ReadonlyMap<string, string>;
    contestedLaneIds: readonly string[];
    conquestEvents: readonly TerritoryConquestEvent[];
    virtualStars: readonly VirtualStar[];
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
