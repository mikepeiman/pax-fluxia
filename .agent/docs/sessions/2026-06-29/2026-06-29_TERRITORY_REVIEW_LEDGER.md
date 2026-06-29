# Territory Review Ledger

Timestamp started: 2026-06-29T12:00:00-04:00

Mode: review only. Product-code fixes are forbidden until the plan is approved.
New tests, benchmarks, or harnesses are allowed because they improve measurement.

## Ground Rules

- Do not claim a regression cause without isolating it.
- Do not report averages. Use p50, p95, p99, maximum frame time, and counts.
- Prefer `REVERT-AND-BACKLOG` when value cannot be proven cheaply.
- Treat the user's live visual report as ground truth when it conflicts with an automated number.
- Board physical geometry is immutable after a game starts. Ownership changes can change territory color/shape, but stars and lanes do not move or rewire during a game.
- Plain-English reporting is required. Define technical terms when used.

## Phase 0 Status

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Original baseline | Confirmed | `3ddd95386f09933094038d213f16c3b99591f0e6` is the merge base of this review branch and current master. | This is the safest "before the run" comparison point found so far. |
| Review branch | Confirmed | `codex/territory-overnight-integration` at `e423c29ec709278446da6e7ee2b5d5948a26dd37`. | This is the branch under review. |
| Current master comparison | Confirmed | Detached comparison worktree at `c2e9afb7a7eb44f9cb0cfa343003e7f6b16a0ffc`. | The real desktop `master` checkout is dirty and was not touched. |
| Baseline build | Passed | `bun run check` and `bun run build` passed in `territory-compare-base-20260628`. | One existing warning: unused CSS selector in `GameThemeManager.svelte`. |
| Review-branch build | Passed | `bun run check` and `bun run build` passed in `territory-overnight-integration`. | Same existing warning. |
| Current-master build | Passed | `bun run check` and `bun run build` passed in `territory-compare-master-current-20260629`. | Same existing warning. |
| Release benchmark harness | Added | `tools/debug/review-release-gameplay-benchmark.ts`. | Measurement-only. Runs release build through `vite preview`, loads the named saved map, records frame-time distributions and named app timing blocks. |
| Deterministic replay harness | Added | `tools/debug/review-sim-replay-hash.ts`. | Measurement-only. Replays the same shared-engine scenario and hashes the tick output. |
| Normal visible app session | Not measured yet | `http://localhost:5173/` timed out from this shell and no listener was found on port 5173. | The user's visible jank remains ground truth. This benchmark may still be measuring the wrong surface. |

## Invalidated Measurements

These earlier readings are not verdict evidence:

- Any run that used the tiny 7-star fixture instead of a large saved map.
- Any run that used the dev-only `/__bench` route.
- Any run where Chrome opened an extension page instead of the game.
- Any run where the transition recorder stayed enabled across scenarios.
- Any run that measured the heavier diagnostic transition path while labeling it as the normal player-facing transition path.

## Determinism Probe

Plain-English meaning: this checks whether the game rules produced the same tick-by-tick outcome. It does not measure animation smoothness.

| Comparison | Map | Ticks | Final hash | Result |
| --- | --- | ---: | --- | --- |
| Baseline | `First Symmetry-6_April 17b` | 36 | `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910` | Same as review branch. |
| Current master | `First Symmetry-6_April 17b` | 36 | `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910` | Same as review branch. |
| Review branch | `First Symmetry-6_April 17b` | 36 | `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910` | Same as both references. |

Current conclusion: this one replay found no game-rule divergence. It does not prove every scenario is correct.

## Release Benchmark: Review Branch vs Original Baseline

Run files: review branch `2026-06-29T15:39:01.804Z`; baseline `2026-06-29T15:45:12.347Z`. Map: `First Symmetry-6_April 17b`. Three valid runs per row. `p95` means 95% of measured frames were at or below that time. 16.7 ms is roughly 60 frames per second; over 33 ms is visibly risky.

