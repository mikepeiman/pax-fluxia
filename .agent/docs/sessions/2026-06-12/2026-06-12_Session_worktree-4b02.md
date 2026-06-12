# 2026-06-12 Session - Aurelia HUD Package Integration

## Objective

Implement the external `pax-fluxia-hud` README package in this project while preserving the current live HUD and documenting the work for merge.

## Source Artifact

- `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\pax-fluxia-hud\README.md`
- Package source copied from `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\pax-fluxia-hud\src\lib\hud`

## Implementation

- Copied the package HUD library into `pax-fluxia/src/lib/aurelia-hud/`.
- Copied package theme CSS to `pax-fluxia/src/lib/aurelia-hud/aurelia-hud-theme.css`.
- Installed `@ark-ui/svelte` with Bun.
- Added Tailwind source scanning for the imported package.
- Imported Aurelia HUD theme CSS through `pax-fluxia/src/app.css`.
- Added `/dev/aurelia-hud` route that mounts `<PaxHud demoTicker />`.
- Wired a `hud.bridge` adapter that uses the project logger for command callbacks.
- Added an `Aurelia HUD` topbar chip in the existing live game HUD for quick access.

## Intentional Boundary

This is not a live-game HUD replacement. The package is isolated as a development/demo route and still uses the package demo state. Real engine binding remains future work.

## Validation

- `git diff --check`: passed with line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed before documentation edits.
- Targeted `svelte-check` filtering found no diagnostics referencing `aurelia-hud` or `dev/aurelia-hud`.
- Full `bun run --cwd pax-fluxia check`: still fails on existing repository baseline with `329 errors and 819 warnings in 64 files`.
- Screenshot pass was intentionally skipped at user request.

## Merge Notes

- Preserve `@source "./lib/aurelia-hud";` in `pax-fluxia/src/app.css`.
- Preserve `@ark-ui/svelte` in `pax-fluxia/package.json`.
- Treat `pax-fluxia/src/lib/aurelia-hud/` as imported package code unless actively adapting it.
- Do not assume demo labels, factions, orders, or resources are accepted live-game semantics.
- Offline/Tauri packaging should replace the Google Fonts import with self-hosted font assets.

## Theme System Foundation Step

User then directed work to proceed toward a complete token set, theme system, and polished UI, using Tark UI and Tailwind Variants as references.

Implemented:

- Added `tailwind-variants` plus the required `tailwind-merge` peer.
- Added `pax-fluxia/src/lib/design-system/pax-theme.css`.
- Added `pax-fluxia/src/lib/design-system/theme.ts`.
- Added `pax-fluxia/src/lib/design-system/variants/hud.ts`.
- Added `pax-fluxia/src/lib/design-system/index.ts`.
- Wired Tailwind scanning and CSS import in `pax-fluxia/src/app.css`.
- Repointed legacy HUD variables to semantic `--pax-*` tokens.
- Added a `data-pax-theme` hook in `GameContainer.svelte`.

Validation:

- `bun run --cwd pax-fluxia build`: passed after installing `tailwind-merge`.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `check` filtering found no new diagnostics in the design-system files.

## In-Game Theme Selector Step

Implemented:

- Added `pax-fluxia/src/lib/design-system/themeState.svelte.ts`.
- Changed `GameContainer.svelte` to consume `paxThemeState.current`.
- Added `pax-fluxia/src/lib/components/game-hud/HudThemePanel.svelte`.
- Added the panel to Appearance above Typography controls.
- Exported the component through `game-hud/index.ts`.

Behavior:

- Selecting a theme updates `document.documentElement.dataset.paxTheme`.
- The game shell inherits the same current theme id through `data-pax-theme`.
- The selected theme persists in `localStorage` under `pax-ui-theme-id`.
- The panel can export the active theme descriptor JSON for inspection.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `check` filtering found no diagnostics in the new theme panel/state paths.

## First Tailwind Variants Primitive Migration

Implemented:

- `HudPanel.svelte` now consumes `hudPanel` slot recipes.
- `HudIconButton.svelte` now consumes `hudButton`.
- Existing `pf-*` classes were retained as compatibility hooks.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `check` filtering found no diagnostics in the migrated primitive paths.

