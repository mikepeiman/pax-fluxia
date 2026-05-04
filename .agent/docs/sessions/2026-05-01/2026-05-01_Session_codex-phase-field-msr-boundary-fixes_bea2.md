# Session - 2026-05-01

## Focus
- Audit the phase-field border/fill misalignment instead of continuing to guess at border tuning.
- Record the actual active geometry engine and file path feeding `metaball_grid_phase_field`.

## Facts
- Live settings currently select:
  - `TERRITORY_RENDER_MODE = metaball_grid_phase_field`
  - `PERIMETER_FIELD_GEOMETRY_SOURCE = power_voronoi_0319`
- Phase field is not using a separate geometry engine. It consumes the shared render-family geometry snapshot built from the weighted power-voronoi pipeline.
- The active path is:
  - `GameCanvas.svelte`
  - `buildFamilyGeometry.ts`
  - `Geometry_0319.ts`
  - `minStarMargin.ts`
  - `MetaballGridPhaseFieldFamily.ts`

## Work Done
- Traced the active geometry-source selection in `common/resources/settings-live/current-settings.json` and `GameCanvas.svelte`.
- Confirmed `buildPerimeterFieldRenderFamilyGeometry(...)` in `buildFamilyGeometry.ts` is the dispatch layer feeding the phase-field family.
- Confirmed the underlying geometry engine is the weighted Voronoi / power-diagram stack in:
  - `Geometry_0319.ts`
  - `powerVoronoiTerritoryGeometryGenerator.ts`
- Traced the phase-field steady-state fill path and confirmed it draws `currentGeometry.territoryRegions`.
- Traced the smooth border path and confirmed it draws `currentGeometry.frontierPolylines` plus `currentGeometry.worldBorderPolylines`.
- Audited the geometry compiler and confirmed those products diverge before rendering:
  - fill polygons are built from frontier chains,
  - then `applyExplicitMinStarMargin(...)` mutates only the fill polygons,
  - border polylines are not rebuilt after that deformation.
- Audited conquest-time masking and confirmed `buildGridClassification(...)` uses nearest-owned-star fallback to fill polygon-coverage gaps, including MSR/moat gaps around stars.

## Diagnosis
- Primary cause of the visible misalignment:
  - fills are post-MSR,
  - smooth borders are pre-MSR,
  - so fills can jut past borders in steady state.
- Secondary cause during conquest:
  - the grid-based PRE mask uses nearest-owned-star fallback,
  - so transition ownership coverage can temporarily extend beyond the smooth border surface.
- Failed assumption:
  - `currentGeometry` looked like one coherent ownership surface,
  - but phase field is actually consuming multiple related surfaces that are no longer guaranteed to align.

## Validation
- Source audit only
- No runtime code changed in this pass
- Updated `.agent/AGENT.md` with the same diagnosis for merge-safe handoff

## Open
- If fills are authoritative, borders need to be regenerated from the same post-MSR ownership surface.
- If smooth borders remain sourced from separate frontier polylines, MSR and nearest-star fallback must stop extending fill ownership independently of those borders.

## Update - Fill-Following Border Implementation

### Facts
- The needed pre-render artifact already existed in the shared geometry contract: `shellLoops`.
- `shellLoops` are already shaped by the same final geometry surfaces that fills use, so they are the right source for fill-aligned territory borders.
- A renderer-local centerline workaround would have violated the user intent for geometry-consistent boundary tuning.

### Work Done
- Added `resolveTerritoryBorderLoops(...)` in `src/lib/territory/geometry/resolveTerritoryBorderLoops.ts`.
- Encapsulated fill-following border-loop resolution there:
  - prefer `shellLoops`,
  - preserve hole-loop direction via alignment,
  - fall back to `territoryRegions`.
- Swapped `MetaballGridPhaseFieldFamily.ts` to draw phase-field smooth borders from the resolved border loops instead of `frontierPolylines/worldBorderPolylines`.
- Added a masked PRE border layer so PRE fill carries matching borders during conquest where the PRE mask is active.
- Updated the phase-field control copy so it now says the direct thing:
  - `Fill-following territory borders`
  - `Per-owner border loops follow the final territory fill outline`
- Added a focused test file for the shared resolver.

### Validation
- `bunx vitest run ./src/lib/territory/geometry/resolveTerritoryBorderLoops.test.ts`
- `git diff --check`
- stale-copy sweep under `src/lib/components/ui/settings`

### Open
- In-app visual QA is still needed.
- If transition-time PRE mask coverage still extends beyond the displayed border in edge cases, the remaining issue is the nearest-owned-star fallback in grid classification, not the old smooth-border centerline path.

## Update - Singular Constraint-Aligned Centerline Borders

