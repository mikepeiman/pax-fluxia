# Handoff - 2026-05-07 Sidebar Panel Full-Width Alignment

## Intent
Repair the sidebar action disclosure layout again after the previous correction still left opened panels indented under the right action subcolumn.

## Implemented
- Moved the `Map` and `Game + Map` disclosure panels out of the nested `menu-action-body` column in `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
- The opened `Load` / `Save` panels and feedback rows are now direct children of each `menu-action-section`, so they can span the full section width.
- Added `grid-column: 1 / -1` to:
  - `.menu-action-panel`
  - `.menu-action-feedback`
- Hardened the save row sizing:
  - `map-save-row--menu` now uses `grid-template-columns: minmax(0, 1fr) auto`
  - `map-name-input` now has `width: 100%` and `min-width: 0`
  - `map-save-btn` now uses `white-space: nowrap`

## Why The Previous Fix Was Still Wrong
- The earlier correction solved the viewport escape but still treated the right action body as the disclosure owner.
- The user requirement was stronger than that: the opened surface belongs to the whole sidebar action section, not just the right-hand controls column.

## Verification
- `bun run build` passed.
- No browser-side visual verification was performed by the agent in this pass.

## Remaining Risk
- This is still awaiting human confirmation in the real UI. The key thing to verify is that the left edge of the opened `Load` / `Save` surface now matches the left edge of the section card rather than the controls column.
