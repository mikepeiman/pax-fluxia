# Feature And Task Queue - 2026-04-30

## Executive Summary

- `metaball_grid_phase_field` is now a real additive replacement prototype for `metaball_grid`, using conquest-local `PRE/POST` compositing plus a deterministic grid scheduler instead of metaball presentation.
- The sprint did not just add a new mode. It also cleaned up the settings shell, made geometry diagnostics global, repaired multiple fake/dead tuning surfaces, and moved the mode toward geometry-consistent borders and fill behavior.
- The most important late correction is geometry-core, not renderer-local: owner loop construction at frontier junctions is now planar-adjacent instead of insertion-order dependent, which should remove the extra shell loops / backtracking seams exposed by `Show Underlying Geometry`.
- Merge status: code is committed in small checkpoints through `0d49f5ec3`; live `current-settings.json` remains intentionally uncommitted.

## Merge Handoff

### Landed Scope

- New territory mode:
  - `metaball_grid_phase_field`
- Runtime / render-family integration:
  - `GameCanvas.svelte`
  - `territoryRenderModeCatalog.ts`
  - `MetaballGridPhaseFieldFamily.ts`
- Settings / diagnostics rework:
  - dedicated `Phase Field` top-level settings section
  - split `Territory Topology` vs `Territory Styles`
  - global `Show Underlying Geometry` diagnostics toggle
  - removal of dead / misleading duplicated geometry-source controls
- Geometry / border / fill work:
  - unified resolved render geometry for phase field
  - geometry-level inset fill helper for `Inward Offset`
  - shared chain-walk junction fix so shell loops and fill reconstruction stop taking wrong spurs at LP/CX-heavy junctions

### Critical Merge Surfaces

- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.ts`
- `pax-fluxia/src/lib/territory/geometry/buildInsetTerritoryRegions.ts`
- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts`

### Validation Summary

- Geometry / helper tests run and passing:
  - `bunx vitest run ./src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts`
  - `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
  - `bunx vitest run ./src/lib/territory/geometry/buildInsetTerritoryRegions.test.ts`
- Repeated hygiene checks:
  - `git diff --check`
  - filtered `bun run check`
  - filtered `bunx tsc --noEmit --pretty false`
- Not yet done:
  - authoritative in-app visual QA after the final shared chain-walk fix

### Remaining Post-Merge Validation

- Verify `Show Underlying Geometry` no longer shows duplicate/backtracking owner loops at LP/CX-heavy seams.
- Verify phase-field conquest still reads well after the shared chain-walk fix:
  - smooth borders
  - geometry overlay
  - fill inset
  - pattern lattice
- Continue live tuning on:
  - `Pattern Spacing`
  - `Cell Shape`
  - `Cell Inset`
  - `Square Corner`
  - `Inward Offset`
  - conquest finish-tail controls

## Active
- Replace the current `metaball-grid` conquest render mode with a non-metaball architecture that keeps deterministic changed-region detection, smooth frontier-led conquest motion, border-following fills, and low-end WebGL safety.
- Keep the work grounded in the live render-family runtime, not a speculative whole-system rewrite.
- Maintain `.agent/AGENT.md` as the additive worktree handoff ledger for this sprint.

## Completed
- Loaded the governing worktree, territory-runtime, and documentation rules before planning.
- Traced the live integration seams in `RenderFamilyTypes.ts`, `buildRenderFamilyInput.ts`, `renderFamilyTransitionLifecycle.ts`, `territoryRenderModeCatalog.ts`, `MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, `metaballGridTypes.ts`, `planGridWave.ts`, `renderMetaballGridScene.ts`, and `PerimeterFieldFamily.ts`.
- Wrote the dated architecture spec at `.agent/docs/plans/2026-04-30/METABALL_GRID_REPLACEMENT_ARCHITECTURE_SPEC_2026-04-30.md`.
- Recorded the recommendation in `FEATURE_STATUS.md`, `DECISIONS.md`, today's session docs, and `.agent/AGENT.md`.
- Implemented an additive replacement mode, `metaball_grid_phase_field`, in the live render-family runtime.
- Wired the new mode through `territoryRenderModeCatalog.ts`, `GameCanvas.svelte`, `ControlsSection-Territory.svelte`, `ControlsSection-Diagnostics.svelte`, `MetaballGridTuning.svelte`, `inAppConquestBench.ts`, `game.config.ts`, and `metaballGridStats.ts`.
- Verified the new family and runtime wiring with installed workspace dependencies. `bun run check` still fails on pre-existing repo errors outside this sprint; the touched Svelte files only reported existing unused-selector warnings, and `bunx tsc --noEmit -p tsconfig.json` showed no hits for `MetaballGridPhaseFieldFamily.ts`.
- Fixed chained-conquest replay by removing the stable PRE-cache freeze for active phase-family transitions in `GameCanvas.svelte`.
- Removed the hidden phase-field propagation override so `Propagation Shape` is now a real runtime choice instead of a false UI surface.
- Added phase-field finish-tail controls and runtime support for PRE fade timing, cell-size collapse timing, final cell size, and frontier fade timing.
- Set the live tuning baseline to frontier propagation, territory-edge borders, frontier highlight on, and a 1px final cell-size collapse so the mode has a legible starter state without hard-locking those shared controls.
- Restored real border semantics in phase field by splitting frontier highlight into its own dedicated toggle and adding a real border overlay layer that honors shared border width/alpha/HSL and grid-border tuning.
- Split duplicated Territory settings into a dedicated `Territory Topology` panel plus a pure `Territory Styles` panel.
- Switched the default phase-field `territory_edge + centered-blended` border path to canonical geometry frontier/world-border polylines so the default border look follows actual territory truth instead of the grid-owned fallback edge builder.
- Added a dedicated top-level `Phase Field` settings section that appears only when `metaball_grid_phase_field` is active, auto-opens on first reveal, and hides the generic `Territory Styles` panel for that mode.
- Replaced the phase-field reuse of generic territory surface tuning with a truthful surface card that exposes only live controls:
  - fill SLA
  - border SLA
  - live border-state readout
  - the existing active `MetaballGridTuning` stack