### Facts
- The earlier shell-loop stroke pass was not the correct final behavior.
- It fixed one problem and created another:
  - borders followed fill surfaces,
  - but they became owner-side double strokes instead of a singular shared border.
- Screenshot review confirmed the user-visible failure immediately.

### Work Done
- Removed the shell-loop border helper and its test.
- Added `resolveConstraintAlignedFrontiers(...)` in `src/lib/territory/geometry/resolveConstraintAlignedFrontiers.ts`.
- Implemented a shared pre-render resolution path that:
  - starts from `frontierPolylines` / `worldBorderPolylines`,
  - applies the same MSR displacement logic used by constrained fills,
  - collapses inter-owner frontiers back to one centerline by averaging the two owner-side constrained positions,
  - keeps world borders on the owner-side constrained edge.
- Swapped phase field to use that singular centerline path for `territory_edge + blend on`.
- Removed the extra PRE border overlay from that branch so the mode cannot stack two smooth border paths at once.
- Updated the phase-field settings copy to say the actual visible behavior: one blended centerline border aligned to the constrained fill boundary.

### Validation
- `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedFrontiers.test.ts`
- `git diff --check`
- source sweep confirming removal of the wrong loop-stroke branch

### Open
- In-app visual verification is still needed on the actual map.
- If fills still visibly overshoot the singular centerline after this pass, the remaining bug is in the fill surfaces themselves, not in the smooth border presentation path.

## Update - Unified Constraint-Aligned Render Geometry

### Facts
- The remaining screenshot seam was not just a bad stroke.
- Phase field was still mixing three ownership surfaces:
  - raw fill textures from `territoryRegions`,
  - a resolved singular border path,
  - raw-geometry grid classification.
- That meant the mode could still show slight fill overlap, midpoint border placement, and unjoined border sections even after the earlier centerline pass.

### Work Done
- Removed `resolveConstraintAlignedFrontiers(...)`.
- Added `resolveConstraintAlignedTerritoryGeometry(...)` in `src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.ts`.
- The new helper:
  - resolves one shared junction position per endpoint from the incident owners,
  - aligns all shared/world border polylines to that welded endpoint set,
  - rebuilds territory fill regions from those adjusted frontiers.
- Rewired `MetaballGridPhaseFieldFamily.ts` so phase field now uses the resolved geometry artifact for:
  - PRE and NEXT fill textures,
  - steady-state vector fill,
  - grid classification.

### Validation
- `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `git diff --check`
- filtered `bun run check` showed no new hits for the new helper or the phase-field family

### Open
- In-app screenshot comparison is still needed against the green-blue seam and the green-blue-purple junction.
- If junction joins still look bad after this pass, the next target is explicit multi-owner junction paint rather than another border-path rewrite.

## Update - Lane-Pair Spur Frontier Cleanup

### Facts
- The remaining artifact class was not another fill/border surface split.
- It was a border-input cleanup problem: the helper still painted every aligned frontier fragment, including fragments that never survived into the resolved fill boundary.
- CX / lane-pair virtual sites are a plausible source for these short extra fragments.

### Work Done
- Reworked `resolveConstraintAlignedTerritoryGeometry.ts` again.
- The helper now:
  - builds provisional aligned frontiers,
  - rebuilds resolved territory regions from them,
  - filters out any frontier/world polyline whose segment chain does not actually appear on a resolved region boundary,
  - then realigns once more on the filtered set.
- Added a focused test for a disconnected spur frontier that must disappear while the real border remains.

### Validation
- `bunx vitest run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `git diff --check`
- filtered `bun run check` showed no new hits for the helper or the phase-field family

### Open
- In-app verification is still needed on the exact orange-magenta and blue-purple-style stub cases from the screenshot.

## Update - Display Borders Now Assemble From Final Fill Boundaries

### Facts
- The last lane-pair artifact survived because the smooth border branch was still stroking filtered frontier fragments directly.
- That meant visible border assembly was still upstream-fragment-driven, even after the fill/border surfaces were unified.
- For the user-visible path, the right truth is the final resolved territory-region boundary, not the original fragment list.

### Work Done
- Reworked `resolveConstraintAlignedTerritoryGeometry.ts` again.
- The helper now derives display border segments from `territoryRegions` themselves.
- Those segments are then:
  - classified as inter-owner vs world,
  - grouped by owner pair,
  - chained into longer visible border polylines,
  - culled when they are short open inter-owner spur chains at multi-owner junctions.
- `MetaballGridPhaseFieldFamily.ts` now strokes only:
  - `displayFrontierPolylines`
  - `displayWorldBorderPolylines`
- Raw aligned frontier polylines remain for fill reconstruction, but no longer directly dictate the visible smooth border path.

### Validation
- `node_modules/.bin/vitest.exe run ./src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.test.ts`
- `git diff --check`
- filtered `bun run check` showed no new hit for the helper or the phase-field family; only existing baseline repo errors remained.

