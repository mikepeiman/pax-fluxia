# Territory Fill Construction: Surfacing the Idiomatic Solution

## Research Prompt for External Analysis System

---

## Problem Statement

We are building a real-time 2D strategy game (Pax Fluxia) with territory rendering. Territories are computed as a **weighted Voronoi diagram** (power diagram via `d3-weighted-voronoi`), clipped to a rectangular world boundary. The visual spec requires:

1. **Fills**: Opaque smoothed polygons per owner (player), gap-free, morphing smoothly during conquest transitions
2. **Borders**: Even-width vector-like strokes along shared frontiers between different owners
3. **Animation**: When ownership changes, fills and borders morph from previous state to new state via arc-length-parameterized control point interpolation over ~1.5 seconds

The system currently works correctly for **borders** (shared-edge polylines between owner pairs, Chaikin-smoothed, Bézier-drawn). The **fills** are the unsolved problem.

## Where We Are: The Data We Already Have

The Voronoi diagram produces `TerritoryCell[]` — one convex polygon per site (star), each with an `ownerId`. These are **merged** into `MergedTerritory[]` by unioning same-owner adjacent cells (removing shared internal edges). This merge produces correct, gap-free, closed polygons that include world-boundary edges. The crossfade fill mode uses these directly and works.

For **border animation**, we extract `SharedBorderEdge[]` (edges between different owners) and chain them into `SharedPolyline[]` (continuous curves along each owner-pair frontier, Chaikin-smoothed). These polylines animate correctly via vertex-count-matched lerping.

## The Failed Approach (What We Tried)

We attempted to build **fill polygons** by reverse-engineering them from the border polylines — calling `assembleFrontierLoops()` to chain per-pair polylines into per-owner closed loops. This fails fundamentally because:

- **Border polylines only exist between different owners.** They don't include world-boundary edges.
- Territories touching the map edge produce **open chains** with dangling endpoints at the world rectangle.
- Only fully interior territories (surrounded by enemies) form closed loops.
- Junction-gap errors accumulate because Chaikin smoothing is applied independently per polyline before chaining.

We then tried to patch this with boundary-walk closure (walking the map perimeter between open chain endpoints). This created a second layer of problems: multiple open chains per owner produce overlapping polygons when each is independently closed with boundary walks.

**This is the wrong problem.** We are trying to reconstruct territory outlines from border data, when the territory outlines already exist as the Voronoi cell merge output.

## Decision D-40: Region-Sequential Smoothing

Our architectural decision (documented, not yet implemented) states:

> Territory polygons must be built from stars (contiguous groups by ownership, constrained by graph relationships). The entire map is first computed as angular Voronoi with all adjustments. Then Chaikin + arc smoothing is applied **region by region** in deterministic order (topmost-leftmost first), including rectangular world-bound corners. Each subsequent abutting region **normalizes its shared frontier** to use the exact same coordinates as the already-processed neighbor.

**Key insight**: The data source for fills is the merged Voronoi cell polygons, not the border polylines. Borders are *derived from* fill polygon boundaries, not the other way around.

## The Constraint We Must Satisfy

The fill polygons must be **morphable**. During conquest transitions, the fill for each owner must smoothly animate from its previous shape to its new shape. This requires:

1. Parameterizing each fill polygon to a fixed number of control points (N) via arc-length sampling
2. Aligning control points between prev and target states (rotation search for longest static section)
3. Per-frame lerping between aligned control point arrays

This parameterization + alignment + lerp machinery already exists (`parameterizeAndAlign`, `lerpFrontierCPs`). It works. The missing piece is feeding it **correct closed polygons** rather than broken open chains.

## What the Research System Should Solve

Apply the following structured reasoning sequence:

### Step 1: First Principles — What is the minimal data transformation?

Strip away all implementation. The input is `MergedTerritory[]` (closed polygons with world-boundary edges, per owner). The output is `FrontierLoop[]` (smoothed closed polygons, per owner, that can be parameterized to N control points for morphing). What is the **minimal transformation** between these two representations? What operations are necessary and sufficient?

### Step 2: Analogical Reasoning — What domain has solved this?

The problem is: smooth a planar subdivision (set of polygons that tile a rectangle) such that (a) smoothing doesn't introduce gaps between adjacent polygons, (b) each polygon remains closed with world-boundary edges, and (c) the smoothed polygons can be frame-interpolated for animation. 

