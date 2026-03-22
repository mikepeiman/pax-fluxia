import type {
    TerritoryGeometryData,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type {
    GeometryModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryTunables, TerritoryWorldBounds } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';

export interface TerritoryRegionShape {
    ownerId: string;
    points: [number, number][];
}

export interface FrontierPolylineShape {
    ownerPairKey: string;
    points: [number, number][];
}

export interface GeometrySnapshot {
    version: string;
    sourceMode: GeometryModeId;
    sourceStyle: TerritoryStyleModeId;
    ownershipVersion: string;
    territoryGeometry: TerritoryGeometryData;
    territoryRegions: readonly TerritoryRegionShape[];
    frontierPolylines: readonly FrontierPolylineShape[];
}
export interface GeometryLayerInput {
    nowMs: number;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    world: TerritoryWorldBounds;
    tunables: TerritoryTunables;
    ownership: OwnershipSnapshot;
    styleMode: TerritoryStyleModeId;
    previousSnapshot?: GeometrySnapshot | null;
}

export interface GeometryMode {
    readonly id: GeometryModeId;
    readonly label: string;
    compute(input: GeometryLayerInput): GeometrySnapshot;
}
