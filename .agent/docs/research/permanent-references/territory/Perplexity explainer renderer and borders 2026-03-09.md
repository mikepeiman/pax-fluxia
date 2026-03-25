You can get to “SVG-clean” borders, but only if you separate three issues that keep getting tangled: (a) where the border is mathematically, (b) what geometric representation you keep as canonical, and (c) how you rasterize it. Right now every failure you’ve seen is some mix of “staircase baked into the geometry source” plus “trying to massage a raster into looking vector-like.”

I’ll answer your questions in that frame.

***

## 1. Hybrid distance field + vector borders?

Yes, a hybrid is viable and performant at 2k/60, and it’s actually close to what you already sketched:

- Use a **distance-field / ownership-RT** for:
  - full-screen fill color, shading, and soft internal gradients
  - conquest cross-fades (Fade Blend mode)
- Use a **vector stroke pass** for:
  - the crisp border outline
  - morphing the outline under a Boundary Morph mode

Key constraints for the hybrid to stay correct:

- The RT is **not** the geometry truth; it is just a sampled representation of the graph-native ownership function.
- The stroke pass takes a **canonical polyline graph** as input (analytic / fitted centerlines in world space) and ignores RT jaggedness entirely.
- At the end, the RT fill and the stroke borders must be aligned visually (RT resolution high enough, and borders used to sanity-check the RT).

Performance-wise, two full-screen passes at 2k (ownership RT + fill composite) plus a vector-mesh draw of O(edges × samples) triangles is well within budget on any reasonable GPU, especially if you gate the RT to topology changes and keep only one small custom shader in the main loop.

So: yes, you can absolutely keep your distance-field renderer for fill/fade, as long as you stop trying to use its contours as the stroke geometry.

***

## 2. How to get truly clean borders

You will only get “vector-like, smooth, even edges” if you commit to this discipline:

1. **Pick a canonical border representation that is vector from the start.**
   - Canonical object: a set of polylines / curves in world space (graph-derived), each tagged with `{ownerA, ownerB}`.
   - All borders are drawn from this representation via stroke meshes.
   - You never re-derive the border shape by sampling a texture or grid.

2. **Make the canonical representation independent of the render grid.**
   - The geometry must live in the same continuous world space as your stars and lanes.
   - It can come from:
     - analytic equal-distance points on lanes (Stage 2A),
     - field frontier refinement (Stage 2B),
     - plus a curve fitting stage (straight / curved / segmented) with error bounded in world units.
   - Fitting error bound must be tighter than half the on-screen stroke width at your **highest zoom**, not at gameplay zoom.

3. **Stroke, don’t feather.**
   - Borders must be drawn as triangle strips with:
     - constant world-space half-width `w`,
     - proper joins and caps,
     - gamma-correct blending.
   - You don’t rely on soft alpha feathering to “hide” stair-steps; you prevent them by having straight or smooth curves in the geometry.

4. **Avoid resampling or re-rasterizing the canonical border.**
   - Once you have the fitted centerlines, you:
     - build mesh once per topology change (or per morph),
     - only change shader uniforms (colors, width, softness) per frame.
   - You do not run “another distance field” over the border and then take an isocontour; that’s exactly how staircase re-enters.

In concrete terms for you:

- Stage 1: graph-native Dijkstra distances at stars (you already have this).
- Stage 2: compute candidate frontiers analytically (on lanes) and from the RT with sub-texel refinement.
- Stage 3: merge into a `FrontierGraph` and run a **polyline fitter**:
  - `straight`: RDP + collinearity penalty,
  - `curved`: arc / cubic with error bound,
  - `segmented`: angle quantization.
- Stage 4: stroke these polylines as vector meshes.

If there is still stepping at that point, it can only be from:

- too-large fitting tolerance,
- imprecise numeric calculations (e.g. quantization in world → screen),
- or the stroke mesh itself being under-tesselated (corners having too few segments).

