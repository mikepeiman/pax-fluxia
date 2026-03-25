The core problem is now very clear: the **canonical geometry source is wrong**. The “centerline” the current code is using is the centerline of a *sampled ownership grid*, not the true frontier defined by the graph-native territory metric. Everything else (mesh borders, fitters, even some nice engineering) is scaffolding around that wrong truth source. Your agent’s analysis is correct, and the spec below should be treated as binding.

Below is a strict, implementation-facing document to constrain and direct your agent to the correct solution.

***

# Canonical Territory Border Architecture – Binding Spec

## 0. Non‑negotiable Principles

1. **Graph-native ownership truth**  
   - Ownership is defined exclusively by shortest-path distance on the star–lane graph (multi-source top‑2 Dijkstra), not by Euclidean or grid distance.  
   - All canonical geometry and all fills must ultimately derive from this graph truth, not from a post-hoc rasterization.

2. **Single canonical frontier representation**  
   - There must be exactly one authoritative geometric representation of the territory interface: the **Frontier Graph** (defined below).  
   - Both borders (stroke meshes) and fills (territory color field) must be derived from this same frontier. No mode may show borders and fills derived from different “truths”.

3. **Centerline semantics**  
   - “Centerline” means *the geometric locus of points where two players have equal graph distance and are locally closest competitors*.  
   - It does **not** mean “the medial axis of the jagged outline of a raster cell partition”.  
   - Any centerline computed from an ownership **lattice** (grid) is non‑canonical and must be treated as a legacy / experimental source only.

4. **Modes and legacy**  
   - **Canonical mode** is “Graph Native Frontier” as defined in this spec.  
   - Existing grid / ownership‑RT / sampled‑centerline paths are kept as **legacy reference modes** only. They must not be used in canonical mode and may not be silently substituted.

***

## 1. Truth Sources and Data Flow

### 1.1 Truth sources (only three allowed)

1. **Graph Dijkstra Field** (Stage 1)  
   - For each node: `best` and `second` `PlayerDistance`.  
   - This is the unique source of distances; all later steps that need distances must go back to here or to analytically derived values from here.

2. **Analytic Lane Frontier** (Stage 2A – new canonical)  
   - For each lane edge `(u, v)`, using Dijkstra distances at `u` and `v`, compute parametric positions `t` on the edge where ownership changes between players.  
   - These positions are derived **analytically or via local 1D root finding**, never by raster-grid marching.

3. **Field Frontier (optional, controlled)** (Stage 2B – interstitial support)  
   - An ownership RT may be used *only* to find frontiers in regions that are truly interstitial (no lane passes nearby) and only when fed with graph-native distances.  
   - Any such RT must be treated as a *secondary* frontier source and must produce frontier points that are merged into the same Frontier Graph as lane frontiers.

No other “ownership grids”, “distance fields”, or “mask textures” are permitted to become new sources of geometry truth in canonical mode. They may only be used as *sampling devices* to refine the same frontier.

### 1.2 Frontier Graph (canonical representation)

Define:

```ts
interface FrontierNode {
  id: number;
  x: number;
  y: number;
  ownerA: PlayerId; // the two players that meet here
  ownerB: PlayerId;
  source: 'lane' | 'field';
}

interface FrontierEdge {
  id: number;
  a: number; // FrontierNode id
  b: number; // FrontierNode id
  ownerA: PlayerId;
  ownerB: PlayerId;
  source: 'lane' | 'field';
}

interface FrontierGraph {
  nodes: FrontierNode[];
  edges: FrontierEdge[];
}
```

Constraints:

- For any `FrontierEdge`, `ownerA` and `ownerB` are the same as its endpoints.  
- The topology of `FrontierGraph` is the one and only topology from which border paths are fitted and stroke meshes are built.

**Hard rule:**  
`FrontierGraph` **must not** be built from an “owner grid” / “ownership lattice”. The only allowed inputs are:

- analytic lane frontier points from Stage 2A, and  
- (optionally) analytically refined RT frontier points from Stage 2B, where the RT is fed by graph distances.

***

## 2. Stage Definitions – Binding Behavior

### Stage 1 – Graph Dijkstra (unchanged, but canonical)

