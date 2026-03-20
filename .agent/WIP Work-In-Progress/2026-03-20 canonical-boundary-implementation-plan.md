# Canonical Boundary Representation — Incremental Plan

## Behavioral Audit (Verified)

### 1. Fill-Boundary Equivalence ✅

**Yes — fills use the exact same smoothed polyline points as borders.**

Evidence (lines 1076–1093 of `powerVoronoiTerritoryGeometryGenerator.ts`):
- Stage 5: `chainSharedEdgesIntoPolylines(edges, chaikinPasses)` → `SharedPolyline[]` with Chaikin-smoothed points
- Stage 7: `extractWorldBorderPolylines(mergedRaw)` → `SharedPolyline[]` (raw, from world-clip edges)
- Stage 8: `constructFillsFromFrontierChain(sharedPolylines, worldBorderPolylines, cells)` → `MergedTerritory[]`

Stage 8 stitches the **exact** `SharedPolyline.points` arrays. No additional smoothing. Fill boundaries are literally the smoothed border points concatenated at junctions.

### 2. Closure Tolerance ✅

**Graceful — emits partial rings on non-closure, no crash.**

- Closure detection: `tailKey === headKey && chain.length >= 4` (line 647)
- On failure to find next candidate at junction: `break` (line 682) — exits walk, emits what it has
- Minimum ring: `chain.length >= 3` (line 685) — even partial chains become fill regions
- No epsilon distance matching — closure is exact ptKey equality
- Safety valve: `N * 2` iteration limit (line 642)

### 3. Junction Semantics ✅

**The existing chain walk already detects all junction types.**

| Junction type | Detection | How |
|---|---|---|
| 3-way territory junctions | ✅ | `extractJunctionVertices`: degree ≥ 3 in ptKey counting |
| Frontier–world-edge junctions | ✅ | Polyline endpoints where `owner-owner` and `owner-world` polylines meet at same ptKey |
| Owner-world transitions | ✅ | `ownerPairKey` parsing: `owner|world` vs `ownerA|ownerB` |
| Loop re-entry | ✅ | `tailKey === headKey` check |

### 4. Provenance Loss Points ✅

| Stage | What exists | What is lost |
|---|---|---|
| `extractSharedEdges` | Per-edge `ownerA`, `ownerB`, `siteIdA`, `siteIdB` | — |
| `chainSharedEdgesIntoPolylines` | Grouped by ownerPairKey, chained | Individual edge identity (consumed into chain) |
| Chaikin smoothing | Smoothed points with pinned junctions | Raw→smoothed point correspondence |
| `constructFillsFromFrontierChain` | Knows which `plIdx` contributed each segment | **Discards**: plIdx, junction vertices, ownership direction, edge boundaries → flat `[number,number][]` |
| `detectEnclaves` | Centroid containment test | — |
| Output `MergedTerritory` | `points`, `ownerId`, `starIds` | All structural metadata gone |

**The identity loss point is Stage 8 output** — the chain walk HAS the information during execution but collapses it.

---

## Implementation

### Phase 1 — Identity-Preserving Annotation

> [!IMPORTANT]
> No changes to existing visual behavior. Emits new metadata alongside existing outputs.

#### [NEW] [canonicalTypes.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/territory/compiler/canonicalTypes.ts)

Types: `CanonicalVertex`, `CanonicalEdge`, `CanonicalLoop`, `TerritoryFrontierMap`.

#### [NEW] [buildFrontierMap.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts)

Companion function — same inputs as `constructFillsFromFrontierChain`, same chain-walk logic, but preserves:
- Decisive vertex markers (junction vertices + polyline endpoints)
- Stable edge IDs (polyline segment between two vertices)
- Owner-left/owner-right semantics
- Owner-world flags
- Loop IDs
- Source provenance (polyline index → canonical edge)

#### [MODIFY] [Geometry_0319.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts) — one call added
#### [MODIFY] [TerritoryGeometryData](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts) — optional `frontierMap` field added

### Phase 2 — Canonical Shell Contract (after Phase 1 verified)

New differ + animator modules consuming the TMAP. Transition starts reading canonical shell data without changing geometry generation.

### Phase 3 — Optional Shell Rewrite (deferred)

Only if Phase 1–2 reveal that `constructFillsFromFrontierChain` needs replacement. May be unnecessary if annotation is sufficient.

---

## Verification

- `npx vite build` clean
- Log `[TMAP] v=${n} e=${n} loops=${n}` — verify counts match existing polyline/fill counts
- Verify all existing renders identical (DY4, fill transitions, borders)
