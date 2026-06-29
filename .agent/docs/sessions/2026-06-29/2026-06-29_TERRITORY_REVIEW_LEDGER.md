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

## Review Loop 1: Benchmark Route Gap

Boundary: `tools/debug/review-release-gameplay-benchmark.ts`, `/bench`, and `/play?bench=1`.

Intent: determine whether the benchmark route measures the same player-facing game route the user judges.

Observation:

- `/bench` mounts the game container directly and installs the measurement bridge immediately.
- `/play` dynamically loads the real game shell, then installs the measurement bridge only when internal benchmark access is enabled.
- The harness now supports `PAX_REVIEW_APP_PATH`, so the same measurement script can run either `/bench` or `/play?bench=1`.
- The harness now records a route sentinel at page load and after each measured scenario. The post-scenario sentinel confirms route, canvas presence, shell diagnostics, visible text prefix, render mode, star count, and current game state.

Small route probe on review branch, large saved map, two runs per row:

| Mode and window | p95 `/play?bench=1` -> `/bench` | p99 `/play?bench=1` -> `/bench` | Frames over 33 ms `/play?bench=1` -> `/bench` |
| --- | ---: | ---: | ---: |
| cell_grid.gameplay | 33.1 -> 49.9 | 58.2 -> 108.2 | 9 -> 18 |
| cell_grid.transition | 33.5 -> 32.9 | 50.0 -> 33.4 | 16 -> 6 |
| power_voronoi_runtime.gameplay | 59.4 -> 27.0 | 97.6 -> 41.7 | 15 -> 6 |
| power_voronoi_runtime.transition | 25.5 -> 25.6 | 33.7 -> 34.4 | 6 -> 8 |

Verdict: `KEEP-WITH-FOLLOWUP` for the route-switch harness change. `/bench` is not sufficient as player-facing evidence. Future UX-facing runs should include `/play?bench=1`, and ideally the exact visible user session if available.

Confidence: medium. The result is only two runs per row, but the route difference is directly observed in source and measurements.

## Review Loop 2: Territory Presentation Scheduling

Plain-English definition: territory presentation is the visible territory layer being committed to the screen after the game state changes. The reviewed code can queue or delay this work to avoid blocking input.

Boundary: `GameCanvas.svelte` scheduling functions around `scheduleTerritoryPresentationQueue`, `scheduleTerritoryPresentationQueueDelay`, and `shouldYieldTerritoryPresentationRequest`.

Intent: determine whether delayed territory presentation explains visible jank or stale-looking transitions.

Experiment: disposable worktree `territory-isolate-presentation-immediate-20260629` forced territory presentation requests to run immediately. This was not a product fix; it was an isolation probe.

Two-run `/play?bench=1` probe:

| Mode and window | p95 review -> immediate | p99 review -> immediate | Frames over 33 ms review -> immediate | Commit lag max review -> immediate |
| --- | ---: | ---: | ---: | ---: |
| cell_grid.gameplay | 33.1 -> 34.0 | 58.2 -> 59.0 | 9 -> 19 | 14.4 -> 8.8 |
| cell_grid.transition | 33.5 -> 50.0 | 50.0 -> 182.8 | 16 -> 46 | 162.6 -> 14.3 |
| power_voronoi_runtime.gameplay | 59.4 -> 25.1 | 97.6 -> 33.0 | 15 -> 4 | 0.9 -> 0.7 |
| power_voronoi_runtime.transition | 25.5 -> 25.3 | 33.7 -> 33.6 | 6 -> 6 | 0.6 -> 0.9 |

Five-run confirmation on `power_voronoi_runtime.gameplay` only:

| Variant | Run-median p95 | Run-median p99 | Max frame | Frames over 33 ms | Frames over 20 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Review branch | 25.2 | 33.3 | 108.9 | 18 | 192 |
| Force immediate | 25.2 | 33.1 | 108.4 | 16 | 179 |

Verdict: `ISOLATE`, not `KEEP` and not `REVERT`. Scheduling is involved, but a global immediate policy is too blunt: it slightly helps Power Voronoi gameplay and badly hurts Cell Grid transition in the two-run probe. The likely useful follow-up is mode-aware and transition-aware scheduling, not one global rule.

