# Handoff - 2026-05-13 Audience Shell And Sidebar UX

**Date:** 2026-05-13
**Branch:** `codex/ui-settings/audience-facade`
**Current HEAD:** `1b608404d` (`Refine public shell and in-game menu UX`)

## Purpose

The user explicitly rejected a full player/developer mode architecture and instead asked:

> "what's an approach that will make publishing to live with the player-facing facade and stable codebase easy, while not hindering extensive development and refactoring on the dev side?"

The resulting direction for this branch is:

- one runtime
- one codebase
- one core config model
- a shell-level audience facade over the existing product and tooling surfaces

## Branch-Level Outcome

This branch does **not** split the app into separate player and developer runtimes.

It implements a shared `audience` policy that controls **what is surfaced in the UI shell**, while keeping the underlying runtime unified:

- `public`
- `advanced`
- `internal`

The audience policy is used to make the shipped facade cleaner without breaking development velocity or forcing duplicated surfaces.

## Current Behavior

### Audience Shell

- `public` is the normal player-facing shell.
- `advanced` is intentionally revealable.
- `internal` remains hidden from the normal shell unless explicitly unlocked.
- Dev builds support a public-shell preview instead of forcing a production build for every facade check.

### In-Game Topbar

- Audience controls live in the HUD topbar, not in Settings.
- The topbar can expose:
  - `Dev` / `Public`
  - `Advanced`
  - `Internal`
- Territory mode badges remain visible for players and were restored after an earlier regression.

### Settings

- `GameSettingsPanel.svelte` still exists as the settings surface, but audience gating is registry-driven.
- Settings sections are classified by audience instead of relying on a separate app mode.
- The panel no longer owns the visible player save/load/session action surface.

### Main Menu

- Main menu game setup remains player-facing.
- Player-facing map-editor access was preserved.
- Dev-only/public-preview shell behavior is resolved through the same audience policy, not through a second runtime.

### Right Sidebar Menu

- The always-open in-game right sidebar now owns the player action model the user asked for.
- Grouped action sections:
  - `Map`: `Load | Save`
  - `Game + Map`: `Load | Save`
  - `Session`: `Quit | Restart`
- `Load` / `Save` open as attached disclosures under their action row.
- Final disclosure behavior:
  - attached to the action section
  - aligned to the full section width
  - kept within the sidebar viewport
- `Restart`, saved-map delete, and saved-game delete now require confirmation.
- Touched interactions use 200ms transitions.

### Theme UI

- The menu theme section was reworked away from the earlier cramped layout.
- Theme wording and action labels were cleaned up:
  - `Library`
  - `Save Copy`
- The selector and action layout were widened to behave like a proper column surface.

### Deep Links / Preview / Tooling Exposure

- Query-param entry into tooling now flows through the shared audience policy instead of bypassing it.
- Relevant opt-in / preview behavior includes:
  - `public=1|0`
  - `internal=1`
  - `diag=1`
  - `bench=1`
  - `startupDiag=1`

### Saved Maps / Games Bridge

- Static preview/live should no longer probe the dev-only filesystem endpoints by default.
- The dev bridge paths `/__maps` and `/__games` remain in the store for dev-side persistence flows, but preview/live behavior was adjusted so the player-facing facade does not break on those endpoints.

## Primary Files

### Audience Policy
- `pax-fluxia/src/lib/shell/audience.ts`
- `pax-fluxia/src/lib/shell/audience.test.ts`

### Shell / Menu / Settings Surfaces
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

### Route / Resolver / Persistence Touchpoints
- `pax-fluxia/src/routes/+page.svelte`
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
- `pax-server/package.json`

## Validation Status

### Agent-Run Validation

Previously run during implementation:

- `bunx vitest run src/lib/shell/audience.test.ts`
- `bun run build`

Results:

- Audience tests passed.
- Workspace build passed.
- Root build failure around `@colyseus/core` was fixed in this branch.
- `bun run check` was not cleared repo-wide; there were pre-existing warnings/issues outside the scope of this branch.

### User Verification

User observations corrected several intermediate UX failures during implementation.

Final explicit user verification on the sidebar disclosure alignment:

> "Yes, it is now good."

That should be treated as the authoritative signoff for the final full-width sidebar panel alignment.

## Known Remaining Debt

### Hidden Fallback Blocks

These still exist and should be cleaned up once the branch direction is unquestionably stable:

- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
  - retains an old replaced menu/action block behind `{#if false}`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - retains hidden legacy/incorrect blocks behind `{#if false}`

### Existing Warning Noise

- Existing unused CSS warnings remain in the repo, especially around `GameSettingsPanel.svelte` and other settings components.
- Those warnings were not introduced or resolved by this documentation pass.

### Follow-Up Cleanup That Still Makes Sense

- Delete hidden fallback blocks once no rollback path is needed.
- Remove dead CSS associated with those hidden blocks.
- Re-evaluate whether the current diagnostics split is the final intended public/advanced/internal breakdown.
- If desired, consolidate the multiple dated handoff docs from 2026-05-06 and 2026-05-07 into one archival index note.

## Earlier Detailed Handoffs

If a future agent needs the implementation history rather than just the current state, start here:

- `.agent/docs/plans/2026-05-06/HANDOFF_2026-05-06_AUDIENCE_FACADE.md`
- `.agent/docs/plans/2026-05-07/HANDOFF_2026-05-07_HUD_SHELL_AUDIENCE_AND_SIDEBAR_ACTIONS.md`
- `.agent/docs/plans/2026-05-07/HANDOFF_2026-05-07_ATTACHED_MENU_PANELS_AND_CONFIRMATIONS.md`
- `.agent/docs/plans/2026-05-07/HANDOFF_2026-05-07_SIDEBAR_PANEL_COLUMN_ALIGNMENT.md`
- `.agent/docs/plans/2026-05-07/HANDOFF_2026-05-07_SIDEBAR_PANEL_FULL_WIDTH_ALIGNMENT.md`

## Recommended Next Step

If work resumes on this branch, the next highest-value task is not new audience logic. It is cleanup:

- remove the hidden fallback blocks
- remove dead CSS / warning noise
- keep the verified sidebar interaction model intact
