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
- Sprint 2:
  - replace main-menu background image selection with the shared mode picker
  - add a dedicated menu runtime for `nebula_veil`, `banner_light`, and `shadow_mist`
  - keep `legacy_image` as compatibility-only storage instead of the main product surface
- Sprint 3:
  - integrate a gameplay ambient presenter for the clean territory runtimes
  - support the first gameplay-capable modes: `nebula_veil`, `banner_light`, `shadow_mist`, `starlit_dust`
  - keep unsupported territory runtimes on explicit no-op behavior instead of mode-specific hacks
- Sprint 4:
  - extend gameplay support to all 8 primary live modes
  - expose shared and mode-specific tuning controls in the gameplay settings surface
  - keep the implementation modular enough to respect the repo's file-discipline limits while the renderer family grows
- Sprint 5:
  - enforce runtime support policy in both gameplay UI and `GameCanvas`
  - preserve stored selections while failing unsupported live modes to explicit no-op
  - keep the active implementation scope aligned to PVV4 plus the maintained metaball-grid phase modes

## Progress log

- Sprint 1 implemented:
  - added `pax-fluxia/src/lib/backgrounds/{types,catalog,selection,index}.ts`
  - added `pax-fluxia/src/lib/backgrounds/selection.test.ts`
  - upgraded `panelSync.ts`, `GameSettingsPanel.svelte`, `themeStore.svelte.ts`, `MainMenu.svelte`, and `GameCanvas.svelte` to understand `BackgroundSelection`
  - production build passes in `pax-fluxia/`
- Validation note:
  - `bun run check` is currently red for large amounts of pre-existing repo debt unrelated to this sprint, so build + targeted helper tests are the reliable Sprint 1 gate here
- Sprint 2 implemented:
  - added `pax-fluxia/src/lib/backgrounds/runtime/{menuPalette,renderMenuBackground}.ts`
  - added `pax-fluxia/src/lib/components/ui/main-menu/MenuBackgroundCanvas.svelte`
  - upgraded `BackgroundSelectModal.svelte`, `MainMenu.svelte`, and `MenuUtilityTopbar.svelte` to expose primary background modes instead of image-only selection
  - verification:
    - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
    - `bun run build` passes in `pax-fluxia/`
- Sprint 3 implemented:
  - added `pax-fluxia/src/lib/backgrounds/runtime/{gamePalette,GameAmbientBackgroundPresenter}.ts`
  - upgraded `GameCanvas.svelte` to drive the gameplay presenter from existing territory geometry instead of inventing a second ownership path
  - upgraded `GameCanvasTerritoryBridge.ts` to expose the current canonical geometry snapshot to the shared presenter path
  - fixed `panelSync.ts` and `GameSettingsPanel.svelte` so non-legacy selections survive config sync instead of collapsing back to `legacy_image`
  - replaced the visuals panel's background-image-only control with gameplay mode cards, shared tunables, and retained legacy-image fallback
  - the maintained gameplay runtime contract for this lane is:
    - `power_voronoi_canonical`
    - `metaball_grid_phase_edges`
    - `metaball_grid_ember_lattice`
    - `metaball_grid_phase_field`
  - Sprint 3 gameplay modes now render:
    - `nebula_veil`
    - `banner_light`
    - `shadow_mist`
    - `starlit_dust`
  - verification:
    - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
    - `bun run build` passes in `pax-fluxia/`
    - `bun run check` still reports large amounts of pre-existing repo-wide type debt outside this feature lane
- Sprint 4 implemented:
  - expanded the gameplay mode picker to all 8 primary live modes in `ControlsSection-Visuals.svelte`
  - added shared + mode-specific tuning controls plus a reset-to-default action for the selected live mode
  - extended the gameplay presenter to render:
    - `leyline_flow`
    - `ember_kingdom`
    - `frost_veins`
    - `storm_current`
  - refactored the gameplay presenter into smaller modules to stay under the repo's file-size rule:
    - `pax-fluxia/src/lib/backgrounds/runtime/GameAmbientBackgroundPresenter.ts`
    - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientUtils.ts`
    - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientInteriorDrawers.ts`
    - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientParticleDrawers.ts`
  - verification:
    - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
    - `bun run build` passes in `pax-fluxia/`
    - build still emits the same large pre-existing Svelte unused-selector warnings outside this feature lane
- Sprint 5 implemented:
  - added support-policy helpers to `pax-fluxia/src/lib/backgrounds/catalog.ts`
  - upgraded `ControlsSection-Visuals.svelte` to:
    - read the active territory render mode
    - disable unsupported live-mode cards
    - warn when the stored live selection is unsupported on the current runtime
    - disable the live tuning panel for unsupported stored modes while preserving state
  - upgraded `GameCanvas.svelte` to:
    - render live backgrounds only when the active territory runtime actually supports the selected mode
  - extended targeted background tests to cover selective support behavior
  - verification:
    - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
    - `bun run build` passes in `pax-fluxia/`
    - build warnings remain dominated by pre-existing unused-selector noise and chunk warnings outside this feature lane
- Scope correction after user review:
  - reverted the accidental Sprint 5 broadening into `distance_field` and `perimeter_field`
  - narrowed the active support contract to:
    - `power_voronoi_canonical`
    - `metaball_grid_phase_edges`
    - `metaball_grid_ember_lattice`
    - `metaball_grid_phase_field`
  - disabled live backgrounds again on:
    - `territory_canonical`
    - `territory_engine`
    - base `metaball_grid`
    - all direct legacy modes
- Discoverability correction after user validation:
  - background controls were technically present but too buried inside `Map Options & Tuning`
  - gameplay also stayed on `legacy_image` by default, so the branch could appear to have no live FX at all
  - added a dedicated `Background FX` section in gameplay settings
  - made `Background FX` the default first-open section when no prior section layout is stored
  - added a one-click live-mode enable callout when gameplay is still using the legacy image fallback
- Strength-range correction after user validation:
  - expanded live FX controls from timid `0..1` / `0..2` style ranges to much broader `10x-100x` tuning ranges
  - removed internal `clamp01` flattening from the gameplay and menu live-background renderers where it was suppressing stronger values
  - decoupled live regional FX opacity from the legacy image opacity path
  - relabeled the remaining old slider as `Legacy Image Opacity`
- Paused-preview and per-player identity correction after user validation:
  - ambient background motion now continues while the match is paused and before simulation start so settings changes remain visible during inspection
  - gameplay visuals persistence now carries:
    - `backgroundAffectAllTerritory`
    - `playerBackgroundSelections`
  - `pax-bg-change` payloads now carry the same per-player background state so `GameCanvas.svelte` does not have to infer identity modes from unrelated config
  - gameplay `Background FX` now exposes:
    - a `Mode affects all territory` toggle
    - per-player target chips with owner color, local/AI markers, and current mode labels
    - player-specific live mode editing and tuning when the toggle is off
  - global mode remains available as the broad preview/fallback path, but per-player identity is now the intended product path

## Verification target

- The new documentation artifacts exist on disk at the recorded paths.
- The durable spec points to real implementation seams in the current repo.
- The handoff is strong enough that a later coding pass can start without re-deriving the same architecture and content decisions.
- On a supported runtime, live background motion should still animate while paused or before game start.
- In gameplay `Background FX`, switching `Mode affects all territory` off should surface per-player editing targets and allow different live mode assignments per owner.
