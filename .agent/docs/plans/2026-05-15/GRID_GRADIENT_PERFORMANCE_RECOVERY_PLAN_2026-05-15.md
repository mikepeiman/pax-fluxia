# Grid Gradient Performance Recovery Plan - 2026-05-15

**Status:** Plan document, implementation not yet started  
**Worktree:** `C:\Users\mikep\.codex\worktrees\9f22\pax-fluxia`  
**Mode id:** `grid_gradient`  
**Runtime shape:** render-family runtime  
**Release state:** experimental

## 1. Concept And Intent Brief

`Grid Gradient` is a territory presentation mode for Pax Fluxia. It does not create ownership, change territory rules, or alter PV-derived region geometry. It renders existing territory regions through a very fine invisible grid, where each eligible grid sample becomes a visible mark owned by the region that contains it.

The intended look is a pointillist / stippled territory fill:

- large marks in the interior of each owned region,
- smoothly shrinking marks near frontiers and world borders,
- vector borders preserved by default for gameplay readability,
- optional border-as-dots presentation when the user wants the same grid texture on borders,
- circle marks as the default, square marks as a clean option, and deterministic noise marks as an organic option.

The strategic goal is to get a visually rich grid-based transition substrate without the impractical compute burden of thousands of moving metaballs. The mode should eventually support efficient grid transitions because a grid cell can store previous owner, next owner, transition timing, and presentation size without requiring moving physics objects.

## 2. Implementation Shape For External Research

The mode currently lives in the render-family path, not the pipeline runtime and not the direct legacy renderer path.

Current shape:

1. `GameCanvas.svelte` builds shared render-family input.
2. `GridGradientFamily.update()` receives existing ownership snapshots, resolved family geometry, previous geometry when available, transition progress, and settings.
3. `buildGridGradientPlan()` builds a grid plan over the world bounds.
4. The plan currently reuses `buildGridClassification()` from `metaballGrid`.
5. Classification assigns each grid cell to previous and next owners using existing region polygons.
6. Presentation code converts classified grid cells into Pixi drawing commands.
7. Vector borders are drawn separately and remain the readability default.
8. Optional border dots are presentation artifacts derived from frontier geometry and settings.

Layer responsibilities:

| Layer | Current responsibility in this mode |
|---|---|
| Ownership | Read from existing `OwnershipSnapshot`; never duplicated as game truth. |
| Geometry | Read from shared PV-derived render-family geometry; never fabricated by the renderer. |
| Transition | Use render-family previous/next inputs and per-cell transition timing; no independent game-state transition. |
| Presentation | Own grid cell sizing, color blending, mark shape, border dots, and retained GPU drawing strategy. |

External research should focus on grid classification, rasterization, retained PixiJS 8 rendering, WebGL-safe batching, and transition scheduling. It should not research alternate game ownership models or alternate territory geometry sources for this mode.

## 3. Current Performance Evidence

The evidence below comes from user-provided DevTools Performance screenshots on `localhost:1441`. Raw trace JSON was not available, so the exact totals are screenshot-derived.

| Screenshot | Frame / stack symptom | Relevant measured cost |
|---|---|---:|
| Image #1 | Medium render frame dominated by Pixi Graphics work | `Animation frame fired` 68.5 ms, `buildContextBatches` 38.9 ms, circle `triangulate` 15.7 ms, `measurePerf` 11.6 ms, `bufferSubData` 8.1 ms |
| Image #2 | Catastrophic frame dominated by geometry, plan, and classification | `Animation frame fired` 329.8 ms, `buildPerimeterFieldRenderFamilyGeometry` 123.4 ms, `buildGridGradientPlan` 93.7 ms, `computeGeometry0319` 86.3 ms, `buildGridClassification` 80.3 ms, `pointInPolygon` 73.3 ms self, `updateGpuContext` 45.6 ms |
| Image #3 | Render-side frame dominated by Pixi render data rebuild | `Animation frame fired` 74.8 ms, renderer `render` 61.2 ms, `updateGpuContext` 41.6 ms, `buildContextBatches` 39.5 ms, circle `triangulate` 19.8 ms, `GridGradientFamily.update` 8.4 ms |
| Image #4 | Plan rebuild plus render upload in one frame | `Animation frame fired` 177.1 ms, `GameCanvas.run` 107.0 ms, `buildGridGradientPlan` 91.1 ms, `buildGridClassification` 85.0 ms, `pointInPolygon` 75.6 ms self, `collectRenderablesWithEffects` 51.6 ms, `updateGpuContext` 49.9 ms, `buildContextBatches` 48.2 ms |

## 4. Problem Files And Functions

