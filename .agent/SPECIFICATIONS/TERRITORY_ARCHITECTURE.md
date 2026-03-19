# Territory Architecture — Canonical Reference

**Date:** 2026-03-19 (updated with user feedback)
**Status:** ACTIVE — Single source of truth for territory system architecture.
**Ref:** D-83

> [!CAUTION]
> Any AI agent working on territory code MUST read this document before making changes.
> If your changes contradict anything here, STOP and ask the user.

---

## 1. The 4-Layer Pipeline

```
Ownership → Geometry → Transition → Presentation
```

| Layer | What It Does | Key Type | User-Facing Control |
|-------|-------------|----------|---------------------|
| **Ownership** | Who owns what. Graph-native, from conquest events. | `GraphOwnershipState` | *(automatic)* |
| **Geometry** | Shapes from ownership. Power Voronoi cells, merged territories, shared borders. | `TerritoryGeometryData` | **Geometry** dropdown |
| **Transition** | Animating between geometry states when conquests happen. | `FXHandler<ConquestEvent>` | **Fill Transition** + **Border Transition** dropdowns |
| **Presentation** | Drawing to screen. PIXI.Graphics fills, strokes, visual style. | `PVV2RendererState` | **Style** dropdown |

### The 4-Axis UI Model

The Territory Presentation section has 4 independent dropdowns:

| Dropdown | Selects | Examples |
|----------|---------|---------|
| **Geometry** | Which geometry source produces territory shapes | FG1 Adaptive Field, FG2 Seed Graph, *(future: Hex Grid)* |
| **Style** | Visual style of fills + borders | Territory (DY4_styles), Distance Field, *(future: Neon Glow)* |
| **Fill Transition** | Algorithm for animating fill changes on conquest | Frontier Morph (DY4_OT_fill), Alpha Crossfade, *(future: Ripple Dissolve)* |
| **Border Transition** | Algorithm for animating border changes on conquest | Pixi Graphics (DY4_OT_borders), Segment Morph, *(future: Elastic Snap)* |

All 4 are independently selectable. This is the intended design — 4 distinct mode selections.

### DY4 Split

DY4 Optimal Transport is split across two layers:

| Component | Layer | Dropdown | ID |
|-----------|-------|----------|----|
| Border transition algorithm | Transition | Border Transition | `DY4_OT_borders` |
| Fill transition algorithm | Transition | Fill Transition | `DY4_OT_fill` |
| Visual rendering style | Presentation | Style | `DY4_styles` |

DY4 remains **SACROSANCT** — do not alter its behavior without explicit user approval.

---

## 2. Layer Rules

### Compiler Rules (Geometry Layer)
- NO rendering in compiler
- NO PIXI imports in compiler
- NO placeholder or fallback geometry
- NO config mutation
- Return typed data only

### Renderer Rules (Presentation Layer)
- FillMeshCache and BorderMeshCache are caches only, never truth
- Fills and borders must both derive from the exact same canonical frontier/region data
- Renderer must not compute ownership or invent geometry

### State Rules
- NO module-level mutable renderer state
- NO global animation state
- Use class-encapsulated renderer instances and explicit transition plans
- `renderPowerVoronoi()` accepts `state?: PVV2RendererState` — always pass state, never rely on module globals

### Implementation Rule
Preserve layer separation strictly. If a stage is incomplete, return a typed error or notImplemented status rather than fabricating geometry.

---

## 3. VFX Integration — Concrete Specification

### Existing FX System (verified from code)

```
FXOrchestrator
├── FXClock           — pausable game time, speed multiplier
├── VisualStateManager — safe mutation API for visual state
└── FXRegistry         — priority-sorted handler dispatch
    ├── transfer handlers  → FXHandler<TransferEvent>
    ├── combat handlers    → FXHandler<CombatEvent>
    └── conquest handlers  → FXHandler<ConquestEvent>
```

