# Territory Engine: Master Architecture

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

### Drawing Strategies & Zero-Divergence Rule

There are two fundamentally different ways to draw fills and borders:

1. **Dual-Path (Legacy):** Drawing fill polygons separately from border polylines.
   * *Status:* **REJECTED.** Even if both consume the exact same canonical vertices, graphics APIs interpolate filled polygons differently than stroked polylines at the sub-pixel rendering level. This causes microscopic divergence, resulting in sharp fill corners bleeding past smoothed borders.
2. **Single-Path (Canonical):** Executing `fill()` and `stroke()` sequentially on the exact same vertex path.
   * *Status:* **MANDATORY.** This is the *only* way to guarantee zero divergence. Borders are achieved by stroking the fill polygon (e.g. at 0.5 alpha to blend adjacent territory colors).

**Rule:** Separate border rendering passes (where borders are drawn independently of fills) are strictly forbidden. All rendering—including steady-state and animation transitions—must use a unified Single-Path fill+stroke method.

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
