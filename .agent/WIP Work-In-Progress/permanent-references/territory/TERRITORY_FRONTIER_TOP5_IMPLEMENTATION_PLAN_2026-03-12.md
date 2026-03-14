# Territory Frontier Geometry - Top 5 Implementation Plans (2026-03-12)

## 1) Input Synthesis (Ground Truth Constraints)
- One canonical frontier geometry must drive both borders and fills.
- Graph ownership, lane topology, and world bounds must stay consistent at all times.
- MSR/CX/DX must be part of the metric model, not post-hoc hacks.
- Runtime must be mode-switchable for A/B testing.
- Frontier generation must support deterministic debug stepping.

## 2) Method Selection (Top 5)
1. FG1 Adaptive Field
2. FG2 Seed Graph
3. FG3 Implicit Trace
4. FG4 Pairwise Arrangement
5. FG5 RT-Assisted Publish

## 3) Detailed Frontier Plans

### FG1 - Adaptive Field
Goal: Build frontiers from an adaptive scalar ownership field with error-bounded extraction.

Implementation steps:
1. Metric stage: compute modified graph distances per owner with MSR/CX/DX.
2. Field stage: sample ownership confidence on a quadtree (denser only near owner transitions).
3. Isoline stage: extract owner-pair zero-crossings via marching segments on adaptive cells.
4. Topology stage: snap intersection vertices to a shared node map (epsilon welded).
5. Publish stage: emit owner-pair polylines and owner loops from the same node graph.

Modules:
- `metric/biasedDijkstra.ts`
- `field/adaptiveGrid.ts`
- `frontier/isolineExtractor.ts`
- `topology/sharedNodeAssembler.ts`
- `publish/frontierLoopBuilder.ts`

Complexity target:
- O(E log V) metric + O(K) adaptive samples where K is near-frontier only.

Primary risk:
- Topology cracks from independent sampling.
Mitigation:
- Single shared node table and deterministic edge ownership normalization.

Acceptance gates:
- No visible fill/border seams at any zoom.
- Frontier Hausdorff delta < 1.5 px across repeated runs with same input.

### FG2 - Seed Graph
Goal: Generate canonical frontier geometry from deterministic seed points and graph chaining.

Implementation steps:
1. Seed lane-analytic points where biased distances tie on each lane.
2. Add pairwise/star-pair bisector seeds at contested hubs.
3. Add optional RT-derived seeds only where graph coverage is sparse.
4. Build owner-pair proximity graph over seeds.
5. Extract maximal chains, then fit with family-specific simplifiers (straight/curved/segmented).
6. Build owner loops by substituting shared frontiers into region templates.

Modules:
- `seed/laneEqualDistanceSeeds.ts`
- `seed/starPairSeeds.ts`
- `seed/rtRefinementSeeds.ts`
- `graph/frontierSeedGraph.ts`
- `fit/frontierFamilyFit.ts`

Complexity target:
- O(E + S log S), where S is total seeds.

Primary risk:
- Under-seeding in sparse zones.
Mitigation:
- Adaptive backfill pass based on chain gap thresholds.

Acceptance gates:
- Every contested lane has at least one canonical seed.
- No orphan chain fragments in production mode.

### FG3 - Implicit Trace
Goal: Trace frontiers directly from implicit owner-pair equality without full raster dependence.

Implementation steps:
1. Build pairwise implicit function Fpq(x,y)=Dp(x,y)-Dq(x,y).
2. Seed contour tracing from lane crossing guesses and junction candidates.
3. Trace contours with predictor-corrector stepping.
4. Snap traced vertices into shared topology nodes.
5. Resolve multi-owner junctions with deterministic angular ordering.

Modules:
- `implicit/pairwiseField.ts`
- `trace/frontierTracer.ts`
- `trace/junctionResolver.ts`
- `topology/nodeNormalizer.ts`

Complexity target:
- O(T) where T is traced points; bounded by step size and world perimeter.

Primary risk:
- Trace drift and loop non-closure near flat gradients.
Mitigation:
- Newton correction + closure validator with fallback reseed.

Acceptance gates:
- 100% closed loops for owned regions.
- Junction valence and angle checks pass for all multi-owner nodes.

### FG4 - Pairwise Arrangement
Goal: Build exact shared boundaries via arrangement of pairwise bisector primitives.

Implementation steps:
1. Construct pairwise bisector arcs/segments for all contested owner pairs.
2. Clip primitives to world bounds and ownership feasibility domains.
3. Compute arrangement intersections and build planar graph.
4. Label faces by owner dominance.
5. Emit shared frontiers from face adjacency and derive owner loops.

Modules:
- `arrangement/pairwisePrimitives.ts`
- `arrangement/clipAndIntersect.ts`
- `arrangement/planarGraph.ts`
- `arrangement/faceLabeller.ts`

Complexity target:
- Higher than FG2; depends on primitive count and intersection density.

Primary risk:
- Combinatorial blow-up on dense contested maps.
Mitigation:
- Domain pruning using graph reachability and neighborhood cutoffs.

Acceptance gates:
- Exact pairwise consistency across all owner faces.
- Deterministic graph labeling independent of insertion order.

### FG5 - RT-Assisted Publish
Goal: Use GPU ownership RT as a high-speed oracle, then publish vector frontiers canonically.

Implementation steps:
1. Render owner index + confidence RT from biased metric data.
2. Extract pixel-edge transitions and sub-texel crossing points.
3. Build centerline graph from extracted transitions.
4. Simplify and smooth with shared-edge preservation constraints.
5. Publish final vector frontiers and derive fills from same graph.

Modules:
- `rt/ownershipPass.ts`
- `rt/transitionExtractor.ts`
- `graph/centerlineBuilder.ts`
- `publish/vectorPublisher.ts`

Complexity target:
- O(P) on transition pixels, not full frame area after culling.

Primary risk:
- RT resolution artifacts.
Mitigation:
- Multi-scale extraction and confidence-weighted snap to lane analytics.

Acceptance gates:
- Quality parity vs FG2 reference at 60fps budget.
- Controlled error envelope across 512-2048 RT sizes.

## 4) Cross-Method Validation Matrix
- Frontier-loop coincidence: mandatory for all methods.
- Border continuity at world edge corners: mandatory.
- Owner-pair symmetry: frontier(p,q) == frontier(q,p).
- Determinism under same snapshot: bitwise-stable IDs and order.

## 5) Recommended Build Order
1. FG2 as baseline canonical path.
2. FG5 as performance accelerator.
3. FG1 for quality/perf balance on large maps.
4. FG3 for high-fidelity diagnostics and research.
5. FG4 for exactness benchmark and offline validation.