What fields have solved this? Candidates: computational geometry (mesh smoothing with boundary preservation), GIS (cartographic generalization), CAD (fillet/blend with topology preservation), animation (shape interpolation / compatible triangulations). What is the canonical algorithm name?

### Step 3: Constraint Diagnosis — Which constraint is actually hard?

Three constraints in tension:
- **Smoothness**: Chaikin/subdivision makes curves beautiful but displaces shared vertices independently
- **Gap-freedom**: Adjacent polygons must share identical edge vertex sequences — the tiling property
- **Morphability**: Polygon point count must be normalizable to N CPs for interpolation

Which pairs of constraints are naturally compatible? Which pair creates the fundamental tension? Is there a representation that satisfies all three by construction?

### Step 4: Falsification — What would break Region-Sequential Smoothing?

D-40 proposes processing regions in order, with later regions adopting earlier neighbors' smoothed edges. Stress-test this:
- What happens at a junction where 3+ regions meet? The third region must adopt edges from TWO already-processed neighbors. Are those edges guaranteed to meet at the same point?
- What happens when an ownership change creates a new region that didn't exist before? The "previous" polygon doesn't exist for morphing.
- What happens with non-simply-connected territories (a region with a hole)?
- Does deterministic ordering (topmost-leftmost) produce visually asymmetric smoothing?

### Step 5: Synthesis — What is the definitive algorithm?

Given the answers above, specify the algorithm that:
1. Takes `MergedTerritory[]` (closed polygons from Voronoi merge, including world boundary edges)
2. Produces `Map<ownerId, FrontierLoop[]>` where each loop is a smoothed closed polygon
3. Guarantees no gaps between adjacent owner polygons
4. Produces polygons that can be parameterized to N control points for morphing
5. Is compatible with the existing `parameterizeAndAlign` + `lerpFrontierCPs` interpolation machinery
6. Handles world-boundary edges (straight segments along map rectangle) naturally
7. Is efficient enough for 60fps with ~20 territories

## Existing System Context

| Component | Status | Notes |
|-----------|--------|-------|
| `d3-weighted-voronoi` | ✅ Working | Produces power diagram cells clipped to `[-pad, -pad, W+pad, H+pad]` |
| Cell merge → `MergedTerritory[]` | ✅ Working | Same-owner cells unioned, closed polygons with boundary edges |
| Shared edge extraction | ✅ Working | `SharedBorderEdge[]` between different owners |
| Edge → polyline chaining | ✅ Working | `chainSharedEdgesIntoPolylines()` with Chaikin |
| Polyline lerp animation | ✅ Working | Vertex-count-matched prev→target lerp |
| Arc-length parameterization | ✅ Working | `parameterizeAndAlign()` resamples to N CPs |
| Control point lerp | ✅ Working | `lerpFrontierCPs()` linear interpolation |
| `assembleFrontierLoops` | ❌ Broken | Reverse-engineering fills from borders — wrong data source |
| Fill polygon construction | ❌ Missing | **← This is what needs to be built** |

## Key Files

- `PowerVoronoiRenderer.ts` — 1850 lines, contains all rendering logic
- `game.config.ts` — runtime config with `TERRITORY_FILL_MODE`, `TERRITORY_MORPH_CONTROL_POINTS`
- Smoothing: `chaikinSmoothPolyline()` — standard Chaikin subdivision
- Border drawing: `drawBorderPolylines()` — PIXI.Graphics Bézier stroke rendering

## Reference: Mental Models Framework

This prompt is structured using the Lenses/Operations/Recipes taxonomy from Simmons & Claude (2024). The reasoning sequence above chains: **First Principles** (strip to minimal transformation) → **Analogical Reasoning** (import from computational geometry/GIS) → **Constraint Diagnosis** (custom lens: identify which constraint pair creates tension) → **Falsification** (stress-test D-40 proposal) → **Dialectical Synthesis** (produce the algorithm that transcends the smoothness-vs-tiling tension).

The core insight from the Wrong-Problem Detector recipe applies here: *"What would I believe about this if I had zero prior knowledge and could only work from what's directly observable?"* — The observable fact is that correct closed polygons already exist (the merged Voronoi cells). The problem isn't constructing them; it's smoothing them while preserving the tiling property and enabling interpolation.
