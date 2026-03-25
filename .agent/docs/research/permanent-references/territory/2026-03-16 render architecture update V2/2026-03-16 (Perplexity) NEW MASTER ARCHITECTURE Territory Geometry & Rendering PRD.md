<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Territory Geometry \& Rendering PRD

This document defines the canonical architecture, constraints, data model, algorithms, rendering model, and implementation boundaries for a graph-native territory system for a star-map RTS. Territory ownership is determined by shortest-path distance on the star–lane graph, full-map fills must cover the entire world, and borders must be rendered as clean, even-width geometry rather than raster contours.[^1]

## Product intent

The system exists to render territory in a way that is mechanically truthful, visually legible, and stable under conquest. Territory must communicate graph connectivity, respect lane competition, preserve disconnected holdings, and support multiple geometric families without breaking the underlying ownership model.[^1]

The canonical geometric model has only two primary outputs:

- **Frontier geometry**: singular map-wide frontier outlines in world space.[^1]
- **Owned regions**: enclosed regions tagged with exactly one player owner.[^1]

Everything else — border meshes, fill meshes, shaders, animation state, debug overlays — is derived from those outputs.[^1]

## Non-negotiable requirements

### Gameplay truth

- Ownership is determined by **shortest-path distance on the star–lane graph**, not Euclidean distance in 2D.[^1]
- Lanes do not themselves carry ownership; stars are the sources of ownership and lanes define traversal and competition structure.[^1]
- Ties must be deterministic and stable.[^1]


### Full-map partition

- Every point inside world bounds must resolve to exactly one player; there is no neutral visual space.[^1]
- The map must be partitioned into owned regions separated by shared frontiers.[^1]


### Lane legality

- **Lane-exclusivity constraint**: only one or two player territories may underlay any lane interior point.
- A lane may be:
    - fully inside one player’s holding, or
    - split by exactly one frontier between two players.
- No third player may touch or cross the interior of a lane.

This replaces virtual disconnect hacks as the primary lane-legibility rule.

### Connectivity truthfulness

- If the induced subgraph of Player P contains multiple disconnected components, the visual territory must preserve that separation.
- The renderer must never imply same-player connectivity where the graph does not provide it.[^1]


### Borders

- Borders must be **clean, straight/even-edged by default**, with optional curved and segmented geometry families.[^1]
- Borders must have adjustable width, softness, alpha, and blending.
- The border between two adjacent players must be represented once, shared by both sides.[^1]


### Animation

- Ownership changes must produce local, stable, visually smooth motion over time.
- Borders and fills must animate from the same frame geometry, so they cannot drift apart.[^1]


## Core architecture model

The system is organized into six conceptual layers:

1. **Territory truth**
2. **Frontier extraction**
3. **Geometry fitting**
4. **Region derivation**
5. **Presentation**
6. **Transition behavior**

These layers must remain conceptually distinct even if some are implemented together.

## 1. Territory truth

Territory truth is the graph-native ownership model computed on the star–lane graph.[^1]

### Responsibilities

- Compute nearest and second-nearest competing players at each star node.[^1]
- Provide deterministic ownership comparisons used to evaluate lanes and full-field ownership.[^1]
- Enforce lane-exclusivity legality.
- Provide the stable input for both static rendering and conquest transitions.


### Canonical rule

For each node, store the best and second-best player distances, where best and second must belong to different players.[^1]

### Suggested type

```ts
export interface PlayerDistance {
  playerId: string;
  dist: number;
}

export interface NodeTerritoryInfo {
  nodeId: string;
  best: PlayerDistance;
  second: PlayerDistance;
}

export interface MetricState {
  byNode: Map<string, NodeTerritoryInfo>;
}
```


### Required algorithm

Use **multi-source top-2 Dijkstra** on the star–lane graph with player labels.[^1]

### Notes

- This layer decides competitive truth.
- It does **not** create polygons, meshes, styles, or PIXI objects.


## 2. Frontier extraction

Frontier extraction turns graph-native ownership truth into singular world-space frontier outlines.[^1]

A frontier is the actual shared boundary between adjacent territories. It is not a stroke, not a mesh, and not a style effect. It is the canonical geometric boundary.

### Inputs

- `MetricState`
- star positions and radii
- lane endpoints and weights
- world bounds


### Outputs

- singular frontier outlines in world coordinates
- owner-pair metadata for each frontier segment
- topological relationships needed to reconstruct enclosed regions


### Two frontier sources

#### A. Lane frontiers

Along each lane, analytically determine where ownership changes by evaluating graph-distance competition along the lane parameter $t \in [0,1]$.[^1]

Use:

$$
D_p(t) = \min(d_p(u) + t w,\; d_p(v) + (1-t) w)
$$

where $u,v$ are the lane endpoints and $w$ is the lane traversal weight.[^1]

This yields:

