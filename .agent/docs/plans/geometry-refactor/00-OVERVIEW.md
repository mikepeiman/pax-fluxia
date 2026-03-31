# Geometry Architecture Refactor — Master Plan

**Created:** 2026-03-24 | **Revision:** 2 (post-review)  
**Authority:** Perplexity 2026-03-24 Mandate, Migration Map v3.1, Consolidation Analysis  
**Status:** APPROVED — Step 1 in progress

---

## Objective

Replace the fragmented territory geometry path with **one authoritative vector geometry compiler** and **one authoritative vector geometry mode**. Establish the canonical **raster-derived geometry** path as a parallel family with its own ownership-field contract. Downstream consumers (transitions, presentation styles) must be refactored to consume the new canonical contracts. Legacy modes and bridges must be deleted.

---

## Governing Principles

1. **One authoritative runtime path per family.** No parallel vector geometry pipelines. Raster-derived geometry uses a separate, explicit extraction path.
2. **One typed output contract per layer.** `CanonicalGeometrySnapshot` is the sole geometry output (both vector-native and raster-derived emit this shape).
3. **Architecture first.** Old internal APIs, bridges, and mode distinctions are deleted, not preserved.
4. **Styles never choose geometry algorithms.** Presentation consumes canonical data blindly.
5. **No geometric guessing.** Topology matching uses explicit graph IDs (`ptKey`, `ownerPairKey`, `sectionId`), star ownership influence attribution, and `SectionInfluence` scores — not ad-hoc heuristics.
6. **FrontierSection uniqueness.** A section exists EXACTLY ONCE. Two owners do NOT get separate copies. Region loops reference sections by ID; they do not own copied points.
7. **Smoothing is a geometry concern.** Chaikin smoothing is applied inside the compiler, before emission into `CanonicalGeometrySnapshot`. Coordinates shipped to the transition and presentation layers are FINAL — renderers must NEVER re-smooth or re-sample. *(Authority: TERRITORY_ARCHITECTURE.md L69, ARCHITECTURE_GUIDING_PRINCIPLES.md L64)*
8. **No sacrosanct modes.** All transition modes (including DY4) are subordinate to the new geometry contract.
9. **Extraction before deletion.** Before purging any file, verify all unique algorithms have been extracted. **CONSULT HUMAN before the purge.**
10. **Do NOT move the goalposts or choose the easier way.** Refactor to the correct architecture, not to the expedient one.

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
  → registry.ts (1 vector mode)
    → UnifiedVectorGeometryMode (3-line delegator)
      → compileVectorGeometry() [compiler_UnifiedVectorGeometry.ts]
        → computeGeometry0324() (renamed, reevaluated)
        → buildOwnerShells() (FG2 concepts absorbed)
        → buildFrontierTopology() (existing Phase 1 work)
        → Chaikin smoothing (geometry layer, pre-emission)
  → CanonicalGeometrySnapshot (rich: regions, frontiers, shells, topology, provenance)

No parallel paths.
No legacyGeometryBridge.
No internal geometry calls in renderers.
No smoothing in renderers.
```

> **NOTE:** `computeGeometry0319` → `computeGeometry0324`. The existing geometry generator must be reevaluated for validity and quality before adoption. The rename marks this refactor plan.

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
- `computeGeometry0319` (to be renamed `0324`) is the sole approved compiler foundation — **after reevaluation**
- FG2 concepts (half-edge structure via `FG2HalfEdge`, face walks via `FG2FaceWalk`, shell classification via `FG2OwnerShellArtifact`) must be absorbed
- `smoothSharpVertices()` must be extracted from `ModifiedVoronoiRenderer.ts` before deletion

### From the Perplexity Mandate
- Compilation orchestration must NOT live in mode classes
- Do NOT expose `computeGeometry0319` directly as a selectable mode
- Do NOT preserve `legacyGeometryBridge` as a design constraint
- Do NOT keep compatibility wrappers just to reduce churn
- **Do NOT move the goalposts or choose the easier way**

### From the Frontier Topology Project (Phase 1, already completed)
- `FrontierTopologyContracts.ts` defines `FrontierVertex`, `FrontierSection`, `RegionLoop`, `FrontierTopology`
- `buildFrontierTopology.ts` converts TMAP → FrontierTopology
- Phase 3 defines transition planner with **star influence as a high-weight matching criterion**
- Phase 4 frame sampler guarantees fill/border alignment through shared section interpolation
- Phase 5 defines shared-plan transition mode pattern

### From User Corrections
- **Smoothing is geometry, not presentation.** Per TERRITORY_ARCHITECTURE.md L69.
- **DY4 is not sacrosanct.** Must conform to new architecture or be rewritten.
- **computeGeometry0319 must be reevaluated and renamed to 0324.**
- **FG2 is mined and purged**, not preserved as a parallel system.

---

## Source Documents

| Document | Location | Key Content |
|----------|----------|-------------|
| Perplexity Mandate | `geometry-atlas/Perplexity 2026-03-24...detailed prompt.md` | 12-step execution directive |
| Migration Map v3.1 | `geometry-atlas/Geometry pipeline refactor 2026-03-24.md` | 4-phase refactor plan |
| Consolidation Analysis | `geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` | FG2 concepts list, deletion guide |
| Geometry Atlas | `geometry-atlas/GEOMETRY_ATLAS.md` | Full inventory (~12K LOC) |
| Perplexity Plan Rounds 1-2 | `geometry-atlas/Perplexity...plan round 1.md`, `...round 2.md` | TypeScript interfaces, raster contracts |
| Territory Architecture | `TERRITORY_ARCHITECTURE.md` | Smoothing = geometry layer (L69) |
| Architecture Guiding Principles | `ARCHITECTURE_GUIDING_PRINCIPLES.md` | Smoothing placement table (L64) |
| Frontier Topology Phases 0-5 | `frontier-topology-project/0*.md` | Topology types, planner, sampler |
| Frontier Topology CODE-MAP | `frontier-topology-project/CODE-MAP.md` | File/function/line references |
| Transition Inventory | `TERRITORY_TRANSITION_INVENTORY.md` | All transition types and call flows |