| Mode and window | Valid runs | p95 frame ms | p99 frame ms | Frames over 33 ms |
| --- | ---: | ---: | ---: | ---: |
| cell_grid.gameplay | 3/3 | 41.6 -> 32.8 | 59.0 -> 33.9 | 48 -> 14 |
| cell_grid.transition | 3/3 | 49.6 -> 34.0 | 266.8 -> 149.7 | 99 -> 32 |
| ember_lattice.gameplay | 3/3 | 114.4 -> 32.8 | 140.2 -> 41.6 | 131 -> 25 |
| ember_lattice.transition | 3/3 | 66.8 -> 33.2 | 175.5 -> 42.2 | 141 -> 27 |
| grid_gradient.gameplay | 3/3 | 265.4 -> 158.4 | 292.6 -> 216.6 | 59 -> 29 |
| grid_gradient.transition | 3/3 | 311.5 -> 141.7 | 317.9 -> 226.0 | 53 -> 36 |
| metaball.gameplay | 3/3 | 24.9 -> 25.1 | 33.9 -> 26.1 | 7 -> 6 |
| metaball.transition | 3/3 | 25.1 -> 25.0 | 40.7 -> 41.9 | 12 -> 8 |
| perimeter_field.gameplay | 3/3 | 25.0 -> 24.9 | 33.4 -> 32.7 | 10 -> 7 |
| perimeter_field.transition | 3/3 | 25.2 -> 25.0 | 133.4 -> 34.2 | 9 -> 9 |
| phase_edges.gameplay | 3/3 | 49.9 -> 25.2 | 66.7 -> 42.1 | 147 -> 27 |
| phase_edges.transition | 3/3 | 57.7 -> 33.0 | 191.8 -> 34.0 | 151 -> 26 |
| phase_field.gameplay | 3/3 | 41.5 -> 24.2 | 94.5 -> 59.4 | 40 -> 15 |
| phase_field.transition | 3/3 | 25.0 -> 24.9 | 58.4 -> 58.9 | 14 -> 15 |
| power_voronoi_runtime.gameplay | 3/3 | 24.5 -> 24.9 | 25.6 -> 26.2 | 5 -> 25 |
| power_voronoi_runtime.transition | 3/3 | 25.3 -> 25.1 | 34.1 -> 41.8 | 9 -> 9 |

Observation: this benchmark does not reproduce "worse in every mode." It shows some improved long-frame counts and some worse counts, especially `power_voronoi_runtime.gameplay` frames over 33 ms.

Hypothesis: the benchmark is missing the user's real visible path, settings, browser context, duration, interaction pattern, or mode switching behavior. This must be tested before trusting the automated result over the user's report.

## Release Benchmark: Review Branch vs Current Master

Run files: review branch `2026-06-29T15:39:01.804Z`; current master `2026-06-29T15:51:37.399Z`. Map: `First Symmetry-6_April 17b`. Three valid runs per row.

| Mode and window | Valid runs | p95 frame ms | p99 frame ms | Frames over 33 ms |
| --- | ---: | ---: | ---: | ---: |
| cell_grid.gameplay | 3/3 | 33.7 -> 32.8 | 49.9 -> 33.9 | 44 -> 14 |
| cell_grid.transition | 3/3 | 42.6 -> 34.0 | 258.5 -> 149.7 | 88 -> 32 |
| ember_lattice.gameplay | 3/3 | 50.1 -> 32.8 | 74.2 -> 41.6 | 173 -> 25 |
| ember_lattice.transition | 3/3 | 49.9 -> 33.2 | 208.0 -> 42.2 | 145 -> 27 |
| grid_gradient.gameplay | 3/3 | 282.9 -> 158.4 | 283.3 -> 216.6 | 59 -> 29 |
| grid_gradient.transition | 3/3 | 307.7 -> 141.7 | 310.9 -> 226.0 | 52 -> 36 |
| metaball.gameplay | 3/3 | 24.3 -> 25.1 | 25.2 -> 26.1 | 5 -> 6 |
| metaball.transition | 3/3 | 24.8 -> 25.0 | 25.7 -> 41.9 | 7 -> 8 |
| perimeter_field.gameplay | 3/3 | 24.7 -> 24.9 | 32.9 -> 32.7 | 7 -> 7 |
| perimeter_field.transition | 3/3 | 24.9 -> 25.0 | 33.0 -> 34.2 | 8 -> 9 |
| phase_edges.gameplay | 3/3 | 42.0 -> 25.2 | 83.6 -> 42.1 | 147 -> 27 |
| phase_edges.transition | 3/3 | 50.5 -> 33.0 | 208.5 -> 34.0 | 137 -> 26 |
| phase_field.gameplay | 3/3 | 25.0 -> 24.2 | 58.5 -> 59.4 | 17 -> 15 |
| phase_field.transition | 3/3 | 25.0 -> 24.9 | 117.4 -> 58.9 | 17 -> 15 |
| power_voronoi_runtime.gameplay | 3/3 | 24.6 -> 24.9 | 26.1 -> 26.2 | 5 -> 25 |
| power_voronoi_runtime.transition | 3/3 | 25.0 -> 25.1 | 41.6 -> 41.8 | 10 -> 9 |

