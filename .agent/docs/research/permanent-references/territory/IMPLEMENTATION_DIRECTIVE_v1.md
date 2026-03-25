# Canonical Graph-Native Territory Rendering — Implementation Directive v1

**Date**: 2026-03-08  
**Status**: BINDING SPECIFICATION  
**Target**: Complete end-to-end replacement of lattice-derived borders with graph-native frontier rendering  
**Scope**: Stages 1–6 of TERRITORY_ARCHITECTURE_v3.md unified into one executable directive

---

## 0. Scope and Non-Negotiable Invariants

### Invariant I: Single Truth Source for Ownership
- **The only source of ownership truth is Stage 1 graph distances** computed via `computeGraphNativeDistanceResult(...)` using multi-source top-2 Dijkstra on the star–lane graph.
- No texture, grid, field, or derived representation may become a replacement truth source in canonical mode.
- All other stages consume distances directly from Stage 1 or analytically derive from them; no circular dependencies.

### Invariant II: Canonical Frontier Graph is Non-Negotiable
- The **only** authoritative border geometry is `FrontierGraph`, built by merging:
  - Stage 2A: analytical lane frontier points (equal-distance loci on edges),
  - Stage 2B/4: refined field frontier from ownership RT sub-texel interpolation.
- The legacy lattice-derived centerline extractor (`buildCenterlineGraphsFromOwnerGrid`) is **forbidden in canonical mode** and reserved for legacy/experimental reference only.
- Any border stroke mesh, family fitting, or visual rendering **must** consume only `FrontierGraph` in canonical mode.

### Invariant III: Fill and Border Must Share Canonical Geometry Truth
- Territory fills (the colored background field) must be derived from the same graph-native ownership interface as borders.
- A perceptible misalignment between fill boundary and border stroke in canonical mode is considered a **bug**.
- Both fills and borders use graph distances from Stage 1 as their source; both are constrained by the merged `FrontierGraph`.

### Invariant IV: Legacy Mode is Separated and Labeled
- The current lattice-based centerline extraction path is preserved as a **legacy reference mode** only.
- Legacy mode is never the default for any canonical rendering context.
- Legacy mode must be explicitly opt-in via configuration and clearly labeled in code as non-canonical.

### Invariant V: Conquest Morph Stability
- Border movement during conquest animation must be continuous and locally smooth, driven by Stage 1 distance interpolation, not by whole-system recomputation artifacts.
- No flicker, no popping, no sudden jumps in unrelated border regions.

---

## 1. Architecture Overview: Six Stages, One Chain

```
┌─────────────────────────────────────────────────────────────────┐
│ CANONICAL GRAPH-NATIVE TERRITORY RENDERING PIPELINE             │
└─────────────────────────────────────────────────────────────────┘

STAGE 1: Multi-source Top-2 Dijkstra (CPU)
  Input: stars[], connections[], owned star set
  Output: GraphNativeDistanceResult = { distToPlayer[][], top2ByStar[] }
  Trigger: ownership change, star add/remove, connection change
  
  ↓↓↓ (distance truth flows to all downstream stages)
  
┌─────────────────────────────────────────────────────────────────┐
│                      TWO PARALLEL BRANCHES                       │
├─────────────────────────────────────────────────────────────────┤

STAGE 2A: Lane Frontier Extraction (CPU)
  Input: connections[], stars[], distToPlayer[][], top2ByStar[]
  Output: LaneFrontierPoints[] per connection
           → exact (t, x, y, ownerA, ownerB) where players equidistant
  Trigger: same as Stage 1

STAGE 3: Ownership RT Rasterization (GPU)
  Input: Stage 1 distances via data texture
  Output: ownership texture (ownerIdx, enemyIdx, gapNorm)
  Trigger: topology change (gate: only when needed)
  
STAGE 2B: Field Frontier Extraction (CPU)
  Input: ownership RT pixels + gapNorm refinement
  Output: FieldFrontierPoints[] at interstitial region boundaries
  Trigger: same as Stage 1

└─────────────────────────────────────────────────────────────────┘
  
STAGE 4: Merge Lane + Field Frontiers → FrontierGraph (CPU)
  Input: LaneFrontierPoints[], FieldFrontierPoints[]
  Output: FrontierGraph = { nodes: Map, edges: Map, adjacency }
          per owner-pair, in world space, with source tags
  Trigger: same as Stage 1
  
  ↓↓↓ (single canonical geometry truth)
  
STAGE 5: Family Fitting (CPU)
  Input: FrontierGraph polylines
  Output: FittedPath[] per family (straight, curved, segmented)
  Trigger: topology change or family/style change
  
STAGE 6A: Stroke Mesh Rendering (GPU)
  Input: FittedPath[] → triangle strips + round joins/caps
  Output: border mesh
  Trigger: Stage 5 completion or morph interpolation

STAGE 6B: Fill Rendering (GPU)
  Input: ownership RT or implicit fill from FrontierGraph distance field
  Output: colored territory fills
  Trigger: Stage 1 completion or morph blend
```

