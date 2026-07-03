# Power Voronoi Diagrams for Star-Graph RTS Territory Rendering: A Technical Guide

## TL;DR
- **Use a 2D power (Laguerre) diagram built as the dual of a weighted/regular Delaunay triangulation** (CGAL `Regular_triangulation_2`, or d3-weighted-voronoi / jc_voronoi for lighter stacks). It is the right tool because its bisectors are straight lines, so every cell is a convex polygon with exact, extractable geometry — and the dual triangulation gives you ownership provenance "for free" (every face → one star, every edge → the two stars whose radical axis it lies on, every vertex → the three stars equidistant in power).
- **All four gameplay constraints reduce to either weight tuning or a post-process polygon op:** Star Buffer (SB) = a weight floor plus the inscribed-disk formula r_i = min_j (d_ij² + w_i − w_j)/(2 d_ij); Corridor Extension (CX) and Contested Lane (CL) follow from the radical-axis position d₁ = (d² + w_i − w_j)/(2d) and from Minkowski "capsule" buffering of owned edges unioned into the fill; Disconnected Region Exclusion (DX) = connected-component analysis on the owned-cell adjacency graph. Border smoothing is Chaikin corner-cutting on the shared half-edges.
- **Power Voronoi is the best fit for exact polygonal territory, but keep GPU Jump Flooding (JFA) as the alternative** if you ever move to pixel/raster fills, obstacle-aware borders, or organic curved frontiers — it trivially supports weights and obstacles but is not natively polygonal and must be re-vectorized (marching squares) to recover geometry/provenance.

## Key Findings

1. **The power distance is pow(x, s) = ‖x − z‖² − r²** where z is the site (star) center and r the radius of its associated circle; the weight is w = r². Per Franz Aurenhammer, "Power Diagrams: Properties, Algorithms and Applications," SIAM J. Comput. 16(1):78–96 (Feb 1987), DOI 10.1137/0216006: *"The power pow(x,s) of a point x with respect to a sphere s in Euclidean d-space E^d is given by d²(x,z) − r²."* This is the squared tangent length from x to the circle (Pythagoras: d² − r²). When all weights are equal the power diagram collapses to the ordinary Euclidean Voronoi diagram of the centers.

2. **Power bisectors are straight lines (the "radical axis").** For two sites the equal-power locus is the hyperplane 2x·(z_i − z_j) = (‖z_i‖² − r_i²) − (‖z_j‖² − r_j²), perpendicular to the line of centers. This linearity is the single most important property for your use case: it guarantees convex polygonal cells. By contrast, **multiplicatively weighted Voronoi diagrams have circular-arc/Apollonius-circle bisectors, and additively weighted (Apollonius) diagrams have hyperbolic-arc bisectors** — both curved, both harder to render and clip exactly.

3. **The radical axis crosses the segment between two sites at distance d₁ = (d² + w_i − w_j)/(2d) from site i**, where d is the center distance. This single formula drives cell sizing: increasing w_i pushes the boundary away from star i (bigger cell), decreasing it pulls the boundary in. It is exact and linear in the weights.

4. **A site can have an EMPTY cell ("hidden"/"dominated" site).** The exact condition is a lifting one: lift each weighted site to the point (x_i, y_i, x_i²+y_i² − w_i) in 3D; the power diagram is the projection of the lower envelope, and the regular triangulation is the projection of the **lower convex hull**. A site is hidden **iff its lifted point is not on the lower convex hull** (it is "submerged"/"redundant" in Cheng–Dey–Shewchuk's terms; "hidden" in CGAL's). Concretely, **site i lies outside its own cell relative to neighbor j when w_j − w_i > d_ij²**, and is fully hidden when no point anywhere wins on power. This is a real game-balance lever and hazard: a heavily over-weighted star can erase a neighbor's territory entirely.

5. **The duality/lifting relation makes construction O(n log n)** and gives provenance: build the regular (weighted Delaunay) triangulation via 3D lower-convex-hull of lifted points, then take the dual to get the power diagram. CGAL's `Regular_triangulation_2` does exactly this and exposes hidden vertices explicitly.

## Details

### A. How power Voronoi draws the territory lines (and where provenance comes from)

