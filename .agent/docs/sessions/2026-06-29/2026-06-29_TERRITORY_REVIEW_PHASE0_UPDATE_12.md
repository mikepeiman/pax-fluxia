# Territory Review Phase 0 Update 12: Conquest Flash Drawing Isolation

Timestamp: 2026-06-29T16:37:21-04:00

Review phase only. No product fix is proposed here.

Plain-English definition: the conquest flash is the brief white pulse drawn over a star after it is captured.

## Question

Is the conquest-flash split necessary or beneficial enough to keep as a performance change?

## Boundary

Change-unit tested: `e33ba4e1e perf(stars): move conquest flash off base redraws`.

Files touched by that unit:

- `pax-fluxia/src/lib/renderers/StarRenderer.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

The test used the disposable worktree that already had the proven bad conquest-queue rule reverted. I measured the flash split kept versus the flash split reverted on that same base.

## Verification

Build: the isolated flash-reverted disposable worktree passed `bun run build`.

Game-rule output: unchanged in the deterministic replay.

- Replay hash: `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`
- Replay artifact: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-sim-replay\review-sim-replay-hash-2026-06-29T20-37-04-074Z.json`

Visual check: paired screenshots showed the same visible board state at the sampled moment; I did not observe blank or missing territory.

## Measurement

Release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, seven primary territory modes, gameplay and transition windows, 5 runs per row, 2500ms measured window, 500ms warmup.

Artifacts:

- Flash kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-19-25-178Z.json`
- Flash reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-28-36-630Z.json`

Representative frame timing:

| Row | Flash kept p95/p99/worst | Flash reverted p95/p99/worst |
| --- | ---: | ---: |
| Cell Grid gameplay | 16.8 / 17.5 / 33.3ms | 16.8 / 17.2 / 33.4ms |
| Cell Grid transition | 25.0 / 33.3 / 108.6ms | 25.1 / 33.4 / 108.9ms |
| Phase Edges transition | 33.3 / 42.4 / 109.1ms | 33.5 / 50.0 / 116.7ms |
| Ember Lattice transition | 33.3 / 50.0 / 108.4ms | 33.3 / 50.0 / 133.4ms |
| Phase Field transition | 8.6 / 16.8 / 75.0ms | 8.5 / 16.7 / 75.3ms |

Star-render timing from the captured performance measures stayed small in both versions. In the transition rows I checked, `game.renderFrame.stars` was usually under 1ms at p95/p99. Examples:

| Row | Flash kept star p95/p99 | Flash reverted star p95/p99 |
| --- | ---: | ---: |
| Cell Grid transition | 0.8 / 0.8ms | 0.7 / 1.1ms |
| Phase Edges transition | 0.8 / 0.8ms | 0.8 / 0.8ms |
| Ember Lattice transition | 0.8 / 0.8ms | 0.8 / 0.9ms |
| Phase Field transition | 0.5 / 0.6ms | 0.5 / 0.5ms |

## Observations

- This unit is not the cause of the broad user-visible jank. Reverting it alone did not remove the remaining frame-cost problem.
- The measured star-render work is too small to be a credible explanation for all-mode smoothness loss.
- The flash split may help a narrow tail case, especially Phase Edges transition p99 in this 5-run sample, but that is not enough evidence to justify it as a core performance fix.
- The change adds extra graphics objects and cache state for a short visual effect. That extra state may still be fine, but the performance justification is weak.

## Verdict

`REVERT-AND-BACKLOG` as a performance change.

Evidence: in a broad 5-run A/B test, most frame percentiles were unchanged, star-render timing stayed under about 1ms at p95/p99 in checked transition rows, and the change did not address the remaining jank after the proven bad queue rule was removed.

This is not a verdict that the flash split is visually wrong. It is a verdict that it has not earned a place in the keep-set as a performance improvement.

## Next Target

Continue Unit 12 review with input-pressure yielding and presentation throttling. That area can affect every mode because it controls when visible work is allowed to run.
