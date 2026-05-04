# Metaball Radical Optimization Handoff - 2026-04-30

## Read First
1. `C:\Users\mikep\Documents\Obsidian Vault\2026-04-30 Perplexity prompt for radical metaball refactor.md`
2. `.agent/AGENT.md`
3. `.agent/MULTI_LANE_WORKTREE_GUIDE.md`
4. `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
5. `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`

## Scope
- Lane focus: `render-family/metaballGrid` with required audit coverage of `render-family/perimeterField` and the shared `MetaballRenderer`.
- Worktree state at intake: detached `HEAD` with no active branch name.
- Master handoff rule for this sprint: keep this file append-only by pass so another merge agent can reconstruct intent and scope quickly.

## Master Merge Primer - 2026-05-01 Refresh

### Final intended outcome
- Optimize and stabilize the shared sample-field compositor used by `metaball` and `perimeter_field`.
- Keep `metaball_grid` / `metaball_grid_phase_edges` as reference families; do not regress them back into shared full-scene sample-field rendering.
- Restore star-centered metaball cores to `perimeter_field`, with a dedicated weight control separate from perimeter-shell power.
- Clean up the territory settings IA so mode-only tuning, shared topology rules, and renderer tuning have distinct homes with no duplicate controls.

### Critical chronology pivots
- The external sprint brief named `metaball_grid` / `metaball-perimeter-field`, but the initial audit showed that `metaball_grid` already bypasses the shared metaball compositor.
- The real runtime target therefore shifted to the shared `MetaballRenderer` path still used by `perimeter_field`, and later also to `metaball` because it still routes through the same shared sample-field presenter.
- User-reported rendering regressions then drove multiple correctness passes on top of the optimization work:
  - base/overlay coherency
  - singleton-family lifecycle repair
  - forced synchronous commit for user-facing metaball family calls
- UI work also required a later cleanup pass because the first `Territory Mode Tuning` implementation duplicated controls across the settings IA and duplicated some again within the new section itself.

### Final merge-intent clusters
- Cluster A - shared renderer / bounded-overlay groundwork:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/renderers/metaballGrid.worker.ts`
  - `pax-fluxia/src/lib/renderers/metaballGridWorkerTypes.ts`
  - `pax-fluxia/src/lib/perf/pipelineTelemetry.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/metaballSceneBase.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.test.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldLocalOverlay.ts`
- Cluster B - family integrations / presentation correctness:
  - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- Cluster C - perimeter-field star-core restoration:
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/config.ts`
  - `pax-fluxia/src/lib/config/game.config.ts`
- Cluster D - settings IA cleanup / dedupe:
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryModeTuningSection.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologySection.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
  - `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
  - `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
- Cluster E - compatibility support:
  - `pax-fluxia/src/lib/components/ui/TransitionDebugPanel.svelte`
- Cluster F - merge-agent documentation:
  - `.agent/docs/plans/2026-04-30/FEATURE_AND_TASK_QUEUE_2026-04-30.md`
  - `.agent/docs/plans/2026-04-30/2026-04-30_metaball-radical-optimization-handoff.md`

### Recommended merge order
1. Merge Cluster A first. The bounded-overlay helpers, worker types, and renderer support are coupled.
2. Merge Cluster B second. `MetaballFamily.ts`, `PerimeterFieldFamily.ts`, and `GameCanvas.svelte` are the correctness layer that makes the renderer changes safe for user-facing families.
3. Merge Cluster C with Cluster B if possible. The perimeter-field star restoration depends on the updated scene/family path and should not be cherry-picked alone.
4. Merge Cluster E independently if the master lane still needs the missing diagnostics wrapper.
5. Merge Cluster D last. It has the highest merge-conflict risk because the settings IA files are large and likely touched in other worktrees.
6. Merge Cluster F alongside whichever code clusters are accepted so the rationale stays attached to the landing diff.

### Conflict hotspots
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - new top-level routing branches for `territory_mode_tuning` and `territory_topology`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
  - large role shrink: topology block removed, dead `Border Transition` UI removed, panel now renderer-focused
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
  - duplicate source editor and duplicate star slider removed
- `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
  - intentionally reduced to source-selector-only
