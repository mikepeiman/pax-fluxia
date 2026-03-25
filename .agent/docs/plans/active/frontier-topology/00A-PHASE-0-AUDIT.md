# Phase 0: Audit Existing Geometry Generator

**Sprint:** Pre-implementation audit | **Risk:** None (read-only) | **Estimated effort:** 1-2 hours  
**Do this BEFORE starting Phase 1.**

---

## Goal

Audit the existing geometry compiler pipeline to determine how much of `FrontierTopology` data it **already computes** in intermediate form. The compiler may provide 95-99% of what we need — we should not reinvent anything.

## What to Check

### In `powerVoronoiTerritoryGeometryGenerator.ts` (1014 lines)

| Feature We Need | Likely Already Exists? | Where to Look |
|---|---|---|
| Junction vertex identification | ✅ YES | `extractJunctionVertices()` L282-299 — returns `Set<string>` of ptKeys |
| Junction vertex positions | ✅ YES | ptKeys encode x,y coordinates |
| Shared edges with star identity | ✅ YES | `SharedBorderEdge` has `siteIdA`, `siteIdB` (L64-73) |
| Edge → polyline chaining | ✅ YES | `chainSharedEdgesIntoPolylines()` L683-753 |
| World border extraction | ✅ YES | `extractWorldBorderPolylines()` L308-384 |
| Loop discovery (fill rings) | ✅ YES | `executeChainWalk()` in chainWalkCore.ts |
| Orientation (start→end direction) | ❓ MAYBE | chainWalkCore tracks direction per segment |
| Star influence attribution | ❓ PARTIAL | `SharedBorderEdge.siteIdA/siteIdB` gives per-edge star, not per-section |
| Section identity (stable IDs) | ❌ NO | polylines have ownerPairKey but no unique stable ID |
| Vertex identity (semantic keys) | ❌ NO | just ptKey strings, no semantic annotations |

### In `chainWalkCore.ts` (266 lines)

| Feature We Need | Likely Already Exists? | Where to Look |
|---|---|---|
| Junction map (vertex → polylines) | ✅ YES | `junctionMap: Map<string, JunctionEntry[]>` L120-129 |
| Loop segments with direction | ✅ YES | `ChainWalkSegment.direction` = 'forward' \| 'reverse' |
| Closed loop detection | ✅ YES | `ChainWalkLoop.closed` |
| Section refs (polyline index + direction) | ✅ YES | `ChainWalkSegment.polylineIdx` + `direction` |

### In `Geometry_0319.ts` (372 lines)

| Feature We Need | Exists? | Where |
|---|---|---|
| World boundary edge extraction | ✅ YES | `extractAllWorldBoundaryEdges()` L54-98 |
| Inter-owner edge keys | ✅ YES | uses `Set<string>` of edge keys |

### In `buildFrontierMap.ts`

| Feature We Need | Exists? | Where |
|---|---|---|
| Canonical frontier map | ✅ YES | `TerritoryFrontierMap` type |
| Frontier map building | ✅ YES | `buildFrontierMap()` function |

### In `canonicalTypes.ts`

| Feature We Need | Exists? | Where |
|---|---|---|
| Frontier data types | ❓ CHECK | May have partial frontier topology types already |

## Audit Actions

1. **Read `canonicalTypes.ts`** — may already define frontier topology types
2. **Read `buildFrontierMap.ts`** — may already build section-like structures
3. **Read `frontierStage.ts`** — may have frontier extraction logic
4. **Read `metricStage.ts`** — may compute star influence data
5. **Trace what data flows through `generateVoronoiTerritoryGeometry`** — catalog every intermediate variable that is currently discarded
6. **Check if `TerritoryGeometryData.frontierMap?`** is already populated and what it contains

## Expected Outcome

A concrete assessment: "Phase 1 types are 80% already defined in `canonicalTypes.ts`. Phase 2 `buildFrontierTopology` can reuse the existing `buildFrontierMap` with these additions: [list]. We need to newly compute: [list]."

## Priority: Audit the Legacy Geometry Modes

The two **legacy geometry modes** are the most important audit targets. They represent substantial prior work and may already provide 95-99% of the frontier topology data in different form:

- **`PowerVoronoiGeometryMode.ts`** — wraps the legacy PowerVoronoi renderer path
- **`SeedGraphGeometryMode.ts`** — wraps the seed graph approach

Also check their upstream renderers/adapters:
- `adapters/legacy/PowerVoronoiLegacyAdapter.ts`
- `adapters/legacy/SeedGraphAdapter.ts`
- The PowerVoronoiRenderer itself (`renderers/PowerVoronoiRenderer.ts`) — may compute frontier structures internally

**The question is:** do these modes already produce junction vertices, oriented polylines, section identity, or influence attribution in some form? If so, `buildFrontierTopology` may be just a translation layer.

## Key Question

> How much of Phase 2 is "wrap existing data in new types" vs "compute new data that doesn't exist yet"?

If most of it is wrapping, Phase 2 shrinks dramatically. If star influence attribution is the only genuinely new computation, that simplifies the project significantly.
