# Feature And Task Queue - 2026-04-13

## Purpose

Debug the broken Main Menu presentation issue in the active worktree and pull in the complete current Main Menu work from `C:\Users\mikep\.codex\worktrees\0251\pax-fluxia`.

## Completed This Slice

- [x] Diff the active worktree against `0251` and identify the full Main Menu dependency surface instead of guessing at a local CSS-only cause.
- [x] Import the `0251` Main Menu surface into this worktree, including `MainMenu.svelte`, the new `main-menu/*` subcomponents, `menuTheme.ts`, `AudioSettings.svelte`, `GameSettingsPanel.svelte`, `panelSync.ts`, the updated settings sections, and `GameContainer.svelte`.
- [x] Restore the current worktree's territory/config deltas on top of the imported menu stack where they overlapped, specifically `METABALL_FILL_FOLLOWS_GEOM`, `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS`, and the missing arrow config/type surface in `game.config.ts`.
- [x] Remove the old unreferenced `MainMenu refactor.svelte` and `MainMenu v2.svelte` prototype files so the imported menu surface matches the source worktree cleanly.
- [x] Verify the imported Main Menu stack compiles with `bun run build`.

## Follow-Ups

- [ ] User-verify that the imported Main Menu presentation issue is resolved in-app.
- [ ] If any presentation issue remains, debug against the imported `0251` shell rather than the old local grid path.
