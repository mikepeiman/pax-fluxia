---
date created: 2026-06-23
last updated: 2026-06-23
last updated by: Codex geometry-rendering-transition-performance audit
starting doc: .agent/docs/sessions/2026-06-17/2026-06-17_TERRITORY_MODE_AUDIT_AND_UNIFIED_ARCHITECTURE.md
---

# Geometry / Rendering / Transition / Performance Audit - Gap Fill

## Scope

This audit started from the 2026-06-17 territory mode audit and checked newer or adjacent
geometry/rendering/transition/performance reports against the current source tree.

Docs used:

- `.agent/docs/sessions/2026-06-17/2026-06-17_TERRITORY_MODE_AUDIT_AND_UNIFIED_ARCHITECTURE.md`
- `.agent/docs/sessions/2026-06-17/2026-06-17_TERRITORY_ARCHITECTURE_CONSOLIDATED.md`
- `.agent/docs/sessions/2026-06-17/2026-06-17_TERRITORY_SOLUTION_CANDIDATES_AND_RECOMMENDATION.md`
- `.agent/docs/sessions/2026-06-17/2026-06-17_GEOMETRY_OPERATIONAL_SPEC.md`
- `.agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_PIPELINE_MODEL_AND_FIX_PLAN.md`
- `.agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_ENGINE_DECISION_hybrid-converge.md`
- `.agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_AUDIT.md`
- `.agent/docs/sessions/2026-06-13/2026-06-13_RENDERING_CONSOLIDATION_9f22_dcc7_AUDIT.md`
- `.agent/docs/sessions/2026-06-21/2026-06-21_GEOMETRY_ENGINE_BUILD_PLAN.md`
- `.agent/docs/sessions/2026-06-23/2026-06-23_grid-gradient-perf-diagnosis.md`
- `.agent/docs/project/post-mortems/2026-06-23_grid-gradient-worker-defer-blank.md`

Code-discovery method:

- Ran `graphify query "geometry rendering transition performance territory mode architecture gaps GeometryEngine GridGradient renderer transitions" --budget 2500`.
- Then verified exact behavior with `rg`, targeted source reads, and focused Vitest runs.

## Executive Findings

### P0 - The core fill-chain junction defect is still live

The 2026-06-16 decision doc says the angular-order junction walk landed, but the current
`executeChainWalk` implementation still takes the first unused same-owner candidate at a
junction. The failing regression is still present.

Evidence:

- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts:99` defines `executeChainWalk`.
- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts:191` iterates `for (const cand of candidates)` and takes the first eligible segment.
- `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts:155` builds render-family topology through `executeChainWalk`, so topology reliability inherits this defect.
- Fresh test run: `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts` fails 1 of 5 tests. The failing test is `walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur`; assertion at `powerVoronoiTerritoryGeometryGenerator.test.ts:121` expected one fill and got `[]`.

Impact:

- Any transition plan that trusts current closed fills or topology can be poisoned by missing
  owner shells before transition sampling even starts.
- The first next step should be fixing or replacing this assembler before new rendering or
  transition strategies are judged.

### P1 - The selectable geometry-engine plan is not wired

The 2026-06-21 plan calls for an alternate/basic Voronoi candidate source and an eventual
candidate switch. Current code still has a single live perimeter-field source.

Evidence:

- `pax-fluxia/src/lib/territory/geometry/geometrySource.ts:1` sets the only authority source to `power_voronoi_0319`.
- `pax-fluxia/src/lib/territory/geometry/geometrySource.ts:3` defines `PerimeterFieldGeometrySourceId` as only that value.
- `pax-fluxia/src/lib/territory/geometry/geometrySource.ts:10` normalizes every input source back to `power_voronoi_0319`.
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte:2033` builds Grid Gradient config with `PERIMETER_FIELD_GEOMETRY_SOURCE: "power_voronoi_0319"`.
- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:154` normalizes source and `:158` calls `buildPowerVoronoi0319RenderFamilyGeometry`.
- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:172` still has a vector compiler fallback, but it is not a selectable source path.

Impact:

- There is no clean A/B harness yet for a simpler candidate geometry engine.
- A candidate can be built, but it must first have a real source id, fingerprint participation,
  diagnostics, and tests before it can settle the 0319-vs-new-engine question.

### P1 - The topology contract is richer than the current data

The current contracts have the right shape for provenance-carrying geometry, but the populated
data is not yet full computational provenance.

Evidence:

- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts:222` defines `ResolvedGeometrySnapshot`.
- `GeometryContracts.ts:243`, `:247`, and `:252` carry `frontierPolylines`, `sharedFrontierMap`, and `frontierTopology`.
- `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts:68` defines `FrontierSection`, including `leftOwnerId` and `rightOwnerId` at `:78` and `:80`.
- `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts:107` currently sets `primaryStarId` to `ownerId`, not to a true star/influence source.
- `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts:73` has a `stubInfluence`, with `primaryStarId: ''` at `:76`, in another topology builder path.
- `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts:288` only marks topology reliable after no open loops and no section-id collisions.

Impact:

