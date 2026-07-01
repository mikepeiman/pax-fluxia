# Territory Review Phase 0 Update 20: Mode Switching And Phase/Ember Cost

Timestamp: 2026-06-29T18:05:00-04:00

Scope: review-only measurement. No product-code fix was made.

## What Was Measured

Three release-build player-route runs were compared:

- Original baseline: `3ddd95386f09933094038d213f16c3b99591f0e6`
- Current master comparison worktree: `c2e9afb7a7eb44f9cb0cfa343003e7f6b16a0ffc`
- Review branch: `codex/territory-overnight-integration` at `4cec041bd`

Scenario: switch into a territory render mode on `/play?bench=1`, with map `First Symmetry-6_April 17b`.

Each row used 5 runs, 2500ms measured window, 500ms warmup.

Artifacts:

- Baseline: `C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-00-21-973Z.json`
- Current master: `C:\Users\mikep\.codex\worktrees\territory-compare-master-current-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-02-57-587Z.json`
- Review branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-57-41-013Z.json`

## Main Finding

Mode switching is now a clearer reproduction of the user's complaint than steady-state gameplay.

Plain English: changing modes can leave a prepared territory picture waiting before it appears. That can feel like the game is stale or hitching even when most frame timings look acceptable.

| Mode switch target | Baseline p95/p99/worst frame | Master p95/p99/worst frame | Review p95/p99/worst frame | Review pending wait median/worst |
| --- | ---: | ---: | ---: | ---: |
| Cell Grid | 8.6 / 16.7 / 25.1ms | 8.4 / 16.7 / 41.8ms | 17.5 / 25.4 / 42.5ms | 91.8 / 158.7ms |
| Phase Edges | 8.5 / 9.1 / 41.7ms | 8.5 / 16.7 / 33.3ms | 8.5 / 16.7 / 58.3ms | 0.7 / 718.4ms |
| Ember Lattice | 8.6 / 9.4 / 41.7ms | 8.5 / 9.3 / 33.4ms | 8.4 / 9.1 / 41.6ms | 0 / 95.9ms |
| Phase Field | 8.5 / 9.1 / 41.8ms | 8.5 / 9.0 / 33.3ms | 8.6 / 9.1 / 42.8ms | 0 / 35.4ms |
| Power Voronoi | 9.1 / 16.8 / 50.1ms | 9.2 / 16.8 / 33.3ms | 16.6 / 16.8 / 41.7ms | 0 / 0ms |

Verdict: mode switching must be included in the final acceptance gate. A plan that only improves steady gameplay and transition rows can still leave the app feeling worse.

## Phase Edges / Ember Lattice Cost Split

Existing benchmark artifacts already separate some costs:

- `territory.geometry0319.compute`: prepares resolved territory geometry.
- `territory.phaseEdges.buildPlanForCapturedSession`: prepares the capture-transition plan for a conquered star.
- `game.pixi.render.stage`: Pixi's actual render pass.
- `game.frameLoop.renderFrame`: the app's frame update work.

Observation from the stale-display isolation run:

| Row | Review pending wait median/worst | Immediate-display frame p95/p99/worst | Immediate-display key costs |
| --- | ---: | ---: | --- |
| Phase Edges gameplay | 162.4 / 343.0ms | 49.9 / 50.2 / 209.0ms | geometry compute p50 45.3ms; transition plan p50 40.7ms; Pixi render p50 41.0ms |
| Phase Edges transition | 151.6 / 224.9ms | 58.1 / 141.3 / 216.4ms | geometry compute p50 46.2ms; transition plan p50 39.5ms; Pixi render p50 47.4ms |
| Ember Lattice gameplay | 142.4 / 226.4ms | 59.5 / 74.9 / 142.0ms | geometry compute p50 38.9ms; Pixi render p50 53.7ms |
| Ember Lattice transition | 281.1 / 558.0ms | 58.8 / 133.3 / 183.8ms | geometry compute p50 42.2ms; transition plan p50 38.8ms; Pixi render p50 45.5ms |

Plain English: the review branch often hides a heavy territory update by showing it late. If late display is removed, the player sees the correct ownership promptly, but one frame can still be too expensive. Both problems need separate fixes.

## Fixed-Board Identity Measurement Note

The fixed-board work is supposed to avoid repeatedly reading the physical board shape. The physical board shape is immutable after game start, so repeated shape reading is not useful during normal play.

Current measured cost on the review branch is low:

- In the broad 70-run player-route artifact `review-release-gameplay-benchmark-2026-06-29T19-50-22-108Z.json`, the final counter showed 141 physical-board reads and 30.6ms total read time across the whole benchmark page lifetime.
- In the focused Phase/Ember artifact `review-release-gameplay-benchmark-2026-06-29T21-15-28-244Z.json`, the final counter showed 64 physical-board reads and 16.1ms total read time.

Important instrument correction: these counters are cumulative page-lifetime counters. Summing every row double-counts the same page-lifetime work. Use the final counter snapshot, not the sum of row snapshots.

Isolation attempt: a disposable worktree was created at `C:\Users\mikep\.codex\worktrees\territory-isolate-fixed-board-key-20260629`. A direct reverse patch of the fixed-board commits did not apply cleanly because later edits moved the affected code. No product-code conclusion is drawn from that failed patch.

Verdict: keep this unit open. Source inspection and current counters suggest it is not the main jank cause, but it still needs either a clean isolation or a narrower acceptance rule: ownership changes must update territory; physical board identity must remain stable during a game.

## Updated Acceptance Gates

The next product-phase plan must pass all of these gates:

1. Mode switching must not leave visible territory pending for hundreds of milliseconds.
2. Conquest must show current ownership promptly.
3. Phase Edges and Ember Lattice must not trade correctness for late display.
4. Heavy Phase/Ember work must be split into: transition setup, scene generation, Pixi object mutation, and Pixi render pass.
5. Physical-board identity work must be checked only against immutable board shape and ownership correctness, not against imaginary in-game board movement.
