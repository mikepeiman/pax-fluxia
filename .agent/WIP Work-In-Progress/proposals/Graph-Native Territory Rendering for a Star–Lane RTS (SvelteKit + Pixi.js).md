# Graph-Native Territory Rendering for a Star–Lane RTS (SvelteKit + Pixi.js)

## Overview

This document specifies an architecture and implementation plan for a graph-native territory rendering system for a star–lane RTS, where stars are graph nodes, lanes are edges, and ownership is defined only on stars.
Territory is defined using a shortest-path metric on the star–lane graph, giving a discrete Voronoi diagram on the graph rather than a Euclidean Voronoi on the plane. Multi-source shortest-path algorithms such as multi-source Dijkstra or BFS on unweighted graphs allow efficient computation of the closest owning player for each node, which is extended to points on edges.[^1][^2][^3]

The rendering path turns these graph distances into a continuous VFX field behind the map using a mesh of lane-aligned strips and a small shader that blends the colors of the two closest players to create soft, thick borders.
The design preserves graph-truthfulness, clean tie handling, and temporal stability when ownership changes.

***

## Territory Model: Graph Voronoi on the Star–Lane Graph

### Discrete graph Voronoi

Given an undirected edge-weighted graph \(G = (V, E, w)\) and a set of sites (owned stars) \(K \subseteq V\), a **graph Voronoi diagram** partitions \(V\) such that each node belongs to the region of the site(s) with minimum shortest-path distance.[^1]
Formally, for node \(u\), its region index is \(\operatorname{argmin}_{k \in K} d(u,k)\), where \(d\) is the shortest-path distance in \(G\).

In this RTS, each owned star is a site labelled by playerId; the Voronoi regions are at player granularity: a node belongs to the player whose owned star is closest in graph distance (ties allowed).

Key properties for this use-case:

- **Graph-based metric**: distance counts lane hops or weighted traversal costs, not Euclidean distance in 2D space.[^2][^4]
- **Edges have no ownership**: they only propagate distances; ownership is defined at nodes and inferred for edge interiors.
- **Ties**: a node may be equidistant to multiple players, which is explicitly tracked to support correct borders.

### Extending to points on lanes

Each lane edge \(e = (u, v)\) is parameterized by \(t \in [0,1]\). Graph distance to a player \(p\) at position \(x(t)\) is the minimum of going through \(u\) or \(v\):

\[
D_p(x(t)) = \min\big(d_p(u) + t \cdot w_e,\ d_p(v) + (1 - t) \cdot w_e\big),
\]

where \(d_p(u)\) is the shortest-path distance from \(u\) to the closest \(p\)-owned star, and \(w_e\) is the graph weight of edge \(e\) (often 1).
Ownership at \(x(t)\) is the player with smallest \(D_p(x(t))\); ties define border locations along the lane.

Operationally, this is approximated by sampling \(t\) at a modest resolution along each edge and computing \(D_p\) from node distances.
This keeps borders aligned to lanes and their split points while avoiding Euclidean computations that would violate graph semantics.

***

## Data Structures

Assume a small-to-medium star graph (up to low thousands of nodes) and a modest player count (2–8).
The following TypeScript interfaces are suitable for a SvelteKit + Pixi.js implementation.

```ts
// Basic graph
export type PlayerId = string;
export type NodeId = string;
export type EdgeId = string;

export interface Player {
  id: PlayerId;
  name: string;
  color: number; // 0xRRGGBB
}

export interface StarNode {
  id: NodeId;
  x: number; // world coords
  y: number;
  ownerId: PlayerId; // current owning player
  edgeIds: EdgeId[];
}

export interface LaneEdge {
  id: EdgeId;
  a: NodeId;
  b: NodeId;
  weight: number; // graph distance, often 1
}

export interface GraphState {
  nodes: Map<NodeId, StarNode>;
  edges: Map<EdgeId, LaneEdge>;
  players: Map<PlayerId, Player>;
}
```

### Territory distances at nodes

For each node and player, the system needs the distance to the nearest star owned by that player, but for rendering it suffices to keep only the two closest players per node.
This is computed with a multi-source shortest-path algorithm.[^3][^2]

