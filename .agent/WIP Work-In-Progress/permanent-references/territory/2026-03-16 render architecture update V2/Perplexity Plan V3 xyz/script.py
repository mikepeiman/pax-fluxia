
# Consolidated document set for agentic IDE

docs = {
'MASTER_TERRITORY_ARCHITECTURE.md': r'''# Territory Engine: Master Architecture

## Purpose

This is the single canonical source of truth for territory system architecture. Use this document to resolve ambiguity, establish implementation order, and enforce invariants. Subsystem details and legacy concerns live in companion documents only.

## Core invariants

**One territorial truth.** The system computes and maintains exactly one authoritative model of ownership and frontiers. Fills and borders are render products derived from that same source, never approximated separately.

**Graph-native ownership.** Ownership distance is measured by shortest path on the star–lane graph, not by Euclidean 2D distance. Every position that must be rendered has its owner resolved by this metric.

**Stable boundaries.** Frontiers follow lane logic where lanes exist. Where two players are equidistant under the graph metric (on a lane or in open space), tie resolution must be deterministic and stable across frames. Ties must never flicker.

**Shared frontier geometry.** The frontier between player A and player B is computed and stored exactly once. Both the fill render path and the border render path use this same geometric truth.

**Disconnected components remain separate.** If player P owns stars in two disconnected components (no path through P-owned stars), the territory rendering must visually separate them. A gap (owned by another player or neutral evaluation) must lie between them.

**No ownership on edges.** Lanes carry frontier information and enable traversal. Ownership exists on stars only.

**Render is not truth.** The renderer consumes canonical data and presentation config. It does not compute ownership, solve frontiers, or fabricate geometry. All geometry it produces is derived downstream from canonical state.

## Canonical data model

The compiler outputs a single `CanonicalTerritoryState`:

```typescript
export interface CanonicalTerritoryState {
  metricTruth: MetricState;           // Graph-native ownership distances
  frontierGraph: FrontierGraph;       // Shared world-coordinate frontier edges
  regions: TerritoryRegion[];         // Owned closed loops and component IDs
  componentsByOwner: Map<string, string[]>;  // Disconnected component tracking
  transitionActive: boolean;          // Morphing in progress
}
```

This is the sole authority for all visual output. No secondary approximations exist.

## Compile layer (Math In, Data Out)

### Responsibility
Transform star ownership and lane connectivity into canonical territory data.

### Layer rule
- Zero PIXI imports.
- Zero rendering calls.
- Zero mesh, color, or placeholder geometry fabrication.
- Strictly typed outputs.

### File structure

| File | Responsibility |
|------|---|
| `compiler/TerritoryCompiler.ts` | Orchestrate stages, return `CanonicalTerritoryState`. |
| `compiler/metricStage.ts` | Graph-native shortest-path competition. Top-2 ownership per star. |
| `compiler/frontierStage.ts` | World-coordinate frontier nodes and edges. Exact lane split parameters. Shared owner-pair edges exactly once. |
| `compiler/regionStage.ts` | Closed owned loops. Component identity tracking. |
| `compiler/frontierFitter.ts` | Convert frontier polylines to presentation families: `straight`, `segmented`, `curved`. |
| `compiler/TerritoryTransitionPlanner.ts` | Compute frontier correspondences for morph animation. Output static transition plan. |

### Execution order
1. Metric stage (graph truth).
2. Frontier stage (shared edges).
3. Region stage (closed fills).
4. Fitter stage (presentation families).

## Engine layer (Orchestration)

### Responsibility
Coordinate config resolution, compiler invocation, cache building, and render dispatch.

### File

| File | Responsibility |
|------|---|
| `engine/TerritoryEngineController.ts` | Fingerprint inputs, detect changes, invoke compiler, trigger render layer. |

### Rules
- Fingerprinting must include config state so compiler reruns when behavior changes.
- Do not hold animation state globally; pass transition plan to renderer.

## Render layer (Presentation)

### Responsibility
Convert canonical state and config into visible output. Never invent geometry or ownership.

### Layer rule
- Consume canonical truth only.
- Derive all geometry from the same frame-time canonical frontier and regions.
- Encapsulate render state in classes; no module-level singletons.

### File structure

| File | Responsibility |
|------|---|
| `render/TerritoryRenderer.ts` | Unified entry point. Branch steady-state vs. transition pass. Invoke cache builders and layer renderers. |
| `render/buildFillMeshCache.ts`, `buildBorderMeshCache.ts` | Derive PIXI-ready geometry from canonical frontier and regions. |
| `render/OwnerFillLayerRenderer.ts` | Draw owned fill polygons. |
| `render/BorderLayerRenderer.ts` | Draw border stroke meshes. |

### Border families
Supported presentation families (selected from canonical frontier paths):
- `straight`: longest even runs, minimal segments, constant width.
- `segmented`: preserve deliberate corners.
- `curved`: controlled arcs or cubics; preserve adjacency and ownership.

Family selection changes appearance, not ownership truth.

## Animation layer (Transitions)

### Responsibility
Smoothly interpolate between frontier states during ownership change.

### Principle
At each frame during a transition, the renderer computes the interpolated frontier geometry first, then derives both fills and borders from that exact frame. This prevents visual divergence.

### Frame evaluation order
1. Compute progress `t` from transition plan.
2. Interpolate canonical frontier control data.
3. Rebuild frame frontier from interpolated data.
4. Derive fill cache from interpolated frontier.
5. Derive border cache from interpolated frontier.
6. Draw both layers.

### Stability
- Tie resolution must remain deterministic during interpolation.
- Component identities must be preserved as long as topologically meaningful.

## Non-canonical topics

The following topics are excluded from this document and belong in companion docs:

- Legacy renderer migration, PVV2/PVV3/Distance Field adapters.
- Devtools, trace stores, interactive stepping, diagnostic snapshots.
- Rejected raster contour approaches.
- Implementation cleanup directives and code removal policies.
- Terminology policy and historical naming conventions.

Refer to `LEGACY_QUARANTINE.md` for all the above.

## Implementation order

1. **Compiler (stages 1–3):** metricStage, frontierStage, regionStage, TerritoryCompiler.
2. **Engine controller:** TerritoryEngineController.
3. **Render layer:** TerritoryRenderer, cache builders, layer renderers.
4. **Transitions:** TerritoryTransitionPlanner, transition pass integration.
5. **Presentation families:** frontierFitter and style selection.

Do not begin render layer until compiler contracts are complete and tested.

## Testing invariants

Before proceeding to visual testing, validate:
- Graph-native ownership (metric stage).
- Shared frontier uniqueness (frontier stage).
- Filled vs. border derivation from same source (region stage + render).
- Deterministic tie resolution under interpolation (transition tests).
- No module-level renderer state (class encapsulation tests).

---

**See companion docs for subsystem details, data contracts, and legacy migration.**
''',

'COMPILER_CONTRACTS.md': r'''# Compiler Layer: Data Contracts

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
''',

'RENDER_AND_TRANSITIONS.md': r'''# Render Layer and Transitions

## Purpose

This document specifies how canonical territory data is rendered and how transitions are animated.

## Render layer principle

The renderer consumes `CanonicalTerritoryState` and config. It produces visible output. It does not compute ownership, solve frontiers, or invent geometry.

All geometry produced by the renderer is derived from canonical frontier and region data for the exact frame being rendered.

## Top-level interface

```typescript
export class TerritoryRenderer {
  constructor(container: PIXI.Container, colorUtils: ColorUtils);
  
  render(state: CanonicalTerritoryState, transitionPlan: TransitionPlan | null): void;
  destroy(): void;
}
```

The renderer branches internally:
- If `transitionPlan` is null or `state.transitionActive` is false, execute steady-state pass.
- Otherwise, execute transition pass using the plan.

## Cache builder contracts

### Fill mesh cache

```typescript
export interface FillMeshCache {
  polygons: { 
    ownerId: string; 
    componentId: string;
    points: number[];  // Triangulated or raw polygon points
  }[];
}

export function buildFillMeshCache(regions: TerritoryRegion[]): FillMeshCache;
```

The fill cache is built directly from `CanonicalTerritoryState.regions`. Each region becomes one polygon entry. Component ID is preserved so render layers can apply distinct styles to disconnected same-owner holdings if desired.

### Border mesh cache

```typescript
export interface BorderMeshCache {
  strokeMeshes: {
    ownerA: string;
    ownerB: string;
    pairId: string;
    geometry: PIXI.MeshGeometry;  // Triangle strips or line strip
  }[];
}

export function buildBorderMeshCache(
  frontierGraph: FrontierGraph,
  family: 'straight' | 'segmented' | 'curved',
  config: BorderRenderConfig
): BorderMeshCache;
```

The border cache is built from `CanonicalTerritoryState.frontierGraph`. Each owner-pair edge becomes one stroke mesh. Border styling (width, softness, color blend) is applied here, not in the compiler.

### Mandatory alignment rule

Both `buildFillMeshCache` and `buildBorderMeshCache` are called with the same `CanonicalTerritoryState` (or interpolated equivalent during transitions). This guarantees fills and borders are derived from identical frontier and region truth.

## Layer renderers

### OwnerFillLayerRenderer

```typescript
export class OwnerFillLayerRenderer {
  constructor(container: PIXI.Container, colorUtils: ColorUtils);
  draw(cache: FillMeshCache): void;
  destroy(): void;
}
```

Draws filled regions. One color per owner, optionally modulated by component ID or team affinity.

### BorderLayerRenderer

```typescript
export class BorderLayerRenderer {
  constructor(container: PIXI.Container, colorUtils: ColorUtils);
  draw(cache: BorderMeshCache): void;
  destroy(): void;
}
```

Draws border strokes. When a border separates owner A from owner B, the stroke may blend A and B colors. Stroke width, softness (SDF or AA), and glow are presentation parameters.

## Border families

Supported presentation families (selected by config):

- **`straight`:** RDP simplification to find long, even runs. Minimal segment count. Emphasis on clean geometry. Best for stark, geometric aesthetics.

- **`segmented`:** Preserve deliberate angular structure. Angular threshold defined by config. Good for militaristic, tactical aesthetics.

- **`curved`:** Bezier or biarc fitting on top of canonical frontier. Preserve adjacency and ownership pairing. Good for organic, fluid aesthetics.

Family selection is a presentation parameter. All families derive from the same canonical frontier path.

## Steady-state pass

```typescript
private executeSteadyStatePass(state: CanonicalTerritoryState): void {
  const fillCache = buildFillMeshCache(state.regions);
  const borderCache = buildBorderMeshCache(state.frontierGraph, ...);
  
  this.fillRenderer.draw(fillCache);
  this.borderRenderer.draw(borderCache);
}
```

## Transition pass

```typescript
private executeTransitionPass(
  state: CanonicalTerritoryState,
  plan: TransitionPlan,
  nowMs: number
): void {
  // 1. Compute progress
  const elapsed = nowMs - plan.startedAtMs;
  const t = Math.max(0, Math.min(1, elapsed / plan.durationMs));
  const eased = applyEasing(t, 'easeInOutCubic');
  
  // 2. Interpolate frontier control data
  const frameFrontier = interpolateFrontier(
    plan.prevState.frontierGraph,
    plan.nextState.frontierGraph,
    plan.frontierCorrespondences,
    eased
  );
  
  // 3. Interpolate regions
  const frameRegions = interpolateRegions(
    plan.prevState.regions,
    plan.nextState.regions,
    eased
  );
  
  // 4. Build caches from frame truth
  const fillCache = buildFillMeshCache(frameRegions);
  const borderCache = buildBorderMeshCache(frameFrontier, ...);
  
  // 5. Draw both layers
  this.fillRenderer.draw(fillCache);
  this.borderRenderer.draw(borderCache);
  
  // 6. Check completion
  if (eased >= 1.0) {
    state.transitionActive = false;
  }
}
```

### Transition rules

- **Frame geometry is interpolated first.** Both fills and borders are then derived from that interpolated frontier, not independently interpolated.
- **Tie resolution must remain deterministic.** Ownership at tied positions must not flicker.
- **Component identities must be preserved as long as topologically meaningful.** Disconnected holdings should not appear to merge prematurely.
- **Animation should follow parameter interpolation,** not free vertex dragging. This prevents instability during pinches, splits, and merges.

## Class encapsulation (no singletons)

All renderer classes must encapsulate their own state. Example:

```typescript
export class BorderLayerRenderer {
  private graphics: PIXI.Graphics;
  private cachedFingerprint: string = '';
  private worker: Worker;
  
  constructor(
    private container: PIXI.Container,
    private colorUtils: ColorUtils
  ) {
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
    this.worker = new BorderWorker();
    this.worker.onmessage = this.handleWorkerResult.bind(this);
  }
  
  public draw(cache: BorderMeshCache): void {
    // Use instance state only; no module-level singletons
    this.graphics.clear();
    // ... draw logic
  }
  
  public destroy(): void {
    this.worker.terminate();
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    this.graphics.destroy();
  }
}
```

No global `let renderer`, `let graphics`, or `let worker`. All state is per-instance.

---

**See MASTER_TERRITORY_ARCHITECTURE.md for layer context and COMPILER_CONTRACTS.md for data structures.**
''',

'LEGACY_QUARANTINE.md': r'''# Legacy Patterns, Migration, and Non-Canonical Approaches

## Purpose

This document isolates historical implementation details, rejected approaches, and migration concerns from the canonical architecture. Use this document only when dealing with legacy code or understanding why certain patterns were rejected.

**Canonical architecture appears in MASTER_TERRITORY_ARCHITECTURE.md. Do not reference this document for new implementation decisions.**

## Deprecated patterns

The following are not canonical and must not appear in new code:

- **Pixel-derived contour extraction.** Rasterization to a render texture, marching squares, and contour extraction produce non-canonical, axis-aligned approximations. The canonical approach is graph-native frontier generation.

- **Separate fill and border approximations.** Never maintain separate geometry pipelines for fills and borders. Both must derive from the same canonical frontier data.

- **Module-level mutable renderer state.** Global `let graphics`, `let worker`, or `let cachedFingerprint` variables. All render state must be class-encapsulated.

- **Untyped artifact bags.** Functions that accept or return bare `any` objects without clear contract boundaries. All compiler outputs must be strictly typed.

- **Fallback or placeholder geometry fabrication.** If a compile stage is incomplete, return a typed error status, not made-up geometry.

## Legacy adapter boundary

Legacy renderers (PVV2, PVV3, Distance Field) may exist during migration, but they must be quarantined behind `TerritoryLegacyBridge`. They must not:

- Define canonical ownership truth.
- Override compiler contract outputs.
- Contaminate the render layer with legacy design decisions.

The legacy bridge exists as a temporary escape hatch during refactoring, not as a permanent parallel architecture.

## Devtools boundary

Trace stores, interactive stepping, diagnostic snapshots, and UI-facing debug state belong in devtools modules:

- `devtools/TerritoryTraceStore.ts` – Svelte store and trace persistence.
- `devtools/TerritoryStepRunner.ts` – Step-through execution and snapshot replay.

Devtools logic must not pollute the compiler or renderer contracts.

## Terminology policy

When describing non-canonical patterns or historical bugs, use precise operational language:

| Avoid | Use |
|---|---|
| "Jagged borders" | "Non-canonical raster contour output" |
| "Fill vs border bug" | "Dual-truth divergence" |
| "Stair-stepping artifacts" | "Pixel-grid aliasing in rejected raster approaches" |
| "Placeholder geometry" | "Non-authoritative fallback geometry" |
| "God Object" | "Legacy monolithic pipeline" |
| "Singleton trap" | "Module-scoped renderer state leakage" |

## Migration checklist

When refactoring from a legacy system, enforce:

1. ✓ Extract compiler logic into pure stages; remove all PIXI imports.
2. ✓ Build singular canonical frontier graph; eliminate separate fill and border paths.
3. ✓ Move adapter logic into `TerritoryLegacyBridge`.
4. ✓ Move devtools state into dedicated modules.
5. ✓ Refactor all renderers into class-encapsulated instances.
6. ✓ Validate that fills and borders derive from identical canonical data.
7. ✓ Add unit tests for compiler stages before render layer testing.

---

**This document is for context only. All new implementation should reference MASTER_TERRITORY_ARCHITECTURE.md.**
'''
}

