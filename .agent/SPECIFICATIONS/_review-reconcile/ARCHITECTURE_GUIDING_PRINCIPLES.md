# Territory Architecture — Guiding Principles & Theory

**Date:** 2026-03-23
**Status:** ACTIVE — Theoretical specification guiding all territory architecture decisions.
**Ref:** D-83, D-84, D-85, D-86

---

## 1. Purpose

This document defines the principles that govern the territory system architecture. It is not a description of what exists — it is a specification of what must be true. Every implementation decision, naming choice, and structural change must be verifiable against these principles.

---

## 2. Core Architectural Principles

### 2.1 Single Source of Truth

Every piece of data has exactly one authoritative producer. No layer derives data that another layer already owns.

| Data | Authority | Consumers |
|------|-----------|-----------|
| Who owns each star | Ownership layer | Geometry, Transition |
| Territory shapes and borders | Geometry layer | Transition, Presentation |
| Animated frame interpolation | Transition layer | Presentation |
| Draw commands | Presentation layer | PIXI adapter |

**Test:** If you can delete a layer and two different modules break because they each independently computed that layer's output, the architecture is wrong.

### 2.2 Contract-First Design

Every layer boundary is defined by a TypeScript interface — the **contract**. Code adapts to contracts, not the reverse.

```
Ownership → OwnershipSnapshot
Geometry  → GeometrySnapshot
Transition → TransitionSnapshot
Presentation → TerritoryPresentationFrame
```

**What a contract means:**
A contract is not just a type — it's a _promise about data shape, invariants, and lifecycle_. The contract says:
- What fields exist and what they contain
- What is guaranteed (e.g., "regions are pre-smoothed" — consuming layers must not re-smooth)
- What is not guaranteed (e.g., "point count may vary between frames")

**D-84 rule:** When existing code doesn't produce data matching a contract, the code is wrong — the contract is authoritative. Bring conflicts to the user with analysis, never silently weaken a contract.

### 2.3 Layer Independence

Each layer can be understood, tested, and replaced without reading any other layer's source code. A layer:
- Receives a typed input
- Produces a typed output
- Has no knowledge of who calls it or what happens to its output

**Test:** If changing the implementation of the geometry layer requires touching transition code, the boundary is leaking.

### 2.4 Separation of Concern by Kind

| Concern | Where it lives | Where it must NOT live |
|---------|---------------|----------------------|
| Ownership changes | Ownership layer | Geometry, Transition, Presentation |
| Shape computation | Geometry layer | Transition, Presentation, PIXI adapter |
| Smoothing (Chaikin, Bézier) | Geometry layer | Anywhere else |
| Animation timing | Transition layer | Geometry, Presentation |
| Visual appearance | Presentation layer | Geometry, Transition |
| PIXI.Graphics calls | PIXI adapter | ALL domain layers |
| Config reading | ConfigNormalizer | Layers directly |

### 2.5 Pluggable Modes Within Layers

Each layer has a _registry_ of _modes_. A mode is an interchangeable implementation of one layer's contract.

```
Geometry layer:
  ├── BoundaryAwareFrontierGeometryMode   (power Voronoi + world clipping)
  ├── SeedGraphGeometryMode               (FG2-derived)
  └── [future modes...]

Transition layer (fill axis):
  ├── FrontierMorphFillMode               (vertex-interpolated fill morphing)
  ├── CrossfadeFillMode                   (alpha-blend between old and new)
  └── [future modes...]

Transition layer (border axis):
  ├── OptimalTransportBorderMode          (mass-preserving border drift)
  ├── RopeMorphBorderMode                 (spline-interpolated border morphing)
  └── [future modes...]

Presentation layer:
  ├── CanonicalTerritoryStyle             (standard vector fills + strokes)
  ├── DistanceFieldStyle                  (GPU glow shader)
  └── [future modes...]
```

**Rule:** A mode implements one interface. Adding a new mode requires writing one file, adding one registry entry, and adding one dropdown option. Zero changes to any layer coordinator.

### 2.6 PIXI at the Edge

PIXI.js is a rendering library, not an architecture. It belongs at the outermost boundary — the **adapter** — never inside domain logic.

**Test:** `grep -r "PIXI" territory/layers/` should return zero results. `grep -r "PIXI" territory/contracts/` should return zero results.

### 2.7 Configuration Normalization

Raw config keys (`GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN`) are read in exactly one place: `TerritoryConfigNormalizer`. All downstream code receives structured, typed objects (`TerritoryTunables`, `TerritoryModeSelection`).

