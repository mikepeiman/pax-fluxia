# Render Layer and Transitions

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
