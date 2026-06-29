# Territory Review Phase 0 Update 23 - Scheduler Priority Isolation

Timestamp: 2026-06-29 18:49:04 -04:00

Scope: disposable isolation experiment. No product-code fix was committed.

## Question

Is the review branch worse mainly because visible territory updates are scheduled as browser background work?

Plain English: I tested whether changing the browser task priority from "background" to "user-visible" reduces the delay before the map shows updated territory.

## Disposable Worktree

Path:

`C:\Users\mikep\.codex\worktrees\territory-isolate-scheduler-user-visible-20260629`

Base commit:

`0db775cc66fa8263ba80970fbbd9bfc3a3a16457`

Only intended source edit:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- changed territory presentation scheduling from `priority: "background"` to `priority: "user-visible"`
- changed the diagnostic schedule label from `scheduler-background` to `scheduler-user-visible`

Definition: `user-visible` means the browser should treat the work as visible to the user, instead of background work that may wait longer.

## Build And Replay Check

The disposable worktree was built before measurement.

Build result:

- `bun install --frozen-lockfile`: passed
- `bun run build`: passed, with existing warnings

Deterministic replay result:

- final hash: `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`

This matches prior baseline/review hashes. The scheduler-priority edit did not change simulated game rules in this replay.

## Transition Diagnostic Result

`pending display age` means: how long a prepared territory update waited before being shown.

| Mode | Review branch pending display age | User-visible priority pending display age |
| --- | ---: | ---: |
| Phase Edges transition diagnostic | median 249.8 ms, worst 263.0 ms | median 9.5 ms, worst 10.0 ms |
| Ember Lattice transition diagnostic | median 159.5 ms, worst 268.8 ms | median 9.0 ms, worst 10.9 ms |
| Phase Field transition diagnostic | median 153.1 ms, worst 199.9 ms | median 4.0 ms, worst 10.9 ms |
| Power Voronoi Runtime transition diagnostic | median 1.4 ms, worst 12.3 ms | median 1.3 ms, worst 1.3 ms |

Observation: changing only the browser task priority removed most of the delayed-display problem in Phase Edges, Ember Lattice, and Phase Field.

## Tradeoff

The heavy frame becomes visible again when the update is no longer hidden behind background scheduling.

Examples:

- Phase Edges transition diagnostic frame p95/p99 changed from `25.0 / 33.4 ms` to `41.7 / 50.0 ms`.
- Ember Lattice transition diagnostic frame p95/p99 changed from `25.0 / 33.4 ms` to `41.6 / 50.0 ms`.
- Phase Field transition diagnostic frame p95/p99 changed from `16.8 / 33.3 ms` to `41.7 / 42.3 ms`.

Interpretation: background scheduling was hiding some cost by showing old territory longer. Moving to user-visible priority improves correctness of what the player sees, but it does not solve the heavy transition frame.

## Mode Switch Result

The same priority-only experiment also improved mode switching delay.

| Mode switch target | Review branch pending display age | User-visible priority pending display age |
| --- | ---: | ---: |
| Cell Grid | median 91.8 ms, worst 158.7 ms | 0 / 0 ms |
| Phase Edges | median 0.7 ms, worst 718.4 ms | 0 / 0 ms |
| Ember Lattice | median 0 ms, worst 95.9 ms | 0 / 0 ms |
| Phase Field | median 0 ms, worst 35.4 ms | 0 / 0 ms |
| Power Voronoi Runtime | 0 / 0 ms | 0 / 0 ms |

Observation: this strongly supports the claim that background scheduling is a real cause of the review branch's visible lag during mode changes.

## What This Proves

- The browser priority choice is a real contributor to delayed visible territory updates.
- Current master and the original starting point do not show this pending-display problem in the same diagnostic rows.
- A final product fix must not schedule visible conquest or mode-switch territory updates as background work.

## What This Does Not Prove

- It does not prove that user-visible priority is the final best design.
- It does not solve the heavy Phase Edges / Ember / Phase Field transition frame.
- It does not explain the Power Voronoi mode-switch p95 remaining higher than master.
- It does not justify merging the review branch into master.

## Product Direction From This Experiment

1. Correct territory ownership display should be user-visible or immediate, not background.
2. Expensive decorative transition work should be separated from the basic correct territory update.
3. If fancy transition setup is late, skip that fancy transition rather than showing stale territory.
4. Acceptance gates must check both frame timing and delayed-display timing.

## Artifacts

Transition diagnostic:

`C:\Users\mikep\.codex\worktrees\territory-isolate-scheduler-user-visible-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-45-23-340Z.json`

Mode switch:

`C:\Users\mikep\.codex\worktrees\territory-isolate-scheduler-user-visible-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-47-06-730Z.json`

Replay hash:

`C:\Users\mikep\.codex\worktrees\territory-isolate-scheduler-user-visible-20260629\.agent-harness\metrics\review-sim-replay\review-sim-replay-hash-2026-06-29T22-48-57-809Z.json`
