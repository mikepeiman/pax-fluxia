# 2026-05-07 Feature And Task Queue - Sidebar Panel Column Alignment

## Purpose
- Keep right-sidebar action panels attached to their initiating controls without letting them escape the sidebar column or clip adjacent labels.

## Active Task
- Correct the sidebar action layout so `Load` and `Save` panels open below the action row inside the right content column, not off a per-button slot.

## Scope
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`

## Requirements
- `Load Map`, `Save Map`, `Load Game`, and `Save Game` stay visually attached to their initiating controls.
- Opened panels must remain inside the sidebar container and respect the viewport width.
- The `Map`, `Game + Map`, and `Session` labels must remain fully readable.
- Existing 200ms transitions and confirmation dialogs remain intact.

## Verification
- `bun run build`
- Human visual verification still required in-app.
