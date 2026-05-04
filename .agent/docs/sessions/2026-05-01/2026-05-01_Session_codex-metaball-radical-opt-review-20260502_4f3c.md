# Session Notes - 2026-05-01

## Scope

This session is focused on auditing the live `Perimeter Field` render mode after user-reported regressions:

1. confirm which geometry engine / render-family path is actually live
2. diagnose why smooth conquest transitions appear absent
3. diagnose why steady-state `Perimeter Field` geometry looks badly tuned
4. document findings in merge-safe session artifacts before making any repair

## User Ground Truth

- `Perimeter Field` is the main mode that matters.
- Its smooth transition effect appears lost.
- Its steady-state geometry is present but poorly shaped and badly tuned.
- `Metaball Grid Phase Edges` is a useful healthy visual reference.

## Plan / Spec / Status Alignment

- Active mode under audit: `Perimeter Field`
- Governing mode spec:
  - `.agent/docs/game/territory/PERIMETER_FIELD_MODE_SPEC.md`
  - `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- Current implementation status:
  - the live path is the render-family implementation, not the older canonical bridge path for this mode
  - geometry is coming from the `power_voronoi_0319` family-geometry adapter path
  - scene assembly is then translated into shared metaball samples and rendered through the shared metaball compositor

## Verified Current Geometry / Render Pipeline

### Mode dispatch

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `Perimeter Field` is dispatched through the render-family case
  - it reads family geometry through `readFamilyGeometry()`
  - it builds `RenderFamilyInput`
  - it calls `PerimeterFieldFamily.update(...)`

### Geometry builder

- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
  - `buildPerimeterFieldRenderFamilyGeometry(...)` is the direct geometry entry for this mode
  - current live source resolves to `PERIMETER_FIELD_GEOMETRY_SOURCE = "power_voronoi_0319"`
  - when that source is selected, the builder calls `buildPowerVoronoi0319RenderFamilyGeometry(...)`

### Geometry engine

- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
  - `computeGeometry0319(...)` is the actual geometry engine used by the current live path
- `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
  - provides the territory-generator data/settings contract used by the 0319 path
- `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
  - live tunables are translated into generator settings through `buildTerritoryGeneratorSettingsFromTunables(...)`

### Adaptation into render-family geometry

- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
  - adapts 0319 output into `CanonicalGeometrySnapshot`
  - rebuilds frontier topology through `buildPowerVoronoiFrontierTopology(...)`
  - exposes:
    - `territoryRegions`
    - `shellLoops`
    - `frontierTopology`

### Perimeter-field scene construction

- `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts`
  - `plan` path:
    - consumes `frontierTopology`
    - builds perimeter V samples with `sampleVSetFromGeometry(...)`
  - fallback path:
    - samples `shellLoops` first
    - falls back to `territoryRegions` if needed
  - mixes perimeter-derived samples with star-anchor metaball samples

### Final presentation

- `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - builds steady-state / transition scene input
  - may split into base plus localized overlay
- `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - shared compositor / solve substrate for the final fill + border presentation

## Audit Findings - Transition Loss

### Finding 1: the dominant visible problem is live tuning collapse, not total plan-path removal

Live settings currently loaded from `common/resources/settings-live/current-settings.json`:

- `PERIMETER_FIELD_SAMPLE_SPACING = 120`
- `PERIMETER_FIELD_INFLUENCE_WEIGHT = 0.1`
- `PERIMETER_FIELD_STAR_METABALL_WEIGHT = 8`
- `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION = false`
- `PERIMETER_FIELD_OLD_BOUNDARY_FADE = 0`
- `PERIMETER_FIELD_NEW_BOUNDARY_GROW = 1`

Implications:

- perimeter-shell sampling is extremely sparse relative to the mode defaults
- each perimeter sample is very weak
- star-centered metaballs are extremely strong

With the current star-strength formula in `metaballSceneBase.ts`, a representative owned star around 70 ships produces strength about `13.8` at the current `PERIMETER_FIELD_STAR_METABALL_WEIGHT = 8`.

Compared to `PERIMETER_FIELD_INFLUENCE_WEIGHT = 0.1`, that is roughly a `138:1` ratio in favor of star anchors over individual perimeter shell samples.

Practical result:

- steady-state shape is visually governed by star blobs more than by the perimeter shell
- transition movers can still exist numerically, but their motion is visually drowned by the static star-anchor mass
- this makes the mode read as if it has lost its smooth transition, even when the transition plan path is still emitting dynamic geometry

### Finding 2: there is a real code defect in the freeze-base control path

- `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `readFreezeBaseDuringTransition(...)` currently hard-forces `true`
  - it does this even when the live tunable is explicitly `false`

