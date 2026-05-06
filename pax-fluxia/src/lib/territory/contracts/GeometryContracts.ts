import type {
    GeometryModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryTunables, TerritoryWorldBounds } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type { FrontierTopology } from './FrontierTopologyContracts';
import type { MinStarMarginDiagnostics } from '../geometry/minStarMargin';

// ─── Family & Method Discrimination ────────────────────────────────────────

/** Whether geometry was computed from exact vector construction or traced from sampled field. */
export type GeometryFamily = 'vector-native' | 'raster-derived';

/** How the geometry was computed — provenance for downstream consumers. */
export type GeometrySourceMethod =
    | 'power_voronoi'
    | 'fg2_enriched'
    | 'raster_distance'
    | 'raster_graph'
    | 'raster_lane'
    | 'raster_contour'
    | 'raster_sdf';

// ─── Resolved Frontier Polyline ─────────────────────────────────────────────

/** A single frontier polyline with stable identity and provenance. */
export interface ResolvedFrontierPolyline {
    /** Stable frontier identifier. */
    frontierId: string;
    /** Owner on side A. */
    ownerA: string;
    /** Owner on side B. Use '__world__' for world boundary. */
    ownerB: string;
    /** Normalized owner-pair key (sorted, e.g. "red|blue"). */
    ownerPairKey: string;
    /** Full smoothed point array. Smoothing is applied in the geometry compiler (geometry concern). */
    points: [number, number][];
    /** True if this polyline forms a closed loop. */
    closed?: boolean;
    /** 0–1 confidence score. Vector-native = 1.0, raster-derived < 1.0. */
    confidence: number;
}

// ─── Shell Structure (FG2 Concepts Absorbed) ────────────────────────────────

/**
 * An owner's territory shell: one outer boundary ring + its contained holes.
 * Absorbs FG2's FG2OwnerShellArtifact concept into the resolved geometry pipeline.
 */
export interface ResolvedShell {
    /** Stable shell identifier. */
    shellId: string;
    /** Owner of this shell. */
    ownerId: string;
    /** Optional star/site membership carried through when the source geometry can identify this shell deterministically.
     *  May include virtual-site IDs. Consumers that need only real gameplay stars should read `anchorStarIds`. */
    starIds?: string[];
    /** Real gameplay star IDs only (no virtual CX/DX/disconnect sites).
     *  When populated, downstream consumers must prefer this over `starIds` for gameplay-identity uses. */
    anchorStarIds?: string[];
    /** Virtual-site IDs (CX, DX, lane-pair ghosts) that contributed to this shell's geometry. */
    contributingSiteIds?: string[];
    /** Outer boundary points (clockwise winding). Chaikin-smoothed in the compiler. */
    points: [number, number][];
    /** Area of the outer boundary (shoelace formula). */
    area: number;
    /** Absolute area (always positive). */
    absArea: number;
    /** 0–1 confidence score. */
    confidence: number;
    /** IDs of ResolvedShellLoop instances that are holes inside this shell. */
    holeLoopIds: string[];
}

/**
 * A single loop within a shell: either the outer boundary or a hole.
 * Classification absorbs FG2's face-walk → shell concept.
 */
export interface ResolvedShellLoop {
    /** Stable loop identifier. */
    shellLoopId: string;
    /** Shell this loop belongs to (if classified). */
    shellId?: string;
    /** Owner of this loop. */
    ownerId: string;
    /** Optional star/site membership carried through when the source geometry can identify this loop deterministically.
     *  May include virtual-site IDs. Consumers that need only real gameplay stars should read `anchorStarIds`. */
    starIds?: string[];
    /** Real gameplay star IDs only (no virtual CX/DX/disconnect sites). */
    anchorStarIds?: string[];
    /** Virtual-site IDs (CX, DX, lane-pair ghosts) that contributed to this loop's geometry. */
    contributingSiteIds?: string[];
    /** Points forming the loop boundary. */
    points: [number, number][];
    /** Classification of this loop within its shell. */
    classification: 'outer' | 'hole' | 'border' | 'unknown';
    /** 0–1 confidence score. */
    confidence: number;
}

// ─── Territory Region ───────────────────────────────────────────────────────

