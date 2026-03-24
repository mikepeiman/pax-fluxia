# Code Map — Territory System

**Purpose:** Precise file/function/type reference for agents implementing the frontier topology project. Read this FIRST before any sprint document.

---

## Directory Structure

```
pax-fluxia/src/lib/territory/
├── compiler/                           # Geometry computation (NO PIXI)
│   ├── powerVoronoiTerritoryGeometryGenerator.ts  (1014L) — core Voronoi geometry
│   ├── Geometry_0319.ts                (372L) — entry point, calls generator
│   ├── chainWalkCore.ts                (266L) — junction-based loop discovery
│   ├── buildFrontierMap.ts             — builds canonical frontier map
│   ├── canonicalTypes.ts               — TerritoryFrontierMap type
│   ├── frontierStage.ts                — frontier extraction
│   ├── metricStage.ts                  — metric computation
│   ├── regionStage.ts                  — region processing
│   └── types.ts                        — CompileError, shared types
│
├── contracts/                          # Pure type definitions (interfaces)
│   ├── GeometryContracts.ts            (71L) — GeometrySnapshot, TerritoryRegionShape, etc
│   ├── TransitionContracts.ts          (96L) — TransitionEnvelope, Fill/BorderTransitionFrame, etc
│   ├── OwnershipContracts.ts           — OwnershipSnapshot, TerritoryConquestEvent
│   ├── PresentationContracts.ts        — TerritoryPresentationFrame
│   ├── TerritoryFrameInput.ts          — TerritoryTunables, TerritoryWorldBounds
│   ├── TerritoryModeSelection.ts       — mode IDs (GeometryModeId, etc)
│   ├── TerritoryModeCatalog.ts         — mode registry catalog
│   └── DiagnosticsContracts.ts         — diagnostic message types
│
├── layers/
│   ├── geometry/
│   │   ├── GeometryLayerCoordinator.ts — orchestrates geometry computation
│   │   ├── GeometryMode.ts             — re-exports from contracts
│   │   ├── registry.ts                 — geometry mode registry
│   │   ├── modes/
│   │   │   ├── BoundaryAwareFrontierGeometryMode.ts  (59L) — PRIMARY mode
│   │   │   ├── PowerVoronoiGeometryMode.ts           — legacy Voronoi mode
│   │   │   ├── SeedGraphGeometryMode.ts              — seed graph mode
│   │   │   └── geometryModeUtils.ts                  — shared helpers
│   │   └── planners/
│   │       ├── FrontierTopologyBuilder.ts — builds polyline shapes from raw data
│   │       └── GeometryFingerprint.ts     — deterministic version hashing
│   │
│   ├── transition/
│   │   ├── TransitionLayerCoordinator.ts (155L) — orchestrates transitions
│   │   ├── SharedTransitionClock.ts      — envelope timing
│   │   ├── interpolatePolylines.ts       — CDF-based OT interpolation (CURRENT)
│   │   ├── BorderTransitionMode.ts       — re-exports
│   │   ├── FillTransitionMode.ts         — re-exports
│   │   ├── registry.ts                   — transition mode registry
│   │   ├── modes/
│   │   │   ├── OptimalTransportBorderMode.ts  — border interpolation mode
│   │   │   ├── FrontierMorphFillMode.ts       — fill interpolation mode
│   │   │   ├── SnapFillMode.ts                — instant snap (fallback)
│   │   │   └── SnapBorderMode.ts              — instant snap (fallback)
│   │   └── planners/
│   │       └── TerritoryTransitionPlanner.ts  — plan creation helpers
│   │
│   ├── presentation/
│   │   ├── PresentationLayerCoordinator.ts (21L) — delegates to style modes
│   │   ├── TerritoryStyleMode.ts          — style mode interface
│   │   └── registry.ts                    — style mode registry
│   │
│   └── ownership/
│       ├── OwnershipLayerCoordinator.ts   — ownership computation
│       ├── OwnershipMode.ts               — mode interface
│       └── registry.ts                    — ownership mode registry
│
├── runtime/
│   ├── TerritoryRuntimeCoordinator.ts  (221L) — top-level frame orchestrator
│   ├── TerritoryRuntimeState.ts         — mutable frame state
│   ├── TerritoryConfigNormalizer.ts     — input normalization
│   ├── TerritoryCompatibilityMatrix.ts  — mode compatibility validation
│   └── TerritoryWorker.ts               — geometry computation wrapper
│
└── adapters/pixi/
    ├── PixiTerritoryPresenter.ts        — PIXI rendering (fills + borders)
    ├── PixiFillPresenter.ts             — fill polygon rendering
    └── PixiBorderPresenter.ts           — border stroke rendering
```

