Voronoi is the standard starting point for “who owns this star” style territories, but it’s not the only relevant approach, and d3‑delaunay is “best default in JS” rather than the only good option. You can mix Voronoi/Delaunay, SDFs, metaballs, and curve‑smoothing to get rounded, tunable territories with gradients.

Below is a focused rundown of techniques + concrete libraries, with performance, DX, and implementation notes.

***

## Core approaches for dynamic territories

### 1. Classic Voronoi / Delaunay based

- Compute a Delaunay triangulation of your star positions, then derive the Voronoi diagram as the dual graph.  
- `d3-delaunay` does exactly this: it builds a fast triangulation via Delaunator and then exposes a `.voronoi()` API to get cell polygons. [npmjs](https://www.npmjs.com/package/delaunator)
- Older `d3-voronoi` implemented Fortune’s algorithm directly, but it’s deprecated in favor of `d3-delaunay` because the new stack is ~5–10× faster and more robust numerically. [github](https://github.com/d3/d3-voronoi/blob/master/README.md)

Pros:
- Natural “closest star wins” ownership.
- Cells update deterministically when stars move or are added/removed.
- Easy to turn into polygons for hit‑testing, labels, etc.

Cons:
- Raw Voronoi cells are angular and jagged.
- Out of the box, boundaries are hard lines; you must add your own smoothing and blending stages.

### 2. Weighted / Centroidal Voronoi (power diagrams, CVT)

- You can weight sites (stars) by strength, level, or population, altering cell size and shape (power diagrams / weighted Voronoi).  
- Centroidal Voronoi tessellation (CVT) repeatedly relaxes sites toward cell centroids for more uniform, organic cells; there’s an example CVT implementation built on Voronoi/Delaunay in the Rust “Voronator” library inspired by d3‑delaunay. [reddit](https://www.reddit.com/r/rust/comments/hjbl0y/introducing_voronator_a_voronoi_diagram_and/)
- CVT and related methods are also used in research contexts for adaptive discretization of space (e.g., VortSDF uses CVT for 3D modeling on signed distance fields). [arxiv](https://arxiv.org/html/2407.19837v1)

Pros:
- More aesthetically pleasing, regularly shaped regions.
- Tunable by adjusting relaxation iterations and weights.

Cons:
- Extra per‑update cost for relaxation iterations.
- Slightly more complex pipeline than plain Voronoi.

### 3. Distance fields / SDF‑based territories

- Instead of explicit polygons, treat each star (or faction cluster) as an implicit field (signed distance or influence); territory is “who has the smallest distance / largest influence at this pixel.”  
- Signed distance fields are a standard representation for smooth implicit surfaces; NVIDIA’s GPU Gems shows efficient GPU SDF computation for complex shapes. [developer.nvidia](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu)
- In graphics programming, smooth blending between shapes is commonly done with signed distance functions and smooth max operations, producing organic “metaball”‑like merging. [reddit](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)

Pros:
- Extremely smooth, rounded contours “for free”.
- Fantastic for blended/gradient borders (you can mix colors based on normalized distances to several sites).
- GPU‑friendly: you can shade per‑pixel in a fragment shader; no explicit polygon rebuilds per change.

Cons:
- Less trivial to get a polygon mesh (e.g., for pathfinding) unless you run an isosurface extraction algorithm like marching squares/cubes or surface nets. [reddit](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)
- Requires shader work or a CPU distance‑field pass if not using the GPU.

### 4. Grid / flood-fill / multi‑source BFS

- Approximate Voronoi by rasterizing the world to a grid and doing a multi‑source BFS (each star as a seed) or computing per‑cell nearest star.  
- Conceptually similar to Voronoi but easier to integrate with tile‑based or voxel systems.

Pros:
- Simple mental model, can piggyback on existing tile or pathfinding grid.
- Easy to cache and update in chunks.

Cons:
- Lower visual quality; requires post‑processing to look smooth.
- Resolution trade‑off: finer grids cost more.

For “stars on a map” in 2D with many ownership changes, Voronoi (possibly weighted / relaxed) or an SDF/shader‑based approach are generally the most relevant.

***

## JavaScript / web Voronoi and Delaunay libraries

Here are the main contenders if you’re in JS/TS (browser or Node):

### Key JS libraries

| Library | Core idea | Perf characteristics | DX / notes |
|--------|-----------|----------------------|-----------|
| `d3-delaunay` | Fast Delaunay triangulation + Voronoi derived from it. [npmjs](https://www.npmjs.com/package/d3-delaunay) | Built on `delaunator`, which is designed to be “incredibly fast and robust” for 2D triangulation; used as base for many projects. [npmjs](https://www.npmjs.com/package/delaunator) | Modern, well‑documented, supports typed arrays, gives you Delaunay + Voronoi + search utilities out of the box. [npmjs](https://www.npmjs.com/package/d3-delaunay) |
| `delaunator` | Low‑level Delaunay triangulation only. [npmjs](https://www.npmjs.com/package/delaunator) | Very fast and robust; can be used directly if you want to hand‑roll Voronoi or adjacency logic. [npmjs](https://www.npmjs.com/package/delaunator) | Minimal API, good if you want fine control and can afford to write your own dual‑graph/Voronoi derivation. |
| `d3-voronoi` | Fortune’s sweep‑line Voronoi implementation. [github](https://github.com/d3/d3-voronoi/blob/master/README.md) | Explicitly noted as slower and less robust than the newer `d3-delaunay` (5–10× slower). [github](https://github.com/d3/d3-voronoi/blob/master/README.md) | Deprecated; docs tell you to use `d3-delaunay` instead. [github](https://github.com/d3/d3-voronoi/blob/master/README.md) |
| `Javascript-Voronoi` (gorhill / gregross) | Fortune’s algorithm implementation in JS, older standalone lib. [github](https://github.com/gorhill/Javascript-Voronoi) | Solid but older; not optimized like `delaunator`‑based libs. [github](https://github.com/gorhill/Javascript-Voronoi) | Useful if you want Fortune’s algorithm for learning or legacy reasons; less reason to pick it over `d3-delaunay` today. |

**Takeaway:** in modern JS, `d3-delaunay` is the best general‑purpose choice for dynamic 2D territories: fast, well‑maintained, and more robust than older Voronoi libs. [github](https://github.com/mapbox/delaunator)

Use `delaunator` directly only if you:
- Want the triangulation for your own custom structures, or
- Are micro‑optimizing and don’t need Voronoi convenience helpers.

***

## Techniques for rounded contours

Starting from polygonal Voronoi cells, you have a few main smoothing options:

### 1. Polygon smoothing (Chaikin, splines, etc.)

- If you have each cell as a polygon, you can apply Chaikin’s corner‑cutting algorithm or similar smoothing to the boundary points. [reddit](https://www.reddit.com/r/proceduralgeneration/comments/9ug6k1/anyone_know_of_a_good_approach_for_voronoi_edge/)
- A procedural generation thread specifically recommends Chaikin smoothing for “Voronoi edge smoothing” when you have polygon points already. [reddit](https://www.reddit.com/r/proceduralgeneration/comments/9ug6k1/anyone_know_of_a_good_approach_for_voronoi_edge/)

Pros:
- Easy to implement on CPU; no shaders required.
- You keep a clean polygon representation for hit‑testing, region queries, etc.

Cons:
- Repeated smoothing iterations can shrink and distort shapes; you might need to preserve some control points.
- Borders between neighboring cells must be smoothed in a consistent way to avoid gaps/overlaps.

DX notes:
- Pipeline: generate Voronoi polygons → clip them to world bounds → run 1–3 Chaikin passes per boundary → rasterize with your usual polygon fill.
- You can expose “smoothness” as a tweakable number of iterations or a smoothing weight.

### 2. SDF / isosurface smoothing

- Convert your region boundaries to a signed distance field and then re‑extract a contour with a smooth step or isosurface extraction method.  
- Graphics programmers often use SDFs with smooth maximum/minimum functions to get smoothly merging surfaces, with marching cubes / surface nets / dual contouring to get a mesh out again. [developer.nvidia](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu)

Pros:
- Very natural blobby look; easy to adjust “softness” of boundaries by tweaking blend radii and smoothstep curves. [reddit](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)
- Integrates nicely with per‑pixel gradient coloring and post‑FX.

Cons:
- More involved pipeline: build SDF (CPU or GPU), then contour it if you need polygons.

This approach overlaps heavily with metaballs/blobby territories (see next section).

***

## Metaballs and blobby regions

If you want each faction’s territory to look like a smooth blob that expands/merges around its stars rather than strict Voronoi, metaballs / implicit surfaces are a strong option.

- Each star contributes a falloff field (e.g., \(1 / r^2\) or a Gaussian), summed per faction.  
- Territories are level sets of these fields (e.g., “all points where faction A’s field > faction B’s field”).  
- In practice, this is implemented with SDF‑like functions and smooth max/min operations; it’s a common pattern in SDF/metaball terrain work. [reddit](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)

Pros:
- Gorgeous, organic, controllable shape language (radius, falloff curve, blending sharpness).
- Borders naturally round and smooth; “islands” and “peninsulas” visually emerge from the math.

Cons:
- Harder to get exact graph‑like adjacency (e.g., crisp edges for tooltips or region indexes) unless you contour the field.
- Less “obviously fair” than pure nearest‑neighbor Voronoi if players expect strict geometrical fairness.

***

## Blended / gradient borders between territories

You specifically want blended or gradient colors at boundaries.

There are two main patterns:

### 1. Distance‑weighted blending around borders

- For each pixel, compute distances to the nearest 2–3 stars or nearest 2–3 owning factions.  
- A procedural Voronoi/biome thread describes wanting exactly this: weights like “60% biome A, 30% biome B, 10% biome C” within a local radius to blend smoothly. [reddit](https://www.reddit.com/r/proceduralgeneration/comments/13q95ri/how_can_i_smoothblend_the_edges_of_procedural/)
- You can do this per‑vertex or in a fragment shader, with weights based on normalized inverse distances, then mix the faction colors.

Pros:
- Works directly on top of Voronoi / distance‑to‑site data.  
- Intuitive controls: blending radius, distance curve (linear, smoothstep, etc.). [reddit](https://www.reddit.com/r/proceduralgeneration/comments/13q95ri/how_can_i_smoothblend_the_edges_of_procedural/)

Cons:
- Needs per‑pixel data for at least the nearest few sites; may require spatial acceleration for large N.

### 2. SDF/metaball‑based blending

- As in the SDF/metaball approach, borders emerge where field values are equal; colors can be blended based on relative field strengths.  
- Smooth max/min functions give you soft intersections between regions and are widely used in SDF rendering. [developer.nvidia](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu)

Pros:
- Naturally smooth; beautiful gradients without extra hacks.
- Easy to do entirely in a shader.

Cons:
- Implicit representation; extracting crisp “this pixel belongs to faction X” may need a separate classification rule.

***

## Suitability and performance trade‑offs

### When Voronoi (d3‑delaunay) is a good fit

Use `d3-delaunay` or similar if:

- You’re in JS/TS and want:
  - Explicit polygons for each territory (for hit‑testing, labels, pathing).
  - Deterministic nearest‑star “ownership” behavior. [npmjs](https://www.npmjs.com/package/d3-delaunay)
- Your star counts per view are in the hundreds to low thousands and you can afford to recompute on ownership changes or occasional movement.
- You’re okay doing visual smoothing as a post‑step (Chaikin/spline or SDF‑based contouring). [reddit](https://www.reddit.com/r/proceduralgeneration/comments/9ug6k1/anyone_know_of_a_good_approach_for_voronoi_edge/)

You get:
- Fast Delaunay triangulation powered by `delaunator`. [npmjs](https://www.npmjs.com/package/delaunator)
- Built‑in creation of the Voronoi diagram from the triangulation with `delaunay.voronoi(bounds)`. [npmjs](https://www.npmjs.com/package/d3-delaunay)
- A modern, maintained API with examples in the D3 ecosystem. [github](https://github.com/d3/d3-voronoi/blob/master/README.md)

### When to consider alternatives

**SDF / metaball / shader‑based territories** are likely better if:

- You want heavily rounded, fluid, or “bio‑organic” shapes with lots of tunable softness.
- You care more about visual style and smooth gradients than exact geometric fairness.
- You’re comfortable writing a fragment shader that:
  - Iterates over nearby stars (or uses a texture/SSBO of star data).
  - Computes distance/influence fields.
  - Outputs color based on weighted influences.

**Grid/BFS / tile‑based** territories work well if:

- You already have a grid world (roguelike / tile map).
- The main need is “ownership per tile” rather than smooth, continuous curves.
- You’re okay adding a smoothing/blur pass or feathered rendering to make things look less blocky.

***

## Practical recommendation for your use case

Given your context (web stack, heavy dev experience, and desire for tunable, rounded, frequently changing territories):

1. **Base geometry: `d3-delaunay` Voronoi**  
   - Use `d3-delaunay` to compute Voronoi cells from your star positions; it’s fast, robust, and preferred over older Voronoi libs. [github](https://github.com/mapbox/delaunator)

2. **Optional: power/weighted Voronoi / relaxation layer**  
   - If some stars should exert more influence, incorporate weight into the site positions (or pre‑relax with CVT‑style iterations as in Voronator’s centroidal tessellation example). [reddit](https://www.reddit.com/r/rust/comments/hjbl0y/introducing_voronator_a_voronoi_diagram_and/)

3. **Contour smoothing**  
   - Run a Chaikin‑style or similar smoothing pass on each cell’s polygon to get rounded contours. [reddit](https://www.reddit.com/r/proceduralgeneration/comments/9ug6k1/anyone_know_of_a_good_approach_for_voronoi_edge/)

4. **Visual blending & gradients** (two good routes):
   - **Lightweight route:**  
     - Keep Voronoi for ownership.  
     - In the shader (or CPU), also compute distances to nearest 2–3 rival stars/factions within a blending radius and blend their colors by normalized inverse distance, as in the Voronoi biome‑blending idea. [reddit](https://www.reddit.com/r/proceduralgeneration/comments/13q95ri/how_can_i_smoothblend_the_edges_of_procedural/)
   - **Heavier but prettier route:**  
     - Use SDF/metaball fields per faction and smooth max/min blending for boundaries and colors, like common SDF terrain/metaball setups. [developer.nvidia](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu)
     - Optionally derive polygons from those fields if you need discrete regions.

Exposed tuning variables you can surface to designers/yourself:


- Voronoi relaxation iterations / weight (if using CVT‑style relaxation).  
- Polygon smoothing iterations / tension (Chaikin).  
- Blending radius around borders.  
- Distance falloff curve (linear vs smoothstep vs exponential). [reddit](https://www.reddit.com/r/proceduralgeneration/comments/13q95ri/how_can_i_smoothblend_the_edges_of_procedural/)
- Field strength and falloff for metaball/SDF territories (controls blob size and sharpness). [reddit](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)

If you tell me your target platform (e.g., canvas vs WebGL, SvelteKit app vs engine) and typical star counts, I can sketch a concrete architecture (CPU/GPU split, data structures, and a small API surface) tailored to your stack.