/** A territory region with identity and confidence. */
export interface TerritoryRegionShape {
    /** Stable region identifier.
     *  Deterministic across equivalent snapshots — must not depend on enumeration/index order. */
    regionId: string;
    /** Owner of this region. */
    ownerId: string;
    /** Optional star/site membership carried through when the source geometry can identify the owning region deterministically.
     *  May include virtual-site IDs. Consumers that need only real gameplay stars should read `anchorStarIds`. */
    starIds?: string[];
    /** Real gameplay star IDs only (no virtual CX/DX/disconnect sites). */
    anchorStarIds?: string[];
    /** Virtual-site IDs (CX, DX, lane-pair ghosts) that contributed to this region's geometry. */
    contributingSiteIds?: string[];
    /** Boundary points. */
    points: [number, number][];
    /** 0–1 confidence score. */
    confidence: number;
}

// ─── Provenance & Diagnostics ───────────────────────────────────────────────

/** Ownership field strategy (if geometry was raster-derived). */
export type OwnershipFieldStrategy =
    | 'distance'
    | 'graph'
    | 'lane'
    | 'contour'
    | 'sdf';

/** How this geometry was computed — explicit provenance tracked on every snapshot. */
export interface GeometryProvenance {
    /** True if this geometry was derived from a sampled ownership field. */
    derivedFromField: boolean;
    /** If raster-derived, which ownership field strategy produced the source data. */
    sourceFieldStrategy?: OwnershipFieldStrategy;
    /** If raster-derived, the sample grid parameters. */
    sampleGrid?: { cols: number; rows: number; cellWidth: number; cellHeight: number };
    /** Simplification tolerance applied during extraction (px). */
    simplifyTolerance?: number;
    /** Number of Chaikin smoothing passes applied in the compiler. */
    smoothPasses?: number;
    /** Free-form notes. */
    notes: string[];
}

/** Reliability signals for downstream consumers (transitions, presentation). */
export interface GeometryDiagnostics {
    /** Whether the topology (junctions, sections, loops) is structurally correct. */
    topologyReliable: boolean;
    /** Whether stable section/vertex IDs can be trusted across frames. */
    identityReliable: boolean;
    /** Whether all region loops are properly closed. */
    closureReliable: boolean;
    /** Optional stage-explicit geometry ladder for diagnostics and artifact export. */
    stageLadder?: GeometryStageLadder;
    /** Local MSR repair diagnostics from the universal geometry layer. */
    minStarMargin?: MinStarMarginDiagnostics;
    /** Free-form diagnostic notes. */
    notes: string[];
}

export type GeometryDebugStageId =
    | 'raw_shared_frontiers'
    | 'raw_world_borders'
    | 'resolved_shared_boundary_frontiers'
    | 'resolved_regions'
    | 'display_borders';

export interface GeometryStageLadder {
    /** Stable fingerprint for the resolved shared-boundary authority seam. */
    authoritativeSeamFingerprint: string;
    /** Stable fingerprint for the final display-border chain set derived from the seam. */
    displayBorderFingerprint: string;
    /** Effective MSR margin applied when resolving the shared seam. */
    appliedMarginPx: number;
    /** Raw inter-owner frontiers emitted upstream of shared-boundary resolution. */
    rawSharedFrontiers: readonly ResolvedFrontierPolyline[];
    /** Raw owner-vs-world borders emitted upstream of shared-boundary resolution. */
    rawWorldBorders: readonly ResolvedFrontierPolyline[];
    /** Resolved inter-owner frontiers after shared-boundary authority resolution. */
    resolvedSharedBoundaryFrontiers: readonly ResolvedFrontierPolyline[];
    /** Resolved owner-vs-world borders after shared-boundary authority resolution. */
    resolvedWorldBorders: readonly ResolvedFrontierPolyline[];
    /** Resolved territory regions reconstructed from the shared-boundary seam. */
    resolvedRegions: readonly TerritoryRegionShape[];
    /** Final display frontier chains derived from the resolved regions. */
    displayFrontierPolylines: readonly ResolvedFrontierPolyline[];
    /** Final display world-border chains derived from the resolved regions. */
    displayWorldBorderPolylines: readonly ResolvedFrontierPolyline[];
    /** Notes clarifying stage ownership and authority. */
    notes: readonly string[];
}

// ─── Resolved Geometry Snapshot ──────────────────────────────────────────────

