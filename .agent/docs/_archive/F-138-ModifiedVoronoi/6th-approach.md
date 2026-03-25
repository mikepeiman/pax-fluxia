Use a hybrid: **graph-correct ownership logic** (network-distance) + **GPU raster distance-field rendering** (thick blended borders + organic, stable animation). This meets all your constraints and makes “no noticeable movement” achievable with temporal smoothing, without having to rebuild polygon meshes every tick. Network Voronoi is explicitly “Voronoi on a network using shortest paths,” which matches “front lines follow edges.”  For thick borders and blends, a distance-field/Voronoi-on-a-grid approach is standard, and Jump Flooding (JFA) is a common GPU method to compute (approximate) Voronoi and distance transforms efficiently. [comp.nus.edu](https://www.comp.nus.edu.sg/~tants/jfa/i3d06.pdf)

## Complete spec (what to compute)
### Inputs
- Graph: stars \(V\), lanes \(E\), lane length \(len(e)\) (or 1 for hops).
- Ownership: `owner[v] -> playerId` (always one of N players).
- Rendering positions: `pos[v] -> (x,y)` for each star in world space (already in your engine).
- Player parameters (UI-controlled):
  - `distanceMode`: `"hops"` or `"laneLength"` (or custom).
  - `strengthMode`: `"off" | "biasDistance" | "biasOnlyWhenEnemyGap"` (recommended).
  - `strengthK`: float slider.
  - `borderWidthPx`: float slider.
  - `borderSoftnessPx`: float slider.
  - `edgeFollow`: `"strict"` (your constraint) vs `"loose"` (optional future).
  - `disconnectSeparation`: on/off (your “must show enemy between disconnected pockets”).
  - `animationHalfLifeMs`: smoothing slider (e.g., 80–400ms).

### Territory logic (graph-correct)
1) **Compute owner-components (disconnect groups)**  
For each player \(p\), find connected components in the subgraph induced by stars owned by \(p\) (lanes are adjacency only, per your note). This gives `compId[v]` for every star (unique within its owner). Connected components are the standard way to identify disconnected pockets. [en.wikipedia](https://en.wikipedia.org/wiki/Connected_Component_Labeling)

2) **Define “influence sources”**  
Each star is a source for its `(playerId, compId)` label. (This is the trick that guarantees disconnected pockets never merge visually.)

3) **Compute best + second-best labels for every star**  
Run **multi-source Dijkstra** over the star graph where every star-source starts at distance 0 with its `(player, comp)` label; propagate distances through lanes. Dijkstra is the standard algorithm for shortest paths in weighted graphs. [en.wikipedia](https://en.wikipedia.org/wiki/Dijkstra's_algorithm)
Store, per star `v`:
- `best[v] = {label: (p,c), dist: d1}`
- `second[v] = {label: (q,cq), dist: d2}`

4) **Apply your “enemy gap” rule** (disconnectSeparation)
When picking the 2nd label used for border blending, enforce:
- If `second.label.player == best.label.player` but `second.label.comp != best.label.comp`, then skip it and take the next best label whose `player != best.player` (you can keep top-K, usually K=4 is plenty).  
This guarantees “between disconnected same-player pockets is enemy territory,” without introducing neutrals.

5) **Nearest vs strongest options**
Implement as a scoring function used inside Dijkstra relaxations (or as a post-score after distances are known):

- **Nearest-only** (default): score is pure shortest-path distance \(d\). This matches the Voronoi definition “region = points closest to a site,” just with network distance. [infolab.usc](https://infolab.usc.edu/assets/pdf/courses/csci587/papers/dasfaa2012_ugur.pdf)
- **Strength-biased** (toggle): score \(d' = d - k \cdot S(player)\) (or \(d' = d / (1 + kS)\)).  
Guidance:
  - If you want stability, apply strength bias only when resolving **enemy competition** (i.e., when `player differs`), not within same player, so components don’t shift due to strength changes.
  - If you want “pressure lines” that breathe, allow bias continuously, but then you’ll want stronger temporal smoothing.