## Rail And Gamespeed Variant Migration

Implemented:

- `HudRail.svelte` now consumes `hudRail`.
- `GameSpeedPanel.svelte` speed buttons now consume `hudButton`.
- Existing `pf-*` classes remain as compatibility hooks.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `check` filtering found no diagnostics in the rail/gamespeed paths.

## Svelte Inspector Dev Tool

Implemented:

- Enabled Svelte Inspector in `pax-fluxia/svelte.config.js` with the top-level `vitePlugin.inspector: true` option.
- Kept the change isolated to dev tooling; no live HUD component or theme code changed.

Notes:

- The project uses SvelteKit through `pax-fluxia/vite.config.js`, but Svelte Inspector is configured through the Svelte config consumed by the SvelteKit Vite plugin.
- The installed `@sveltejs/vite-plugin-svelte` type definition exposes `inspector?: InspectorOptions | boolean` and documents that it defaults false for builds.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with Git line-ending warnings only.
- Full `check` was not rerun for this dev-tool-only change because the current repository baseline already has known unrelated failures.

## HUD Primitive System Migration

User corrected direction: no JSON-import detour and no one-off visual patching. The task remains live HUD redesign toward the Aurelia Drift references, implemented through a reusable themeable component system.

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/` with Pax HUD primitives for panel, button, icon button, tooltip, rail, segmented control, select, text input, and range control.
- Extended `pax-fluxia/src/lib/design-system/variants/hud.ts` with Tailwind Variants recipes for tooltip, segmented controls, fields, and ranges.
- Encapsulated Ark behavior in the primitive layer:
  - tooltips in `PaxHudIconButton.svelte` and `PaxHudTooltip.svelte`
  - toggle-group behavior in `PaxHudSegmentedControl.svelte`
- Migrated live HUD/settings components to consume `PaxHud*` primitives rather than raw controls or direct variant recipes.
- Preserved existing `pf-*` classes as compatibility hooks because current HUD CSS still depends on them.
- Adjusted forwarded primitive-root selectors in settings/theme surfaces so Svelte scoped CSS does not silently drop the intended styling.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with Git line-ending warnings only.
- Static audit returned no matches for raw `<button>`, `<select>`, `<input>`, direct Ark imports, or direct `hudButton`/`hudPanel`/`hudRail` recipe calls in `pax-fluxia/src/lib/components/game-hud` and `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Build still emits known baseline unused-selector warnings in legacy tuning panels outside the new primitive migration target.

Next correct step:

- Continue replacing remaining live HUD/settings visual structure with the Pax primitive/token system, then use that base to push the actual Aurelia Drift polish. Do not add isolated CSS patches.

## Shared Settings Panel Grammar

Implemented:

- Reduced dark alpha stops in `--pax-border-panel-gradient` and `--pax-border-control-gradient`.
- Rebuilt `pax-fluxia/src/lib/components/ui/settings/panel-shared.css` as the tokenized shared style bridge for legacy settings/tuning panels.
- Wrapped the shared settings CSS in `:global` because the file is imported by many scoped Svelte components and should behave as a shared grammar, not per-component local CSS.
- Replaced legacy green/gray UI treatment with rounded Aurelia Drift surfaces, HUD typography tokens, gold/cyan accent hierarchy, and tokenized range/select/button/toggle states.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with line-ending warnings only.
- Build warnings still exist in unrelated local legacy CSS selectors, but the new shared stylesheet no longer creates per-import false positives.

## Settings Drawer Primitive Migration

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsDrawer.svelte`.
- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsInfoRow.svelte`.
- Exported both through `pax-fluxia/src/lib/design-system/components/index.ts`.
- Migrated these active Settings rail tool panes in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`:
  - Theme Select / Library
  - Theme Tuning / Appearance
  - Stats
  - Hotkeys
  - Help
- Removed the replaced local CSS hooks for `.settings-tool-panel`, `.settings-stats-panel`, `.settings-stat-row`, and `.settings-help-panel`.

Intent:

- Keep Settings panel structure moving into reusable Pax design-system primitives instead of local one-off panel markup.
- Preserve existing panel contents and data wiring while changing ownership of the shell, header, padding, scroll, border, and row rhythm.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Static audit returned no matches for raw `<button>`, `<select>`, `<input>`, direct Ark imports, or direct `hudButton`/`hudPanel`/`hudRail` recipe calls in `pax-fluxia/src/lib/components/game-hud` and `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Build log references to `GameSettingsPanel.svelte` in this run were from the existing dynamic/static import chunk warning for `gameStore.svelte.ts`, not new Svelte warnings in the migrated drawer code.

