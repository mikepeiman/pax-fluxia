# Territory Architecture — Reference Specification

**Terminology:** In this document, **reference** means "primary agreed design for agents and implementers." It does **not** refer to the Svelte/render mode name `territory_runtime` or any legacy identifier in code — always disambiguate in prose.

> [!WARNING]
> This file is stale for current-state reasoning.
> Use [TERRITORY_RENDER_SYSTEM_CURRENT.md](./TERRITORY_RENDER_SYSTEM_CURRENT.md) for the live mixed-runtime architecture, current naming/status, and 2026-04-27 / 2026-04-28 perf-corrected view.

**Date:** 2026-03-19 (architecture); **2026-04-07** (transition unification + terminology); **2026-04-07** (full reconciliation with 2026-04-04 design + codebase audit)  
**Status:** HISTORICAL/TARGET reference — superseded by `TERRITORY_RENDER_SYSTEM_CURRENT.md` for live current-state reasoning.  
**Ref:** D-83

> [!CAUTION]
> Any AI agent working on territory architecture or transition invariants should read this document before making design changes.
> If this document conflicts with current runtime status, defer to `TERRITORY_RENDER_SYSTEM_CURRENT.md`; if it conflicts with a mode-specific spec, ask the user.

> [!IMPORTANT]
> Experimental territory families may have their own mode-specific specs. For `perimeter_field`, the authoritative mode document is [PERIMETER_FIELD_MODE_SPEC.md](./PERIMETER_FIELD_MODE_SPEC.md).
> If current implementation behavior conflicts with a mode spec, the implementation is drift, not design.

---

## 1. The 4-Layer Pipeline

```
Ownership → Geometry → Transition → Presentation
```

| Layer | What It Does | Key Type | Primary Implementation |
|-------|-------------|----------|----------------------|
| **Ownership** | Who owns what. Graph-native, from conquest events. | `OwnershipSnapshot` | `OwnershipLayerCoordinator` → `StarOwnershipSnapshotMode` |
| **Geometry** | Shapes from ownership. Power Voronoi cells, merged territories, shared borders, frontier topology. | `ResolvedGeometrySnapshot` (incl. `FrontierTopology`) | `GeometryLayerCoordinator` → `UnifiedVectorGeometryMode` → `compileVectorGeometry()` |
| **Transition** | **Single coordinated step:** advances one conquest animation. Both region fills and frontier polylines follow the **same** time progression. | `TransitionSnapshot` (containing `FillTransitionFrame` + `BorderTransitionFrame`) | `TransitionLayerCoordinator` → `FrontierTopologyPlanner` + `TopologyFrameSampler` |
| **Presentation** | Drawing to screen. Assembles draw commands; PIXI.Graphics fills, strokes, visual style. | `TerritoryPresentationFrame` (fill + border draw commands) | `PresentationLayerCoordinator` → style modes → `PixiTerritoryPresenter` |

> [!IMPORTANT]
> During a conquest transition, **fills and frontiers stay locked together**: at every frame, neither may snap ahead or lag behind the other. Implementation must use **one** transition clock and **one** plan; separate fill and border transition *algorithms* running on different timelines are **not** allowed for the shipped path (they caused divergence and bugs).

> [!IMPORTANT]
> Ownership-layer input invariant: by the time territory code runs, every live star must have an `ownerId`. Missing or empty owner IDs from map inputs are normalized to `"neutral"` during game initialization so neutral territory holds space in every renderer.

> [!IMPORTANT]
> Loaded-game board-layout invariant: for the current product, after gameplay
> starts, the physical board does not change. Star count, star positions, lane
> count, lane connections, lane shape, and lane distance are setup/load facts,
> not live-game variables. Ownership and territory geometry can change during
> play; the board layout cannot. Future dynamic-map work must be explicitly
> scoped as a separate feature.

### Core design position (from 2026-04-04 design review)

