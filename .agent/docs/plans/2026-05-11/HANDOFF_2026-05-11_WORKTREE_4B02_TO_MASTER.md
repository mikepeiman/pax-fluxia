Merge note:
- Source worktree: `4b02`
- Current branch: detached `HEAD`
- Continuation of the 2026-05-10 HUD refinement work

# Merge Handoff - 2026-05-11 Worktree `4b02`

## Purpose

Produce a manual UI code guide so future HUD and settings work can be done from the correct files and ownership boundaries without re-auditing the entire codebase.

## Immediate Artifacts

- `.agent/docs/sessions/2026-05-11/2026-05-11_UI_CODE_GUIDE_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_UI_RECOVERY_PLAN_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_Session_worktree-4b02.md`
- `.agent/docs/sessions/2026-05-11/2026-05-11_Chat_worktree-4b02.md`

## Documented Scope

1. HUD shell ownership in `GameContainer.svelte`
2. Topbar structure in `GameHudTopBar.svelte`
3. Settings ribbon and section registry in `GameSettingsPanel.svelte` and `settingsRegistry.ts`
4. Theme selection and theme library flow in `GameThemeManager.svelte`, `ThemeSelectDropdown.svelte`, and `themeStore.svelte.ts`
5. Leaderboard collapsed/expanded behavior in `Leaderboard.svelte`
6. Gamespeed and Star View ownership in `SpeedControls.svelte` and `StarNav.svelte`
7. Shared state and math dependencies in `activeGameStore.svelte.ts`, `selectedStarStore.svelte.ts`, `game.config.ts`, `common/src/config.ts`, and `common/src/types.ts`

## Notes

- This was a documentation-only pass. No gameplay or UI source code changed.
- The guide includes render-path ranges, style-path ranges, data dependencies, and safe edit starting points for manual work.
- A follow-up recovery plan now exists for the whole HUD surface after structural and design failures were identified in the earlier implementation pass.

## Additional Delivered Work

After the documentation and recovery-planning work, the 2026-05-11 pass continued into a full in-game HUD style/layout/composition implementation.

### Source Changes

- `pax-fluxia/src/app.css`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameHudTopBar.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
- `pax-fluxia/src/lib/components/ui/hud/HudIcon.svelte`
- `pax-fluxia/src/lib/components/ui/hud/index.ts`
- `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`
- `pax-fluxia/src/lib/components/ui/hud/SpeedControls.svelte`
- `pax-fluxia/src/lib/components/ui/hud/StarNav.svelte`
- `pax-fluxia/src/lib/components/ui/hud/StatusBar.svelte`

### Delivered HUD Changes

1. Shared visual system
   - Added HUD tokens for fonts, shell colors, borders, radii, spacing, shadows, and icon stroke sizing.
   - Added one reusable SVG HUD icon component and migrated touched HUD surfaces to it.

2. Master layout
   - Moved the in-game topbar inside the master `game-layout`.
   - Stabilized grid ownership around topbar, canvas, controls, right rail, and quick-access dock areas.
   - Added leaderboard collapse state and topbar badge/toggle behavior.

3. Surface redesign
   - Restyled the settings ribbon, search/theme utility area, and theme library shell.
   - Rebuilt leaderboard chrome and typography hierarchy.
   - Rebuilt gamespeed and Star View presentation to remove browser-default fieldset styling and align them as one tactical family.
   - Moved visible quick-access controls into a bottom dock strip using the unified icon/button treatment.
   - Restyled the mobile status bar to the same HUD system.

### Verification

- `bun run build` succeeded after the redesign.
- There are still pre-existing unused-selector warnings in deeper settings subcomponents; this pass did not resolve those legacy warnings.
- No browser automation was available in-session, so final screenshot-based visual QA remains a required follow-up before merge.

### Known Follow-up

- Delete the hidden legacy `sidebar-global-actions` branch from `GameContainer.svelte` in a later cleanup pass.
- Do a browser-verified polish pass for spacing, overflow, and visual balance at desktop target widths.
- Handle Star View semantics separately from this visual-system pass.

## Recommended Next Use

When the next manual HUD/UI edit starts, open the guide first and follow its file order:

1. `GameContainer.svelte`
2. target leaf component
3. relevant store/config section
4. guide's safe-edit and high-risk notes