```ts
export interface PlayerDistance {
  playerId: PlayerId;
  dist: number; // shortest-path distance in graph units
}

export interface NodeTerritoryInfo {
  nodeId: NodeId;
  // Sorted by dist ascending; at most 2 entries
  best: PlayerDistance | null;   // closest
  second: PlayerDistance | null; // runner-up
}

export type TerritoryByNode = Map<NodeId, NodeTerritoryInfo>;
```

### Samples along edges

Edges are discretized into samples for which territory is computed; geometry is built from these samples.

```ts
export interface EdgeSample {
  edgeId: EdgeId;
  t: number; // 0..1 along lane from node a to node b
  // Distances and players at this sample (graph metric)
  best: PlayerDistance;   // closest player
  second: PlayerDistance; // second-closest player
}

export type EdgeSamples = Map<EdgeId, EdgeSample[]>;
```

The sampling count per edge can be tuned via a constant such as `SAMPLES_PER_EDGE = 8 | 16`.
Higher values give more accurate border placement at higher cost.

***

## Shortest-Path Territory Solver

### Multi-source Dijkstra with per-node top-2 players

The core computation is a multi-source Dijkstra (or BFS for unweighted edges) starting from all owned stars, labelled by their owning player.[^4][^2][^3]
Each state is a pair (node, player), with distance equal to the shortest path length from the nearest star of that player.
At each node only the best and second-best players by distance are stored, which is sufficient for border shading between two abutting players.

Pseudocode sketch in TypeScript:

```ts
interface QueueItem {
  nodeId: NodeId;
  playerId: PlayerId;
  dist: number;
}

export function computeNodeTerritory(
  graph: GraphState
): TerritoryByNode {
  const result: TerritoryByNode = new Map();
  const pq = new MinPriorityQueue<QueueItem>(({ dist }) => dist);

  // Initialize with all owned stars as sources
  for (const node of graph.nodes.values()) {
    const owner = node.ownerId;
    const item: QueueItem = { nodeId: node.id, playerId: owner, dist: 0 };
    pq.push(item);
  }

  // Helper to update top-2 distances at a node
  const updateNodeInfo = (nodeId: NodeId, playerId: PlayerId, dist: number): boolean => {
    let info = result.get(nodeId);
    if (!info) {
      info = { nodeId, best: null, second: null };
      result.set(nodeId, info);
    }

    const { best, second } = info;

    // Ignore if this is a worse-than-second candidate
    const worstAllowed = second ?? best;
    if (worstAllowed && dist >= worstAllowed.dist && worstAllowed.playerId === playerId) {
      // Same player but not better; ignore
      return false;
    }
    if (worstAllowed && dist >= worstAllowed.dist && worstAllowed.playerId !== playerId) {
      return false;
    }

    // Insert or update
    if (!best || dist < best.dist || best.playerId === playerId) {
      // Shift best to second if needed
      if (best && best.playerId !== playerId) {
        info.second = best;
      }
      info.best = { playerId, dist };
    } else if (!second || dist < second.dist || second.playerId === playerId) {
      info.second = { playerId, dist };
    }

    return true;
  };

  while (!pq.isEmpty()) {
    const current = pq.pop();
    const { nodeId, playerId, dist } = current;
    const info = result.get(nodeId);
    if (!info || !info.best || info.best.playerId !== playerId || info.best.dist < dist) {
      // This queue entry is stale
      continue;
    }

    const node = graph.nodes.get(nodeId)!;
    for (const edgeId of node.edgeIds) {
      const edge = graph.edges.get(edgeId)!;
      const neighborId = edge.a === nodeId ? edge.b : edge.a;
      const newDist = dist + edge.weight;
      if (updateNodeInfo(neighborId, playerId, newDist)) {
        pq.push({ nodeId: neighborId, playerId, dist: newDist });
      }
    }
  }

  return result;
}
```

Notes:

- This is essentially a multi-source, multi-label Dijkstra limited to the two closest labels (players) at each node.
- Ties (exact equal distances) are preserved because equal distances still insert as best/second; deterministic playerId ordering can be used for stable tie-breaking if needed.