Key rule: **Stages 1–4 form one inseparable chain**. The chain is the canonical truth source. Do not break the chain.

---

## 2. Stage 1: Multi-source Top-2 Dijkstra (Already Exists)

### Status: KEEP AS-IS (canonical implementation already present)

**Location**: `DistanceFieldTerritoryRenderer.ts`

**Functions**:
- `computeGraphNativeDistanceResult(stars, connections, playerIds, metric)`
- `rankTop2Owners(distToPlayer, playerCount)`

**Verification**:
- [ ] Seeded from all currently-owned stars at distance 0 (or with MSR bias if configured).
- [ ] Multi-source Dijkstra correctly maintains top-2 per node (different player IDs).
- [ ] Output is `GraphNativeDistanceResult` with:
  - `distToPlayer: number[][]` (indexed by [starIdx][playerIdx])
  - `top2ByStar: NodeTop2Pair[]` (indexed by [starIdx])

**Do not modify this stage**. It is the canonical truth source.

---

## 3. Stage 2A: Analytic Lane Frontier Extraction

### Status: NEW MODULE (frontierGraph.ts)

Create a new file `frontierGraph.ts` that computes exact frontier points on lanes where two players have equal graph distance.

#### 3.1 New Types

```typescript
// frontierGraph.ts

export interface LaneFrontierPoint {
  connectionId: string;        // link back to the Connection
  sourceStarId: string;
  targetStarId: string;
  t: number;                   // parameter 0..1 on lane
  x: number;                   // world-space position
  y: number;
  ownerA: number;              // owner index, sorted ascending
  ownerB: number;
  source: 'lane';              // tag for merging with field frontier
}

export interface LaneFrontierResult {
  points: LaneFrontierPoint[];  // sorted by source connection, then by t
}
```

#### 3.2 Core Algorithm: `computeLaneFrontiers()`

```typescript
export function computeLaneFrontiers(
  stars: StarState[],
  connections: StarConnection[],
  playerIds: string[],
  graphResult: GraphNativeDistanceResult,
): LaneFrontierResult {
  const { distToPlayer, top2ByStar } = graphResult;
  
  const starIndexById = new Map<string, number>();
  for (let i = 0; i < stars.length; i++) {
    starIndexById.set(stars[i].id, i);
  }

  const points: LaneFrontierPoint[] = [];

  for (const connection of connections) {
    const idxA = starIndexById.get(connection.sourceId);
    const idxB = starIndexById.get(connection.targetId);
    if (idxA == null || idxB == null) continue;

    const starA = stars[idxA];
    const starB = stars[idxB];
    const weight = connection.distance;

    // Collect candidate players from endpoints
    const top2A = top2ByStar[idxA];
    const top2B = top2ByStar[idxB];
    const candidates = new Set<number>();
    if (top2A?.best) candidates.add(top2A.best.ownerIdx);
    if (top2A?.second) candidates.add(top2A.second.ownerIdx);
    if (top2B?.best) candidates.add(top2B.best.ownerIdx);
    if (top2B?.second) candidates.add(top2B.second.ownerIdx);

    if (candidates.size < 2) {
      // Not enough competition; no frontier on this lane
      continue;
    }

    const playerArray = [...candidates].sort((a, b) => a - b);

    // For each candidate player pair, find equal-distance points
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        const pIdx = playerArray[i];
        const qIdx = playerArray[j];

        // Define distance function
        const D = (player: number, t: number): number => {
          const dA = distToPlayer[idxA]?.[player];
          const dB = distToPlayer[idxB]?.[player];
          const viaA = Number.isFinite(dA) ? dA + t * weight : Infinity;
          const viaB = Number.isFinite(dB) ? dB + (1 - t) * weight : Infinity;
          return Math.min(viaA, viaB);
        };

        const f = (t: number) => D(pIdx, t) - D(qIdx, t);

        // Find root via bisection on [0, 1]
        const tStar = findRootInInterval(f, 0, 1, 20, 1e-5);
        if (tStar != null && tStar > 1e-5 && tStar < 1 - 1e-5) {
          const x = starA.x + (starB.x - starA.x) * tStar;
          const y = starA.y + (starB.y - starA.y) * tStar;
          const ownerA = Math.min(pIdx, qIdx);
          const ownerB = Math.max(pIdx, qIdx);

          points.push({
            connectionId: connection.sourceId + ':' + connection.targetId,
            sourceStarId: connection.sourceId,
            targetStarId: connection.targetId,
            t: tStar,
            x,
            y,
            ownerA,
            ownerB,
            source: 'lane',
          });
        }
      }
    }
  }

  // Sort by connection, then by t for later linking
  points.sort((a, b) => {
    if (a.connectionId !== b.connectionId) return a.connectionId.localeCompare(b.connectionId);
    if (a.ownerA !== b.ownerA) return a.ownerA - b.ownerA;
    if (a.ownerB !== b.ownerB) return a.ownerB - b.ownerB;
    return a.t - b.t;
  });

  return { points };
}

function findRootInInterval(
  f: (t: number) => number,
  a: number,
  b: number,
  maxIter: number,
  tol: number,
): number | null {
  let fa = f(a);
  let fb = f(b);

  if (Math.abs(fa) < tol) return a;
  if (Math.abs(fb) < tol) return b;
  if (fa === 0 || fb === 0 || fa * fb > 0) return null; // no sign change

  for (let iter = 0; iter < maxIter; iter++) {
    const mid = 0.5 * (a + b);
    const fm = f(mid);
    if (Math.abs(fm) < tol) return mid;
    if (fa * fm <= 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return 0.5 * (a + b);
}
```

