# 2026-05-02 Session

## Focus

- Diagnose the geometry-level cause of broken "Show Underlying Geometry" outlines in `metaball_grid_phase_field`.
- Fix the shared owner-loop walk so geometry diagnostics, fill reconstruction, and topology consumers stop following wrong junction branches.

## What I Verified

- The Diagnostics overlay is drawing `shellLoops` when available via `GameCanvas.svelte` `getPerimeterDebugLoops(...)`.
- In the live settings, `TERRITORY_RENDER_MODE=metaball_grid_phase_field` and `PERIMETER_FIELD_GEOMETRY_SOURCE=power_voronoi_0319`.
- `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY=true` and `PERIMETER_FIELD_DEBUG_SCRUB_ENABLED=false`, so the overlay artifact is current geometry, not a scrub blend.
- In this geometry-source path, `shellLoops` are adapted directly from `mergedTerritories`, so malformed owner loops in the overlay point back to shared geometry assembly rather than a phase-field-only paint issue.

## Root Cause

- `constructFillsFromFrontierChain(...)` depends on `executeChainWalk(...)`.
- `executeChainWalk(...)` was still walking owner boundaries by taking the first unused candidate at a junction that mentioned the owner.
- That is insertion-order dependent.
- At LP/CX-heavy junctions, it can jump from the true boundary onto a spur or wrong outgoing frontier, then double back or form redundant owner loops.

## Implementation

- Updated `src/lib/territory/compiler/chainWalkCore.ts`.
- Added owner-specific directed polyline arcs built from the combined shared/world frontier polylines.
- Reused the planar-walk helpers from `planarWalk.ts` to choose the clockwise-adjacent outgoing arc instead of the first candidate.
- Changed owner-loop harvesting to take effectively closed loops first, so an open spur cannot consume the real boundary loop before it is assembled.
- Left remaining unclosed leftovers as secondary open-loop artifacts only after closed owner loops are claimed.

## Why This Layer

- This is the shared chain-walk core used by:
  - fill reconstruction via `constructFillsFromFrontierChain(...)`
  - frontier-map assembly
  - power-voronoi topology adaptation
- Fixing it here keeps diagnostics, geometry, and render-family consumers aligned instead of papering over the issue in phase-field alone.

## Validation

- `bunx vitest run ./src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts`
- `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `bunx vitest run ./src/lib/territory/geometry/buildInsetTerritoryRegions.test.ts`

## Notes

- The previously existing test `"walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur"` was failing before the patch and now passes.
- No live settings were modified or committed.

## Additional Focus

- Diagnose why `MSR` still behaved backwards in the live `power_voronoi_0319 -> phase_field` path even after the junction-walk fix.
- Stop trusting owner-local post-MSR loops when the mode needs one shared resolved boundary surface.

## Additional Root Cause

- `MODIFIED_VORONOI_STAR_MARGIN` was still overloaded in the 0319 power-voronoi path.
- The same MSR value was being reused for:
  - power-voronoi real-site weight scale
  - corridor/disconnect virtual-site weight scale
  - contested midpoint-pair spacing in `computeCorridorVirtuals(...)`
- That meant moving the MSR slider changed more than star clearance.
- Separately, the generator still applies explicit MSR to merged owner fill loops after frontier-based fill construction.
- Those owner-local loops were then being treated as authoritative by the resolver and Diagnostics when `territoryRegions` were present.

## Additional Implementation

- Added `src/lib/territory/compiler/powerVoronoiWeighting.ts` so the live power-voronoi path uses a stable base weight radius instead of `starMargin^2`.
- Updated:
  - `src/lib/territory/compiler/Geometry_0319.ts`
  - `src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
  - `src/lib/renderers/territoryFeatures.ts`
