# Session Note - 2026-05-07 - HUD Shell Audience And Sidebar Actions

## Goal
- Correct the audience-facade UX regression by moving shell controls and player actions back onto the intended game HUD surfaces.

## Facts
- The user explicitly identified the correct player-facing surface as the always-open right sidebar menu beside the leaderboard.
- The user explicitly requested that public/dev toggles live in the topbar, not in the settings panel.
- The current audience implementation previously split shell-state ownership across `GameContainer.svelte` and `GameSettingsPanel.svelte`.

## Implementation
- Re-centered audience ownership into `GameContainer.svelte`.
- Added topbar audience toggles to `GameHudTopBar.svelte`.
- Passed `audienceAccess` and escalation callbacks into `GameSettingsPanel.svelte`.
- Added grouped sidebar action cards for map, game-plus-map, and session actions.
- Hid the misplaced settings-panel action block instead of risking a large destructive rewrite in a file with existing encoding damage.

## Validation
- `bun run build` passed.
- `bunx vitest run src/lib/shell/audience.test.ts` passed.

## User Verification Needed
- Confirm the desktop in-game shell now matches the intended surface model.
- Confirm the topbar toggle placement is acceptable.
- Confirm the right-sidebar grouped action layout is the intended one before dead-code cleanup.
