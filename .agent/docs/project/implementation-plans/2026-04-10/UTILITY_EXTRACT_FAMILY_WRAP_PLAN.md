# Consolidation Plan: Utility-Extract → Wrap All Families

**Date:** 2026-04-10
**Status:** Proposed
**Author:** opencode (architect review pending)

---

## Guiding Principle

Every renderer that exists is a **visual option worth keeping**. The goal is not fewer renderers — it's making all of them accessible through one clean mechanism, with shared utilities under the hood. No deletion. Maximum variety for player choice and developer evaluation across simplicity, performance, tunability, and debuggability.

---

## Renderer Inventory (all kept, all become families eventually)

| Renderer | LOC | Status | Family wrap difficulty |
|---|---|---|---|
| `MetaballRenderer.ts` | 341 | Already wrapped | **Done** |
| `PowerVoronoiRenderer.ts` | 5,119 | Active canonical (DY4/OT) | Medium — wrap via bridge facade |
| `DistanceFieldTerritoryRenderer.ts` | 1,796 | Working GPU path | Low — self-contained |
| `ContourTerritoryRenderer.ts` | 849 | Working, worker-based | Low |
| `GraphTerritoryRenderer.ts` | 277 | Working, simple | Very low |
| `PixelTerritoryRenderer.ts` | — | Working, worker-based | Low |
| `VoronoiRenderer.ts` | 387 | Working base Voronoi | Very low |
| `PVV3Renderer.ts` | 780 | Barrel re-export of `geometry/` | Medium — needs untangling |
| `ModifiedVoronoiRenderer.ts` | 1,082 | Unwired, preserved for reference | Low — re-wire through family |
| `PowerVoronoiRenderer_DY4.ts` | 1,538 | Superseded, preserved for comparison | Low |
| `RefactoredPVV2Renderer.ts` | 68 | Experimental stub, preserved | Trivial |

---

## Phase 1: Utility Dedup (~1-2 sessions)

Multiple renderers inline their own copies of shared geometry functions. The `renderers/geometry/` directory (10 files, ~600 lines total) already has canonical versions. The problem is duplication, not absence.

**Audit and redirect:**

| Utility | Known copies | Canonical location |
|---|---|---|
| `mergeSameOwnerCells` | 3 copies (PVV2, PVV3 barrel, ModifiedVoronoi) | `renderers/geometry/mergeUtils.ts` |
| `chaikinSmoothPolyline` / `chaikinSmoothPolygon` | Inlined in PVV2 | `renderers/geometry/chaikin.ts` |
| `resamplePolygon`, `lerpPolygon`, `ptKey`, `edgeKey` | Inlined in PVV2 | `renderers/geometry/polyUtils.ts` |
| `adjustColorHSL`, `blendColors` | Inlined in multiple renderers | `renderers/geometry/` barrel |
| `applyMinStarMargin`, `smoothSharpVertices`, `applyDisconnectBuffer` | Extracted to `geometryModifiers.ts` but may not be imported everywhere | `renderers/geometry/geometryModifiers.ts` |

**Method:** For each file, grep for the function name. If a renderer has its own inline copy, replace the inline with an import from the canonical location. No logic changes. No restructure. Pure import redirection.

**Verification:** `bunx vite build` passes. Game runs. Territory renders identically. Git commit per utility group.

---

## Phase 2: VectorPolygonFamily Facade (~2-3 sessions)

The canonical territory path (4-layer architecture → `GameCanvasTerritoryBridge`) stays exactly as-is. We wrap it in a thin `RenderFamily` adapter.

```typescript
// territory/families/vectorPolygon/VectorPolygonFamily.ts
export class VectorPolygonFamily implements RenderFamily {
    readonly id = 'vector_polygon';
    readonly label = 'Vector Polygon';
    readonly tunableKeys = VECTOR_POLYGON_TUNABLE_KEYS;

    private bridge: GameCanvasTerritoryBridge;

    constructor(container: PIXI.Container, resolveOwnerColor?: OwnerColorResolver) {
        this.bridge = new GameCanvasTerritoryBridge(container, resolveOwnerColor);
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const frameInput = toFrameInput(input);
        this.bridge.update(frameInput);
        return {
            container: this.bridge.container,
            diagnostics: this.bridge.diagnostics,
        };
    }

    dispose(): void {
        this.bridge.destroy();
    }
}
```

