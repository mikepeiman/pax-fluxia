# Phase 3: Section-Aware Transition Planner

**Sprint:** 3 of 5 | **Risk:** High (core algorithmic work) | **Estimated effort:** ~300 lines  
**Prerequisites:** Phase 1 (types) + Phase 2 (compiler emits topology). Read `CODE-MAP.md` first.

---

## Goal

Build a transition planner that diffs two `FrontierTopology` snapshots (prev and next) and produces a `FrontierTransitionPlan` — vertex matches, section matches, anchor plans, and OT transport maps.

## Where to Create

**New file:** `pax-fluxia/src/lib/territory/layers/transition/planners/FrontierTopologyPlanner.ts`

This sits in the existing `planners/` directory alongside `TerritoryTransitionPlanner.ts`.

## Input / Output

```typescript
import type { FrontierTopology, FrontierVertex, FrontierSection } from '../../../contracts/FrontierTopologyContracts';
import type { TerritoryConquestEvent } from '../../../contracts/OwnershipContracts';

export interface FrontierTransitionPlan {
    prevVersion: string;
    nextVersion: string;
    prevOwnershipVersion: string;
    nextOwnershipVersion: string;
    startedAtMs: number;
    durationMs: number;
    
    vertexMatches: VertexMatch[];
    sectionMatches: SectionMatch[];
    loopMatches: LoopMatch[];
    
    births: BirthDirective[];
    deaths: DeathDirective[];
}

export function buildFrontierTransitionPlan(
    prev: FrontierTopology,
    next: FrontierTopology,
    conquestEvents: readonly TerritoryConquestEvent[],
    startedAtMs: number,
    durationMs: number,
): FrontierTransitionPlan { ... }
```

## Sub-Types

### VertexMatch
```typescript
export interface VertexMatch {
    prevVertexId: string;
    nextVertexId: string;
    confidence: number;      // 0-1
    reason: 'semantic_key' | 'world_corner' | 'world_intersection' | 'spatial_proximity';
    prevPoint: [number, number];
    nextPoint: [number, number];
}
```

### SectionMatch
```typescript
export interface SectionMatch {
    type: 'one_to_one' | 'split' | 'merge';
    prevSectionIds: string[];
    nextSectionIds: string[];
    confidence: number;
    reasons: string[];
    anchorPlan: AnchorPlan;
    transportPlan?: TransportPlan;
}
```

### AnchorPlan
```typescript
/** Paired anchor points that partition a section match into ranges. */
export interface AnchorPlan {
    anchors: AnchorPair[];
}

export interface AnchorPair {
    prevArcFraction: number;   // 0-1 position along prev section
    nextArcFraction: number;   // 0-1 position along next section
    reason: 'start_vertex' | 'end_vertex' | 'interior_junction' | 'star_anchor';
}
```

### TransportPlan
```typescript
/** Monotone OT mapping between sample distributions on matched section ranges. */
export interface TransportPlan {
    ranges: TransportRange[];
}

export interface TransportRange {
    prevStartFrac: number;
    prevEndFrac: number;
    nextStartFrac: number;
    nextEndFrac: number;
    /** CDF correspondence pairs within this range. */
    correspondences: CDFPair[];
}

export interface CDFPair {
    prevFrac: number;   // Arc fraction on prev section
    nextFrac: number;   // Arc fraction on next section (monotone)
}
```

### Birth/Death Directives
```typescript
export interface BirthDirective {
    nextSectionId: string;
    emergenceAnchorIds: string[];  // Vertex IDs to emerge from
}

export interface DeathDirective {
    prevSectionId: string;
    collapseAnchorIds: string[];   // Vertex IDs to collapse to
}

export interface LoopMatch {
    prevLoopId: string;
    nextLoopId: string;
    ownerId: string;
}
```

## Algorithm (10 steps from the Perplexity plan)

### Step 1: Normalize topologies
- Verify every section has valid start/end vertex refs
- Verify every section has an ownerPairKey
- Build arc-length sample sets for each section (16-32 samples per section)

### Step 2: Match vertices
Priority order:
1. **Semantic key** — `semanticKey` matches exactly (e.g., `"corner:top-right"`)
2. **World corner identity** — same corner position within epsilon
3. **World intersection** — same boundary side + nearby position
4. **Spatial proximity** — nearest unmatched vertex within threshold (e.g., 50px)

Emit `VertexMatch[]`. Resolve conflicts greedily (best confidence wins).

### Step 3: Group sections by owner pair
For each prev section, find next sections with same `ownerPairKey`. This keeps the search space small.

### Step 4: Score section candidates
For each prev/next pair with matching ownerPairKey, score by:
- Compatible endpoint vertex matches (high weight)
- Overlapping dominant influence stars (high weight)
- Section midpoint proximity (medium weight)
- Length similarity ratio (low weight)

### Step 5: Resolve correspondences
1. Assign highest-confidence one-to-one matches first
2. Leftover prev sections with multiple next candidates → split
3. Leftover next sections with multiple prev candidates → merge
4. Unmatched prev → death
5. Unmatched next → birth

### Step 6: Build anchor plans
For each one-to-one match:
- Start anchor: matched start vertex (if vertex match exists) → arcFrac 0
- End anchor: matched end vertex (if vertex match exists) → arcFrac 1
- Optional interior anchors: lane anchors, star anchors, curvature extrema

### Step 7: Generate transport plans
For each anchor-to-anchor range:
- Build CDF from arc-length samples on prev range
- Build CDF from arc-length samples on next range
- Match by equal CDF position → monotone correspondence pairs
- Store as `CDFPair[]`

### Step 8: Create birth/death directives
- Birth: next section with no prev match → emerge from nearest matched vertex or world boundary point
- Death: prev section with no next match → collapse to nearest matched vertex

### Step 9: Build loop matches
Match prev and next RegionLoops by ownerId + overlapping sectionRefs.

### Step 10: Emit FrontierTransitionPlan

## Integration Point

In `TransitionLayerCoordinator.ts` (L54-154):

When `hasNewConquests && hasGeometryDelta`, check if both prev and next geometry have `frontierTopology`. If so, build the `FrontierTransitionPlan` and store it. The existing fill/border mode interfaces don't change yet — they still get called, but Phase 4 will make them consume the plan.

## Verification

1. `npx vite build` must pass
2. Add diagnostic logging: when a plan is built, log vertex match count, section match count, birth/death counts
3. Verify on a real conquest: most sections should be matched one-to-one, with 1-3 births/deaths

## What NOT to do

- Do NOT import PIXI
- Do NOT modify the compiler
- Do NOT change existing transition mode interfaces yet
- Do NOT try to sample the plan — that's Phase 4
