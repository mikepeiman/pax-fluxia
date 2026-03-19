---
trigger: always_on
---

Use Planning mode. 
Follow .agent/agent.md
Use MCP atlas-harness for CLI work where possible.

Read `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` before any territory work.

Follow this exact architecture:

Canonical pipeline (V3, 2026-03-19):
Ownership → Geometry → Transition → Presentation.

This REPLACES the old MetricState → FrontierGraph → TerritoryRegions → RenderCaches pipeline.

## Layer Responsibilities

- **Ownership**: Who owns what. Graph-native, from conquest events. (`GraphOwnershipState`)
- **Geometry**: Shapes from ownership. Power Voronoi cells, merged territories, shared borders. (`TerritoryGeometryData`)
- **Transition**: Animating between geometry states. FX handlers, morphers, easing. (`FXHandler<ConquestEvent>`)
- **Presentation**: Drawing to screen. PIXI.Graphics fills, strokes, containers. (`PVV2RendererState`)

## Compiler Rules

- NO rendering in compiler.
- NO PIXI imports in compiler.
- NO placeholder or fallback geometry.
- NO config mutation.
- Return typed data only.

## Render Rules

- FillMeshCache and BorderMeshCache are caches only, never truth.
- Fills and borders must both derive from the exact same canonical frontier/region data for the same frame.
- Renderer must not compute ownership or invent geometry.

## State Rules

- NO module-level mutable renderer state.
- NO global animation state.
- Use class-encapsulated renderer instances and explicit transition plans.
- `renderPowerVoronoi()` accepts `state?: PVV2RendererState` — always pass state, never rely on module globals.

## Implementation Rule

Preserve layer separation strictly. If a stage is incomplete, return a typed error or notImplemented status rather than fabricating geometry.

## DY4 Sacrosanct

DY4 Optimal Transport is the canonical default border animation mode. Do NOT alter its behavior without explicit user approval.

## OBSOLETE — Do NOT Build On

The following concepts still exist in code but are OBSOLETE:

- `TerritoryEngineMode = 'static' | 'dynamic' | 'hybrid'` — replaced by 4-layer pipeline
- `TERRITORY_ENGINE_MODE`, `TERRITORY_ENGINE_STATIC_METHOD`, `TERRITORY_ENGINE_DYNAMIC_METHOD` config keys
- Separate `TerritoryStaticMethodId` / `TerritoryDynamicMethodId` types and registries
- `anchorStaticMethodId` coupling in method descriptors
- PRD 6-layer model (replaced by 4-layer)
- Hybrid plan infrastructure (removed in Phase 3)
- `CanonicalTerritoryState` with `metricTruth` / `frontierGraph` / `regions` / `transitionActive` (old naming)

### Stale Code Indicators

If you encounter any of these patterns, the code is likely obsolete:

- References to `'static' | 'dynamic'` as engine modes
- `resolveStaticMethodId()` or `resolveMethodSelection()` using static/dynamic splits
- `TERRITORY_ENGINE_STATIC_METHOD` or `TERRITORY_ENGINE_DYNAMIC_METHOD` in UI controls
- `anchorStaticMethodId` field on method descriptors
- UI sections labeled "Engine Pipeline" with Mode/Static/Dynamic selectors
- Types or functions named `MetricState`, `CanonicalTerritoryState`, `metricTruth`
- Any code that separates methods into "static" and "dynamic" registries
- References to hybrid plans (HY1-HY5, DY1-DY3, DY5, FG3-FG5)

## Validation Rule

Test: graph-native ownership, shared frontier uniqueness, fill/border derivation from one source, no module-level mutable state, transition alignment.

Implement strictly.