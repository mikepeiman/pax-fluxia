import type { StarConnection, StarState } from '$lib/types/game.types';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type {
    TerritoryTunables,
    TerritoryWorldBounds,
} from '../contracts/TerritoryFrameInput';
import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';

export interface TerritoryWorkerGeometryRequest {
    requestId: string;
    nowMs: number;
    boardLayoutKey?: string;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    world: TerritoryWorldBounds;
    tunables: TerritoryTunables;
    ownership: OwnershipSnapshot;
    selection: TerritoryModeSelection;
    previousGeometry?: GeometrySnapshot | null;
}

export interface TerritoryWorkerGeometryResponse {
    requestId: string;
    geometry: GeometrySnapshot;
    fromCache: boolean;
}