Next correct step:

- Migrate stacked Settings section panels and remaining tuning controls into Pax settings primitives, then reduce local legacy CSS in the largest warning sources.

## Settings Range And Toggle Primitive Migration

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsRangeRow.svelte`.
- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsToggleRow.svelte`.
- Extended `pax-fluxia/src/lib/design-system/components/PaxHudRange.svelte` with disabled-state support.
- Exported the new range/toggle rows through `pax-fluxia/src/lib/design-system/components/index.ts`.
- Replaced the old raw-input implementation in `pax-fluxia/src/lib/components/ui/settings/SliderRow.svelte` with a wrapper around `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-AI.svelte` AI ranges to `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Logging.svelte` actions and toggles to `PaxHudButton` and `PaxSettingsToggleRow`.

Intent:

- Move settings form chrome into project-owned primitives so typography, padding, borders, range tracks, toggle switches, and button rhythm can be themed consistently.
- Preserve existing settings keys, panel update paths, and logger flag behavior.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no matches for raw `<button>`, `<select>`, `<input>`, direct Ark imports, or direct HUD recipe calls in `ControlsSection-AI.svelte`, `ControlsSection-Logging.svelte`, `SliderRow.svelte`, live `game-hud`, or `GameSettingsPanel.svelte`.
- Build warnings remain in known larger legacy tuning files, especially `ControlsSection-Territory.svelte` and `PerimeterFieldTuning.svelte`.

Next correct step:

- Continue migrating larger settings panels through these row primitives, starting with warning-heavy legacy CSS areas only after confirming selectors are truly obsolete or replacing the markup that owns them.

## Perimeter Field Tuning Primitive Migration

Implemented:

- Rebuilt `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte` around the Pax primitive layer.
- Replaced raw module buttons with `PaxHudButton`.
- Replaced raw range controls with `PaxSettingsRangeRow`.
- Replaced the transition-engine select with `PaxHudSelect`.
- Replaced the freeze-base checkbox row with `PaxSettingsToggleRow`.
- Removed obsolete local `.sub-heading`, raw range/select/toggle markup, and related local control CSS.

Intent:

- Use the warning-heavy perimeter tuning surface as a small complete migration example before editing the much larger Territory panel.
- Preserve existing data flow: all values still write through `writeConfig(...)`, update the same panel keys, and call `bumpTerritoryVisualConfig()`.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no raw `<button>`, `<select>`, `<input>`, `.toggle-row`, `.var-row`, `.sub-heading`, `.module-all-toggle`, or `.module-chip` usage in `PerimeterFieldTuning.svelte`.
- Build log no longer reports `PerimeterFieldTuning.svelte`; remaining cleanup warnings are in `ControlsSection-Territory.svelte`.

Next correct step:

- Remove or replace the remaining obsolete Territory selectors after checking whether each selector has live markup ownership.

## Territory Obsolete CSS Cleanup

Implemented:

- Removed obsolete local CSS-only selectors from `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`:
  - `.territory-card`
  - `.triple-select-row`
  - `.triple-select-col`
  - `.triple-label`
  - `.mode-btn`
  - `.grayed`
  - `.mini-btn.reference-only`
  - `.engine-control-group.reference-only`
- Preserved live local styling for `.territory-card__header`, `.territory-card__intro`, `.engine-control-group`, `.mini-btn`, `.mini-btn:hover`, `.mini-btn.active`, and disabled mini buttons.

Intent:

- Remove warning-only dead CSS after confirming the selectors had no live markup owner in this component.
- Avoid deleting or moving any Territory user controls in this cleanup slice.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Build output no longer reports `css_unused_selector` warnings for `ControlsSection-Territory.svelte` or `PerimeterFieldTuning.svelte`.
- Targeted search returned no stale selector names in `ControlsSection-Territory.svelte`.