Confidence: medium. The five-run confirmation reduced the apparent size of the Power Voronoi win, but the Cell Grid transition harm is large enough to rule out a blanket immediate policy.

## Review Loop 3: Pixi Probe Isolation

Plain-English definition: Pixi is the graphics library drawing the game. A probe is measurement code attached to Pixi to time frames.

Boundary: `GameCanvas.svelte` call to `installPixiPerfProbes(app)`.

Intent: test whether the measurement probes themselves make normal gameplay less smooth.

Experiment: disposable worktree `territory-isolate-no-pixi-probes-20260629` removed only the call that installs the Pixi renderer/ticker probes.

Two-run `/play?bench=1` probe:

| Mode and window | p95 review -> no Pixi probes | p99 review -> no Pixi probes | Frames over 33 ms review -> no Pixi probes |
| --- | ---: | ---: | ---: |
| cell_grid.gameplay | 33.1 -> 33.6 | 58.2 -> 50.3 | 9 -> 16 |
| cell_grid.transition | 33.5 -> 42.2 | 50.0 -> 57.9 | 16 -> 36 |
| power_voronoi_runtime.gameplay | 59.4 -> 25.3 | 97.6 -> 33.1 | 15 -> 3 |
| power_voronoi_runtime.transition | 25.5 -> 25.4 | 33.7 -> 33.6 | 6 -> 5 |

Five-run confirmation on `power_voronoi_runtime.gameplay` only:

| Variant | Run-median p95 | Run-median p99 | Max frame | Frames over 33 ms | Frames over 20 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Review branch | 25.2 | 33.3 | 108.9 | 18 | 192 |
| No Pixi probes | 25.2 | 33.4 | 100.0 | 18 | 199 |

Verdict: `KEEP-WITH-FOLLOWUP` for the probes as measurement tools, with caution. The five-run confirmation does not support them as a strong standalone cause of the visible regression. They can still perturb measurement slightly, so final UX validation should include a run with them disabled or gated more tightly.

Confidence: medium-high for "not the main cause" on `power_voronoi_runtime.gameplay`; lower for other modes because they only had two-run probes.

## Review Loop 4: Full Player-Route Sweep

Boundary: release benchmark on `/play?bench=1` for baseline, current master, and review branch.

Intent: compare the review branch against the original baseline and current master on the route closest to normal play.

All rows used the large saved map `First Symmetry-6_April 17b`, three runs per row, and post-scenario sentinels confirmed the game canvas was present for every review-branch run.

### Review Branch vs Original Baseline

| Mode and window | p95 frame ms | p99 frame ms | Frames over 33 ms | Commit lag max |
| --- | ---: | ---: | ---: | ---: |
| cell_grid.gameplay | 42.3 -> 33.7 | 58.7 -> 57.9 | 49 -> 36 | 21.0 -> 12.7 |
| cell_grid.transition | 51.0 -> 41.6 | 292.2 -> 167.7 | 107 -> 59 | 18.2 -> 343.1 |
| ember_lattice.gameplay | 42.9 -> 41.6 | 75.0 -> 42.4 | 166 -> 87 | 10.6 -> 77.9 |
| ember_lattice.transition | 50.1 -> 41.9 | 216.6 -> 82.5 | 146 -> 73 | 12.6 -> 43.0 |
| grid_gradient.gameplay | 269.1 -> 167.9 | 275.0 -> 218.2 | 60 -> 52 | 44.2 -> 95.1 |
| grid_gradient.transition | 299.2 -> 168.1 | 326.8 -> 243.0 | 47 -> 43 | 179.7 -> 503.9 |
| metaball.gameplay | 24.8 -> 24.8 | 32.6 -> 25.9 | 5 -> 5 | 1.8 -> 1.8 |
| metaball.transition | 25.0 -> 25.0 | 34.5 -> 33.3 | 9 -> 7 | 1.8 -> 1.9 |
| perimeter_field.gameplay | 25.2 -> 25.1 | 33.3 -> 31.8 | 7 -> 6 | 2.6 -> 2.6 |
| perimeter_field.transition | 25.5 -> 25.2 | 41.8 -> 33.9 | 12 -> 9 | 5.1 -> 2.5 |
| phase_edges.gameplay | 50.1 -> 41.7 | 75.3 -> 49.6 | 153 -> 79 | 13.7 -> 130.9 |
| phase_edges.transition | 66.1 -> 34.1 | 208.4 -> 48.9 | 132 -> 55 | 10.8 -> 37.7 |
| phase_field.gameplay | 24.3 -> 24.9 | 50.1 -> 66.8 | 9 -> 22 | 0.5 -> 58.2 |
| phase_field.transition | 25.0 -> 24.8 | 58.7 -> 75.6 | 14 -> 18 | 0.4 -> 376.4 |
| power_voronoi_runtime.gameplay | 25.4 -> 25.0 | 33.4 -> 25.7 | 9 -> 7 | 0.9 -> 0.9 |
| power_voronoi_runtime.transition | 25.3 -> 25.2 | 42.2 -> 33.5 | 11 -> 8 | 0.8 -> 0.7 |

