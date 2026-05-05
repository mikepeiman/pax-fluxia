# Handoff - 2026-05-04 Region Ambient Signature FX

**Date:** 2026-05-04  
**Branch:** `codex/background-mode-system`  
**Scope start:** today only  
**Current state:** Sprint 1 through Sprint 5 are now landed in this worktree; menu runtime is live, all 8 primary gameplay modes render on the agreed gameplay runtime targets, runtime support policy is explicit in both the UI and `GameCanvas`, gameplay exposes a dedicated `Background FX` section, the live FX tuning ranges have been widened substantially beyond the original subtle-only prototype ranges, live ambient previews continue while paused/pre-start, and gameplay can now edit background identity either globally or per player

This handoff starts the region-ambient work cleanly instead of waiting until after implementation. Its purpose is to remove future rediscovery cost when this worktree eventually needs to merge or port back to `master`.

## What changed today

Created the durable design/spec document:

- `.agent/docs/game/vfx/REGIONAL_AMBIENT_SIGNATURE_FX.md`

Created today's worktree-specific daily artifacts:

- queue:
  - `.agent/docs/plans/2026-05-04/FEATURE_AND_TASK_QUEUE_2026-05-04__abc9.md`
- session plan:
  - `.agent/docs/sessions/2026-05-04/2026-05-04_region-ambient-fx-plan_abc9.md`
- session note:
  - `.agent/docs/sessions/2026-05-04/2026-05-04_Session_abc9.md`
- chat log:
  - `.agent/docs/sessions/2026-05-04/2026-05-04_Chat_abc9.md`
- takeaways:
  - `.agent/docs/sessions/2026-05-04/2026-05-04_Takeaways_abc9.md`

Implemented Sprint 1 of the background-mode system:

- added shared background catalog and selection helpers:
  - `pax-fluxia/src/lib/backgrounds/catalog.ts`
  - `pax-fluxia/src/lib/backgrounds/selection.ts`
  - `pax-fluxia/src/lib/backgrounds/types.ts`
  - `pax-fluxia/src/lib/backgrounds/index.ts`
- added targeted helper coverage:
  - `pax-fluxia/src/lib/backgrounds/selection.test.ts`
- migrated persistence and compatibility seams:
  - `pax-fluxia/src/lib/components/ui/panelSync.ts`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/stores/themeStore.svelte.ts`
  - `pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

Implemented Sprint 2 of the background-mode system:

- added the shared menu runtime:
  - `pax-fluxia/src/lib/backgrounds/runtime/menuPalette.ts`
  - `pax-fluxia/src/lib/backgrounds/runtime/renderMenuBackground.ts`
  - `pax-fluxia/src/lib/components/ui/main-menu/MenuBackgroundCanvas.svelte`
- upgraded the main-menu selection surface:
  - `pax-fluxia/src/lib/components/ui/main-menu/BackgroundSelectModal.svelte`
  - `pax-fluxia/src/lib/components/ui/main-menu/MainMenu.svelte`
  - `pax-fluxia/src/lib/components/ui/main-menu/MenuUtilityTopbar.svelte`
- menu now supports primary live-rendered modes:
  - `nebula_veil`
  - `banner_light`
  - `shadow_mist`
- `legacy_image` remains as a compatibility path, not the main advertised menu background model

Implemented Sprint 3 of the background-mode system:

- added the shared gameplay runtime:
  - `pax-fluxia/src/lib/backgrounds/runtime/gamePalette.ts`
  - `pax-fluxia/src/lib/backgrounds/runtime/GameAmbientBackgroundPresenter.ts`
- upgraded gameplay integration seams:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/integration/GameCanvasTerritoryBridge.ts`
- fixed background-selection sync so live mode selections survive config round-trips:
  - `pax-fluxia/src/lib/components/ui/panelSync.ts`
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- upgraded the gameplay tuning surface:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`
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

Implemented Sprint 4 of the background-mode system:

- extended gameplay mode coverage to all 8 primary live modes:
  - `leyline_flow`
  - `ember_kingdom`
  - `frost_veins`
  - `storm_current`
