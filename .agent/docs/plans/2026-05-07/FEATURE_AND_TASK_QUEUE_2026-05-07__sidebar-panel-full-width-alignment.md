# 2026-05-07 Feature And Task Queue - Sidebar Panel Full-Width Alignment

## Purpose
- Keep right-sidebar action disclosures visually attached to their triggers while aligning them to the full section width instead of the right subcolumn.

## Active Task
- Correct the right-sidebar action sections so `Load` and `Save` panels open below the action row with full section alignment.

## Scope
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`

## Requirements
- Opened `Map` and `Game + Map` panels must align to the left edge of their action section, not the right action subcolumn.
- Panels must remain inside the sidebar viewport.
- Save inputs must shrink inside the sidebar instead of forcing horizontal overflow.
- Existing 200ms transitions and confirmation dialogs remain intact.

## Verification
- `bun run build`
- Human visual verification still required in-app.
