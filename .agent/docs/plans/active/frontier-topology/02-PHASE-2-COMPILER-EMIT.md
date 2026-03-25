# Phase 2: Compiler Emits Frontier Topology

**Sprint:** 2 of 5 | **Risk:** Medium | **Estimated effort:** ~200 lines of new code  
**Prerequisites:** Phase 1 complete (types exist). Read `CODE-MAP.md` first.

---

## Goal

Make the geometry compiler populate `FrontierTopology` alongside its existing output. The existing `TerritoryGeometryData` output continues to work unchanged — this is purely additive.

## Strategy

The compiler already computes everything we need — it just discards the structural information:

| What we need | Where it already exists | Current form |
|---|---|---|
| 3-way junction vertices | `extractJunctionVertices()` L277-299 | `Set<string>` of ptKeys |
| Shared border edges with star IDs | `extractSharedEdges()` L386-429 | `SharedBorderEdge[]` with siteIdA, siteIdB |
| Chained polylines | `chainSharedEdgesIntoPolylines()` L683-753 | `SharedPolyline[]` |
| World border polylines | `extractWorldBorderPolylines()` L301-384 | `SharedPolyline[]` |
| Fill loops | `executeChainWalk()` in chainWalkCore.ts L92-236 | `ChainWalkLoop[]` |
| Power sites with star identity | PowerSite type L39-46 | x, y, weight, ownerId, starId |

## Where to Create

**New file:** `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`

This is a pure function that takes existing compiler output and enriches it into `FrontierTopology`.

## The Function

```typescript
import type { FrontierTopology, FrontierVertex, FrontierSection, RegionLoop, SectionRef } from '../../contracts/FrontierTopologyContracts';
import type { TerritoryGeometryData, SharedPolyline, SharedBorderEdge, TerritoryCell, PowerSite } from './powerVoronoiTerritoryGeometryGenerator';
import type { ChainWalkResult, ChainWalkLoop } from './chainWalkCore';
import { ptKey } from './powerVoronoiTerritoryGeometryGenerator';

export function buildFrontierTopology(
    geometryData: TerritoryGeometryData,
    chainWalkResult: ChainWalkResult,
    junctionPtKeys: Set<string>,
    powerSites: PowerSite[],
    worldBounds: { width: number; height: number },
    ownershipVersion: string,
): FrontierTopology { ... }
```

## Algorithm (step by step)

### Step 1: Build FrontierVertex map

Source: `junctionPtKeys` (from `extractJunctionVertices`) + world border polyline endpoints.

```
For each ptKey in junctionPtKeys:
    Parse x,y from the ptKey string (split on comma)
    vertex.id = ptKey
    vertex.kind = 'junction_3way'
    vertex.point = [x, y]
    vertex.incidentSectionIds = [] // populated in Step 2
    vertex.ownerIds = [] // populated in Step 2

For each world border polyline:
    start = ptKey(polyline.points[0])
    end = ptKey(polyline.points[last])
    If start not in vertex map:
        vertex.id = start
        vertex.kind = 'world_intersection' or 'world_corner'
        (corner if point is at 0,0 or worldW,0 or 0,worldH or worldW,worldH)
```

### Step 2: Build FrontierSection map

Source: `geometryData.sharedPolylines` + `geometryData.worldBorderPolylines`

```
For each SharedPolyline in sharedPolylines:
    startVertexId = ptKey(points[0])
    endVertexId = ptKey(points[last])
    section.id = `${ownerPairKey}:${startVertexId}→${endVertexId}`
    section.kind = 'owner_border'
    section.leftOwnerId = parse from ownerPairKey
    section.rightOwnerId = parse from ownerPairKey
    section.points = polyline.points
    section.length = sum of segment lengths
    section.ownerPairKey = polyline.ownerPairKey

    // Influence attribution
    section.leftInfluence = computeInfluence(points, powerSites, leftOwnerId)
    section.rightInfluence = computeInfluence(points, powerSites, rightOwnerId)

    // Update vertex incidentSectionIds
    vertexMap[startVertexId].incidentSectionIds.push(section.id)
    vertexMap[endVertexId].incidentSectionIds.push(section.id)

Same for worldBorderPolylines with kind = 'world_border'
```