### Enforcing connectivity truthfulness

Connectivity truthfulness follows from using pure graph shortest-path distances:

- If two holdings of the same player are disconnected in the induced subgraph of that player's stars, there is no path of zero-cost through that player's nodes.
- Any path between the components must traverse nodes owned by other players, whose seeds will dominate distances in the separating region.
- Therefore, the Voronoi partition by player ensures enemy territory sits between disconnected components instead of erroneously merging them.[^5][^1]

This holds by construction and requires no additional logic.

***

## Edge Sampling and Border Locus

### Sampling distances along edges

Given node-level distances, distances at points along an edge are computed by extending via parametric interpolation in graph space.
Rather than solving the piecewise-linear equalities analytically, a practical and robust approach is to sample \(t\) along each edge.

```ts
export function computeEdgeSamples(
  graph: GraphState,
  territoryByNode: TerritoryByNode,
  samplesPerEdge = 8
): EdgeSamples {
  const result: EdgeSamples = new Map();

  for (const edge of graph.edges.values()) {
    const nodeA = graph.nodes.get(edge.a)!;
    const nodeB = graph.nodes.get(edge.b)!;
    const infoA = territoryByNode.get(nodeA.id)!;
    const infoB = territoryByNode.get(nodeB.id)!;

    const samples: EdgeSample[] = [];

    for (let i = 0; i <= samplesPerEdge; i++) {
      const t = i / samplesPerEdge;

      // Distance for player p at this sample = min(d_p(a) + t*w, d_p(b) + (1-t)*w)
      const candidates: PlayerDistance[] = [];
      const pushCandidate = (pd: PlayerDistance | null, viaA: boolean) => {
        if (!pd) return;
        const base = viaA ? pd.dist + t * edge.weight : pd.dist + (1 - t) * edge.weight;
        candidates.push({ playerId: pd.playerId, dist: base });
      };

      // Only need candidates from best/second at both ends
      pushCandidate(infoA.best, true);
      pushCandidate(infoA.second, true);
      pushCandidate(infoB.best, false);
      pushCandidate(infoB.second, false);

      // Compress by playerId: keep min distance per player
      const byPlayer = new Map<PlayerId, PlayerDistance>();
      for (const c of candidates) {
        const existing = byPlayer.get(c.playerId);
        if (!existing || c.dist < existing.dist) byPlayer.set(c.playerId, c);
      }

      const all = Array.from(byPlayer.values()).sort((a, b) => a.dist - b.dist);
      const best = all;
      const second = all[^1] ?? all;

      samples.push({ edgeId: edge.id, t, best, second });
    }

    result.set(edge.id, samples);
  }

  return result;
}
```

This sampling produces a polyline of per-sample ownership and competitor along each edge.
Border locations correspond to transitions where the best player changes between adjacent samples or where the best and second distances are nearly equal.

### Interpreting samples for borders

For two adjacent samples `s[i]` and `s[i+1]` on an edge:

- If `s[i].best.playerId === s[i+1].best.playerId`, territory is owned by a single player over that segment.
- If they differ, there is a border crossing somewhere between `t[i]` and `t[i+1]` where the two players have equal distance.
  - The border position can be linearly interpolated using distances or simply placed at the midpoint in `t` for a good visual approximation.
- The second-best player at each sample is used to determine the color to blend against the best player in the shader.

Because territory assignment is piecewise linear in \(t\) per player, a modest number of samples (8–16) is sufficient to keep borders visually stable and accurately aligned to lanes.

***

## Rendering Pipeline and Shader Design

### High-level rendering approach

The VFX territory "field" is rendered as thick strips extruded around each lane, tinted by the dominant player at that lane sample and smoothly blended with the second-closest player near borders.
The field is graph-native because ownership and blending depend only on graph distances, while the 2D geometry is an extrusion around the 1D graph.

Key characteristics:

