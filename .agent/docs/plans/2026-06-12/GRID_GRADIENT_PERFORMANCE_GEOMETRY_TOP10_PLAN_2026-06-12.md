# Grid Gradient Performance Geometry Top-10 Plan - 2026-06-12

## Context

After `2e7d7304f Optimize Grid Gradient plan builds`, Grid Gradient plan/classification work no longer dominates the provided Chrome bottom-up trace. The remaining selected frame is still too slow at about `129.7 ms`, but the hot path has shifted to geometry/frontier preparation and a smaller Grid Gradient shader texture rebuild.

User requirement remains: major improvements only, no visual quality compromise.

## Trace Top Consumers

Top consumers visible in `grid gradient Snipaste_2026-06-12_15-34-16.png`, excluding generic browser/Pixi wrappers:

| Rank | Consumer | Approx total | File/function | Meaning |
|---:|---|---:|---|---|
| 1 | `computeGeometry0319` | `78.7 ms` | `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts:226` | Main power-voronoi/frontier geometry compile on the animation frame. |
| 2 | `applyIntervalRepairs` | `57.5 ms` | `pax-fluxia/src/lib/territory/geometry/minStarMargin.ts:1321` | Min-star-margin repair loop over polyline/star intervals. |
| 3 | validator closure | `53.3 ms` | `Geometry_0319.ts:155` | Candidate repair validation rebuilding fill regions from frontier chains. |
| 4 | `constructFillsFromFrontierChain` | `45.2 ms` | `powerVoronoiTerritoryGeometryGenerator.ts:763` | Reconstructs closed owner regions from shared/world frontier polylines. |
| 5 | `ringContainsPolyline` | `27.5 ms` | `resolveConstraintAlignedTerritoryGeometry.ts:354` | Display-frontier filtering scans whether region rings contain each polyline. |
| 6 | `buildDirectedSegmentKeys` | `22.6 ms` | `resolveConstraintAlignedTerritoryGeometry.ts:339` | String segment-key generation inside `ringContainsPolyline`. |
| 7 | `executeChainWalk` | `6.8 ms` | `chainWalkCore.ts:99` | Shared frontier chain walk used by fill reconstruction/frontier maps. |
| 8 | `alignGeometry` | `6.3 ms` | `resolveConstraintAlignedTerritoryGeometry.ts:404` | Endpoint/constraint alignment and display geometry generation. |
| 9 | `resolveShaderTexturePlan` | `5.5 ms` | `GridGradientFamily.ts:1186` | Grid Gradient texture plan rebuild, mostly distance/owner arrays plus packing. |
| 10 | `computePowerDiagramIntegrated` | `4.4 ms` | `powerDiagram.js:33` | Weighted power diagram computation inside geometry compile. |

Nearby related consumers not in the top 10 but part of the same fix area:

- `buildDisplayGeometryFromResolvedRegions` at about `4.2 ms`.
- `ConvexHull.compute` at about `3.8 ms`.
- `buildOwnershipGridFrontierDistanceField` at about `2.7 ms`.
- `buildGridGradientShaderFieldTexturePlan` at about `1.6 ms`.

## Diagnosis

The first Grid Gradient performance fix moved the mode-local plan/classifier off the main thread. This trace now shows the remaining jank is caused by geometry work still running synchronously in the render frame:

- `GameCanvas.svelte:getCurrentRenderFamilyGeometry()` calls `buildPerimeterFieldRenderFamilyGeometry()` synchronously on cache misses.
- `buildPerimeterFieldRenderFamilyGeometry()` calls `computeGeometry0319()` for `power_voronoi_0319`.
- `computeGeometry0319()` runs both raw and smoothed min-star-margin repair paths.
- Each repair path uses `buildMinStarMarginValidator()`, whose candidate validator calls `constructFillsFromFrontierChain()` to prove topology safety.
- Later stages reconstruct fills/frontier maps/display geometry again, including repeated chain walks and repeated segment-key scans.

The quality checks are legitimate. The performance problem is when and how often they run.

## Plan To Address Each Consumer

### 1. `computeGeometry0319` - move compile off the animation-critical frame

Action:

- Add a render-family geometry worker or extend the existing territory worker path so `buildPerimeterFieldRenderFamilyGeometry()` can run off-thread for `power_voronoi_0319`.
- Keep the current committed geometry visible while the requested geometry key is pending.
- Commit the worker geometry only at a frame boundary, then let Grid Gradient’s existing worker plan path build the matching dot plan.
- Keep synchronous geometry only for first-frame/no-Worker fallback, and expose fallback in diagnostics.

Expected effect:

- Removes the largest remaining main-thread block without changing geometry quality.

### 2. `applyIntervalRepairs` - reduce repeated per-interval work

Action:

- Replace `refs.find(...)` inside every interval with a prebuilt `Map<group:index, ref>`.
- Cache `buildPolylineMetrics(ref.currentPoints)` per ref version.
- Only rebuild metrics after a ref is actually modified.
- Avoid materializing all polyline outputs for rejected repairs that fail local checks before global validation.

Expected effect:

- Reduces min-star-margin repair overhead while preserving the same repair decisions.

### 3. `Geometry_0319.ts` validator closure - memoize repair validation

Action:

- Add a candidate geometry fingerprint in `buildMinStarMarginValidator()`.
- Cache validation results for repeated candidate polyline states.
- Split validation into cheap invariants first:
  - region count unchanged
  - owner region counts unchanged
  - repaired ref endpoint closure unchanged
  - owned stars still inside owner regions
- Run full `constructFillsFromFrontierChain()` validation only when cheap checks cannot prove safety.

Expected effect:

- Preserves the safety gate but stops paying a full fill reconstruction for every candidate in common repeat cases.

### 4. `constructFillsFromFrontierChain` - share chain-walk output

Action:

- Add an internal API that returns both flattened territories and the `ChainWalkResult`.
- Use that combined result in `computeGeometry0319()` for final fills and frontier-map construction, instead of separately calling `constructFillsFromFrontierChain()` and then `buildFrontierMap()` which executes a second chain walk.
- Use the same combined result inside repair validation when possible.

Expected effect:

- Removes repeated chain walk/fill flattening for the same frontier polylines.

### 5. `ringContainsPolyline` - precompute region/polyline segment data

Action:

- In `filterPolylinesByResolvedRegions()`, precompute normalized segment keys for each region ring once.
- Precompute forward and reversed segment keys for each polyline once.
- Replace `territoryRegions.some(region => ringContainsPolyline(...))` with a cached lookup/index by segment key.

Expected effect:

- Removes repeated per-region string-array rebuilds.

### 6. `buildDirectedSegmentKeys` - replace string-heavy keys with numeric ids

Action:

- Introduce a local coordinate quantization table that maps rounded point coordinates to numeric point ids.
- Represent directed segment keys as packed numeric pairs instead of formatted strings.
- Keep string output only at public boundaries/diagnostics if needed.

Expected effect:

- Directly attacks the `22.6 ms` self-time string/key-generation cost.

### 7. `executeChainWalk` - index once, reuse by frontier signature

Action:

- Build a frontier polyline signature from owner pair + endpoint point ids + point count.
- Cache `executeChainWalk()` results for raw and smoothed frontier sets during a single `computeGeometry0319()` call.
- Reuse the result across fills, frontier-map construction, and diagnostics.

Expected effect:

- Makes chain walking effectively once-per-frontier-state instead of once-per-consumer.

### 8. `alignGeometry` - stop deriving display geometry from regions when source polylines already exist

Action:

- In `resolveConstraintAlignedTerritoryGeometry.ts`, prefer display polylines derived from aligned frontier/world polylines directly.
- Keep `buildDisplayGeometryFromResolvedRegions()` as a fallback when aligned source polylines are unavailable or fail validation.
- If region-derived display geometry remains needed, reuse the segment index from rank 5 instead of rebuilding it.

Expected effect:

- Reduces alignment/display overhead and also helps ranks 5 and 6.

### 9. `resolveShaderTexturePlan` - cache or workerize distance-band packing

Action:

- Cache `ownerIndexByCell`, distance field, and owner max-distance arrays by `plan.planKey + palette owner mapping + borderOffset`.
- Move distance-band construction into the Grid Gradient plan worker when it does not need live Pixi objects.
- Keep only GPU texture upload and uniform update on the main thread.

Expected effect:

- Cuts the remaining Grid Gradient-local `5.5 ms` rebuild path and reduces GC pressure.

### 10. `computePowerDiagramIntegrated` - cache by site signature

Action:

- Build a power-site signature from site positions, weights, owners, world size, and clip pad.
- Reuse the previous power diagram when the signature is unchanged.
- When only ownership changes but site positions/weights do not, verify whether the diagram can be reused and only ownership labels/frontier grouping need recomputation.

Expected effect:

- Reduces geometry compile cost on repeated frames and consecutive conquests with stable star positions.

## Execution Order

1. Add diagnostics for render-family geometry cache misses and geometry worker pending/commit state.
2. Move `power_voronoi_0319` render-family geometry compile off the animation frame.
3. Share `constructFillsFromFrontierChain()` / `executeChainWalk()` outputs inside `computeGeometry0319()`.
4. Optimize `ringContainsPolyline()` and `buildDirectedSegmentKeys()` with precomputed numeric segment indexes.
5. Optimize `applyIntervalRepairs()` ref lookup/metrics/materialization.
6. Cache/workerize Grid Gradient distance-band texture plan data.
7. Add site-signature power diagram caching.

## Acceptance Criteria

- Chrome Performance bottom-up for Grid Gradient conquest should not show `computeGeometry0319`, `applyIntervalRepairs`, `constructFillsFromFrontierChain`, or `buildDirectedSegmentKeys` blocking an animation frame.
- Geometry worker build time may remain visible in diagnostics, but it must not block the main thread.
- Grid Gradient visual output remains unchanged at the accepted settings.
- Borders still use the same geometry source and remain comparable to Phase Edges.
- Existing geometry/min-star-margin tests and Grid Gradient transition tests remain green.
