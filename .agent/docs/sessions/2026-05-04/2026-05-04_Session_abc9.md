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
