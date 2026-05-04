# Session - 2026-05-04

## Regional ambient signature FX planning

- Started a documentation-first `vfx` lane pass for ownership-bound background ambience.
- Loaded the governing agent rules, multi-lane worktree guide, current territory render architecture docs, and current VFX timing model.
- Confirmed the current implementation status before writing any plan:
  - general event-driven FX exists in `pax-fluxia/src/lib/fx/`
  - territory-local VFX seams exist in `pax-fluxia/src/lib/territory/integration/` and `pax-fluxia/src/lib/territory/vfx/`
  - no continuous region ambient signature system exists yet
- Key architectural conclusion:
  - regional ambient signatures must consume existing ownership/geometry/presentation truth
  - they must not create new territory truth or fork per-renderer one-off logic
- Durable spec written:
  - `.agent/docs/game/vfx/REGIONAL_AMBIENT_SIGNATURE_FX.md`
- Current documentation outputs for this worktree:
  - queue: `.agent/docs/plans/2026-05-04/FEATURE_AND_TASK_QUEUE_2026-05-04__abc9.md`
  - session plan: `.agent/docs/sessions/2026-05-04/2026-05-04_region-ambient-fx-plan_abc9.md`
  - handoff: `.agent/docs/plans/2026-05-04/HANDOFF_2026-05-04_REGION_AMBIENT_FX.md`
- Immediate next implementation direction locked:
  - add a region ambient profile registry
  - add a Pixi ambient presenter
  - start with subtle interior + frontier presets before particles

## Sprint 1 - shared background data model

- Created a shared background-mode catalog in `pax-fluxia/src/lib/backgrounds/` with:
  - 8 primary mode ids
  - hidden `legacy_image` compatibility mode
  - per-surface support flags
  - tunable schemas
  - runtime capability matrix
- Migrated game visuals persistence to carry `backgroundSelection` alongside the legacy `bgImage` compatibility field.
- Migrated main-menu theme background storage from raw strings to per-theme `BackgroundSelection` records.
- Normalized `pax-bg-change` payloads so the event can carry either legacy image state or the new selection object.
- Added targeted tests for the new normalization helpers.
- Verification:
  - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`
  - `bun run check` remains blocked by pre-existing repo-wide type debt outside this sprint

## Sprint 2 - main menu runtime and picker

- Added a dedicated menu background runtime instead of extending the old CSS/image seam.
- Implemented the three menu-capable primary modes:
  - `nebula_veil`
  - `banner_light`
  - `shadow_mist`
- Reworked the main-menu selection UI to advertise live modes first and keep `legacy_image` as compatibility fallback only.
- Verification:
  - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`

## Sprint 3 - gameplay presenter on clean territory runtimes

- Added `GameAmbientBackgroundPresenter` and a shared gameplay palette helper under `pax-fluxia/src/lib/backgrounds/runtime/`.
- Wired the gameplay presenter into `GameCanvas.svelte` so it consumes already-computed territory geometry instead of owning a second truth path.
- Extended `GameCanvasTerritoryBridge.ts` to expose the latest canonical geometry snapshot to the gameplay background presenter.
- Fixed the settings/config synchronization path so live background selections are preserved instead of being flattened back to `legacy_image`.
- Reworked the gameplay visuals UI to expose the first live gameplay mode cards and shared tunables while keeping legacy image selection available.
- Sprint 3 live gameplay modes:
  - `nebula_veil`
  - `banner_light`
  - `shadow_mist`
  - `starlit_dust`
- Sprint 3 clean runtime coverage:
  - `territory_engine`
  - `power_voronoi_canonical`
  - clean `territory_canonical`
  - `metaball_grid`
  - `metaball_grid_phase_edges`
  - `metaball_grid_ember_lattice`
  - `metaball_grid_phase_field`
- Verification:
  - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`
  - `bun run check` still reports large amounts of pre-existing repo-wide type debt outside this feature lane

## Sprint 4 - full gameplay mode set and tuning surface

- Expanded the gameplay mode catalog in the visuals panel from the first four live modes to the full eight primary live modes.
- Added mode-specific tuning sliders and reset-to-default behavior so the gameplay settings surface is a real tuning surface, not a hidden data knob.
- Implemented the remaining gameplay modes in the shared presenter path:
  - `leyline_flow`
  - `ember_kingdom`
  - `frost_veins`
  - `storm_current`
- Refactored the presenter into smaller runtime modules after the first implementation pass pushed the file over the repo's hard file-size limit.
- Verification:
  - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`
  - build warnings remain dominated by pre-existing unused-selector noise outside this feature lane

## Sprint 5 - selective compatibility and hardening

- Added shared support-policy helpers so the capability matrix is executable product logic instead of documentation-only metadata.
- Wired `distance_field` and `perimeter_field` into the gameplay background geometry path using the existing shared geometry cache.
- Upgraded the visuals settings surface to disable unsupported live modes for the active territory runtime while preserving stored selections.
- Added user-facing unsupported-state messaging and disabled live tuning when the stored mode is unsupported on the current runtime.
- Extended the targeted background tests to cover selective support policy.
- Verification:
  - `bun x vitest run src/lib/backgrounds/selection.test.ts` passes
  - `bun run build` passes in `pax-fluxia/`
  - no browser verification was run in this lane
