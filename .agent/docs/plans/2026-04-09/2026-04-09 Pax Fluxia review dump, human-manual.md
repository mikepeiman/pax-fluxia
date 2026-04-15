
# taxonomy of possible VFX targets 
***(comprehensive but not considered absolute or immune to change or expansion)***

   - `VFX_TerritoryGeometry `
   - `VFX_TerritoryGeometryAdjustment `
   - `VFX_TerritoryFillStyle `
   - `VFX_TerritoryBorderStyle `
   - `VFX_TerritoryFillTransition `
   - `VFX_TerritoryBorderTransition `
   - `VFX_StarBodyStyle `
   - `VFX_StarStateOverlay `
   - `VFX_LaneBodyStyle `
   - `VFX_LaneOrderIndicator `
   - `VFX_ShipOrbitStyle `
   - `VFX_ShipDepartureTransition `
   - `VFX_ShipTravelPath `
   - `VFX_ShipArrivalTransition `
   - `VFX_ShipAttackEngage `
   - `VFX_ShipConquestTransfer `
   - `VFX_ShipTransportTransfer `
   - `VFX_ShipDamageState `
   - `VFX_ShipRepairState `
   - `VFX_ShipDestruction `

DY4 best transition mode decalred sacrosanct, line 1140 "C:\Users\mikep\Downloads\2026-03-17 chatlog Antigravity.md"

# Territory Geometry \& Rendering PRD

This document defines the canonical architecture, constraints, data model, algorithms, rendering model, and implementation boundaries for a graph-native territory system for a star-map RTS. Territory ownership is determined by shortest-path distance on the star–lane graph, full-map fills must cover the entire world, and borders must be rendered as clean, even-width geometry rather than raster contours.

## Product intent

The system exists to render territory in a way that is mechanically truthful, visually legible, and stable under conquest. Territory must communicate graph connectivity, respect lane competition, preserve disconnected holdings, and support multiple geometric families without breaking the underlying ownership model. 

The canonical geometric model has only two primary outputs:
- **Frontier geometry**: singular map-wide frontier outlines in world space. 
- **Owned regions**: enclosed regions tagged with exactly one player owner. These regions are bounded by their respective portion of the frontier geometry; in other words, regions are cells within the 

Everything else — border meshes, fill meshes, shaders, animation state, debug overlays — is derived from those outputs. 

## Non-negotiable requirements

### Gameplay truth

- Ownership is determined by **shortest-path distance on the star–lane graph**, not Euclidean distance in 2D. 
- Lanes do not themselves carry ownership; stars are the sources of ownership and lanes define traversal and competition structure. 
- Ties must be deterministic and stable. 


### Full-map partition

- Every point inside world bounds must resolve to exactly one player; there is no neutral visual space. 
- The map must be partitioned into owned regions separated by shared frontiers. 


### Lane legality

- **Lane-exclusivity constraint**: only one or two player territories may underlay any lane interior point.
- A lane may be:
    - fully inside one player’s holding, or
    - split by exactly one frontier between two players.
- No third player may touch or cross the interior of a lane.

This replaces virtual disconnect hacks as the primary lane-legibility rule.

### Connectivity truthfulness

- If the induced subgraph of Player P contains multiple disconnected components, the visual territory must preserve that separation.
- The renderer must never imply same-player connectivity where the graph does not provide it. 


### Borders

- Borders must be **clean, straight/even-edged by default**, with optional curved and segmented geometry families. 
- Borders must have adjustable width, softness, alpha, and blending.
- The border between two adjacent players should typically be represented once, shared by both sides. However modes that draw borders on either side of the territorial boundaries are desirable as an alternative, secondary mode (not a priority or default mode).


### Animation

- Ownership changes must produce local, stable, visually smooth motion over time.
- Borders and fills must animate from the same frame geometry, so they cannot drift apart. 

| What you mean                                     | Best term                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Why it fits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The whole current situation of the map            | Territorial control state                           | It describes who controls what, including regions, borders, and spatial balance.             |
| The visible map layer                             | Territorial control map                             | It reads naturally to players and matches the color-partitioned world shown in the image.    |
| One player’s colored area                         | Territory, territorial region, or domain            | These all fit contiguous owned space bounded against rivals.                                 |
| A single separating line between two players      | Border or territorial boundary                      | These are the most exact terms for a crisp dividing line.                                    |
| The full set of all inter-player borders          | Territorial boundary network or frontier network    | This captures that the borders form a connected strategic structure across the map.          |
| Only the dangerous, contested parts of the border | Front line or active front                          | Use this only where enemy contact or conflict is actually happening.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |


## Boundary extraction

Boundary extraction turns graph-native ownership truth into singular world-space territorial region outlines.

A boundary/frontier is the actual shared boundary between adjacent territories. It is not a stroke, not a mesh, and not a style effect. It is the canonical geometric boundary.

