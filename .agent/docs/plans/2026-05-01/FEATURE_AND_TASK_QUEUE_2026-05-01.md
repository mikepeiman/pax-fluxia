# Feature And Task Queue - 2026-05-01

## Active
- Live user verification that the map is now centered inside the canvas grid area in the preferred Phase Edges mode.
- Live user verification that territory fills now reach the bottom and right viewport/grid-area bounds instead of stopping early.
- Continue Phase Edges acceptance work from 2026-04-30 after the viewport/world-rect correction:
- no structural fill/border divergence
- no stable-area steady-state vs transition border divergence

## Completed
- Audited the map/viewport defect as a world-rect ownership bug, not a CSS-only issue.
- Added `pax-fluxia/src/lib/components/game/worldRect.ts` to resolve one authoritative map rectangle for camera fit and territory world sizing.
- Rewired `GameCanvas.svelte` to use the authoritative map rect instead of the star-only bounding box when centering and sizing the world.
- Added fallback protection so stale configured map extents cannot clip a live star field.
- Added debug/saved-map metadata seeding in `gameStore.svelte.ts` so non-standard map flows also provide map extents to the viewport logic.
- Added `pax-fluxia/src/lib/components/game/worldRect.test.ts`.

## Next
- User confirms the visual result in the running worktree.
- If any asymmetry remains, inspect whether the remaining gap is:
  - CSS grid/container sizing
  - a specific territory family sampling domain
  - a saved-map metadata case that still needs canonical width/height
