# Territory Recovery Chunk 07 Note (2026-03-08)

## Scope
- Chunk 07: territory control section cleanup (panel-driven reads/writes).

## Changes
- Updated `ControlsSection-Territory.svelte` in modified/power Voronoi sections so corridor/disconnect toggles and ON/OFF labels use panel state first:
  - `panel.modifiedVoronoiCorridorEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED`
  - `panel.modifiedVoronoiDisconnectEnabled ?? GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED`
- This removes direct-config display/checked behavior that could desync from panel state after user interaction.

## Why
- These controls were previously reading directly from `GAME_CONFIG`, while writes were routed through `updatePanel(...)`.
- That split can produce transient UI effects and apparent snap-back behavior under rapid updates.

## Done Criteria
- Modified/power Voronoi corridor/disconnect controls now render from panel-derived values and still write via `updatePanel`.

## Remaining
- Broader territory section still contains panel+GAME_CONFIG fallback usage by design during bridge phase.
- Full panel-only read conversion remains a later chunk after global bridge stabilization.
