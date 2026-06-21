# Geometry Engine Build Plan (Task #1 — "basic Voronoi, from first principles")

**Status:** scaffolding. Integration surface + output contract below are FACTUAL (read
from code 2026-06-21). The DESIGN section is pending the docs-synthesis subagents
(`a98e2a7c54421a1e9` geometry synthesis, `a0e37a611b4c86791` 2026-06-17 session docs).

> User intent (verbatim): *"Build the new geometry engine strictly from first principles
> and the specific intentions and constraints of our game world requirements … basic
> Voronoi is cleaner than what we have."* Standing gates: never declare unproven geometry
> correct; **visual sign-off is the gate**; build as a SELECTABLE candidate, not a
> replacement; optimize for the BEST solution, not the minimal.

---

## The two achievements (the ONLY two geometry goals)

1. **Static ownership map** — region fills + border shape, via constraints (CX/CL/SB/DX)
   + Chaikin smoothing.
2. **Conquest transition** — water-flow/rope/elastic morph, consistent across cases.

---

## KEY INSIGHT (drives the whole rebuild)

The output contract (`ResolvedGeometrySnapshot`, below) is RICH: regions + frontiers +
world-borders + a **frontier topology** (vertices/sections/loops) + **shells** (outer loop
+ holes) + provenance. A Voronoi *diagram* is trivial to compute. **All of the current
complexity — and the known bugs (chain-walk junction failures, dropped frontier segments,
broken fills) — live in the ASSEMBLER** that reconstructs topology/shells/regions from the
raw diagram (`executeChainWalk` / `constructFillsFromFrontierChain` / the unified vector
compiler). See memory `geometry-pipeline-model`, `consolidation-preexisting-test-failures`.

> Therefore "basic Voronoi is cleaner" most plausibly means: **simple Voronoi/power cells
> as the source of truth, feeding a CLEAN, first-principles assembler** that derives
> frontiers/shells directly from cell adjacency (which is exact and provenance-bearing by
> construction) — instead of tracing/walking chains that lose identity and mis-join at
> junctions. Validate this hypothesis against the synthesis before committing.

---

## Integration surface (where a candidate engine plugs in)

- **Single entry — all families call this:**
  `buildPerimeterFieldRenderFamilyGeometry(params): ResolvedGeometrySnapshot`
  — `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:144`
  - Resolves `requestedGeometrySource` (param → `PERIMETER_FIELD_GEOMETRY_SOURCE` config →
    default `'power_voronoi_0319'`) at L151-156.
  - Calls `buildPowerVoronoi0319RenderFamilyGeometry(...)` (L158); if non-null, returns it.
  - Fallback: `compileVectorGeometry(...)` (legacy vector compiler, L172).

- **Source registry (currently single-authority):**
  `pax-fluxia/src/lib/territory/geometry/geometrySource.ts`
  - `normalizePerimeterFieldGeometrySource(_source)` **ignores its input and always returns
    `'power_voronoi_0319'`.** `resolved_vector` is a persisted-config alias only.
  - **To add a candidate:** extend `PerimeterFieldGeometrySourceId` union with the new id;
    make `normalize…` pass the candidate through (keep 0319 the default for everything else).

- **Dispatch point for the new engine:** branch in `buildFamilyGeometry.ts` BEFORE L158 —
  `if (geometrySource === '<new_id>') return buildBasicVoronoiRenderFamilyGeometry(...)`.

- **Selectable mode for visual A/B:** the geometry source is reachable via
  `PERIMETER_FIELD_GEOMETRY_SOURCE` config; expose the candidate in the territory render-mode
  / geometry-source UI so the user can switch and visually compare against 0319.

---

## Output contract — what the new engine MUST produce

`ResolvedGeometrySnapshot` — `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts:222`

