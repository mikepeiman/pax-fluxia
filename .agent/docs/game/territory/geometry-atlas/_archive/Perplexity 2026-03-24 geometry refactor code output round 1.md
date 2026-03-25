<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I would actually prefer for YOU to conduct this refactor and output the new files. Can you do this?

Yes. Within the limits of what I can see of your codebase, I can:

- Design the new contracts.
- Produce concrete TypeScript files (or full replacements) for those contracts.
- Sketch/wire up minimal new mode interfaces and adapter stubs so they actually compile with your existing patterns.[^1][^2][^3][^4]

You will still need to do the **repo-level integration** (move files, update imports, delete dead code, fix any project-specific details I can’t see), but I can give you drop-in files and edits that are as close to “paste and go” as possible.

Below is a first cut at actually doing Phase 1 of the refactor: defining the ownership-field contract and the richer canonical geometry contract, plus mode interfaces.

***

## 1. New ownership-field contract

Create a new file, for example:

`contract_OwnershipField.ts`

```ts
// contract_OwnershipField.ts
// First-class contract for sampled territory ownership fields (raster family)

import type { TerritoryWorldBounds } from './TerritoryFrameInput';
import type { OwnershipSnapshot } from './OwnershipContracts';

// Families and strategies for ownership fields produced by raster engines.
export type OwnershipFieldFamily = 'raster';

export type OwnershipFieldStrategy =
    | 'distance'      // pixel distance + optional graph distance (Pixel)
    | 'graph'         // barrier-aware graph distance (Graph)
    | 'lane'          // lane-influenced fields (Lane)
    | 'contour'       // contour-style sampling for marching squares (Contour)
    | 'sdf';          // distance-field-based ownership (DistanceField);

export interface OwnershipFieldBounds {
    /** World-space origin of the sampled field (minX, minY). */
    originX: number;
    originY: number;
    /** World-space size of the sampled field. */
    width: number;
    height: number;
    /** Optional explicit world bounds mirror for clarity/integration. */
    world?: TerritoryWorldBounds;
}

export interface OwnershipFieldSampleGrid {
    /** Number of columns (X samples) in the grid/texture. */
    cols: number;
    /** Number of rows (Y samples) in the grid/texture. */
    rows: number;
    /** World-space width of one cell. */
    cellWidth: number;
    /** World-space height of one cell. */
    cellHeight: number;
}

/**
 * OwnershipFieldSnapshot: sampled ownership of the map for a given strategy.
 * This is the primary output of raster ownership engines (Pixel, Graph, Lane,
 * Contour worker, DistanceField ownership RT, etc.).
 */
export interface OwnershipFieldSnapshot {
    /** Monotonic version or UUID for this field snapshot. */
    version: string;

    /** Underlying logical ownership snapshot this field corresponds to. */
    ownershipVersion: string;

    /** Always 'raster' for now; reserved for possible future families. */
    family: OwnershipFieldFamily;

    /** Which raster strategy produced this field. */
    strategy: OwnershipFieldStrategy;

    /** World-space coverage of the field. */
    bounds: OwnershipFieldBounds;

    /** Sampling grid metadata (size and resolution). */
    grid: OwnershipFieldSampleGrid;

    /** Unique owner ids present in this field, in index order. */
    ownerIds: readonly string[];

    /** Convenience map from owner id to index (0-based). */
    ownerIndexById: ReadonlyMap<string, number>;

    /**
     * Core ownership data: for each grid cell, which owner index wins.
     * Length must be grid.cols * grid.rows, row-major.
     * -1 may be used to mean "no owner / unclaimed".
     */
    ownerIndexGrid: Int16Array | Uint16Array;

    /**
     * Optional per-cell confidence (0..1) in the winning owner.
     * Same layout as ownerIndexGrid.
     */
    confidenceGrid?: Float32Array;

    /**
     * Optional nearest-boundary distance field, in world units or sample units.
     * Same layout as ownerIndexGrid.
     */
    nearestBoundaryDistance?: Float32Array;

    /**
     * Optional second-best influence delta or similar metric indicating how
     * ambiguous ownership is at each sample.
     */
    secondBestDelta?: Float32Array;

    /**
     * Optional barrier and lane metadata that informed the field computation.
     * These should be in world-space coordinates.
     */
    barrierSegments?: readonly [number, number, number, number][]; // x1,y1,x2,y2
    laneSegments?: readonly [number, number, number, number, number][]; // x1,y1,x2,y2,ownerIdx

    /** Number of virtual sites used (corridors, disconnects, etc.), if any. */
    virtualSiteCount?: number;

    /** Provenance and diagnostics for debugging + change classification. */
    diagnostics?: {
        /** Hash/fingerprint of the geometry inputs that drove this field. */
        topologyFingerprint?: string;
        /** Hash/fingerprint of the sampling / visual configuration. */
        geometryFingerprint?: string;
        /** Hash/fingerprint of pure visual settings (blur, hue, etc.). */
        visualFingerprint?: string;
        /** Effective linear sample resolution (e.g. texel per world unit). */
        sampleResolution?: number;
        /** Free-form diagnostic notes. */
        notes?: readonly string[];
    };

    /** Optional link back to the logical ownership snapshot. */
    logicalOwnership?: OwnershipSnapshot;
}
```