**Benefit:** Renaming a config key requires changing exactly one file. Adding a new tunable requires adding it to `TerritoryTunables` and the normalizer — no layer code changes.

---

## 3. The Contract in Detail

### 3.1 Runtime Flow

```
GameCanvasTerritoryBridge (one function call per frame)
  → TerritoryRuntimeCoordinator.update(TerritoryFrameInput)
    → OwnershipLayerCoordinator.compute(OwnershipLayerInput)
       returns OwnershipSnapshot
    → GeometryLayerCoordinator.compute(GeometryLayerInput)
       returns GeometrySnapshot
    → TransitionLayerCoordinator.compute(TransitionLayerInput)
       returns TransitionSnapshot
    → PresentationLayerCoordinator.buildFrame(PresentationLayerInput)
       returns TerritoryPresentationFrame
  → PixiTerritoryPresenter.present(TerritoryPresentationFrame)
```

### 3.2 The Full Pipeline — A Concrete Example

When the user moves the MSR (Star Margin) slider from 45 to 80:

1. **Config:** `GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = 80`
2. **ConfigNormalizer:** reads config → produces `TerritoryTunables { starMargin: 80, ... }` + `TerritoryModeSelection { geometryMode: 'boundary_aware_frontier', ... }`
3. **Bridge:** builds `TerritoryFrameInput` with tunables + selection, calls coordinator
4. **Ownership:** star ownership hasn't changed → returns cached `OwnershipSnapshot`
5. **Geometry:** fingerprint includes `starMargin=80` → cache miss → recomputes:
   - Reads star positions + ownership from `OwnershipSnapshot`
   - Computes power Voronoi with `weight = 80²` per star
   - Applies CX corridor virtual stars (count from `tunables.cxCount`, weight from `tunables.cxWeight`)
   - Applies DX disconnect virtual stars (weight from `tunables.dxWeight`)
   - Merges same-owner cells
   - Applies Chaikin smoothing (`tunables.geometrySmoothingPasses`)
   - Returns `GeometrySnapshot { version: "abc123", territoryRegions: [...], frontierPolylines: [...] }`
6. **Transition:** no conquest → progress = 1.0 (settled) → returns steady-state `TransitionSnapshot` that passes through target geometry unchanged
7. **Presentation:** reads geometry + transition → builds `FillDrawCommand[]` for each region + `BorderDrawCommand[]` for each frontier polyline
8. **Adapter:** renders draw commands to PIXI.Graphics

The entire pipeline runs in ~2ms. The geometry cache ensures that if nothing changed, steps 5-8 are skipped.

### 3.3 Data Shapes

**OwnershipSnapshot:**
```typescript
{
  version: "own_abc",                     // changes when ownership changes
  starOwners: Map { "star1" → "player_red", "star2" → "player_blue" },
  contestedLaneIds: ["star1→star3"],      // lanes with different owners at endpoints
  conquestEvents: [{ starId: "star3", previousOwner: "blue", newOwner: "red", atMs: 12400 }],
  virtualStars: [...]                     // VS transition ghost stars
}
```

**GeometrySnapshot:**
```typescript
{
  version: "geo_xyz",                     // changes when geometry recomputes
  sourceMode: "boundary_aware_frontier",  // which geometry mode produced this
  ownershipVersion: "own_abc",            // which ownership state this geometry is for
  territoryRegions: [                     // pre-smoothed fill polygons
    { ownerId: "player_red", points: [[x,y], [x,y], ...] },
    ...
  ],
  frontierPolylines: [                    // pre-smoothed border polylines
    { ownerPairKey: "red|blue", points: [[x,y], [x,y], ...] },
    ...
  ],
  territoryGeometry: { ... }             // full geometry data (power sites, cells, etc.)
}
```

**TransitionSnapshot:**
```typescript
{
  geometryVersion: "geo_xyz",
  envelope: { transitionId: "t1", startedAtMs: 12400, durationMs: 400, progress: 0.65, ... },
  fillFrame: { regions: [{ ownerId: "red", points: [[interpolated...]] }] },
  borderFrame: { frontiers: [{ ownerPairKey: "red|blue", points: [[interpolated...]] }] }
}
```

**TerritoryPresentationFrame:**
```typescript
{
  fills: [{ ownerId: "red", points: [[x,y],...], alpha: 0.6, color: 0xFF4444 }],
  borders: [{ ownerPairKey: "red|blue", points: [[x,y],...], width: 3, alpha: 0.8 }],
  debug: []
}
```