- **Borders follow lanes**: borders lie along lane centerlines where ownership switches, then are extruded outward as thick blended bands.
- **No false connectivity**: each player's visible territory is exactly the union of extrusions of edges and stars within its connected components under the graph metric.
- **Every pixel resolves to a player**: within the visible map extent, the sum of all per-player strips covers the background; in empty voids far from the graph, a background color can be decided by nearest edge or clamped to a max radius.

### Geometry construction per edge

For each edge, and each sample along it, a quad strip is created:

1. Compute world-space position of sample center:

   ```ts
   const px = nodeA.x + t * (nodeB.x - nodeA.x);
   const py = nodeA.y + t * (nodeB.y - nodeA.y);
   ```

2. Compute normalized direction and perpendicular normal:

   ```ts
   const dx = nodeB.x - nodeA.x;
   const dy = nodeB.y - nodeA.y;
   const len = Math.hypot(dx, dy) || 1;
   const nx = -dy / len;
   const ny = dx / len;
   ```

3. For a configurable half-width `w` (in world units), make two vertices:

   ```ts
   const left = { x: px + nx * w, y: py + ny * w };
   const right = { x: px - nx * w, y: py - ny * w };
   ```

4. Attach per-vertex attributes:

   - `aPosition` (x, y)
   - `aBestColor` (vec3) from the sample's best player
   - `aSecondColor` (vec3) from the sample's second player
   - `aBestDist` (float) = `sample.best.dist`
   - `aSecondDist` (float) = `sample.second.dist`
   - `aEdgeT` (float) = `t` (optional for noise/animation)

5. For successive samples `(i, i+1)`, create two triangles (a strip segment) using these vertices.

This yields a single `PIXI.Geometry` for all territory strips across all edges, updated whenever territory changes.

### Fragment shader for thick, blended borders

The fragment shader uses the interpolated distances to the nearest two players to compute a soft border.

Shader uniforms:

- `uBorderGraphWidth` – graph-distance scale over which blending occurs (e.g., 0.5–1.0).
- `uSoftness` – controls the smoothness of the falloff curve.
- `uGlobalAlpha` – overall opacity of the territory layer.

Vertex attributes (varyings):

- `vBestColor: vec3`
- `vSecondColor: vec3`
- `vBestDist: float`
- `vSecondDist: float`

Example GLSL fragment shader (Pixi v7+ style, conceptually):

```glsl
precision mediump float;

varying vec3 vBestColor;
varying vec3 vSecondColor;
varying float vBestDist;
varying float vSecondDist;

uniform float uBorderGraphWidth; // > 0
uniform float uSoftness;         // 0..1
uniform float uGlobalAlpha;      // 0..1

void main() {
  float delta = vSecondDist - vBestDist; // >= 0 normally

  // Map delta in [0, uBorderGraphWidth] to a 0..1 mixing factor
  float x = clamp(delta / max(uBorderGraphWidth, 1e-4), 0.0, 1.0);

  // Near delta=0, x≈0 (strong blending); far away, x≈1 (pure bestColor)
  // Use smoothstep for softness
  float t = smoothstep(0.0, 1.0, pow(x, 1.0 + uSoftness * 2.0));

  // Base blend: at border (t≈0) equal mix; far away (t≈1) bestColor
  vec3 borderMix = mix(vBestColor, (vBestColor + vSecondColor) * 0.5, 1.0 - t);

  gl_FragColor = vec4(borderMix, uGlobalAlpha);
}
```

Properties:

- **Border thickness**: controlled primarily by `uBorderGraphWidth`; smaller values create thinner borders in terms of distance difference.
- **Softness**: `uSoftness` modulates the steepness of falloff from the 50/50 blend at exact ties to pure ownership colors.
- **Two-player blending**: only the closest and second-closest players are considered per fragment, preventing multi-way color mush.

The resulting visual is a continuous colored field around the lane network, with borders that are thick, soft, and aligned to the underlying graph distances.

***

## Tie Handling and Midpoints

### Deterministic tie resolution

The algorithm can encounter true ties both at nodes and at interior points on edges.
To avoid flicker, tie-handling must be deterministic:

- At nodes, when two players have exactly equal `dist`, use a fixed ordering (e.g., lexicographic `playerId`) to choose which is `best` and which is `second`, but keep both.
- On edges, when sampling produces `best.dist` and `second.dist` that differ by less than a small epsilon (e.g., `1e-4`), treat this as a tie region; border blending will be maximal there.

Because tie-breaking and candidate sets are deterministic and depend only on integer graph distances and stable source sets, borders will not flicker between players even during small numeric perturbations.

### Midpoint rule on symmetric edges

On a symmetric path where two players' nearest stars are symmetrically placed with equal graph distance, the analytical border point on a lane is at parametric midpoint `t = 0.5`.
The sampling approach approximates this because distances vary linearly with `t` on each branch; the equality will occur near the midpoint sample.

If this needs to be exact for a particular design, the border point can be refined locally:

1. Detect an ownership change between adjacent samples `i` and `i+1`.
2. Run a small 1D bisection in `t` within `[t_i, t_{i+1}]`, re-evaluating `D_p(x(t))` using node distances for the two candidate players.
3. Stop when `|D_A - D_B| < epsilon` and record that high-precision border point.

This refinement is localized, cheap, and avoids any global recomputation.

***

## Temporal Stability and Organic Conquest Morph

### Localized recomputation after ownership changes

When a star changes owner, territory must update without whole-map shimmer.
The graph Voronoi scheme supports this naturally:

- The multi-source Dijkstra frontier that changes is limited to regions where the new or old owner was competitive in distance.
- Many distant nodes retain the same closest player and distances.

To make changes visually organic and smooth:

1. Maintain two buffers of per-node distances: `prevTerritoryByNode` and `nextTerritoryByNode`.
2. When ownership changes, recompute `nextTerritoryByNode` from scratch (simple and robust at RTS-scale sizes).
3. Over a configurable blend duration (e.g., 300–700 ms), interpolate distances:

   ```ts
   displayedDist = lerp(prev.dist, next.dist, alpha);
   ```

4. Recompute edge samples each frame from interpolated `displayedDist` rather than the raw discrete distances.

This creates continuous motion of borders rather than popping.
Because the interpolated graph distance field remains monotone (no oscillation in sign between players at any fixed point), borders drift smoothly and locally as the influence of the new owner propagates.

### Avoiding global shimmer

Global shimmer can occur if ownership changes cause widespread tie flips between distant players.
To minimize this:

- Use **integer weights** and avoid small floating weights in the graph metric.
- Snap distances to small integer or half-integer steps when storing and interpolating.
- Use a consistent epsilon for tie detection; do not vary it over time.

With these measures, changes in the discrete Voronoi regions occur only where logically required, and the temporal interpolation ensures that edges far from conflicts remain visually stable.

***

## SvelteKit + Pixi.js Integration Plan

### Component structure

A recommended structure in SvelteKit:

- `<StarMapCanvas>` – owns the Pixi Application, camera, and base layers.
- `<TerritoryLayer>` – Pixi container that renders the territory strips behind stars and lanes.
- Game state stored in a Svelte store (e.g., `graphStore`) with `GraphState` and updates from game logic.

`<StarMapCanvas>` (simplified sketch):

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { graphStore } from '$lib/stores/graphStore';
  import { TerritoryLayer } from '$lib/territory/TerritoryLayer';

  let container: HTMLDivElement;
  let app: PIXI.Application | null = null;
  let territoryLayer: TerritoryLayer | null = null;

  onMount(() => {
    app = new PIXI.Application({
      resizeTo: container,
      antialias: true,
      backgroundAlpha: 0,
    });
    container.appendChild(app.view as HTMLCanvasElement);

    territoryLayer = new TerritoryLayer(app);
    app.stage.addChild(territoryLayer.container);

    const unsubscribe = graphStore.subscribe((graph) => {
      territoryLayer?.updateGraph(graph);
    });

    onDestroy(() => {
      unsubscribe();
      app?.destroy(true, { children: true, texture: true, baseTexture: true });
      app = null;
    });
  });
</script>

