<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# What about the new unified vector-based geometry mode? Can you do that next please?

Yes. Here is a concrete unified **vector-based GeometryMode** you can drop into the project as the single polygon pipeline (“Method A / compileVectorGeometry”).[^1][^2]

This assumes you already have a “best” geometry compiler (like `compiler_Geometry_0319`) and shared helpers (`extractJunctionVertices`, `chainSharedEdgesIntoPolylines`, etc.) as described in your consolidation doc.[^2]

***

## New unified vector geometry mode file

Create a new file, for example:

`mode_UnifiedVectorGeometryMode.ts`

```ts
// mode_UnifiedVectorGeometryMode.ts
//
// Unified vector-based geometry mode ("Method A").
// This is the single entry point for power-voronoi / polygon-based territory
// geometry. It replaces the older PowerVoronoi / SeedGraph geometry modes
// and routes all vector geometry through the same enriched pipeline.
//
// Responsibilities:
//   - Call the best geometry compiler (e.g. computeGeometry0319).
//   - Produce a CanonicalGeometrySnapshot (or GeometrySnapshot if not yet migrated).
//   - Attach frontier polylines, world-boundary polylines, shells, loops,
//     shared frontier map, and diagnostics.
//   - Express all of this through the standard GeometryMode interface.

import type {
    GeometryMode,
    GeometryLayerInput,
} from './contract_CanonicalGeometry'; // or './contract_GeometryContracts' if you keep the old name
import type { GeometryModeId } from './TerritoryModeSelection';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
    FrontierPolylineShape,
    SharedFrontierMap,
} from './contract_CanonicalGeometry';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TerritoryWorldBounds, TerritoryTunables } from './TerritoryFrameInput';
import type { StarConnection, StarState } from '$lib/types/game.types';

// Import your best geometry compiler pipeline. This should correspond to
// the "computeGeometry0319" or equivalent function identified in the
// consolidation analysis as the foundation.[file:261]
import {
    computeGeometry0319,
    type Geometry0319Result,
} from './compiler_Geometry_0319';

// If you have FG2-style topology helpers (half-edges, face walks, shells),
// import them here. The goal is to compute that richer topology INSIDE this
// pipeline instead of running a separate FG2 engine.[file:261]
// import { buildShellsAndLoopsFromHalfEdges } from './orchestrator_fg2SeedGraph';

export const UNIFIED_VECTOR_GEOMETRY_MODE_ID: GeometryModeId = 'unified_vector';

/**
 * Convert the internal Geometry0319Result (or equivalent) into the public
 * CanonicalGeometrySnapshot contract.
 *
 * This adapter is where we normalize naming (ownerPairKey, shells, loops,
 * frontier polylines, world-border polylines) and attach diagnostics.
 */
function mapGeometry0319ToCanonicalSnapshot(
    result: Geometry0319Result,
    input: GeometryLayerInput,
): CanonicalGeometrySnapshot {
    const {
        ownershipVersion,
        regions,
        frontiers,
        worldBorders,
        sharedFrontierMapInternal,
        shells,
        shellLoops,
        topologyDiagnostics,
        geometryVersion,
        sourceMethod,
    } = result;

    // Territory regions
    const territoryRegions: TerritoryRegionShape[] = regions.map(r => ({
        ownerId: r.ownerId,
        points: r.points,
    }));

    // Frontier polylines (owner↔owner)
    const frontierPolylines: FrontierPolylineShape[] = frontiers.map(f => ({
        ownerPairKey: f.ownerPairKey, // normalized key like "a|b"
        points: f.points,
    }));

    // Owner↔world boundary polylines
    const worldBorderPolylines: FrontierPolylineShape[] = worldBorders.map(b => ({
        ownerPairKey: b.ownerPairKey, // e.g. "blue|__world__"
        points: b.points,
    }));

    // Shared frontier map
    const sharedFrontierMap: SharedFrontierMap = new Map();
    for (const entry of sharedFrontierMapInternal) {
        const key = entry.ownerPairKey;
        const poly: FrontierPolylineShape = {
            ownerPairKey: key,
            points: entry.points,
        };
        const arr = sharedFrontierMap.get(key);
        if (arr) {
            arr.push(poly);
        } else {
            sharedFrontierMap.set(key, [poly]);
        }
    }

    const nowVersion = geometryVersion ?? `${Date.now()}`;

    return {
        version: nowVersion,
        sourceMode: UNIFIED_VECTOR_GEOMETRY_MODE_ID,
        sourceStyle: input.styleMode,
        ownershipVersion: ownershipVersion ?? input.ownership.version,
        geometryFamily: 'vector-native',
        sourceMethod: sourceMethod ?? 'power_voronoi',

        territoryRegions,
        frontierPolylines,
        worldBorderPolylines,
        sharedFrontierMap,

        // Shells and shell loops come directly from the enriched 0319/FG2 pipeline.
        shells: shells.map(s => ({
            shellId: s.shellId,
            ownerId: s.ownerId,
            points: s.points,
            area: s.area,
            absArea: Math.abs(s.area),
            confidence: s.confidence ?? 1,
            holeLoopIds: s.holeLoopIds ?? [],
        })),
        shellLoops: shellLoops.map(l => ({
            shellLoopId: l.shellLoopId,
            shellId: l.shellId,
            ownerId: l.ownerId,
            points: l.points,
            classification: l.classification,
            confidence: l.confidence ?? 1,
        })),

        provenance: {
            derivedFromField: false,
            sourceFieldStrategy: undefined,
            sampleGrid: undefined,
            simplifyTolerance: result.simplifyTolerance,
            smoothPasses: result.smoothPasses,
            notes: result.provenanceNotes ?? [],
        },

        diagnostics: {
            topologyReliable: topologyDiagnostics?.topologyReliable ?? true,
            identityReliable: topologyDiagnostics?.identityReliable ?? true,
            closureReliable: topologyDiagnostics?.closureReliable ?? true,
            notes: topologyDiagnostics?.notes ?? [],
        },

        legacyGeometryBridge: result.legacyBridge ?? undefined,
    };
}

/**
 * Unified vector-based GeometryMode.
 *
 * All vector-native territory geometry should go through this mode. It is the
 * single “Method A” implementation described in the geometry consolidation
 * analysis, backed by computeGeometry0319 and enriched FG2-style topology.[file:261]
 */
export const UnifiedVectorGeometryMode: GeometryMode = {
    id: UNIFIED_VECTOR_GEOMETRY_MODE_ID,
    label: 'Unified Vector Geometry',

    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot {
        const {
            nowMs,
            stars,
            lanes,
            world,
            tunables,
            ownership,
            styleMode,
            previousSnapshot,
        } = input;

        // Call the unified compiler. This should encapsulate the full polygon
        // pipeline: power-voronoi, ghost sites, corridor/disconnect, merging,
        // frontier extraction, shells/loops, etc.[file:261]
        const result: Geometry0319Result = computeGeometry0319({
            nowMs,
            stars: stars as StarState[],
            lanes: lanes as StarConnection[],
            world,
            tunables,
            ownership: ownership as OwnershipSnapshot,
            styleMode,
            previousSnapshot,
        });

        // Adapter: lift internal result into public CanonicalGeometrySnapshot.
        return mapGeometry0319ToCanonicalSnapshot(result, input);
    },
};
```


### Notes

- `Geometry0319Result` is a stand‑in for whatever the return type of your current best geometry compiler is. From your consolidation analysis, that compiler already computes world-boundary edges, frontier chains, frontier map, closure diagnostics, ghost sites, and should be extended to compute shells and loops from FG2 concepts.[^2]
- `sharedFrontierMapInternal`, `shells`, `shellLoops`, `topologyDiagnostics`, `simplifyTolerance`, `smoothPasses`, and `provenanceNotes` are fields you should expose on that result type when you wire this up. The adapter just normalizes them into the canonical contract shape.[^3][^1][^2]
- This mode is intended to **replace all previous vector geometry modes** (PowerVoronoiGeometryMode, SeedGraphGeometryMode, etc.) and become the single `GeometryMode` your data engine uses for vector geometry.[^2]

***

If you want, next I can:

- sketch the `Geometry0319Result` interface in a way that aligns with this adapter; or
- show how to wire `UnifiedVectorGeometryMode` into your existing geometry orchestrator so that existing styles and transitions consume its output without major changes.

<div align="center">⁂</div>

[^1]: contract_GeometryContracts.txt

[^2]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^3]: orchestrator_renderMode.txt

