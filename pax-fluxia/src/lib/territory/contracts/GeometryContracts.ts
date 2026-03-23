import type {
    GeometryModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryTunables, TerritoryWorldBounds } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';

// ─── Core geometry output types ─────────────────────────────────────────────

export interface TerritoryRegionShape {
    ownerId: string;
    points: [number, number][];
}

export interface FrontierPolylineShape {
    ownerPairKey: string;
    points: [number, number][];
}

/**
 * SharedFrontierMap: keyed by ownerPairKey (e.g. "red|blue"), value is the
 * canonical frontier polyline shared between two territories. Both fills
 * reference this same polyline data — guaranteeing fill/border coincidence.
 */
export type SharedFrontierMap = ReadonlyMap<string, FrontierPolylineShape>;

// ─── Snapshot: the immutable geometry output of one computation ─────────────

export interface GeometrySnapshot {
    version: string;
    sourceMode: GeometryModeId;
    sourceStyle: TerritoryStyleModeId;
    ownershipVersion: string;
    territoryRegions: readonly TerritoryRegionShape[];
    frontierPolylines: readonly FrontierPolylineShape[];
    sharedFrontierMap: SharedFrontierMap;

    /**
     * @deprecated Temporary bridge to legacy PowerVoronoi data.
     * This will be removed once all consumers use the clean contract types above.
     * Do NOT add new code that reads from this field.
     */
    legacyGeometryBridge?: unknown;
}

// ─── Input to the geometry layer ────────────────────────────────────────────

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

// ─── Geometry mode interface ────────────────────────────────────────────────

export interface GeometryMode {
    readonly id: GeometryModeId;
    readonly label: string;
    compute(input: GeometryLayerInput): GeometrySnapshot;
}

