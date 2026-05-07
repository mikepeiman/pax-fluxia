# Handoff - 2026-05-06 Audience Facade

**Date:** 2026-05-06  
**Branch:** `codex/ui-settings/audience-facade`  
**Base commit at start of pass:** `75ff6b700`

## Purpose

Ship a cleaner player-facing facade without introducing a second app personality or a parallel runtime.

## Chosen architecture

- One runtime, one config model, one codebase.
- No global `player` / `developer` mode store.
- Shell/UI exposure is controlled with a shared `audience` policy:
  - `public`
  - `advanced`
  - `internal`

## What changed

Added shared audience policy:

- `pax-fluxia/src/lib/shell/audience.ts`
- `pax-fluxia/src/lib/shell/audience.test.ts`

Applied audience classification to settings sections:

- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

Applied shell gating:

- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/routes/+page.svelte`

Kept player-facing map affordances intact and wired the existing command bar:

- `pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte`

## Behavioral contract after today

- `public` surfaces are visible by default.
- `advanced` settings are revealable from the settings shell.
- `internal` tools stay out of the normal shell, but explicit deep links and the settings-shell unlock toggle still expose them.
- Dev builds now support a true public-shell preview without leaving `bun run dev`.
- Legacy query params:
  - `bench=1`
  - `diag=1`
  - `startupDiag=1`
  now flow through the shared audience resolver instead of bypassing shell policy.
- `public=1|0` now controls the dev-only public-shell preview override and persists to local storage.

## Current audience matrix

- `public`
  - players
  - timing
  - map options
  - audio
- `advanced`
  - economy
  - combat
  - travel
  - conquest
  - effects
  - territory tuning / styles / family sections
  - fleet & star visuals
- `internal`
  - diagnostics
  - logging
  - AI tuning section

## Validation

Ran:

- `bun install` at repo root
- `bunx vitest run src/lib/shell/audience.test.ts`
- `bun run build`

Results:

- Audience unit test passed.
- Root workspace build passed after fixing the Bun server package metadata and build target.
- `bun run check` still fails on large pre-existing repo-wide issues outside this pass.
- Targeted `check` filtering showed no changed-file type errors from this audience pass; touched-file output was limited to existing `GameSettingsPanel.svelte` unused CSS selector warnings.

## User verification needed

- Open the normal player flow and confirm diagnostics/internal tools are no longer present by default.
- In `bun run dev`, use the new settings toggle or `?public=1` and confirm the shell matches the public facade without a production build.
- Open advanced settings and confirm tuning sections appear without changing gameplay runtime behavior.
- Visit deep-link tooling paths/params and confirm diagnostics still open when explicitly requested.
- Confirm the main menu command bar now exposes map-editor access as a player-facing action.

## Follow-on fix applied after first pass

- `pax-server/package.json` now declares `@colyseus/core` directly because the server imports it directly.
- `pax-server/package.json` build target changed from `--target node` to `--target bun` because the transport imports Bun builtins and could not produce a valid workspace build under the Node target.
- Public-shell regression correction:
  - territory mode badges in the in-game top bar are player-facing and must remain visible in public
  - public settings now surface grouped player actions:
    - `Map`: `Load` / `Save`
    - `Game + Map`: `Load` / `Save`
    - `Session`: `Quit` / `Restart`
  - theme selector layout was widened to fill its parent column instead of competing inline with action buttons
  - static preview no longer probes dev-only `/__maps` and `/__games` filesystem endpoints

## Next follow-up options

- Split the current diagnostics surface into:
  - live-safe advanced diagnostics
  - true internal diagnostics
- Add a deliberate hidden operator toggle in the shell, if desired, instead of relying only on deep links and persisted unlock.
- Move more internal-only utility actions out of `GameSettingsPanel` if the player shell still feels too dense.
