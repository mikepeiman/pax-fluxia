# Step 2: Create the Unified Vector Compiler

## Goal

Build the single authoritative vector geometry compiler that:
1. Orchestrates compilation (settings, fingerprinting, error handling).
2. Calls `computeGeometry0319()` internally.
3. Post-processes the raw output into the `CanonicalGeometrySnapshot` contract.
4. Produces shell structure by classifying loops into outer boundaries and holes.

---

## Current State

`UnifiedVectorGeometryMode.ts` (111 lines) currently contains all this orchestration inline. Per the Perplexity mandate: *"Do not leave compile orchestration inside mode classes."* The orchestration must be extracted into a dedicated compiler file.

---

## File to Create

**`src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`**

### Exports

```typescript
export const UNIFIED_VECTOR_GEOMETRY_MODE_ID = 'unified_vector';
export function compileVectorGeometry(input: GeometryLayerInput): CanonicalGeometrySnapshot;
```

### Internal Structure

```
compileVectorGeometry(input)
  ├── buildGeneratorSettings(input.world, input.tunables)
  ├── buildGeometryVersion(id, stars, settings, ownershipVersion)
  ├── computeGeometry0319(stars, lanes, settings)
  │     └── returns TerritoryGeometryData (raw)
  ├── buildFrontierTopology(data.frontierMap, ...)
  │     └── returns FrontierTopology (mandatory)
  ├── buildOwnerShells(data.mergedTerritories, data.enclaveMap)
  │     └── returns { shells: CanonicalShell[], shellLoops: CanonicalShellLoop[] }
  ├── mapToCanonicalSnapshot(data, topology, shells, version, input)
  │     └── returns CanonicalGeometrySnapshot
  └── error handling (fallback to empty geometry, NOT to legacyGeometryBridge)
```

---

## Key Implementation Details

### Shell Construction (`buildOwnerShells`)

This is the one new algorithm we must write. It absorbs FG2's shell concept into the `0319` pipeline.

**Input:** `mergedTerritories: MergedTerritory[]` + `enclaveMap: Map<number, [number,number][][]>`

**Algorithm:**
1. For each owner, collect all `MergedTerritory` entries.
2. For each territory polygon, compute signed area (shoelace formula).
3. Positive area → outer boundary. Negative area → hole.
4. For each hole, determine which outer boundary contains it (point-in-polygon test on hole[0]).
5. Group into `CanonicalShell` (one outer + its holes).

**Source of truth:** FG2 already does this via face walks and shell construction (`FG2OwnerShellArtifact`). We are replicating the *result* without the FG2 engine, using simpler point-in-polygon classification instead of half-edge traversal.

### Error Handling

When `computeGeometry0319()` fails:
- Return a typed empty `CanonicalGeometrySnapshot` with `diagnostics.topologyReliable = false`.
- Do NOT fall back to `legacyGeometryBridge` or `previousSnapshot.legacyGeometryBridge`.

### What Moves Here

From the current `UnifiedVectorGeometryMode.ts`:
- `buildGeneratorSettings()` call
- `buildGeometryVersion()` call
- `computeGeometry0319()` call
- `buildFrontierPolylineShapes()` / `buildTerritoryRegionShapes()` / `buildSharedFrontierMap()` calls
- `buildFrontierTopology()` call
- World border polyline construction
- Error checking / fallback logic

After extraction, `UnifiedVectorGeometryMode.ts` shrinks to ~5 lines (Step 3).

---

## Dependencies

| Import | Source |
|--------|--------|
| `computeGeometry0319` | `compiler/Geometry_0319.ts` |
| `buildFrontierTopology` | `compiler/buildFrontierTopology.ts` |
| `buildGeneratorSettings`, `createEmptyTerritoryGeometryData`, `isCompileError` | `modes/geometryModeUtils.ts` |
| `buildGeometryVersion` | `planners/GeometryFingerprint.ts` |
| `buildFrontierPolylineShapes`, `buildTerritoryRegionShapes`, `buildSharedFrontierMap` | `planners/FrontierTopologyBuilder.ts` |
| `CanonicalGeometrySnapshot`, `CanonicalShell`, etc. | `contracts/GeometryContracts.ts` (from Step 1) |

---

## Verification

- `bunx vite build` clean.
- `compileVectorGeometry()` returns a `CanonicalGeometrySnapshot` with populated `shells`, `shellLoops`, and `frontierTopology`.
- `legacyGeometryBridge` is NOT populated on the output.
