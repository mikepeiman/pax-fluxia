# Handoff - 2026-05-07 Attached Menu Panels And Confirmations

## Intent
Refine the right-sidebar action model so the controls feel physically attached to their triggers and stop rendering detached drawers after the whole menu block.

## Implemented
- Replaced the shared post-stack drawers in `pax-fluxia/src/lib/components/game/GameContainer.svelte` with per-button attached panels:
  - `Load Map` list opens under `Load`
  - `Save Map` input opens under `Save`
  - `Load Game` list opens under `Load`
  - `Save Game` input opens under `Save`
- Added `scrollIntoView({ block: "nearest", behavior: "smooth" })` after opening a panel so the sidebar scroll area follows the opened content.
- Added 200ms open/close transitions for attached panels and feedback surfaces with `slide` / `fade`.
- Added confirmation dialogs for:
  - restart session
  - delete saved map
  - delete saved game
- Updated touched menu/theme/dropdown interactions to 200ms timing.

## Files Changed
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`

## Verification
- `bun run build` passed.
- `bunx vitest run src/lib/shell/audience.test.ts` passed.
- No browser-side visual verification was performed by the agent in this pass.

## Remaining Risk
- `scrollIntoView({ behavior: "smooth" })` uses browser-native smooth scrolling rather than a custom fixed-duration scroll animation.
- Existing unrelated Svelte unused-CSS warnings remain in the repo.