This gives Pixel/Graph/Lane/Contour/DistanceField a common “ownership-field engine” target instead of each keeping their own ad-hoc textures and grids.[^3][^4][^5][^6][^7][^8]

***

## 2. Rich canonical geometry contract

Now update/replace your geometry contract so it can represent both vector-native and raster-derived geometry.

You can either:

- replace `contract_GeometryContracts.ts`, or
- create a new `contract_CanonicalGeometry.ts` and gradually migrate.

Below is a replacement-style version that subsumes the old fields, but keeps them where they exist today.[^2][^1]

```ts
// contract_CanonicalGeometry.ts
// Unified canonical geometry contract for both vector-native and raster-derived pipelines.

import type {
    GeometryModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryWorldBounds, TerritoryTunables } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    OwnershipFieldSnapshot,
    OwnershipFieldStrategy,
    OwnershipFieldSampleGrid,
} from './contract_OwnershipField';

export type GeometryFamily = 'vector-native' | 'raster-derived';

export type GeometrySourceMethod =
    | 'power_voronoi'
    | 'fg2_enriched'
    | 'raster_distance'
    | 'raster_graph'
    | 'raster_lane'
    | 'raster_contour'
    | 'raster_sdf';

export interface TerritoryRegionShape {
    ownerId: string;
    /** Closed polygon points for this region. */
    points: [number, number][];
}

export interface FrontierPolylineShape {
    /** Normalized owner pair key, e.g. "red|blue" or "blue|__world__". */
    ownerPairKey: string;
    /** Ordered polyline points for the frontier. */
    points: [number, number][];
}

/**
 * SharedFrontierMap: keyed by ownerPairKey (e.g. "red|blue"), value is one or
 * more canonical frontier polylines shared between those two territories.
 * Both fills and borders reference this same polyline data — guaranteeing
 * fill/border coincidence when desired.
 */
export type SharedFrontierMap = ReadonlyMap<string, FrontierPolylineShape[]>;

export interface CanonicalShell {
    shellId: string;
    ownerId: string;
    /** Closed polygon points for this shell. */
    points: [number, number][];
    /** Signed area (can be negative depending on winding). */
    area: number;
    /** Absolute area (always >= 0). */
    absArea: number;
    /** Confidence in this shell’s correctness (0..1). */
    confidence: number;
    /** ShellLoop ids that represent holes inside this shell. */
    holeLoopIds: string[];
}

export type CanonicalShellLoopClassification = 'outer' | 'hole' | 'border' | 'unknown';

export interface CanonicalShellLoop {
    shellLoopId: string;
    /** Optional containing shell id, if known. */
    shellId?: string;
    ownerId: string;
    points: [number, number][];
    classification: CanonicalShellLoopClassification;
    confidence: number;
}

/**
 * Unified, canonical geometry snapshot for one frame / ownership state.
 * This is what the data engine should produce and what transitions/styles
 * should consume.
 */
export interface CanonicalGeometrySnapshot {
    /** Monotonic version or UUID for this geometry snapshot. */
    version: string;

    /** Which geometry mode produced this snapshot (for debugging/tunables). */
    sourceMode: GeometryModeId;

    /** Which style mode was active when this was computed (if relevant). */
    sourceStyle: TerritoryStyleModeId;

    /** Underlying logical ownership snapshot version. */
    ownershipVersion: string;

    /** Vector-native vs raster-derived provenance. */
    geometryFamily: GeometryFamily;

    /** Specific method that produced this geometry. */
    sourceMethod: GeometrySourceMethod;

    /** High-level territory regions per owner. */
    territoryRegions: readonly TerritoryRegionShape[];

    /** All owner↔owner frontier polylines. */
    frontierPolylines: readonly FrontierPolylineShape[];

    /** Owner↔world boundary border polylines. */
    worldBorderPolylines: readonly FrontierPolylineShape[];

    /** Frontier polylines grouped by owner-pair key. */
    sharedFrontierMap: SharedFrontierMap;

    /** Shell-level polygons per connected territory region. */
    shells: readonly CanonicalShell[];

    /** All shell loops (outer + holes + border fragments). */
    shellLoops: readonly CanonicalShellLoop[];

    /** If this geometry was derived from a raster field, capture its provenance. */
    provenance: {
        derivedFromField: boolean;
        /** Which ownership-field strategy fed into this geometry, if any. */
        sourceFieldStrategy?: OwnershipFieldStrategy;
        /** Sampling metadata for the field that was used. */
        sampleGrid?: OwnershipFieldSampleGrid;
        /** Simplification tolerance used when extracting polylines from the field. */
        simplifyTolerance?: number;
        /** Number of smoothing passes used when extracting polylines. */
        smoothPasses?: number;
        /** Free-form notes for debugging. */
        notes?: readonly string[];
    };

    /** Diagnostics + reliability flags so consumers can choose safe operations. */
    diagnostics?: {
        /** True if topology (connectivity) is believed to be robust. */
        topologyReliable: boolean;
        /** True if ids and shell/loop identity are stable over small perturbations. */
        identityReliable: boolean;
        /** True if loops and shells are expected to be properly closed. */
        closureReliable: boolean;
        /** Optional reasons or warnings when any of these are false. */
        notes?: readonly string[];
    };

    /**
     * @deprecated Temporary bridge to legacy PowerVoronoi data.
     * This will be removed once all consumers use the clean contract types above.
     * Do NOT add new code that reads from this field.
     */
    legacyGeometryBridge?: unknown;
}

/** Input to the geometry layer — unchanged except for referencing CanonicalGeometrySnapshot. */
export interface GeometryLayerInput {
    nowMs: number;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    world: TerritoryWorldBounds;
    tunables: TerritoryTunables;
    ownership: OwnershipSnapshot;
    styleMode: TerritoryStyleModeId;
    previousSnapshot?: CanonicalGeometrySnapshot | null;
}

/** Vector-native geometry mode: produces geometry directly from stars/lanes/ownership. */
export interface GeometryMode {
    readonly id: GeometryModeId;
    readonly label: string;
    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot;
}

/**
 * Raster-derived geometry mode: first computes an ownership field, then optionally
 * extracts canonical geometry from that field.
 */
export interface RasterDerivedGeometryMode {
    readonly id: GeometryModeId;
    readonly label: string;

    /** Compute a sampled ownership field (Pixel/Graph/Lane/DistanceField-style). */
    computeField(input: GeometryLayerInput): OwnershipFieldSnapshot;

    /**
     * Extract canonical geometry from a sampled field. Implementations may choose
     * to be lossy/approximate, but must set provenance + diagnostics accordingly.
     */
    extractGeometry(
        field: OwnershipFieldSnapshot,
        input: GeometryLayerInput,
    ): CanonicalGeometrySnapshot;
}
```