### Review Branch vs Current Master

| Mode and window | p95 frame ms | p99 frame ms | Frames over 33 ms | Commit lag max |
| --- | ---: | ---: | ---: | ---: |
| cell_grid.gameplay | 49.3 -> 33.7 | 66.1 -> 57.9 | 48 -> 36 | 14.4 -> 12.7 |
| cell_grid.transition | 50.6 -> 41.6 | 308.4 -> 167.7 | 106 -> 59 | 17.9 -> 343.1 |
| ember_lattice.gameplay | 50.5 -> 41.6 | 92.5 -> 42.4 | 172 -> 87 | 139.5 -> 77.9 |
| ember_lattice.transition | 50.7 -> 41.9 | 217.3 -> 82.5 | 162 -> 73 | 12.2 -> 43.0 |
| grid_gradient.gameplay | 275.6 -> 167.9 | 350.5 -> 218.2 | 58 -> 52 | 38.5 -> 95.1 |
| grid_gradient.transition | 316.4 -> 168.1 | 318.5 -> 243.0 | 54 -> 43 | 55.9 -> 503.9 |
| metaball.gameplay | 24.8 -> 24.8 | 26.2 -> 25.9 | 6 -> 5 | 1.8 -> 1.8 |
| metaball.transition | 25.2 -> 25.0 | 41.3 -> 33.3 | 9 -> 7 | 1.9 -> 1.9 |
| perimeter_field.gameplay | 25.0 -> 25.1 | 25.9 -> 31.8 | 9 -> 6 | 3.6 -> 2.6 |
| perimeter_field.transition | 25.2 -> 25.2 | 33.2 -> 33.9 | 8 -> 9 | 2.4 -> 2.5 |
| phase_edges.gameplay | 50.1 -> 41.7 | 83.5 -> 49.6 | 178 -> 79 | 149.0 -> 130.9 |
| phase_edges.transition | 66.4 -> 34.1 | 208.3 -> 48.9 | 154 -> 55 | 12.0 -> 37.7 |
| phase_field.gameplay | 24.1 -> 24.9 | 25.2 -> 66.8 | 7 -> 22 | 0.5 -> 58.2 |
| phase_field.transition | 24.9 -> 24.8 | 124.9 -> 75.6 | 13 -> 18 | 0.3 -> 376.4 |
| power_voronoi_runtime.gameplay | 25.1 -> 25.0 | 33.8 -> 25.7 | 7 -> 7 | 0.9 -> 0.9 |
| power_voronoi_runtime.transition | 25.2 -> 25.2 | 41.3 -> 33.5 | 10 -> 8 | 1.0 -> 0.7 |

Observation:

- The player-route benchmark still does not reproduce "worse in every mode" in raw frame timing.
- Phase Field is a real regression candidate: p99 and frames over 33 ms are worse than both baseline and current master in gameplay, and frames over 33 ms are worse in transition.
- Presentation commit lag is a real regression candidate: several transition rows improved raw frame timing while commit lag became much worse. In plain English, the app may be doing less work per frame but waiting longer before showing the new territory frame.
- This supports the user's observation more than the raw frame table alone: delayed visible updates can feel worse even when p95/p99 frame timing looks better.

Verdict: `ISOLATE` presentation scheduling and `REVIEW` Phase Field before any keep/revert set is assembled.

Confidence: medium. Three runs per row is enough to prioritize; it is not final attribution.

## Subagent Findings Integrated