**Key properties**:
- Computes frontier points purely from graph distances; does not touch any grid or RT.
- Each point is exact (bisection-refined) to sub-sample precision.
- Points are labeled by owner pair and source.
- Deterministic: same input always produces same output.

**Trigger**: Call whenever Stage 1 (Dijkstra) completes.

---

## 4. Stage 3: Ownership RT (Existing + Minor Gating)

### Status: KEEP EXISTING GPU PASS WITH GATING

**Location**: `DistanceFieldTerritoryRenderer.ts` (methods `renderOwnershipPass`, etc.)

**Changes**:
1. **Feed Stage 1 distances** into the data texture (already done in current code).
2. **Gate execution**: Only render when `topologyChanged || geometryChanged`, not every frame.
3. **Ping-pong RTs**: Maintain both `prevOwnershipRT` and `currOwnershipRT`; swap before re-render.
4. **Zoom-adaptive resolution**: Recalculate resolution on significant camera zoom change.

**Output channels** (RGBA8):
- R: ownerIdx (0–255)
- G: enemyIdx (second-closest player)
- B: gapNorm (sub-texel gap measure for field frontier refinement, 0–255)
- A: 1.0 (opaque)

**Do not modify the shader logic**; just gate execution and ping-pong the textures.

---

## 5. Stage 2B: Field Frontier Extraction

### Status: NEW FUNCTION in frontierGraph.ts

Extract frontier points from the ownership RT texture, refined using gapNorm sub-texel interpolation.

#### 5.1 New Type

```typescript
export interface FieldFrontierPoint {
  x: number;                   // world-space position
  y: number;
  ownerA: number;              // owner indices from RT
  ownerB: number;
  gapNorm: number;             // interpolation factor, 0..1
  source: 'field';             // tag for merging
}

export interface FieldFrontierResult {
  points: FieldFrontierPoint[];
}
```

#### 5.2 Core Algorithm: `extractFieldFrontiers()`

