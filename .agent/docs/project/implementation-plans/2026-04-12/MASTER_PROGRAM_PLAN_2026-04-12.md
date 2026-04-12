# Master Program Plan — 2026-04-12

## Current focus

- Stabilize player-color tooling so it is trustworthy, visible, and shared across Main Menu, in-game controls, SP, and MP.
- Keep reducing silent divergence between SP and MP by pushing shared intent through the real multiplayer room path.
- Continue the ongoing workflow/harness evaluation while logging concrete atlas-harness failures instead of hand-waving them.

## This round

- Added shared per-player hue-nudge support on top of the anchored 6-color palette.
- Made Main Menu player swatches clickable, with selected-player hue readout and `±15°` nudge control.
- Mirrored the same palette model into the in-game Players controls.
- Wired the configured player palette into multiplayer room creation so the server stops falling back to its legacy hardcoded palette.

## Next likely moves

- Verify visually that Main Menu previews, AI rows, lobby colors, and in-match colors now agree.
- If the selected-swatch UX still feels too hidden or too fussy, tighten the layout rather than adding a second competing palette surface.
- Continue with the queued lane/arrows/metaball work once the player-color foundation feels stable.
