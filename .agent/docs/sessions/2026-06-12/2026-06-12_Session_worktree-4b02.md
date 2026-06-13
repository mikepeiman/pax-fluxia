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

## Metaball Grid Button Primitive Slice

Implemented:

- Migrated `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte` module visibility controls to `PaxHudSegmentedControl`.
- Migrated frontier benchmark preset chips to `PaxHudButton`.
- Removed obsolete `.module-all-toggle`, `.module-chip`, and `.preset-chip` CSS.

Intent:

- Establish a safe primitive-owned foothold inside the largest remaining tuning component before converting its many range/select/toggle controls.
- Preserve `METABALL_GRID_MODULE_PANEL_KEY`, `setActiveModule(...)`, `activeModule`, and `applyFrontierPreset(...)` behavior.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw `<button>`, `class:active`, `.module-chip`, `.module-all-toggle`, or `.preset-chip` usage in `MetaballGridTuning.svelte`.

Next correct step:

- Continue `MetaballGridTuning.svelte` in subsections: Grid controls, Border controls, Frontier controls, Wave controls, Flip controls, then Perf controls.

## Metaball Grid Full Control Primitive Migration

Implemented:

- Finished the remaining control migration inside `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`.
- Added local option arrays for Grid, Frontier, Wave, and Flip select-driven controls.
- Migrated Grid controls to Pax primitives:
  - enable toggle
  - cell/base spacing
  - Phase Field pattern spacing
  - density alias
  - origin mode
  - distribution
  - position jitter
  - max cells
- Migrated Phase Field grid controls to Pax primitives:
  - cell shape
  - cell inset
  - inward offset
  - square corner
  - border mode
  - border blend
  - frontier highlight
  - border/edge shaping controls
- Migrated Frontier controls to Pax primitives:
  - frontier technique
  - phase sampling
  - blur passes
  - triangle diagonal
  - frontier Chaikin
  - shader softness
  - band width
- Migrated Wave controls to Pax primitives:
  - adjacency
  - wave geometry
  - wave seeding
- Migrated Flip controls to Pax primitives:
  - flip transition
  - flip window
  - wave easing
  - flip-time jitter
- Migrated Phase Field finish-tail controls to `PaxSettingsRangeRow`:
  - finish fade start/end
  - size collapse start/end
  - final cell size
  - frontier fade start/end
- Replaced the remaining inline style attributes in this component with local classes.

Intent:

- Remove the largest remaining mixed raw-control island from Settings and put the Metaball Grid tuning surface under the shared Pax primitive/token grammar.
- Preserve renderer/tuning behavior by keeping all existing `writeConfig(configKey, panelKey, value)` calls and current helper functions.

Validation:

- `rg -n "<button|<select|<input|style=|class:active|class:is-active" pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`: no matches.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; only existing large-chunk warnings remain.

Runtime note:

- The reported Pixi dev-shell error `Extension type environment already has a handler` is still treated as a Vite/dev optimization cache issue if it appears in an already-running server. The code fix from the earlier slice keeps `pixi.js` in `optimizeDeps.include` and `resolve.dedupe`; if it persists locally, restart the dev server and force Vite optimization before retesting.

Next correct step:

- Recount raw-control density across Settings.
- Continue systemic migration in `ControlsSection-Ships.svelte` and `ControlsSection-Territory.svelte`.
- After those two large files are converted, shift effort from migration to visual polish against the Aurelia Drift reference.

## Ships Size/Shape Primitive Migration

Implemented:

- Began the `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte` migration in the highest-density remaining Settings file.
- Added shared local helpers:
  - `writePanelConfig(panelKey, configKey, value)`
  - `setStarSystemScale(newScale)`
- Moved Star System Scale from a raw range input to `PaxSettingsRangeRow`.
- Moved Ship Size/Shape controls to Pax primitives:
  - Visual Radius
  - Scale Multiplier
  - Ship Outline
  - Outline px
  - Glow Intensity
  - Glow Radius
  - Min Contrast

Intent:

- Start the Ships migration with the top visible subsection and reduce duplicated inline event code before touching deeper clusters.
- Preserve the existing star-system scale cascade that updates radius, orbit, label, and hit-radius values together.

Validation:

