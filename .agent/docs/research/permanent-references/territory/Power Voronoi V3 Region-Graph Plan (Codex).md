# Power Voronoi V3 Region-Graph Plan

## Summary
Fork the current hybrid `PowerVoronoiRenderer` into a new `Power Voronoi V3` path and stop evolving V2 in place. V3 uses this canonical pipeline:

1. weighted Voronoi  
2. ownership adjustments (`MSR`, `CX`, `DX`)  
3. exact planar region/edge graph  
4. smooth shared frontiers once (`Chaikin` then arc fitting)  
5. derive both closed fill loops and shared border paths from that same graph

This plan explicitly rejects raster chains as canonical truth. Pixel chains may exist only as debug/export/fallback artifacts. The shipping geometry is vector-first.

## Implementation Changes
### 1. Split V3 from the current hybrid
- Create a separate V3 renderer path instead of continuing to modify `PVV2`.
- Keep current `PVV2` intact as a reference/legacy mode.
- Add a new renderer selection entry such as `Power Voronoi V3`.
- In V3, `TERRITORY_BOUNDARY_MODE` and `TERRITORY_FILL_MODE` do not select competing animation architectures; V3 always uses shared-frontier borders plus geometry-driven fills.

### 2. Canonical geometry source: region graph, not border reconstruction
- Keep the existing weighted Voronoi site generation and adjustment stage:
  - real stars
  - corridor virtuals (`CX`)
  - disconnect virtuals (`DX`)
  - star margin / minimum-star-radius shaping (`MSR`)
- After Voronoi, build a canonical `RegionGraphSnapshot` from the adjusted cells:
  - `RegionCell`: raw cell polygon with `ownerId`, `clusterId`, `siteId`, `siteKind`
  - `BoundaryEdge`: one directed/shared edge record with stable ID, endpoints, `leftOwner`, `rightOwner`, `leftCluster`, `rightCluster`, `kind: 'frontier' | 'world'`
  - `RegionLoop`: one closed owner-region boundary loop as an ordered list of directed edge refs
  - `FrontierTrack`: one shared contested-owner path as an ordered list of `BoundaryEdge` refs between stable anchors
- Do not derive region loops from shared border polylines anymore. Region loops come from merged region topology directly.

### 3. DX and cluster split become first-class topology, not heuristics after the fact
- `computeDisconnectVirtuals(...)` stays as the initial injection mechanism for V3 phase 1.
- Extend disconnect virtual handling so each disconnect site carries:
  - `sourceOwnerId`
  - `effectiveEnemyOwnerId`
  - `effectiveEnemyClusterId`
- Disconnect cells must enter the region graph already resolved to their effective enemy owner/cluster. There must be no final `__disconnect__` owner in the rendered graph.
- Corridor virtuals inherit the source owner cluster.
- Same-owner merge in V3 must key by `ownerId + clusterId`, never plain owner only, so disconnected same-owner regions remain separate by construction.

### 4. Smooth frontiers once, then reuse
- Build raw frontier tracks from the canonical region graph.
- Apply smoothing only to shared frontier tracks:
  - first Chaikin subdivision
  - then arc/curve fitting
- World-boundary edges stay exact straight map-boundary segments.
- Do not smooth each territory loop independently.
- Materialize final owner loops by substituting the smoothed shared-frontier geometry back into the loop templates, while reusing exact world-edge geometry. This guarantees fill/border coincidence and prevents gaps.

### 5. Animation is frontier-span based, not whole-polyline or whole-loop guessing
- Snapshot `prevRegionGraph` and `targetRegionGraph` on ownership/topology changes only.
- Match animated units at the `FrontierTrack`/frontier-span level using stable IDs derived from:
  - owner pair
  - cluster pair
  - source site identities
  - anchor/junction identities
- Do not use centroid matching as the primary identity rule.
- Parameterize changed frontier spans to `N` control points using arc-length resampling and static-anchor alignment.
- Per frame:
  - unchanged spans stay fixed
  - changed spans interpolate CPs
  - appearing spans grow from anchors/junctions
  - disappearing spans collapse back to anchors/junctions
- Rebuild current `RegionLoop` geometry from the interpolated frontier spans each frame.
- This makes fills backfill behind the moving frontier automatically because the fill loops are regenerated from current frontier positions.

### 6. Rendering outputs
- **Fills**: one closed vector path per `RegionLoop`, drawn once.
- **Borders**: one shared vector path per `FrontierTrack`, drawn once.
- Do not stroke each territory loop independently in V3.
- If arc fitting yields curve segments, render borders with vector curve commands; otherwise use sampled polylines.
- Keep the existing color/filter controls as style inputs on these canonical paths.

### 7. Remove architectural collisions from V3
- V3 must not run:
  - segment-edge morph
  - centroid-matched shared-polyline morph
  - alpha crossfade fills
- Those remain V2-only legacy behaviors.
- V3 transition state is only:
  - previous region graph
  - target region graph
  - active animated frontier spans
  - current interpolated region loops/frontier tracks

## Public Interfaces / Config
- Add a new renderer choice for `Power Voronoi V3`.
- Keep `TERRITORY_MORPH_CONTROL_POINTS` as the V3 control-point count.
- Keep existing HSLA/border width/alpha controls applied to V3 stroke/fill styling.
- Treat `TERRITORY_BOUNDARY_MODE` and `TERRITORY_FILL_MODE` as V2-only legacy controls when V3 is active.
- Add internal-only types:
  - `RegionGraphSnapshot`
  - `BoundaryEdge`
  - `RegionLoop`
  - `FrontierTrack`
  - `ResolvedVirtualSite`

## Test Plan
1. **Static correctness**
- No gaps or overlaps between fills.
- Shared borders sit exactly on fill boundaries.
- World-edge territories close correctly against the rectangle.
- DX: same-owner disconnected regions remain separated by enemy territory, never silently rejoin.

2. **Animation correctness**
- Single conquest: frontier slides laterally and fill backfills immediately behind it.
- Split/merge: one loop to two loops and two loops to one loop animate without teleport or crossfade.
- DX transitions: separator wedges/frontiers move coherently, with no black voids or false same-owner bridges.
- Multiple simultaneous conquests: composed into one graph transition, no centroid-based border flying.

3. **Regression checks**
- `PVV2` remains unchanged as a reference path.
- `DF` modes remain unchanged.
- Panning/zooming/style changes do not rebuild topology.

4. **Performance targets**
- 2k60 with 100 stars and 50k visible ships.
- Territory steady-state overlay p95 `<= 3 ms/frame`.
- Ownership/topology rebuild p95 `<= 12 ms`.
- No long task `> 33 ms` on a normal single-conquest transition.

5. **Diagnostics**
- One structured rebuild log per V3 topology update with:
  - cell count
  - merged region count
  - frontier track count
  - loop count
  - DX separator count
  - changed-span count
- No per-frame spam outside an explicit debug mode.

## Assumptions and Defaults
- Use the existing weighted Voronoi solver and current `MSR/CX/DX` virtual-site heuristics for the first V3 cut.
- Shared frontier is the canonical stroke truth.
- Pixel-chain or `2x2` raster chains are not used as canonical geometry; they are debug/fallback only.
- V3 is the permanent path; V2 is preserved as a frozen reference while V3 is brought to parity and then promoted.