| Problem area | Files / functions | Why it is expensive |
|---|---|---|
| Full plan rebuilds on the animation frame | `pax-fluxia/src/lib/territory/families/gridGradient/plan.ts`, `buildGridGradientPlan()` | Plan generation can consume 90 ms+ and currently runs synchronously when the plan key changes. |
| Shared family geometry rebuilds appearing in Grid Gradient frames | `pax-fluxia/src/lib/components/game/GameCanvas.svelte`, shared geometry builder under the render-family input path | Screenshots show 86 to 123 ms geometry work in the same frame as Grid Gradient planning. This must be cached or moved out of the hot frame. |
| Grid classification by point-in-polygon lookup | `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts`, `resolveOwnerAt()`, `pax-fluxia/src/lib/territory/geometry/geometryUtils.ts`, `pointInPolygon()` | Fine grid counts multiply ray-cast polygon tests. `pointInPolygon()` alone reached 73 to 76 ms self time. |
| Per-cell Pixi Graphics drawing | `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts`, `update()`, `pax-fluxia/src/lib/territory/families/gridGradient/paint.ts`, `drawGridGradientCell()` | Clearing and rebuilding many Graphics circle/fill commands forces Pixi to rebuild batches, triangulate circles, and upload buffers. |
| Renderable collection and GPU context update | Pixi internals reached through the Grid Gradient Graphics path | `buildContextBatches`, `updateGpuContext`, `collectRenderablesWithEffects`, `bufferSubData`, and circle triangulation dominate frames even when family update time looks moderate. Pixi internals should not be patched; the caller must stop using this path for dense fills. |
| Allocation and GC churn | scene-cell arrays, temporary render objects, Graphics command streams | Screenshots show Minor/Major GC spikes between roughly 6 ms and 27 ms. This follows from rebuilding large per-frame object graphs. |
| Diagnostics blind spot | `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientStats.ts` | Current stats do not make it easy to see plan rebuild reason, cache hit/miss, worker pending state, cell count, active transition count, retained batch count, or draw-path mode. |

## 5. Recovery Plan

### Phase 0 - Document And Instrument

1. Keep this plan current as implementation proceeds.
2. Add a dated session note and queue entry for the Grid Gradient performance recovery.
3. Extend Grid Gradient diagnostics before changing algorithms:
   - plan key,
   - plan rebuild reason,
   - plan build time,
   - raster / classification time,
   - cache hit or miss,
   - worker pending state,
   - total cells,
   - visible cells,
   - active transition cells,
   - retained batch count,
   - border-dot batch count,
   - last draw backend.

Acceptance:

- A future screenshot or diagnostics dump can distinguish geometry rebuild, plan rebuild, rasterization, transition update, and presentation upload costs.

### Phase 1 - Remove Point-In-Polygon From The Normal Grid Path

Replace the normal Grid Gradient classification path with a grid-native scanline rasterizer over existing region polygons.

Implementation direction:

1. Add Grid Gradient-owned raster classification helpers under `pax-fluxia/src/lib/territory/families/gridGradient/`.
2. For each region polygon, convert covered grid rows into x-intersection spans.
3. Fill owner ids into typed arrays by grid cell index.
4. Preserve the existing geometry and ownership inputs.
5. Keep point-in-polygon only as a fallback or test oracle, not as the normal per-cell loop.
6. Reuse current nearest-star fallback only for cells that remain unassigned after rasterization and only where that fallback is still visually necessary.

Acceptance:

- `pointInPolygon()` is absent from the main Grid Gradient frame profile except for fallback edge cases.
- Classification cost drops from the observed 80 to 85 ms range to a low single-digit millisecond target on the same map.
- Tests prove raster classification matches the existing classifier for simple and concave polygons, adjacent regions, and border-adjacent cells.

### Phase 2 - Move Plan Generation Off The Animation Frame

Add a Grid Gradient plan worker modeled on the existing Metaball Grid worker pattern, but keep the implementation modular and specific to Grid Gradient.

Implementation direction:

1. Define serializable `GridGradientPlanWorkerRequest` and `GridGradientPlanWorkerResponse` types.
2. Worker input includes geometry-derived region polygons, previous/next ownership ids, grid spacing, origin, max cell cap, transition settings, and style-relevant border-offset inputs.
3. Worker output includes typed owner arrays, distance-to-border data or size bands, transition timing data, and summary stats.
4. Main thread keeps rendering the last valid plan while a newer request is pending.
5. Stale worker responses are ignored by request id and plan signature.
6. If Worker construction fails, fall back to synchronous planning with diagnostics that identify the fallback state.

Acceptance:

- No 90 ms `buildGridGradientPlan()` block appears on the main animation frame in normal operation.
- Transition startup may show a pending state, but it must not freeze rendering.
- Stale response handling is covered by tests.

### Phase 3 - Stop Using Pixi Graphics For Dense Fill Cells

Replace the fill presentation path with retained GPU batches. Do not patch Pixi internals.

Implementation direction:

