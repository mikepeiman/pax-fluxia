# Purpose

Fix the background FX settings so live tunables and per-player selections persist across reloads using the project’s standard control-panel wiring.

## Facts

- User observed that `Intensity` and likely other live background values were not loading back from localStorage on reload.
- Background FX values were being updated through `updateVisual(...)` in `GameSettingsPanel.svelte`.
- That path was mutating `vis` in place instead of routing through a standard immutable visual-state helper in `panelSync.ts`.

## Assumptions

- The main failure is in the visual settings update/persistence lifecycle, not the background rendering code.
- The right fix is to move normalization/update responsibility into `panelSync.ts`, then have `GameSettingsPanel.svelte` consume that helper.

## Plan

1. Add canonical visual-setting update helpers to `panelSync.ts`.
2. Rewire `GameSettingsPanel.svelte` to use those helpers.
3. Add a real localStorage round-trip regression test.
4. Update queue/session/handoff docs and write a post-mortem.
