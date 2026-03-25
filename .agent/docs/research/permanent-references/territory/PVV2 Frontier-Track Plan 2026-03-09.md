# PVV2 Frontier-Track Plan

## Summary
Use `Power Voronoi V2` as the shipping path, but replace both current PVV2 border animation modes with one production path built on stable frontier tracks. Keep the current PVV2 and DF modes as references. Do not keep the current PVV2 `segment` or `smooth` morph implementation as the final design.

The core change is this:
- stop animating raw shared edge segments,
- stop animating whole polylines by nearest-centroid + fixed-count point lerp,
- animate stable owner-pair frontier spans between stable anchors,
- render those spans with stroke-mesh geometry,
- derive fill motion from the same tracked frontier loops.

## Implementation Changes
1. **Keep PVV2 topology generation, replace PVV2 animation source**
- Keep site generation, weighted Voronoi, shared-edge extraction, and same-owner merge in [PowerVoronoiRenderer.ts](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts).
- Replace `chainSharedEdgesIntoPolylines(...)` as the production animation source with a frontier-track builder that produces:
  - `SharedFrontierTrack`
  - `SharedFrontierSpan`
  - `TerritoryLoop`
- Build tracks from the shared-edge half-edge graph grouped by owner pair.
- Split spans at:
  - degree `!= 2` vertices,
  - map-clip boundary contacts,
  - owner-pair junctions,
  - explicit contour closures.
- Stable IDs must be based on owner pair + ordered anchor keys + local ordinal. Do not use centroid matching as the primary identity rule.

2. **Replace both PVV2 morph modes with one span-based morph**
- Keep `TERRITORY_BOUNDARY_MODE = 'segment' | 'smooth'` for compatibility.
- Reinterpret `smooth` as the new production track-morph mode.
- Keep `segment` as a legacy reference/debug mode only.
- Remove the current production use of:
  - nearest-centroid polyline matching,
  - midpoint-nearest edge matching,
  - fixed `RESAMPLE_N = 32`.
- For matched spans:
  - resample by arc length using a world-space step, target `8 px`, clamped to `24..192` samples per span,
  - preserve anchor endpoints exactly,
  - interpolate only within the matched span domain.
- For unmatched spans:
  - new span grows from its nearest stable anchor or anchor pair,
  - removed span shrinks back into its anchor or anchor pair,
  - split/merge events must use trim/grow behavior, not freeform fade at full length.

3. **Use stroke mesh for PVV2 borders**
- Stop using raw `PIXI.Graphics.lineTo` borders for production PVV2 borders.
- Reuse the stroke-mesh renderer in [strokeMeshBorders.ts](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/strokeMeshBorders.ts) as the PVV2 border backend.
- Feed it PVV2 frontier spans as explicit paths with stable IDs and previous positions.
- Finish round-join/round-cap support for this path; the current mesh builder explicitly says that is still follow-up in [strokeMeshBorders.ts:277](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/strokeMeshBorders.ts#L277).
- Compile the non-snap PVV2 production shader path without pixel snapping. The current “no snap” program still includes `roundPixelsBitGl` in [strokeMeshBorders.ts:482](C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/strokeMeshBorders.ts#L482), which must be corrected.
- Keep existing width/alpha/softness/brighten/HSLA-style controls mapped to uniforms.

4. **Make fill animation use the same frontier truth**
- Build `TerritoryLoop` objects from the same frontier-track graph plus clip boundary.
- Key loops by `ownerId + clusterIdx`, reusing the existing cluster concept from PVV2 merge logic.
- Morph fills from previous loops to target loops using the same stable anchors and arc-length parameterization as the borders.
- Border and fill must advance on the same transition clock and the same ownership snapshot.
- Do not allow “border moves over already-jumped fill” in the production path.

5. **Lock recomputation and runtime cost**
- Keep PVV2’s existing shape/visual fingerprint separation.
- Rebuild topology only when the shape fingerprint changes.
- Visual-only changes must update styling/uniforms, not rebuild frontier tracks.
- During active morph:
  - no power diagram recompute,
  - no shared-edge graph rebuild,
  - no loop rebuild,
  - only morph interpolation and mesh draw.
- Add PVV2 perf logs mirroring DF’s structure:
  - `[PVV2_BORDER][PERF]`
  - stages: `diagramMs`, `sharedEdgeMs`, `trackBuildMs`, `loopBuildMs`, `meshBuildMs`, `steadyStateMs`.

## Public / Internal Interface Changes
- Add internal types:
  - `SharedFrontierTrack`
  - `SharedFrontierSpan`
  - `PvBorderRenderSnapshot`
  - `TerritoryLoop`
  - `SpanMorphMatch`
- Keep existing user-facing mode names.
- `TERRITORY_BOUNDARY_MODE='smooth'` becomes the new track-morph production path.
- `segment` remains available only as a legacy reference path.

## Test Plan
1. **Visual correctness**
- High zoom static view: no sawtooth segment chain appearance, no corner popping, no polyline shear.
- Continuous pan/zoom: no border jitter from point-resample drift.
- Conquest transition: borders slide laterally; local curves stretch/compress smoothly; no whole-border teleport.
- Split/merge cases: a span dividing or joining must grow/shrink from anchors, not flicker or rematch globally.
- 3-owner junctions: anchors remain stable; no knotting.
- Map edge contacts: loops remain closed and clipped correctly.

2. **Fill/border coherence**
- During conquest, fill on both sides must track the moving border.
- No visible gap between fill edge and border edge.
- No target-state fill appearing far ahead of the moving frontier.

3. **Performance**
- On the correctness fixture: no recompute while only camera moves or style controls change.
- On the stress fixture: territory overlay stays within budget for 2k60.
- Acceptance targets:
  - steady-state PVV2 territory overlay p95 `<= 3.0 ms/frame`
  - border-only morph update p95 `<= 1.5 ms/frame`
  - ownership-change publish p95 `<= 12 ms`
  - no long task `> 33 ms` on a normal conquest update

## Assumptions
- `PVV2` is the near-term delivery path.
- `DF Legacy Field HQ` remains a visual/perf reference, not the target architecture.
- `DF Mesh Production` remains the long-term canonical R&D path, not the immediate shipping path.
- No new user-facing controls are required for phase 1.
