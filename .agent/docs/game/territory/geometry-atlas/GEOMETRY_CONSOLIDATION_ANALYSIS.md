# Geometry Consolidation Analysis

**Date:** 2026-03-24

---

## How Many Distinct Methods Do We Actually Have?

Stripping away the naming and historical layers, there are really only **two fundamentally different approaches** to territory geometry:

### Method A: Power Voronoi Polygon Geometry
Every file in `compiler_`, `mode_`, `orchestrator_fg2SeedGraph`, `renderer_PowerVoronoiRenderer`, `renderer_PVV3Renderer`, `renderer_ModifiedVoronoiRenderer`, and `renderer_VoronoiRenderer` uses the **same core algorithm**: feed star positions + weights into `d3-weighted-voronoi`, get back polygonal cells, then post-process those cells into territories. The differences are entirely in post-processing quality and metadata richness.

### Method B: Raster/Field Ownership Sampling
The worker-based renderers (`Contour`, `Graph`, `Lane`, `Pixel`, `DistanceField`) compute ownership per-pixel using distance fields, graph distances, or lane influence. They produce **bitmaps**, not polygons. Fundamentally different math, fundamentally different output.

That's it. Two methods. Everything else is just variations in how much you post-process Method A's output, or which distance metric drives Method B's pixel ownership.

---

## What Each File Contributes vs. What's Redundant

### Method A files — ranked by contribution:

| File | Unique Contribution | Redundant? |
|------|-------------------|------------|
| **`compiler_Geometry_0319`** | Best pipeline. World-boundary edges, frontier-chain fills, frontier map, closure diagnostics, ghost site support. | ❌ Keep — foundation |
| **`orchestrator_fg2SeedGraph`** | Half-edge topology, face walks, shell loops. Architecturally superior data structures. | ❌ Keep concepts — the data structures are exactly what we need for rich metadata |
| **`compiler_powerVoronoiTerritoryGeometryGenerator`** | Original pipeline. `extractJunctionVertices`, `extractSharedEdges`, `chainSharedEdgesIntoPolylines`, `mergeSameOwnerCells`, `constructFillsFromFrontierChain`, `detectEnclaves` — these are the shared workhorse functions. | ⚠️ Keep functions, retire as entry point (0319 calls these same functions) |
| **`renderer_ModifiedVoronoiRenderer`** | `smoothSharpVertices()` (quadratic Bézier at sharp angles), `applyDisconnectBuffer()`, its own `mergeSameOwnerCells()` with different merge logic. | ⚠️ Extract sharp vertex smoothing, retire the rest |
| **`renderer_PVV3Renderer`** | FG2-aware rendering, frontier loop transitions. | 🔴 Redundant if FG2 concepts fold into unified output |
| **`renderer_VoronoiRenderer`** | Nothing unique — simplest ancestor. | 🔴 Fully redundant |
| **`mode_PowerVoronoiGeometryMode`** | Nothing — just calls the old generator with default config. | 🔴 Fully redundant |
| **`mode_SeedGraphGeometryMode`** | Nothing — same generator, `clusterSplit: true`. | 🔴 Fully redundant |

### Method B files:

| File | Unique Contribution | Redundant? |
|------|-------------------|------------|
| **`renderer_DistanceFieldTerritoryRenderer`** | GPU SDF rendering with neighbor-sampling borders. Entirely different visual style. | ❌ Keep as alternative render style |
| **`renderer_PixelTerritoryRenderer`** | Per-pixel distance → ownership. Painterly aesthetic. | ⚠️ Keep if you want the visual style |
| **`renderer_GraphTerritoryRenderer`** | Graph-distance field ownership. | ⚠️ Merge with Pixel if keeping raster path |
| **`renderer_ContourTerritoryRenderer`** | Marching squares contours from ownership. | ⚠️ Distinctive visual — keep if wanted |
| **`renderer_LaneTerritoryRenderer`** | Lane-based influence. | 🔴 Least distinctive raster variant |

---

## Consolidation Plan

### Target: 2 geometry methods, 1 rich output type

**Method 1: `compileVectorGeometry()`** — The unified polygon pipeline
- Foundation: `computeGeometry0319` pipeline
- **Absorb from FG2**: half-edge structure, face walks → these become metadata on the output, not a separate pipeline. The FG2 types (`FG2HalfEdge`, `FG2FaceWalk`, `FG2OwnerShellArtifact`) are exactly the kind of rich topology we want, but computed *inside* the existing pipeline rather than as a parallel system.
- **Absorb from ModifiedVoronoi**: `smoothSharpVertices()` as an optional post-processing stage
- **Output**: `TerritoryGeometryResult` — the enriched type from the earlier plan, with `frontierMap` mandatory, junction vertices preserved, half-edge topology included, site→cell and owner→territory indices
- **Config**: One set of tunables (corridors, disconnect, cluster-split, smoothing passes, sharp vertex smoothing) — no separate "modes"

**Method 2: `computeRasterOwnership()`** — Field-based pixel rendering
- Consolidate the 4-5 raster workers into one worker with a `strategy` parameter (`'distance' | 'graph' | 'contour' | 'sdf'`)
- Separate concern: these don't produce polygon geometry at all, they produce textures
- Could potentially *consume* Method 1's output for border overlay, creating a hybrid

### What Gets Deleted

- `generateVoronoiTerritoryGeometry()` as an entry point (functions stay, called by unified pipeline)
- All 3 separate `GeometryMode` classes → 1 `UnifiedGeometryMode`
- `VoronoiRenderer` (fully superseded)
- `ModifiedVoronoiRenderer` (extract `smoothSharpVertices`, delete rest)
- FG2's parallel pipeline infrastructure (absorb the data structures, delete the engine)
- `PVV3Renderer` (redundant if PVV2 gets the richer data)
- 4 empty stub mode files
- `legacyGeometryBridge` pattern

### What This Achieves

One pipeline that answers every geometry question: "where are the junctions?", "what's the half-edge topology?", "which faces belong to which owner?", "what are the shell loops?", "which borders are world boundaries?" — all from a single computation pass, with the same rich output regardless of config.

---

## Open Decision

Do we keep any of the raster renderers (Method B), or is this purely a polygon geometry consolidation? The raster renderers produce a fundamentally different visual style and could coexist as alternative render modes that consume the unified geometry output for border/boundary hints.
