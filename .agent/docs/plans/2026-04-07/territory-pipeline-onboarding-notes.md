# Territory pipeline — onboarding notes (2026-04-07)

**Purpose:** Track a discerning read-through while ramping toward a **first complete** territory implementation: ownership regions with stated constraints, **smooth fitted frontiers**, **fill matching borders**, and **smooth conquest morphs**, aligned with the **4-layer** model (ownership → geometry → transition → presentation).

**Caveat (user):** No guaranteed single coherent spec — partial/conflicting agent work over ~two months. This file is a **working map**, not a claim of final truth.

---

## A. Strongest written spec (read first)

| Doc | Role |
|-----|------|
| `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` | Declares itself **canonical** (2026-03-19): 4 layers, layer rules (Chaikin **only** in geometry; presentation uses **same** points for fill+stroke), 4-axis UI (Geometry / Style / Fill transition / Border transition), FX target architecture for transitions. |
| `.agent/docs/project/open-questions/OPEN_QUESTIONS.md` | Resolved vs pending (e.g. independent fill/border caches from same canonical geometry; lane-split edge cases). |

**Doc/code mismatch to flag:** `TERRITORY_ARCHITECTURE.md` §6 and `registry.ts` comments reference `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` — that path **does not exist** in-repo; the real file is under `.agent/docs/game/territory/`.

---

## B. Two parallel “truths” in code (must not confuse)

### B1 — **Legacy / engine path** (what most `GameCanvas` style modes use)

- **Entry:** `renderTerritoryEngine()` → `pax-fluxia/src/lib/territory/orchestrator/engine.ts` → `runLegacyAdapter()` → typically **`renderPowerVoronoi()`** (`PowerVoronoiRenderer.ts`).
- **`new_frontiers_0319`:** When `TERRITORY_GEOMETRY_MODE === 'new_frontiers_0319'` **or** `TERRITORY_ENGINE_METHOD === 'new_frontiers_0319'`, engine precomputes via **`computeGeometry0319()`** (`Geometry_0319.ts`) and passes result into PVV2 — **geometry fix lives here**, presentation still PVV2.
- **FG2 full pipeline:** `fg2_seed_graph` → `runFG2DataPipeline()` → PVV3 adapter (`renderPVV3`).
- **DY4 Optimal Transport:** `OptimalTransportBorderTransition` is **instantiated** in `engine.ts` (`_dy4OT`) but comment states it is **currently unused** — wiring waits for compiler output in **`CanonicalTerritoryState` / whole-territory shells** (not FG2 fragments).

### B2 — **Clean 4-layer runtime** (intended new architecture)

- **Coordinator:** `TerritoryRuntimeCoordinator` (`runtime/TerritoryRuntimeCoordinator.ts`) chains:
  - `OwnershipLayerCoordinator` → `GeometryLayerCoordinator` (via **`TerritoryWorker`**) → `TransitionLayerCoordinator` → `PresentationLayerCoordinator` → **`PixiTerritoryPresenter`** (fills + borders).
- **Geometry registry** (`layers/geometry/registry.ts`): **only** `UnifiedVectorGeometryMode` → **`compileVectorGeometry()`** (`compiler_UnifiedVectorGeometry.ts`). Separate from `Geometry_0319` / PVV2 pipeline unless explicitly bridged.
- **Integration:** `GameCanvasTerritoryBridge` (imported in `GameCanvas` as **`GameCanvasBridge`** — re-export in `GameCanvasBridge.ts`) wraps coordinator + presenter + VFX bridge.
- **When it runs:** `GameCanvas.svelte` case `"territory_canonical"` **and** `resolveTerritoryArchitectureRoute()` → `architecturePath === 'clean'` → **`canonical_clean_bridge`**. Otherwise canonical mode can fall back to **`TerritoryEngineController` + `TerritoryRenderer`** (“legacy canonical controller”).

### B3 — **What the user’s live settings actually select**

From `common/resources/settings-live/current-settings.json` (snapshot 2026-04-07):

- `TERRITORY_RENDER_MODE`: **`"pvv2_dy4"`** → `GameCanvas` dispatches to **`renderPVV2DY4`** (`PowerVoronoiRenderer_DY4.ts`) — **reference / restored** path, **not** `territory_canonical` and **not** `renderTerritoryEngine`.
- `TERRITORY_GEOMETRY_MODE`: **`new_frontiers_0319`** (aligns with Geometry_0319 intent when engine path is used).
- `TERRITORY_ARCHITECTURE_PATH`: **`clean`** (only affects routing when render mode is **`territory_canonical`**).

**Implication:** Codebase defaults in `game.config.ts` favor **`territory_canonical` + clean**; **live** session uses **`pvv2_dy4`**. Completing “the” pipeline requires deciding whether the **product** target is the **clean bridge** (layers + Pixi presenter) or **stabilizing** PVV2/DY4/0319 first and merging behavior.

---

## C. Registry vs conceptual 4-layer (naming debt)

- **`types.ts`** defines canonical stage IDs: `ownership | geometry | transition | presentation` **plus** legacy fine-grained IDs (`metric`, `seed`, …).
- **`registry.ts` `TERRITORY_PIPELINE_STAGE_ORDER`** is still the **legacy** list (`metric` → … → `render`); comment admits canonical 4-stage is **conceptual grouping**; `executeStage` + `runLegacyAdapter` implement the **bootstrap** path.
- **`new_frontiers_0319`** in registry: `implementedStages: ['render']` only — **does not** mean “full native 4-stage execution”; it means “adapter draws,” with optional **Geometry_0319** pre-pass in `runLegacyAdapter`.

---

## D. Feature & regression tracker (updated 2026-04-08)

- **Single authority:** `.agent/docs/project/features/FEATURE_STATUS.md` — main body (2026-02-16) + **Supplement** with renumbered **MC- / RG- / TR- / FI-** rows (deduped from former parallel trackers; verbatim appendices removed).
- **Stubs:** `.atlas/FEATURE_STATUS.md`, `pax-fluxia/.atlas/FEATURE_STATUS.md` → redirect only.
- **Chronological plan index:** `.agent/docs/project/planning-docs-chronological-index.md`
- **Phased deep audit:** `deep-audit-territory-phased-plan.md`. Prefer **atlas-harness** MCP for symbol/trace work.

---

## E. Suggested next reads (task-driven)

1. **`PixiFillPresenter` / `PixiBorderPresenter`** — do fills and borders share one command source (per architecture doc)?
2. **`TransitionLayerCoordinator` + selected modes** (`FrontierMorphFillMode`, `OptimalTransportBorderMode`, etc.) vs **`PowerVoronoiRenderer_DY4`** — where morph quality diverges.
3. **`TerritoryEngineController` / `TerritoryRenderer`** — legacy canonical fallback when clean bridge errors.
4. **`Geometry_0319.ts`** remainder — full output contract passed to PVV2.

---

## F. Open questions from this pass

- Single **user-facing** “golden path”: `territory_canonical`+clean vs `pvv2_dy4` vs `territory_engine` — which is **authoritative** for “done”?
- When does **`UnifiedVectorGeometryMode`** output match or replace **`Geometry_0319`** for shipped visuals?
- **`_dy4OT` wiring:** explicit milestone list from engine comment (shells from `TerritoryCompiler` / canonical state).

---

*Next update: after first deep pass on `TerritoryRuntimeCoordinator` output contracts + `PixiTerritoryPresenter` draw path, or after user pins target render mode.*
