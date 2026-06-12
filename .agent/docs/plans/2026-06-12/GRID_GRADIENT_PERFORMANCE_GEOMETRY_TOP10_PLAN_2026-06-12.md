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

## Parent Frame Rows

The screenshot's first four rows are:

| Row | Approx total | Approx self | Meaning |
|---|---:|---:|---|
| `Animation frame fired` | `129.7 ms` | `0.0 ms` | Browser request-animation-frame envelope for the selected frame. |
| `Function call` / `Ticker.ts:273:22` | `129.6 ms` | `0.6 ms` | Pixi ticker callback envelope. |
| `renderFrame` / `GameCanvas.svelte:5323:25` | `128.4 ms` | `0.5 ms` | Pax Fluxia frame orchestration envelope. |
| `measurePerf` / `perfProbe.ts:323:17` | `126.8 ms` | `1.2 ms` | Instrumentation wrapper around the expensive render-frame section. |

These are not four independent algorithms to micro-optimize. Their self time is small; their total time is high because they contain the child work listed above. They still require a plan because the user experience problem is that all child work is currently allowed to execute inside the same animation-frame envelope.

Frame-level plan:

1. Keep `renderFrame` as a thin compositor/orchestrator: it should draw the latest committed territory state and schedule expensive updates, not compute them synchronously.
2. Move `computeGeometry0319` and related geometry refresh work to a Worker-backed pending/commit path.
3. Add a frame-budget guard around territory presentation work so non-essential territory refreshes can yield when the frame is already over budget.
4. Split `measurePerf` labels inside `renderFrame` so the diagnostics show `geometry`, `territory presentation`, `Grid Gradient shader texture`, `Pixi render`, and `interaction overlay` separately instead of one giant `measurePerf` parent.
5. Keep `measurePerf` itself; its self time is about `1.2 ms`, so it is not the target unless later traces show instrumentation overhead dominating after child work is moved off-frame.

## Four-Record Follow-Up - 2026-06-12 16:20

The later four screenshots include both total-time and self-time views for the whole `~20s` capture, plus total-time and self-time views for one selected red-frame section. They show two different performance problems:

1. Red-frame spikes are still geometry/frontier dominated.
2. Whole-record steady-state cost is now dominated by ship rendering, particle writes, Pixi rendering, instrumentation overhead, worker payload handling, diagnostics, layout/paint, and repeated config object construction.

### Selected Red-Frame Section

Top rows from `grid gradient perf Snipaste_2026-06-12_16-20-19.png` and `grid gradient perf Snipaste_2026-06-12_16-20-30.png`:

| Consumer | Approx total | Approx self | File/function | Interpretation |
|---|---:|---:|---|---|
| `Animation frame fired` | `130.8 ms` | `0.1 ms` | browser frame envelope | Parent row; the frame is blocked by child work. |
| `Function call` | `130.6 ms` | `0.8 ms` | `Ticker.ts:273` | Pixi ticker envelope; not an independent algorithm. |
| `measurePerf` | `127.9 ms` | `1.1 ms` | `pax-fluxia/src/lib/perf/perfProbe.ts:323` | Instrumented section envelope for the child work. |
| `computeGeometry0319` | `82.9 ms` | `1.1 ms` | `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts:226` | Main synchronous geometry compiler. |
| `applyIntervalRepairs` | `60.5 ms` | `0.6 ms` | `pax-fluxia/src/lib/territory/geometry/minStarMargin.ts:1321` | Min-star-margin repair loop. |
| Geometry closure | `54.6 ms` | `7.5 ms` | `Geometry_0319.ts:155` | Repair validation and related per-compile work. |
| `constructFillsFromFrontierChain` | `43.8 ms` | `37.8 ms` | `powerVoronoiTerritoryGeometryGenerator.ts` | Reconstructs owner fills from frontier chains. |
| `ringContainsPolyline` | `26.3 ms` | `4.8 ms` | `resolveConstraintAlignedTerritoryGeometry.ts` | Repeated region/polyline containment scan. |
| `buildDirectedSegmentKeys` | `21.6 ms` | `21.1 ms` | `resolveConstraintAlignedTerritoryGeometry.ts` | String-heavy segment key construction. |
| `executeChainWalk` | `5.0 ms` | `5.0 ms` | `chainWalkCore.ts` | Chain walking repeated by several geometry consumers. |