---

## 4. Naming Principles

### 4.1 Names Describe Responsibility, Not History

| Bad (history-based) | Good (responsibility-based) |
|---------------------|---------------------------|
| `Geometry_0319` | `BoundaryAwareFrontierGeometryMode` |
| `DY4` | `OptimalTransportBorderMode` |
| `PVV2` | `PowerVoronoiLegacyStyle` → eventually deleted |
| `FG2` | `SeedGraphGeometryMode` |
| `engine.ts` | `TerritoryRuntimeCoordinator.ts` |

### 4.2 Names Encode Structural Position

A module's name should tell you:
- **Which layer** it belongs to (`Geometry`, `Transition`, `Presentation`)
- **What kind** of module it is (`Mode`, `Coordinator`, `Presenter`)
- **What it does** (`BoundaryAwareFrontier`, `OptimalTransport`, `Crossfade`)

> `layers/transition/modes/OptimalTransportBorderMode.ts`

Reading this path, you immediately know: it's a mode in the transition layer that handles borders using optimal transport. No further context needed.

### 4.3 Consistent Vocabulary

| Term | Meaning | Used For |
|------|---------|----------|
| **Snapshot** | Immutable data produced by a layer for one frame | `OwnershipSnapshot`, `GeometrySnapshot`, `TransitionSnapshot` |
| **Mode** | Interchangeable implementation of a layer contract | `GeometryMode`, `FillTransitionMode`, `TerritoryStyleMode` |
| **Coordinator** | Orchestrator that selects a mode and manages caching | `OwnershipLayerCoordinator`, `GeometryLayerCoordinator` |
| **Frame** | Per-frame output consumed by the next stage | `FillTransitionFrame`, `BorderTransitionFrame`, `TerritoryPresentationFrame` |
| **Envelope** | Transition lifecycle container (start, duration, progress) | `TransitionEnvelope` |
| **Plan** | Pre-computed transition strategy created once per transition | `FillTransitionPlan`, `BorderTransitionPlan` |
| **Command** | Atomic draw instruction for the PIXI adapter | `FillDrawCommand`, `BorderDrawCommand` |
| **Presenter** | PIXI-boundary adapter that executes draw commands | `PixiTerritoryPresenter` |
| **Bridge** | Integration adapter between domain and framework (Svelte, PIXI) | `GameCanvasTerritoryBridge` |

### 4.4 Avoid Ambiguity

- Never use "render" for domain computation — it implies PIXI. Use "compute", "build", or "produce."
- Never use "state" for immutable snapshots — "state" implies mutation. Use "snapshot" or "frame."
- Never use "engine" — too vague. Use "runtime" (the coordinator) or "mode" (a pluggable implementation).

---

## 5. Reliability Principles

### 5.1 Typed Boundaries Prevent Silent Breakage

Every contract is a TypeScript interface. If a mode stops producing the right shape, the build fails. No `any`, no `Record<string, unknown>`, no `as` casts crossing layer boundaries.

### 5.2 Immutable Data Between Layers

Layer outputs are `readonly`. A transition mode cannot mutate the geometry snapshot it receives. This prevents action-at-a-distance bugs where modifying transition data silently corrupts geometry for the next frame.

### 5.3 Fingerprint-Based Caching

Each layer caches its output keyed by a fingerprint of its inputs. If inputs haven't changed (same ownership version, same tunables), the layer returns the cached snapshot without recomputation. This makes the pipeline efficiently idempotent.

### 5.4 Graceful Degradation

If a mode fails (throws, returns malformed data), the coordinator:
1. Logs the error with full context
2. Falls back to the previous valid snapshot
3. Never crashes the game or leaves blank territory

---

## 6. Deletion Protocol (D-85 + D-87)

When a new clean mode is confirmed working:
1. The new mode is the default in the registry
2. The old code is identified for deletion
3. **User is asked for explicit confirmation** before any file is deleted (D-87)
4. Old file is deleted, not moved to a "deprecated" folder
5. Any remaining references are removed in the same commit

---

## 7. Evaluation Mindset

The architecture is not fixed. As implementation proceeds, every step should be an opportunity to:
- Discover a contract that's missing fields or has unnecessary ones
- Find a naming inconsistency
- Identify a concern that's bleeding across layer boundaries
- Spot an opportunity for a new mode or a cleaner abstraction

These findings are brought to the user with analysis, not silently resolved.
