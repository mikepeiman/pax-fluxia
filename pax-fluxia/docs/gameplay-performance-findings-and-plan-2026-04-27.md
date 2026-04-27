# Gameplay Performance Findings And Plan - 2026-04-27

## Purpose
This document is the permanent repo artifact for the 2026-04-27 gameplay performance push. It records the source material that informed the plan, the repo-grounded baseline, the implementation changes completed in this pass, and the remaining execution order.

## Source Set
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_plan_with_full_pipeline_diagnostics_v2.md`
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_diagnostic_bundle_schema_v1.md`
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_plan_with_diagnostics.md`
- `C:/Users/mikep/Downloads/Pax Fluxia/Docs/2026-04-27 ChatGPT-5.4 Pax Fluxia rendering perf deep-research-report v2c.md`
- `C:/Users/mikep/Downloads/Pax Fluxia/Docs/2026-04-27 Perplexity research Pax Fluxia rendering perf deep-research-report (v3).md`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/MULTI_LANE_WORKTREE_GUIDE.md`
- `pax-fluxia/docs/rendering-pipeline-audit-2026-04-27.md`

## Baseline
The current hard baseline comes from `.agent-harness/metrics/browser-gameplay-benchmark-latest.json` dated 2026-04-25.

- Scenario: `metaballGameplay`
- Requested mode: `metaball_grid`
- Map size: 172 stars / 428 connections
- Average frame: `23.51ms`
- P95 frame: `33.4ms`
- Long tasks: 5 totaling `499ms`
- Max long task: `227ms`
- Tick simulation: `2.5ms`

Top measured render costs in that artifact:

- `game.renderFrame.territory.metaball_grid`: `12.609ms avg`
- `game.renderFrame.geometry.metaball_grid`: `7.036ms avg`
- `game.renderFrame.stars`: `3.284ms avg`
- `game.renderFrame.connections`: `1.104ms avg`

Conclusion: gameplay performance is render and geometry bound first. Simulation is not the first rewrite target.

## Findings
### 1. `vs_pvv3` was paying for FG2 too early
The current architecture in `GameCanvas.svelte` ran `runFG2DataPipeline(...)` before the renderer's own invalidation gate. That guaranteed FG2 cost even when the frame was semantically unchanged.

### 2. `pixel` was doing full texture churn
`PixelTerritoryRenderer.ts` was creating a fresh canvas, fresh `ImageData`, and fresh Pixi texture on each accepted worker result, then destroying the previous texture.

### 3. `metaball_grid` remains the biggest family-local main-thread problem
The baseline and the rendering audit agree: worker planning is not enough if the visible draw path is still immediate-mode, allocation-heavy, and smoothing-heavy on the main thread.

### 4. Secondary scene-layer costs were not broken out well enough
Connections and star labels were visible in the benchmark, but the instrumentation was too coarse to clearly separate lane redraw, star-visual work, and star-label work.

### 5. Transition diagnostics needed a fixed schema contract
The existing export path had useful data, but not the fixed `ownership -> geometry -> transition -> render` step shape, ordered step IDs, checks, failure gates, and final compare signal described by the PV docs.

### 6. Conquest-side auto-dumps were still too invasive
`TerritoryRuntimeCoordinator` still had hot-path geometry dumping behavior that wrote to console and auto-downloaded browser artifacts on conquest. That belongs behind an explicit dev flag, not in default gameplay behavior.

## Implemented In This Pass
### Benchmark and diagnostics
- Extended the benchmark stack to choose a fixed named saved map when available instead of silently relying on restart-only behavior.
- Added bridge support to enumerate saved maps with star and connection counts.
- Reworked the benchmark runner around comparable territory mode specs so the default path can benchmark `metaball_grid`, `distance_field`, `vs_pvv3`, and `pixel` in the same toolchain.
- Added benchmark output metadata for the resolved benchmark target map.
- Updated the summary script to print the benchmark target map selection.
- Expanded focus-measure coverage for:
  - `game.renderFrame.fg2DataPipeline.*`
  - `game.renderFrame.territory.present.*`
  - `game.renderFrame.pixel.*`

### Render-path fixes
- Moved the `vs_pvv3` invalidation decision ahead of FG2 in `GameCanvas.svelte`.
- Added `inspectPVV3Invalidation(...)` to `PVV3Renderer.ts`.
- Cached canonical PVV3 shell data so visual-only redraws can stay on the canonical path instead of falling back to weighted Voronoi reconstruction.
- Replaced `pixel` texture destroy-and-recreate behavior with persistent canvas, persistent `ImageData`, persistent texture reuse, and explicit source updates.
- Added explicit timing for pixel texture upload.
- Added connection-layer caching in `LaneRenderer.ts` so stable lane truth no longer forces a full clear and redraw every frame.
- Added explicit timing for connection redraw.
- Split star instrumentation into separate visual and label timing blocks in `StarRenderer.ts`.
- Added explicit timing for territory present work inside the async territory presentation queue.

### Transition diagnostics
- Upgraded `downloadDiagnosticPackage(...)` to emit `debug/diagnostic.json` in a `pv-transition-diagnostics-v1` wrapper shape.
- Added ordered step records spanning `O01` through `R04`.
- Added per-step `checks` and `failIf` payloads.
- Added top-level bundle metadata including capture ID, conquest ID, target star, owners, attacker set, and bounds.
- Added an export-time final-frame compare so `R04` reports whether the final rendered result lands within tolerance of POST.
- Kept the existing serializer and package path instead of creating a second exporter.

### Runtime safety
- Gated one-shot geometry dump behavior in `TerritoryRuntimeCoordinator.ts` behind the explicit global flag `__PAX_TERRITORY_GEOMETRY_DUMP__`.

