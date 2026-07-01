# Territory Review Phase 0 - Update 11

Timestamp: 2026-06-29T16:18:30-04:00

Mode: review only. No product fix was committed.

## Unit Tested

`ae471a6c2 perf(territory): split cell grid fills from borders`

Plain English: this change lets Cell Grid draw territory fills and territory borders through separate drawing paths in some cases. The intended benefit is less work during Cell Grid transitions.

## Test Setup

This was tested on top of the disposable worktree where the proven bad conquest queue rule was already reverted:

`C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629`

Reason: if the stale-update delay is still present, it can hide real Cell Grid frame cost.

Both versions used:

- Release build.
- `/play?bench=1`.
- Map: `First Symmetry-6_April 17b`.
- Mode: Cell Grid.
- Scenarios: gameplay and conquest transition.
- 8 runs per row, 3000ms measured window, 500ms warmup.

Artifacts:

- Split reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-08-31-694Z.json`
- Split kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-12-02-015Z.json`

Screenshots inspected:

- Split reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\screenshots-2026-06-29T20-08-31-694Z\cell_grid.transition.png`
- Split kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\screenshots-2026-06-29T20-12-02-015Z\cell_grid.transition.png`

Observation from screenshots: both versions show visible Cell Grid territory. I did not see an obvious blanking or missing-territory failure.

## Measurements

| Row | Split reverted p95/p99/worst frame | Split kept p95/p99/worst frame | Pending age |
| --- | ---: | ---: | ---: |
| Cell Grid gameplay | 8.5 / 33.3 / 125.1ms | 18.0 / 33.3 / 125.1ms | 0ms in both |
| Cell Grid transition | 25.1 / 50.0 / 116.7ms | 25.0 / 33.2 / 141.6ms | 0ms in both |

Interpretation:

- Transition: keeping the split improved the run-median p99 frame time from 50.0ms to 33.2ms.
- Gameplay: keeping the split worsened run-median p95 from 8.5ms to 18.0ms, while p99 stayed the same and the worst frame stayed the same.
- This unit does not cause the stale territory presentation problem. Pending age stayed at 0ms in both versions once the bad conquest queue rule was removed.

## Verdict

`KEEP-WITH-FOLLOWUP`

Evidence: the split improved Cell Grid transition tail timing in the isolated A/B test, and screenshots did not show an obvious visual failure.

Follow-up: the gameplay p95 regression needs another pass before this is considered a clean win. The next check should inspect why the split-kept gameplay run has more 16-25ms frames even though transition p99 improves.
