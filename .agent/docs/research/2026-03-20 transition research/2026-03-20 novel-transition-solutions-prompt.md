# Territory Transition Architecture: Novel Solution Discovery Prompt

## Context

You are analyzing the territory rendering and transition animation system for **Pax Fluxia**, a real-time strategy game built with TypeScript + PIXI.js v8. The game has a star map where players conquer stars, changing territory ownership. Territory boundaries are drawn using a **Power Voronoi diagram** (d3-weighted-voronoi) with Chaikin-smoothed borders.

## The Goal

When a star changes hands (conquest), territory boundaries should animate smoothly from their previous positions to their new positions. Ideally:
- **Only the affected boundary patch** (near the conquered star) should move
- **Distant boundaries** should remain perfectly static
- The transition should take ~400ms with easing
- Fills should update in sync with borders (same geometry source)

## Current Architecture (4-Layer Pipeline)

```
Ownership → Geometry → Transition → Presentation
```

### Ownership Layer
- Graph-native: which player owns which star
- Changes discretely on conquest events

### Geometry Layer (the problem source)
1. **Power Voronoi**: `d3-weighted-voronoi` computes weighted Voronoi cells per star
2. **Merge**: Same-owner cells merged into unified territory polygons
3. **Shared borders**: Border polylines extracted between adjacent owners
4. **Chain walk**: Polylines chained at junction vertices into continuous frontier loops
5. **Smoothing**: Chaikin subdivision applied to polylines
6. **TMAP (Territory Frontier Map)**: Canonical representation with vertices, edges, and loops

**Critical problem**: The entire Voronoi diagram is recomputed globally on every ownership change. Even if only one star changed hands, ALL cell boundaries shift slightly because the power diagram is a global optimization. Junction vertices move by 1-20px. Polyline sample counts change. Chain walk segmentation varies (same physical boundary sliced into different numbers of edges).

### Transition Layer (where we're struggling)
We have tried multiple approaches to diff two consecutive TMAPs and animate between them:

**Attempt 1: Edge-level string matching**
- Edge IDs are `"startVertexKey->endVertexKey:ownerPairKey"` where vertex keys are coordinate-derived (`ptKey(x,y)`)
- FAILED: vertex coordinates shift between frames → different string IDs → most edges falsely classified as deleted+inserted

**Attempt 2: Edge-level proximity matching**
- Match edges within same owner pair by midpoint/endpoint proximity
- FAILED: structural segmentation churn — same physical boundary split into 4 edges in frame N, 1 edge in frame N+1. Endpoint distances up to 262px for "same" structural junction.

**Attempt 3: Owner-pair polyline aggregation** (current)
- Concatenate all edges per owner pair into single polyline, resample to 32 points, compare by RMS
- PARTIALLY WORKING: correctly identifies which owner pairs changed (RMS threshold separates jitter from real changes)
- BUT: the transition planner still struggles because edge-level partitioning within a loop doesn't align with pair-level classification

### Presentation Layer
- PIXI.Graphics draws fills and strokes
- `sampleTransitionFrame()` interpolates between prev/next geometry per frame
- Static territories drawn normally; transitioning territories drawn from interpolated geometry

## Specific Failure Modes

### 1. Global Voronoi Recomputation Jitter
Every cell boundary shifts when any star changes ownership. The Voronoi diagram is a global optimization — there's no way to "locally update" just the affected cells. This means:
- ALL edges shift slightly (1-20px)
- Junction vertex positions change
- Polyline sample counts change
- Chain walk segmentation changes

### 2. Unstable Edge Identity
Edge IDs derive from coordinate-based vertex keys (`ptKey(x,y)`). Since vertex positions shift, edge IDs are unstable across frames. The "same" structural edge has different IDs in consecutive TMAPs.

### 3. Unstable Segmentation
The chain walk splits continuous boundaries into edges at junction vertices. Since junction positions shift, the same physical boundary is split into different numbers of edges between frames (e.g., 4→1, 6→4). This makes edge-level matching impossible.