- `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
- `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
- `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - these three should be treated as a coupled runtime set
- `pax-fluxia/src/lib/config/game.config.ts`, `settingsDefs.ts`, `settingMetadata.ts`, `settingsRegistry.ts`
  - config key + UI plumbing should land together

### Superseded intermediate states - do not reintroduce
- Temporary runtime disable of the bounded local-overlay rollout in `MetaballFamily` / `PerimeterFieldFamily`
  - this was user-request-reverted and is not the final state
- Generic `view="mode_tuning"` reuse inside `ControlsSection-Territory.svelte`
  - superseded by dedicated `TerritoryModeTuningSection.svelte`
- Duplicate `Star Metaball Power` inside `PerimeterFieldTuning.svelte`
- Duplicate source-geometry editor inside `PerimeterFieldTuning.svelte`
- Duplicate MSR / CX / DX editors inside `TerritoryGeometrySourceTuning.svelte`
- Generic `Border Transition` UI in the shared territory tuning panel
  - removed because it only affected legacy `PowerVoronoi` paths, not current render-family transitions

### Incidental / likely non-merge artifacts
- `common/resources/settings-live/current-settings.json`
  - likely live-panel drift from interactive tuning, not authored feature work
- `pax-fluxia/.codex-perimeter-check.txt`
  - local validation artifact only
- `.agent-harness/logs/session_1777565579840_7dx25j.jsonl`
  - local harness log only

### Open verification risks
- Focused test coverage passes for `buildPerimeterFieldScene`, but there is still no final in-app verification in this lane proving that the user-facing `metaball` and `perimeter_field` rendering regressions are fully gone under all conquest patterns.
- The user explicitly reported severe rendering breakage before the later lifecycle / synchronous-commit fixes landed. Another agent merging to master should re-test:
  - paused `metaball`
  - live `metaball`
  - paused `perimeter_field`
  - live `perimeter_field`
  - multi-conquest and edge-of-map cases
- `bun run check` remains repo-red from unrelated pre-existing issues; do not treat that red state as caused by this lane alone.

## Pass Log

### Pass 1 - Intake, rules, and artifact placement
- Read `.agent/AGENT.md` and `.agent/MULTI_LANE_WORKTREE_GUIDE.md` to align with repo rules and lane ownership.
- Read the external sprint brief in `C:\Users\mikep\Documents\Obsidian Vault\2026-04-30 Perplexity prompt for radical metaball refactor.md`.
- Confirmed the required doc locations from `.agent/AGENT.md`:
  - daily queue in `.agent/docs/plans/2026-04-30/`
  - session artifact in `.agent/docs/sessions/2026-04-30/`
- Created the daily queue and the initial master handoff document.
- Boundary note: still no runtime code changes; this is a docs-only setup pass.

### Pass 2 - Current-state code-path audit
- Audited `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`.
- Audited `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts`.
- Audited `pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts`.
- Audited `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`.
- Audited `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`.
- Audited `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts`.
- Audited `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`.
- Key finding:
  - `metaball_grid` is already a family-local direct-cell renderer and explicitly bypasses the shared metaball compositor.
  - `perimeter_field` still feeds `staticSamples` and `dynamicSamples` into the shared `MetaballRenderer`.
  - The remaining radical-cost target in the current repo is therefore the shared sample-field solve path, not the already-direct `metaball_grid` presentation path.
- Boundary note: still no runtime code edits; this pass was read-only audit work.

### Pass 3 - Optimization-spec authoring
- Converted the audited code-path findings plus the external sprint brief into the implementation plan below.
- Chose one master document instead of splitting the handoff across separate plan and notes files.
- Boundary note: this worktree currently changes docs only and is merge-safe outside the two new `.agent/docs/plans/2026-04-30/` files.

### Pass 4 - Canonical handoff relocation for merge safety
- Detected that `.agent/docs/sessions/` is gitignored in this repo, which would have made the handoff invisible to the merge agent.
- Moved the canonical handoff file into the tracked daily plans folder:
  - from `.agent/docs/sessions/2026-04-30/2026-04-30_metaball-radical-optimization-handoff.md`
  - to `.agent/docs/plans/2026-04-30/2026-04-30_metaball-radical-optimization-handoff.md`
- Boundary note: still docs-only; this relocation was specifically to preserve merge visibility.

### Pass 5 - First runtime implementation slice: local solve bounds plus split presentation
- Added `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldLocalOverlay.ts`.
- Implemented `buildPerimeterFieldSolveBounds()` from live `TransitionPlan` data:
  - unions PREV removed-section polylines
  - unions NEXT added-section polylines
  - includes mover start/end/control-point extents
  - includes appearing and disappearing V extents
  - inflates by influence radius, blur margin, border width, and cell size
- Extended `MetaballSceneInput` with optional `solveBounds` metadata.
- Extended the shared renderer and worker path so both can solve against a bounded local grid instead of only the full-world padded grid.
- Split `PerimeterFieldFamily` into:
  - `baseLayer` with `baseRuntime`
  - `overlayLayer` with `overlayRuntime`
- New runtime behavior for the plan-engine transition path:
  - base layer renders static unchanged perimeter samples only
  - overlay layer renders the full transition scene, but filtered to the conquest-local bounds and solved on a local grid
  - non-transition and legacy fallback paths still use the shared renderer as a single full-scene pass
- Added scene summary support for local bounds in `pipelineTelemetry.ts`.
- Boundary note:
  - this pass is now runtime code plus docs, not docs-only
  - the optimization is intentionally scoped to `perimeter_field` plan-engine transitions
  - legacy `perimeter_field` fallback remains on the old full solve path for now

### Pass 6 - Validation attempt and environment constraints
- Ran repo validation attempts from `pax-fluxia/package.json`.
- `bun run check` failed because the worktree does not currently have the local `svelte-kit` binary available.
- `bunx --package @sveltejs/kit svelte-kit sync` also failed because the worktree does not currently have the Svelte adapter dependency graph installed.
- `bunx tsc --noEmit -p tsconfig.json` could not validate because `.svelte-kit/tsconfig.json` is generated by the failed sync step.
- Ran Atlas AST outlines for the modified runtime files instead:
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldLocalOverlay.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/renderers/metaballGrid.worker.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
- Boundary note:
  - syntax / parse validation passed at the AST level
  - package-aware Svelte / TypeScript validation still needs a dependency-installed worktree or the merge agent's main lane

## Purpose

The goal in the user's words is to keep the conquest-transition strengths of the current metaball-style system while making it radically cheaper for browser runtime, especially for PixiJS 8 on WebGL-first low-end integrated GPUs.

## Governing Spec And Current Status

### Governing documents
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `C:\Users\mikep\Documents\Obsidian Vault\2026-04-30 Perplexity prompt for radical metaball refactor.md`

### Current status against those docs
- `metaball_grid` is already off the old "shared metaball compositor everywhere" design. Its family adapter explicitly says it bypasses the shared compositor and paints direct PIXI quads because the shared compositor was redundant and too expensive.
- `metaball_grid` still preserves the important semantic substrate:
  - world-anchored vstar classification
  - PREV/NEXT ownership sampling
  - deterministic wave planning
  - border-leads and fill-follows presentation logic
- `perimeter_field` is closer to the brief's requested semantics:
  - real PREV and NEXT geometry are built
  - perimeter V sets are sampled from frontier topology
  - a plan engine matches preserved spans and builds movers, appearing, and disappearing samples
  - but final rendering still goes through the shared `MetaballRenderer`
- The shared `MetaballRenderer` remains the expensive full-field path:
  - CPU sample accumulation into full-map fields
  - full ownership classification over the whole field
  - full RGBA texture upload
  - full border extraction and redraw

### Precise planning stance
- The user brief names `metaball-grid` or `metaball-perimeter-field`.
- In the current repo, the best interpretation is:
  - preserve `metaball_grid`'s conquest substrate and family-local runtime lessons
  - optimize the remaining expensive sample-field path used by `perimeter_field`
  - do not regress `metaball_grid` back into a full-map per-sample compositor

## 1. Problem Framing

### What the current system is doing conceptually
- `metaball_grid` uses a world-anchored grid of vstars as a conquest substrate. Each cell gets PREV/NEXT ownership classification, then a wave planner schedules when ownership presentation flips.
- `perimeter_field` uses perimeter-sampled V points from ownership-derived geometry. It builds PREV/NEXT V sets and a transition plan so changed frontiers can move while unchanged sections remain fixed.
- The key product value is not "blob rendering" by itself. The key value is a stable spatial substrate that can:
  - identify changed regions
  - encode PREV and NEXT states
  - schedule controlled motion
  - keep borders visually ahead of fill during conquest

### Essential parts versus accidental parts
- Essential:
  - deterministic PREV/NEXT capture
  - changed-region detection
  - stable sample identity or stable cell identity
  - local correspondence for moving fronts
  - controllable timing with separate visual staging for border and fill
- Accidental:
  - full-map evaluation when only a local conquest region changed
  - summing every sample into every potentially affected cell on the CPU
  - rebuilding and uploading a whole territory texture for small local transitions
  - using one generic renderer path for both steady ownership display and transition-local motion
  - treating static ownership samples and actively moving transition samples as one undifferentiated workload

### Why ~32k sources are expensive in browser/WebGL terms
- If the active mode really reaches roughly 32k influence sources, a naive or semi-naive solve is expensive even before drawing:
  - CPU cost: `samples Ã— covered cells` in `accumulateSamplesIntoFields()`
  - memory bandwidth: repeated writes into large `Float32Array` fields for each player/channel
  - classification cost: every grid cell still needs a winner solve after accumulation
  - texture upload cost: the resolved ownership texture is uploaded again after the solve
  - border cost: borders are rebuilt from the owner grid after the fill solve
- In browser terms, the worker path helps responsiveness, but it does not remove the algorithmic cost. It mainly moves the full solve off the main thread.
- In WebGL terms, pushing 32k live samples into a fragment loop would also be a bad target:
  - uniform limits
  - dynamic loop costs
  - too many texture lookups or branches
  - poor fit on low-end integrated GPUs

### Likely cost buckets in the current repo
- CPU:
  - sample accumulation in `MetaballRenderer.accumulateSamplesIntoFields()`
  - full owner-grid classification
  - border interval extraction and polyline chaining
  - perimeter sample generation and transition-plan building when caches miss
- GPU and upload:
  - full `territoryPixels` buffer upload through `BufferImageSource.update()`
  - blur passes when enabled
- Memory bandwidth:
  - repeated zeroing and refilling of large float fields and pixel buffers
  - static plus dynamic field merge on every solve
- Overdraw and draw overhead:
  - border redraw after every full solve
  - any fallback path that emits large numbers of transition samples continuously

## 2. Optimization Opportunities

| Option | Expected runtime win | Complexity | Pixi/WebGL fit | Low-end GPU fit | Semantics fit | Notes |
|---|---|---|---|---|---|---|
| Spatial hashing or uniform-grid bucketing of sources | Medium | Medium | Good | Good | Good | Helps local source queries, but alone does not fix full-map texture upload or full classification. |
| Chunking or tiled evaluation | High | Medium | Good | Good | Good | Strong fit. Lets the renderer solve only touched tiles and pool GPU resources. |
| Evaluate only in local conquest bounds | Very high | Medium | Good | Good | Excellent | Best first principle. Matches the product need because most conquests are local. |
| Resolution decoupling: lower-res field plus upscale | High | Low-Medium | Good | Good | Good | Very practical for browser. Use blur or threshold smoothing to hide coarse cells. |
| Signed threshold bands instead of a full high-precision field everywhere | High | Medium | Good | Good | Good | Especially strong for border-led transitions where only the decision band matters. |
| Cache static field contributions | High | Medium | Good | Good | Excellent | The current renderer already has static and dynamic split hooks. Extend that into local compositing. |
| Separate persistent ownership field from temporary conquest-transition field | Very high | Medium | Good | Good | Excellent | This is the most important architectural split to make explicit. |
| Store only nearest or strongest few contributors per cell | Medium-High | High | Fair-Good | Good | Conditional | Useful if still doing field solves, but more intrusive than local-bounds and static/dynamic separation. |
| Perimeter-only or border-band evaluation instead of full interior evaluation | Very high | Medium-High | Good | Excellent | Excellent | Best medium-term production direction because the semantic action is concentrated at the frontier. |
| CPU precomputation versus GPU evaluation tradeoff | High | Medium | Good | Good | Good | CPU should keep plan logic; GPU should handle cheap local compositing, not giant all-sample loops. |
| RenderTexture-based compositing of PRE and POST states | Very high | Medium | Excellent | Good | Excellent | Strong fit for border-lead/fill-follow timing and active-event overlays. |
| Marching squares or contour extraction only where needed | Medium-High | High | Fair-Good | Good | Good | Strong for borders, but more work than the first prototype and not necessary for the first win. |
| Multi-pass blur or morphology as an approximation to metaballs | High | Low-Medium | Excellent | Good | Good | Strong first prototype. Good visual cheat if bounded locally. |
| Jump flooding or distance transform hybrid | Medium-High | High | Fair | Fair-Good | Good | Technically attractive, but likely too specialized for the first browser-first production push. |
| Limiting active sources by influence radius cutoff | Medium | Low | Good | Good | Good | Already conceptually present in the current renderer, but not enough by itself. |
| Approximate sparse grid, mip pyramid, or tile atlas field | High | High | Good | Good | Excellent | Best production architecture if the family stays metaball-adjacent long-term. |

### Option notes that matter most
- Best immediate wins:
  - local conquest bounds
  - static versus dynamic field split
  - low-resolution event-local compositing
  - RenderTexture pooling
- Strong production direction:
  - perimeter-band-only evaluation
  - tile atlas for static ownership
  - event-local PRE and POST compositing
- Lower-value first moves:
  - trying to micro-optimize the existing full-map loop before changing the solve domain
  - moving all logic into a shader loop over many sources

## 3. Recommended Optimization Path

### Best immediate prototype
- Keep the current semantic plan logic.
- Do not change `perimeterFieldPlanEngine` first.
- Add local solve bounds and split the renderer into:
  - persistent static ownership presentation
  - small event-local dynamic overlay
- Use a lower-resolution local field or blurred mask inside the changed bounds only.
- Composite PRE and POST local surfaces with separate border and fill timing.

Why this is first:
- It preserves the current transition semantics.
- It reuses existing data already produced by `PerimeterFieldFamily`:
  - `staticSamples`
  - `dynamicSamples`
  - `TransitionPlan`
- It attacks the true current cost center without forcing an immediate rewrite of topology planning.

### Best medium-term production solution
- Move `perimeter_field` to a family-local renderer that no longer depends on the generic full-map `MetaballRenderer`.
- Render the map as:
  - cached static ownership tiles or a cached static low-res ownership atlas
  - event-local perimeter-band transition overlays
  - pooled PRE and POST RenderTextures
  - a local compositing filter that drives border lead and fill follow
- Keep topology planning on the CPU and keep GPU work bounded to local pooled surfaces.

### Things to avoid
- Do not revert `metaball_grid` to the shared full-field sample compositor.
- Do not implement a fragment shader with a loop over thousands of live samples.
- Do not rebuild full-map textures per conquest if the changed region is local.
- Do not keep the angle-matching fallback path as the long-term semantic base for `perimeter_field`; keep the topology-plan route as the production path.
- Do not let diagnostics or debug capture block the performant runtime path by default.

### Things to measure first before large refactors
- Current `staticSamples` and `dynamicSamples` counts for `perimeter_field`
- Current changed-region area versus full world area
- Current solve time breakdown in `MetaballRenderer`
- Current texture upload time
- Current border rebuild time
- Concurrency profile:
  - average simultaneous conquests
  - worst-case simultaneous conquests

## 4. Concrete Implementation Design

### CPU-side data structures
- Keep:
  - `TransitionPlan`
  - `PerimeterV`
  - `changedSections`
  - mover, appearing, disappearing records
- Add:
  - `PerimeterFieldSolveBounds`
    - one inflated AABB per active conquest or merged local cluster of conquests
    - derived from mover paths, appearing/disappearing samples, and preserved changed loops
  - `PerimeterFieldTileKey`
    - world tile coordinates plus geometry fingerprint
  - `PerimeterFieldStaticTileCache`
    - cached ownership tile textures or cached low-res tile masks
  - `PerimeterFieldActiveOverlay`
    - pooled local PRE and POST RenderTextures
    - progress state
    - merged owner palette and border/fill timing uniforms

### GPU resources
- Persistent:
  - pooled `RenderTexture`s for local overlays
  - one or more cached static ownership textures or tile atlases
  - one pooled filter instance for local compositing
- Per active event cluster:
  - `prevMaskRT`
  - `nextMaskRT`
  - optional `borderBandRT`
  - one world-positioned sprite or mesh to composite the local effect

### Update cadence
- On geometry fingerprint change:
  - update only the affected static tiles
  - do not rebuild unrelated static tiles
- On conquest start:
  - build or reuse `TransitionPlan`
  - derive local solve bounds
  - render PRE and POST local masks once
- Per frame during transition:
  - update only progress uniforms and any cheap overlay compositing state
  - do not resample all static perimeter loops every frame
  - do not rerun a whole-map field solve every frame

### Event lifecycle
1. Ownership or conquest event arrives.
2. `PerimeterFieldFamily` captures or reconstructs PREV and NEXT geometry.
3. `perimeterFieldPlanEngine` builds the transition plan.
4. New `buildPerimeterFieldSolveBounds()` derives local AABBs from:
   - movers
   - appearing and disappearing samples
   - changed section polylines
5. Static tile cache is checked for overlap.
6. PRE and POST local masks are rendered once for each active bounds cluster.
7. Frame updates only adjust compositing progress until transition completes.
8. Overlay resources return to the pool.

### Field evaluation strategy
- Immediate prototype:
  - evaluate a low-res ownership mask or low-res influence field only inside local bounds
  - use separable blur or morphology to restore metaball-like softness
  - keep static map outside those bounds cached
- Medium-term:
  - evaluate only a frontier band plus nearby ownership interior instead of the full region interior
  - represent static deep interior as cached ownership fill, not as actively solved metaball field

### Culling strategy
- Primary cull:
  - changed-region bounds plus influence-radius padding
- Secondary cull:
  - tile-level dirty tracking
- Optional tertiary cull:
  - camera intersection if the map view can be meaningfully clipped without visual seams

### PRE and POST storage
- Semantic truth:
  - `prevGeometry`
  - `nextGeometry`
  - `prevVSet`
  - `nextVSet`
  - `TransitionPlan`
- Presentation truth:
  - cached PRE local mask texture
  - cached POST local mask texture
  - cached static world tiles

### Changed-region detection
- Preferred source:
  - `changedSections` from `perimeterFieldPlanEngine`
- Derived bounds:
  - union of removed-section polylines
  - union of added-section polylines
  - mover path extents
  - appearing and disappearing sample extents
  - inflate by influence radius and blur margin

### Transition progress
- Drive one event progress value from `input.activeTransition.progress`.
- In the local compositor, derive:
  - `borderProgress`
  - `fillProgress`
- Suggested behavior:
  - `borderProgress` leads slightly
  - `fillProgress` lags slightly
- This preserves the existing product intent without requiring two separate semantic plans.

## 5. PixiJS And WebGL Implementation Notes

### Good fits for PixiJS 8
- `RenderTexture` for pooled local PRE and POST surfaces
- custom `Filter` for local compositing and softness
- world-positioned sprites to place each active local overlay
- texture pooling to avoid frequent allocation churn

### What should render once per conquest
- local PRE mask
- local POST mask
- derived local bounds
- any event-local blur kernel selection or fixed filter setup

### What should render once per frame
- progress uniforms only
- local overlay composite draw
- no full-map static rebuild unless geometry outside the active cluster actually changed

### What to avoid in Pixi and WebGL
- too many passes on low-end GPUs
- per-frame full `BufferImageSource.update()` for the entire map texture
- shader loops over large variable-length sample lists
- unbounded numbers of active RenderTextures
- recreating filters every frame

### Likely pitfalls
- If the local bounds are too tight, blur will clip at the edges. Always inflate by blur margin and border width.
- If ownership tiles and event overlays use different quantization or palette logic, seams will appear at the overlay edge.
- If pooled textures are not normalized to stable dimensions or padding rules, overlap between simultaneous events will become hard to reason about.
- If debug capture stays in the hot path, it will mask true performance.

## 6. Algorithm Candidates

### Candidate A - Localized low-res field atlas with static and dynamic split
- Concept:
  - keep sample-based field solving, but only inside local conquest bounds
  - cache static world ownership separately
- Why it may work:
  - smallest conceptual delta from current `perimeter_field`
  - preserves current sample semantics
- Perf profile:
  - big win whenever changed area is much smaller than the full world
  - still some CPU solve cost, but bounded
- Difficulty:
  - medium
- Best use:
  - first prototype

### Candidate B - Perimeter-band-only field
- Concept:
  - render only a local band around changed frontiers as a soft field
  - draw deep interior from cached ownership fill
- Why it may work:
  - matches the fact that visual action is concentrated at the frontier
- Perf profile:
  - very strong
  - low dynamic sample counts
- Difficulty:
  - medium-high
- Best use:
  - production solution

### Candidate C - Blurred ownership mask as fake metaball field
- Concept:
  - rasterize ownership mask locally, blur it, threshold it, and composite the result
- Why it may work:
  - excellent browser fit
  - easy to pool and composite
- Perf profile:
  - very good on integrated GPUs if bounds stay local and pass count stays small
- Difficulty:
  - low-medium
- Best use:
  - first prototype or fallback path

### Candidate D - Hybrid local phase field plus border shader
- Concept:
  - CPU topology plan defines motion and bounds
  - GPU shader renders local border band and soft fill from PRE and POST masks
- Why it may work:
  - strongest control over border-lead and fill-follow semantics
  - minimal dependence on huge live sample sets
- Perf profile:
  - excellent once built
- Difficulty:
  - high
- Best use:
  - later production refinement after Candidate A or C proves the local-bounds architecture

## 7. Measurement Plan

### Profile before and after
- frame time
- worker solve time
- texture upload time
- border rebuild time
- total renderer commit time
- texture allocation count
- active RenderTexture count
- shader pass count
- `staticSamples` count
- `dynamicSamples` count
- changed-region bounds area as a fraction of total world area
- simultaneous conquest count

### Existing instrumentation to reuse first
- `territory.perimeterField.sourceCacheHit`
- `territory.perimeterField.sourceCacheMiss`
- `territory.perimeterField.transitionPlanBuilt`
- `territory.metaball.rendererCommitted`
- `territory.metaball.rendererSkipped`

### New instrumentation to add
- `territory.perimeterField.solveBoundsBuilt`
- `territory.perimeterField.staticTileCacheHit`
- `territory.perimeterField.staticTileCacheMiss`
- `territory.perimeterField.localOverlayBuilt`
- `territory.perimeterField.localOverlayComposite`
- counts for:
  - tiles touched
  - pooled textures in use
  - local overlay pixel area

## 8. Coding-Agent-Ready Task Breakdown

### Phase 1 - Instrument the real cost and changed-area profile
- Goal:
  - prove how much of the map each conquest actually needs
- Files likely touched:
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts`
  - `pax-fluxia/src/lib/perf/pipelineTelemetry.ts`
