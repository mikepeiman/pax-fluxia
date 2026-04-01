# Active Front Interpolation — Transition Redesign

## Problem Statement

Conquest transitions currently use per-polygon OT perimeter morphing. This fundamentally cannot maintain the planar partition invariant (no gaps, no overlaps) because it transforms each region's polygon independently — there is no mechanism to guarantee that adjacent regions' boundaries remain shared at intermediate frames.

**New approach:** operate on the **frontier graph** directly. Only the truly changed frontier span moves; everything else stays frozen. Loops are rebuilt from the graph each frame.

---

## A. Codebase Anchors

### Types (all in `contracts/FrontierTopologyContracts.ts`)

| Type | Role |
|------|------|
| `FrontierVertex` | Junction point; has `.id`, `.point`, `.incidentSectionIds`, `.ownerIds` |
| `FrontierSection` | Shared polyline between two vertices; has `.id`, `.startVertexId`, `.endVertexId`, `.points`, `.leftOwnerId`, `.rightOwnerId`, `.ownerPairKey`, `.length` |
| `SectionRef` | `{ sectionId, direction }` — a loop's reference to a section |
| `RegionLoop` | Closed boundary; ordered `sectionRefs[]`, `.ownerId`, `.signedArea` |
| `FrontierTopology` | Top-level: `vertices`, `sections`, `loops`, indexes (`sectionsByOwnerPair`, `sectionsByVertex`, `sectionsByOwner`) |

### Producers

| File | Function | What it does |
|------|----------|--------------|
| `compiler/chainWalkCore.ts` | `executeChainWalk()` | Walks frontier polylines → `ChainWalkLoop[]` |
| `compiler/buildFrontierMap.ts` | `buildFrontierMap()` | ChainWalk → `TerritoryFrontierMap` (canonical edges/vertices/loops) |
| `compiler/buildFrontierTopology.ts` | `buildFrontierTopology()` | TMAP → `FrontierTopology` |
| `compiler/buildFrontierTopology.ts` | `rebuildLoopPoints()` | `RegionLoop` + sections → flat `[number, number][]` open polygon |

### Current Transition (to be replaced)

| File | Function | What it does |
|------|----------|--------------|
| `layers/transition/TransitionLayerCoordinator.ts` | `.compute()` | Holds prev/next geometry, calls `fillMode.sample()` |
| `layers/transition/modes/FrontierMorphFillMode.ts` | `.sample()` | Loop matching + OT polygon interpolation (BROKEN) |

### Downstream (unchanged)

| File | Function | What it does |
|------|----------|--------------|
| `layers/presentation/builders/FillDrawCommandBuilder.ts` | `.build()` | `FillTransitionFrame.regions` → `FillDrawCommand[]` |
| `adapters/pixi/PixiFillPresenter.ts` | `.render()` | `FillDrawCommand[]` → PIXI.Graphics fill+stroke |

---

## B. Architecture Change

Replace `FrontierMorphFillMode` with `ActiveFrontFillMode`. The new mode does NOT morph polygons. It mutates the **frontier graph** and rebuilds loops.

```
FrontierMorphFillMode (DELETED)
  ↓ replaced by
ActiveFrontFillMode
  plan():  compute ActiveFrontPlan (diff, match, trim, resample)
  sample(): interpolate active fronts at t, rebuild loops, emit regions
```

### New Types