- full single-owner lanes,
- or a single split point where two owners meet.[^1]

This is the direct implementation of lane exclusivity.

#### B. Interstitial frontiers

The open space between lanes must also be partitioned because every point in the world must have an owner. This can be derived from a full-field ownership solve in world space, but the result must be converted into singular frontier geometry in world coordinates, not left as raster truth.[^1]

### Canonical frontier type

```ts
export interface FrontierVertex {
  id: string;
  x: number;
  y: number;
}

export interface FrontierEdge {
  id: string;
  a: string;
  b: string;
  ownerA: string;
  ownerB: string;
  source: 'lane' | 'field';
}

export interface FrontierGraph {
  vertices: Map<string, FrontierVertex>;
  edges: Map<string, FrontierEdge>;
  adjacency: Map<string, string[]>;
}
```


### Invariants

- Each owner-pair frontier segment exists exactly once.[^1]
- `ownerA` and `ownerB` are distinct.
- Frontier geometry is singular shared truth for both adjacent territories.[^1]
- Lane frontiers must respect lane exclusivity.


## 3. Geometry fitting

Geometry fitting transforms raw frontier geometry into the selected **geometry family** used for final display and region derivation.[^1]

This is part of geometry, not superficial style.

### Geometry families

- **straight**: clean piecewise-linear simplification.[^1]
- **curved**: smooth fitted arcs/Bezier-like paths.[^1]
- **segmented**: stylized angular quantization.[^1]


### Rule

The selected fitted frontier set becomes the **canonical display frontier geometry**. Both fills and borders must derive from it.

### Suggested type

```ts
export type GeometryFamily = 'straight' | 'curved' | 'segmented';

export interface FittedFrontierPath {
  id: string;
  ownerA: string;
  ownerB: string;
  closed: boolean;
  points: Array<{ x: number; y: number }>;
}
```


### Error bounds

Fitting may simplify or stylize geometry, but it must:

- preserve adjacency,
- preserve enclosure relationships,
- preserve lane split legality,
- stay within a bounded visual error from frontier truth.[^1]


### Notes

- This layer may live in compiler or geometry-prep code, but must remain upstream of both border and fill generation.
- A border stroke mesh is **not** canonical truth.
- A fitted frontier path **may** be canonical display geometry.


## 4. Region derivation

Owned regions are the enclosed faces induced by the fitted frontier geometry plus world bounds.[^1]

### Responsibilities

- Assemble closed loops.
- Resolve nested holes/enclaves if present.
- Assign a single owner to each region.
- Guarantee that the union of all regions covers the world rectangle with no gaps.[^1]


### Suggested type

```ts
export interface TerritoryRegion {
  id: string;
  ownerId: string;
  outer: Array<{ x: number; y: number }>;
  holes?: Array<Array<{ x: number; y: number }>>;
}
```


### Canonical rule

Region ownership is attached to enclosed faces, not to borders.

### Invariants

- Every region has exactly one owner.
- Adjacent regions share the same fitted frontier geometry.
- No overlaps.
- No gaps inside world bounds.[^1]


## 5. Presentation

Presentation converts canonical display geometry into GPU-ready draw products.[^1]

This layer is not allowed to invent or reinterpret territory truth.

### Presentation sublayers

#### Fill presentation

- Triangulate `TerritoryRegion` faces into fill meshes, or sample a full-field ownership texture using region-consistent logic.[^1]
- Apply color, alpha, HSL, blend, glow, and other superficial visual treatments.[^1]


#### Border presentation

- Build stroke meshes from fitted frontier paths.[^1]
- Borders are rendered as geometry with explicit width and softness, not as raw raster contours.[^1]


### Border rendering requirements

- Width expands symmetrically about the frontier line.[^1]
- Border color is a blend of the two adjacent owners only.[^1]
- Thickness and softness are uniform-driven style parameters.[^1]


### Suggested stroke mesh type

```ts
export interface StrokeMesh {
  positions: Float32Array;
  crossUVs: Float32Array;
  ownerPairs: Uint16Array;
  indices: Uint32Array;
}
```


### Style vs geometry

Separate these clearly:

- **Geometry family**: straight / curved / segmented
- **Presentation style**: width, softness, alpha, color, brighten, blend, glow

Geometry family changes may rebuild fitted frontiers and derived meshes. Presentation style changes should ideally update uniforms only.[^1]

## 6. Transition behavior

Transition behavior governs how territory changes over time during ownership changes.[^1]

This is separate from style because it affects time, correspondence, and motion.

### Requirements

- The system must support static rendering and animated conquest transitions.
- Frame geometry at time `t` must generate both:
    - border draw data,
    - fill region data.[^1]

This prevents fill/border drift.

### Correct model

