Merge note:
- Source worktree: `4b02`
- Current branch: detached `HEAD`
- Continuation of the 2026-05-09 in-game HUD redesign pass

# Merge Handoff - 2026-05-10 Worktree `4b02`

## Purpose

Apply the user’s hand-sketched refinement pass to the in-game HUD so the right-side control cluster becomes more compact, collapsible, and spatially flexible without losing the stronger hierarchy introduced on 2026-05-09.

## Continuation Context

The previous pass already moved:

1. theme selection into the settings utility header
2. settings categories into a left-side vertical rail
3. leaderboard above gamespeed and star-view
4. low-frequency actions into a simplified lower block

The 2026-05-10 sketch now pushes that structure further:

1. leaderboard should collapse into a compact player badge
2. star-view should show meaningful star/combat data and remove clutter
3. topbar global icons should move back to a bottom-right strip
4. theme library should become compact, scrollable, and ordered newest-first
5. settings rail should support horizontal compact/expanded states and vertical collapse
6. controls and leaderboard columns should be dockable left or right

## Immediate Edit Targets

- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
- `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`
- `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`

## Implemented

1. `GameContainer.svelte`
   - added persisted dock preferences for controls and leaderboard/right rail
   - added persisted compact/expanded settings ribbon state
   - made sidebar/settings resize math follow dock side
   - simplified the topbar to a single tuning toggle
   - moved global quick tools into a bottom-right strip
   - added grid-area layout variants for left/right docking
2. `GameHudTopBar.svelte`
   - removed the old cluster of global icon buttons
   - kept territory mode shortcuts and replaced the right cluster with a tuning shell button
3. `GameSettingsPanel.svelte`
   - converted the section rail into a compact/expanded ribbon
   - added dock-side and ribbon-width controls in the header and ribbon
   - kept the settings utility header as the location for integrated theme controls
4. `GameThemeManager.svelte`
   - replaced grouped browse chips with a flat scrollable newest-first list
   - preserved apply/update/add/import/export actions
   - tightened text overflow handling for compact display
5. `ThemeSelectDropdown.svelte`
   - hid visible group labels
   - switched option text to single-line ellipsis truncation
6. `Leaderboard.svelte`
   - added collapsed badge mode with featured player info
   - preserved expand state and active/total emphasis toggle
   - added leaderboard dock-side toggle control
7. `StarNav.svelte`
   - removed PID/debug text and owned-count badge
   - replaced `Fit` text with a fit icon button
   - added type display, active/damaged counts, normalized attack/defense force, and outgoing/incoming pressure rows

## Validation

- `bun run build` succeeded on 2026-05-10.
- No browser automation tool was available in this Codex session, so visual runtime verification still needs a manual playtest in the normal local/browser workflow.

## Remaining Follow-up

1. Confirm the hidden legacy `Settings` / `Diagnostics` action-list items are acceptable, or remove them from markup in a later cleanup pass.
2. Do a live visual pass for spacing and icon readability, especially the new bottom quick-tool strip and collapsed leaderboard badge.
3. If desired, extend the same left/right docking controls to mobile or tablet breakpoints instead of desktop-only persistence.