- The June 17 direction is correct: provenance belongs in geometry.
- But current `FrontierSection` data should be treated as owner-pair topology plus placeholder
  influence, not as complete radical-axis/star-source provenance.

### P1 - Grid Gradient still discards topology before planning

The June 17 experiment proposed topology-seeded Grid Gradient flip times. That has not landed.
Grid Gradient still rasterizes previous/next `territoryRegions`, then derives changed-cell wave
timing from grid adjacency and distance ranks.

Evidence:

- `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientPlanWorkerTypes.ts:6` defines worker geometry as only `version` and `territoryRegions`.
- `gridGradientPlanWorkerTypes.ts:36` inflates worker geometry and explicitly sets `frontierPolylines: []` at `:47`, `sharedFrontierMap: new Map()` at `:49`, and an empty `frontierTopology` at `:50`.
- `pax-fluxia/src/lib/territory/families/gridGradient/plan.ts:187` calls shared `planGridWave`.
- `pax-fluxia/src/lib/territory/families/gridGradient/typedClassification.ts:513` classifies from `geometry.territoryRegions`.
- `typedClassification.ts:527` onward uses nearest-star fallback for uncovered cells.
- `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts:529` handles `pre_to_post_frontier`.
- `planGridWave.ts:461` to `:474` assigns flip time from pre/post BFS distance ranks, not from `FrontierSection`.
- `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridTypes.ts:12` documents that the visual grid resolves PREV/NEXT ownership by point-in-polygon against `territoryRegions`.

Impact:

- Grid Gradient can pass current tests while still failing the June 17 provenance objective.
- A topology-seeded experiment needs to pass frontier sections or a compact topology-derived
  cell-seed table into the worker and must A/B against current `pre_to_post_frontier`.

### P1 - Transition planners still rely on coordinate anchors and narrow split modes

The active-front and PV-frontline paths use useful topology objects, but matching is still based
on stable vertex ids plus coordinate proximity. Branch walking and split handling remain narrow.

Evidence:

- `pax-fluxia/src/lib/territory/pvFrontline/planner.ts:49` finds stable anchors.
- `pvFrontline/planner.ts:55` accepts anchors when points are within epsilon.
- `pvFrontline/planner.ts:101` builds chains between anchors; `:115` gathers candidates and `:120` takes `candidates[0]`.
- `pvFrontline/planner.ts:174` to `:177` supports only `1to1`, `1to2`, and `2to1`; other counts return null.
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts:193` finds stable anchors with the same proximity model.
- `ActiveFrontTransition.ts:378` to `:381` supports only `none`, `1to2`, and `2to1`.
- `ActiveFrontTransition.ts:555` falls back to the next chain when the previous chain is empty.
- `pax-fluxia/src/lib/territory/layers/transition/TopologyFrameSampler.ts:151` defines `sampleTopologyFrame`, but `rg` finds no imports or calls outside the file itself.
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts:84` gates `unified_topology`, `:86` gates `pv_frontline`, and `:202` samples active-front transition. It does not call `sampleTopologyFrame`.
- Legacy `pax-fluxia/src/lib/territory/layers/transition/modes/ActiveFrontFillMode.ts` still has direct console logs at `:479`, `:598`, and `:724`, plus centroid/collapsed-front fallback behavior around `:435` and `:525`.

Impact:

- The system has the right destination concept: fills should be derived from interpolated borders.
- The production coordinator is not yet using the dedicated sampler, and the active planners still
  repair or skip cases rather than making topology failure explicit.

### P1 - Distance Field should not be treated as the proven transition track

The starting doc already corrected an earlier claim that DistanceField had a strong transition
track record. Current source supports that correction: there is legacy morphing code, but the
new presentation-layer style is a draw-command wrapper, and the legacy adapter is scaffold only.

Evidence:

- `pax-fluxia/src/lib/territory/layers/presentation/modes/DistanceFieldStyle.ts:15` registers `distance_field`.
- `DistanceFieldStyle.ts:21` builds ordinary fill draw commands from the transition input.
- `pax-fluxia/src/lib/territory/adapters/legacy/DistanceFieldLegacyAdapter.ts:7` says the bridge to the renderer path will be added later.
- `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts:364`, `:630`, and `:1046` still contain `uMorphFactor` shader paths.
- `DistanceFieldTerritoryRenderer.ts:4649` through `:4733` compute legacy transition morph state.
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte:5725` still has a direct `distance_field` render mode branch.

Impact:

- DistanceField remains useful source material, but it is not a current proof that geometry-driven
  fill transitions are solved.

### P2 - Performance state is better, but cold path discipline still matters

The newer June 23 performance docs supersede the older allocation diagnosis. The first-load
Grid Gradient freeze was traced to WebGL shader program link, not the grid plan build. A shader
loop change was shipped, and the failed cold worker-defer was reverted.

Evidence:

- `.agent/docs/sessions/2026-06-23/2026-06-23_grid-gradient-perf-diagnosis.md` records the confirmed root cause as first-time WebGL shader program link.
- `.agent/docs/project/post-mortems/2026-06-23_grid-gradient-worker-defer-blank.md` records that cold worker-defer blanked Grid Gradient and was reverted.
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/gridGradientShaderFieldShaders.ts:51` defines `kNeighborOffsets`.
- `gridGradientShaderFieldShaders.ts:364` to `:371` derives `neighborCount` from `uNeighborMode` and loops, so `shadeCell()` is compiled once rather than unrolled 9 times.
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/GridGradientShaderFieldRenderer.ts:22` caches the compiled program.
- `GridGradientShaderFieldRenderer.ts:253` uses a texture signature to skip redundant texture uploads.
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte:6752` to `:6757` now surfaces `matMs`, `distMs`, `texUpMs`, and related cold-stage timings.
- `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts:559` documents that cold initial build with `cachedPlan === null` falls through to synchronous build.
- `gridGradientPlan.worker.ts:40` posts worker responses without a transfer list. This is not a measured bottleneck, but it is the next obvious thing to measure before moving more data off-thread.
- `pax-fluxia/src/lib/perf/perfProbe.ts:205` returns `fn()` directly when capture is disabled; `:129` and `:163` show detail sanitization only occurs after capture is enabled.
- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts:248` still builds a `Set` for trace detail before the `geometryTrace.step` call. This is small, but it is an example of trace-argument work that should be guarded if hot.

Impact:

- The correct perf posture is trace-first, then optimize the measured cold or per-frame stage.
- Avoid reintroducing cold async paths without a visible fallback; slow is preferable to blank.

## What The Earlier Docs Got Right

- Provenance belongs in the geometry layer, not inside a particular transition or render family.
- Render families should consume shared geometry artifacts instead of each inventing separate
  frontier truth.
- Static correctness comes before transition polish. A broken assembler makes any transition
  result ambiguous.
- Grid modes are the right first visual target for a topology-seeded experiment because their
  artifacts are explicit and testable.

## What Needs Correction

- Treat the 2026-06-16 "angular-order junction walk landed" claim as stale. Current tests prove
  the defect is still live.
- Treat the 2026-06-17 DistanceField "strong track record" language as superseded by the same-day
  correction and by current source inspection.
- Treat the 2026-06-21 geometry-engine candidate plan as not yet implemented. The current source
  still has a single normalized authority source.
- Treat "Grid Gradient plan allocation caused the 3-6s freeze" as superseded by the June 23
  shader-link diagnosis.

## Recommended Work Order

1. Fix or replace `executeChainWalk` before judging topology-driven transitions.
   - Make the failing clockwise-adjacent junction regression pass.
   - Add a topology-level regression that asserts closed loops, section uniqueness, and no
     missing fills for the same junction fixture.

2. Promote topology reliability from diagnostic note to gate.
   - If topology is unreliable, transitions should show a named defect/fallback state instead of
     silently repairing with unrelated geometry.
   - Add assertions that `FrontierSection` ids represent unique physical sections, including
     reverse-direction duplicates.

3. Wire a real candidate geometry source only after it has tests.
   - Add a second `PerimeterFieldGeometrySourceId`.
   - Include it in fingerprints, diagnostics, cache keys, and capture output.
   - Keep `power_voronoi_0319` as the default until fixtures prove the candidate is better.

4. Build the Grid Gradient provenance prototype as a narrow A/B.
   - Pass either `frontierTopology` or a compact topology-derived seed table into the worker.
   - Add a `power_voronoi_frontier` flip scheduler beside `pre_to_post_frontier`.
   - Tag changed cells with `{ ownerA, ownerB, sectionId? }` and compare against current raster
     BFS timing at progress `0`, `0.5`, and `1`.

5. Decide the transition sampler direction.
   - Either wire `TopologyFrameSampler.sampleTopologyFrame` through `TransitionLayerCoordinator`
     for `unified_topology`, or delete/deprecate it and make the chosen sampler explicit.
   - Replace coordinate-only anchor matching with stable region/section identity where possible.
   - Replace empty-chain fallbacks with named diagnostics unless the fallback has a documented
     visual contract.

6. Continue Grid Gradient perf work only from measured traces.
   - Confirm the shader-link fix with a cold Grid Gradient trace.
   - Measure worker structured-clone/transfer cost before changing worker payloads.
   - Only then consider object-allocation reduction in `materializeClassification`; that is a
     bounded 10s-of-ms rebuild cost, not the previously reported multi-second freeze.

## Verification

Fresh checks run from `pax-fluxia/`:

- `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts`
  - Result: 1 failed, 4 passed.
  - Failure: `walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur`.
- `bun x vitest run src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/typedClassification.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts`
  - Result: 4 files passed, 11 tests passed.
- `bun x vitest run src/lib/territory/families/metaballGrid/phaseEdgesEnabledGate.test.ts src/lib/territory/families/metaballGrid/phaseEdgesWorkerPlanGuard.test.ts src/lib/territory/families/metaballGrid/planGridWave.test.ts`
  - Result: 3 files passed, 18 tests passed.
- `bun x vitest run src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts src/lib/territory/families/perimeterField/perimeterFieldDiagnostics.test.ts src/lib/territory/pvFrontline/planner.test.ts`
  - Result: 3 files passed, 14 tests passed.

No source code was modified for this audit, so the graphify source graph does not need to be
rebuilt.