| Component | File | Interface |
|-----------|------|-----------|
| `FXHandler<T>` | `fx/FXRegistry.ts` | `{ id: string, priority: number, handle(event, ctx), update?(ctx), destroy?() }` |
| `FXRegistry` | `fx/FXRegistry.ts` | `registerConquest(handler)`, `dispatchConquest(event, ctx)`, `updateAll(ctx)` |
| `FXOrchestrator` | `fx/orchestrator.ts` | `processEvents(tickEvents, starsById, effectiveTickMs)`, `update(wallNow, starsById, effectiveTickMs)` |
| `FXContext` | `fx/types.ts` | `{ gameTime, dt, starsById, vsm, effectiveTickMs }` |
| `ConquestEvent` | `@pax/common` | `{ starId, previousOwner, newOwner, ... }` |

### How Territory Transitions Wire Into FX

**Current state:** Territory transitions (border morphing, fill crossfade, smooth polyline interpolation) are hardcoded inside `renderPowerVoronoi()` as module-level state variables (`isBorderTransitioning`, `isSmoothTransitioning`, `isFillTransitioning`, etc.). These are now encapsulated in `PVV2RendererState`.

**Target state:** Territory transitions become `FXHandler<ConquestEvent>` implementations registered with the `FXRegistry`.

#### Data Flow

```
ConquestEvent fires
    ↓
FXOrchestrator.processEvents()
    ↓
FXRegistry.dispatchConquest(event, ctx)
    ↓
territoryBorderTransitionHandler.handle(event, ctx)
    → stores prevGeometry + targetGeometry
    → starts transition timer
    ↓
Each frame: FXOrchestrator.update()
    ↓
FXRegistry.updateAll(ctx)
    ↓
territoryBorderTransitionHandler.update(ctx)
    → interpolates between prevGeometry and targetGeometry using ctx.gameTime
    → writes interpolated geometry to a shared territory transition state
    ↓
Presentation layer reads interpolated geometry
    → draws fills and borders
```

#### FXContext Extension

`FXContext` needs access to territory geometry. Two options:

1. **Via VSM**: Extend `VisualStateManager` with territory geometry fields
2. **Via shared state**: The territory transition handler holds its own state (like `PVV2RendererState`) and the presentation layer reads from it

Option 2 is cleaner — the handler owns its state, the renderer reads it. No FXContext changes needed.

#### Registration

```typescript
// In territory initialization or game setup:
fxOrchestrator.registry.registerConquest(territoryBorderTransitionHandler);
fxOrchestrator.registry.registerConquest(territoryFillTransitionHandler);
```

Priority should be HIGHER than default (100) to run AFTER the core conquest handler processes ship animations:
```typescript
territoryBorderTransitionHandler.priority = 200;
territoryFillTransitionHandler.priority = 200;
```

#### What ConquestEvent Carries

`ConquestEvent` from `@pax/common` carries `starId`, `previousOwner`, `newOwner`. This is enough to trigger a geometry recomputation — the transition handler can request fresh geometry from the geometry layer when a conquest fires.

---

## 4. Legacy Compatibility

### Toggle Requirement

Until the refactor is complete, both legacy and new architecture must be selectable in the UI. This means:

- The existing working pipeline (legacy_pvv2 with DY4) MUST remain fully functional
- A UI toggle or dropdown allows switching between legacy and refactored rendering
- The `RefactoredPVV2Renderer` (with isolated `PVV2RendererState`) serves as the new-architecture path
- No regression is acceptable on the legacy path — DY4 SACROSANCT

### Config Migration

When users have saved config with obsolete keys (`TERRITORY_ENGINE_MODE`, `TERRITORY_ENGINE_STATIC_METHOD`, `TERRITORY_ENGINE_DYNAMIC_METHOD`), the system should:
- Detect these obsolete keys
- Map them to current DY4-based defaults
- Update the user's settings automatically

---

## 5. OBSOLETE — Do NOT Use

> [!WARNING]
> The following concepts exist in the codebase but are **OBSOLETE**.
> They must be migrated away from, not built upon.

### Obsolete: Static/Dynamic Engine Mode

**What static/dynamic originally meant:**
- **Static** = renders unchanged map areas (= the whole map when there are no conquests that tick)
- **Dynamic** = renders the changed areas, possibly the whole map every frame with dirty-checking