- Add:
  - solve-bounds telemetry
  - sample-count telemetry
  - changed-area telemetry
- Debug visualizations:
  - draw the inflated local solve bounds
  - show changed section polylines and mover extents
- Validation:
  - logs show local bounds area versus world area for real conquests
  - no behavior change yet

### Phase 2 - Introduce explicit local solve bounds
- Goal:
  - derive stable, padded AABBs for each active conquest cluster
- Files likely touched:
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts`
  - new `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldSolveBounds.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldTransitionTypes.ts`
- Add:
  - `PerimeterFieldSolveBounds`
  - helper to merge overlapping conquest-local bounds
- Debug visualizations:
  - bounds rectangles with padding legend
- Validation:
  - all movers and changed sections remain inside bounds with blur padding included

### Phase 3 - Split static and dynamic presentation explicitly
- Goal:
  - stop treating the entire map as one fresh solve on every active transition
- Files likely touched:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
- Add:
  - scene metadata for static-world versus local-overlay presentation
  - static ownership cache keys that do not invalidate on every local transition
- Debug visualizations:
  - static tile cache hit and miss overlay
- Validation:
  - unchanged regions do not rebuild when only local transitions advance

### Phase 4 - Prototype local low-res overlay solve
- Goal:
  - render active transition overlays only inside local bounds
- Files likely touched:
  - new `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldRenderer.ts`
  - or `MetaballRenderer.ts` if reusing the shared path temporarily
  - `PerimeterFieldFamily.ts`
- Add:
  - pooled local PRE and POST RenderTextures
  - local mask solve path
  - compositing sprite placement
- Debug visualizations:
  - PRE mask
  - POST mask
  - composite result
- Validation:
  - frame 0 equals PREV
  - frame 1 equals NEXT
  - only local bounds redraw during transition

### Phase 5 - Implement border-lead and fill-follow compositing
- Goal:
  - preserve the current gameplay visual strength while using the cheaper local path
- Files likely touched:
  - local `PerimeterFieldRenderer` filter or compositor module
  - `PerimeterFieldFamily.ts`
- Add:
  - compositing uniforms for `borderProgress` and `fillProgress`
  - optional per-event easing
- Debug visualizations:
  - border-only view
  - fill-only view
  - progress scrub overlay
- Validation:
  - border motion clearly leads fill
  - no unrelated frontier sections move

### Phase 6 - Cull or retire fallback full-field paths
- Goal:
  - remove expensive or semantically weaker paths once the local renderer is proven
- Files likely touched:
  - `PerimeterFieldFamily.ts`
  - `buildPerimeterFieldScene.ts`
  - `GameCanvas.svelte`
  - possibly `MetaballRenderer.ts`
- Add or remove:
  - feature flag or family-local mode selection for rollout
  - retirement notes for the generic fallback path if replaced
- Debug visualizations:
  - comparison capture of old versus new path
- Validation:
  - build passes
  - debug captures show PREV and NEXT parity
  - perf traces show lower solve and upload costs

## Handoff Summary For The Next Agent
- The most important conclusion is that the repo already separated `metaball_grid` from the expensive generic compositor.
- The best radical optimization target is the remaining sample-field path used by `perimeter_field`.
- The first runtime slice is now implemented:
  - local solve bounds are derived from transition-plan topology and mover extents
  - `PerimeterFieldFamily` now renders through a split base/overlay path on plan-engine transitions
  - `MetaballRenderer` and its worker can now solve against a local bounded grid
- Remaining risks to verify visually:
  - local overlap brightening where unchanged static samples exist both in the base layer and the overlay bounds
  - whether the local bounds padding is sufficient for blur and border smoothing at the edges
  - whether legacy fallback or non-plan transitions need the same bounded-grid path next
- Merge safety:
  - this worktree now changes both docs and runtime files
  - the new runtime surface is isolated to `perimeter_field` plus shared renderer support for optional `solveBounds`

## Pass Log Addendum

### Pass 7 - Scope correction from `perimeter_field` to all metaball family surfaces
- The user explicitly corrected the lane scope: this sprint is not `perimeter_field`-only and must cover all metaball modes that still depend on the shared sample-field compositor.
- Audited the current family routing in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- Audited `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`.
- Audited `pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts`.
- Audited `pax-fluxia/src/lib/territory/families/metaball/metaballConquestTransitions.ts`.
- Reconfirmed the no-change audit status for:
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts`
- Scope conclusion for merge:
  - `metaball` required the same bounded-overlay optimization as `perimeter_field`
  - `metaball_grid` and `metaball_grid_phase_edges` did not require shared-renderer changes because they already bypass the sample-field compositor and paint direct grid cells

