# Pax Fluxia UI Code Guide - Worktree 4b02 - 2026-05-11

## Purpose

This guide is for manual work on the in-game HUD and settings UI. It is organized by ownership, not by file count. Start at the shell, then move downward into the leaf component you want to change, then confirm the store and config source before editing visuals or text.

## Fast Start

If you only need a starting point:

1. Layout, docking, panel placement, and quick-tool placement start in `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
2. Topbar content starts in `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`.
3. Settings ribbon, search, integrated theme header, and section opening logic start in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
4. Leaderboard starts in `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`.
5. Gamespeed starts in `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte`.
6. Star View starts in `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`.
7. Theme library and dropdown behavior start in `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte` and `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`.
8. Shared game-state inputs should come from `pax-fluxia/src/lib/stores/activeGameStore.svelte.ts`.

## UI Ownership Tree

```text
GameContainer.svelte
|- GameHudTopBar.svelte
|- StatusBar
|- GameCanvas
|- overlay-top-left
|  `- StarInfoPanel
|- mobile bottom controls bar
|  |- SpeedControls.svelte
|  `- StarNav.svelte
|- settings column
|  `- GameSettingsPanel.svelte
|     `- GameThemeManager.svelte
|        `- ThemeSelectDropdown.svelte
|- leaderboard / right column
|  `- Leaderboard.svelte
|- sidebar quick tools
|  |- SpeedControls.svelte
|  `- StarNav.svelte
`- bottom-right quick tools strip
```

## Relationship Map

### Parent-child render flow

| Owner | Children / Consumers | Why it matters |
|---|---|---|
| `GameContainer.svelte` | `GameHudTopBar`, `GameCanvas`, `GameSettingsPanel`, `Leaderboard`, `SpeedControls`, `StarNav` | This is the shell. If a UI block moves sides, collapses, or swaps order, start here first. |
| `GameSettingsPanel.svelte` | `GameThemeManager`, section content from settings definitions | This owns the ribbon behavior, search UI, integrated theme utility, and open-section stack. |
| `GameThemeManager.svelte` | `ThemeSelectDropdown` | This owns the utility theme selector and the scrollable theme library list. |
| `Leaderboard.svelte` | internal collapsed badge, summary, row list | This owns expanded/collapsed leaderboard behavior and dock toggle behavior for the leaderboard column. |
| `StarNav.svelte` | internal metrics and breakdown rows | This owns star-view presentation and the UI-side combat/pressure summary math. |

### Main data flow

| Data | Primary source | Main consumers |
|---|---|---|
| players, stars, speed, paused state | `activeGameStore.svelte.ts` | `GameContainer`, `Leaderboard`, `SpeedControls`, `StarNav` |
| selected star id | `selectedStarStore.svelte.ts` | star-related UI and canvas interactions |
| theme list and selected theme | `themeStore.svelte.ts` | `GameThemeManager`, `ThemeSelectDropdown` |
| territory shortcut metadata | `territoryModeShortcuts.ts` | `GameHudTopBar`, `GameContainer` |
| combat and star-bonus constants | `game.config.ts` and `common/src/config.ts` | `StarNav` |
| `Player` / `Star` field shape | `common/src/types.ts` | leaderboard rows, star view, other HUD surfaces |

## 1. HUD Shell And Layout

### Primary owner

- File: `pax-fluxia/src/lib/components/game/GameContainer.svelte`

### Most important code ranges

| Concern | Range | Notes |
|---|---|---|
| dock-side types and settings panel toggles | `84-164` | Contains dock-side state and the handlers that flip controls side, leaderboard side, and ribbon width mode. |
| theme shortcut opener | `494-511` | `openThemeShortcuts()` forces the settings panel open and targets the integrated theme area. |
| topbar and main in-game shell render | `572-717` | Mounts `GameHudTopBar`, opens the `game-layout`, renders settings column and leaderboard column. |
| low-frequency action list | `751-838` | The right-column action menu lives here. |
| bottom-right quick tools strip | `961-1015` | Global quick-tool buttons live here after the 2026-05-10 refactor. |
| grid layout classes | `1207-1237` | Named layout variants for settings-open and left/right dock combinations. |
| mobile controls bar styles | `1278-1443` | Mobile-only bottom control bar and its child adjustments. |
| desktop controls and right-column styles | `1676-1859` | Width, docking, resize handles, menu shell, and quick-tool styling. |
| overlay and gamespeed fieldset styles | `2085-2119` | Visual shell for overlay-top-left and shared fieldset styling. |

### What this component owns

- Whether the settings column is visible.
- Which side the settings column docks to.
- Which side the leaderboard/right rail docks to.
- Width and resize behavior for the settings column and leaderboard column.
- Whether quick tools render in desktop sidebar or mobile bottom bar.
- Where the theme shortcut button routes the user.

### What to edit here

- Move a block from left to right.
- Change the order of `Leaderboard`, `SpeedControls`, `StarNav`, or the low-frequency action menu.
- Add or remove a whole surface from the HUD shell.
- Change desktop grid areas or mobile-vs-desktop placement.
- Change bottom-right quick-tool placement or labels.

### Important child mount points

| Child | Render range | Notes |
|---|---|---|
| `GameHudTopBar` | `572-579` | Topbar only. No sidebar content lives there now. |
| `SpeedControls` mobile | `646-654` | Mobile-only speed controls. |
| `StarNav` mobile | `655-658` | Mobile-only star nav. |
| `GameSettingsPanel` | `684-692` | Receives ribbon and dock-side control callbacks from the shell. |
| `Leaderboard` | `712-717` | Receives `dockSide` and `onToggleDockSide` from the shell. |
| `SpeedControls` desktop | `725-733` | Desktop sidebar gamespeed fieldset. |
| `StarNav` desktop | `738-745` | Desktop sidebar star-view widget. |

### High-risk notes

- `GameContainer.svelte` is the highest-risk file for layout regressions because the same conceptual surface often appears once for desktop and once for mobile.
- The shell and CSS grid rules are tightly coupled. If a class name changes in markup, search the style block immediately.
- Dock toggles are split between state in this file and buttons rendered in leaf components.

## 2. Topbar

### Primary owner

- File: `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`

### Most important code ranges

| Concern | Range | Notes |
|---|---|---|
| props and top-level contract | `6-29` | Parent passes menu/settings handlers plus territory mode options. |
| derived stats label | `31-35` | Top-left status text. |
| topbar render | `37-84` | Left status, center territory shortcuts, right controls button. |
| topbar styling | `109-304` | Includes shell button and mode shortcut appearance variants. |

### What this component owns

- Top-left summary label.
- Territory mode shortcut buttons in the top center.
- The single controls/settings button on the right.

### Data and control dependencies

- `modeOptions` and `fallbackActiveModeId` come from `territoryModeShortcuts.ts` through `GameContainer.svelte`.
- Clicking the controls button only asks the parent to toggle the settings panel.

### Related file

- `pax-fluxia/src/lib/territory/ui/territoryModeShortcuts.ts`
  - `15-26`: shortcut type metadata
  - `38-76`: mode definitions and labels
  - `93-121`: `getTopbarTerritoryModeOptions()`
  - `123-141`: `applyTopbarTerritoryModeShortcut()`

### Safe edits

- Rename topbar copy.
- Change the shortcut chip appearance.
- Add or remove a territory shortcut mode, but only after also updating `territoryModeShortcuts.ts`.

## 3. Settings Column And Ribbon

### Primary owners

- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

### `GameSettingsPanel.svelte` key ranges

| Concern | Range | Notes |
|---|---|---|
| props for ribbon and dock controls | `762-777` | Parent-controlled dock side and ribbon width mode enter here. |
| visible section derivation | `875-883` | Filters the registry into the currently usable ribbon sections. |
| root panel classes | `1110-1113` | Ribbon-expanded and dock-left classes attach here. |
| header tools, search, and utility actions | `1130-1301` | Search bar, expand/collapse button, dock-side button, import/export/reset tools, load-map drawer, theme utility mount. |
| integrated theme mount | `1301-1303` | `#settings-theme-anchor` is the target for shell-level theme shortcuts. |
| ribbon shell and icon toolbar | `1306-1365` | The vertical ribbon and section buttons. |
| open section stack | `1369` onward | Expanded section panels render here. |
| main ribbon and header styling | `1609-1799`, `2120-2295`, `2416-2429` | Expanded/collapsed ribbon width, button styling, header shell, and mobile collapse behavior. |

