# Handoff - 2026-05-07 - HUD Shell Audience And Sidebar Actions

## Why This Pass Happened
- The prior audience-facade work put player save/load/session actions into `GameSettingsPanel.svelte`.
- The user clarified that this was the wrong surface.
- The intended surface is the always-open right sidebar menu beside the leaderboard in the in-game shell.
- The user also explicitly requested that the public/dev shell toggles live in the topbar, not in Settings.

## What Changed
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
  - Now owns `audienceAccess` as shell state.
  - Persists audience changes through the existing storage helpers in `src/lib/shell/audience.ts`.
  - Passes audience state and audience-escalation callbacks into `GameSettingsPanel`.
  - Adds grouped sidebar action cards for:
    - `Map`
    - `Game + Map`
    - `Session`
  - Keeps the old menu action block behind `{#if false}` as a temporary safety fallback because the file already contains encoding-damaged text and a direct large-block rewrite was higher risk.
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
  - Adds compact audience controls in the HUD topbar:
    - `Dev` / `Public`
    - `Advanced`
    - `Internal`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - No longer renders the audience toggle row.
  - No longer renders the misplaced player save/load/session controls in the visible header area.
  - Consumes parent-provided `audienceAccess` plus escalation callbacks instead of owning shell policy locally.

## Current Behavior To Verify
- Desktop in-game topbar should show shell toggles instead of burying them in Settings.
- Desktop right sidebar menu should show grouped actions:
  - `Map: Load | Save`
  - `Game + Map: Load | Save`
  - `Session: Quit | Restart`
- The settings panel should no longer show that same player action cluster.
- Diagnostics visibility should still follow audience/internal access.
- Territory mode badges should still remain visible in the topbar for players.

## Known Technical Debt
- `GameSettingsPanel.svelte` still contains hidden legacy/incorrect utility blocks behind `{#if false}`.
- `GameContainer.svelte` also keeps the replaced old sidebar action block behind `{#if false}` for now.
- If this UI direction sticks, the next cleanup pass should delete the hidden blocks and remove the now-unused CSS selectors to cut warning noise.

## Validation Already Run
- `bun run build` passed.
- `bunx vitest run src/lib/shell/audience.test.ts` passed.

## Next Sensible Steps
- Do a browser-side verification pass on the in-game shell.
- If the action cards feel cramped at narrow sidebar widths, add a responsive collapse rule for `menu-action-groups`.
- After user confirmation, remove the hidden fallback blocks and dead CSS.
