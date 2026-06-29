# Territory Review Phase 0 Update 14

Timestamp: 2026-06-29T17:24:36-04:00

Scope: review only. No product-code fix was made in this update.

## Question

After removing the already-proven late territory display behavior, do Phase Edges and Ember Lattice still have real render cost, or was the problem only late display?

Plain-English definitions:

- `p95` / `p99`: 95% / 99% of measured frames were at or below that time.
- `>33ms`: frames slower than about 30 frames per second.
- `pending wait`: a prepared territory picture was ready but had not appeared on screen yet.
- `commit lag`: time from queueing a territory picture to finishing its display.

## Measurement

Release build, player route `/play?bench=1`, map `First Symmetry-6_April 17b`, 8 runs per row, 3000ms measured window, 500ms warmup.

Artifacts:

- Original baseline: `C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-07-57-923Z.json`
- Current master: `C:\Users\mikep\.codex\worktrees\territory-compare-master-current-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-11-44-465Z.json`
- Review branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-15-28-244Z.json`
- Disposable isolation state: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T21-19-06-056Z.json`

The disposable isolation state has the known-bad delayed conquest display removed and the input-pressure display delay removed. It is not a clean proposed patch.

## Results

### Ember Lattice Gameplay

| Version | Frame p50/p95/p99/worst | >33ms frames | Pending wait median/worst | Commit lag median/worst |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 24.5 / 25.6 / 42.0 / 99.9ms | 34 / 1098 | 0 / 0ms | 10.4 / 75.2ms |
| Current master | 25.0 / 41.6 / 58.5 / 215.4ms | 98 / 878 | 0 / 0ms | 87.9 / 108.2ms |
| Review branch | 8.4 / 33.2 / 33.4 / 141.6ms | 69 / 1746 | 142.4 / 226.4ms | 151.6 / 255.6ms |
| Isolation state | 25.0 / 41.7 / 50.1 / 133.3ms | 108 / 921 | 0 / 0ms | 23.4 / 84.0ms |

### Ember Lattice Transition

| Version | Frame p50/p95/p99/worst | >33ms frames | Pending wait median/worst | Commit lag median/worst |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 24.9 / 26.3 / 108.4 / 149.9ms | 47 / 1052 | 0 / 0ms | 108.7 / 125.5ms |
| Current master | 25.0 / 50.0 / 116.7 / 199.9ms | 96 / 843 | 0 / 0ms | 38.2 / 133.2ms |
| Review branch | 8.4 / 32.6 / 41.6 / 108.5ms | 56 / 1868 | 281.1 / 558.0ms | 315.2 / 464.6ms |
| Isolation state | 25.1 / 50.0 / 91.7 / 183.4ms | 261 / 714 | 0 / 0ms | 90.8 / 145.1ms |

### Phase Edges Gameplay

| Version | Frame p50/p95/p99/worst | >33ms frames | Pending wait median/worst | Commit lag median/worst |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 16.7 / 25.1 / 41.1 / 166.0ms | 30 / 1448 | 0 / 0ms | 21.8 / 101.5ms |
| Current master | 16.8 / 26.1 / 42.5 / 158.3ms | 39 / 1305 | 0 / 0ms | 17.1 / 86.1ms |
| Review branch | 16.7 / 33.3 / 41.7 / 133.4ms | 69 / 1579 | 162.4 / 343.0ms | 108.9 / 131.4ms |
| Isolation state | 24.9 / 33.4 / 50.0 / 133.2ms | 80 / 1147 | 0 / 0ms | 26.8 / 118.8ms |

### Phase Edges Transition

| Version | Frame p50/p95/p99/worst | >33ms frames | Pending wait median/worst | Commit lag median/worst |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 16.7 / 25.1 / 33.5 / 133.4ms | 29 / 1281 | 0 / 0ms | 16.6 / 21.7ms |
| Current master | 24.3 / 33.1 / 108.4 / 175.0ms | 45 / 1080 | 0 / 0ms | 100.0 / 117.7ms |
| Review branch | 16.6 / 25.1 / 33.5 / 108.4ms | 34 / 1530 | 151.6 / 224.9ms | 261.0 / 385.5ms |
| Isolation state | 16.8 / 33.3 / 83.4 / 108.4ms | 40 / 1098 | 0 / 0ms | 63.6 / 88.2ms |

## Observations

1. The review branch still makes prepared territory wait before it appears in Phase Edges and Ember Lattice. The worst pending wait in this focused run was 558ms.
2. The review branch can look better in raw frame timing because it delays the work that would show the new territory. That is not a real UX win if the player sees stale territory.
3. Removing the late-display rules makes pending wait return to zero in this isolation state, but it exposes real render cost in Ember Lattice and Phase Edges.
4. The isolation state is not a final answer. It proves the late-display rules are hiding work, not eliminating it.
5. Distance Field / Grid Gradient remains janky, but it is not the primary target for the next correction pass unless it shares the same delayed-display failure.

## Verdict Update

- `d2ac9d771a` conquest presentation background scheduling remains `REVERT` as shipped. Evidence: pending wait returns from hundreds of milliseconds to zero when that behavior is removed.
- `4c847ca20` input-pressure yielding remains `REWRITE / ISOLATE`. Evidence: it can improve frame numbers by delaying visible territory, which is the wrong tradeoff for conquest truth.
- Heavy-mode render cost after immediate display remains an open investigation. It is observed, but not yet attributed to one specific geometry or renderer change.

## Corrective Plan For Product Phase

1. First remove or gate the late-display behavior for conquest territory. Visible conquest truth should not wait behind background browser priority.
2. Replace input-pressure behavior with a bounded rule: user input can delay optional decoration, but not the main territory ownership update past a strict small budget.
3. Then optimize the immediate heavy-mode render path. Phase Edges and Ember Lattice need work that reduces actual render cost, not a scheduler rule that hides it.
4. Treat Distance Field / Grid Gradient as a separate lower-priority performance project unless a shared scheduler fix improves it for free.
5. Reassemble a clean keep-set and remeasure against original baseline and current master before accepting any branch.

## Next Review Target

Find which retained changes make immediate Phase Edges or Ember Lattice heavier than the original baseline. Current hypothesis: the cost is not from physical map checking; that was measured as tiny. This remains unproven until isolated.