Next correct step:

- Continue migrating high-traffic legacy settings controls into Pax primitives; the previous Territory/Perimeter unused-selector warning set is cleared.

## Pixi Dev Import Optimization Fix

User reported:

```text
logger.ts:119 ERROR [LandingRoute] Game shell import failed (1/2) Error: Extension type environment already has a handler
    at Object.handle (Extensions.ts:328:19)
    at Object.handleByNamedList (Extensions.ts:385:21)
    at autoDetectEnvironment.ts:5:12
```

Implemented:

- Updated `pax-fluxia/vite.config.js`.
- Added `pixi.js` to client `optimizeDeps.include` so Vite dev prebundles Pixi as one optimized dependency instead of traversing Pixi internals during lazy game-shell imports/HMR.
- Removed stale `@colyseus/schema` from the client optimize include list because `pax-fluxia/src` does not import it and the forced optimize command reported it as unresolved from the client package.

Validation:

- `bunx vite optimize --force` in `pax-fluxia/`: completed and listed `pixi.js`; it no longer reported `@colyseus/schema` resolution failure. Vite prints a deprecation warning for manually invoking optimize, but the command completes.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.

Notes:

- If a dev server is already running, restart it or run with Vite force optimization so the updated dependency cache is used.
- This is a dev import/loading fix. It does not change gameplay logic, Pixi rendering code, or HUD component behavior.

## Category Theme Bar Primitive Migration

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/PaxHudFileButton.svelte`.
- Exported `PaxHudFileButton` through `pax-fluxia/src/lib/design-system/components/index.ts`.
- Rebuilt `pax-fluxia/src/lib/components/ui/settings/CategoryThemeBar.svelte` around Pax primitives:
  - `PaxHudSelect` for preset selection
  - `PaxHudIconButton` for update/add/reset/manage/save/cancel/delete/star controls
  - `PaxHudButton` for starred preset chips and modal preset names
  - `PaxHudTextInput` for new preset naming
  - `PaxHudFileButton` for JSON import
- Replaced raw `console.error` import failure reporting with `log.error`.
- Removed old local raw-control CSS for theme select/actions/drawer buttons/modal raw buttons.

Intent:

- Convert a shared, high-traffic Settings utility surface to the Pax primitive system so theme/preset controls follow the same tokenized button/select/input grammar as the rest of the HUD work.
- Keep category preset behavior unchanged: apply, save/export, update/export, reset, import, star/unstar, delete, and close modal.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, `console.error`, `HudIcon`, or old raw-control class names in `CategoryThemeBar.svelte`.
- The only `<input>` in this slice is inside `PaxHudFileButton`, which is the intended primitive boundary for browser file selection.

Next correct step:

- Continue converting shared/high-traffic settings components first, then return to live HUD polish with fewer local style islands.

## Visuals Settings Primitive Migration

Implemented:

- Rebuilt `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte` around the Pax primitive layer.
- Replaced raw background thumbnail buttons with `PaxHudButton`.
- Replaced the lane-path button group with `PaxHudSegmentedControl`.
- Replaced raw select, range, and checkbox controls with `PaxHudSelect`, `PaxSettingsRangeRow`, and `PaxSettingsToggleRow`.
- Kept `CategoryThemeBar` at the top of the Visuals section now that it is primitive-owned.
- Removed old local raw-control CSS for background thumbs and the lane-mode segmented group.

Intent:

- Convert a broad high-traffic Appearance/Visuals surface to the same component grammar as the rest of the Settings rail.
- Preserve existing behavior and config writes for background opacity, lane margin, lane path mode, label animation, arrows, orbits, selection hex, lane width/opacity, and shadow styling.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, old `map-lane-mode-segment`, `bg-thumb`, `future-desc`, or inline `style=` usage in `ControlsSection-Visuals.svelte`.
- Build still reports known baseline warnings outside this slice: `SpeedControls.svelte` non-reactive state initialization, dynamic/static `gameStore` import chunking, and large chunks.

Next correct step:

- Continue migrating remaining high-use settings sections, starting with Audio/Travel/Conquest/Battle surfaces, while keeping raw controls inside design-system primitives only.

## Combat And Economy Settings Primitive Migration

Implemented:

- Extended `pax-fluxia/src/lib/design-system/components/PaxSettingsRangeRow.svelte` with an optional `output` prop so feature panels can show custom range text without restoring local row markup.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Battle.svelte` from raw range inputs to `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Economy.svelte` from raw range inputs to `PaxSettingsRangeRow`.
- Preserved existing combat/economy config writes, panel-key updates, transfer-rate callback, and `0 = unlimited` Max Transfer display.