## Key Types (Current)

| Type | File | Fields |
|------|------|--------|
| `TerritoryGeometryData` | powerVoronoiTerritoryGeometryGenerator.ts | cells, mergedTerritories, sharedEdges, rawSharedPolylines, sharedPolylines, worldBorderPolylines, enclaveMap, fingerprint, frontierMap? |
| `SharedPolyline` | powerVoronoiTerritoryGeometryGenerator.ts | points, ownerPairKey, color |
| `SharedBorderEdge` | powerVoronoiTerritoryGeometryGenerator.ts | x1, y1, x2, y2, ownerA, ownerB, colorA, colorB, siteIdA, siteIdB |
| `MergedTerritory` | powerVoronoiTerritoryGeometryGenerator.ts | points, ownerId, color, starIds |
| `TerritoryCell` | powerVoronoiTerritoryGeometryGenerator.ts | points, ownerId, siteId |
| `PowerSite` | powerVoronoiTerritoryGeometryGenerator.ts | x, y, weight, ownerId, starId, virtual? |
| `GeometrySnapshot` | GeometryContracts.ts | version, sourceMode, sourceStyle, ownershipVersion, territoryRegions, frontierPolylines, worldBorderPolylines, sharedFrontierMap, legacyGeometryBridge? |
| `TransitionEnvelope` | TransitionContracts.ts | transitionId, startedAtMs, durationMs, progress, conquestEvents |
| `FillTransitionFrame` | TransitionContracts.ts | regions: {ownerId, points}[] |
| `BorderTransitionFrame` | TransitionContracts.ts | frontiers: {ownerPairKey, points}[] |

## Compiler Pipeline (in order)

`generateVoronoiTerritoryGeometry()` (L817-1013) runs these stages:

1. **Build power sites** — stars → PowerSite[] with weights
2. **Compute Voronoi** — `weightedVoronoi()` from d3-weighted-voronoi
3. **Extract cells** — Voronoi polygons → TerritoryCell[]
4. **Extract junction vertices** — `extractJunctionVertices()` → Set<string> of ptKeys shared by 3+ cells
5. **Build cluster map** — connected component analysis
6. **Extract shared edges** — `extractSharedEdges()` → SharedBorderEdge[]
7. **Chain edges into polylines** — `chainSharedEdgesIntoPolylines()` → SharedPolyline[] (with Chaikin smoothing)
8. **Merge same-owner cells** — `mergeSameOwnerCells()` → MergedTerritory[]
9. **Construct fills from frontier chain** — `constructFillsFromFrontierChain()` → MergedTerritory[] (using chainWalkCore)
10. **Extract world border polylines** — `extractWorldBorderPolylines()` → SharedPolyline[]
11. **Detect enclaves** — `detectEnclaves()` → Map<number, polygon[]>

## Key Functions for Frontier Topology

| Function | File | Lines | What it knows |
|----------|------|-------|---------------|
| `extractJunctionVertices` | powerVoronoiTerritoryGeometryGenerator.ts | 277-299 | 3-way junction ptKeys |
| `extractSharedEdges` | powerVoronoiTerritoryGeometryGenerator.ts | 386-429 | Raw edges with siteIdA/siteIdB |
| `chainSharedEdgesIntoPolylines` | powerVoronoiTerritoryGeometryGenerator.ts | 683-753 | Chains edges, applies Chaikin |
| `extractWorldBorderPolylines` | powerVoronoiTerritoryGeometryGenerator.ts | 301-384 | World boundary edges with snapping |
| `executeChainWalk` | chainWalkCore.ts | 92-236 | Loop discovery via junction map |
| `ptKey` | powerVoronoiTerritoryGeometryGenerator.ts | 139-141 | Vertex identity: `x.toFixed(2),y.toFixed(2)` |

## Critical Invariant

`ptKey(x, y)` rounds to 2 decimal places. All junction matching depends on this. Any new code that needs vertex identity MUST use this same function or a compatible one.
