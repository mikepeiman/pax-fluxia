# Territory Overnight Integration Progress

Timestamp: 2026-06-27T16:25:06-04:00
Branch: `codex/territory-overnight-integration`
Worktree: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia`

## Merge Reconciliation

Merged into the integration branch:

- `codex/preset-rows-frontier-recipes`
- `master`
- `codex/territory-geometry-authority`
- `codex/grid-gradient-worker-provenance`
- `codex/pv-frontline-transition-diagnostics`
- `codex/geometry-invariant-oracle`
- `codex/grid-gradient-worker-parity-guard`
- `codex/pv-frontline-transition-correctness`
- `codex/topology-stable-identity`
- `codex/pv-frontline-angular-chain-walk`
- `codex/grid-gradient-cold-load-performance-worker-f`

Conflict handling:

- Kept the stricter existing frontier topology oracle checks while merging `codex/geometry-invariant-oracle`.
- Kept both PV frontline planner test groups while merging `codex/pv-frontline-transition-correctness`.

Safety checkpoint:

- Created `codex/territory-overnight-integration-before-branch-reconcile-20260627-1614` before merge reconciliation.
- Pushed `codex/territory-overnight-integration` after reconciliation and the first implementation slice.

## Implemented After Merge

1. Grid Gradient worker topology transport
   - Reliable topology now crosses the worker boundary with vertices, sections, loops, indexes, diagnostics, and reliability flags.
   - Unreliable/minimal worker payloads still inflate as explicitly unreliable.
   - Tests now cover both rich reliable transport and omitted topology.

2. Speed-adjusted runtime-clean transition duration
   - `readTerritoryRuntimeSettings` accepts optional `effectiveTickMs`.
   - Runtime bridge callers pass `activeGameStore.effectiveTickMs`.
   - Tick-bound transitions now use the actual game-speed-adjusted tick duration instead of always using `BASE_TICK_MS`.

3. Geometry fingerprint coverage
   - `buildTerritoryGeometryFingerprint` now includes star position/radius, lane constraint/path inputs, world bounds, star-core guard radius, frontier resolution, boundary padding, and boundary epsilon.
   - Both PVV2 and 0319 pass lane data into the fingerprint.
   - Tests verify fingerprint changes for star spatial movement, lane constraint changes, world size changes, and previously omitted tunables.

4. Grid Gradient performance detail
   - High-level `territory.gridGradient.update` perf detail now includes worker wait, shader texture upload, uniform update, texture upload flag, and texture byte count.

5. Exact transition identity for same-star recaptures
   - Timestamp: 2026-06-27T16:33:40-04:00
   - Active territory FX transitions are now keyed by exact conquest identity: tick, conquered star, previous owner, and new owner.
   - Render-family terminal-frame retirement now marks exact transition keys, so a finished capture of a star no longer retires a newer recapture of that same star.
   - Legacy star-id retirement calls still work for older consumers, but the main render-family path uses exact transition keys.

6. Stronger frontier topology consistency oracle
   - Timestamp: 2026-06-27T16:38:48-04:00
   - The topology oracle now verifies loop coverage for every section owner: owner-world sections must appear in exactly one loop for the owner, and owner-owner sections must appear in exactly one loop for each owner.
   - Loops now reject `world` as a territory owner, near-zero reconstructed area, and stale/non-finite signed-area data that disagrees with the section chain.
   - Tests now cover stale signed area, duplicate section coverage, and a missing owner-side loop on a shared frontier.

7. Bounded Grid Gradient owner-grid cache
   - Timestamp: 2026-06-27T16:44:20-04:00
   - Replaced unbounded Grid Gradient owner-grid `Map` instances with a small LRU cache for both main-thread fallback planning and the plan worker.
   - Cache diagnostics now report entries, max entries, byte estimate, and evictions through debug snapshots, the stats store, and `territory.gridGradient.update` perf details.
   - Worker plan responses now include worker-side owner-grid cache stats so warm worker rebuilds are measurable.

8. Power-core candidate geometry audit mode
   - Timestamp: 2026-06-27T16:57:55-04:00
   - Added `power_core_candidate` as a real geometry mode id, registry entry, catalog descriptor, and settings-bridge value. The default remains `resolved_power_voronoi`.
   - Candidate mode still emits the maintained 0319 compiler snapshot; it does not replace the live authority.
   - When selected, it runs a pure `powerCore` shared-edge audit over 0319 cell geometry and attaches diagnostics for cell count, loop count, shared/world edges, owner area agreement, duplicate source site ids, and a deterministic topology fingerprint.
   - Added a 0319-style split-cell fixture test proving power-core owner loops match 0319 cell areas and that the candidate topology fingerprint is stable when cell input order changes.

9. Generated 0319 fixture coverage for power-core candidate
   - Timestamp: 2026-06-27T17:00:12-04:00
   - Added generated 0319 two-owner geometry coverage with no virtual sites.
   - Added generated corridor-virtual coverage where 0319 emits duplicate source site ids; the candidate audit normalizes those ids and still verifies owner-area agreement.

10. Stronger physical-frontier topology oracle
    - Timestamp: 2026-06-27T17:06:51-04:00
    - The topology oracle now rejects duplicate physical sections even when their section ids differ.
    - The oracle now detects reconstructed territory loops that self-intersect while still appearing closed and having finite area.
    - Added tests for both failure classes using deliberately invalid topology fixtures.

## Validation So Far

Passed before the first pushed implementation checkpoint:

- `bun x vitest run src/lib/territory`
- `bun run check`
- `bun run build`
- `bun run agentic:graphify:build` from repo root

Passed after the second implementation slice:

- `bun x vitest run src/lib/territory/families/gridGradient src/lib/territory/integration/TerritorySettingsBridge.test.ts`
- `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts src/lib/territory/runtime/TerritoryWorker.test.ts`
- `bun x vitest run src/lib/territory` (51 files, 324 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run build`
- `bun run agentic:graphify:build` from repo root