### 4. Fill/Transition Geometry Divergence
The morph transition produces interpolated geometry, but after the transition ends, the static renderer uses the final TMAP geometry. If these don't perfectly align, there's a visual "snap" at the end of the transition.

### 5. Timing Delay
The transition starts after the geometry is recomputed, which happens after the ownership change event. There may be a 1-tick delay between the conquest event (with sound/visual feedback) and the territory boundary starting to move.

## Constraints

- TypeScript + PIXI.js v8 (WebGL2), runs in browser at 60fps
- ~20-50 stars, ~15-30 owner pairs, ~30-60 edges per TMAP
- Must work with Power Voronoi (d3-weighted-voronoi) as the cell generator
- DY4 Optimal Transport is the canonical border animation mode (sacrosanct)
- No server-side computation; all client-side
- Cannot change the fact that Voronoi is globally recomputed

## Questions for Analysis

### Fundamental Architecture Questions
1. **Is diffing two TMAPs the right approach at all?** Given that global Voronoi recomputation makes frame-to-frame geometry unstable, is there a fundamentally better way to produce smooth transitions?

2. **Should we separate "topology" from "geometry"?** The ownership graph topology (which stars border which) is stable — only the metric geometry (where exactly the boundary curves are) shifts. Could we diff at the topology level and interpolate only the geometry?

3. **Could we avoid diffing entirely?** Instead of computing "what changed," could we:
   - Compute the target geometry
   - For each point on the target boundary, find its closest point on the previous boundary
   - Interpolate from closest-point to target-point
   - This is essentially optimal transport / Earth Mover's Distance at the boundary level

4. **Should transitions operate on the Voronoi weights rather than the output geometry?** Instead of interpolating boundary curves, could we interpolate the Voronoi site weights over time and recompute the diagram each frame? This would produce geometrically correct intermediate states.

### Implementation Questions
5. **Is there a known algorithm for "local Voronoi update"?** When one site changes weight/position, can we update only the affected cells without recomputing the entire diagram?

6. **How do games like Stellaris, Civilization, or Supreme Commander handle this?** What are the industry-standard approaches for smooth territory transitions in RTS games?

7. **Could we use a dual representation?** Keep the current TMAP for static rendering, but maintain a separate "transition mesh" that morphs between states using vertex correspondence from the Voronoi sites themselves (which ARE stable — each star has a fixed position).

### Boundary-Specific Questions
8. **Could we parameterize boundaries by the stars they separate?** Instead of absolute coordinates, represent each boundary segment as a function of the two flanking stars' positions and weights. Then interpolating weights naturally interpolates boundaries.

9. **Is the owner-pair polyline the right unit of comparison?** Or should we work at the loop level (entire territory outline) or even the pixel/SDF level?

10. **Could Signed Distance Fields (SDFs) solve this more elegantly?** Compute per-player distance fields, blend them during transitions, and extract contours. The DFs are naturally smooth and locally updatable.

## What a Superior Solution Looks Like

- **Zero false positives**: unchanged boundaries are perfectly static (no jitter)
- **Smooth local animation**: only the patch near the conquest animates
- **No snap at transition end**: interpolated geometry converges exactly to target
- **Frame-budget friendly**: <2ms per transition frame computation
- **Simple code**: fewer than 200 lines for the core transition logic
- **Immune to Voronoi instability**: works regardless of how much the global diagram shifts

## Your Task

Analyze this problem from first principles. Consider approaches from:
- Computational geometry (Voronoi diagrams, optimal transport, mesh morphing)
- Computer graphics (SDF rendering, mesh interpolation, skeletal animation)
- Game development (territory systems in RTS/4X games)
- Signal processing (curve matching, registration, alignment)

Propose either:
A) A novel approach that avoids the fundamental problems with our current approach
B) A specific fix to our current approach that addresses the root instabilities
C) A hybrid that combines elements of both

For each proposal, explain: the core insight, why it avoids our failure modes, implementation complexity, and potential pitfalls.