## Rendering architecture (how to draw it)
### Why raster + distance field
You want thick borders, two-color blending, and organic morphing on conquest with no noticeable movement elsewhere; this maps directly to maintaining a **territory field texture** and rendering it with a shader that derives border bands from “best vs second-best distance.” JFA is a known GPU approach to generate Voronoi/distance transforms fast on a grid. [en.wikipedia](https://en.wikipedia.org/wiki/Jump_flooding_algorithm)

### Two viable rendering pipelines
#### Pipeline A (recommended): GPU JFA territory texture
This is best if you can write a couple of custom shaders/passes in Pixi/WebGL2.

Passes (per update, not necessarily every frame):
1) Seed texture: each star writes its `(player, comp)` id and a seed marker into a low-res RT (e.g., 512²–1024² depending on zoom).  
2) JFA passes: run log2(res) iterations to propagate nearest seed (Voronoi) and optionally distance. JFA is designed to compute an approximate Voronoi on a grid in a small number of rounds. [comp.nus.edu](https://www.comp.nus.edu.sg/~tants/jfa/i3d06.pdf)
3) Extract top-2: either run a modified JFA that tracks two best seeds, or do: best via JFA + second via neighborhood sampling around boundaries (good enough visually).
4) Final shade pass: for each pixel:
   - determine `p1` and `p2`,
   - compute border mask from `(d2 - d1)`,
   - blend `color[p1]` and `color[p2]` across a band of width `borderWidthPx`,
   - apply softness with `borderSoftnessPx`.

PixiJS supports WebGL/WebGPU rendering and render-to-texture workflows, which is the integration point for these passes.  (You’re already using Pixi-like GPU rendering in your project visuals, so this should fit.) [pixijs](https://pixijs.com/8.x/guides/components/renderers)

#### Pipeline B (easier to implement): CPU field on a grid + upload texture
If you want simplest TS implementation first:
1) Create a 2D grid over the viewport/world (say 256²–512²).  
2) For each grid cell, determine nearest `(player, comp)` using your graph-distance precompute plus “snap-to-lanes” sampling (details below), store best+second.  
3) Upload as a texture each time ownership changes; render with a single fragment shader for thick borders/blends.

This is heavier on CPU but can be okay if updates only happen on conquest events, not every tick.

### “Borders follow edges, not Euclidean space” in the raster
To keep the field graph-faithful, don’t use Euclidean distance-to-star as the metric. Instead, evaluate distance by **projecting a pixel to the graph** and using precomputed graph distances.

A robust method:
- Represent each lane as a polyline segment in world space.
- For a pixel/sample point \(x\), find its nearest lane segment (spatial hash/grid accel).
- Let that nearest lane be edge \(e=(a,b)\) and let \(t\in[0,1]\) be the projection along the segment.
- Define graph-distance from \(x\) to a label \(L\) as:
  \[
  D(x,L)=\min\big(d(a,L)+t\cdot len(e),\ d(b,L)+(1-t)\cdot len(e)\big)
  \]
  where `d(node,label)` comes from your multi-source Dijkstra distances.  
This makes boundaries *live on lanes* and yields midpoint splits naturally when distances match.

Then:
- best label at \(x\) is argmin over labels of \(D(x,L)\) (you can restrict to candidate labels from endpoints’ best/second to keep it fast).
- second-best is the next argmin with your “enemy gap” rule.

This gives you lane-following borders even though you’re shading a 2D region.

## Temporal stability and “organic conquest morph”
You said “no noticeable movement,” not bitwise identical, so you can do **temporal smoothing** instead of ROI-recompute trickery.

### What to smooth
Smooth the *final* territory texture (or just the border mask), not the underlying discrete IDs (IDs flipping causes popping).

