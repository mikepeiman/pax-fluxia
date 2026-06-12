# Grid Gradient Performance Major Fix Plan - 2026-06-12

## User Report

Grid Gradient visual transition end is now smooth, but conquest performance jank is severe. The user explicitly requires major improvements only and no visual quality compromise.

## Trace Evidence From User Screenshots

Chrome Performance bottom-up, localhost run:

- One animation frame/function call consumed about `448 ms`.
- `buildGridGradientPlan` consumed about `347 ms` total.
- `buildGridClassification` consumed about `318 ms` total.
- `resolveOwnerAt` consumed about `302 ms` self time.
- Secondary costs in the same spike included `buildPowerVoronoi0319RenderFamilyGeometry` at about `79 ms`, `constructFillsFromFrontierChain` at about `30 ms`, `buildIndex` at about `17 ms`, and `buildDirectedSegmentKeys` at about `16 ms`.
- Shader texture packing was small by comparison, around `5-10 ms`.

Conclusion: the dominant jank is not shader drawing. It is CPU plan/classification work blocking the main thread during conquest.

## Relevant Files And Functions

- `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts`
  - `resolvePlan()` at about line 266 calls the expensive plan builder synchronously.
  - `update()` at about line 417 runs this during the render-family frame update.
  - `resolveShaderTexturePlan()` at about line 864 is a smaller secondary path.
- `pax-fluxia/src/lib/territory/families/gridGradient/plan.ts`
  - `buildGridGradientPlanKey()` at about line 78 controls cache identity.
  - `buildGridGradientPlan()` at about line 104 calls classification, then wave planning.