<div bind:this={container} class="star-map-canvas" />
```

### TerritoryLayer implementation sketch

`TerritoryLayer` encapsulates the territory solver, edge sampling, and Pixi geometry.

```ts
// src/lib/territory/TerritoryLayer.ts
import * as PIXI from 'pixi.js';
import type { GraphState, TerritoryByNode, EdgeSamples } from './types';
import { computeNodeTerritory, computeEdgeSamples } from './territory';
import { buildTerritoryGeometry } from './geometry';

export class TerritoryLayer {
  public container: PIXI.Container;

  private mesh: PIXI.Mesh | null = null;
  private borderGraphWidth = 0.5;
  private softness = 0.5;
  private globalAlpha = 0.5;

  private prevTerritory: TerritoryByNode | null = null;
  private nextTerritory: TerritoryByNode | null = null;
  private blendStart = 0;
  private blendDuration = 500; // ms

  private app: PIXI.Application;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.sortableChildren = false;

    app.ticker.add(this.tick);
  }

  public updateGraph = (graph: GraphState) => {
    // Trigger recomputation when graph or ownership changes
    const newTerritory = computeNodeTerritory(graph);
    this.prevTerritory = this.nextTerritory ?? newTerritory;
    this.nextTerritory = newTerritory;
    this.blendStart = performance.now();

    this.rebuildGeometry(graph);
  };

  private tick = (delta: number) => {
    if (!this.app.stage || !this.nextTerritory || !this.prevTerritory) return;

    const now = performance.now();
    const t = this.blendDuration > 0
      ? Math.min(1, (now - this.blendStart) / this.blendDuration)
      : 1;

    // Distance interpolation can be added here if desired
    // For simplicity, this sketch uses nextTerritory directly after rebuild
  };

  private rebuildGeometry(graph: GraphState) {
    if (!this.nextTerritory) return;

    const edgeSamples: EdgeSamples = computeEdgeSamples(graph, this.nextTerritory);

    if (this.mesh) {
      this.container.removeChild(this.mesh);
      this.mesh.destroy();
    }

    const { geometry, shader } = buildTerritoryGeometry(
      graph,
      edgeSamples,
      this.borderGraphWidth,
      this.softness,
      this.globalAlpha
    );

    this.mesh = new PIXI.Mesh(geometry, shader);
    this.container.addChild(this.mesh);
  }
}
```

`buildTerritoryGeometry` is responsible for packing attributes into a `PIXI.Geometry` and creating a `PIXI.Shader` with the GLSL fragment shader described earlier.

***

## Ensuring All Design Constraints Are Met

This section explicitly maps the design back to the non-negotiable constraints.

### Graph-based territory (not Euclidean)

- Ownership at nodes is defined purely by shortest-path distance on the star–lane graph via multi-source Dijkstra, which uses edge weights rather than Euclidean distances.[^2][^1]
- Ownership at edge points is derived from node distances using graph-parameter \(t\) and edge weights; perpendicular offset in screen space does not affect the graph distance, only the visual extrusion.

### Borders follow lanes

- Borders exist only where the `best.playerId` for samples on a lane changes; they are thus constrained to lie along lanes or at computed split points along lanes.
- The visual border band is produced by extruding these lane-aligned regions outward; there is no mechanism to create borders that cut arbitrarily through empty space.

### Tie handling / midpoint rule

- Equal-distance situations (ties) are preserved using per-node and per-sample top-2 distances and deterministic tie-breaking.
- On symmetric configurations, equal distances occur at the parametric midpoint; sampling and, if needed, local bisection ensure the border lies at or near that midpoint.
- The shader blends exactly and only the two closest players in tie regions, avoiding flicker.

### Thick, blended borders

- Border thickness and softness are controlled via shader uniforms `uBorderGraphWidth` and `uSoftness`, adjustable from UI sliders.
- The fragment shader computes a smooth blend between the dominant player's color and the runner-up's color as a function of their distance difference, producing thick, soft borders.

### Connectivity truthfulness

- Using graph Voronoi regions ensures that territory remains connected only along actual graph paths; disconnected components of the same player's stars are separated by enemy regions because enemy seeds minimize distance in-between.[^5][^1]
- No Euclidean flood-fill or distance transform is performed; all territory decisions are based on graph shortest paths, preventing visually implied connectivity where no path exists.

### Disconnected same-player holdings

- If a player owns stars in multiple disconnected components, each component has its own seed set; between them, some other player's seeds are closer in graph distance.
- The territory solver assigns these separating nodes and edges to enemy players, which, when rendered, creates visible enemy territory between the components.

### Organic conquest morph with stability

- Ownership changes trigger recomputation of the distance field, but temporal interpolation of distances and deterministic label ordering ensures borders move smoothly and locally instead of popping or flickering.
- Because integer graph distances change only in regions logically affected by the new owner, global shimmer is minimized.

### Edges have no ownership

- Ownership is stored on nodes only; edges are never directly labelled as owned.
- Edge samples infer ownership and competitors solely from node distance fields and weights.

***

## Possible Extensions and Optimizations

### Performance optimizations

- **Limiting Dijkstra frontier**: track a "changed node" frontier after ownership updates and run a bounded re-relaxation instead of full recomputation, similar to dynamic shortest-path maintenance.[^6][^7]
- **Landmark-based approximations**: for very large graphs, landmark-based distance approximations could reduce per-frame computation by approximating distances to many players from a small set of reference nodes.[^8][^9]

### Visual refinements

- Add per-player or per-component noise in the fragment shader using `vEdgeT` and world position to create organic, cloudy territory textures while maintaining correct colors along borders.
- Fade territory brightness with graph distance from the nearest owned star to hint at depth or supply line strength.

### Debugging and tooling

- Implement a debug overlay that shows discrete per-node ownership and distances (numbers or colors) to verify correctness.
- Provide a mode to highlight Voronoi dual edges between players to inspect front lines on the graph.[^10][^1]

***

## Conclusion

This design gives a fully graph-native, shortest-path-based territory system for a star–lane RTS, with a clear, implementable path in TypeScript and Pixi.js suitable for SvelteKit integration.
It respects all listed constraints, offers adjustable thick and soft borders via shader parameters, and yields temporally stable, organic border motion when stars change owner, without implying any connectivity not present in the underlying graph.

---

## References

1. [Approximate Shortest Path Queries Using Voronoi Duals∗](http://www.sommer.jp/voronoi_j.pdf)

2. [multi_source_dijkstra — NetworkX 3.6.1 documentation](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.weighted.multi_source_dijkstra.html) - Uses Dijkstra's algorithm to compute the shortest paths and lengths between one of the source nodes ...

3. [multi_source_dijkstra_path — NetworkX 3.6.1 documentation](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.weighted.multi_source_dijkstra_path.html)

4. [DSA Dijkstra's Algorithm - W3Schoolswww.w3schools.com › dsa › dsa_algo_graphs_dijkstra](https://www.w3schools.com/dsa/dsa_algo_graphs_dijkstra.php) - W3Schools offers free online tutorials, references and exercises in all the major languages of the w...

5. [Delineating imprecise regions via shortest-path graphs](https://pure.tue.nl/ws/files/3717292/728527243985556.pdf)

6. [Efficient Dijkstra's for many sources and many targets - Stack Overflow](https://stackoverflow.com/questions/58276346/efficient-dijkstras-for-many-sources-and-many-targets) - I'm looking for an efficient way to traverse a large graph with many source vertices and many destin...

7. [[PDF] Highly Scalable Labelling for Exact Distance Queries](https://openproceedings.org/2019/conf/edbt/EDBT19_paper_88.pdf)

8. [Landmark-Based Node Representations for Shortest Path Distance Approximations in Random Graphs](https://arxiv.org/abs/2504.08216v2) - Learning node representations is a fundamental problem in graph machine learning. While existing emb...

9. [4.2 Coastal Urban Network](https://arxiv.org/html/2501.09803v1)

10. [[PDF] Approximate Shortest Path Queries in Graphs Using Voronoi Duals](http://www.sommer.jp/openhouse-voronoi.pdf) - The Voronoi method can efficiently answer shortest path queries in graphs with a good approximation....

