# HUD Redesign Merge Handoff - Worktree 4b02 - 2026-05-23

## Branch And Commits

- Branch: `codex/ui-hud-development`
- Earlier plan commit: `371cecdb0 docs: record full hud redesign implementation plan`
- Earlier implementation commit: `ca9e7b5ab ui: implement Aurelia Drift live HUD redesign`
- Corrective implementation commit: `225df96ce ui: correct Aurelia Drift HUD settings surfaces`
- Current additional pending work: live typography token lab and packaged Pasti font asset.
- Current additional pending work: rounded HUD chrome with gold-to-dark gradient border correction.
- Current additional documentation: measured HUD component geometry audit at `.agent/docs/sessions/2026-05-23/2026-05-23_HUD_Component_Geometry_Audit_worktree-4b02.md`.

## Merge Intent

This worktree is for live in-game HUD/UI development. The current corrective commit addresses the concrete failures called out by the user:

- Settings surface was not redesigned enough and had no credible icon-ribbon state.
- Theme save/load/library widget was effectively untouched.
- Theme Library still had category clutter and no disciplined compact presentation.
- The prior settings empty state wasted large surface area with explanatory text.
- Topbar/standings/settings/star panel style did not sufficiently evoke the Aurelia Drift references.
- Live surfaces still mixed labels, glyphs, spacing, and visual grammar.

This corrective pass is still a DOM/HUD/settings pass. It does not rewrite Pixi territory rendering or map art, so the map itself remains a follow-up risk if the merge standard includes full reference-image atmospheric richness.

## Source Files Changed

### Live HUD Tokens And Shell

`pax-fluxia/src/app.css`

- Lines near `44-94`: adds HUD cut-corner tokens used by the Aurelia Drift corrective shell.
- Adds local `@font-face` for packaged Pasti OTF at `/fonts/pasti/PastiRegular-mLXnm.otf`.
- Adds role-specific HUD typography variables: `--hud-font-brand`, `--hud-font-ui`, `--hud-font-label`, `--hud-font-copy`, and `--hud-font-data`.
- Adds `--hud-border-gradient` and `--hud-control-border-gradient`.
- Changes the historical corner tokens to rounded clipping aliases so existing `clip-path` consumers no longer cut corners.

`pax-fluxia/src/lib/styles/hud.css`

- Lines near `840-1396`: main Aurelia Drift corrective layer.
- Key areas: rounded gradient panel shells, topbar player summary, aligned Player Standings, compact Star View, selected-star tray, icon-only quick access, and full Theme Library styling.
- Merge risk: this is a broad global HUD stylesheet. If master has touched HUD panel styling, compare selectors under `.pf-*`, `.area-right`, `.pf-theme-library*`, and `.pf-settings-ribbon`.
- Later rounded-border correction layer: overrides HUD panels, topbar status, theme/typography panels, quick access, game speed, Star View metrics, and common buttons/rows/inputs to use rounded corners and thin gold-to-dark gradient borders.

### New Theme Library Surface

`pax-fluxia/src/lib/components/game-hud/ThemeLibraryPanel.svelte`

- Lines `11-19`: newest-first theme ordering by `created` timestamp, with safe fallback.
- Lines `30-37`: short date formatter.
- Lines `39-88`: apply/save/update/delete/export/import actions wired to `themeStore`.
- Lines `91-193`: compact Theme Library UI.
- Lines `169-193`: scrollable list rows; category metadata is intentionally hidden. User themes can show dates and delete action; built-in/core rows no longer print `CORE`.

`pax-fluxia/src/lib/components/game-hud/index.ts`

- Exports `ThemeLibraryPanel`.
- Exports `TypographyTokenPanel`.

### Typography Token Lab

`pax-fluxia/src/lib/components/game-hud/TypographyTokenPanel.svelte`

- New in-game development control under settings.
- Lets the user assign font families independently for Brand, Interface, Labels, Copy, and Data roles.
- Persists choices to `localStorage` key `pax-hud-typography-tokens-v1`.
- Applies live changes by writing root CSS variables.
- Reset removes inline overrides and restores design defaults.

`pax-fluxia/static/fonts/pasti/PastiRegular-mLXnm.otf`

- Packaged copy of the user-provided Pasti font.
- Verified copied into `pax-fluxia/build/fonts/pasti/PastiRegular-mLXnm.otf` by the static build.

### Settings Panel Correction

`pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

- Line `89`: imports `ThemeLibraryPanel` instead of old `GameThemeManager`.
- Lines `750-760`: adds `onSectionActivityChange` prop.
- Lines `868-873`: reports whether any settings section is open.
- Lines `1101-1219`: settings header, search/config import/export, and new theme utility placement.
- Line `1219`: mounts `<ThemeLibraryPanel />`.
- Line near `1223`: mounts `<TypographyTokenPanel />`.
- Final style block now overrides settings header tools, icon toolbar, section panels, section controls, rows, and theme-setting controls to rounded corners with gold-to-dark border-box gradients.
- Lines `1223-1288`: settings shell now supports rail-only mode and compact icon navigation.
- Lines `1545-1806`: original icon-toolbar/section-panel CSS retained and adjusted.
- Lines `1830-2419`: corrective settings CSS layer: compact command search, 2x2 config actions, rail-only icon grid, widened section state, no empty explanatory slab.
- Lines `2346-2419`: active settings section panel restyled to warm/cyan HUD shell.
- Removed visible import/export status emoji and dead tier-toggle CSS.

### Layout And State Integration

`pax-fluxia/src/lib/components/game/GameContainer.svelte`

- Lines `320-329`: updated sidebar/settings width constants.
- Lines `366-380`: `settingsEffectiveWidth` and `setSettingsSectionActivity` keep no-section settings narrow but expand when a section opens.
- Lines `770-817`: topbar mount and collapse/open controls.
- Lines `829-857`: selected-star tray and left-side rail placement.
- Lines `864-882`: settings rail mounted with dynamic width and section-activity callback.
- Lines `886-959`: right tactical rail with Player Standings, Game Speed, Star View, tactical overview, and quick-access dock.
- Lines `1328-1380`: master game grid still owns `topbar`, `playfield`, `ribbon`, and `tactical` areas.

### Topbar And Standings

`pax-fluxia/src/lib/components/game-hud/HudTopbar.svelte`

- Lines near `52-73`: adds local player command summary block (`You`, active ships, total ships, stars) and removes theme-name status clutter.

`pax-fluxia/src/lib/components/game-hud/PlayerStandingsPanel.svelte`

- Lines `63-132`: Player Standings table with compact aligned columns, local-player emphasis, and `Focus` active/total toggle.

### Settings Icon Cleanup

`pax-fluxia/src/lib/components/ui/settings/CategoryThemeBar.svelte`

- Replaces visible emoji/glyph controls with `HudIcon`.
- Line `107`: fixes Svelte non-reactive `bind:this` warning with `$state<HTMLInputElement | null>`.

`pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`

- Removes visible emoji prefixes from labels touched by the visual settings surface.

## Validation

Commands run from `C:\Users\mikep\.codex\worktrees\4b02\pax-fluxia`:

- `git diff --check`: passed.
- `bun run --cwd pax-fluxia build`: passed after final Theme Library category cleanup.
- `bun run --cwd pax-fluxia check`: failed on repository baseline with `329 errors and 819 warnings in 64 files`.
- `Get-Item pax-fluxia/build/fonts/pasti/PastiRegular-mLXnm.otf`: confirmed packaged static build asset exists after build.

Browser/CDP QA against `http://127.0.0.1:1499`:

- Started a real local match from the main menu.
- Closed an audio modal left over from earlier browser state.
- Opened settings from the topbar.
- Verified Theme Library appears inside settings, has `overflow-y: auto`, has `clientHeight 145`, `scrollHeight 2935`, is newest-first, and no longer renders `CORE`/category rows.
- Verified `Load Map` is not present within the Theme Library/text window.
- Verified no visible `Quick Tools`, `Actions`, `Low-frequency`, `Settings Ribbon`, or `Choose a system to tune`.
- Selected a real map star through Chrome input events; topbar changed from `SELECTED None` to `SELECTED Star 5`, Star View showed `Star 5`, and selected-star tray showed `Star 5`.
- Checked 1280x720 and 1920x1080: topbar, right rail, Player Standings, Game Speed, Star View, tray, and quick-access dock had no measured outside-viewport overflow.

Browser QA against `http://127.0.0.1:5177` for typography controls:

- Started a real local match.
- Opened settings from the topbar.
- Verified `Typography / Token Lab` appears beneath Theme Library.
- Selected Pasti for Brand and saw the control/status update.
- Reset typography tokens to defaults after the test.

Browser QA against `http://127.0.0.1:5178` for rounded chrome:

- Started a local game.
- Opened settings.
- Verified topbar/status/settings/theme/right-rail surfaces render rounded rather than cut.
- Verified visible thin border treatment uses stronger gold-to-dark gradient styling.

Chrome/CDP geometry audit against `http://127.0.0.1:5178`:

- Measured controlled desktop viewport `1904 x 985`.
- Documented topbar `64px`, settings rail `340px`, tactical rail `390px`, settings-open playfield `1174px`, and all visible HUD component positions/functions.
- Captured a concrete deficiency: the settings icon ribbon begins at `y=874` and extends `169px` below the viewport in the no-section state, so the ribbon layout is still structurally wrong.

## Known Risks

