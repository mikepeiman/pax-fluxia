# Territory Review Phase 0 Update 15

Timestamp: 2026-06-29T17:33:03-04:00

Scope: review only. No product-code fix was committed.

## Question

Does the Cell Grid fill/border split make Phase Edges or Ember Lattice slower when late territory display is removed?

Why this question matters: Phase Edges and Ember Lattice use the Cell Grid render-family implementation, so the earlier Cell Grid-only verdict was incomplete for these two user-facing modes.

## Isolation Setup

Base for this experiment: the disposable worktree with the known-bad late-display rules removed. This base already had pending territory wait at zero.

Attempted first: `git revert --no-commit ae471a6c2`. It failed because the disposable worktree already had local `GameCanvas.svelte` edits for the scheduler isolation. I did not force it.

Corrected experiment: reverse only the renderer-file part of `ae471a6c2` by restoring `pax-fluxia/src/lib/territory/families/cellGrid/CellGridFamily.ts` to the parent of that commit. No later commits touched that file, so this was a clean renderer-file isolation. The file was restored afterward so the disposable worktree returned to the split-kept base.

## Measurement

Release build, player route `/play?bench=1`, map `First Symmetry-6_April 17b`, 8 runs per row, 3000ms measured window, 500ms warmup.

Artifacts:

- Split kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-19-06-056Z.json`
- Renderer-file split reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-28-43-093Z.json`

## Results

| Row | Split kept frame p50/p95/p99/worst | Split kept >33ms | Split reverted frame p50/p95/p99/worst | Split reverted >33ms |
| --- | ---: | ---: | ---: | ---: |
| Ember Lattice gameplay | 25.0 / 41.7 / 50.1 / 133.3ms | 108 / 921 | 41.6 / 58.3 / 91.4 / 175.0ms | 457 / 571 |
| Ember Lattice transition | 25.1 / 50.0 / 91.7 / 183.4ms | 261 / 714 | 41.7 / 59.1 / 133.5 / 175.5ms | 471 / 551 |
| Phase Edges gameplay | 24.9 / 33.4 / 50.0 / 133.2ms | 80 / 1147 | 33.3 / 49.2 / 66.7 / 208.1ms | 285 / 875 |
| Phase Edges transition | 16.8 / 33.3 / 83.4 / 108.4ms | 40 / 1098 | 33.4 / 58.8 / 141.9 / 191.7ms | 330 / 632 |

Pending territory wait was zero in both versions. This experiment measured render cost, not stale display.

## Observation

Reverting the renderer part of the fill/border split made all four Phase Edges / Ember Lattice rows worse. The most severe example was Ember Lattice gameplay: frames slower than 33ms increased from 108 / 921 to 457 / 571.

## Verdict

`ae471a6c2` renderer-file split is `KEEP` for Phase Edges and Ember Lattice performance.

This does not prove every file in that commit is valuable. It does prove the core renderer split should not be blamed for the current heavy-mode cost.

## Next Review Target

The remaining heavy-mode cost is more likely in transition lifecycle, immediate presentation wiring, or other render-family update paths. Continue with the next smallest isolated unit, not with a broad revert.