```typescript
export function extractFieldFrontiers(
  ownershipRT: PIXI.RenderTexture,
  ownershipRTPixels: Uint8Array,  // extracted via renderer.extract.pixels()
  rtWidth: number,
  rtHeight: number,
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number },
): FieldFrontierResult {
  const points: FieldFrontierPoint[] = [];

  const pixelToWorld = (px: number, py: number) => {
    const normalizedX = px / rtWidth;
    const normalizedY = py / rtHeight;
    const x = worldBounds.minX + normalizedX * (worldBounds.maxX - worldBounds.minX);
    const y = worldBounds.minY + normalizedY * (worldBounds.maxY - worldBounds.minY);
    return { x, y };
  };

  const getPixel = (x: number, y: number): { ownerIdx: number; enemyIdx: number; gapNorm: number } | null => {
    if (x < 0 || x >= rtWidth || y < 0 || y >= rtHeight) return null;
    const idx = (y * rtWidth + x) * 4;
    return {
      ownerIdx: ownershipRTPixels[idx] ?? 0,
      enemyIdx: ownershipRTPixels[idx + 1] ?? 0,
      gapNorm: ownershipRTPixels[idx + 2] ?? 0,
    };
  };

  // Scan for adjacent pixels with different owners
  for (let y = 0; y < rtHeight; y++) {
    for (let x = 0; x < rtWidth; x++) {
      const center = getPixel(x, y);
      if (!center) continue;

      // Check horizontal neighbor
      const right = getPixel(x + 1, y);
      if (right && right.ownerIdx !== center.ownerIdx) {
        // Frontier between this pixel and right
        const ownerA = Math.min(center.ownerIdx, right.ownerIdx);
        const ownerB = Math.max(center.ownerIdx, right.ownerIdx);
        const gapNorm = center.gapNorm / 255;  // 0..1

        // Frontier point is sub-texel interpolated between centers
        const xLeft = x + 0.5;
        const xRight = x + 1.5;
        const xFrontier = xLeft + (xRight - xLeft) * gapNorm;
        const yCenter = y + 0.5;

        const { x: worldX, y: worldY } = pixelToWorld(xFrontier, yCenter);
        points.push({ x: worldX, y: worldY, ownerA, ownerB, gapNorm, source: 'field' });
      }

      // Check vertical neighbor
      const down = getPixel(x, y + 1);
      if (down && down.ownerIdx !== center.ownerIdx) {
        // Frontier between this pixel and down
        const ownerA = Math.min(center.ownerIdx, down.ownerIdx);
        const ownerB = Math.max(center.ownerIdx, down.ownerIdx);
        const gapNorm = center.gapNorm / 255;  // 0..1

        // Frontier point is sub-texel interpolated between centers
        const xCenter = x + 0.5;
        const yTop = y + 0.5;
        const yBottom = y + 1.5;
        const yFrontier = yTop + (yBottom - yTop) * gapNorm;

        const { x: worldX, y: worldY } = pixelToWorld(xCenter, yFrontier);
        points.push({ x: worldX, y: worldY, ownerA, ownerB, gapNorm, source: 'field' });
      }
    }
  }

  // Deduplicate and sort
  const uniquePoints = new Map<string, FieldFrontierPoint>();
  for (const p of points) {
    const key = `${p.ownerA}:${p.ownerB}:${p.x.toFixed(1)}:${p.y.toFixed(1)}`;
    if (!uniquePoints.has(key)) uniquePoints.set(key, p);
  }

  return { points: [...uniquePoints.values()] };
}
```

**Key properties**:
- Extracts boundaries between differently-owned pixels.
- Uses gapNorm to refine frontier position between texel centers.
- Deduplicates to avoid double-counting shared edges.
- Field frontier points fill gaps where no lane passes through.

**Trigger**: Call after Stage 3 RT is complete (async pixel extraction).

**Async handling**: Use `renderer.extract.pixels(ownershipRT)` with a one-frame delay if necessary to avoid stalls.

---

## 6. Stage 4: Merge Lane + Field Frontiers → FrontierGraph

### Status: NEW FUNCTION in frontierGraph.ts

Combine lane and field frontier points into a single canonical `FrontierGraph`.

#### 6.1 New Types

```typescript
export interface FrontierNode {
  id: string;
  x: number;
  y: number;
  ownerA: number;
  ownerB: number;
  source: 'lane' | 'field';
}

export interface FrontierEdge {
  id: string;
  a: string;        // FrontierNode.id
  b: string;        // FrontierNode.id
  ownerA: number;
  ownerB: number;
  source: 'lane' | 'field';
  length?: number;  // for sorting/traversal
}

export interface FrontierGraph {
  nodes: Map<string, FrontierNode>;
  edges: Map<string, FrontierEdge>;
  adjacency: Map<string, string[]>;  // nodeId -> [adjacent nodeIds]
}
```

#### 6.2 Core Algorithm: `buildFrontierGraph()`