### `settingsRegistry.ts` key ranges

| Concern | Range | Notes |
|---|---|---|
| section registry export | `41-209` | Central list of settings sections, their ids, labels, icons, and tier tags. |
| players | `43-47` | |
| timing | `51-55` | |
| combat tuning | `59-63` | |
| economy | `67-71` | |
| travel and orders | `75-79` | |
| conquest | `83-87` | |
| effects | `91-95` | |
| map options and tuning | `99-109` | |
| phase field / phase edges / ember lattice / frontier FX | `113-141` | Territory presentation sections. |
| territory topology / territory styles / fleet visuals | `145-170` | Visual and topology-related ribbon sections. |
| audio / diagnostics / logging / ai | `174-209` | Lower-frequency system sections. |

### What these files own

- The settings column's internal UX.
- Search behavior for settings.
- Which sections exist, what they are called, which icon they use, and in which order they appear in the ribbon.
- The integrated settings utility header, including theme placement.

### Edit rules

- Change section order or section metadata in `settingsRegistry.ts`.
- Change ribbon behavior, dock buttons, or search UI in `GameSettingsPanel.svelte`.
- Keep section ids stable unless you are prepared to fix persistence and open-section references.

### High-risk notes

- This is a very large component. Changing section shell markup can affect every section panel at once.
- The ribbon and header each contain expand/dock controls. If one changes, verify the other still makes sense.
- Theme shortcuts from `GameContainer` depend on `#settings-theme-anchor`.