/**
 * SharedFrontierMap: keyed by ownerPairKey (e.g. "red|blue"), value is an ARRAY
 * of vector frontier polylines shared between two territories.
 *
 * MULTIMAP (D-90): ownerPairKey is NOT unique — two owners can share multiple
 * disconnected border segments. Using a single-value Map silently drops segments.
 * See POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md.
 */
export type SharedFrontierMap = ReadonlyMap<string, ResolvedFrontierPolyline[]>;

/**
 * The immutable, rich geometry output of one computation — authoritative truth for
 * both vector-native and raster-derived geometry.
 *
 * This replaces the thin GeometrySnapshot. All downstream consumers (transitions,
 * presentation, devtools) consume this contract. There is NO legacyGeometryBridge.
 *
 * SMOOTHING: Chaikin smoothing is applied INSIDE the compiler (geometry concern).
 * Points in this snapshot are already smoothed. Renderers must NOT re-smooth.
 * Authority: TERRITORY_ARCHITECTURE.md L69, ARCHITECTURE_GUIDING_PRINCIPLES.md L64.
 */
export interface ResolvedGeometrySnapshot {
    // ── Identity ──
    /** Deterministic version hash of this geometry frame. */
    version: string;
    /** Which geometry mode produced this snapshot. */
    sourceMode: GeometryModeId;
    /** Which style mode was active when this was computed. */
    sourceStyle: TerritoryStyleModeId;
    /** Ownership version this geometry was computed from. */
    ownershipVersion: string;

    // ── Family & provenance ──
    /** Whether this geometry was computed from exact vector or traced from sampled field. */
    geometryFamily: GeometryFamily;
    /** Specific computation method used. */
    sourceMethod: GeometrySourceMethod;

    // ── Core geometry ──
    /** Territory regions with identity and confidence. */
    territoryRegions: readonly TerritoryRegionShape[];
    /** Inter-owner frontier polylines with stable identity. */
    frontierPolylines: readonly ResolvedFrontierPolyline[];
    /** World-boundary border polylines (owner↔world edges). */
    worldBorderPolylines: readonly ResolvedFrontierPolyline[];
    /** Multimap of frontiers by ownerPairKey (D-90 multimap). */
    sharedFrontierMap: SharedFrontierMap;

    // ── Rich topology (Phase 1, now mandatory) ──
    /** Semantic frontier topology: vertices, sections, loops, indexes.
     *  Transition planner and frame sampler consume this for identity-aware morphs. */
    frontierTopology: FrontierTopology;

    // ── Shell structure (FG2 concepts absorbed) ──
    /** Classified shells: one outer boundary + contained holes per territory island. */
    shells: readonly ResolvedShell[];
    /** All loops (outer + hole) with shell membership. */
    shellLoops: readonly ResolvedShellLoop[];

    // ── Provenance & diagnostics ──
    /** How this geometry was computed — explicit provenance. */
    provenance: GeometryProvenance;
    /** Reliability signals for downstream consumers. */
    diagnostics: GeometryDiagnostics;

    // NO legacyGeometryBridge. Deleted per architecture-first principle.
}

/**
 * @deprecated Use ResolvedGeometrySnapshot directly. This alias exists only
 * to reduce blast radius during migration (16 files import this name).
 * Will be removed in Step 3 or Step 4.
 */
export type GeometrySnapshot = ResolvedGeometrySnapshot;

// ─── Legacy type aliases (deprecated, for migration compatibility) ──────────

/**
 * @deprecated Use ResolvedFrontierPolyline. Kept as alias during migration.
 */
export type FrontierPolylineShape = ResolvedFrontierPolyline;

// ─── Input to the geometry layer ────────────────────────────────────────────

export interface GeometryLayerInput {
    nowMs: number;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    world: TerritoryWorldBounds;
    tunables: TerritoryTunables;
    ownership: OwnershipSnapshot;
    styleMode: TerritoryStyleModeId;
    previousSnapshot?: ResolvedGeometrySnapshot | null;
}

// ─── Geometry mode interface ────────────────────────────────────────────────

export interface GeometryMode {
    readonly id: GeometryModeId;
    readonly label: string;
    compute(input: GeometryLayerInput): ResolvedGeometrySnapshot;
}
