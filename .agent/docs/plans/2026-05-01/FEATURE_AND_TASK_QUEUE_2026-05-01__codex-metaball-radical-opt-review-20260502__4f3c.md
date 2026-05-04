# Feature And Task Queue - 2026-05-01

## Active

- Audit the live `Perimeter Field` render-family path before changing behavior.
- Treat the userâ€™s observation as ground truth:
  - smooth transition appears lost
  - steady-state geometry is present but badly tuned

## Completed

- Identified the active live geometry/render pipeline for `Perimeter Field`:
  - `GameCanvas.svelte`
  - `buildPerimeterFieldRenderFamilyGeometry(...)`
  - `buildPowerVoronoi0319RenderFamilyGeometry(...)`
  - `computeGeometry0319(...)`
  - adaptation to `CanonicalGeometrySnapshot`
  - `buildPerimeterFieldScene(...)`
  - `PerimeterFieldFamily.update(...)`
  - `MetaballRenderer`
- Confirmed the live geometry source is `PERIMETER_FIELD_GEOMETRY_SOURCE = "power_voronoi_0319"`.
- Diagnosed the main visible regression as a live tuning collapse, not a total loss of transition machinery:
  - `PERIMETER_FIELD_SAMPLE_SPACING = 120`
  - `PERIMETER_FIELD_INFLUENCE_WEIGHT = 0.1`
  - `PERIMETER_FIELD_STAR_METABALL_WEIGHT = 8`
  - approximate star-anchor vs perimeter-sample ratio in live settings is about `138:1`
- Identified one concrete code defect:
  - `PerimeterFieldFamily.ts::readFreezeBaseDuringTransition(...)` ignores the surfaced `false` setting and hard-forces `true`
- Identified one surfaced-control mismatch:
  - `PERIMETER_FIELD_OLD_BOUNDARY_FADE` and `PERIMETER_FIELD_NEW_BOUNDARY_GROW` currently affect only the legacy branch, not the active `plan` transition path
- Wrote the audit into todayâ€™s session docs and the long-running sprint handoff

## Next

- Rebalance `Perimeter Field` shell-vs-star tuning so the perimeter shell can shape the steady-state silhouette again.
- Honor `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` instead of hard-forcing the PREV-base path.
- Decide whether `PERIMETER_FIELD_OLD_BOUNDARY_FADE` and `PERIMETER_FIELD_NEW_BOUNDARY_GROW` should:
  - be wired into the active `plan` engine, or
  - be removed / retired from the active UX surface
- Re-verify `Perimeter Field` visually against `Metaball Grid Phase Edges` after the above repairs land.

## Update - Topology Plan Coverage Repair

### Completed

- Fixed the deterministic `Topology Plan` loop-drop bug that caused zero perimeter Vstars / ignored regions in `Perimeter Field`:
  - normalized frontier-topology loop winding in `buildPowerVoronoiFrontierTopology.ts`
  - added defensive loop normalization in `perimeterFieldPlanEngine.ts`
  - removed the sign-only sampling gate that could cull valid outer loops
- Added focused regression coverage:
  - topology builder test for counterclockwise owner-world loop normalization
  - perimeter-field plan-scene test proving reversed topology winding yields the same V-set
- Focused vitest validation passed for:
  - `buildPowerVoronoiFrontierTopology.test.ts`
  - `buildPerimeterFieldScene.test.ts`
- Cleaned up shared metaball border stroke presentation:
  - `MetaballRenderer.ts` now uses round caps / joins for border strokes in both worker and main-thread paths

### Next

- Re-verify `Perimeter Field` in UI now that dropped topology loops should no longer erase entire territories in `Topology Plan`.
- Audit remaining border-position divergence after this winding fix:
  - cyan underlying geometry
  - dense perimeter Vstar chains
  - rasterized metaball border extraction

## Update - Interior Backfill Repair

### Completed

- Added geometry-derived interior support samples to `Perimeter Field`
- Wired support into:
  - topology-plan steady state
  - topology-plan endpoint equivalence
  - legacy source steady / target scene assembly