```typescript
/** One matched pair of prev/next frontier spans, trimmed to true anchors. */
interface ActiveFront {
  /** Section(s) contributing to this front in prev topology */
  prevSectionIds: string[];
  /** Section(s) contributing to this front in next topology */
  nextSectionIds: string[];
  /** True stable anchor point A (trimmed inward from one end) */
  anchorA: [number, number];
  /** True stable anchor point B (trimmed inward from other end) */
  anchorB: [number, number];
  /** Prev sub-polyline from A to B, resampled to N points */
  prevSamples: [number, number][];
  /** Next sub-polyline from A to B, resampled to N points */
  nextSamples: [number, number][];
  /** Number of arc-length samples (same for both) */
  sampleCount: number;
}

/** Plan for one conquest transition. Immutable after construction. */
interface ActiveFrontPlan extends FillTransitionPlan {
  /** Frozen (unchanged) frontier topology — shared base graph */
  frozenSections: Map<string, FrontierSection>;
  frozenVertices: Map<string, FrontierVertex>;
  /** Active fronts to interpolate */
  activeFronts: ActiveFront[];
  /** Prev loops for structure reference */
  prevLoops: readonly RegionLoop[];
  /** Next loops for structure reference */
  nextLoops: readonly RegionLoop[];
}
```

---

## C. Algorithms

### C1. Candidate Front Matching

**Input:** `prevTopology`, `nextTopology`
**Output:** matched pairs of prev-sections / next-sections that represent the same moving front

```
1. Build ownerPairKey index for both topologies.
2. For each ownerPairKey present in BOTH prev and next:
   a. Collect prev sections with this key.
   b. Collect next sections with this key.
   c. If exactly 1 prev and 1 next: direct match.
   d. If counts differ: the front has split/merged at a junction.
      Concatenate same-ownerPairKey sections into one composite polyline
      per side, then match the composites.
3. Sections with ownerPairKey only in prev → deleted front (ownership changed).
   Sections with ownerPairKey only in next → inserted front (new boundary).
4. Deleted/inserted fronts have no active-front interpolation.
   Their contribution is handled by the loop rebuild (see C5).
```

### C2. Inward Trimming to True Anchors

**Input:** one matched prev-section composite polyline P, one matched next-section composite polyline Q
**Output:** anchor points A, B; trimmed sub-polylines P[A..B] and Q[A..B]

The section endpoints (junction vertices) may have MOVED because the Voronoi junction shifted. We cannot trust them as stable anchors. Instead:

```
tolerance = 2.0  // world pixels

// Walk inward from the START of both polylines
i_start = 0
while i_start < min(len(P), len(Q)):
    if dist(P[i_start], Q[i_start]) > tolerance:
        break
    i_start++
anchorA = midpoint(P[i_start - 1], Q[i_start - 1])  // last stable point

// Walk inward from the END of both polylines
i_end = 0
while i_end < min(len(P), len(Q)):
    p_idx = len(P) - 1 - i_end
    q_idx = len(Q) - 1 - i_end
    if dist(P[p_idx], Q[q_idx]) > tolerance:
        break
    i_end++
anchorB = midpoint(P[len(P) - i_end], Q[len(Q) - i_end])  // last stable point

// Extract active sub-polylines
prevActive = [anchorA] + P[i_start .. len(P) - i_end] + [anchorB]
nextActive = [anchorA] + Q[i_start .. len(Q) - i_end] + [anchorB]
```

If the ENTIRE polyline is stable (no divergence exceeds tolerance), this front is frozen — no active front needed. Skip it.

If the polylines have very different lengths, the walk still works because we're measuring point-to-point distance at corresponding indices, and the Chaikin smoothing produces roughly uniform spacing.

### C3. Arc-Length Resampling

**Input:** `prevActive`, `nextActive` (trimmed sub-polylines, different lengths)
**Output:** `prevSamples`, `nextSamples` (same length N)

```
N = max(len(prevActive), len(nextActive), 8)

prevSamples = resampleByArcLength(prevActive, N)
nextSamples = resampleByArcLength(nextActive, N)
```

Where `resampleByArcLength(polyline, N)`:
```
1. Compute cumulative arc-length CDF[0..len]
2. Normalize CDF to [0, 1]
3. For each i in 0..N-1:
     u = i / (N - 1)    // NOTE: [0, 1] CLOSED, not [0, 1)
     Find segment in CDF where u falls
     Linearly interpolate position within that segment
4. Return N points, first = polyline[0], last = polyline[last]
```

