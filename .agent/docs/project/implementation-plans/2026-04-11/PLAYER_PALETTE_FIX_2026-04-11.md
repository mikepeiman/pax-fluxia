# Player Palette Fix - 2026-04-11

## Goal

Improve player color contrast and simplify the control model:

- reduce the active roster palette to 6 colors
- drive the roster from one anchored master hue instead of per-player manual picks
- expose the anchor control in both Main Menu and in-game settings
- make live in-game changes actually update the current match

## What changed

- Added a canonical player-palette utility:
  - `pax-fluxia/src/lib/utils/playerPalette.ts`
- Palette generation is now anchored and perceptually spread, instead of being a simple evenly-spaced hue wheel.
- Main Menu now derives the whole 6-player palette from one anchor hue and shows a palette preview.
- Added an in-game `Players` section:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Players.svelte`
- Single-player live palette changes now update current player colors immediately.
- Multiplayer live palette changes now update the local client view immediately.

## Important current caveat

- Multiplayer live palette changes are currently client-local visual changes.
- They do not yet sync through the server to every connected client.
- That is acceptable for this quick fix because player color is presentation-only here, but if we want shared MP palette edits later, that needs an explicit server-authoritative setting path.

## Cleanup win

This slice also reduced duplicated palette logic:

- `gameStore` fallback generation now uses the shared palette utility
- renderer fallback colors now use the same shared defaults
- thumbnail fallback colors now use the same shared defaults

## Follow-up fix

- Neutral fallback color was briefly regressed by the new generic owner-color fallback path.
- It is now explicitly hard-pinned back to grey for `neutral` and empty owner IDs.

## Validation

- `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p pax-server/tsconfig.json --noEmit --pretty false`