- Transition identity and lifecycle changes have targeted test support and appear directionally valuable. They still need a visual overlap/recapture scenario before a final `KEEP` verdict.
- Transition reliability fallbacks are correct by intent when geometry is unsafe, but they can visibly snap instead of animate. The review must count actual snap reasons in player-facing runs before keeping all gates.
- Fixed board identity is consistent with the corrected rule that physical board geometry is immutable after game start. Current measured repeated physical-map scan cost is low on the review branch.
- Grid Gradient remains janky and slow, but the user confirmed it is not the primary target. It should not dominate the recovery plan unless it explains shared scheduling problems.
- `/bench` route evidence is not enough. Normal route, saved settings, and human mode switching remain open coverage gaps.

## Open Measurement Problems

- The visible normal game at `http://localhost:5173/` is not currently reachable from this shell.
- The release benchmark can now use `/play?bench=1`, but it still bypasses saved local browser state unless localStorage seeding is added.
- Three runs per row is enough for first comparison, not enough for final percentile confidence.
- The benchmark currently measures frame timing and named timing blocks, but not GPU draw calls, GPU time, or memory allocation counts.
- No change-unit has an isolated revert result yet. Therefore no regression has been attributed to a specific change.
- The full diff is not linear. Some commits were merged from separate worktrees, so the review needs targeted unit isolation rather than simple chronological blame.
- Human mode switching through the topbar is not covered; benchmark mode switching directly sets the render mode.
- Dev-server behavior on `localhost:5173` is not covered by release-preview runs. The review prompt prioritizes release builds, but the user's live observation likely came from a dev server.

## Review Loop 5: Human Mode-Switch Path

Plain-English definition: this measures what happens when the player clicks the render-mode buttons in the top bar during a live game. It is different from directly changing the mode through the benchmark bridge because it uses the visible control the player uses.

Boundary: `tools/debug/review-release-gameplay-benchmark.ts` measurement-only scenario `mode_switch`. No product code was changed.

Intent: cover a player-facing transition that the earlier benchmark skipped.

Experiment: release-preview `/play?bench=1`, large saved map `First Symmetry-6_April 17b`, three runs per target mode, original baseline vs current master vs review branch. The source mode is `power_voronoi_runtime` for all targets except switching to Power Voronoi, which starts from Cell Grid.

Plain-English metric definitions:

- `p95/p99/max`: how long frames took during the three-second window after the click. Lower is smoother.
- `>33`: number of frames slower than about 30 frames per second across the three runs. Lower is smoother.
- `lag`: delay before a newly prepared territory picture was actually shown on screen. Lower is better; high values can feel like stale or late territory even if frames keep arriving.

| Mode switched to | Source mode | Baseline p95/p99/max/>33/lag | Current master p95/p99/max/>33/lag | Review branch p95/p99/max/>33/lag |
| --- | --- | ---: | ---: | ---: |
| Power Voronoi | Cell Grid | 16.7/16.8/33.4/1/0.3 | 16.9/17.7/33.3/0/0.2 | 16.7/17.6/41.7/3/0.3 |
| Perimeter | Power Voronoi | 17.3/17.7/33.4/2/2.0 | 17.4/17.6/33.3/0/2.3 | 16.8/17.5/25.1/0/2.2 |
| Metaball | Power Voronoi | 16.5/18.1/34.1/3/0.4 | 8.9/16.7/33.4/1/1.7 | 16.6/16.8/42.1/3/0.4 |
| Cell Grid | Power Voronoi | 8.8/9.4/25.9/0/0.3 | 9.0/9.4/33.5/1/0.2 | 8.9/16.7/49.9/1/0.3 |
| Phase Edges | Power Voronoi | 8.9/16.7/33.3/0/0.3 | 8.8/16.7/33.3/0/0.2 | 9.2/24.9/58.8/3/0.4 |
| Ember Lattice | Power Voronoi | 8.9/9.3/33.3/0/0.2 | 8.9/16.6/25.1/0/0.3 | 33.7/66.3/108.6/36/1.6 |
| Phase Field | Power Voronoi | 8.7/9.2/25.0/0/0.2 | 8.7/9.3/33.3/0/0.3 | 16.7/42.1/58.0/5/2.1 |
| Grid Gradient | Power Voronoi | 133.9/141.7/141.7/94/19.8 | 133.1/149.9/149.9/95/17.7 | 84.2/100.0/158.8/59/60.9 |

