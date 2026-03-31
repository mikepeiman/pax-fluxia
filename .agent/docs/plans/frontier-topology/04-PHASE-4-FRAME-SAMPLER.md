# Phase 4: CDF-Based Frame Sampler

**Sprint:** 4 of 5 | **Risk:** Medium | **Estimated effort:** ~150 lines  
**Prerequisites:** Phase 1-3 complete. Read `CODE-MAP.md` first.

---

## Goal

Given a `FrontierTransitionPlan` and a progress t ∈ [0,1], produce a complete frame-t `FrontierTopology` — interpolated vertices, interpolated sections, rebuilt loops. Both fill and border rendering derive from this single frame truth.

## Where to Create

**New file:** `pax-fluxia/src/lib/territory/layers/transition/samplers/FrontierTopologySampler.ts`

## Input / Output

```typescript
import type { FrontierTopology, FrontierVertex, FrontierSection, RegionLoop } from '../../../contracts/FrontierTopologyContracts';
import type { FrontierTransitionPlan, SectionMatch, TransportRange, CDFPair } from '../planners/FrontierTopologyPlanner';

export function sampleFrontierTopology(
    plan: FrontierTransitionPlan,
    prev: FrontierTopology,
    next: FrontierTopology,
    t: number,
): FrontierTopology { ... }
```

## Algorithm (7 steps)

### Step 1: Clamp and edge-case

```typescript
if (t <= 0) return prev;
if (t >= 1) return next;
```

### Step 2: Interpolate matched vertices

```typescript
const frameVertices = new Map<string, FrontierVertex>();
for (const vm of plan.vertexMatches) {
    const [px, py] = vm.prevPoint;
    const [nx, ny] = vm.nextPoint;
    frameVertices.set(vm.nextVertexId, {
        id: vm.nextVertexId,
        kind: next.vertices.get(vm.nextVertexId)!.kind,
        point: [(1-t)*px + t*nx, (1-t)*py + t*ny],
        incidentSectionIds: next.vertices.get(vm.nextVertexId)!.incidentSectionIds,
        ownerIds: next.vertices.get(vm.nextVertexId)!.ownerIds,
    });
}
// Unmatched next vertices: use next position directly (they're births)
for (const [id, v] of next.vertices) {
    if (!frameVertices.has(id)) frameVertices.set(id, v);
}
```

### Step 3: Interpolate matched sections (one-to-one)

For each `SectionMatch` with `type === 'one_to_one'`:

```typescript
const prevSection = prev.sections.get(match.prevSectionIds[0])!;
const nextSection = next.sections.get(match.nextSectionIds[0])!;

if (match.transportPlan) {
    // Use CDF-based transport within anchor ranges
    const framePts = sampleTransportPlan(
        prevSection.points, nextSection.points,
        match.transportPlan, t
    );
    // Build frame section with interpolated points
} else {
    // Fallback: uniform arc-length interpolation
    const framePts = otInterpolatePolyline(prevSection.points, nextSection.points, t, N);
}
```

### Step 4: Handle births and deaths

**Birth** (next section emerging):
```typescript
// At t=0: all points at emergence anchor position
// At t=1: full next section geometry
// Intermediate: expand from anchor toward full geometry
const anchor = frameVertices.get(directive.emergenceAnchorIds[0])!.point;
const pts = nextSection.points.map(([x, y]) => [
    anchor[0] + t * (x - anchor[0]),
    anchor[1] + t * (y - anchor[1]),
]);
```

**Death** (prev section collapsing):
```typescript
// At t=0: full prev section geometry
// At t=1: all points at collapse anchor position
const anchor = frameVertices.get(directive.collapseAnchorIds[0])!.point;
const pts = prevSection.points.map(([x, y]) => [
    x + t * (anchor[0] - x),
    y + t * (anchor[1] - y),
]);
```

### Step 5: Sample transport plan within anchor ranges

```typescript
function sampleTransportPlan(
    prevPts: [number, number][],
    nextPts: [number, number][],
    transport: TransportPlan,
    t: number,
): [number, number][] {
    const result: [number, number][] = [];
    
    for (const range of transport.ranges) {
        for (const pair of range.correspondences) {
            const prevPos = evaluateAtArcFraction(prevPts, prevCDF, pair.prevFrac);
            const nextPos = evaluateAtArcFraction(nextPts, nextCDF, pair.nextFrac);
            result.push([
                (1-t) * prevPos[0] + t * nextPos[0],
                (1-t) * prevPos[1] + t * nextPos[1],
            ]);
        }
    }
    
    return result;
}
```

The `evaluateAtArcFraction` and `buildArcLengthCDF` functions already exist in `interpolatePolylines.ts`. They should be extracted to a shared utility or imported directly.

### Step 6: Rebuild frame sections

Assemble interpolated points into `FrontierSection` objects for the frame, preserving section IDs, ownerPairKeys, and left/right owners from the next topology.

### Step 7: Rebuild region loops from frame sections

Use the next topology's `RegionLoop` definitions (sectionRefs), but with frame-t section points. Since sections exist once and loops reference them, the loop-to-fill conversion is:

```typescript
for (const loop of next.loops) {
    const pts: [number, number][] = [];
    for (const ref of loop.sectionRefs) {
        const sec = frameSections.get(ref.sectionId)!;
        const segPts = ref.direction === 'forward' ? sec.points : [...sec.points].reverse();
        // Append (skip first point of subsequent segments to avoid duplicates)
        if (pts.length === 0) pts.push(...segPts);
        else pts.push(...segPts.slice(1));
    }
    frameRegions.push({ ownerId: loop.ownerId, points: pts });
}
```

This guarantees fills and borders come from the exact same interpolated section points.

## Integration Point

The sampler produces a `FrontierTopology` that can be trivially converted to `FillTransitionFrame` and `BorderTransitionFrame`:

```typescript
// Fills: from loops
const fillFrame: FillTransitionFrame = {
    regions: frameTopo.loops.map(loop => ({
        ownerId: loop.ownerId,
        points: flattenLoop(loop, frameTopo.sections),
    })),
};

// Borders: from sections
const borderFrame: BorderTransitionFrame = {
    frontiers: [...frameTopo.sections.values()]
        .filter(s => s.kind === 'owner_border')
        .map(s => ({ ownerPairKey: s.ownerPairKey, points: s.points })),
};
```

This conversion goes in the existing `OptimalTransportBorderMode.sample()` and `FrontierMorphFillMode.sample()`, or in a new unified mode that replaces both.

## Key Property

> Fill and border are ALWAYS rebuilt from the same frame-t frontier truth. There is no separate interpolation path. This structurally prevents fill/border divergence.

## What to Reuse

- `buildArcLengthCDF()` and `evaluateAtArcFraction()` from `interpolatePolylines.ts` — extract to a shared utility file if needed
- `flattenLoopPoints()` from `chainWalkCore.ts` — may need adaptation for the new loop format

## Verification

1. `npx vite build` must pass
2. Add a test conquest and verify:
   - Fills and borders are visually aligned at t=0.25, t=0.5, t=0.75
   - Static sections are bit-identical to their next-state positions
   - No self-crossing of interpolated borders

## What NOT to do

- Do NOT interpolate fills separately from borders
- Do NOT import PIXI
- Do NOT modify the compiler or planner
