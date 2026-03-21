# Territory Clean Architecture Blueprint

**Date:** 2026-03-21  
**Status:** PROPOSED CANONICAL REBUILD SHAPE  
**Ref:** D-83

This document translates the current territory codebase into a clean rebuild plan.
It is meant to sit beside [TERRITORY_ARCHITECTURE.md](./TERRITORY_ARCHITECTURE.md):

- `TERRITORY_ARCHITECTURE.md` defines the architectural intent.
- This blueprint defines the concrete module tree, contracts, naming, and migration shape that would make that intent real.

## 1. Design Goal

Build one authoritative territory runtime with four real layers:

```text
Ownership -> Geometry -> Transition -> Presentation
```

Use one master orchestrator per layer and one top-level runtime coordinator:

- `TerritoryRuntimeCoordinator`
- `OwnershipLayerCoordinator`
- `GeometryLayerCoordinator`
- `TransitionLayerCoordinator`
- `PresentationLayerCoordinator`

Important distinction:

- The top-level runtime owns frame flow and previous-state memory.
- Each layer orchestrator owns mode selection for its own concern only.
- PIXI is an adapter at the edge, not part of the domain contracts.

## 2. Non-Negotiable Rules

1. There is exactly one authoritative runtime path.
2. Every layer has one typed output contract.
3. Styles never choose geometry algorithms.
4. Geometry modes never reach into PIXI, FX, or UI state.
5. Fill and border transitions share one transition clock and one event envelope.
6. Presentation consumes frame data; it does not invent ownership or geometry.
7. Legacy implementations live behind adapters, not in the canonical runtime surface.

## 3. Proposed Folder Tree

```text
pax-fluxia/src/lib/territory/
  contracts/
    TerritoryFrameInput.ts
    TerritoryModeSelection.ts
    OwnershipContracts.ts
    GeometryContracts.ts
    TransitionContracts.ts
    PresentationContracts.ts
    DiagnosticsContracts.ts

  runtime/
    TerritoryRuntimeCoordinator.ts
    TerritoryRuntimeState.ts
    TerritoryConfigNormalizer.ts
    TerritoryCompatibilityMatrix.ts

  layers/
    ownership/
      OwnershipLayerCoordinator.ts
      OwnershipMode.ts
      registry.ts
      modes/
        StarOwnershipSnapshotMode.ts

    geometry/
      GeometryLayerCoordinator.ts
      GeometryMode.ts
      registry.ts
      modes/
        PowerVoronoiGeometryMode.ts
        BoundaryAwareFrontierGeometryMode.ts
        SeedGraphGeometryMode.ts
      planners/
        FrontierTopologyBuilder.ts
        GeometryFingerprint.ts

    transition/
      TransitionLayerCoordinator.ts
      SharedTransitionClock.ts
      FillTransitionMode.ts
      BorderTransitionMode.ts
      registry.ts
      modes/
        FrontierMorphFillMode.ts
        CrossfadeFillMode.ts
        OptimalTransportBorderMode.ts
        RopeMorphBorderMode.ts
      planners/
        TerritoryTransitionPlanner.ts
        CorrespondencePlanner.ts

    presentation/
      PresentationLayerCoordinator.ts
      TerritoryStyleMode.ts
      registry.ts
      modes/
        CanonicalTerritoryStyle.ts
        DistanceFieldStyle.ts
        PixelTerritoryStyle.ts
      builders/
        FillDrawCommandBuilder.ts
        BorderDrawCommandBuilder.ts

  adapters/
    pixi/
      PixiTerritoryPresenter.ts
      PixiFillPresenter.ts
      PixiBorderPresenter.ts

    legacy/
      PowerVoronoiLegacyAdapter.ts
      PVV3LegacyAdapter.ts
      DistanceFieldLegacyAdapter.ts

  integration/
    GameCanvasTerritoryBridge.ts
    TerritoryFxBridge.ts
    TerritorySettingsBridge.ts
```

## 4. Canonical Runtime Flow