Intent:

- Convert two compact, frequently visible Settings sections to the shared component grammar.
- Improve the primitive instead of adding one-off Economy-specific markup for the Max Transfer display case.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old `.var-row`, `.row-top`, `.mode-select`, or `.toggle-row` usage in the migrated Battle/Economy files and the touched range-row primitive.

Next correct step:

- Continue with Travel/Conquest and then Audio. Audio should get a reusable picker/menu primitive rather than a local custom dropdown.

## Travel And Conquest Settings Primitive Migration

Implemented:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Travel.svelte` around Pax primitives.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Conquest.svelte` around Pax primitives.
- Replaced raw selects with `PaxHudSelect`.
- Replaced raw range controls with `PaxSettingsRangeRow`.
- Replaced raw checkbox toggles with `PaxSettingsToggleRow`.
- Removed old local raw-control classes and inline display markup from both surfaces.

Intent:

- Convert two larger but mechanically simple tuning surfaces to the same component system before taking on Audio's custom file picker.
- Preserve existing `GAME_CONFIG` writes and `updatePanel(...)` keys while unifying the visible control grammar.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old `.var-row`, `.row-top`, `.mode-select`, or `.toggle-row` usage in Travel/Conquest.

Next correct step:

- Migrate Audio with a reusable settings picker/menu primitive for sound-file selection and preview, rather than preserving its current local dropdown island.

## Audio Settings Primitive Migration

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsPickerRow.svelte`.
- Exported `PaxSettingsPickerRow` and `PaxSettingsPickerOption` from the design-system component index.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Audio.svelte` around Pax primitives:
  - `PaxSettingsToggleRow` for master enabled and separate-conquest routing.
  - `PaxSettingsRangeRow` for master volume, sound volume, and offset controls.
  - `PaxSettingsPickerRow` for sound-file selection and per-file preview.
  - `PaxHudButton` for per-sound test actions.
- Removed the feature-owned custom dropdown, raw range inputs, raw toggle inputs, test buttons, offset rows, and old local file-picker classes.
- Replaced picker glyph arrows/play symbols with `HudIcon` registry icons inside the primitive.

Intent:

- Move Audio, a top-level Settings rail item, out of local bespoke control styling and into the shared design-system grammar.
- Add a reusable picker primitive before migrating custom menu/dropdown settings elsewhere.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Feature-level audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old file-picker classes, `.setting-row`, `.toggle-row`, `.test-btn`, or `.offset-row` in `ControlsSection-Audio.svelte`.
- Picker primitive audit found no text-glyph arrows/play icons or old file-picker class names.

Next correct step:

- Continue raw-control migration in Ships/Timing/Surge/FrontierFx or start reducing remaining live HUD warnings such as `SpeedControls.svelte`.

## SpeedControls Primitive And Warning Cleanup

Implemented:

- Migrated `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte` from raw local buttons to `PaxHudButton`.
- Kept layout/size CSS local, but moved visible button chrome and active styling into the Pax button primitive.
- Changed `currentSpeed` initialization so it no longer captures the initial `speed` prop value directly in `$state(...)`.

Intent:

- Remove the recurring `state_referenced_locally` build warning from a live HUD component.
- Continue enforcing the component-base rule in mobile live HUD controls, not only the desktop `game-hud` layer.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Build output no longer reports `SpeedControls.svelte` or `state_referenced_locally`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, local `HudIcon`, class directives, or old `.speed-btn--active` class usage in `SpeedControls.svelte`.

Next correct step:

- Continue settings primitive migration in Ships/Timing/Surge/FrontierFx, or address remaining non-component build warnings separately if they become review blockers.

## Timing Settings Primitive Migration