This keeps the existing geometry concepts you already have, but explicitly adds:

- family + source method provenance,
- shells/shellLoops aligning with `CanonicalTerritoryData`,[^2]
- clear path for raster-derived geometry to live next to vector-native geometry with provenance and reliability flags.[^4]

***

## 3. Next concrete steps (what I can do next for you)

If you want me to go further than contracts right now, the next steps I can take in this chat are:

1. Draft **adapter stubs** for one raster renderer (e.g. DistanceField or Contour) that:
    - exposes a `computeField(...)` that returns an `OwnershipFieldSnapshot`;
    - exposes an `extractGeometry(...)` that wraps its existing polygon/border extraction into `CanonicalGeometrySnapshot` with correct provenance.[^5][^3]
2. Draft a **unified geometry orchestrator** that:
    - chooses between vector `GeometryMode` and `RasterDerivedGeometryMode`,
    - hands off ownership + geometry to the existing three-concern render architecture (`TerritoryStyle`, `FillTransition`, `BorderTransition`).[^2]

If you tell me which renderer you want migrated first (DistanceField vs Contour vs Pixel/Graph), I can write the concrete TS scaffolding for it in the next message.

<div align="center">⁂</div>

[^1]: contract_GeometryContracts.txt

[^2]: orchestrator_renderMode.txt

[^3]: renderer_DistanceFieldTerritoryRenderer.txt

[^4]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^5]: renderer_ContourTerritoryRenderer.txt

[^6]: renderer_PixelTerritoryRenderer.txt

[^7]: renderer_GraphTerritoryRenderer.txt

[^8]: renderer_LaneTerritoryRenderer.txt