The red-frame work is still a synchronous compile/presentation problem. The correct major fix is not a visual-quality reduction; it is moving the compile off the animation-critical frame and removing repeated frontier-chain/segment work.

### Whole-Record Steady-State View

Top rows from `grid gradient perf Snipaste_2026-06-12_16-19-42.png` and `grid gradient perf Snipaste_2026-06-12_16-19-58.png`:

| Consumer | Approx total | Approx self | File/function | Interpretation |
|---|---:|---:|---|---|
| `Function call` | `16814 ms` | `1329 ms` | `task.js:19` | Whole-record parent wrapper. |
| `Animation frame fired` | `15849 ms` | `71 ms` | browser frame envelope | Parent frame cost across the capture. |
| `loop` | `12186 ms` | `12 ms` | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:4003` | Game loop envelope. |
| `renderFrame` | `12087 ms` | `58 ms` | `GameCanvas.svelte:5323` | Main orchestration envelope. |
| `measurePerf` | `11930 ms` | `2997 ms` | `pax-fluxia/src/lib/perf/perfProbe.ts:323` | Instrumentation overhead is now meaningful over long captures. |
| `presentShipsFrame` | `8588 ms` | `10 ms` | `GameCanvas.svelte:1068` | Ship presentation envelope. |
| `renderShips` | `8567 ms` | `1 ms` | `pax-fluxia/src/lib/renderers/ShipRenderer.ts:701` | Ship renderer envelope. |
| ship orbitals closure | `4813 ms` | `1182 ms` | `ShipRenderer.ts:1198` | Per-star/per-ship orbital loop. |
| `drawShip` | `1906 ms` | `539 ms` | `ShipRenderer.ts:274` | Multi-particle writes for each visible ship. |
| `getOrbitSlot` | `1703 ms` | `1668 ms` | `pax-fluxia/src/lib/utils/render.utils.ts:197` | Per-ship orbit slot math and layer search. |
| `set tint` | `1260 ms` | `976 ms` | `Particle.ts:392` | Repeated Pixi particle tint mutation. |
| `ParticleBuffer.update` | `1320 ms` | `3 ms` | `ParticleBuffer.ts:173` | GPU buffer update after particle writes. |
| `GridGradientFamily.worker.onmessage` | `713 ms` | `681 ms` | `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts:307` | Main-thread handling of large Worker responses. |
| `getRenderFamilyModeConfigSource` | `622 ms` | `602 ms` | `GameCanvas.svelte:2104` | Rebuilds spread config objects on a hot path. |
| `countRoles` | `284 ms` | `277 ms` | `GridGradientFamily.ts:1081` | Full-grid diagnostic scan every update. |
| Layout / Paint / Commit / Layerize | `~1700 ms combined` | `~1700 ms combined` | browser rendering pipeline | Likely fed by frequent UI/diagnostic/store updates plus normal canvas compositing. |

This means the next major improvements must not be limited to territory geometry. The mode now exposes wider frame pressure: ship rendering can consume more steady-state frame budget than territory rendering, and Grid Gradient still has avoidable main-thread payload and diagnostic costs.

## Deeper Improvement Tracks From The Four Records

### Track A - Frame Envelope And Instrumentation Hygiene

Problem:

- `Animation frame fired`, `Function call`, `renderFrame`, and `measurePerf` are mostly parent rows, but whole-record `measurePerf` has about `2997 ms` self time.
- `measurePerf()` currently creates a random id string and may mark/measure/clear for every wrapped hot section when capture is enabled.

Action:

- Keep high-level frame instrumentation, but add a low-overhead aggregation path for per-frame hot sections.
- Replace random-id per-call user timing in hot loops with stable counters or sampled timing when detailed user-timing capture is not explicitly enabled.
- Split `renderFrame` timing into named children that match the actual budgets: `ships`, `shipParticleUpdate`, `territoryQueue`, `territoryPresent`, `geometryCompile`, `gridGradientWorkerCommit`, `pixiRender`, and `diagnosticsUi`.

Expected effect:

- Reduces profiling overhead during long captures and makes later traces show actual child work instead of one large wrapper row.

### Track B - Ship Renderer Steady-State Cost

Problem:

- `presentShipsFrame`/`renderShips` accounts for about `8.6s` total over the whole record.
- `getOrbitSlot()` is about `1.67s` self; it repeats layer search, modulo, angle math, bias math, and trig for each visible orbital ship.
- `drawShip()` writes multiple Pixi particles per visible ship: glow, outline, fill, and damage. Each path assigns tint, alpha, scale, and position.
- `set tint`, `ParticleBuffer.update`, `bufferSubData`, and `Color._normalize` show the cost of writing and uploading particle state every ship frame.

Action:

- Build per-star orbit slot tables once per frame or per stable star-count/time bucket, then consume them in the per-ship loop.
- Replace per-ship layer search in `getOrbitSlot()` with precomputed layer metadata and direct lookup by effective index.
- Cache owner/ring/damage tint values and skip setting `particle.tint` when the value is unchanged.
- Track previous active particle count and only hide the delta when the active pool shrinks, instead of alpha-zeroing every unused pooled particle every ship frame.
- Investigate Pixi particle dirty-range support or split static orbiting ships from fast-changing traveling ships so `ParticleBuffer.update()` uploads fewer changed attributes.
- Preserve glow/outline/fill/damage visuals; the target is fewer writes and less repeated math, not fewer visual layers.

Expected effect:

- Attacks the largest whole-record steady-state cost without reducing visual quality.

### Track C - Grid Gradient Worker Payload And Diagnostics

Problem:

- `GridGradientFamily.worker.onmessage` is about `681 ms` self over the whole record.
- The current worker path sends rich plan/classification objects back to the main thread. Browser structured-clone/deserialization can dominate even when the worker did the CPU work off-thread.
- `countRoles()` scans the full typed grid every update for diagnostic counts.

Action:

- Change Grid Gradient worker responses to transferable typed arrays and minimal metadata.
- Keep object-shaped classification data out of the hot shader path; materialize it lazily only for CPU fallback or debug inspection.
- Transfer `ArrayBuffer`s for owner, role, flip-time, and packed shader data instead of cloning nested plan objects.
- Precompute stable role counts in the plan worker and update transition mixing counts from transition-cell indexes, not a full-grid scan.
- Throttle diagnostics-store updates to a low rate when the diagnostics panel is open and avoid per-frame large-object replacement when values did not materially change.

Expected effect:

- Reduces main-thread commit cost after worker plans complete and reduces layout/paint pressure from diagnostic churn.

### Track D - Render-Family Config Source Caching

Problem:

- `getRenderFamilyModeConfigSource()` is about `602 ms` self over the whole record.
- `buildGridGradientRenderFamilyConfigSource()` spreads `GAME_CONFIG`, geometry defaults, and mode defaults on the hot path.

Action:

- Memoize render-family config source objects by mode plus a settings/config epoch.
- Invalidate only when relevant tunables or geometry defaults change.
- Return a stable object reference during normal frames.

Expected effect:

- Removes a hot allocation/spread path and reduces cache-key churn and GC pressure.

### Track E - Geometry Spike Removal

Problem:

- The selected red frame still spends about `83 ms` in `computeGeometry0319`, with `applyIntervalRepairs`, fill reconstruction, chain walking, and segment-key generation underneath it.

Action:

- Move `power_voronoi_0319` render-family geometry compilation to a worker-backed pending/commit path.
- Keep the current committed geometry visible while the next geometry key compiles.
- Share `constructFillsFromFrontierChain()` / `executeChainWalk()` outputs inside `computeGeometry0319()`.
- Replace repeated string segment keys with numeric point/segment ids inside `ringContainsPolyline()` and `buildDirectedSegmentKeys()`.
- Cache min-star-margin repair refs and polyline metrics per ref version.

Expected effect:

- Removes the selected red-frame geometry spike from the animation frame while preserving the current PV geometry and frontier quality checks.

### Track F - Browser Layout/Paint/Commit Pressure

Problem:

- Whole-record self-time includes about `909 ms` layout, `381 ms` paint, `252 ms` pre-paint, `216 ms` commit, and `160 ms` layerize.
- Some of this is normal browser/DevTools overhead, but per-frame Svelte diagnostic objects and log panels can force DOM work unrelated to the canvas visuals.

Action:

- Audit frame-updated stores feeding diagnostics panels and logging controls.
- Throttle or coalesce diagnostic-panel updates separately from gameplay rendering.
- Keep Pixi canvas rendering independent from diagnostic UI refresh cadence.
- Treat anonymous `VM2511`/`VM2512` rows as unowned until a raw trace identifies whether they are DevTools, snippets, or injected scripts.

Expected effect:

- Reduces non-gameplay UI work that competes with the render frame.

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

1. Add frame-budget instrumentation that separates ship render, ship particle upload, territory queue, territory present, geometry compile, Grid Gradient worker commit, Pixi render, and diagnostics UI.
2. Memoize `getRenderFamilyModeConfigSource()` by mode plus settings/config epoch. This is a high-confidence, low-risk fix for a `~602 ms` self-time hot path over the whole record.
3. Reduce Grid Gradient diagnostics and worker commit cost:
   - transfer typed arrays from the plan worker
   - stop cloning rich plan objects on `worker.onmessage`
   - precompute stable role counts
   - avoid full-grid `countRoles()` scans on every update
4. Optimize ship steady-state rendering:
   - precompute per-star orbit slot tables
   - skip unchanged particle tint writes
   - hide only the particle-pool delta when active particle count shrinks
   - reduce `ParticleBuffer.update()` dirty work without dropping glow/outline/fill/damage visuals
5. Move `power_voronoi_0319` render-family geometry compile off the animation frame.
6. Share `constructFillsFromFrontierChain()` / `executeChainWalk()` outputs inside `computeGeometry0319()`.
7. Optimize `ringContainsPolyline()` and `buildDirectedSegmentKeys()` with precomputed numeric segment indexes.
8. Optimize `applyIntervalRepairs()` ref lookup/metrics/materialization.
9. Cache/workerize Grid Gradient distance-band texture plan data if it remains visible after worker payload slimming.
10. Add site-signature power diagram caching if `computePowerDiagramIntegrated()` remains material after geometry-worker commit.

## Acceptance Criteria

- Chrome Performance bottom-up for Grid Gradient conquest should not show `computeGeometry0319`, `applyIntervalRepairs`, `constructFillsFromFrontierChain`, or `buildDirectedSegmentKeys` blocking an animation frame.
- Whole-record Chrome bottom-up should show materially lower self time for `measurePerf`, `getOrbitSlot`, `set tint`, `GridGradientFamily.worker.onmessage`, `getRenderFamilyModeConfigSource`, and `countRoles`.
- Geometry worker build time may remain visible in diagnostics, but it must not block the main thread.
- Grid Gradient visual output remains unchanged at the accepted settings.
- Ship visuals remain visually equivalent: same orbit behavior, glow, outline, fill, damage indicator, and traveling-ship presentation.
- Borders still use the same geometry source and remain comparable to Phase Edges.
- Existing geometry/min-star-margin tests and Grid Gradient transition tests remain green.