```typescript
export function buildFrontierGraph(
  laneFrontierResult: LaneFrontierResult,
  fieldFrontierResult: FieldFrontierResult,
): FrontierGraph {
  const nodes = new Map<string, FrontierNode>();
  const adjacency = new Map<string, Set<string>>();

  const makeNodeId = (ownerA: number, ownerB: number, x: number, y: number): string => {
    return `n:${ownerA}:${ownerB}:${x.toFixed(4)}:${y.toFixed(4)}`;
  };

  const ensureNode = (
    ownerA: number,
    ownerB: number,
    x: number,
    y: number,
    source: 'lane' | 'field',
  ): FrontierNode => {
    const id = makeNodeId(ownerA, ownerB, x, y);
    if (nodes.has(id)) return nodes.get(id)!;
    const node: FrontierNode = { id, x, y, ownerA, ownerB, source };
    nodes.set(id, node);
    return node;
  };

  const addAdjacency = (aId: string, bId: string) => {
    let set = adjacency.get(aId);
    if (!set) {
      set = new Set<string>();
      adjacency.set(aId, set);
    }
    set.add(bId);
  };

  // Process lane frontier points: group by connection and owner pair, link consecutive points
  const laneNodesByKey = new Map<string, FrontierNode[]>();
  for (const pt of laneFrontierResult.points) {
    const key = `lane:${pt.connectionId}:${pt.ownerA}:${pt.ownerB}`;
    const node = ensureNode(pt.ownerA, pt.ownerB, pt.x, pt.y, 'lane');
    if (!laneNodesByKey.has(key)) laneNodesByKey.set(key, []);
    laneNodesByKey.get(key)!.push(node);
  }

  for (const nodeArray of laneNodesByKey.values()) {
    // Sort nodes by position along lane (sort by distance or by connection order)
    // For simplicity, sort by x then y
    nodeArray.sort((a, b) => {
      if (Math.abs(a.x - b.x) > 1e-3) return a.x - b.x;
      return a.y - b.y;
    });
    // Link consecutive nodes
    for (let i = 0; i < nodeArray.length - 1; i++) {
      const aId = nodeArray[i].id;
      const bId = nodeArray[i + 1].id;
      addAdjacency(aId, bId);
      addAdjacency(bId, aId);
    }
  }

  // Process field frontier points: similar linking by owner pair
  const fieldNodesByOwnerPair = new Map<string, FrontierNode[]>();
  for (const pt of fieldFrontierResult.points) {
    const key = `${pt.ownerA}:${pt.ownerB}`;
    const node = ensureNode(pt.ownerA, pt.ownerB, pt.x, pt.y, 'field');
    if (!fieldNodesByOwnerPair.has(key)) fieldNodesByOwnerPair.set(key, []);
    fieldNodesByOwnerPair.get(key)!.push(node);
  }

  // Link field frontier nodes by proximity (spatial clustering)
  for (const nodeArray of fieldNodesByOwnerPair.values()) {
    // Sort by position for spatial locality
    nodeArray.sort((a, b) => {
      const distA = a.x * a.x + a.y * a.y;
      const distB = b.x * b.x + b.y * b.y;
      return distA - distB;
    });
    // Link nearby nodes (within some threshold, e.g., 10 world units)
    for (let i = 0; i < nodeArray.length - 1; i++) {
      const a = nodeArray[i];
      const b = nodeArray[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) {  // Tunable threshold
        addAdjacency(a.id, b.id);
        addAdjacency(b.id, a.id);
      }
    }
  }

  // Optionally: link lane frontier nodes to nearby field frontier nodes (same owner pair)
  // This bridges gaps and ensures continuity
  for (const [ownerPair, laneNodes] of laneNodesByKey.entries()) {
    const fieldKey = ownerPair.substring(ownerPair.lastIndexOf(':') - 10);  // extract "ownerA:ownerB"
    const fieldNodes = fieldNodesByOwnerPair.get(fieldKey) || [];

    for (const laneNode of laneNodes) {
      for (const fieldNode of fieldNodes) {
        const dx = fieldNode.x - laneNode.x;
        const dy = fieldNode.y - laneNode.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) {  // Tunable; bridges lane ↔ field transitions
          addAdjacency(laneNode.id, fieldNode.id);
          addAdjacency(fieldNode.id, laneNode.id);
        }
      }
    }
  }

  // Build edge objects from adjacency
  const edges = new Map<string, FrontierEdge>();
  const visited = new Set<string>();
  for (const [nodeId, neighbors] of adjacency.entries()) {
    for (const neighborId of neighbors) {
      const edgeKey = [nodeId, neighborId].sort().join(':');
      if (visited.has(edgeKey)) continue;
      visited.add(edgeKey);

      const nodeA = nodes.get(nodeId)!;
      const nodeB = nodes.get(neighborId)!;
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const length = Math.hypot(dx, dy);

      const edgeId = edgeKey;
      edges.set(edgeId, {
        id: edgeId,
        a: nodeId,
        b: neighborId,
        ownerA: nodeA.ownerA,
        ownerB: nodeA.ownerB,
        source: nodeA.source === 'lane' || nodeB.source === 'lane' ? 'lane' : 'field',
        length,
      });
    }
  }

  return { nodes, edges, adjacency };
}
```

**Key properties**:
- Merges lane and field frontier points into one graph.
- Lane points are grouped by connection; field points by owner pair.
- Consecutive points are linked into edges.
- Lane and field frontiers are bridged where close (<5 world units).
- Result is a complete, connected frontier topology.

**Trigger**: Call after both Stage 2A (lane frontiers) and Stage 2B (field frontiers) complete.