## Validation Results
### Build
- `bun run build` completed successfully in `pax-fluxia/`.

### Benchmark
- Ran `bun run debug:browser-gameplay-perf`.
- Ran `bun run debug:browser-gameplay-summary`.
- Current artifact: `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`

Resolved benchmark target for this run:

- Saved map: `First Symmetry-6_April 17b`
- Saved-map metadata: `172` stars / `214` connections
- Live gameplay scenarios still reported `428` rendered connections

The `214` vs `428` mismatch needs a follow-up normalization pass before connection-count-based acceptance reporting is treated as canonical. The most likely explanation is that saved-map metadata is counting undirected edges while the live runtime is counting directional lane entries, but that is still an inference and should be verified in code.

Steady-state gameplay results from this run:

| Mode | Avg frame | P95 frame | Max long task | Key steady-state costs |
| --- | ---: | ---: | ---: | --- |
| `metaball_grid` | `18.05ms` | `33.3ms` | `109ms` | `stars 7.514ms`, `territory 1.767ms`, `geometry 0.741ms`, `connections 0.747ms` |
| `distance_field` | `17.21ms` | `16.8ms` | `127ms` | `stars 5.511ms`, `territory 0.2ms`, `connections 0.429ms` |
| `vs_pvv3` | `17.21ms` | `16.8ms` | `177ms` | `stars 5.532ms`, `territory 8.1ms`, `FG2 2.1ms`, `connections 0.385ms` |
| `pixel` | `22.32ms` | `33.4ms` | `163ms` | `stars 7.382ms`, `territory 0.1ms`, `connections 0.414ms` |

Additional validation signals from the same artifact:

- `metaball_grid` now satisfies the family-local acceptance gate for update frames:
  - `territory 1.767ms + geometry 0.741ms = 2.508ms`
- `LaneRenderer` caching is active in all measured modes:
  - `game.renderFrame.connections.redraw` stayed around `0.55ms - 0.7ms` with `count=2`
- `vs_pvv3` instrumentation is active and the FG2 gate moved to a much rarer path:
  - `game.renderFrame.fg2DataPipeline.vs_pvv3` showed only `count=1` in steady-state gameplay
- `game.renderFrame.stars.labels` and `game.renderFrame.stars.visuals` are now split in the artifact, which makes the next label-density and text-render work measurable instead of anecdotal

### Status Against Acceptance Targets
- `metaball_grid`
  - Passes the family-local `territory + geometry < 11ms` target
  - Fails the shipping target on frame pacing because `avgFrameMs` and especially `p95FrameMs` are still too high
- `distance_field`
  - Misses shipping average frame target by a narrow margin
  - Meets the `p95FrameMs < 20` target
  - Still fails long-task target
- `vs_pvv3`
  - Meets the `p95FrameMs < 20` target
  - Fails average frame and long-task targets
- `pixel`
  - Fails average frame, p95, and long-task targets

Net result: this pass removed a large amount of territory-path waste and improved the benchmark surface, but the dominant steady-state bottleneck is now star presentation rather than territory geometry in the best-performing modes.

## Remaining Execution Order
### `diag`
- Keep the benchmark artifact current on one fixed saved map.
- Validate the new transition package on at least one real conquest bundle.
- Confirm the final `R04` compare is meaningful on live captures, not only structurally present.

### `render-infra`
- Decide whether connection caching is sufficient or whether lane geometry should be promoted to an explicit retained display object.
- Move star labels off dense `PIXI.Text` usage toward `BitmapText` plus zoom-sensitive density LOD once the new measures confirm label cost is material.
- Keep improving async territory queue reporting, but only after inner render work is actually reduced.

### `render-family/metaballGrid`
- Remove string-heavy cell bookkeeping from the hot path.
- Cache region lookup structures across identical geometry.
- Move smoothing and blended-edge extraction out of the paint loop.
- Replace per-cell `PIXI.Graphics` painting with a batched mesh or instanced path.

### `render-family/perimeterField`
- Keep this lane focused on correctness and diagnostic parity with the PV docs.
- Do not make it the first broad FPS optimization lane.

### `distance_field`
- Keep it as the high-quality candidate.
- Move GPU readback and CPU border extraction behind explicit export or debug flags.
- Bias the default gameplay path toward GPU-local borders and fewer short-lived buffers.

## Acceptance Targets
- Shipping candidate mode on the 172-star / 428-connection benchmark map:
  - `avgFrameMs < 16.7`
  - `p95FrameMs < 20`
- `metaball_grid` remains viable only if:
  - `game.renderFrame.territory.metaball_grid + game.renderFrame.geometry.metaball_grid < 11ms` on update frames
- Long-task max:
  - `< 100ms`
- Long animation frame blocking:
  - `< 50ms`
- Transition diagnostics:
  - human can identify the first failing step in one pass
  - final `R04` POST compare reports within tolerance

## Validation Plan
- `bun run build`
- `bun run tools/debug/benchmark-browser-gameplay.ts`
- `bun run tools/debug/summarize-browser-gameplay-benchmark.ts`
- Export at least one conquest diagnostic package and inspect `debug/diagnostic.json`
- Visual smoke:
  - single-player start
  - one conquest transition
  - one heavy-map steady-state capture
- Soak:
  - 20-30 minute run in the chosen shipping candidate mode after the core family fixes land

## Notes
This pass deliberately focused on removing known waste, improving measurement quality, and making the transition diagnostics contract permanent. The larger family-local rewrites, especially `metaball_grid` mesh/instancing work and star-label `BitmapText` migration, are still ahead.
