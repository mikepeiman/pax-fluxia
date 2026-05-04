Merge note:
- Source worktree: `c2f3`
- Source commit: `cad08094`
- Merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# Metaball-Grid Perf Trace Crash Report

Date: 2026-04-29

## Scope

Investigate:

1. Chromium/DevTools crashing during performance trace capture with `STATUS_ACCESS_VIOLATION`
2. Performance call-tree attribution showing `chunk-*.js` instead of semantically useful file/module names
3. Immediate hotspots visible in:
   - `C:/Users/mikep/Pictures/screenclip annotations/Snipaste_2026-04-29_12-05-21 total time, metaball-grid-8px.png`
4. Live settings relevance from:
   - `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/common/resources/settings-live/current-settings.json`

## Files inspected

- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/common/resources/settings-live/current-settings.json`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/vite.config.js`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/package.json`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridStats.ts`
- `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- Vite optimized dependency chunks and maps under:
  - `C:/Users/mikep/.codex/worktrees/c2f3/pax-fluxia/pax-fluxia/node_modules/.vite/deps/`

## Findings

### 1. The crash looks like a browser trace-collection failure, not a JavaScript exception

Observed symptom:

- crash occurs while collecting a DevTools Performance trace
- reported error is `STATUS_ACCESS_VIOLATION`

Assessment:

- this is consistent with Chromium/DevTools process instability under heavy tracing load
- there is no evidence here of an app-thrown exception causing the crash
- the screenshot shows a long capture window with `Screenshots` enabled and repeated heavy main-thread spikes
- under this workload, DevTools is recording filmstrip frames while the app is rebuilding a very large Pixi graphics scene every frame

Conclusion:

- immediate blame should go to trace volume and rendering load interacting badly with DevTools/Chromium
- the app is still causing the pressure that makes the trace fragile

### 2. `chunk-*.js` attribution is real, but the source maps are not missing

The hot chunk names in the screenshot map to Vite optimized dependency chunks in:

- `pax-fluxia/node_modules/.vite/deps/chunk-YEPWORVE.js`
- `pax-fluxia/node_modules/.vite/deps/chunk-IW3SMFZ7.js`
- `pax-fluxia/node_modules/.vite/deps/chunk-OBFJFAWG.js`

Important facts:

- the corresponding `.map` files exist
- those maps contain original Pixi module paths, e.g.
  - `pixi.js/src/scene/graphics/shared/buildCommands/buildLine.ts`
  - `pixi.js/src/rendering/renderers/shared/geometry/utils/transformVertices.ts`
  - `pixi.js/src/scene/graphics/shared/utils/triangulateWithHoles.ts`
- the maps do **not** carry `x_google_ignoreList` or `ignoreList`
- the screenshot still shows at least one real project file reference:
  - `ShipRenderer.ts:385:17`

Conclusion:

- this is **not** a global source-map breakage
- project source maps still work
- the hot path has moved into Vite-prebundled dependency code, and DevTools Performance is presenting those dependency frames under optimized `chunk-*.js` files
- this hurts debugging because the hot dependency path is now much less semantically legible in the trace UI

### 3. The screenshot shows Pixi Graphics geometry rebuild dominating the transition

The bottom-up stack in the screenshot is dominated by Pixi graphics rebuild work:

- `addRenderable`
- `buildContextBatches`
- `addShapePathToGeometryData`
- `buildLine`
- `round`
- `buildSimpleUvs`
- `getContextRenderData`
- `triangulate`
- `bufferData`
- repeated `Minor GC` / `Major GC`

These resolve to Pixi internals inside the optimized dependency chunks, not to application gameplay logic.

Most important interpretation:

- the expensive work is **not** the conquest planner/classification alone
- the expensive work is the **per-frame redraw and retessellation** of many thousands of Graphics shapes
- the trace is showing geometry construction, batching, triangulation, UV generation, and GPU upload churn

### 4. The current live settings are an extreme stress profile

From `current-settings.json`:

- `TERRITORY_RENDER_MODE = "metaball_grid"`
- `METABALL_GRID_SPACING_PX = 8`
- `METABALL_GRID_MAX_CELLS = 0`
- `METABALL_GRID_CELL_SHAPE = "square"`
- `METABALL_GRID_CELL_CORNER_PX = 2.5`
- `METABALL_GRID_BORDER_MODE = "territory_edge"`
- `METABALL_GRID_BORDER_BLEND = false`
- `METABALL_GRID_BORDER_CHAIKIN_PASSES = 0`
- `METABALL_GRID_WAVE_GEOMETRY = "grid_bfs"`
- `METABALL_GRID_WAVE_SEEDING = "winner_natives"`
- `METABALL_GRID_FLIP_TRANSITION = "lerp_per_cell"`
- `METABALL_GRID_FLIP_WINDOW = 0.445`
- `TERRITORY_TRANSITION_MS = 1050`

### 5. Later Perf samples shifted the diagnosis from plan churn to steady-state render cost

Later in-session live readouts showed:

- `Requested plan = worker ready`
- `Visible frame = steady-state plan`
- `Transition clock = none`
- `Frame time (last) = 0.10 ms`
- `Plan build total ~= 28.8 ms` from the most recent build, not from the currently visible frame

Interpretation:

- by the time of that sample, the metaball-grid family itself was effectively idle
- this reduces the likelihood that the remaining jank is caused by transition-state invalidation or geometry-object churn
- the stronger explanation is that the static, settled `PIXI.Graphics` scene is still expensive for Pixi to traverse/render when it contains ~22k filled/stroked cells

### 6. Immediate mitigation implemented: steady-state texture caching

Code changes made:

- `MetaballGridFamily` now enables Pixi `cacheAsTexture(...)` when the visible frame is steady-state and not transition-driven
- it disables that cache before any live repaint and re-enables it only after a stable steady-state frame is painted
- the Perf panel now exposes:
  - `Render cache = live vectors | steady texture`

Expectation:

- animated conquest frames still render live vectors
- once the transition settles, the family should switch to `steady texture`
- that should materially reduce static-phase render cost by avoiding repeated traversal of a huge vector-instruction set

### 7. Regression discovered and fixed: cache could activate during the family-local transition clock

Regression:

- the first cache implementation relied on a perf-state helper that labeled the frame `steady / none` whenever the scheduler no longer exposed a conquest transition key
- that was wrong because metaball-grid can continue animating on its own local visual clock after the scheduler-side key has dropped
- result: the family could enable `steady texture` too early, while a local transition was still in progress

Fix:

- `MetaballGridFamily.resolvePerfTransitionState(...)` now respects `usingVisualTransition` first and reports `clockSource = local`
- the steady-texture gate now explicitly refuses caching when `usingVisualTransition` is true

Operational expectation:

- if the family is still animating locally, the Perf panel must show:
  - `Transition clock = local visual clock`
  - `Render cache = live vectors`
- `steady texture` is only valid after the family is fully settled

### 8. Post-mortem: I over-confirmed a plausible regression claim without local proof

Failure:

- I treated a user report of visible transition leakage as if it were established local truth for this worktree
- I let a plausible theory (`steady texture` turning on too early) become a confirmed narrative before proving the symptom locally

Why that was wrong:

- the project is being worked in multiple worktrees and agents, so cross-worktree symptom contamination is a real risk
- the correct standard here was not â€œplausible,â€ it was â€œcorroborated by this worktreeâ€™s local evidenceâ€

What I should have done:

- first ask whether the report was from this worktree or another
- or, better, validate locally from the actual metaball-grid Perf rows:
  - `Requested plan`
  - `Visible frame`
  - `Transition clock`
  - `Render cache`
- and only then classify the issue as confirmed or unconfirmed

Process correction:

- when multiple worktrees/agents are active, I will treat any symptom claim as unconfirmed until it matches local diagnostics or trace evidence
- I will explicitly state `plausible but unconfirmed` rather than jumping to `root cause`

### 9. Additional perf optimization implemented: static native fills are no longer repainted every transition frame

New change:

- native cells now render to a separate static graphics layer
- only non-native transition cells are repainted as live fills each frame
- borders remain live for now

Expected effect:

- conquest frames should no longer pay the full fill cost for every native cell
- trace weight should shift downward in the Pixi shape-path build stack even before the scene reaches full steady-state texture caching

Implications:

- `8px` spacing means `15,625` requested cells per megapixel
- at roughly full-HD scale this is on the order of `~32k` grid cells before culling
- `MAX_CELLS = 0` means no safety coarsening
- `lerp_per_cell` can emit two contributions for in-window transitioning cells
- rounded square corners force `roundRect`/path generation rather than cheap axis-aligned rect emission
- territory-edge border work adds further line/path building

### 5. The current metaball-grid painter is path-heavy by construction

Relevant implementation:

- `MetaballGridFamily.ts` clears and repaints a single `PIXI.Graphics` object every animated frame
- it emits per-cell primitives with:
  - `g.rect(...).fill(...)`
  - `g.roundRect(...).fill(...)`
  - `g.poly(...).fill(...)`
  - `g.circle(...).fill(...)`
  - matching stroke operations for borders
- the dirty-paint gate only skips frames when the paint signature is unchanged; during a live transition, progress changes, so the family repaints every frame

Result:

- every animated conquest frame rebuilds a large Graphics scene
- Pixi marks the renderable dirty and runs `_rebuild(...)`
- that triggers the exact hot stack seen in the screenshot

### 6. Recent perf work does not appear to have stripped maps

Recent Vite/perf work added:

- `optimizeDeps.include` entries in `vite.config.js`
- browser-bench/dev diagnostics plumbing

What was **not** found:

- no custom `manualChunks`
- no custom `chunkFileNames`
- no explicit source-map removal
- no ignore-list metadata in the dependency source maps

Conclusion:

- the attribution regression is more plausibly a side-effect of Vite optimized deps plus the hot path moving into Pixi internals
- not a deliberate stripping of source maps

## Immediate issues visible in the screenshot

1. `Animation frame fired` totals are far above frame budget.
   - The selected workload is nowhere near `16.6ms/frame`.

2. `buildLine` and `round` are major costs.
   - This matches border/rounded-path generation overhead.

3. `buildSimpleUvs`, `triangulate`, and `getContextRenderData` are major costs.
   - This indicates repeated tessellation/batching, not just simple draw submission.

4. `bufferData` is non-trivial.
   - Geometry is being re-uploaded after rebuild.

5. `Minor GC` and `Major GC` both show up materially.
   - Allocation churn is part of the problem, not just pure math.

6. The dominant hotspot is Pixi dependency code, not userland planner code.
   - Debugging by staring only at app-side conquest logic would miss the current bottleneck.

## Diagnostic interpretation

This trace says:

- the transition jank is currently render-path-bound
- the expensive part is the **Graphics scene rebuild path**
- the planner/worker path may still matter, but it is not the only issue and not the clearest one in this screenshot

## Recommended immediate debugging procedure

### For stable reproduction

Use the current settings as-is first, because they reproduce the failure:

- `8px` spacing
- no max-cell cap
- rounded squares
- `lerp_per_cell`

### In the app

Open:

- `Settings -> Territory -> Metaball Grid -> Perf`

Watch:

- `Cells`
- `Frame time (last / EMA)`
- `Plan build (classify / wave / total)`
- `Transition state`

Interpretation:

- if `Plan build` is low but frame time is still bad, the painter is the problem
- if `worker pending / holding PRE` dominates, the planner is still too slow too

### Logs

Turn on:

- `Renderer`
- `Error`
- optionally `System`

### DevTools trace settings

For the next reproduction:

- first run **without** `Screenshots`
- keep the capture short, ideally one conquest only
- only use screenshots after a shorter trace proves stable

Reason:

- with this render load, screenshots add a lot of extra tracing overhead and memory pressure

## Suggestions

### A. Debuggability

Add a profiling-oriented dev mode that avoids optimized Pixi dep chunking where possible, so Performance traces surface module names more usefully during perf work.

Candidate approach:

- profiling env flag in `vite.config.js`
- under that flag, prefer dependency settings that make Pixi frames more trace-readable, even if startup is a bit slower

### B. Immediate perf focus

The next serious optimization target is not the conquest wave planner first; it is the per-frame Graphics rebuild path in `MetaballGridFamily.ts`.

Priority suspects:

1. rounded-square cell drawing
2. per-cell/per-edge stroke generation
3. full-scene `Graphics.clear()` + rebuild every animated frame

### C. Short-term reproduction knobs

To separate planner cost from painter cost:

1. set `METABALL_GRID_CELL_CORNER_PX = 0`
2. set `METABALL_GRID_BORDER_MODE = "off"`
3. keep `SPACING_PX = 8`
4. compare the same conquest

If frame time collapses, the dominant issue is clearly path/stroke rebuild, not classification.

## Bottom line

- The trace crash is most likely a Chromium/DevTools failure under a pathological trace workload, not an application exception.
- The `chunk-*.js` names are Vite optimized dependency chunks. Source maps still exist; the trace is hot in Pixi internals.
- The screenshot shows the current metaball-grid transition is dominated by Pixi Graphics rebuild/tessellation/upload churn.
- With `8px` spacing, unlimited cells, rounded squares, and animated per-cell transitions, the current painter path is too expensive for buttery animation and is the right next optimization target.

