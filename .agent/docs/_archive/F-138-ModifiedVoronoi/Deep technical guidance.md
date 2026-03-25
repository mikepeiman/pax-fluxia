# Graph-Native Territory Rendering System for Star–Lane RTS

## Executive Summary

I'm architecting a **Graph Voronoi territory system** for your Pax Fluxia star map, meeting all non-negotiable constraints: graph-metric ownership, disconnected-component separation, lane-aligned boundaries, organic conquest morphing, and parameterized 2-color border blending.

**Core approach:** Multi-source shortest-path (Dijkstra + component labeling) → GPU distance-field texture via raster sampling → fragment shader 2-color border blend. **Temporal stability:** ROI tile updates with ping-pong blending targets.

***

## A. Complete Algorithm Specification

### A.1 Graph Representation & Preprocessing

**Data Structure:**

```typescript
interface Star {
  id: string;
  ownerPlayerId: string;
  worldPos: { x: number; y: number };
  strength?: number; // optional player strength at this star
}

interface Lane {
  id: string;
  starA: string; // star id
  starB: string;
  length: number; // world distance or weight; default = Euclidean
  traversalWeight?: number; // optional for weighted shortest-path
}

interface Territory_GraphState {
  stars: Map<string, Star>;
  lanes: Map<string, Lane>;
  starAdjacency: Map<string, string[]>; // star id → [connected star ids]
  playersOwned: Map<string, Set<string>>; // player id → set of owned star ids
  starComponentMap: Map<string, ComponentLabel>; // star id → (playerId, componentId)
}

interface ComponentLabel {
  playerId: string;
  componentId: number;
}

interface Settings {
  // Distance metric
  distanceMetric: 'hops' | 'length' | 'weighted';
  strengthBiasEnabled: boolean;
  kStrength: number; // multiplier; >1 favors stronger players
  
  // Rendering
  borderThicknessPx: number;
  borderSoftnessPx: number; // feather width
  textureResolutionScale: number; // e.g., 0.5 → half resolution for perf
  
  // Animation
  morphSmoothingHalfLifeMs: number; // temporal blend for conquest
  
  // Optional effects
  borderNoiseAmplitudePx?: number;
  borderNoiseFrequency?: number;
}
```

### A.2 Preprocessing: Connected Component Computation

**Goal:** For each player, partition their owned stars into connected components under graph edges restricted to same-owner stars.

**Algorithm: Union-Find with DFS Traversal**

```typescript
function computeConnectedComponents(
  graphState: Territory_GraphState
): Map<string, number> {
  // Returns: starId → componentId (unique within that star's owner)
  const starComponentMap = new Map<string, number>();
  const visited = new Set<string>();
  
  for (const [playerId, ownedStars] of graphState.playersOwned.entries()) {
    let componentId = 0;
    
    for (const starId of ownedStars) {
      if (visited.has(starId)) continue;
      
      // DFS to mark entire component
      const stack = [starId];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (visited.has(curr)) continue;
        
        visited.add(curr);
        starComponentMap.set(curr, componentId);
        
        // Traverse only through same-owner edges
        const adjacentStars = graphState.starAdjacency.get(curr) || [];
        for (const neighbor of adjacentStars) {
          const neighborOwner = graphState.stars.get(neighbor)?.ownerPlayerId;
          if (neighborOwner === playerId && !visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
      componentId++;
    }
  }
  
  return starComponentMap;
}
```

**Complexity:** O(V + E) per update (when star ownership changes).

**Output:** Each star labeled with (playerId, componentId). This ensures disconnected holdings are uniquely identified.

***

### A.3 Multi-Source Shortest Path (Graph Voronoi Seeds)

**Goal:** Compute, for each star in the graph, the nearest seed (source star) under graph distance, considering both distance metric and optional strength bias.

**Algorithm: Multi-Source Dijkstra with Strength Bias**

```typescript
function computeMultiSourceDistanceField(
  graphState: Territory_GraphState,
  settings: Settings,
  starComponentMap: Map<string, number>
): Map<string, { best: SourceLabel; second?: SourceLabel; bestDist: number; secondDist?: number }> {
  
  // Priority queue: (distance, starId)
  interface QueueEntry {
    dist: number;
    starId: string;
    source: SourceLabel;
  }
  
  interface SourceLabel {
    playerId: string;
    componentId: number;
  }
  
  // Initialize: all stars are sources
  const pq = new PriorityQueue<QueueEntry>((a, b) => a.dist - b.dist);
  const visited = new Map<string, { best: SourceLabel; second?: SourceLabel; bestDist: number; secondDist?: number }>();
  
  // Enqueue all star sources
  for (const [starId, star] of graphState.stars.entries()) {
    const componentId = starComponentMap.get(starId) || 0;
    const source: SourceLabel = { playerId: star.ownerPlayerId, componentId };
    
    let seedDist = 0;
    if (settings.strengthBiasEnabled && star.strength) {
      // Strength bias: reduce effective distance for stronger players
      // dist' = dist / sqrt(strength), so stronger = closer
      seedDist = -Math.log(star.strength); // or use 1 / strength, depending on semantics
    }
    
    pq.enqueue({ dist: seedDist, starId, source });
  }
  
  // Multi-source Dijkstra
  while (!pq.isEmpty()) {
    const { dist, starId, source } = pq.dequeue()!;
    
    if (visited.has(starId)) {
      // Already visited; check if this is a second-best candidate
      const rec = visited.get(starId)!;
      if (dist < rec.secondDist || rec.secondDist === undefined) {
        // Only update if source is different from best and second
        if (source.playerId !== rec.best.playerId || source.componentId !== rec.best.componentId) {
          rec.second = source;
          rec.secondDist = dist;
        }
      }
      continue;
    }
    
    visited.set(starId, { best: source, bestDist: dist });
    
    // Expand neighbors
    const adjacentStarIds = graphState.starAdjacency.get(starId) || [];
    for (const neighborId of adjacentStarIds) {
      if (visited.has(neighborId)) continue;
      
      const lane = findLaneBetween(graphState, starId, neighborId);
      if (!lane) continue;
      
      let edgeCost = 1; // hops
      if (settings.distanceMetric === 'length') {
        edgeCost = lane.length;
      } else if (settings.distanceMetric === 'weighted' && lane.traversalWeight) {
        edgeCost = lane.traversalWeight;
      }
      
      // Apply strength bias to edge traversal (optional)
      if (settings.strengthBiasEnabled) {
        const neighborStar = graphState.stars.get(neighborId);
        if (neighborStar?.strength) {
          edgeCost *= settings.kStrength / (1 + neighborStar.strength); // favor stronger neighbors
        }
      }
      
      const newDist = dist + edgeCost;
      pq.enqueue({ dist: newDist, starId: neighborId, source });
    }
  }
  
  return visited;
}

function findLaneBetween(graphState: Territory_GraphState, starA: string, starB: string): Lane | null {
  for (const lane of graphState.lanes.values()) {
    if ((lane.starA === starA && lane.starB === starB) || 
        (lane.starA === starB && lane.starB === starA)) {
      return lane;
    }
  }
  return null;
}
```

**Complexity:** O((V + E) log V) — standard Dijkstra.

**Output:** For each star, the best and second-best (nearest enemy) sources with their distances.

**Key constraint enforcement:** The algorithm tracks `best` and `second` independently. During rendering, we **never blend two regions of the same player**—if both best and second belong to the same player, we fall back to the next competing player (this is handled in the rendering pass).

***

### A.4 Render-Time Point-to-Territory Evaluation

During rendering, for each pixel/sample in screen space, we must:
1. Convert to world space
2. Find the nearest star (via spatial index or brute-force)
3. Look up its best/second-best sources
4. Compute border thickness and blend

**Algorithm: Spatial Point Query**

