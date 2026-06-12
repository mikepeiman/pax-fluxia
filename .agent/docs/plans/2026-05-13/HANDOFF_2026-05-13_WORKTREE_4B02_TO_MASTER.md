Merge note:
- Source worktree: `4b02`
- Current branch: detached `HEAD`
- Base commit: `6ec60edf8e400e50a108cec4b866af50cea72d1e`
- Base commit subject: `fix: restore edge mode world perimeter defaults`
- This document supersedes the earlier dated handoffs as the actual merge brief for master intake.
- Updated after the later 2026-05-13 HUD implementation pass; this worktree is no longer docs-only.

# Master Merge Handoff - Worktree `4b02` - 2026-05-13

## Purpose

The user asked for a redesign of the in-game HUD and settings surface as one coherent system: better layout, clearer hierarchy, cleaner theme handling, stronger leaderboard and tactical grouping, dock/collapse behavior, and a more disciplined visual language.

This handoff is written to help a master-branch agent merge or salvage this work with minimal confusion. It documents what actually changed, where merge risk is high, which parts are still disputed by the user, and which docs to trust.

## Executive Merge Guidance

Do not blindly merge this worktree into `master` as if it were a ship-ready UI win.

Current truth:

- the client build passes
- the HUD source delta is large
- the user explicitly rejected major parts of the resulting UI quality and UX
- several earlier handoff notes contain claims that were later invalidated by direct user feedback
- a later implementation pass improved the topbar, right rail, Star View shell, quick access placement, selected-star command tray, and icon consistency, but that later pass has not yet been user-reviewed

Practical recommendation:

1. Treat this worktree as a WIP salvage branch, not as a ready-to-land polished HUD.
2. Merge selectively and manually, not by wholesale overwrite of the largest files.
3. Prefer harvesting the structural groundwork and documentation, then re-driving the actual visual finish with live verification.

## 2026-05-13 Later Implementation Delta

This later pass was made after the concise mockup-synthesis plan. It is not docs-only.

Primary changed files and merge-relevant ranges:

- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `GameContainer.svelte:455` selected-star command-tray derived state.
- `GameContainer.svelte:677` game layout instance with topbar inside the grid and dock classes.
- `GameContainer.svelte:739` contextual selected-star command tray markup.
- `GameContainer.svelte:891` right tactical rail markup.
- `GameContainer.svelte:943` tactical overview markup.
- `GameContainer.svelte:966` right-rail quick-access icon strip and drawer toggle.
- `GameContainer.svelte:1415` master game grid CSS and left/right dock variants.
- `GameContainer.svelte:1911` selected-star command tray CSS.
- `GameContainer.svelte:2157` compact right-rail leaderboard overrides.
- `GameContainer.svelte:2204` compact right-rail Star View overrides.
- `GameContainer.svelte:2248` tactical overview and right-rail quick access CSS.
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
- `GameHudTopBar.svelte:64` topbar match/timer/sector/player/selected-star metadata derivation.
- `GameHudTopBar.svelte:77` KPI derivation.
- `GameHudTopBar.svelte:118` topbar structure: brand, metadata, mode chips, KPI/actions.
- `GameHudTopBar.svelte:220` full topbar shell/style system.
- `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`
- `StarNav.svelte:46` normalized star label helper.
- `StarNav.svelte:89` selected/displayed star detail derivation.
- `StarNav.svelte:139` rebuilt Star View card markup.
- `StarNav.svelte:203` identity, owner/type, active/damaged ships.
- `StarNav.svelte:249` production/repair/transfer/activation rate row.
- `StarNav.svelte:276` route pressure strip.
- `StarNav.svelte:310` Star View style system.
- `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`
- Added `more` icon for the compact quick-access drawer.
- `pax-fluxia/src/lib/components/ui/StarNav.svelte`
- Fixed the legacy wrapper to store `$props()` at top level before spreading into `hud/StarNav.svelte`.

Behavioral intent of this pass:

- Keep combat-value redesign out of scope.
- Remove Star View attack/defense force presentation from the HUD shell.
- Keep Star View wired to `selectedStarStore` and owned-star cycling.
- Default settings dock to the left and tactical rail to the right.
- Keep quick access unlabeled, icon-only, and on the right rail bottom.
- Preserve save/load/restart/quit controls behind the quick-access drawer rather than deleting them.
- Use local CSS overrides to compact leaderboard and Star View only within the right rail.
- Remove the stale hidden duplicate quick-access/global-actions markup that still contained corrupted glyph icons.