Implemented:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Timing.svelte` around Pax primitives.
- Replaced raw range controls with `PaxSettingsRangeRow` and `PaxHudRange`.
- Replaced raw toggle switches with `PaxSettingsToggleRow`.
- Replaced territory-transition lock buttons with `PaxHudButton`.
- Preserved tick interval updates, animation lock recalculation, animation-speed binding, territory-transition binding, and P/R/A lock callbacks.

Intent:

- Convert a top-level timing Settings category to the shared component system.
- Remove old local lock/toggle/range markup while preserving the timing data flow.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, `.var-row`, `.row-top`, `.mode-select`, `.toggle-row`, `.lock-btn`, `.toggle-switch`, or `.toggle-slider` usage in `ControlsSection-Timing.svelte`.

Next correct step:

- Continue with Surge or FrontierFx, then defer the much larger Ships/Territory surfaces to smaller sub-slices.

## Surge Settings Primitive Migration

Implemented:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Surge.svelte` around Pax settings primitives.
- Replaced raw range controls with `PaxSettingsRangeRow`.
- Replaced raw checkbox toggles with `PaxSettingsToggleRow`.
- Preserved attack surge, pulse binding, orb merge, and orb-layer config write paths.

Intent:

- Convert another high-density visual/combat-tuning surface to the shared component system without changing gameplay semantics.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, `.var-row`, `.row-top`, `.mode-select`, `.toggle-row`, `.lock-btn`, `.toggle-switch`, or `.toggle-slider` usage in `ControlsSection-Surge.svelte`.

Next correct step:

- Continue with FrontierFx or split the large Ships/Territory surfaces into smaller primitive-owned sub-slices.

## Frontier FX Settings Primitive Migration

Implemented:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-FrontierFx.svelte` around Pax primitives.
- Replaced the mode select with `PaxHudSelect`.
- Replaced effect ranges with `PaxSettingsRangeRow`.
- Replaced steady-state/transition toggles with `PaxSettingsToggleRow`.
- Preserved the render-mode support gate, mode descriptions, and `updateConfig(...)` writes.
- Retokenized the local card/note shell with HUD variables.

Intent:

- Convert a contained territory visual-effects surface to the shared component system without altering territory renderer logic.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, `.var-row`, `.row-top`, `.mode-select`, `.toggle-row`, `.lock-btn`, `.toggle-switch`, or `.toggle-slider` usage in `ControlsSection-FrontierFx.svelte`.

Next correct step:

- Continue with smaller sub-slices from Ships/Territory/Metaball tuning, because those files are too large for a safe single rewrite.

## Small Settings Utility Primitive Batch

Implemented:

- Extended `pax-fluxia/src/lib/design-system/components/PaxHudSelect.svelte` with a `disabled` prop.
- Migrated `TerritoryGeometrySourceTuning.svelte` to `PaxHudSelect`.
- Migrated `SettingsDumpDiagnosticsControls.svelte` to `PaxSettingsToggleRow` and `PaxHudButton`.
- Migrated `PerfScenarioRunner.svelte` to `PaxHudSelect` and `PaxHudButton`, preserving disabled state during running scenarios.
- Migrated `PerimeterFieldDiagnosticsControls.svelte` to `PaxSettingsToggleRow`, `PaxHudSelect`, `PaxHudRange`, and `PaxHudButton`.
- Migrated `TerritorySlaWidget.svelte` to `PaxSettingsToggleRow` and `PaxSettingsRangeRow`.

Intent:

- Clear several small settings/diagnostic islands before tackling the largest files.
- Improve the select primitive rather than dropping behavior in perf scenario controls.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, `.var-row`, `.row-top`, `.mode-select`, `.toggle-row`, `.lock-btn`, `.toggle-switch`, `.toggle-slider`, `.scrub-step-btn`, `.mini-action-btn`, `.snapshot-btn`, or `.slider-row` usage in the touched utility components.

Next correct step:

- Recount remaining raw-control density, then split Ships/Territory/Metaball into smaller safe primitive-migration slices.

## Players, Transition, And Topology Primitive Migration

Implemented:

- Added `pax-fluxia/src/lib/design-system/components/PaxColorSwatchButton.svelte` and exported it from the design-system component barrel.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Players.svelte` around `PaxSettingsRangeRow`, `PaxHudButton`, and `PaxColorSwatchButton`.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/TerritoryTransitionTuning.svelte` around `PaxSettingsToggleRow`, `PaxHudRange`, `PaxHudButton`, and `PaxHudSelect`.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte` around `PaxSettingsRangeRow` and `PaxSettingsToggleRow`.

