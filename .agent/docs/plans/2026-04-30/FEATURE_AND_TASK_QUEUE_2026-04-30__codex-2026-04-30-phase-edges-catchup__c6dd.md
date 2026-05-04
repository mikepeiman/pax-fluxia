# Feature And Task Queue - 2026-04-30

## Active
- User verification of the refactored `Territory Styles` and `Territory Tuning & Constraints` surfaces in live `metaball_grid_phase_edges` and `metaball_grid`.
- Remove the now-inert legacy `shape` block still parked behind `false` in `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`.
- Continue auditing for any remaining territory controls that are surfaced but not consumed by the active render-family contract.
- Live verification that `Inward Offset` now affects the active Phase Edges phase-fill surface, not just the legacy cell paint path.
- Live verification that `Border Mode = per_cell` can now keep per-cell borders while overlaying blended opposing-force frontiers with PRE/POST color weighting.
- Evaluate the new straight-shared-edge junction controls:
- `Junction Render`
- `Junction Gap Trim`
- `Junction Bubble Radius`
- Live verification that `Centered-blended borders` no longer causes a generalized fill pullback when `Inward Offset = 0`.

## Completed
- Added a reusable frontier-processing layer for Phase Edges under `pax-fluxia/src/lib/territory/frontier/`.
- Wired Phase Edges frontier technique selection, diagnostics, and benchmark coverage into the Metaball Grid family and settings UI.
- Fixed the per-frame Phase Edges mode-default overwrite that made multiple UI controls inert.
- Fixed detached-worktree-only import breakage caused by a dead `TransitionDebugPanel` integration.
- Reworked control-path fill/border coupling so Phase Edges can use a shared surface recipe instead of divergent steady-state and conquest border families.
- Fixed paused-state territory reactivity so render-mode and tuning changes repaint while paused.
- Fixed a runtime crash in `GameCanvas.svelte` caused by an out-of-scope `connections` identifier.
- Split topology ownership back to one place and moved real paint-time controls into `Territory Styles`.
- Removed duplicate topology/source-constraint surfaces from the generic geometry-source card and Perimeter Field source card.
- Added the required 2026-04-30 session docs and post-mortem backlog that had been missed earlier in the day.
- Created branch `codex/2026-04-30-phase-edges-catchup` and checkpointed the code in:
- `58efa694` - `Add phase-edges frontier matrix and runtime fixes`
- `ab8cf80c` - `Re-home territory style controls and remove topology duplication`
- Removed the top-level `.gitignore` rule `sessions/` because it was contradicting the documented session-log protocol by ignoring `.agent/docs/sessions/`.
- Added Phase Edges straight-shared-edge junction controls and runtime support:
- `TERRITORY_FRONTIER_JUNCTION_RENDER_MODE`
- `TERRITORY_FRONTIER_JUNCTION_RADIUS_PX`
- Widened centered-blended border support so `per_cell` mode can retain per-cell border paint while overlaying one blended opposing-owner frontier stroke.
- Clarified that `Grid | Frontier | Wave | Flip | Perf` in `MetaballGridTuning.svelte` are panel sections only, not renderer-mode toggles.
- Fixed the Phase Edges fill-replacement suppression bug by introducing a dedicated `suppressMask` on frontier phase layers so fill replacement only applies to actual frontier cells, not the full expanded contour-valid neighborhood.

## Next
- Get live user confirmation on:
  - `Territory Styles > Fill` controls changing visible fill paint immediately
  - `Territory Styles > Border` controls changing visible border geometry immediately
  - `Inward Offset` visibly pulling the active Phase Edges frontier fill away from the border
  - `per_cell` borders preserving their lattice while the shared owner boundary renders as one blended stroke
  - `Junction Gap Trim` reproducing the low-pixel three-way gap control
  - `Junction Bubble Radius` producing a useful three-owner blended bubble when `Junction Render = Bubble`
  - `Centered-blended borders` no longer causing a general fill pullback when `Inward Offset = 0`
  - no remaining duplicated topology/source controls
- If any surfaced style control still does nothing, trace definition -> consumer -> render path before changing the UI again.

