import type { ConquestEvent } from '@pax/common';
import type { TerritoryRegionShape } from '../../contracts/GeometryContracts';
import type {
    GridAdjacency,
    GridClassification,
    GridDistribution,
    GridOriginMode,
    GridOwnedStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWaveSeeding,
} from './metaballGridTypes';

export interface MetaballGridPlanWorkerStarPosition {
    readonly id: string;
    readonly x: number;
    readonly y: number;
}

export interface MetaballGridPlanWorkerRequest {
    readonly requestId: number;
    readonly planKey: string;
    readonly world: { width: number; height: number; minX?: number; minY?: number };
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly maxCells: number;
    readonly adjacency: GridAdjacency;
    readonly waveGeometry: GridWaveGeometry;
    readonly waveSeeding: GridWaveSeeding;
    readonly conquestEvents: readonly ConquestEvent[];
    readonly prevRegions: readonly TerritoryRegionShape[];
    readonly nextRegions: readonly TerritoryRegionShape[];
    readonly sameSnapshot: boolean;
    readonly prevOwnedStars: readonly GridOwnedStar[];
    readonly nextOwnedStars: readonly GridOwnedStar[];
    readonly starPositions: readonly MetaballGridPlanWorkerStarPosition[];
}

export interface MetaballGridPlanWorkerResponse {
    readonly requestId: number;
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
}