```text
GameCanvasTerritoryBridge
  -> TerritoryRuntimeCoordinator.update(input)
    -> OwnershipLayerCoordinator.compute(...)
    -> GeometryLayerCoordinator.compute(...)
    -> TransitionLayerCoordinator.compute(...)
    -> PresentationLayerCoordinator.compute(...)
  -> PixiTerritoryPresenter.present(frame)
```

What changes from today:

- `GameCanvas` no longer switches between full pipelines.
- The style dropdown stops routing to whole renderers.
- The runtime always runs the same four steps in the same order.
- Geometry and transition modules are swapped inside their layer registries only.

## 5. Canonical Contracts

### 5.1 Runtime Input

```ts
export interface TerritoryFrameInput {
  tickId: number
  nowMs: number
  stars: readonly StarState[]
  lanes: readonly StarConnection[]
  players: readonly { id: string }[]
  world: { width: number; height: number }
  selection: TerritoryModeSelection
  tunables: TerritoryTunables
}
```

Notes:

- No `PIXI.Container`
- No `PIXI.Renderer`
- No `colorUtils`
- No `adapter`

Those belong to presentation and adapter boundaries, not domain input.

### 5.2 Mode Selection

```ts
export interface TerritoryModeSelection {
  ownershipMode: OwnershipModeId
  geometryMode: GeometryModeId
  fillTransitionMode: FillTransitionModeId
  borderTransitionMode: BorderTransitionModeId
  styleMode: TerritoryStyleModeId
}
```

Notes:

- `ownershipMode` can stay hidden from UI at first.
- `geometryMode`, `fillTransitionMode`, `borderTransitionMode`, and `styleMode` are the user-facing semantic axes.
- No `engineMethod`, `staticMethod`, `dynamicMethod`, or `hybridPlan`.

### 5.3 Ownership Layer

```ts
export interface OwnershipSnapshot {
  version: string
  starOwners: ReadonlyMap<string, string>
  contestedLaneIds: readonly string[]
  conquestEvents: readonly TerritoryConquestEvent[]
}

export interface OwnershipMode {
  readonly id: OwnershipModeId
  readonly label: string
  compute(input: OwnershipLayerInput): OwnershipSnapshot
}
```

Ownership is the authoritative answer to:

- who owns each star
- which lanes are contested
- what conquest deltas happened this frame

### 5.4 Geometry Layer

```ts
export interface GeometrySnapshot {
  version: string
  territoryRegions: readonly TerritoryRegion[]
  frontierPolylines: readonly FrontierPolyline[]
  sharedFrontierMap: TerritoryFrontierMap
  ownershipVersion: string
}

export interface GeometryMode {
  readonly id: GeometryModeId
  readonly label: string
  compute(input: GeometryLayerInput): GeometrySnapshot
}
```

Geometry invariants:

- smoothing lives here
- fill and border data come from the same frontier authority
- output is reusable by both fill and border transitions

### 5.5 Transition Layer

```ts
export interface TransitionEnvelope {
  transitionId: string
  startedAtMs: number
  durationMs: number
  progress: number
  conquestEvents: readonly TerritoryConquestEvent[]
}

export interface TransitionSnapshot {
  envelope: TransitionEnvelope | null
  fillFrame: FillTransitionFrame
  borderFrame: BorderTransitionFrame
  geometryVersion: string
}

export interface FillTransitionMode {
  readonly id: FillTransitionModeId
  readonly label: string
  plan(input: FillTransitionPlanInput): FillTransitionPlan
  sample(plan: FillTransitionPlan, ctx: TransitionSampleContext): FillTransitionFrame
}

export interface BorderTransitionMode {
  readonly id: BorderTransitionModeId
  readonly label: string
  plan(input: BorderTransitionPlanInput): BorderTransitionPlan
  sample(plan: BorderTransitionPlan, ctx: TransitionSampleContext): BorderTransitionFrame
}
```

Transition invariants:

- fill and border modes are independent modules
- both consume the same `TransitionEnvelope`
- both sample from the same `progress`
- the layer coordinator is the only place where fill/border synchronization is enforced

### 5.6 Presentation Layer

```ts
export interface TerritoryPresentationFrame {
  fills: readonly FillDrawCommand[]
  borders: readonly BorderDrawCommand[]
  debug: readonly TerritoryDebugCommand[]
}

export interface TerritoryStyleMode {
  readonly id: TerritoryStyleModeId
  readonly label: string
  buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame
}
```

Presentation invariants:

- consumes ownership, geometry, and transition outputs
- produces draw commands or draw-ready caches
- does not decide transition timing
- does not decide which geometry mode runs

### 5.7 PIXI Adapter

```ts
export interface TerritoryPresenter {
  present(frame: TerritoryPresentationFrame, ctx: TerritoryPresenterContext): void
  reset(): void
}
```

This is where PIXI belongs.

## 6. Recommended Runtime Class Responsibilities

### `TerritoryRuntimeCoordinator`

Owns:

- previous frame state
- dirty checking
- compatibility validation
- layer call order
- diagnostics aggregation

Does not own:

- PIXI drawing details
- geometry math
- transition math

### `OwnershipLayerCoordinator`

Owns:

- selection of `OwnershipMode`
- producing `OwnershipSnapshot`

### `GeometryLayerCoordinator`

Owns:

- selection of `GeometryMode`
- geometry fingerprinting
- caching compiled geometry per ownership version

### `TransitionLayerCoordinator`

Owns:

- transition event lifecycle
- shared clock and progress
- fill-plan and border-plan coordination

### `PresentationLayerCoordinator`

Owns:

- selection of `TerritoryStyleMode`
- building draw commands from frame-time data

## 7. Reuse Map From The Active Project

These existing pieces are worth keeping, but moved behind cleaner names and boundaries.

| Current project piece | Reuse in rebuild | Proposed destination |
|---|---|---|
| `territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts` | Keep core geometry generation and smoothing logic | `layers/geometry/modes/PowerVoronoiGeometryMode.ts` |
| `territory/compiler/Geometry_0319.ts` | Keep as boundary-aware geometry mode | `layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts` |
| `territory/engine/TerritoryEngineController.ts` | Keep class-encapsulated runtime idea | `runtime/TerritoryRuntimeCoordinator.ts` |
| `territory/compiler/TerritoryTransitionPlanner.ts` | Keep as planner seed, but move to transition layer | `layers/transition/planners/TerritoryTransitionPlanner.ts` |
| `territory/render/TerritoryRenderer.ts` | Keep class-based presenter idea, but stop making it domain authority | `adapters/pixi/PixiTerritoryPresenter.ts` |
| `render/buildFillMeshCache.ts` | Keep as presentation helper | `presentation/builders/FillDrawCommandBuilder.ts` |
| `render/buildBorderMeshCache.ts` | Keep as presentation helper | `presentation/builders/BorderDrawCommandBuilder.ts` |
| `fx/orchestrator.ts` and `FXRegistry.ts` | Keep event/clock infrastructure | `integration/TerritoryFxBridge.ts` |
| `components/game/GameCanvas.svelte` territory dispatch block | Extract into thin runtime host | `integration/GameCanvasTerritoryBridge.ts` |

## 8. Migration Strategy

Do not migrate by trying to clean every existing name in place.
Build the clean runtime first, then adapt legacy code behind it.

### Phase 1: Freeze Contracts

Create the six contract files first:

- `TerritoryFrameInput.ts`
- `TerritoryModeSelection.ts`
- `OwnershipContracts.ts`
- `GeometryContracts.ts`
- `TransitionContracts.ts`
- `PresentationContracts.ts`

No renderer or geometry code should be moved until these exist.

### Phase 2: Build One Vertical Slice

Implement one fully clean slice:

- ownership: `StarOwnershipSnapshotMode`
- geometry: `BoundaryAwareFrontierGeometryMode`
- fill transition: `FrontierMorphFillMode`
- border transition: `OptimalTransportBorderMode`
- style: `CanonicalTerritoryStyle`

This slice becomes the new authority path.

### Phase 3: Move PIXI Behind The Edge

Extract current presentation logic so only the PIXI adapter knows about:

- `PIXI.Container`
- `PIXI.Graphics`
- mesh cache details
- filter setup

### Phase 4: Quarantine Legacy Renderers

Keep old systems only as compatibility adapters:

- `PowerVoronoiLegacyAdapter`
- `PVV3LegacyAdapter`
- `DistanceFieldLegacyAdapter`

These are not part of the canonical runtime API.

### Phase 5: Migrate UI Keys

The territory panel should write only:

- `TERRITORY_GEOMETRY_MODE`
- `TERRITORY_STYLE_MODE`
- `TERRITORY_FILL_TRANSITION_MODE`
- `TERRITORY_BORDER_TRANSITION_MODE`
- `TERRITORY_RUNTIME_TRACE_MODE`

The old engine keys remain only in config migration code.

## 9. Semantic Rename Plan

This is the naming cleanup that makes the architecture understandable.

### 9.1 Top-Level Runtime Names

| Current name | Proposed name | Reason |
|---|---|---|
| `renderTerritoryEngine` | `runTerritoryRuntimeFrame` | It runs the runtime for one frame; it is not a renderer |
| `TerritoryEngineInput` | `TerritoryFrameInput` | Input is frame-domain data, not engine internals |
| `TerritoryEngineController` | `TerritoryRuntimeCoordinator` | It coordinates the whole runtime, not just an engine |
| `runLegacyAdapter` | `renderThroughLegacyAdapter` | Makes the compatibility role explicit |
| `runFG2DataPipeline` | `compileSeedGraphGeometrySnapshot` | Describes what it produces instead of using archaeology shorthand |
| `extractCanonicalData` | `buildShellSnapshotFromArtifacts` | Says what is being built |

### 9.2 Registry And Selection Names

| Current name | Proposed name | Reason |
|---|---|---|
| `TerritoryMethodId` | remove and split by layer | One method ID cannot represent four orthogonal concerns |
| `TerritoryMethodSelection` | `TerritoryModeSelection` | Selection is by concern-specific modes |
| `TERRITORY_METHODS` | split into layer registries | Avoid pretending a single registry spans geometry, transition, and style |
| `DEFAULT_TERRITORY_METHOD` | `DEFAULT_TERRITORY_GEOMETRY_MODE` plus transition/style defaults | Defaults should live on the axis they control |

### 9.3 Config Key Names

| Current config key | Proposed config key | Reason |
|---|---|---|
| `TERRITORY_RENDER_MODE` | `TERRITORY_STYLE_MODE` | The current key chooses whole renderers; new key must mean presentation style only |
| `TERRITORY_BOUNDARY_MODE` | `TERRITORY_BORDER_TRANSITION_MODE` | This is a transition choice, not a boundary truth |
| `TERRITORY_FILL_MODE` | `TERRITORY_FILL_TRANSITION_MODE` | This is a transition choice, not a fill truth |
| `TERRITORY_ENGINE_ENABLED` | `TERRITORY_RUNTIME_ENABLED` | Names the real concern |
| `TERRITORY_ENGINE_TRACE_MODE` | `TERRITORY_RUNTIME_TRACE_MODE` | Trace belongs to the runtime, not a legacy engine concept |
| `TERRITORY_ENGINE_STEP_MODE` | `TERRITORY_RUNTIME_STEP_MODE` | Same reason |
| `TERRITORY_ENGINE_STEP_ADVANCE_TOKEN` | `TERRITORY_RUNTIME_STEP_TOKEN` | Shorter and more semantic |
| `TERRITORY_ENGINE_METHOD` | remove | Replaced by four orthogonal mode keys |

### 9.4 Geometry And State Names