- Ships raw-control audit count reduced from `115` to `107`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Ships.svelte` with the Star Halos cluster, then Orbit Layout, Star Shape, Label, Arrow/Orders, Damaged Ships, Interaction, Density Coloring, and Star Glow.

## Ships Star Halos Primitive Migration

Implemented:

- Added `PaxHudButton`, `PaxHudSegmentedControl`, and `PaxHudSegmentedOption` usage to `ControlsSection-Ships.svelte`.
- Added `HALO_FLEET_MODE_OPTIONS` for the two-option fleet glow mode control.
- Migrated Star Halos controls to Pax primitives:
  - Show Halos
  - Halo Alpha
  - Halo Radius
  - Halo Layers
  - Halo Blur
  - Layer Curve
  - Edge Band
  - Edge Width
  - Glow-Dominant Ownership preset button
  - Fleet Glow
  - Fleet Intensity
  - Fleet Mode
  - Step Size
  - Max Ships

Intent:

- Remove the next visible legacy control cluster in Ships while preserving all halo/fleet config writes.
- Replace the raw two-button fleet mode group and inline style hook with a shared segmented control.

Validation:

- Ships raw-control audit count reduced from `107` to `89`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Ships.svelte` with Orbit Layout, then Star Shape and label/color controls.

## Ships Orbit Layout Primitive Migration

Implemented:

- Migrated Orbit Layout controls in `ControlsSection-Ships.svelte` to `PaxSettingsRangeRow`:
  - Inner Orbit Padding
  - Orbit Spacing Size
  - Ring Spacing
  - Ships Per Ring
  - Max Ships/Star
  - Star Radius

Intent:

- Remove another simple raw range cluster while preserving direct config writes for orbit spacing and star radius.

Validation:

- Ships raw-control audit count reduced from `89` to `83`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Ships.svelte` with Star Shape and Ownership Ring controls.

## Ships Star Shape And Ownership Ring Primitive Migration

Implemented:

- Continued migrating `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`.
- Added `STAR_SHAPE_MODE_OPTIONS` for the shared segmented shape-mode control.
- Migrated Star Shape controls to Pax primitives:
  - Shape Mode
  - Icon Scale
  - Corner Radius
- Migrated Ownership Ring controls to `PaxSettingsRangeRow`:
  - Ring Radius
  - Ring Offset
  - Ring Width
  - Ring Alpha
  - Ring Saturation
  - Ring Lightness

Intent:

- Remove another contiguous raw-control island from Ships while keeping live tuning behavior intact.
- Preserve existing `GAME_CONFIG` keys and `panel` keys through `writePanelConfig(...)`.

Validation:

- Ships raw-control audit count reduced from `83` to `70`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Runtime note:

- The Pixi dev-shell error report remains covered by the existing Vite mitigation: `pixi.js` is prebundled and deduped in `pax-fluxia/vite.config.js`. If the error appears from an already-running dev server, restart the dev server and force Vite optimization before retesting.

Next correct step:

- Continue `ControlsSection-Ships.svelte` with Star Labels, including the label layout segmented control and the label-scale cascade.

## Ships Star Labels Primitive Migration

Implemented:

- Continued migrating `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`.
- Added Star Labels option registries:
  - `STAR_LABEL_LAYOUT_OPTIONS`
  - `STAR_LABEL_COLOR_MODE_OPTIONS`
- Extracted the existing label-size cascade into `setStarLabelScale(newScale)`.
- Migrated Star Labels controls to Pax primitives:
  - label layout
  - label font scale
  - angle and distance
  - ID, active, damaged, and line-height font metrics
  - padding, gap, background opacity, border opacity, border width
  - tag color mode and universal HSLA controls
  - leash line toggle

Intent:

- Remove the largest remaining raw-control block in Ships while preserving the exact label tuning config keys and the multi-key scale cascade.
- Replace inline styles and local two-button modes with shared segmented controls.

Validation:

- Ships raw-control audit count reduced from `70` to `35`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Ships.svelte` with Order Arrows, Damaged Ships, Interaction, Density Coloring, and Star Glow.

## Ships Remaining Controls Primitive Migration

Implemented:

- Completed the remaining `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte` migration.
- Added arrow option/helper support:
  - `ARROW_HEAD_STYLE_OPTIONS`
  - `ARROW_OUTLINE_TONE_OPTIONS`
  - `getArrowOutlineTone()`
  - `setArrowOutlineTone(tone)`
- Migrated Order Arrows controls to Pax primitives:
  - arrowhead size/style/spread/notch
  - shaft width, opacity, length, gradient steps, flow speed
  - dash length/gap, head VFX/opacity
  - force reactivity/ceiling
  - outline width/opacity/tone