Verification from this later pass:

- `bun run --cwd pax-fluxia build` passes.
- `bun run --cwd pax-fluxia check` still fails on unrelated existing baseline issues across the repo; targeted filtering showed no diagnostics in the touched HUD files.
- Local Chrome smoke QA was run against `http://127.0.0.1:5175`.
- Screenshot artifact: `.agent/docs/session/2026-05-13/hud-redesign-smoke-1600x900.png`.

Known merge caveats from this later pass:

- The right rail now uses an internal scroll area for gamespeed plus Star View at shorter heights; tactical overview is hidden below `960px` viewport height.
- The selected-star command tray appears after a star is selected through the existing map selection path.
- The older hidden right-rail quick-access/global-action markup was removed after the initial implementation pass; the visible right-rail quick-access strip is now the single desktop quick-access source in this file.
- The user has not yet reviewed this implementation pass, so visual acceptance is still unknown.

## Shipping Truth

### What is objectively true

- `bun run build` succeeds in `pax-fluxia/` as of 2026-05-13.
- The source delta is concentrated in the in-game HUD, settings shell, theme manager, leaderboard, gamespeed, Star View, and new shared HUD tokens/icon registry.
- The worktree also adds a large documentation trail from 2026-05-08 through 2026-05-13.

### What is not true

- This work is not fully user-accepted.
- The handoff should not describe the whole worktree as docs-only.
- The earlier "validated successfully" framing is not sufficient after the user directly reported major runtime and design failures.

### User-reported unresolved problems that must be taken seriously

These are not cosmetic preferences. They are master-handoff-critical status notes:

- the visual language is inconsistent across fonts, colors, icons, labels, and shell treatments
- Star View presentation was called out as severely poor
- Star View semantics were questioned and some values were wrong or duplicated
- the user reported that selected/active star state was not correctly reflected in Star View
- the theme area grouping was criticized, including unrelated actions living near theme controls
- extra labels such as `Actions`, `Low-frequency`, and `Quick Tools` were explicitly rejected
- quick-access icons were reported as corrupted or sloppy
- the previous topbar/layout shell implementation was reported broken
- the settings collapse UX was reported missing or inadequate

Later edits addressed some of these structurally, but the user has not accepted the end result. Master should therefore assume this branch still needs follow-up before being considered done.

## Chronology From Worktree Genesis

### 2026-05-08

Intent-definition day.

- captured annotated screenshot requirements
- identified key ownership split:
  - `GameContainer.svelte` owns overall right-rail composition
  - `GameSettingsPanel.svelte` owns searchable settings shell and category launcher
  - `GameThemeManager.svelte` owned a separate lower theme widget
  - `Leaderboard.svelte` already rendered player metrics but lacked the requested emphasis toggle
- no product code changes yet

Trust level:

- useful for original intent only

### 2026-05-09

First implementation pass.

Implemented direction:

- theme selection moved into the settings utility header
- settings launcher changed toward a left-side vertical rail
- right sidebar reordered so leaderboard anchored above gamespeed and Star View
- lower menu chrome simplified
- theme quick action rewired to the integrated theme area

Trust level:

- partial
- this pass did change source, but later user feedback overruled the idea that the resulting UI quality was acceptable

### 2026-05-10

Second implementation pass from the user sketch.

Implemented direction:

- leaderboard collapse state
- dock-side persistence
- settings ribbon compact/expanded behavior
- bottom quick-access strip
- flat, scrollable theme library
- Star View expansion and metric additions

Trust level:

- low for polish and UX correctness
- several later user complaints were directly about this stage of the work

### 2026-05-11

Two things happened:

1. documentation and recovery-planning work
2. a broad style/layout/composition redesign across the HUD files

This was the largest source delta day and introduced:

- shared HUD tokens in `app.css`
- new `HudIcon.svelte`
- topbar moved inside the master game layout
- broader shell restyling across settings, theme manager, leaderboard, gamespeed, Star View, and status bar

Trust level:

- mixed
- it contains useful structural groundwork, but it did not achieve user acceptance

### 2026-05-13

Documentation day, then handoff correction day.

- refreshed the code guide
- reformatted the guide for relative path plus `filename:line`
- initially produced an inadequate handoff
- this document corrects that failure and is the handoff that should actually be used

## Source Delta Overview

Tracked source files modified:

