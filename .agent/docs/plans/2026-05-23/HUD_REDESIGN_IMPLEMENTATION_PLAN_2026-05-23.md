# Pax Fluxia Full In-Game HUD Redesign Implementation Plan - 2026-05-23

## Purpose

Redo the live in-game UI as one coherent Pax Fluxia command HUD, using the mockups/docs as direction but binding only to real gameplay state. The result should be premium sci-fi, legible, compact, collapsible, and map-first.

## Direction

- Visual style: Aurelia Drift/Pax Fluxia dark glass shell, cyan system focus, warm gold selection/local-player emphasis, and player/star colors only for game signals.
- Scope: live in-game HUD, settings ribbon, theme area, player standings, gamespeed, Star View, selected-star tray, quick access, and UI-test/lab support.
- Out of scope: combat-value redesign, fake factions/resources, fleet/build/research/diplomacy systems, server/gameplay logic changes.
- Implementation method: extract HUD ownership out of oversized source surfaces before visual replacement.

## Implementation Steps

1. Create `pax-fluxia/src/lib/components/game-hud/` as the live HUD layer.
2. Add view-model types and derivation helpers for layout state, player standings, selected star, and command context.
3. Move shared HUD styling into `pax-fluxia/src/lib/styles/hud.css` and import it from `app.css`.
4. Build shell components: `HudShell`, `HudTopbar`, `HudRail`, `HudPanel`, and `HudIconButton`.
5. Build live surfaces: `PlayerStandingsPanel`, `GameSpeedPanel`, `SelectedStarPanel`, `SelectedStarTray`, `QuickAccessDock`, and `SettingsRibbon`.
6. Integrate the new shell into `GameContainer.svelte`, preserving Pixi/map ownership and existing localStorage keys where practical.
7. Keep Theme Library behavior compact, scrollable, newest-first, single-line, and separate from map load actions.
8. Remove visible fake or rejected live-HUD labels: `Flux`, `Influence`, `Score`, `Factions`, `Build`, `Research`, `Diplomacy`, `Quick Tools`, `Actions`, and `Low-frequency`.
9. Verify Star View follows `selectedStarStore.id`; no selected star renders a clear empty selection state.
10. Validate by build/check/browser QA and update handoff/session docs.

## Data Contracts

- `HudLayoutState`: `controlsSide`, `tacticalSide`, `settingsOpen`, `settingsRibbonExpanded`, `standingsCollapsed`, `commandTrayCollapsed`, `quickAccessOpen`, widths, and toggle/set functions.
- `PlayerStandingViewModel`: `id`, `name`, `color`, `isLocal`, `activeShips`, `damagedShips`, `totalShips`, `starCount`, `production`, `activePercent`.
- `SelectedStarViewModel`: `id`, `label`, `starType`, `owner`, `activeShips`, `damagedShips`, `productionRate`, `repairRate`, `transferRate`, `activationRate`, `targetId`, `queuedOrderTargetId`.
- No common/server/Colyseus schema additions.

## Acceptance Checks

- `bun run --cwd pax-fluxia build` passes.
- `bun run --cwd pax-fluxia check` is run; if baseline failures remain, they are documented.
- Browser QA at 1280x720, 1600x900, and 1920x1080.
- Star selection updates Star View and selected-star tray immediately.
- Settings and Player Standings collapse/reopen affordances are visible from the topbar.
- Dock side toggles work for controls and tactical rail.
- Quick access is icon-only and bottom-docked.
- Theme Library scrolls, truncates, and remains separated from map load controls.

## Commit Plan

1. Commit this implementation plan and daily docs.
2. Commit HUD foundation extraction.
3. Commit live HUD integration and surface replacement.
4. Commit validation/handoff docs after QA.