---

## 7. Stage 5: Family Fitting (Existing Code)

### Status: USE EXISTING FITTER, FIX INPUTS

**Location**: `DistanceFieldTerritoryRenderer.ts` or family-specific module

**Change**: Replace input from `buildCenterlineGraphsFromOwnerGrid(...)` with `buildFrontierGraph(...)`

**Interfaces** (expected by fitter):
- Input: polylines extracted from `FrontierGraph`
- Output: `FittedPath[]` per family (straight, curved, segmented)

**Existing families**:
- `straight`: RDP simplification with collinearity penalty
- `curved`: Biarc or cubic fitting (future; stub for now)
- `segmented`: Angle-quantization (future; stub for now)

**Important**: Do not modify fitter logic. Only ensure it consumes frontier polylines, not lattice-derived centerlines.

---

## 8. Stage 6A: Stroke Mesh Rendering

### Status: USE EXISTING MESH BUILDER

**Location**: `DistanceFieldTerritoryRenderer.ts` or mesh-specific module

**Input**: `FittedPath[]` from Stage 5

**Output**: Pixi triangle strips with:
- Position (x, y) per vertex
- Owner colors (best, second player colors)
- Distance-to-second-owner for soft blending
- Width/softness/alpha uniforms

**Changes**: Ensure mesh source is `FrontierGraph`-derived fitted paths, not lattice-derived.

---

## 9. Stage 6B: Fill Rendering

### Status: EXISTING GPU PASS + ALIGNMENT ENFORCEMENT

**Current fill method**: Sample ownership RT per pixel; blend by time during conquest morph.

**Constraint**: **Fill boundaries must align visually with border stroke positions.**

If fill and border diverge, debug by:
1. Verify fill uses graph distances (Stage 1).
2. Verify border uses merged `FrontierGraph`.
3. Ensure both consume same ownership truth from Stage 1.

Acceptable fill strategies:
- **Option A (current)**: Render ownership RT directly; use high enough resolution so fill/border visual alignment is acceptable.
- **Option B (future)**: Render fill as an implicit color field derived from signed distance to `FrontierGraph` boundaries.

**In canonical mode, do not accept fill/border misalignment as "acceptable" if the mismatch is visually obvious.**

---

## 10. Legacy Path: Reference Only

### Preserve Current Lattice-Based Centerline

Do not delete `centerlineGraph.ts`. Instead:

1. **Rename the exported function**:
   ```typescript
   export function buildLegacyCenterlineGraphsFromOwnerGrid(...)
   ```

2. **Add file header**:
   ```typescript
   /**
    * LEGACY: Extract owner-pair centerline graphs from a rasterized ownership lattice.
    *
    * NOT USED IN CANONICAL GRAPH-NATIVE MODE.
    * Preserved only for debugging, comparison, and fallback reference.
    * Do not use this as the geometry source for canonical territory borders.
    */
   ```

3. **Gate legacy mode**:
   ```typescript
   type BorderPipelineMode = 'GraphNativeCanonical' | 'LegacyLatticeCenterline';
   const BORDER_PIPELINE_MODE: BorderPipelineMode = 'GraphNativeCanonical';
   ```

4. **When in legacy mode**:
   ```typescript
   if (BORDER_PIPELINE_MODE === 'LegacyLatticeCenterline') {
     const legacyCenterlines = buildLegacyCenterlineGraphsFromOwnerGrid(ownerGrid, gridW, gridH);
     // ... existing fitter + mesh path
   } else {
     // canonical: use FrontierGraph from Stage 4
     const frontier = buildFrontierGraph(laneFrontiers, fieldFrontiers);
     // ... fitter + mesh path
   }
   ```

5. **Never default to legacy mode in production code.**

---

## 11. Control-Panel Integration (Prerequisite)

### Status: MUST BE COMPLETED BEFORE CANONICAL MODE SHIPS

From your agent's analysis, control-panel state integration is half-migrated. **Complete it now.**

**Required changes**:

1. **`settingsState.ts`**:
   - Ensure `setSetting(key, value)` and `setManySettings({...})` are the only write paths.
   - No broad `syncAllFromConfig()` rebuild; only delta updates.

2. **`GameSettingsPanel.svelte`**:
   - Stop importing and calling `applyPanelToConfig`.
   - Stop calling `syncPanelFromConfig`.
   - Remove manual `syncAllFromConfig()` rebuild.
   - Dispatch `setSetting()` on input change; bind to computed state.

3. **Theme/config sync**:
   - Load theme once at startup.
   - Separate "initial config load" from "runtime settings changes."
   - Do not replay broad config on every setting update.