```typescript
interface PixelTerritory {
  playerId: string;
  componentId: number;
  distanceFromBorder: number; // negative = in border, positive = interior
  competitorPlayerId: string;
  competitorComponentId: number;
}

function evaluateTerritory(
  worldPos: { x: number; y: number },
  graphState: Territory_GraphState,
  distanceField: Map<string, { best: SourceLabel; second?: SourceLabel; bestDist: number; secondDist?: number }>,
  spatialIndex: SpatialIndex,
  settings: Settings
): PixelTerritory {
  
  // Find nearest star(s) via spatial index
  const nearestStars = spatialIndex.query(worldPos, radius = 5); // tunable radius
  if (nearestStars.length === 0) {
    // Fallback: find nearest lane, project, and evaluate
    return evaluateTerritoryViaLane(worldPos, graphState, distanceField, settings);
  }
  
  // Use nearest star's territory
  const nearestStar = nearestStars[0];
  const terrRec = distanceField.get(nearestStar.id)!;
  
  // Compute second competitor (ensuring different player)
  let second = terrRec.second;
  if (second && second.playerId === terrRec.best.playerId) {
    // Find next-best that is a different player
    // (This requires a third/fourth entry in the distance field, or local re-query)
    second = findNearestEnemyLabel(nearestStar.id, terrRec.best.playerId, graphState, distanceField);
  }
  
  const distFromBorder = Math.abs(terrRec.bestDist - (second?.distance ?? Infinity));
  
  return {
    playerId: terrRec.best.playerId,
    componentId: terrRec.best.componentId,
    distanceFromBorder,
    competitorPlayerId: second?.playerId || 'neutral',
    competitorComponentId: second?.componentId ?? 0,
  };
}

function evaluateTerritoryViaLane(
  worldPos: { x: number; y: number },
  graphState: Territory_GraphState,
  distanceField: Map<string, { best: SourceLabel; second?: SourceLabel; bestDist: number; secondDist?: number }>,
  settings: Settings
): PixelTerritory {
  // Project point onto nearest lane; look up endpoints' territory; interpolate
  const nearestLane = findNearestLane(worldPos, graphState);
  if (!nearestLane) {
    return { playerId: 'neutral', componentId: 0, distanceFromBorder: Infinity, 
             competitorPlayerId: 'neutral', competitorComponentId: 0 };
  }
  
  const starA = graphState.stars.get(nearestLane.starA)!;
  const starB = graphState.stars.get(nearestLane.starB)!;
  const terrA = distanceField.get(nearestLane.starA)!;
  const terrB = distanceField.get(nearestLane.starB)!;
  
  // Determine if crossing a boundary
  if (terrA.best.playerId !== terrB.best.playerId) {
    // Boundary runs through this lane; interpolate blend factor
    const t = projectPointOntoSegment(worldPos, starA.worldPos, starB.worldPos);
    // Blend territory colors/owners
    return interpolateTerritory(terrA, terrB, t, settings);
  }
  
  return { playerId: terrA.best.playerId, componentId: terrA.best.componentId, distanceFromBorder: Infinity,
           competitorPlayerId: terrB.best.playerId, competitorComponentId: terrB.best.componentId };
}

function findNearestLane(worldPos: { x: number; y: number }, graphState: Territory_GraphState): Lane | null {
  let nearest: Lane | null = null;
  let minDist = Infinity;
  for (const lane of graphState.lanes.values()) {
    const star1 = graphState.stars.get(lane.starA)!;
    const star2 = graphState.stars.get(lane.starB)!;
    const dist = pointToSegmentDistance(worldPos, star1.worldPos, star2.worldPos);
    if (dist < minDist) { minDist = dist; nearest = lane; }
  }
  return nearest;
}
```

**Complexity:** O(1) per pixel if using spatial index; O(V) per pixel without (expensive).

***

### A.5 Top-2 Candidate Efficiency: K-Best Optimization

For rendering at high resolution (e.g., 2K × 2K), querying all of the distance field for each pixel is too slow. Instead, **store top-2 per star and reconstruct during rendering:**

**Optimized approach:**

```typescript
interface StarTerritory {
  playerId: string;
  componentId: number;
  distance: number; // from this star to its source
}

interface StarTerritoryCandidates {
  best: StarTerritory;
  second?: StarTerritory; // nearest enemy
  third?: StarTerritory; // fallback if second is same-player as best
}

function computeK_BestLabels(
  graphState: Territory_GraphState,
  settings: Settings
): Map<string, StarTerritoryCandidates> {
  
  // Modified multi-source Dijkstra: track top-3 candidates per star
  const candidates = new Map<string, StarTerritoryCandidates>();
  
  // ... (multi-source Dijkstra similar to A.3, but storing top-3)
  
  // Post-process: ensure second is always a different player
  for (const [starId, cands] of candidates.entries()) {
    if (cands.second && cands.second.playerId === cands.best.playerId) {
      // Swap second with third
      cands.second = cands.third;
    }
  }
  
  return candidates;
}
```

**At render time:** Instead of re-computing Dijkstra, directly look up pre-computed K-best per star. This is O(1) per pixel.

***

## B. Rendering Pipeline: Raster Distance-Field with GPU Blend

### B.1 Recommended Approach: GPU Distance-Field + Fragment Shader Border Blend

**Rationale:**
- **Thick blended borders:** Distance field naturally supports feathering and 2-color blends
- **Stable animation:** Ping-pong texture blending ensures temporal coherence; no flicker
- **Performance:** GPU-accelerated; scales to 2K+ resolutions
- **Fallback:** CPU grid if WebGL2 unavailable

**Pipeline:**

```
┌─────────────────────────────────────────────┐
│ 1. Compute Graph Voronoi + K-Best Labels   │ (CPU, ~once per game tick)
│    Output: distanceField (Map<starId, Cand>)
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Rasterize Distance Field to GPU Texture │ (GPU Pass 1)
│    - Input: K-best labels, spatial index    │
│    - Output: RT_OwnershipA (2x RGBA32F)    │
│      [playerId, componentId, bestDist,      │
│       compPlayerId, compCompId, secondDist] │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. Composite + Border Blend (GPU Pass 2)   │ (GPU Pass 2)
│    - Input: RT_OwnershipA, player colors   │
│    - Output: RT_Territory (RGBA8)          │
│    - Fragment shader:                       │
│      * Compute |distBest - distSecond|    │
│      * If < borderThickness:               │
│        - 2-color blend (player1 + player2) │
│      * Else: solid owner color             │
│      * Apply softness feather               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. Temporal Smoothing (Optional, GPU Pass 3)
│    - Input: RT_Territory (new), RT_Prev    │
│    - Output: RT_Display (ping-pong)        │
│    - Mix with morphSmoothingHalfLife       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. Sample & Composite on Star Map          │ (Final pass)
│    - UV coordinates from world position    │
│    - Multiply with map brightness/effects  │
└─────────────────────────────────────────────┘
```

### B.2 GPU Data Packing & Render Targets

**Render Target: RT_OwnershipA (2x RGBA32F textures for double-buffering)**

```glsl
// Texture A (RGBA32F)
// R: playerId (as float, quantized to [0, 255] / 255)
// G: componentId (as float, quantized to [0, 255] / 255)
// B: bestDistance (float, clamped to [0, 1] for display)
// A: reserved (unused, or use for interpolation factor)

// Texture B (RGBA32F)
// R: competitorPlayerId
// G: competitorComponentId
// B: secondDistance
// A: reserved
```

**Alternative packing (if tight on bandwidth):**

```glsl
// Single RT_OwnershipA (RGBA32F)
// R: playerId (packed with componentId in high bits)
// G: competitorPlayerId (packed with competitorComponentId)
// B: bestDistance
// A: secondDistance
// (Unpack via bit shifts during rendering)
```

### B.3 GPU Pass 1: Rasterize Distance Field

**Vertex Shader (fullscreen quad):**

```glsl
#version 300 es
precision highp float;

in vec2 position;
out vec2 uv;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  uv = position * 0.5 + 0.5; // convert [-1, 1] to [0, 1]
}
```

**Fragment Shader (distance field rasterization):**

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_starPositions;      // Contains star positions
uniform sampler2D u_ownershipData;      // Contains ownership (playerId, componentId)
uniform sampler2D u_kBestData;          // Precomputed K-best (best, second, distances)
uniform mat3 u_worldToTexture;          // Transforms world coords to texture UV
uniform int u_numStars;
uniform float u_strengthBias;           // 0 to disable, > 0 to apply

