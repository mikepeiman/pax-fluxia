# Feature And Task Queue - 2026-05-11

## Active Work

### Manual UI Code Guide
- Produce a manual code guide for the current game HUD and in-game settings UI.
- Identify the relevant components, stores, config sources, and render/style ownership.
- Map parent/child relationships and the main data flow for leaderboard, settings, theme management, gamespeed, star view, and docking behavior.
- Call out the key code locations and ranges so future manual UI work can start from the correct files and blocks.

### HUD Recovery And Redesign Correction
- Convert the current HUD/settings pass into a whole-surface recovery plan rather than isolated fixes.
- Correct architectural issues in the master game layout, topbar ownership, settings collapse model, star selection wiring, theme utility grouping, quick-access icon treatment, leaderboard hierarchy, and star-view semantics.
- Rebuild the execution plan around:
  - one master grid shell
  - coherent interaction semantics
  - disciplined typography/iconography
  - authoritative or clearly-labeled data presentation
  - browser-verified visual QA before calling the UI improved

### In-Game HUD Visual-System Implementation
- Implement the style/layout/composition-only redesign for the in-game HUD as one coherent visual system.
- Replace ad hoc fonts, glyph icons, and panel chrome with shared HUD tokens and one SVG icon language.
- Move the in-game topbar inside the master grid and stabilize named areas for topbar, canvas, controls, leaderboard/tactical rail, and quick-access dock.
- Redesign settings/theme, leaderboard, gamespeed, star view, and quick-access surfaces around one shell grammar and one type hierarchy.
- Keep combat/data semantics largely out of scope for this pass except for the minimum wiring needed to improve visual placement and selected-star responsiveness.

## Completed In This Pass
- Added shared HUD tokens in `pax-fluxia/src/app.css`.
- Added `HudIcon.svelte` and exported it from `pax-fluxia/src/lib/components/ui/hud/index.ts`.
- Rebuilt `GameHudTopBar.svelte` into a grid-owned HUD topbar with leaderboard/settings collapse affordances.
- Refactored `GameContainer.svelte` to mount the topbar inside `game-layout`, add the bottom quick-access dock, and restyle the game-side shell.
- Restyled `GameSettingsPanel.svelte`, `GameThemeManager.svelte`, and `ThemeSelectDropdown.svelte` into a unified settings/theme command surface.
- Rebuilt `Leaderboard.svelte`, `SpeedControls.svelte`, `StarNav.svelte`, and `StatusBar.svelte` to match the new iconography and HUD shell language.
- Updated `settingsRegistry.ts` to use the HUD icon registry instead of mixed emoji/glyph icon tokens.
- Verified `bun run build` succeeded after the redesign.

## Primary Artifacts
- UI code guide: `.agent/docs/sessions/2026-05-11/2026-05-11_UI_CODE_GUIDE_worktree-4b02.md`
- UI recovery plan: `.agent/docs/sessions/2026-05-11/2026-05-11_UI_RECOVERY_PLAN_worktree-4b02.md`
- Chat log: `.agent/docs/sessions/2026-05-11/2026-05-11_Chat_worktree-4b02.md`
- Session notes: `.agent/docs/sessions/2026-05-11/2026-05-11_Session_worktree-4b02.md`
- Merge handoff: `.agent/docs/plans/2026-05-11/HANDOFF_2026-05-11_WORKTREE_4B02_TO_MASTER.md`