#### 1\. Architectural Axioms and Systemic Constraints

In high-performance RTS environments, spatial ownership is a derivative of graph connectivity rather than Euclidean proximity. The Modular Territory Engine treats the game world as a  **Medium**  defined by a 2D spatial embedding of a 1D non-Euclidean graph. Propagation within this medium is fundamentally  **anisotropic** ; ownership flows along lanes (edges) and radiates from stars (nodes), making space entirely subservient to the underlying topology. This architecture moves beyond standard Voronoi approaches by enforcing graph-centric logic over pure coordinate-based distance.

##### 1.1 Axiomatic Definitions

To maintain the integrity of the graph-to-space mapping, the engine enforces three core mathematical constraints:

* **Minimum Star Radius (MSR):**  This constraint guarantees a physical spatial presence for every node. It is implemented via  **Additive and Multiplicative Seed Weights**  in the Voronoi generator, ensuring stars are never "swallowed" by high-weight neighbors.  
* **Corridor Extension (CX):**  This ensures that lanes project spatial ownership to facilitate troop movement visibility. The engine utilizes  **Vector Capsule Primitives**  along edges to mathematically guarantee lane envelopment, regardless of nearby enemy nodes.  
* **Disconnect Bias (DX):**  To prevent same-owner subgraphs from merging into illegible "blobs," the system applies a repulsion force between disconnected components. This is achieved through  **Multi-source Dijkstra**  ownership checks and  **Straight Skeleton offsets** , forcing a neutral or enemy-controlled gap between non-lane-connected islands.

##### 1.2 Performance and Output Mandates

The system shall provide  **Unified Frontiers** —canonical, shared vector boundaries with zero-gap alignment.

* **Raster Exclusion:**  The use of Marching Squares, pixel-grid rasterization, or contour extraction from render textures is strictly forbidden. The architectural justification is the elimination of  **aliasing and "stair-stepping" artifacts** , which compromise the precision of vector-perfect frontiers.  
* **Performance Envelope:**  The engine is targeted for  **2K resolution at 60 FPS with 100 stars, 50K visible ships, and 10 concurrent conquests** . 

#### 2\. The Modular Pipeline Architecture

The engine functions as a decoupled router, separating the mathematical simulation of ownership from the final rendering methodology. This allows the system to switch between vector-stroke Voronoi and high-fidelity distance fields without altering the ground-truth simulation.

##### 5.1 The Power Voronoi (PVV2/PVV3) Module

This module utilizes the d3-weighted-voronoi library to produce power diagrams where cell boundaries shift according to the weights defined in Section 4.2.

* **Refinement Pipeline:**  Once SharedBorderEdges are extracted, the engine applies  **Chaikin corner-cutting subdivision**  for initial smoothing, followed by  **Bezier fitting** . This produces the signature organic vector stroke required for the professional RTS aesthetic.

##### 5.2 The Distance Field (DF) Module

The DF module employs an analytical scalar field approach. At high quality, it utilizes a  **Jump Flooding Algorithm (JFA)**  pass to generate a supersampled border field.

* **Vectorization:**  The "Canonical Frontier" is extracted via  **Vector Polylines**  from the distance field at a resolution defined by DF\_RESOLUTION, ensuring zero-gap alignment between adjacent players.


##### 6.2 PIXI Implementation

The final visual output is rendered using PIXI.Graphics. To satisfy the "Unified Frontier" mandate, the system utilizes the graphics.poly(fillPts.flat()) method combined with graphics.cut() for  **enclave and hole detection**  (solving the B-38/B-42 challenge). This ensures that "holes" within a player's territory (e.g., an enemy star surrounded by player territory) are mathematically excluded from the fill, maintaining perfect visual clarity.This modular, concern-separated architecture ensures the engine is both high-performance and future-proofed against evolving rendering requirements.  

## Ranked Decision Matrix

| Rank | Method | Graph-Correctness | Unified Frontiers | Tunable Constraints | Dynamic Morph | Implementation Cost | Visual Cleanliness | Overall Score |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | G4: Component-aware Graph Voronoi + Shared-Border Graph + Fitter | Very High | Very High | Very High | Very High | Medium | Very High | **9.5/10** |
| 2 | G3: Graph Truth + Pressure-Modified Frontier Seeds | High | Very High | Very High | High | Low-Medium | High | **9.0/10** |
| 3 | G2: Graph Voronoi + RT Assist + Vector Frontiers | High | Very High | High | High | Medium | High | **8.5/10** |
| 4 | C4 + C2: Shared Owner-Pair Border Graph + Lane/Star-Pair Seeds | High | Very High | High | High | Low | High | **8.0/10** |
| 5 | A3 + D4: Weighted Graph Voronoi + Straight Skeleton Offsets | Very High | High | Very High | Medium | High | Very High | **7.5/10** |