Those are all tunable and local; you are no longer fighting an inherent grid.

***

## 3. Can we “re-quantise” to a pixel-perfect canonical border line?

Your idea:

> 3. Can we not take the computed borders as we have them, use a tunable arbitrary segment length n (eg. 20px) and then  
> 3.1 draw virtual lines along every segment, store the totality as a border/territory-boundaries map  
> 3.2 Convert it into a true pixel-by-pixel singular line as the canonical border for the whole map, and then render from that?

This is basically: “snap the border to a **screen-space** digital curve with step size N, and then treat that as the canonical border.”

You can do this, but note the trade-offs:

- If N == 1 px and you rasterize into a bitmap, you are back in **pixel geometry**:
  - You can get something like a **centerline skeleton** in pixel space and stroke it with a full-resolution vector stroke.
  - However, your border will still be limited by the pixel grid when you zoom in further than that raster was designed for (e.g. zoom in beyond 1:1).
- If N is larger (e.g. 20 px), you have a coarse “polygonization” in screen space that will visibly kink at that sampling interval.

So the real question: do you want canonical truth in **world** space or in **current-screen** space?

Given your spec (“vector-like, smooth, even edges” and “clean morphing animations”), world-space makes more sense:

- World-space polylines give you zoom invariance: you can zoom in deeply and still see smooth curves.
- Pixel-space canon collapses when the camera changes (you’d have to recompute at every zoom level).

Where your idea is useful is as a **post-processing regularizer**, not as truth:

- You have world-space centerlines.
- Before stroking, in the vertex shader or when building the mesh, you can enforce:
  - uniform segment length in screen space (re-tesselate curves to keep stroke curvature smooth),
  - sample positions at e.g. every 10-20 px of arc length so antialiasing is consistent.

But you don’t want a global “1-pixel raster” to become the only canonical record of where the border is; that defeats the whole vector guarantee.

So:

- **Yes** to: “resample world-space polylines at constant screen-space step to improve stroke quality.”
- **No** to: “turn border into a pixel-by-pixel 1-px skeleton and treat that as the only ground truth.”

***

## A more precise recipe, step-by-step

If you want the cleanest path from where you are today to spec-compliant borders, I’d suggest:

1. **Lock canonical geometry in world space**
   - Use your `FrontierGraph` + fitted paths as the only border source in canonical mode.
   - Eliminate any path where the centerline is computed in RT/grid space.

2. **Guarantee geometric smoothness**
   - In your fitter, choose an error tolerance `ε_world` that corresponds to at most, say, **0.25–0.5 pixels** at the maximum zoom level you care about.
   - For straight family: run RDP with:
     - distance tolerance = `ε_world`,
     - angle penalty or collinearity requirement so you get true straight segments.
   - For curves: run an arc / cubic fit under the same tolerance.

3. **Stroke with enough tessellation**
   - Before emitting the mesh, walk each segment and ensure no segment spans more than, say, 8–16 px of screen space at current zoom.
   - If it does, split it into subsegments in world space.
   - This gives the rasterizer enough coverage to anti-alias smoothly without introducing visible jaggies.

4. **Turn off feathering tricks**
   - For the debug step, draw borders fully opaque, no feathering, 1-px width.
   - Verify they look like clean vector strokes.
   - Only then restore soft blending and thicker widths to get your VFX look.

5. **Use DF/RT only for fill + fade**
   - Keep fade-blend conquest as a purely texture-driven mode:
     - RT_old → RT_new → sample and mix.
   - Borders remain purely geometric; you can cross-fade their colors along the same morph timeline, but you don’t derive their shape from the DF.

6. **Debug visually**
   - Add toggles:
     - show raw `FrontierGraph` nodes (small points),
     - show fitted polylines (thin lines),
     - show stroke meshes in wireframe,
     - show RT ownership overlay.
   - If borders look jagged while polylines are smooth, the issue is in stroke tessellation or anti-aliasing, not in the math.

