# Feature And Task Queue - 2026-04-30

## Active
- User verification of the refactored `Territory Styles` and `Territory Tuning & Constraints` surfaces in live `metaball_grid_phase_edges` and `metaball_grid`.
- Remove the now-inert legacy `shape` block still parked behind `false` in `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`.
- Continue auditing for any remaining territory controls that are surfaced but not consumed by the active render-family contract.

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

## Next
- Get live user confirmation on:
  - `Territory Styles > Fill` controls changing visible fill paint immediately
  - `Territory Styles > Border` controls changing visible border geometry immediately
  - no remaining duplicated topology/source controls
- If any surfaced style control still does nothing, trace definition -> consumer -> render path before changing the UI again.
