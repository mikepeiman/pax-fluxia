# Territory Review Phase 0 - Update 10

Timestamp: 2026-06-29T16:01:30-04:00

Mode: review only. No product fix was committed.

## Broad Check After The Isolated Revert

Question: if the proven-bad conquest queue rule is removed, does the improvement apply beyond Cell Grid and Phase Field transitions?

Test setup:

- Release builds.
- `/play?bench=1`.
- Map: `First Symmetry-6_April 17b`.
- Modes: Cell Grid, Phase Field, Phase Edges, Ember Lattice, Power Voronoi, Metaball, Perimeter.
- Scenarios: gameplay and conquest transition.
- 5 runs per row, 2500ms measured window, 500ms warmup.

Artifacts:

- Integration branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-50-22-108Z.json`
- Isolated revert: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-57-30-350Z.json`

## Main Finding

The isolated revert removed late pending territory updates in every tested row.

Plain English: with the current integration branch, many modes prepare the next territory picture and then wait before showing it. With the isolated revert, those waits go to zero in this benchmark.

| Row | Integration pending age median/worst | Isolated revert pending age median/worst |
| --- | ---: | ---: |
| Cell Grid gameplay | 0 / 0ms | 0 / 0ms |
| Cell Grid transition | 204.0 / 380.6ms | 0 / 0ms |
| Ember Lattice gameplay | 69.2 / 271.4ms | 0 / 0ms |
| Ember Lattice transition | 103.4 / 178.0ms | 0 / 0ms |
| Metaball gameplay | 0 / 28.2ms | 0 / 0ms |
| Metaball transition | 16.8 / 65.5ms | 0 / 0ms |
| Perimeter gameplay | 0 / 2.0ms | 0 / 0ms |
| Perimeter transition | 7.3 / 151.5ms | 0 / 0ms |
| Phase Edges gameplay | 68.0 / 164.8ms | 0 / 0ms |
| Phase Edges transition | 60.1 / 92.9ms | 0 / 0ms |
| Phase Field gameplay | 0 / 0ms | 0 / 0ms |
| Phase Field transition | 8.0 / 41.6ms | 0 / 0ms |
| Power Voronoi gameplay | 0 / 1.7ms | 0 / 0ms |
| Power Voronoi transition | 7.4 / 102.9ms | 0 / 0ms |

## Important Tradeoff

Removing the delay does not magically make all rendering work cheap. In some modes, frame spikes become larger because the game is no longer hiding territory work behind delayed presentation.

Examples from the same broad run:

| Row | Integration p99 frame | Isolated revert p99 frame | Interpretation |
| --- | ---: | ---: | --- |
| Phase Edges gameplay | 33.4ms | 41.7ms | Immediate territory update exposes remaining render cost. |
| Phase Edges transition | 33.8ms | 42.7ms | Same issue during capture transition. |
| Ember Lattice gameplay | 33.5ms | 49.9ms | Late update is removed, but a separate frame-cost problem remains. |
| Ember Lattice transition | 41.7ms | 49.6ms | Late update is removed, but this mode still needs render-cost work. |

This changes the recovery plan:

1. Do not keep the conquest queue rule as-is. It creates visible stale territory.
2. Do not claim the isolated revert is the complete fix. It reveals remaining render work.
3. The next product plan should pair the revert/rewrite with focused render-cost work on Phase Edges, Ember Lattice, and Cell Grid transition geometry.

## Verdict Status

The `REVERT` verdict for the conquest-presentation part of `d2ac9d771a` still stands.

The full performance target remains open: after removing delayed presentation, the app must still reduce the actual territory work that causes frame spikes.