***

## Answering your three questions directly

1. **Hybrid DF + SVG-like stroke?**  
   Yes. Use DF/RT for the **field** and a vector-stroke pipeline for the **border**, with the stroke driven by graph-native centerlines, not by the DF. At 2k/60 this is perfectly feasible if you gate RT updates and keep the stroke meshes reasonably sized.

2. **How to draw truly clean borders?**  
   - Maintain a **world-space polyline/curve graph** as the canonical frontier, derived directly from graph distances (and refined RT frontiers for interstitials).  
   - Fit it under a world-space error bound that maps to < 1 px at max zoom.  
   - Stroke it with adequately tessellated triangle strips, no feathered hacks.  
   - Never derive stroke geometry from a raster.

3. **Pixel-by-pixel singular line as canonical?**  
   - As a **rendering output**, yes: your stroke can rasterize to a single-pixel line with perfect coverage and anti-alias, especially if you later add MSAA or FXAA.  
   - As a **truth source**, no: you don’t want to demote the border back to pixel grid; keep truth in world space and use per-frame rasterization for display, not for logic.

If you’d like, the next thing I can do is write a very tight spec for the **polyline fitting + stroke tessellation** part only (Stage 5/6), with explicit numeric tolerances and Svelte/Pixi-oriented implementation notes.


# User Questions
- What does  this mean? What is `path` here? "Eliminate any path where the centerline is computed in RT/grid space"
- "Canonical object: a set of polylines / curves in world space (graph-derived), each tagged with {ownerA, ownerB}" how are these computed, exactly? Is there a name(s) for this field of math, this algo, this technique, this process?
- "Borders must be drawn as triangle strips with:" Why triangles? I don't know the technicalities of rendering at all, please explain. Why isn't it just a "stroke" of a certain width? If it's made of triangles, why? And don't they need to match their angle of rotation to the angle of the line on the map?

Stage 1: graph-native Dijkstra distances at stars (you already have this).
> Explain
Stage 2: compute candidate frontiers analytically (on lanes) and from the RT with sub-texel refinement.
> Explain
Stage 3: merge into a FrontierGraph and run a polyline fitter:
straight: RDP + collinearity penalty,
curved: arc / cubic with error bound,
segmented: angle quantization.
> Explain, and devise how exactly I can have tuning handles exposed that can do various things to adjust the location and shape of the border based on the world data we're working with?

---

## 1. What does "path" mean here?

"Eliminate any path where the centerline is computed in RT/grid space" means:

- **"path"** = any code path, function call chain, or execution flow in your renderer.
- **"centerline is computed in RT/grid space"** = any code that takes a rasterized ownership texture (`ownerGrid`) and extracts its boundary edges as the "centerline" or "frontier."
- **Your current code does exactly this**: `buildCenterlineGraphsFromOwnerGrid(ownerGrid, gridW, gridH)` walks the pixel grid, finds where adjacent cells have different owners, and treats those pixel edges as the centerline graph. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/1b3a2a10-21ef-423f-b241-ddf972127463/centerlineGraph.ts)

The instruction means: **cut that code path entirely from canonical mode**. The canonical centerline must come from graph math, not from pixel boundaries.

## 2. Canonical object: set of polylines/curves in world space

### What it is
A `FrontierGraph` where each edge is a straight line or curve segment between two world-space points, tagged with `{ownerA, ownerB}`.

### How it is computed
1. **Graph-native ownership field**: Stage 1 Dijkstra computes distance from every star to every player under the graph metric. [reddit](https://www.reddit.com/r/gamedev/comments/47c9jz/voronoi_diagrams_understanding_the_basic/)
2. **Frontier extraction**:
   - **On lanes**: solve \(D_p(t) = D_q(t)\) for candidate pairs `{p, q}` along each `Connection` using bisection (Stage 2A). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/c61b6b2e-6cec-424b-a336-933f461f4bbe/TERRITORY_ARCHITECTURE_v3.md)
   - **In field**: extract boundaries from ownership RT with sub-texel refinement using gapNorm (Stage 2B). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/c61b6b2e-6cec-424b-a336-933f461f4bbe/TERRITORY_ARCHITECTURE_v3.md)
