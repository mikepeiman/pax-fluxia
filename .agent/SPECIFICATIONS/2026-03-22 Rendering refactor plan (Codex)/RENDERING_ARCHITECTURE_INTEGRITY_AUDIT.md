# Rendering Architecture Integrity Audit

## Purpose

This document audits the current rendering architecture in the main project tree and records the corrections required for the definitive clean-architecture refactor.

This audit is intentionally stricter than a normal "current state" review. The goal is not to celebrate partial progress. The goal is to identify every place where the current implementation still violates the intended clean architecture described in:

- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`

## Executive Verdict

The project has strong clean-architecture ingredients, but the active rendering stack is still a hybrid:

- The ship FX stack is closest to the target architecture. `FXOrchestrator`, `FXRegistry`, `VisualStateManager`, and strategy registries are real architectural wins.
- The territory stack is only partially clean. It has a compiler, controller, and renderer split, but transition math and geometry substitution still leak into presentation, and legacy method registries still span multiple concerns.
- The top-level render surface is still too integration-heavy. `GameCanvas.svelte` remains the convergence point for territory routing, map presentation, ship presentation, selection state, and runtime wiring.

Conclusion: the architecture is directionally correct, but not yet compliant enough to serve as the singular long-term rendering core without one more explicit refactor pass.

## What Is Already Strong

### 1. Event-driven FX architecture is real, not aspirational

Current evidence:

- `pax-fluxia/src/lib/fx/orchestrator.ts`
- `pax-fluxia/src/lib/fx/FXRegistry.ts`
- `pax-fluxia/src/lib/fx/VisualStateManager.ts`
- `pax-fluxia/src/lib/fx/handlers/transferHandler.ts`
- `pax-fluxia/src/lib/fx/handlers/conquestHandler.ts`
- `pax-fluxia/src/lib/fx/handlers/combatHandler.ts`
- `pax-fluxia/src/lib/fx/phases/behaviors.ts`

Why it matters:

- Game events are processed as typed events instead of inferred state diffs.
- Ship lifecycle behaviors are already modular enough to support future mode families.
- The FX runtime already has the right idea: one clock, one orchestration surface, and mutable visual state behind an API.

### 2. The territory compiler is meaningfully separated from PIXI

Current evidence:

- `pax-fluxia/src/lib/territory/compiler/TerritoryCompiler.ts`
- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
- `pax-fluxia/src/lib/territory/compiler/frontierStage.ts`
- `pax-fluxia/src/lib/territory/compiler/regionStage.ts`

Why it matters:

- Compiler code is mostly free of rendering concerns.
- The current compiler path already expresses a canonical truth model: metric -> frontier -> regions -> fitted frontiers.
- `Geometry_0319` correctly treats fill and border divergence as a geometry-truth problem, not a drawing problem.

### 3. Class-encapsulated state exists in important places

Current evidence:

- `pax-fluxia/src/lib/territory/engine/TerritoryEngineController.ts`
- `pax-fluxia/src/lib/fx/VisualStateManager.ts`

Why it matters:

- The project is no longer fully dependent on module-level mutable state.
- Fingerprinting, controller invalidation, and VSM mutation APIs are the right kinds of primitives for a clean runtime.

## Integrity Failures

## F1. Territory runtime still mixes multiple architecture models

Evidence:

- `pax-fluxia/src/lib/territory/orchestrator/registry.ts`
- `pax-fluxia/src/lib/territory/orchestrator/types.ts`
- `pax-fluxia/src/lib/territory/orchestrator/engine.ts`

Problem:

- The code still carries a unified method registry that pretends geometry, topology, animation, and render belong to one method identity.
- `TERRITORY_PIPELINE_STAGE_ORDER` uses legacy fine-grained stage names while the docs describe a four-layer architecture.
- `DEFAULT_TERRITORY_METHOD` and compatibility aliases preserve a mental model where one selector spans multiple concerns.

Why this violates clean architecture:

- A method registry that spans geometry, transition, and presentation hides ownership boundaries.
- It makes naming worse, configuration worse, and migration harder.
- It is the exact category mistake the clean blueprint was trying to remove.

Required correction:

- Replace the unified method registry with layer-specific registries:
  - `TerritoryGeometryModeRegistry`
  - `TerritoryFillTransitionModeRegistry`
  - `TerritoryBorderTransitionModeRegistry`
  - `TerritoryFillStyleModeRegistry`
  - `TerritoryBorderStyleModeRegistry`
- Keep one master territory runtime, but never one master "territory method".

## F2. Presentation still performs geometry and transition work

Evidence:

- `pax-fluxia/src/lib/territory/render/TerritoryRenderer.ts`

Problem:

- `_executeTransitionPass()` interpolates frontier data, substitutes smoothed edges back into region loops, repacks fitted frontiers, and mutates `state.transitionActive`.
- This means the renderer is not only drawing. It is sampling transition math, performing geometry reconciliation, and deciding transition completion.

Why this violates clean architecture:

- Presentation must consume an already-sampled frame.
- Transition math belongs to the transition layer.
- Region mutation and edge substitution belong to geometry or transition preparation, not the draw pass.

Required correction:

- Presentation receives a `TerritoryPresentationFrame` that already contains fill polygons and border polylines for the current time sample.
- The transition layer owns interpolation, completion, and any fill/border synchronization logic.
- The geometry layer owns smoothing, resampling, and frontier substitution.

## F3. Territory transition bridge leaks via singleton shared state

Evidence:

- `pax-fluxia/src/lib/fx/handlers/territoryTransitionHandler.ts`

Problem:

- `territoryTransitions` is exported as singleton state read by presentation.
- The handler owns a store that presentation imports directly.

Why this violates clean architecture:

- It creates a hidden back-channel from FX to rendering.
- It bypasses a proper territory runtime surface.
- It makes lifecycle ownership ambiguous: who creates transition state, who expires it, who consumes it, who resets it?

Required correction:

- Replace the singleton with a runtime-owned bridge:
  - `TerritoryTransitionEventStore` if it remains an event queue
  - `TerritoryTransitionFxBridge` if it exists only to translate conquest events into runtime input
- Presentation should never import handler-owned state.

## F4. Runtime-adjustable geometry controls are not first-class contracts

Evidence:

- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/territory/engine/TerritoryEngineController.ts`

