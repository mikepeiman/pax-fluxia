import type {
    GeometryModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryTunables, TerritoryWorldBounds } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type { FrontierTopology } from './FrontierTopologyContracts';

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
 * SharedFrontierMap: keyed by ownerPairKey (e.g. "red|blue"), value is an ARRAY
 * of canonical frontier polylines shared between two territories.
 *
 * MULTIMAP (D-90): ownerPairKey is NOT unique — two owners can share multiple
 * disconnected border segments. Using a single-value Map silently drops segments.
 * See POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md.
 */
export type SharedFrontierMap = ReadonlyMap<string, FrontierPolylineShape[]>;

// ─── Snapshot: the immutable geometry output of one computation ─────────────

export interface GeometrySnapshot {
    version: string;
    sourceMode: GeometryModeId;
    sourceStyle: TerritoryStyleModeId;
    ownershipVersion: string;
    territoryRegions: readonly TerritoryRegionShape[];
    frontierPolylines: readonly FrontierPolylineShape[];
    /** World-boundary border polylines (owner↔world edges). Needed by transition
     *  layer to re-chain fills from interpolated borders. */
    worldBorderPolylines: readonly FrontierPolylineShape[];
    sharedFrontierMap: SharedFrontierMap;

    /** Semantic frontier topology — new canonical format.
     *  Optional during migration; will become required once all consumers are updated.
     *  See Phase 1 of the Frontier Topology Project. */
    frontierTopology?: FrontierTopology;

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