- `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts`
  - `resolveOwnerAt()` at about line 153 is the hot self-time function in the screenshots.
  - `buildGridClassification()` at about line 403 loops every grid cell.
  - Current loop resolves PREV owner at about line 534 and NEXT owner at about line 540.
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/gridGradientShaderFieldPacking.ts`
  - `buildGridGradientShaderFieldTexturePlan()` at about line 114 packs shader textures from classification output; this is not the dominant problem.
- Existing nearby reference:
  - `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridPlan.worker.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`, worker request/commit path around lines 1194-1278 and 1840-1932.

## Current Architecture Problem

Grid Gradient is a render-family mode, but its expensive PREV/NEXT grid ownership classification is still built synchronously inside the family `update()` path. At current accepted settings, about `30k` cells are classified. For each cell, current classification can call point-in-polygon against both previous and next geometry snapshots. On a conquest, this blocks the same main thread that must deliver frames.

The project already has a better pattern in Metaball Grid: request expensive grid plans through a Web Worker, keep the current visual state while the plan is pending, then start a local visual transition when the matching plan arrives. Grid Gradient should move to that same runtime shape.

## Non-Negotiable Quality Constraints

- Do not increase spacing to reduce cell count.
- Do not lower shader neighbor sampling, disable pointillism, reduce transition shape quality, or turn off border/fill features to hide jank.
- Do not change ownership truth, geometry truth, or frontier geometry to make classification cheaper.
- Any optimized classifier must produce owner results matching the current classifier at the same grid sample points.
- Borders remain vector/dot presentation on the existing geometry; fill optimization must not fabricate new geometry.

## Major Fix Plan

### 1. Move Grid Gradient plan builds to a worker

Implement a Grid Gradient plan worker by reusing or generalizing the existing Metaball Grid plan worker request/response pattern.

Work:

- Add `gridGradientPlan.worker.ts` or generalize `metaballGridPlan.worker.ts` into a shared worker module.
- Add worker request/response types carrying:
  - plan key
  - world
  - spacing/origin/distribution/jitter/maxCells
  - adjacency/wave settings
  - previous/next regions
  - previous/next owned stars
  - conquest events
  - star positions
- Refactor `GridGradientFamily.resolvePlan()` so it queues a worker request instead of calling `buildGridGradientPlan()` on the main thread.
- While a requested transition plan is pending, render the cached steady/previous plan and freeze progress at PRE.
- When the worker response arrives, commit the plan and start the local visual transition from `input.nowMs`, using the same transition duration.
- Keep synchronous build only as a no-Worker fallback.

Expected result:

- Removes the observed `~318-347 ms` plan/classification work from the main thread.
- Does not reduce visual detail.
- May introduce a plan-ready delay before the transition begins if the plan is not ready yet; that is preferable to dropped frames and can be improved by prewarming in later steps.

### 2. Add plan-build diagnostics before and after workerization

Use project diagnostics, not raw console output.

Data to expose:

- requested plan key hash
- cached plan key hash
- rebuild reason
- active worker request key
- queued worker request key
- worker build ms
- main-thread commit ms
- plan wait ms
- cells, rows, columns, spacing
- PREV/NEXT geometry versions
- transition event count

Expected result:

- We can verify that jank has moved off the main thread and that plan rebuilds are not happening repeatedly for the same transition.

### 3. Replace point-in-polygon-per-cell classification with grid raster classification

Workerization removes the main-thread stall, but the worker can still take hundreds of ms. The next major improvement is to replace `resolveOwnerAt()` loops with a grid-aligned raster classifier.

Work:

- Build owner index arrays with typed arrays:
  - `prevOwnerByCell: Int16Array`
  - `nextOwnerByCell: Int16Array`
  - `roleByCell: Uint8Array`
  - `eventIndexByCell: Int16Array`
- For each polygon region, scan grid rows crossing the polygon, compute edge intersections, and fill grid-center x spans.
- Preserve current overlap/tie-break behavior:
  - same-owner overlaps collapse to that owner
  - differing-owner overlaps use anchor-distance, smaller area, then non-neutral preference as the existing `resolveOwnerAt()` logic does
- Keep nearest-owned-star fallback for cells that remain unowned after polygon fill.
- Add parity tests comparing the raster classifier to current `buildGridClassification()` on representative and randomized fixtures.

Expected result:

- Reduces classification from point-in-polygon for every cell against candidate polygons to row-span fill work plus tie-break handling.
- Preserves the exact accepted grid density and visual quality.

### 4. Split steady owner-grid cache from transition diff

Current transition classification resolves PREV and NEXT ownership together. That repeats work already known from the previous steady state.

Work:

- Cache steady owner grids by geometry version plus grid settings.
- For transition plans:
  - reuse previous steady owner grid when available
  - build or fetch next steady owner grid
  - diff typed owner arrays to produce transition roles
  - run wave planning only over changed cells
- Keep the existing object-shaped `GridClassification` output only where still needed by legacy graphics fallback and diagnostics.

Expected result:

- Avoids recalculating PREV ownership for every conquest.
- Makes repeated conquests cheaper because steady snapshots are reusable.

### 5. Feed shader texture packing directly from typed plan data

The shader backend does not need object-per-cell `GridVStar` records or string ids for every frame.

Work:

- Introduce a typed Grid Gradient plan shape for shader field:
  - owner arrays
  - role array
  - flip-time byte/float array by cell index
  - distance band byte array
- Convert `buildGridGradientShaderFieldTexturePlan()` to pack directly from typed arrays.
- Keep compatibility conversion only for diagnostics and the graphics fallback path.

Expected result:

- Reduces allocations, string work, map lookups, and GC during plan commit.
- Keeps shader visuals unchanged.

### 6. Prewarm transition plans when safe

After workerization and typed classification are correct, reduce plan-ready delay.

Work:

- If the frame already has pending conquest events and both PREV/NEXT geometry snapshots are available or derivable, queue the worker before the visual transition is due to begin.
- If NEXT geometry is not yet available, queue immediately on the first frame it is available and keep the previous visual stable until the plan arrives.

Expected result:

- Smooth frames and minimal transition latency.

## Acceptance Criteria

- A conquest in Grid Gradient must not produce a main-thread frame over `50 ms` from territory plan/classification work at accepted visual settings.
- The specific screenshot hot path should disappear from the main-thread bottom-up view:
  - no `buildGridGradientPlan` blocking the render frame
  - no `buildGridClassification` blocking the render frame
  - no `resolveOwnerAt` dominating main-thread self time
- Worker build time can still be measured separately, but it must not block animation.
- Final visual output must match current accepted quality:
  - same spacing and cell count
  - same ownership at grid sample points
  - same transition wave semantics
  - same shader-field fill appearance
  - same vector/dot border geometry source
- Existing Grid Gradient transition endpoint tests must remain green.
- Add parity tests for optimized classifier vs current classifier before switching it on by default.

## Implementation Order

1. Workerize current Grid Gradient plan build using the existing classifier.
2. Add diagnostics to prove main-thread de-jank and cache behavior.
3. Add typed raster classifier behind a feature flag or internal switch.
4. Prove classifier parity with tests, then route Grid Gradient to it.
5. Convert shader packing to typed plan data.
6. Add prewarm scheduling only after the above path is stable.

## Risk Notes

- Workerization is the fastest major jank fix and should be first, even before algorithmic optimization.
- Raster classification must be tested against current ownership samples before it becomes active, because a small ownership mismatch would be a visual/game readability regression.
- Synchronous fallback should remain for environments without Worker, but it should be reported in diagnostics so we do not mistake it for the normal path.