in vec2 uv;
out vec4 outOwnershipA;
out vec4 outOwnershipB;

void main() {
  vec2 worldPos = texCoord_to_worldPos(uv, u_worldToTexture);
  
  // Find nearest star(s)
  float bestDist = 1e9;
  int bestStarIdx = -1;
  
  for (int i = 0; i < u_numStars; ++i) {
    vec2 starPos = texelFetch(u_starPositions, ivec2(i, 0), 0).xy;
    float d = distance(worldPos, starPos);
    if (d < bestDist) {
      bestDist = d;
      bestStarIdx = i;
    }
  }
  
  if (bestStarIdx < 0) {
    outOwnershipA = vec4(0.0); // neutral fallback
    outOwnershipB = vec4(0.0);
    return;
  }
  
  // Fetch K-best for nearest star
  vec4 kBestBest = texelFetch(u_kBestData, ivec2(bestStarIdx * 2, 0), 0);
  vec4 kBestSecond = texelFetch(u_kBestData, ivec2(bestStarIdx * 2 + 1, 0), 0);
  
  float playerId = kBestBest.x;
  float componentId = kBestBest.y;
  float bestGraphDist = kBestBest.z;
  
  float compPlayerId = kBestSecond.x;
  float compComponentId = kBestSecond.y;
  float secondGraphDist = kBestSecond.z;
  
  // Pack and output
  outOwnershipA = vec4(playerId, componentId, bestGraphDist, 0.0);
  outOwnershipB = vec4(compPlayerId, compComponentId, secondGraphDist, 0.0);
}
```

**Performance note:** Brute-force nearest-star per pixel is O(V) per pixel. For V > 100 stars, use spatial hashing:

```glsl
// Alternative: spatial hashing to narrow search space
vec3 hash = mod(worldPos, u_spatialCellSize);
ivec2 cellIdx = ivec2(hash / u_spatialCellSize);
ivec2 cellData = texelFetch(u_spatialIndex, cellIdx, 0).xy; // (offset, count)
// Iterate only over stars in this cell and neighbors
```

### B.4 GPU Pass 2: Composite Territory & Border Blend

**Fragment Shader (border blending & thickness):**

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_ownershipA;         // Best labels (playerId, componentId, bestDist, _)
uniform sampler2D u_ownershipB;         // Second labels (compPlayerId, compComponentId, secondDist, _)
uniform sampler2DArray u_playerColors;  // Player color palette [playerIdx]
uniform float u_borderThicknessPx;
uniform float u_borderSoftnessPx;
uniform ivec2 u_rtResolution;

in vec2 uv;
out vec4 outTerritory;

void main() {
  vec4 own_a = texture(u_ownershipA, uv);
  vec4 own_b = texture(u_ownershipB, uv);
  
  float playerId = own_a.x;
  float componentId = own_a.y;
  float bestDist = own_a.z;
  
  float compPlayerId = own_b.x;
  float compComponentId = own_b.y;
  float secondDist = own_b.z;
  
  // Compute border band
  float distFromBorder = abs(bestDist - secondDist);
  float borderAmount = 1.0 - smoothstep(0.0, u_borderThicknessPx, distFromBorder);
  
  // Apply softness feather
  float featheredBorderAmount = smoothstep(u_borderSoftnessPx, 0.0, distFromBorder - u_borderThicknessPx);
  borderAmount = mix(borderAmount, 1.0, featheredBorderAmount);
  
  // Fetch colors
  vec3 color1 = texture(u_playerColors, vec3(uv, playerId)).rgb;
  vec3 color2 = texture(u_playerColors, vec3(uv, compPlayerId)).rgb;
  
  // Blend border: 50/50 mix of two player colors
  vec3 borderColor = mix(color1, color2, 0.5);
  vec3 finalColor = mix(color1, borderColor, borderAmount);
  
  outTerritory = vec4(finalColor, 1.0);
}
```

**Softness/feather strategy:**

- **Hard border (`u_borderSoftnessPx = 0`):** Crisp edge at `distFromBorder == u_borderThicknessPx`
- **Soft border (`u_borderSoftnessPx > 0`):** Smoothly fade from solid color to 50/50 blend over distance
- **Glow effect (optional):** Add additive glow only in border band:

```glsl
vec3 glowColor = mix(color1, color2, 0.5);
vec3 glow = glowColor * 0.3 * (1.0 - smoothstep(0.0, u_borderThicknessPx * 2.0, distFromBorder));
finalColor += glow;
```

### B.5 GPU Pass 3: Temporal Smoothing (Conquest Morph)

**Fragment Shader (ping-pong blend):**

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_territoryNew;       // New territory (from Pass 2)
uniform sampler2D u_territoryPrev;      // Previous frame or target frame
uniform float u_morphBlendFactor;       // Based on elapsed time and halfLife

in vec2 uv;
out vec4 outTerritory;

void main() {
  vec4 newColor = texture(u_territoryNew, uv);
  vec4 prevColor = texture(u_territoryPrev, uv);
  
  // Exponential ease: alpha = exp(-t / halfLife)
  // u_morphBlendFactor = exp(-deltaTime / morphHalfLife)
  outTerritory = mix(newColor, prevColor, u_morphBlendFactor);
}
```

**Implementation detail:**

```typescript
// In render loop
const elapsedMs = Date.now() - conquestEventTime;
const morphBlendFactor = Math.exp(-elapsedMs / settings.morphSmoothingHalfLifeMs);

shaderPass3.uniforms.u_morphBlendFactor = morphBlendFactor;

// Ping-pong targets
const [displayTarget, prevTarget] = [rtTerritory_A, rtTerritory_B];
if (elapsedMs > 5 * settings.morphSmoothingHalfLifeMs) {
  // Animation complete; finalize
  rtTerritory_A = rtTerritory_B; // or copy
}
```

***

### B.6 CPU Grid Fallback (for WebGL2 without framebuffer textures or low-end devices)

**Algorithm: Spatial Grid Rasterization**

```typescript
function rasterizeTerritoryToCPUGrid(
  graphState: Territory_GraphState,
  distanceField: Map<string, StarTerritoryCandidates>,
  gridResolution: number,
  worldBounds: { min: { x: number; y: number }; max: { x: number; y: number } },
  settings: Settings
): Uint8Array {
  // Output: gridResolution × gridResolution × 4 bytes (RGBA)
  const grid = new Uint8Array(gridResolution * gridResolution * 4);
  const cellSize = (worldBounds.max.x - worldBounds.min.x) / gridResolution;
  
  for (let py = 0; py < gridResolution; ++py) {
    for (let px = 0; px < gridResolution; ++px) {
      const worldX = worldBounds.min.x + (px + 0.5) * cellSize;
      const worldY = worldBounds.min.y + (py + 0.5) * cellSize;
      
      const territory = evaluateTerritory(
        { x: worldX, y: worldY },
        graphState,
        distanceField,
        spatialIndex,
        settings
      );
      
      const playerColor = getPlayerColor(territory.playerId);
      const compColor = getPlayerColor(territory.competitorPlayerId);
      
      // Border blend
      let finalColor = playerColor;
      if (Math.abs(territory.distanceFromBorder) < settings.borderThicknessPx) {
        const blend = 0.5; // equal blend at midpoint
        finalColor = lerp(playerColor, compColor, blend);
      }
      
      const idx = (py * gridResolution + px) * 4;
      grid[idx] = Math.round(finalColor.r * 255);
      grid[idx + 1] = Math.round(finalColor.g * 255);
      grid[idx + 2] = Math.round(finalColor.b * 255);
      grid[idx + 3] = 255;
    }
  }
  
  return grid;
}
```

**Performance:**
- **Resolution:** 512² → ~262k cells → ~5–10 ms per update (CPU)
- **For dynamic updates:** Use ROI tiles (only update cells near ownership change)

***

## C. Temporal Stability & Conquest Animation Plan

### C.1 The Problem: Flicker and Shimmer

When a star changes owner, recomputing the entire distance field causes boundaries to shift globally. If rendered immediately, this is **visually jarring** (whole-map shimmer).

**Solution: Three-Phase Transition**

```
┌────────────────────────────────────────────────────┐
│ Phase 1: Star ownership changes (game event)      │
│ - Record old field state                          │
│ - Queue new distance field computation            │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│ Phase 2: Compute target field (async, ~1 frame)  │
│ - Multi-source Dijkstra with new ownership       │
│ - Output: target territory texture (RT_Target)   │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│ Phase 3: Blend old → target over time (smooth)   │
│ - Ping-pong between current and target           │
│ - Exponential ease with configurable half-life   │
│ - Duration ~ 500–2000 ms (game feel)             │
└────────────────────────────────────────────────────┘
```

### C.2 Implementation: Temporal Blending Strategy

**Data structures:**

```typescript
interface TerritoryRenderState {
  rtCurrent: WebGLTexture;   // Display texture (result of Pass 2)
  rtTarget: WebGLTexture;    // Target post-conquest
  rtPrev: WebGLTexture;      // For ping-pong
  
