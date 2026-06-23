---
date created: 2026-06-23
last updated: 2026-06-23
last updated by: AI (opus-territory)
relevant prior docs: .agent/docs/sessions/2026-06-21/2026-06-21_GEOMETRY_ENGINE_BUILD_PLAN.md
superseding docs: —
---

# Post-Mortem: 2026-06-23 — Grid Gradient blanked by cold-load worker-defer

## What Happened
To remove a reported 3-6s freeze on the first switch into Grid Gradient, I off-threaded the
cold plan build to the existing Web Worker (`82f2735dd`): when `cachedPlan === null` the
family returned a null plan and drew nothing until the worker committed. The worker did not
commit the first plan on the live cold path, so Grid Gradient rendered **blank** (disappeared
territory). The user reported it. I reverted to the synchronous cold build (`44ca5b48e`).

## Root Cause
1. **No synchronous fallback for the cold case.** The cold path depended entirely on the
   worker committing; when it didn't (cause still undiagnosed — worker load / serialization /
   commit-gate), there was nothing on screen.
2. **Verified a cold-path change with a warm state.** The trace I treated as "working" showed
   `planHit=true` (a stale plan built before the change deployed) — it never exercised the
   cold worker-defer path. Silence/stale-cache is not verification (§2.2).
3. **Off-threaded a NON-bottleneck.** The deeper error: the GG-load diagnosis attributed the
   3-6s freeze to `materializeClassification`'s per-cell allocation *without timing evidence*.
   The actual trace shows the plan build is only ~49ms (`planMs=49.20`). So the worker-defer
   moved a 49ms cost off-thread (no freeze benefit) while adding a blank risk — solving the
   wrong problem.

## Impact
Grid Gradient — a main topbar render mode — showed no territory after a cold mode switch.
User-visible regression. One revert commit; no data loss. The 3-6s freeze it tried to fix is
still unattributed (it is NOT the plan build).

## Diagnostic Method
The pipeline trace's `fam` line disproved the premise (`planMs=49.20`, `planHit=true` even
mid-transition → the plan build is ~49ms and cached during transitions, not the freeze). The
blank being grid_gradient-only + the "working" trace being warm-only localized it to the cold
worker-defer (the one grid_gradient-specific change).

## Corrective Actions
- Reverted the cold worker-defer; cold build is synchronous again (the proven path). Warm
  rebuilds still off-thread to the worker (`44ca5b48e`).
- Surfaced the full cold-load stage breakdown in the trace `fam` step (`updateMs` total +
  `matMs`/`distMs`/`waveMs`/`sceneMs`/`texPackMs`/`texUpMs`) so the real freeze is *measured*,
  not guessed, before any further optimization.

## Lessons / Derived Rules
- **Measure before you move work off-thread.** Never off-thread or rewrite a stage you have
  not timed as the bottleneck. The timings (`classificationMaterializeMs`, `lastTextureUploadMs`,
  …) already existed — I should have read them first (§7.4 trace-first; RULE 0).
- **Verify a cold-path change IN the cold path.** A warm/cached state that skips the changed
  branch is not verification (§2.2).
- **A subagent's quantified claim is a hypothesis, not evidence.** "~50k-160k allocations =
  3-6s" needed confirmation against the measured `planMs` before acting.
- **Prefer a fallback over a blank.** A risky async path must keep a synchronous fallback so a
  failure degrades to slow, never to nothing.