**Mathematics.** Each star *s* is a site with center *z* and weight *w = r²*. Its cell is the set of points whose power w.r.t. *s* is less than to any other star. Because each pairwise equal-power locus is a line (the radical axis, perpendicular to the line of centers), each cell is an intersection of half-planes → a **convex polygon**. The radical axis between sites i and j sits at signed distance **d₁ = (d² + w_i − w_j)/(2d)** from star i along the connecting segment (Aurenhammer 1987, Observation 1; standard radical-axis formula). With equal weights, d₁ = d/2 (ordinary Voronoi). Raise w_i and the line slides toward j; the cell grows.

**Construction (recommended pipeline):**
1. Lift each star to (x, y, x²+y² − w) in 3D.
2. Compute the **lower convex hull** of the lifted points (any O(n log n) 3D hull / incremental method).
3. Project the downward-facing faces → the **regular (weighted Delaunay) triangulation**.
4. Take the dual → the **power diagram**. Each Delaunay edge is orthogonal to its dual power-diagram edge.

This is the textbook lifting/paraboloid transform (Edelsbrunner–Seidel; de Berg et al., *Computational Geometry: Algorithms and Applications*; Aurenhammer 1987). Alternatives: Fortune sweepline extensions, or direct incremental cell-clipping (the approach voro++ and d3-weighted-voronoi take — start each cell as the bounding box and clip by each site's half-plane).

**Provenance via the dual.** The weighted Delaunay triangulation is the natural provenance carrier:
- **Face (cell) → owning star.** Each power cell corresponds to exactly one (visible) site. Tag the cell with that star's owner.
- **Edge → the TWO generators.** Each power-diagram edge is dual to exactly one Delaunay edge connecting two sites — those are the two stars whose radical axis the edge lies on. Store both site IDs on the half-edge.
- **Vertex → the (generically THREE) generators.** Each power-diagram vertex is dual to a Delaunay triangle; its three corners are the three stars equidistant-in-power from that vertex (the "radical center"). Store the triple.

**Data structure.** Use a **doubly-connected edge list (DCEL / half-edge)**. For each half-edge store: origin vertex, twin, next/prev, incident face, and the *pair of generator site IDs*. Each face stores its owning site ID and owner/player ID. Each vertex stores its generating triple. CGAL's triangulation already maintains incident-face/incident-vertex adjacency you can walk to emit a DCEL; jc_voronoi emits a half-edge graph with site pointers directly; Boost.Polygon's `voronoi_diagram` exposes `cell()/edge()/vertex()` with `cell->source_index()` back-pointers.

**Per-pixel provenance (if you also rasterize the fill):** every pixel belongs to the face whose site minimizes power; you can either point-locate in the triangulation (walk), or rasterize the convex polygons with the owner color, or run a JFA pass seeded with weighted distances. Provenance is just the face's owner tag.

**Clipping to the map.** Power cells on the convex hull are unbounded, so clip every cell to the map rectangle/border. Use **Sutherland–Hodgman** when the clip region is convex (a rectangle or convex map boundary) — it is simple, O(cell·clipedges), and since power cells are convex it never produces spurious self-intersections. Use **Weiler–Atherton** (or Greiner–Hormann / Vatti via a robust library like JTS/GEOS/Clipper) only if your map boundary is concave or has holes, because Sutherland–Hodgman can leave degenerate bridges on concave clips. jc_voronoi ships a convex-polygon clipper (`jc_voronoi_clip.h`); d3-weighted-voronoi takes a `.clip()` polygon directly.

### B. Tuning cell shape with weights (the core lever)

Because the bisector position is **linear in the weights** (d₁ = (d² + w_i − w_j)/(2d)), weight tuning is intuitive and cheap:
- **Bigger territory:** raise w_i. The shift of every shared boundary away from star i is (Δw_i)/(2d) for each neighbor at distance d.
- **Geometric meaning of weight:** w_i = r_i² is the squared radius of an "orthogonal circle"; the radical axis between two circles is their locus of equal tangent length.

**Target-area / capacity-constrained power diagrams.** If you want each star's cell to hit a *prescribed area* (e.g., proportional to a star's economic value, or all-equal for fairness), this is a solved problem:
- **Aurenhammer, Hoffmann & Aronov, "Minkowski-type theorems and least-squares clustering," Algorithmica 20(1):61–76 (1998), DOI 10.1007/PL00009187:** *"there always exists a power diagram whose regions partition a given d-dimensional m-point set into clusters of prescribed sizes, no matter where the sites are placed... least-squares assignments can be computed by finding suitable weights for the sites. This leads to an algorithm for iteratively improving the weights, based on the gradient-descent method."* The convex objective Φ(w) has gradient (target area − current area) per site, so **L-BFGS / Newton on the weights converges to the exact target areas.** This is identical to **semi-discrete optimal transport** with squared-Euclidean cost (the "AHA method").
- **de Goes, Breeden, Ostromoukhov & Desbrun, "Blue Noise through Optimal Transport," ACM Trans. Graph. 31(6):171:1–171:11 (Nov 2012), DOI 10.1145/2366145.2366190**, which gives *"a novel formulation of the recently-introduced concept of capacity-constrained Voronoi tessellation as an optimal transport problem... able to enforce the capacity constraints exactly... via constrained minimization in the space of power diagrams."* The earlier discrete scheme is **Balzer, Schlömer & Deussen, "Capacity-Constrained Point Distributions: A Variant of Lloyd's Method," ACM Trans. Graph. (Proc. SIGGRAPH) 28(3):86:1–86:8 (2009), DOI 10.1145/1576246.1531392.** For an RTS you typically only optimize *weights* (star positions are fixed by the graph), which is the easier sub-problem.
- **Centroidal power diagrams + Lloyd relaxation** (Du–Faber–Gunzburger; the centroidal-power-diagram literature) regularize/smooth the tessellation by moving sites toward cell centroids — but in your game star positions are fixed, so use Lloyd only if you have *virtual* helper sites; otherwise restrict to weight optimization.