|   |   |
|---|---|
|Synthetic anchors allowed|Supports true stable boundaries even mid-section|
|No birth behavior|Avoids invented visual effects|
|Death collapses to lost-star center|Handles true disappearance cleanly|
|Dirty loop/component rebuild|Rebuild only what changed|
|Fill and border share frame geometry|Guarantees alignment|

## 0. Non‑negotiable Principles

1. **Graph-native ownership truth**
    
    - Ownership is defined exclusively by shortest-path distance on the star–lane graph (multi-source top‑2 Dijkstra), not by Euclidean or grid distance.
        
    - All canonical geometry and all fills must ultimately derive from this graph truth, not from a post-hoc rasterization.
        
2. **Single canonical frontier representation**
    
    - There must be exactly one authoritative geometric representation of the territory interface: the **Frontier Graph** (defined below).
        
    - Both borders (stroke meshes) and fills (territory color field) must be derived from this same frontier. No mode may show borders and fills derived from different “truths”.
        
3. **Centerline semantics**
    
    - “Centerline” means _the geometric locus of points where two players have equal graph distance and are locally closest competitors_.
        
    - It does **not** mean “the medial axis of the jagged outline of a raster cell partition”.
        
    - Any centerline computed from an ownership **lattice** (grid) is non‑canonical and must be treated as a legacy / experimental source only.


Yes — and the best way to think about this is to separate three layers:

- **Frontiers**: the geometric ownership boundaries in world coordinates.
- **Borders**: the rendered strokes drawn on those frontiers.
- **Ownerfill**: the filled regions on either side of the frontiers.

If frontiers are correct and unified, borders and fills become a rendering problem. If frontiers are wrong or duplicated, nothing downstream will ever look clean.

Below I’ll do your two requested tasks.

***

# FIRST: Standalone research prompt / spec summary

This is a minimal but sufficient standalone description of the problem.

## Problem summary

Design a theoretically correct and practically renderable **static and dynamic territory system** for a star-map RTS.

### World model
- The game world is a 2D map containing **stars** (nodes) and **lanes** (edges).
- Ownership exists on **stars only**.
- Lanes define **graph connectivity and traversal cost**, not direct ownership.
- Distances must be computed on the **star–lane graph**, not by straight-line Euclidean distance in 2D.

### Territory truth
- Territory ownership at any point in the world must be derived from **shortest-path distance on the graph** to the nearest star owned by each player.
- This is a **non-Euclidean**, graph-native territory system.
- Same-player territory that is connected by graph structure should visually merge.
- Same-player territory that is **not** connected by graph structure must remain visually disconnected and be separated by enemy territory.
- Long lanes must remain fully encompassed by connected territory even if they pass spatially through another player’s region.
- There must be tunable constraints affecting territory shape:
  - **MSR**: minimum distance from owned stars to frontier / minimum star radius influence.
  - **CX**: corridor / connection extension bias so territory properly covers owned connectivity.
  - **DX**: disconnect / separation bias so visually disconnected holdings remain separated by enemy pressure.

### Static territory deliverable
The static territory system must define:
1. **Frontiers**: a unified set of ownership boundaries in world coordinates.
2. **Borders**: rendered vector-like strokes that exactly follow frontiers.
3. **Ownerfill**: region fills on each side of the frontiers, perfectly consistent with frontier geometry.

### Static visual requirements
- Borders must appear **vector-like, smooth, even-edged**, and tunable between:
  - straighter / more angular,
  - more rounded / more curved,
  - segmented / stylized.
- Frontiers should support tunable section length characteristics, e.g. min/max segment lengths.
- The system must support unified frontiers:
  - either perfectly shared identical coordinates between adjacent territories,
  - or a single canonical shared border entity referenced by both adjacent territories.

### Dynamic territory requirements
The static system must support a dynamic/animated version where:
- When ownership changes, **frontiers transform smoothly** from old geometry to new geometry over one tick.
- **Ownerfill follows the frontier exactly** at all times.
- There is **no alpha crossfade** for ownerfill; fill always reflects true instantaneous territory shape.
- Border/frontier motion should minimize deformation and travel distance:
  - the old frontier should transform into the new frontier with the smallest reasonable geometric motion.
- The system should support tuning of animation style and speed.

### Performance target
- Must be practical for **2K resolution at 60 FPS**.
- Territory recomputation can happen on ownership/topology changes.
- Rendering must remain stable and performant in steady state.

### Research objective
Identify and compare as many viable methods as possible to generate **unified frontiers** for graph-native territory, including exact, approximate, geometric, field-based, optimization-based, and hybrid methods, with special attention to:
- theoretical correctness,
- clean vector-renderable borders,
- tunable MSR/CX/DX constraints,
- unified shared borders,
- smooth dynamic morphing.

***

# SECOND: Maximum options for unified frontier generation

Below is a broad method catalogue. I’ll give the method, what it means, whether it is graph-correct, whether it yields unified frontiers naturally, whether it supports your tunings, and whether it seems strong for your use case.

