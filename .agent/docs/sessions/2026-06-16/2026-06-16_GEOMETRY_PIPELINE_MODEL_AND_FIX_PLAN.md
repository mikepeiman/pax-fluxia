---
date created: 2026-06-16
last updated: 2026-06-16
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-16/2026-06-16_GEOMETRY_AUDIT.md
  - .agent/docs/sessions/2026-06-13/2026-06-13_PROPOSAL_generator-animated-territory-rendering.md
  - .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md (stale target spec)
  - .agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md (live current-state)
  - dcc7: .agent/docs/sessions/2026-05-05/...recovery-plan_v7 ; 2026-05-16 repair-plan ; 2026-06-02 branch assessment
superseding docs:
---

# Territory Geometry — Pipeline Model, Structural History, Assembler Comparison, Fix Plan

Cross-validated from three angles: the PVV4 structural docs (dcc7), the live code on master,
and a literature check on the canonical algorithms. This is the working source-of-truth for
the geometry pipeline.

## TL;DR

1. **One generator, two assemblers.** The power diagram is computed once by
   `computeGeometry0319` (`compiler/Geometry_0319.ts`, d3-weighted-voronoi). Two different
   "assemblers" wrap it: the **render-family** path (`geometry/buildPowerVoronoi0319AuthoritySnapshot.ts`)
   and the **PVV4/pipeline** path (`layers/geometry/compiler_UnifiedVectorGeometry.ts`,
   `compileVectorGeometry`). `unified_vector` and `resolved_power_voronoi` geometry "modes" are
   the *same* engine with a label — not two engines.
2. **PVV4 is not a new generator.** It is a new *pipeline / contracts / runtime* (the
   `compileVectorGeometry` assembler, the enriched contracts, the 4-layer runtime, the
   transition planner) wrapping the reused 0319 power-diagram math.
3. **The broken geometry = the junction chain-walk** (`compiler/chainWalkCore.ts`
   `executeChainWalk`), which picks the next frontier segment at a ≥3-way junction by
   *insertion order* instead of *angular order* → owner perimeters fracture into open loops →
   dropped → missing fills + junction chords. This is defect #9 of the prior PV pipelines
   (below), and the literature confirms the greedy choice is *provably wrong*.
4. **Validated structural direction:** the textbook-correct conquest morph is to drive the
   change through the **dual regular (weighted-Delaunay) triangulation** — interpolate
   sites/weights and let geometry move, treating edge-collapse / cell-vanish as discrete flip
   events — *not* to correspond two output geometries. This is exactly PVV4's intent and the
   generator-animated proposal, now corroborated by the kinetic-Voronoi literature.

## 1. The correct geometry pipeline (end-to-end)

ownership → sites/weights → power diagram → cells → merge → (DX subtract / MSR arc-rewrite) →
shared frontier graph (incl. world edges, one chaining pass, junction- & boundary-pinned
Chaikin) → FrontierTopology (vertices/sections/loops; **a section exists exactly once**) →
region loops as ordered SectionRefs → **fills rebuilt from loops** → snapshot
(regions, frontier polylines, world borders, D-90 multimap, topology, shells, diagnostics).

Transitions (target): a conquest is a transformation of the **shared frontier graph**, not of
independent polygons; unchanged spans stay pixel-stable; only changed spans move; loops are
rebuilt from interpolated sections each frame (planar-partition invariant).

## 2. Structural defects of the prior PV pipelines (why it's broken)

From the dcc7 structural docs (SESSION_2026-03-17, recovery-plan_v7, repair-plan 2026-05-16,
branch assessment 2026-06-02, GeometryContracts/FrontierTopologyContracts). The ones still
live on master are flagged **[LIVE]**.

1. Fill/border divergence — fills smoothed independently of borders → jutting corners (B-42).
2. Chaikin not pinning **junctions** → triangular gaps at 3-way junctions.
3. Chaikin not pinning **world boundary** → dark gaps at the map edge.
4. World-boundary edges not first-class in chaining → flickering/disjoint outer borders.
5. Junction vertices computed then discarded → no identity to pin/match.
6. Fills from raw merge, not from borders → two independent geometry products disagree.
7. `SharedFrontierMap` single-value → silently drops disconnected border segments (→ D-90 fix).
8. Region identity from **centroid** → identity churns exactly during capture/split/merge. **[LIVE in the PVV4 compiler — `compiler_UnifiedVectorGeometry.ts:255`]**
9. **Chain-walk takes wrong path at junctions** (first sorted candidate, not angular) → "wrong path at a 3V" → open loops dropped → **missing fills + junction chords**. **[LIVE — `chainWalkCore.ts:191-225`; the failing test]**
10. Centroid-based transition matching → mispaired borders/fills. **[LIVE in legacy PVV2/borderTransition utilities]**
11. MSR as blunt per-vertex radial clamp → spikes near stars (vs. find entry/exit and rewrite the subpath as an arc).
12. Coordinate-frame fragility; ptKey/edgeKey logic duplicated in generator and renderer.
13. ~12k LOC of geometry duplicated across legacy renderers.
14. DX (disconnect) handling differs by path; can paint false corridors between unconnected same-owner stars.

## 3. The two assemblers compared (verified on master)

Both wrap `computeGeometry0319`. They diverge completely afterward.

