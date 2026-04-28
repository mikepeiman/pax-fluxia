# Gameplay Performance Plan - Smoothness First - 2026-04-28

## Purpose

This document replaces the prior performance framing with a smoothness-first plan.

The previous work found useful bottlenecks, but it also accepted too much reduced visual cadence as an optimization tactic. That is no longer acceptable.

## Governing Requirements

1. `16.7ms` is the hard frame budget ceiling for `60fps`, not the target.
2. Engineering target must preserve at least about `2x` headroom in steady gameplay.
3. No deliberate visual undersampling for core gameplay surfaces.
4. No dynamic visual throttling for ships or territory as a default shipping tactic.
5. DevTools Performance evidence is first-class, not optional.

## Source Set

- `C:/Users/mikep/Pictures/screenclip annotations/Snipaste_2026-04-28_13-37-49 30sec of metaball-grid.png`
- `C:/Users/mikep/Pictures/screenclip annotations/Snipaste_2026-04-28_13-37-49 30sec of metaball-grid - self-time.png`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/docs/rendering-pipeline-audit-2026-04-27.md`
- `C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/docs/gameplay-performance-findings-and-plan-2026-04-27.md`

## Why The Previous Framing Was Incomplete

### 1. Average in-app timings were overemphasized

Fresh DevTools traces show material time in browser and Pixi present work:

- Layout
- Paint
- Layerize
- Pre-paint
- Commit
- Pixi buffer upload / VAO / batching work

So a low in-app territory number does not prove visually smooth output.

### 2. Visual throttling was allowed to masquerade as optimization

Current code contains multiple explicit under-sampling mechanisms:

- cadence/defer gates in `GameCanvas.svelte`
- async territory presentation yielding
- `metaball_grid` paint skipping
- `metaball_grid` hard flip transitions
- `metaball_grid` spacing coarsening under `maxCells`
- dynamic ship visual throttling in `shipLod.ts`

These may improve measurements while making motion look coarse or inconsistent.

### 3. DevTools Performance was underused as a primary evaluation surface

The benchmark tool already supports Chrome trace capture, CPU profiling, and DevTools metrics in `tools/debug/benchmark-browser-gameplay.ts`.

What was missing was process discipline:

- long runs were often captured with trace disabled to reduce overhead
- manual DevTools traces were not used as a required review surface after each material optimization
- automated summaries did not become the primary driver for browser render/compositor work

That was a process error.

## Current Diagnosis

### 1. `metaball_grid` is still visually wrong for shipped expectations

It is improved in raw cost, but current code still permits coarse presentation:

- stepwise fill flips
- skipped paints
- deferred presents
- possible grid coarsening

That explains why it can benchmark better while still looking like low-fps animation.

### 2. Conquest transition semantics are still too opaque

`Fill Transition` is not one clean current system. It is a mix of:

- broken legacy fill mode
- legacy fill-only fallback modes
- a topology-based fill-rebuild path with misleading naming

This must be culled and renamed before further tuning.

### 3. Ship motion still contains a correctness defect

`BACKWARD ship-geometry assignment` is a real lane-direction bug signal. Smoothness work on ship motion is incomplete until that is fixed.

### 4. Browser/Pixi present cost is now a primary concern

The screenshots show that some of the remaining pain is in:

- browser main-thread render phases
- Pixi immediate-mode / upload paths

That moves the next wave of work away from summary averages alone and toward explicit browser trace analysis.

## Non-Negotiables

### 1. No dynamic ship visual throttling

Plan:

- audit `shipLod.ts` and all consumers
- remove dynamic thresholds, dynamic budgets, and effect suppression
- retain only any fixed visual maximum that is an actual product rule

If a fixed visual cap exists per star, it must be treated as stable product behavior, not adaptive throttling.

### 2. No cadence-based under-presentation for active animated surfaces

During active gameplay animation:

- territory must present every animation frame
- conquest transitions must present every animation frame
- orbiting and traveling ships must present every animation frame
- stars and connections must not be artificially deferred on cadence budgets

### 3. No silent fidelity reduction for performance

No automatic:

- grid coarsening
- skipped paints
- lowered effect tiers
- effect suppression

unless explicitly selected by the user as a visual mode, not as an invisible perf fallback.

## Workstreams

## A. Semantic Culling And Naming Cleanup

### Goals

- make every mode name describe the actual code path
- delete clearly broken or misleading options
- reduce operator confusion before further optimization

### Actions

1. Delete `frontier_morph`.
2. Rename `active_front` to `legacy_fill_active_front` if retained.
3. Rename `crossfade` to `legacy_fill_crossfade` if retained.
4. Rename `unified_topology` to `topology_fill_rebuild` until it truly drives unified fill+border output.
5. Update UI labels, settings bridges, contracts, docs, and diagnostics together.
6. Split territory mode language into:
   - pipeline runtime
   - render-family runtime
   - direct legacy renderer

## B. Remove Visual-Throttling Mechanisms

### Goals

- restore continuous present on active surfaces
- stop accepting coarse animation as a performance win

### Actions

1. Remove or disable cadence/defer gates for animated territory, ships, stars, and connections in `GameCanvas.svelte`.
2. Remove async territory presentation yielding during active animation.
3. Disable `metaball_grid` paint-skip behavior while any transition or active movement is visible.
4. Replace `metaball_grid` default `hard` flip behavior with a continuous blend path.
5. Remove dynamic ship visual throttling from `shipLod.ts`.

### Important distinction

This does not mean "render everything naively forever." It means optimization must come from better rendering architecture, not by presenting less often.

## C. DevTools-First Perf Workflow

### Goals

- make browser render/compositor cost visible after every meaningful change
- stop relying only on app-local timers

### Required workflow

For each meaningful performance step:

1. capture a 20-30 second manual DevTools Performance trace for the target scenario
2. export the trace
3. capture an automated benchmark trace and CPU profile with the existing harness
4. compare:
   - browser phases
   - Pixi upload/batching work
   - app perf marks
   - frame pacing

### Tooling changes

1. Keep `tools/debug/benchmark-browser-gameplay.ts` as the automation surface.
2. Change the default targeted perf workflow so trace and CPU capture are on for short diagnostic scenarios.
3. Write trace artifacts by default for targeted scenario runs.
4. Add summary output for:
   - Layout
   - Paint
   - Layerize
   - Commit
   - upload / buffer / batch buckets
5. Add an artifact checklist section to the report after each run.

## D. `metaball_grid` Rework

### Goals

- preserve the visual language
- restore continuous animation
- replace CPU/immediate-mode bottlenecks with persistent GPU-friendly rendering

### Actions

1. Treat current `metaball_grid` cost numbers as incomplete until skip/defer gates are removed.
2. Remove string-heavy cell-id work from hot paths.
3. Keep numeric grid coordinates hot throughout the family.
4. Move blended-edge extraction and smoothing out of the frame paint loop.
5. Replace per-cell `PIXI.Graphics` painting with batched mesh or instanced geometry.
6. Keep spatial density constant during perf work; do not use `maxCells` coarsening as the escape hatch.
7. Use DevTools traces to verify that browser-side paint and Pixi upload costs actually fall after each change.

## E. Fill Transition Cleanup

### Goals

- make the UI honest
- eliminate broken legacy confusion
- establish one clearly named smooth path for conquest fills

### Actions

1. Cull broken fill-transition options.
2. Produce one exact wiring table:
   - setting
   - resolver
   - planner
   - sampler
   - border behavior
   - diagnostics path
3. Choose one smooth conquest fill path for active development.
4. Do not call any path `unified` unless its fill and border outputs are actually unified in code.

## F. Ship Motion Correctness

### Goals

- eliminate lane-direction bugs
- ensure ship motion analysis is based on correct geometry

### Actions

1. Trace `BACKWARD ship-geometry assignment` from caller to cache to trim result.
2. Fix direction preservation in one place, not with downstream patches.
3. Re-verify ship motion with DevTools traces and visual playtest after the fix.

## G. Family-By-Family Performance Work After Smoothness Restoration

### `distance_field`

- keep GPU-local border path as the main quality/perf candidate
- remove repeated short-lived uniform allocations
- keep GPU readback out of default gameplay path
- only measure after cadence/throttle removal elsewhere

### `pixel`

- keep persistent resources
- investigate partial uploads
- measure upload cost explicitly in browser traces

### `vs_pvv3`

- keep the invalidation gate before FG2
- further separate canonical shell rendering from fallback geometry work
- do not pay fallback complexity on the canonical path

### stars and connections

- optimize only after they are being presented every frame again
- reduce real redraw cost rather than deferring presentation

## Validation And Acceptance

## Visual validation

Required after each meaningful step:

- single-player start
- active fleet movement
- one conquest transition
- one 20-30 second steady-state gameplay capture
- one 20-minute heavy-gameplay run

## Diagnostics validation

Required artifacts:

- manual DevTools Performance trace
- automated benchmark JSON
- automated CPU hotspot summary
- automated trace summary
- screenshots or video capture when visual smoothness is the question

## Acceptance targets

For non-debug gameplay runs:

1. active animation surfaces present every `requestAnimationFrame`
2. no dynamic ship visual throttling
3. no active-transition `metaball_grid` paint skipping
4. no browser-main-thread spike above `16.7ms` in representative smoothness validation runs
5. steady-state representative gameplay target:
   - `avgFrameMs <= 8.0ms`
   - `p95FrameMs <= 12.0ms`
6. any remaining visual compromise must be an explicit user-selected visual mode, not an automatic perf tactic

## Immediate Execution Order

1. Rename and cull fill-transition options so the UI and docs become truthful.
2. Remove dynamic ship visual throttling.
3. Remove cadence/defer/skip behavior from animated surfaces.
4. Re-run `metaball_grid` and `distance_field` with manual DevTools traces and automated trace artifacts.
5. Fix `BACKWARD ship-geometry assignment`.
6. Only then resume renderer-specific optimization passes.

## Summary

The next performance phase must optimize for continuous, correct presentation first.

The core shift is:

- away from "lower measured average cost at any price"
- toward "continuous smooth output, then architectural optimization that preserves that smoothness"