Observations:

- Switching into Ember Lattice is a confirmed branch regression in this probe: p99 changed from 9.3 ms on the original baseline and 16.6 ms on current master to 66.3 ms on the review branch; slow frames changed from 0 to 36.
- Switching into Phase Field is a confirmed branch regression in this probe: p99 changed from about 9 ms on both comparison points to 42.1 ms; slow frames changed from 0 to 5.
- Switching into Phase Edges and Cell Grid also regressed at the tail of the frame distribution, though less severely.
- Switching into Grid Gradient improved frame timing compared with both comparison points, but the screen-update delay worsened from 19.8 ms baseline and 17.7 ms current master to 60.9 ms on the review branch.

Verdict: `REVIEW` for mode-switch behavior before any keep-set is assembled. This is evidence that the user-facing path has regressions not visible in the earlier direct-mode benchmark.

Confidence: medium. The path is representative because it clicks the actual topbar controls. Three runs per mode are enough to rank risk, not enough to close final attribution.

## Review Loop 6: Focused Reruns And Screen-Update Delay Sampling

Plain-English definition: the harness now samples the territory presentation system during the measured window. In plain terms, it checks whether a newly prepared territory picture is waiting too long before it appears on screen.

Boundary: measurement-only update to `tools/debug/review-release-gameplay-benchmark.ts`. No product behavior was changed on the review branch.

Intent: test the user's "janky despite frame timing" observation more directly than final-only snapshots.

### Mode-Switch Rerun

I reran the two worst-looking mode-switch rows from Review Loop 5 with five runs each.

| Mode switched to | Original baseline p95/p99/max/>33/>20/delay | Current master p95/p99/max/>33/>20/delay | Review branch p95/p99/max/>33/>20/delay |
| --- | ---: | ---: | ---: |
| Ember Lattice | 9.0/17.0/25.2/0/4/0.2 | 9.0/16.7/34.0/2/4/0.4 | 8.9/17.3/33.4/1/7/0.2 |
| Phase Field | 8.9/16.6/41.7/2/4/0.3 | 9.1/16.9/33.4/1/3/0.2 | 8.9/16.6/33.4/1/3/0.3 |

Observation: the severe Ember Lattice and Phase Field mode-switch spikes from the three-run sweep did not reproduce. The earlier mode-switch finding is therefore downgraded from "confirmed regression" to "unstable spike / needs more evidence."

Disposable isolation: I reverted `78399c308 Guard transition state on mode changes` in a throwaway worktree and reran the same focused two-mode switch test.

| Mode switched to | Review branch p95/p99/max/>33/>20/delay | Guard reverted p95/p99/max/>33/>20/delay |
| --- | ---: | ---: |
| Ember Lattice | 8.9/17.3/33.4/1/7/0.2 | 9.1/17.6/33.4/1/8/0.2 |
| Phase Field | 8.9/16.6/33.4/1/3/0.3 | 8.9/9.4/34.1/1/5/0.4 |

Observation: reverting the mode-change guard did not improve Ember Lattice and did not reduce slow-frame count for Phase Field. It is not supported as the cause of the earlier severe mode-switch spike.

### Transition Screen-Update Delay

I then reran Cell Grid and Phase Field conquest transitions with the new screen-update delay sampler.

`delay` below means sampled delay before a prepared territory picture appeared on screen. High delay can feel like stale or late territory even when frame timing looks acceptable.

| Mode transition | Original baseline | Current master | Review branch |
| --- | ---: | ---: | ---: |
| Cell Grid | frame p99 49.9, >33 59, delay max 195.3 | frame p99 66.7, >33 43, delay max 229.7 | frame p99 50.0, >33 15, delay max 626.4 |
| Phase Field | frame p99 41.7, >33 21, delay max 123.0 | frame p99 50.1, >33 28, delay max 134.6 | frame p99 49.9, >33 25, delay max 462.1 |

Additional observation: the review branch had pending territory pictures waiting during the sampled window: Cell Grid pending age max 536.1 ms; Phase Field pending age max 316.6 ms. Baseline and current master reported 0 pending age max in these focused runs.

Verdict: `REVIEW / ISOLATE` presentation queue behavior next. This is now stronger evidence than the mode-switch spike: it reproduces in five-run transition measurements and matches the user's description of visible jank despite not always worsening raw frame timing.

