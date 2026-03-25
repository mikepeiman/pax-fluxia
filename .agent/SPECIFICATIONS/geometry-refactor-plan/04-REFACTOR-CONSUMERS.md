# Step 4: Refactor Downstream Consumers

## Goal

Make transitions, presentation, and all renderers consume `CanonicalGeometrySnapshot` through proper contracts. Remove all reads of `legacyGeometryBridge`.

---

## Affected Systems

### 1. Transition Layer

The transition pipeline currently has two paths:

**Path A — Clean architecture transitions** (`TransitionLayerCoordinator.ts`)
- Fill modes: `FrontierMorphFillMode`, `CrossfadeFillMode`
- Border modes: `OptimalTransportBorderMode`, `RopeMorphBorderMode`
- These already consume `GeometrySnapshot` fields — but some reach into `legacyGeometryBridge` for `TerritoryGeometryData`.

**Path B — PVV2 renderer-internal transitions** (`PowerVoronoiRenderer.ts`)
- Weight-lerp DY4 transition
- Localized boundary transition
- These call `generateVoronoiTerritoryGeometry()` internally and operate on raw `TerritoryGeometryData`.

**Required changes:**
- Path A consumers must read from `CanonicalGeometrySnapshot` canonical fields only.
- Path B must be decoupled: PVV2 must receive pre-computed geometry from the canonical pipeline, not compute its own.

### 2. Topology Matching Rules

> **CRITICAL CONSTRAINT: No geometric guessing.**

Transition matchers must identify corresponding geometry between frames using only:
- `ptKey` (from `FrontierVertex.id`)
- `ownerPairKey` (from `FrontierSection.ownerPairKey`)
- `sectionId` (from `FrontierSection.id`)
- `loopId` (from `RegionLoop.id`)

Do NOT use:
- Centroid proximity
- Bounding box intersection
- Spatial heuristics

The `FrontierTopology` on `CanonicalGeometrySnapshot` provides all the identity needed.

### 3. Smoothing and Closure Rules

> **CRITICAL CONSTRAINT: Smoothing is a presentation concern.**

Frame samplers (e.g., `TopologyFrameSampler`, `FrontierMorphFillMode`) must output raw interpolated segments. The smoothing pipeline is:

```
Compiler (0319)
  → Raw polygons + polylines
  → Chaikin smoothing applied here (before emit)
  → CanonicalGeometrySnapshot (smoothed points)

Transition (frame sampler)
  → Interpolate between smoothed sections at progress t
  → Output: raw interpolated points (NO additional smoothing)

Presentation (PIXI renderer)
  → Receive interpolated points
  → Apply any final visual polish (anti-aliasing, stroke width)
  → Draw to screen
```

The key insight: the compiler already smooths the points before emitting them in `CanonicalGeometrySnapshot`. The transition layer interpolates between two already-smoothed states. No additional smoothing pass is needed during or after interpolation — the OT interpolation preserves the smooth character of its inputs.

### 4. DY4 Weight-Lerp Transition

DY4 currently operates as a parallel universe inside `PowerVoronoiRenderer.ts`:
- It manages its own `weightLerp*` state (12 fields on `PVV2RendererState`)
- It calls `generateVoronoiTerritoryGeometry()` with interpolated weights
- It produces its own geometry per-frame

**Required refactor:**
- DY4 weight interpolation must be moved to the transition layer.
- Each frame, the transition layer should tell the compiler to recompute geometry with lerped weights (via `weightOverrides` on `computeGeometry0319`).
- The result is a standard `CanonicalGeometrySnapshot` that the presentation layer draws.
- PVV2 no longer does its own geometry computation for DY4 frames.

> **Note:** This is the most impactful consumer refactor. It converts DY4 from a renderer-internal system to a proper transition-layer concept.

### 5. Localized Boundary Transition

The splice-based `createCanonicalTransitionPlan()` pipeline (`transitions/*.ts`) already consumes `TerritoryGeometryData`. It must be updated to consume `CanonicalGeometrySnapshot` fields:
- `territoryRegions` → `shells` + `shellLoops`
- `sharedPolylines` → `frontierPolylines` + `sharedFrontierMap`
- `frontierMap` → `frontierTopology`

### 6. Presentation / Renderer

`PowerVoronoiRenderer.ts` must become a pure presentation function:
- Receives `CanonicalGeometrySnapshot` (or `TransitionSnapshot`) as input.
- Draws fills from `shells` / `territoryRegions`.
- Draws borders from `frontierPolylines`.
- Does NOT call any geometry generator.
- Does NOT maintain transition state.

---

## Adapter (If Required)

If the refactor of `createCanonicalTransitionPlan()` is too large for one step, a temporary adapter is acceptable:

**`layers/geometry/adapters/canonicalToLegacyTransitionData.ts`**

This adapter must:
- Convert `CanonicalGeometrySnapshot` fields to the shapes expected by existing transition code.
- NOT expose `legacyGeometryBridge`.
- Be explicitly marked `@deprecated` with a removal timeline.

---

## Files Modified

| File | Change |
|------|--------|
| `layers/transition/TransitionLayerCoordinator.ts` | Read from canonical fields, not legacy bridge |
| `layers/transition/modes/FrontierMorphFillMode.ts` | Consume canonical regions/shells |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | Consume canonical frontiers |
| `layers/transition/planners/GeometryTopologyDiff.ts` | Use `frontierTopology` for matching |
| `renderers/PowerVoronoiRenderer.ts` | Remove internal `generateVoronoiTerritoryGeometry()` call; receive pre-computed geometry |
| `transitions/createCanonicalTransitionPlan.ts` | Consume canonical snapshot, not raw data |
| Various transition files | Update to read canonical fields |

---

## Cross-References

The transition consumer refactor must be informed by these detailed algorithm specifications:

| Source | What it provides |
|--------|------------------|
| [Frontier Topology Phase 3](../frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md) | 10-step transition planner algorithm: vertex matching, section matching, anchor plans, CDF transport maps, birth/death directives |
| [Frontier Topology Phase 4](../frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md) | 7-step frame sampler algorithm: vertex interpolation, section interpolation, loop rebuild from section refs (guarantees fill/border alignment) |
| [Perplexity Plan Round 2](../geometry-atlas/Perplexity%202026-03-24%20geometry%20refactor%20plan%20round%202.md) | Raster transition compatibility: field-level vs geometry-level transition tiers, provenance-gated fallback |
| [TERRITORY_TRANSITION_INVENTORY.md](../TERRITORY_TRANSITION_INVENTORY.md) | Complete inventory of all transition types, call flows, and state fields |

---

## Verification

- `bunx vite build` clean.
- Zero references to `legacyGeometryBridge` in any canonical-path file.
- Static territories render correctly (no transitions).
- Conquest transitions produce correct fill/border frames (user visual verification required).
