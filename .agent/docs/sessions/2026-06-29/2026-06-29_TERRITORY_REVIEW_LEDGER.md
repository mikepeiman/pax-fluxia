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

## Next Actions

1. Add localStorage seeding and route/visible-state sentinel data to the harness.
2. Add a human mode-switch scenario that uses the same topbar shortcut path as the player-facing UI.
3. Run `/play?bench=1` on all primary modes with enough runs for stable p95/p99 before deciding keep/revert.
4. Isolate scheduling more narrowly: cheap vector modes vs expensive cell modes, gameplay vs capture transition, and input-active vs idle windows.
5. Count transition snap/fallback reasons in `/play?bench=1` runs.
6. Keep recording results here before any product remediation.