| Field | Requirement |
|---|---|
| `version` | deterministic hash of the frame |
| `sourceMode` / `sourceStyle` / `ownershipVersion` | identity |
| `geometryFamily` / `sourceMethod` | provenance tags |
| `territoryRegions: TerritoryRegionShape[]` | `regionId` (deterministic, NOT index-order), `ownerId`, `points[][2]`, `confidence`, + `anchorStarIds` (real stars) / `contributingSiteIds` (virtual CX/DX/ghost sites) |
| `frontierPolylines` | inter-owner frontiers WITH stable identity |
| `worldBorderPolylines` | owner↔world edges |
| `sharedFrontierMap` | **multimap** by `ownerPairKey` (D-90: two owners can share multiple disjoint segments — never a single-value map) |
| `frontierTopology` | vertices/sections/loops — the transition planner + frame sampler consume this for identity-aware morphs (achievement #2) |
| `shells` / `shellLoops` | one outer boundary + contained holes per island |
| `provenance` / `diagnostics` | `topologyReliable` / `identityReliable` / `closureReliable`, optional `stageLadder`, `minStarMargin` |

Notes: **Chaikin smoothing is applied INSIDE the geometry layer** (points are pre-smoothed;
renderers must NOT re-smooth). `regionId` MUST be deterministic across equivalent snapshots
(no enumeration/index dependence) — required for stable transitions.

---

## Constraints to apply (game-world requirements)

- **CX** corridor-extension · **CL** contested-lane · **SB** star-buffer (MSR weight-floor:
  `r_i = min_j (d_ij² + w_i − w_j)/(2 d_ij) ≥ ρ`) · **DX** disconnected-region-exclusion.
- Current impl: `geometryLaneConstraints.ts`, `geometryTuning.ts`
  (NB: `DEFAULT_STAR_MARGIN` regressed 75→0 in 6a67a5d34 — re-confirm intended value).
- **Open design question (untested both ways):** constraints baked PRE-Voronoi (virtual
  sites/weights) vs applied POST-Voronoi. The synthesis should recommend; otherwise build
  both as switchable and let visual sign-off decide.

---

## Build plan (execute once synthesis lands)

1. Decide assembler approach from synthesis (hypothesis: cell-adjacency → frontiers/shells,
   provenance by construction).
2. Add `<new_id>` source: union + `normalize…` passthrough + `buildFamilyGeometry` dispatch.
3. Implement `buildBasicVoronoiRenderFamilyGeometry → ResolvedGeometrySnapshot`
   (cells → regions → frontiers/world-borders → topology → shells → provenance), Chaikin
   inside the layer.
4. Apply CX/CL/SB/DX (pre- or post-, per synthesis).
5. Headless tests: regions non-empty + closed loops (`closureReliable`), deterministic
   `regionId`, provenance present, `sharedFrontierMap` keeps multi-segment pairs (D-90).
6. Wire as selectable; USER visual sign-off vs 0319 (the gate).

## DESIGN GUIDANCE (from docs-synthesis, 2026-06-21)

**Visual oracle:** commit `8dce88c` (PRISM-ui-design worktree) is the proven-correct
static map. Mechanism: power diagram → `extractSharedEdges` → `mergeSameOwnerCells` →
**identical Chaikin on BOTH fills and borders**; SB was a site weight (pre-solve), not a
post-fill rewrite. Capture its screenshots as the Gate-A oracle before building.

**Root cause of every past failure (F-138 `CORRECTIONS_GROUND_TRUTH.md`):** the Voronoi
tiles perfectly with ZERO gaps. **Every gap is introduced by pipeline modifications that
edit shared vertices independently per polygon** (per-polygon star-margin push, per-polygon
smoothing, post-fill CX/DX rewrites). Fix by construction: ONE shared-edge object per
border; both regions reference it; modify it once.

**Recommended assembler (the "cleaner" core):**
- `runPowerDiagram(sites, world) → PowerCell[]` — thin wrapper over `d3-weighted-voronoi`
  (already a dep; keep the Stage-1 call pattern from `Geometry_0319.ts`).
- `buildSharedEdgeGraph(cells) → { sharedEdges, worldEdges }` — dedup by quantized endpoint
  key (1e-3 px); each unique owner-pair edge → ONE `SharedEdge` referencing both owners.
  **Replaces `mergeSameOwnerCells`** (the polygon-union merge is where gaps originate).
- `walkRegionLoops(sharedEdges, worldEdges) → RegionLoop[]` — **ANGULAR-ORDER walk**: at each
  junction sort outgoing edges by angle and take a consistent leftmost/rightmost turn. This
  is THE fix to the greedy "first-unused" junction-walk bug (`executeChainWalk` /
  `buildRegionLoops.walkSingleLoop`) that mis-joins 3-way junctions.
- **Fill/border identity invariant:** `RegionLoop` stores `orderedEdgeRefs`, NOT its own
  `points[]`; it reads points from `SharedEdge.smoothedPts`. Makes divergence impossible.

**Constraint placement (decisions):**
- **SB** — site weight, PRE-solve (`w_i ≈ ρ_i²`; exact keep-out toward B: `w_A−w_B =
  2ρ·d_AB − ρ²`). Keep `buildRealSiteWeight` (`powerVoronoiWeights.ts`); keep the post-solve
  `applyExplicitMinStarMargin` only as a labeled fallback knob. **NB the `starWeight` control
  is a plain PV site weight, NOT MSR — do not conflate** (and re-confirm `DEFAULT_STAR_MARGIN`
  75 vs the 0 regression).
- **CX** — PRE-solve virtual sites; keep `buildCorridorVirtualSites.ts` whole (already
  pre-solve; same-owner = uniform along lane; contested = midpoint-straddling pair).
- **DX** — PRE-solve virtual enemy sites (current/F-138) — keep `buildDisconnectVirtualSites.ts`;
  A/B against post-solve subtraction (open question) and let visual sign-off decide.
- **Chaikin** — apply once to the `SharedEdge` objects (pin 3+-edge junction vertices via
  `extractJunctionVertices`); loops inherit smoothed points automatically.

**Conquest transition (Achievement #2) — AFTER Gate A passes:** the real missing mechanism
is **rebuild fills from the interpolated border polylines every frame** (run the Phase-1
angular walk on the morphed polylines) — master only interpolates borders, never rebuilds
fills (8dce88c did). Border matchers to reuse: `interpolatePolylines.matchPolylinesByKey`,
`borderTransition.matchPolylines` (endpoint-aware). Honest sub-200ms SNAP for
topologically-ambiguous island conquests; never fake a morph. Decide `rope_morph.sample()`
stub: finish or delete (no silent dead path).

**KEEP:** `powerVoronoiWeights.ts`; `buildCorridorVirtualSites.ts`;
`buildDisconnectVirtualSites.ts`; `chaikinSmoothPolyline`/`extractJunctionVertices`/
`resampleClosedPolygonBySpacing`; `compiler_UnifiedVectorGeometry.ts` `buildOwnerShells`/
`buildFrontierTopology`/`buildProvenance`; `GeometryContracts.ts` (output types are correct);
the transition matchers.

**DISCARD / don't build on:** `generateVoronoiTerritoryGeometry` (legacy, PVV4 divergence,
old same-side-only world-border extractor); `mergeSameOwnerCells` as merge strategy;
post-fill CX/DX rewrites as the PRIMARY path; `FrontierMorphFillMode.ts` (BROKEN, corrupt
frames); the `TOPOLOGY_PATH_ENABLED=false` gated path (104 commits, not achieved — harvest
diagnostics only); the second config source (`input.tunables` Map → diagram divergence);
`rope_morph.sample()` stub. **Evaluate reverting `597305b46`** (unverified angular-walk change
to the live pipeline).

**B-42 (PIXI v8):** draw `graphics.poly(v).fill().stroke()` in ONE call — separate
`fill()`/`stroke()` triangulate the same vertices differently and open hairline seams.

**Build order (always prove static before transition):** Phase 0 oracle → Phase 1 core
(diagram + shared-edge graph + angular walk, NO constraints/smoothing) → Gate A check →
Phase 2 SB weight → Phase 3 CX → Phase 4 DX → Gate B check → Phase 5 Chaikin → Phase 6
adapter to `ResolvedGeometrySnapshot` → Phase 7 transition (fill-rebuild).

**Core data structures:** `PVSite{id,x,y,weight,ownerId,kind:real_star|cx_corridor|dx_disconnect}`
· `SharedEdge{edgeId,ownerA,ownerB,pts:[P,P],smoothedPts:P[]}` (both regions reference; 'world'
owner for map boundary) · `RegionLoop{loopId(=sorted starIds set, NOT centroid),ownerId,
starIds,orderedEdgeRefs:{edgeId,forward}[]}` (points DERIVED from edges, never stored).

**Full synthesis** (formulas, current-state stage trace, file:line anchors) captured in the
session transcript / memory `geometry-pipeline-model`. Source docs: F-138
`CORRECTIONS_GROUND_TRUTH.md` + `V2_IMPLEMENTATION_PLAN.md`; 2026-06-17
`TERRITORY_SOLUTION_CANDIDATES_AND_RECOMMENDATION.md` + `TERRITORY_ARCHITECTURE_CONSOLIDATED.md`.