### C. The four gameplay constraints

**SB — Star Buffer (guaranteed disk of radius ρ around every owned star).**
The largest disk centered at star i that is guaranteed inside its cell has radius **r_i = min over neighbors j of (d_ij² + w_i − w_j)/(2 d_ij)** (the per-neighbor radical-axis distances). To guarantee r_i ≥ ρ:
- **Weight-floor approach:** enforce, for every neighbor, w_i − w_j ≥ 2ρ·d_ij − d_ij². If you cap weight *differences* between adjacent stars, you bound how far any boundary can intrude, guaranteeing the buffer. This keeps everything exactly polygonal and provenance-clean.
- **Guard against the star leaving its own cell:** keep w_j − w_i ≤ d_ij² for every neighbor (the "site outside its own cell" threshold); a safe global rule is to bound adjacent weight differences below the squared edge length.
- **Post-hoc Minkowski approach (last resort):** union each cell with a disk of radius ρ centered at its star. This guarantees the buffer visually but **breaks the partition** (cells overlap), so you must decide overlap ownership and you lose the clean shared-edge provenance. Prefer the weight-floor approach.

**CX — Corridor Extension (a fully-owned lane between two same-owner stars must be enclosed in that owner's fill).**
If both endpoints are the same owner, the radical axis between them is *internal* to that owner's combined region, so the lane is already enclosed — unless a third, enemy, star's cell cuts across the lane. Two robust fixes:
- **Minkowski/capsule buffering:** compute the **stadium/capsule** = Minkowski sum of the lane segment with a disk of radius ρ_corridor (this is exactly a GIS "line buffer" with round caps; JTS/GEOS `buffer`, Shapely `buffer`, Clipper offset). **Union** that capsule into the owner's fill polygon. This forces the fill to bulge to enclose the edge regardless of weights.
- **Weight-bias approach:** temporarily raise both endpoints' weights (or add virtual sites along the lane) so the contested third cell is pushed off the lane. Cleaner provenance but less direct control.
Recommendation: use the capsule-union for guaranteed enclosure, then re-tag the added area's owner; keep the underlying power diagram for the rest.

**CL — Contested Lane (a lane between two opposing players should be enclosed only by the two opposing fills meeting along it).**
This is the *default* behavior when the two stars are adjacent in the weighted Delaunay triangulation: their shared radical axis crosses the lane at d₁ = (d² + w_i − w_j)/(2d), and the two cells meet exactly there. To *guarantee* the frontier falls on the lane (and no third cell intrudes), ensure the two stars are Delaunay-adjacent (they share a power-diagram edge) — if a third star's cell intrudes, nudge weights or insert a midpoint constraint. The frontier line is the natural "contested zone"; you can render a gradient band of width proportional to |d₁ − d/2| to visualize who is winning.

**DX — Disconnected Region Exclusion (flag when two same-owner stars are NOT connected through owned territory even though the raw fill looks contiguous).**
Build the **cell-adjacency graph**: nodes = cells, edges = shared power-diagram edges between cells of the *same owner*. Run **connected-components** (union-find or BFS/DFS). Two same-owner stars are "connected through owned territory" iff they're in the same component. Render each component as its own island; if a star's component doesn't include the owner's "capital," draw the disconnected indicator. Because the adjacency graph is the dual triangulation restricted to same-owner edges, this is O(n α(n)) and updates incrementally when a star is captured.

### D. Border smoothing and junction treatment

Raw power-diagram borders are straight polylines meeting at sharp triple points. To soften without losing provenance:
- **Chaikin corner-cutting** (G. M. Chaikin, "An Algorithm for High Speed Curve Generation," Computer Graphics and Image Processing 3 (1974), pp. 346–349): iteratively replace each vertex by two points at ¼ and ¾ along its incident edges. 2–3 iterations give pleasant rounded borders; it's a single, interpretable parameter (iteration count), and per the UC Davis On-Line Geometric Modeling Notes, *"Chaikin's curve has been shown to be equivalent to a quadratic B-spline curve."* It is the standard GIS smoothing choice (R `smoothr`, etc.). **Provenance-safe variant:** smooth each *shared half-edge polyline between a fixed pair of owners* as a unit, and apply the *identical* smoothing to both sides (the half-edge and its twin) so the two cells stay perfectly adjacent — no gaps/overlaps, ownership intact.
- **Catmull–Rom / cubic B-spline fitting** for smoother curves; **Laplacian smoothing** of the border polyline for mild denoising. **Metaball/implicit blending** and **distance-field iso-contours** give the most organic look but blur provenance (a pixel's owner is defined by the blend, not a face) — use only if you switch to a raster fill.
- **Junctions (triple points):** keep junctions consistent by treating the triple point as a *pinned* vertex shared by all three smoothed polylines — smooth the three edges toward, but never move, the junction, OR round the junction with a small fillet/miter applied identically to all three incident borders. Pinning the junction is the safest: it guarantees the three cells continue to meet at one point after smoothing. (Mitering vs. rounding is the same choice as GIS line-buffer join styles: round = arcs, miter = sharp, with a miter limit to avoid spikes.)

### E. Conquest / weight-change animation

- **Interpolate the weights, not the polygons.** Because cell geometry is a continuous (piecewise-linear) function of the weights, animating w_i(t) from old to new over a few frames and **recomputing the power diagram each frame** yields temporally coherent boundary motion (boundaries slide linearly). Recompute is O(n log n); for a star-graph RTS with tens–hundreds of stars this is trivial per frame.
- **Capture event:** ramp the captured star's owner tag with a cross-fade of the fill color while simultaneously easing its weight from the old owner's regime to the new one, so the boundary visibly "breathes" outward.
- **Avoid popping** by never letting a cell appear/disappear discontinuously: if a weight change would hide a site (cross the w_j − w_i > d_ij² threshold), clamp it so the cell shrinks to the SB minimum instead of vanishing.
- **Dynamic/kinetic Voronoi** data structures (kinetic Delaunay) can update incrementally instead of full recompute if profiling demands it, but full recompute is simplest and usually fast enough.

### F. Libraries (recommendations)

- **CGAL `Regular_triangulation_2`** — the gold standard for exact 2D power diagrams; exposes the dual power diagram, hidden vertices, and robust exact predicates. Best if you're in C++ and need correctness. (GPL/commercial license.)
- **CGAL `Apollonius_graph_2`** — additively weighted (curved) diagrams, with distance δ(x,P_i)=‖x−c_i‖−w_i; supports online insert/delete and exposes hidden sites, if you ever want hyperbolic frontiers.
- **jc_voronoi** (C, MIT) — fast, single-header ordinary Voronoi with half-edge output and a convex clipper; lightweight but **not weighted** (you'd add power via incremental half-plane clipping yourself).
- **Boost.Polygon Voronoi** (Fortune sweepline, integer input, exact predicates) — robust points+segments Voronoi; you clip final edges yourself. (It is meaningfully slower and more memory-hungry than the fastest specialized libraries, though the precise multipliers vary by workload and were not independently verified here.)
- **d3-weighted-voronoi** (Kcnarf, BSD) — JavaScript **additive power diagram** with `.weight()` and `.clip()`; pairs with d3-voronoi-map / d3-voronoi-treemap for area-targeted layouts; based on the ArlindNocaj/power-voronoi-diagram Java implementation.
- **voro++** (BSD) — 3D cell-by-cell Voronoi/power cells; great for 3D space maps, cell-statistics, walls/boundaries; overkill for 2D.
- **mapbox/delaunator + d3-delaunay** — fast ordinary Delaunay/Voronoi; no weights, but a solid base if you add lifting yourself.
- **JTS/GEOS, Shapely, Clipper** — for the Minkowski buffering (CX, SB capsules), unions, and robust concave clipping.

### G. Alternative techniques — when to prefer them

| Technique | Polygonal? | Weights? | Obstacles? | Provenance | Best for |
|---|---|---|---|---|---|
| **Power Voronoi** (recommended) | **Yes, exact convex** | **Yes, linear** | No (free space only) | **Excellent (dual triangulation)** | Your exact-geometry territory |
| Additively weighted / Apollonius | Yes, curved (hyperbolic) | Additive | No | Good (CGAL) | Curved frontiers, "blast radius" feel |
| Multiplicatively weighted / crystal-growth | Curved (circular/spiral); can wrap-around | Multiplicative | Partial | Medium | Organic, growth-rate territories; regions can wrap around |
| **JFA (GPU)** | No (pixels) → marching-squares to vectorize | Trivial (seed distances) | **Trivial** | Per-pixel only | Real-time raster fills, obstacle-aware borders, distance fields |
| SDF + marching squares iso-contours | Vectorized after | Yes (via distance) | Yes | Weak (blended) | Smooth organic borders |
| Influence maps / flood-fill | Grid | Yes | Yes | Per-cell | Classic RTS AI control maps; cheap |
| Discrete region-growing / cellular automata (hex/grid) | Grid/hex | Yes | Yes | Per-cell | Civ-style tile borders |
| Metaballs / implicit blending | Iso-surface | Yes | Partial | Weak | Very organic "blobby" territory |
| Graph/Risk-style whole-node ownership | Discrete | N/A | N/A | Trivial | Abstract province games |

**Bottom line on alternatives:** Power Voronoi is the unique choice that is *simultaneously* exact-polygonal, weight-tunable with linear boundaries, and provenance-rich via its dual. JFA (Rong & Tan, "Jump Flooding in GPU with Applications to Voronoi Diagram and Distance Transform," I3D 2006) is the strongest backup precisely where Power Voronoi is weak — pixel-fast (effectively constant-time in seed count, log-number of passes), trivially weighted/obstacle-aware — but you pay re-vectorization and lose clean edge provenance, and it is an *approximation* (a few mislabeled pixels). Multiplicatively-weighted / crystal-growth diagrams (Schaudt–Drysdale 1991; Kobayashi–Sugihara 2002) are the answer only if you specifically want curved, *wrap-around* frontiers where a fast-growing region can engulf a slow one.

### H. Game precedents

- **Civilization (IV/V/VI/VII): culture/border expansion** is a *discrete tile claim* system, not continuous Voronoi — each city claims adjacent tiles as accumulated Culture crosses rising thresholds, expanding up to a fixed hex radius (3 hexes in Civ VII, 5 via culture in Civ VI). This is the "discrete region-growing / influence" model in the table. Borders are rendered per-tile with the owner's color. Relevant to you as the contrast: tile-claim guarantees connectivity and buffers trivially but gives blocky borders.
- **Map-generation lineage (Red Blob Games / Amit Patel "Polygonal Map Generation"):** uses Fortune Voronoi + Lloyd relaxation + the Delaunay/Voronoi dual representation (edges pointing to two centers and two corners) — exactly the provenance-carrying dual you'll use. Patel also documents influence maps for RTS AI.
- **Stained-glass / mosaic animation** work uses weighted Voronoi with temporal coherence — directly analogous to your conquest animation.

## Recommendations

**Stage 1 — Core (build this first).**
1. Represent each star as a weighted site (center + w = r²). Build the power diagram as the dual of CGAL `Regular_triangulation_2` (C++) or d3-weighted-voronoi (web). Emit a **DCEL** with: face→owner, half-edge→(site_i, site_j), vertex→(site triple).
2. Clip every cell to the map with **Sutherland–Hodgman** (convex map) — cells are convex so this is safe and fast.
3. Render fills by owner color; render borders from the shared half-edges.
*Benchmark to advance:* correct cells for ~100 stars at 60 fps with full recompute on weight change.

**Stage 2 — Constraints.**
4. **SB:** enforce adjacent weight-difference bounds so r_i = min_j (d_ij²+w_i−w_j)/(2d_ij) ≥ ρ; clamp weights to prevent hidden sites (w_j − w_i ≤ d_ij²).
5. **DX:** union-find on same-owner shared edges; render components as islands; flag disconnected stars.
6. **CX:** capsule-buffer (`buffer` in GEOS/Shapely/Clipper) owned lanes and union into the owner fill; re-tag.
7. **CL:** ensure opposing endpoints are Delaunay-adjacent; render a contested band around their radical axis.
*Benchmark:* all four constraints hold under random captures in a soak test.

**Stage 3 — Polish.**
8. Border smoothing: Chaikin (2–3 iterations) applied per shared half-edge with junctions **pinned**; apply identically to twin half-edges to preserve adjacency.
9. Conquest animation: ease weights and cross-fade owner colors over ~0.3–0.5 s with per-frame recompute; clamp to SB to avoid popping.

**Stage 4 — Area targeting (optional).**
10. If you want cell areas to track star value/fairness, add the **Aurenhammer–Hoffmann–Aronov** convex weight optimization (L-BFGS on Φ, gradient = target−actual area). Run it whenever target areas change; animate by interpolating the resulting weights.

**Thresholds that change the plan:** if star counts exceed a few thousand, or you add many obstacles/curved frontiers, switch the *fill* to **GPU JFA** (keep the power diagram for provenance lines if you still need exact edges), or move to additively/multiplicatively weighted diagrams for curved borders. If you need wrap-around territories, use crystal-growth (multiplicatively weighted) diagrams.

## Caveats
- **Hidden sites are a real hazard:** an over-weighted star can erase a neighbor's cell entirely (w_j − w_i > d_ij² puts a site outside its own cell; full domination empties it — exactly when the site's lifted point falls off the lower convex hull). Always clamp weight differences to keep every owned star visible and above the SB radius.
- **Post-hoc Minkowski unions (SB/CX) break the clean partition** — overlapping fills mean a pixel can belong to two owners; you must define overlap-resolution rules, and shared-edge provenance no longer holds in the buffered region. The weight-tuning route preserves provenance; prefer it where possible.
- **Smoothing vs. provenance:** any smoothing that blends across cells (metaballs, SDF iso-contours) destroys per-edge provenance. Chaikin on shared half-edges with pinned junctions is the only smoothing that provably preserves the partition.
- **Robustness:** floating-point degeneracies (collinear/cocircular stars, equal weights) can create slivers or NaNs in naive implementations (a known issue in lightweight Laguerre codes); use exact-predicate libraries (CGAL, Boost.Polygon) for production.
- **Area-targeting is iterative:** AHA/optimal-transport weight solves are convex but not closed-form; they need a few L-BFGS iterations and a power-diagram recompute per iteration, so budget for that if areas must be exact every frame.
- **Some specifics could not be verified from primary sources** within this research — notably exact Boost.Polygon performance multipliers, library licensing edge cases, and the internal territory-rendering methods of specific titles (Sins of a Solar Empire, Eufloria, Auralux, Galcon, Endless Space). Game-internal claims here are illustrative engineering guidance rather than documented fact.