The `tunableKeys` list is derived from what the 4-layer pipeline actually reads from `GAME_CONFIG`. The `toFrameInput()` function maps `RenderFamilyInput` → `TerritoryFrameInput`. Both are thin conversion layers — no new logic.

**Key rule:** The 4-layer pipeline code is untouchable in this phase. The facade only calls the existing `GameCanvasTerritoryBridge` API from outside.

**Verification:** Game works identically. Can switch between `vector_polygon` and `metaball` by changing family ID. Git commit.

---

## Phase 3: Family Adapters for All Existing Renderers (~3-5 sessions)

One thin adapter per renderer, following the `MetaballFamily` pattern (71 lines). Each adapter:
- Holds a `PIXI.Container` and any renderer-specific state
- Calls the existing renderer's top-level function in `update()`
- Declares its `tunableKeys` (the `GAME_CONFIG` keys it actually reads)
- Implements `dispose()` to clean up caches and children

| New Family | Wraps | Notes |
|---|---|---|
| `DistanceFieldFamily` | `DistanceFieldTerritoryRenderer` | GPU shader — needs `PIXI.Renderer` on input, already in `RenderFamilyInput` |
| `ContourFamily` | `ContourTerritoryRenderer` | Worker-based — `update()` dispatches to worker, returns container |
| `GraphFamily` | `GraphTerritoryRenderer` | Simplest — small file, easy win |
| `PixelFamily` | `PixelTerritoryRenderer` | Worker-based |
| `VoronoiFamily` | `VoronoiRenderer` | Base Voronoi |
| `ModifiedVoronoiFamily` | `ModifiedVoronoiRenderer` | Re-wires the currently-unwired `renderModifiedVoronoi()` — this makes it accessible again |
| `PVV2LegacyFamily` | `PowerVoronoiRenderer` (direct, not via bridge) | Direct PVV2 call, bypasses 4-layer pipeline, for comparison/evaluation |
| `PVV3Family` | `PVV3Renderer` | Barrel re-export — needs its `geometry/` modules imported directly |
| `DY4LegacyFamily` | `PowerVoronoiRenderer_DY4` | Preserved for comparison with current canonical |

Each adapter is independent. They can be built in any order. Start with the easiest (`GraphFamily`, `VoronoiFamily`) to prove the pattern, then tackle the GPU ones (`DistanceFieldFamily`), then the PVV variants.

**`ModifiedVoronoiFamily` is notable:** it re-wires a renderer that currently has no dispatch path. This gives the player access to `modified_voronoi` visuals again, and gives you a live comparison point for arc+margin+DX geometry modifiers.

**Verification per adapter:** Switch to that family ID in a debug control. Render works. Switch back. No regressions. Git commit per adapter.

---

## Phase 4: Config Consolidation (~1-2 sessions)

Now that every family declares its `tunableKeys`, we can see which keys are shared vs family-specific.

| Config key pattern | Current state | Target state |
|---|---|---|
| `DF_BLUR` | DF-specific | Shared `TERRITORY_BLUR` with DF and others reading it |
| `DF_EDGE_FADE` | DF-specific | Shared `TERRITORY_EDGE_FADE` |
| `VORONOI_BORDER_SMOOTH` | Misnamed — smooths fills | Renamed `TERRITORY_GEOMETRY_SMOOTH_PASSES` |
| `TERRITORY_MORPH_CONTROL_POINTS` | Has UI slider, no consumer | Wire to a family or mark as reserved |
| Family-specific keys | Scattered in `GAME_CONFIG` | Organized in `PerFamilyTunableMaps.ts` |

