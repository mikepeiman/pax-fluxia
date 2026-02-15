# Phase D: Renderer Wiring — Direct Replacement Plan

**Created**: 2026-02-15  
**Goal**: Replace all inline rendering code in GameCanvas.svelte with direct imports from `src/lib/renderers/`. No shims. GameCanvas becomes a thin orchestrator.

---

## Current State

- **GameCanvas.svelte**: ~3020 lines (monolith)
- **Extracted modules**: RenderContext, containerFactory, colorUtils, StarRenderer, LaneRenderer, ShipRenderer — all type-checked, all alongside (not wired)
- **D.1 done**: colorUtils wired (removed ~150 LOC)

## Target State

- **GameCanvas.svelte**: ~800-1000 lines (orchestrator only)
  - PIXI app init (via containerFactory)
  - Animation loop (`startAnimationLoop`) — calls imported renderers
  - Input handling (pointer events, drag, pan, zoom) — extracted to InputLayer
  - State declarations (local `let` variables, Maps, Sets)
  - Reactive state sync (Svelte `$effect` blocks)

## Wiring Steps

### D.2: containerFactory
- Import `createContainers`, `initShipRendering`, `createCaches`
- Replace the onMount container/texture creation block (lines 266-356) with:
  ```ts
  const containers = createContainers(app.stage);
  const textures = initShipRendering(containers);
  const caches = createCaches();
  // Destructure into existing local vars
  ({ linkGraphics, starsContainer, glowContainer, shipsContainer,
     connectionGraphics, labelsContainer, dragPreviewGraphics } = containers);
  shipCircleTexture = textures.shipCircle;
  glowTexture = textures.starGlow;
  shipParticleContainer = containers.shipParticleContainer;
  orbGraphics = containers.orbGraphics;
  ```
- **Risk**: Medium. Destructuring into existing `let` vars is straightforward but touches many names.
- **LOC removed**: ~90

### D.3: StarRenderer (direct replacement)
- Import `renderStars as renderStarsModule` from `$lib/renderers/StarRenderer`
- **Delete** inline `renderStars` function (lines 879-1071, ~192 LOC)
- **Delete** inline `drawTypeIcon` (lines 2345-2378, ~33 LOC)
- **Delete** inline `drawHexBorder` (lines 2381-2400, ~19 LOC)
- **Delete** inline `drawPolygon` (lines 2307-2343, ~36 LOC)
- **Update call site** (line 688) from `renderStars(stars)` to:
  ```ts
  renderStarsModule(stars, starsContainer!, labelsContainer!,
    { starGraphics, starLabels },
    { activeStarId, dragSourceId, pendingConquests, conquestFlashes, animationTime },
    colorUtils);
  ```
- **LOC removed**: ~280

### D.4: LaneRenderer (direct replacement)
- Import `renderConnections as renderConnectionsModule`, `renderOrderArrows as renderOrderArrowsModule`
- **Delete** inline `renderConnections` (lines ~760-877, ~117 LOC)
- **Delete** inline `renderOrderArrows` (lines ~1073-1310, ~237 LOC)
- **Update call sites** to pass arguments directly
- **LOC removed**: ~354

### D.5: ShipRenderer (direct replacement)
- Import `renderShips as renderShipsModule`, `drawShip`, `renderFleets as renderFleetsModule`
- **Delete** inline `renderShips` (lines ~1685-2175, ~490 LOC)
- **Delete** inline `renderTravelingShips` (lines ~1378-1672, ~294 LOC)
- **Delete** inline `drawShip` (lines ~2222-2306, ~84 LOC)
- **Delete** inline `renderFleets` (lines ~2177-2220, ~43 LOC)
- **Delete** inline `processTickEvents`, `applyTravelEasing`, `easeInOutCubic` (~50 LOC)
- **Update call sites** to pass ShipRenderState + ShipRenderResources
- **LOC removed**: ~961

### D.6: InputLayer extraction
- Extract pointer event handlers, hit testing, drag preview, pan/zoom into `InputLayer.ts`
- This is stateful (drag machine state) but can use an interface pattern like ShipRenderState
- **Functions to extract**:
  - `handlePointerDown`, `handlePointerMove`, `handlePointerUp`
  - `hitTestStar`, `screenToWorld`
  - `handleKeyDown`
  - Drag preview rendering
  - Pan/zoom logic
- **LOC removed**: ~400-500

## Estimated Final Size

| Section | Lines |
|---------|-------|
| Imports + types | 50 |
| State declarations | 120 |
| containerFactory init | 30 |
| Animation loop (orchestrator) | 150 |
| Input layer delegation | 80 |
| Reactive effects + sidebar wiring | 150 |
| HTML template | 50 |
| **Total** | **~630** |

## Execution Order

1. D.3 (StarRenderer) — simplest, one call site, no state feedback
2. D.4 (LaneRenderer) — two call sites, clean interfaces
3. D.2 (containerFactory) — destructure into existing vars
4. D.5 (ShipRenderer) — largest, most state coupling
5. D.6 (InputLayer) — last because it's the most coupled to Svelte reactive state

Type-check and commit after each step.
