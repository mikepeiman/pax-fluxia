# Territory Review Phase 0 Update 24 - Recovery Keep-Set Plan

Timestamp: 2026-06-29 18:50:39 -04:00

Scope: plan from verified review evidence. No product-code fix was made in this step.

## Core Decision

Do not merge `codex/territory-overnight-integration` into master as a whole.

Reason: the branch has useful work, but it also contains proven user-facing regressions. The clearest regression is delayed territory display after captures and mode switches.

The recovery branch should start from current master, then selectively bring over only the parts that are useful and measured.

## Working Base

Start from current master, not from the review branch.

Observed current master comparison commit:

`c2e9afb7a7eb44f9cb0cfa343003e7f6b16a0ffc`

Before product work begins, update this to the actual latest master.

## Keep

Keep these, but still integrate carefully from current master:

1. Review benchmark harness.
   - Useful because it measures release-mode game behavior on `/play?bench=1`.
   - Keep only if it remains non-invasive outside benchmark mode.

2. Deterministic replay hash tool.
   - Useful because it checks whether game rules changed.
   - It cannot prove visual smoothness, but it can catch rule breakage.

3. Pending-display measurement.
   - Critical because frame timing alone missed the real user-facing regression.
   - Definition: pending-display time is how long a prepared territory update waits before being shown.

4. Clear thinking/invariant rule docs.
   - Keep the rule that physical board shape is immutable during a game.
   - Keep the rule that ownership changes are gameplay state, not physical board movement.

5. Exact transition identity, pending fresh isolation.
   - Meaning: a star capture transition should be identified by the actual capture event, including tick, captured star, previous owner, and new owner.
   - Reason to keep: this protects repeated captures of the same star from incorrectly ending each other.
   - Requirement: re-check with a focused recapture test after integration from master.

6. Plain Cell Grid fill/border split, pending fresh master-based isolation.
   - Previous evidence supports it for plain Cell Grid only.
   - Do not assume it helps Phase Edges or Ember Lattice.

7. Geometry correctness tests and diagnostic tools.
   - Keep when they protect real current behavior.
   - Do not let them justify work on impossible in-game physical board changes.

## Drop Or Rewrite

Do not carry these as-is:

1. Visible territory scheduled as browser background work.
   - Verified regression.
   - It delays visible map updates.
   - The disposable user-visible-priority experiment reduced Phase/Ember/Phase Field pending display from roughly 150-250 ms to about 4-10 ms.

2. Input-pressure rules that delay core territory ownership display.
   - They may improve frame tables by showing old territory longer.
   - That is not acceptable for captures or mode switches.

3. Star capture flash split as a performance change.
   - Not proven to matter for core jank.
   - Put it in backlog unless there is a visual-design reason to keep it.

4. Any performance claim based on physical board changes during a game.
   - The physical board shape does not change during a game.
   - If a performance change depends on detecting moving stars or rewired physical connections during live play, the premise is wrong.

5. Whole-branch merge.
   - Too much mixed work.
   - It includes regressions and lacks current master fixes.

## Rewrite Target

The right product design is a two-stage territory presentation path:

1. Show correct current ownership immediately.
   - This is the basic visible map truth.
   - It must not wait behind background scheduling.

2. Prepare expensive transition decoration separately.
   - This includes fancy capture waves, edge effects, or other transition visuals.
   - If it is late, skip that fancy transition for that capture.
   - Never replay old ownership just so the fancy transition can appear.

Plain English: correctness first, decoration second.

## Recovery Work Order

### Loop 1 - Master-Based Measurement Branch

Limit: 1 pass.

1. Create a new worktree from latest master.
2. Bring over only the benchmark/replay/pending-display measurement tools.
3. Build release mode.
4. Run baseline acceptance rows before any product fix.

Stop condition:

- If the measurement tools themselves change UX or frame timing noticeably, fix the tools before product work.

### Loop 2 - Remove Delayed Display

Limit: 3 implementation attempts.

Goal:

- Captures and mode switches show correct current territory immediately or within one visible frame-sized budget.

Required evidence:

- Pending display stays at `0 ms` or a strict small budget in Cell Grid, Phase Edges, Ember Lattice, Phase Field, Power Voronoi Runtime, Metaball, and Perimeter.
- Deterministic replay hash stays unchanged.
- Screenshots show non-blank correct territory after mode switch and capture.

If not achieved after 3 attempts:

- Stop product coding and write the exact blocker.
- Do not hide the delay behind another scheduler trick.

### Loop 3 - Split Expensive Phase/Ember Transition Work

Limit: 4 implementation attempts.

Goal:

- Phase Edges and Ember Lattice should not put transition setup, geometry work, Pixi object changes, and Pixi rendering into one visible hitch.

Preferred design:

- show stable current territory immediately;
- build the decorative transition plan off the critical visible path;
- apply it only if it is ready while still visually relevant.

Required evidence:

- Pending display remains bounded.
- Transition frame p95/p99 improves from the immediate-display experiment.
- No repeated plan build for the same capture.
- Screenshots show correct territory, not blank or stale territory.

### Loop 4 - Mode Switch Acceptance

Limit: 3 implementation attempts.

Goal:

- Switching territory modes must not feel stuck or stale.

Required evidence:

- Mode switch pending display is `0 ms` or within the strict budget for all primary modes.
- Power Voronoi Runtime p95 is compared against current master again. If still higher, isolate separately instead of blaming scheduler.

### Loop 5 - Power Voronoi Open Check

Limit: 2 isolation attempts.

Open observation:

- Power Voronoi Runtime mode-switch p95 remained higher than master in some review/user-visible runs, without delayed display.

Current status:

- Cause not proven.
- It may be real, measurement noise, instrumentation overhead, or a geometry/rendering change.

Required before action:

- Fresh same-run-count comparison from current master and the recovery branch.
- If still slower, isolate the smallest relevant product change.
- If not reproducible, document and move on.

### Loop 6 - Keep-Set Cherry-Pick

Limit: 1 pass per candidate.

For each candidate keeper, ask first:

Is this necessary or beneficial at all?

Then require:

- a direct user-facing benefit or correctness protection;
- a focused test or benchmark;
- no regression in the acceptance rows.

Candidates:

- exact transition identity;
- plain Cell Grid fill/border split;
- non-invasive diagnostics;
- geometry correctness tests.

## Acceptance Rows

Run release `/play?bench=1` on map `First Symmetry-6_April 17b`.

Modes:

- Cell Grid
- Phase Edges
- Ember Lattice
- Phase Field
- Power Voronoi Runtime
- Metaball
- Perimeter

Scenarios:

- gameplay
- capture transition
- mode switch
- forced input pressure

Report:

- p50, p95, p99, worst frame time
- slow-frame counts
- pending-display time
- commit lag, meaning time from update request to finished display
- screenshots for key modes

No means. Means hide spikes.

## Final Product Gate

The recovery branch is not acceptable unless all are true:

1. No stale visible conquest territory.
2. Mode switching does not leave territory pending for hundreds of milliseconds.
3. Current master fixes are preserved.
4. Deterministic replay hash remains unchanged unless a deliberate rule change is explicitly approved.
5. Primary modes match or beat current master on user-visible behavior.
6. Any remaining slower row has a named cause or a bounded follow-up, not a vague performance claim.

## Immediate Next Action

Create a fresh recovery worktree from latest master only after review phase is closed or product-code implementation is explicitly resumed.

Until then, continue review by documenting evidence and isolating causes in disposable worktrees only.