### Open
- In-app verification is still needed on the exact lane-pair seam from the screenshot.
- If a tiny segment still remains after this pass, it is likely a true resolved fill-boundary wedge and needs geometry-level collapse rather than another border-assembly tweak.

## Update - Phase Field Cell Shape Cache Fix

### Facts
- The `Cell Shape` controls were not dead at the settings layer.
- Phase field was reading them, but the transition-mask render texture reused a stale cache key that did not include primitive shape.
- That made `square / circle / diamond / hex` look broken unless some unrelated change also invalidated the mask texture.

### Work Done
- Patched `MetaballGridPhaseFieldFamily.ts`.
- The mask-texture signature now includes:
  - `cellShape`
  - `transitionHexR`
- No steady-state geometry behavior was changed; this pass only restores live conquest-mask refresh for the shape-driven overlay.

### Validation
- `git diff --check`
- filtered `bun run check` showed no new hit for `MetaballGridPhaseFieldFamily.ts`

### Open
- In-app verification is still needed while an actual conquest is active.
- Shape controls in phase field still only affect the conquest cell overlay and grid-edge fallback borders, not the smooth geometry-driven steady-state fill.

## Update - Phase Field Fill Is Now Actually A Cell Pattern

### Facts
- The prior diagnosis was correct: the phase-field mode was not using `Cell Shape` as a real fill-style control.
- PRE and POST were rendered as smooth geometry fills, while cell primitives only shaped the conquest mask.
- That meant the controls were technically live in runtime but product-dead.

### Work Done
- Reworked `MetaballGridPhaseFieldFamily.ts`.
- Added reusable ownership-scene builders for PRE and POST cell fills.
- Added shared cell-scene painting that uses:
  - `METABALL_GRID_CELL_SHAPE`
  - `METABALL_GRID_CELL_INSET_PX`
  - `METABALL_GRID_CELL_CORNER_PX`
  - `METABALL_GRID_INWARD_OFFSET_PX`
- PRE and POST render textures now paint actual cell-pattern territory surfaces.
- Those cell-pattern layers are clipped by the resolved constraint-aligned geometry so the boundary still follows geometry-layer truth.
- The conquest composite remains the same high-level structure:
  - POST patterned territory as the base layer
  - PRE patterned territory revealed locally through the conquest mask
- Vector fallback now also uses the cell pattern as the visible base fill.

### Validation
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- In-app verification is still needed to confirm the renderer-path mask + geometry-clip combination behaves correctly at runtime.
- If any artifact remains, the next likely target is how Pixi masking composes the offscreen source containers, not the cell-shape wiring itself.

## Update - Phase Field Needs A Separate Presentation Lattice

### Facts
- The regression was not a cache bug or a dead slider bug.
- I had made visible fill read from the conquest scheduler lattice by bucket-picking one representative cell per larger region.
- With live settings still at `METABALL_GRID_SPACING_PX = 4` and `METABALL_GRID_CELL_INSET_PX = 19`, that produced a sparse tiny-dot surface and made the shape controls feel fake.
- The real design error was coupling two different concerns:
  - conquest timing density
  - visible fill-pattern density

### Work Done
- Reworked `MetaballGridPhaseFieldFamily.ts` again.
- Restored the ownership-scene builder so it emits a full set of presentation cells instead of a bucket-picked subset.
- Added a separate cached pattern classification for phase field.
- The pattern classification now uses:
  - resolved PRE/NEXT geometry,
  - `METABALL_GRID_PATTERN_SPACING_PX`,
  - origin mode,
  - distribution,
  - jitter
- The conquest scheduler still uses the dense transition classification driven by `METABALL_GRID_SPACING_PX`.
- PRE and POST visible territory textures now paint from the pattern classification, while the conquest mask still uses the scheduler classification.
- Repaired `MetaballGridTuning.svelte` after the failed UI patch and exposed:
  - `Transition Spacing` for conquest timing density
  - `Pattern Spacing` for visible fill density
- Raised the phase-field default pattern spacing to `64` so legacy inset values no longer immediately collapse into fine noise.

### Validation
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- In-app verification is still needed to confirm the visible fill now behaves like a real lattice-style surface instead of a sampled dot field.
- If any specific shape control still appears weak after this pass, the next audit target is the exact interaction between pattern spacing, inset clamp, and boundary-role sizing.

## Update - Transition Snap Was A 1px Mask Regression

### Facts
- The conquest transition path itself had not been deleted.
- The regression was that the scheduler-side transition mask was still using fill-style inset sizing.
- With the live settings at:
  - `METABALL_GRID_SPACING_PX = 4`
  - `METABALL_GRID_CELL_INSET_PX = 19`