**Approach:** Add canonical shared keys alongside old keys. Old keys stay as aliases (read old key if new key missing). No renderer breaks. Over time, UI labels point to the new names.

**New file:** `territory/config/TerritoryTunableDefinitions.ts` — each key has a canonical name, type, default, range, and list of families that use it. This replaces ad-hoc `GAME_CONFIG` reads scattered through renderers.

**Verification:** Game runs. All families render. Old config keys still work. New keys work. Git commit.

---

## Phase 5: Family Dispatch + Unified UI (~2-3 sessions)

Replace the current routing:

```
GameCanvas → TerritoryArchitectureRouter → clean/legacy fork
  → clean: GameCanvasTerritoryBridge (4-layer pipeline)
  → legacy: TerritoryLegacyBridge → renderer switch case
```

With:

```
GameCanvas → getRenderFamily(currentFamilyId) → family.update(input)
  fallback: TerritoryLegacyBridge for styles not yet migrated
```

Feature-gated with `USE_RENDER_FAMILIES` flag. Default off. Both paths tested.

**UI change:** `ControlsSection-Territory.svelte` (2,034 lines) becomes family-aware:

1. **Family selector** — dropdown of all registered families (from registry epoch)
2. **Family-specific tunables** — dynamically shown based on `family.tunableKeys`
3. **Shared tunables** — always visible (blur, edge fade, smoothing)

This replaces the current misleading combo of independent dropdowns (render mode, fill transition, border transition, geometry mode) that only apply to the vector polygon path.

Legacy style IDs continue to work during migration. As each family adapter is registered, its style ID maps to the family path. Un-registered styles fall through to the legacy bridge.

**Verification:** Toggle `USE_RENDER_FAMILIES`. Both paths work. All families accessible from UI. Git commit.

---

## Sequencing Summary

| Phase | Scope | Risk | Sessions | Dependency |
|---|---|---|---|---|
| 1 | Utility dedup (import redirection) | Very low | 1-2 | None |
| 2 | VectorPolygonFamily facade | Low-medium | 2-3 | Phase 1 |
| 3 | Family adapters (all renderers) | Low per adapter | 3-5 | Phase 2 (pattern proven) |
| 4 | Config consolidation | Low | 1-2 | Phase 3 (all tunableKeys known) |
| 5 | Family dispatch + UI | Medium | 2-3 | Phase 4 |

Phases 1-3 are **purely additive**. No existing code is restructured — utilities get canonical imports, renderers get thin wrappers, the 4-layer pipeline gets a facade. Phase 4 is additive config. Phase 5 is where routing changes, feature-gated.

---

## Orthogonal Work (can proceed in parallel)

- **DX disconnect bug** — 0 sites produced. Fix in `applyDisconnectBuffer` / Union-Find logic. Independent of family system.
- **Active Front Interpolation gaps** — t=0 continuity, deleted borders, closed-loop twisting. Happens inside the transition layer, independent of dispatch.
- **B-37 two-pass alignment** — GPU two-pass renderer alignment bug. DF-family concern.
- **New family experiments** — want to try a new rendering approach? Create a family adapter, register it, done. No architecture debate needed.

---

## What This Plan Explicitly Does NOT Do

1. **No extraction of PVV2 into layers.** The 4-layer pipeline stays monolithic inside `VectorPolygonFamily`. The 5-step canonical geometry contract migration (Steps 1-3 in `_review-reconcile/`) stays shelved until the facade proves stable.

2. **No new contracts before utilities.** `CanonicalGeometrySnapshot` with shells, provenance, and diagnostics is a good idea but depends on geometry extraction. It waits.

3. **No deletion of any renderer.** ModifiedVoronoi, DY4, RefactoredPVV2, all stay. They become family adapters, not deletions.

4. **No DX fix as a prerequisite.** The disconnect territory producing 0 sites is a bug fixable independently in `applyDisconnectBuffer` / Union-Find logic.

5. **No B-37 two-pass alignment as a prerequisite.** GPU two-pass alignment is a DistanceField-family concern addressable inside that adapter.