Problem:

- Geometry-affecting parameters are spread across generic config keys:
  - `VORONOI_SMOOTHING`
  - `VORONOI_BORDER_SMOOTH`
  - `FRONTIER_RESOLUTION`
  - `MODIFIED_VORONOI_*`
  - `DF_*`
  - `CHAIKIN_*`
- The controller fingerprints `JSON.stringify(input.config ?? {})`, but there is no typed contract defining which controls belong to geometry, which can be hot-swapped, and which require a controlled reset.

Why this violates clean architecture:

- Geometry is being configured implicitly instead of through a named interface.
- Mid-render control changes cannot be reasoned about safely without a contract.
- The system cannot truthfully report whether a geometry candidate supports live recompute, debounced recompute, or reset-only behavior.

Required correction:

- Introduce `TerritoryGeometryControlSet`.
- Introduce `GeometryUpdatePolicy`.
- Every geometry mode must declare control ownership and update behavior per control family.

## F5. Territory invariants are not explicit in the controller contract

Evidence:

- `pax-fluxia/src/lib/territory/engine/TerritoryEngineController.ts`
- `pax-fluxia/src/lib/territory/compiler/types.ts`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`

Problem:

- The controller config currently talks about `metric.minStarRadius`, `family`, and `fitter`, but not the full gameplay and visual invariants the runtime must honor.
- Required truth rules such as lane-connected contiguity, same-owner separation rules, minimum star padding radius, and fill/border unity are not represented as first-class runtime constraints.

Required correction:

- Define a `TerritoryInvariantSet` contract that includes:
  - minimum star territory buffer
  - lane-connected contiguity rules
  - non-connected same-owner separation policy
  - two-player-on-lane visual legality constraints
  - fill/border same-frontier requirement
  - transition topology legality

## F6. Current naming still preserves legacy ambiguity

Evidence:

- `territory/orchestrator/registry.ts`
- `territory/orchestrator/renderMode.ts`
- `game.config.ts`
- `ControlsSection-Territory.svelte`

Problem:

- Terms such as `method`, `render mode`, `boundary mode`, `fill mode`, `engine`, `canonical`, and `territory_engine` are overloaded.
- Some names describe algorithms, others describe adapters, others describe rollout toggles.

Required correction:

- Lock the future vocabulary to semantic mode families only:
  - geometry
  - geometry adjustment
  - fill style
  - border style
  - fill transition
  - border transition
  - star body and overlay
  - lane body and indicators
  - ship lifecycle and combat FX families

## F7. Single-clock discipline is not yet universal

Evidence:

- `pax-fluxia/src/lib/fx/orchestrator.ts`
- `pax-fluxia/src/lib/fx/handlers/conquestHandler.ts`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md`

