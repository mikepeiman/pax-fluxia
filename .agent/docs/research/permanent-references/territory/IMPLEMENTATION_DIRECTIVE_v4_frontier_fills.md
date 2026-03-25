# Canonical Frontier Transition — Geometry-Driven Fills

> [!CAUTION]
> **NO alpha fades.** All transitions are geometric — morphed positions, clipped polygons, lerped points. If a border appears or disappears, it grows/shrinks from junction points. If a fill changes, it's because the frontier geometry moved. This is the only acceptable approach.

## Spec

> "Frontiers MUST move as singular frontiers with player color backfilling behind them."

The frontier is the shared border polyline between two owners. As it morphs from prev→target position, the fill areas on each side are bounded by its current position. Fills follow borders. Not independently. Not via alpha.

## Architecture: What We Have

```
TerritoryCell[] (per-star Voronoi polygons with ownerId)
  ↓ mergeSameOwnerCells()
MergedTerritory[] (closed polygons, external edges only)
  ↓ fill rendering

SharedBorderEdge[] (contested edges between different owners)
  ↓ chainSharedEdgesIntoPolylines()
SharedPolyline[] (continuous chained contested borders, per owner-pair)
  ↓ buildLerpedPolylines(prev, target, t)
Lerped polylines → drawBorderPolylines()
```

**Key relationship:** Each `MergedTerritory` polygon is bounded by:
- World/clip edges (static, never move)
- Shared border edges (the frontiers — these move during transition)

During a transition, a `MergedTerritory`'s shape changes because its frontier edges move.

## Implementation

### Phase 1: Fix `buildLerpedPolylines` — Coherent Frontier

The lerped polylines **are** the frontier. They must be coherent and continuous.

#### [MODIFY] [PowerVoronoiRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts)

**1a. Distance-capped matching** — prevent cross-screen travel:
- Add 200px max distance cap to centroid matching
- If distance > cap, polyline is treated as appearing/disappearing, not morphing

**1b. Geometric grow/shrink for unmatched polylines** — NO fades:
- **Disappearing** (prev-only): morph all points toward the polyline's centroid over t. At t=1, the polyline has collapsed to a single point.
- **Appearing** (target-only): morph from centroid outward. At t=0, polyline is a single point at its centroid. At t=1, it's at its full target position.
- Implementation: for each unmatched polyline, the rendered points are `lerp(centroid, actual_point, t)` (appearing) or `lerp(actual_point, centroid, t)` (disappearing).

### Phase 2: Frontier-Bounded Fills

During transition, fills must be reconstructed each frame from the **interpolated frontier geometry**.

**Approach:** Rebuild merged territory polygons by replacing their frontier edges with the interpolated frontier positions. Concretely:

**2a. Snapshot prev cells alongside prev polylines:**
- Store `prevCells: TerritoryCell[]` when shape changes (individual per-star cells, NOT merged)
- Store `targetCells: TerritoryCell[]` (the new cells)

**2b. Per-frame fill reconstruction:**
1. Identify which cells changed owner (`prevCells[i].ownerId !== targetCells[i].ownerId`)
2. For **unchanged cells**: fill with target color at full alpha (no transition needed)
3. For **changed cells** (the contested zone): clip each cell against the interpolated frontier
   - The frontier polyline cuts through these cells
   - **Prev-owner side**: fill with prev-owner color (territory retreating)
   - **Target-owner side**: fill with target-owner color (territory advancing)
   - As frontier sweeps from prev→target, the target-owner fill area grows behind it

**2c. Polygon-line clipping (Sutherland-Hodgman, single plane):**
- For each changed cell, clip against each segment of the interpolated frontier
- This is O(n) per cell per frontier segment — computationally feasible for ~50 cells
- Each clip produces two half-polygons: one on each side of the line

### Phase 3: Remove Alpha Crossfade

Remove all per-frame fill crossfade code (`prevMergedTerritories`, `isFillTransitioning`, etc.) added in the previous incorrect commit. The geometry reconstruction in Phase 2 replaces it entirely.

## What Resolves Automatically

- **Border-fill misalignment**: fills ARE bounded by interpolated frontier — same geometry
- **Instant fill snap**: fills change only because frontier moved, not because polygons were rebuilt
- **Partial-instant borders**: grow/shrink from centroid instead of appearing instantly
- **Border segment regression**: coherent matching + distance cap fixes stray matches

## Verification

- `TERRITORY_TRANSITION_MS` at 2000+
- Conquest: fill must **grow behind** the moving frontier line, NOT snap or crossfade
- No borders appearing/disappearing instantly — all grow/shrink geometrically
- No borders flying across the map