- Migrated the remaining non-arrow controls:
  - Damaged Ships orbit radius, evade toggle, and damaged scale
  - Interaction hit zone radius
  - Density Coloring variable loop and alternate darkening toggle
  - Star Glow enabled/radius/intensity

Intent:

- Finish the Ships settings migration so the entire file is owned by the shared Pax primitive/token system.
- Preserve all existing `GAME_CONFIG` writes and `panel` update keys.

Validation:

- `ControlsSection-Ships.svelte` raw visible-control audit is now `0` for `<button>`, `<select>`, `<input>`, inline `style=`, `class:active`, and `class:is-active`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue the systemic settings migration in `ControlsSection-Territory.svelte`, then shift remaining effort from primitive migration to Aurelia Drift visual polish and live HUD layout fidelity.

## Toggle Row Callback Alias Fix

Implemented:

- Updated `pax-fluxia/src/lib/design-system/components/PaxSettingsToggleRow.svelte`.
- Added optional `onToggle` support alongside the existing `onChange` callback.
- Added `.agent/docs/project/post-mortems/2026-06-12_pax-settings-toggle-row-callback-alias.md`.

Intent:

- Correct a runtime callback mismatch introduced during Ships migration where several new toggles used `onToggle` but the primitive only invoked `onChange`.
- Keep existing `onChange` call sites working while making the new Ships call sites functional.

Validation:

- Pending build after this note; commit this fix separately from Territory migration work.

Next correct step:

- Build and commit the toggle-row callback fix, then resume `ControlsSection-Territory.svelte`.

## Territory Navigation Primitive Migration

Implemented:

- Began migrating `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`.
- Added Pax primitive imports:
  - `PaxHudButton`
  - `PaxHudSegmentedControl`
  - `PaxHudSelect`
  - `PaxHudSegmentedOption`
- Added option builders for:
  - system module visibility
  - renderer module visibility
  - render mode
  - transition select
- Migrated visible navigation/control surfaces:
  - Territory system module selector
  - Territory renderer module selector
  - render-mode selector
  - deprecated-mode action buttons
  - render-failure text styling hook
  - reference transition select

Intent:

- Remove the most visible local button/select styling from Territory before migrating deeper tuning internals.
- Preserve existing render-mode and transition state ownership through `selectTerritoryStyle(...)` and `debouncedConfigUpdate(...)`.

Validation:

- Territory raw-control/style audit count reduced from `79` to `56`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Territory.svelte` with the Metaball CPU grid and topology-rule tuning clusters.

## Territory Metaball CPU Grid Primitive Migration

Implemented:

- Continued `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`.
- Added Pax primitive coverage for the Metaball CPU-grid core controls:
  - cell size
  - influence radius
  - influence falloff
  - dominance threshold
  - fill follows geometry
  - strength multiplier
  - coverage padding
  - faction blend sharpness
- Added `metaballFalloffSelectOptions()` to adapt existing `METABALL_FALLOFF_OPTIONS` to `PaxHudSelect`.
- Replaced the helper-copy inline style with a local class hook.
- Restored the missing `<TerritorySurfaceStyleTuning>` tag in the Metaball section so the shared surface-style controls render there again.
- Converted the touched dominance tooltip/output to ASCII while preserving the existing behavior.

Intent:

- Continue moving Territory settings out of local ad hoc controls and into the Pax primitive/token layer.
- Preserve every existing `debouncedConfigUpdate(...)` config key and panel key.
- Correct a pre-existing rendered-markup defect in the Metaball section while the surrounding cluster is in scope.

Validation:

- Territory raw-control/style audit count reduced from `56` to `47`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue `ControlsSection-Territory.svelte` with the remaining Combat/Fleet Pressure, topology-rule, style-family, and legacy button clusters until the file has a zero-match raw-control/style audit.

## Territory Remaining Controls Primitive Migration

Implemented:

- Completed the remaining migration in `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`.
- Migrated Metaball Combat/Fleet Pressure controls to Pax range rows:
  - combat border proximity
  - combat recency
  - combat width boost
  - combat alpha boost
  - fleet pressure on borders
- Migrated Frontier Topology controls to Pax range/toggle rows:
  - minimum star margin
  - star bias
  - frontier resolution
  - corridor virtual sites
  - lane midpoint pairs and pair tuning
  - corridor sample count, weight, and spacing
  - disconnect gaps, weight, and distance
- Migrated Engine Surface shape/motion controls to Pax range and segmented controls.
- Converted remaining runtime fill/border controls to Pax range/toggle rows.
- Replaced remaining inline helper-copy styles with token-aware class hooks.
- Converted the disabled legacy Fill/Borders block away from raw controls so the file-level static audit is clean.

Intent:

- Finish the high-density Territory settings conversion to the shared Pax primitive/token layer.
- Preserve all existing config writes through `debouncedConfigUpdate(...)`, `queueTopologySliderUpdate(...)`, `queueTopologyToggleUpdate(...)`, and `updatePanel(...)`.
- Remove final local button/select/input/styling escapes from the Territory settings surface.

Validation:

- `ControlsSection-Territory.svelte` raw-control/style audit is now `0` for `<button>`, `<select>`, `<input>`, inline `style=`, `class:active`, and `class:is-active`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Audit remaining settings/HUD files for raw visible controls and direct one-off styling escapes, then move from primitive coverage into Aurelia Drift layout/style fidelity work.

## Settings Accent Ownership Cleanup

Implemented:

- Added `accentId?: string` to `pax-fluxia/src/lib/design-system/components/PaxHudButton.svelte`.
- `PaxHudButton` now renders `data-accent-id={accentId}` on its owned native button.
- Replaced inline tool accent styles in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` with `accentId={tool.id}`.
- Replaced inline section panel accent styles with `data-accent-id={sec.id}`.
- Added a CSS accent map for settings tools and section panels.