### Pass 8 - Shared overlay compositor fix plus generic metaball rollout
- Fixed the correctness flaw in the first perimeter-field split.
- Root cause:
  - the original local overlay rendered localized static-plus-dynamic content on top of a full static base
  - unchanged statics inside the local bounds were therefore double-stacked, which could brighten seams and preserved edges
- Implemented a shared overlay substrate in `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.ts`.
- Shared helper responsibilities now include:
  - derived/localized `MetaballSceneInput` construction
  - generic transition solve-bounds derivation for the `metaball` family
  - inverse rectangular cutout masking for base-layer compositing
- `PerimeterFieldFamily` now uses the shared inverse-mask compositor:
  - base render goes through `baseRenderLayer`
  - overlay render goes through `overlayRenderLayer`
  - `baseCutoutMask` removes the local solve rectangle from the base before the overlay draws
- `MetaballFamily` now uses the same shared split presentation:
  - cached static scene remains the base layer
  - active transition content is localized to bounded solve regions
  - the base layer is cut out under the overlay so local statics are not double-rendered
- `buildMetaballScene.ts` now writes `influenceRadiusPx` into the family-built scene so downstream localized solves do not need to guess that parameter.

### Pass 9 - Upstream PREV reuse, tests, and validation constraints
- `PerimeterFieldFamily` now prefers `input.prevGeometry` when the upstream transition lifecycle already captured PREV geometry.
- This removes one avoidable local rebuild on transition-key changes when the upstream capture is present and differs from the current geometry version.
- Added a focused pure helper test file:
  - `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.test.ts`
- Test coverage added there:
  - transition solve bounds include attacker travel, retreat span, and burst radius extents
  - localized scene input filters static/dynamic samples to the bounded overlay region
- Validation status for this pass:
  - Atlas AST parse / outline checks passed for the new helper, updated families, and new test file
  - `bunx vitest run ...` could not execute in this worktree because local `vite` and `@sveltejs/kit` packages are not installed, which is the same dependency hole blocking the broader `check` step
- Manual verification still required in an installed lane:
  - confirm the previous overlap-brightening seam is gone
  - confirm the base cutout stays aligned when blur and border widths change
  - confirm simultaneous conquest sessions do not expose a bounds merge issue in generic `metaball`