Problem:

- The FX stack correctly centralizes game time, but `coreConquestHandler` still applies auto-slowmo with `setTimeout`, which is wall-clock behavior.
- Older animation docs and some legacy assumptions still show time-domain drift.

Required correction:

- Every temporary animation-speed effect, decay timer, and lifecycle expiry must be schedulable in the same game-time domain.
- No new rendering subsystem may use browser wall time directly for game-visible timing.

## F8. Stars, lanes, and ships are rendered cleanly, but not yet governed by one semantic runtime vocabulary

Evidence:

- `pax-fluxia/src/lib/renderers/StarRenderer.ts`
- `pax-fluxia/src/lib/renderers/LaneRenderer.ts`
- `pax-fluxia/src/lib/renderers/ShipRenderer.ts`
- `pax-fluxia/src/lib/animations/conquest/strategies.ts`
- `pax-fluxia/src/lib/fx/phases/behaviors.ts`

Problem:

- These systems are modular enough to catalog, but they are still configured mostly as raw config keys and ad hoc named strategies.
- There is no single authoritative naming ledger that distinguishes orbit style, travel path mode, attack surge mode, conquest transfer mode, damage-state FX, repair-state FX, and destruction FX.

Required correction:

- Introduce explicit semantic mode families outside raw `GAME_CONFIG`.
- The docs created in this package are the naming source of truth for that migration.

## Definitive Corrections Required Before The Refactor Is "Done"

1. One territory runtime only.
   - `TerritoryRuntimeCoordinator` owns layer invocation, runtime input normalization, and output surfaces.

2. One registry per concern, never one registry for all concerns.

3. Geometry owns all frontier-shaping operations.
   - This includes Chaikin smoothing, resampling density, buffer/padding radius, corridor/disconnect virtual-site policies, and any other operation that changes fill/border coordinates.

4. Transition owns all time-sampled fill and border frame generation.

5. Presentation draws only precomputed frames and visual styles.

6. FX handlers can trigger transitions, but cannot be the state authority for territory rendering.

7. Geometry control changes must be represented as typed inputs with declared update policy.

8. The final vocabulary must be semantic enough that a human can identify what a mode does without reading source.

## Canonical Contracts To Add

- `TerritoryInvariantSet`
- `TerritoryGeometryControlSet`
- `GeometryUpdatePolicy`
- `TerritoryGeometrySnapshot`
- `TerritoryTransitionEnvelope`
- `TerritoryTransitionSnapshot`
- `TerritoryPresentationFrame`
- `StarBodyStyleMode`
- `StarStateOverlayMode`
- `LaneBodyStyleMode`
- `LaneOrderIndicatorMode`
- `ShipOrbitStyleMode`
- `ShipDepartureTransitionMode`
- `ShipTravelPathMode`
- `ShipArrivalTransitionMode`
- `ShipAttackEngageFxMode`
- `ShipConquestTransferMode`
- `ShipTransportTransferMode`
- `ShipDamageStateFxMode`
- `ShipRepairStateFxMode`
- `ShipDestructionFxMode`

## Final Integrity Judgment

The architecture is good enough to build on, but not yet clean enough to be declared complete.

The decisive fixes are now clear:

- remove territory's unified method model
- stop doing transition and geometry work inside presentation
- formalize runtime-adjustable geometry inputs
- give stars, lanes, and ships the same semantic rigor that territory is demanding

Once those corrections are applied, the project can support a truly definitive rendering core instead of another intermediate refactor.
