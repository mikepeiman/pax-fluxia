# Compiler Layer: Data Contracts

## Purpose

This document specifies the data structures, responsibilities, and guarantees of the compile layer. Each stage is a pure function.

## Metric stage

### Responsibility
Evaluate shortest-path competition on the star–lane graph. Produce top-2 ownership evidence at each star.

### Input
- `stars: StarState[]` – owned stars with positions.
- `connections: StarConnection[]` – lane traversal graph.
- `config: MetricCompilerConfig` – graph feature toggles (if any).

### Output

```typescript
export interface NodeDistance {
  ownerIdx: number;   // Index into playerIds
  distance: number;   // Graph hops or weighted distance
}

export interface MetricTruthNode {
  best: NodeDistance | null;
  second: NodeDistance | null;
}

export interface MetricState {
  top2ByStar: MetricTruthNode[];
  playerIds: string[];
  // Additional fields for lane-based tie-breaking if needed
}
```

### Guarantee
Every star has a deterministic best and second-best owner under the graph metric. This output is stable and repeatable given the same inputs.

### No rendering
No PIXI objects, meshes, colors, or placeholder geometry.

## Frontier stage

### Responsibility
Build the singular canonical frontier graph in world coordinates. Solve for exact frontier parameters on lanes where owners meet.

### Input
- `metricState: MetricState` – ownership truth.
- `stars: StarState[]` – positions and IDs.
- `connections: StarConnection[]` – lane definitions.
- `config: FrontierCompilerConfig` – parameters such as `minStarRadius`.

### Output

```typescript
export interface FrontierNode {
  id: string;
  x: number;
  y: number;
  ownerA: number;     // Index into metric playerIds
  ownerB: number;
  pairId: string;     // Deterministic pair ID, e.g., min(ownerA,ownerB) + ':' + max(...)
}

export interface FrontierEdge {
  id: string;
  a: string;          // FrontierNode.id
  b: string;
  ownerA: number;
  ownerB: number;
  pairId: string;
}

export interface FrontierGraph {
  nodes: Map<string, FrontierNode>;
  edges: Map<string, FrontierEdge>;
  adjacency: Map<string, string[]>;  // node ID -> adjacent node IDs
}
```

### Guarantee
Every owner-pair edge is stored exactly once. Edges are deterministically ordered by `pairId`. The frontier is complete and connected for all adjacent owner regions.

### No rendering
No stroke meshes, stroke width, alpha, color blending, or shaders.

## Region stage

### Responsibility
Transform shared frontier topology into owned closed loops. Preserve component identity.

### Input
- `frontierGraph: FrontierGraph` – canonical frontier.
- `config: RegionCompilerConfig` – if any.

### Output

```typescript
export interface TerritoryRegion {
  id: string;
  ownerId: string;
  componentId: string;  // Unique ID for disconnected same-owner holdings
  loops: number[][];    // Each loop is [x1, y1, x2, y2, ...]
}
```

### Guarantee
Each region belongs to one owner and one component. If a player owns two disconnected clusters of stars, they produce two regions with different `componentId` values. Render layers can use `componentId` to detect and visually separate disconnected holdings.

## Frontier fitter stage

### Responsibility
Simplify frontier polylines into presentation families.

### Input
- `frontierGraph: FrontierGraph` – raw frontier edges.
- `family: 'straight' | 'segmented' | 'curved'` – presentation choice.
- `config: FitterConfig` – tolerance, curve degree, etc.

### Output

```typescript
export interface FittedFrontier {
  pairId: string;
  family: 'straight' | 'segmented' | 'curved';
  polylines: number[][];  // One or more simplified paths
}
```

### Guarantee
Fitted frontiers preserve owner pairing, endpoint continuity, and topological order. They do not create or destroy owner-pair junctions.

## Transition planner

### Responsibility
Compute structural correspondences between previous and target frontiers for interpolation.

### Input
- `prevState: CanonicalTerritoryState` – ownership before change.
- `nextState: CanonicalTerritoryState` – ownership after change.
- `durationMs: number` – animation length.

### Output

```typescript
export interface TransitionPlan {
  startedAtMs: number;
  durationMs: number;
  prevState: CanonicalTerritoryState;
  nextState: CanonicalTerritoryState;
  frontierCorrespondences: FrontierCorrespondence[];  // Matched old↔new frontier edges
}

export interface FrontierCorrespondence {
  prevEdgeId: string;
  nextEdgeId: string;
  pairId: string;
  prevControlPoints: number[][];
  nextControlPoints: number[][];
}
```

### Guarantee
Correspondences are deterministic and minimal-travel (to avoid jitter). The plan itself is static; it does not hold animation state or clock info.

## Typed failure policy

If a stage is incomplete or encounters a fatal condition, it should return a typed `notImplemented` or `error` status rather than fabricating fallback geometry:

```typescript
export interface CompileError {
  stage: 'metric' | 'frontier' | 'region' | 'fitter' | 'transition';
  message: string;
}

export type CanonicalTerritoryState = CanonicalTerritoryStateOk | CompileError;
```

Development and testing code may handle errors gracefully; production code must propagate them so bugs surface early.

---

**See MASTER_TERRITORY_ARCHITECTURE.md for layer rules and RENDER_AND_TRANSITIONS.md for how these outputs are consumed.**