I’ll group them by family.

***

## Family A: Exact or near-exact graph-Voronoi methods

These are the most principled because your ownership truth is fundamentally a **graph Voronoi diagram** on a network. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)

***

## Method A1: Pure graph Voronoi on nodes + edge interpolation

### Idea
- Compute shortest-path distance from every player to every star using multi-source Dijkstra. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)
- On each lane, define ownership continuously by interpolating graph distance from the two endpoints.
- Frontier points are where two players have equal interpolated graph distance on a lane.

### Frontier representation
- Shared by construction if stored as equal-distance points/segments.
- Naturally produces **unified frontiers** on lanes.

### Strengths
- Very graph-correct.
- Fast.
- Handles MSR/CX/DX naturally if baked into graph costs.
- Great for guaranteed connectivity truth.

### Weaknesses
- Only gives frontier directly on graph edges unless extended into full 2D field.
- Needs an additional step for interstitial/open-space boundaries.

### Verdict
**Strong core component, but incomplete alone.**

***

## Method A2: Full graph-Voronoi scalar field + continuous contour extraction

### Idea
- Define a continuous ownership scalar field over the 2D world:
  \[
  F_p(x,y) = \text{graph-based distance from point } (x,y) \text{ to player } p
  \]
- Territory owner at point = player with smallest \(F_p\).
- Frontier = zero set of pairwise difference fields:
  \[
  G_{pq}(x,y) = F_p(x,y) - F_q(x,y)
  \]
  where \(G_{pq}(x,y)=0\) and both beat other players.

### Frontier representation
- A unified contour set, naturally singular/shared.

### Strengths
- Theoretically the cleanest full-field formulation.
- Shared frontiers are automatic.
- Easy to animate by interpolating fields.

### Weaknesses
- Hardest to define off-lane continuous distance correctly.
- Requires either interpolation theory or numeric field representation.

### Verdict
**Gold-standard theory**, but implementation depends on how you define \(F_p(x,y)\).

***

## Method A3: Graph Voronoi with weighted seeds / additively weighted graph Voronoi

### Idea
- Same as A1/A2, but owned stars have different seed offsets or influence radii.
- MSR is implemented as a negative seed offset.
- CX and DX are encoded as graph-edge penalties/bonuses.

### Frontier representation
- Same as graph Voronoi, but tunable.

### Strengths
- Gives you a principled place to put MSR/CX/DX.
- Still graph-correct. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)

### Weaknesses
- Same geometric extension problem as above.

### Verdict
**Very important variant.** Likely part of the final solution even if not the whole solution.

***

## Family B: Field-based contour methods

These build a 2D field, then extract shared frontiers as contours.

***

## Method B1: Ownership render texture + marching squares / contour extraction

### Idea
- Rasterize ownership to a texture from graph distances.
- Extract boundaries where neighboring texels have different owners.
- Refine sub-texel positions using gap or difference values.

### Frontier representation
- Unified if you extract the contour once and store it canonically.

### Strengths
- Easy to build.
- Full-world coverage.
- Good for fills and debugging.

### Weaknesses
- If the contour is extracted directly from the raster lattice, stepping artifacts are baked in.
- Needs post-fit / refinement to look vector-clean.

### Verdict
**Useful as a support method**, not ideal as sole canonical geometry source.

***

## Method B2: Multi-channel signed distance field contours

### Idea
- For each player or owner-pair, maintain a signed distance field.
- Frontier is the zero contour between the fields.
- Borders render cleanly by sampling the signed field.

### Frontier representation
- Shared by definition.

### Strengths
- Excellent for smooth morphing and animation.
- Good for ownerfill following frontier exactly.

### Weaknesses
- Building a graph-correct continuous signed distance field is nontrivial.
- If sampled too coarsely, can still alias.

### Verdict
**Strong for dynamic rendering**, especially if paired with vectorized extracted frontiers.

***

## Method B3: Pressure / influence field equilibrium contours

### Idea
- Each player produces an influence/pressure field based on graph distance:
  \[
  P_p(x,y) = \sum_i w_i \phi(d_i(x,y))
  \]
- Frontier where the strongest two pressures tie.

### Frontier representation
- Shared contour of equal pressure.

### Strengths
- Naturally tunable.
- Good for “bubble” feel and organic shaping.
- MSR/CX/DX can be folded into the field definition.

### Weaknesses
- Can drift from pure shortest-path semantics if you sum influences too freely.
- Need care so disconnected same-player holdings don’t falsely merge.

### Verdict
**Very interesting styling/constraint layer**, but safest if used as a controlled modification of graph distance rather than as a replacement.

***

## Method B4: Fast marching / Eikonal front propagation on a weighted field

### Idea
- Treat ownership as wavefronts propagating through a weighted medium.
- Frontiers form where wave arrival times match.

### Frontier representation
- Unified arrival-time equality contour.