1. Compute previous territory truth.
2. Compute next territory truth.
3. Plan correspondences between previous and next frontiers/regions.
4. At frame time `t`, generate frame frontier geometry.
5. Re-derive frame regions from frame frontiers.
6. Render borders and fills from the same frame geometry.[^1]

### Notes

- Transition behavior is its own pillar.
- It must not be treated as just another visual style option.


## Implementation layers

The codebase should be split into four implementation layers.

### A. Truth \& geometry layer

Produces canonical territory outputs.

Suggested files:

```txt
territory/
  truth/
    metricSolver.ts
    laneOwnership.ts
    frontierExtractor.ts
    frontierFitter.ts
    regionBuilder.ts
    transitionPlanner.ts
    types.ts
```


### B. Presentation layer

Consumes canonical geometry and draws it.

Suggested files:

```txt
territory/
  render/
    TerritoryRenderer.ts
    FillRenderer.ts
    BorderRenderer.ts
    buildFillMeshes.ts
    buildBorderMeshes.ts
    shaders/
```


### C. Engine/controller layer

Orchestrates updates, caching, dirty-state classification, and lifecycle.

Suggested files:

```txt
territory/
  engine/
    TerritoryController.ts
    cachePolicy.ts
    dirtyBuckets.ts
```


### D. Devtools/legacy layer

Strictly isolated from canonical logic.

Suggested files:

```txt
territory/
  devtools/
  legacy/
```


## Strict separation rules

### Truth \& geometry layer must not

- import PIXI,
- create meshes,
- choose blend modes,
- mutate UI config,
- emit placeholder geometry,
- depend on legacy renderers.


### Presentation layer must not

- compute ownership winners,
- fabricate frontiers,
- resolve graph legality,
- reinterpret region ownership.


### Devtools/legacy layer must not

- define canonical truth,
- silently override legality rules,
- inject fallback geometry into canonical outputs.


## Dirty-state model

The engine should classify changes into three buckets.[^1]

### Topology change

Triggered by:

- star owner changes,
- star add/remove,
- lane add/remove,
- lane weight changes

Rebuilds:

- truth,
- frontier extraction,
- fitting,
- regions,
- presentation caches.[^1]


### Geometry-family change

Triggered by:

- straight/curved/segmented switch,
- fit tolerance change

Rebuilds:

- fitted frontiers,
- regions,
- border/fill caches.[^1]


### Presentation-style change

Triggered by:

- width,
- softness,
- alpha,
- color,
- brighten,
- HSL,
- blend mode

Updates:

- shader uniforms or cheap presentation caches only.[^1]


### Transition-frame change

Triggered every animation frame during conquest.

Rebuilds:

- frame frontier geometry,
- frame regions,
- frame border/fill caches as required.[^1]


## Rendering approach

### Full-field ownership support

A full-field ownership solve may be used to determine interstitial territory assignment for the open world rectangle. However, raster ownership must never be treated as the final canonical geometry. It must be converted into frontier geometry and then into owned regions.[^1]

### Border rendering

Use geometry-rendered stroke meshes with cross-section UVs for adjustable softness.[^1]

### Fill rendering

Use region-derived triangulated fills or a region-consistent ownership fill pass.[^1]

### Performance goals

Target steady-state 60fps with low per-frame presentation cost and localized rebuilds on deltas.[^1]

## Acceptance criteria

The system is correct only if all of the following hold:

- Ownership follows graph-shortest-path truth.[^1]
- Every point inside world bounds resolves to one owner.[^1]
- Only one or two holdings underlay any lane.
- A lane is either single-owner or split once between exactly two owners.
- Disconnected same-player holdings remain visually separate.[^1]
- Each shared frontier between two players exists once.[^1]
- Borders and fills derive from the same fitted frontier geometry.
- Borders render as even-width geometry, not pixel staircases.[^1]
- Straight family produces visibly clean, straight/even-edged borders.[^1]
- Ownership changes animate smoothly without unrelated shimmer.[^1]


## Minimal canonical data contract

```ts
export interface CanonicalTerritoryState {
  metric: MetricState;
  frontierGraph: FrontierGraph;
  fittedFrontiers: FittedFrontierPath[];
  regions: TerritoryRegion[];
}
```

This is the minimum canonical territory package for rendering and transitions.

## Final decision rules

When design choices conflict, prefer these rules in order:

1. **Gameplay truth over visual convenience**
2. **Singular shared frontier geometry over duplicated border/fill logic**
3. **Lane legality over heuristic hacks**
4. **Canonical fitted geometry over ad hoc presentation-only smoothing**
5. **Deterministic stable output over clever but unstable local optimizations**
6. **Cheap style changes without geometry rebuild where possible**[^1]

This is the canonical geometry-and-renderer model for the territory system.
<span style="display:none">[^2]</span>

<div align="center">⁂</div>

[^1]: TERRITORY_ARCHITECTURE_v3.md

[^2]: centerlineGraph.ts