Two good approaches:
1) **History blend (ping-pong RT)**  
Keep `territoryRT_prev` and `territoryRT_new`. When ownership changes, recompute `new`, then each frame render:
- `display = mix(prev, new, alpha(t))`, with alpha easing over `animationHalfLifeMs`.  
This yields stable, localized-feeling motion if your recompute itself is stable and you only trigger recompute on conquest events.

2) **Velocity-limited border**  
Compute a “distance-to-frontier” scalar field and advect it slowly; this is more complex but can look very organic. Start with history blend first.

Add organic feel without flicker:
- Apply small domain-warp noise only to the *border mask* before blending colors (never to ownership selection). That makes the line feel alive while the regions remain stable.

## SvelteKit/TS architecture (modules + data flow)
### Core modules
1) `GraphTerritory.ts`
- Builds adjacency, stores lane lengths.
- Computes `compId[v]` per owner via BFS/DFS. [en.wikipedia](https://en.wikipedia.org/wiki/Connected_Component_Labeling)
- Runs multi-source Dijkstra to produce `bestDistToLabel[node]` (and optionally top-K). Dijkstra is your foundation. [en.wikipedia](https://en.wikipedia.org/wiki/Dijkstra's_algorithm)
- Exposes query helpers:
  - `edgeSplit(e): t` for where boundary lies on a lane.
  - `distanceAtPoint(x): {p1,p2,d1,d2}` using projection-to-edge formula above.

2) `LaneSpatialIndex.ts`
- Uniform grid / RBush over lane segments for fast “nearest segment to point.”

3) `TerritoryFieldRenderer.ts` (Pixi)
- Manages render textures (ping-pong).
- Implements either:
  - GPU JFA passes (Pipeline A), or
  - CPU grid sample + upload (Pipeline B).
- Final fragment shader:
  - Samples packed data (p1,p2,d1,d2 or an equivalent),
  - Produces fill color + thick blended border.

4) `TerritoryControls.svelte`
- Binds sliders/toggles to a `TerritorySettings` store.
- Debounces heavy recompute triggers (e.g., recompute on conquest end, not every tick).

### Update policy
- On conquest (star owner changes):
  1) Update `owner[v]`.
  2) Recompute **only**:
     - components for the two affected players (old owner, new owner),
     - and distances in a bounded radius if you implement incremental Dijkstra later; otherwise recompute all distances (often fine at your graph sizes).
  3) Trigger renderer recompute (new RT) and start a timed blend.

Because you’re targeting “no noticeable movement,” bias toward determinism: stable tiebreaks, stable sampling resolution, stable noise seeds.

## Libraries (useful, optional)
- For weighted/power Voronoi polygons: `d3-weighted-voronoi` exists, but it’s Euclidean plane power diagrams and won’t satisfy “front lines follow edges” or your conquest morph goals as cleanly as a raster field. [npmjs](https://www.npmjs.com/package/d3-weighted-voronoi)
- For GPU JFA reference: `patricklbell/jsjfa` is a WebGL JFA demo you can crib patterns from (ping-pong textures, step schedule). [github](https://github.com/patricklbell/jsjfa)
- Renderer: PixiJS renderer + render-to-texture is the pragmatic base for these GPU passes in TS. [pixijs](https://pixijs.com/8.x/guides/components/renderers)

## Implementation order (so an agent can ship it)
1) Implement **GraphTerritory** with components + multi-source Dijkstra + point-to-lane projection distance. [en.wikipedia](https://en.wikipedia.org/wiki/Connected_Component_Labeling)
2) Implement **CPU grid field** (Pipeline B) at low res + shader for border thickness + two-color blend.  
3) Add history blending to make conquests morph smoothly.  
4) Only then upgrade to **GPU JFA** (Pipeline A) if CPU grid becomes a bottleneck.

If you tell me your typical map sizes (stars, lanes) and your target territory texture resolution at common zoom levels, I can recommend whether Pipeline B is already sufficient and what recompute budget (ms) you should aim for.