- `computeGraphNativeDistanceResult(...)` and `rankTop2Owners(...)` are the canonical implementation.  
- All later geometry computations must take distances from this structure, not from shader outputs or textures.

Spec:

- For each node: store `best` and `second` `PlayerDistance` (distinct `playerId`s).  
- Distances are in a consistent unit (edge weights; typically integers or small rational values).  
- Ties are deterministic: stable ordering by `(dist, playerId)`.

### Stage 2A – Analytic Lane Frontier (must be implemented)

Goal: construct frontier points on lanes directly from graph distances.

For each lane `(u, v)`:

1. Let `candidates` be the union of `{best, second}` for `u` and `v` (deduplicated by `playerId`).  
2. For all unordered pairs of distinct players `{p, q}` in candidates:
   - Define functions for graph distance along the edge:  
     - \(D_p(t) = \min(d_p(u) + t w, d_p(v) + (1-t)w)\)  
     - \(D_q(t) = \min(d_q(u) + t w, d_q(v) + (1-t)w)\)
   - Solve \(D_p(t) = D_q(t)\) for `t ∈ (0,1)`:
     - Either analytically by checking which branch (via `u` or `v`) is active on each side and solving linear equalities, or  
     - Numerically by bisection within `[t0, t1]` where sign of `D_p - D_q` changes.
3. For each solution `t*` with valid ownership change (i.e., one side is closer to `p`, the other to `q`):
   - Compute world coordinates `(x, y)` on the lane.  
   - Emit a `FrontierNode` with `source: 'lane'`, `ownerA = p`, `ownerB = q`.

Topology:

- Connect consecutive frontier nodes along each lane into `FrontierEdge`s, sorted by increasing `t`.  
- Endpoints at stars (node boundaries) should be captured as nodes when ownership changes at the star.

**Prohibition:**  
You may not approximate this by first sampling an owner grid, then extracting the centerline of the stepped outline. That is explicitly disallowed for canonical mode.

### Stage 2B – Interstitial Field Frontier (optional, constrained)

If and only if interstitial borders are required:

- Ownership RT is rendered from **graph-based distances only**.  
- A frontier is detected between RT texels `(i,j)` and `(i+1,j)` / `(i,j+1)` where owners differ.  
- Instead of using the pixel edge itself, refine the frontier between texels using graph distances (e.g., gapNorm or reconstructed distances) as a 1D interpolation problem.  
- Emit `FrontierNode`s with `source: 'field'` and connect them to adjacent nodes / lane frontier nodes.

Again, this exists only to fill gaps; the canonical behavior must work correctly even with Stage 2B disabled.

***

## 3. Stage 3 – Frontier Graph → Fitted Paths → Stroke Mesh

### 3.1 Path extraction from FrontierGraph

- From `FrontierGraph`, extract maximal simple polylines (paths) for each unordered owner pair `{ownerA, ownerB}`.  
- Each path is an ordered list of `FrontierNode`s such that adjacent nodes are linked by `FrontierEdge`s and owner pair is constant.

This path extraction operates purely on `FrontierGraph`; it must not read any ownership grid.

### 3.2 Family fitting (at least `straight`)

For each polyline:

- **Straight family (canonical first)**:
  - Apply RDP or equivalent simplification with:
    - Error bound ≤ `0.5 * borderWidthWorldUnits`.  
    - Additional collinearity penalty encouraging long straight segments.
  - Output is a simplified polyline that remains geometrically close to the true frontier but has straight runs where possible.

- **Curved / segmented families**:
  - Curved: fit biarcs or cubic Beziers under the same error bound.  
  - Segmented: angle-quantize directions (e.g., 15° increments), again under error bound.

**Guarantee:**  
Regardless of family, all fitted curves remain centered on the frontier approximation from `FrontierGraph`. They do not drift relative to the true interface.

### 3.3 Stroke mesh

- A separate module consumes fitted paths and emits triangle strips with round joins and caps.  
- Stroke width is specified in world units and is constant along the path.  
- The mesh does not encode owner information beyond color / uniforms; logical owner pairing stays in the path metadata.

**Forbidden:**  
Any stroke geometry built from a grid-outline–derived centerline must be confined to legacy modes (`Grid Centerline` etc.), clearly labeled.

***