### Strengths
- Excellent for smooth fronts and morphs.
- Handles anisotropic/weighted travel elegantly.

### Weaknesses
- More compute-heavy.
- Need to define the weighted medium so it respects graph connectivity.
- Can accidentally become too Euclidean if not constrained.

### Verdict
**Powerful but likely overkill** unless you truly want continuous physical front propagation.

***

## Family C: Explicit frontier point / segment generation

These are closest to your current intuition.

***

## Method C1: Frontier-genesis points from lane equalities + join

### Idea
- Compute initial frontier points analytically where player distances tie on lanes.
- Join them into unified frontier polylines.

### Frontier representation
- Shared points and shared connected lines.

### Strengths
- Explicit, controllable, efficient.
- Gives singular frontiers naturally.
- Easy to apply MSR/CX/DX before point placement.

### Weaknesses
- Needs a reliable rule for generating enough non-lane points in open space.

### Verdict
**Very promising as a canonical geometry backbone.**

***

## Method C2: Frontier-genesis points from lane equalities + star-pair competitions

### Idea
- Add frontier seed points not just on lanes, but also from competing owned-star pairs.
- For star pairs from different players, generate likely bisector points based on graph competition.
- Connect seeds into frontiers.

### Strengths
- Better coverage than lane-only.
- Still cheap.

### Weaknesses
- Needs careful pruning.
- Not exact unless the bisector construction is principled.

### Verdict
**Good extension to C1.**

***

## Method C3: Frontier seeds from constrained optimization

### Idea
Generate frontier points by minimizing an energy such as:

\[
E(x) = |d_p(x)-d_q(x)| + \lambda_1 C_{\text{lane}}(x) + \lambda_2 C_{\text{disconnect}}(x) + \lambda_3 C_{\text{star-clearance}}(x)
\]

Where:
- first term enforces equal competition,
- other terms encode MSR/CX/DX or shape preferences.

### Strengths
- Very flexible.
- Can explicitly enforce your constraints.

### Weaknesses
- Harder to implement/debug.
- Need robust optimization and good initialization.

### Verdict
**Strong if you want maximum control**, but more advanced.

***

## Method C4: Frontier points from pairwise owner competition graph

### Idea
- Build a meta-graph of player-pair competition zones.
- Generate one canonical set of frontier points/edges per `{ownerA, ownerB}` pair.
- Territories reference those edges as shared borders.

### Strengths
- Shared borders become first-class objects.
- Great data model for static and dynamic territory.

### Weaknesses
- Still needs a geometric submethod to place the points.

### Verdict
**Excellent data architecture, regardless of geometric method.**

***

## Family D: Polygonal / computational geometry methods

These methods treat territories as polygons or arrangements.

***

## Method D1: Polygon clipping from per-player influence regions

### Idea
- Generate a polygonal influence region for each player.
- Intersect / clip all player regions against one another.
- Shared polygon edges become frontiers.

### Strengths
- Unified edges are natural.
- Works nicely for ownerfill and border sharing.

### Weaknesses
- You need a good generator for the initial regions.
- Can be numerically messy.

### Verdict
**Very good if paired with a strong influence-region generator.**

***

## Method D2: Arrangement of pairwise bisector curves

### Idea
- Build pairwise bisector curves between players.
- Compute the planar arrangement of those curves.
- Keep only the edges where those two players are the top competitors.

### Strengths
- Very principled.
- Shared frontiers are exact.

### Weaknesses
- Complex computational geometry.
- Probably more machinery than you need.

### Verdict
**Theoretically elegant, practically heavy.**

***

## Method D3: Power diagram / weighted Voronoi generalization

### Idea
- Use weighted sites and power diagrams to shift boundaries.
- Adapt weights to graph-influenced or star-influenced territory.

### Strengths
- Nice control over site influence.
- Unified boundaries.

### Weaknesses
- Native power diagrams are Euclidean.
- Hard to make truly graph-native.

### Verdict
**Only as an approximation or stylistic layer, not pure truth.**

***

## Method D4: Straight skeleton / offset polygon methods