Passed during exact transition identity slice:

- `bun x vitest run src/lib/fx/handlers/territoryTransitionHandler.test.ts src/lib/territory/transitions/renderFamilyTransitionLifecycle.test.ts` (2 files, 14 tests)
- `bun x vitest run src/lib/territory src/lib/fx/handlers/territoryTransitionHandler.test.ts` (52 files, 328 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run agentic:graphify:build` from repo root
- `bun run build`

Passed during topology consistency slice:

- `bun x vitest run src/lib/territory/geometry/frontierTopologyOracle.test.ts src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts` (3 files, 13 tests)
- `bun x vitest run src/lib/territory` (51 files, 328 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run agentic:graphify:build` from repo root
- `bun run build`

Passed during Grid Gradient cache bounding slice:

- `bun x vitest run src/lib/territory/families/gridGradient` (9 files, 37 tests)
- `bun x vitest run src/lib/territory` (51 files, 329 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run agentic:graphify:build` from repo root
- `bun run build`

Passed during power-core candidate audit slice:

- `bun x vitest run src/lib/territory/geometry/powerCoreCandidateAudit.test.ts src/lib/territory/layers/geometry/registry.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts` (3 files, 13 tests)
- `bun x vitest run src/lib/territory/geometry src/lib/territory/layers/geometry src/lib/territory/integration/TerritorySettingsBridge.test.ts` (11 files, 68 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun x vitest run src/lib/territory` (53 files, 333 tests)
- `bun run build`
- `bun run agentic:graphify:build` from repo root

Passed during generated power-core fixture slice:

- `bun x vitest run src/lib/territory/geometry/powerCoreCandidateAudit.test.ts` (1 file, 4 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run agentic:graphify:build` from repo root

Passed during physical-frontier oracle slice:

- `bun x vitest run src/lib/territory/geometry/frontierTopologyOracle.test.ts` (1 file, 10 tests)
- `bun x vitest run src/lib/territory` (53 files, 337 tests)
- `bun run check` (0 errors, 1 existing warning)
- `bun run build`
- `bun run agentic:graphify:build` from repo root

Passed during resolved-geometry snapshot oracle slice at 2026-06-27 17:14 -04:00:

- Added a resolved snapshot oracle that checks duplicate region/frontier/world-border IDs, duplicate physical chains, region self-intersections, duplicate anchors, anchor ownership/containment, and owned-star containment.
- Attached the oracle to 0319 authority snapshots as `diagnostics.resolvedGeometryOracle`, with deterministic diagnostic notes.
- `bun x vitest run src/lib/territory/geometry/resolvedGeometryOracle.test.ts` (1 file, 4 tests)
- `bun x vitest run src/lib/territory/geometry/resolvedGeometryOracle.test.ts src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts src/lib/territory/geometry/frontierTopologyOracle.test.ts` (3 files, 16 tests)
- `bun x vitest run src/lib/territory` (54 files, 341 tests)
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root

Passed during transition reliability fallback slice at 2026-06-27 17:22 -04:00:

- Gated `pv_frontline` and `unified_topology` planning on topology, identity, closure, and resolved-geometry oracle reliability.
- Added stable transition fallback reasons for unreliable PRE/POST/NEXT geometry, missing paired geometry, incompatible active plans, and geometry changes without conquest events.
- Surfaced transition fallback reason through runtime diagnostics so benchmark and playtest output can report the named fallback.
- `bun x vitest run src/lib/territory/layers/transition/TransitionLayerCoordinator.test.ts src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts` (2 files, 6 tests)
- `bun x vitest run src/lib/territory` (54 files, 343 tests)
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root

Passed during Grid Gradient oracle transport slice at 2026-06-27 17:26 -04:00:

- Preserved `resolvedGeometryOracle` diagnostics across Grid Gradient worker geometry transport.
- Blocked topology transport/inflation reliability when the source oracle reports unsafe geometry, even if the older reliability flags are true.
- `bun x vitest run src/lib/territory/families/gridGradient/gridGradientPlanWorkerTypes.test.ts` (1 file, 4 tests)
- `bun x vitest run src/lib/territory/families/gridGradient src/lib/territory` (54 files, 344 tests)
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root

Passed during benchmark diagnostics exposure slice at 2026-06-27 17:32 -04:00:

- Retained compact runtime diagnostics in `GameCanvasTerritoryBridge` after each territory update.
- Exposed transition fallback reason, diagnostic messages, and compact PV diagnostic identity through `getBenchmarkTerritorySchedulerSnapshot()`.
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root

Passed during benchmark transition fallback reporting slice at 2026-06-27 17:37 -04:00:

- Added `transitionReliability` to browser benchmark scenario scheduler summaries, fed by runtime bridge fallback diagnostics.
- Added top-level benchmark analysis counts for transition fallback scenarios and fallback reasons.
- Updated the text summary to print transition fallback status in plain terms and to avoid report-facing "ack" wording.
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun build tools/debug/benchmark-browser-gameplay.ts tools/debug/summarize-browser-gameplay-benchmark.ts --target bun --outdir .agent-harness/tmp-bun-build-check`
- `bun tools/debug/summarize-browser-gameplay-benchmark.ts` redirected to a temporary output file inside `.agent-harness/` (279 summary lines)
- `bun run build` from `pax-fluxia/`
- `git diff --check`

Passed during render-family geometry key cache slice at 2026-06-27 17:48 -04:00:

- Added a tested `RenderFamilyGeometryCacheKeyBuilder` that reuses the previous geometry key on stable star/lane arrays and unchanged geometry settings.
- Wired `GameCanvas` render-family geometry cache checks through the builder while preserving the existing full key contents on misses.
- Exposed geometry key cache hit/miss stats through benchmark scheduler snapshots and text summaries.
- `bun x vitest run src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts` (1 file, 4 tests)
- `bun x vitest run src/lib/territory/families` (24 files, 175 tests)
- `bun x vitest run src/lib/territory` (55 files, 348 tests)
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `bun build tools/debug/benchmark-browser-gameplay.ts tools/debug/summarize-browser-gameplay-benchmark.ts --target bun --outdir .agent-harness/tmp-bun-build-check-cache`
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root
- `git diff --check`

Passed during narrow browser benchmark verification slice at 2026-06-27 17:53 -04:00:

- Improved benchmark `Runtime.evaluate` failures to include browser exception descriptions and top stack frames.
- Ran `PAX_BENCH_TERRITORY_MODE=grid_gradient PAX_BENCH_ONLY=grid_gradientGameplay PAX_BENCH_CAPTURE_TRACE=0 PAX_BENCH_CAPTURE_CPU=0 bun tools/debug/benchmark-browser-gameplay.ts`.
- Summarized the fresh artifact with `bun tools/debug/summarize-browser-gameplay-benchmark.ts`.
- Observed `transitionFallbacks scenarios=0 reasons=none`.
- Observed Grid Gradient geometry key cache `hits=447 misses=6 lastStars=172 lastLanes=428`.
- Observed Grid Gradient gameplay frames `count=68 avg=39.215ms p95=50.1ms max=100.1ms`; this confirms the cache instrumentation works and that frame pacing still needs follow-up performance work.

Passed during async conquest presentation queue slice at 2026-06-27 18:01 -04:00:

- Kept light territory presentation updates eligible for immediate smoothness-first flushing.
- Kept conquest requests and previously-heavy territory updates on the asynchronous presentation queue instead of forcing them into the current render-frame call stack.
- Before this change, the narrow Grid Gradient gameplay benchmark showed `max=100.1ms` with a visible heavy territory rebuild in the sampled path.
- After this change, the same narrow benchmark showed `count=69 avg=38.162ms p95=50ms max=50.1ms`, `transitionFallbacks scenarios=0 reasons=none`, `territory last=0.5ms`, and `territoryAsync scheduleMode=scheduler-background`.
- Observed Grid Gradient geometry key cache `hits=442 misses=5 lastStars=172 lastLanes=428`.
- `bun run check` from `pax-fluxia/` (0 errors, 1 existing warning)
- `PAX_BENCH_TERRITORY_MODE=grid_gradient PAX_BENCH_ONLY=grid_gradientGameplay PAX_BENCH_CAPTURE_TRACE=0 PAX_BENCH_CAPTURE_CPU=0 bun tools/debug/benchmark-browser-gameplay.ts`
- `bun tools/debug/summarize-browser-gameplay-benchmark.ts` against the fresh benchmark artifact
- `bun x vitest run src/lib/territory` (55 files, 348 tests)
- `bun run build` from `pax-fluxia/`
- `bun run agentic:graphify:build` from repo root
- `git diff --check`

Known recurring non-blocking warning:

- `GameThemeManager.svelte`: unused CSS selector `.game-theme-manager--menu .theme-chip-name`

Known recurring build warnings:

- Unused external `Room` import in `multiplayerStore.svelte.ts`.
- `gameStore.svelte.ts` is both dynamically and statically imported, so dynamic import will not split it.
- Existing large chunk warnings after minification.

## Remaining High-Value Work

Next implementation targets:

- Continue topology-to-region consistency checks beyond internal topology structure: owner/star containment, duplicate physical frontier detection, and targeted self-intersection checks.
- Exercise `power_core_candidate` against larger generated live-map fixtures and decide which failures are power-core defects versus unsupported 0319 cell-input edge cases.
- Build a final integration report with selectable/default/blocked status and validation evidence before any default promotion.
