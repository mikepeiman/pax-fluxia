# HUD Redesign Handoff - Worktree 4b02 - 2026-05-23

## Branch

- `codex/ui-hud-development`
- Base work in this session started from a clean worktree after the plan commit `371cecdb0`.

## Intent

Implement the live in-game HUD redesign as an Aurelia Drift/Pax Fluxia command interface:

- Map-first composition.
- Dark glass panels with warm gold trim, cyan system focus, local-player gold emphasis, and player colors only for game state.
- Real gameplay state only; no invented combat/resource/faction/order systems.
- Settings ribbon collapses into the topbar, Player Standings collapses to the topbar badge, quick access stays unlabeled and bottom-docked.

## Source Changes

### New live HUD layer

`pax-fluxia/src/lib/components/game-hud/`

- `types.ts`: HUD view-model and layout/action types.
- `viewModels.ts`: derives player standings and selected-star view models from existing players/stars without schema changes.
- `HudPanel.svelte`: shared HUD panel shell.
- `HudIconButton.svelte`: shared SVG icon-button chrome.
- `HudTopbar.svelte`: compact topbar, settings reopen stub, standings badge, selected star, mode chips.
- `PlayerStandingsPanel.svelte`: replaces visible leaderboard with aligned real player standings.
- `GameSpeedPanel.svelte`: real speed controls only: pause, 1x, 2x, 4x, 10x.
- `SelectedStarPanel.svelte`: selected-star-only Star View; no owned-star fallback.
- `SelectedStarTray.svelte`: contextual bottom selected-star tray with center, fit map, and cancel-current-route only when present.
- `QuickAccessDock.svelte`: unlabeled bottom icon dock.
- `SettingsRibbon.svelte`: wrapper around existing settings panel with close, resize, dock, and expanded/compact controls.
- `HudRail.svelte`: shared rail primitive available for further extraction.
- `index.ts`: exports the HUD layer.

### Live integration

`pax-fluxia/src/lib/components/game/GameContainer.svelte`

- Lines near `24-31`: imports the new HUD layer.
- Lines near `453-466`: derives `PlayerStandingViewModel` and `SelectedStarViewModel`.
- Lines near `483-528`: builds real quick-access action definitions.
- Lines near `739-760`: mounts `HudTopbar`.
- Lines near `799-807`: mounts `SelectedStarTray`.
- Lines near `835-851`: mounts `SettingsRibbon` inside the `ribbon` grid area.
- Lines near `856-928`: mounts Player Standings, Game Speed, Star View, Tactical Overview, and Quick Access in the tactical rail.
- Lines near `1328-1380`: master grid now uses named areas `topbar`, `playfield`, `ribbon`, and `tactical`.
- Lines near `1835-1888`: ribbon and tactical rail sizing/docking styles.

### Shared style tokens

`pax-fluxia/src/app.css`

- Line `4`: imports the HUD stylesheet.
- Lines near `44-90`: defines the Aurelia Drift HUD token layer: fonts, cyan/gold accents, panel shells, borders, radii, spacing, shadows.

`pax-fluxia/src/lib/styles/hud.css`

- Shared HUD shell, topbar, panel, standings, speed, Star View, selected-star tray, quick-access, and compact-height responsive styles.
- Includes 720/900 desktop height handling so Star View and quick access do not collide.

### Existing settings cleanup

`pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

- Removed the settings utility `Load Map` button/drawer from the Theme/Settings cluster.
- Kept Theme Library in the settings utility area.
- Renamed old `icon-emoji` styling to `icon-symbol`.

`pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`

- Added `play-10` icon for the 10x gamespeed button.

## Validation

### Build

- `bun run --cwd pax-fluxia build`: passed.
- Build still emits existing warnings for unused CSS selectors and chunk sizes; no build failure.

### Check

- `bun run --cwd pax-fluxia check`: fails on existing repository baseline.
- Latest count after the HUD prop fix: `329 errors and 842 warnings in 66 files`.
- Touched-file filtering showed no new TypeScript errors in the new HUD layer or `GameContainer.svelte`.
- Remaining touched-file hits were existing unused CSS warnings in `GameSettingsPanel.svelte`.

### Browser QA

Driven through local Chrome/CDP against `http://127.0.0.1:1420/play`.

- Started a real local game from the menu.
- Selected an actual map star; Star View and selected-star tray updated to `Star 21`.
- Verified settings open/close from topbar.
- Verified settings grid switches to `"topbar topbar topbar" "ribbon playfield tactical"` when open and back to `"topbar topbar" "playfield tactical"` when closed.
- Verified Theme cluster text does not include `Load Map`.
- Verified Player Standings collapse/reopen via topbar badge.
- Verified 1920x1080, 1600x900, and 1280x720:
  - topbar does not overlap playfield or tactical rail.
  - tactical rail does not overlap playfield.
  - selected-star tray does not overlap tactical rail.
  - Star View does not overlap quick access after compact-height adjustment.
  - no visible `Quick Tools`, `Actions`, or `Low-frequency` labels.

## Merge Notes

- No gameplay schema, Colyseus, server, or combat logic changes were made.
- `GameContainer.svelte` still owns the master grid and canvas/overlay composition. The HUD surfaces are extracted, but a full `HudShell.svelte` wrapper was not introduced because the canvas/overlay coupling would make that a larger structural follow-up.
- `ThemeLibraryPanel.svelte` was not split out; Theme Library remains inside `GameThemeManager.svelte` through `GameSettingsPanel.svelte`.
- The right rail defaults to the existing `pax-sidebar-side` persistence and controls side uses `pax-controls-side`.
- Existing mobile behavior was preserved as a fallback; this pass is desktop-first.

## Suggested Review Focus

- Visual review against Aurelia Drift references, especially whether the current map renderer/theme should also change in a future pass.
- Confirm whether `Player Standings` should retain six rows at compact heights or truncate to a top-N list.
- Decide whether to complete the remaining structural extraction into a true `HudShell.svelte` in a follow-up branch.
