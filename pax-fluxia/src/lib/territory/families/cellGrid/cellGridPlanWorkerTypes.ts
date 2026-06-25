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
} from './cellGridTypes';

export interface CellGridPlanWorkerStarPosition {
    readonly id: string;
    readonly x: number;
    readonly y: number;
}

export interface CellGridPlanWorkerRequest {
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
    readonly starPositions: readonly CellGridPlanWorkerStarPosition[];
}

export interface CellGridPlanWorkerResponse {
    readonly requestId: number;
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
}