A conquest transition is a transformation of the **shared frontier graph**, not of independent owner polygons. Only the frontier spans that actually change should move; unchanged spans remain fixed. Region loops are **rebuilt** from interpolated frontier geometry each frame — this is what preserves the planar-partition invariant (no gaps, no overlaps, borders aligned).

### UI vs implementation (transition)

The settings UI may still expose **two** controls (e.g. fill transition vs border transition) for experimentation and future VFX. **Product requirement:** those controls either map to a **single** internal mode or drive **one** planner that outputs both fill and stroke samples.  

**Future:** the architecture keeps **separable hooks** (e.g. optional fill-only or border-only passes) so additional VFX variants can be added without rewriting ownership/geometry. That is an extension point — not the default behavior.

### Control axes (geometry, style, transition, presentation)

Concrete dropdown labels change over time. A stable mental model:

| Axis | Selects | Notes |
|------|---------|--------|
| **Geometry** | How regions and frontiers are **computed** from ownership | Independent of animation |
| **Style** | How fills and strokes **look** when drawn | Presentation |
| **Transition** | How conquest **morphs** from previous to next geometry | **Unified** step (fill + frontier together) |
| **(Future / advanced)** | Extra VFX or decoupled experiments | May reintroduce separate tunables behind flags when needed |

### Experimental family note: `perimeter_field`

`perimeter_field` is an experimental presentation family. It is not allowed to invent its own ownership truth.

Its mode-specific rules are defined in [PERIMETER_FIELD_MODE_SPEC.md](./PERIMETER_FIELD_MODE_SPEC.md), including:

- perimeter-vstar ownership/render semantics
- source-geometry requirements
- conquest transition correspondence requirements
- diagnostic truth requirements

Agents must not infer `perimeter_field` design from current code alone.

---

## 2. Runtime Orchestration

`TerritoryRuntimeCoordinator` is the frame-level driver. Each frame:

```
TerritoryFrameInput
    → normalizeTerritoryFrameInput()
    → OwnershipLayerCoordinator.compute()         → OwnershipSnapshot
    → TerritoryWorker.computeGeometrySync()        → ResolvedGeometrySnapshot
    → TransitionLayerCoordinator.compute()         → TransitionSnapshot
    → PresentationLayerCoordinator.compute()       → TerritoryPresentationFrame
    → PixiTerritoryPresenter.present()             → screen
```

State carried between frames: `TerritoryRuntimeState` (previous ownership, geometry, transition snapshots, active fill and topology plans).

---

## 3. Layer Rules

### Compiler Rules (Geometry Layer)
- NO rendering in compiler
- NO PIXI imports in compiler
- NO placeholder or fallback geometry
- NO config mutation
- Return typed data only
- **Chaikin smoothing is EXCLUSIVELY a Geometry layer concern.** All smoothing, resampling, and geometric transformations MUST be applied BEFORE coordinates leave the geometry stage. Coordinates shipped to Transition and Presentation layers are FINAL — renderers must NEVER re-smooth, re-sample, or transform geometry they receive.

### Renderer Rules (Presentation Layer)
- FillMeshCache and BorderMeshCache are caches only, never truth
- Fills and borders must both derive from the exact same frontier/region data
- Renderer must not compute ownership or invent geometry
- **NO smoothing in renderers.** No Chaikin, no resampling, no curve fitting. Geometry arrives pre-smoothed from the Geometry layer.
- **Fill + border on the SAME points.** Every draw call that renders a territory should draw fill AND stroke from the SAME point array — `poly(pts).fill()` then `poly(pts).stroke()`. Separate data sources for fills vs borders = guaranteed divergence.

### State Rules
- NO module-level mutable renderer state
- NO global animation state
- Use class-encapsulated renderer instances and explicit transition plans
- `renderPowerVoronoi()` accepts `state?: PVV2RendererState` — always pass state, never rely on module globals

### Implementation Rule
Preserve layer separation strictly. If a stage is incomplete, return a typed error or notImplemented status rather than fabricating geometry.

---

## 4. Geometry Contracts

### ResolvedGeometrySnapshot

The single geometry output type, produced by `compileVectorGeometry()`. Contains:

| Field | Purpose |
|-------|---------|
| `territoryRegions` | Merged territory polygons with stable spatial IDs |
| `frontierPolylines` | Inter-owner shared border polylines |
| `worldBorderPolylines` | Owner↔world edge polylines |
| `sharedFrontierMap` | D-90 multimap — frontiers keyed by `ownerPairKey` (one pair can have multiple disconnected segments) |
| `frontierTopology` | **FrontierTopology** — the structural graph consumed by the transition planner |
| `shells` / `shellLoops` | FG2-style shell classification (outer boundaries + holes) |
| `provenance` / `diagnostics` | Computation metadata and reliability signals |

### FrontierTopology

The structural graph that gives frontiers **identity**. Produced by `buildFrontierTopology()` from the compiler's `TerritoryFrontierMap`.

| Type | Purpose |
|------|---------|
| `FrontierVertex` | Structural anchor: 3-way junctions, world intersections, world corners |
| `FrontierSection` | Shared topological edge between two vertices. Exists EXACTLY ONCE — two owners do not get separate copies. Contains full smoothed point array + owner attribution. |
| `RegionLoop` | Closed territory boundary as ordered `SectionRef[]`. Fills are rebuilt from these references, not from independent polygon data. |

**Key invariant:** deterministic equal-density sampling. If two ownership states produce an unchanged frontier span, the point arrays must match exactly — stability is recognized by comparison, not heuristics.

---

## 5. Transition Architecture

### Unified Topology Path (target — currently gated by `TOPOLOGY_PATH_ENABLED`)

The design-target transition path that produces fills and borders from the **same** interpolated frontier sections:

```
ConquestEvent fires
    → TransitionLayerCoordinator builds envelope (SharedTransitionClock)
    → FrontierTopologyPlanner.buildFrontierTransitionPlan(prevTopo, nextTopo)
        → matchVertices() — exact ID + spatial proximity
        → matchSections() — by ownerPairKey + endpoint match + midpoint proximity
        → matchLoops() — by ownerId + section overlap
        → classify: static | drifted | born | dying
    → each frame: TopologyFrameSampler.sampleTopologyFrame(plan, nextTopo, progress)
        → interpolateSection() per section (OT for drifted, expand/collapse for born/dying)
        → rebuildFillFromSections() — walks loop sectionRefs, concatenates interpolated points
        → returns { fillFrame, borderFrame } from the SAME section points
    → PresentationLayerCoordinator consumes unified snapshot
```

**Why this prevents fill/border divergence:** fills are *derived from* interpolated border sections each frame, not independently interpolated.

### Legacy Independent Path (current fallback)

When `TOPOLOGY_PATH_ENABLED = false` or topology data is unavailable:
- Fill transitions use registered `FillTransitionMode` implementations (e.g. `ActiveFrontFillMode`, `CrossfadeFillMode`)
- Border frame is empty (`buildEmptyBorderFrame()`)
- Fill and border can diverge

### Section transition kinds

| Kind | Behavior |
|------|----------|
| `static` | Same points — pass through unchanged (zero jitter) |
| `drifted` | Same identity, different points — OT interpolation between prev and next |
| `born` | New section — expand from midpoint toward full geometry |
| `dying` | Removed section — collapse from full geometry toward midpoint |

### Transition timing

`SharedTransitionClock` manages a `TransitionEnvelope` with `startedAtMs`, `durationMs`, `progress`. Progress is sampled linearly: `min(1, elapsed / duration)`. Easing can be applied downstream.

---

## 6. VFX Integration — Concrete Specification

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
| `FXHandler<T>` | `fx/FXRegistry.ts` | `{ id, priority, handle(event, ctx), update?(ctx), destroy?() }` |
| `FXRegistry` | `fx/FXRegistry.ts` | `registerConquest(handler)`, `dispatchConquest(event, ctx)`, `updateAll(ctx)` |
| `FXOrchestrator` | `fx/orchestrator.ts` | `processEvents(tickEvents, starsById, effectiveTickMs)`, `update(...)` |
| `FXContext` | `fx/types.ts` | `{ gameTime, dt, starsById, vsm, effectiveTickMs }` |
| `ConquestEvent` | `@pax/common` | `{ starId, previousOwner, newOwner, ... }` |

