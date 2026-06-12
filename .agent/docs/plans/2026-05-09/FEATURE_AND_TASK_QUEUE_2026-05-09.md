# Feature And Task Queue - 2026-05-09

## Active Work

### In-Game Menu And Settings UI Improvement Continuation
- Continue the in-game HUD/menu/settings redesign from the 2026-05-08 interpretation pass.
- Preserve the documented direction:
  - unify theme selection into the settings utility header
  - convert the settings category launcher into a left-side vertical rail
  - reorder the right sidebar around leaderboard-first hierarchy
  - strengthen star-view
  - add a leaderboard emphasis toggle between active ships and total ships
  - remove redundant lower-menu chrome
- Confirm whether any additional user-supplied planning or resources are actually needed before implementation.

## Primary Artifacts
- Chat log: `.agent/docs/sessions/2026-05-09/2026-05-09_Chat_worktree-4b02.md`
- Session notes: `.agent/docs/sessions/2026-05-09/2026-05-09_Session_worktree-4b02.md`
- Merge handoff: `.agent/docs/plans/2026-05-09/HANDOFF_2026-05-09_WORKTREE_4B02_TO_MASTER.md`

## Status Update

### Implementation
- Implemented the accepted right-rail/settings redesign in:
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
  - `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`
  - `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`
- Theme selection is now integrated into the settings utility header instead of living as a separate lower-menu widget.
- Settings categories now render as a left-side vertical rail with labeled entries.
- Right sidebar is reordered around leaderboard first, then gamespeed and star-view, then low-frequency actions.
- Lower menu chrome was simplified to a static `Actions / Low-frequency` block.
- Leaderboard now exposes an `Active` vs `Total` emphasis toggle with aligned stat columns.

### Verification
- `bun run build` succeeded in `pax-fluxia/`.
- Production preview at `http://127.0.0.1:4174/play` was browser-validated successfully:
  - game launch succeeds from the menu
  - in-game right sidebar renders in the intended order
  - settings overlay opens
  - theme shortcut path lands in the integrated settings theme area
  - leaderboard emphasis toggle is visible
- Dev-server validation at `http://127.0.0.1:4173/play` is currently blocked by a separate Vite dependency-prebundle issue:
  - `Failed to resolve dependency: @colyseus/schema`
  - result in browser was a blank white page on the dev server only