Practical result:

- the user-facing `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` control is not currently honored
- the family always takes the PREV-base / localized-overlay transition path
- the non-frozen branch cannot currently be evaluated through settings

### Finding 3: two surfaced transition knobs are not active for the current engine

- `PERIMETER_FIELD_OLD_BOUNDARY_FADE`
- `PERIMETER_FIELD_NEW_BOUNDARY_GROW`

These are still read in `buildPerimeterFieldScene.ts`, but they currently affect only the legacy perimeter-source transition branch.

The active `plan` engine path builds:

- movers
- appearing perimeter samples
- disappearing perimeter samples

and does not currently consume those two multipliers.

Practical result:

- `OLD_BOUNDARY_FADE = 0` looks suspicious in live settings, but it is not the main reason the current `plan` transition appears weak
- those knobs are presently misleading if the user expects them to shape the active `plan` transition behavior

## Audit Findings - Steady-State Shape Drift

The steady-state shape problem is explained by the same tuning imbalance:

- shell spacing is too coarse to preserve perimeter contour fidelity
- shell strength is too low to assert the desired field silhouette
- reintroduced star anchors are strong enough to dominate the solve

So the shape drift is not currently pointing to the wrong geometry engine. It points to the right engine feeding a badly balanced sample field.

## Current Conclusion

This is not a single bug.

It is a stack of three separate issues:

1. live tuning imbalance overwhelms the perimeter shell and visually suppresses transition motion
2. the freeze-base toggle is ignored in code
3. two surfaced transition controls are still wired only to the legacy path, not the active `plan` path

## Recommended Repair Order

1. restore sane balance between perimeter shell and star anchors
2. honor `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` instead of forcing `true`
3. decide whether `OLD_BOUNDARY_FADE` / `NEW_BOUNDARY_GROW` should:
   - be retired from the active `plan` UI, or
   - be genuinely wired into the plan transition path

## Work Completed In This Session

1. traced the live `Perimeter Field` geometry/render path end to end
2. identified the current geometry engine and adapter chain
3. separated live-tuning regression from real code-path defects
4. documented the findings in:
   - this session note
   - todayâ€™s takeaways
   - todayâ€™s queue
   - the long-running sprint handoff

## What Has Not Been Done Yet

- no runtime behavior was changed in this audit pass
- no retuning was applied
- no fix for the freeze-base control violation was applied yet
- no UI cleanup was applied yet for legacy-only transition knobs

## Repair Pass - Topology Plan Loop Coverage

### Problem restated

`Perimeter Field` in `Topology Plan` was not merely visually divergent; some valid territories were receiving zero perimeter Vstars and therefore effectively disappearing from the mode's ownership field.

### Deterministic root cause

The steady-state `Topology Plan` path samples perimeter Vstars from `frontierTopology.loops`.

- `buildPerimeterFieldScene(...)` enters `buildPlanScene(...)` in steady state when topology is considered usable.
- `buildPlanScene(...)` calls `sampleVSetFromGeometry(...)`.
- `sampleVSetFromGeometry(...)` previously filtered loops with `loop.signedArea > 0`.
- `buildPowerVoronoiFrontierTopology(...)` computed loop signed area from chain-walk output but did not normalize loop winding.

So a valid outer owner loop could be emitted with negative winding, then be silently dropped by the plan sampler.

### Fix applied

- `buildPowerVoronoiFrontierTopology.ts`
  - normalize loop `sectionRefs` whenever raw signed area is negative
  - flip each section direction when reversing
  - store loop area as `Math.abs(rawSignedArea)`
- `perimeterFieldPlanEngine.ts`
  - add defensive normalization in `normalizeLoopForSampling(...)`
  - relax sampling gate to `Math.abs(loop.signedArea) > 1e-6`

### What this fixes

