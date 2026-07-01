---
date created: 2026-06-17
last updated: 2026-06-17
last updated by: AI
type: living spec + breadcrumb ledger
status: IN PROGRESS — spine granular; constraints/smoothing/adapter/downstream + prior-doc reconciliation pending
---

# Territory Geometry — Operational Spec (living) + Source Ledger

**Purpose.** One crystal-clear, concrete, operational decomposition of territory geometry —
every step from `starmap + ownership` to finished geometry-with-attributes — at the granularity
the user requires. Also the **breadcrumb** that survives across context windows so nothing is
missed. The IDEAL pipeline is the Fresh PV core (`geometryCore/`, worktree 736a), which the user
has provisionally accepted as the base; this spec captures its logic exactly, flags its 2 defects,
and reconciles with the user's prior rigorous docs.

**How to use across windows:** update §0 ledger statuses as sources are mined; fill the `DEEPEN`
markers in §2; keep §4 (open questions) current. Each numbered step in §2 is one operational unit.

---

## 0. SOURCE LEDGER (breadcrumb — mine systematically; do not miss any)

Status: ⬜ unread · 🔄 reading · ✅ mined · ⭐ canonical (user-pointed)

**Fresh PV core code (the IDEAL implementation) — `geometryCore/` (736a worktree):**
- ✅ `buildPvGeometryCore.ts` (spine), `types.ts` (data model)
- ✅ `buildWorldBoundary.ts`, `geometryKeys.ts`, `buildPowerDiagram.ts`, `buildPvEdgeLedger.ts`,
  `graph/buildSharedCurveGraph.ts`, `graph/buildRegionLoops.ts`, `constraints/applyPvCoreConstraints.ts`,
  `constraints/constraintGeometryUtils.ts`
- ⬜ `constraints/applyStarMarginConstraint.ts` (SM), `applyLanePairConstraint.ts` (LP),
  `applyCorridorConstraint.ts` (CX), `applyDisconnectSeamConstraint.ts` (DX)
- ⬜ `graph/smoothSharedCurves.ts` (Chaikin chaining)
- ⬜ `adapters/adaptPvCoreToCanonicalSnapshot.ts` (bridge to ResolvedGeometrySnapshot consumers)
- ⬜ `diagnostics/validateGeometryCoreSnapshot.ts`, `diagnostics/exportGeometryCoreArtifact.ts`

**Prior rigorous logic docs — ✅ MINED 2026-06-17.** Findings consolidated in
`2026-06-17_TERRITORY_ARCHITECTURE_CONSOLIDATED.md`. **KEY FINDING:** the v7 constraint model places
**starWeight + CX + LP PRE-solve** (helper sites that shape the diagram) and only **DX + MSR POST-solve**,
and un-conflates `starWeight` (site weight; the control mislabeled `starMargin`) from `MSR` (keep-out
circle, entry→apex→exit rewrite). **Fresh PV applies all four SM/LP/CX/DX POST-solve** → realign to v7 on
adoption (this corrects §2 steps 11–14 below). Sources:
- ⬜ `_archive/F-138-ModifiedVoronoi/`: `PIPELINE_DESIGN.md`, `Deep technical guidance.md`,
  `ARCHITECTURE_ANALYSIS.md`, `CORRECTIONS_GROUND_TRUTH.md`, `DISCONNECT_ANALYSIS.md`,
  `APPROACH_COMPARISON.md`, `6th-approach.md`, `V2_IMPLEMENTATION_PLAN.md`, `VISUAL_ASSESSMENT.md`
- ⬜ `_archive/diagnostics/border-fill-mismatch/`: `00_README_PIPELINE_TRACE.md`,
  `IMPLEMENTATION_DIRECTIVE.md` (the exact problem the user is seeing again)
- ⬜ `_archive/territory-recovery-2026-03-08/`: `territory_canonical_frontier_border_fill_plan`,
  `territory_border_geometry_pipeline_plan`, `territory_border_quality_recovery_step1..6`,
  `territory_pipeline_unified_alignment_perf_morph_plan`
- ⬜ `sessions/2026-04-24/pv_transition_pass1_feedback_processing.md`, `pass2_algorithm_rethink.md`,
  `pass3_locked_terms_and_plan.md` (locked terminology + algorithm)
- ⬜ Restored dcc7 docs: `sessions/2026-05-05/territory-runtime-recovery-plan_v1..v7.md` (CX/LP/DX/MSR
  constraint model), `sessions/2026-05-15/topological-change-process-expanded.md`,
  `sessions/2026-05-16/topological-change-process-deepening.md`
- ⬜ `_archive/pre-ontology-.../files/TERRITORY_ARCHITECTURE.md`,
  `GEOMETRY_CONSOLIDATION_ANALYSIS.md`, `CONQUEST_ANIMATION_SPEC.md`, `morph boundary vertices.md`
- ⬜ Live session `*_Chat.md` / `*_Session.md` logs (transcript-search tool needs user approval)
- ⏳ **User is bringing their canonical notes** — mark ⭐ and prioritize when received.

