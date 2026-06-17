---
date created: 2026-06-17
last updated: 2026-06-17
last updated by: AI
type: empirical mode audit + unified architecture + first experiment
inputs: 4 transition-focused mode studies (Metaball/PerimeterField, MetaballGrid/GridGradient,
  Edges/Ember/PhaseField, PV/DistanceField) + the first-principles power-Voronoi geometry derivation
  + the power-Voronoi technical guide. All claims code-cited in the agent reports.
supersedes framing in: 2026-06-17_TERRITORY_SOLUTION_CANDIDATES_AND_RECOMMENDATION.md (this is grounded in code)
---

# Territory — Empirical Mode Audit + Unified Provenance-Driven Architecture

## 0. The one-paragraph answer
**Provenance lives in the geometry layer, not the transition.** Build the territory truth as a
provenance-native power diagram (DCEL = dual of weighted Delaunay; every border portion knows its two
owners; the `FrontierSection` contract — `leftOwnerId/rightOwnerId/ownerPairKey/points` — already exists
upstream). Every render family is then a **presentation** that *consumes* that provenance-carrying
frontier. The transition animation you already like (the flip-time wavefront in Edges/PhaseField/Grid
Gradient) loses provenance **only because the grid families re-derive ownership by rasterized
point-in-polygon and discard the frontier topology that is already computed.** Wire the wavefront to the
frontier sections (owner-pair-tagged, flip-time = distance to the radical axis) and you get the
water-flow animation you like **with** provenance. No new transition algorithm; no centroid; no
output-line correspondence.

## 1. The geometry TRUTH layer (provenance-native)
- Power diagram **as the dual of the weighted-Delaunay triangulation**, carried in a DCEL: face→owner,
  half-edge→{star_i, star_j} (radical-axis owners), vertex→{star triple}. **Provenance is intrinsic.**
- Fills = unions of same-owner faces; a fill's border *is* the same half-edges ⇒ **fill==border by
  reference**, not recomputation. Eliminates the current edge-key-match (`extractSharedEdges`) +
  junction chain-walk (`executeChainWalk`) failure points.
- `FrontierSection` (in `buildPowerVoronoiFrontierTopology`) **already carries** `leftOwnerId`,
  `rightOwnerId`, `ownerPairKey`, and the frontier polyline `points`. This is the provenance carrier the
  transitions need — and it is currently **discarded** at grid classification.
- Constraints per the guide: **SB** = weight-floor (inscribed-disk r_i = min_j (d_ij²+w_i−w_j)/(2d_ij)≥ρ),
  preserves partition; **CL** = ensure Delaunay-adjacency, frontier = radical axis; **DX** =
  connected-components on same-owner adjacency + indicator; **CX** = weight-bias/virtual-sites first,
  capsule-union last. Clamp w_j−w_i ≤ d_ij² (no hidden sites). Smoothing = Chaikin on shared half-edges,
  identical on the twin, junctions pinned (only partition-preserving smoothing).

## 2. The transition REALITY (what each built mode actually does)
Three families produce continuous/organic motion. **None is "segment translation" except the vector
active-front methods.**

| Family | Mechanism | Visual | Provenance now | Real blocker |
|---|---|---|---|---|
| **Grid wavefront** (Edges, Phase Field, Grid Gradient, Metaball Grid) | per-cell `flipTime∈[0,1]` (when it flips), assigned by wavefront distance old→new frontier; per-frame smoothstep dual-pass blend; GridGradient adds distance-field size gradient | **Organic water-flow** (you confirmed good) | **LOST** — rasterized point-in-polygon; isotropic distance field can't tell an X-edge from a Y-edge | **perf** (per-frame texture/distance rebuilds) + **tuning** (global `flipWindow`, no per-pair) |
| **Distance field** (DistanceFieldTerritoryRenderer, GPU) | multi-source Dijkstra (CPU, ~5ms on change); per-pixel min-influence (GPU ~1ms/frame); conquest = temporal blend `mix(curDijkstra, prevDijkstra, morphFactor)` | continuous, field-based | **per-pixel owner** (not crisp two-owner-per-segment, but derivable from the two nearest Dijkstra sources) | **strongest track record** — stable, tunable, fastest; border is an emergent iso-line, not a vector edge |
| **Vector flow** (OptimalTransportBorderMode/`interpolatePolylines` arc-length CDF; PolygonMorph star-ID matching; ActiveFront/pvFrontline) | section/polyline morph; arc-length CDF flow (closest vector water); star-ID-overlap matching (gold, non-centroid) | arc-length = water-like; active-front = segment-translation feel | **EXPLICIT** (topology refs, star-ID, owner pairs) | region-planarity not guaranteed per-polyline; topology-change handling + anchor fragility |

