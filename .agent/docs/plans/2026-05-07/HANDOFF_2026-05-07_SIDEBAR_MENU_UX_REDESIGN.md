# Handoff - 2026-05-07 Sidebar Menu UX Redesign

## Intent
Repair the right-sidebar in-game menu after the prior action-card implementation produced a poor public/player UX.

## Implemented
- Replaced the three-card `Map / Game + Map / Session` block with stacked full-width action rows in `pax-fluxia/src/lib/components/game/GameContainer.svelte`.
- Restyled the menu rows to use one consistent visual language instead of mixing transparent list rows with boxed utility cards.
- Removed the left-indent treatment from the menu theme block so it reads as a first-class menu section instead of a nested child item.
- Reworked `GameThemeManager.svelte` for the menu variant:
  - `Browse Library` shortened to `Library`
  - `Add` renamed to `Save Copy`
  - save flow now uses a proper input plus `Cancel | Save` action row
  - player-facing menu variant hides theme-routing status chips and technical family metadata

## Files Changed
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`

## Verification
- `bun run build` passed.
- No browser-side screenshot verification was performed by the agent in this pass.

## Remaining Risk
- The save/load drawers still render as shared drawers below the action rows rather than expanding inline under the specific row that opened them. This is visually much better than the prior card layout, but can be refined further if the user wants tighter row-to-drawer coupling.
- Existing unrelated Svelte unused-CSS warnings remain in the repo.