- Added focused test coverage proving topology-plan steady state still gets fill support even with star metaballs disabled

### Next

- Verify in live UI whether the new backfill removes the internal owner-vs-empty borders without over-pulling the frontier
- If internal borders still remain in large regions, tune support density / boundary-distance thresholds before touching the shared contour algorithm

## Update - Interior Backfill Reverted

### Completed

- Removed the geometry-derived interior support/backfill experiment from `Perimeter Field`
- Removed its dedicated regression case from `buildPerimeterFieldScene.test.ts`

### Merge guidance

- treat the earlier backfill entry as superseded
- do not merge the support-sample helpers / cache plumbing back in

### Next

- choose a non-metaball fill strategy for `Perimeter Field`
- likely candidates to evaluate next:
  - polygon underlay fill from trusted geometry
  - render-texture or mask-based fill from trusted geometry
  - triangulated mesh fill from trusted geometry

## Update - Owner-mask Fill Landed

### Completed

- Implemented owner-mask fill in the shared metaball renderer
- Scoped `Perimeter Field` to use that fill mode
- Mirrored the change in the worker path
- Fixed the metaball renderer cache fingerprint surface so scene radius, ownership margin, solve bounds, and fill mode all participate

### Why this path

- fill must meet the same metaball-derived borders the mode is already drawing
- underlying geometry fill would have created a deterministic border/fill mismatch

### Next

- verify live `Perimeter Field` with `Star Metaball Power = 0`
- evaluate the remaining transition defect after fill is now aligned to the solved winner grid

## Update - Merged Blended Borders Landed

### Completed

- Implemented scene-level `winnerMode`
- Set `Perimeter Field` to `top-owner` winner classification
- Mirrored that rule in the worker path
- Added cache-fingerprint coverage and regression tests

### Why this was needed

- the prior border split was caused by contested void cells, not by a separate duplicated stroke pass
- collapsing those void bands lets the existing shared border extractor produce one owner-vs-owner blended frontier

### Next

- verify visually that adjacent `Perimeter Field` regions now share one border instead of two diverging borders
- if borders still feel off after this, the next surface is contour placement quality rather than ownership-gap classification

## Update - Interior Remainder Backfill Landed

### Completed

- Added geometry-based remainder fill on the same metaball winner grid
- Remaining unowned cells now get claimed from trusted perimeter geometry before border extraction
- Wired fallback-region generation into `Perimeter Field` scene construction

### Why this path

- keeps metaball ownership shaping where metaballs already reach
- fills the exact remainder cheaply and deterministically
- avoids a separate visible geometry underlay layer

### Next

- verify that the large black interior voids are gone in live `Perimeter Field`
- once fill is stable, re-evaluate transition quality against the now-complete filled state

## Update - Filled-Frontier Border Alignment Landed

### Completed

- added scene-level `borderGeometryMode`
- set `Perimeter Field` to `grid-ribbon`
- switched `Perimeter Field` border presentation from stroked centerlines to exact frontier ribbons drawn from the same final ownership grid as the fill
- tightened style bucketing to include owner pair identity

### Why this path

- the fill was already correct on the ownership grid
- the remaining defect was the border being drawn as a separate centerline presentation layer
- rendering the border as exact frontier ribbons makes border/fill alignment deterministic

### Next

- verify live `Perimeter Field` border placement against the filled edge
- if the border still feels too stair-stepped after alignment is correct, the next pass is contour quality, not ownership or fill correctness

## Update - Branch Review Against Master Completed

### Completed

- created and pushed review branch:
  - `codex/metaball-radical-opt-review-20260502`
- compared the full branch against current `origin/master`
- recorded a merge recommendation in the main 2026-04-30 metaball handoff

### Outcome

- branch is `34` commits ahead of `origin/master`
- branch is too broad and not green enough for wholesale merge
- recommendation is:
  - do **not** merge this branch as-is
  - salvage the validated `Perimeter Field` / shared-metaball subset into a fresh narrow branch

### Next

- if merge work proceeds, extract only the validated territory subset first
- fix remaining typecheck breakage before any PR based on that extracted branch

