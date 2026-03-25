**Current Reality**

The borders you are seeing are produced like this:

1. [DistanceFieldTerritoryRenderer.ts#L4919](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L4919) calls [renderMeshBorderOverlay]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L2910 ) when `Border Engine = mesh`.
2. That calls [produceCanonicalBorderSource]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L2586 ).
3. Canonical then does one of two things:
   - Preferred path: read the ownership RT back into `ownerGrid/enemyGrid/gapNorm` via [extractOwnerGridInfoFromOwnershipTexture]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L2288 ).
   - Fallback path: build a CPU ownership lattice by sampling sites with [buildOwnershipSampleSites]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L1762 ) and [sampleOwnerFromSites]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L1837 ), then raster-fill rows with [stepVectorBorderBuildJob]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L3261 ).
4. Both paths feed [buildCanonicalFrontierPolylineSet]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L1400 ).
5. Inside that builder:
   - lane frontier points are computed analytically in [computeLaneFrontiers]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L203 ),
   - field frontier points are extracted from the ownership lattice in [extractFieldFrontiersFromOwnerGrid]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L1062 ),
   - both are unioned in [buildFrontierGraphFromGraph]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L278 ),
   - then converted to polylines in [extractPolylinesFromFrontierGraph]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L399 ),
   - then simplified/linearized in [smoothCanonicalFrontierPolylines]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L737 ).
6. The mesh renderer then draws triangle strips over those polylines. So the visible jaggedness is upstream geometry, not mainly shader or stroke-mesh failure.

**What The Plans Actually Said**

The plans are stricter than the current implementation:

- [IMPLEMENTATION_DIRECTIVE_v1.md#L12](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md#L12) says graph-native Stage 1 distances are the only ownership truth.
- [IMPLEMENTATION_DIRECTIVE_v1.md#L17](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md#L17) says canonical border geometry must come from a FrontierGraph, and lattice-derived centerlines are forbidden in canonical mode.
- [Territory directives and specs 2026-03-08.md#L19](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/proposals/Territory%20directives%20and%20specs%202026-03-08.md#L19) says “centerline” means equal-graph-distance locus, not medial axis of a sampled ownership lattice.
- [Territory directives and specs 2026-03-08.md#L82](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/proposals/Territory%20directives%20and%20specs%202026-03-08.md#L82) explicitly forbids building `FrontierGraph` from an owner grid in canonical mode.
- [16-chunk recovery DF rendering 2026-03-08.md#L223](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/16-chunk%20recovery%20DF%20rendering%202026-03-08.md#L223) says Stage 2A must be hardened.
- [16-chunk recovery DF rendering 2026-03-08.md#L240](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/16-chunk%20recovery%20DF%20rendering%202026-03-08.md#L240) says Stage 2B must be contour-local and not pair-global garbage.
- [16-chunk recovery DF rendering 2026-03-08.md#L256](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/16-chunk%20recovery%20DF%20rendering%202026-03-08.md#L256) says the merged FrontierGraph must preserve topology and owner-pair identity.
- [16-chunk recovery DF rendering 2026-03-08.md#L273](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/16-chunk%20recovery%20DF%20rendering%202026-03-08.md#L273) says canonical runtime must be explicit and safe, never implicit.

**Where Current Code Violates The Spec**

If I came in cold, I would say the core failure is this: the current “canonical” path is still structurally raster-led.

- Stage 2A exists, but it is not topologically complete. In [buildFrontierGraphFromGraph]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L313 ) lane points are only connected to other frontier points on the same lane. If a lane has one crossing, it becomes an isolated node. The spec required star/junction topology, not isolated samples.
- Lane and field frontiers are not really merged. The function just unions lane nodes and field contour nodes into one map; there is no actual lane-to-field welding or junction resolution. So this is not yet a true canonical FrontierGraph.
- Stage 2B is still effectively dominant. [buildCanonicalFrontierPolylineSet]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts#L1400 ) always pulls in field frontiers when `ownerGridInfo` exists. That means the visible continuity of the border is still coming from raster contour data.
- The CPU canonical fallback is non-canonical by spec. [sampleOwnerFromSites]( /C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L1837 ) constructs an ownership lattice from point-site influence plus Dijkstra baseline. That is a useful approximation, but it is not “graph-native frontier truth.”
- `computeLaneFrontiers` currently uses all owners with finite endpoint distance, not just best/second endpoint candidates. That is broader than the spec and can create extra pair roots and noise.
- The smoothing pass is not the main bug, but it is currently being asked to rescue a bad graph. That is why it feels wrong: the plans intended fitting on correct frontier geometry, not post-processing of staircase-derived contours.
- Canonical fill is still not canonical. [DistanceFieldTerritoryRenderer.ts#L4878](/C:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts#L4878) still displays the ownership RT fill mesh, so fill/border shared-truth is not finished.

**What I Would Recommend As An Outsider**

I would stop spending time on smoothing, shader tweaks, and minor mesh polish until the frontier topology is corrected. The mesh is doing its job; it is drawing the wrong geometry accurately.

I would do this, in this order:

1. Make Stage 2A truly authoritative.
   - Restrict lane candidates to endpoint top-2 owners per spec.
   - Add star/junction boundary nodes so a single lane frontier point is not an isolated dead node.
   - Build lane-to-lane connectivity through stars explicitly.

2. Demote Stage 2B to what the plans said it should be.
   - Optional.
   - Secondary.
   - Only for interstitial gaps.
   - Never the continuity backbone of the canonical border.

3. Replace the current “union of lane graph + field contour graph” with an actual merge.
   - Spatially weld same-pair lane endpoints to nearby field contour endpoints.
   - Resolve junctions deterministically.
   - Then extract polylines from that merged topology.

4. Remove non-canonical CPU fallback from Production canonical.
   - If the ownership RT path is unavailable, canonical should be unavailable.
   - It should not silently become a sampled owner lattice and still call itself canonical.

5. Keep smoothing only as family fitting.
   - Error-bounded simplification is fine.
   - Geometry repair is not.

If you want the blunt version: I do not think the shortest path to spec is “keep refining the current canonical builder.” I think the shortest path is to finish the actual FrontierGraph topology that the plans described, because right now the code has analytic frontier points, but not yet an actually authoritative analytic frontier graph.