**Verified current-state trace (for contrast, NOT the ideal):**
- ✅ `2026-06-16_GEOMETRY_ENGINE_DECISION_hybrid-converge.md` + the truth-trace synthesis
  (task `w8ir2hi3t`): 2 generators (legacy `generateVoronoiTerritoryGeometry` for PVV4 +
  `computeGeometry0319` for families), 2 assemblers, 3 config sources, caching asymmetry.

---

## 1. INPUTS (exact attributes)

- **starmap** — `StarState[]`; each star: `id`, `x`, `y`, (gameplay fields), and `ownerId?`.
- **ownership** — `OwnershipSnapshot`: `version`, `starOwners: Map<starId, ownerId>`,
  `contestedLaneIds`, `conquestEvents`, `virtualStars`.
- **lanes** — `StarConnection[]` (star adjacency; used by LP/CX/DX constraints).
- **world** — `{minX?,minY?,maxX?,maxY?,width?,height?}` (rect domain).
- **tunables** — `PvGeometryCoreTunables`: `starWeightPx` (1), `smoothingPasses` (2),
  `coordinateKeyScale` (1000 → 0.001px quantization), `starMargin` (0), `cxEnabled/cxCorridorWidth`,
  `lpEnabled/lpGateWidth/lpGatePolicy`, `dxEnabled/dxDistance/dxPolicy/dxAnchorMode`.

---

## 2. IDEAL OPERATIONAL PIPELINE (Fresh PV core — granular, with attributes)

Each step: **operation → output(attributes) [code] {invariant / defect}**.

1. **Resolve world rect.** Derive `minX,minY,maxX,maxY` from explicit bounds or `width/height`;
   throw if missing/non-finite/non-positive-area. → `PvWorldRect{shape:'rectangle',minX,minY,maxX,maxY}`.
   `[buildWorldBoundary]`
2. **Merge tunables** with `DEFAULT_PV_GEOMETRY_CORE_TUNABLES`.
3. **Build sites.** For each star: require `ownership.starOwners.get(id)` and finite `x,y`, else skip
   (count `omittedStarCount`). → `PvSite{siteId:"star:"+id, starId, ownerId, x, y, weight:starWeightPx,
   kind:'real_star'}`. `[buildPowerDiagram→buildRealStarSites]` {INV: exactly one site per owned,
   valid star; NO virtual sites — constraints are curve edits, not fake stars}.
4. **Clip polygon = world rect corners** (4 CCW corners). `[buildWorldBoundaryPolygon]`
5. **Weighted (power) Voronoi.** `weightedVoronoi().x.y.weight.clip(worldPoly)(sites)` → polygons.
   `[buildPowerDiagram, d3-weighted-voronoi]` {weight lets a star claim more/less area; uniform today}.
6. **Build cells.** Per polygon: recover its site; close ring; skip if <4 closed points. →
   `PvCell{cellId:"cell:"+siteId, siteId, starId, ownerId, points(closed ring)}`. {INV: one convex cell
   per site; cells tile the world with no gaps/overlaps}.
7. **Edge ledger — dedup.** For each cell edge (consecutive pts), skip degenerate (<1e-9). Build
   **direction-independent** `segmentKey` (quantize endpoints to 1/coordinateKeyScale, sort) → bucket;
   accumulate `sources{cellId,siteId,starId,ownerId,start,end}`. `[buildPvEdgeLedger]` {INV: the shared
   edge of two adjacent cells maps to ONE bucket — "each border exists exactly once"}.
8. **Edge ledger — classify.** Per bucket → `PvEdgeLedgerEntry{edgeId, siteA/B, starA/B, ownerA/B,
   cellA/B, rawPoints:[2], isWorldEdge(=no second cell), isSameOwner, visibility, sourceSegmentCount,
   stableSortKey}`. `visibility = world_frontier | hidden_same_owner | owner_frontier`. {INV: every edge
   knows BOTH incident owners/cells + its visibility class} {DEFECT: >2 cells on one segmentKey → only
   first two recorded}.
9. **Shared-curve graph.** Keep visible edges (drop `hidden_same_owner`); each → `PvSharedCurve{curveId:
   "curve:"+edgeId, edgeId, ownerAId, ownerBId(or 'world'), ownerPairKey:sorted(A,B), visibility,
   points:rawPoints}`. `[buildSharedCurveGraph]` {INV: each drawable border = one curve, jointly keyed by
   its two owners} {one curve per Voronoi edge; full A↔B border = many curves sharing ownerPairKey,
   chained at step 16}.
10. **Curves → raw fragments.** Each curve → `PvAdjustedFragment{fragmentId, ownerA/B, ownerPairKey,
    visibility, sourceEdgeIds:[edgeId], points, ancestry:[{kind:'raw_edge', sourceEdgeId}]}`.
    `[applyPvCoreConstraints]`
11. **SM — star-margin constraint.** marginPx=`starMargin`. Where a border passes within marginPx of a
    star, insert bends to push it off (project star→border). → rewritten fragments + `PvConstraintArtifact
    {kind:'sm',status,sourceEdgeIds,ownerIds,starId,points,reason}`. `[applyStarMarginConstraint]`
    **DEEPEN(internals)** {INV intended: no border within marginPx of a star} {GAP: single-best-per-polyline
    may under-protect multi-violations; needs convergence loop}.