### How Territory Transitions Wire Into FX

**Current state:** Territory transitions are managed internally by `TransitionLayerCoordinator` using `SharedTransitionClock`, bypassing the FX system. `PVV2RendererState` encapsulates per-renderer transition state.

**Target state:** Territory transitions become `FXHandler<ConquestEvent>` implementations registered with `FXRegistry`. The transition handler owns its state; the presentation layer reads from it.

---

## 7. Legacy Compatibility

### Toggle Requirement

Until the refactor is complete, both legacy and new architecture must be selectable in the UI:

- Existing pipelines (e.g. legacy PVV2 paths, optimal-transport-style border animation) should remain **testable** until replacements are verified.
- A UI toggle or dropdown allows switching between legacy and refactored rendering.
- Avoid **user-visible regressions** on legacy routes when changing shared types or config.

### Config Migration

When users have saved config with obsolete keys (`TERRITORY_ENGINE_MODE`, `TERRITORY_ENGINE_STATIC_METHOD`, `TERRITORY_ENGINE_DYNAMIC_METHOD`), the system should detect, remap to current defaults, and update settings automatically.

---

## 8. OBSOLETE — Do NOT Use

> [!WARNING]
> The following concepts exist in the codebase but are **OBSOLETE**.
> They must be migrated away from, not built upon.

### Obsolete: Static/Dynamic Engine Mode

This distinction is replaced by the 4-layer pipeline. The "static" concern (render unchanged areas) is a dirty-checking optimization inside the geometry layer, not a top-level engine mode.

| Obsolete Concept | Replacement |
|-----------------|-------------|
| `TerritoryEngineMode = 'static' \| 'dynamic' \| 'hybrid'` | Removed. Method descriptors declare their own `implementedStages`. |
| `TERRITORY_ENGINE_MODE` config key | Removed. Map to defaults on detection. |
| `TERRITORY_ENGINE_STATIC_METHOD` config key | Replaced by Geometry dropdown. |
| `TERRITORY_ENGINE_DYNAMIC_METHOD` config key | Replaced by **unified Transition** configuration. |

### Obsolete: Separate Static/Dynamic Registries

| Obsolete | Replacement |
|----------|-------------|
| `TerritoryStaticMethodId` / `TerritoryDynamicMethodId` | `TerritoryMethodId` (unified) |
| `TERRITORY_STATIC_METHODS[]` / `TERRITORY_DYNAMIC_METHODS[]` | `TERRITORY_METHODS[]` (single array) |

### Obsolete: Other

- PRD 6-layer model (replaced by 4-layer)
- Hybrid plans (removed in Phase 3)
- `FrontierMorphFillMode.ts` — the legacy OT polygon-morph fill mode. Known to produce corrupt intermediate frames. Superseded by the unified topology path and `ActiveFrontFillMode`.

### Stale Code Indicators

If you encounter ANY of these patterns, the code is likely obsolete — STOP and verify against this document:

- References to `'static' | 'dynamic'` as engine modes
- `resolveStaticMethodId()` or `resolveMethodSelection()` using static/dynamic splits
- `TERRITORY_ENGINE_STATIC_METHOD` or `TERRITORY_ENGINE_DYNAMIC_METHOD` in UI controls
- `anchorStaticMethodId` field on method descriptors
- UI sections labeled "Engine Pipeline" with Mode/Static/Dynamic selectors
- Types or functions named `MetricState`, `CompiledTerritoryState`, `metricTruth`
- Any code that separates methods into "static" and "dynamic" registries
- References to hybrid plans (HY1-HY5, DY1-DY3, DY5, FG3-FG5)

---

## 9. File Map — Current Pipeline

### Runtime & Orchestration