- upgraded the gameplay tuning surface in:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`
- added shared and mode-specific tuning sliders plus reset-to-default behavior for the selected gameplay mode
- split the gameplay presenter into smaller runtime modules to avoid violating the repo's file-size rule:
  - `pax-fluxia/src/lib/backgrounds/runtime/GameAmbientBackgroundPresenter.ts`
  - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientUtils.ts`
  - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientInteriorDrawers.ts`
  - `pax-fluxia/src/lib/backgrounds/runtime/gameAmbientParticleDrawers.ts`
- shared tunables now have actual renderer effect:
  - `intensity`
  - `animationSpeed`
  - `scale`
  - `edgeSoftness`
  - `vignette`

Implemented Sprint 5 of the background-mode system:

- added support-policy helpers in:
  - `pax-fluxia/src/lib/backgrounds/catalog.ts`
- upgraded gameplay support gating in:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- unsupported live modes now:
  - stay stored in persistence
  - show as unsupported in the gameplay settings surface
  - fail to explicit no-op at runtime instead of silently rendering the wrong thing
- targeted background tests now cover the runtime support helpers in `selection.test.ts`
- scope correction after user review:
  - removed the accidental `distance_field` and `perimeter_field` broadening from the active support contract
  - narrowed the committed gameplay runtime scope to:
    - `power_voronoi_canonical`
    - `metaball_grid_phase_edges`
    - `metaball_grid_ember_lattice`
    - `metaball_grid_phase_field`
- discoverability correction after user validation:
  - added a dedicated `Background FX` top-level gameplay settings section
  - moved general map controls back under `Map & Grid`
  - made `Background FX` the default first-open section when no prior section layout is stored
  - added an explicit legacy-image callout with one-click enable for a recommended live mode on supported runtimes
- strength-range correction after user validation:
  - widened the shared and mode-specific live FX tunables into materially stronger ranges
  - removed internal value flattening that had been clamping stronger settings back into subtle output
  - stopped using legacy background image opacity as a live-FX opacity cap in gameplay
  - relabeled the old image-only slider as `Legacy Image Opacity`
- paused-preview and per-player identity correction after user validation:
  - live gameplay ambient motion now uses presentation-only wall-clock time so mode switching remains visible while paused or before the match starts
  - extended persistence and background-change event payloads with:
    - `backgroundAffectAllTerritory`
    - `playerBackgroundSelections`
  - upgraded gameplay `Background FX` to expose:
    - a `Mode affects all territory` toggle
    - per-player target chips
    - player-specific mode/tuning edits when the toggle is off
  - global mode remains available as a broad preview/fallback path, but per-player identity is now the intended gameplay product model

## Objective locked in

The target is:

- subtle, ownership-bound, player-specific ambient background FX
- region identity, not gameplay noise
- atmosphere, not fireworks

The canonical phrase for the work is:

- `Regional Ambient Signature FX`

## Current implementation truth

Useful seams already exist:

### Global game FX

- `pax-fluxia/src/lib/fx/orchestrator.ts`
- `pax-fluxia/src/lib/fx/FXRegistry.ts`
- `pax-fluxia/src/lib/fx/types.ts`
- `pax-fluxia/src/lib/fx/handlers/territoryTransitionHandler.ts`
- `pax-fluxia/src/lib/fx/registry/defaults.ts`

### Territory-local VFX

- `pax-fluxia/src/lib/territory/integration/TerritoryFxBridge.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryVFXBridge.ts`
- `pax-fluxia/src/lib/territory/vfx/VFXBus.ts`
- `pax-fluxia/src/lib/territory/vfx/VFXContracts.ts`
- `pax-fluxia/src/lib/territory/vfx/handlers/ConquestParticles.ts`

### Territory presentation seams

- `pax-fluxia/src/lib/territory/adapters/pixi/PixiTerritoryPresenter.ts`
- `pax-fluxia/src/lib/territory/adapters/pixi/PixiFillPresenter.ts`
- `pax-fluxia/src/lib/territory/adapters/pixi/PixiBorderPresenter.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`

### New shared background data seam

- `pax-fluxia/src/lib/backgrounds/`

This now owns:

- canonical background mode ids
- tunable definitions and defaults
- per-surface mode support
- runtime capability matrix
- legacy image migration helpers
- background change event normalization

### Shared choke points to avoid unless necessary

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/config/territory.config.ts`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`

## Architecture decision to preserve

Do not build ambient region FX as a new truth-generating system.

It must remain:

- downstream of ownership truth
- downstream of geometry truth
- downstream of conquest transition truth
- presentation/VFX only

That means:

- no region effect system should compute ownership
- no theme should mutate geometry
- no theme should create one-off renderer forks by theme name

## Recommended implementation order

### 1. Keep the new shared background domain authoritative

Use `pax-fluxia/src/lib/backgrounds/` for:

- mode metadata
- tunable schemas
- persistence normalization
- support gating

Do not reintroduce ad hoc string mode ids elsewhere.

### 2. Browser verification is still outstanding

The implementation is compiled and tested, but no browser playtest or screenshot pass was run in this lane.

The highest-value manual checks are now:

- open gameplay settings and confirm `Background FX` is visible as its own section without needing to infer it from `Map & Grid`
- on a supported runtime while still on `Legacy Image`, confirm the callout offers a one-click live-mode enable action
- while paused or before simulation start, switch live modes and confirm the ambient motion continues updating instead of freezing
- in gameplay `Background FX`, switch `Mode affects all territory` off and confirm player chips appear for the current roster
- select different players and confirm the mode cards/sliders now edit only that player's territory identity
- in `Background FX`, drag `Intensity`, density, and speed controls high and confirm the top end is dramatically stronger than before instead of saturating at nearly the same subtle look
- `power_voronoi_canonical`:
  - verify all 8 live background modes
- `metaball_grid_phase_edges`, `metaball_grid_ember_lattice`, and `metaball_grid_phase_field`:
  - verify all 8 live background modes
- an unsupported mode on `distance_field`, `perimeter_field`, `graph`, `pixel`, or `metaball`:
  - confirm the live mode is visibly disabled in settings and fails to no-op in runtime

### 3. Keep clean-territory-first support as the v1 contract

The new capability matrix already encodes the intended v1 support:

- full set on:
  - `power_voronoi_canonical`
  - `metaball_grid_phase_edges`
  - `metaball_grid_ember_lattice`
  - `metaball_grid_phase_field`
- explicit defer/no-op on older direct legacy modes

## Runtime-shape caution

The territory system is mixed today:

- pipeline runtime
- render-family runtime
- direct legacy renderer runtime

Do not spend phase-1 time building bespoke ambient support for every direct legacy renderer.

Phase-1 priority should be:

1. PVV4
2. maintained metaball-grid phase modes
3. everything else later only by explicit scope expansion

## First-wave content direction

### Core Set 1

- `Starlit Dust`
- `Nebula Veil`
- `Ember Kingdom`
- `Frost Veins`
- `Shadow Mist`
- `Banner Light`

### Premium Set 2

- `Leyline Flow`
- `Rune Dust`
- `Storm Current`
- `Heraldic Ghosts`
- `Mycelial Dream`
- `Solar Silk`

## Non-negotiables

- no per-player shader compilation
- no dense always-on particle spam
- no simulation-owned time dependence for preview-only ambient identity FX; gameplay ambient preview intentionally uses wall-clock time so it remains visible while paused or pre-start
- no new ownership/geometry truth
- no effect spill outside owned regions except deliberate frontier glow
- no heavy choke-point edits before proving the leaf-module design

## Validation checklist for later implementation

- effect remains subtle at normal gameplay zoom
- frontiers stay readable
- star labels, ships, and arrows remain readable
- paused and pre-start inspection still shows live ambient motion because the feature is presentation-only and intentionally wall-clock driven
- speed changes do not corrupt or reset player-specific ambient identity state
- 4-6 simultaneous player themes do not turn the map into noise
- no visible hitching on conquest

## Open questions still unresolved

- Whether base `metaball_grid` should become part of the supported background contract later or remain a preview-only territory mode.
- Whether `territory_engine` / clean `territory_canonical` should re-enter scope later or stay out until the maintained runtime set is broader.
- Whether fresh gameplay installs should switch from `legacy_image` to a primary live mode default after the current maintained runtime set is verified.

## Merge / port guidance

When this work becomes code, port in this order:

1. shared background domain
2. menu runtime
3. gameplay presenter
4. mode/tuning UI
5. selective compatibility hardening

Sprint 1 through Sprint 5 now cover steps 1 through 5 in substantial form. The merge-sensitive files are `ControlsSection-Visuals.svelte`, `GameSettingsPanel.svelte`, `panelSync.ts`, `GameCanvas.svelte`, and the runtime support policy in `pax-fluxia/src/lib/backgrounds/catalog.ts`.

The latest merge-sensitive persistence/event additions are:

- `backgroundAffectAllTerritory`
- `playerBackgroundSelections`
