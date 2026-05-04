# Phase Field Merge Strategy - 2026-05-02

## Purpose

This document answers a different question than the branch handoff.

- The handoff says what this branch owns.
- This strategy says how to bring that work back into `master` with the least risk.

## Bottom Line

Preferred path: merge the whole branch into `master`.

Reason:

- `origin/master` has not advanced since the branch point `cad080942cd19c311f7954fe342e3213663ce1dd`.
- The Phase Field mode and the final `power_voronoi_0319` authority-seam reset are tightly coupled.
- This branch contains exploratory intermediate fixes, reversions, and successive corrections. Replaying them as individual cherry-picks is riskier than merging the final tested branch state.

## Branch Reality

- Branch: `codex/phase-field-msr-boundary-fixes`
- Merge base with `origin/master`: `cad080942cd19c311f7954fe342e3213663ce1dd`
- `origin/master`-only commits since the branch point: none
- Consequence: current merge risk is not "master diverged." The risk is accidentally importing only part of the Phase Field + geometry story.

## Recommended Path

### Option A - Merge The Branch Whole

Use this unless there is a strong reason to exclude broad branch content.

1. `git switch master`
2. `git pull`
3. `git merge --no-ff codex/phase-field-msr-boundary-fixes`
4. Run the post-merge validation checklist in the branch handoff:
   - [2026-05-02_PHASE_FIELD_BRANCH_HANDOFF.md](C:/Users/mikep/.codex/worktrees/bea2/pax-fluxia/.agent/docs/project/handoffs/2026-05-02_PHASE_FIELD_BRANCH_HANDOFF.md)

Why this is the best path:

- It preserves the exact relationship between:
  - the Phase Field runtime
  - its dedicated settings surface
  - global geometry diagnostics
  - the final shared `power_voronoi_0319` authority seam
- It avoids trying to reconstruct which intermediate commits are superseded by later ones.
- It keeps the final tested file graph intact.

## When To Avoid Full Merge

Only avoid Option A if you explicitly want to leave behind broad, unrelated branch content and are willing to do a curated import.

Examples:

- you want only the Phase Field mode and its geometry dependencies
- you do not want the wider perf / HUD / menu / map-editor changes that also live on this branch

## Fallback Path

### Option B - Surgical Import On A Temporary Integration Branch

If you must import selectively, do not replay the entire commit history.

Use a file-group import or a squashed unit import on a temporary branch from `master`.

Recommended temporary branch:

- `codex/phase-field-merge-integration`

### Import Order

#### Unit 1 - Shared Geometry Authority Foundation

Import first, because the final Phase Field runtime depends on it.

Files:

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

Commit landmarks that correspond to this unit:

- `c5b140baa` `fix: move phase-field inward offset into geometry mask`
- `0d49f5ec3` `fix: make geometry chain walk choose adjacent frontiers`
- `ccec2e73d` `fix: decouple msr from shared boundary resolution`
- `f3c27f3db` `refactor: reset 0319 geometry authority seam`

#### Unit 2 - Phase Field Runtime

Import second, after geometry truth exists.

Files:

- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`

Primary landmark commit:

- `b58e55baf` `feat: add phase-field conquest tuning controls`

Important note:

- Many later commits adjust this same runtime file. Do not take `b58e55baf` alone and stop. If you use commit replay at all, Unit 2 must be taken together with the geometry and diagnostics units.

#### Unit 3 - Phase Field Settings Surface

Import third, once the mode id and runtime contract exist.

Files:

- `pax-fluxia/src/lib/components/ui/settings/TerritoryPhaseFieldSettings.svelte`
- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryTopologyTuning.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`

Primary landmark commit:

- `36cc8f5d8` `feat: add dedicated phase-field settings panel`

#### Unit 4 - Global Diagnostics / Geometry Inspection

Import fourth, because this is the way to verify the geometry seam after merge.

Files:

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
- `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`

Primary landmark commits:

- `b88ec22a2` `fix: make underlying geometry a global diagnostic`
- `f3c27f3db` `refactor: reset 0319 geometry authority seam`

### What Not To Do

- Do not cherry-pick every Phase Field commit one by one in chronological order.
- Do not stop after the first "mode exists" commit.
- Do not import the mode without the authority-seam reset.
- Do not trust intermediate border-alignment commits as a final stopping point; many were superseded by the later shared-geometry reset.

### Known History Traps

- `843d69ab5` `fix: refresh phase-field cell shape masks` was reverted by:
  - `d533e1304` `Revert "fix: refresh phase-field cell shape masks"`
- Several mid-chain border/fill commits were exploratory and later replaced by:
  - `ccec2e73d`
  - `f3c27f3db`

## High-Conflict Files

If you do anything other than a straight branch merge, expect manual work here:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`
- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`

## Validation After Merge

### Required Automated Checks

- `bunx vitest run ./src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts`
- `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `bunx vitest run ./src/lib/territory/geometry/buildInsetTerritoryRegions.test.ts`
- `bunx vitest run ./src/lib/territory/families/buildFamilyGeometry.test.ts`
- `bunx vitest run ./src/lib/territory/compiler/powerVoronoiWeighting.test.ts`

### Required In-App Verification

- In `Diagnostics`, inspect:
  - `Raw Shared Frontiers`
  - `Raw World Borders`
  - `Resolved Shared-Boundary Frontiers`
  - `Resolved Regions`
  - `Display Borders`
- Verify `MSR` increases clearance rather than shrinking it.
- Verify Phase Field conquest still animates and does not snap.
- Verify visible borders, displayed geometry, and classification all track the same seam.

## Recommendation Summary

If the goal is to get the branch's actual Phase Field work into `master` with the least chance of breaking it:

- merge the branch whole

If the goal is to extract only the feature:

- import by final file-group units, not by replaying the exploratory fix chain

