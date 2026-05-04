# Handoff - 2026-05-04 Region Ambient Signature FX

**Date:** 2026-05-04  
**Branch:** `codex/background-mode-system`  
**Scope start:** today only  
**Current state:** documentation plus Sprint 1 data-model/persistence landing; runtime presenters still in progress

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

### 2. Add the shared menu runtime next

- `Nebula Veil`
- `Banner Light`
- `Shadow Mist`

This should consume `BackgroundSelection`, not legacy image strings.

### 3. Then add the gameplay presenter with the same selection contract

If `GameCanvas.svelte` must change, keep it to:

- presenter construction
- presenter update calls
- lifecycle cleanup

Do not bury mode/tunable policy there.

### 4. Use clean territory paths first for region-aware gameplay modes

The new capability matrix already encodes the intended v1 support:

- full set on `territory_canonical`, `power_voronoi_canonical`, `territory_engine`, and the `metaball_grid*` family
- subset on `distance_field` and `perimeter_field`
- explicit defer/no-op on older direct legacy modes

## Runtime-shape caution

The territory system is mixed today:

- pipeline runtime
- render-family runtime
- direct legacy renderer runtime

Do not spend phase-1 time building bespoke ambient support for every direct legacy renderer.

Phase-1 priority should be:

1. pipeline runtime
2. render-family runtime if the data seam is clean
3. direct legacy runtime only if a shared fallback is cheap

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
- no raw wall-time animation logic
- no new ownership/geometry truth
- no effect spill outside owned regions except deliberate frontier glow
- no heavy choke-point edits before proving the leaf-module design

## Validation checklist for later implementation

- effect remains subtle at normal gameplay zoom
- frontiers stay readable
- star labels, ships, and arrows remain readable
- pause and speed changes keep ambient timing coherent
- 4-6 simultaneous player themes do not turn the map into noise
- no visible hitching on conquest

## Open questions still unresolved

- Which runtime path exposes the cleanest reusable owned-region mask for a shared ambient presenter.
- Whether direct legacy renderers should get a phase-1 fallback or no support until later migration.
- Where player-facing cosmetic selection belongs in the settings/theme model without premature UI churn.

## Merge / port guidance

When this work becomes code, port in this order:

1. shared background domain
2. menu runtime
3. gameplay presenter
4. mode/tuning UI
5. selective compatibility hardening

Sprint 1 already landed step 1 cleanly. The next merge-sensitive files are `MainMenu.svelte`, `MenuUtilityTopbar.svelte`, `BackgroundSelectModal.svelte`, `GameSettingsPanel.svelte`, and `GameCanvas.svelte`.