## Superseding Merge Boundary
- Runtime code touched across the completed sprint scope now includes:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/renderers/metaballGrid.worker.ts`
  - `pax-fluxia/src/lib/renderers/metaballGridWorkerTypes.ts`
  - `pax-fluxia/src/lib/perf/pipelineTelemetry.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/buildMetaballScene.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldLocalOverlay.ts`
- Added pure test coverage:
  - `pax-fluxia/src/lib/territory/families/metaball/metaballLocalOverlay.test.ts`
- Non-deliverable noise observed in worktree status:
  - `.agent-harness/logs/session_1777565579840_7dx25j.jsonl`
  - leave it out of merge decisions

## Superseding Handoff Summary
- The earlier handoff summary is now too narrow. The completed implementation scope is:
  - shared bounded-grid solve support in `MetaballRenderer` and the worker
  - corrected base/overlay compositing with inverse cutout masking
  - `perimeter_field` adoption of the corrected local overlay path
  - `metaball` adoption of the same local overlay path
  - audit-confirmed no-change status for `metaball_grid` and `metaball_grid_phase_edges`
- The most important behavioral fix beyond raw perf is the compositor correction:
  - unchanged local statics are no longer double-rendered under the overlay
- The most important merge note is architectural:
  - the shared overlay substrate now lives in `metaballLocalOverlay.ts`
  - `perimeterFieldLocalOverlay.ts` is now perimeter-specific again and only owns perimeter solve-bounds derivation

### Pass 10 - Restore missing transition diagnostics modal import target
- A follow-up Vite import-analysis failure surfaced after the sprint runtime work:
  - `src/lib/components/game/GameContainer.svelte` still imports `$lib/components/ui/TransitionDebugPanel.svelte`
  - that file no longer existed in this worktree, so the app could not boot
- Trace/audit performed for this pass:
  - confirmed `GameContainer.svelte` still owns the `showTransitionDebugPanel` state and the `pax-open-transition-debug-panel` event listener
  - confirmed `PerimeterFieldDiagnosticsPanel.svelte` still exists and remains the only live diagnostics UI for these controls
  - confirmed there were no other current references or replacement components named `TransitionDebugPanel`
- Implementation for merge:
  - added `pax-fluxia/src/lib/components/ui/TransitionDebugPanel.svelte`
  - this is a compatibility wrapper, not a new diagnostics logic surface
  - it preserves the existing `onClose` API expected by `GameContainer.svelte`
  - it portals a closable modal shell to `document.body`
  - it embeds the existing `PerimeterFieldDiagnosticsPanel` as the live content body
- Merge note:
  - no territory runtime or renderer logic changed in this pass
  - this is a UI-surface restoration pass that unblocks the existing debug entry point without widening the behavior contract

### Pass 11 - Correctness rollback for the bounded local overlay rollout
- The intended visible result from the optimization work was:
  - same ownership fill as before
  - same conquest semantics as before
  - no new seams, flicker, or fill corruption
  - lower transition solve cost because only the conquest-local region would animate on the expensive path
- The user reported the actual result in-app:
  - metaball-family fills appear broken and glitchy
- Root-cause decision for merge:
  - the new localized overlay compositor was promoted into live family rendering before visual parity with the original full solve was proven
  - the most likely structural failure is solve-domain mismatch: the local sample window and cutout path can diverge from the full-field winner classification, which corrupts fill continuity
- Corrective action taken in this pass:
  - disabled the new local-overlay presentation rollout in:
    - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
    - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - retained the renderer groundwork and bounds/debug support on disk for future iteration
  - restored the known-correct full-scene render path as the active user-facing behavior
- Merge note:
  - this is an explicit correctness-first rollback of the rollout, not an accidental partial implementation
  - shared bounded-grid support remains in the renderer codebase, but it is no longer user-visible by default in these families

### Pass 12 - Re-enable the rollout for full-scope inspection at user request
- The user explicitly requested that the temporary disabling from Pass 11 be reverted so the full implemented metaball scope remains visible for inspection.
- Reverted only the two rollout guards added in Pass 11:
  - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
- Active runtime status after this pass:
  - the bounded local-overlay rollout is live again in `metaball`
  - the bounded local-overlay rollout is live again in `perimeter_field`
- Merge note:
  - Pass 11 remains historically accurate as a temporary rollback, but it is no longer the active runtime state
  - do not apply another behavior-level rollback or guard change without explicit user request

### Pass 13 - Coherent present fix for the bounded local-overlay rollout
- The user reported that both `metaball` and `perimeter_field` were effectively broken in rendering, while `metaball_grid_phase_edges` remained a healthy reference.
- Structural diagnosis for this pass:
  - `metaball_grid_phase_edges` is a family-local direct presenter
  - `metaball` and `perimeter_field` currently render their localized transition rollout as two separate metaball layers:
    - base layer
    - overlay layer
  - the shared `MetaballRenderer` normally solves asynchronously through a worker when the browser supports `Worker`
  - that async path is acceptable for a single presentation layer, but it is unsafe for a two-layer composite because base and overlay can commit on different frames, leaving stale cutouts / stale overlays / incoherent fills
- Corrective action implemented:
  - extended `MetaballRenderer` with an explicit `allowWorker` render option
  - kept the default worker behavior for existing single-layer callers
  - forced `allowWorker: false` for the localized base and overlay passes inside:
    - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
    - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
- Intended visible effect after this pass:
  - the bounded local-overlay rollout remains active
  - base and overlay now solve and present coherently in the same frame instead of asynchronously drifting apart
  - this should specifically reduce or eliminate rectangle/cutout-style fill glitches during active conquest transitions
- Validation status:
  - `bun run check` now runs in this lane, but the repo currently has many unrelated pre-existing type and Svelte errors outside this repair surface
  - no new check failure was isolated to the `allowWorker` addition

### Pass 14 - Steady-state render recovery via family lifecycle repair
- The user then clarified the visible failure was more severe than transition drift:
  - steady-state territory rendering was completely absent in `metaball`
  - steady-state territory in `perimeter_field` was partially and messily drawn, with misaligned borders/fills
- Cross-check against the healthy reference (`metaball_grid_phase_edges`) exposed a lifecycle mismatch:
  - `MetaballGridPhaseEdgesFamily.dispose()` removes children and then re-adds its persistent display graph
  - `MetaballFamily.dispose()` and `PerimeterFieldFamily.dispose()` were removing their display roots without rebuilding the base/overlay graph
  - `GameCanvas.svelte` was destroying the Pixi app on teardown but was not disposing the singleton family registry at all
- Why this matters for merge:
  - render families are singleton-registered in `renderFamilyRegistry.ts`
  - without registry teardown, a remount/HMR cycle can reuse a family instance carrying an emptied or stale Pixi root
  - that failure mode matches the userâ€™s report very closely:
    - `metaball` can lose steady-state presentation entirely
    - `perimeter_field` can preserve only a partial/stale subgraph, causing broken fills and border alignment
- Corrective action implemented in this pass:
  - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
    - added `rebuildDisplayGraph()`
    - `dispose()` now clears mask state and rebuilds the base/overlay graph instead of leaving the root empty
    - added `ensureDisplayGraph()` at the start of `update()` so an already-live stale singleton can self-heal on the next render tick
  - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
    - matched the same `rebuildDisplayGraph()` and `ensureDisplayGraph()` pattern
    - `dispose()` now rebuilds the graph instead of leaving the root empty
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
    - now calls `disposeAllRenderFamilies()` during canvas teardown before destroying the Pixi app
- Important scope note:
  - this is not another speculative rendering-style tweak
  - it is a deterministic presentation-lifecycle repair for the singleton-family path
  - it should affect both fresh remounts and already-running sessions after the next family update
- Validation status for this pass:
  - `bun run check` still reports many unrelated repo errors
  - after a targeted follow-up pass, there are no remaining `svelte-check` hits in `MetaballFamily.ts` or `PerimeterFieldFamily.ts`

### Pass 15 - Eliminate async worker starvation from the user-facing metaball family path
- After Pass 14, the user reported a sharper symptom split:
  - with the game paused, territory was still absent in both `metaball` and `perimeter_field`
  - with the game playing, `perimeter_field` showed only partial / glitchy fill+border
  - `metaball` plain still showed none
- Root-cause trace for this pass:
  - the shared `MetaballRenderer` async worker path does not commit solved output when the worker responds
  - instead, worker responses are stored as `latestResponse` and only committed on a later `renderMetaball()` call when the response fingerprint still matches the current frame fingerprint
  - this creates two correctness hazards for user-facing family modes:
    - paused / low-frequency render states can stay blank forever because no later matching render arrives
    - active play can starve or flicker because the next render often advances to a newer fingerprint before the prior worker response is eligible to commit
- Why this explains the user report:
  - paused view: request posts, response arrives, but no deterministic follow-up commit occurs
  - live view: occasional partial commits can appear only when a response happens to line up with a later frame, producing stale or inconsistent presentation
- Corrective action implemented in this pass:
  - forced `allowWorker: false` for the full-scene shared-renderer path in:
    - `pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`
    - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - note that localized base/overlay passes were already forced onto main-thread solves in Pass 13; this pass extends the same deterministic commit policy to the non-overlay steady-state path
- Active runtime status after this pass:
  - all shared-renderer presentation inside `MetaballFamily` is now synchronous and immediate
  - all shared-renderer presentation inside `PerimeterFieldFamily` is now synchronous and immediate
  - this is a correctness fix for user-facing rendering, not a renderer-wide architectural deletion of worker support
- Merge note:
  - the async worker path is still present in `MetaballRenderer` for other callers / future refactor work
  - but for these two user-facing metaball families, correctness currently requires deterministic same-call commits

### Pass 16 - Restore star-site metaballs to `perimeter_field` and split mode-specific tuning into its own top-level section
- New user request for this pass:
  - `perimeter_field` should once again include real star-site metaballs at every owned star location, not only perimeter-derived shell samples
  - the star-site strength control must be separate from the perimeter-shell power control
  - the mode-specific tuning surface should live under a new top-level `Territory Mode Tuning` section instead of remaining buried only under the broader `Territory Tuning & Constraints` view
- Runtime behavior change implemented:
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - now builds explicit star-anchor influence samples for every owned star in `perimeter_field`
    - mixes those star samples into steady-state static scenes
    - mixes them into legacy transition scenes
    - mixes them into topology-plan scenes, including exact frame-0 / frame-1 endpoint equivalence handling
    - uses the shared `computeMetaballStarStrength(...)` helper from `metaballSceneBase.ts` so star-site weighting follows the same ship-count-based strength model as the plain metaball family, while remaining tunable independently
  - important renderer constraint documented in code and UI copy:
    - the shared compositor still exposes a single `influenceRadiusPx` per scene
    - therefore this pass adds a separate star-site strength control, not a second independent star-site radius control
- Config and family plumbing added:
  - new config key: `PERIMETER_FIELD_STAR_METABALL_WEIGHT`
  - default set in `pax-fluxia/src/lib/territory/families/perimeterField/config.ts` to `4.3`
    - this mirrors the existing plain metaball default strength multiplier closely enough to restore visible star cores without reusing the plain metaball setting directly
  - added to:
    - `pax-fluxia/src/lib/config/game.config.ts`
    - `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
    - `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
    - `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
- UI surface changes implemented:
  - new top-level settings section registered in `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`:
    - `Territory Mode Tuning`
  - routed in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` through `view="mode_tuning"`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
    - now supports the new `mode_tuning` view
    - isolates mode-specific renderer cards there (`Metaball`, `Perimeter Field`, `Metaball Grid`)
    - keeps the broader `Territory Tuning & Constraints` route focused on general territory controls instead of duplicating the mode cards
    - suppresses embedded shared style/geometry subpanels inside mode cards when shown under the new mode-tuning route, so `Territory Styles` and the general tuning route remain the canonical home for those shared controls
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
    - field module now has explicit subheadings:
      - `Perimeter Shell`
      - `Star Metaballs`
    - added a new slider:
      - `Star Metaball Power`
    - UX note in copy:
      - this slider shares the displayed field radius with `Perimeter Vstar Radius`
      - setting the new slider to `0` disables star-site contribution in `perimeter_field`
  - `Perimeter Field` card copy updated so it no longer incorrectly claims the displayed field is driven only by derived perimeter samples
- Test and verification status:
  - added focused scene-builder coverage in `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
    - asserts star-anchor samples appear when the dedicated star weight is non-zero
    - asserts they disappear when that dedicated weight is zero
  - updated an older frame-0 PREV equivalence test to reflect the new semantics correctly:
    - PREV in `perimeter_field` now legitimately includes attacker-side star anchors too when those owned stars are part of the displayed state
  - targeted validation passed:
    - `bun x vitest run src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - broader `bun run check` still fails repo-wide, but the remaining failures observed in this lane are unrelated ambient issues:
    - pre-existing `GameConfigType` / `territory fill transition` mismatch in `game.config.ts`
    - pre-existing `GameSettingsPanel.svelte` theme-routing and `ControlsSectionVisuals` prop errors
    - Svelte unused-selector warnings in several large settings panels

### Pass 17 - Remove duplicate settings exposure from `Territory Mode Tuning`
- User correction for this pass:
  - the prior `Territory Mode Tuning` implementation was not acceptable because it duplicated existing controls across the Settings IA
  - worse, it reused a mode panel (`PerimeterFieldTuning.svelte`) that already embedded shared source-geometry / topology controls, so the new section duplicated those controls again inside the scope of the new work itself
  - requested fix: keep the new top-level section, but strip it down to the intended single-purpose control surface and remove the duplicate exposures
- Root-cause record:
  - I routed `territory_mode_tuning` through the generic `ControlsSection-Territory.svelte` renderer-module hub
  - that hub is designed to aggregate multiple renderer cards, not to provide a single-home control surface
  - `PerimeterFieldTuning.svelte` already contains shared source-geometry controls (`Base Geometry Source`, `Source MSR`, `Source CX*`, `Source DX*`) in its `source` module
  - therefore the prior implementation duplicated controls in two separate ways:
    - duplicated shared controls across top-level settings sections
    - duplicated shared controls again inside the newly added section itself
- Corrective action implemented in this pass:
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryModeTuningSection.svelte`
    - new dedicated component created specifically for the top-level `Territory Mode Tuning` entry
    - contains exactly one user-facing control:
      - `Perimeter Field` -> `Star Metaball Power`
    - no renderer-module navigation, no shared topology controls, no shared style controls, no other mode cards
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
    - `territory_mode_tuning` now renders the dedicated `TerritoryModeTuningSection` instead of routing back through the generic territory renderer controls hub
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
    - removed the temporary `mode_tuning` view path and its supporting filter logic
    - restored this shared component to its original role: general territory tuning / styles, not a second mode-specific control plane
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
    - removed the duplicate `Star Metaball Power` slider from the existing perimeter-field panel so the new control now has one canonical editing home in the UI
