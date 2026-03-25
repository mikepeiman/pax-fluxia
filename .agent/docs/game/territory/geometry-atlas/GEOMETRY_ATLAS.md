# Territory Geometry Atlas — All Computation Approaches

**Generated:** 2026-03-24 | **Total geometry LOC:** ~12,000+

This document catalogs every geometry computation system in the project: what it does, how it does it, its completeness, and its relationships to other systems.

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────┐
                    │         CLEAN ARCHITECTURE (2026-03)      │
                    │  3 GeometryMode classes → GeometrySnapshot │
                    │  └─► 2 generator functions                │
                    └──────────┬───────────────────────────────┘
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                           │
    ▼                          ▼                           ▼
 PowerVoronoi            SeedGraph             BoundaryAwareFrontier
 GeometryMode            GeometryMode           GeometryMode (DEFAULT)
    │                          │                           │
    └────────┬─────────────────┘                           │
             ▼                                             ▼
  generateVoronoiTerritory                     computeGeometry0319
  Geometry() [1014L]                           () [372L, SUPERSET]
             │                                             │
             └──────────────── both use ───────────────────┘
                          d3-weighted-voronoi

    ┌──────────────────────────────────────────────────────┐
    │            ORCHESTRATOR / FG2 (2026-02~03)            │
    │  engine.ts → runFG2DataPipeline → fg2SeedGraph.ts     │
    │  Full half-edge topology, face walks, shell loops     │
    └──────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────┐
    │          LEGACY RENDERERS (2025-2026)                 │
    │  Each contains its OWN geometry computation inline    │
    │  PVV2, PVV3, VoronoiRenderer, ModifiedVoronoi,       │
    │  Contour, Graph, Lane, Pixel, DistanceField           │
    └──────────────────────────────────────────────────────┘