- `computeCorridorVirtuals(...)` now defaults contested midpoint-pair spacing from corridor spacing, not MSR.
- Added `preferSharedBoundaryResolution` to `resolveConstraintAlignedTerritoryGeometry(...)`.
- `MetaballGridPhaseFieldFamily.ts` now forces shared-boundary resolution for PRE/NEXT geometry.
- `GameCanvas.svelte` now forces the same resolution path for global `Show Underlying Geometry`.
- Added a targeted test proving the resolver can ignore stale owner-local loops and rebuild from shared frontiers.

## Additional Validation

- `bunx vitest run ./src/lib/territory/compiler/powerVoronoiWeighting.test.ts ./src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `bunx tsc --noEmit --pretty false` filtered for touched files showed no hits
- `git diff --check` returned only the pre-existing LF->CRLF warnings

## Additional Notes

- This pass is intentionally scoped to the live phase-field / global Diagnostics seam, not a full repo-wide rewrite of every legacy power-voronoi renderer.
- Live settings remain dirty and uncommitted by design.

## Shared Geometry Reset

## What I Verified

- `buildPerimeterFieldRenderFamilyGeometry(...)` was still adapting raw `Geometry_0319` `mergedTerritories/sharedPolylines/worldBorderPolylines` directly into the live `CanonicalGeometrySnapshot`.
- `MetaballGridPhaseFieldFamily.ts` was then re-running `resolveConstraintAlignedTerritoryGeometry(...)` locally for PRE/NEXT geometry.
- `GameCanvas.svelte` `Show Underlying Geometry` was also re-running its own late resolution path.
- That meant one live 0319 frame could have three geometry interpretations:
  - raw adapted snapshot
  - phase-field-local resolved seam
  - diagnostics-local resolved seam

## Root Cause

- The structural problem was not one more bad border formula.
- The live 0319 path had no single authority seam.
- `mergedTerritories` had already been owner-locally postprocessed, while shared frontiers/world borders remained a separate upstream truth.
- Consumers were free to choose whichever surface they preferred and then â€œrepairâ€ the mismatch locally.

## Implementation

- Added `src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.ts`.
- That helper now owns the post-0319 live seam:
  - raw shared frontiers/world borders in
  - shared-boundary resolution once
  - resolved regions/topology/display-border chains out
- Replaced the old raw adapter path in `src/lib/territory/families/buildFamilyGeometry.ts`.
- Added stage-explicit diagnostics to `GeometryContracts.ts`:
  - `raw_shared_frontiers`
  - `raw_world_borders`
  - `resolved_shared_boundary_frontiers`
  - `resolved_regions`
  - `display_borders`
- Added `src/lib/territory/geometry/geometryStageLadder.ts` so overlay labels/selection are centralized instead of redefined ad hoc.
- Updated `MetaballGridPhaseFieldFamily.ts` to read resolved authority geometry from the snapshot when available instead of re-resolving 0319 snapshots locally.
- Updated `GameCanvas.svelte` + `ControlsSection-Diagnostics.svelte` so `Show Underlying Geometry` is now a stage-selectable overlay rather than one ambiguous loop draw.
- Updated `perimeterFieldGeometryArtifact.ts` so exported diagnostic packages serialize the same stage ladder side-by-side.

## Validation

- `bunx vitest run ./src/lib/territory/geometry/buildPowerVoronoi0319AuthoritySnapshot.test.ts ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts ./src/lib/territory/families/buildFamilyGeometry.test.ts ./src/lib/territory/compiler/powerVoronoiWeighting.test.ts`
- `bunx tsc --noEmit --pretty false` filtered for touched files showed no new hits beyond the existing repo-baseline `game.config.ts` mismatch
- `git diff --check` returned only the pre-existing LF->CRLF warnings

## Notes

- This pass deliberately moves authority earlier instead of adding another renderer-local border/fill repair.
- `mergedTerritories` are no longer treated as live truth for 0319 consumers; they are retained only as raw/diagnostic context.
- The remaining ask is in-app visual QA against the new stage ladder:
  - raw vs resolved vs display at the same seam
  - `MSR=0 / mid / high`
  - LP/CX-heavy junctions