Confidence: medium-high that transition screen-update delay is a real branch issue for Cell Grid and Phase Field. Confidence is low on exact cause until the queue-related changes are isolated.

## Next Actions

1. Add localStorage seeding and route/visible-state sentinel data to the harness.
2. Isolate presentation queue behavior first, starting with Cell Grid and Phase Field transitions because sampled screen-update delay is the clearest repeated branch-only harm.
3. Run `/play?bench=1` on all primary modes with enough runs for stable p95/p99 before deciding keep/revert.
4. Isolate scheduling more narrowly: gameplay vs capture transition, input-active vs idle windows, and immediate vs queued territory presentation.
5. Count transition snap/fallback reasons in `/play?bench=1` runs.
6. Keep recording results here before any product remediation.

## Review Loop 7: Conquest Presentation Queue Isolation

Timestamp: 2026-06-29T15:48:01-04:00

Plain-English definition: a conquest presentation update is the visible territory change after a star changes owner. A background task is browser work that may run later than visible work. Pending age means a prepared territory picture is waiting before the game shows it.

Boundary: the conquest-presentation part of `d2ac9d771a perf(territory): keep conquest geometry off render frame`, isolated in `GameCanvas.svelte`.

Intent: reduce render-frame spikes by keeping conquest territory work off the immediate render path.

Behavior change: deterministic replay hash stayed unchanged in the isolated revert, so this unit did not change game-rule output in the tested replay.

Fresh three-way measurement: release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, 8 runs, 3000ms measured window, 500ms warmup.

Artifacts:

- Baseline: `C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-35-07-082Z.json`
- Current master: `C:\Users\mikep\.codex\worktrees\territory-compare-master-current-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-37-08-692Z.json`
- Integration branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-39-12-118Z.json`
- Isolated revert: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-45-34-662Z.json`

| Mode | Baseline pending age median/worst | Master pending age median/worst | Integration pending age median/worst | Isolated revert pending age median/worst |
| --- | ---: | ---: | ---: | ---: |
| Cell Grid transition | 0 / 0ms | 0 / 0ms | 324.9 / 682.8ms | 0 / 0ms |
| Phase Field transition | 0 / 0ms | 0 / 0ms | 78.4 / 143.0ms | 0 / 0ms |

| Mode | Integration commit lag median/worst | Isolated revert commit lag median/worst | Integration schedule modes | Isolated revert schedule modes |
| --- | ---: | ---: | --- | --- |
| Cell Grid transition | 460.5 / 542.1ms | 6.5 / 21.2ms | immediate, background | immediate |
| Phase Field transition | 176.2 / 241.5ms | 25.8 / 63.3ms | immediate, background | immediate |

Verdict: `REVERT` for this unit as shipped. The branch was preparing territory changes and then letting them wait before display. Reverting this small unit alone removed the waiting frames in both tested modes and kept the deterministic replay hash unchanged.

Confidence: high for this isolated cause on Cell Grid and Phase Field transitions. Remaining confidence gap: full-mode reassembly still has to prove the final keep-set improves the whole app, not just these two focused rows.

Bookkeeping: next review target remains Unit 12, but split into smaller pieces: `4c847ca20` input-pressure yielding, the remaining intent of `d2ac9d771a`, `e33ba4e1e` conquest flash drawing, and `ae471a6c2` Cell Grid fill/border split.

## Review Loop 8: Broad Check Of The Isolated Conquest-Queue Revert

Timestamp: 2026-06-29T16:01:30-04:00

Boundary: same disposable isolated revert from Review Loop 7, tested across seven primary modes and both gameplay and transition windows.

Intent: determine whether the isolated revert only fixed two focused rows or broadly removed late territory presentation.

Experiment: release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, 5 runs per row, 2500ms measured window, 500ms warmup.

Artifacts:

- Integration branch: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-50-22-108Z.json`
- Isolated revert: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T19-57-30-350Z.json`

Observation: the isolated revert removed pending territory age across every tested row. Examples: Cell Grid transition 204.0ms median -> 0ms; Ember Lattice gameplay 69.2ms -> 0ms; Phase Edges gameplay 68.0ms -> 0ms; Power Voronoi transition 7.4ms -> 0ms.