### Idea
- Start from territory polygons and derive shared boundaries, offsets, and shrink/grow operations via straight skeletons. [tandfonline](https://www.tandfonline.com/doi/full/10.1080/16864360.2014.997637)

### Strengths
- Great for offsetting, border widening, mitering, and shape stylization. [doc.cgal](https://doc.cgal.org/latest/Straight_skeleton_2/index.html)
- Excellent support for roundness/angularity controls downstream.

### Weaknesses
- Not a territory generator by itself.
- Needs initial polygons/frontiers from some other method.

### Verdict
**Excellent downstream geometry tool**, not primary frontier genesis.

***

## Family E: Topology-first / graph-embedded approaches

These focus on connectivity truth first.

***

## Method E1: Corridor-preserving graph territory + planar embedding fill

### Idea
- Use graph connectivity to determine which stars/lane chains belong together.
- Embed that result into the plane and generate territories around those connected structures.

### Strengths
- Naturally handles long lanes and disconnected same-player holdings.
- Very aligned with your corridor / lane-encompassment constraint.

### Weaknesses
- Needs a second step for exact border geometry in open space.

### Verdict
**Strong structural layer** for enforcing CX/DX semantics.

***

## Method E2: Component-aware dual-frontier generation

### Idea
- For each player connected component in the owned-star subgraph, generate territory independently.
- When same-player components are disconnected, explicitly force enemy competition zones between them.

### Strengths
- Guarantees visual disconnect.
- Very useful for your “enemy territory buffers disconnected same-owner holdings” rule.

### Weaknesses
- Needs the actual frontier geometry generation on top.

### Verdict
**Important structural invariant**, probably should be part of the final system no matter what.

***

## Family F: Morphing / dynamic-focused methods

These matter because your static system must support low-deformation dynamic motion.

***

## Method F1: Shared-frontier identity graph + vertex matching over time

### Idea
- The frontier is stored as shared curves/edges with stable IDs.
- On ownership change, match old frontier graph to new frontier graph.
- Interpolate vertices/control points with minimal travel.

### Strengths
- Excellent for smooth dynamic morphing.
- Supports “minimum deformation and travel distance.”

### Weaknesses
- Depends on stable static frontier topology.

### Verdict
**Very strong dynamic layer** once static frontiers are solved.

***

## Method F2: Field interpolation + contour re-extraction

### Idea
- Interpolate the ownership scalar field from old to new.
- Re-extract frontier contours every frame.

### Strengths
- Very smooth conceptually.
- Fills always match frontiers automatically.

### Weaknesses
- Can deform more than necessary.
- Can shimmer if topology changes drastically.

### Verdict
**Great fallback**, but not guaranteed minimal deformation.

***

## Method F3: Optimal transport / minimal matching morph of frontier polylines

### Idea
- Match old and new frontier samples by minimal transport cost.
- Interpolate matched points over time.

### Strengths
- Best theoretical match to your “minimum travel distance” requirement.

### Weaknesses
- Harder implementation.
- Requires careful handling of topology splits/merges.

### Verdict
**High-end dynamic option** if you really want the best morph quality.

***

## Family G: Hybrid methods

These are likely most realistic.

***

## Method G1: Graph Voronoi truth + explicit frontier seeds + polygon fitting

### Idea
- Graph-native Dijkstra gives truth. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)
- Generate frontier seeds analytically and structurally.
- Connect and fit into shared polylines.
- Render fills from the resulting polygons/frontiers.

### Verdict
**One of the strongest candidates overall.**

***

## Method G2: Graph Voronoi truth + RT support + canonical vector frontiers

### Idea
- Use graph-native Dijkstra as truth. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)
- Use RT only to help detect and refine frontier regions.
- Canonical geometry is vector frontiers, not raster contours.

### Verdict
**Very practical and likely robust.**

***

## Method G3: Graph-native distance truth + pressure-modified frontier seeds

### Idea
- Base truth is graph shortest path.
- MSR/CX/DX modify the distance metric or seed energies.
- Frontier seeds are placed where modified player distances tie.
- Connected into shared curves.

### Verdict
**Probably the best fit for your tunable constraints.**

***

## Method G4: Component-aware graph Voronoi + shared-border graph + curve family fitter

### Idea
- First enforce connectivity/disconnectivity truths at graph/component level.
- Then produce one shared frontier graph.
- Then fit that graph into:
  - straight,
  - curved,
  - segmented families.

### Verdict
**Architecturally excellent.** Very aligned with your static + dynamic spec.

***

# Summary table of viable options

| Method | Graph-correct | Unified frontiers | Tunable MSR/CX/DX | Dynamic-friendly | Overall |
|---|---|---:|---:|---:|---:|
| A1 Node+edge graph Voronoi | High | Medium | High | Medium | Strong core |
| A2 Continuous graph-Voronoi field | Very high | Very high | High | Very high | Gold standard |
| A3 Weighted graph Voronoi | Very high | Very high | Very high | Very high | Excellent |
| B1 RT contour extraction | Medium | Medium | Medium | Medium | Support only |
| B2 Multi-channel SDF contours | High | High | High | Very high | Strong |
| B3 Pressure equilibrium contours | Medium–High | High | Very high | High | Strong styling layer |
| B4 Fast marching fronts | High | High | High | Very high | Powerful, heavier |
| C1 Frontier-genesis lane seeds | High | High | High | High | Excellent backbone |
| C2 Lane + star-pair seeds | High | High | High | High | Excellent |
| C3 Optimization frontier seeds | Very high | Very high | Very high | High | Advanced |
| C4 Shared owner-pair border graph | Depends on geometry source | Very high | High | Very high | Excellent data model |
| D1 Polygon clipping | Depends | Very high | High | High | Strong downstream |
| D2 Bisector arrangement | Very high | Very high | Medium | High | Elegant, heavy |
| D3 Power diagram | Medium | High | Medium | High | Approximate |
| D4 Straight skeleton / offsets | N/A as source | Very high | Styling | High | Great downstream |
| E1 Corridor-preserving embedding | High | Medium | Very high | High | Strong structural layer |
| E2 Component-aware territory generation | High | High | High | High | Important invariant |
| F1 Shared-frontier identity morph | Depends on source | Very high | N/A | Very high | Strong dynamic layer |
| F2 Field interpolation contour morph | High | High | High | High | Good fallback |
| F3 Optimal transport frontier morph | Depends on source | High | N/A | Very high | High-end dynamic |
| G1 Graph Voronoi + frontier seeds + polygon fitting | High | Very high | High | High | Excellent |
| G2 Graph Voronoi + RT assist + vector frontiers | High | Very high | High | High | Excellent practical |
| G3 Graph truth + pressure-modified seeds | High | Very high | Very high | High | Excellent |
| G4 Component-aware graph Voronoi + shared-border graph + fitter | High | Very high | Very high | Very high | Best architecture candidate |