- Resulting UX contract after this pass:
  - `Territory Mode Tuning` remains as a top-level section
  - it now exposes only the requested `Perimeter Field` star-metaball weight control
  - shared topology / geometry-source controls remain in their original existing settings homes
  - the star-metaball weight no longer appears in two user-facing places

### Pass 18 - Remove lingering source-geometry duplication from the general territory tuning surface
- Follow-up dedupe correction for this pass:
  - after Pass 17, one duplicate class still remained in the older general tuning route:
    - `PerimeterFieldTuning.svelte` still carried its own `source` module
    - `TerritoryGeometrySourceTuning.svelte` still duplicated the same MSR / CX / DX keys already owned by the generic `Topology Rules` editor
- Why this still mattered:
  - even with the new top-level mode section fixed, the broader Settings surface still exposed the same source-geometry knobs in multiple homes
  - that violated the same single-owner settings rule the user called out
- Corrective action implemented:
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
    - removed the entire `source` module
    - retired its duplicated `Base Geometry Source`, `Source MSR`, `Source CX*`, and `Source DX*` controls
    - added a compatibility self-heal so old saved `perimeterFieldModuleVisibility = "source"` panel state falls forward to `field` instead of leaving the panel blank
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
    - reduced to a true source-selector surface
    - keeps `Base Geometry Source`
    - removes duplicated topology constraint editors
    - now points users to the canonical shared `Topology Rules` controls for MSR / CX / DX edits
- Result after Pass 18:
  - `Base Geometry Source` has one editing home
  - shared MSR / CX / DX constraint keys have one editing home
  - `Star Metaball Power` has one editing home
  - the territory settings IA is materially less redundant than the earlier implementation

### Pass 19 - Promote topology to its own top-level section and remove dead border-transition UI
- New user request for this pass:
  - take the long shared topology subsection out of the generic territory tuning surface and give it its own top-level settings section
  - remove `Border Transition` unless it can be wired to current active territory transitions
- Runtime / UI audit conclusion for `Border Transition`:
  - the controls exposed in `ControlsSection-Territory.svelte` (`BORDER_TRANS_EASING`, `BORDER_TRANS_RESAMPLE_N`, `BORDER_TRANS_OVERSHOOT`, `TERRITORY_BORDER_TRANSITION`) are only consumed by the legacy `PowerVoronoiRenderer` / `PowerVoronoiRenderer_DY4` paths
  - there is no live clean-runtime / render-family consumer for those controls in the current territory family surfaces
  - therefore the prior UI was misleading for modern territory modes and was removed rather than left as a dead control plane
- Corrective action implemented:
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologySection.svelte`
    - new top-level section component created
    - owns the shared `Topology Rules` surface and preserves the existing compile-status behavior from `territoryTuningStatusStore`
  - `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
    - added `Territory Topology`
    - renamed `Territory Tuning & Constraints` to `Territory Renderer Tuning` because shared topology constraints no longer live there
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
    - routes the new `territory_topology` section to `TerritoryTopologySection`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
    - removed the embedded topology block entirely
    - removed the `border-transition` module entirely
    - removed the dead topology helper functions and temporary CSS that only existed to support the extracted block
    - keeps only renderer-oriented controls under the remaining tuning section
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
    - copy updated to point users to the new `Territory Topology` section as the canonical home for MSR / CX / DX edits
- Result after Pass 19:
  - `Topology Rules` now have their own top-level settings home
  - `Territory Renderer Tuning` is shorter and focused on renderer inputs / mode-specific tuning
  - `Border Transition` no longer appears as a dead modern-mode control surface

### Pass 20 - Audit diagnosis for `Perimeter Field` losing visible transition and drifting steady-state shape
- Audit trigger:
  - user reported that the main `Perimeter Field` mode had effectively lost its smooth transition effect
  - user also reported that the steady-state field shape remained present but was poorly tuned / badly shaped
- Diagnosis split:
  - this is not one bug; it is a combination of live-tuning collapse plus one code-path mismatch
- Live-tuning findings from `common/resources/settings-live/current-settings.json`:
  - `PERIMETER_FIELD_SAMPLE_SPACING = 120`
    - far sparser than the family default (`28`)
    - reduces contour-defining perimeter samples dramatically
  - `PERIMETER_FIELD_INFLUENCE_WEIGHT = 0.1`
    - collapses each perimeter sample's influence relative to the rest of the field
  - `PERIMETER_FIELD_STAR_METABALL_WEIGHT = 8`
    - heavily boosts the newly restored star-centered metaballs
  - `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION = false`
    - user-facing value says "do not freeze", but current family code does not honor this
  - `PERIMETER_FIELD_OLD_BOUNDARY_FADE = 0`
    - relevant only to the legacy transition path; does not currently drive the active plan-engine path
- Why the steady-state shape degrades under the current live tunables:
  - `buildPerimeterFieldScene.ts` now mixes star-anchor samples back into the same scene as perimeter samples
  - star anchors use `computeMetaballStarStrength(...) * PERIMETER_FIELD_STAR_METABALL_WEIGHT`
  - with the live values above, a representative owned star at ~70 ships yields strength ~13.8, while each perimeter sample is only `0.1`
  - that is roughly a 138:1 ratio in favor of star anchors
  - result: the field is visually governed by star blobs, not by the perimeter shell samples that are supposed to sculpt the mode
  - sparse `SAMPLE_SPACING = 120` makes this worse, because there are fewer perimeter constraints fighting back against the star anchors
- Why the smooth transition becomes hard to see under the same tunables:
  - the active `plan` engine animates localized perimeter movers / appearing / disappearing V samples
  - those transition samples inherit perimeter-scale strengths, not star-anchor-scale strengths
  - when star anchors dominate the solve, local perimeter motion can still exist numerically but becomes visually weak relative to the static star-centered field
  - this makes the mode read as "little or no transition" even when the plan engine is still emitting dynamic samples
- Additional code-path mismatch found during the audit:
  - `PerimeterFieldFamily.ts::readFreezeBaseDuringTransition(...)` currently returns `true` even when the tunable is explicitly `false`
  - this means the live setting `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION = false` is not honored
  - practical effect:
    - the family always takes the PREV-base / localized-overlay transition path
    - any user attempt to evaluate the non-frozen branch is currently impossible through settings alone
- Secondary tuning / UX mismatch found:
  - `PERIMETER_FIELD_OLD_BOUNDARY_FADE` and `PERIMETER_FIELD_NEW_BOUNDARY_GROW` are read in `buildPerimeterFieldScene.ts`
  - however, those multipliers only affect the legacy `buildTransitionSamples(...)` branch
  - the active `plan` transition path does not currently consume those values
  - implication:
    - those controls are not valid levers for restoring visible motion while `PERIMETER_FIELD_TRANSITION_ENGINE = "plan"`
- Audit conclusion:
  - most of the current visual failure is explained by live-tuning imbalance:
    - perimeter shell too sparse
    - perimeter sample strength too low
    - star anchor strength too high
  - separate from that, there is a real code defect / contract violation:
    - `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` is ignored and hard-forced to `true`
  - if a follow-up repair pass is needed, the likely order is:
    1. restore a sane perimeter/star strength balance and denser perimeter sampling
    2. honor `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` instead of hard-forcing PREV-base
    3. decide whether `OLD_BOUNDARY_FADE` / `NEW_BOUNDARY_GROW` should be retired from the `plan` UI or actually wired into the plan path

### Pass 21 - Topology-plan winding normalization to stop dropping valid perimeter loops
- Trigger:
  - user reported that in `Topology Plan`, some players / regions were getting zero perimeter Vstars and therefore zero ownership stake in `Perimeter Field`
  - user also provided direct UI evidence that `Legacy Synthetic` populated dense perimeter Vstars across the map while `Topology Plan` left obvious gaps
- Deterministic audit conclusion:
  - this was not just a transition-path issue
  - when `PERIMETER_FIELD_TRANSITION_ENGINE = plan`, steady-state `Perimeter Field` also samples its perimeter V-set from `frontierTopology.loops`
  - the topology sampler in `perimeterFieldPlanEngine.ts` was filtering to `loop.signedArea > 0`
  - `buildPowerVoronoiFrontierTopology.ts` computed loop signed area from chain-walk output, but did not normalize loop winding after assembly
  - result:
    - valid owner loops could arrive with negative signed area
    - those loops were then silently dropped by the plan-mode sampler
    - dropped loops meant no perimeter Vstars for those territories, which matched the user-visible "ignored region" failure
