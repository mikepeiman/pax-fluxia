# Territory Architecture — Canonical Reference

**Date:** 2026-03-19
**Status:** ACTIVE — This is the single source of truth for territory system architecture.
**Ref:** D-83

> [!CAUTION]
> Any AI agent working on territory code MUST read this document before making changes.
> If your changes contradict anything here, STOP and ask the user.

---

## Current Architecture: 4-Layer Pipeline

Agreed on 2026-03-19 (V3, iterated through 3 versions with user feedback).

```
Ownership → Geometry → Transition → Presentation
```

| Layer | Responsibility | Key Concept |
|-------|----------------|-------------|
| **Ownership** | Who owns what. Graph-native, derived from conquest events. | `GraphOwnershipState` |
| **Geometry** | Shapes from ownership. Power Voronoi cells, merged territories, shared borders. | `TerritoryGeometryData` |
| **Transition** | Animating between geometry states. FX handlers, morphers, easing. | `FXHandler<ConquestEvent>` |
| **Presentation** | Drawing to screen. PIXI.Graphics fills, strokes, containers. | `PVV2RendererState` |

### Compiler Rules
- NO rendering in compiler
- NO PIXI imports in compiler
- NO placeholder or fallback geometry
- NO config mutation
- Return typed data only

### Renderer Rules
- FillMeshCache and BorderMeshCache are caches only, never truth
- Fills and borders must both derive from the exact same canonical frontier/region data
- Renderer must not compute ownership or invent geometry

### State Rules
- NO module-level mutable renderer state
- NO global animation state
- Use class-encapsulated renderer instances and explicit transition plans

### Current Renderer: PVV2 (PowerVoronoiRenderer)
- `renderPowerVoronoi()` accepts `state?: PVV2RendererState` parameter
- Legacy callers pass nothing → uses `defaultState` (unchanged behavior)
- `RefactoredPVV2Renderer` creates isolated state via `createPVV2State()`
- DY4 Optimal Transport is **SACROSANCT** — do not alter its behavior without explicit user approval

### Current UI: Territory Presentation Dropdowns
The user-facing controls are in the **Territory Presentation** section:
- **Geometry** — selects geometry source (FG1, FG2, etc.)
- **Style** — selects render style
- **Fill Transition** — selects fill transition mode
- **Border Transition** — selects border transition mode

New rendering methods should be added to THESE existing dropdowns, not new sections.

---

## OBSOLETE — Do NOT Use

> [!WARNING]
> The following concepts exist in the codebase but are **OBSOLETE**.
> They are leftover from a previous architecture and must be migrated away from, not built upon.

### Obsolete: Static/Dynamic Engine Mode

| Concept | Location | Why Obsolete |
|---------|----------|--------------|
| `TerritoryEngineMode = 'static' \| 'dynamic' \| 'hybrid'` | `types.ts:7` | Replaced by 4-layer pipeline. Methods are not "static" or "dynamic" — they are ownership+geometry producers with optional transition handlers. |
| `TERRITORY_ENGINE_MODE` config key | `game.config.ts` | No longer a meaningful distinction. |
| `TERRITORY_ENGINE_STATIC_METHOD` config key | `game.config.ts` | Methods are selected by the Geometry dropdown, not a separate "static method" selector. |
| `TERRITORY_ENGINE_DYNAMIC_METHOD` config key | `game.config.ts` | Same — transitions are a layer concern, not a method concern. |

### Obsolete: Separate Static/Dynamic Method Registries

| Concept | Location | Why Obsolete |
|---------|----------|--------------|
| `TerritoryStaticMethodId` type | `types.ts:9-12` | Should be a single `TerritoryMethodId` — the static/dynamic split is artificial. |
| `TerritoryDynamicMethodId` type | `types.ts:14-16` | Same. |
| `TerritoryStaticMethodDescriptor` | `types.ts:101-107` | Should be unified into `TerritoryMethodDescriptor`. |
| `TerritoryDynamicMethodDescriptor` | `types.ts:109-116` | Same. |
| `TERRITORY_STATIC_METHODS[]` registry | `registry.ts:23-57` | Should be a single methods registry. |
| `TERRITORY_DYNAMIC_METHODS[]` registry | `registry.ts:59-85` | Same. |
| `anchorStaticMethodId` field | `registry.ts:74,83` | The "anchor" concept is a coupling artifact of the static/dynamic split. |

### Obsolete: Engine Pipeline UI Section

The "Engine Pipeline" section with Engine Mode / Static Method / Dynamic Method dropdowns added on 2026-03-19 is obsolete — it exposes the obsolete static/dynamic mode concepts as user-facing controls rather than using the existing Territory Presentation dropdowns.

### Obsolete: PRD 6-Layer Model

The earlier PRD specified a 6-layer pipeline. This was replaced by the 4-layer model on 2026-03-19.

### Obsolete: Hybrid Plans

All hybrid plan infrastructure (types, registry entries, engine branches, UI) was removed in Phase 3 (commit `e475dfc`).

---

## DY4 Sacrosanct Rule

DY4 Optimal Transport is the canonical default border animation mode. It produces the most unique and attractive border animations in the game. It is **sacrosanct**.

- Never change DY4 defaults in `registry.ts` or `game.config.ts` without user approval
- Never modify `PowerVoronoiRenderer.ts` in ways that could alter DY4 visual output without verification
- Before any territory refactor, verify DY4 renders correctly both before and after
- When in doubt, ask

---

## File Map (Current)

| File | Layer | Purpose |
|------|-------|---------|
| `territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts` | Geometry | Cell computation, merge, smoothing, shared edges/polylines |
| `renderers/PowerVoronoiRenderer.ts` | Presentation | Draw fills + borders from geometry stage output |
| `renderers/RefactoredPVV2Renderer.ts` | Presentation | Class-encapsulated wrapper with isolated `PVV2RendererState` |
| `renderers/geometry/borderTransition.ts` | Transition | `SegmentMorphTransitionHandler`, `PolygonMorphTransitionHandler`, `RopeBorderRenderer` |
| `territory/orchestrator/engine.ts` | Orchestrator | Route-and-dispatch coordinator |
| `territory/orchestrator/registry.ts` | Config | Method descriptors (**contains obsolete static/dynamic split**) |
| `territory/orchestrator/types.ts` | Types | Type definitions (**contains obsolete static/dynamic types**) |
| `utils/colorUtils.ts` | Shared | Color manipulation (blendColors, hexToRGB, adjustColorHSL) |
