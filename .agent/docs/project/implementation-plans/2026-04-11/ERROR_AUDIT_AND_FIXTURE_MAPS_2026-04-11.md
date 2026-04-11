# Error Audit And Fixture Maps - 2026-04-11

## Purpose

Capture the current error audit result for the territory/client slice, record what was fixed immediately, and define the first hand-authored fixture maps added for deterministic renderer and parity work.

## Audit result

### Starting point

Fresh client TypeScript audit:

- `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`

Initial errors clustered into:

1. legacy geometry mode files that no longer matched the canonical single-mode contract
2. old frontier helper utilities still returning pre-canonical lightweight shapes
3. transition polyline interpolation still assuming the old lightweight frontier shape
4. one `ModifiedVoronoiRenderer` tuple mismatch where polygon points were typed as `number[][]`

### Immediate fixes landed

#### 1. Legacy geometry compatibility wrappers

Files:

- `pax-fluxia/src/lib/territory/layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/modes/PowerVoronoiGeometryMode.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/modes/SeedGraphGeometryMode.ts`

Change:

- converted these from stale pseudo-live geometry modes into explicit compatibility wrappers
- they now delegate into the canonical unified vector compiler instead of pretending to be valid first-class geometry modes under the current contract

Why:

- the runtime registry already only supports `unified_vector`
- these files were compile-breaking leftovers, not honest active modes

#### 2. Frontier helper utilities updated to canonical output

File:

- `pax-fluxia/src/lib/territory/layers/geometry/planners/FrontierTopologyBuilder.ts`

Change:

- territory regions now include `regionId` and `confidence`
- frontier polylines now include `frontierId`, `ownerA`, `ownerB`, and `confidence`
- shared-frontier map now accumulates full canonical frontier objects

Why:

- the canonical geometry contract requires identity-bearing rich shapes
- the helper was still emitting the older lightweight `{ ownerPairKey, points }` form

#### 3. Transition interpolation updated to canonical frontier shapes

File:

- `pax-fluxia/src/lib/territory/layers/transition/interpolatePolylines.ts`

Change:

- interpolation now works with `CanonicalFrontierPolyline`
- metadata is preserved through match/interpolate/clone flows
- spawn/vanish/static/drifted cases now carry forward a canonical prototype instead of dropping identity/confidence fields

Why:

- the transition layer had drifted behind the canonical frontier contract

#### 4. Modified Voronoi tuple cleanup

File:

- `pax-fluxia/src/lib/renderers/ModifiedVoronoiRenderer.ts`

Change:

- normalized polygon and smoothing helpers to `[number, number][]`

Why:

- this removed the last active client compile mismatch after the geometry-layer cleanup

## Validation result

### Passed

- `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p pax-server/tsconfig.json --noEmit --pretty false`

### Still blocked by environment

- `bunx vitest run src/lib/lanes/laneConnectionSync.test.ts`

Current failure:

- Vite/esbuild startup still hits Windows `spawn EPERM` in this Codex runner context

Interpretation:

- this does **not** look like a code-regression signal from the slice above
- it remains a runner/environment limitation until proven otherwise

## New hand-authored fixture maps

Added under:

- `common/resources/fixture-maps/`

Registered in:

- `common/src/fixtureMaps.ts`

### 1. `lane_clearance_triplet`

File:

- `common/resources/fixture-maps/lane_clearance_triplet.json`

Use:

- first curved-lane parity check
- lane detour visibility
- FX path reuse sanity check

Design intent:

- one blocker star sits near the centerline between two anchored opposing clusters
- this should make curved-lane behavior obvious without needing a big map

### 2. `same_owner_disconnect_gap`

File:

- `common/resources/fixture-maps/same_owner_disconnect_gap.json`

Use:

- same-owner non-connected disconnect behavior
- enemy bridge pressure
- frontier/disconnect visual review

Design intent:

- two human stars share ownership but are intentionally not lane-connected
- enemy holdings between and to the right should make disconnect treatment easy to inspect

### 3. `world_edge_frontier`

File:

- `common/resources/fixture-maps/world_edge_frontier.json`

Use:

- owner-to-world border rendering
- edge-adjacent fill stability
- world-border frontier review

Design intent:

- one owner is pushed hard against the left border
- another owner anchors the opposite side
- the center star creates a readable multi-owner split without lots of topology noise

## Recommendation

Use these three fixtures as the default first-pass renderer review set:

1. `lane_clearance_triplet`
2. `same_owner_disconnect_gap`
3. `world_edge_frontier`

They are small enough to understand at a glance and different enough to expose:

- curved lane truth
- disconnect behavior
- world-edge frontier handling

That is a better early comparison base than relying only on large saved maps.