- Corrective action implemented:
  - `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts`
    - added `reverseSectionRefs(...)`
    - when a built loop has negative signed area, its `sectionRefs` are reversed and each ref direction is flipped
    - stored loop `signedArea` is normalized to `Math.abs(rawSignedArea)`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldPlanEngine.ts`
    - added defensive loop normalization in `normalizeLoopForSampling(...)`
    - changed sampling filter from `loop.signedArea > 0` to `Math.abs(loop.signedArea) > 1e-6`
    - plan-mode perimeter sampling now stays coverage-complete even if it receives stale / pre-normalized topology snapshots
- Regression coverage added:
  - `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - new case verifies a counterclockwise owner-world loop is normalized to positive signed area
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
    - new case verifies `sampleVSetFromGeometry(...)` returns the same V-set for canonical and reversed topology winding
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - repo-wide `tsc --noEmit` remains red from unrelated pre-existing errors, but no filtered hits were emitted for:
    - `buildPowerVoronoiFrontierTopology.ts`
    - `perimeterFieldPlanEngine.ts`
    - `buildPowerVoronoiFrontierTopology.test.ts`
    - `buildPerimeterFieldScene.test.ts`
- Important scope note for merge agent:
  - this pass fixes the deterministic "missing Vstars / ignored regions" failure in `Topology Plan`
  - it does **not** claim to fully solve the remaining visual border-position mismatch between:
    - cyan underlying geometry
    - dense perimeter Vstar lines
    - rasterized metaball border extraction

### Pass 22 - Shared metaball border stroke join cleanup
- Trigger:
  - after the winding fix, one remaining low-risk artifact class was still obvious from the user screenshots and prior audit:
    - border chains visually failing to meet cleanly
    - hard-corner joins exaggerating the segmented winner-grid extraction
- Corrective action implemented:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
    - changed both worker-applied and main-thread border strokes from:
      - `cap: 'butt'`
      - `join: 'miter'`
    - to:
      - `cap: 'round'`
      - `join: 'round'`
- Scope / intent:
  - presentation-only
  - does not alter ownership truth, Vstar placement, or transition planning
  - intended only to remove one obvious source of "segments do not meet" artifacts while leaving the current raster winner-grid border extraction intact
- Important scope note:
  - this does **not** solve the deeper border-position issue
  - the border is still extracted from the shared winner grid, not from an equal-influence contour between opposing perimeter sample chains

### Pass 23 - Geometry-derived interior backfill for `Perimeter Field`
- Trigger:
  - after the topology-loop coverage fix, user reported two remaining coupled issues:
    - borders were still appearing inside a playerâ€™s own territory
    - `Perimeter Field` fill was still inconsistent and relied too heavily on `Star Metaball Power` for backfill
- Deterministic diagnosis:
  - these internal borders were consistent with owner-vs-empty frontier extraction inside the shared winner grid
  - the perimeter shell alone was still leaving interior void pockets
  - star-centered metaballs could hide the issue, but only as a rough, star-driven fill source
- Corrective action implemented:
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - added geometry-derived interior support sampling:
      - `distanceToPolygonBoundary(...)`
      - `polygonBounds(...)`
      - `collectInteriorSupportPoints(...)`
      - `buildInteriorSupportSamples(...)`
    - support samples are derived from the trusted perimeter source geometry, not from star cores
    - support samples are placed well inside the region using a boundary-distance filter and deterministic staggered grid sampling
    - support sample strength is tied to perimeter strength (`0.9x`) so it acts as a fill stabilizer rather than a new boundary driver
    - support samples are now cached alongside perimeter-source sampling and included in:
      - topology-plan steady state
      - topology-plan transition endpoints
      - legacy perimeter-source steady state / target-state paths
- Intended effect:
  - remove owner-vs-empty void pockets inside a territory
  - suppress the internal â€œborders inside my own regionâ€ artifact that was being drawn around those voids
  - keep `Star Metaball Power` available as secondary augmentation rather than as the only reliable fill source
- Regression coverage added:
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
    - new topology-plan test verifies geometry-derived fill support exists even when star metaballs are disabled
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - filtered `tsc --noEmit` produced no hits for:
    - `buildPerimeterFieldScene.ts`
    - `buildPerimeterFieldScene.test.ts`
- Important scope note for merge agent:
  - this pass is a fill-stability repair, not a contour-placement rewrite
  - if borders still visibly diverge from the midpoint between opposing perimeter Vstar chains after this pass, the next repair surface remains the shared `MetaballRenderer` border extraction algorithm

### Pass 24 - Revert geometry-derived interior backfill at user request
- Trigger:
  - user explicitly rejected the Pass 23 approach
  - required correction: `Perimeter Field` must **not** use a secondary interior metaball field as its primary fill strategy
- Corrective action implemented:
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - removed the geometry-derived interior support sample layer entirely
    - removed all support-point helpers and support-sample cache plumbing
    - removed support-sample injection from:
      - topology-plan steady state
      - topology-plan transition endpoints
      - legacy perimeter-source steady / target scene assembly
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
    - removed the fill-support regression case added in Pass 23
- Explicit final-state rule for merge agent:
  - keep the topology-loop winding normalization fix
  - keep the round border cap/join cleanup
  - do **not** reintroduce geometry-derived interior support samples from Pass 23
- Validation:
  - focused vitest pass succeeded after the revert:
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - repo-wide `tsc --noEmit` is still red from an unrelated pre-existing `MetaballRenderer.test.ts` export mismatch

### Pass 25 - Owner-mask fill for `Perimeter Field`
- Trigger:
  - user explicitly redirected fill strategy away from geometry underlay and away from any secondary metaball fill field
  - required behavior:
    - fill must meet the same metaball-derived borders the mode is actually drawing
    - transitions should keep using the current metaball solve rather than switching to unrelated polygon fill truth
- Deterministic diagnosis:
  - `MetaballRenderer` already derives both border extraction and fill color from the same solved winner grid
  - the breakage was not â€œmissing geometryâ€
  - the breakage was that fill alpha still used influence falloff:
    - `fadeAlpha = min(1, maxInf * edgeFade) * alpha`
  - result:
    - ownership could exist in the winner grid
    - borders would still draw
    - but interior cells could visually fade out to near-empty
- Corrective action implemented:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
    - added scene-level `fillOpacityMode`
    - added exported `buildMetaballCacheFingerprint(...)`
    - cache fingerprint now includes scene radius, scene ownership margin, solve bounds, and fill-opacity mode
    - main-thread fill classification now supports:
      - `influence`
      - `owner-mask`
    - `owner-mask` uses stable ownership opacity for any filled winner cell instead of influence falloff
  - `pax-fluxia/src/lib/renderers/metaballGridWorkerTypes.ts`
    - added `fillOpacityMode` to worker config
  - `pax-fluxia/src/lib/renderers/metaballGrid.worker.ts`
    - mirrored owner-mask alpha handling in the worker path
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - all `Perimeter Field` scene outputs now opt into `fillOpacityMode: 'owner-mask'`
- Scope / intent:
  - no geometry-underlay fill
  - no added interior support sample field
  - fill and border remain driven by the same solved winner grid
  - local overlay transitions inherit the same rule because base and overlay both render from scene inputs carrying the same fill mode
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/renderers/MetaballRenderer.test.ts`
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - filtered `tsc --noEmit` produced `no-filtered-hits` for:
    - `MetaballRenderer`
    - `metaballGrid.worker`
    - `metaballGridWorkerTypes`
    - `buildPerimeterFieldScene`
    - `buildPowerVoronoiFrontierTopology`

### Pass 26 - Shared blended borders for `Perimeter Field`
- Trigger:
  - after owner-mask fill landed, the user still reported that borders were not behaving like one merged frontier
  - symptom:
    - borders appeared independently stroked and slightly diverged instead of reading as one shared blended edge
- Deterministic diagnosis:
  - the shared metaball renderer was still honoring dominance-filter voids during winner classification
  - in `Perimeter Field`, that created thin unowned bands between adjacent owners
  - border extraction then treated each side as:
    - owner vs void
    - owner vs void
  - result: two nearby borders instead of one owner-vs-owner frontier
- Corrective action implemented:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
    - added scene-level `winnerMode`
    - cache fingerprint now includes scene winner mode
    - renderer now supports:
      - `dominance-filter`
      - `top-owner`
  - `pax-fluxia/src/lib/renderers/metaballGridWorkerTypes.ts`
    - added `winnerMode` to worker config
  - `pax-fluxia/src/lib/renderers/metaballGrid.worker.ts`
    - mirrored `top-owner` classification behavior in the worker path
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - all `Perimeter Field` scene outputs now opt into:
      - `fillOpacityMode: 'owner-mask'`
      - `winnerMode: 'top-owner'`
- Resulting rule:
  - `Perimeter Field` no longer permits contested void slivers between adjacent owners in the winner grid
  - borders therefore extract as one owner-vs-owner frontier and keep the existing blended pair color
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/renderers/MetaballRenderer.test.ts`
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - filtered `tsc --noEmit` again produced `no-filtered-hits` for the touched renderer / perimeter-field files

### Pass 27 - Geometry remainder backfill for `Perimeter Field`
- Trigger:
  - after owner-mask fill and top-owner winner classification, large black interior voids still remained in areas where the perimeter metaball shell did not reach the territory interior