## 4. Theme System

### Primary owners

- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
- `pax-fluxia/src/lib/stores/themeStore.svelte.ts`

### `GameThemeManager.svelte` key ranges

| Concern | Range | Notes |
|---|---|---|
| import and dependency entry | `9-10` | Pulls in `ThemeSelectDropdown`. |
| grouped dropdown data | `28-31` | Family groups still feed the dropdown. |
| flat newest-first library list | `32-35` | `libraryThemes` builds the compact list. |
| apply/save handlers | `97-116` | Main user actions. |
| utility dropdown render | `187-195` | `showGroupLabels={false}` is passed here. |
| theme library render | `274-292` | Compact scrollable list of themes. |
| library list styling | `539-560` | Scrolling behavior and compact list shell. |

### `ThemeSelectDropdown.svelte` key ranges

| Concern | Range | Notes |
|---|---|---|
| props | `6-35` | Includes `showGroupLabels`. |
| grouped and flat option derivation | `49-70` | Dropdown navigation uses flattened options even when grouped visually. |
| trigger and menu render | `241-270` | Button and popup menu shell. |
| group-label conditional | `269-272` | Group labels can be hidden without changing option data. |
| dropdown styling | `314-413`, `479-512` | Trigger and shell styles, including utility-shell variant. |

### `themeStore.svelte.ts` key ranges

| Concern | Range | Notes |
|---|---|---|
| selected theme state | `229-251` | Store state for selected theme and the aggregated theme list. |
| apply theme | `264-281` | Changes current theme. |
| save theme | `283-299` | Creates or updates user themes. |
| delete theme | `301-310` | Removes user theme. |
| export/import theme | `313-342` | Serialization layer. |
| user-theme detection | `344-346` | Useful for presentation decisions. |

### What to edit where

| Goal | File |
|---|---|
| change visual layout of the integrated theme utility | `GameThemeManager.svelte` |
| change dropdown shell, keyboard behavior, or truncation | `ThemeSelectDropdown.svelte` |
| change theme persistence, import/export, or selection logic | `themeStore.svelte.ts` |

### High-risk notes

- The dropdown and the library list are not the same surface. The dropdown is for quick selection; the library list is the longer management surface.
- If theme names or ids change, verify import/export and selected-theme restoration.

## 5. Leaderboard

### Primary owner

- File: `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`

### Most important code ranges

| Concern | Range | Notes |
|---|---|---|
| props and storage keys | `6-23` | External contract and persisted UI state. |
| featured-player and collapsed badge values | `85-112` | Chooses the player shown when collapsed and whether `Active` or `Total` is emphasized. |
| collapsed badge render | `129-143` | Compact topbar-height badge content. |
| dock toggle | `160-166` | Sends the left/right request back to the parent. |
| active-vs-total toggle | `169-185` | Presentation emphasis toggle for expanded view and collapsed badge value. |
| summary + column header + rows | `192-226` | Expanded panel content. |
| styling | `323-636` | Badge, toggle buttons, summary strip, grid columns, responsive compression. |