| Aspect | Render-family (`buildPowerVoronoi0319AuthoritySnapshot`) | PVV4 (`compileVectorGeometry`) |
|---|---|---|
| Fills/regions | **Re-derived** via `resolveConstraintAlignedTerritoryGeometry` (MSR-aligned), `constructFillsFromFrontierChain` re-run | Uses 0319's `mergedTerritories` **directly** |
| Junction walks it touches | **Walk A** (`executeChainWalk`) **×3** (fills, topology, + discarded 0319 run) **and Walk B** (resolver unsigned-angle + `looksLikeJunctionSpur`) | **Walk A ×1** (the single shared 0319 walk); no Walk B |
| frontierTopology | `buildPowerVoronoiFrontierTopology` (re-runs `executeChainWalk`) on realigned polylines | `buildFrontierTopology` (pure conversion of the shared `frontierMap`; no re-walk) |
| Region identity | **owner + sorted REAL-star membership** (inlined `deriveStableRegionId`) ✓ | **quantized centroid** ✗ (defect #8) |
| Shells/holes | outer-only (no hole classification) | signed-area outer/hole + containment |
| D-90 multimap | ✓ | ✓ |
| Smoothing once | partial (MSR realigns post-smooth) | ✓ |

**Conclusion (subagent B, verified):** the **PVV4 compiler is the structurally healthier core**
— *single-walk provenance* (fills + topology share one walk; no fill/topology divergence),
world-edge unification, junction pinning, single-pass smoothing. Its one real miss is the
**centroid region ID** — and that is the easier fix (the `starIds` are already on each region).
The **render-family path is more exposed to the missing-fill bug**: it runs the buggy Walk A on
*MSR-displaced* polylines plus a second heuristic walk that can *intentionally drop*
junction-touching spurs — 4 independent opportunities to fracture/drop a fill. Note:
`geometry/regionIdentity.ts` did **not** survive the dcc7→master merge; `deriveStableRegionId`
is only **inlined** in the render-family assembler + classification files (a salvage gap).

## 4. Algorithmic foundations (validated against the literature)

- **DCEL/half-edge face extraction:** the correct `next` at a degree-≥3 vertex is *the
  angularly-adjacent outgoing edge* (twin → next in polar-angle order). A greedy "first
  available edge" is **provably wrong** (merges faces / strands half-edges). Prerequisite:
  edges sorted by polar angle around each vertex; watch float ties at junctions. → confirms the
  prime fix (`pickClockwiseAdjacentArc`, which the project already uses in `mergeSameOwnerCells`
  / `chainSharedEdgesIntoPolylines` but NOT in `executeChainWalk`).
- **Power (Laguerre) diagram:** convex cells, straight radical-axis edges, 3-way junctions =
  radical centers. Caveat: a cell can be empty and a site need not lie in its own cell — don't
  assume site-in-cell.
- **Kinetic / morphing power diagram:** valid planar partition at every instant; topology
  changes only at discrete events (edge-collapse, cell appear/vanish), finite in number. The
  robust pattern is to maintain the **dual regular triangulation** and apply edge-flips at
  collapse events — this *eliminates* 3-way-junction animation errors.
- **Polyline morph correspondence** (equal-arc-length resample + monotone correspondence) is
  the correct *generic* technique — but is **only needed for boundaries that don't share a
  generating diagram.** For same-site conquest, interpolate sites/weights instead (cleaner,
  correspondence-free). This is the key efficiency the dcc7 correspondence-first planner misses.

Citations: de Berg et al. *Computational Geometry* §2.2; Aurenhammer 1987 (power diagrams);
Albers/Guibas/Mitchell/Roos 1998 + kinetic-Delaunay literature; Sederberg & Greenwood 1992/93
(shape blending).

## 5. Recommended fix plan (layered; lowest-risk first)

- **A. PRIME — `executeChainWalk` angular-order junction selection.** Replace insertion-order
  first-pick with `pickClockwiseAdjacentArc` (the convention the rest of the pipeline already
  uses; textbook-validated). Fixes Walk A **everywhere** (both assemblers + `frontierMap`).
  Gate: the failing junction test goes green; full territory suite green; user visual check.
  Highest leverage, smallest change.
- **B. Align/retire the resolver's second walk.** Bring `resolveConstraintAlignedTerritoryGeometry`'s
  walk to the same angular convention (signed, not unsigned) and remove the `looksLikeJunctionSpur`
  band-aid; longer-term, stop the render-family path re-walking 4×. Removes the render-family's
  extra fragility.
- **C. Region identity.** Extract the inlined `deriveStableRegionId` to a shared module and use
  it in the PVV4 compiler (replace centroid IDs, defect #8). Low risk; `starIds` already present.
- **D. DEEPER (transitions, the "right" structural answer).** Drive conquest morphing through the
  dual regular/weighted-Delaunay triangulation: interpolate sites/weights; handle
  edge-collapse / cell-vanish as discrete flip events; rebuild loops from sections. Eliminates
  the correspondence problem *and* the per-frame re-walk. Converges PVV4 intent + the
  generator-animated proposal + the kinetic-Voronoi literature. Multi-session; do after A–C and
  steady-state parity.

Long-term: converge on **one** assembler = PVV4 compiler core (single-walk) + the
render-family's real-star identity. Don't maintain two.

## 6. Decisions for the user
1. Depth now: ship **A** (prime, surgical, test-gated) and evaluate, or also do **B–C** in the
   same pass? (A helps every mode immediately.)
2. Commit to **D** (kinetic-Voronoi transitions) as the transition direction, replacing the
   correspondence-first planner — or keep the planner and only fix geometry?
3. Converge to one assembler (PVV4 core + real-star identity), yes/no.
