# 2026-05-07 Feature And Task Queue - Attached Menu Panels And Confirmations

## Active Task
- Change right-sidebar menu interactions so `Load` and `Save` open directly under the initiating control instead of after the whole action stack.

## Scope
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ThemeSelectDropdown.svelte`

## Requirements
- `Load Map`, `Save Map`, `Load Game`, and `Save Game` must open attached to their initiating controls.
- The sidebar column must expand and scroll naturally with opened panels.
- Use 200ms transitions across the touched sidebar/theme interactions.
- Add confirmation dialogs for restart and delete actions.

## Verification
- `bun run build`
- `bunx vitest run src/lib/shell/audience.test.ts`
- Human visual verification still required in-app.