### What this component owns

- Expanded vs collapsed leaderboard display.
- Which player is featured in collapsed mode.
- Column alignment and row presentation.
- `Active` vs `Total` emphasis.
- The dock-toggle button UI, but not the actual column move logic.

### Parent dependency

- `GameContainer.svelte` still owns the actual side placement. `Leaderboard.svelte` only emits the toggle request.

### Safe edits

- Change row copy, column order, compact badge layout, iconography, or sorting presentation inside this file.
- If the whole leaderboard column changes size or moves relative to other widgets, move back up to `GameContainer.svelte`.

## 6. Gamespeed

### Primary owner

- File: `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte`

### Most important code ranges

| Concern | Range | Notes |
|---|---|---|
| props | `4-18` | Parent passes current speed and pause state plus action callbacks. |
| speed definitions | `40-43` | The visible speed buttons are declared here. |
| render | `59-80` | Pause button plus speed buttons. |
| styling | `91-177` | Desktop and compressed/mobile appearance. |

### Parent usage

- Mounted twice by `GameContainer.svelte`:
  - mobile bottom bar: `646-654`
  - desktop sidebar quick tools: `725-733`

### Safe edits

- Change speed labels, chip sizing, or pause-button appearance in this file.
- Change where the widget appears in `GameContainer.svelte`.

## 7. Star View

### Primary owner

- File: `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`

### Most important code ranges

| Concern | Range | Notes |
|---|---|---|
| type metadata | `19-37` | Maps star type to icon/color/label. |
| normalized attack force | `40-49` | UI-side attack normalization math. |
| normalized defense force | `51-70` | UI-side defense normalization math, including damaged ship contribution and bonuses. |
| ratio formatting | `72-76` | Shared value formatting. |
| owned-star list and current star selection | `78-96` | Which star the widget is summarizing. |
| derived star detail package | `96-139` | Builds the display object used by the card. |
| render | `161-283` | Current star card, metrics grid, outgoing/incoming breakdown rows. |
| styling | `442-538` | Metric cards and breakdown rows. |

### What this component owns

- Which owned star is being shown.
- The fit/center interaction button.
- Visual presentation for active ships, damaged ships, attack force, defense force, outgoing target pressure, and incoming pressure.

### Data and config dependencies

- `stars` and `localPlayerId` come from `activeGameStore` through `GameContainer.svelte`.
- Combat constants and star bonuses come from:
  - `pax-fluxia/src/lib/config/game.config.ts`
    - `49-52`: lifted combat values used by engine helpers
    - `79-80`: `AGGRESSOR_ADVANTAGE`, `GLOBAL_DAMAGE_MODIFIER`
    - `115`: `DAMAGED_SHIP_EFFECTIVENESS`
    - `827-838`: config export/proxy layer
  - `common/src/config.ts`
    - `16-36`: `STAR_TYPE_STATS` and per-type attack/defense/repair/transfer values
- Star shape comes from `common/src/types.ts`
  - `39-67`: core `Star` fields used by the widget

### Safe edits

- Change the star-view layout, icon treatment, or explanatory labels in `StarNav.svelte`.
- If you change the meaning of attack or defense presentation, confirm the math against `game.config.ts` and `common/src/config.ts` before editing text.

### High-risk notes

- `StarNav.svelte` is presentation-side math. If engine math changes elsewhere, this widget can silently drift out of sync unless the constants and formulas are checked together.

## 8. Shared Stores And Contracts

### `activeGameStore.svelte.ts`

- File: `pax-fluxia/src/lib/stores/activeGameStore.svelte.ts`
- Key guidance:
  - `1-9`: comment block explicitly says UI components should consume this store instead of talking directly to `gameStore` or `multiplayerStore`.
- Useful ranges:

| Concern | Range |
|---|---|
| speed mutator | `368-372` |
| play-again action | `500-506` |
| public stars/player/speed getters | `535-548` |

- Use this store when you need current stars, players, current speed, paused state, or a gameplay action.

### `selectedStarStore.svelte.ts`

- File: `pax-fluxia/src/lib/stores/selectedStarStore.svelte.ts`
- Entire file is effectively the contract:
  - `5-12`: selected star id state plus `select`, `deselect`, and `toggle`

