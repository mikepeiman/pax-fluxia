# Territory Review Phase 0 Update 18: Remediation Plan

Timestamp: 2026-06-29T17:46:22-04:00

Scope: plan from review findings. Product-code fixes still require explicit approval for product phase.

## Current Proven Findings

1. Game-rule replay stayed deterministic in the tested replay.
   Evidence: baseline, master, review branch, and isolated variants all produced replay hash `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`.

2. The clearest branch regression is late visible territory display.
   Evidence: the conquest-presentation queue change made prepared territory pictures wait hundreds of milliseconds before appearing. Removing that behavior returned pending wait to zero in tested rows.

3. Input-pressure yielding is the same class of problem.
   Evidence: it improved frame numbers under forced input pressure by delaying visible territory about 170-180ms.

4. Physical map checking is not the main current waste.
   Evidence: the measured fixed-board signature scan cost was about 0.9ms total across a focused run.

5. Phase Edges and Ember Lattice still have real immediate-display cost after stale-display rules are removed.
   Evidence: with pending wait at zero, these modes still show p95/p99 spikes. Timers point to transition setup and Pixi stage rendering.

6. `CellGridPhaseEdgesFamily.ts` owns the user-facing Phase Edges and Ember Lattice renderer, and that file was not changed by the reviewed branch.
   Evidence: direct diff from original baseline to review branch is empty for that file.

7. Disabling rich transition sessions for Phase Edges / Ember Lattice was not a sufficient fix.
   Evidence: it helped some numbers and hurt others; heavy frames remained.

## Immediate Product-Phase Plan

### Step 1: Remove Stale Territory Display

Change target: `GameCanvas.svelte` presentation queue rules.

Required behavior:

- A conquest ownership change must not wait behind background browser priority.
- Input pressure may delay optional decoration, but not the main visible territory ownership update past a strict small budget.
- If expensive transition setup is not ready, show the correct current territory first. Do not show old territory just to protect frame numbers.

Evidence gate:

- Pending territory wait stays at `0ms` or below a strict frame-sized budget in Cell Grid, Phase Field, Phase Edges, Ember Lattice, Power Voronoi, Metaball, and Perimeter.
- Replay hash stays unchanged for the existing deterministic replay.

### Step 2: Keep Correct Transition Identity

Keep or rework, not broad-revert:

- exact conquest identity by tick, star, previous owner, and new owner;
- repeated-capture protection;
- terminal-frame marking by exact transition key.

Reason: these are correctness protections. They are not yet proven as the performance cause, and broad lifecycle revert conflicted.

Evidence gate:

- repeated recapture of the same star does not end the newer transition early;
- deterministic replay remains unchanged;
- visual transition tests or harness screenshots confirm no stale previous-owner frame survives after the transition is done.

### Step 3: Make Phase Edges / Ember Lattice Transition Setup Non-Blocking

Problem to solve:

- immediate display exposes one-time transition setup costs such as `territory.phaseEdges.buildPlanForCapturedSession` and `territory.geometry0319.compute`, often in the 20-50ms range.

Preferred design:

- capture previous and current territory truth at conquest boundaries;
- build the transition plan in a worker or scheduled pre-frame task;
- while the plan is not ready, show the correct current ownership state immediately;
- if the transition plan arrives too late, skip the fancy transition for that capture rather than replaying stale territory.

Evidence gate:

- pending wait remains bounded;
- Phase Edges and Ember Lattice transition p95 improves from the current immediate-display state;
- no transition plan is built repeatedly for the same conquest session.

### Step 4: Separate Pixi Render Cost From Transition Setup

Problem to solve:

- `game.pixi.render.stage` remains a visible part of heavy-mode frame cost.

Measurement additions before deeper optimization:

- count rendered containers/sprites/graphics for Phase Edges and Ember Lattice;
- sample Pixi texture/render-target churn;
- capture screenshots for each variant so a faster row cannot hide blank or stale territory.

Evidence gate:

- frame-time improvement is paired with screenshot-visible correct territory;
- no blank Phase Edges / Ember Lattice frames during mode switch or capture transition.

### Step 5: Reassemble A Clean Keep-Set

Keep now, with evidence:

- review benchmark and replay harnesses;
- route `/play?bench=1` player-path measurement;
- pending-display sampler;
- plain Cell Grid fill/border split remains `KEEP-WITH-FOLLOWUP` for plain Cell Grid only.

Revert or rewrite now, with evidence:

- conquest presentation background scheduling from `d2ac9d771a`: `REVERT`;
- input-pressure visible territory delay from `4c847ca20`: `REWRITE / ISOLATE`;
- conquest flash split from `e33ba4e1e`: `REVERT-AND-BACKLOG` as a performance change unless a visual reason promotes it.

Do not broad-revert yet:

- exact transition identity;
- rich transition sessions;
- geometry correctness or oracle work;
- render-family cache work, unless a fresh isolated measurement shows harm.

## Final Acceptance Gates

Run release `/play?bench=1`, map `First Symmetry-6_April 17b`, 8+ runs per row:

- modes: Cell Grid, Phase Field, Phase Edges, Ember Lattice, Power Voronoi, Metaball, Perimeter;
- scenarios: gameplay, transition, mode switch, forced input pressure;
- report p50/p95/p99/worst, slow-frame counts, pending wait, commit lag;
- no means;
- include screenshots for Phase Edges, Ember Lattice, Cell Grid, and Phase Field transition states.

Required outcome:

- no stale visible conquest territory;
- review keep-set beats or matches original baseline and current master on primary modes;
- any remaining slower row has a named owner and a follow-up plan, not hidden behind delayed display.

## Work Order

1. Create a product-fix worktree from the current review branch.
2. Apply the stale-display removal first.
3. Run the deterministic replay and focused transition benchmark.
4. Add the non-blocking Phase Edges / Ember transition-plan path.
5. Remeasure Phase Edges / Ember.
6. Only then broaden to all primary modes.

Do not spend the next product pass on Distance Field / Grid Gradient unless the shared scheduler fix improves it for free.
