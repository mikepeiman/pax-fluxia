# Feature And Task Queue - 2026-05-04

## Active

- Fix game-shell exit behavior so leaving gameplay actually stops the running game.
- Preserve separate localStorage-backed settings for:
  - `Phase Edges`
  - `Ember Lattice`
  - `Phase Field`
- Re-establish the border/fill alignment invariant on the newer territory modes.
- Find and eliminate the deterministic cause of disappearing territory regions after conquest.

## Spec / status alignment

- `Phase Field`, `Phase Edges`, and `Ember Lattice` are documented as separate mode-local settings sections in `.agent/docs/game/ui/TERRITORY_SETTINGS_REFERENCE.md`.
- Current implementation persists one shared panel blob in `pax-fluxia/src/lib/components/ui/panelSync.ts`, so mode-local persistence is currently off-spec.
- Territory architecture documents still require fill and border to derive from the same frontier truth each frame.
- Current user report says the branch regressed both border/fill alignment and region-presence invariants, so the current implementation is failing or drifting off-spec.

## Current pass

- Trace route-shell mount/unmount ownership between:
  - `pax-fluxia/src/routes/+page.svelte`
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- Split persisted settings ownership into:
  - shared global settings
  - mode-local territory settings keyed by active render mode
- Audit the newer territory render-family geometry consumers for:
  - border/fill source divergence
  - missing-region fallback or empty-region acceptance
  - ownership/geometry snapshot mismatches across conquest transitions

## Verification target

- Returning to menu must unmount the game shell, not just hide it internally.
- Back/menu actions during active play must confirm before leaving.
- Switching between `Phase Edges`, `Ember Lattice`, and `Phase Field` must restore each modeâ€™s last-used local settings.
- Territory fills must remain present and aligned with borders after every conquest in the newer modes.

