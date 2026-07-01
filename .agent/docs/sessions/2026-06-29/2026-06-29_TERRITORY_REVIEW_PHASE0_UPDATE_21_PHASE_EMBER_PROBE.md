# Territory Review Phase 0 Update 21: Phase/Ember Cost Probe

Timestamp: 2026-06-29T18:22:00-04:00

Scope: measurement-only code and focused benchmarks. No product fix was made.

## Probe Added

Added focused timing labels for Phase Edges and Ember Lattice:

- `territory.phaseEdges.transitionSetup.main`: time spent choosing/building/scheduling the transition plan before scene cells are generated.
- `territory.phaseEdges.sceneBuild`: time spent turning the chosen plan into the per-cell scene list.
- `territory.phaseEdges.paintAndPixiMutation`: time spent in the paint block, including CPU-side paint preparation and Pixi object changes.

The existing Pixi render pass is still measured separately as `game.pixi.render.stage`.

The benchmark harness now always preserves these focus labels in `focusMeasures`, even when they are not in the largest 48 timing rows.

## Instrument Check

Important correction: `vite preview` serves the last production build. It does not rebuild after source changes.

The first post-probe run did not show the new labels because the production bundle was stale. After running `bun run build` in the app directory, the labels appeared. Future release benchmark procedure must be:

1. Build the target app.
2. Run `tools/debug/review-release-gameplay-benchmark.ts`.
3. Treat any post-edit benchmark without a fresh build as suspect.

## Focused Comparison

Scenario: `/play?bench=1`, map `First Symmetry-6_April 17b`, modes `phase_edges,ember_lattice`, scenario `transition`, 3 runs, 2500ms window, 500ms warmup.

Artifacts:

- Review branch with delayed display still present: `C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-16-08-119Z.json`
- Disposable immediate-display isolation: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-19-43-877Z.json`

## What The New Probe Shows

Plain English: removing late display fixes stale territory, but the first truthful transition frame is still too expensive in Phase Edges and Ember Lattice.

| Row | Pending wait, review -> immediate | Frame p95/p99/worst, review -> immediate | Main measured costs in immediate-display run |
| --- | ---: | ---: | --- |
| Phase Edges transition | 13.0 / 76.6ms -> 0 / 0ms | 25.0 / 33.3 / 125.0ms -> 25.1 / 34.1 / 141.5ms | frame update p50 104.6ms, transition setup p50 40.1ms, paint block p50 20.0ms, Pixi render p50 19.3ms |
| Ember Lattice transition | 63.5 / 73.8ms -> 0 / 0ms | 24.9 / 25.1 / 100.1ms -> 25.1 / 33.2 / 108.4ms | frame update p50 90.5ms, transition setup p50 35.3ms, paint block p50 19.7ms, Pixi render p50 20.3ms |

The review branch hides some cost by showing territory late. The immediate-display isolation shows the correct territory promptly, but it still concentrates too much work into one frame.

## Current Interpretation

Observation:

- Delayed display is a real user-visible regression.
- Immediate display is necessary, but not sufficient.
- The expensive frame is not just Pixi rendering. It is a combination of transition setup, territory geometry work, paint preparation, and Pixi rendering.

Hypothesis:

- The correct product fix is a two-stage presentation path:
  1. Show current ownership immediately with the cheapest correct stable picture.
  2. Prepare the decorative/fancy transition plan separately, and skip it if it arrives too late.

This remains a hypothesis until implemented and measured.

## Verification

- `bun run check` in `pax-fluxia/`: passed with 0 errors and the existing unused CSS warning in `GameThemeManager.svelte`.
- `bun run build` in `pax-fluxia/`: passed with existing bundle-size/import warnings.
- `bun run agentic:graphify:build`: passed after the source change.
- Probe smoke check: `review-release-gameplay-benchmark-2026-06-29T22-24-46-087Z.json` contains all expected `focusMeasures` labels.
