## Territory Recovery Planning Docs (To Write Next)

### Summary
- Produce two durable planning documents before more implementation:
  - `territory_liveness_and_settings_recovery_2026-03-08.md`
  - `territory_canonical_geometry_border_fill_plan_2026-03-08.md`
- Mirror both into `.agent/WIP Work-In-Progress/permanent-references/territory/`.
- These docs must explicitly separate:
  - liveness/state trust restoration,
  - canonical geometry border/fill architecture.

### Document 1: Liveness + Settings Recovery
- Purpose:
  - restore confidence that panel changes, theme loads, conquest ticks, and renderer invalidation all reach the live visuals deterministically.
- Required contents:
  - current-state diagnosis:
    - mixed architecture between `setSetting`/`setManySettings` and `applyPanelToConfig`/`syncPanelFromConfig`/manual `syncAllFromConfig`
    - likely stale-update failure chain from panel -> config -> renderer invalidation -> ownership/border upload
  - canonical mutation rule:
    - all panel writes go through `setSetting` / `setManySettings`
    - no direct UI-layer broad replay into `GAME_CONFIG`
  - theme/sub-theme contract:
    - theme apply uses transactional `setManySettings`
    - panel display and runtime config update atomically
  - renderer liveness instrumentation plan:
    - setting write telemetry
    - topology/geometry/visual fingerprint deltas
    - ownership RT rebuild events
    - mesh rebuild events
    - uniform-only visual updates
    - morph state transitions
  - acceptance gates:
    - settings changes visibly update territory immediately
    - conquest/tick changes visibly update territory without slider interaction
    - theme loads update both UI and runtime consistently
- Explicit non-goal:
  - no border-quality tuning inside this document except what is necessary to prove the renderer is live.

### Document 2: Canonical Geometry Border + Fill Plan
- Purpose:
  - replace the wrong grid-derived canonical path with a true geometry-first ownership-interface pipeline.
- Required contents:
  - explicit source-of-truth contract:
    - canonical borders are derived from true ownership interfaces in world space
    - canonical fills are backfilled from the same geometry
  - explicit forbidden shortcuts:
    - canonical borders must not derive from `ownerGrid`, ownership lattice, sampled cell transitions, or grid-straighten logic
    - those sources may remain only in legacy/reference modes
  - pipeline stages:
    - graph-native ownership truth
    - lane-analytical interface samples
    - interstitial sub-texel field transition extraction
    - owner-pair centerline graph
    - straight-family fitting
    - centered stroke-mesh rendering
    - region polygon / fill backfill from same interface graph
  - engine roles:
    - `mesh` becomes canonical only after it uses true interface geometry
    - `legacy_field` and `legacy_grid` remain preserved reference engines
    - current mesh-grid path is demoted to experimental/reference if retained
  - morph modes:
    - `Fade Blend` retained as a distinct selectable mode with timing/easing controls
    - `Boundary Morph` planned separately
    - future hybrid layering is optional and not required for this milestone
  - acceptance gates:
    - borders are even-width, centered, and clean at gameplay zoom and close zoom
    - fill and border cannot drift because they share geometry truth
    - no canonical visual depends on vector-grid or straighten controls
- Explicit non-goal:
  - curved/segmented production quality is not required before straight-family success.

### Implementation Follow-On Order
1. Write and mirror both planning docs.
2. Execute Document 1 fully:
   - restore panel/theme/runtime/render trust.
3. Verify live-update correctness with instrumentation.
4. Execute Document 2:
   - build true ownership-interface geometry path.
5. Only after canonical straight borders succeed:
   - revisit DX, corridors, MSR validation on the new geometry path.
6. Then add true boundary-morph mode while preserving fade-blend as a separate player-selectable effect.

### Assumptions and Defaults
- `Fade Blend` and `Boundary Morph` are separate conquest modes.
- Current fade-blend remains a shipped feature, not a temporary hack.
- Legacy border modes stay in the product as references.
- The current grid-derived mesh path is not considered final-quality canonical architecture.
