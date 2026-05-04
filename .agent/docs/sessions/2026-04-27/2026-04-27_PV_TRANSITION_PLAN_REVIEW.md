# Purpose

Assess `pv_transition_plan_with_full_pipeline_diagnostics_v2.md` for completeness, clarity, and probability of success, and answer the key implementation question:

Should the current PV / `perimeter_field` code be reused, or is a from-scratch rebuild the better path once full diagnostics are required?

## Reviewed Inputs

- `C:/Users/mikep/Downloads/Chat docs/pv_transition_plan_with_full_pipeline_diagnostics_v2.md`
- `C:/Users/mikep/Downloads/Pax Fluxia/Docs/MULTI_LANE_WORKTREE_GUIDE.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`
- `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `pax-fluxia/src/lib/territory/families/perimeterField/*`
- `pax-fluxia/src/lib/territory/devtools/*`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/layers/transition/*`
- `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts`

## Bottom Line

The attached plan is directionally strong, but it is not implementation-ready yet.

The best path is **not**:

- extending legacy `PowerVoronoiRenderer.ts`
- restarting the entire `perimeter_field` family from zero

The best path is a **selective rewrite inside the existing `perimeter_field` shell**:

- **reuse** the current family-local geometry sampling, debug snapshot structure, live capture/replay flow, and bundle/export tooling
- **replace** the decision-time PRE/NEXT truth capture mechanism, the local PRE rebuild, and the remaining heuristic transition path
- **align** the plan to the existing `FrontierTopology` substrate instead of inventing a second frontier-identity model

In short:

- **Do not build on PVV2 legacy code.**
- **Do build on the current `perimeter_field` family and diagnostics surfaces.**
- **Do rewrite the transition truth/capture core and retire the heuristic fallback.**

## Why This Is The Right Call

### 1. Legacy PVV2 is the wrong base

`PowerVoronoiRenderer.ts` is still a monolith that mixes geometry, transition, and presentation. Its diagnostic export is explicitly synthetic:

- `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts:1741-1809`
- `exportPowerVoronoiGeometrySnapshot()` synthesizes a `CanonicalGeometrySnapshot` from renderer cache state
- the exported snapshot marks `topologyReliable: false` and `identityReliable: false`

That directly conflicts with the current `perimeter_field` mode spec requirement that PRE, NEXT, and scrub frames come from live gameplay truth, not reconstructed surrogates.

`RefactoredPVV2Renderer.ts` is only a state-isolation wrapper around the same logic, not a new architecture.

### 2. The current `perimeter_field` path already has valuable reusable infrastructure

The existing family is not empty scaffolding. It already has:

- family-local geometry sampling and V-set construction in `perimeterFieldPlanEngine.ts`
- span pairing, appearing/disappearing handling, and non-crossing arc fallback in `perimeterFieldPlanEngine.ts:839-929`
- a plan-scene path in `buildPerimeterFieldScene.ts:1127-1147`
- debug snapshot generation for static, target, and transition samples
- diagnostic canvas rendering in `perimeterFieldDiagnostics.ts`
- live capture, replay scrub, and pre-rendered bundle handoff in `GameCanvas.svelte:2170-2229`
- package/export surfaces in `TransitionBundleSerializer.ts` and `PerimeterFieldConquestPackage.ts`

Restarting all of that would lower probability of success and duplicate already-solved integration work.

### 3. The current `perimeter_field` transition truth is still wrong in one critical place

The biggest structural problem is not "no diagnostics." It is "truth capture is still too local."

Current code rebuilds PRE geometry by reverting current stars and recompiling inside the family:

- `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts:251-264`

That is better than pure heuristics, but it is still not the same as a named decision-time PRE/NEXT capture seam. It depends on current runtime tunables and family-local rebuild timing.

The codebase already has an intended upstream seam for this:

- `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts:36-44`

`RenderFamilyInput.prevGeometry` is documented as the upstream PRE snapshot, but `GameCanvas` is not actually passing it to `perimeter_field`:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte:4678-4691`

That is the first thing to fix.

## Assessment Of The Attached Plan

## What The Plan Gets Right

### 1. The overall direction is correct

The plan correctly treats this as a **full pipeline** problem:

1. ownership / conquest resolution
2. geometry construction
3. transition planning
4. frame evaluation / render

That matches the current architecture doctrine in `TERRITORY_ARCHITECTURE.md`.

### 2. The terminology discipline is strong

The locked terms are helpful, especially:

- PRE / POST
- change anchors
- `preConquestFront` / `postConquestFront`
- `TransitionPair`
- `TransientTransitionFrontline`

This is materially clearer than older renderer discussions.

### 3. The failure gates are useful

The plan's stop conditions are concrete and worth keeping:

- same-moment PRE/POST capture
- tunable snapshots present
- left/right frontier ownership consistency
- non-crossing paths
- no self-intersection
- exact landing on POST

### 4. The bundle ambition is correct

The plan is right to demand both:

- visual evidence
- text payloads with the exact tunables used

That is consistent with the user requirement that diagnostics must expose truth, not commentary.

## What The Plan Is Missing Or Under-Specifies

### 1. It does not name the actual truth-capture seam

This is the highest-risk omission.

The plan says PRE and POST must be captured at the same decision moment, but it does not name:

- which module owns the capture
- what concrete object carries it
- how it reaches the render family
- what happens if tunables or geometry change after the capture

To maximize success, the plan should add an explicit contract such as:

`PerimeterFieldTransitionTruth`

Required fields:

- `conquestKey`
- `preOwnership`
- `postOwnership`
- `preGeometry`
- `postGeometry`
- `preTunables`
- `postTunables`
- `capturedAtTick`
- `capturedAtMs`
- `conquestEvents`

And it should name the seam:

- capture upstream in `GameCanvas.svelte` or the owning runtime bridge
- pass through `RenderFamilyInput`
- forbid family-local PRE reconstruction except as a hot-reload fallback

### 2. It does not decide whether old heuristic code is deleted or tolerated

Current `buildPerimeterFieldScene.ts` still contains the older angle-matched transition path:

- `buildTransitionSamples()` at `buildPerimeterFieldScene.ts:597-706`
- family dispatch still falls back to it at `buildPerimeterFieldScene.ts:1150-1188`

If the new plan does not explicitly quarantine or delete this path, the codebase will keep two competing transition systems:

- the newer plan engine
- the older star-centered heuristic path

That would directly violate the single-pattern rule and lower reviewability.

The plan should state:

- once the new plan-engine path is validated, the heuristic path is removed or behind an explicit archaeology flag only

### 3. The plan terms are not mapped onto current code truth

The document uses:

- `FrontierPolyline`
- `FrontierChain`
- `ChangeAnchorStart / ChangeAnchorEnd`

The codebase currently has stable shared geometry identity in:

- `FrontierTopology`
- `FrontierSection`
- `RegionLoop`

If the plan does not add a translation table, implementers will likely invent parallel runtime structures.

Recommended correction:

- define `FrontierChain` as a **derived diagnostic/planning view** over ordered `FrontierSection` references
- state explicitly that `FrontierTopology` remains the structural truth
- forbid a second long-lived frontier identity namespace

### 4. Diagnostics ownership is not split by layer

The plan currently reads as if one subsystem can own the whole bundle. In practice, the stages live in different places:

- ownership capture: upstream runtime / `GameCanvas`
- geometry capture: family geometry builder or canonical compiler
- plan diagnostics: `perimeterFieldPlanEngine`
- frame capture / scrub / export: existing `GameCanvas` + devtools path

That matters because full-pipeline diagnostics cannot be implemented only inside `perimeterField/`.

### 5. The bundle strategy ignores existing export infrastructure

There is already real export packaging code:

- `TransitionBundleSerializer.ts`
- `PerimeterFieldConquestPackage.ts`
- `perimeterFieldDiagnostics.ts`
- `GameCanvas.svelte` live capture -> `transitionSnapshotRecorder.capturePreRendered(...)`

The new plan should say:

- extend the current serializer/package pipeline
- do not create a parallel exporter unless the existing package shape is proven unusable

Otherwise the repo will end up with two diagnostic bundle systems.

### 6. The plan does not handle simultaneous conquests clearly enough

Current runtime APIs can emit multiple conquest events in one tick.

The plan says:

- one conquest front produces one bundle

But it does not resolve:

- one conquest event with multiple changed spans
- multiple conquest events touching the same owner pair
- multiple local fronts in one tick sharing geometry

This needs a policy before coding begins.

### 7. The plan does not define mid-transition retune semantics

This is a real risk because tunables are part of the geometry source.

The canonical transition layer already has explicit behavior for geometry-only changes:

- `TransitionLayerCoordinator.ts:133-141`
- tunable-only geometry changes cancel the active transition and snap to new geometry

The new `perimeter_field` plan must make the same decision explicitly:

- freeze tunables for the duration of the captured transition truth, or
- cancel and rebuild the transition truth if relevant geometry tunables change

Leaving this implicit will recreate drift bugs.

### 8. The validation section is not strong enough yet

There are some useful existing tests, but the acceptance surface is still too weak for a change this invasive.

Current useful coverage exists around plan-scene endpoint equality:

- `buildPerimeterFieldScene.test.ts:918-966`

But the plan should require automated checks for:

- PRE frame byte-identity with live capture
- POST frame byte-identity with live capture
- preserved-V zero displacement
- mover non-crossing against unchanged frontiers
- DX midpoint birth/death behavior
- world-border changed fronts
- simultaneous conquest batches
- replay purity from exported bundle data

## Reuse vs Rewrite Recommendation

## Reuse As-Is Or With Small Extension

- `buildPerimeterFieldRenderFamilyGeometry()` in `buildFamilyGeometry.ts`
- `sampleVSetFromGeometry()` in `perimeterFieldPlanEngine.ts`
- mover path routing and arc fallback in `perimeterFieldPlanEngine.ts:839-929`
- the debug snapshot schema in `buildPerimeterFieldScene.ts`
- `perimeterFieldDiagnostics.ts`
- live capture / replay scrub / bundle handoff in `GameCanvas.svelte:2170-2229`
- `TransitionBundleSerializer.ts`
- `PerimeterFieldConquestPackage.ts`

## Reuse Conceptually, But Rewrite Internals

- the current plan-engine path in `perimeterFieldPlanEngine.ts`

Reason:

- its structure is worth keeping
- but the changed-front / anchor extraction can be replaced if the new chain-based algorithm proves better

This is a **rewrite of the planner core inside the current shell**, not a fresh subsystem.

## Do Not Reuse As The Base

- `PowerVoronoiRenderer.ts`
- `RefactoredPVV2Renderer.ts`
- `exportPowerVoronoiGeometrySnapshot()`
- the angle-based `buildTransitionSamples()` fallback in `buildPerimeterFieldScene.ts:597-706`

These are useful only as:

- archaeology
- visual/reference comparison
- source of old behavior hypotheses

They are not acceptable truth-bearing foundations for the new work.

## Probability-Of-Success Recommendation

## Recommended Execution Order

### Phase 0. Truth seam first

Implement the upstream capture object before touching planner math.

Deliverables:

- named PRE/NEXT truth contract
- upstream capture hook at conquest decision time
- pass `prevGeometry` and transition truth into `RenderFamilyInput`

### Phase 1. Diagnostics plumbing second

Wire the current live capture/export shell to the new truth contract before changing transition behavior.

Deliverables:

- bundle schema with ownership, geometry, plan, and frame sections
- render/debug split preserved
- replay scrub reading captured truth, not local reconstruction

### Phase 2. Planner replacement third

Replace:

- family-local PRE rebuild
- heuristic angle-matching path

Keep:

- V-set sampling
- mover types
- export/capture shell

### Phase 3. Chain / anchor refinement fourth

Implement the new `FrontierChain` / change-anchor algorithm only after the truth seam and capture surfaces are stable.

This reduces the chance of debugging algorithm issues and capture issues at the same time.

### Phase 4. Cleanup and removal last

- remove dead heuristic path
- remove unused synthetic debug branches for `perimeter_field`
- expand tests

## Recommended Lane Split

Per `MULTI_LANE_WORKTREE_GUIDE.md`, the safest split is:

- `render-family/perimeterField`
  - `pax-fluxia/src/lib/territory/families/perimeterField/`
  - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
- `diag`
  - `pax-fluxia/src/lib/territory/devtools/`
  - packaging, serializer, manifest/schema work
- `render-infra`
  - only the minimal `GameCanvas.svelte` seam injection for live truth capture and input wiring

Shared choke point:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

Any edit there should be mechanical, narrow, and explicitly called out.

## Concrete Edits I Would Make To The Attached Plan Before Execution

1. Add a new first section: `Named Truth Capture Contract`.
2. State exactly where PRE/NEXT ownership, geometry, and tunables are captured.
3. Add a translation table from plan terms to code terms:
   - `FrontierChain` -> derived view over `FrontierTopology`
   - `ConquestFront` -> family-local changed span
   - `TransitionFront` -> ordered mover/pair artifact
4. State that the heuristic path in `buildTransitionSamples()` is temporary and will be removed.
5. State that `PowerVoronoiRenderer.ts` is reference-only, not a target implementation base.
6. State how simultaneous conquests are bundled.
7. State how mid-transition tunable edits are handled.
8. Add programmatic acceptance tests, not only visual inspection.
9. Add a file ownership / lane split section.
10. Add an integration section naming the existing live capture and serializer surfaces to extend instead of replace.

## Final Recommendation

Use the current `perimeter_field` codebase as the **integration shell** and **diagnostics shell**.

Do **not** use the legacy PVV2 renderer as the implementation base.

Do **rewrite** the transition truth and planner core so that:

- PRE and POST are captured once, upstream, at conquest decision time
- the family consumes that truth instead of rebuilding PRE locally
- the heuristic angle-matching path is retired
- the new diagnostics bundle is emitted from the real live family path already wired into `GameCanvas`

That is the highest-probability route to a correct implementation with trustworthy diagnostics.

## Validation Note

I did not run a full visual smoke test of the app in this review.

I did attempt direct local unit-test execution for the current `perimeter_field` test files:

- plain `bun test` failed on module-alias / export drift
- `bunx vitest` failed in this environment before running the suite

So current test files should be treated as helpful starting coverage, not as a proven acceptance harness.