1. `pax-fluxia/src/app.css`
2. `pax-fluxia/src/lib/components/game/GameContainer.svelte`
3. `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
4. `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
5. `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
6. `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`
7. `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte`
8. `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`
9. `pax-fluxia/src/lib/components/ui/hud/StatusBar.svelte`
10. `pax-fluxia/src/lib/components/ui/hud/index.ts`
11. `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
12. `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

New untracked source file:

13. `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`

Tracked source diff totals:

- 12 tracked files changed
- `+2767 / -1568` across tracked source files

Per-file diff totals from `git diff --numstat`:

- `pax-fluxia/src/app.css` -> `+59 / -1`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte` -> `+580 / -228`
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte` -> `+244 / -236`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` -> `+437 / -128`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte` -> `+338 / -381`
- `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte` -> `+446 / -238`
- `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte` -> `+77 / -77`
- `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte` -> `+399 / -77`
- `pax-fluxia/src/lib/components/ui/hud/StatusBar.svelte` -> `+92 / -117`
- `pax-fluxia/src/lib/components/ui/hud/index.ts` -> `+1 / -0`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte` -> `+63 / -54`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts` -> `+31 / -31`

## File-By-File Merge Brief

### 1. `pax-fluxia/src/app.css`

- diff size: `+59 / -1`
- merge risk: medium
- reason:
  - this is the new shared HUD token layer
  - it affects global visual language rather than one isolated widget

Primary additions:

- HUD design tokens beginning near line `40`
- HUD font utility classes near lines `187-193`

Useful salvage:

- the token foundation is a real structural improvement if master wants a single HUD shell vocabulary

Merge caution:

- because these are global variables/classes, compare against any other `app.css` changes on master before taking wholesale

### 2. `pax-fluxia/src/lib/components/game/GameContainer.svelte`

- diff size: `+580 / -228`
- merge risk: very high
- reason:
  - this file is the master shell owner
  - it now mixes docking state, collapse behavior, topbar mounting, quick-access placement, and large CSS changes

Current important sections for merge:

- dock/collapse state block near `85-186`
- theme shortcut routing near `534-542`
- master layout render beginning near `629`
- topbar mount near `635`
- settings mount near `734`
- desktop leaderboard/gamespeed/Star View grouping near `763-789`
- quick-access dock markup near `966`
- master CSS grid and dock styling from roughly `1297` through the file end

What changed:

- topbar moved into the master grid
- controls/right-rail docking and collapse state added
- quick-access controls moved into a bottom dock strip
- leaderboard/tactical stacking and mobile/desktop layout ownership changed

Known problems / caveats:

- this is one of the most likely conflict files
- earlier user feedback directly criticized layout breakage and collapse UX in this surface
- the stale hidden `sidebar-global-actions` and old `area-quick-access` branch were removed during the final cleanup pass

Merge advice:

- manual merge only
- do not overwrite master wholesale
- port the shell ideas intentionally, then verify every render region in browser

### 3. `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`

- diff size: `+244 / -236`
- merge risk: high

Current important sections:

- props at `8-19`
- topbar root render near `61`
- styles begin near `159`

What changed:

- topbar was rebuilt to act as the HUD spine
- territory mode shortcuts and compact stats/player summary were reorganized
- global icon cluster changed significantly

Merge caution:

- the user explicitly called out topbar structural issues earlier in the work
- merge it only in coordination with `GameContainer.svelte`

### 4. `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

- diff size: `+437 / -128`
- merge risk: very high

Current important sections:

- props near `763-779`
- search logic around `911-1052`
- root settings shell render near `1110`
- utility header and search region around `1131-1265`
- theme anchor around `1302-1303`
- icon ribbon and empty state around `1307-1365`
- CSS-heavy ribbon/shell styling from around `1600` onward

What changed:

- settings shell reworked into a ribbon/command area model
- theme manager embedded into the shell header area
- icon launcher shifted toward ribbon behavior
- heavy shell CSS rewrite

Known problems / caveats:

- this file still owns a lot of old and new behavior at once
- user feedback explicitly criticized clutter, extra labels, and grouping mistakes in this general surface
- build still reports many pre-existing unused CSS selectors in this file

Merge advice:

- highest-friction merge candidate besides `GameContainer.svelte`
- reconcile behavior and styling carefully rather than taking line-for-line

### 5. `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`

- diff size: `+338 / -381`
- merge risk: high

Current important sections:

- props `variant` near `12-16`
- newest-first `libraryThemes` sort near `33-41`
- action handlers around `98-143`
- root render near `169`
- library list around `289-324`
- styles from `330` onward

What changed:

- added integrated utility-shell usage
- flattened and compacted theme library presentation
- newest-first list ordering
- scrollable/truncated list behavior

Known problems / caveats:

- the user explicitly rejected `Load Map` living near theme controls
- if master already evolved theme behavior separately, expect conflicts in both structure and intent

Merge advice:

- preserve newest-first and compact list ideas if useful
- scrutinize any utility-row grouping before landing

### 6. `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`

- diff size: `+446 / -238`
- merge risk: high

Current important sections:

- props near `7-21`
- derived values around `69-100`
- root render near `103`
- header/controls around `104-157`
- summary/tick around `160-181`
- column row and list rows around `183-228`
- styles from `231` onward

What changed:

- collapsed badge mode added
- active vs total emphasis toggle added
- typography and row structure rebuilt
- right-rail summary/header composition changed

Known problems / caveats:

- the user later reported mixed fonts and broken overlap in the leaderboard title/subtitle areas
- do not assume this file is visually resolved

Merge advice:

- keep the structural intent in mind
- re-check typography and overflow after merge

### 7. `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte`

- diff size: `+77 / -77`
- merge risk: medium

Current important sections:

- props near `5-16`
- root near `55`
- styles from `86` onward

What changed:

- compact tactical-family restyle
- button layout and chrome refresh

Merge advice:

- lower risk than the shell files
- still visually tied to Star View, so verify adjacent composition after merge

### 8. `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`

- diff size: `+399 / -77`
- merge risk: very high

Current important sections:

- props near `8-13`
- type info around `21-29`
- attack/defense derivation helpers around `42-66`
- selected-star preference around `74-78`
- displayed star and details around `99-124`
- root render near `143`
- summary and metric cards around `209-249`
- styles from `257` onward

What changed:

- visual shell rebuilt
- selected-star preference added before owned-star fallback
- expanded type/metric presentation
- fit icon behavior changed

Known problems / caveats:

- this file is the most disputed by the user
- the user reported severe visual failure here
- the user also challenged the semantics and correctness of displayed values
- later analysis confirmed the old UI-side defense math had a duplicate multiplier error

Merge advice:

- do not merge this file blindly
- if master wants only style/layout work, salvage shell/padding/icon ideas carefully
- if master wants semantics too, re-drive Star View from scratch against authoritative gameplay wiring

### 9. `pax-fluxia/src/lib/components/ui/hud/StatusBar.svelte`

- diff size: `+92 / -117`
- merge risk: medium

What changed:

- mobile status bar restyled to align with the broader HUD system

Merge caution:

- desktop work dominates this branch; mobile polish was not a primary validation target

### 10. `pax-fluxia/src/lib/components/ui/hud/index.ts`

- diff size: `+1 / -0`
- merge risk: low

What changed:

- exports the new `HudIcon` component

### 11. `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`

- diff size: `+63 / -54`
- merge risk: medium

What changed:

- single-line truncation and compact presentation
- group-label suppression support
- styling changes to fit the new theme shell

Merge advice:

- relatively contained
- worth taking with the theme manager if master wants the compact library treatment

### 12. `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

- diff size: `+31 / -31`
- merge risk: low to medium

What changed:

- settings section metadata/icon adjustments to support the ribbon redesign and unified icon naming

### 13. `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte` (new file)

- new untracked source file
- current guide anchor: `HudIcon.svelte:15`
- merge risk: low to medium

What it provides:

- one centralized HUD SVG icon registry

This is one of the more salvageable pieces of the branch.

## Documentation Files Added In This Worktree

These are untracked in the current worktree but useful context for master:

### 2026-05-08

- `.agent/docs/plans/2026-05-08/FEATURE_AND_TASK_QUEUE_2026-05-08.md`
- `.agent/docs/plans/2026-05-08/HANDOFF_2026-05-08_WORKTREE_4B02_TO_MASTER.md`
- `.agent/docs/sessions/2026-05-08/2026-05-08_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-08/2026-05-08_Chat_worktree-4b02.md`

### 2026-05-09

- `.agent/docs/plans/2026-05-09/FEATURE_AND_TASK_QUEUE_2026-05-09.md`
- `.agent/docs/plans/2026-05-09/HANDOFF_2026-05-09_WORKTREE_4B02_TO_MASTER.md`
- `.agent/docs/sessions/2026-05-09/2026-05-09_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-09/2026-05-09_Chat_worktree-4b02.md`