- the transition mask size collapsed to `1px`.
- That made the PRE reveal and frontier accent effectively invisible, so conquest looked like a hard snap.

### Work Done
- Reworked the transition-size logic in `MetaballGridPhaseFieldFamily.ts`.
- Added a dedicated transition-cell-metrics helper.
- Transition cells now size from:
  - scheduler spacing
  - finish-collapse controls
- They no longer inherit fill-style inset shrink.
- The fill-style controls still shape the PRE/POST patterned territory textures themselves.

### Validation
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- In-app verification is still needed with the user's current live settings to confirm the reveal is visible again.
- The fill may still read as a tiny-dot field until the user raises `Pattern Spacing` or lowers `Cell Inset`; that is now a presentation choice, not a transition-visibility bug.

## Update - Pattern Spacing Contract + Presentation Edge Offset

### Facts
- The visible spacing contract still had two mismatches after the presentation-lattice split:
  - `Pattern Spacing` needed to sit directly beside `Transition Spacing` in the UI because they are sibling concepts.
  - UI and runtime still disagreed on the usable `Pattern Spacing` range until the runtime-side clamp was removed.
- `Inward Offset` was still wrong in a second way before the geometry-level correction:
  - it was keyed to presentation ownership-edge cells,
  - which made it a renderer-local cell heuristic instead of a true geometry contraction.

### Work Done
- Tightened the `Pattern Spacing` control contract in `MetaballGridTuning.svelte`:
  - moved it adjacent to `Transition Spacing`,
  - opened the range to `1..64`,
  - kept `1px` steps through `24`,
  - snapped to `4px` detents above `24`.
- Matched the same snapped range in `MetaballGridPhaseFieldFamily.ts` so runtime stopped silently forcing `>=16`.
- Rewired the then-current fill-offset path to read the visible PRE/NEXT presentation lattice instead of conquest-role cells.

### Validation
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- This pass improved the spacing contract, but it still did not satisfy the user's actual `Inward Offset` spec.
- That spec required a geometry-level inset after MSR/CX/DX/LP, which was handled in the later corrected inset-geometry pass below.

## Update - Diagnostics Geometry Toggle Became A Global Control

### Facts
- The first "restore" of `Show Underlying Geometry` only hardened a perimeter-only composition path.
- That was insufficient because the user requirement was global:
  - the control belongs in Diagnostics, not a mode-specific tuning panel,
  - it must draw for the currently active territory mode.

### Work Done
- Added a deterministic perimeter-only diagnostics mode to `PerimeterFieldTuning.svelte` so stale module-chip state could not hide the underlying-geometry toggle inside the perimeter wrapper.
- Then corrected the surface entirely:
  - promoted `Show Underlying Geometry` to top-level Diagnostics in `ControlsSection-Diagnostics.svelte`,
  - removed the duplicate toggle from `PerimeterFieldTuning.svelte`,
  - generalized the runtime overlay in `GameCanvas.svelte` so it draws current geometry for the active territory mode, not only `perimeter_field`.
- Left perimeter-only extras such as vstars and alternate-geometry overlays scoped to perimeter diagnostics.

### Validation
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- User visual QA is still needed on the live active mode, but the control is now in the correct global location and is no longer hidden behind mode-specific settings state.

## Update - Corrected Inward Offset To A Resolved-Geometry Fill Inset

### Facts
- The prior phase-field `Inward Offset` implementation was still wrong.
- It was shrinking ownership-boundary cells in the renderer instead of contracting the resolved fill surface.
- The user restated the intended spec clearly:
  - apply the offset after MSR/CX/DX/LP,
  - produce one continuous inset fill surface,
  - render the cell pattern inside that inset surface,
  - leave borders on the resolved shared boundary.

### Work Done
- Added a shared geometry helper: `buildInsetTerritoryRegions.ts`.
- The helper samples along the already-resolved territory boundary and rebuilds an inward offset ring from that geometry.
- Rewired `MetaballGridPhaseFieldFamily.ts` so PRE/NEXT pattern fill is clipped by that inset geometry.
- Removed the fill-side `edgeVIds` / boundary-cell shrink path from phase field.
- `Cell Inset` still controls per-cell shrink.
- `Inward Offset` now controls only the geometry-level fill contraction.
- Updated `MetaballGridTuning.svelte` copy so the control no longer claims to act on edge cells.

### Validation
- `bunx vitest run ./src/lib/territory/geometry/buildInsetTerritoryRegions.test.ts`
- `git diff --check`
- filtered `bun run check`
- filtered `bunx tsc --noEmit --pretty false`

### Open
- In-app verification is still needed to confirm the visible gap now reads correctly between the resolved border path and the patterned fill.
- The no-renderer direct fallback remains less faithful than the render-texture path during active conquest because the sprite-mask composite path is the production path.

