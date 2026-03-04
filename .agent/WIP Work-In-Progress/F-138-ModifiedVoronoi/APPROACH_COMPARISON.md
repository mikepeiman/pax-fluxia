# Territory Renderer Approaches — Comparison

## The Problem

Render territory ownership on a star-lane map with: graph-correct borders (follow lanes), disconnected pocket separation, thick blended borders, and smooth conquest animation where only the contested border slides.

---

## Approaches

| # | Name | How It Works | Borders | Animation | Graph-Correct? | Status |
|---|------|-------------|---------|-----------|----------------|--------|
| 1 | **Pixel Classic** | Worker: per-pixel nearest-star by Euclidean distance. Writes RGBA buffer → canvas → PIXI.Texture → sprite | Implicit from distance field — border where two owners meet. Configurable via `GRAPH_BORDER_WIDTH` | **None** — fingerprint-gated, full redraw on change | ❌ Euclidean, not graph metric | Working, toggle `TERRITORY_PIXEL` |
| 2 | **Graph Barriers** | Like Pixel Classic but adds barrier segments on enemy lanes. Worker tests line-of-sight to each star; barriers block claiming | Same as Pixel but barriers shape them | **None** — same as Pixel | ✅ Partially — barriers constrain but distance is still Euclidean | Working, toggle `TERRITORY_GRAPH` |
| 3 | **Contour** | Marching squares on scalar field → vector polylines | Vector polyline borders | **None** | ❌ Euclidean | Working, toggle `TERRITORY_CONTOUR` |
| 4 | **Modified Voronoi** | d3-delaunay Voronoi polygons clipped to star margin | Polygon edges | Fill morphing (removed) | ❌ Euclidean | Working but limited |
| 5 | **Power Voronoi** | Weighted Voronoi via `d3-weighted-voronoi`. Merged polygons per owner. Shared edge detection | Shared polygon edges, configurable width/alpha | **Lego mode**: per-edge lerp (each segment slides independently). **Smooth mode**: attempted polyline chaining — fragile | ❌ Euclidean weighted | Working (Lego mode works; Smooth mode limited) |
| 6 | **Distance Field** *(new)* | Multi-source Dijkstra on star graph → graph-metric distances per star → rasterize via point-to-lane projection → border from `|d1-d2|` | Distance field border: thick, soft, 2-color blended. Width/softness via config | **Primary**: lerp distance values → re-rasterize → border physically slides. **Secondary**: texture crossfade (dissolve) | ✅ True graph metric via Dijkstra | Planned |

---

## Key Differences: Distance Field vs Pixel Classic

| Aspect | Pixel Classic / Graph Barriers | Distance Field (new) |
|--------|-------------------------------|---------------------|
| **Distance metric** | Euclidean `Math.hypot(px-sx, py-sy)` | Graph shortest-path via Dijkstra on star/lane network |
| **Border position** | Where two Euclidean regions meet — cuts through empty space | Where graph distances equalize — follows lane geometry |
| **Disconnected pockets** | May merge visually if close in Euclidean space | Separated by `(playerId, componentId)` labels — never merge |
| **Animation** | None (full redraw) | Distance-value interpolation → border slides smoothly |
| **Computation** | Per-pixel nearest-star (O(V) per pixel) | Dijkstra once O((V+E)logV), then per-pixel lane projection (O(1) with spatial index) |
| **Architecture** | Worker → pixel buffer → Texture → Sprite | Same pipeline, different math inside worker |

## Key Difference: Distance Field vs Power Voronoi

| Aspect | Power Voronoi (polygon mesh) | Distance Field (raster) |
|--------|------------------------------|------------------------|
| **Representation** | Polygon vertices + edges | Pixel grid with distance values |
| **Animation** | Must match/resample/lerp geometry — breaks on topology changes | Lerp scalar distance values → re-rasterize. No geometry matching. |
| **Borders** | Drawn as PIXI line segments between vertices | Implicit from `|d1-d2|` — naturally thick, soft, blended |
| **Why polygon morphing is fragile** | Vertex count changes, edge topology changes, endpoint snapping fails, open vs closed polyline confusion | N/A — no vertices to match |
