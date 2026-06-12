Merge note:
- Source worktree: `4b02`
- Current branch: detached `HEAD`
- Merge intent: improve the in-game HUD/menu/settings information hierarchy and menu coherence while preserving playfield readability and minimizing shared-choke-point edits

# Merge Handoff - 2026-05-08 Worktree `4b02`

## Purpose

The user wants the current in-game right-side HUD/menu/settings surface to feel more deliberate and coherent.

The immediate asks from the annotated screenshots are:

1. unify theme selection into a single top-level widget instead of splitting it across separate areas
2. convert the current icon cluster into a left-side vertical action rail
3. move gamespeed and star-view below the leaderboard and strengthen star-view hierarchy
4. fix leaderboard alignment and add a small dominant-metric toggle between active ships and total ships
5. remove redundant lower-surface controls, especially the second theme widget and `menu` toggle

This handoff starts at the requirements-interpretation stage so a future merge agent can see the intended UI direction even before implementation lands.

## Source State And Merge Posture

Current truth at task start:

- no code changes yet
- docs created first so the worktree can be handed back cleanly later
- expected primary surface ownership is `ui-hud`, with possible related menu/settings touches if the current implementation is split

Working rule for future merge:

- prefer changes inside `pax-fluxia/src/lib/components/ui/hud/`
- avoid `GameCanvas.svelte`, `GameSettingsPanel.svelte`, and `themeStore.svelte.ts` unless a boundary crossing is truly required
- if implementation must cross a shared choke point, keep the change mechanical and explain why in this document

## Current UI Direction

The intended direction is not "add more panels."
It is to make the existing surface feel like one coherent command rail with a clear top-to-bottom priority stack:

1. search plus theme selection at the top
2. high-frequency action/navigation rail as a distinct vertical surface
3. commander/leaderboard intelligence as the dense informational anchor
4. secondary controls such as gamespeed and star-view grouped nearby instead of floating above
5. lower menu trimmed down so it only contains true low-frequency actions

## Structural Findings From Audit

Current implementation split:

- `GameContainer.svelte` owns right-rail composition
- `GameSettingsPanel.svelte` owns searchable settings header, import/export utilities, icon-toolbar category launcher, and section bodies
- `GameThemeManager.svelte` is mounted separately inside the lower in-game menu
- `GameHudTopBar.svelte` already exposes a theme shortcut and current theme label

Meaning:

- the user's request is not only a restyle
- it is partly a layout reorder in `GameContainer.svelte`
- and partly a consolidation of theme/settings entry points across `GameSettingsPanel.svelte` and `GameThemeManager.svelte`

Leaderboard-specific finding:

- `Leaderboard.svelte` already computes and renders total ships and active/damaged breakdowns
- it sorts by total ships only
- it does not currently expose a presentation toggle between active-ships-first and total-ships-first

Settings-panel finding:

- the current icon-toolbar is a responsive grid that becomes denser when sections are open
- the requested left-side vertical action menu likely requires structural changes in the settings panel, not only CSS edits

## Likely Affected Paths

- `pax-fluxia/src/lib/components/ui/hud/`
- possibly related menu/settings ownership paths discovered during audit

## Validation Expectations

Before this work is considered merge-ready:

1. `bun run build` in `pax-fluxia/`
2. in-game HUD smoke test on the affected surface
3. screenshot evidence for the redesigned menu/HUD layout
4. explicit note of any shared choke points touched

## Status Log

### 2026-05-08 Initial setup

- loaded project protocol and UI skill docs
- created today's queue, chat log, session notes, and this handoff file
- captured the user's screenshot-derived requirements and the intended visual direction
- audited the existing HUD/menu implementation and mapped ownership:
  - right sidebar composition in `GameContainer.svelte`
  - searchable settings surface in `GameSettingsPanel.svelte`
  - separate theme widget in `GameThemeManager.svelte`
  - leaderboard metrics in `hud/Leaderboard.svelte`
- next step: propose the concrete UI interpretation to the user, then implement the approved direction with the smallest boundary crossings possible
