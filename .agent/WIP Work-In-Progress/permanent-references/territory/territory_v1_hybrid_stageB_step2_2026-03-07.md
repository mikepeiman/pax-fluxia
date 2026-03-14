# Territory Rendering V1 Hybrid - Stage B Step 2 (2026-03-07)

## Scope
Step 2 of the approved execution order:
- Integrate graph-native top-2 Dijkstra output
- Preserve corridor/DX optional modifiers and existing renderer wiring

## Implemented Changes
1. Added graph-native solver result types:
- `NodeTop2Distance`
- `NodeTop2Pair`
- `GraphNativeDistanceResult`

2. Added graph-native solver core:
- `computeGraphNativeDistanceResult(...)` now computes:
  - compatibility matrix `distToPlayer`
  - per-node top-2 owner distances (`best`, `second`)

3. Kept compatibility API stable:
- `computeDistToPlayer(...)` remains the call site contract returning `number[][]`
- It now wraps the new graph-native solver and caches top-2 results for downstream use.

4. Integrated top-2 into ownership sample packing:
- `buildOwnershipSampleSites(...)` now resolves star-owner graph distance via `getOwnerDistanceFromTop2(...)`
- Falls back to compatibility matrix where needed.

5. Added top-2 cache lifecycle:
- Runtime caches: `latestTop2ByStar`, `latestTop2PlayerIds`
- Reset cache state in `resetDistanceFieldTerritoryCache()`

## Behavior Notes
- External behavior remains compatible with current DF pipeline and tuning paths.
- Corridor/DX virtual-site generation was not altered in this step.
- This stage establishes canonical top-2 graph ownership data for later centerline/border work.