### `common/src/types.ts`

- `23-35`: `Player` fields, including optional `activeShips` and `damagedShips`
- `39-67`: `Star` fields used by star-view and selection UI
- This is the source of truth for row and widget field availability.

### `pax-fluxia/src/lib/types/game.types.ts`

- `36-39`: local aliases for `PlayerState` and `StarState`
- These aliases are what most Svelte UI files import.

## 9. Common Manual Edit Recipes

### Move a HUD surface

1. Edit the render order in `GameContainer.svelte`.
2. Edit the grid-area or dock-side CSS in the same file.
3. If the child exposes a dock toggle button, verify the button label still matches the new shell behavior.

### Change which settings sections exist or how they are labeled

1. Edit `settingsRegistry.ts`.
2. Verify `GameSettingsPanel.svelte` still renders the section in the expected place.
3. If a section id changes, search for persistence or forced-open references before shipping.

### Change theme-library layout

1. Edit list derivation in `GameThemeManager.svelte`.
2. Edit popup behavior or truncation in `ThemeSelectDropdown.svelte`.
3. Only touch `themeStore.svelte.ts` if persistence or theme actions must change.

### Change leaderboard behavior

1. Edit collapsed/expanded behavior in `Leaderboard.svelte`.
2. Edit actual column placement only in `GameContainer.svelte`.

### Change star-view meaning

1. Edit presentation in `StarNav.svelte`.
2. Verify the formula against `game.config.ts` and `common/src/config.ts`.
3. Confirm the required fields exist in `common/src/types.ts`.

## 10. Safe Starting Points And High-Risk Areas

### Safe starting points

| Task | Best entry file |
|---|---|
| move a panel or change docking | `GameContainer.svelte` |
| rename topbar text or shortcut chip visuals | `GameHudTopBar.svelte` |
| change the settings ribbon shell | `GameSettingsPanel.svelte` |
| reorder settings sections | `settingsRegistry.ts` |
| change theme-library density or scroll behavior | `GameThemeManager.svelte` |
| change dropdown truncation or group labels | `ThemeSelectDropdown.svelte` |
| change leaderboard compact badge or row visuals | `Leaderboard.svelte` |
| change star-view layout or labels | `StarNav.svelte` |

### High-risk areas

| Area | Risk |
|---|---|
| `GameContainer.svelte` | shell-level regressions across desktop and mobile copies of the same tools |
| `GameSettingsPanel.svelte` | very large component with shared shell behavior affecting every settings section |
| `StarNav.svelte` | presentation math can drift from gameplay math if constants are not checked together |
| `settingsRegistry.ts` | id changes can break persistence or forced-open behavior |
| theme store files | selection/import/export behavior is more stateful than the UI shell suggests |

## 11. Recommended Reading Order For A Manual Edit Session

1. Open `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
2. Find the child component you actually want to change.
3. Open that child component and its style block.
4. Check this guide's related store/config section before changing meaning or calculations.
5. Only after that, make the local visual edit.

## 12. Minimal File Set By Feature

| Feature | Files to keep open |
|---|---|
| HUD layout / docking | `GameContainer.svelte`, `Leaderboard.svelte`, `GameSettingsPanel.svelte` |
| topbar | `GameHudTopBar.svelte`, `territoryModeShortcuts.ts`, `GameContainer.svelte` |
| settings ribbon | `GameSettingsPanel.svelte`, `settingsRegistry.ts` |
| theme tools | `GameThemeManager.svelte`, `ThemeSelectDropdown.svelte`, `themeStore.svelte.ts` |
| leaderboard | `Leaderboard.svelte`, `activeGameStore.svelte.ts`, `GameContainer.svelte` |
| gamespeed | `SpeedControls.svelte`, `activeGameStore.svelte.ts`, `GameContainer.svelte` |
| star view | `StarNav.svelte`, `activeGameStore.svelte.ts`, `game.config.ts`, `common/src/config.ts`, `common/src/types.ts` |

## Closing Note

For almost every visible HUD change, the correct path is:

1. shell placement in `GameContainer.svelte`
2. leaf presentation in the component that renders the surface
3. data contract in store/config/types only if the UI meaning is changing

That sequence avoids the common failure mode of restyling a component while missing the shell-level owner that actually controls where and how it appears.