## 4. Fills: Backfilling from Frontier

Canonical territory fill must be geometrically consistent with frontier strokes.

Allowed approaches:

1. **Shader-side fill from frontier distance**  
   - Render frontier strokes to an offscreen buffer, then do a signed-distance flood in a shader and flood-fill per owner (complex).

2. **Field from graph metric + frontier constraints (recommended hybrid)**  
   - Use graph-native distances to assign a winner to each texel (like the current ownership RT), but:  
   - For texels crossed by a frontier edge, ownership must be decided by which side of the frontier polyline the center lies—ensuring perfect alignment between fill boundary and frontier.  
   - Practical simplification: for canonical mode, render fills only in wide bands around lanes and leave deep voids dark or low-saturation—still respects frontier alignment visually.

Spec constraint:

- In canonical mode, a perceptible mismatch between the visible fill transition and the frontier stroke is considered a bug.  
- Any fill not constrained by the frontier must be explicitly labeled as “legacy fill” or “non-canonical” in code and UI.

***

## 5. Modes and Control-Panel Requirements

### 5.1 Conquest modes

Required modes:

1. **Fade Blend** (existing)  
   - Operates by blending ownership RTs (or equivalent) over time.  
   - Kept as a first-class mode with its own sliders.

2. **Boundary Morph** (future)  
   - Operates by interpolating Dijkstra distances → recomputing frontier → re-fitting paths → GPU vertex lerp between prev/next meshes, or CPU rebuild with controlled rate.  

3. **Hybrid** (future, optional)  
   - Combine fade and morph.

Canonical border geometry must be used in all modes for the visible border; only the *transition* mechanics differ.

### 5.2 Legacy modes

- “Grid / lattice centerline” modes are kept as **Legacy**:
  - Named clearly (e.g., `Grid Centerline Borders`).  
  - Must not be the default for any release build.  
  - Used only for debugging and regressions.

### 5.3 Settings/state architecture (precondition)

Before further border iterations:

- `settingsState.ts` (`setSetting`, `setManySettings`) is the **only** write path.  
- `GameSettingsPanel.svelte` must:
  - Stop calling `applyPanelToConfig` / `syncPanelFromConfig`.  
  - Remove the manual `syncAllFromConfig` rebuild.  
  - Become purely a view over `settingsState` + dispatcher of `setSetting(..)` actions.

Rendering invalidation must key off **settings state + graph state** only; no other hidden copies of config are allowed.

***

## 6. Immediate Implementation Orders for the Agent

1. **Lock in canonical vs legacy paths**
   - Introduce explicit flags/types: `BorderPipelineMode = 'GraphFrontierCanonical' | 'GridCenterlineLegacy' | 'FadeOnlyLegacy'`.  
   - Default to `'GraphFrontierCanonical'`.  
   - Route the rendering pipeline based on this flag.

2. **Implement Stage 2A (analytic lane frontier)**
   - New module: `laneFrontier.ts` implementing analytic / bisection computation of frontier points per lane using graph distances.  
   - Feed its output into `FrontierGraph`.

3. **Refactor `centerlineGraph.ts`**
   - Split into:
     - `frontierGraph.ts` – canonical `FrontierGraph` builder that consumes lane frontiers (and optional refined RT frontier).  
     - `ownerGridCenterline.ts` – legacy grid-based centerline extractor.  
   - Ensure `DistanceFieldTerritoryRenderer` uses `frontierGraph.ts` in canonical mode.

4. **Wire stroke mesh to FrontierGraph**
   - Ensure existing straight-family fitter + mesh builder receive fitted paths derived from `FrontierGraph`, not from owner grid.

5. **Add a debug toggle**
   - A setting to overlay:
     - raw lane frontier points,  
     - FrontierGraph edges,  
     - fitted straight segments.  
   - This is your visual assertion that centerline now tracks the true frontier, not the grid.

6. **Prohibit regressions**
   - Any new code that introduces a new ownership lattice must clearly mark it as `Legacy` and must not feed `FrontierGraph` or canonical fills.

***

If you want the next step to be even more concrete, share the current `centerlineGraph.ts` and the lane graph types, and the directive can be narrowed to a literal “replace this function with this exact implementation” for Stage 2A + FrontierGraph.