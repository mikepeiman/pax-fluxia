# Feature And Task Queue - 2026-05-06

## Purpose

> "A new player/developer split, making it easy to set default modes, update UI and features etc as a developer, but to ship a proper user-facing product, with a modified UI with all the developer options hidden."

Current execution interpretation:

- do not add a global player/developer mode architecture
- keep one runtime and one codebase
- publish a cleaner player-facing shell by classifying surfaces by audience

## Active

- Add a shared `audience` policy with `public | advanced | internal`.
- Gate settings sections, diagnostics entry points, startup diagnostics, and benchmark bridges through that policy.
- Keep `MainMenu` and `/map-editor` player-facing.
- Preserve deep-link access to internal tools without making them part of the normal shipped shell.
- Start the dated handoff and session docs for this branch/worktree.

## Spec / status alignment

- The user explicitly rejected a global mode architecture as too invasive and drift-prone.
- The current repo already centralizes most dev-surface leakage in shell/UI choke points:
  - `pax-fluxia/src/routes/+page.svelte`
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `MainMenu` remains product UI, not dev-only UI.
- `/map-editor` remains player-facing.

## Current pass

- Introduce `pax-fluxia/src/lib/shell/audience.ts` for shared policy, query parsing, and persistence.
- Classify settings sections in `settingsRegistry.ts`:
  - `public`
  - `advanced`
  - `internal`
- Hide internal diagnostics controls from the default in-game shell while keeping deep-link compatibility through query params and persisted unlock.
- Wire the existing main-menu command bar to the player-facing map editor and map-selection affordances.

## Verification target

- Default shell hides diagnostics/internal tooling from normal player flow.
- `advanced` settings are revealable without forking runtime state.
- Legacy `bench=1`, `diag=1`, and `startupDiag=1` still work, but only through the shared audience policy.
- `bun run build` passes.
- `bun run check` remains blocked by existing repo-wide errors unrelated to this pass; touched files should not introduce new type errors.
