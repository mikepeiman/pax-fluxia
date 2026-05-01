# Feature And Task Queue - 2026-05-01

## Active
- Live user verification that the preferred Phase Edges mode is now centered inside the canvas grid area after the presentation-space adapter change.
- Live user verification that territory fills now reach the full viewport/grid-area bounds without the all-edge margins introduced by the earlier failed viewport fix.
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

## Next
- User confirms the visual result in the running worktree.
- If any asymmetry remains, inspect whether the remaining gap is:
  - CSS grid/container sizing outside Pixi
  - a specific territory family sampling domain that ignores the localized frame
  - a saved-map/debug-map metadata case that still yields a wrong authored/display map rect