- Deterministic diagnosis:
  - the perimeter metaball samples correctly shaped the border zone
  - but deep interior cells could still have no metaball winner at all
  - because those cells stayed `ownerGridGeom = -1`, they:
    - rendered as black voids
    - also generated owner-vs-void internal borders
- Corrective action implemented:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
    - added optional `fillFallbackRegions` on `MetaballSceneInput`
    - after the metaball winner/fill pass, any still-unowned cell is tested against trusted fallback polygons
    - when matched:
      - the cell is assigned the owning player in `ownerGridGeom`
      - the fill pixel is painted with the owner color
    - this runs before border extraction, so filled remainder cells do not emit internal void borders
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - now builds fallback regions from trusted perimeter geometry sources
    - fallback regions are ordered from current/target geometry depending on transition progress
- Resulting rule:
  - `Perimeter Field` remains metaball-shaped at the edge
  - trusted geometry is used only to fill the remainder that the metaball field leaves unowned
  - this is intentionally a same-grid remainder fill, not a separate display underlay and not a new metaball field
- Important scope note:
  - this geometry remainder fill is currently consumed in the main-thread shared renderer path
  - `PerimeterFieldFamily` already renders with `allowWorker: false`, so the live mode gets the full behavior
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/renderers/MetaballRenderer.test.ts`
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - filtered `tsc --noEmit` produced `no-filtered-hits` for the touched files

### Pass 28 - Border geometry aligned to filled ownership cells for `Perimeter Field`
- Trigger:
  - after remainder backfill landed, the user reported that `Perimeter Field` now had one blended border, but it still looked jagged and did not line up with the visible fill edge
- Deterministic diagnosis:
  - live `METABALL_CHAIKIN_PASSES` was already `0`, so the drift was not coming from Chaikin smoothing
  - `Perimeter Field` fill was already correct at the ownership-grid level:
    - owner-mask fill from the solved winner grid
    - fallback geometry only for cells still left unowned
  - the remaining mismatch was presentation:
    - borders were still being drawn as stroked centerlines over the frontier segments
    - stroke joins / caps and centerline rendering were not guaranteed to sit exactly on the final filled cell ribbon
- Corrective action implemented:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
    - added scene-level `borderGeometryMode`
    - cache fingerprint now includes the scene border geometry mode
    - `Perimeter Field` can now request `grid-ribbon` border rendering
    - `grid-ribbon` renders filled rectangles centered on the exact final frontier intervals instead of stroking a chained polyline
    - style bucketing now also includes the owner pair, so unrelated equal-style boundaries are not mixed together
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
    - all `Perimeter Field` scenes now opt into:
      - `borderGeometryMode: 'grid-ribbon'`
- Resulting rule:
  - `Perimeter Field` borders are now drawn from the same final ownership-grid frontier that the visible fill uses
  - border placement is therefore aligned to fill boundaries by construction
  - this pass improves alignment first; it does not attempt a new smooth contour algorithm yet
- Important scope note:
  - this border-alignment fix is scene-local and currently targets the main-thread shared renderer path
  - `PerimeterFieldFamily` already uses `allowWorker: false`, so the live mode receives the new behavior without changing worker protocol scope
- Validation:
  - focused vitest pass succeeded:
    - `src/lib/renderers/MetaballRenderer.test.ts`
    - `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
    - `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`
  - filtered `tsc --noEmit` produced `no-filtered-hits` for:
    - `MetaballRenderer`
    - `buildPerimeterFieldScene`
    - `buildPowerVoronoiFrontierTopology`

## 2026-05-02 Branch-vs-Master Review And Merge Recommendation

### Snapshot
- review branch:
  - `codex/metaball-radical-opt-review-20260502`
- pushed checkpoint:
  - `43be57405` `Checkpoint metaball optimization and perimeter field recovery`
- current master comparison target at review time:
  - `origin/master` = `cad080942`
- ancestry delta:
  - `0 behind / 34 ahead` vs `origin/master`
- overall diff size:
  - `210 files changed`
  - `29,823 insertions`
  - `12,070 deletions`

### What this branch actually contains

This branch is materially broader than the stated sprint goal of radical metaball performance optimization.

1. Core territory / metaball / perimeter-field work
   - bounded local overlay solve infrastructure for `metaball` and `perimeter_field`
   - scene-input extensions in the shared metaball renderer
   - topology-plan loop-winding normalization
   - `Perimeter Field` fill / border recovery:
     - owner-mask fill
     - top-owner winner mode
     - trusted-geometry remainder backfill
     - filled-frontier border alignment
   - transition diagnostics compatibility and settings work

2. Metaball-grid / phase-edges work
   - new `metaball_grid_phase_edges` mode
   - active-frontier / timing / transition fixes
   - grid runtime and diagnostics expansion

3. Gameplay perf / diagnostics tooling
   - benchmark harness work
   - in-app conquest bench tooling
   - live transition capture / telemetry / perf probes

4. Large unrelated UI and structure payload
   - HUD component splits
   - main-menu split / theme dropdown work
   - map-editor path / file reorganization
   - settings IA restructuring
   - `.obsidian` config drift
   - worktree-process docs

### Narrower territory/metaball area size
- the territory/metaball/perimeter/settings subset alone is still large:
  - `33 files changed`
  - `4,806 insertions`
  - `3,975 deletions`
- the clearly unrelated UI / perf / worktree payload is also large:
  - `34 files changed`
  - `13,863 insertions`
  - `1,912 deletions`

### Has the primary optimization goal been achieved?

Not conclusively.

What did land:
- a real shared local-overlay substrate exists
- solve bounds are now derived for `metaball` and `perimeter_field`
- the renderer can build base + local overlay scenes
- telemetry / diagnostics coverage improved materially

What is still missing:
- no branch-level benchmark proving a stable win against current `master` for the user-facing `metaball` / `perimeter_field` modes
- this worktree spent significant effort recovering visual regressions caused during rollout of that optimization path
- final state is much better than the broken middle state, but the branch outcome is now a mix of:
  - optimization substrate
  - mode repair
  - unrelated infrastructure / UI churn

Conclusion on the original goal:
- the branch achieved useful optimization infrastructure
- it did **not** produce a clean, self-contained, benchmark-proven optimization payload suitable for wholesale merge

### Branch health at review time

Focused validation that passed:
- `src/lib/renderers/MetaballRenderer.test.ts`
- `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
- `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`

Branch-wide health concerns:
- `bun x tsc --noEmit` is red on this branch
- notable failures include changed / branch-induced surfaces such as:
  - `src/lib/components/ui/panelSync.test.ts`
  - `src/lib/config/game.config.ts`
  - `src/lib/perf/inAppConquestBench.ts`
  - `src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
  - `src/lib/territory/families/metaball/buildMetaballScene.test.ts`
  - `src/lib/territory/families/metaball/metaballLocalOverlay.test.ts`
  - `src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts`
  - `src/lib/territory/families/perimeterField/perimeterFieldDiagnostics.test.ts`
- `git diff --check origin/master...HEAD` also reports trailing whitespace in:
  - `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`

### Concrete merge blockers in the actual territory code

1. `Perimeter Field` still hard-forces PREV-base transition behavior
   - `src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
   - `readFreezeBaseDuringTransition()` always returns `true`
   - this means the exposed `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION = false` setting is currently not honored
   - that makes current settings / UI semantics misleading even if the current forced behavior is visually necessary

2. The branch is not scoped to the intended merge target
   - even if the territory stack itself were accepted, merging this branch wholesale would also drag in:
     - large UI reorganizations
     - benchmark / tooling work
     - map-editor file moves
     - `.obsidian` changes
     - process docs

### Serious recommendation

Do **not** merge this branch wholesale into `master`.

Reason:
- it is too broad
- it is not branch-green
- it does not isolate the original optimization goal cleanly
- it mixes meaningful territory recovery with unrelated product and tooling churn

### What is worth merging back, selectively

The following subset appears worth salvaging into one or more narrow follow-up branches / cherry-picks:

1. `Perimeter Field` recovery stack
   - topology-loop winding normalization so valid loops are not dropped
   - V-star coverage recovery for topology-plan mode
   - owner-mask fill
   - top-owner winner classification
   - trusted-geometry remainder backfill
   - filled-frontier border alignment

2. Shared renderer scene-surface additions that those fixes require
   - scene-level fill mode
   - scene-level winner mode
   - scene-level fill fallback regions
   - scene-level border geometry mode

3. `TransitionDebugPanel` compatibility wrapper
   - small, low-risk, directly fixes a broken import surface

4. Potentially the bounded local-overlay substrate
   - only if revalidated deliberately against `master`
   - and only if merged with fresh benchmark evidence plus visual QA for:
     - `Metaball`
     - `Perimeter Field`
     - `Metaball Grid Phase Edges`

### What should not ride along in the same merge

- HUD/main-menu/map-editor reorganizations
- settings IA restructuring beyond what the territory subset strictly needs
- benchmark harness / gameplay perf runner work
- `.obsidian` config changes
- multi-lane/process documentation payload
- live settings baseline churn unless intentionally curated

### Recommended merge strategy

1. Do not open a PR from this branch as-is.
2. Create a fresh branch from current `master`.
3. Cherry-pick or manually reapply only the validated territory subset.
4. Fix the remaining branch-induced type errors in that narrow branch.
5. Re-run:
   - targeted vitest for territory files
   - full `bun x tsc --noEmit`
   - live visual QA in `Metaball`, `Perimeter Field`, and `Metaball Grid Phase Edges`
6. Only then decide whether the local-overlay optimization itself is ready, or whether to merge just the perimeter-field recovery fixes first.

