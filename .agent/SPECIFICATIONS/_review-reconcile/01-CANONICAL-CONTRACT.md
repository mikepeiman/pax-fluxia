# Step 1: Define the Canonical Geometry Contract

## Goal

Replace the thin `GeometrySnapshot` with a rich `CanonicalGeometrySnapshot` that carries all the metadata downstream consumers need — without `legacyGeometryBridge`.

---

## Current State

**File:** `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts` (80 lines)

The existing `GeometrySnapshot` has:
- `territoryRegions` — flat polygon arrays (no shell structure)
- `frontierPolylines` — inter-owner borders
- `worldBorderPolylines` — owner↔world borders
- `sharedFrontierMap` — multimap of frontiers by ownerPairKey (D-90 fix)
- `frontierTopology?` — optional semantic topology (Phase 1 work)
- `legacyGeometryBridge?` — escape hatch to raw `TerritoryGeometryData` ❌

**Problem:** Downstream consumers (transitions, PVV2 renderer) reach through `legacyGeometryBridge` to access raw cells, merged territories, and polylines because the canonical fields lack shell structure, provenance, and diagnostics.

---

## Required Changes

### New Types to Define

*Source: [Perplexity Plan Round 1](../geometry-atlas/Perplexity%202026-03-24%20geometry%20refactor%20plan%20round%201.md) and [Consolidation Analysis](../geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md)*

```typescript
// ── Family & Method discrimination ──

export type GeometryFamily = 'vector-native' | 'raster-derived';
export type GeometrySourceMethod =
    | 'power_voronoi'
    | 'fg2_enriched'
    | 'raster_distance'
    | 'raster_graph'
    | 'raster_lane'
    | 'raster_contour'
    | 'raster_sdf';

// ── Frontier polyline with identity + confidence ──

/** A single frontier polyline with stable identity. */
export interface CanonicalFrontierPolyline {
    frontierId: string;
    ownerA: string;
    ownerB: string;            // '__world__' for world boundary
    ownerPairKey: string;
    points: [number, number][];
    closed?: boolean;
    confidence: number;        // 0–1
}

// ── Shell structure (FG2 concepts absorbed) ──

/** An owner's territory shell: outer boundary + holes. */
export interface CanonicalShell {
    shellId: string;
    ownerId: string;
    points: [number, number][];  // outer boundary (clockwise winding)
    area: number;
    absArea: number;
    confidence: number;
    holeLoopIds: string[];
}

/** A single loop within a shell (outer or hole). */
export interface CanonicalShellLoop {
    shellLoopId: string;
    shellId?: string;
    ownerId: string;
    points: [number, number][];
    classification: 'outer' | 'hole' | 'border' | 'unknown';
    confidence: number;
}

// ── Provenance & Diagnostics ──

/** How this geometry was computed. */
export interface GeometryProvenance {
    derivedFromField: boolean;
    sourceFieldStrategy?: OwnershipFieldStrategy; // from raster path
    sampleGrid?: { cols: number; rows: number; cellWidth: number; cellHeight: number };
    simplifyTolerance?: number;
    smoothPasses?: number;
    notes: string[];
}

/** Reliability signals for downstream consumers. */
export interface GeometryDiagnostics {
    topologyReliable: boolean;
    identityReliable: boolean;
    closureReliable: boolean;
    notes: string[];
}
```

### Updated `CanonicalGeometrySnapshot`

```typescript
export interface CanonicalGeometrySnapshot {
    // ── Identity ──
    version: string;
    sourceMode: GeometryModeId;
    sourceStyle: TerritoryStyleModeId;
    ownershipVersion: string;

    // ── Family & provenance (NEW) ──
    geometryFamily: GeometryFamily;       // 'vector-native' | 'raster-derived'
    sourceMethod: GeometrySourceMethod;   // 'power_voronoi' | 'fg2_enriched' | ...

    // ── Core geometry (existing fields, now mandatory) ──
    territoryRegions: readonly {
        regionId: string;
        ownerId: string;
        points: [number, number][];
        confidence: number;
    }[];
    frontierPolylines: readonly CanonicalFrontierPolyline[];
    worldBorderPolylines: readonly CanonicalFrontierPolyline[];
    sharedFrontierMap: ReadonlyMap<string, CanonicalFrontierPolyline[]>;

    // ── Rich topology (from Phase 1 frontier work, now mandatory) ──
    frontierTopology: FrontierTopology;

    // ── Shell structure (absorbed FG2 concepts, NEW) ──
    shells: readonly CanonicalShell[];
    shellLoops: readonly CanonicalShellLoop[];

    // ── Provenance & diagnostics (NEW) ──
    provenance: GeometryProvenance;
    diagnostics: GeometryDiagnostics;

    // ── NO legacyGeometryBridge ──
}
```

---

## Constraints

1. `frontierTopology` changes from `optional` to **required**. The compiler must always produce it.
2. `legacyGeometryBridge` is **removed** from this interface. Any file that reads it must be refactored in Step 4.
3. `CanonicalShell` is not the same as `MergedTerritory`. A `MergedTerritory` is a flat polygon union. A `CanonicalShell` is an outer boundary with explicitly classified holes — this is what FG2's `FG2OwnerShellArtifact` provides, and we need to replicate that classification in the `0319` pipeline.
4. The `GeometryMode` interface's `compute()` method must return `CanonicalGeometrySnapshot` (not the old `GeometrySnapshot`).

---

## Files Modified

| File | Change |
|------|--------|
| `contracts/GeometryContracts.ts` | Replace `GeometrySnapshot` with `CanonicalGeometrySnapshot`. Add shell and diagnostics types. Remove `legacyGeometryBridge`. |
| `contracts/FrontierTopologyContracts.ts` | No changes — already defines the right types. |
| `layers/geometry/GeometryMode.ts` | Update return type to `CanonicalGeometrySnapshot`. |

---

## Cross-References

| Source | What it provides |
|--------|------------------|
| [Perplexity Plan Round 1](../geometry-atlas/Perplexity%202026-03-24%20geometry%20refactor%20plan%20round%201.md) | Full TypeScript interfaces for `CanonicalGeometrySnapshot`, `CanonicalShell`, `CanonicalShellLoop`, `OwnershipFieldSnapshot` |
| [Consolidation Analysis](../geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md) | 2-method (vector/raster) rationale, deletion list |
| [FrontierTopologyContracts.ts](../../pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts) | Already-implemented `FrontierTopology`, `FrontierVertex`, `FrontierSection`, `RegionLoop` types |
| [Frontier Topology CODE-MAP.md](../frontier-topology-project/CODE-MAP.md) | Exact file/function/line references for compiler pipeline |
| `ptKey` invariant | All vertex identity uses `x.toFixed(2),y.toFixed(2)` — must not be changed |

---

## Verification

- `bunx vite build` must pass (expect downstream type errors — those are addressed in Steps 2–4).
- Every field on `CanonicalGeometrySnapshot` must have a clear producer (documented in Step 2).