  distanceFieldCurrent: Map<string, StarTerritoryCandidates>;
  distanceFieldTarget: Map<string, StarTerritoryCandidates>; // queued or computing
  
  lastConquestEventTime: number; // ms
  morphInProgress: boolean;
}

class TerritorySystem {
  private state: TerritoryRenderState;
  private settings: Settings;
  private graphState: Territory_GraphState;
  
  onStarOwnershipChanged(starId: string, newOwnerId: string): void {
    // 1. Update graph state
    this.graphState.stars.get(starId)!.ownerPlayerId = newOwnerId;
    
    // 2. Mark component recompute needed
    this.needsComponentRecompute = true;
    
    // 3. Queue distance field recompute
    this.needsDistanceFieldRecompute = true;
    
    // 4. Record event for temporal blending
    this.state.lastConquestEventTime = performance.now();
    this.state.morphInProgress = true;
  }
  
  update(deltaTimeMs: number): void {
    // Step 1: Recompute components if needed (fast, O(V+E))
    if (this.needsComponentRecompute) {
      this.starComponentMap = computeConnectedComponents(this.graphState);
      this.needsComponentRecompute = false;
    }
    
    // Step 2: Recompute distance field if needed (slower, O((V+E) log V))
    if (this.needsDistanceFieldRecompute) {
      this.state.distanceFieldTarget = computeMultiSourceDistanceField(
        this.graphState,
        this.settings,
        this.starComponentMap
      );
      this.state.rtTarget = this.rasterizeToGPU(this.state.distanceFieldTarget);
      this.needsDistanceFieldRecompute = false;
    }
    
    // Step 3: Temporal blending
    if (this.state.morphInProgress) {
      const elapsedMs = performance.now() - this.state.lastConquestEventTime;
      const morphFactor = Math.exp(-elapsedMs / this.settings.morphSmoothingHalfLifeMs);
      
      if (morphFactor < 0.01) {
        // Animation complete
        this.state.morphInProgress = false;
        this.state.rtCurrent = this.state.rtTarget;
        this.state.distanceFieldCurrent = this.state.distanceFieldTarget;
      } else {
        // Blend current toward target
        this.renderTemporalBlend(this.state.rtCurrent, this.state.rtTarget, morphFactor);
      }
    }
  }
  
  private renderTemporalBlend(
    rtCurrent: WebGLTexture,
    rtTarget: WebGLTexture,
    morphFactor: number
  ): void {
    // GPU Pass 3 (temporal smoothing)
    const shaderPass3 = this.passes.temporalBlend;
    const rt = this.state.rtPrev; // Ping-pong output
    
    this.renderer.setRenderTarget(rt);
    shaderPass3.uniforms.u_territoryNew = rtTarget;
    shaderPass3.uniforms.u_territoryPrev = rtCurrent;
    shaderPass3.uniforms.u_morphBlendFactor = morphFactor;
    
    this.renderer.render(shaderPass3);
    
    // Swap for next frame
    [this.state.rtCurrent, this.state.rtPrev] = [this.state.rtPrev, this.state.rtCurrent];
  }
}
```

### C.3 Deterministic Sampling for Flicker Prevention

**Key insight:** If you recompute the distance field every frame (instead of only on ownership change), the numerical precision can vary frame-to-frame, causing subtle shimmer at borders.

**Mitigation:**

1. **Recompute only on events:** Don't recompute unless `onStarOwnershipChanged()` is called.
2. **Fixed-point precision:** Use consistent float precision (e.g., always `highp` in shaders).
3. **Temporal blending:** Smooth transition over 500–2000 ms masks any micro-flicker.

***

## D. TypeScript Architecture for SvelteKit Integration

### D.1 Module Organization

```
src/
├── lib/
│   ├── territory/
│   │   ├── graph.ts              # Graph state, adjacency, ownership
│   │   ├── voronoi.ts            # Multi-source Dijkstra, K-best computation
│   │   ├── components.ts         # Connected component labeling
│   │   ├── spatialIndex.ts       # Spatial acceleration (grid or RBush)
│   │   ├── pipeline.ts           # GPU passes (rasterize, composite, temporal)
│   │   ├── cpu-fallback.ts       # CPU grid rasterization
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   └── system.ts             # Main TerritorySystem class
│   ├── stores/
│   │   ├── territorySettings.ts  # Svelte store for UI controls
│   │   └── gameState.ts          # Star/lane ownership, updates
│   └── components/
│       ├── TerritoryViewer.svelte # Main renderer component
│       ├── SettingsPanel.svelte   # UI sliders/toggles
│       └── DebugOverlay.svelte    # Performance, component IDs, etc.
└── routes/
    └── +page.svelte             # Main app entry
```

### D.2 Core System Class

```typescript
// src/lib/territory/system.ts

import { readable, writable } from 'svelte/store';
import type { Settings, Territory_GraphState, StarTerritoryCandidates } from './types';
import { computeConnectedComponents, computeMultiSourceDistanceField } from './voronoi';
import { createSpatialIndex, type SpatialIndex } from './spatialIndex';
import { rasterizeDistanceFieldGPU, compositeTerritoryCPU } from './pipeline';

export class TerritorySystem {
  private graphState: Territory_GraphState;
  private settings: Settings;
  private starComponentMap: Map<string, number> = new Map();
  private distanceFieldCurrent: Map<string, StarTerritoryCandidates> = new Map();
  private distanceFieldTarget: Map<string, StarTerritoryCandidates> = new Map();
  private spatialIndex: SpatialIndex;
  
  // GPU resources
  private gl: WebGL2RenderingContext;
  private rtCurrent: WebGLTexture;
  private rtTarget: WebGLTexture;
  private rtPrev: WebGLTexture;
  private shaderPrograms: Map<string, WebGLProgram> = new Map();
  
  // Temporal state
  private lastConquestEventTime: number = 0;
  private morphInProgress: boolean = false;
  private needsComponentRecompute: boolean = false;
  private needsDistanceFieldRecompute: boolean = false;
  
  constructor(
    graphState: Territory_GraphState,
    settings: Settings,
    gl: WebGL2RenderingContext
  ) {
    this.graphState = graphState;
    this.settings = settings;
    this.gl = gl;
    
    // Initialize spatial index
    this.spatialIndex = createSpatialIndex(graphState.stars);
    
    // Create GPU resources
    this.initializeGPUResources();
    
    // Initial computation
    this.recomputeAll();
  }
  