- Removed dead/misleading phase-field surfaces from the UI path:
  - the generic fill enable toggle
  - GPU blur
  - blur-affects-borders
  - shared `METABALL_CHAIKIN_PASSES`
- Fixed the settings shell so hidden sections no longer keep rendering just because they were previously open in `sectionOrder`.
- Corrected the phase-field fill architecture so shared cell-shape controls now drive the actual visible fill surface:
  - PRE and POST render textures now paint real cell-pattern ownership layers,
  - those patterned layers are clipped by resolved geometry,
  - the conquest composite remains local, but `Cell Shape` / `Cell Inset` / `Square Corner` are no longer just mask-side effects.
- Corrected the follow-up regression where visible fill was still being sampled from the conquest scheduler lattice:
  - phase field now uses a separate cached presentation classification for visible PRE/POST fill,
  - `Transition Spacing` remains the scheduler-density control,
  - `Pattern Spacing` now controls the actual visible fill lattice density.
- Restored `Show Underlying Geometry` as a true global Diagnostics control and generalized the runtime overlay so it draws the current active territory mode's geometry instead of only perimeter-field.
- Corrected `Inward Offset` so phase-field fill contraction is geometry-level and derived from the resolved territory boundary after MSR/CX/DX/LP, not from a renderer-local edge-cell heuristic.
- Fixed the shared geometry chain walk used by fill reconstruction and shell-loop assembly:
  - owner-boundary junction traversal is now planar-adjacent instead of insertion-order dependent,
  - effectively closed owner loops are claimed before open spurs,
  - the diagnostics shell-loop overlay should stop taking wrong LP/CX junction branches and backtracking.

## Next
- Run in-app visual QA against the final shared chain-walk build, especially at LP/CX-heavy seams where `Show Underlying Geometry` previously showed multiple loops and wrong-way excursions.
- Verify that the current phase-field surface contract is now truthful at rest and during conquest:
  - geometry overlay
  - smooth borders
  - fill inset
  - pattern lattice
- Continue live tuning of the cell-pattern surface and conquest finish-tail controls.
- Decide whether `metaball_grid_phase_field` remains a comparison mode or becomes the main replacement path for `metaball_grid`.
- If accepted, harden the composite path further toward an owner/palette texture renderer and reduce remaining vector fallback cost.