| Current name | Proposed name | Reason |
|---|---|---|
| `CanonicalTerritoryStateOk` | `TerritoryPipelineSnapshot` | The object is a full snapshot, not just a generic canonical state |
| `CanonicalTerritoryData` | `TerritoryShellSnapshot` | The current type is shell-focused, not whole-pipeline truth |
| `metricTruth` | `ownershipMetrics` | Says what the data is for |
| `frontierGraph` | `frontierTopology` | Topology is clearer than graph in the runtime surface |
| `fittedFrontiers` | `smoothedFrontierPolylines` | Says what the array actually contains |
| `regions` | `territoryRegions` | Removes ambiguity |
| `componentsByOwner` | `territoryComponentsByOwner` | More explicit |
| `transitionActive` | `hasActiveTransition` | Boolean naming |

### 9.5 FX And Transition Names

| Current name | Proposed name | Reason |
|---|---|---|
| `territoryTransitionHandler` | `territoryTransitionFxBridge` | It bridges FX events into territory runtime state |
| `territoryTransitions` | `territoryTransitionEventStore` | The object stores transition events; it is not the transition layer itself |
| `TerritoryTransitionState` | `TerritoryTransitionEventStore` | Same clarification |
| `TerritoryTransitionEntry` | `PendingConquestTransition` | More explicit lifecycle meaning |

### 9.6 File Renames

| Current file | Proposed file | Reason |
|---|---|---|
| `territory/orchestrator/engine.ts` | `territory/runtime/TerritoryRuntimeCoordinator.ts` | This is the real runtime home |
| `territory/orchestrator/registry.ts` | split into `layers/*/registry.ts` | Registries should align to concerns |
| `territory/orchestrator/renderMode.ts` | `territory/contracts/PresentationContracts.ts` and `territory/contracts/TransitionContracts.ts` | The current file mixes contracts |
| `territory/compiler/TerritoryCompiler.ts` | `layers/geometry/CanonicalGeometryCompiler.ts` | Compiler is doing geometry compilation |
| `territory/render/TerritoryRenderer.ts` | `adapters/pixi/PixiTerritoryPresenter.ts` | This class draws with PIXI; presenter is the honest name |
| `components/game/GameCanvas.svelte` territory dispatch block | `integration/GameCanvasTerritoryBridge.ts` | Removes pipeline routing from the Svelte component |

## 10. Public Labels To Prefer Over Archaeology Labels

Legacy labels can remain as migration aliases, but user-facing names should become semantic:

| Legacy label | Better label |
|---|---|
| `fg1_adaptive_field` | `Adaptive Frontier Geometry` |
| `fg2_seed_graph` | `Seed Graph Geometry` |
| `new_frontiers_0319` | `Boundary-Aware Frontier Geometry` |
| `dy4_optimal_transport` | `Optimal Transport Border Morph` |
| `territory_engine` | `Canonical Territory Style` |
| `power_voronoi` | `Power Voronoi Legacy Style` |
| `vs_pvv3` | `Seed Graph Legacy Style` |

## 11. What To Retire Entirely

These concepts should not survive in the new architecture except inside migration code:

- `static` vs `dynamic` as top-level engine modes
- `hybrid plans`
- full-pipeline routing inside `GameCanvas`
- module-level mutable transition state consumed directly by renderers
- one registry pretending to represent geometry, transition, and style at once

## 12. First Implementation Slice I Would Actually Build

If this rebuild started today, I would build exactly this:

1. `TerritoryFrameInput`
2. `TerritoryModeSelection`
3. `TerritoryRuntimeCoordinator`
4. `BoundaryAwareFrontierGeometryMode`
5. `OptimalTransportBorderMode`
6. `FrontierMorphFillMode`
7. `CanonicalTerritoryStyle`
8. `PixiTerritoryPresenter`
9. `GameCanvasTerritoryBridge`

Only after that slice is stable would I adapt `PVV3`, distance field, pixel, or metaball styles.

That order keeps the rebuild semantic, testable, and small enough to reason about.
