---
date created: 2026-07-18
last updated: 2026-07-18
last updated by: gpt-ui-cutover
relevant prior docs:
  - C:\Users\mikep\.windsurf\plans\hud-ui-menu-settings-production-cutover-53c1f1.md
  - .agent/docs/game/design/2026-07-17_HUD_UI_INVENTORY_FOR_REDESIGN.md
superseding docs:
---

# Phase 0 inventory and WIP disposition (cutover)

Source-audited 2026-07-18. Graphify rebuilt (`cca5bb2d`, 4628 nodes). Pre-cutover snapshot `snap_1_1784396587146`.

## Capability ledger (seed)

| Capability | Desktop owner | Mobile/overlay owner | Read | Write |
|---|---|---|---|---|
| Menu/return | PaxHudTopbar menu icon | FAB Quit Game | gameStore.currentView | gameStore.setView("menu") |
| Map fit | BottomCommandBar Map/View | StarNav center | gameCanvasRef | centerAndFit |
| Room ID/copy | overlay-top-center badge | same | multiplayerStore.roomId | navigator.clipboard |
| Player summary | PaxHudTopbar badge | StatusBar | activeGameStore.players | read-only |
| Tick/speed | PaxHudTopbar status, PaxHudSpeedPanel | SpeedControls, StatusBar | activeGameStore | setSpeed/pause/resume; tick via handleHudTickIntervalChange |
| Diagnostics | SettingsRibbon diagnostics | FAB Diagnostics | openSettingsSection | settingsStore |
| Territory shortcuts/SNAPFIX | PaxHudTopbar chips + SNAPFIX | none | GAME_CONFIG | applyTopbarTerritoryModeShortcut / cycleSnapFix (direct GAME_CONFIG mutation) |
| Standings | PaxHudStandingsPanel | Leaderboard drawer | activeGameStore.players | toggle collapse; ship-focus localStorage |
| Selected star | SelectedStarPanel | StarNav + StarInfoPanel | selectedStarStore | navigateToStar, cancelOrder |
| Star list/nav | SelectedStarPanel prev/next | StarNav prev/next/center | ownedStarIds | focusOwnedStar |
| Commands | BottomCommandBar | none | derived | toggle fns |
| Quick actions | QuickAccessDock measure | none | authoredMeasurementsUi | toggle |
| Audio | AudioSettings modal | FAB Audio | audioManager | audioManager |
| Settings | SettingsRibbon | FAB Settings | settingsStore | toggleSettingsPanel/openSettingsSection |
| Results/confirm | ResultsModal + Surrender/Restart/Exit modals | same | gameStore.winner/phase | playAgain/returnToMenu/surrender |
| Loading/error | /play +page shell | same | gameShellErrorMessage | loadShell retry/back |

## Persistence ownership (verified)

Protected (never reset): `pax_savedMaps`, `pax_savedGames`, `pax-game-themes`, `pax_composedThemes`, `pax_categoryThemes_*`, `pax_starredThemes_*`, `pax_themePresets` (legacy), `pax-map-editor-*`, `pax_defaultMap`.

UI prefs (reset OK): `pax-fluxia-menuTheme`, `pax-fluxia-menu-theme-backgrounds`, `pax-show-star-info`, `pax-settings-open`, `pax-sidebar-side`, `pax-controls-side`, `pax-leaderboard-collapsed`, `pax-settings-ribbon-expanded`, `pax-pause-on-settings`, `pax-sidebar-width`, `pax-settings-panel-width`, `pax-leaderboard-ship-focus`, `pax-icon-set`, `pax-hud-typography-tokens-v1`, `pax-ui-theme-id`.

Settings/config (reset OK): `pax-fluxia-panel-settings`, `pax-fluxia-settings-tier`, `pax-fluxia-game-config`, `pax-anim-lock-ratios`(+`-modes`), `pax-animation-settings`, `pax-fluxia-audio-config`, `pax-fluxia-player-palette`, `pax-fluxia-show-advanced`, `pax-fluxia-internal-tools`, `pax-fluxia-force-public-shell`, `pax_logFlags`, `pax-fluxia-*` menu setup keys, `pax_playerName`, `pax_playerColor`.

Obsolete: `pax-fluxia-visuals` (migrated), `pax_themePresets` (migrated; still protected as legacy).

## Window events

| Event | Producer | Consumer | Disposition |
|---|---|---|---|
| pax-settings-config-sync-requested | panelSync, territoryModeShortcuts | GameSettingsPanel | Phase 2/4: settingsStore.syncFromConfig command |
| pax-tick-interval-changed | panelSync, settingsStore | GameContainer | Phase 2: typed effect/derived |
| pax-bg-change | panelSync | GameCanvas | Phase 2: typed effect adapter |
| pax-bg-alpha-change | ControlsSection-Visuals, settingsStore, themeStore | GameCanvas | Phase 2: typed effect adapter |
| pax-star-info-toggle | ControlsSection-Diagnostics | GameContainer | Phase 2: uiPreferences.showStarInfo |
| pax-theme-applied | themeStore | none | delete (no consumer) |
| pax-game-container-mounted/unmounted | GameContainer | /play +page | keep as documented lifecycle contract |
| star-info-toggle (no pax prefix) | GameCanvas | none | delete or align with pax-star-info-toggle |

## WIP disposition

- **Token move (app.css -> pax-theme.css Tier 2):** KEEP direction; reconcile DESIGN_SYSTEM_TOKENS.md in Phase 1.
- **PaxHudTopbar (mounted):** COMPLETE slice — remove direct GAME_CONFIG mutation + public SNAPFIX chip, migrate Tier-1 token refs to Tier-2, then delete HudTopbar. Not yet production-ready.
- **PaxHudSpeedPanel (mounted):** PRESERVE — clean, delegates to DS primitives.
- **PaxHudStandingsPanel (mounted):** PRESERVE — but `pax-leaderboard-ship-focus` localStorage belongs in uiPreferences (Phase 2).
- **PaxHudLayout (unmounted):** RELOCATE to components/hud/PaxHudShell in Phase 3 after proving resize/dock/collapse/mobile parity; not a generic DS primitive.
- **PaxSettingsDrawer:** FIX unused `headerClass`/`subnavClass` props (apply or remove).
- **dev/settings-slice:** KEEP as committed harness.
- **pax-fluxia/pax-fluxia-hud/ orphan package:** DEFAULT DELETE (no workspace member, no production importer). Requires immediate user confirmation before removal — destructive.

## Tooling gaps (Phase 0 prerequisites)

- No `test` script in pax-fluxia/package.json; use `bun test --cwd pax-fluxia ...` directly or add script.
- No Playwright/axe. Add vetted versions (>=7 days old) with config before Phase 1 gate.
- No Tauri dev/build script aliases.

## Done this session

- Protected-content reset fix (`69ad7d3d7`): `clearResettableSettingsStorage` + byte-preservation tests; svelte-check 0; 13 configTransfer tests pass.
- Graphify rebuilt.
- Coordination board claimed; master task list + session docs created.

## Next (resume point)

1. Phase 1 token contract + DESIGN_SYSTEM_TOKENS.md reconciliation (one commit).
2. Add Playwright/axe dev deps + viewport matrix config.
3. Get explicit confirmation to delete `pax-fluxia/pax-fluxia-hud/`.
4. Phase 2 uiPreferences.svelte.ts + protected-persistence sentinel test.