Observation: this benchmark also does not reproduce the user's "worse in every mode" report. It still shows warning signs in `power_voronoi_runtime.gameplay` long-frame count and `metaball.transition` p99.

## Physical-Map Checking Waste

Question: how much time is currently wasted repeatedly checking whether the physical board changed?

Observed on the review branch in a focused `cell_grid.gameplay` run on the 172-star saved map:

- `fixedBoardLayoutKey`: built 1,788 times, reused 1,786 times.
- Actual physical-map signature scans: 2.
- Total scan time: about 0.9 ms across the whole run.
- `renderFamilyGeometryKeyCache`: 1,788 uses, 1,783 hits, 5 misses.
- The game did have real ownership changes during this probe, so this was not an idle-only reading.

Plain-English conclusion: on the current review branch, repeated physical-map checking appears mostly removed in this probe. It is not a proven major current waste source. Baseline and current master do not expose the same counters, so this measurement cannot prove how much was wasted before the changes without adding comparable instrumentation or using isolated revert tests.

## First Work Queue

These are not verdicts yet. They are bounded review units, ordered by risk and uncertainty.

| Priority | Unit | Why first | Current status |
| ---: | --- | --- | --- |
| 1 | Benchmark-vs-real-app gap | User sees worse smoothness; corrected benchmark does not. The measurement instrument may be wrong or incomplete. | Under review. |
| 2 | Shared frame scheduling and render loop changes | A single shared timing change could make many modes feel worse. | Under review. |
| 3 | Benchmark/performance hooks compiled into normal play | Measurement code can accidentally perturb the game if it runs outside benchmark windows. | Under review. |
| 4 | Render-family geometry cache and fixed-board identity | Directly touches the user's map-topology concern and shared geometry path. | Partly measured; no verdict yet. |
| 5 | Transition identity and lifecycle | Transitions are core user-facing behavior; deterministic replay does not cover visual transition correctness. | Under review. |
| 6 | Grid Gradient worker and reliability changes | Grid Gradient remains very slow and user confirmed it is janky, but it is not the primary target. | Lower priority unless it explains shared issues. |
| 7 | Frontier/geometry oracle additions | Potentially valuable for correctness, but tests alone are not player-facing proof. | Needs isolation and plain-English value check. |
| 8 | Settings preset/frontier recipe UI | Prior work already caused visible settings damage once; must be reviewed for regressions but is not likely the smoothness root cause. | Lower priority. |

## Open Measurement Problems

- The visible normal game at `http://localhost:5173/` is not currently reachable from this shell.
- The release benchmark uses a controlled `/bench` route; it may bypass normal menu/settings/player workflows.
- Three runs per row is enough for first comparison, not enough for final percentile confidence.
- The benchmark currently measures frame timing and named timing blocks, but not GPU draw calls, GPU time, or memory allocation counts.
- No change-unit has an isolated revert result yet. Therefore no regression has been attributed to a specific change.
- The full diff is not linear. Some commits were merged from separate worktrees, so the review needs targeted unit isolation rather than simple chronological blame.

## Next Actions

1. Close the benchmark-vs-real-app gap: measure the normal visible game path or make the benchmark prove it exercises the same code.
2. Finish cross-cutting triage: look for shared timing, validation, telemetry, or cache changes that can affect many modes.
3. Run the first isolated unit experiment only after selecting a bounded unit and writing the expected confirming/refuting evidence.
4. Keep recording results here before any product remediation.
