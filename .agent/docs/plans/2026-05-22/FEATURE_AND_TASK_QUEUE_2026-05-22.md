# Feature And Task Queue - 2026-05-22

## Active

- Continue UI/HUD development on `codex/ui-hud-development`, including test surfaces for external HUD layout work.
- Keep the Svelte/Tailwind UI test surface mergeable and documented.

## Completed

- Read `.agent/AGENT.md`.
- Read `.agent/MULTI_LANE_WORKTREE_GUIDE.md`.
- Confirmed the worktree had no current branch name and contained uncommitted UI/HUD source changes, documentation artifacts, and one new HUD icon component.
- Created branch `codex/ui-hud-development` for the UI/HUD development lane.
- Planned commits so all existing source and documentation work is included, with no exclusions.
- Created organized commits for layout shell, settings/theme surfaces, tactical HUD widgets, documentation/handoff history, and validation reporting.
- Ran `bun run --cwd pax-fluxia check`; it failed with 329 errors and 842 warnings across 66 files.
- Assessed external HUD layout mockup/design doc from `C:/Users/mikep/Downloads/`.
- Added an in-game topbar `UI test` link to `/dev/ui-test`.
- Added `/dev/ui-test` with a back link to `/?showGame=1`.
- Adapted the external mockup into a local Svelte test harness without Tailwind dependencies or corrupted glyphs.
- Ran `bun run --cwd pax-fluxia build`; it passed with existing warnings.
- Fixed the `/dev/ui-test` runtime failure caused by rendering Svelte snippets as components instead of using `{@render ...}`.
- Installed Tailwind CSS v4 with the official Vite plugin path using Bun.
- Added Tailwind to `pax-fluxia/vite.config.js` and imported it from `pax-fluxia/src/app.css`.
- Restricted Tailwind scanning to `src/routes` and `src/lib/components` to avoid generating false-positive utilities from renderer source comments.
- Ran `bun run --cwd pax-fluxia build`; it passed with existing unused-CSS and chunk-size warnings.

## Commit Plan

- Commit UI layout shell and shared HUD chrome.
- Commit settings, theme, and Theme Library surface changes.
- Commit tactical HUD widgets and icon component changes.
- Commit documentation, handoff, chat logs, task queues, screenshot artifact, and post-mortem work.

## Validation

- `git status --short` was clean after the first four commits.
- `bun run --cwd pax-fluxia check` failed.
- Representative failures included missing `GameConfigType` keys in `game.config.ts`, map/authored-lane type mismatches in `gameStore.svelte.ts`, corrupted type/import names under `src/lib/territory/orchestrator/`, archived HUD prop type errors, `MainMenu.svelte` missing new command props, and missing `upsertSavedMapDefinition` on `gameStore` in the map editor route.
- `bun run --cwd pax-fluxia build` passed after adding the UI test route.
- `bun run --cwd pax-fluxia build` passed after fixing the Svelte snippet rendering issue and installing Tailwind CSS.
- Tailwind setup was verified against the official Tailwind CSS Vite installation approach.
