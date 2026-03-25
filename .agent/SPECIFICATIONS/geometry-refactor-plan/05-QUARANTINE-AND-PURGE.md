# Step 5: The Quarantine and Purge

> **⚠️ HUMAN APPROVAL REQUIRED before executing this step.**
>
> This step deletes files and functions permanently. Before proceeding:
> 1. Verify all unique algorithms have been extracted.
> 2. Confirm with the human that each deletion is safe.
> 3. Run the build and test suite after each batch of deletions.

---

## Goal

Remove all obsolete vector geometry modes, redundant generators, legacy bridges, and dead renderer paths from the canonical runtime.

---

## Pre-Deletion Extraction Checklist

Before deleting ANY file, verify these unique algorithms have been extracted:

| Algorithm | Source File | Extracted To | Status |
|-----------|------------|--------------|--------|
| `smoothSharpVertices()` | `ModifiedVoronoiRenderer.ts` | `geometryUtils.ts` | [ ] Must extract |
| `applyDisconnectBuffer()` | `ModifiedVoronoiRenderer.ts` | `geometryUtils.ts` | [ ] Must extract |
| `extractSharedEdges()` | `powerVoronoiTerritoryGeometryGenerator.ts` | `geometryUtils.ts` | [ ] Must extract |
| `detectEnclaves()` | `powerVoronoiTerritoryGeometryGenerator.ts` | `geometryUtils.ts` | [ ] Must extract |
| `chaikinSmoothPolyline()` | `powerVoronoiTerritoryGeometryGenerator.ts` | `geometryUtils.ts` | [x] Already extracted |
| FG2 shell classification | `fg2SeedGraph.ts` | `compiler_UnifiedVectorGeometry.ts` (`buildOwnerShells`) | [ ] Must absorb concept |

---

## Deletion Batches

### Batch 1: Obsolete Geometry Modes

These are empty wrappers that call superseded generators.

| File | Lines | Reason |
|------|-------|--------|
| `modes/PowerVoronoiGeometryMode.ts` | 53 | Calls old generator with default config. Fully superseded. |
| `modes/SeedGraphGeometryMode.ts` | 57 | Same generator, `clusterSplit: true`. Fully superseded. |
| `modes/BoundaryAwareFrontierGeometryMode.ts` | 59 | Logic extracted to `compiler_UnifiedVectorGeometry.ts`. |
| `modes/WeightedPowerVoronoiGeometryMode.ts` | ~50 | Duplicate name variant. |
| `modes/BoundaryConstrainedFrontierGeometryMode.ts` | ~50 | Duplicate name variant. |
| `modes/SeedGraphClusterSplitGeometryMode.ts` | ~50 | Duplicate name variant. |

**Verification:** `bunx vite build` clean after deleting these + removing their imports from `registry.ts`.

### Batch 2: Redundant Renderers

| File | Lines | Unique Value | Pre-Requisite |
|------|-------|-------------|---------------|
| `VoronoiRenderer.ts` | 387 | None — simplest ancestor. | None |
| `ModifiedVoronoiRenderer.ts` | 909 | `smoothSharpVertices()`, `applyDisconnectBuffer()` | Must extract to `geometryUtils.ts` first |
| `PVV3Renderer.ts` | 780 | FG2-aware rendering. | FG2 concepts must be absorbed (Step 2) |

**Verification:** No imports of these files remain anywhere. `bunx vite build` clean.

### Batch 3: Legacy Infrastructure

| File / Pattern | Lines | Reason |
|----------------|-------|--------|
| `legacyGeometryBridge` field | — | Remove from `CanonicalGeometrySnapshot`. Remove all reads. |
| `generateVoronoiTerritoryGeometry()` as entry point | ~190 | Keep helper functions, retire the orchestrator function |
| `TerritoryLegacyBridge.ts` dynamic imports | ~100 | Remove `vs_pvv3`, `power_voronoi`, `voronoi` cases |
| Legacy adapter files (`PowerVoronoiAdapter.ts`, `PowerVoronoiLegacyAdapter.ts`, `SeedGraphAdapter.ts`, `PVV3LegacyAdapter.ts`) | ~210 | No longer needed |

### Batch 4: FG2 Engine Isolation (Deferred)

`fg2SeedGraph.ts` (5380 lines) is NOT deleted in this step. It is **isolated**:
- Remove all imports of FG2 types from clean-architecture code.
- Ensure the orchestrator engine (`engine.ts`) does not run FG2 stages for the canonical pipeline.
- FG2 remains available only through the legacy orchestrator path (if kept for research/comparison).

---

## Post-Purge Scan

After all deletions:

1. **Import scan:** `grep -r "legacyGeometryBridge" src/` → must return 0 results.
2. **Import scan:** `grep -r "generateVoronoiTerritoryGeometry" src/` → must return 0 canonical-path results.
3. **Import scan:** `grep -r "PowerVoronoiGeometryMode\|SeedGraphGeometryMode\|BoundaryAwareFrontierGeometryMode" src/` → must return 0 results.
4. **Build:** `bunx vite build` clean.
5. **Runtime:** Start game, verify static territories render. Trigger conquest, verify transitions.

---

## Success Criteria

After this step:
- There is exactly 1 canonical vector geometry mode in the runtime.
- There is exactly 1 canonical vector geometry compiler entry point.
- `legacyGeometryBridge` does not exist as a concept.
- No renderer internally computes geometry.
- All deleted files' unique algorithms are preserved in `geometryUtils.ts` or the unified compiler.