***

# My strongest recommendation

If the question is “what static system is most likely to satisfy everything and become the right foundation for dynamic territory?”, I would shortlist these as the best:

### Best architecture candidates
1. **G4**: Component-aware graph Voronoi + shared-border graph + curve family fitter. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)
2. **G3**: Graph truth + pressure-modified frontier seeds.
3. **G2**: Graph Voronoi truth + RT assist + canonical vector frontiers.
4. **C4 + C2** together: shared owner-pair border graph + lane/star-pair frontier seeds.

### Best downstream geometry helpers
- **D4** straight skeleton / polygon offsets for border widening and stylization. [tandfonline](https://www.tandfonline.com/doi/full/10.1080/16864360.2014.997637)
- **F1** stable shared-frontier identity graph for morphing.

***

# If you want the single most promising composite solution

Here is the composite method I currently think is best:

## Recommended composite
- **Truth**: weighted graph Voronoi / graph-native Dijkstra with MSR/CX/DX in the metric. [web.engr.oregonstate](https://web.engr.oregonstate.edu/~erwig/papers/GraphVoronoi_Networks00.pdf)
- **Structural invariant**: component-aware same-player separation.
- **Frontier genesis**: analytical lane seeds + star-pair competition seeds + optional RT-refined interstitial seeds.
- **Canonical storage**: one shared `FrontierGraph` of owner-pair edges.
- **Shape family**: fit the graph into straight / curved / segmented polylines with tunable tolerances.
- **Borders**: stroke meshes on the fitted shared frontiers.
- **Ownerfill**: polygons or field fill constrained by the same shared frontiers.
- **Animation**: shared-frontier identity matching + minimal-travel morph.

That gives you:
- graph correctness,
- unified frontiers,
- MSR/CX/DX tunability,
- angular/curved/segmented control,
- and a credible path to minimum-deformation dynamic morphing.

If you want, I can next turn this into a **ranked decision memo** with:
- top 5 best candidate architectures,
- why each wins/loses,
- and which one I would choose for implementation first.


Here's the **ranked decision memo** for your graph-native territory frontier generation, based on the 20+ methods from the previous analysis. I've scored them across your key dimensions and selected the top 5 most viable paths forward.

## Ranked Decision Matrix

|Rank|Method|Graph-Correctness|Unified Frontiers|Tunable Constraints|Dynamic Morph|Implementation Cost|Visual Cleanliness|Overall Score|
|---|---|---|---|---|---|---|---|---|
|1|G4: Component-aware Graph Voronoi + Shared-Border Graph + Fitter|Very High|Very High|Very High|Very High|Medium|Very High|**9.5/10**|
|2|G3: Graph Truth + Pressure-Modified Frontier Seeds|High|Very High|Very High|High|Low-Medium|High|**9.0/10**|
|3|G2: Graph Voronoi + RT Assist + Vector Frontiers|High|Very High|High|High|Medium|High|**8.5/10**|
|4|C4 + C2: Shared Owner-Pair Border Graph + Lane/Star-Pair Seeds|High|Very High|High|High|Low|High|**8.0/10**|
|5|A3 + D4: Weighted Graph Voronoi + Straight Skeleton Offsets|Very High|High|Very High|Medium|High|Very High|**7.5/10**|

## Method Details and Rationale

## #1: **G4 - Component-aware Graph Voronoi + Shared-Border Graph + Fitter** _(Recommended)_

**Architecture**:

- **Stage 1**: Graph-native multi-source Dijkstra with MSR/CX/DX biases baked into edge costs.
    
- **Structural layer**: Per-player connected-component analysis on owned stars to explicitly enforce disconnects.
    
- **Frontier genesis**: Lane-analytic equal-distance seeds + star-pair competition seeds.
    
- **Canonical storage**: Single `Shared FrontierGraph` of owner-pair edges (perfectly unified coordinates).
    
- **Shape families**: RDP fitting for straight/curved/segmented with tunable tolerances.
    

**Why it wins**:

- ✅ **Graph-correct**: Pure shortest-path Voronoi.
    
- ✅ **Unified frontiers**: Shared edges are first-class objects referenced by both adjacent territories.
    
- ✅ **Tunable**: MSR/CX/DX in Dijkstra costs, plus fitting tolerances for style.
    
- ✅ **Dynamic**: Stable shared-edge IDs enable minimal-travel morphing (old edge → new edge).
    
- ✅ **Clean**: RDP guarantees vector-like polylines.
    
- ✅ **Efficient**: O(E log V) Dijkstra + O(points) fitting.
    

**Risks**: Component analysis adds ~1 day of implementation.

**Why #1**: Perfect match for your static+dynamic spec. The shared-border graph data model is architecturally superior.

---

## #2: **G3 - Graph Truth + Pressure-Modified Frontier Seeds**

**Architecture**:

- **Stage 1**: Graph Dijkstra with pressure biases (1/(1+d) conversion for softer falloff).
    
- **Frontier genesis**: Lane equal-pressure points + star-pair seeds + force perturbation.
    
- **Canonical storage**: Unified point cloud → proximity graph → polylines.
    
- **Shape**: Tunable fitting.
    

**Why it wins**:

- ✅ **Graph-correct** with explicit pressure shaping.
    
- ✅ **Unified frontiers** via proximity connection.
    
- ✅ **Very tunable**: pressure falloff, force strengths, seed density.
    
- ✅ **Dynamic**: interpolate seeds or polylines.
    
- ✅ **Clean geometry**.
    

**Risks**: Less explicit connectivity enforcement than G4.

**Why #2**: Maximum tunability with elegant pressure math. Ideal if artistic control is priority #1.

---

## #3: **G2 - Graph Voronoi + RT Assist + Vector Frontiers**

**Architecture**:

- **Stage 1**: Graph Dijkstra.
    
- **Stage 2**: Lane analytic + RT sub-texel refinement.
    
- **Stage 4**: Merged `FrontierGraph`.
    
- **Stage 5**: Fitting.
    

**Why it wins**:

- ✅ **Graph-correct**.
    
- ✅ **Unified frontiers**.
    
- ✅ **Practical**: leverages your existing RT work.
    
- ✅ **Clean geometry**.
    

**Risks**: RT extraction can introduce minor artifacts if refinement is weak.

**Why #3**: Safest incremental upgrade from current code.

---

## #4: **C4 + C2 - Shared Owner-Pair Border Graph + Lane/Star-Pair Seeds**

**Architecture**:

- Explicit owner-pair competition meta-graph.
    
- Seed frontier points per pair (lane + star-pair).
    
- Connect into shared border edges.
    

**Why it wins**:

- ✅ **Excellent shared-border data model**.
    
- ✅ **Explicit control**.
    
- ✅ **Dynamic-friendly**.
    

**Risks**: Frontier seeding needs to be robust.

**Why #4**: Strong data architecture, just needs good seeding.

---

## #5: **A3 + D4 - Weighted Graph Voronoi + Straight Skeleton Offsets**

**Architecture**:

- Weighted Voronoi for tunings (MSR/CX/DX as site weights).
    
- Straight skeleton for border widening/stylization.tandfonline+1
    

**Why it wins**:

- ✅ **Very tunable**.
    
- ✅ **Excellent stylization** (angular/rounded control).
    

**Risks**: Straight skeleton is heavy machinery.

**Why #5**: Great for polish, not primary generation.

---

## Implementation Priority Recommendation

**Start with #1 (G4)**:

**Phase 1** (3–5 days):

1. Component-aware Dijkstra with MSR/CX/DX biases.
    
2. Lane-analytic frontier seeds.
    
3. Star-pair competition seeds.
    
4. Shared `FrontierGraph`.
    
5. Straight-family RDP fitter.
    
6. Stroke meshes.
    

**Phase 2** (1–2 days): tuning sliders for fitting parameters + forces.

**Phase 3** (2–3 days): dynamic morphing via shared-edge matching.

**Why start here**: Highest likelihood of success, covers all requirements, extensible.

## Fallback Plan

If G4 proves too complex:

1. Skip star-pair seeds → just lane seeds + RT refinement (#3).
    
2. Drop component analysis → rely on graph Voronoi for disconnects.
    

## Final Score Rationale

**G4 wins because**:

- Is graph-correct.
    
- Has unified shared frontiers.
    
- Supports all tunings.
    
- Has clean vector output.
    
- Has a dynamic-friendly data model.
    
- Has reasonable implementation cost.
    

**It is the architecture that best matches your static + dynamic spec** while being implementable in reasonable time.

