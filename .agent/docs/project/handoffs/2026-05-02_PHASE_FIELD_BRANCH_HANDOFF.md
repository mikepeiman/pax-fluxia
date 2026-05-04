# Phase Field Branch Handoff - 2026-05-02

## Purpose

This is the dedicated merge handoff for branch `codex/phase-field-msr-boundary-fixes`.

This branch is the originator and owner of `metaball_grid_phase_field`. The mode did not exist on the branch point from `master`; this branch defines its runtime, settings surface, diagnostics, and geometry dependencies.

## Executive Summary

- `metaball_grid_phase_field` is a new territory render mode, not a cosmetic tweak to `metaball_grid`.
- The mode uses conquest-local `PRE/POST` compositing with a deterministic grid scheduler, explicit propagation/timing/pattern controls, a dedicated settings surface, and its own border/fill behavior.
- The late critical work is shared geometry-core, not renderer-local polish. The mode exposed faults in `power_voronoi_0319`, so this branch now also owns the authority reset that makes fills, borders, diagnostics, and MSR behavior derive from one resolved shared-boundary seam.
- Merge strategy companion:
  - [2026-05-02_PHASE_FIELD_MERGE_STRATEGY.md](C:/Users/mikep/.codex/worktrees/bea2/pax-fluxia/.agent/docs/project/handoffs/2026-05-02_PHASE_FIELD_MERGE_STRATEGY.md)

## Primary Merge Unit

- `metaball_grid_phase_field` plus the shared `power_voronoi_0319` authority seam it depends on.
- Do not treat the mode as safely portable without the geometry reset. Earlier renderer-local fixes were exploratory, but the branch conclusion is clear: the mode is only trustworthy when all current 0319 live consumers read the same resolved shared-boundary snapshot.

## What This Branch Introduced

### New Territory Mode

- `metaball_grid_phase_field`

### Runtime / Render-Family Integration

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`

### Dedicated Phase Field UX Surface

- `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte`
- reworked `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- split `Territory Topology` vs `Territory Styles`
- removed dead / duplicate / misleading controls

### Diagnostics Rework

- global `Show Underlying Geometry`
- explicit geometry stage selector
- shared geometry artifact export using the same stage ladder

### Geometry / Border / Fill Work Required By The Mode

- geometry-level inset fill helper for `Inward Offset`
- chain-walk junction fix so shell loops and fill reconstruction stop taking wrong spurs at LP/CX-heavy junctions
- MSR decoupling from power-voronoi weighting / midpoint spacing
- one shared post-0319 authority seam for resolved frontiers, regions, and display borders

## Required Merge Surfaces

### Phase Field Mode Ownership

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

### Shared Geometry Authority Support

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

### Diagnostics / Artifact Surfaces

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
- `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`

## What Is Secondary

- Large parts of the branch outside the files above are supportive or historical, but not the defining merge unit.
- If merge pressure is high, protect the Phase Field runtime plus the shared geometry-authority seam first. That is the branch's actual product.

## Validation Summary

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

## Remaining Post-Merge Validation

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

## Local-Only Exclusions

- `common/resources/settings-live/current-settings.json` remains intentionally uncommitted live state.
- `.agent-harness/logs/*.jsonl` remain local-only harness logs.