## 3. The unifying insight (this IS the render-family model)
- **One provenance-carrying geometry truth (power-diagram DCEL + FrontierSections). Render families are
  presentations that consume it. The transition is driven BY the provenance frontier — never by
  output-line correspondence.** That is exactly the render-family architecture already committed to.
- The good grid wavefront is provenance-blind *only* because it's fed a rasterized classification instead
  of the frontier sections. **Two independent studies converged on the identical fix:** seed flip-times
  from the `FrontierSection` (signed distance to the specific radical axis) and tag each changed cell
  `{ownerA, ownerB}`. Provenance becomes explicit **and** per-pair tunable; the wavefront sweeps the
  *true* frontier.
- So provenance + the liked animation are NOT in tension — the provenance is simply not being passed
  down. Fix the wiring, keep the animation.

## 4. Quarantine centroid (defunct — replace with identity)
Centroid matching lives in 3 places; do not extend it:
- `transitions/OptimalTransportBorderTransition.ts:210-223` (DY4 shell match) — **DEFUNCT**, legacy.
- `renderers/geometry/borderTransition.ts:124` (`matchPolylines`, 50% centroid-weighted) — active, fragile.
- `renderers/geometry/morphUtils.ts:239-244` (`buildLerpedPolylines`) — active, fragile.
Replace with **star-ID-set overlap** (already the "gold standard" in `PolygonMorphTransitionHandler`,
`borderTransition.ts:654-684`) and/or **FrontierSection identity** (owner-pair + endpoint topology).

## 5. The SMALLEST validating experiment (one conquest, no new engine)
Goal: prove "frontier-seeded, owner-pair-tagged flip-time wavefront = water-flow WITH provenance," and
simultaneously test whether the existing frontier topology is reliable enough.
1. Pick ONE already-attractive grid family (**Phase Edges** or **Grid Gradient**).
2. Pass the existing `FrontierTopology` (FrontierSections) into its plan build (currently not passed).
3. Add `assignFrontierSeededFlipTimes`: for each changed cell, find the relevant radical-axis
   `FrontierSection` (the prev/next owner pair), set `flipTime = normalized signed distance across it`,
   and tag the cell `{ownerA, ownerB}`. Keep the old grid-BFS seeder behind a flag for A/B.
4. Run ONE fixed-seed conquest. **Visual gate:** wavefront still flows like today (water) AND every
   border cell now carries its owner-pair (provenance present). Diff vs the BFS version.
5. **Diagnostic output:** was the frontier topology reliable for this conquest? (If not → the
   provenance-native DCEL geometry foundation (§1) is the prerequisite, and that becomes the next step.)
Small: one family, one seeding function, one conquest. Reuses the liked animation; proves the provenance
wiring AND topology reliability; introduces no new geometry engine or transition algorithm.

## 6. Decision points
1. **Primary transition presentation to prototype first:** the **frontier-seeded grid wavefront**
   (recommended — it's the animation you already like, provenance is the only missing piece) — vs the
   vector arc-length flow (crispest provenance, but the vector methods carry the segment-translation feel)
   — vs distance field (strongest/fastest, but field-based borders). Recommend: grid wavefront for the
   first experiment; keep the others as alternate presentation families on the same provenance truth.
2. **Is per-pixel/field provenance (distance field) acceptable for some modes**, or must every mode carry
   crisp two-owner-per-segment vector provenance? (Determines whether DistanceField stays a first-class
   family.)
3. **Static-first gate:** do we validate the provenance-native static geometry (§1) before the transition
   experiment, or run the experiment on the *existing* frontier topology first to learn if a geometry
   rebuild is even required? (Recommend the latter — it's cheaper and tells us if §1 is needed yet.)
