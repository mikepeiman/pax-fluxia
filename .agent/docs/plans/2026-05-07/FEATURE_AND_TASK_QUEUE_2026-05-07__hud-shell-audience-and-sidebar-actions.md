# 2026-05-07 Queue - HUD Shell Audience And Sidebar Actions

## Active Work
- Move the player-facing save/load/session action model out of `GameSettingsPanel.svelte` and into the always-open right sidebar menu in `GameContainer.svelte`.
- Move shell audience toggles out of Settings and into the in-game HUD topbar in `GameHudTopBar.svelte`.
- Keep one runtime and one audience policy, but make the HUD shell own that policy instead of the settings panel.

## Completed In This Pass
- Added topbar audience controls in `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`.
- Moved audience state ownership into `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
- Passed `audienceAccess` and audience-escalation callbacks down into `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Added grouped sidebar actions in the right menu:
  - `Map: Load | Save`
  - `Game + Map: Load | Save`
  - `Session: Quit | Restart`
- Hid the misplaced action block and audience toggle row from the settings panel.

## Validation
- `bun run build`
- `bunx vitest run src/lib/shell/audience.test.ts`

## Follow-Up
- Visual QA in dev and preview on the desktop in-game shell.
- Optional cleanup: remove now-unused hidden settings-panel utility CSS and dead helper code after the UI direction is confirmed.
