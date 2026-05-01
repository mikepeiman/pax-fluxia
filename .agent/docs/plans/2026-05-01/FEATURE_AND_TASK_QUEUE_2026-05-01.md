# Feature And Task Queue - 2026-05-01

## Active
- Live user verification that the preferred Phase Edges mode is centered by the star-fit rect again after the map-rect centering step was rejected.
- Live user verification that territory fills now extend symmetrically around that centered star-fit view.
- Live user verification that `Outer perimeter border` is either fully absent when off or fully consistent around the map when on.
- Continue Phase Edges acceptance work from 2026-04-30 after the viewport/world-rect correction:
- no structural fill/border divergence
- no stable-area steady-state vs transition border divergence
- Queue the next acceptance pass after centering/perimeter verification:
  - investigate end-of-transition jank/disjointness in the preferred Phase Edges transition
  - test whether the end-state snap is skipping or collapsing the final few presentation frames

## Completed
- Audited the map/viewport defect as a world-rect ownership bug, not a CSS-only issue.
- Added `pax-fluxia/src/lib/components/game/worldRect.ts` to resolve one authoritative map rectangle for camera fit and territory world sizing.
- Rewired `GameCanvas.svelte` to separate:
  - star-fit camera rect
  - stable authored/display map rect
  - viewport-aligned territory presentation frame
- Added fallback protection so stale configured map extents cannot clip a live star field.
- Added debug/saved-map metadata seeding in `gameStore.svelte.ts` so non-standard map flows also provide map extents to the viewport logic.
- Added `pax-fluxia/src/lib/components/game/worldRect.test.ts`.
- Corrected the failed first viewport fix by adding `pax-fluxia/src/lib/components/game/territoryPresentationSpace.ts`, which localizes stars and canonical geometry into the viewport-aligned territory frame before rendering.
- Added `pax-fluxia/src/lib/components/game/territoryPresentationSpace.test.ts`.
- Added territory presentation frame invalidation to the paused/live territory render signature so a resized/recentered viewport frame cannot reuse a stale fill render.
- Re-audited the second viewport theory after live user rejection and retired the idea that a viewport-sized territory presentation frame should own the visible map fill.
- Added `resolveMapFitWorldRect()` to `pax-fluxia/src/lib/components/game/worldRect.ts`.
- Rewired `GameCanvas.svelte` so stage fit, centering, zoom anchoring, and pan clamping now use the authoritative map rect instead of the star-fit rect.
- Re-locked the territory presentation frame to the authoritative map rect so stars, fills, and borders share the same map ownership contract again.
- Added a first-class `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED` toggle and surfaced it in `Territory Styles > Border` as `Outer perimeter border`.
- Corrected the Phase Edges centered-blended edge path so owner-vs-world perimeter edges are drawn by an explicit perimeter pass instead of leaking asymmetrically from the owner-owner adjacency pass.
- Rejected the map-rect centering theory after live user feedback and restored star-fit centering in `GameCanvas.svelte` while keeping the explicit outer-perimeter toggle/path.
- Corrected the remaining localized Phase Edges sampling defect by preserving the global grid phase through the viewport-local presentation frame:
  - `RenderFamilyInput.world` now carries presentation-frame `minX/minY`
  - `buildRenderFamilyInput()` now freezes those values into the family contract
  - `buildGridClassification()` now preserves world-grid phase for localized presentation frames instead of rebuilding as a fresh `0`-anchored grid every time
  - `MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, and the plan-worker request all now propagate that phase-preserving world contract
- Replaced the old optional outer-perimeter border leak path with a real clipped-frame perimeter pass in `MetaballGridPhaseEdgesFamily.ts`:
  - owner-vs-world perimeter is now derived from the actual presentation-frame boundary
  - not from whichever sampled grid column happened to be last
  - this keeps `Outer perimeter border` a first-class optional feature rather than a right-edge artifact
- Added regression coverage in `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.test.ts` for localized frame phase preservation.
- Validated the current delta with:
  - `bun ./node_modules/vitest/vitest.mjs run src/lib/territory/families/metaballGrid/buildGridClassification.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts tools/debug/benchmark-frontier-techniques.test.ts`
  - `bun x vite build`

## Next
- User confirms the live result in the running worktree.
- If a one-sided fill margin still remains after the grid-phase preservation change, inspect whether any fill suppression/occupancy layer is still dropping the last visible owner column rather than a centering baseline problem.
- If the outer perimeter is still asymmetric, inspect whether any border path outside the centered-blended pass still bypasses `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED`.
- After those two live checks pass, start the queued transition end-jank investigation.
