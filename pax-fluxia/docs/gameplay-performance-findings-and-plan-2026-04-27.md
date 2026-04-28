# Gameplay Performance Findings And Plan - 2026-04-27

## Purpose
This document is the permanent repo artifact for the 2026-04-27 gameplay performance push. It records the source material that informed the plan, the repo-grounded baseline, the implementation changes completed in this pass, the latest benchmark and soak artifacts, and the remaining execution order for the next agent pass.

## Source Set
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_plan_with_full_pipeline_diagnostics_v2.md`
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_diagnostic_bundle_schema_v1.md`
- `C:/Users/mikep/Downloads/Chat docs/pv_transition_plan_with_diagnostics.md`
- `C:/Users/mikep/Downloads/Pax Fluxia/Docs/2026-04-27 ChatGPT-5.4 Pax Fluxia rendering perf deep-research-report v2c.md`
- `C:/Users/mikep/Downloads/Pax Fluxia/Docs/2026-04-27 Perplexity research Pax Fluxia rendering perf deep-research-report (v3).md`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/MULTI_LANE_WORKTREE_GUIDE.md`
- `pax-fluxia/docs/rendering-pipeline-audit-2026-04-27.md`

## Baseline
The hard baseline that started this pass came from the 2026-04-25 gameplay benchmark artifact for `metaballGameplay` on the 172-star / 428-connection benchmark map.

- Average frame: `23.51ms`
- P95 frame: `33.4ms`
- Long tasks: 5 totaling `499ms`
- Max long task: `227ms`
- Tick simulation: `2.5ms`

Top measured render costs in that baseline artifact:

- `game.renderFrame.territory.metaball_grid`: `12.609ms avg`
- `game.renderFrame.geometry.metaball_grid`: `7.036ms avg`
- `game.renderFrame.stars`: `3.284ms avg`
- `game.renderFrame.connections`: `1.104ms avg`

Conclusion: gameplay performance was render and geometry bound first. Simulation was not the first rewrite target.

## Findings
### 1. `vs_pvv3` was paying for FG2 too early
`GameCanvas.svelte` was running `runFG2DataPipeline(...)` before the renderer's own invalidation gate. That guaranteed FG2 cost even when the frame was semantically unchanged.

### 2. `pixel` was doing full texture churn
`PixelTerritoryRenderer.ts` was creating a fresh canvas, fresh `ImageData`, and fresh Pixi texture on each accepted worker result, then destroying the previous texture.

### 3. `metaball_grid` was the dominant family-local main-thread problem
The baseline and the rendering audit agreed: worker planning alone was not enough while the visible draw path stayed immediate-mode, allocation-heavy, and smoothing-heavy on the main thread.

### 4. Secondary scene-layer costs were not broken out well enough
Connections and star labels were visible in the benchmark, but the instrumentation was too coarse to clearly separate lane redraw, star-visual work, star-label work, overlay churn, and ship-pressure behavior.

### 5. Transition diagnostics needed a fixed schema contract
The export path had useful data, but not the fixed `ownership -> geometry -> transition -> render` step shape, ordered step IDs, explicit checks, failure gates, and final compare signal described by the PV docs.

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
  - `game.renderFrame.connections.redraw`
  - `game.renderFrame.stars.labels`
  - `game.renderFrame.stars.visuals`
  - `game.renderFrame.interactionOverlay`
  - `game.renderFrame.ships.*`
- Increased retained perf-event history so long soaks preserve enough attribution context for later analysis.
- Added frame-spike attribution reporting with measured-work totals, unattributed-gap totals, and fully-unattributed spike counts.
- Added ship-diagnostic extraction and summary reporting for LOD level, budgets, per-star caps, rendered counts, and particle usage.

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
- Added idle-cadence-aware star presentation throttling so cheap idle frames no longer force unnecessary label work.
- Added an interaction-overlay render key so overlay redraws are skipped when the visible selection and order state are unchanged.

### Long-run ship-pressure work
- Added an adaptive ship LOD planner in `pax-fluxia/src/lib/renderers/shipLod.ts`.
- Added late-game ship diagnostics to the live perf surface and benchmark summaries.
- Tightened orbital and damaged-ship budgets under balanced, reduced, and critical pressure.
- Added per-star caps so dense stars cannot dominate the entire orbital budget.
- Disabled outline and ship-glow effects under reduced and critical pressure through the LOD plan.
- Extended `getOrbitSlot(...)` so the active orbital ship loop can reuse cached slot `angle`, `radius`, and normalized direction vectors instead of recomputing them per ship.
- Replaced per-ship steady-state phase trig with a fixed `SHIP_PHASE_AMPLITUDES` lookup table inside the active optimized ship renderer.
- Reduced late-game steady-state ship cost substantially in the first long soak comparison:
  - earlier soak `ships avg`: `4.536ms`
  - later soak `ships avg`: `2.254ms`

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

### Canonical short benchmark
Commands:

- `bun run debug:browser-gameplay-perf`
- `bun run debug:browser-gameplay-summary`

Artifacts:

- Benchmark artifact: `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-49-11-967Z.json`
- Latest pointer: `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`
- Screenshot directory: `.agent-harness/metrics/browser-screenshots/2026-04-28T02-46-09-308Z`

Resolved benchmark target:

- Saved map: `First Symmetry-6_April 17b`
- Saved-map metadata: `172` stars / `214` lanes
- Runtime gameplay count: `428` rendered connections

The `214` vs `428` mismatch still needs a follow-up normalization pass before connection-count-based acceptance reporting is treated as canonical. The most likely explanation is that saved-map metadata is counting undirected lanes while the runtime benchmark is counting directional lane entries, but that remains an inference until code is checked directly.

Steady-state gameplay results from the current canonical artifact:

| Mode | Avg frame | P95 frame | Max long task | Key steady-state costs |
| --- | ---: | ---: | ---: | --- |
| `metaball_grid` | `16.772ms` | `16.7ms` | `0ms` | `stars 1.355ms`, `labels 0.875ms`, `territory 1.967ms`, `geometry 0.284ms`, `connections 0.039ms`, `overlay 0.038ms` |
| `distance_field` | `16.666ms` | `16.8ms` | `125ms` | `stars 0.966ms`, `labels 0.674ms`, `territory 0.088ms`, `connections 0.026ms`, `overlay 0.031ms` |
| `vs_pvv3` | `16.666ms` | `16.8ms` | `0ms` | `stars 0.690ms`, `labels 0.507ms`, `connections 0.037ms`, `overlay 0.013ms` |
| `pixel` | `16.666ms` | `16.7ms` | `117ms` | `stars 0.944ms`, `labels 0.664ms`, `territory 0.088ms`, `connections 0.028ms`, `overlay 0.021ms` |

Important notes from the same artifact:

- `metaball_grid` now satisfies the family-local acceptance gate for update frames:
  - `territory 1.967ms + geometry 0.284ms = 2.251ms`
- `metaball_grid` misses the shipping average target only by a narrow margin, and the miss is concentrated in a single heavy update frame:
  - peak spike: `33.4ms`
  - dominant measured work in that spike:
    - `game.renderFrame.territory.present.metaball_grid`: `21.3ms`
    - `game.renderFrame.territory.metaball_grid`: `21.3ms`
    - `game.renderFrame.geometry.metaball_grid`: `9.1ms`
- The interaction-overlay cache landed cleanly. Relative to the earlier `2026-04-28T02-14-26-015Z` artifact, overlay cost dropped from roughly `0.081ms - 0.121ms` down to `0.013ms - 0.038ms` across the four gameplay modes.
- Star presentation is now the dominant steady-state scene-layer cost in the best modes rather than territory geometry.

### 20-minute late-game soak
Command:

- `$env:PAX_BENCH_ONLY='distanceFieldGameplay'; $env:PAX_BENCH_CAPTURE_TRACE='0'; $env:PAX_BENCH_CAPTURE_CPU='0'; $env:PAX_BENCH_GAMEPLAY_FRAME_MS='1200000'; $env:PAX_BENCH_TIMEOUT_MS='1500000'; bun run debug:browser-gameplay-perf`

Artifacts:

- Soak artifact: `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-36-41-475Z.json`
- Earlier comparison soak: `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T01-56-47-258Z.json`
- Soak screenshot directory: `.agent-harness/metrics/browser-screenshots/2026-04-28T02-16-32-602Z`

Soak results from `distanceFieldGameplay`:

- Average frame: `17.695ms`
- P95 frame: `33.3ms`
- Max frame: `150.1ms`
- Long-task max: `143ms`
- Frames over `20ms`: `3988`
- Frames over `33ms`: `3988`
- `game.renderFrame.ships`: `2.254ms avg`, `25.2ms max`
- `game.renderFrame.ships.orbitals`: `2.006ms avg`, `24.8ms max`
- `game.renderFrame.stars`: `1.120ms avg`
- `game.renderFrame.stars.labels`: `0.722ms avg`
- `game.renderFrame.interactionOverlay`: `0.430ms avg`
- `game.renderFrame.territory.distance_field`: `0.165ms avg`

Critical-pressure ship diagnostics from that soak:

- LOD level: `critical`
- Orbit scale: `0.037`
- Damaged scale: `0.123`
- Orbit budget: `2048`
- Orbit cap per star: `12`
- Damaged budget: `192`
- Damaged cap per star: `2`
- Active orbit ships: `117535`
- Traveling ships: `7`
- Damaged ships: `1556`
- Total visual pressure: `56871`
- Rendered orbit visuals: `1380`
- Rendered damaged visuals: `78`
- Rendered travel visuals: `7`
- Used particles: `1543`

Comparison against the earlier 20-minute soak:

| Artifact | Avg frame | P95 frame | Max frame | `ships avg` |
| --- | ---: | ---: | ---: | ---: |
| `2026-04-28T01-56-47-258Z` | `18.637ms` | `33.3ms` | `299.9ms` | `4.536ms` |
| `2026-04-28T02-36-41-475Z` | `17.695ms` | `33.3ms` | `150.1ms` | `2.254ms` |

Interpretation:

- The first ship-LOD pass materially improved late-game performance.
- The main remaining late-game misses are now:
  - bursty ship update spikes
  - browser long-task / scheduler stalls
  - a smaller set of fully unattributed misses
- This soak was captured before the later interaction-overlay render-key cache landed, so one more 20-minute soak is still required on the newest code.

### Follow-up 20-minute soak on the newest code
Commands:

- `bun run build` in `pax-fluxia/`
- `$env:PAX_BENCH_ONLY='distanceFieldGameplay'; $env:PAX_BENCH_CAPTURE_TRACE='0'; $env:PAX_BENCH_CAPTURE_CPU='0'; $env:PAX_BENCH_GAMEPLAY_FRAME_MS='1200000'; $env:PAX_BENCH_TIMEOUT_MS='1500000'; bun run debug:browser-gameplay-perf`

Artifacts:

- Pre-patch latest soak: `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T12-29-39-403Z.json`
- Post-patch latest soak: `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T12-56-54-746Z.json`
- Post-patch screenshot directory: `.agent-harness/metrics/browser-screenshots/2026-04-28T12-36-45-498Z`

Post-patch results from `distanceFieldGameplay`:

- Average frame: `17.127ms`
- P95 frame: `16.8ms`
- Max frame: `83.4ms`
- Long-task max: `0ms`
- Frames over `20ms`: `1862`
- Frames over `33ms`: `1862`
- `game.renderFrame.ships`: `2.316ms avg`, `29.3ms max`
- `game.renderFrame.ships.orbitals`: `2.063ms avg`, `26.7ms max`
- `game.renderFrame.shipParticleUpdate`: `0.348ms avg`, `10.3ms max`
- `game.renderFrame.stars`: `0.968ms avg`
- `game.renderFrame.stars.labels`: `0.630ms avg`
- `game.renderFrame.interactionOverlay`: `0.025ms avg`
- `game.renderFrame.territory.distance_field`: `0.156ms avg`

Comparison against the immediately preceding fresh soak:

| Artifact | Avg frame | P95 frame | Max frame | `over33MsCount` | `ships avg` | `stars avg` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `2026-04-28T12-29-39-403Z` | `17.516ms` | `16.8ms` | `66.8ms` | `3388` | `2.330ms` | `1.098ms` |
| `2026-04-28T12-56-54-746Z` | `17.127ms` | `16.8ms` | `83.4ms` | `1862` | `2.316ms` | `0.968ms` |

Interpretation:

- The ship-path cache pass produced another meaningful late-game gain without regressing measured steady-state render costs.
- The soak still misses the `avgFrameMs < 16.7` target, but it no longer fails on `p95`, long tasks, or long animation frames.
- The remaining worst misses are still primarily fully unattributed browser stalls:
  - previous average unattributed gap on spikes: `57.78ms`
  - latest average unattributed gap on spikes: `65.01ms`
  - previous fully unattributed spike count: `9`
  - latest fully unattributed spike count: `10`
- That means the next lane should either improve attribution around those browser stalls or pivot to the next cleanly measured steady-state scene costs, with star presentation still the clearest measured target.

## Status Against Acceptance Targets
- `metaball_grid`
  - Passes the family-local `territory + geometry < 11ms` target
  - Narrowly misses the shipping average target because of a single heavy update-frame burst
  - Meets the `p95FrameMs < 20` target in the latest short benchmark
- `distance_field`
  - Meets the short-suite average and p95 targets
  - Still fails long-run average, p95, and long-task targets in the 20-minute soak
- `vs_pvv3`
  - Meets the short-suite average and p95 targets
  - Still needs a longer soak before it can be considered a shipping candidate
- `pixel`
  - Meets the short-suite average and p95 targets
  - Still needs a longer soak before it can be considered a shipping candidate

Net result: the short canonical benchmark is now close to shipping in three modes and only barely above target in `metaball_grid`, but the late-game soak still fails. The next work should stay focused on durable long-run ship and browser-stall behavior rather than reopening the territory architecture.

## Remaining Execution Order
### 1. Rerun the 20-minute soak on the newest code
- The overlay render-key cache landed after the last soak artifact.
- A fresh 20-minute `distanceFieldGameplay` soak is still required to measure whether overlay churn dropped meaningfully in the late-game case.

### 2. Take the next ship-side win
The next likely ship-side follow-up identified during analysis is:

- hoist any remaining attack-surge timing envelope work fully to the per-star level if the active path still repeats it per ship
- decide whether star-glow behavior should participate in the pressure LOD path and instrument it explicitly if so
- only continue ship work if a trace-enabled targeted capture can attribute the remaining misses to measured ship work instead of browser stalls

### 3. Validate a real conquest diagnostic bundle
- Export at least one real conquest package.
- Inspect `debug/diagnostic.json` end to end.
- Confirm the `O01` through `R04` sequence is correct and that the final compare is meaningful on live output, not only structurally present.

### 4. Keep the next family-local work narrow
- For `metaball_grid`, only chase the remaining update burst if that mode is still a serious shipping candidate after the soak pass.
- The next concrete `metaball_grid` ideas remain:
  - remove string-heavy cell bookkeeping
  - cache region lookup structures across identical geometry
  - move smoothing and blended-edge extraction out of the paint loop
  - replace per-cell `PIXI.Graphics` painting with a batched mesh or instanced path

### 5. Keep star presentation on deck
- Star labels are now cleanly measured.
- If long-run ship cost comes down, the next obvious steady-state lane is still label strategy:
  - `BitmapText`
  - density LOD
  - reduced redraw frequency
- The latest 20-minute soak keeps this candidate live:
  - `game.renderFrame.stars`: `0.968ms avg`
  - `game.renderFrame.stars.labels`: `0.630ms avg`

## Validation Plan
- `bun run build`
- `bun run debug:browser-gameplay-perf`
- `bun run debug:browser-gameplay-summary`
- Export at least one conquest diagnostic package and inspect `debug/diagnostic.json`
- Visual smoke:
  - single-player start
  - one conquest transition
  - one heavy-map steady-state capture
- Soak:
  - rerun 20-30 minutes in the chosen shipping candidate mode on the newest code

## Notes
This pass deliberately focused on removing known waste, improving measurement quality, and making the transition diagnostics contract permanent. The remaining work is no longer "find the benchmark"; it is now a bounded late-game stabilization pass with concrete artifacts, clear next files, and measurable acceptance gates.
