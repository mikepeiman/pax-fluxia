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