### 2026-05-10

- `.agent/docs/plans/2026-05-10/FEATURE_AND_TASK_QUEUE_2026-05-10.md`
- `.agent/docs/plans/2026-05-10/HANDOFF_2026-05-10_WORKTREE_4B02_TO_MASTER.md`
- `.agent/docs/sessions/2026-05-10/2026-05-10_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-10/2026-05-10_Chat_worktree-4b02.md`

### 2026-05-11

- `.agent/docs/plans/2026-05-11/FEATURE_AND_TASK_QUEUE_2026-05-11.md`
- `.agent/docs/plans/2026-05-11/HANDOFF_2026-05-11_WORKTREE_4B02_TO_MASTER.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_Chat_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_UI_CODE_GUIDE_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_UI_RECOVERY_PLAN_worktree-4b02.md`

### 2026-05-13

- `.agent/docs/plans/2026-05-13/FEATURE_AND_TASK_QUEUE_2026-05-13.md`
- `.agent/docs/plans/2026-05-13/HANDOFF_2026-05-13_WORKTREE_4B02_TO_MASTER.md`
- `.agent/docs/sessions/2026-05-13/2026-05-13_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-13/2026-05-13_Chat_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-13/2026-05-13_UI_CODE_GUIDE_worktree-4b02.md`

## Which Docs To Trust

Trust these most:

- this handoff document
- `.agent/docs/sessions/2026-05-13/2026-05-13_UI_CODE_GUIDE_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_UI_RECOVERY_PLAN_worktree-4b02.md`

Use these as chronology, not as acceptance proof:

- earlier 2026-05-09 and 2026-05-10 handoff notes
- any earlier notes that imply the user was satisfied with the resulting UI

Reason:

- the user later reported direct runtime/design failures that supersede those earlier optimistic claims

## Verification Status

### Confirmed

- `bun run build` succeeded on 2026-05-13

### Not confirmed by current handoff authoring pass

- browser-verified visual correctness of the latest HUD state
- user acceptance of the current visual system
- correctness of all Star View presented meanings

### Known build noise

- many pre-existing Svelte unused-selector warnings remain in settings subcomponents
- large chunk-size warnings remain
- neither of those warnings is specific proof that the HUD redesign is good or bad; they are just current build context

## Suggested Merge Strategy For Master

### If master wants minimal-conflict salvage

Take first:

1. `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`
2. `pax-fluxia/src/lib/components/ui/hud/index.ts`
3. selected token additions from `pax-fluxia/src/app.css`
4. selected compact-list behavior from `ThemeSelectDropdown.svelte`
5. selected newest-first library behavior from `GameThemeManager.svelte`

Then decide whether to re-drive the major shell files manually.

### If master wants to continue this redesign directly

Use this order:

1. `GameContainer.svelte`
2. `GameHudTopBar.svelte`
3. `GameSettingsPanel.svelte`
4. `GameThemeManager.svelte`
5. `settingsRegistry.ts`
6. `ThemeSelectDropdown.svelte`
7. `Leaderboard.svelte`
8. `SpeedControls.svelte`
9. `StarNav.svelte`
10. `StatusBar.svelte`
11. `app.css`
12. `HudIcon.svelte`

Then immediately run:

1. `bun run build`
2. browser/manual playtest in the in-game HUD
3. visual regression check of:
   - topbar
   - settings collapse/open behavior
   - theme shell
   - leaderboard title/header
   - Star View
   - quick-access icons

### If master wants ship-ready UI quality

Do not land this as-is.

Instead:

1. use this worktree for structure and context
2. keep the user's negative feedback in front of the implementation
3. rebuild/polish the disputed surfaces live in browser before merge

## Master Agent Checklist

- compare master against the 13 source files listed above
- do not miss the new untracked `HudIcon.svelte`
- assume the earlier handoff notes are incomplete
- treat user criticism as ground truth over prior agent self-reporting
- verify Star View, theme grouping, quick-access icons, and collapse UX manually
- remove or clean up any leftover rejected labels if they still exist in the merged result

## Final Reality Statement

This worktree contains real structural HUD redesign work and real reusable groundwork, but it does not contain a cleanly accepted final UI. The correct master posture is careful manual intake, not blind merge.
