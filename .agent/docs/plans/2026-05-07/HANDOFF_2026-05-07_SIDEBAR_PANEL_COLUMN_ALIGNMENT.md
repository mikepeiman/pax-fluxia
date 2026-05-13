# Handoff - 2026-05-07 Sidebar Panel Column Alignment

## Intent
Repair the right-sidebar action surface after the attached-panel pass overfit to button-level alignment and produced horizontal overflow.

## Implemented
- Reworked the sidebar action section layout in `pax-fluxia/src/lib/components/game/GameContainer.svelte` so each section now has:
  - a left label column
  - a right action body column
  - the `Load` / `Save` buttons in a two-button row inside that body
  - the opened panel rendered below that row inside the same body column
- Kept the attached interaction model:
  - `Load Map`, `Save Map`, `Load Game`, and `Save Game` still open directly under their initiating action row
  - opened panels still scroll into view in the sidebar column
- Preserved the prior confirmation-dialog work for:
  - restart session
  - delete saved map
  - delete saved game
- Preserved 200ms transitions on the touched sidebar/theme surfaces.

## Why The Previous Layout Failed
- The earlier pass interpreted "attached to the control" too literally and let panel positioning inherit from the button slot rather than the sidebar content column.
- That violated the real UI invariant: attached panels must still be owned by the sidebar column and viewport, not by the local button edge.

## Verification
- `bun run build` passed.
- No browser-side visual verification was performed by the agent in this pass.

## Remaining Risk
- This is a structural fix based on code inspection and build validation. Human verification is still needed to confirm the sidebar now expands downward without clipping labels or pushing the save input outside the viewport.