Intent:

- Remove another batch of raw settings controls and local one-off button/swatch skins.
- Keep dynamic player color presentation reusable and themeable by moving swatch styling into a design-system primitive.
- Preserve all existing player palette persistence/application, transition lock callbacks, topology compile scheduling, and territory config writes.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old row/toggle/lock class names, or mojibake degree markers in the three touched settings panels.

Next correct step:

- Recount remaining raw-control density.
- Continue with `TerritorySurfaceStyleTuning.svelte` or `ControlsSection-Diagnostics.svelte`, then split the much larger `MetaballGridTuning.svelte`, `ControlsSection-Territory.svelte`, and `ControlsSection-Ships.svelte` into smaller safe commits.

## Diagnostics Primitive Migration

Implemented:

- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte` to use `PaxSettingsToggleRow`, `PaxSettingsRangeRow`, and `PaxHudButton` for overlay, measurement/ruler, recorder/export, and underlying-geometry controls.
- Migrated `pax-fluxia/src/lib/components/ui/settings/TerritoryEngineTraceDiagnostics.svelte` to use `PaxSettingsToggleRow` and `PaxHudButton`.
- Removed obsolete local `.mini-action-btn`, raw ruler-label, and legacy row wrapper selectors from the migrated diagnostics surfaces.

Intent:

- Remove another visible Settings/Diagnostics island from raw inputs/buttons and old row/toggle styling.
- Preserve debugging and export behavior while standardizing control chrome through Pax primitives.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old toggle/lock classes, `.var-row`, or `.row-top` usage in the two touched diagnostics components.

Next correct step:

- Continue with `TerritorySurfaceStyleTuning.svelte` and `ThemeSelectDropdown.svelte`, then split the large `MetaballGridTuning.svelte`, `ControlsSection-Territory.svelte`, and `ControlsSection-Ships.svelte`.

## Territory Surface Style Primitive Migration

Implemented:

- Migrated `pax-fluxia/src/lib/components/ui/settings/TerritorySurfaceStyleTuning.svelte` to `PaxHudSelect`, `PaxSettingsRangeRow`, and `PaxSettingsToggleRow`.
- Converted Cell Paint, Perimeter Placement, Border Paint, Ember Lattice Border Geometry, and Finish controls away from raw selects/ranges/toggles.
- Added local option arrays for select-driven surface controls.
- Removed obsolete legacy row-disabled CSS selectors.

Intent:

- Move a visual-polish-critical territory style surface onto the shared primitive/token base.
- Preserve all existing `onUpdate(configKey, panelKey, value)` write paths.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, old row/toggle classes, `.var-row`, `.row-top`, or `.mode-select` usage in `TerritorySurfaceStyleTuning.svelte`.

Next correct step:

- Decide whether to wrap/replace `ThemeSelectDropdown.svelte` or begin splitting one of the large remaining files: `MetaballGridTuning.svelte`, `ControlsSection-Territory.svelte`, or `ControlsSection-Ships.svelte`.

## Theme Select Dropdown Primitive Migration

Implemented:

- Replaced `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte` custom raw-button listbox with `PaxSettingsPickerRow`.
- Preserved the component's public props for `GameThemeManager.svelte`.
- Flattened theme family groups for current usage; `showGroupLabels` now only emits group metadata when requested, matching the current product direction to hide category organization for now.

Intent:

- Remove the last small raw-control island in the Settings folder before tackling the three large files.
- Keep theme selection on the shared primitive/token base instead of maintaining a local dropdown skin.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw `<button>`, `<select>`, `<input>`, inline `style=`, active class toggles, or old row/select classes in `ThemeSelectDropdown.svelte`.

Next correct step:

- Split the remaining large files into safe primitive-migration slices: `ControlsSection-Ships.svelte`, `ControlsSection-Territory.svelte`, and `MetaballGridTuning.svelte`.
