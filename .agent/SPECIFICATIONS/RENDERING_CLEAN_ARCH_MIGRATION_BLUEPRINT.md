# Rendering Clean Architecture Migration Blueprint

## Purpose

This document maps the existing rendering system into the definitive clean architecture that should govern the refactor.

It is intentionally prescriptive. The point is to remove future naming drift and architectural ambiguity.

## Final Foundational Decision

The project should adopt:

`Canonical Frontier Topology`

This is the definitive territory foundation.

It means:

- start from canonical frontier and region truth
- absorb the strongest parts of `Geometry_0319`
- keep geometry truth independent from style
- treat live geometry-control changes as first-class runtime inputs

It does **not** mean:

- preserve the exact legacy `Geometry_0319.ts` module unchanged
- use distance fields, metaballs, or pixel territory as canonical truth
- let presentation mutate or reinterpret geometry

## Target Runtime Layout

```text
RenderingRuntimeCoordinator
  TerritoryRuntimeCoordinator
    OwnershipLayerCoordinator
    GeometryLayerCoordinator
      TerritoryGeometryModeRegistry
      TerritoryGeometryAdjustmentRegistry
    TransitionLayerCoordinator
      TerritoryFillTransitionModeRegistry
      TerritoryBorderTransitionModeRegistry
    TerritoryPresentationCoordinator
      TerritoryFillStyleRegistry
      TerritoryBorderStyleRegistry
  MapPresentationCoordinator
    StarBodyStyleRegistry
    StarStateOverlayRegistry
    LaneBodyStyleRegistry
    LaneOrderIndicatorRegistry
  ShipFxRuntimeCoordinator
    ShipOrbitStyleRegistry
    ShipDepartureTransitionRegistry
    ShipTravelPathRegistry
    ShipArrivalTransitionRegistry
    ShipAttackEngageFxRegistry
    ShipConquestTransferRegistry
    ShipTransportTransferRegistry
    ShipDamageStateFxRegistry
    ShipRepairStateFxRegistry
    ShipDestructionFxRegistry
```

## Runtime Contracts

### TerritoryRuntimeCoordinator input

- star state snapshot
- connection snapshot
- player ordering
- world bounds
- `TerritoryInvariantSet`
- `TerritoryGeometryControlSet`
- selected territory mode ids
- time sample and active transition envelope

### TerritoryRuntimeCoordinator output

- `TerritoryGeometrySnapshot`
- `TerritoryTransitionSnapshot`
- `TerritoryPresentationFrame`

### Geometry control contracts

Geometry owns:

- smoothing method
- smoothing iteration or intensity
- resampling density
- star padding and minimum territory buffer
- corridor virtual-site policy
- disconnect virtual-site policy
- frontier fitting family
- topology validation and cleanup

Each geometry mode must publish a `GeometryUpdatePolicy`:

- `live_recompute`
- `debounced_recompute`
- `cached_incremental_recompute`
- `transition_safe_resample`
- `requires_controlled_reset`

## Naming Ledger

The following names should replace overloaded or vague current names.

| Current label or id | Final machine id | Final human label | Notes |
|---|---|---|---|
| `new_frontiers_0319` | `boundary_aware_frontier_v0319` | Boundary-Aware Frontier 0319 | Benchmark import mode, not the final umbrella name |
| current compiler-driven canonical path | `canonical_frontier_topology` | Canonical Frontier Topology | Final foundational direction |
| `power_voronoi` geometry label | `weighted_power_cells` | Weighted Power Cells | Early-stage site partitioning geometry |
| `unified_polygon` | `resampled_region_loops` | Resampled Region Loops | Single-path polygon geometry branch |
| `territory_engine` | `legacy_territory_engine_style` | Legacy Territory Engine Style | Style label only, not architecture label |
| `vs_pvv3` | `frontier_first_legacy_style` | Frontier-First Legacy Style | Style branch only |
| `distance_field` | `distance_field_style` | Distance Field Style | Never geometry truth |
| `metaball` | `metaball_style` | Metaball Style | Never geometry truth |
| `pixel` | `pixel_worker_style` | Pixel Worker Style | Diagnostic or optional style |
| `graph` | `graph_partition_style` | Graph Partition Style | Experimental branch |
| `contour` | `contour_loop_style` | Contour Loop Style | Experimental branch |
| `TRAVEL_MODE=lane` | `lane_committed_travel` | Lane-Committed Travel | ShipTravelPathMode |
| `TRAVEL_MODE=bezier` | `bezier_arc_travel` | Bezier Arc Travel | ShipTravelPathMode |
| `ORB_TRAVEL` orb grouping | `grouped_orb_travel` | Grouped Orb Travel | Separate travel path style, not a boolean side flag |
| `CONQUEST_ANIMATION_MODE=immediate` | `instant_orbit_claim` | Instant Orbit Claim | ShipConquestTransferMode |
| `CONQUEST_ANIMATION_MODE=surge` | `radial_claim_settle` | Radial Claim Settle | ShipConquestTransferMode |
| `CONQUEST_ANIMATION_MODE=travel` | `lane_claim_transfer` | Lane Claim Transfer | ShipConquestTransferMode |
| `CONQUEST_ANIMATION_MODE=arrowhead` | `wedge_assault_claim` | Wedge Assault Claim | ShipConquestTransferMode |