# Write the four files
for name, content in docs.items():
    with open(name, 'w', encoding='utf-8') as f:
        f.write(content)

# Create a quick manifest
manifest = """# Territory Architecture Documentation Set

## Files

- **MASTER_TERRITORY_ARCHITECTURE.md** – Canonical invariants, core responsibility map, implementation order. Start here.
- **COMPILER_CONTRACTS.md** – Data structures, stage guarantees, type definitions for the compile layer.
- **RENDER_AND_TRANSITIONS.md** – Renderer contract, cache builders, border families, transition rules.
- **LEGACY_QUARANTINE.md** – Historical patterns, rejected approaches, migration boundaries. Reference only when needed.

## For implementation AI agents

1. Open MASTER_TERRITORY_ARCHITECTURE.md first and reference it throughout.
2. When implementing a specific layer (compiler, render, transitions), consult the corresponding companion doc.
3. Do not reference LEGACY_QUARANTINE.md unless explicitly handling legacy code or understanding why patterns were rejected.
4. All implementation decisions should be justified by reference to MASTER_TERRITORY_ARCHITECTURE.md.
"""

with open('ARCHITECTURE_README.md', 'w', encoding='utf-8') as f:
    f.write(manifest)

print("✓ Written 4 core architecture docs:")
for name in sorted(docs.keys()):
    print(f"  - {name}")
print("\n✓ Written ARCHITECTURE_README.md (guide for agentic IDEs)")
