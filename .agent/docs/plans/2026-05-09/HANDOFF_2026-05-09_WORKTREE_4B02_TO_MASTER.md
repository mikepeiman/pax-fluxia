Merge note:
- Source worktree: `4b02`
- Current branch: detached `HEAD`
- Continuation of the 2026-05-08 HUD/menu/settings redesign handoff

# Merge Handoff - 2026-05-09 Worktree `4b02`

## Purpose

Continue the accepted in-game UI redesign without losing the reasoning trail between the interpretation pass and the implementation pass.

## Continuation Context

The accepted design direction from 2026-05-08 remains:

1. theme selection should move into the settings utility header
2. settings categories should become a left-side vertical rail
3. leaderboard should become the primary anchor in the right sidebar
4. gamespeed and star-view should sit below the leaderboard
5. star-view should gain more hierarchy
6. leaderboard should gain a small active-ships vs total-ships emphasis toggle
7. lower menu chrome should be simplified and redundant widgets removed

## 2026-05-09 Status

- user approved the proposed direction
- user asked whether any additional planning round or extra resources are needed
- current conclusion: no extra planning round is required to start implementation

## Optional But Non-Blocking Inputs

Helpful if provided, but not required:

- a preference on whether the lower menu remains as a visible list or becomes fully flattened into the right rail
- any must-keep interaction that is not visible in the screenshots
- any visual hard constraint around mobile behavior for this pass

## Immediate Next Step

Proceed into implementation directly, keeping edits focused on:

- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/hud/Leaderboard.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`

## Implementation Summary

- `GameContainer.svelte`
  - reordered the right rail so `Commanders` leads, `Gamespeed` and `Star View` sit directly below, and the lower action list is visually demoted
  - removed the separate lower theme widget and mobile drawer theme block
  - replaced the lower `MENU` accordion feel with a static `Actions / Low-frequency` section
  - rewired the top theme shortcut to open the integrated settings theme area
- `GameSettingsPanel.svelte`
  - embedded the theme manager into the settings utility header
  - converted the category launcher from a wide icon grid into a labeled vertical rail
  - added an empty-state content panel so the rail and search/header can stand as a coherent shell
- `GameThemeManager.svelte`
  - added a compact `utility` variant for the new header-integrated placement
- `Leaderboard.svelte`
  - rebuilt rows into an aligned stat grid
  - added `Active` / `Total` emphasis toggle and persisted preference
- `StarNav.svelte`
  - increased visual weight and readability to better support its new placement below gamespeed

## Verification Summary

- Build:
  - `bun run build` succeeded in `pax-fluxia/`
- Browser:
  - production preview `http://127.0.0.1:4174/play` verified successfully
  - opened the game, launched into a local match, opened settings, and verified the updated sidebar/settings composition
  - confirmed that the theme quick action now routes into the integrated settings theme area

## Caveat

- Dev-server `/play` validation is currently unreliable because Vite dev prebundling fails on:
  - `Failed to resolve dependency: @colyseus/schema`
- In browser this presented as a blank white page on `http://127.0.0.1:4173/play`
- The production preview build does render correctly, so the redesign itself appears sound
