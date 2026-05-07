# Publish Facade Audience Implementation - 2026-05-06

## Purpose

Implement the user-requested publish facade without a mode architecture.

## Decision

Use `audience`, not `mode`.

- `public` = normal product shell
- `advanced` = intentionally revealable on live
- `internal` = explicit deep-link/operator tooling

This keeps:

- one runtime
- one `GAME_CONFIG`
- one route tree
- one set of stores

## Applied boundaries

### Shared policy

- Added shared audience parsing and persistence in `pax-fluxia/src/lib/shell/audience.ts`.
- Query params supported directly:
  - `advanced=1|0`
  - `internal=1|0`
  - `public=1|0`
- Legacy compatibility params still elevate internal access:
  - `bench=1`
  - `diag=1`
  - `startupDiag=1`
- Dev-shell access is now computed at read time instead of being stored as if it were an explicit internal unlock. That keeps public-shell preview honest inside `bun run dev`.

### Settings shell

- Settings sections are now tagged with `audience`.
- `GameSettingsPanel` uses the shared policy to decide what renders.
- `advanced` has a visible toggle.
- `internal` now has an explicit unlock/hide toggle when the shell is not already in full dev mode.
- Dev builds now expose a `Preview Public Shell` / `Resume Dev Shell` toggle in the same header area.
- Export/import config actions are internal-only.
- reset/clear-all remains off the default public shell.

### In-game shell

- `GameContainer` now hides diagnostics entry points from the default shell.
- Top-bar diagnostics/ruler/authored-measurements affordances only show when internal access is available.
- Territory render-mode shortcut buttons also follow the internal audience gate.

### Landing route

- Startup diagnostics and benchmark bridge install now go through the shared audience resolver.
- Public users no longer get diagnostics detail by default on the landing route.

### Main menu

- The existing command bar is now wired to:
  - open map selection
  - open the player-facing map editor

### Root build fix

- `pax-server` now declares `@colyseus/core` directly, matching its source imports.
- The server workspace build target is now `bun`, not `node`, because the transport depends on Bun builtins.

## Public UX correction

- The first audience-gating pass hid the in-game territory mode badges by treating them like internal tooling. That was wrong; they are player-facing topbar controls and were restored.
- The public settings surface was re-centered around player tasks rather than raw config/export tooling:
  - `Map`: `Load` / `Save`
  - `Game + Map`: `Load` / `Save`
  - `Session`: `Quit` / `Restart`
- `GameThemeManager` was re-laid out so the theme selector fills the available column width and action buttons sit beneath it instead of compressing the selector inline.
- The static production preview no longer triggers Vite 404s for `/__maps` or `/__games`; those filesystem endpoints are now treated as dev-only persistence affordances.

## Risks intentionally not taken

- No second player-vs-dev store boundary.
- No duplication of player and developer UIs.
- No compile-time prod/dev app split.
- No `GAME_CONFIG` fork.

## Next likely refinement

The current pass uses one `internal` bucket for diagnostics/logging/AI.

If the live shell still feels too dense, the next refinement should be:

1. carve out a live-safe diagnostics subset as `advanced`
2. leave bundle/export/verbose diagnostics in `internal`
