# Perimeter Field Spec Compliance Audit - 2026-04-14

## Summary

This audit measures the live `perimeter_field` implementation against the user-specified mode design.

The core result is:

- geometry-source selection and inward-offset sampling are working
- DX midpoint logic is working
- the transition and diagnostics paths still contain major architectural deviations
- the largest deviations are change-area selection, sample correspondence, geometry identity, and `PREV`/`NEXT` truth

This is an audit artifact, not a code-fix pass.

---

## Audit Rubric

Each item records:

- `user design`
- `current implementation`
- `status`
- `evidence`
- `failure effect`
- `repair implication`

Allowed statuses:

- `compliant`
- `deviating`
- `unknown`

---

## Compliance Ledger

### R1. Base geometry comes from actual ownership using a selectable tuned geometry source

- **User design**
  - Base geometry comes from actual ownership using a selectable tuned geometry source.
- **Current implementation**
  - `perimeter_field` uses `buildPerimeterFieldRenderFamilyGeometry(...)` and supports `canonical_vector` and `power_voronoi_0319`.
  - `power_voronoi_0319` is the default source.
- **Status**
  - `compliant`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:21`
  - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:256-274`
- **Failure effect**
  - None for source selection itself.
- **Repair implication**
  - Preserve this behavior.

### R2. Source constraints remain part of the mode and must stay tuneable

- **User design**
  - The geometry source must remain tuneable for MSR, CX, lane pairs, and DX.
- **Current implementation**
  - The mode is wired through shared family geometry and uses source-tuned geometry.
- **Status**
  - `compliant`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:200-220`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:849-880`
- **Failure effect**
  - None for basic source-tuning availability.
- **Repair implication**
  - Preserve this behavior while fixing transition logic.

### R3. Perimeter vstars are the display ownership primitive; real star influence is zeroed for display after derivation

- **User design**
  - Displayed territory comes from perimeter vstars, not direct star-centered influence.
- **Current implementation**
  - `perimeter_field` passes explicit `sceneInput.samples` into `renderMetaball(...)`.
  - In the renderer, `sceneInput.samples` become `starData`; star-centered samples are not auto-built when `sceneInput` exists.
- **Status**
  - `compliant`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:617-644`
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts:833-854`
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts:886-897`
- **Failure effect**
  - None for the display-field primitive itself.
- **Repair implication**
  - Keep perimeter-sample-driven display. Do not regress to star-centered display truth.

### R4. Perimeter vstars are sampled from the real perimeter and offset inward

- **User design**
  - Vstars sit inside the boundary, not directly on it.
- **Current implementation**
  - Perimeter samples are taken from source loops / regions and offset inward by `PERIMETER_FIELD_INWARD_OFFSET_PX`.
- **Status**
  - `compliant`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:294-332`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:529-541`
- **Failure effect**
  - None for the inward-offset rule itself.
- **Repair implication**
  - Preserve this behavior.

### R5. DX uses midpoint-based vstars between disconnected same-owner stars

- **User design**
  - DX needs vstar implementation at the geometric midpoint between disconnected same-owner stars.
- **Current implementation**
  - DX midpoint sites are built around the midpoint between disconnected same-owner stars, with paired offsets.
- **Status**
  - `compliant`
- **Evidence**
  - `pax-fluxia/src/lib/territory/disconnect/buildDisconnectVirtualSites.ts:250-289`
- **Failure effect**
  - None for DX midpoint positioning itself.
- **Repair implication**
  - Preserve this behavior and keep it documented as a hard invariant.

### R6. `PREV` and `NEXT` must each have their own real perimeter-vstar state

- **User design**
  - Transition must be between real `PREV` and `NEXT` perimeter-vstar states already implied by gameplay.
- **Current implementation**
  - The implementation introduces conquest-only `transition-old` and `transition-new` samples built on top of static sample sets.
  - Those are temporary generated classes, not explicit first-class `PREV` and `NEXT` perimeter-vstar states with stable paired identity.
- **Status**
  - `deviating`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:393-520`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:612-617`
- **Failure effect**
  - The implementation substitutes synthetic transition-local samples for the design’s explicit `PREV`/`NEXT` perimeter-vstar truth.
- **Repair implication**
  - Represent transition as correspondence between real sampled `PREV` and `NEXT` perimeter-vstar states, not temporary conquest-only sample classes.

### R7. Change vstars are determined from changed active fronts / contested topology

- **User design**
  - Change areas and active fronts between contested stars determine which vstars move.
- **Current implementation**
  - The transition builder selects one old source and one new source anchored by the conquered star, then replaces the entire old source sample set.
  - It does not use active-front / frontier-section change extraction.
- **Status**
  - `deviating`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:420-452`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:612-617`
  - Existing unused stronger machinery:
    - `pax-fluxia/src/lib/territory/layers/transition/modes/ActiveFrontFillMode.ts:393-605`
- **Failure effect**
  - Whole local regions can balloon, drift, or snap when only one changed frontier section should move.
- **Repair implication**
  - Change selection must move from source-loop selection to changed-front / section-scoped selection.

### R8. Correspondence must be intelligent and topological/euclidean, not star-centered heuristics

- **User design**
  - Vstars must be uniquely identified and corresponded from `PREV` to `NEXT`.
  - Some paths may need arcs to avoid crossing unrelated frontiers.
- **Current implementation**
  - Old/new samples are matched by closest angle around the conquered star.
  - Old-to-new and new-to-old matching are computed independently.
  - Motion paths are straight lines.
- **Status**
  - `deviating`
- **Evidence**
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:342-390`
  - `pax-fluxia/src/lib/territory/families/perimeterField/buildPerimeterFieldScene.ts:454-515`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldDiagnostics.ts:129-169`
- **Failure effect**
  - Non-bijective pairings, crossing paths, whole-region drift, and start/end disjoints.
- **Repair implication**
  - Replace angle-about-star matching with section-local stable correspondence, ideally by changed-front section and arclength.
  - Add path-routing logic where straight segments would cross unrelated static fronts.

### R9. Geometry identity must remain deterministic and grounded in gameplay star identity

- **User design**
  - Deterministic ownership data and correct topological location must drive the mode.
- **Current implementation**
  - The power-voronoi adapter still creates synthetic index-based region IDs.
  - Upstream `starIds` are populated from `cell.siteId`, which includes virtual sites as well as gameplay stars.
- **Status**
  - `deviating`
- **Evidence**
  - Synthetic IDs:
    - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:101-158`
  - Polluted `starIds`:
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts:463-470`
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts:637`
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts:670`
- **Failure effect**
  - Territory identity and correspondence are less stable than the design requires.
- **Repair implication**
  - Preserve stable territory IDs and separate gameplay anchor stars from contributing virtual sites.

### R10. `PREV`, `NEXT`, and scrub frames must be exact live gameplay truth

- **User design**
  - Frame `0` scrub must equal true gameplay `PREV`.
  - Diagnostics must show exact gameplay `PREV`, `NEXT`, and interim frames.
- **Current implementation**
  - Capture is sourced from the live family path, which is correct in principle.
  - However, `previousFrame` is seeded from `perimeterFieldStableFrame ?? liveFrame`, which allows a poisoned stable frame to become false `PREV`.
  - An observed exported bundle already showed post-conquest owners in `previousGeometryVersion`.
- **Status**
  - `deviating`
- **Evidence**
  - Live capture path:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:748-790`
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:604-725`
  - Risk site:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:775-780`
  - Observed failure artifact:
    - package `2026-04-14-154653_transition-diagnostic-package/diagnostic.json` showed post-conquest owners in `previousGeometryVersion`