3. **Merge**: connect lane and field frontier points into a graph (Stage 4). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/c61b6b2e-6cec-424b-a336-933f461f4bbe/TERRITORY_ARCHITECTURE_v3.md)
4. **Fit**: simplify the raw frontier graph into polylines/curves (Stage 5). [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/742166/c61b6b2e-6cec-424b-a336-933f461f4bbe/TERRITORY_ARCHITECTURE_v3.md)

### Mathematical name
**Graph Voronoi diagram** (or **additively weighted Voronoi diagram** on the star-lane graph, where "sites" are owned stars and weights are graph shortest paths). The frontier edges are the Voronoi edges between player regions. [redblobgames](https://www.redblobgames.com/x/2022-voronoi-maps-tutorial/)

### Technique name
- **Multi-source Dijkstra** for graph Voronoi cells. [reddit](https://www.reddit.com/r/gamedev/comments/47c9jz/voronoi_diagrams_understanding_the_basic/)
- **Ramer–Douglas–Peucker (RDP)** for polyline simplification in Stage 5. [github](https://github.com/scottglz/line-simplify-rdp)
- **Triangle strip stroking** for rasterizing the fitted polylines into GPU meshes. [github](https://github.com/processing/p5.js/issues/3119)

***

## 3. Why triangle strips? Why not just a "stroke"?

### The problem: WebGL has no "stroke" primitive
- WebGL (and Pixi.js under it) has four drawing modes: `POINTS`, `LINES`, `LINE_STRIP`, `TRIANGLE_STRIP`.
- There is no built-in "draw stroke with width W, round joins, miter caps."
- To get thick lines with proper joins/caps/antialiasing, you have to **fake it with triangles**.

### Why triangles?
A thick stroke is a **ribbon of triangles** extruded perpendicular to the centerline:

```
Centerline:    ----*----*----*----*----
Perp vectors:  /     /     /     /
               \     \     \     \
Triangle strip: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

- Each pair of consecutive points on your polyline defines a **quad**.
- Each quad is two triangles.
- The whole chain is a continuous `TRIANGLE_STRIP` that shares edges between quads.
- The perpendicular offset is computed from the lane direction: `normal = rotate90(line direction)`.

### Why rotation matches the line angle?
Yes, automatically:

```
For line from (x0,y0) → (x1,y1):
dx = x1 - x0, dy = y1 - y0
len = sqrt(dx² + dy²)
nx = -dy / len   // perpendicular left
ny = dx / len

Left vertex:  (x, y) + w * (nx, ny)
Right vertex: (x, y) - w * (nx, ny)
```

The normal `(nx, ny)` is **always perpendicular** to the line direction `(dx, dy)`, so rotation is automatic.

### Why triangle strips over individual triangles?
- **GPU efficiency**: one draw call vs many.
- **Vertex sharing**: shared edges between quads are only stored once.
- **Pixi.js native**: `PIXI.Mesh` with `TRIANGLE_STRIP` is optimized.

In Pixi.js, you create a `PIXI.Mesh` with:
- vertex positions (center + left/right offsets),
- UVs or colors per vertex,
- one draw call for the whole border network.

***

## Stage 1: Graph-native Dijkstra distances at stars (Explain)

**What it does**: Computes, for every star and every player, the shortest path distance **on the graph** (counting lane weights).

**Input**: `StarState[]`, `StarConnection[]`, `playerIds[]`.

**Output**: `GraphNativeDistanceResult`:
- `distToPlayer[starIndex][playerIndex]` = graph distance from star to nearest star owned by that player.
- `top2ByStar[starIndex]` = `{best, second}` closest players to that star.

**Why**: This is the **graph Voronoi partition** — every star belongs to the player whose territory it is closest to under graph distance (not Euclidean). This is your canonical ownership truth. [redblobgames](https://www.redblobgames.com/x/2022-voronoi-maps-tutorial/)

***

## Stage 2: Compute candidate frontiers analytically (on lanes) + RT sub-texel

**Stage 2A: On lanes**
- For each `Connection` from star A to star B:
  - Look at `distToPlayer` for all relevant players at A and B.
  - For each pair `{p, q}`, solve \(D_p(t) = D_q(t)\) where:
    ```
    D_p(t) = min( d_p(A) + t * w, d_p(B) + (1-t) * w )
    ```
  - Each solution `t*` is an exact frontier point on the lane.
- Output: world-space points `(x,y)` tagged `{ownerA, ownerB}`.

**Stage 2B: RT sub-texel**
- Render ownership RT using Stage 1 distances.
- Walk pixels, find where adjacent pixels have different `ownerIdx`.
- Use `gapNorm` channel to refine the frontier **between** pixel centers: `t = gapA / (gapA + gapB)`.
- Output: world-space points `(x,y)` tagged `{ownerA, ownerB}`.

**Why**: Stage 2A gives precise anchors where graph competition resolves on lanes; Stage 2B fills interstitial gaps where no lane passes. Together they trace the full visible frontier of the Voronoi partition. [reddit](https://www.reddit.com/r/gamedev/comments/47c9jz/voronoi_diagrams_understanding_the_basic/)

***

## Stage 3: Merge into FrontierGraph + polyline fitter (Explain)

### Merge into FrontierGraph
- Take Stage 2A + 2B points.
- Group by `{ownerA, ownerB}`.
- Connect nearby points into edges (spatial proximity).
- Bridge lane and field frontiers where they meet (<5 world units).
- Result: `FrontierGraph` = nodes + edges in world space.

### Polyline fitter
- Walk `FrontierGraph` to extract polylines per owner pair.
- **Straight (RDP)**:
  - Ramer–Douglas–Peucker: iteratively remove points farthest from the line between endpoints until all remaining points are within tolerance `ε_world`. [github](https://github.com/cacdigital/rdp)
  - Add collinearity penalty: prefer long straight runs.
- **Curved**: fit arcs or cubics under same tolerance.
- **Segmented**: snap directions to discrete angles (15° increments).

**Tunable controls** (exposed as UI sliders):

| Parameter | Effect | Range | Default |
|-----------|--------|-------|---------|
| `FIT_ERROR_WORLD` | Max deviation from true frontier (world units) | 1–20 | 4 |
| `MIN_SEGMENT_LENGTH_WORLD` | Reject tiny segments | 2–10 | 4 |
| `COLLINEARITY_PENALTY` | Favor straight runs (higher = more straight) | 0–2 | 0.5 |
| `ANGLE_QUANTIZE_DEGREES` | Segmented family snap angle | 5–45 | 15 |
| `MAX_CURVE_SEGMENTS` | Limit curved family complexity | 4–32 | 12 |

**How tuning works**:
- `FIT_ERROR_WORLD` controls smoothness vs fidelity: small = more segments (fidelity), large = fewer segments (smooth).
- `COLLINEARITY_PENALTY` controls straightness: high value aggressively collapses collinear points into long segments.
- `MIN_SEGMENT_LENGTH_WORLD` prevents micro-segments that cause visual noise.
- During morph: interpolate the fitted polylines or their control points, or rebuild the fitter from interpolated distances.

***

**Bottom line**: Triangle strips are how WebGL/Pixi renders thick lines with proper joins. The canonical polylines come from graph Voronoi frontiers. RDP fitting + tight error bounds give you the clean geometry. The rest is just wiring it up correctly. [github](https://github.com/pixijs/pixijs/issues/4280)