This distinction is replaced by the 4-layer pipeline where geometry produces shapes, transitions animate changes, and presentation draws to screen. The "static" concern (render unchanged areas) is a dirty-checking optimization inside the geometry layer, not a top-level engine mode.

| Obsolete Concept | Location | Replacement |
|-----------------|----------|-------------|
| `TerritoryEngineMode = 'static' \| 'dynamic' \| 'hybrid'` | `types.ts` | Removed. Method descriptors declare their own `implementedStages`. |
| `TERRITORY_ENGINE_MODE` config key | `game.config.ts` | Removed. Map to DY4 defaults on detection. |
| `TERRITORY_ENGINE_STATIC_METHOD` config key | `game.config.ts` | Replaced by Geometry dropdown. |
| `TERRITORY_ENGINE_DYNAMIC_METHOD` config key | `game.config.ts` | Replaced by Fill/Border Transition dropdowns. |

### Obsolete: Separate Static/Dynamic Registries

| Obsolete | Location | Replacement |
|----------|----------|-------------|
| `TerritoryStaticMethodId` / `TerritoryDynamicMethodId` | `types.ts` | `TerritoryMethodId` (single unified type) |
| `TerritoryStaticMethodDescriptor` / `TerritoryDynamicMethodDescriptor` | `types.ts` | `TerritoryMethodDescriptor` (unified) |
| `TERRITORY_STATIC_METHODS[]` / `TERRITORY_DYNAMIC_METHODS[]` | `registry.ts` | `TERRITORY_METHODS[]` (single array) |
| `anchorStaticMethodId` | `registry.ts` | Removed. Geometry and transition are independently selected. |

### Obsolete: Other

- PRD 6-layer model (replaced by 4-layer)
- Hybrid plans (removed in Phase 3)
- `CanonicalTerritoryState` with `metricTruth` / `frontierGraph` / `regions` / `transitionActive` naming

### Stale Code Indicators

If you encounter ANY of these patterns, the code is likely obsolete — STOP and verify against this document:

- References to `'static' | 'dynamic'` as engine modes
- `resolveStaticMethodId()` or `resolveMethodSelection()` using static/dynamic splits
- `TERRITORY_ENGINE_STATIC_METHOD` or `TERRITORY_ENGINE_DYNAMIC_METHOD` in UI controls
- `anchorStaticMethodId` field on method descriptors
- UI sections labeled "Engine Pipeline" with Mode/Static/Dynamic selectors
- Types or functions named `MetricState`, `CanonicalTerritoryState`, `metricTruth`
- Any code that separates methods into "static" and "dynamic" registries
- References to hybrid plans (HY1-HY5, DY1-DY3, DY5, FG3-FG5)

---

## 6. File Map

| File | Layer | Purpose |
|------|-------|---------|
| `territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts` | Geometry | Cell computation, merge, smoothing, shared edges/polylines |
| `renderers/PowerVoronoiRenderer.ts` | Presentation | Draw fills + borders from geometry stage output |
| `renderers/RefactoredPVV2Renderer.ts` | Presentation | Class-encapsulated wrapper with isolated `PVV2RendererState` |
| `renderers/geometry/borderTransition.ts` | Transition | `SegmentMorphTransitionHandler`, `PolygonMorphTransitionHandler`, `RopeBorderRenderer` |
| `fx/FXRegistry.ts` | VFX | Handler registration + priority dispatch |
| `fx/orchestrator.ts` | VFX | Clock + VSM + registry coordinator |
| `fx/handlers/conquestHandler.ts` | VFX | Core conquest event handler (ships, flash, color) |
| `territory/orchestrator/engine.ts` | Orchestrator | Route-and-dispatch coordinator |
| `territory/orchestrator/registry.ts` | Config | Method descriptors (**contains obsolete static/dynamic split — pending cleanup**) |
| `territory/orchestrator/types.ts` | Types | Type definitions (**contains obsolete static/dynamic types — pending cleanup**) |
| `utils/colorUtils.ts` | Shared | Color manipulation (blendColors, hexToRGB, adjustColorHSL) |
