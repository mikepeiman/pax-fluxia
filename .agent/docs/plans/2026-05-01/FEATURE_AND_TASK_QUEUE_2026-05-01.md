# Feature And Task Queue - 2026-05-01

## Active
- Live user verification that the preferred Phase Edges mode is now centered by the authoritative map rect rather than by the star-fit rect.
- Live user verification that territory fills now reach the full viewport/grid-area bounds without the all-edge margins introduced by the earlier viewport-aligned presentation-frame theory.
- Live user verification that `Outer perimeter border` is either fully absent when off or fully consistent around the map when on.
- Continue Phase Edges acceptance work from 2026-04-30 after the viewport/world-rect correction:
- no structural fill/border divergence
- no stable-area steady-state vs transition border divergence

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

## Next
- User confirms the live result in the running worktree.
- If centering is still not exact after the map-rect fit change, inspect whether the remaining offset is:
  - CSS grid/container sizing outside Pixi
  - a stage child outside the unified map-fit transform path
  - stale saved-map/debug-map metadata feeding the wrong authored/display map rect
- If the outer perimeter is still asymmetric, inspect whether any remaining border path bypasses `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED` and still treats out-of-bounds neighbors as implicit edges.