- The Pixi map renderer remains much less rich than the Aurelia Drift reference images. This commit improves the DOM HUD/settings shell, not the underlying territory/starfield rendering.
- `GameContainer.svelte` still owns the master grid and canvas/HUD composition. A true `HudShell.svelte` wrapper was not completed in this corrective pass because doing that safely would require a larger canvas/overlay ownership split.
- `svelte-check` remains blocked by repository-wide baseline errors unrelated to this pass. The remaining warnings are in existing extracted settings/territory components and other baseline files, not in the corrected settings rail shell.
- The old main menu still has a global `Load Map` command. This is intentionally not removed; the user rejection targeted `Load Map` inside the Theme widget/cluster.
- Pasti is packaged locally. Existing defaults Rajdhani, Inter, and JetBrains Mono are still loaded through existing Google Fonts links elsewhere in the app unless replaced with local font files in a future packaging pass.

## Merge Strategy

- Merge the current corrective commit after visual review, not the earlier implementation commit alone.
- If conflicts occur in `GameContainer.svelte`, preserve the dynamic settings width model and `onSectionActivityChange` path; otherwise the settings ribbon will regress to a wide empty slab.
- If conflicts occur in `GameSettingsPanel.svelte`, preserve the `ThemeLibraryPanel` replacement, removal of empty explanatory state, and rail-only shell classes.
- If conflicts occur in `hud.css`, keep the lower corrective layer unless master has a newer, deliberate Aurelia Drift HUD shell that supersedes it.

## 2026-05-24 Settings Ribbon Correction

User clarified the intended ownership model after review:

- Settings belongs in the topbar-left control cluster as the collapsed stub.
- Open state is a left master icon rail.
- Clicking a rail icon opens one adjacent panel immediately to the right of the rail.
- Opening/closing a panel does not move or replace the rail; the active icon gets highlighted.
- Bottom-right duplicate settings/ellipsis/art palette/fit/ruler shortcuts do not belong.
- Live-game save/load map/game entries do not belong in the old in-game settings menu.
- Star View owns previous/next owned-star cycling, zoom-selected-star, and fit-map controls.

Implementation changes for the merge:

- `pax-fluxia/src/lib/components/game-hud/HudTopbar.svelte`: settings control is now in the left brand/control cluster.
- `pax-fluxia/src/lib/components/game-hud/SettingsRibbon.svelte`: delegates close/restart/quit into the rail-backed settings panel and no longer renders a separate floating close control.
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`: adds the rail item registry and adjacent panel behavior for Theme Library, Appearance/Typography, Combat, Audio, Video/Graphics, Stats, Diagnostics, Hotkeys, Help, Restart, and Quit.
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`: removes the old live-game menu drawer/save-load surface and strips bottom quick-access actions down to authored measurements only.
- `pax-fluxia/src/lib/components/game-hud/SelectedStarPanel.svelte`: adds previous/next owned-star controls plus distinct zoom and fit-map actions.
- `pax-fluxia/src/lib/components/game-hud/SelectedStarTray.svelte` and `pax-fluxia/src/lib/styles/hud.css`: semantic tray collapse chevrons and transition.

Validation for this correction:

- `git diff --check`: passed.
- `bun run --cwd pax-fluxia build`: passed.
- `bun run --cwd pax-fluxia check`: failed on existing repository baseline with `329 errors and 819 warnings in 64 files`.
- Browser QA against `http://127.0.0.1:5178/play`: started a local game, opened/collapsed settings from topbar-left, opened Themes/Appearance/Diagnostics in the adjacent panel, confirmed no visible bottom-right duplicate settings path, and verified Star View next-owned-star selection updates Star View and selected-star tray.

## 2026-05-24 Border/Scale/Bottom-Bar/Icon Follow-Up

User requested four specific corrections:

- Border gradient was too dark; dark stops are now halved in `--hud-border-gradient` and `--hud-control-border-gradient`.
- Fonts/icons were too small; Appearance/Typography now exposes scale sliders for UI, Titles, Labels, Data, and Icons, persisted under `pax-hud-typography-tokens-v1`.
- The bottom-center command controls had been removed; a new `BottomCommandBar.svelte` restores persistent Map, Players, Overlays, Settings, and View controls.
- Relevant icons from `C:\Users\mikep\Downloads\pax_fluxia_quintessential_td_icon_atlas.pdf` were extracted to `pax-fluxia/static/icons/td-atlas/`, processed to transparent backgrounds, and selected `td-*` icon aliases were registered in `HudIcon.svelte`.

Merge-relevant files:

- `pax-fluxia/src/app.css`: shared gradient and scale tokens.
- `pax-fluxia/src/lib/styles/hud.css`: bottom command bar layout, selected-star tray offset, scale-token consumers, Typography scale-control styles.
- `pax-fluxia/src/lib/components/game-hud/BottomCommandBar.svelte`: restored bottom-center command widget.
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`: bottom command action model and mount point inside `area-canvas`.
- `pax-fluxia/src/lib/components/game-hud/TypographyTokenPanel.svelte`: persisted scale controls.
- `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`: scaled icons, added atlas-style SVGs and `td-*` PNG aliases.
- `pax-fluxia/static/icons/td-atlas/`: extracted atlas PNG assets plus source README.
- `.agent/docs/project/post-mortems/2026-05-24_bottom-center-command-bar-removal.md`: process failure record.

Validation:

- `git diff --check`: passed.
- `bun run --cwd pax-fluxia build`: passed.
- `bun run --cwd pax-fluxia check`: failed on existing repository baseline with `329 errors and 819 warnings in 64 files`; no touched-file diagnostics remain from this follow-up.
- Visual review should specifically check bottom-center bar/tray stacking at desktop sizes and whether the default 108-118% scale values are enough.

## 2026-05-27 HUD Refinement And Iconography Pass

User requested a concrete cleanup pass because the current HUD was still messy: insufficient padding, weak typography readability, inconsistent buttons, partial/varied Overlay Legend borders, and improper iconography. The attached reference was `C:/Users/mikep/Downloads/pax_qtd_icon_registry.md`.

Implementation changes for the merge:

- `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`: added semantic Aurelia Drift/QTD-style icons for settings, appearance, render mode, overlay legend, quick access, game speed, standings, camera fit, focus, star view, active ships, total ships, damaged ships, route/send, cancel, borders, labels, and related tactical controls.
- `pax-fluxia/src/app.css`: softened the shared gold-to-dark gradient borders by reducing the dark trough in both panel and control border gradients.
- `pax-fluxia/src/lib/styles/hud.css`: added the refinement layer that increases panel padding, icon-button minimum size, game speed button height, standings row rhythm, Star View metric spacing, Theme Library padding, Typography panel spacing, bottom command bar size, and selected-star tray padding.
- `pax-fluxia/src/lib/components/ui/hud-test/HudLayoutTestMockup.svelte`: rebuilt Overlay Legend as a padded rounded panel with consistent gold-gradient row controls and semantic icons.
- `pax-fluxia/src/lib/components/game-hud/*.svelte`, `pax-fluxia/src/lib/components/game/GameContainer.svelte`, `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`, and settings section files: replaced obvious legacy icon names and visible glyph labels in the touched live/settings paths.
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`: removed visible emoji prefixes from settings/log labels and changed tier icons to text-only placeholders until those rows render `HudIcon` directly.

Validation status:

- `git diff --check`: passed after code and documentation updates.
- `bun run --cwd pax-fluxia build`: passed.
- Browser QA: `/dev/ui-test` screenshot confirmed the Overlay Legend now has real padding and consistent rounded gold-gradient row styling. Direct `/play` and `/?showGame=1` screenshot attempts landed on the main menu, so live in-game QA still requires an explicit local-game start flow.
- `bun run --cwd pax-fluxia check`: repository baseline remains blocked by the existing `329 errors and 819 warnings in 64 files`; this pass did not target unrelated baseline type debt.

Merge guidance:

- Preserve the semantic icon substitutions and the refinement block in `hud.css`; these are intentional corrective overrides for visual rhythm and readability.
- If conflicts occur in the UI test mockup, keep the new `legendItems` data model and `.legend-row` control style, because that directly fixes the partial-border issue.
- If conflicts occur in settings files, do not reintroduce emoji/glyph prefixes unless the row is explicitly rendering through `HudIcon`.

## 2026-06-12 Aurelia HUD Package Integration

User provided the external package README at `C:\Users\mikep\Desktop\WebDev\pax-fluxia\pax-fluxia\pax-fluxia-hud\README.md` and requested implementation in this project.

Scope implemented:

- Imported the external Aurelia Drift HUD package into an isolated namespace at `pax-fluxia/src/lib/aurelia-hud/`.
- Added the package theme file as `pax-fluxia/src/lib/aurelia-hud/aurelia-hud-theme.css`.
- Added `@ark-ui/svelte` to `pax-fluxia/package.json` and updated `bun.lock`.
- Added Tailwind source scanning for `./lib/aurelia-hud` in `pax-fluxia/src/app.css`.
- Imported the Aurelia HUD theme from `pax-fluxia/src/app.css`.
- Added Google font import for package demo fonts `Cinzel` and `Rajdhani` in `pax-fluxia/src/app.css`.
- Added a dev route at `pax-fluxia/src/routes/dev/aurelia-hud/+page.svelte`.
- Added a live-game topbar link labeled `Aurelia HUD` in `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`.

Important implementation boundary:

- This is a package/demo integration and implementation lab, not a live gameplay HUD replacement.
- The route mounts `<PaxHud demoTicker />` and uses the package's internal demo state.
- The route installs a `hud.bridge` adapter whose callbacks log via the project logger. It does not yet bind to Colyseus, Pixi, `activeGameStore`, or real selected-star state.
- The imported package still contains demo concepts from the source package. Do not treat them as accepted live-game data semantics.

Imported package file set:

- `pax-fluxia/src/lib/aurelia-hud/PaxHud.svelte`
- `pax-fluxia/src/lib/aurelia-hud/TopBar.svelte`
- `pax-fluxia/src/lib/aurelia-hud/LeftRail.svelte`
- `pax-fluxia/src/lib/aurelia-hud/BottomDock.svelte`
- `pax-fluxia/src/lib/aurelia-hud/TacticalStandings.svelte`
- `pax-fluxia/src/lib/aurelia-hud/StarViewPanel.svelte`
- `pax-fluxia/src/lib/aurelia-hud/GameSpeedPanel.svelte`
- `pax-fluxia/src/lib/aurelia-hud/EventFeed.svelte`
- `pax-fluxia/src/lib/aurelia-hud/OverlayLegend.svelte`
- `pax-fluxia/src/lib/aurelia-hud/OverviewPanel.svelte`
- `pax-fluxia/src/lib/aurelia-hud/CancelOrderDialog.svelte`
- `pax-fluxia/src/lib/aurelia-hud/ZoomControls.svelte`
- `pax-fluxia/src/lib/aurelia-hud/primitives/*`
- `pax-fluxia/src/lib/aurelia-hud/state/hud-state.svelte.ts`
- `pax-fluxia/src/lib/aurelia-hud/index.ts`
- `pax-fluxia/src/lib/aurelia-hud/aurelia-hud-theme.css`

Validation:

- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed before the handoff documentation update.
- Targeted `bun run --cwd pax-fluxia check` filtering found no diagnostics mentioning `aurelia-hud` or `dev/aurelia-hud`.
- Full `bun run --cwd pax-fluxia check` still exits `1` due the known repository baseline, currently `329 errors and 819 warnings in 64 files`.
- User asked to skip screenshot/visual QA and hand this off quickly.

Merge guidance:

- Keep this package isolated unless the merge target explicitly wants to replace the live HUD.
- If conflicts occur in `pax-fluxia/src/app.css`, preserve only one Tailwind import and keep `@source "./lib/aurelia-hud";`.
- If conflicts occur in `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`, the only intended live-HUD change is the added `Aurelia HUD` topbar chip.
- If production/offline/Tauri packaging is prioritized, self-host `Cinzel` and `Rajdhani` instead of relying on the Google Fonts import added for the dev route.
- Next real integration step is to replace demo `hud-state.svelte.ts` inputs with view models derived from current game state and route bridge callbacks to real game commands.

## 2026-06-12 Theme System Foundation

User directed the next work to proceed directly in UI toward a complete token set, theme system, and polished UI. User referenced `https://www.tarkui.com/` and `https://www.tailwind-variants.org/docs/introduction`.

Scope implemented in this step:

- Added `tailwind-variants` and required peer `tailwind-merge`.
- Added `pax-fluxia/src/lib/design-system/pax-theme.css` as the Pax-owned theme token layer.
- Added `pax-fluxia/src/lib/design-system/theme.ts` with theme ids, metadata, storage key, normalization helpers, and root theme application helper.
- Added `pax-fluxia/src/lib/design-system/variants/hud.ts` with initial Tailwind Variants recipes for HUD panels, buttons, and rails.
- Added `pax-fluxia/src/lib/design-system/index.ts` exports.
- Added Tailwind source scanning for `./lib/design-system` in `pax-fluxia/src/app.css`.
- Mapped existing legacy `--hud-*` variables in `pax-fluxia/src/app.css` to the new semantic `--pax-*` tokens so existing HUD CSS still works.
- Added live game-shell theme hook in `pax-fluxia/src/lib/components/game/GameContainer.svelte` using `data-pax-theme` and the stored `pax-ui-theme-id` value.

Intentional boundary:

- This is a foundation commit. It does not yet replace visible HUD components with Tailwind Variants recipes.
- It does not yet add an in-game theme switcher UI.
- It preserves current live-HUD visual behavior by using `--hud-*` compatibility aliases.

Validation:

- Initial build failed because `tailwind-variants` needs the `tailwind-merge` peer at bundle time.
- Installed `tailwind-merge`.
- `bun run --cwd pax-fluxia build`: passed after peer dependency install.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `bun run --cwd pax-fluxia check` filtering found no diagnostics mentioning `design-system`, `pax-theme`, `variants/hud`, `tailwind-variants`, `tailwind-merge`, or `GameContainer.svelte`.
- Full `bun run --cwd pax-fluxia check` remains blocked by the known repository baseline.

Merge guidance:

- Keep `pax-fluxia/src/lib/design-system/pax-theme.css` as the owner of theme values.
- Treat `--hud-*` in `app.css` as compatibility aliases, not the source of new theme work.
- New or refactored HUD components should consume `pax-fluxia/src/lib/design-system/variants/hud.ts` recipes instead of adding one-off class strings.
- Future visible work should add the in-game theme selector under Appearance and then migrate one HUD component at a time to the new recipes.

## 2026-06-12 In-Game Theme Selector

Scope implemented in this step:

- Added shared reactive theme state at `pax-fluxia/src/lib/design-system/themeState.svelte.ts`.
- Updated `pax-fluxia/src/lib/components/game/GameContainer.svelte` to read `paxThemeState.current` directly for `data-pax-theme`.
- Added `pax-fluxia/src/lib/components/game-hud/HudThemePanel.svelte`.
- Mounted `HudThemePanel` at the top of the Appearance settings panel in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.
- Exported `HudThemePanel` from `pax-fluxia/src/lib/components/game-hud/index.ts`.
- The panel supports selecting `Aurelia Drift` or `Cyber Flux`, persists through `pax-ui-theme-id`, updates the root document theme, and exports the active theme descriptor JSON.

Intentional boundary:

- This is a development-facing theme switcher, not the final Theme Library rewrite.
- It selects between hard-coded theme ids currently defined in `pax-theme.css` and `theme.ts`.
- It does not yet import arbitrary theme token JSON back into runtime.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `bun run --cwd pax-fluxia check` filtering found no diagnostics mentioning `HudThemePanel`, `themeState`, `design-system`, `pax-theme`, `GameSettingsPanel.svelte`, or `GameContainer.svelte`.
- Full `bun run --cwd pax-fluxia check` remains blocked by the known repository baseline.

Merge guidance:

- Keep `HudThemePanel` inside Appearance; do not move it to bottom quick access or the Theme Library surface.
- Keep `paxThemeState` as the single runtime source for UI skin selection.
- Future theme import/export should extend `theme.ts`/`themeState.svelte.ts`, not the older gameplay settings `themeStore`.

## 2026-06-12 First Tailwind Variants Primitive Migration

Scope implemented in this step:

- Updated `pax-fluxia/src/lib/components/game-hud/HudPanel.svelte` to consume `hudPanel` slots from `pax-fluxia/src/lib/design-system/variants/hud.ts`.
- Updated `pax-fluxia/src/lib/components/game-hud/HudIconButton.svelte` to consume the `hudButton` recipe.
- Preserved existing `pf-hud-panel`, `pf-hud-panel__*`, and `pf-hud-icon-button` compatibility classes to avoid a visual regression while moving ownership toward the design-system recipes.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `bun run --cwd pax-fluxia check` filtering found no diagnostics mentioning `HudPanel.svelte`, `HudIconButton.svelte`, `variants/hud`, `tailwind-variants`, or `design-system`.

Merge guidance:

- This is the intended migration pattern for the rest of the HUD: add variant recipes while retaining compatibility classes until the legacy `hud.css` rules can be safely reduced.
- Do not remove the `pf-*` classes from migrated primitives yet; downstream CSS still depends on them.

## 2026-06-12 Rail And Gamespeed Variant Migration

Scope implemented in this step:

- Updated `pax-fluxia/src/lib/components/game-hud/HudRail.svelte` to consume the `hudRail` recipe.
- Updated `pax-fluxia/src/lib/components/game-hud/GameSpeedPanel.svelte` to consume the `hudButton` recipe for repeated speed buttons.
- Preserved existing `pf-hud-rail`, `pf-hud-rail--*`, and `pf-game-speed__button` classes.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Targeted `bun run --cwd pax-fluxia check` filtering found no diagnostics mentioning `HudRail.svelte`, `GameSpeedPanel.svelte`, `variants/hud`, `tailwind-variants`, or `design-system`.

Merge guidance:

- The migration continues to be additive/compatibility-first. The visual polish layer in `hud.css` remains active until enough components are recipe-owned to reduce it safely.

## 2026-06-12 Svelte Inspector Dev Tool

User asked to add the Svelte inspector docs/tooling link without interrupting design work: `https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/inspector.md`.

Scope implemented in this step:

- Enabled Svelte Inspector through `pax-fluxia/svelte.config.js` with `vitePlugin.inspector: true`.
- Did not touch live HUD components, styles, routes, data contracts, or game logic.
- Did not add a permanent visible inspector toggle to the UI; the documented default key path keeps the tooling available during development without contaminating normal HUD visual review.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with Git line-ending warnings only.
- Full `check` was not rerun for this dev-tool-only change because the current repository baseline already has known unrelated failures.

Merge guidance:

- Preserve the top-level `vitePlugin.inspector` block in `pax-fluxia/svelte.config.js` if dev inspector access is desired.
- This is dev tooling only; the installed plugin type docs state inspector defaults off for production builds.

## 2026-06-12 HUD Primitive System Migration

User clarified that the work must be a systemic UI implementation, not one-off visual patching. User also asked whether Ark/Tark were actually being used and required a consistent component base for every HUD component.

Scope implemented in this step:

- Added Pax-owned HUD component primitives in `pax-fluxia/src/lib/design-system/components/`.
- Added primitive exports through `pax-fluxia/src/lib/design-system/components/index.ts` and `pax-fluxia/src/lib/design-system/index.ts`.
- Extended `pax-fluxia/src/lib/design-system/variants/hud.ts` with Tailwind Variants recipes for tooltip, segmented controls, fields, and range controls.
- Centralized Ark behavior inside primitives where behavior is needed:
  - `PaxHudIconButton.svelte` uses Ark Tooltip.
  - `PaxHudTooltip.svelte` wraps Ark Tooltip.
  - `PaxHudSegmentedControl.svelte` wraps Ark ToggleGroup.
- Migrated live HUD/settings surfaces to consume Pax primitives instead of raw controls or direct variant calls:
  - `pax-fluxia/src/lib/components/game-hud/HudPanel.svelte`
  - `pax-fluxia/src/lib/components/game-hud/HudIconButton.svelte`
  - `pax-fluxia/src/lib/components/game-hud/HudRail.svelte`
  - `pax-fluxia/src/lib/components/game-hud/GameSpeedPanel.svelte`
  - `pax-fluxia/src/lib/components/game-hud/BottomCommandBar.svelte`
  - `pax-fluxia/src/lib/components/game-hud/HudTopbar.svelte`
  - `pax-fluxia/src/lib/components/game-hud/PlayerStandingsPanel.svelte`
  - `pax-fluxia/src/lib/components/game-hud/SelectedStarTray.svelte`
  - `pax-fluxia/src/lib/components/game-hud/ThemeLibraryPanel.svelte`
  - `pax-fluxia/src/lib/components/game-hud/TypographyTokenPanel.svelte`
  - `pax-fluxia/src/lib/components/game-hud/HudThemePanel.svelte`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- Added `pax-fluxia/src/lib/styles/hud.css` support for the Theme Library row/delete primitive grouping.

New primitive files:

- `pax-fluxia/src/lib/design-system/components/PaxHudButton.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudIconButton.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudPanel.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudRail.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudRange.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudSegmentedControl.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudSelect.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudTextInput.svelte`
- `pax-fluxia/src/lib/design-system/components/PaxHudTooltip.svelte`

Ark/Tark implementation note:

- Ark is now used as an implementation dependency inside Pax primitives, not scattered in live HUD components.
- Tailwind Variants is the recipe layer.
- Tark UI is treated as the component-base/reference pattern for this codebase. No separate Tark package was added in this step; the project-owned equivalent is the `PaxHud*` primitive set backed by Ark and Tailwind Variants.

Validation:

- `bun run --cwd pax-fluxia build`: passed.
- `git diff --check`: passed with Git line-ending warnings only.
- Static audit command returned no matches:
  - `rg -n "<button|<select|<input|hudButton\(|hudPanel\(|hudRail\(|@ark-ui" pax-fluxia\src\lib\components\game-hud pax-fluxia\src\lib\components\ui\GameSettingsPanel.svelte -g "*.svelte" -g "*.ts"`
- Build output still includes known baseline unused-selector warnings in legacy tuning panels such as `ControlsSection-Battle.svelte`, `PerimeterFieldTuning.svelte`, and `PerimeterFieldDiagnosticsControls.svelte`; the new primitive migration did not introduce target-file build failures.

Merge guidance:

- Future live HUD controls should consume `PaxHud*` primitives first. Do not add raw `<button>`, `<select>`, or `<input>` controls directly to live HUD surfaces unless creating a new primitive.
- Keep Ark imports inside `pax-fluxia/src/lib/design-system/components/`; live HUD components should not import Ark directly.
- Keep Tailwind Variants recipes in `pax-fluxia/src/lib/design-system/variants/hud.ts`; live HUD components should not call `hudButton`, `hudPanel`, or `hudRail` directly.
- Keep existing `pf-*` compatibility classes until `pax-fluxia/src/lib/styles/hud.css` and remaining legacy scoped styles are intentionally reduced. Removing them now will regress current HUD styling.
- Continue the visual redesign through tokens and primitives. Do not resume isolated visual patches.

## 2026-06-12 Shared Settings Panel Grammar

User explicitly rejected one-off visual patching and required systemic implementation. The next systemic seam was `pax-fluxia/src/lib/components/ui/settings/panel-shared.css`, which is imported by the legacy settings/tuning components.

Scope implemented in this step:

- Reduced the dark midpoint strength in the theme border gradients at the token source:
  - `pax-fluxia/src/lib/design-system/pax-theme.css`
  - `--pax-border-panel-gradient`
  - `--pax-border-control-gradient`
- Rebuilt `pax-fluxia/src/lib/components/ui/settings/panel-shared.css` as a tokenized Aurelia Drift bridge for legacy settings panels.
- Converted the shared settings selectors to a `:global` block so Svelte does not emit false unused-selector warnings for every imported shared selector.
- Replaced legacy green/gray settings treatment with the HUD token hierarchy:
  - rounded corners through `--hud-radius-*` / `--pax-radius-*`
  - gold-to-dark control borders through `--hud-control-border-gradient`
  - `Rajdhani`/HUD UI font for labels
  - `JetBrains Mono`/HUD data font for numeric values
  - cyan active switch/range affordances
  - gold hover/active emphasis

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Build warnings remain only in existing local legacy selectors such as `ControlsSection-Territory.svelte` and `PerimeterFieldTuning.svelte`; the shared stylesheet false-positive warnings were removed by the global bridge.

Merge guidance:

- Preserve `panel-shared.css` as the temporary shared grammar for legacy settings panels until those panels are migrated to `PaxHud*` primitives.
- Do not reintroduce hard-coded `#4ade80`, generic gray borders, or local mixed fonts in settings panels; use `--hud-*`/`--pax-*` tokens.
- If conflicts occur in `pax-theme.css`, keep the reduced dark-alpha gradient stops unless master has a newer deliberate border-gradient system.

## 2026-06-12 Settings Drawer Primitive Migration

Scope implemented in this step:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsDrawer.svelte`.
- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsInfoRow.svelte`.
- Exported both through `pax-fluxia/src/lib/design-system/components/index.ts`.
- Updated `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` so these active Settings rail tool panes use design-system primitives instead of repeated local section-panel markup:
  - Theme Select / Library
  - Theme Tuning / Appearance
  - Stats
  - Hotkeys
  - Help
- Removed replaced local CSS hooks in `GameSettingsPanel.svelte`:
  - `.settings-tool-panel`
  - `.settings-stats-panel`
  - `.settings-stat-row`
  - `.settings-help-panel`

Why this matters for merge:

- The Settings rail is moving toward the requested master left-side component model through reusable primitives, not one-off styling.
- `PaxSettingsDrawer` now owns drawer shell, header, close affordance, scroll body, spacing, rounded border, and tokenized Aurelia Drift surface styling.
- `PaxSettingsInfoRow` now owns compact label/value row rhythm for Stats and Hotkeys.
- Existing content and state contracts were preserved; this step should be low-conflict unless master also rewrites the same `GameSettingsPanel.svelte` active-tool branch.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Static audit returned no matches for raw `<button>`, `<select>`, `<input>`, direct Ark imports, or direct `hudButton`/`hudPanel`/`hudRail` recipe calls in `pax-fluxia/src/lib/components/game-hud` and `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`.

Merge guidance:

- Keep `PaxSettingsDrawer` and `PaxSettingsInfoRow` as the owner for top-level Settings active tool panes.
- Continue migrating the remaining stacked section panels and tuning internals into this design-system layer.
- Do not re-add local `settings-tool-panel`/`settings-stat-row` style islands to `GameSettingsPanel.svelte`.

## 2026-06-12 Settings Range And Toggle Primitive Migration

Scope implemented in this step:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsRangeRow.svelte`.
- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsToggleRow.svelte`.
- Updated `pax-fluxia/src/lib/design-system/components/PaxHudRange.svelte` with disabled-state support.
- Exported the new components from `pax-fluxia/src/lib/design-system/components/index.ts`.
- Replaced `pax-fluxia/src/lib/components/ui/settings/SliderRow.svelte` raw range/nudge implementation with `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-AI.svelte` to `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Logging.svelte` to `PaxHudButton` and `PaxSettingsToggleRow`.

Why this matters for merge:

- Many older settings/tuning surfaces are still raw form controls. This step establishes reusable settings-row primitives so later migrations do not need to invent local checkbox/range/button styles.
- `SliderRow.svelte` remains available as a compatibility wrapper, so existing callers can inherit the new range styling when they use it.
- The behavior contracts are unchanged: AI values still update through `updatePanel` and `GAME_CONFIG`; Logging still writes `logFlags` and refreshes the section key.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no raw controls or direct Ark/recipe calls in the migrated target files.

Merge guidance:

- Prefer `PaxSettingsRangeRow` for numeric tuning values and `PaxSettingsToggleRow` for booleans in future settings work.
- Keep raw input elements inside the design-system primitive layer, not inside feature settings panels.
- Do not remove `SliderRow.svelte`; it is now a compatibility adapter for older tuning components.

## 2026-06-12 Perimeter Field Tuning Primitive Migration

Scope implemented in this step:

- Rebuilt `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte` around Pax primitives:
  - `PaxHudButton` for module scope and module chips
  - `PaxHudSelect` for transition engine
  - `PaxSettingsRangeRow` for numeric tuning values
  - `PaxSettingsToggleRow` for the freeze-base boolean
- Removed raw range/select/button/checkbox markup from that feature component.
- Removed obsolete local `.sub-heading` styling from that component.

Why this matters for merge:

- This removes a build warning source and demonstrates the intended migration pattern for the remaining larger settings/tuning files.
- The component still writes through `writeConfig(...)`, uses the same config keys/panel keys, and still calls `bumpTerritoryVisualConfig()`.
- If master has touched the same file, preserve the real settings data flow and keep the Pax primitive rendering path.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit returned no raw controls or stale local selector names in `PerimeterFieldTuning.svelte`.

Merge guidance:

- Keep this component primitive-owned; do not restore old `.var-row`/`.toggle-row`/`.module-chip` local markup.
- Remaining warning-heavy settings cleanup is now concentrated in `ControlsSection-Territory.svelte`.

## 2026-06-12 Territory Obsolete CSS Cleanup

Scope implemented in this step:

- Removed obsolete CSS-only selectors from `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`:
  - `.territory-card`
  - `.triple-select-row`
  - `.triple-select-col`
  - `.triple-label`
  - `.mode-btn`
  - `.grayed`
  - `.mini-btn.reference-only`
  - `.engine-control-group.reference-only`
- Preserved live selector groups that still have markup ownership:
  - `.territory-card__header`
  - `.territory-card__intro`
  - `.engine-control-group`
  - `.mini-btn`
  - `.mini-btn:hover`
  - `.mini-btn.active`
  - `.mini-btn:disabled`

Why this matters for merge:

- This is a dead-CSS cleanup only. It should not affect runtime behavior, settings data flow, or user controls.
- It clears the production build `css_unused_selector` warnings previously reported for this file after the shared settings grammar work.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Build output no longer reports `ControlsSection-Territory.svelte` or `PerimeterFieldTuning.svelte` unused-selector warnings.
- Targeted search found no stale removed selector names in `ControlsSection-Territory.svelte`.

Merge guidance:

- If master still has these dead selectors, prefer removing them.
- Do not remove the preserved live `.mini-btn` or `.engine-control-group` styles unless their markup is migrated to Pax primitives in the same change.

## 2026-06-12 Pixi Dev Import Optimization Fix

User reported this runtime log while trying to load the game shell:

```text
ERROR [LandingRoute] Game shell import failed (1/2) Error: Extension type environment already has a handler
    at Object.handle (Extensions.ts:328:19)
    at Object.handleByNamedList (Extensions.ts:385:21)
    at autoDetectEnvironment.ts:5:12
```

Scope implemented in this step:

- Updated `pax-fluxia/vite.config.js`.
- Added `pixi.js` to `optimizeDeps.include`.
- Removed stale `@colyseus/schema` from `optimizeDeps.include`.

Why this matters for merge:

- The reported stack is Pixi extension-registry setup during lazy game-shell import, before UI review can proceed.
- Prebundling `pixi.js` as one Vite optimized dependency reduces the chance that dev/HMR/lazy imports re-evaluate Pixi internals such as `autoDetectEnvironment`.
- `@colyseus/schema` is not imported by the client source and forced Vite optimization reported it as unresolved from `pax-fluxia`; removing it keeps the client optimize list accurate.

Validation:

- `bunx vite optimize --force` in `pax-fluxia/`: completed, listed `pixi.js`, and no longer reported `@colyseus/schema` resolution failure.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.

Merge guidance:

- Keep `pixi.js` in the client optimize include list unless master has a stronger Pixi import stabilization strategy.
- Do not re-add `@colyseus/schema` to the client optimize include list unless `pax-fluxia` directly imports it.
- Existing dev servers may need a restart or forced optimization for this to take effect.

## 2026-06-12 Category Theme Bar Primitive Migration

Scope implemented in this step:

- Added `pax-fluxia/src/lib/design-system/components/PaxHudFileButton.svelte`.
- Exported the file-button primitive from `pax-fluxia/src/lib/design-system/components/index.ts`.
- Rebuilt `pax-fluxia/src/lib/components/ui/settings/CategoryThemeBar.svelte` around Pax primitives:
  - `PaxHudSelect`
  - `PaxHudIconButton`
  - `PaxHudButton`
  - `PaxHudTextInput`
  - `PaxHudFileButton`
- Replaced raw `console.error` import failure reporting with `log.error`.
- Removed old raw-control styling for theme select/action buttons/save drawer/modal raw buttons.

Why this matters for merge:

- `CategoryThemeBar.svelte` is shared across many settings/tuning panels. This is a high-leverage migration away from repeated local control styling.
- Visible controls now go through the Pax primitive system; the only raw file input is encapsulated inside `PaxHudFileButton`.
- Category preset behavior should remain unchanged: select/apply, save/export, update/export, reset, import, star/unstar, delete, and modal close.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw visible controls, raw console error, `HudIcon`, or old raw-control class names in `CategoryThemeBar.svelte`.

Merge guidance:

- Keep file picker mechanics inside `PaxHudFileButton`; do not reintroduce hidden file inputs in shared feature panels.
- If merge conflicts occur in `CategoryThemeBar.svelte`, preserve behavior first, but keep visible control rendering on Pax primitives.

## 2026-06-12 Visuals Settings Primitive Migration

Scope implemented in this step:

- Rebuilt `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte` around Pax design-system primitives.
- Converted background thumbnails to `PaxHudButton`.
- Converted the lane-path segmented control to `PaxHudSegmentedControl`.
- Converted ranges/toggles/selects to `PaxSettingsRangeRow`, `PaxSettingsToggleRow`, and `PaxHudSelect`.
- Removed obsolete local raw-control styling for the old background grid buttons and lane-mode segmented buttons.

Why this matters for merge:

- Visuals is a high-traffic Appearance settings surface. It now follows the same tokenized button/select/range/toggle grammar as the Settings rail and shared category theme bar.
- Existing data flow is preserved. The component still writes to the same `GAME_CONFIG` keys, panel keys, `updateVisual(...)` paths, background-alpha event, and lane-constraint rebuild calls.
- This is not a gameplay/rendering semantic change; it is a component-ownership and visual-system migration.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw visible controls or obsolete local raw-control class names in `ControlsSection-Visuals.svelte`.
- Remaining build warnings are known baseline warnings outside this migrated file: `SpeedControls.svelte` state initialization, dynamic/static import chunking for `gameStore`, and large chunks.

Merge guidance:

- Preserve the helper functions that wrap existing config writes; they are the behavior compatibility layer for the visual-system migration.
- If conflicts occur, keep the primitive rendering path and compare only the values passed into the helper functions.
- Do not restore raw lane-mode buttons or raw background thumbnail buttons; use Pax primitives or add a new primitive if the interaction needs a different shape.

## 2026-06-12 Combat And Economy Settings Primitive Migration

Scope implemented in this step:

- Extended `pax-fluxia/src/lib/design-system/components/PaxSettingsRangeRow.svelte` with an optional `output` prop for custom value text.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Battle.svelte` to `PaxSettingsRangeRow`.
- Migrated `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Economy.svelte` to `PaxSettingsRangeRow`.

Why this matters for merge:

- Battle/Combat and Economy are compact high-use Settings sections and now share the same range row chrome, typography, spacing, and border treatment as the already migrated Visuals/AI/Perimeter surfaces.
- The `output` prop prevents feature panels from reintroducing local row markup when a value display differs from the raw numeric value.
- Data flow is unchanged: combat variables still use `CONFIG_TO_PANEL_KEY`, economy values still write the same `GAME_CONFIG` fields, transfer rate still uses the incoming callback, and Max Transfer still displays `unlimited` at zero.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old local row/control class names in the migrated Battle/Economy files.

Merge guidance:

- Keep the `PaxSettingsRangeRow.output` prop; later migrations will need the same capability for custom values such as `auto`, `off`, or derived unit text.
- If conflicts occur in Battle/Economy, preserve the existing config writes and favor the primitive-owned rendering path.

## 2026-06-12 Travel And Conquest Settings Primitive Migration

Scope implemented in this step:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Travel.svelte` around `PaxHudSelect`, `PaxSettingsRangeRow`, and `PaxSettingsToggleRow`.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Conquest.svelte` around the same primitives.
- Removed raw select/range/checkbox markup and old local row/control classes from both files.

Why this matters for merge:

- Travel and Conquest are larger user-facing tuning surfaces that previously preserved the legacy settings grammar. They now follow the shared Pax primitive system.
- Existing behavior is preserved. Values still write to the same `GAME_CONFIG` fields and call the same `updatePanel(...)` keys, including conditional Arrowhead and Oscillation sections.
- This is an intentional full-file primitive migration. If conflicts occur, compare behavior by config/panel key rather than trying to keep the old local markup.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls, inline styles, active class toggles, or old local row/control class names in the migrated Travel/Conquest files.

Merge guidance:

- Preserve the primitive rendering path and the conditional sections.
- Do not reintroduce local `.var-row`, `.toggle-row`, or `.mode-select` markup in these files.
- If master has newer config keys in these surfaces, port those keys into `PaxSettingsRangeRow`, `PaxSettingsToggleRow`, or `PaxHudSelect` rather than restoring raw controls.

## 2026-06-12 Audio Settings Primitive Migration

Scope implemented in this step:

- Added `pax-fluxia/src/lib/design-system/components/PaxSettingsPickerRow.svelte`.
- Exported the picker primitive and option type from `pax-fluxia/src/lib/design-system/components/index.ts`.
- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Audio.svelte` around Pax primitives.
- Removed Audio's feature-owned raw file-picker/dropdown, range inputs, checkbox toggles, offset rows, and test buttons.
- Picker chevrons and preview action now render through `HudIcon`, not text glyphs.

Why this matters for merge:

- Audio is a top-level Settings rail surface and previously remained one of the most visibly legacy settings panels.
- The new `PaxSettingsPickerRow` is reusable for compact option menus that need custom item metadata and optional preview/action buttons.
- Existing audio behavior is preserved:
  - master mute still goes through `audioManager.toggleMute()`
  - master volume still uses `audioManager.setMasterVolume(...)`
  - per-sound volume still uses `audioManager.setSoundVolume(...)`
  - file choice still uses `audioManager.setSoundFile(...)`
  - direct file preview still creates `new Audio('/sounds/...')`
  - offsets still use `audioManager.setSoundOffset(...)`
  - conquest subtype routing still uses `audioManager.setSeparateConquestSounds(...)`
  - panel sync still maps through `CONFIG_TO_PANEL_KEY`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Feature-level audit found no raw controls or legacy dropdown/control classes in `ControlsSection-Audio.svelte`.
- Picker primitive audit found no text-glyph arrows/play icons.

Merge guidance:

- Preserve `PaxSettingsPickerRow` as the owner for compact custom settings menus.
- If conflicts occur in Audio, preserve the audio-manager method calls and panel key mapping; then render through Pax primitives.
- Do not restore the old local `.file-picker`, `.setting-row`, `.test-btn`, or `.offset-row` control island.

## 2026-06-12 SpeedControls Primitive And Warning Cleanup

Scope implemented in this step:

- Migrated `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte` to render speed/start/pause controls through `PaxHudButton`.
- Removed direct `HudIcon` usage and raw local `<button>` controls from the component.
- Changed `currentSpeed` from `$state(speed || 1)` to a neutral initial value synchronized by effect, clearing Svelte's prop-state warning.

Why this matters for merge:

- `SpeedControls.svelte` is a live HUD component used in the mobile controls bar.
- The same build warning appeared in every production build after prior changes. This step removes that warning and continues component-base enforcement outside the newer desktop `game-hud` folder.

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Build output no longer reports `SpeedControls.svelte` or `state_referenced_locally`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old active-state classes in `SpeedControls.svelte`.

Merge guidance:

- Preserve the `PaxHudButton` path here. If mobile controls are redesigned later, reuse the Pax primitive layer instead of reintroducing local raw button skins.

## 2026-06-12 Timing Settings Primitive Migration

Scope implemented in this step:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Timing.svelte` around Pax primitives.
- Replaced raw timing ranges with `PaxSettingsRangeRow` and `PaxHudRange`.
- Replaced raw binding toggles with `PaxSettingsToggleRow`.
- Replaced P/R/A lock buttons with `PaxHudButton`.

Why this matters for merge:

- Timing is a top-level Settings category and previously retained local range/toggle/lock styling.
- Behavior is preserved:
  - tick interval still calls `updateTickInterval(...)`, updates panel state, and recalculates animation locks
  - animation speed still writes through `animationStore.setAnimationSpeed(...)` and `GAME_CONFIG.ANIMATION_SPEED_MS`
  - territory transition binding still writes `TERRITORY_TRANSITION_BIND_TO_TICK`
  - lock controls still call `pinValueToTickDuration(...)`, `lockRatioToTick(...)`, and `lockRatioToAnimSpeed(...)`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old timing row/toggle/lock class names in `ControlsSection-Timing.svelte`.

Merge guidance:

- Preserve the helper functions that isolate timing side effects.
- If conflicts occur, preserve behavior through the helper functions and keep the primitive-owned rendering path.

## 2026-06-12 Surge Settings Primitive Migration

Scope implemented in this step:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Surge.svelte` around `PaxSettingsRangeRow` and `PaxSettingsToggleRow`.
- Removed raw range inputs, checkbox toggles, and old local row/toggle classes from the component.

Why this matters for merge:

- Surge is a dense tuning surface that previously retained the old settings control grammar.
- Existing behavior is preserved:
  - attack surge fields still write their `GAME_CONFIG.ATTACK_SURGE_*` fields
  - pulse bind still writes `SURGE_PULSE_BIND_TO_TICK` and syncs duration to tick when enabled
  - orb merge and layer controls still write the same `ORB_*` fields and panel keys

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old row/toggle class names in `ControlsSection-Surge.svelte`.

Merge guidance:

- Preserve the primitive-owned rendering path and the `setPulseBindToTick(...)` helper if conflicts occur.

## 2026-06-12 Frontier FX Settings Primitive Migration

Scope implemented in this step:

- Rewrote `pax-fluxia/src/lib/components/ui/settings/ControlsSection-FrontierFx.svelte` around `PaxHudSelect`, `PaxSettingsRangeRow`, and `PaxSettingsToggleRow`.
- Removed raw select/range/checkbox markup and old local row/toggle class usage.
- Retokenized the Frontier FX explanatory card and unsupported-renderer note.

Why this matters for merge:

- Frontier FX is a contained territory visual-effects tuning surface and now follows the same Pax primitive pattern as the other migrated Settings sections.
- Existing behavior is preserved:
  - render-mode support check still limits controls to Phase Edges and Ember Lattice
  - mode descriptions still derive from `currentMode()`
  - all controls still write through `updateConfig(...)` to the same `TERRITORY_FRONTIER_FX_*` config keys and panel keys

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old row/toggle class names in `ControlsSection-FrontierFx.svelte`.

Merge guidance:

- Preserve the render-mode gate and `updateConfig(...)` helper.
- If master adds new Frontier FX controls, render them through Pax primitives rather than restoring raw controls.

## 2026-06-12 Small Settings Utility Primitive Batch

Scope implemented in this step:

- Added disabled-state support to `pax-fluxia/src/lib/design-system/components/PaxHudSelect.svelte`.
- Migrated these smaller utility components to Pax primitives:
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/SettingsDumpDiagnosticsControls.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/PerfScenarioRunner.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldDiagnosticsControls.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritorySlaWidget.svelte`

Why this matters for merge:

- These components were small but still visually inconsistent raw-control islands inside Settings and diagnostics surfaces.
- Existing behavior is preserved:
  - geometry source still writes `PERIMETER_FIELD_GEOMETRY_SOURCE` and bumps territory visual config
  - live settings dump still toggles/dumps through `settingsDump` utilities
  - perf scenario runner still disables mode changes while running and calls the same benchmark functions
  - perimeter diagnostics still writes debug config and clamps scrub frame indices
  - SLA widget still updates the passed config/panel keys through `onUpdate(...)`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- `git diff --check`: passed with Git line-ending warnings only.
- Targeted audit found no raw controls or old local control class names in the touched utility components.

Merge guidance:

- Preserve `PaxHudSelect.disabled`; it is now part of the primitive contract.
- If conflicts occur, keep the behavior-specific helper functions and render through Pax primitives.

## 2026-06-12 Players, Transition, And Topology Primitive Migration

Scope implemented in this step:

- Added reusable color-choice primitive:
  - `pax-fluxia/src/lib/design-system/components/PaxColorSwatchButton.svelte`
  - `pax-fluxia/src/lib/design-system/components/index.ts`
- Migrated player palette controls:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Players.svelte`
- Migrated territory transition controls:
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryTransitionTuning.svelte`
- Migrated territory topology controls:
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte`

Why this matters for merge:

- These panels previously retained local raw controls, local swatch buttons, lock buttons, raw selects, and corrupted degree glyph output.
- Existing behavior is preserved:
  - player palette still persists through `savePlayerPaletteSettings(...)` and applies through `activeGameStore.applyPlayerColors(...)`
  - selected player nudge still clamps through `clampPlayerHueNudge(...)`
  - transition lock buttons still call `pinValueToTickDuration(...)`, `lockRatioToTick(...)`, and `lockRatioToAnimSpeed(...)`
  - transition burst basis still writes `METABALL_BURST_BOUNDARY_BASIS`
  - topology sliders/toggles still call `queueTopologySliderUpdate(...)` or `queueTopologyToggleUpdate(...)`, preserving delayed `GAME_CONFIG` writes and `bumpTerritoryVisualConfig()`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw controls or old local control classes in the three migrated settings panels.

Merge guidance:

- Preserve `PaxColorSwatchButton`; it is now the correct primitive for dynamic color choices in Settings.
- If conflicts occur in these panels, preserve the existing helper/dataflow functions and render the surface through Pax primitives rather than restoring raw inputs/buttons/selects.

## 2026-06-12 Diagnostics Primitive Migration

Scope implemented in this step:

- Migrated diagnostics controls:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryEngineTraceDiagnostics.svelte`

Why this matters for merge:

- Diagnostics was one of the remaining Settings islands using raw checkboxes, range inputs, mini action buttons, and legacy row wrappers.
- Existing behavior is preserved:
  - overlay toggles still update `overlayConfig`
  - star inspector still uses `localStorage` key `pax-show-star-info` and dispatches `pax-star-info-toggle`
  - map transpose still mutates `mapTranspose.active` and dispatches resize
  - ruler toggles, clear, and H/S/L/A color controls still use `rulerTool`
  - transition recorder controls still call the same recorder, package, download, and clear functions
  - underlying geometry still writes `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY` and bumps territory visual config
  - territory engine trace step buttons still update `territoryEngineStepAdvanceToken`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw controls or old local row/toggle class names in the two migrated diagnostics components.

Merge guidance:

- Preserve the helper functions and primitive rendering path if conflicts occur.
- Do not restore `.mini-action-btn`, `.toggle-row`, raw range inputs, or old trace row wrappers in Diagnostics.

## 2026-06-12 Territory Surface Style Primitive Migration

Scope implemented in this step:

- Migrated territory style controls:
  - `pax-fluxia/src/lib/components/ui/settings/TerritorySurfaceStyleTuning.svelte`

Why this matters for merge:

- This file owns much of the visible territory fill/border/style tuning and previously retained raw range/select/toggle controls.
- Existing behavior is preserved:
  - all controls still write through the passed `onUpdate(configKey, panelKey, value)` contract
  - Cell Paint still writes `METABALL_GRID_CELL_*` and boundary-fill keys
  - Perimeter Placement still writes `PERIMETER_FIELD_INWARD_OFFSET_PX`
  - Border Paint still writes `METABALL_GRID_BORDER_*` and outer frontier border keys
  - Ember Lattice controls still respect the existing edit gates and write frontier geometry/junction keys
  - Finish controls still write blur and Chaikin config keys

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw controls or old local row/toggle class names in `TerritorySurfaceStyleTuning.svelte`.

Merge guidance:

- Preserve the shared primitive rendering path and local option arrays.
- If master changes add new style controls, add them through `PaxHudSelect`, `PaxSettingsRangeRow`, or `PaxSettingsToggleRow`.

## 2026-06-12 Theme Select Dropdown Primitive Migration

Scope implemented in this step:

- Replaced theme dropdown internals:
  - `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`

Why this matters for merge:

- This was the last small Settings-folder file using local raw buttons/listbox styling.
- Existing integration is preserved:
  - `GameThemeManager.svelte` still imports and passes the same public props
  - selected theme still resolves through `selectedThemeName`
  - theme application still calls `onSelectTheme(name)`
  - visible group labels remain hidden for current usage; group labels are only passed as option metadata if requested

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw controls in `ThemeSelectDropdown.svelte`.

Merge guidance:

- Preserve the wrapper around `PaxSettingsPickerRow`.
- If future theme-library work needs richer keyboard behavior or groups, add it to the shared picker primitive rather than restoring a local dropdown implementation.

## 2026-06-12 Metaball Grid Button Primitive Slice

Scope implemented in this step:

- Migrated button-only controls in:
  - `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`

Why this matters for merge:

- This is the first safe slice inside the large Metaball Grid tuning component.
- Existing behavior is preserved:
  - module visibility still uses `METABALL_GRID_MODULE_PANEL_KEY`
  - module visibility still writes through `setActiveModule(...)`
  - frontier presets still call `applyFrontierPreset(preset)`
  - preset active state still uses `isFrontierPresetSelected(preset)`

Validation:

- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Targeted audit found no raw buttons or old module/preset active classes in `MetaballGridTuning.svelte`.

Merge guidance:

- Preserve `PaxHudSegmentedControl` for module visibility and `PaxHudButton` for presets.
- Convert the remaining Metaball raw controls in smaller subsection commits.

## 2026-06-12 Metaball Grid Full Control Primitive Migration

Scope implemented in this step:

- Completed the control migration in:
  - `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`

Why this matters for merge:

- `MetaballGridTuning.svelte` was one of the largest remaining Settings files mixing raw Svelte controls, local select/range styling, inline styles, and Pax primitives.
- This step moves its visible interactive controls to the shared Pax primitive/token system:
  - `PaxHudSelect`
  - `PaxSettingsRangeRow`
  - `PaxSettingsToggleRow`
  - prior `PaxHudSegmentedControl`
  - prior `PaxHudButton`
- Existing render/tuning behavior is preserved:
  - module visibility still uses `METABALL_GRID_MODULE_PANEL_KEY`
  - all controls still write through existing `writeConfig(configKey, panelKey, value)`
  - grid controls still write `METABALL_GRID_*` spacing/density/origin/distribution/jitter/max-cell keys
  - Phase Field controls still write `METABALL_GRID_CELL_*`, border, finish-tail, and frontier-highlight keys
  - Frontier controls still write `TERRITORY_FRONTIER_*` keys
  - Wave/Flip controls still write `METABALL_GRID_ADJACENCY`, `METABALL_GRID_WAVE_*`, and `METABALL_GRID_FLIP_*` keys
  - stats/readout surface remains a readout and was not converted into fake controls

Validation:

- `rg -n "<button|<select|<input|style=|class:active|class:is-active" pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`: no matches.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve the local option arrays added near the top of `MetaballGridTuning.svelte`; they are the intended single source for select labels in this component.
- If master has added new Metaball controls, render them through Pax primitives rather than restoring raw `<input>`, `<select>`, or local button/listbox skins.
- Keep the existing helper functions and `writeConfig(...)` paths authoritative; this was a UI-system migration, not a territory rendering logic change.
- The remaining raw-control migration work should now focus on `ControlsSection-Ships.svelte` and `ControlsSection-Territory.svelte`.

## 2026-06-12 Ships Size/Shape Primitive Migration

Scope implemented in this step:

- Began migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- Ships is now the largest remaining raw Settings file.
- This slice adds the local helper pattern that later Ships subsections should reuse:
  - `writePanelConfig(panelKey, configKey, value)`
  - `setStarSystemScale(newScale)`
- The Star System Scale control still preserves its cascade:
  - `STAR_RENDER_RADIUS`
  - `STAR_RING_RADIUS`
  - `ORBIT_BASE_RADIUS`
  - `DAMAGED_ORBIT_RADIUS`
  - `STAR_ICON_SCALE`
  - `STAR_LABEL_*`
  - `STAR_HIT_RADIUS`
- Ship Size/Shape controls now render through `PaxSettingsRangeRow` and `PaxSettingsToggleRow` instead of raw range/checkbox markup.

Validation:

- Ships raw-control audit count reduced from `115` to `107`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve `setStarSystemScale(...)`; do not inline that cascade back into markup.
- Continue converting `ControlsSection-Ships.svelte` by visible subsection and keep all config key writes explicit.
- If master has changed these specific controls, keep the shared primitive rendering and preserve the config cascade behavior.

## 2026-06-12 Ships Star Halos Primitive Migration

Scope implemented in this step:

- Continued migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- Star Halos had raw toggles, sliders, a local preset button, a local two-button mode group, and an inline style hook.
- It now uses:
  - `PaxSettingsToggleRow`
  - `PaxSettingsRangeRow`
  - `PaxHudButton`
  - `PaxHudSegmentedControl`
- Existing behavior is preserved:
  - `applyGlowDominantOwnershipPreset()` still applies the same experimental preset updates.
  - `SHOW_STAR_POWER`, `STAR_POWER_*`, `HALO_FLEET_*` config writes remain explicit.
  - fleet mode remains gated by `panel.haloFleetScale` and still switches between `stepped` and `linear`.

Validation:

- Ships raw-control audit count reduced from `107` to `89`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve `HALO_FLEET_MODE_OPTIONS` and the segmented control for fleet mode.
- If merge conflicts occur, keep `applyGlowDominantOwnershipPreset()` as the behavior owner and keep the UI on Pax primitives.

## 2026-06-12 Ships Orbit Layout Primitive Migration

Scope implemented in this step:

- Continued migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- Orbit Layout is now on `PaxSettingsRangeRow` for simple range controls.
- Existing behavior is preserved:
  - `ORBIT_BASE_RADIUS`
  - `SHIP_BASE_SIZE`
  - `ORBIT_RING_MULT`
  - `ORBIT_DENSITY`
  - `MAX_VISUAL_SHIPS`
  - `STAR_RENDER_RADIUS`

Validation:

- Ships raw-control audit count reduced from `89` to `83`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Keep Orbit Layout controls on `PaxSettingsRangeRow`.
- Preserve the direct config key writes through `writePanelConfig(...)`.

## 2026-06-12 Ships Star Shape And Ownership Ring Primitive Migration

Scope implemented in this step:

- Continued migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- Star Shape and Ownership Ring were still using raw range inputs, local mode buttons, inline style, and active-class state.
- They now use shared Pax primitives:
  - `PaxHudSegmentedControl`
  - `PaxSettingsRangeRow`
- Existing behavior is preserved:
  - `STAR_SHAPE_MODE`
  - `STAR_ICON_SCALE`
  - `STAR_CORNER_RADIUS`
  - `STAR_RING_RADIUS`
  - `STAR_RING_OFFSET`
  - `STAR_RING_WIDTH`
  - `STAR_RING_ALPHA`
  - `STAR_RING_SATURATION`
  - `STAR_RING_LIGHTNESS`

Validation:

- Ships raw-control audit count reduced from `83` to `70`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve `STAR_SHAPE_MODE_OPTIONS` and the segmented control for Star Shape mode.
- Keep Ownership Ring ranges on `PaxSettingsRangeRow`.
- If master has added new star-shape or ownership-ring controls, wire them through Pax primitives and keep config writes explicit through `writePanelConfig(...)`.

## 2026-06-12 Ships Star Labels Primitive Migration

Scope implemented in this step:

- Continued migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- Star Labels was the largest remaining local raw-control block in Ships.
- It now uses:
  - `PaxHudSegmentedControl`
  - `PaxSettingsRangeRow`
  - `PaxSettingsToggleRow`
- Existing behavior is preserved:
  - label layout still writes `STAR_LABEL_LAYOUT`
  - label color mode still writes `STAR_LABEL_COLOR_MODE`
  - universal color mode still writes `STAR_LABEL_UNIVERSAL_H/S/L/A`
  - label geometry and typography still write `STAR_LABEL_*` keys
  - leash still writes `STAR_LABEL_LEASH`
  - `setStarLabelScale(newScale)` preserves the previous scale cascade into ID font, active font, damaged font, and vertical line-height config values

Validation:

- Ships raw-control audit count reduced from `70` to `35`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve `setStarLabelScale(...)`; do not re-inline the cascade into markup.
- Preserve `STAR_LABEL_LAYOUT_OPTIONS` and `STAR_LABEL_COLOR_MODE_OPTIONS`.
- If master has changed star-label settings, keep the shared Pax primitive rendering and keep all existing `STAR_LABEL_*` config keys explicit.

## 2026-06-12 Ships Remaining Controls Primitive Migration

Scope implemented in this step:

- Completed the remaining raw-control migration in:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`

Why this matters for merge:

- `ControlsSection-Ships.svelte` now has no raw visible controls, inline style attributes, or local active-class toggles.
- The final migrated clusters are:
  - Order Arrows
  - Damaged Ships
  - Interaction
  - Density Coloring
  - Star Glow
- Existing behavior is preserved:
  - `ARROW_*` keys still drive arrow geometry, VFX, force scaling, dash, and outline behavior
  - `DAMAGED_ORBIT_RADIUS`, `DAMAGED_ORBIT_EVADE`, and `DAMAGED_SHIP_SCALE` still drive damaged ship rendering
  - `STAR_HIT_RADIUS` still drives the interaction hit zone
  - `DENSITY_*` variables still render from `DENSITY_VARIABLES` and `DENSITY_PANEL_MAP`
  - `STAR_GLOW_*` keys still drive star glow

Validation:

- Targeted audit for `ControlsSection-Ships.svelte`: no matches for `<button>`, `<select>`, `<input>`, `style=`, `class:active`, or `class:is-active`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Keep all Ships controls on Pax primitives.
- Preserve `getArrowOutlineTone()` and `setArrowOutlineTone(...)` for mapping UI tone labels to numeric outline colors.
- If master has added new Ships controls, do not restore raw HTML controls; add them through `PaxSettingsRangeRow`, `PaxSettingsToggleRow`, `PaxHudSegmentedControl`, `PaxHudSelect`, or another Pax primitive.

## 2026-06-12 Toggle Row Callback Alias Fix

Scope implemented in this step:

- Fixed primitive callback compatibility in:
  - `pax-fluxia/src/lib/design-system/components/PaxSettingsToggleRow.svelte`
- Added post-mortem:
  - `.agent/docs/project/post-mortems/2026-06-12_pax-settings-toggle-row-callback-alias.md`

Why this matters for merge:

- Several migrated Ships toggles use `onToggle`.
- Existing older toggle rows use `onChange`.
- The primitive now accepts and invokes both optional callbacks, so both migrated and older call sites are functional.

Merge guidance:

- Preserve both callback names unless all call sites are intentionally normalized in one follow-up change.
- Do not treat the post-mortem as optional; it documents a real runtime mismatch found during the migration.

## 2026-06-12 Territory Navigation Primitive Migration

Scope implemented in this step:

- Began migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

Why this matters for merge:

- Territory is now the only remaining settings file with raw visible controls.
- This slice migrates the visible navigation/control shell first:
  - system module visibility
  - renderer module visibility
  - render-mode selector
  - deprecated-mode action buttons
  - reference transition selector
- Existing behavior is preserved:
  - render modes still route through `selectTerritoryStyle(...)`
  - transition mode still writes `VS_TRANSITION_MODE` and `vsTransitionMode` through `debouncedConfigUpdate(...)`
  - active module state still writes `territorySystemModuleVisibility` and `territoryRendererModuleVisibility`

Validation:

- Territory raw-control/style audit count reduced from `79` to `56`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve the option-builder functions added near the top of `ControlsSection-Territory.svelte`.
- Continue deeper Territory tuning migration through Pax primitives rather than restoring local `axis-btn`, `mode-select`, or inline style controls.

## 2026-06-12 Territory Metaball CPU Grid Primitive Migration

Scope implemented in this step:

- Continued migrating:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

Why this matters for merge:

- The Metaball CPU-grid core controls now use Pax primitives instead of local raw range/select/toggle markup.
- Migrated controls preserve existing config writes for:
  - `METABALL_CELL_SIZE`
  - `METABALL_INFLUENCE_RADIUS`
  - `METABALL_FALLOFF`
  - `METABALL_THRESHOLD`
  - `METABALL_FILL_FOLLOWS_GEOM`
  - `METABALL_STRENGTH_MULT`
  - `METABALL_COVERAGE`
  - `METABALL_BLEND_SHARPNESS`
- A missing `<TerritorySurfaceStyleTuning>` tag in the Metaball section was restored; before this slice, that section contained orphaned props and the shared surface-style controls were not rendered at that location.

Validation:

- Territory raw-control/style audit count reduced from `56` to `47`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Keep the Metaball core controls on `PaxSettingsRangeRow`, `PaxHudSelect`, and `PaxSettingsToggleRow`.
- Preserve `metaballFalloffSelectOptions()` unless a broader select-option adapter replaces it.
- Preserve the restored `TerritorySurfaceStyleTuning` tag; do not leave shorthand props as inert markup.

## 2026-06-12 Territory Remaining Controls Primitive Migration

Scope implemented in this step:

- Completed the raw-control migration in:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

Why this matters for merge:

- `ControlsSection-Territory.svelte` now has no raw visible controls, inline style attributes, or local active-class toggles by the targeted audit.
- The completed migration covers:
  - Metaball Combat/Fleet Pressure
  - Frontier Topology
  - Engine Surface shape/motion
  - runtime fill/border controls
  - remaining helper-copy inline style hooks
- Existing behavior is preserved:
  - Metaball combat keys still write through `debouncedConfigUpdate(...)`
  - topology keys still write through `queueTopologySliderUpdate(...)` / `queueTopologyToggleUpdate(...)`
  - Engine Surface shape/motion controls still write through `updatePanel(...)` or `debouncedConfigUpdate(...)`
  - runtime fill/border controls still write the existing `VORONOI_*` and `NEUTRAL_TERRITORY_TRANSPARENT` keys

Validation:

- Targeted audit for `ControlsSection-Territory.svelte`: no matches for `<button>`, `<select>`, `<input>`, `style=`, `class:active`, or `class:is-active`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Do not reintroduce local raw controls in Territory; add new controls through Pax primitives.
- Preserve the new helper option builders for morph easing and boundary mode.
- The disabled legacy Fill/Borders block is still disabled, but its raw controls were converted so file-level audits stay clean; if that block is removed later, verify no config surface is being restored through it.

## 2026-06-12 Settings Accent Ownership Cleanup

Scope implemented in this step:

- Updated:
  - `pax-fluxia/src/lib/design-system/components/PaxHudButton.svelte`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

Why this matters for merge:

- `GameSettingsPanel.svelte` no longer uses inline `--accent` styles for tool buttons or section panels.
- `PaxHudButton` now accepts `accentId` and forwards it as `data-accent-id`, giving settings/HUD callers a typed way to bind fixed accent variants without inline styles.
- Existing colors are preserved through the local settings accent selector map.

Validation:

- Targeted audit for `GameSettingsPanel.svelte`: no matches for `style=`, `<button>`, `<select>`, `<input>`, `class:active`, or `class:is-active`.
- `git diff --check`: passed with Git line-ending warnings only.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`; existing large-chunk warnings remain.

Merge guidance:

- Preserve the `accentId` prop on `PaxHudButton`; it is now part of the design-system primitive API.
- If section/tool colors are later centralized into theme tokens, update the selector map rather than restoring inline styles.

## 2026-06-12 Local HUD Font Packaging

Scope implemented in this step:

- Added local packaged font files in:
  - `pax-fluxia/static/fonts/hud/`
- Updated:
  - `pax-fluxia/src/app.css`
  - `pax-fluxia/src/routes/+page.svelte`
  - `pax-fluxia/src/routes/play/+page.svelte`
  - `pax-fluxia/src/routes/map-editor/+page.svelte`
  - `pax-fluxia/src/routes/dev/ui-test/+page.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`

Why this matters for merge:

- The HUD typography system now packages its active font families locally instead of depending on Google-hosted CSS/font downloads.
- The existing token contracts remain intact:
  - `--font-display`
  - `--font-data`
  - `--font-body`
  - `--font-pasti`
  - `--hud-font-*`
  - `--pax-font-*`
- Route entry points no longer add their own hosted font links, so typography ownership stays in `app.css` and the design-system/theme files.
- `ControlsSection-Territory.svelte` no longer carries raw-control-era unused selector families after the primitive migration.

Validation:

- Static hosted-font audit returned no matches for `@import url`, `fonts.googleapis`, `fonts.gstatic`, or `preconnect` in `pax-fluxia/src` and `pax-fluxia/static`.
- Static Territory cleanup audit returned no matches for the removed raw-control selector families.
- `bun run --cwd pax-fluxia build`: passed with exit code `0`.
- Previous Territory unused-selector warnings are gone.
- Existing non-blocking build warnings remain: large chunks, dynamic/static import duplication for `gameStore.svelte.ts`, and unused `Room` import in `multiplayerStore.svelte.ts`.

Merge guidance:

- Do not restore Google Fonts `<link>` tags or `@import` rules in route heads.
- Keep font loading centralized in `pax-fluxia/src/app.css` unless a later theme loader intentionally changes font ownership.
- Preserve the local font files under `static/fonts/hud`; they are part of packaging readiness, not disposable generated artifacts.
- If adding new font tokens, package the font files locally first and wire them through the token layer rather than loading from a CDN.