| File | Purpose |
|------|---------|
| `territory/runtime/TerritoryRuntimeCoordinator.ts` | Frame-level driver: chains all 4 layers |
| `territory/runtime/TerritoryRuntimeState.ts` | State carried between frames |
| `territory/orchestrator/engine.ts` | Legacy route-and-dispatch (used by non-pipeline paths) |
| `territory/orchestrator/registry.ts` | Method descriptors (contains legacy static/dynamic split — pending cleanup) |
| `territory/orchestrator/types.ts` | Type definitions (contains legacy types — pending cleanup) |

### Contracts

| File | Purpose |
|------|---------|
| `territory/contracts/OwnershipContracts.ts` | `OwnershipSnapshot`, `TerritoryConquestEvent` |
| `territory/contracts/GeometryContracts.ts` | `ResolvedGeometrySnapshot`, `ResolvedFrontierPolyline`, shells, regions, provenance |
| `territory/contracts/FrontierTopologyContracts.ts` | `FrontierTopology`, `FrontierVertex`, `FrontierSection`, `RegionLoop`, `SectionRef` |
| `territory/contracts/TransitionContracts.ts` | `TransitionSnapshot`, `FillTransitionFrame`, `BorderTransitionFrame`, `TransitionEnvelope` |
| `territory/contracts/PresentationContracts.ts` | `TerritoryPresentationFrame`, `FillDrawCommand`, `BorderDrawCommand` |
| `territory/contracts/TerritoryModeSelection.ts` | Mode ID types, `TerritoryModeSelection`, defaults |

### Layer 1 — Ownership

| File | Purpose |
|------|---------|
| `territory/layers/ownership/OwnershipLayerCoordinator.ts` | Coordinator |
| `territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts` | Sole mode |

### Layer 2 — Geometry

| File | Purpose |
|------|---------|
| `territory/layers/geometry/GeometryLayerCoordinator.ts` | Coordinator |
| `territory/layers/geometry/modes/UnifiedVectorGeometryMode.ts` | Sole registered mode — delegates to compiler |
| `territory/layers/geometry/compiler_UnifiedVectorGeometry.ts` | Compiler entry: calls `computeGeometry0319`, builds frontier topology, shells, assembles snapshot |
| `territory/compiler/Geometry_0319.ts` | Power Voronoi generator — the computational core |
| `territory/compiler/buildFrontierTopology.ts` | Converts `TerritoryFrontierMap` → `FrontierTopology` |
| `territory/layers/geometry/planners/FrontierTopologyBuilder.ts` | Legacy helper: builds region shapes + polylines from raw geometry |
| `territory/layers/geometry/planners/GeometryFingerprint.ts` | Deterministic version hashing |

### Layer 3 — Transition

| File | Purpose |
|------|---------|
| `territory/layers/transition/TransitionLayerCoordinator.ts` | Coordinator — manages envelope, selects topology vs legacy path |
| `territory/layers/transition/SharedTransitionClock.ts` | Builds and samples transition envelopes |
| `territory/layers/transition/planners/FrontierTopologyPlanner.ts` | **Topology path:** diffs two `FrontierTopology` snapshots into a `FrontierTransitionPlan` |
| `territory/layers/transition/TopologyFrameSampler.ts` | **Topology path:** samples fill+border from interpolated sections |
| `territory/layers/transition/interpolatePolylines.ts` | OT polyline interpolation used by the topology sampler |
| `territory/layers/transition/planners/TerritoryTransitionPlanner.ts` | Legacy fill-only planner |
| `territory/layers/transition/planners/CorrespondencePlanner.ts` | Legacy OT correspondence |
| `territory/layers/transition/planners/GeometryTopologyDiff.ts` | Legacy topology diff |
| `territory/layers/transition/modes/ActiveFrontFillMode.ts` | Active-front fill mode (733 lines, legacy path fill mode) |
| `territory/layers/transition/modes/FrontierMorphFillMode.ts` | **BROKEN** — legacy OT polygon morph fill |
| `territory/layers/transition/modes/CrossfadeFillMode.ts` | Alpha crossfade fill |
| `territory/layers/transition/modes/AlphaCrossfadeFillMode.ts` | Alpha crossfade variant |