- valid owner loops are no longer dropped purely because chain-walk emitted them with reversed winding
- `Topology Plan` steady-state and transition endpoint sampling keep coverage for those regions
- the obvious "ignored player / zero Vstars / zero ownership stake" bug has a direct code repair now

### What this does not fix yet

- the remaining mismatch between:
  - cyan underlying geometry
  - dense perimeter Vstar chains
  - rasterized rendered borders

That is a separate issue in the shared metaball border extraction / winner-grid presentation path.

### Validation

Focused runtime tests passed:

- `src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
- `src/lib/territory/families/perimeterField/buildPerimeterFieldScene.test.ts`

Repo-wide `tsc --noEmit` is still red from unrelated existing errors, but none of the emitted errors referenced this repair surface.

## Small Presentation Follow-up - Border Stroke Joins

One low-risk shared renderer cleanup also landed in this pass:

- `MetaballRenderer.ts`
  - border strokes now use `round` caps and `round` joins in both the worker-commit and main-thread border draw paths

Intent:

- reduce the visible "segments do not meet" artifact class without changing ownership truth or the underlying border extraction algorithm

Limitation:

- this is not the full border-placement fix
- the renderer still extracts borders from the raster winner grid, so equal-contour alignment against dense perimeter Vstar chains is still a separate problem

## Repair Pass - Geometry-Derived Interior Backfill

### Problem restated

After the topology-loop coverage fix, `Perimeter Field` still had interior voids. Those voids were then showing up as borders inside a playerâ€™s own territory because the shared renderer was extracting owner-vs-empty edges inside the region.

### Fix applied

- `buildPerimeterFieldScene.ts`
  - added deterministic interior support sampling derived from the trusted perimeter-source geometry
  - support points are placed by:
    - polygon containment
    - boundary-distance filtering
    - staggered interior grid sampling
    - relaxed fallback sampling for narrow shapes
  - support strength is tied to perimeter strength so it behaves as backfill, not as a new territory frontier

### Scene integration

The support layer is now present in:

- topology-plan steady state
- topology-plan transition frame 0 / frame 1 endpoint equivalence
- legacy perimeter-source steady state
- legacy perimeter-source target-state sampling

### Intended outcome

- more consistent interior ownership fill
- fewer internal owner-vs-empty borders
- less dependence on `Star Metaball Power` just to keep a region filled

### Validation

Focused tests passed:

- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Repo-wide `tsc --noEmit` is still red from unrelated existing issues, but there were no filtered hits for the newly touched `buildPerimeterFieldScene` files.

## Correction Pass - Revert Geometry-Derived Interior Backfill

The previous interior-support/backfill experiment was removed at explicit user request.

What was reverted:

- deterministic interior support point generation
- support-sample cache plumbing
- support-sample scene injection in both topology-plan and legacy perimeter-field assembly
- the support-focused regression test

What remains intentionally:

- topology-loop winding normalization for `Topology Plan`
- defensive plan-mode loop normalization
- round caps / joins on shared metaball border strokes
- optional star-anchor augmentation via `Star Metaball Power`

Focused validation after the revert:

- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Repo-wide `tsc --noEmit` remains red from an unrelated existing `MetaballRenderer.test.ts` export mismatch.

## Repair Pass - Owner-mask Fill For Perimeter Field

### Problem restated

The mode needed â€œreal fillâ€ that still met the metaball-derived borders. Filling trusted underlying geometry would have created a predictable border/fill split because the visible borders are drawn from the solved metaball winner grid, not from the underlying polygon geometry.

### Fix applied

- `MetaballRenderer.ts`
  - added scene-level `fillOpacityMode`
  - added `buildMetaballCacheFingerprint(...)`
  - render cache fingerprint now includes scene radius, ownership margin, solve bounds, and fill mode
  - owner-mask fill mode gives every owned winner cell stable opacity instead of influence-falloff opacity
- `metaballGridWorkerTypes.ts`
  - added `fillOpacityMode` to the worker config
- `metaballGrid.worker.ts`
  - mirrored owner-mask alpha logic in the worker path
- `buildPerimeterFieldScene.ts`
  - all `Perimeter Field` scene outputs now request `fillOpacityMode: 'owner-mask'`

### Resulting rule

- `Perimeter Field` fill now comes from the same solved winner grid as its borders
- no geometry underlay is being used as display truth
- no secondary interior metaball fill field is being used

### Validation

Focused tests passed:

- `MetaballRenderer.test.ts`
- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Filtered `tsc --noEmit` produced `no-filtered-hits` for the touched renderer / perimeter-field files.

## Repair Pass - Remove Contested Void Bands From Perimeter Field Borders

### Problem restated

Even with owner-mask fill, `Perimeter Field` could still show two nearby borders instead of one shared blended frontier. The cause was not a separate stroke layer; it was winner classification still allowing dominance-filter void cells between competing owners.

### Fix applied

- `MetaballRenderer.ts`
  - added scene-level `winnerMode`
  - added scene winner mode to the cache fingerprint
  - live renderer now supports:
    - `dominance-filter`
    - `top-owner`
- `metaballGridWorkerTypes.ts`
  - added `winnerMode` to the worker config
- `metaballGrid.worker.ts`
  - mirrored `top-owner` classification in worker solve
- `buildPerimeterFieldScene.ts`
  - all `Perimeter Field` scenes now use:
    - `fillOpacityMode: 'owner-mask'`
    - `winnerMode: 'top-owner'`

### Result

- `Perimeter Field` no longer creates thin contested void slivers between adjacent owners in the solved winner grid
- shared border extraction therefore produces one owner-vs-owner frontier instead of two owner-vs-void frontiers

### Validation

Focused tests passed:

- `MetaballRenderer.test.ts`
- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Filtered `tsc --noEmit` returned `no-filtered-hits` for the touched files.

## Repair Pass - Fill The Remaining Interior Voids

### Problem restated

Even after owner-mask fill and top-owner winner selection, `Perimeter Field` could still leave large black voids where the perimeter metaball field simply never reached the deep interior.

### Fix applied

- `MetaballRenderer.ts`
  - added `fillFallbackRegions` to `MetaballSceneInput`
  - after normal metaball filling, any cell still left unowned is tested against trusted fallback polygons
  - matched cells are:
    - assigned an owner in `ownerGridGeom`
    - painted into the fill texture
  - because this happens before border extraction, those cells no longer generate internal owner-vs-void seams
- `buildPerimeterFieldScene.ts`
  - now builds fallback regions from trusted perimeter geometry sources
  - transition scenes order current vs target fallback geometry by progress so the remainder fill tracks the active handoff direction

### Result

- metaballs still shape the visible frontier
- trusted geometry only fills the remainder that metaballs miss
- black interior voids should now disappear without introducing a separate geometry display layer

### Validation

Focused tests passed:

- `MetaballRenderer.test.ts`
- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Filtered `tsc --noEmit` returned `no-filtered-hits`.

## Repair Pass - Align Perimeter Field Borders To The Filled Frontier

### Problem restated

After remainder backfill landed, `Perimeter Field` had one shared blended border, but the border still read as a separate stroked line rather than the actual edge of the filled ownership cells.

### Deterministic finding

- live `METABALL_CHAIKIN_PASSES` was already `0`, so Chaikin drift was not the cause
- the real mismatch was that the border was still drawn as a stroked centerline over frontier segments
- the fill was already correct on the ownership grid
- therefore the remaining problem was border presentation, not fill ownership truth

### Fix applied

- `MetaballRenderer.ts`
  - added scene-level `borderGeometryMode`
  - added `sceneBorderGeometryMode` to the cache fingerprint
  - added `grid-ribbon` border rendering:
    - frontier intervals are rendered as filled rectangles centered on the exact frontier ribbon
    - this uses the same final ownership grid that the fill uses
  - style bucketing now also includes the owner pair, so equal-style boundaries from different pairs are not mixed
- `buildPerimeterFieldScene.ts`
  - all `Perimeter Field` scenes now set:
    - `borderGeometryMode: 'grid-ribbon'`

### Result

- `Perimeter Field` border placement is now aligned to the filled frontier by construction
- this pass prioritizes exact placement over a new contour-smoothing algorithm

### Validation

Focused tests passed:

- `MetaballRenderer.test.ts`
- `buildPowerVoronoiFrontierTopology.test.ts`
- `buildPerimeterFieldScene.test.ts`

Filtered `tsc --noEmit` returned `no-filtered-hits` for the touched files.