### Step 3: Compute influence attribution

For each side of a section, find the nearest power site owned by that side's owner:

```
function computeInfluence(
    sectionPoints: [number, number][],
    powerSites: PowerSite[],
    ownerId: string,
): SectionInfluence {
    // Find all power sites owned by this owner
    const ownerSites = powerSites.filter(s => s.ownerId === ownerId && !s.virtual);
    
    // Compute midpoint of section
    const mid = sectionMidpoint(sectionPoints);
    
    // Sort owner sites by distance to midpoint
    const sorted = ownerSites.sort((a, b) => dist(a, mid) - dist(b, mid));
    
    // Primary = closest, secondary = second closest
    return {
        ownerId,
        primaryStarId: sorted[0]?.starId ?? '',
        primaryScore: 1.0 / (sorted.length || 1),
        secondaryStarId: sorted[1]?.starId,
        secondaryScore: sorted[1] ? 0.5 : undefined,
    };
}
```

### Step 4: Build RegionLoop array

Source: `chainWalkResult.loops` (from `executeChainWalk`)

```
For each ChainWalkLoop:
    loop.id = `loop:${loop.ownerId}:${index}`
    loop.ownerId = loop.ownerId
    loop.componentId = derive from connected component
    loop.sectionRefs = loop.segments.map(seg => ({
        sectionId: find matching section by ownerPairKey + start/end vertex,
        direction: seg.direction,
    }))
    loop.signedArea = compute signed area from flattened points
```

### Step 5: Build indexes

```
sectionsByOwnerPair: group section IDs by ownerPairKey
sectionsByVertex: group section IDs by start/end vertex IDs
sectionsByOwner: group section IDs by leftOwnerId and rightOwnerId
```

## Integration Point

In `Geometry_0319.ts`, function `computeGeometry0319()` (L104-371):

After line ~360 where `TerritoryGeometryData` is assembled, call `buildFrontierTopology()` and store the result:

```typescript
// After existing geometry assembly:
const frontierTopology = buildFrontierTopology(
    geometry,
    chainWalkResult,    // from constructFillsFromFrontierChain
    junctionPtKeys,     // from extractJunctionVertices 
    powerSites,         // from stage 1
    { width: config.worldWidth, height: config.worldHeight },
    ownershipVersion,   // passed through
);
```

Then in `BoundaryAwareFrontierGeometryMode.ts` (L15-58), add `frontierTopology` to the returned `GeometrySnapshot`:

```typescript
return {
    version,
    sourceMode: this.id,
    // ... existing fields ...
    frontierTopology,   // NEW — from buildFrontierTopology()
};
```

## Critical Details

- The `chainWalkResult` is currently consumed inside `constructFillsFromFrontierChain` and NOT returned. You must modify `constructFillsFromFrontierChain` (L553-677) or `computeGeometry0319` to capture the `ChainWalkResult` from `executeChainWalk` and make it available to `buildFrontierTopology`.
- `powerSites` are constructed early in `generateVoronoiTerritoryGeometry` (around L830-860) and currently not returned in `TerritoryGeometryData`. Either add them to the output or pass through.
- `junctionPtKeys` are computed via `extractJunctionVertices` (L277-299) — already available in the pipeline.

## Verification

1. `npx vite build` must pass
2. Run the game — existing rendering must be unchanged
3. Add a console.log in `BoundaryAwareFrontierGeometryMode.compute()` that prints:
   - `topology.vertices.size` (expect: 10-50 for a typical game)
   - `topology.sections.size` (expect: 15-80)
   - `topology.loops.length` (expect: number of territory owners)
4. Verify sections.size ≈ sharedPolylines.length + worldBorderPolylines.length

## What NOT to do

- Do NOT modify existing `TerritoryGeometryData` fields
- Do NOT change chainWalkCore.ts algorithm
- Do NOT import PIXI
- Do NOT change the transition layer yet