```

---

## Tier 1: Clean Architecture Geometry Modes (Active, Default)

### 1A. `PowerVoronoiGeometryMode` — "Weighted Power Voronoi"

| Property | Value |
|----------|-------|
| **File** | `territory/layers/geometry/modes/PowerVoronoiGeometryMode.ts` (53L) |
| **Mode ID** | `power_voronoi` |
| **Generator** | `generateVoronoiTerritoryGeometry()` |
| **Status** | ✅ Working, but missing world-border polylines and frontier map |

Thin wrapper. Passes default config to the generator. Does NOT populate `worldBorderPolylines` (returns `[]`). Does NOT compute `frontierMap`.

### 1B. `SeedGraphGeometryMode` — "Unified Polygon (dense resampled)"

| Property | Value |
|----------|-------|
| **File** | `territory/layers/geometry/modes/SeedGraphGeometryMode.ts` (57L) |
| **Mode ID** | `seed_graph` |
| **Generator** | `generateVoronoiTerritoryGeometry()` |
| **Status** | ✅ Working, but same gaps as 1A |

Same wrapper as 1A, but forces `clusterSplit: true` and `chaikinPasses ≥ 1`. Otherwise identical.

### 1C. `BoundaryAwareFrontierGeometryMode` — "Boundary-Constrained Frontier (0319)" ⭐ DEFAULT

| Property | Value |
|----------|-------|
| **File** | `territory/layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts` (59L) |
| **Mode ID** | `boundary_aware_frontier` |
| **Generator** | `computeGeometry0319()` |
| **Status** | ✅ Most complete. World borders, frontier-chain fills, frontier map, closure diagnostics. |

Calls the superior `computeGeometry0319()` which is a strict superset of the original generator.

### Shared Infrastructure

| File | Role | Lines |
|------|------|-------|
| `layers/geometry/modes/geometryModeUtils.ts` | `buildGeneratorSettings()`, `isCompileError()`, `createEmptyTerritoryGeometryData()` | 49 |
| `layers/geometry/planners/FrontierTopologyBuilder.ts` | `buildTerritoryRegionShapes()`, `buildFrontierPolylineShapes()`, `buildSharedFrontierMap()` | 45 |
| `layers/geometry/planners/GeometryFingerprint.ts` | Deterministic version hashing | ~30 |

### Key Insight

1A and 1B are **obsolete** — they call an incomplete generator and differ only by config booleans. 1C does everything they do plus more. The "three modes" should become one.

---

## Tier 2: Generator Functions (The Actual Geometry Computation)

### 2A. `generateVoronoiTerritoryGeometry()` — Original Generator

| Property | Value |
|----------|-------|
| **File** | `compiler/powerVoronoiTerritoryGeometryGenerator.ts` (L823-1013, 1014L total) |
| **Inputs** | `stars: StarState[], connections: StarConnection[], config: TerritoryGeneratorSettings` |
| **Output** | `TerritoryGeometryData` |

**Pipeline:**
1. Build power sites from stars (with corridor/disconnect virtuals)
2. `d3-weighted-voronoi` → raw Voronoi polygons
3. Convert to `TerritoryCell[]`
4. `extractJunctionVertices()` → **discards result** ⚠️
5. `extractSharedEdges()` → `SharedBorderEdge[]`
6. `chainSharedEdgesIntoPolylines()` → `SharedPolyline[]` (raw + Chaikin-smoothed)
7. `extractWorldBorderPolylines()` → **old method, misses corner-crossing edges** ⚠️
8. `mergeSameOwnerCells()` → `MergedTerritory[]` (raw polygon union)
9. `constructFillsFromFrontierChain()` → fill polygons from frontier chain
10. `detectEnclaves()`
11. Return `TerritoryGeometryData`

**Exported helpers (also used by other files):**
`edgeKey`, `ptKey`, `chaikinSmoothPolyline`, `chaikinSmoothPolygon`, `extractJunctionVertices`, `extractWorldBorderPolylines`, `extractSharedEdges`, `mergeSameOwnerCells`, `constructFillsFromFrontierChain`, `chainSharedEdgesIntoPolylines`, `detectEnclaves`, `buildTerritoryGeometryFingerprint`

### 2B. `computeGeometry0319()` — Enhanced Generator ⭐

| Property | Value |
|----------|-------|
| **File** | `compiler/Geometry_0319.ts` (L114-371, 372L total) |
| **Inputs** | `stars, connections, config` + optional `weightOverrides`, `extraSites` |
| **Output** | `TerritoryGeometryData` (with `frontierMap` populated) |

**What it adds over 2A:**
- `extractAllWorldBoundaryEdges()` — fixes corner-crossing bug
- Chains ALL frontier edges (inter-owner + world-boundary) together
- `constructFillsFromFrontierChain()` — fills derived from borders, not raw merge
- `buildFrontierMap()` → `TerritoryFrontierMap` (canonical identity)
- `extractJunctionVertices()` result actually used for frontier map classification
- Closure diagnostics (checks fill polygon closure)
- `weightOverrides` / `extraSites` support for transition ghost sites

**Supporting files:**
| File | Role | Lines |
|------|------|-------|
| `compiler/buildFrontierMap.ts` | Builds `TerritoryFrontierMap` from polylines + junctions | 193 |
| `compiler/canonicalTypes.ts` | `CanonicalVertex`, `CanonicalEdge`, `CanonicalLoop`, `TerritoryFrontierMap` types | 145 |
| `compiler/chainWalkCore.ts` | Junction-aware polyline chaining → closed loops | 266 |
| `compiler/frontierStage.ts` | Lane ownership evaluation, frontier node extraction | 214 |
| `compiler/metricStage.ts` | Dijkstra distances, owner assignment | 160 |
| `compiler/regionStage.ts` | Connected component regions, convex hulls | 289 |

---

## Tier 3: FG2 Seed Graph Pipeline (Orchestrator)

### 3A. `fg2SeedGraph.ts` — Full Half-Edge Topology

| Property | Value |
|----------|-------|
| **File** | `territory/orchestrator/methods/fg2SeedGraph.ts` (**5380 lines**) |
| **Entry** | Called via `runFG2DataPipeline()` in `engine.ts` |
| **Status** | ⚠️ Operational but wrapped by the legacy orchestrator. Not used by clean-arch pipeline. |

**This is the most sophisticated geometry system in the project.** It builds:

1. **Seed points** (`FG2SeedPoint`) — stars + boundary anchors + corner nodes
2. **Graph topology** (`FG2PairTopologyGraph`) — nodes + links between seed points
3. **Half-edge structure** (`FG2HalfEdge`, `FG2PairHalfEdgeGraph`) — from star junctions
4. **Face walks** (`FG2FaceWalk`) — left-face traversal of half-edge graph
5. **Region loops** (`FG2RegionLoopArtifact`) — closed fill regions from face walks
6. **Owner shell loops** (`FG2OwnerShellLoopArtifact`, `FG2OwnerShellArtifact`) — merged shells per owner
7. **Frontier polylines** (`FG2FrontierPolyline`) — border polylines between owners

**Key types (~50 FG2-specific interfaces):**
`FG2WorldBounds`, `FG2SeedPoint`, `FG2GraphNode`, `FG2TopologyLink`, `FG2PairTopologyGraph`, `FG2SharedStarJunction`, `FG2HalfEdge`, `FG2FaceWalk`, `FG2PairHalfEdgeGraph`, `FG2RegionLoopArtifact`, `FG2OwnerRegionLoopArtifact`, `FG2FrontierPolyline`, `FG2GraphChain`, `FG2BoundaryAnchorResult`, `FG2OwnerShellLoopArtifact`, `FG2OwnerShellArtifact`

**Pipeline stages** (implemented as `TerritoryPipelineStage`):
`metric` → `world_extension` → `seed` → `topology` → `half_edge` → `face_walk` → `region_loop` → `shell` → `render`

**Relationship to other systems:** The orchestrator's `runFG2DataPipeline()` forces FG2 stages regardless of user config, then feeds results to either `renderPVV3` or `renderPowerVoronoi` via `TerritoryLegacyBridge`. The clean-arch pipeline does NOT call this; it has its own generator.

### 3B. Orchestrator Engine

| Property | Value |
|----------|-------|
| **File** | `territory/orchestrator/engine.ts` (685L) |
| **Exports** | `renderTerritoryEngine()`, `runFG2DataPipeline()`, `extractCanonicalData()`, `resetTerritoryEngineCaches()` |

Routes between FG2 stages and legacy adapters. Contains DY4 optimal transport integration. `renderTerritoryEngine()` is the top-level render call for the legacy path.

### 3C. Orchestrator Registry & Types

| File | Role | Lines |
|------|------|-------|
| `orchestrator/registry.ts` | Method descriptors (`fg1_adaptive_field`, `fg1_mar19_refactor`, `fg2_seed_graph`) | ~120 |
| `orchestrator/types.ts` | `TerritoryMethodId`, `TerritoryPipelineStage`, `TerritoryPipelineArtifacts`, etc. | ~80 |
| `orchestrator/renderMode.ts` | Render mode resolution | ~40 |
| `orchestrator/traceStore.ts` | Interactive trace state | ~60 |

---

## Tier 4: Legacy Renderers (Self-Contained Geometry)

Each legacy renderer computes its own geometry INTERNALLY, duplicating Voronoi computation, color utils, Chaikin smoothing, and merge logic.

### 4A. `PowerVoronoiRenderer.ts` (PVV2) ⭐ — Primary Active Renderer

| Property | Value |
|----------|-------|
| **File** | `renderers/PowerVoronoiRenderer.ts` (1678L) |
| **Entry** | `renderPowerVoronoi(app, stars, connections, config, state?)` |
| **Geometry** | Calls `generateVoronoiTerritoryGeometry()` internally |
| **Status** | ✅ Active default renderer. Contains transition logic (DY4, localized boundary, weight-lerp). |

The main renderer. Contains `PVV2RendererState` (64-field mutable state) for caching and transitions. Calls `generateVoronoiTerritoryGeometry()` or `computeGeometry0319()` for geometry, then draws fills/borders/transitions via PIXI.Graphics.

### 4B. `PVV3Renderer.ts` — FG2-Fed Renderer

| Property | Value |
|----------|-------|
| **File** | `renderers/PVV3Renderer.ts` (780L) |
| **Entry** | `renderPVV3(app, stars, connections, config, canonicalData, shellData?)` |
| **Geometry** | Receives pre-computed canonical data from FG2. Also calls `weightedVoronoi()` directly for cell computation. |
| **Status** | ⚠️ Semi-active. Depends on FG2 pipeline via `TerritoryLegacyBridge`. Has its own transition logic. |

### 4C. `ModifiedVoronoiRenderer.ts` — Predecessor

| Property | Value |
|----------|-------|
| **File** | `renderers/ModifiedVoronoiRenderer.ts` (909L) |
| **Entry** | `renderModifiedVoronoi(app, stars, connections, distances, config, colorUtils)` |
| **Geometry** | Calls `d3-weighted-voronoi` directly. Has its own `mergeSameOwnerCells()` (167L), `applyMinStarMargin()`, `smoothSharpVertices()`, `applyDisconnectBuffer()`. |
| **Status** | 🔴 Legacy. Duplicates geometry pipeline. Unique features: sharp vertex smoothing, disconnect buffer zones. |

### 4D. `VoronoiRenderer.ts` — Earliest Voronoi

| Property | Value |
|----------|-------|
| **File** | `renderers/VoronoiRenderer.ts` (387L) |
| **Entry** | `renderVoronoi(app, stars, connections, distances, config, colorUtils)` |
| **Geometry** | Calls `d3-weighted-voronoi` directly. Has its own `chaikinSmooth()`. Simple cell+border rendering. |
| **Status** | 🔴 Legacy ancestor. No merge, no transitions. |

### 4E-H. Raster-Based Worker Renderers

These compute geometry in Web Workers and render to textures:

| File | Lines | Method | Worker |
|------|-------|--------|--------|
| `ContourTerritoryRenderer.ts` | 277 | Marching squares contours from ownership grid | `contourTerritory.worker.ts` |
| `GraphTerritoryRenderer.ts` | 341 | Graph-distance field → pixel ownership | `graphTerritory.worker.ts` |
| `LaneTerritoryRenderer.ts` | 323 | Lane-based influence → pixel ownership | `laneTerritory.worker.ts` |
| `PixelTerritoryRenderer.ts` | 386 | Per-pixel distance sampling → ownership | `pixelTerritory.worker.ts` |
| `DistanceFieldTerritoryRenderer.ts` | ~500 | GPU SDF rendering with neighbor-sampling borders | N/A (GPU shader) |

**Status:** 🔴 All legacy. Each duplicates `hexToRGB`, `rgbToHSL`, `hslToRGB`, `buildFingerprint`. The raster approaches are fundamentally different from the vector/polygon approach and don't share geometry types.

---

## Tier 5: Legacy Adapters & Bridges

| File | Role | Lines |
|------|------|-------|
| `territory/adapters/legacy/PowerVoronoiAdapter.ts` | Bridges clean-arch → PVV2 renderer | ~50 |
| `territory/adapters/legacy/PowerVoronoiLegacyAdapter.ts` | Older bridge variant | ~60 |
| `territory/adapters/legacy/SeedGraphAdapter.ts` | Bridges clean-arch → FG2/PVV3 | ~50 |
| `territory/adapters/legacy/PVV3LegacyAdapter.ts` | Bridges legacy → PVV3 | ~50 |
| `territory/adapters/legacy/DistanceFieldLegacyAdapter.ts` | Bridges legacy → SDF renderer | ~40 |
| `territory/legacy/TerritoryLegacyBridge.ts` | Dynamic import bridge between orchestrator and renderers | ~100 |

---

## Summary: What's Actually Used

| System | Active? | Called by default? |
|--------|---------|-------------------|
| `BoundaryAwareFrontierGeometryMode` → `computeGeometry0319` | ✅ Active | ✅ Default |
| `PowerVoronoiRenderer` (PVV2) | ✅ Active | ✅ Default renderer |
| `PowerVoronoiGeometryMode` → `generateVoronoiTerritoryGeometry` | ✅ Active | ❌ Selectable in UI |
| `SeedGraphGeometryMode` → `generateVoronoiTerritoryGeometry` | ✅ Active | ❌ Selectable in UI |
| FG2 pipeline → PVV3 | ⚠️ Semi-active | ❌ Via legacy adapter |
| Everything else | 🔴 Legacy | ❌ |

## Consolidation Opportunity

The **active** geometry computation consists of:
1. **One algorithm**: `d3-weighted-voronoi` power diagram
2. **One competent generator**: `computeGeometry0319` (superset of the original)
3. **One set of post-processing**: junction extraction, edge chaining, Chaikin smoothing, frontier map building, fill construction, enclave detection

**FG2's half-edge topology** is architecturally superior (proper graph data structure, face walks, shell loops) but operates through the legacy orchestrator. Its concepts (half-edges, face walks, shell construction) could inform the design of the unified geometry output.

**The raster renderers** (contour, graph, lane, pixel, distance field) represent a fundamentally different approach (per-pixel ownership) that may be worth preserving as alternative rendering styles but don't produce polygon geometry.