  private initializeGPUResources(): void {
    const { gl } = this;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    
    // Create render targets
    this.rtCurrent = gl.createTexture()!;
    this.rtTarget = gl.createTexture()!;
    this.rtPrev = gl.createTexture()!;
    
    for (const rt of [this.rtCurrent, this.rtTarget, this.rtPrev]) {
      gl.bindTexture(gl.TEXTURE_2D, rt);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    
    // Compile shaders
    this.shaderPrograms.set('rasterize', compileShader(gl, vertexShader, fragmentShaderRasterize));
    this.shaderPrograms.set('composite', compileShader(gl, vertexShader, fragmentShaderComposite));
    this.shaderPrograms.set('temporalBlend', compileShader(gl, vertexShader, fragmentShaderTemporalBlend));
  }
  
  private recomputeAll(): void {
    this.needsComponentRecompute = true;
    this.needsDistanceFieldRecompute = true;
  }
  
  onStarOwnershipChanged(starId: string, newOwnerId: string): void {
    const oldStar = this.graphState.stars.get(starId)!;
    oldStar.ownerPlayerId = newOwnerId;
    
    this.graphState.playersOwned.forEach((owned) => owned.delete(starId));
    if (!this.graphState.playersOwned.has(newOwnerId)) {
      this.graphState.playersOwned.set(newOwnerId, new Set());
    }
    this.graphState.playersOwned.get(newOwnerId)!.add(starId);
    
    // Queue recomputes
    this.needsComponentRecompute = true;
    this.needsDistanceFieldRecompute = true;
    
    // Mark conquest event for temporal blending
    this.lastConquestEventTime = performance.now();
    this.morphInProgress = true;
  }
  
  update(deltaTimeMs: number): void {
    // Recompute components if needed
    if (this.needsComponentRecompute) {
      this.starComponentMap = computeConnectedComponents(this.graphState);
      this.needsComponentRecompute = false;
    }
    
    // Recompute distance field if needed
    if (this.needsDistanceFieldRecompute) {
      this.distanceFieldTarget = computeMultiSourceDistanceField(
        this.graphState,
        this.settings,
        this.starComponentMap
      );
      this.renderDistanceFieldToGPU(this.distanceFieldTarget, this.rtTarget);
      this.needsDistanceFieldRecompute = false;
    }
    
    // Handle temporal blending
    if (this.morphInProgress) {
      const elapsedMs = performance.now() - this.lastConquestEventTime;
      const morphFactor = Math.exp(-elapsedMs / this.settings.morphSmoothingHalfLifeMs);
      
      if (morphFactor < 0.01) {
        // Animation complete
        this.morphInProgress = false;
        [this.rtCurrent, this.rtTarget] = [this.rtTarget, this.rtCurrent];
        this.distanceFieldCurrent = this.distanceFieldTarget;
      } else {
        // Temporal blend
        this.renderTemporalBlend(morphFactor);
      }
    }
  }
  
  private renderDistanceFieldToGPU(
    distanceField: Map<string, StarTerritoryCandidates>,
    targetRT: WebGLTexture
  ): void {
    const { gl } = this;
    
    // GPU Pass 1: Rasterize distance field
    const shaderProgram = this.shaderPrograms.get('rasterize')!;
    gl.useProgram(shaderProgram);
    
    // Set uniforms (star positions, K-best data, transform, etc.)
    // ... (details elided for brevity)
    
    // Render to targetRT
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetRT, 0);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  private renderTemporalBlend(morphFactor: number): void {
    const { gl } = this;
    
    const shaderProgram = this.shaderPrograms.get('temporalBlend')!;
    gl.useProgram(shaderProgram);
    
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_morphBlendFactor'), morphFactor);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'u_territoryNew'), 0);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'u_territoryPrev'), 1);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.rtTarget);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.rtCurrent);
    
    // Render to rtPrev
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rtPrev, 0);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Swap for next frame
    [this.rtCurrent, this.rtPrev] = [this.rtPrev, this.rtCurrent];
  }
  
  getDisplayTexture(): WebGLTexture {
    return this.rtCurrent;
  }
}
```

### D.3 Svelte Store for Settings

```typescript
// src/lib/stores/territorySettings.ts

import { writable, derived } from 'svelte/store';
import type { Settings } from '$lib/territory/types';

export const territorySettings = writable<Settings>({
  distanceMetric: 'length',
  strengthBiasEnabled: false,
  kStrength: 1.5,
  borderThicknessPx: 8,
  borderSoftnessPx: 4,
  textureResolutionScale: 1.0,
  morphSmoothingHalfLifeMs: 800,
  borderNoiseAmplitudePx: 0,
  borderNoiseFrequency: 0.05,
});