The endpoints are fixed to A and B exactly — they don't drift.

### C4. Pointwise Interpolation

**Input:** `prevSamples`, `nextSamples` (both length N), progress `t`
**Output:** `interpolatedFront` (length N)

```
for i in 0..N-1:
    interpolated[i] = (1 - t) * prevSamples[i] + t * nextSamples[i]
```

This is trivially correct because both sub-polylines share endpoints A and B.

### C5. Loop Reconstruction

This is the key step that guarantees gap-free, overlap-free fills.

**Per frame at progress t:**

```
1. Start with: frozenSections (unchanged graph edges) + interpolatedFronts

2. Build an interpolated section map:
   - For each frozenSection: use as-is (points unchanged)
   - For each activeFront: create a synthetic section with interpolated points
     Replace the prev section(s) in the graph with the interpolated one

3. Use the NEXT topology's loop structure (nextLoops) as the template.
   For each nextLoop:
     Walk its sectionRefs.
     For each ref, look up:
       - If the section is frozen → use frozen points
       - If the section is part of an active front → use interpolated points
     Concatenate to build the flat polygon point array.
     (Same algorithm as rebuildLoopPoints)

4. For sections that were DELETED (ownerPairKey only in prev):
   These sections don't appear in nextLoops, but their area must be covered.
   The nextLoops template already accounts for this — the deleted section's
   area has been absorbed by the conquering owner's loop.

5. For sections that were INSERTED (ownerPairKey only in next):
   These appear in nextLoops with their next-state geometry.
   At t=0, these have zero visible effect (prev geometry is correct).
   At t=1, they're fully present.
   Interpolation: grow the inserted section from its midpoint.
```

**Why nextLoops as template:**
The next topology has the correct owner assignments after conquest. Using it as the loop template means every owner's boundary is correctly defined. The interpolated sections smoothly move from their prev position to their next position, and the frozen sections provide continuity.

**At t=0:** active fronts = prevSamples → loops exactly reproduce prev geometry.
**At t=1:** active fronts = nextSamples → loops exactly reproduce next geometry.
**At 0<t<1:** active fronts are pointwise blends → loops are valid, closed, gap-free.

---

## D. Per-Frame Invariants

| # | Invariant | Validation |
|---|-----------|------------|
| 1 | Every loop is closed | `points[last]` within ε of `points[0]` (via section chaining, guaranteed by construction) |
| 2 | Every loop has positive area | `abs(shoelaceArea(points)) > MIN_AREA` |
| 3 | No self-intersection | O(n²) check in dev mode only |
| 4 | Active front endpoints are fixed | `interpolated[0] === anchorA`, `interpolated[N-1] === anchorB` (exact, no drift) |
| 5 | Frozen sections are bitwise identical | Section points are reference-shared, not copied |
| 6 | Total region count matches next topology | `output.regions.length === nextLoops.length` |

---

## E. Pseudocode — Full Pipeline