Tradeoff: removing delay exposes remaining render cost. Example p99 frame times worsened in Phase Edges gameplay 33.4ms -> 41.7ms, Phase Edges transition 33.8ms -> 42.7ms, Ember Lattice gameplay 33.5ms -> 49.9ms, and Ember Lattice transition 41.7ms -> 49.6ms.

Verdict update: keep the `REVERT` verdict for the conquest-presentation part of `d2ac9d771a`, but do not treat it as a complete performance fix. It removes stale territory presentation; separate render-cost work remains necessary.

Next unit: isolate the remaining Unit 12 rendering-cost pieces, starting with Cell Grid fill/border split and conquest flash changes, because the stale-update cause is now proven and the next problem is actual frame cost.

## Review Loop 9: Cell Grid Fill/Border Split

Timestamp: 2026-06-29T16:18:30-04:00

Boundary: `ae471a6c2 perf(territory): split cell grid fills from borders`, tested on top of the disposable worktree where the proven bad conquest queue rule was already reverted.

Intent: make Cell Grid transition drawing cheaper by drawing fills and borders through separate paths where possible.

Experiment: release build, `/play?bench=1`, Cell Grid only, map `First Symmetry-6_April 17b`, 8 runs per row, 3000ms measured window, 500ms warmup.

Artifacts:

- Split reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-08-31-694Z.json`
- Split kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-12-02-015Z.json`

Visual check: screenshots for both versions showed visible Cell Grid territory; no obvious blank or missing-territory failure was observed.

| Row | Split reverted p95/p99/worst frame | Split kept p95/p99/worst frame | Pending age |
| --- | ---: | ---: | ---: |
| Cell Grid gameplay | 8.5 / 33.3 / 125.1ms | 18.0 / 33.3 / 125.1ms | 0ms in both |
| Cell Grid transition | 25.1 / 50.0 / 116.7ms | 25.0 / 33.2 / 141.6ms | 0ms in both |

Verdict: `KEEP-WITH-FOLLOWUP`. The split improved Cell Grid transition p99 in this isolated A/B test and did not cause stale presentation. Follow-up is required because gameplay p95 worsened from 8.5ms to 18.0ms in the same test.

Bookkeeping: this unit is not the cause of the stale-update regression. Next Unit 12 targets are conquest flash drawing and input-pressure yielding.

## Review Loop 10: Conquest Flash Drawing Isolation

Timestamp: 2026-06-29T16:37:21-04:00

Plain-English definition: the conquest flash is the brief white pulse drawn over a star after it is captured.

Boundary: `e33ba4e1e perf(stars): move conquest flash off base redraws`, tested on the disposable worktree where the proven bad conquest-queue rule was already reverted.

Intent: avoid redrawing the whole star just to animate the short white capture pulse.

Behavior change: deterministic replay hash stayed unchanged at `9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`, so this unit did not change game-rule output in the tested replay.

Experiment: release build, `/play?bench=1`, map `First Symmetry-6_April 17b`, seven primary territory modes, gameplay and transition windows, 5 runs per row, 2500ms measured window, 500ms warmup.

Artifacts:

- Flash kept: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-19-25-178Z.json`
- Flash reverted: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T20-28-36-630Z.json`

Observation: the flash split is not the cause of broad jank. Most frame percentiles were unchanged. Star-render timing in checked transition rows was usually under 1ms at p95/p99 in both versions.

Representative rows:

| Row | Flash kept p95/p99/worst | Flash reverted p95/p99/worst |
| --- | ---: | ---: |
| Cell Grid transition | 25.0 / 33.3 / 108.6ms | 25.1 / 33.4 / 108.9ms |
| Phase Edges transition | 33.3 / 42.4 / 109.1ms | 33.5 / 50.0 / 116.7ms |
| Ember Lattice transition | 33.3 / 50.0 / 108.4ms | 33.3 / 50.0 / 133.4ms |
| Phase Field transition | 8.6 / 16.8 / 75.0ms | 8.5 / 16.7 / 75.3ms |

Verdict: `REVERT-AND-BACKLOG` as a performance change. The change may be visually acceptable, and it may help a narrow tail case, but it has not earned a place in the keep-set as a core performance improvement.

Bookkeeping: next Unit 12 targets are input-pressure yielding and presentation throttling because those control when visible work is allowed to run and can affect every mode.