### Layer 4 — Presentation

| File | Purpose |
|------|---------|
| `territory/layers/presentation/PresentationLayerCoordinator.ts` | Coordinator |
| `territory/layers/presentation/modes/VectorSurfaceStyle.ts` | Vector polygon style |
| `territory/layers/presentation/modes/DistanceFieldStyle.ts` | SDF style |
| `territory/layers/presentation/modes/PixelTerritoryStyle.ts` | Pixel-quantized style |
| `territory/layers/presentation/builders/FillDrawCommandBuilder.ts` | Fill draw command assembly |
| `territory/layers/presentation/builders/BorderDrawCommandBuilder.ts` | Border draw command assembly |

### PIXI Adapter

| File | Purpose |
|------|---------|
| `territory/adapters/pixi/PixiTerritoryPresenter.ts` | Top-level PIXI presenter — delegates to fill + border sub-presenters |
| `territory/adapters/pixi/PixiFillPresenter.ts` | PIXI fill rendering |
| `territory/adapters/pixi/PixiBorderPresenter.ts` | PIXI border rendering |

### Legacy / PVV2

| File | Purpose |
|------|---------|
| `renderers/PowerVoronoiRenderer.ts` | Legacy monolithic renderer (~1754 lines) |
| `renderers/RefactoredPVV2Renderer.ts` | Class-encapsulated PVV2 with isolated state |
| `renderers/geometry/borderTransition.ts` | Legacy segment/polygon morph handlers, RopeBorderRenderer |
| `territory/legacy/TerritoryLegacyBridge.ts` | Isolation layer for legacy renderers |

### FX System

| File | Purpose |
|------|---------|
| `fx/FXRegistry.ts` | Handler registration + priority dispatch |
| `fx/orchestrator.ts` | Clock + VSM + registry coordinator |
| `fx/handlers/conquestHandler.ts` | Core conquest handler (ships, flash, color) |

---

## 10. Current Status (2026-04-07)

| Component | Status | Notes |
|-----------|--------|-------|
| 4-layer pipeline orchestration | **Working** | `TerritoryRuntimeCoordinator` chains all layers |
| Ownership layer | **Working** | `StarOwnershipSnapshotMode` |
| Geometry compilation | **Working** | `compileVectorGeometry()` produces `ResolvedGeometrySnapshot` with `FrontierTopology` |
| Frontier topology contracts | **Working** | Types defined, topology builder implemented |
| Frontier topology planner | **Implemented, untested** | `buildFrontierTransitionPlan()` — diffs topologies, classifies sections |
| Topology frame sampler | **Implemented, untested** | `sampleTopologyFrame()` — derives fills from borders |
| Unified topology path | **Gated** | `TOPOLOGY_PATH_ENABLED = false` in `TransitionLayerCoordinator` |
| SharedTransitionClock | **Working** | Envelope timing |
| Legacy fill transition modes | **Working (fallback)** | `ActiveFrontFillMode`, `CrossfadeFillMode` |
| Presentation layer | **Working** | Style modes produce draw commands |
| PIXI rendering | **Working** | `PixiTerritoryPresenter` draws fills + borders |
| FX system integration | **Not started** | Territory transitions bypass FXRegistry |

### Critical path to first successful territory rendering

The unified topology path (`FrontierTopologyPlanner` → `TopologyFrameSampler`) is the architectural target. It is **fully implemented** but **disabled** (`TOPOLOGY_PATH_ENABLED = false`). Enabling it requires:

1. Verifying `FrontierTopology` is reliably produced by the geometry compiler
2. Testing the topology planner with real conquest events
3. Validating that `sampleTopologyFrame` produces gap-free, overlap-free frames
4. Enabling `TOPOLOGY_PATH_ENABLED = true`

The fallback legacy path works for static rendering but does not meet the spec for smooth unified conquest animations (fills and borders can diverge).
