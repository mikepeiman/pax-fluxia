# Territory Review Phase 0 - Update 09

Timestamp: 2026-06-29T15:48:01-04:00

Mode: review only. No product fix was committed.

## Question Tested

Does the integration branch make conquest territory updates arrive late because conquest frames are routed through a background task instead of being shown immediately?

Plain English:

- A conquest territory update is the visible territory change after a star changes owner.
- A background task is work the browser is allowed to run later than visible work.
- Pending age means a prepared territory picture is waiting before it appears.
- Commit lag means delay before the prepared territory picture is actually applied to the game view.

## Fresh Three-Way Measurement

All rows used release builds, `/play?bench=1`, map `First Symmetry-6_April 17b`, 8 runs, 3000ms measured window, 500ms warmup.

Artifacts:

- Baseline: `C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-35-07-082Z.json`
- Current master: `C:\Users\mikep\.codex\worktrees\territory-compare-master-current-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-37-08-692Z.json`
- Integration branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-39-12-118Z.json`

| Mode | Baseline pending age median/worst | Master pending age median/worst | Integration pending age median/worst | Integration schedule modes |
| --- | ---: | ---: | ---: | --- |
| Cell Grid transition | 0 / 0ms | 0 / 0ms | 324.9 / 682.8ms | immediate, background |
| Phase Field transition | 0 / 0ms | 0 / 0ms | 78.4 / 143.0ms | immediate, background |

Observation: the integration branch repeatedly has prepared territory frames waiting. Baseline and current master do not in this probe.

## Isolated Revert Test

Disposable worktree:

`C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629`

Only `pax-fluxia/src/lib/components/game/GameCanvas.svelte` was changed. The isolated change removed the stricter conquest queue bypass added by `d2ac9d771a perf(territory): keep conquest geometry off render frame`.

Artifact:

`C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-45-34-662Z.json`

| Mode | Integration pending age median/worst | Isolated revert pending age median/worst | Integration commit lag median/worst | Isolated revert commit lag median/worst |
| --- | ---: | ---: | ---: | ---: |
| Cell Grid transition | 324.9 / 682.8ms | 0 / 0ms | 460.5 / 542.1ms | 6.5 / 21.2ms |
| Phase Field transition | 78.4 / 143.0ms | 0 / 0ms | 176.2 / 241.5ms | 25.8 / 63.3ms |

Additional result: deterministic replay hash stayed unchanged on the isolated revert:

`9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`

## Verdict

`REVERT` for the conquest-presentation part of `d2ac9d771a`, unless it is rewritten with a different design.

Evidence: reverting that small unit alone removes the branch-only waiting territory frames in both tested modes, while preserving the deterministic game-rule replay hash.

This does not prove every regression is solved. It proves one important cause of the bad transition feel: the branch often prepared the territory change, then let it sit before showing it.

## Next Review Target

Continue isolating the rest of Unit 12:

1. `4c847ca20` input-pressure presentation yielding.
2. `d2ac9d771a` remaining render-frame timing intent, separated from the bad conquest queue rule.
3. `e33ba4e1e` conquest flash rendering change.
4. `ae471a6c2` Cell Grid fill/border split.

Do not ship the dirty product-fix branch yet. It contains multiple unproven ideas mixed together.
