# Territory Transition Rendering — External Research Brief

## Game Map Description

**Pax Fluxia** is a real-time strategy game rendered in a 2D browser canvas (PIXI.js v8). The game map is a **star graph**: a set of star nodes connected by lane edges, floating in a rectangular world space (~2000×1200 px).

Each star is owned by a player (or neutral). Territories are the **filled regions** around each player's connected group of stars. These territories tile the entire map — every pixel belongs to exactly one territory. There are no gaps and no overlaps.

### How Territories Are Computed

Territories are derived from a **weighted Power Voronoi diagram** (a generalization of standard Voronoi where each site has a weight/radius). Each star is a Voronoi site. The diagram partitions the 2D plane into cells, one per star. Cells belonging to the same owner are **merged** into contiguous territory regions.

The geometry pipeline outputs:
- **Territory regions**: merged polygons (one per contiguous player territory)
- **Frontier sections**: the shared border polylines between adjacent territories (Chaikin-smoothed curves)
- **Frontier vertices**: junction points where 3+ territory boundaries meet

Each territory region's boundary is composed of an ordered sequence of frontier sections. A **region loop** is that ordered sequence of section references, forming a closed polygon.

### What a Conquest Is

When Player A attacks and captures a star previously owned by Player B:
- That star's ownership changes from B to A
- The Voronoi weights are recalculated
- New territory geometry is computed
- The map must **animate** from the old geometry to the new geometry

## Desired Transition Behavior

The transition should be a smooth, continuous morph from the pre-conquest geometry to the post-conquest geometry, lasting ~500–1500ms. During this animation:

1. **Regions that persist** (same owner, roughly same location) should smoothly morph their polygon boundary from old shape to new shape.
2. **Regions that grow** (the conquering player's territory expands to absorb the captured star's area) should smoothly expand outward.
3. **Regions that shrink** (the losing player's territory contracts) should smoothly contract inward.
4. **Regions that disappear** (a player loses their last star in an area) should shrink to a point and vanish.

> **Note:** Disconnected territory islands do not occur in current gameplay. All player territory is contiguous — a player's stars are always graph-connected, so their merged Voronoi region is always a single polygon. Island spawning is not a transition case we need to handle.

### Critical Visual Constraints

- **No gaps**: at every frame of the transition, the entire map must be covered. No black/background visible between territories.
- **No overlaps**: territories must not overlap at any frame. No translucent blending of two owners' fills.
- **No slivers/wedges**: no thin degenerate triangles or artifacts shooting across the map.
- **No popping**: the transition must be continuous. Frame N+1 should look like a small perturbation of frame N.
- **Fill and stroke must align**: each region is rendered as a filled polygon with a stroked border. The stroke must exactly follow the fill boundary at every frame.

## Current Architecture

The transition system works as follows:

1. **Geometry Compiler** computes the full territory geometry for the new ownership state, producing `FrontierTopology` — a set of:
   - `FrontierSection` — a border polyline segment between two junction vertices, with pre-smoothed curve points
   - `RegionLoop` — an ordered list of `SectionRef` (section ID + direction) that traces one territory boundary
   
2. **Transition Sampler** (`FrontierMorphFillMode`) holds both the previous and next `FrontierTopology`. At each animation frame (progress `t ∈ [0, 1]`):
   - Matches prev loops to next loops (same owner) by shared section IDs or centroid proximity
   - Reconstructs the polygon for each matched pair
   - Interpolates between them using **Optimal Transport** (OT) perimeter-CDF sampling: maps uniform fractions onto each polygon's perimeter, then linearly blends corresponding points

3. **Presenter** (`PixiFillPresenter`) receives the interpolated polygon arrays and draws them via `PIXI.Graphics` fill + stroke.

## The Problem

Every intermediate frame (`0 < t < 1`) produces corrupt geometry:
- Self-intersecting polygons (crossing edges)
- Degenerate zero-area collapsed regions
- Ghost wedges and slivers
- Regions flipping/rotating unexpectedly

The static frames at `t=0` and `t=1` render correctly. The corruption is in the interpolation.

## What We Need Researched

We need techniques/strategies for smoothly morphing one set of planar-partition polygons into another, where:

- The partition is derived from a Voronoi diagram (or Power diagram)
- Star positions don't move — only weights and ownership change
- The partition must remain gap-free and overlap-free at every frame
- Polygon vertex counts differ between prev and next states
- The topology changes (some sections appear/disappear, junction vertex count changes)

### Specific Questions

1. **Planar partition interpolation**: What algorithms exist for morphing one planar subdivision into another while maintaining the tiling property (no gaps, no overlaps) at every intermediate frame?

2. **Voronoi weight interpolation**: Since territories come from a Power Voronoi diagram, could we simply interpolate the **weights** from prev to next and recompute the diagram at each frame? What are the performance characteristics of this approach (diagram computation per frame at ~60fps)?

3. **Polygon morphing with topology changes**: When the number of regions changes (merge/split), what techniques handle smooth transitions? Star-shaped morphing? Compatible triangulations?

4. **OT-based polygon interpolation pitfalls**: Our current approach uses 1D optimal transport on polygon perimeters. What are known failure modes? How do other implementations handle the alignment problem (both polygons must be "wound" from compatible starting points)?

5. **GPU-accelerated approaches**: Could we avoid polygon morphing entirely by interpolating Voronoi weights on the GPU (computing the diagram per-pixel in a fragment shader)?
