# 2026-05-07 Sidebar Panel Column Alignment

## Purpose
Keep the in-game right sidebar usable when attached action panels open. The panel has to stay physically associated with the initiating controls, but the owning layout container is still the sidebar column.

## Facts
- The user observed that the previous attached-panel implementation pushed save/load UI out of the viewport.
- The screenshot showed the opened save field hanging off the right edge and the left section labels clipped.
- The failure was in `pax-fluxia/src/lib/components/game/GameContainer.svelte`, not in the theme manager or audience policy.

## Implemented
- The sidebar action layout was changed from button-slot-owned panel positioning to body-column-owned panel positioning.
- The `menu-action-section` layout now keeps:
  - labels on the left
  - action buttons on the right
  - opened panel content below the action buttons in the same right column
- Existing confirmation dialogs and 200ms transitions from the prior pass were preserved.

## Verification
- `bun run build`
- Human in-app verification still required
