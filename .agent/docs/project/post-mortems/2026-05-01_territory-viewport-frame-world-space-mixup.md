# Post-Mortem: 2026-05-01 - Territory Viewport Frame vs World-Space Mixup

## What Happened

I implemented an initial map-centering / fill-bounds fix that the user rejected immediately. The result introduced margins on all four edges and still did not center the map correctly in the canvas grid area.

## Root Cause

I solved the wrong level of the problem.

- I treated the territory fill bounds as though they should become the one authoritative world rect.
- That collapsed three different concerns into one:
  - star-fit camera rect
  - stable authored/display map rect
  - viewport-aligned territory presentation frame
- After adding a viewport-aligned territory frame, I also failed to localize the territory renderer inputs into that shifted frame.
- The territory presentation request signature did not include the presentation frame key, so paused/quiescent presentation could reuse a stale fill render after the frame changed.

## Impact

- The fix made the fill block visually worse instead of better.
- It risked hard-coding the wrong architectural model into a shared `GameCanvas` choke point.
- Without correction, other worktrees merging on top of this would inherit a misleading “world rect solved it” story while still carrying a presentation-space drift bug.

## Corrective Actions

- Preserved three distinct rectangles:
  - star-fit camera rect
  - stable authored/display map rect
  - viewport-aligned territory presentation frame
- Added `pax-fluxia/src/lib/components/game/territoryPresentationSpace.ts`.
- Localized territory presentation stars and canonical geometry into the viewport-aligned frame before rendering.
- Added the territory presentation frame key to the paused/live render request signature.
- Added focused tests:
  - `pax-fluxia/src/lib/components/game/worldRect.test.ts`
  - `pax-fluxia/src/lib/components/game/territoryPresentationSpace.test.ts`

## Lessons

- “One authoritative rectangle” was too coarse for this presentation problem.
- If a container is shifted, its child renderer inputs must move into the same coordinate space.
- User rejection of a visual/layout fix is often exposing a coordinate-space ownership bug, not a tiny offset bug.
- Shared choke points like `GameCanvas.svelte` require explicit merge-facing documentation when the fix introduces a new adapter pattern.
