# Feature And Task Queue - 2026-05-04

## Active

- Save the regional ambient signature FX vision and implementation direction as a durable project document.
- Establish the real code seams for ownership-bound background VFX without inventing a parallel territory architecture.
- Start the merge handoff now so later implementation work can land back to `master` with less rediscovery.
- Define the first-wave theme set and phased delivery order for subtle, performant region ambience.

## Spec / status alignment

- Territory terms and the `ownership -> geometry -> transition -> presentation` model already define where region ambience is allowed to live: presentation/VFX only.
- `pax-fluxia/src/lib/fx/` already provides a general event-driven FX system with game-time semantics.
- `pax-fluxia/src/lib/territory/integration/TerritoryFxBridge.ts` and `TerritoryVFXBridge.ts` already provide territory-local VFX seams.
- No current implementation provides continuous per-region ambient signature FX, so this objective is genuinely new work rather than a bugfix against existing shipped behavior.

## Current pass

- Sprint 1:
  - land the shared background mode catalog under `pax-fluxia/src/lib/backgrounds/`
  - migrate game visuals from raw `bgImage` persistence to `backgroundSelection` while preserving legacy image compatibility
  - migrate main-menu theme backgrounds from raw filename storage to per-theme `BackgroundSelection`
  - keep runtime rendering on the legacy image seam until menu/game presenters land

## Progress log

- Sprint 1 implemented:
  - added `pax-fluxia/src/lib/backgrounds/{types,catalog,selection,index}.ts`
  - added `pax-fluxia/src/lib/backgrounds/selection.test.ts`
  - upgraded `panelSync.ts`, `GameSettingsPanel.svelte`, `themeStore.svelte.ts`, `MainMenu.svelte`, and `GameCanvas.svelte` to understand `BackgroundSelection`
  - production build passes in `pax-fluxia/`
- Validation note:
  - `bun run check` is currently red for large amounts of pre-existing repo debt unrelated to this sprint, so build + targeted helper tests are the reliable Sprint 1 gate here

## Verification target

- The new documentation artifacts exist on disk at the recorded paths.
- The durable spec points to real implementation seams in the current repo.
- The handoff is strong enough that a later coding pass can start without re-deriving the same architecture and content decisions.