Intent:

- Keep settings accent styling in the component/style system instead of ad hoc inline style attributes.
- Preserve existing tool and section colors while making the rail/drawer shell easier to theme.

Validation:

- `GameSettingsPanel.svelte` audit now has no matches for `style=`, raw controls, or active-class toggles.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Next correct step:

- Continue live HUD polish in `src/lib/components/game-hud/`, prioritizing Settings Ribbon, Topbar, Player Standings, Star View, and Quick Access fidelity to Aurelia Drift.

## Local HUD Font Packaging

Implemented:

- Added packaged HUD font assets under `pax-fluxia/static/fonts/hud/`:
  - `Cinzel-500.ttf`, `Cinzel-600.ttf`, `Cinzel-700.ttf`
  - `Rajdhani-400.ttf`, `Rajdhani-500.ttf`, `Rajdhani-600.ttf`, `Rajdhani-700.ttf`
  - `Inter-400.ttf`, `Inter-500.ttf`, `Inter-600.ttf`
  - `JetBrainsMono-400.ttf`, `JetBrainsMono-700.ttf`
- Removed the Google Fonts `@import` from `pax-fluxia/src/app.css`.
- Added local `@font-face` rules for `Cinzel`, `Rajdhani`, `Inter`, and `JetBrains Mono` in `pax-fluxia/src/app.css`.
- Preserved the existing `Pasti` local font and all existing HUD typography token variables.
- Removed duplicated external font/preconnect links from:
  - `pax-fluxia/src/routes/+page.svelte`
  - `pax-fluxia/src/routes/play/+page.svelte`
  - `pax-fluxia/src/routes/map-editor/+page.svelte`
  - `pax-fluxia/src/routes/dev/ui-test/+page.svelte`
- Removed obsolete raw-control-era CSS selector families from `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`.
- Rewrapped the remaining Territory indentation use so `.territory-indent` is applied to a real wrapper element instead of a component tag.

Intent:

- Make the HUD typography token layer self-contained for offline/Tauri/Steam packaging.
- Keep route entry points from bypassing the theme/token system with ad hoc hosted font imports.
- Remove stale settings CSS after the Territory primitive migration so build output does not carry avoidable Svelte selector warnings.

Validation:

- Static hosted-font audit returned zero matches for `@import url`, `fonts.googleapis`, `fonts.gstatic`, and `preconnect` in `pax-fluxia/src` and `pax-fluxia/static`.
- Static Territory cleanup audit returned zero matches for the removed selector families in `ControlsSection-Territory.svelte`.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- The previous `ControlsSection-Territory.svelte` unused-selector warnings no longer appear.
- Remaining build warnings are existing bundle-size and dynamic/static import warnings plus an unused `Room` import in `multiplayerStore.svelte.ts`; none were introduced by this font packaging phase.

Next correct step:

- Continue live HUD style/layout work through the existing Pax primitives and tokens, prioritizing the Settings Ribbon, Theme Library, Topbar, Player Standings, Star View, and Quick Access surfaces.

## Live HUD Primitive Cleanup

Implemented:

- Updated `pax-fluxia/src/lib/components/game/GameContainer.svelte` to use Pax primitives for the remaining audited raw controls:
  - room ID copy badge
  - surrender modal actions
  - exit confirmation actions
  - mobile FAB menu actions
  - mobile drawer close button
- Removed corrupted visible glyph text from surrender/exit modal action labels.
- Converted live layout width/style values to Svelte style directives:
  - master grid rail widths
  - settings rail width
  - tactical rail width
  - tactical overview player mark colors
- Converted resize handle active state away from `class:active`.
- Updated live HUD components to use style directives or color-scope wrappers for dynamic player/star/theme colors:
  - `HudTopbar.svelte`
  - `PlayerStandingsPanel.svelte`
  - `SelectedStarPanel.svelte`
  - `SelectedStarTray.svelte`
  - `HudThemePanel.svelte`
  - `TypographyTokenPanel.svelte`
  - `SettingsRibbon.svelte`
- Added `.pf-hud-topbar__player-badge-scope { display: contents; }` in `pax-fluxia/src/lib/styles/hud.css` so player color inheritance does not change topbar layout.
- Converted selector bridges for component-owned classes in `GameContainer.svelte` to `:global(...)` where needed, because classes passed into Pax child components render inside the child component boundary.

Intent:

- Continue enforcing a consistent component base for live HUD controls instead of retaining ad hoc raw HTML controls.
- Preserve dynamic game-signal colors while removing string-built inline style attributes from the audited live HUD surface.
- Remove visible corrupted glyph treatment from player-facing modal labels.

Validation:

- Targeted audit across `pax-fluxia/src/lib/components/game-hud` and `pax-fluxia/src/lib/components/game/GameContainer.svelte` returned zero matches for `<button>`, `<select>`, `<input>`, `style=`, `class:active`, `class:is-active`, corrupted glyph markers, `Quick Tools`, and `Low-frequency`.
- `git diff --check`: passed with line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Remaining build warnings are existing bundle-size and dynamic/static import warnings plus the unused `Room` import; this phase introduced no new Svelte selector warnings.

Next correct step:

- Continue visual fidelity work on the Settings Ribbon and Theme Library first, because those remain the most user-visible mismatch against the Aurelia Drift reference and user instructions.

## Settings Rail And Theme Library Refinement

Implemented:

- Updated `pax-fluxia/src/lib/components/game/GameContainer.svelte` settings chrome constants:
  - compact rail width: `68px`
  - expanded rail width: `108px`
- Updated matching CSS variables in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Added ellipsis truncation to expanded Settings rail labels so label text cannot wrap inside the rail.
- Reordered the Settings rail tools to follow the user’s requested set/order:
  - Themes
  - Appearance
  - Combat Tuning
  - Audio
  - Video / Graphics
  - Stats
  - Diagnostics
  - Restart
  - Quit
  - Hotkeys
  - Help
- Retained Diagnostics because the user explicitly allowed it to remain for now.
- Updated `pax-fluxia/src/lib/styles/hud.css` Theme Library rules:
  - list scroll area now uses `max-height: clamp(180px, 34vh, 360px)`
  - stable scrollbar gutter
  - row groups use grid layout
  - theme rows use grid columns for mark/name/date
  - row names and dates stay single-line with ellipsis
  - action button labels now truncate cleanly

Intent:

- Bring the live Settings rail closer to the requested icon-width vertical rail plus modest horizontal label expansion.
- Keep Theme Library compact, scrollable, newest-first, and single-level without wrapping long names.
- Continue working through system-owned CSS/tokens rather than one-off patches in the component template.

Validation:

- Targeted Settings/Theme audit returned zero matches for live-game `Load Map`, `Save Map`, `Settings Ribbon`, `Choose a system`, `Quick Tools`, `Low-frequency`, raw controls, `style=`, and active-class directives in `GameSettingsPanel.svelte` and `ThemeLibraryPanel.svelte`.
- `git diff --check`: passed with line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Remaining warnings are existing bundle-size/dynamic import warnings and unused `Room` import.

Next correct step:

- Continue visual-system polishing through shared HUD CSS, prioritizing Star View/Player Standings/Topbar alignment and button rhythm against the Aurelia Drift reference.
