# HUD Redesign Merge Handoff - Worktree 4b02 - 2026-05-23

## Branch And Commits

- Branch: `codex/ui-hud-development`
- Earlier plan commit: `371cecdb0 docs: record full hud redesign implementation plan`
- Earlier implementation commit: `ca9e7b5ab ui: implement Aurelia Drift live HUD redesign`
- Current pending commit: corrective implementation after user rejection of the first UI result.

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

`pax-fluxia/src/lib/styles/hud.css`

- Lines near `840-1396`: main Aurelia Drift corrective layer.
- Key areas: cut-corner panel shells, topbar player summary, aligned Player Standings, compact Star View, selected-star tray, icon-only quick access, and full Theme Library styling.
- Merge risk: this is a broad global HUD stylesheet. If master has touched HUD panel styling, compare selectors under `.pf-*`, `.area-right`, `.pf-theme-library*`, and `.pf-settings-ribbon`.

### New Theme Library Surface

`pax-fluxia/src/lib/components/game-hud/ThemeLibraryPanel.svelte`

- Lines `11-19`: newest-first theme ordering by `created` timestamp, with safe fallback.
- Lines `30-37`: short date formatter.
- Lines `39-88`: apply/save/update/delete/export/import actions wired to `themeStore`.
- Lines `91-193`: compact Theme Library UI.
- Lines `169-193`: scrollable list rows; category metadata is intentionally hidden. User themes can show dates and delete action; built-in/core rows no longer print `CORE`.

`pax-fluxia/src/lib/components/game-hud/index.ts`

- Exports `ThemeLibraryPanel`.

### Settings Panel Correction

`pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

- Line `89`: imports `ThemeLibraryPanel` instead of old `GameThemeManager`.
- Lines `750-760`: adds `onSectionActivityChange` prop.
- Lines `868-873`: reports whether any settings section is open.
- Lines `1101-1219`: settings header, search/config import/export, and new theme utility placement.
- Line `1219`: mounts `<ThemeLibraryPanel />`.
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
- `bun run --cwd pax-fluxia check`: failed on repository baseline with `329 errors and 820 warnings in 65 files`.

Browser/CDP QA against `http://127.0.0.1:1499`:

- Started a real local match from the main menu.
- Closed an audio modal left over from earlier browser state.
- Opened settings from the topbar.
- Verified Theme Library appears inside settings, has `overflow-y: auto`, has `clientHeight 145`, `scrollHeight 2935`, is newest-first, and no longer renders `CORE`/category rows.
- Verified `Load Map` is not present within the Theme Library/text window.
- Verified no visible `Quick Tools`, `Actions`, `Low-frequency`, `Settings Ribbon`, or `Choose a system to tune`.
- Selected a real map star through Chrome input events; topbar changed from `SELECTED None` to `SELECTED Star 5`, Star View showed `Star 5`, and selected-star tray showed `Star 5`.
- Checked 1280x720 and 1920x1080: topbar, right rail, Player Standings, Game Speed, Star View, tray, and quick-access dock had no measured outside-viewport overflow.

## Known Risks

- The Pixi map renderer remains much less rich than the Aurelia Drift reference images. This commit improves the DOM HUD/settings shell, not the underlying territory/starfield rendering.
- `GameContainer.svelte` still owns the master grid and canvas/HUD composition. A true `HudShell.svelte` wrapper was not completed in this corrective pass because doing that safely would require a larger canvas/overlay ownership split.
- `svelte-check` remains blocked by repository-wide baseline errors unrelated to this pass. Touched files still inherit some existing unused-CSS warnings in extracted settings components.
- The old main menu still has a global `Load Map` command. This is intentionally not removed; the user rejection targeted `Load Map` inside the Theme widget/cluster.

## Merge Strategy

- Merge the current corrective commit after visual review, not the earlier implementation commit alone.
- If conflicts occur in `GameContainer.svelte`, preserve the dynamic settings width model and `onSectionActivityChange` path; otherwise the settings ribbon will regress to a wide empty slab.
- If conflicts occur in `GameSettingsPanel.svelte`, preserve the `ThemeLibraryPanel` replacement, removal of empty explanatory state, and rail-only shell classes.
- If conflicts occur in `hud.css`, keep the lower corrective layer unless master has a newer, deliberate Aurelia Drift HUD shell that supersedes it.
