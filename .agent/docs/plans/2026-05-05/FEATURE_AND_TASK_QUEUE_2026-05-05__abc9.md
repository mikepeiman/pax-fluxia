# Feature And Task Queue - 2026-05-05

## Active

- Repair the background FX settings persistence path so live tunables and per-player selections survive reloads.
- Bring the background FX controls back onto the standard visual settings wiring instead of ad hoc in-place mutation.
- Add regression coverage for localStorage round-tripping of live background settings.
- Record the wiring miss and derived rule in today’s post-mortem and session docs.

## Spec / status alignment

- The intended product behavior is that background FX controls are real user settings, not ephemeral runtime knobs.
- `Background FX` was implemented and interactive, but it was off-spec with respect to the project’s control-panel wiring discipline:
  - updates were mutating `vis` in place inside `GameSettingsPanel.svelte`
  - the persistence owner `panelSync.ts` did not own the full visual-setting update path
- User validation established that live background tunables were not reliably stored/loaded on reload, so the implementation was wrong by definition.

## Current pass

- Centralize visual-setting normalization/update flow in `pax-fluxia/src/lib/components/ui/panelSync.ts`.
- Replace in-place `vis` mutation in `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` with immutable visual state replacement.
- Add a round-trip localStorage test in `pax-fluxia/src/lib/components/ui/panelSync.test.ts` covering:
  - live global background tunables
  - `backgroundAffectAllTerritory`
  - `playerBackgroundSelections`
- Update the merge handoff and today’s session docs with the corrected persistence contract.

## Progress log

- Implemented:
  - exported `normalizeVisualSettings(...)` from `panelSync.ts`
  - added `setVisualSetting(...)` in `panelSync.ts`
  - added `syncVisualSettingsFromConfig(...)` in `panelSync.ts`
  - rewired `GameSettingsPanel.svelte` to use those helpers instead of mutating `vis` in place
  - added a localStorage round-trip test in `panelSync.test.ts`
- Verification:
  - `bun x vitest run src/lib/components/ui/panelSync.test.ts src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`
  - build still emits the same large pre-existing unused-selector warnings and chunk warnings outside this fix lane

## Verification target

- Set a live background mode, raise `Intensity`, reload, and confirm the same value is still shown.
- In per-player mode, change at least one player’s live mode and tunables, reload, and confirm the same assignments persist.
- Confirm the live background still renders on the maintained runtime set:
  - `power_voronoi_canonical`
  - `metaball_grid_phase_edges`
  - `metaball_grid_ember_lattice`
  - `metaball_grid_phase_field`
