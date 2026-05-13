# 2026-05-07 Attached Menu Panels And Confirmations

## Problem
The menu action panels still opened after the action stack, which visually detached them from the triggering controls. Restart and delete actions also fired with insufficient confirmation.

## Design Direction
- Open controls directly below the initiating button.
- Let the menu column expand naturally instead of using detached utility drawers.
- Keep confirmation behavior explicit on destructive actions.
- Unify timing to 200ms across the touched surfaces.

## Changed Surfaces
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`

## Verification Status
- Build verified.
- Audience test verified.
- Visual verification pending user review.

