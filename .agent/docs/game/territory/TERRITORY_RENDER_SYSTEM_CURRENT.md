# Territory Render System - Current Architecture And Status

**Date:** 2026-04-28  
**Status:** ACTIVE current-state reference for territory render work  
**Purpose:** This document supersedes the older architecture reference for current-state reasoning, code-status checks, and near-term planning. It is written against the live repo plus the 2026-04-27 and 2026-04-28 perf/audit work.

## 1. Governing Documents

Use these in this order:

1. `.agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
2. `this document`
3. `pax-fluxia/docs/rendering-pipeline-audit-2026-04-27.md`
4. `pax-fluxia/docs/gameplay-performance-findings-and-plan-2026-04-27.md`

This document is for:

- what exists now
- what is drifted now
- which names are misleading now
- which runtime paths are real now

This document is not the place to preserve old terminology for its own sake.

## 2. Core Model

### 2.1 Shared truth

The shared truth is still:

`ownership -> geometry -> transition -> presentation`

That model remains the runtime pipeline for the vector/pipeline route.

### 2.2 Current reality

The repo is not running one single territory architecture today. It is running three territory runtime shapes side by side:

| Runtime shape | What it is | Current modes / entrypoints |
|---|---|---|
| Pipeline runtime | `TerritoryRuntimeCoordinator` drives the 4-layer pipeline | `territory_runtime`, `territory_engine` |
| Render-family runtime | `GameCanvas` builds `RenderFamilyInput` and calls a family adapter | `metaball_grid` |
| Direct legacy renderer runtime | `GameCanvas` calls a renderer directly, outside the family contract | `vs_pvv3`, `distance_field`, `pixel`, `power_voronoi`, `voronoi`, `metaball`, `graph`, `contour`, `perimeter_field` |

That split is the most important current-state fact. Any document that describes the repo as if every territory mode already lives behind the same family shell is wrong.

## 3. Actual Runtime Paths

### 3.1 Pipeline runtime

`TerritoryRuntimeCoordinator` currently does:

`normalizeTerritoryFrameInput() -> OwnershipLayerCoordinator -> TerritoryWorker.computeGeometrySync() -> TransitionLayerCoordinator -> PresentationLayerCoordinator`

This remains the structured 4-layer pipeline.

### 3.2 Render-family runtime

The family shell exists and is real:

- `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`
- `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`
- `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts`

But only `metaball_grid` is meaningfully on that path today.

### 3.3 Direct legacy renderers

Several important modes still bypass the family shell entirely and are dispatched directly from `GameCanvas.svelte`.

That means:

- they do not yet share one runtime contract
- they do not yet share one diagnostics surface
- they do not yet share one semantic naming scheme

## 4. Semantically Precise Vocabulary

### 4.1 Terms to use

| Precise term | Meaning |
|---|---|
| `pipeline runtime` | The 4-layer ownership/geometry/transition/presentation route |
| `render family` | A mode-local runtime that owns its own geometry/transition/presentation story behind `RenderFamily.update()` |
| `direct legacy renderer` | A renderer called directly from `GameCanvas` without the family contract |
| `fill transition mode` | How fill geometry changes across conquest |
| `border transition mode` | How border geometry changes across conquest |
| `visual throttling` | Deliberately rendering less visual information or presenting less often for performance |
| `fixed visual cap` | A stable, product-approved maximum number of visuals for a surface |

### 4.2 Terms to stop using in planning prose

| Old term | Problem | Replacement |
|---|---|---|
| `render mode` | Too broad; mixes runtime shape, family, and presentation label | Use `pipeline runtime`, `render family`, or `direct legacy renderer` |
| `ship pressure` | Private jargon; not a product term | `dynamic ship visual throttling` |
| `LOD` by itself | Undefined to readers outside graphics jargon | `dynamic visual throttling` or `level-of-detail throttling` |
| `unified topology` as a blanket description | Overclaims current implementation; current code path is not a fully unified fill+border runtime | Use the precise mode description below |

## 5. Fill Transition Modes: What They Actually Mean Today

The current menu names are not semantically accurate enough.

### 5.1 Current IDs, precise meanings, and required actions

| Current id | What it actually does today | Border behavior today | Status | Required action |
|---|---|---|---|---|
| `off` | Snap fill to current geometry with no interpolation | Border also effectively snaps or is absent in this path | Valid | Rename in prose to `snap` |
| `frontier_morph` | Legacy OT polygon morph fill mode | No unified border output | Broken legacy path | Delete |
| `active_front` | Legacy fill-only active-front interpolation mode | Border frame remains empty in the coordinator path | Fallback only | Rename to `legacy_fill_active_front` if retained |
| `crossfade` | Legacy alpha crossfade fill mode | Border frame remains empty in the coordinator path | Fallback only | Rename to `legacy_fill_crossfade` if retained |
| `unified_topology` | Selection flag that routes to topology-based active-front planning over topology snapshots | Coordinator still emits `buildEmptyBorderFrame()` | Misnamed relative to current code | Rename to something precise such as `topology_fill_rebuild` until a true unified fill+border runtime exists |

### 5.2 Practical conclusion

The menu currently suggests a cleaner conceptual separation than the code actually provides.

A semantically precise cleanup should:

1. delete `frontier_morph`
2. rename fallback legacy modes so they read as fallback legacy modes
3. rename `unified_topology` so it matches what the current coordinator really emits
4. only reintroduce a name containing `unified` when the runtime actually emits fill and border truth from the same sampled frontier data in the shipped path

## 6. Current Status Against The Unified Family Plan

### 6.1 Implemented

- Render-family interfaces and registry
- Family input builder
- Family transition lifecycle helper
- `metaball_grid` family adapter
- Shared ownership truth remains intact

### 6.2 Partially implemented

- Render-family gate in the settings/catalog layer
- Family-aware UI gating
- Transition truth passing into families

### 6.3 Not implemented yet

- `distance_field` as a true family adapter
- `pixel` as a true family adapter
- `vs_pvv3` as a true family adapter
- vector/pipeline route as a `VectorPolygonFamily` facade
- one semantically clean family-first selector model
- one shared diagnostics and validation contract across all shipped territory paths

## 7. Current Drift From Older Reference Docs

The older architecture reference is stale in several specific ways:

1. It describes the unified topology path as gated off, but current code gates it by selected fill-transition mode.
2. It does not reflect the real partial render-family shell already in the repo.
3. It does not reflect the current mixed reality where most important modes still dispatch directly from `GameCanvas`.
4. It does not reflect the latest perf work showing that visual cadence reduction and skip gates are affecting smoothness.

## 8. Smoothness-Critical Current Liabilities

These are current implementation facts, not speculation.

### 8.1 Presentation cadence gates

`GameCanvas.svelte` contains explicit cadence/defer logic for territory, ships, stars, and connections. That means the runtime can choose not to present a layer on a given animation frame.

This is a visual-throttling mechanism.

### 8.2 Async territory presentation yielding

`flushTerritoryPresentationQueue()` can yield territory presentation work under input pressure and retry later.

This is another visual-throttling mechanism.

### 8.3 `metaball_grid` paint skipping

`MetaballGridFamily` can skip scene build and paint when its paint signature matches. During active motion, that can produce visually coarse or under-sampled animation even when average compute looks better.

### 8.4 `metaball_grid` transition default

The default fill flip is still `hard`, which is a step change, not a continuous smooth transition.

### 8.5 Grid coarsening

`maxCells` can coarsen spacing upward. That is spatial fidelity reduction.

### 8.6 Dynamic ship visual throttling

`shipLod.ts` currently applies dynamic budgets, per-star caps, and effect suppression based on computed thresholds.

Given the current product direction, this should be treated as suspect until proven acceptable by explicit user decision.

### 8.7 Browser and Pixi present cost

Fresh DevTools traces show real cost in:

- Layout
- Paint
- Layerize
- Pre-paint
- Commit
- Pixi buffer/vertex/upload paths

So smoothness work must account for browser and GPU-present cost, not only in-app JS measures.

## 9. Non-Negotiables For Ongoing Work

As of 2026-04-28, ongoing work should assume:

1. smoothness is the priority, not reduced visual cadence
2. deliberate temporal undersampling is not an acceptable shipping tactic
3. dynamic visual throttling is not an acceptable default tactic
4. names must describe the actual code path, not the intended future architecture

## 10. Rename And Cull Recommendations

### 10.1 Fill transition options

| Current id | Recommended outcome |
|---|---|
| `off` | keep behavior, rename user-facing label to `Snap` |
| `frontier_morph` | delete |
| `active_front` | rename to `legacy_fill_active_front` if kept |
| `crossfade` | rename to `legacy_fill_crossfade` if kept |
| `unified_topology` | rename to `topology_fill_rebuild` until it really drives unified fill+border output |

### 10.2 Ship throttling terms

| Current term | Recommended outcome |
|---|---|
| `ShipLodLevel` | if feature is removed, delete |
| `balanced/reduced/critical` | if feature is removed, delete |
| `pressure` wording | remove from docs and UI-facing summaries |

### 10.3 Render-mode language

The catalog should eventually stop presenting one flat list as if all entries are the same kind of thing.

The accurate categories are:

- pipeline runtime
- render-family runtime
- direct legacy renderer

## 11. Current File Map

### Pipeline runtime

- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- `pax-fluxia/src/lib/territory/layers/ownership/*`
- `pax-fluxia/src/lib/territory/layers/geometry/*`
- `pax-fluxia/src/lib/territory/layers/transition/*`
- `pax-fluxia/src/lib/territory/layers/presentation/*`

### Family shell

- `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`
- `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts`
- `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts`

### Current family implementation

- `pax-fluxia/src/lib/territory/families/metaballGrid/*`

### Direct legacy renderers still outside the family shell

- `pax-fluxia/src/lib/renderers/PVV3Renderer.ts`
- `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`
- `pax-fluxia/src/lib/renderers/PixelTerritoryRenderer.ts`

## 12. Summary

The current territory system is a mixed architecture:

- one structured pipeline runtime
- one partial family shell with `metaball_grid`
- several direct legacy renderers still called from `GameCanvas`

The highest-priority cleanup is not another abstract architecture diagram. It is:

1. rename things so they describe reality
2. delete clearly broken legacy transition paths
3. stop treating visual throttling as an acceptable smoothness strategy
4. finish the family migration so runtime shape, naming, diagnostics, and validation become consistent
