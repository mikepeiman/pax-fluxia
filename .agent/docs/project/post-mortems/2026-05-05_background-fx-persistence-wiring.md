# Post-Mortem: 2026-05-05 - Background FX Persistence Wiring

## What Happened

The background FX controls shipped in a state where live tunables such as `Intensity` were not reliably stored/loaded across reloads. The user had to point out that the standard control panel wiring had not been used.

## Root Cause

The feature was wired through an ad hoc `updateVisual(...)` path in `GameSettingsPanel.svelte` that mutated `vis` in place. The persistence owner `panelSync.ts` handled save/load/apply, but it did not own the canonical visual-setting update lifecycle for the new background FX setting shape.

## Impact

- Users could tune live background FX and see them change immediately, but those values were not trustworthy across reloads.
- The implementation violated the project’s settings-panel discipline and made the new background controls feel less real than the rest of the settings surface.

## Corrective Actions

- Added canonical helpers in `pax-fluxia/src/lib/components/ui/panelSync.ts`:
  - `normalizeVisualSettings(...)`
  - `setVisualSetting(...)`
  - `syncVisualSettingsFromConfig(...)`
- Rewired `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` to use immutable visual state replacement through those helpers.
- Added a localStorage round-trip regression test in `pax-fluxia/src/lib/components/ui/panelSync.test.ts` covering live global tunables and per-player background selections.

## Lessons

- Any new persisted settings surface must route through the canonical settings owner immediately, not after the fact.
- Nested visual settings need round-trip tests at the time of introduction, not only after user reports.
- “It changes in UI” is not sufficient evidence for a settings feature; persistence and reload behavior are part of the acceptance criteria.
