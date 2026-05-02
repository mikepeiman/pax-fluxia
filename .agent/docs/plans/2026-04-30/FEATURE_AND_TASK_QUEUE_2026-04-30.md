# Feature And Task Queue - 2026-04-30

## Executive Summary

- This branch is the originator and owner of `metaball_grid_phase_field`. That mode did not exist on the branch point from `master`; this branch defines its runtime, settings surface, diagnostics, and geometry dependencies.
- `metaball_grid_phase_field` is not just a cosmetic variant of `metaball_grid`. It is a conquest-local `PRE/POST` compositing mode with a deterministic grid scheduler, explicit propagation/timing/pattern controls, dedicated settings, and its own border/fill behavior.
- The late critical work is shared geometry-core, not renderer-local polish. The mode exposed faults in `power_voronoi_0319`, so this branch now also owns the authority reset that makes fills, borders, diagnostics, and MSR behavior derive from one resolved shared-boundary seam.
- Merge status: the tracked code path is committed and pushed through `f3c27f3db` on `codex/phase-field-msr-boundary-fixes`. Live `current-settings.json` remains intentionally uncommitted local state.

## Merge Handoff

### Primary Merge Unit

- `metaball_grid_phase_field` plus the shared `power_voronoi_0319` authority seam it depends on.
- Do not treat the mode as safely portable without the geometry reset. Earlier renderer-local fixes were exploratory, but the branch conclusion is clear: the mode is only trustworthy when all current 0319 live consumers read the same resolved shared-boundary snapshot.

### What This Branch Introduced

- New territory mode:
  - `metaball_grid_phase_field`
- Runtime / render-family integration:
  - `GameCanvas.svelte`
  - `territoryRenderModeCatalog.ts`
  - `MetaballGridPhaseFieldFamily.ts`
- Dedicated Phase Field UX surface:
  - `TerritoryPhaseFieldSettings.svelte`
  - reworked `MetaballGridTuning.svelte`
  - split `Territory Topology` vs `Territory Styles`
  - removal of dead / duplicate / misleading controls
- Diagnostics rework:
  - dedicated `Phase Field` top-level settings section
  - global `Show Underlying Geometry` diagnostics toggle
  - explicit geometry stage selector
  - shared geometry artifact export using the same stage ladder
- Geometry / border / fill work required by the mode:
  - geometry-level inset fill helper for `Inward Offset`
  - chain-walk junction fix so shell loops and fill reconstruction stop taking wrong spurs at LP/CX-heavy junctions
  - MSR decoupling from power-voronoi weighting / midpoint spacing
  - one shared post-0319 authority seam for resolved frontiers, regions, and display borders

### Required Merge Surfaces

#### Phase Field Mode Ownership

- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`

#### Shared Geometry Authority Support

- `pax-fluxia/src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.ts`
- `pax-fluxia/src/lib/territory/geometry/geometryStageLadder.ts`
- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`
- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
- `pax-fluxia/src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.ts`
- `pax-fluxia/src/lib/territory/geometry/buildInsetTerritoryRegions.ts`
- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts`
- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
- `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
- `pax-fluxia/src/lib/territory/compiler/powerVoronoiWeighting.ts`
- `pax-fluxia/src/lib/renderers/territoryFeatures.ts`

#### Diagnostics / Artifact Surfaces

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
- `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`

### What Is Secondary

- Large parts of the branch outside the files above are supportive or historical, but not the defining merge unit.
- If merge pressure is high, protect the Phase Field runtime plus the shared geometry-authority seam first. That is the branch's actual product.

### Validation Summary

- Geometry / helper tests run and passing:
  - `bunx vitest run ./src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts`
  - `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
  - `bunx vitest run ./src/lib/territory/geometry/buildInsetTerritoryRegions.test.ts`
  - `bunx vitest run ./src/lib/territory/families/buildFamilyGeometry.test.ts`
  - `bunx vitest run ./src/lib/territory/compiler/powerVoronoiWeighting.test.ts`
- Repeated hygiene checks:
  - `git diff --check`
  - filtered `bun run check`
  - filtered `bunx tsc --noEmit --pretty false`
- Not yet done:
  - authoritative in-app visual QA after the final shared 0319 authority reset

### Remaining Post-Merge Validation

- Use the new stage-explicit Diagnostics ladder to compare:
  - `Raw Shared Frontiers`
  - `Raw World Borders`
  - `Resolved Shared-Boundary Frontiers`
  - `Resolved Regions`
  - `Display Borders`
- Verify that `power_voronoi_0319` live consumers now stay on one authority seam:
  - phase-field classification
  - phase-field visible borders
  - global `Show Underlying Geometry`
  - geometry artifact export
- Verify `Show Underlying Geometry` no longer shows duplicate/backtracking owner loops or owner-local seam drift at LP/CX-heavy seams.
- Verify increasing `MSR` preserves more, not less, clearance around owner stars in the live 0319 path.
- Verify phase-field conquest still reads well after the shared 0319 authority reset:
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
- Implemented the shared `power_voronoi_0319` geometry reset:
  - added `buildPowerVoronoi0319AuthoritySnapshot.ts` as the one post-0319 authority seam for live consumers
  - stopped adapting raw `mergedTerritories` directly into the live canonical snapshot
  - added a geometry stage ladder contract plus shared helper `geometryStageLadder.ts`
  - rewired phase-field to consume resolved authority geometry from the snapshot instead of re-resolving 0319 locally
  - made `Show Underlying Geometry` stage-selectable and exported the same stage ladder through `perimeterFieldGeometryArtifact.ts`

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
