# Territory Review Phase 0 Update 13: Input-Pressure Presentation Isolation

Timestamp: 2026-06-29T17:02:08-04:00

Review phase only. The product-code edits described here were made only in the disposable isolation worktree.

Plain-English definitions:

- Input pressure: the browser reports that user input is waiting to be handled.
- Yielding: the render loop stops some visible work and lets it happen later.
- Pending age: how long a prepared territory picture waits before being shown.

## Boundary

Change-unit tested: `4c847ca20 perf(territory): yield presentation during input pressure`.

This unit changes whether presentation work can wait while input is pending.

## Measurement Harness Added

I added a measurement-only scenario to `tools/debug/review-release-gameplay-benchmark.ts`:

- Scenario name: `input_pressure`
- It temporarily installs a synthetic `navigator.scheduling.isInputPending()` function.
- It records whether the synthetic input signal installed successfully.
- It restores the browser object after the measurement window.

Smoke artifact:

- `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-41-46-789Z.json`

Smoke result: valid. The synthetic input signal installed, reported active, the scheduler recorded `browser_input_pending`, and the signal restored afterward.

## Discarded Run

Discarded artifact:

- `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-44-16-704Z.json`

Reason: while preparing this isolation, I found that the disposable queue-rule revert had left one `inputHoldActive` reference without its local variable in the input-pressure path. The earlier idle and transition measurements did not exercise that path, but the new synthetic input-pressure scenario could. I corrected the disposable measurement state and reran the kept side.

## Verification

Builds:

- Corrected 4c-kept disposable state passed `bun run build`.
- 4c-reverted disposable state passed `bun run build`.

Game-rule output: unchanged in the deterministic replay.

- Replay hash: `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`
- Replay artifact: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-sim-replay\review-sim-replay-hash-2026-06-29T21-01-52-651Z.json`

## Measurement

Release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, seven primary territory modes, `input_pressure` scenario, 5 runs per row, 2500ms measured window, 500ms warmup.

Artifacts:

- 4c kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-50-43-052Z.json`
- 4c reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-57-39-608Z.json`

Representative rows:

| Row | 4c kept frame p95/p99/worst | 4c kept pending median/worst | 4c reverted frame p95/p99/worst | 4c reverted pending median/worst |
| --- | ---: | ---: | ---: | ---: |
| Cell Grid | 16.8 / 17.3 / 25.1ms | 169.7 / 175.8ms | 16.8 / 17.8 / 33.3ms | 0 / 0ms |
| Phase Edges | 8.5 / 16.7 / 33.4ms | 175.5 / 178.9ms | 33.5 / 42.0 / 84.1ms | 0 / 0ms |
| Ember Lattice | 8.5 / 16.7 / 25.1ms | 173.2 / 176.2ms | 33.4 / 50.0 / 75.0ms | 0 / 0ms |
| Phase Field | 8.5 / 8.7 / 41.6ms | 175.6 / 176.7ms | 8.5 / 8.6 / 33.4ms | 0 / 0ms |
| Power Voronoi | 8.4 / 8.5 / 41.8ms | 175.9 / 176.4ms | 16.6 / 16.8 / 33.4ms | 0 / 0ms |
| Perimeter Field | 8.5 / 8.6 / 33.3ms | 175.8 / 179.2ms | 16.6 / 16.8 / 33.4ms | 0 / 0ms |
| Metaball | 8.4 / 8.5 / 41.8ms | 173.3 / 175.9ms | 8.5 / 16.7 / 33.5ms | 0 / 0ms |

Scheduler behavior:

- 4c kept: yielded about 33 to 49 times per run and used delayed/background scheduling.
- 4c reverted: yielded 0 times and used immediate scheduling.

## Observations

- The input-pressure unit makes heavy modes look smoother under input pressure by letting visible territory updates wait.
- The waiting time is not small: about 170ms to 180ms pending age in this test.
- Reverting the unit removes that waiting, but exposes the real render cost in heavy modes such as Phase Edges and Ember Lattice.
- This is not a clean keep and not a clean revert. It proves the next fix cannot be "delay visible work until the frame table looks better." The actual render cost still has to be reduced.

## Verdict

`REWRITE / ISOLATE`.

Evidence: with 4c kept, Phase Edges input-pressure p99 improved from 42.0ms to 16.7ms, but pending territory age rose from 0ms to 175.5ms median. Ember Lattice p99 improved from 50.0ms to 16.7ms, but pending age rose from 0ms to 173.2ms median.

The current unit should not be treated as a core performance win. It smooths the frame table by delaying visible state. A safer design needs to keep input responsive without delaying conquest/territory truth.

## Next Target

Continue from the exposed render-cost problem:

1. Isolate Phase Edges and Ember Lattice render cost under immediate presentation.
2. Keep the queue-rule revert as a proven correction for stale territory.
3. Treat input-pressure yielding as a gated experiment until it can prove bounded delay and no stale conquest presentation.