- **Failure effect**
  - Exported and scrubbed `PREV` can be false even when capture is nominally live-path-based.
- **Repair implication**
  - Make `PREV` capture explicit and atomic at transition start, not dependent on a rolling stable-frame cache.

### R11. Diagnostics must be read-only and must never silently alter gameplay rendering

- **User design**
  - Diagnostics are read-only and must never alter gameplay rendering.
- **Current implementation**
  - The prior pause-coupled behavior was corrected.
  - Current replay/preview is explicit and toggle-gated.
  - However, enabling preview still swaps the displayed root from live gameplay to replay sprite on the main playfield.
- **Status**
  - `deviating`
- **Evidence**
  - Toggle gate:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:522-528`
  - Live-root swap:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte:568-602`
- **Failure effect**
  - Diagnostics no longer silently mutate pause behavior, but they still replace the main gameplay view rather than existing as a separate read-only inspection surface.
- **Repair implication**
  - Keep diagnostics on a separate overlay or inspector surface without swapping out the live gameplay root.

### R12. Export bundles must be minimal, readable, and must separate clean gameplay from debug overlays

- **User design**
  - Export artifacts should be interpretable, minimal, and sufficient for deterministic diagnosis.
- **Current implementation**
  - Perimeter-field export still bakes geometry overlays into PNGs.
  - Package PNG filenames remain generic.
  - README names only the first conquest event and generic frame names.
- **Status**
  - `deviating`
- **Evidence**
  - Overlay baked in:
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:300-314`
  - Generic filenames:
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:344-350`
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:577-623`
  - Generic README:
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts:420-446`
- **Failure effect**
  - Packages are noisier than intended and lose conquest identity in filenames.
- **Repair implication**
  - Split clean render frames from debug frames and adopt conquest-aware bundle/file naming.

---

## Root-Cause Summary

The primary deviations are:

1. **Wrong transition primitive**
   - the mode still treats transition as temporary synthetic sample generation instead of correspondence between real `PREV` and `NEXT` perimeter-vstar states

2. **Wrong change-area selector**
   - the implementation swaps whole local sources instead of changed front sections

3. **Wrong correspondence model**
   - angle-about-star matching is a heuristic, not a stable topological mapping

4. **Identity degradation upstream**
   - stable territory identity and gameplay-star identity are weakened by synthetic IDs and virtual-site pollution

5. **Diagnostic truth still incomplete**
   - capture is live-path-based, but `PREV` can still be poisoned and export formatting still conflates clean gameplay with debug overlays

---

## Prioritized Repair List

1. Replace false `PREV` capture with explicit transition-start capture.
2. Replace whole-source replacement with changed-front / section-scoped selection.
3. Replace angle-based sample matching with stable section-local correspondence.
4. Separate gameplay star identity from contributing virtual-site identity in geometry data.
5. Replace synthetic region IDs with stable territory IDs.
6. Separate clean export frames from debug export frames.
7. Move preview/scrub off the main gameplay presentation surface.

---

## Audit Conclusion

`perimeter_field` has a viable static base and a viable display primitive, but its transition design is still materially off-spec.

The mode should not be described as “mostly correct with tuning issues.” The current blockers are architectural mismatches against the stated mode design.
