# Territory Architecture — Compact Formal Outline

## Canonical Pipeline (V3, 2026-03-19)

```
Ownership → Geometry → Transition → Presentation
```

## Layer Map

### 1. Ownership — Who owns what
- `OwnershipLayerCoordinator.ts` → `StarOwnershipSnapshotMode.ts`
- Contract: `OwnershipContracts.ts` (`OwnershipSnapshot`, `ConquestEvent`)

### 2. Geometry — Shapes from ownership (NO PIXI, NO rendering)
- **Entry**: `GeometryLayerCoordinator.ts` → `UnifiedVectorGeometryMode.ts`
- **Compiler**: `compiler_UnifiedVectorGeometry.ts` → calls:
  - `powerVoronoiTerritoryGeometryGenerator.ts` — Power Voronoi diagram + cell merge
  - `chainWalkCore.ts` — walks frontier polylines to produce loops
  - `buildFrontierMap.ts` — canonical vertices/edges/loops (`TerritoryFrontierMap`)
  - `buildFrontierTopology.ts` — converts to `FrontierTopology` (sections + region loops)
  - `rebuildLoopPoints()` — canonical polygon reconstruction from sections
- **Output**: `CanonicalGeometrySnapshot` containing:
  - `territoryRegions` — merged polygons (one per contiguous owner territory)
  - `sharedPolylines` — Chaikin-smoothed frontier curves
  - `frontierTopology` — `FrontierSection[]`, `RegionLoop[]`, `FrontierVertex[]`
- **Key types**: `canonicalTypes.ts` (`CanonicalVertex`, `CanonicalEdge`, `CanonicalLoop`, `TerritoryFrontierMap`)
- **Contracts**: `GeometryContracts.ts`, `FrontierTopologyContracts.ts`

### 3. Transition — Animating between geometry states
- **Orchestrator**: `TransitionLayerCoordinator.ts` — holds prev+next geometry, drives `t ∈ [0,1]`
- **Clock**: `SharedTransitionClock.ts`
- **Active fill mode**: `FrontierMorphFillMode.ts` — loop matching + OT perimeter interpolation
  - Section-ID match → centroid-proximity fallback
  - `rebuildLoopPoints()` → `rebuildAndAlign()` → `otInterpolateAlignedPolygon()`
- **Contracts**: `TransitionContracts.ts` (`FillTransitionPlan`, `FillTransitionFrame`)
- **Legacy/unused modes**: `AlphaCrossfadeFillMode`, `CrossfadeFillMode`, `FrontierTopologyMorphFillMode`, `OptimalTransportBorderMode`, `RopeMorphBorderMode` (borders now unified with fills)

### 4. Presentation — Drawing to screen (PIXI.Graphics)
- **Orchestrator**: `PresentationLayerCoordinator.ts` → `CanonicalTerritoryStyle.ts`
- **Builders**: `FillDrawCommandBuilder.ts` — maps regions → `FillDrawCommand[]` (fill + stroke)
- **Presenter**: `PixiFillPresenter.ts` — single-pass fill+stroke via PIXI.Graphics
- **Contracts**: `PresentationContracts.ts` (`FillDrawCommand` with fill, stroke, alpha)

## Runtime Coordination

```
TerritoryRuntimeCoordinator.ts
  ├─ OwnershipLayerCoordinator
  ├─ GeometryLayerCoordinator
  ├─ TransitionLayerCoordinator
  └─ PresentationLayerCoordinator
```

- **Integration**: `GameCanvasTerritoryBridge.ts` — connects game loop → runtime coordinator
- **Config**: `TerritoryRuntimeState.ts` — tunables (alpha, smoothing, border width, etc.)

## DevTools

| File | Purpose |
|------|---------|
| `PolygonValidator.ts` | Validates polygons: closed, area, self-intersection, duplicates |
| `TransitionSnapshotRecorder.ts` | Captures conquest screenshots + topology diffs |
| `TransitionDebugOverlay.ts` | Visual overlay for transition state |
| `TerritoryTraceStore.ts` | Frame-by-frame diagnostic trace |

## Legacy Renderers (outside layered architecture)

| File | Status |
|------|--------|
| `PowerVoronoiRenderer.ts` | Standalone PVV2 — weight-lerp transitions via diagram recomputation |
| `PowerVoronoiRenderer_DY4.ts` | DY4 OT border transition (now deprecated — borders unified with fills) |
| `ModifiedVoronoiRenderer.ts` | Legacy smoothed Voronoi |
| `PVV3Renderer.ts` | Legacy FG2-based renderer |

## Data Flow (Single Conquest)

```
ConquestEvent (star ownership change)
  → OwnershipSnapshot (new owner map)
    → Power Voronoi Diagram (d3-delaunay, weighted)
      → Cell merge (same-owner cells → polygons)
        → Chain walk (frontier polylines → loops)
          → TerritoryFrontierMap (canonical edges/vertices/loops)
            → FrontierTopology (sections + region loops)
              → [STORED as nextGeometry in TransitionLayerCoordinator]

Per animation frame (t ∈ [0,1]):
  prevTopology + nextTopology
    → Loop matching (section-ID or centroid proximity)
      → rebuildLoopPoints() per matched pair
        → OT perimeter-CDF interpolation
          → FillDrawCommand[] (polygon + stroke params)
            → PIXI.Graphics fill + stroke
```

## Current Status / Best Work

| Area | Status |
|------|--------|
| Power Voronoi geometry | ✅ Solid — d3-delaunay + Chaikin smoothing |
| Chain walk / frontier map | ✅ Solid — canonical edges, loops, junction vertices |
| Frontier topology | ✅ Solid — sections, region loops, `rebuildLoopPoints()` |
| Unified fill+stroke | ✅ Done — single-pass, no separate border pipeline |
| Transition loop matching | ⚠️ Section-ID + centroid fallback — but intermediate frames still corrupt |
| OT perimeter interpolation | ❌ Broken — produces self-intersections, cannot maintain planar partition |
| Polygon validation | ✅ Built — `PolygonValidator.ts` catches degenerate output |
| Diagnostic capture | ✅ Built — snapshot recorder with topology diffs |
