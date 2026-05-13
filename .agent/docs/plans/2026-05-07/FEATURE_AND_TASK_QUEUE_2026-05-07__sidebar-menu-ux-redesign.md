# 2026-05-07 Feature And Task Queue - Sidebar Menu UX Redesign

## Active Task
- Replace the cramped right-sidebar in-game menu layout with a player-facing structure that uses standard action rows and cleaner theme controls.

## Scope
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameThemeManager.svelte`

## Requirements
- The action model belongs in the always-open right sidebar menu, not the settings panel.
- The menu should use common player-facing UX, not equal-weight mini cards.
- Theme controls must remain available but stop reading as a developer utility panel.
- Topbar audience toggles remain in the topbar; do not reintroduce them into settings.

## Verification
- `bun run build`
- Human visual verification still required in-app.