12. **LP — lane-pair gate constraint.** Clamp contested-lane border intervals to a gate (`lpGateWidth`,
    policy `clampToGate` live; `passThroughGate/splitAroundGate/avoidGate` are stubs → `unsupported`).
    `[applyLanePairConstraint]` **DEEPEN** {user decision: clampToGate sufficient for now}.
13. **CX — corridor constraint.** Shape contested corridors (push owner-frontier edges; `cxCorridorWidth`).
    `[applyCorridorConstraint]` **DEEPEN**.
14. **DX — disconnect-seam constraint.** Seam/serpentine bends on non-lane cross-owner edges (`dxDistance`,
    `dxPolicy`, `dxAnchorMode`). `[applyDisconnectSeamConstraint]` **DEEPEN**.
15. **Fragments → constrained shared curves**; output `{sharedCurves, adjustedFragments,
    constraintArtifacts(sorted)}`. {ordering SM→LP→CX→DX is fixed}.
16. **Smooth shared curves.** Group curves by `ownerPairKey`; chain endpoint-connected curves into maximal
    frontiers; Chaikin-smooth (`smoothingPasses`, 0–5); redistribute smoothed points back to each per-edge
    curve. `[smoothSharedCurves]` **DEEPEN** {INV: each A↔B border smoothed ONCE → both sides identical;
    no double-smoothing}.
17. **Region loops.** (a) index visible ledger edges by segmentKey; (b) per cell edge that maps to a visible
    edge + shared curve, emit `OwnerBoundarySegment` for `cell.ownerId` (oriented to cell traversal; points =
    smoothed curve pts in direction); (c) per owner, walk segments into closed loops; (d) →
    `PvRegionLoop{loopId, ownerId, curveRefs:[{curveId,direction}], points, signedArea, starIds(stars inside
    ring)}`. `[buildRegionLoops]` {INV: fill is bounded by the SAME curve objects (curveRefs) that draw the
    borders → fill/border consistent by construction} {DEFECT A: walk is GREEDY first-unused, not angular →
    junction errors; DEFECT B: loopId is centroid-based, should be the starIds set it already computes}.
18. **Assemble snapshot.** `PvGeometryCoreSnapshot{version, world, sites, cells, edgeLedger, rawSharedCurves,
    adjustedFragments, constraintArtifacts, sharedCurves, regionLoops, smoothingPasses, fingerprint,
    diagnostics}`.
19. **Fingerprint** = FNV hash of (world, smoothingPasses, siteIds, edgeIds, fragmentKeys, curveKeys,
    artifactKeys, loopIds) → deterministic; identical inputs ⇒ identical geometry. `[buildFingerprint]`
20. **Validate** → `PvGeometryCoreDiagnostics{...counts, applied/candidate/unsupported, edge-visibility
    counts, invalidEdgeCount, duplicateSegmentCount, omittedStarCount, errors[]}`.
    `[validateGeometryCoreSnapshot]` **DEEPEN** (closure/topology/world-corner checks).
21. **Adapt to canonical snapshot** that render modes consume: `ResolvedGeometrySnapshot` (regions, frontier
    polylines, owner shells, frontier topology/sections, provenance, diagnostics).
    `[adaptPvCoreToCanonicalSnapshot]` **DEEPEN** — exact attribute mapping is the contract every render mode
    reads; this is where "presentation-only per mode" is enforced.

---

## 3. FINISHED GEOMETRY — attribute manifest (what consumers get) — **DEEPEN**

To fill from the adapter + GeometryContracts + per-mode needs:
- Regions: regionId(star-set), ownerId, points(closed), starIds, anchorStarIds, signedArea, holes?
- Frontier polylines (borders): per owner-pair, points, ownerA/B, confidence, kind.
- Frontier topology / sections: vertices (junction degree), sections (ownerPair, endpoints), loops —
  consumed by Edges/Field/GridGradient and by transitions.
- Owner shells (outer + holes classification).
- Per-mode derived: Metaball field, Grid raster (owner grid + distance field), GridGradient distance field.
- Transition attributes: stable section identity across frames (for vector-border morphing).

---

## 4. OPEN QUESTIONS / TO-RECONCILE
1. Does the user's prior rigorous pipeline (F-138 / canonical-frontier-border-fill plan) match the Fresh
   PV step order, or add/correct steps (esp. constraints + transitions)? → mining in progress.
2. Exact internal logic of SM/LP/CX/DX + smoothing + adapter (the `DEEPEN` markers).
3. Full downstream attribute manifest (§3) + what each render mode strictly needs.
4. Transition/morph model (kinetic Voronoi vs section-correspondence) — where it attaches to §2.
5. Should Fresh PV's 2 defects (greedy walk; centroid loopId) be fixed before or during adoption.
6. Whether to revert Phase A (legacy chainWalk angular change) given core-first direction.