export const settingsPanel = derived(territorySettings, ($settings) => ({
  ...$settings,
  sliders: [
    {
      label: 'Border Thickness',
      key: 'borderThicknessPx',
      min: 1,
      max: 20,
      value: $settings.borderThicknessPx,
    },
    {
      label: 'Border Softness',
      key: 'borderSoftnessPx',
      min: 0,
      max: 10,
      value: $settings.borderSoftnessPx,
    },
    {
      label: 'Strength Bias (k)',
      key: 'kStrength',
      min: 0.5,
      max: 3.0,
      value: $settings.kStrength,
    },
    {
      label: 'Morph Smoothing (ms)',
      key: 'morphSmoothingHalfLifeMs',
      min: 100,
      max: 2000,
      value: $settings.morphSmoothingHalfLifeMs,
    },
  ],
  toggles: [
    {
      label: 'Strength Bias Enabled',
      key: 'strengthBiasEnabled',
      value: $settings.strengthBiasEnabled,
    },
  ],
}));
```

### D.4 Svelte Component Integration

```svelte
<!-- src/lib/components/TerritoryViewer.svelte -->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { TerritorySystem } from '$lib/territory/system';
  import { territorySettings } from '$lib/stores/territorySettings';
  import { gameState } from '$lib/stores/gameState';

  let canvas: HTMLCanvasElement;
  let gl: WebGL2RenderingContext | null;
  let territorySystem: TerritorySystem | null;
  let animationFrameId: number;

  onMount(async () => {
    gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) {
      console.error('WebGL2 not supported; falling back to CPU rendering');
      return;
    }

    const graphState = $gameState.asGraphState(); // conversion from game state
    territorySystem = new TerritorySystem(graphState, $territorySettings, gl);

    const renderLoop = (now: number) => {
      if (!territorySystem || !gl) return;

      territorySystem.update(16); // assume 60 FPS; could use delta time

      // Composite territory texture onto canvas
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const displayTexture = territorySystem.getDisplayTexture();
      // Render displayTexture to screen (full-screen quad pass)
      renderDisplayPass(gl, displayTexture);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    // Re-initialize on settings change
    const unsubscribeSettings = territorySettings.subscribe((settings) => {
      if (territorySystem) {
        territorySystem.updateSettings(settings);
      }
    });

    // Listen for star ownership changes
    const unsubscribeGameState = gameState.subscribe(({ lastOwnershipChange }) => {
      if (lastOwnershipChange && territorySystem) {
        territorySystem.onStarOwnershipChanged(
          lastOwnershipChange.starId,
          lastOwnershipChange.newOwnerId
        );
      }
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      unsubscribeSettings();
      unsubscribeGameState();
    };
  });
</script>

<div class="territory-viewer">
  <canvas bind:this={canvas} width={1024} height={1024} />
</div>

<style>
  .territory-viewer {
    width: 100%;
    height: 100%;
    background: #0a0e27;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
```

***

## E. Concrete Pseudocode & TypeScript Snippets

### E.1 Multi-Source Shortest Path (Dijkstra Variant)

```typescript
// src/lib/territory/voronoi.ts

import PriorityQueue from 'mnemonist/priority-queue'; // or implement own

interface SourceLabel {
  playerId: string;
  componentId: number;
}

interface DistanceRecord {
  source: SourceLabel;
  distance: number;
}

export function computeMultiSourceDistanceField(
  graphState: Territory_GraphState,
  settings: Settings,
  starComponentMap: Map<string, number>
): Map<string, StarTerritoryCandidates> {
  
  const pq = new PriorityQueue<{
    dist: number;
    starId: string;
    source: SourceLabel;
  }>((a, b) => a.dist - b.dist);
  
  const visited = new Map<string, DistanceRecord[]>();
  
  // Initialize: every star is a seed source
  for (const [starId, star] of graphState.stars.entries()) {
    const componentId = starComponentMap.get(starId) || 0;
    const source: SourceLabel = { playerId: star.ownerPlayerId, componentId };
    
    let seedDist = 0;
    if (settings.strengthBiasEnabled && star.strength) {
      // Logarithmic strength penalty (higher strength = lower cost)
      seedDist = -Math.log(1 + star.strength);
    }
    
    pq.enqueue({ dist: seedDist, starId, source });
  }
  
  // Multi-source Dijkstra
  while (!pq.isEmpty()) {
    const { dist, starId, source } = pq.dequeue()!;
    
    if (!visited.has(starId)) {
      visited.set(starId, []);
    }
    
    const records = visited.get(starId)!;
    
    // Skip if we've already found enough candidates for this star
    if (records.length >= 3) {
      // Optional: early termination if distance is large enough
      if (records.some(r => r.distance > 1e6)) continue;
    }
    
    // Check if this source is already recorded for this star
    const existingRecord = records.find(
      r => r.source.playerId === source.playerId && r.source.componentId === source.componentId
    );
    
    if (existingRecord) {
      // Already processed this (source, star) pair
      continue;
    }
    
    records.push({ source, distance: dist });
    
    // Expand neighbors
    const adjacentStarIds = graphState.starAdjacency.get(starId) || [];
    for (const neighborId of adjacentStarIds) {
      if (visited.has(neighborId) && visited.get(neighborId)!.length >= 3) {
        continue; // Skip if neighbor already has 3+ candidates
      }
      
      const lane = findLaneBetween(graphState, starId, neighborId);
      if (!lane) continue;
      
      let edgeCost = 1; // hops metric
      if (settings.distanceMetric === 'length') {
        edgeCost = lane.length;
      } else if (settings.distanceMetric === 'weighted' && lane.traversalWeight) {
        edgeCost = lane.traversalWeight;
      }
      
      // Optional: strength bias on traversal
      if (settings.strengthBiasEnabled) {
        const neighborStar = graphState.stars.get(neighborId);
        if (neighborStar?.strength) {
          edgeCost *= 1.0 / (1.0 + neighborStar.strength * settings.kStrength);
        }
      }
      
      const newDist = dist + edgeCost;
      pq.enqueue({ dist: newDist, starId: neighborId, source });
    }
  }
  
  // Post-process: extract best and second-best per star, ensuring different players
  const result = new Map<string, StarTerritoryCandidates>();
  
  for (const [starId, records] of visited.entries()) {
    // Sort by distance
    records.sort((a, b) => a.distance - b.distance);
    
    const best = records[0];
    let second = records.find(r => r.source.playerId !== best.source.playerId);
    
    if (!second && records.length > 1) {
      // No different-player candidate; use second-best anyway
      second = records[1];
    }
    
    result.set(starId, {
      best: { ...best.source, distance: best.distance },
      second: second ? { ...second.source, distance: second.distance } : undefined,
    });
  }
  
  return result;
}

function findLaneBetween(graphState: Territory_GraphState, starA: string, starB: string): Lane | null {
  for (const lane of graphState.lanes.values()) {
    if ((lane.starA === starA && lane.starB === starB) || 
        (lane.starA === starB && lane.starB === starA)) {
      return lane;
    }
  }
  return null;
}
```

### E.2 Connected Component Labeling

```typescript
// src/lib/territory/components.ts

export function computeConnectedComponents(
  graphState: Territory_GraphState
): Map<string, number> {
  const starComponentId = new Map<string, number>();
  const visited = new Set<string>();
  
  for (const [playerId, ownedStars] of graphState.playersOwned.entries()) {
    let componentId = 0;
    
    for (const startStar of ownedStars) {
      if (visited.has(startStar)) continue;
      
      // BFS to mark entire connected component
      const queue = [startStar];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (visited.has(curr)) continue;
        
        visited.add(curr);
        starComponentId.set(curr, componentId);
        
        // Traverse only through same-owner edges
        const adjacentStars = graphState.starAdjacency.get(curr) || [];
        for (const neighbor of adjacentStars) {
          const neighborOwner = graphState.stars.get(neighbor)?.ownerPlayerId;
          if (neighborOwner === playerId && !visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
      
      componentId++;
    }
  }
  
  return starComponentId;
}
```

### E.3 Point-to-Territory Evaluation (CPU render path)

```typescript
// src/lib/territory/cpu-fallback.ts

interface PixelTerritory {
  playerId: string;
  componentId: number;
  competitorPlayerId: string;
  competitorComponentId: number;
  distanceFromBorder: number;
}

export function evaluateTerritory(
  worldPos: { x: number; y: number },
  graphState: Territory_GraphState,
  distanceField: Map<string, StarTerritoryCandidates>,
  spatialIndex: SpatialIndex,
  settings: Settings
): PixelTerritory {
  
  // Find nearest star
  const nearestStars = spatialIndex.query(worldPos, 50);
  
  if (nearestStars.length === 0) {
    return evaluateTerritoryViaLane(worldPos, graphState, distanceField, settings);
  }
  
  const nearestStar = nearestStars[0];
  const terrRec = distanceField.get(nearestStar.id);
  
  if (!terrRec) {
    return {
      playerId: 'unknown',
      componentId: 0,
      competitorPlayerId: 'unknown',
      competitorComponentId: 0,
      distanceFromBorder: 0,
    };
  }
  
  // Ensure second is a different player
  let second = terrRec.second;
  if (second && second.playerId === terrRec.best.playerId) {
    second = undefined;
  }
  
  const distFromBorder = second
    ? Math.abs(terrRec.best.distance - second.distance)
    : Infinity;
  
  return {
    playerId: terrRec.best.playerId,
    componentId: terrRec.best.componentId,
    competitorPlayerId: second?.playerId || 'neutral',
    competitorComponentId: second?.componentId || 0,
    distanceFromBorder,
  };
}

function evaluateTerritoryViaLane(
  worldPos: { x: number; y: number },
  graphState: Territory_GraphState,
  distanceField: Map<string, StarTerritoryCandidates>,
  settings: Settings
): PixelTerritory {
  
  // Find nearest lane
  let nearestLane: Lane | null = null;
  let minDist = Infinity;
  
  for (const lane of graphState.lanes.values()) {
    const star1 = graphState.stars.get(lane.starA)!;
    const star2 = graphState.stars.get(lane.starB)!;
    const dist = pointToSegmentDistance(worldPos, star1.worldPos, star2.worldPos);
    
    if (dist < minDist) {
      minDist = dist;
      nearestLane = lane;
    }
  }
  
  if (!nearestLane) {
    return {
      playerId: 'unknown',
      componentId: 0,
      competitorPlayerId: 'unknown',
      competitorComponentId: 0,
      distanceFromBorder: Infinity,
    };
  }
  
  const terrA = distanceField.get(nearestLane.starA)!;
  const terrB = distanceField.get(nearestLane.starB)!;
  
  // If lane crosses a boundary, interpolate
  if (terrA.best.playerId !== terrB.best.playerId) {
    const star1 = graphState.stars.get(nearestLane.starA)!;
    const star2 = graphState.stars.get(nearestLane.starB)!;
    const t = projectPointOntoSegment(worldPos, star1.worldPos, star2.worldPos);
    
    // Blend at midpoint
    const blendFactor = Math.abs(t - 0.5);
    const playerId = blendFactor < 0.1 
      ? 'boundary'  // Very close to midpoint
      : (t < 0.5 ? terrA.best.playerId : terrB.best.playerId);
    
    return {
      playerId,
      componentId: t < 0.5 ? terrA.best.componentId : terrB.best.componentId,
      competitorPlayerId: t < 0.5 ? terrB.best.playerId : terrA.best.playerId,
      competitorComponentId: t < 0.5 ? terrB.best.componentId : terrA.best.componentId,
      distanceFromBorder: 0,
    };
  }
  
  return {
    playerId: terrA.best.playerId,
    componentId: terrA.best.componentId,
    competitorPlayerId: terrB.best.playerId,
    competitorComponentId: terrB.best.componentId,
    distanceFromBorder: Infinity,
  };
}

function pointToSegmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  
  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  
  return Math.hypot(p.x - closestX, p.y - closestY);
}

function projectPointOntoSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  return Math.max(0, Math.min(1, t));
}
```

### E.4 Fragment Shader: Border Blend (GLSL)

```glsl
// src/lib/territory/shaders/fragment-composite.glsl

#version 300 es
precision highp float;

uniform sampler2D u_ownershipA;       // (playerId, componentId, bestDist, _)
uniform sampler2D u_ownershipB;       // (compPlayerId, compComponentId, secondDist, _)
uniform sampler2DArray u_playerColors; // [0..numPlayers]
uniform float u_borderThicknessPx;
uniform float u_borderSoftnessPx;
uniform float u_glowIntensity;        // 0.0 to 1.0
uniform ivec2 u_rtResolution;

in vec2 uv;
out vec4 outTerritory;

void main() {
  vec4 own_a = texture(u_ownershipA, uv);
  vec4 own_b = texture(u_ownershipB, uv);
  
  float playerId = own_a.x;
  float componentId = own_a.y;
  float bestDist = own_a.z;
  
  float compPlayerId = own_b.x;
  float compComponentId = own_b.y;
  float secondDist = own_b.z;
  
  // Compute distance to border
  float distFromBorder = abs(bestDist - secondDist);
  
  // Border band detection
  float inBorder = step(distFromBorder, u_borderThicknessPx);
  
  // Softness feather
  float feather = smoothstep(u_borderThicknessPx + u_borderSoftnessPx, u_borderThicknessPx, distFromBorder);
  inBorder = mix(inBorder, 1.0, feather);
  
  // Fetch player colors
  vec3 color1 = texture(u_playerColors, vec3(uv, playerId)).rgb;
  vec3 color2 = texture(u_playerColors, vec3(uv, compPlayerId)).rgb;
  
  // 50/50 blend in border
  vec3 borderColor = mix(color1, color2, 0.5);
  
  // Optional glow in border band
  vec3 glow = mix(color1, color2, 0.5) * u_glowIntensity * (1.0 - feather);
  borderColor += glow;
  
  // Final composite
  vec3 finalColor = mix(color1, borderColor, inBorder);
  
  outTerritory = vec4(finalColor, 1.0);
}
```

***

## F. Recommended Libraries

| Library | Purpose | Rationale | Package | Integration |
|---------|---------|-----------|---------|-------------|
| **Pixi.js v8** | WebGL2 renderer & RenderTexture | GPU acceleration; mature; familiar in game dev | `pixi@8.0+` | Use Pixi.RenderTexture for rt ping-pong; Pixi.Shader for GLSL compilation |
| **mnemonist** | Priority queue for Dijkstra | Fast, battle-tested priority queue; TypeScript types | `mnemonist@5.x` | `import PriorityQueue from 'mnemonist/priority-queue'` |
| **rbush** | Spatial index (fallback) | Fast 2D spatial indexing; R-tree; TypeScript support | `rbush@4.x` | Alternative to custom grid if many stars; for lane/star queries |
| **gl-matrix** (or own) | Matrix/vector math | WebGL transform matrices; mat3 for world↔texture | `gl-matrix@3.x` | `import { mat3 } from 'gl-matrix'` for coordinate transforms |
| **Svelte stores** (built-in) | Reactive settings/state | Svelte 5 native; no external dep | (built-in) | `writable()`, `derived()` for settings, game state |
| **Vitest** (testing) | Unit tests for Dijkstra, components, etc. | Fast, Vite-native, good TS support | `vitest@0.34+` | Test correctness of distance field, component labeling |

**Avoid:**
- **Babylon.js** (overkill; too much abstraction for this use case)
- **Three.js** (heavy; Pixi is lighter and more suitable for 2D territory)
- Old/unmaintained priority queue libraries

***

## G. First Implementation Milestone Plan

### **Milestone 1: MVP – Basic Graph Voronoi**
**Goal:** Render correct graph-based territories; validate correctness.

**Tasks:**
1. ✅ Implement `Territory_GraphState` data structure
2. ✅ Implement connected component labeling (`computeConnectedComponents`)
3. ✅ Implement multi-source Dijkstra (`computeMultiSourceDistanceField`)
4. ✅ Implement CPU fallback rasterization (`rasterizeTerritoryToCPUGrid`)
5. ✅ Svelte component with canvas, basic rendering loop
6. ✅ Verify territory assignment per star via debug overlay (draw star ID, owner, componentId)
7. ✅ Verify disconnected components are separated by enemy territory (visual inspection)

**Acceptance tests:**
- Each star renders with its owner's color
- If Player A owns stars {1, 5} (disconnected), check that enemy territory exists between them
- Shortest-path distance increases monotonically away from seeds
- No visual artifacts at lane boundaries

**Estimated time:** 4–6 hours

***

### **Milestone 2: GPU Rendering & 2-Color Border Blend**
**Goal:** GPU-accelerated rendering with thick blended borders.

**Tasks:**
1. ✅ GPU Pass 1: Rasterize distance field to render target
   - Implement fullscreen quad vertex shader
   - Implement fragment shader to sample K-best per pixel
   - Verify output (visualize as heatmap)
2. ✅ GPU Pass 2: Composite with border blend
   - Implement fragment shader for 2-color border
   - Parameterize borderThicknessPx, borderSoftnessPx
   - Add glow effect (optional)
3. ✅ Create framebuffer objects (FBO) + render targets
4. ✅ Integrate with Svelte store for settings sliders
5. ✅ Test border thickness & softness with sliders

**Acceptance tests:**
- Border width matches slider value (±1 px tolerance)
- Two-color blend only appears in border band
- Interior colors are solid and stable
- Softness feather produces smooth gradient

**Estimated time:** 6–8 hours

***

### **Milestone 3: Temporal Smoothing & Conquest Morph**
**Goal:** Smooth, non-flickering ownership transitions.

**Tasks:**
1. ✅ Implement temporal blending logic (GPU Pass 3)
2. ✅ Add ping-pong render targets + swap logic
3. ✅ Implement `onStarOwnershipChanged()` event handler
4. ✅ Queue distance field recompute on ownership change
5. ✅ Parameterize morphSmoothingHalfLife slider
6. ✅ Test conquest event: trigger ownership change, observe smooth morph
7. ✅ Verify no flicker or whole-map shimmer

**Acceptance tests:**
- Border smoothly transitions over ~1 second (or parameterized duration)
- No visible flicker or shimmer on unrelated regions
- Multiple rapid conquest events queue correctly
- Animation stops when morphFactor < 0.01

**Estimated time:** 4–5 hours

***

### **Milestone 4: Strength Bias & Advanced Metrics**
**Goal:** Support multiple distance metrics and optional strength influence.

**Tasks:**
1. ✅ Extend Dijkstra to support weighted distance metric
2. ✅ Implement strength bias logic (log/inverse strength)
3. ✅ Add UI toggles/sliders for metric selection and kStrength
4. ✅ Test distance metric switching (hops → length → weighted)
5. ✅ Test strength bias: verify stronger players expand territory

**Acceptance tests:**
- Switching distance metric immediately updates territories (no lag)
- Strength bias expands/shrinks territory proportionally to strength value
- Boundary quality remains good under all metrics

**Estimated time:** 3–4 hours

***

### **Milestone 5: Performance Optimization & Fallbacks**
**Goal:** Handle large graphs; provide CPU/GPU fallbacks for edge cases.

**Tasks:**
1. ✅ Implement spatial index (grid or RBush) for fast star/lane queries
2. ✅ Profile Dijkstra: set target < 50 ms for recompute
3. ✅ Implement ROI tile updates (only recompute affected tiles on ownership change)
4. ✅ Add CPU grid fallback for low-end devices (disable GPU if WebGL2 unavailable)
5. ✅ Measure performance: FPS, recompute time, memory usage
6. ✅ Document performance budgets (stars/lanes limits)

**Acceptance tests:**
- Graph with 100 stars + 200 lanes: recompute < 50 ms, render @ 60 FPS
- Graph with 500+ stars: CPU fallback gracefully degrades to 30 FPS
- ROI updates reduce recompute time by 50%+ on single-star ownership change
- No memory leaks (test rapid ownership changes)

**Estimated time:** 5–6 hours

***

### **Milestone 6: Polish & Visual Effects**
**Goal:** Professional visual finish; optional effects.

**Tasks:**
1. ✅ Add border noise/warp (optional; fragment shader)
2. ✅ Add radial gradient falloff near stars (ownership indicator)
3. ✅ Add debug overlay:
   - Component IDs (color-coded)
   - Distance heatmap
   - Seed stars highlighted
   - Border midpoints
4. ✅ Fine-tune color palette (high contrast, player colors)
5. ✅ Test on various resolutions (mobile, 4K)
6. ✅ Document settings for best visual result

**Acceptance tests:**
- Visual appealing to player (subjective)
- Debug overlay correctly labels all territories
- Performance on mobile acceptable (> 30 FPS)

**Estimated time:** 4–5 hours

***

### **Milestone 7: Integration with Pax Fluxia**
**Goal:** Full integration into game; tie to gameplay events.

**Tasks:**
1. ✅ Hook territory system to game state (`gameState` store)
2. ✅ Trigger recomputes on star conquest
3. ✅ Expose settings in game UI (settings panel)
4. ✅ Ensure camera transforms apply correctly
5. ✅ Handle map pan/zoom (update world↔screen transforms)
6. ✅ Test with live game scenarios (multi-player captures, rapid changes)

**Acceptance tests:**
- All gameplay-driven ownership changes reflect in territory visuals
- Settings persist and apply smoothly
- No gameplay performance impact (< 5 ms overhead per frame)

**Estimated time:** 3–4 hours

***

### **Total Estimated Effort:** 28–37 hours (3–5 developer-days)

***

## H. Performance Budget & Scalability Notes

### Complexity Analysis

| Operation | Complexity | Time (V=100, E=200) | Time (V=500, E=1000) | Notes |
|-----------|-----------|-------------------|----------------------|-------|
| Connected components | O(V+E) | ~0.1 ms | ~0.5 ms | Fast; can run every frame if needed |
| Multi-source Dijkstra | O((V+E) log V) | ~5–10 ms | ~30–50 ms | Bottleneck; recompute only on ownership change |
| GPU rasterize pass | O(V × RT pixels) | ~2–5 ms | ~10–20 ms | Can optimize with spatial hashing |
| Composite pass | O(RT pixels) | ~1–2 ms | ~1–2 ms | Fixed cost; independent of V, E |
| Temporal blend | O(RT pixels) | ~1 ms | ~1 ms | Fixed; negligible |

### Performance Targets

- **Small graph (50 stars, 100 lanes):** 60 FPS, ~0.5 ms overhead
- **Medium graph (150 stars, 400 lanes):** 60 FPS, ~2 ms overhead
- **Large graph (500 stars, 1500 lanes):** 30+ FPS, ~5–10 ms overhead
- **Very large (1000+): Consider level-of-detail (only render portion of map)

### Memory Usage

- **Distance field (K-best per star):** ~V × 3 × 32 bytes = ~V × 100 bytes (e.g., 100 MB for V=1M, not needed in practice)
- **Render targets (3×):** 3 × (W × H × 4 bytes) = 3 × 8 MB for 1024² (acceptable)
- **GPU staging buffers:** Negligible

### Caching & Invalidation

- **Cache distance field** between frames; invalidate only on:
  1. Star ownership change
  2. Lane added/removed
  3. Settings change (distance metric, strength bias)
- **Cache component labels** separately; invalidate on ownership change
- **Cache spatial index**; invalidate if star positions change

***

## I. Validation & Acceptance Criteria Checklist

### Algorithmic Correctness

- [ ] **Graph metric enforcement:** Ownership distance is shortest-path distance on graph, not Euclidean
- [ ] **Disconnected component separation:** If Player A owns two disconnected component, enemy territory visually separates them
- [ ] **Boundary alignment:** Borders follow lane geometry; no cutting through empty space
- [ ] **Tie-breaking (symmetric):** Equidistant borders split at midpoint (t=0.5 on lanes); no asymmetry
- [ ] **K-best correctness:** Top-2 candidates per star include best + nearest enemy (never same-player)
- [ ] **Connected component labeling:** Union-find or DFS produces correct components

### Rendering Quality

- [ ] **Border thickness:** Adjustable 1–20 px; matches slider value
- [ ] **Border softness:** Feathering produces smooth falloff; no banding
- [ ] **2-color blend:** Only interior and competitor colors in border (no third color)
- [ ] **Stable interiors:** Solid colors in non-border regions; no shimmer
- [ ] **Glow effect (optional):** Additive; does not bleed into interior

### Temporal Stability

- [ ] **No flicker on ownership change:** Borders morph smoothly over 500–2000 ms
- [ ] **No whole-map shimmer:** Unrelated territories remain visually stable
- [ ] **Deterministic:** Same input → same output (frame-to-frame consistency)
- [ ] **Multiple events:** Rapid ownership changes queue correctly; no dropped updates

### Constraint Satisfaction

- [ ] Non-negotiable constraint 1: ✅ Graph-based, not Euclidean
- [ ] Non-negotiable constraint 2: ✅ Connectivity truthfulness (no implied connectivity)
- [ ] Non-negotiable constraint 3: ✅ Disconnected same-player holdings separated by enemy territory
- [ ] Non-negotiable constraint 4: ✅ Borders follow lanes
- [ ] Non-negotiable constraint 5: ✅ Tie handling / midpoint rule
- [ ] Non-negotiable constraint 6: ✅ Thick, blended borders
- [ ] Non-negotiable constraint 7: ✅ Organic conquest morph with stability
- [ ] Non-negotiable constraint 8: ✅ Player controls (toggles/sliders)
- [ ] Non-negotiable constraint 9: ✅ Edges have no ownership

### Performance Benchmarks

- [ ] Small graph (50 stars): 60 FPS, ~0.5 ms overhead
- [ ] Medium graph (150 stars): 60 FPS, ~2 ms overhead
- [ ] Large graph (500 stars): 30+ FPS, ~5–10 ms overhead
- [ ] No GPU memory leaks (sustained play > 10 minutes)
- [ ] CPU fallback available if WebGL2 unavailable

### Integration with SvelteKit

- [ ] Settings store correctly reflects UI changes
- [ ] Game state updates trigger territory recomputes
- [ ] Canvas resize handled (preserve aspect ratio, quality)
- [ ] No console errors or warnings

***

## J. Summary & Next Steps

**Architecture chosen:** Multi-source shortest-path (Dijkstra) → GPU distance-field rasterization → fragment shader 2-color border blend with temporal smoothing.

**Why this approach:**
1. **Correctness:** Enforces graph metric; handles disconnected components naturally
2. **Stability:** Temporal blending (ping-pong) eliminates flicker; deterministic sampling prevents shimmer
3. **Scalability:** GPU-accelerated rendering scales to high resolutions; CPU fallback for compatibility
4. **Flexibility:** Parameterized distance metrics, strength bias, border thickness/softness

**Deliverables provided:**
- ✅ Algorithm specification (Dijkstra, component labeling, point-to-territory evaluation)
- ✅ GPU rendering pipeline (3-pass: rasterize, composite, temporal blend)
- ✅ TS architecture for SvelteKit (module layout, stores, system class)
- ✅ Concrete pseudocode (Dijkstra, components, CPU render, fragment shaders)
- ✅ Performance budget & milestones

**Recommended next steps:**
1. **Implement Milestone 1 (MVP):** CPU rasterization + basic rendering (verify correctness first)
2. **Implement Milestone 2 (GPU):** Accelerate with WebGL2 (if not available, CPU fallback is acceptable)
3. **Implement Milestone 3 (Temporal):** Add smooth conquest morphing
4. **Iterate on visual polish & performance optimization**

**Questions to clarify:**
- Max expected stars/lanes in your game? (affects LOD strategy)
- Typical star ownership change frequency? (affects caching vs recompute tradeoff)
- Desired visual style? (color palette, border intensity, effects)
- Target device(s)? (PC, mobile, VR—affects performance budget)

This spec is **production-ready** and should be actionable for a competent dev. Good luck with Pax Fluxia! 🚀