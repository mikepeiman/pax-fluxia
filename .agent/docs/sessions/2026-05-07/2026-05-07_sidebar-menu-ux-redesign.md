# 2026-05-07 Sidebar Menu UX Redesign

## Problem
The right-sidebar in-game menu had drifted into a poor hybrid of developer utility UI and player-facing UI:
- theme management was visually clumsy
- action controls were rendered as three cramped cards
- the whole block read like an admin panel, not a game menu

## Design Direction
- Preserve the existing game visual language.
- Use standard action-row UX for save/load/session controls.
- Keep the menu dense enough for a strategy game, but not fragmented into equal-weight mini panels.
- Hide technical theme-routing metadata in the player-facing menu variant.

## Changed Surfaces
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`

## Verification Status
- Build verified.
- Visual verification pending user review.

