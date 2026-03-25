# Geometry Architecture Refactor — Master Plan

**Created:** 2026-03-24  
**Authority:** Perplexity 2026-03-24 Mandate, Migration Map v3.1, Consolidation Analysis  
**Status:** APPROVED — Ready for execution

---

## Objective

Replace the fragmented territory geometry path with **one authoritative vector geometry compiler** and **one authoritative vector geometry mode**. Downstream consumers (transitions, presentation styles) must be refactored to consume the new canonical contract. Legacy modes and bridges must be deleted.

---

## Governing Principles

1. **One authoritative runtime path.** No parallel vector geometry pipelines.
2. **One typed output contract per layer.** `CanonicalGeometrySnapshot` is the sole geometry output.
3. **Architecture first, compatibility never.** Old internal APIs, bridges, and mode distinctions are deleted, not preserved.
4. **Styles never choose geometry algorithms.** Presentation consumes canonical data blindly.
5. **No geometric guessing.** Topology matching uses explicit graph IDs (`ptKey`, `ownerPairKey`, section IDs), never centroids or bounding boxes.
6. **FrontierSection uniqueness.** A section exists EXACTLY ONCE. Two owners do NOT get separate copies. Region loops reference sections by ID; they do not own copied points.
7. **Smoothing is a presentation concern.** Frame samplers output raw interpolated segments. Chaikin smoothing, corner-cutting, and disconnect buffers are applied by the presentation layer after transition scaling.
8. **No sacrosanct modes.** All transition modes (including DY4) are subordinate to the new geometry contract.
9. **Extraction before deletion.** Before purging any file, verify all unique algorithms have been extracted into `geometryUtils.ts` or the unified compiler. **CONSULT HUMAN before executing the purge.**

---

## Architecture: Before vs After

### Before (Current State)

```
GeometryLayerCoordinator
  → registry.ts (4 modes registered)
    → UnifiedVectorGeometryMode (111L, contains orchestration)
    → WeightedPowerVoronoiGeometryMode (legacy)
    → BoundaryConstrainedFrontierGeometryMode (legacy)
    → SeedGraphClusterSplitGeometryMode (legacy)
  → GeometrySnapshot (thin, relies on legacyGeometryBridge)

Parallel paths:
  → FG2 engine (fg2SeedGraph.ts, 5380L) — unused by clean arch
  → PVV2 renderer calls generateVoronoiTerritoryGeometry() internally
  → PVV3 renderer consumes FG2 output via LegacyBridge
```

### After (Target State)

```
GeometryLayerCoordinator
  → registry.ts (1 mode)
    → UnifiedVectorGeometryMode (3-line delegator)
      → compileVectorGeometry() [compiler_UnifiedVectorGeometry.ts]
        → computeGeometry0319() (internal)
        → buildOwnerShells() (FG2 concepts absorbed)
        → buildFrontierTopology() (existing Phase 1 work)
  → CanonicalGeometrySnapshot (rich: regions, frontiers, shells, topology)

No parallel paths.
No legacyGeometryBridge.
No internal geometry calls in renderers.
```

---

## Step Map

| Step | Document | Scope | Depends On |
|------|----------|-------|------------|
| 1 | [01-CANONICAL-CONTRACT.md](01-CANONICAL-CONTRACT.md) | Define `CanonicalGeometrySnapshot` and shell types | — |
| 2 | [02-UNIFIED-COMPILER.md](02-UNIFIED-COMPILER.md) | Build `compiler_UnifiedVectorGeometry.ts` | Step 1 |
| 3 | [03-ENFORCE-SINGLE-MODE.md](03-ENFORCE-SINGLE-MODE.md) | Registry, coordinator, mode selection updates | Steps 1–2 |
| 4 | [04-REFACTOR-CONSUMERS.md](04-REFACTOR-CONSUMERS.md) | Update transitions, presentation, and DY4 | Steps 1–3 |
| 5 | [05-QUARANTINE-AND-PURGE.md](05-QUARANTINE-AND-PURGE.md) | Delete obsolete files and bridges | Steps 1–4, HUMAN APPROVAL |

---

## Key Constraints

### From the Migration Map v3.1
- `computeGeometry0319` is the sole approved compiler foundation.
- FG2 concepts (half-edges, face walks, shells) must be absorbed, not preserved as a parallel runtime.
- `smoothSharpVertices()` must be extracted from `ModifiedVoronoiRenderer.ts` before that file is deleted.

### From the Perplexity Mandate
- Compilation orchestration must NOT live in mode classes.
- Do NOT expose `computeGeometry0319` directly as a selectable mode.
- Do NOT preserve `legacyGeometryBridge` as a design constraint.
- Do NOT keep compatibility wrappers just to reduce churn.

### From the Frontier Topology Project (Phase 1, already completed)
- `FrontierTopologyContracts.ts` defines `FrontierVertex`, `FrontierSection`, `RegionLoop`, `FrontierTopology`.
- `buildFrontierTopology.ts` converts TMAP → FrontierTopology.
- These types are already on `GeometrySnapshot` as an optional field — they must become part of the mandatory `CanonicalGeometrySnapshot`.

### From User Corrections
- **No centroids or BBox matching.** Topology matching relies on exact graph IDs only.
- **Smoothing after interpolation.** Raw segments are output by frame samplers; smoothing is a presentation-layer concern applied before PIXI draw calls.
- **DY4 is not sacrosanct.** It must conform to the new architecture or be rewritten.

---

## Source Documents

| Document | Location | Key Content |
|----------|----------|-------------|
| Perplexity Mandate | `geometry-atlas/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md` | 12-step execution directive |
| Migration Map v3.1 | `geometry-atlas/Geometry pipeline refactor 2026-03-24.md` | 4-phase refactor plan |
| Consolidation Analysis | `geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` | 2-method simplification rationale |
| Geometry Atlas | `geometry-atlas/GEOMETRY_ATLAS.md` | Full inventory (~12K LOC, 5 tiers) |
| Perplexity Plan Round 1 | `geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 1.md` | TypeScript interfaces for contracts |
| Perplexity Plan Round 2 | `geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 2.md` | Raster contracts, transition tiers |
| Perplexity Part 1 (Code) | `geometry-atlas/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` | `UnifiedVectorGeometryMode` template |
| Frontier Topology Overview | `frontier-topology-project/00-PROJECT-OVERVIEW.md` | 5-phase topology project scope |
| Frontier Topology Phase 3 | `frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md` | 10-step transition planner algorithm |
| Frontier Topology Phase 4 | `frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md` | 7-step frame sampler algorithm |
| Frontier Topology Phase 5 | `frontier-topology-project/05-PHASE-5-PRESENTATION.md` | Shared-plan transition mode pattern |
| Frontier Topology Phase 0 Audit | `frontier-topology-project/00A-PHASE-0-AUDIT.md` | Compiler already computes 95% of topology data |
| Frontier Topology CODE-MAP | `frontier-topology-project/CODE-MAP.md` | Exact file/function/line references |
| Transition Inventory | `TERRITORY_TRANSITION_INVENTORY.md` | All transition types and call flows |