1. Retain vector borders as the default border layer.
2. Replace per-cell `Graphics.circle().fill()` with one or a small number of retained mesh or atlas-backed batches.
3. Use circle texture quads for the default circle shape.
4. Use scaled white quads for square shape.
5. Use a deterministic small bank of noise textures for noise shape, selected by cell hash.
6. Quantize or otherwise batch size/alpha data so a fine gradient remains visually smooth without requiring one Pixi Graphics command per cell.
7. Keep stable fill cells in static retained batches.
8. Keep active transition cells in separate dynamic batches.
9. Put optional border dots through the same retained batch path, including blended and butted styles.

Acceptance:

- Fill-cell frames no longer show circle `triangulate` as a meaningful hot path.
- `buildContextBatches` and `updateGpuContext` are not dominated by Grid Gradient fills.
- Default circle visuals remain close to the current accepted look.
- Border dots remain optional and readable.

### Phase 4 - Split Stable And Active Transition Work

Make steady frames nearly free and transition frames local.

Implementation direction:

1. Add stable plan signatures for geometry, ownership, grid settings, shape settings, and border-dot settings.
2. Skip repaint when the stable signature and transition sample are unchanged.
3. During transitions, update only cells whose owner, alpha, or size is changing.
4. Keep settled previous and next layers static.
5. Rebuild border-dot batches only when border geometry or border-dot settings change.

Acceptance:

- A steady Grid Gradient frame does not rebuild the plan, does not rebuild stable batches, and does not repaint unchanged cells.
- Transition frames scale with active changed cells, not full world cell count.

### Phase 5 - Fix Geometry Rebuild Coupling If It Persists

If profiling still shows shared family geometry rebuilding in Grid Gradient animation frames, move or cache that work at the render-family input boundary.

Implementation direction:

1. Trace the geometry version and source signature passed into `GridGradientFamily`.
2. Confirm whether `GameCanvas` is rebuilding family geometry unnecessarily for unchanged ownership/geometry inputs.
3. Reuse an existing shared geometry cache where available.
4. If no suitable cache exists, add one at the render-family input builder boundary, not inside Grid Gradient presentation code.
5. Keep previous-geometry capture tied to real transition input, not reconstructed ad hoc inside the renderer.

Acceptance:

- `buildPerimeterFieldRenderFamilyGeometry` and `computeGeometry0319` do not appear as recurring Grid Gradient frame costs when ownership and geometry inputs have not changed.

## 6. Verification Plan

Targeted tests:

- Raster classification parity against the old classifier for representative polygons.
- Worker request / response serialization and stale response handling.
- Cache-hit tests proving unchanged inputs do not rebuild the plan.
- Retained-batch tests proving circle, square, noise, blended border dots, and butted border dots are emitted without dense Graphics command streams.
- Diagnostics tests for new stats fields and fallback states.

Required commands:

1. Run focused tests for the new Grid Gradient helpers and any changed render-family input helpers.
2. Run `bun run build` in `pax-fluxia/`.
3. If repo-root build-sensitive files are touched, run repo-root `bun run build`.

Manual UI verification:

1. Open the game and select `Grid Gradient` from the territory render mode UI.
2. Verify large-to-small mark sizing from region center to border.
3. Verify vector borders remain readable by default.
4. Verify border dots are optional and support blended and butted styles.
5. Record a new DevTools Performance trace on the same dense-map scenario.
6. Confirm `buildGridGradientPlan`, `pointInPolygon`, and circle triangulation are no longer recurring frame hot paths.

Performance targets for this recovery:

- Steady Grid Gradient frames should not trigger plan rebuilds.
- Main-thread family update should target below 4 ms after warm-up on the test map.
- Grid Gradient should not produce recurring 100 ms+ animation frames on the scenario shown in the screenshots.
- Render-side Pixi work should be bounded by retained batch updates, not by per-cell Graphics tessellation.

## 7. Explicit Non-Goals

- Do not change the territory ownership model.
- Do not replace PV-derived family geometry.
- Do not add another direct renderer path from `GameCanvas.svelte`.
- Do not patch PixiJS internals.
- Do not remove vector borders as the default readability path.
- Do not hide performance cost by silently making the grid coarse without surfacing the effective cell count.

## 8. Open Research Questions

These questions are appropriate for an external agent to research without changing the mode intent:

1. In PixiJS 8, what retained mesh or particle-batch primitive gives the lowest CPU overhead for 50k to 160k tinted grid marks with per-cell scale and alpha?
2. Is a custom mesh with atlas-backed quads simpler and more reliable than `ParticleContainer` for circle, square, and noise shapes?
3. What scanline rasterization implementation is fastest in TypeScript for many simple territory polygons over a fixed grid?
4. Which typed-array layout best supports previous owner, next owner, distance-to-border, transition phase, size, and alpha without causing GC churn?
5. Can the existing render-family worker infrastructure be shared without coupling Grid Gradient too tightly to Metaball Grid?

## 9. Current Implementation Status Against This Plan

As of 2026-05-15, this is a plan document only. The visually accepted first implementation still has the performance hot paths described above. The next implementation pass should start at Phase 0 and Phase 1, then move to retained presentation batches before claiming performance recovery.