4. **Verification**:
   - [ ] Settings panel reflects actual game config in real time.
   - [ ] Theme changes do not clear fresh settings.
   - [ ] Changing territory renderer settings (width, softness, alpha) takes effect immediately in canonical mode.

**This must be stable before wiring border/frontier changes to UI.**

---

## 12. Configuration and Toggles

### New Settings Required

Add to `game.config.ts`:

```typescript
export const TERRITORY_CONFIG = {
  // Canonical mode control
  BORDER_PIPELINE_MODE: 'GraphNativeCanonical' as 'GraphNativeCanonical' | 'LegacyLatticeCenterline',

  // Conquest modes
  CONQUEST_MODE: 'FadeBlend' as 'FadeBlend' | 'BoundaryMorph',

  // Fade blend (existing)
  TERRITORY_TRANSITION_MS: 300,
  TERRITORY_TRANSITION_EASING: 'easeInOutQuad',

  // Boundary morph (future; placeholder)
  BOUNDARY_MORPH_MS: 500,

  // Border rendering
  BORDER_WIDTH_WORLD_UNITS: 8,
  BORDER_SOFTNESS: 0.5,        // 0..1
  BORDER_ALPHA: 0.6,            // 0..1
  BORDER_FAMILY: 'straight' as 'straight' | 'curved' | 'segmented',

  // Fill
  FILL_ALPHA: 0.3,

  // Debug
  DEBUG_SHOW_FRONTIER_NODES: false,
  DEBUG_SHOW_LANE_FRONTIERS: false,
  DEBUG_SHOW_FIELD_FRONTIERS: false,
};
```

Map these to UI sliders in `settingsDefs.ts`.

---

## 13. File Modifications Summary

| File | Action | Details |
|------|--------|---------|
| `frontierGraph.ts` | **NEW** | Lane frontier extraction, field frontier extraction, merge → `FrontierGraph` |
| `DistanceFieldTerritoryRenderer.ts` | **MODIFY** | Add `BORDER_PIPELINE_MODE` flag; route canonical to new frontier path; keep legacy fallback |
| `centerlineGraph.ts` | **RENAME/MARK** | Mark as legacy; rename function to `buildLegacyCenterlineGraphsFromOwnerGrid`; add header |
| `game.config.ts` | **MODIFY** | Add `TERRITORY_CONFIG` with new settings |
| `settingsDefs.ts` | **MODIFY** | Map new config keys to UI sliders |
| `GameSettingsPanel.svelte` | **MODIFY** | Complete control-panel state migration |
| `ControlsSection-Territory.svelte` | **MODIFY** | Wire new territory sliders (width, softness, alpha, family); remove dead controls |

---

## 14. Execution Sequence

Execute in this order to prevent regressions:

### Phase 1: Control-Panel Foundation (1–2 days)
- [ ] Complete `settingsState.ts` migration (delta-only writes).
- [ ] Refactor `GameSettingsPanel.svelte` to use only `setSetting()`.
- [ ] Verify all existing territory settings (zoom, opacity, etc.) work correctly.
- [ ] **Acceptance**: Settings panel is always in sync with runtime config.

### Phase 2: Graph-Native Frontier Extraction (2–3 days)
- [ ] Implement `frontierGraph.ts`:
  - [ ] `computeLaneFrontiers()` with bisection root-finding.
  - [ ] `extractFieldFrontiers()` with gapNorm interpolation.
  - [ ] `buildFrontierGraph()` merge logic.
- [ ] Add debug rendering for frontier nodes and edges.
- [ ] **Acceptance**: Frontier graph visualizes analytically computed borders on lanes and field interstitials.

### Phase 3: Pipeline Integration (1–2 days)
- [ ] Add `BORDER_PIPELINE_MODE` flag to `DistanceFieldTerritoryRenderer.ts`.
- [ ] Route canonical mode through new frontier path.
- [ ] Keep legacy lattice path functional but gated.
- [ ] **Acceptance**: Canonical mode produces cleaner borders than legacy; visual comparison shows no staircase.

### Phase 4: UI Wiring (1 day)
- [ ] Add `TERRITORY_CONFIG` settings.
- [ ] Map to UI sliders.
- [ ] Verify all sliders (width, softness, alpha, family) work in canonical mode.
- [ ] **Acceptance**: Settings panel controls are responsive and affect visual output immediately.

### Phase 5: Acceptance Testing (2–3 days)
- [ ] Border geometry is clean and even-width.
- [ ] Conquest morph is smooth with no flicker or popping.
- [ ] Fill and border are visually aligned.
- [ ] Disconnected player holdings are separated by enemy territory.
- [ ] All three border families (straight, curved, segmented) work or appropriately stub.
- [ ] Legacy mode remains functional as reference.

