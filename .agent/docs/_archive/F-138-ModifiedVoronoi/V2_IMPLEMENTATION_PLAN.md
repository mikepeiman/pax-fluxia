# Fresh Territory Renderer — Implementation Plan

> **Goal:** Build a new, clean `TerritoryVoronoiV2Renderer.ts` from scratch using edge-graph architecture, power diagrams, and virtual stars. Replace the current `ModifiedVoronoiRenderer.ts`.

---

## Library Stack

| Library | Purpose | Install |
|---------|---------|---------|
| `d3-weighted-voronoi` | Power diagram (weighted Voronoi) — star margin as weight, tiling preserved | `npm i d3-weighted-voronoi` |
| `d3-delaunay` | Kept as fallback / for adjacency queries | Already installed |

### `d3-weighted-voronoi` API

```typescript
import { weightedVoronoi } from 'd3-weighted-voronoi';

const wv = weightedVoronoi()
  .x(d => d.x)
  .y(d => d.y)
  .weight(d => d.weight)    // higher weight = larger cell
  .clip([[0,0], [W,0], [W,H], [0,H]]);

const polygons = wv(sites);  // sparse array of [x,y][] polygons
// Each polygon has .site = { x, y, weight, originalObject }
```

**Power diagram property:** Additive weight is subtracted from squared distance. Higher weight = boundary pushed further from site = larger cell. This is EXACTLY star margin — give each star a weight proportional to desired margin.

---

## Architecture: Edge Graph

### Core Data Model

```typescript
interface Site {
  id: string;
  x: number; y: number;
  ownerId: string;
  weight: number;        // star margin → power diagram weight
  virtual?: 'corridor' | 'disconnect';  // virtual star type
  sourceStarId?: string; // for virtuals: which real star spawned this
}

interface SharedVertex {
  x: number; y: number;
  edges: SharedEdge[];   // edges meeting at this vertex
}

interface SharedEdge {
  v1: SharedVertex;      // start vertex (shared reference)
  v2: SharedVertex;      // end vertex (shared reference)
  ownerLeft: string;     // owner on left side
  ownerRight: string;    // owner on right side (or '__boundary__')
}

interface EdgeGraph {
  vertices: SharedVertex[];
  edges: SharedEdge[];
}
```

### Why This Solves Gaps

- Every boundary edge is a SINGLE object referenced by both adjacent owners
- Moving a vertex moves it for ALL edges connected to it
- No duplicate vertex copies → no divergence → no gaps
- Three-way junctions are naturally represented (vertex with 3+ edges)

---

## Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  PRE-VORONOI: Build site array                                  │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ 1. All owned stars → sites with weight = starMargin²        │
│  │ 2. Corridor virtuals → same-owner lanes (spacing param)     │
│  │ 3. Disconnect virtuals → enemy at midpoints of non-laned    │
│  │    same-owner pairs                                          │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓                                  │
│  VORONOI: d3-weighted-voronoi power diagram                     │
│  Result: gap-free convex polygon array with star margin baked in│
│                              ↓                                  │
│  EDGE GRAPH: Build shared edge graph from polygon array         │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ 1. Extract all edges from all cells                          │
│  │ 2. Match shared edges (same vertices, different owners)      │
│  │ 3. Build SharedVertex / SharedEdge graph                     │
│  │ 4. Merge same-owner internal edges (remove from graph)       │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓                                  │
│  SMOOTHING: Operate on edge graph (not polygons)                │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ 1. Arc smoothing: evaluate angles at junctions               │
│  │    → insert Bézier points on shared edges                    │
│  │    → both sides affected identically                         │
│  │ 2. Chaikin smoothing: corner-cut on edge graph               │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓                                  │
│  RENDER: Trace edges → polygon contours → PIXI fill + stroke   │
└─────────────────────────────────────────────────────────────────┘
```

### Key difference from current renderer:
- **Star margin is NOT a pipeline stage.** It's a weight parameter in the Voronoi itself.
- **All modifications operate on shared edges.** No per-polygon processing.
- **Virtual stars handle topology.** Corridors and disconnect buffers are Voronoi-level, not post-processing.

---

## Implementation Steps

### Phase 1: Foundation (new file, power diagram, basic rendering)
1. `npm install d3-weighted-voronoi`
2. Create `TerritoryVoronoiV2Renderer.ts`
3. Power diagram from owned stars with weight = starMargin²
4. Simple polygon rendering (no merge, no smoothing)
5. Wire up in GameCanvas alongside existing renderer (toggle between them)
6. **Verify:** gap-free tiling with star margin baked in

### Phase 2: Virtual Stars
7. Corridor virtual sites (same as current, carried over)
8. Disconnect virtual enemy sites (new: enemy at midpoints of non-connected same-owner pairs)
9. **Verify:** corridors connect, disconnects separate

### Phase 3: Edge Graph + Merge
10. Build shared edge graph from power diagram output
11. Merge: remove same-owner internal edges
12. Trace edge graph → polygon contours for rendering
13. **Verify:** merged territories render identically to Phase 1 but with fewer polygons

### Phase 4: Smoothing on Edge Graph
14. Arc smoothing operating on shared edges
15. Chaikin smoothing operating on shared edges
16. **Verify:** smooth boundaries with zero gaps

### Phase 5: Polish
17. Border strokes, glow, blur (visual config)
18. UI sliders (migrate from current renderer)
19. Performance tuning + fingerprint caching
20. Remove old ModifiedVoronoiRenderer if V2 is confirmed superior

---

## Star Margin as Power Diagram Weight

**Current approach (post-processing):**
```
Push vertex outward if dist(vertex, star) < margin
→ Breaks tiling because adjacent polygon's vertex doesn't move
```

**New approach (power diagram):**
```
site.weight = margin * margin  (additive weighted power diagram)
→ Voronoi itself places boundaries further from heavy sites
→ Tiling preserved because it's computed, not post-processed
```

**Calibration:** The exact relationship between weight and pixel-distance margin needs empirical tuning. In additive power diagrams, the boundary between sites A and B at positions pA, pB with weights wA, wB is where:
```
|p - pA|² - wA = |p - pB|² - wB
```
Higher weight pushes the boundary TOWARD the other site (making this site's cell larger). To achieve a margin of M pixels, we need weight ≈ M².

---

## Future: Topo-Map Territory Renderer (F-140)

If the V2 pipeline is efficient enough to run in <5ms, a "topographic territory" renderer could:

1. Run the pipeline N times with different star margin weights (e.g., 0, 20, 40, 60, 80 px)
2. Each pass produces a set of gap-free polygon contours
3. Render them layered with decreasing alpha / lightness
4. Result: concentric territory lines like elevation contours on a topo map
5. Visual effect: territory "rises" toward star centers like terrain elevation

This requires the base pipeline to be very fast — hence the emphasis on performance in the V2 design.