```typescript
class ActiveFrontFillMode implements FillTransitionMode {
  readonly id = 'active_front';
  readonly label = 'Active Front Interpolation';

  plan(input: FillTransitionPlanInput): ActiveFrontPlan {
    const prev = input.previousGeometry!.frontierTopology;
    const next = input.nextGeometry.frontierTopology;

    // Step 1: Classify sections as frozen, matched, deleted, or inserted
    const { frozen, matched, deleted, inserted } = classifySections(prev, next);

    // Step 2: For each matched pair, trim to true anchors and resample
    const activeFronts: ActiveFront[] = [];
    for (const { prevIds, nextIds } of matched) {
      const prevPoly = concatenateSections(prevIds, prev.sections);
      const nextPoly = concatenateSections(nextIds, next.sections);
      const { anchorA, anchorB, prevActive, nextActive } = trimToAnchors(prevPoly, nextPoly, 2.0);
      if (prevActive.length < 2) continue; // fully frozen

      const N = Math.max(prevActive.length, nextActive.length, 8);
      activeFronts.push({
        prevSectionIds: prevIds,
        nextSectionIds: nextIds,
        anchorA, anchorB,
        prevSamples: resampleByArcLength(prevActive, N),
        nextSamples: resampleByArcLength(nextActive, N),
        sampleCount: N,
      });
    }

    return {
      planId: `fill:active_front:${input.nowMs}`,
      sourceMode: this.id,
      frozenSections: frozen,
      frozenVertices: next.vertices,
      activeFronts,
      prevLoops: prev.loops,
      nextLoops: next.loops,
      // ... standard plan fields
    };
  }

  sample(plan: ActiveFrontPlan, ctx: TransitionSampleContext): FillTransitionFrame {
    const t = ctx.progress;

    // Step 3: Interpolate each active front
    const interpolatedSections = new Map<string, [number, number][]>();
    for (const af of plan.activeFronts) {
      const points = interpolateActiveFront(af, t);
      // Map all next-section IDs to the interpolated points
      // (loop reconstruction uses next section IDs as keys)
      for (const nsid of af.nextSectionIds) {
        interpolatedSections.set(nsid, points);
      }
    }

    // Step 4: Rebuild loops from nextLoops template
    const regions: { ownerId: string; points: [number, number][] }[] = [];

    for (const loop of plan.nextLoops) {
      const points: [number, number][] = [];

      for (const ref of loop.sectionRefs) {
        let sectionPoints: [number, number][];

        if (interpolatedSections.has(ref.sectionId)) {
          sectionPoints = interpolatedSections.get(ref.sectionId)!;
        } else {
          const frozen = plan.frozenSections.get(ref.sectionId);
          sectionPoints = frozen ? frozen.points : [];
        }

        // Append, skipping last point of each section (junction dedup)
        for (let i = 0; i < sectionPoints.length - 1; i++) {
          points.push(sectionPoints[i]);
        }
      }

      if (points.length >= 3) {
        regions.push({ ownerId: loop.ownerId, points });
      }
    }

    return { regions };
  }
}

function interpolateActiveFront(af: ActiveFront, t: number): [number, number][] {
  const s = 1 - t;
  const result: [number, number][] = new Array(af.sampleCount);
  for (let i = 0; i < af.sampleCount; i++) {
    result[i] = [
      s * af.prevSamples[i][0] + t * af.nextSamples[i][0],
      s * af.prevSamples[i][1] + t * af.nextSamples[i][1],
    ];
  }
  return result;
}
```

---

## F. Key Design Decisions

1. **WHY nextLoops as template (not prevLoops)?**
   nextLoops have the correct post-conquest ownership. At t=0 the active fronts are at prev position so the visual result matches prev geometry. At t=1 the active fronts are at next position so it matches next geometry. The loop structure is always next — only the section points move.

2. **WHY trim inward instead of trusting junction vertices?**
   Voronoi junctions shift when weights change. A "3-way junction" in prev may be at (300,400) but at (310,395) in next. Trusting it as a fixed anchor creates a discontinuous snap. Trimming finds the actual stable sub-span where the two polylines agree.

3. **WHY this guarantees no gaps/overlaps:**
   Every section exists EXACTLY ONCE in the frontier graph. Two adjacent owners share the same section reference. When we interpolate a section's points, both owners' loops see the same interpolated data. There is no independent polygon morphing — the planar partition constraint is maintained by construction.

4. **WHAT ABOUT deleted/inserted sections?**
   A deleted front (ownerPairKey only in prev) means two territories that were adjacent are no longer. Its area is absorbed by the nextLoop structure. An inserted front (only in next) means a new boundary appeared. For inserted sections, we can linearly fade in the divergence from the shared frozen geometry, or simply use the next geometry directly (the visual pop is at most one section width).