## Module Migration Map

| Current module or pattern | Destination | Action |
|---|---|---|
| `territory/compiler/TerritoryCompiler.ts` | `GeometryLayerCoordinator` support module | Keep and rename contracts |
| `territory/compiler/Geometry_0319.ts` | `geometry/modes/boundary_aware_frontier_v0319` | Extract benchmark logic |
| `territory/compiler/frontierFitter.ts` | `geometry/adjustments/frontierFitting` | Keep, formalize as adjustment family |
| `territory/compiler/TerritoryTransitionPlanner.ts` | `TransitionLayerCoordinator` planner package | Move fully out of compiler identity |
| `territory/render/TerritoryRenderer.ts` | `TerritoryPresentationCoordinator` presenters | Split into pure fill and border presenters |
| render-time edge substitution inside `TerritoryRenderer` | transition or geometry sampling layer | Remove from presentation entirely |
| `territory/orchestrator/registry.ts` | multiple layer registries | Replace completely |
| `territory/orchestrator/renderMode.ts` | typed presentation and transition contracts | Replace |
| `fx/handlers/territoryTransitionHandler.ts` | `TerritoryTransitionFxBridge` plus runtime-owned event store | Rewrite |
| `renderers/PowerVoronoiRenderer.ts` | algorithm extraction only | Extract reusable math, archive renderer core |
| `renderers/PVV3Renderer.ts` | geometry research source only | Extract frontier-first insights |
| `renderers/DistanceFieldTerritoryRenderer.ts` | optional presentation branch | Keep as style experiment, not truth |
| `renderers/ModifiedVoronoiRenderer.ts` | corridor and disconnect geometry utilities | Extract shaping ideas only |
| `renderers/VoronoiRenderer.ts` | optional fill and border style branch | Keep style, not truth |
| `renderers/MetaballRenderer.ts` | optional style branch | Keep style only |
| `renderers/PixelTerritoryRenderer.ts` | diagnostic and optional style branch | Keep diagnostic value only |
| `renderers/StarRenderer.ts` | `MapPresentationCoordinator` star body and overlay presenters | Split by concern, preserve visuals |
| `renderers/LaneRenderer.ts` | `MapPresentationCoordinator` lane body and order presenters | Split by concern, preserve visuals |
| `renderers/ShipRenderer.ts` | `ShipFxRuntimeCoordinator` presentation surface | Keep draw logic, split lifecycle ownership and mode naming |
| `fx/phases/behaviors.ts` | ship departure and travel registries | Keep and rename semantically |
| `animations/conquest/strategies.ts` | conquest transfer registry | Keep and rename semantically |

## Phased Migration Order

### Phase 1. Architecture corrections

- create the final semantic contracts
- remove the unified territory method model
- define geometry control and update-policy interfaces
- isolate territory transition bridging from FX handler singleton state

### Phase 2. Canonical territory core

- absorb `Geometry0319` lessons into `canonical_frontier_topology`
- move transition sampling out of presentation
- keep fill and border aligned from one canonical source
- codify controlled behavior for live geometry-control changes

### Phase 3. Territory style branches

- reattach legacy territory styles as optional presentation branches
- keep style branches unable to mutate geometry truth
- allow distance-field, Voronoi, metaball, and pixel branches only through presentation contracts

### Phase 4. Map presentation normalization

- split stars into body and overlay registries
- split lanes into lane body and order indicator registries
- add missing contested-lane occupancy language

### Phase 5. Ship lifecycle normalization

- lift ship lifecycle into explicit mode families
- keep transport transfer, conquest transfer, and attack surge separate
- add missing damage, repair, and destruction FX families

### Phase 6. Optional advanced branches

- trails
- richer conquest spectacle
- GPU-heavy border or fill experiments
- force-aware or flow-aware territory embellishments

## Live Geometry-Control Policy

The clean architecture must make runtime control changes safe.

### Controls that may usually support live recompute

- smoothing iteration or intensity
- resampling density
- non-topology-breaking frontier fitting adjustments

### Controls that should usually use debounced recompute

- corridor density
- disconnect spacing
- buffer radius changes that alter many frontiers at once

### Controls that may require transition-safe resample or controlled reset

- topology family swap
- drastic buffer changes
- rules that change component separation or lane-connected contiguity

The runtime must be honest about which category applies. Hidden fallback behavior is not acceptable.

## Non-Negotiable Migration Rules

1. No presentation module may fabricate geometry.
2. No style mode may redefine topology.
3. No FX handler may become a hidden state authority for territory truth.
4. No geometry-affecting control may live outside the geometry contract.
5. No final naming should require the user to remember historical file names to understand the mode.

## Final Blueprint Verdict

The definitive refactor should keep the clean intent already present in the project, but it must stop preserving hybrid territory concepts for compatibility's sake.

The winning long-term shape is:

- one rendering runtime
- one territory runtime
- one semantic vocabulary
- one canonical frontier truth
- many optional presentation and FX modes attached cleanly at the edges
