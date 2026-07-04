---
date: 2026-07-04
status: SCOPED — needs visual verification (not shipped)
relates to: MASTER_TASK_LIST "SHARED transition retrigger root cause"
---

# Grid Gradient conquest-transition retrigger — fix plan

## Why this is separate from the PowerCore fix

The shared root cause (a later conquest restarting an in-flight one) was fixed for the
**active render path (PowerCore/PowerVector)** in `a297366c6` via per-conquest independent
morph clocks in `KineticTransitionRuntime` — fully offline-tested.

Grid Gradient exhibits the **same class of defect** but through a **different mechanism** that
cannot be safely verified offline (GPU shader + worker plan). Shipping a blind change to the
user's stated "biggest defect" without visual verification is the wrong risk. This documents the
precise fix so a supervised pass can execute it quickly.

## Mechanism (code-grounded, verified 2026-07-04)

Grid Gradient animates the whole field from **ONE global progress scalar** per frame; per-cell
variation is a **static spatial phase** (`flipTime`), not an independent clock.

- `GridGradientFamily.resolveProgressState` (`GridGradientFamily.ts:656-698`) returns one
  `progress` for the frame: `clamp01((nowMs - activeVisualTransition.startedAtMs)/durationMs)`.
- `beginVisualTransition` (`GridGradientFamily.ts:277-288`) **resets `startedAtMs = nowMs`**
  whenever the plan re-keys (`:363`, `:489-501`). The plan re-keys because `buildGridGradientPlanKey`
  folds in `buildTransitionKey(input.activeTransition.events)` — and `activeTransition` is only the
  **latest tick's session** (`renderFamilyTransitionLifecycle.ts:173-176`). So a next-tick conquest
  re-keys → `startedAtMs` resets → the whole field animation replays from 0 (the "repeat").
- The plan struct carries **no per-cell/per-conquest start time** — `flipTimeByteByCell`
  (`plan.ts:220-234`) is a normalized [0,1] phase, packed to `metrics.g` and read by the GLSL
  `transitionBlendT` (`gridGradientShaderFieldShaders.ts:171-174,322`) as `smoothstep(uProgress, flipTime)`.
- `prevGeometry` is a binary one-hop freeze (`GameCanvas.svelte:2595-2786`,
  `syncLiveRenderFamilyStableFrame` with `freezeDuringActiveTransition: true`): while ANY transition
  is active the "before" frame is frozen, and a later conquest forces a rebuild that does not stitch
  multi-hop history. So it cannot represent "A mid-flight, B not yet begun."
- `input.transitionSessions` (ALL sessions, each with its own `startedAtMs`) already exists and is
  correct — but Grid Gradient reads it **only for logging** (`GridGradientFamily.ts:238,245`).

## Ranked fix options

1. **Lowest risk (TS-only), partial:** gate `beginVisualTransition` so it does NOT re-arm
   `startedAtMs` when `activeVisualTransition` is still unexpired; extend `durationMs` to cover the
   new conquest's tail instead. Files: `GridGradientFamily.ts:277-296,363-369,489-501,621-632`.
   Sharp edge: without the `prevGeometry` fix below, a finished conquest's cells may **snap** rather
   than replay — milder than today's full replay, but still needs eyes. MUST also fix the
   `prevGeometry` freeze (`GameCanvas.svelte:2595-2640,2656-2786`) so the merged "before" spans back
   to the OLDEST unfinished conquest, not just the newest.

2. **Structurally correct (HIGH risk — shader):** give the plan a per-event `startedAtMs`
   (thread `input.transitionSessions` into `buildGridGradientPlanFromParts`/`planGridWave`; the plan
   already segments `GridWavePlan.perEvent[]` keyed by `eventId`), compute per-cell elapsed time, and
   change the CPU envelope (`gridGradientScene.ts:188-212`) + GLSL `transitionBlendT` + metrics
   packing (`shaderField/gridGradientShaderFieldPacking.ts`) to consume a per-cell clock. This is the
   truly-correct per-conquest-clock analog of the PowerCore fix. Needs visual verification of the
   overlapping-conquest scenario.

3. **Lifecycle-level (moderate):** change `renderFamilyTransitionLifecycle.ts:173-176` to synthesize
   an `activeTransition` spanning `min(startedAtMs)`..`max(startedAtMs+durationMs)` of all in-flight
   sessions, keeping the single global clock but pinned to the OLDEST session, relying on the existing
   per-cell `flipTime` phase. Still requires the `prevGeometry` multi-hop fix; `flipWindow` was tuned
   for a single conquest's duration, so pacing needs visual check.

**Recommendation:** option 2 mirrors the now-correct PowerCore model and is the durable fix, but do it
in a supervised pass with a screenshot/dev-overlay diff across an overlapping-conquest scenario.
Option 1 is a safe interim only if paired with the `prevGeometry` fix and eyeballed once.