---

## 15. Acceptance Criteria for Success

### Visual Acceptance

- [ ] **Clean borders**: In canonical mode, borders are smooth, even-width, SVG-like in appearance. No staircase or grid-step artifacts.
- [ ] **Lane alignment**: Frontiers on lanes follow the true equal-distance locus, not grid cell edges.
- [ ] **No fill/border drift**: Territory fill color boundary matches visible border stroke position within 1 pixel (at gameplay zoom).
- [ ] **Smooth conquest**: When a star changes owner, borders drift continuously (300–700 ms) with no sudden jumps in unrelated regions.
- [ ] **Disconnected holdings**: If a player owns stars in two isolated graph components, territory visibly shows enemy-owned space between them.

### Functional Acceptance

- [ ] Canonical pipeline mode is the default; legacy mode is opt-in and clearly labeled.
- [ ] All territory settings (border width, softness, alpha, family, conquest mode) are wired to UI sliders.
- [ ] Settings panel is always in sync with runtime config; changes take effect immediately.
- [ ] Debug toggles (show frontier nodes, lane frontiers, field frontiers) work and are useful for iteration.

### Code Quality Acceptance

- [ ] `FrontierGraph` is the sole source of canonical border geometry; `ownerGrid` is not referenced in canonical mode.
- [ ] Stages 1–4 form an unbroken chain; no stage substitutes a different truth source.
- [ ] No circular dependencies between stages.
- [ ] All new functions are deterministic (same input → same output).
- [ ] Legacy lattice code is preserved, marked, and not used by default.

### Performance Acceptance

- [ ] Dijkstra (Stage 1) completes in < 16 ms for typical star graphs (< 500 stars).
- [ ] Lane frontier extraction (Stage 2A) completes in < 5 ms.
- [ ] Field frontier extraction (Stage 2B) completes in < 10 ms (including async pixel read).
- [ ] Frontier graph merge (Stage 4) completes in < 5 ms.
- [ ] Stroke mesh rendering (Stage 6A) is < 2 ms per frame.
- [ ] Overall territory update (all stages) on ownership change completes in < 30 ms.

---

## 16. Debugging and Iteration

### Debug Toggles (add to UI)

```typescript
DEBUG_SHOW_FRONTIER_NODES: boolean;   // render red dots at frontier nodes
DEBUG_SHOW_LANE_FRONTIERS: boolean;   // render blue dots at lane frontier points
DEBUG_SHOW_FIELD_FRONTIERS: boolean;  // render green dots at field frontier points
DEBUG_SHOW_FRONTIER_EDGES: boolean;   // render yellow lines along frontier edges
DEBUG_SHOW_OWNERSHIP_RT: boolean;     // overlay raw ownership RT as debug texture
```

### Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Borders still look jagged | Frontier extraction is still using grid-derived centerline | Check: is code executing `buildFrontierGraph()` in canonical mode? Verify Stage 4 is wired. |
| Frontier nodes are missing on lanes | Bisection is converging to endpoints instead of interior points | Check: sign-change detection in `findRootInInterval()`. Verify candidate player selection. |
| Fill and borders misaligned | Fill is still using old ownership RT; borders use new frontier | Check: fill shader is sampling the current ownership RT fed by Stage 1 distances. |
| Conquest morph is jerky | Distance interpolation has gaps or discontinuities | Check: does lerp interpolate `distToPlayer[][]` smoothly? Are there floating-point snap-to-grid artifacts? |
| Debug toggles don't appear in UI | Settings not wired | Check: `settingsDefs.ts` has entries; UI component listens to settings state. |

---

## 17. Success Criteria Summary

This directive is complete and successful when:

1. **Canonical graph-native frontier rendering is fully implemented** (Stages 1–6).
2. **No grid-derived geometry is used in canonical mode**.
3. **Both lane and field frontiers are extracted and merged** into `FrontierGraph`.
4. **Border mesh and fills derive from the same frontier truth**.
5. **Control-panel integration is complete and responsive**.
6. **Visual output is clean, smooth, and meets the specification** (no staircase, even width, aligned fill/border, smooth morph).
7. **Legacy lattice mode is preserved as reference only** and is not the default.
8. **All acceptance criteria pass** (visual, functional, code quality, performance).

---

**This directive is binding. Do not proceed with implementation until all stages 1–4 and their interfaces are understood. When in doubt, refer back to this document and TERRITORY_ARCHITECTURE_v3.md.**

**Version**: 1.0  
**Last Updated**: 2026-03-08  
**Status**: READY FOR IMPLEMENTATION
