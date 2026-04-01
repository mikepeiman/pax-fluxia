# External Agent Package — Codebase Materials

## 1. Types: FrontierTopologyContracts.ts

```typescript
// contracts/FrontierTopologyContracts.ts
// (complete file — 153 lines)

export type FrontierVertexKind =
    | 'junction_3way'       // 3+ territory fills meet
    | 'world_intersection'  // frontier meets world boundary
    | 'world_corner'        // world boundary corner
    | 'lane_anchor'         // star lane anchor point
    | 'star_anchor';        // star position anchor

export interface FrontierVertex {
    id: string;                         // ptKey(x,y) e.g. "312.45,789.01"
    kind: FrontierVertexKind;
    point: [number, number];
    incidentSectionIds: string[];       // sections meeting here
    ownerIds: string[];                 // 2 or 3 owner IDs
    semanticKey?: string;               // e.g. "corner:top-right"
}

export interface SectionInfluence {
    ownerId: string;
    primaryStarId: string;
    primaryScore: number;               // 0–1
    secondaryStarId?: string;
    secondaryScore?: number;
}

export type FrontierSectionKind = 'owner_border' | 'world_border';

export interface FrontierSection {
    id: string;                         // stable: ownerPairKey + vertex IDs
    kind: FrontierSectionKind;
    startVertexId: string;
    endVertexId: string;
    leftOwnerId: string;                // interior/left side when start→end
    rightOwnerId: string;               // exterior/right, or 'world'
    points: [number, number][];         // Chaikin-smoothed, start vertex to end vertex INCLUSIVE
    length: number;                     // total arc length
    ownerPairKey: string;               // sorted e.g. "player_0|player_1"
    leftInfluence: SectionInfluence;
    rightInfluence: SectionInfluence;
}

export interface SectionRef {
    sectionId: string;
    direction: 'forward' | 'reverse';  // relative to canonical section orientation
}

export interface RegionLoop {
    id: string;
    ownerId: string;
    componentId: string;               // connected component (all player territory is 1 component)
    sectionRefs: SectionRef[];         // ordered, traces the closed boundary
    signedArea: number;                // positive = clockwise outer (screen coords), negative = hole
}

export interface FrontierTopology {
    version: string;
    ownershipVersion: string;
    worldBounds: { width: number; height: number };
    vertices: ReadonlyMap<string, FrontierVertex>;
    sections: ReadonlyMap<string, FrontierSection>;
    loops: readonly RegionLoop[];
    // Fast-lookup indexes:
    sectionsByOwnerPair: ReadonlyMap<string, readonly string[]>; // ownerPairKey → sectionId[]
    sectionsByVertex: ReadonlyMap<string, readonly string[]>;    // vertexId → sectionId[]
    sectionsByOwner: ReadonlyMap<string, readonly string[]>;     // ownerId → sectionId[]
}
```

---

## 2. Types: TransitionContracts.ts (relevant subset)

```typescript
// contracts/TransitionContracts.ts

export interface FillTransitionFrame {
    regions: readonly { ownerId: string; points: [number, number][] }[];
}

export interface TransitionSampleContext {
    nowMs: number;
    progress: number;   // t ∈ [0, 1]
}

export interface FillTransitionPlan {
    planId: string;
    sourceMode: FillTransitionModeId;
    startGeometryVersion: string;
    endGeometryVersion: string;
    conquestEvents: readonly TerritoryConquestEvent[];
}

export interface FillTransitionPlanInput {
    nowMs: number;
    ownership: OwnershipSnapshot;
    previousGeometry?: GeometrySnapshot | null;
    nextGeometry: GeometrySnapshot;    // GeometrySnapshot.frontierTopology: FrontierTopology
}

export interface FillTransitionMode {
    readonly id: FillTransitionModeId;
    readonly label: string;
    plan(input: FillTransitionPlanInput): FillTransitionPlan;
    sample(plan: FillTransitionPlan, ctx: TransitionSampleContext): FillTransitionFrame;
}
```

**Key contract**: `GeometrySnapshot.frontierTopology` is of type `FrontierTopology`. Both `previousGeometry` and `nextGeometry` carry a `frontierTopology`. These are the primary inputs to the transition.

---

## 3. Current Broken Implementation: FrontierMorphFillMode.ts

```typescript
// layers/transition/modes/FrontierMorphFillMode.ts
// Current OT polygon interpolation approach — PRODUCING CORRUPT INTERMEDIATE FRAMES

const MIN_REGION_AREA = 10; // world-px² below which regions are dropped

interface FrontierMorphFillPlan extends FillTransitionPlan {
    previousTopology?: FrontierTopology;
    targetTopology?: FrontierTopology;
}

// plan(): stores both topology snapshots in plan object
plan(input): FrontierMorphFillPlan {
    return {
        ...baseFields,
        previousTopology: input.previousGeometry?.frontierTopology,
        targetTopology: input.nextGeometry.frontierTopology,
    };
}

// sample(plan, ctx): per-frame interpolation — THIS IS BROKEN
sample(plan, ctx): FillTransitionFrame {
    const t = ctx.progress;
    // Phase 1: pre-compute prev loop centroids for fallback matching
    const prevByOwner = Map<ownerId, { loop, points, centroid }[]>;
    // rebuild points via rebuildLoopPoints() (canonical stitcher)
    
    // Phase 2: for each nextLoop, try to find a prevLoop match:
    //   Strategy A: find prevLoop sharing at least one section ID
    //   Strategy B (fallback): find nearest centroid for same owner
    
    // Phase 3: interpolation per matched pair:
    //   If section-ID match: rebuildAndAlign() → otInterpolateAlignedPolygon()
    //   If centroid match only: otInterpolateAlignedPolygon() without alignment
    
    // Phase 4: vanishing unmatched prev loops → shrink to centroid
    // Phase 5: drop regions below MIN_REGION_AREA
}

// rebuildLoopPoints(loop, sections): canonical polygon from section refs
// Skips last point of each section (junction dedup + prevents closing duplicate)
// section.points are always in canonical walk-traversal order (pre-reversed by chain walk)
// Returns open array — NO closing duplicate

// rebuildAndAlign(loop, sections, alignSectionId):
// Calls rebuildLoopPoints, then rotates array so alignSectionId's start is at index 0
// Offset: every section contributes (section.points.length - 1) points

// otInterpolateAlignedPolygon(prev, next, t):
// CDF-based perimeter sampling — maps uniform fractions onto each polygon's perimeter
// sampleCount = max(len(prev), len(next), 4)
// Does NOT add closing vertex — CDF uses i%n modular indexing

// KNOWN FAILURE MODES of this approach:
// 1. Section-ID matching fails often — conquests change many section IDs simultaneously
// 2. Centroid fallback matches wrong loops when multiple loops are nearby
// 3. OT perimeter sampling does NOT maintain adjacent-owner boundary alignment
//    → two players' independently morphed polygons diverge at their shared frontier
//    → gaps and overlaps at every frame
// 4. Degenerate loops with 2-3 points from near-collapsed junctions corrupt earcut
```

---

## 4. Getting the Real prev/next Geometry JSON

The snapshot recorder is browser-resident. The current export only includes PNG screenshots + meta.json (timing/counts), **not** the full topology data.

**To capture a real topology JSON**, add this export to `TransitionBundleSerializer.ts`:

```typescript
// Add to downloadBundle() after the meta.json download:

// topology.json — full prev/next FrontierTopology
const topologyExport = {
    prevTopology: serializeFrontierTopology(bundle.context.previousGeometry?.frontierTopology),
    nextTopology: serializeFrontierTopology(bundle.context.nextGeometry.frontierTopology),
    conquestEvents: bundle.conquestEvents,
};
const topologyBlob = new Blob(
    [JSON.stringify(topologyExport, replacer, 2)],
    { type: 'application/json' },
);
triggerDownload(topologyBlob, `${prefix}_topology.json`);
```

Where `replacer` handles `Map` serialization:
```typescript
function replacer(_key: string, value: unknown) {
    if (value instanceof Map) {
        return { __type: 'Map', entries: [...value.entries()] };
    }
    return value;
}

function serializeFrontierTopology(topo: FrontierTopology | undefined | null) {
    if (!topo) return null;
    return {
        version: topo.version,
        vertexCount: topo.vertices.size,
        sectionCount: topo.sections.size,
        loopCount: topo.loops.length,
        vertices: [...topo.vertices.values()],
        sections: [...topo.sections.values()],
        loops: topo.loops,
    };
}
```

**To capture**: trigger a conquest in-game with the Snapshot Recorder enabled (via the territory dev panel). Then click "Download Bundle" — this will now include `_topology.json`.

---

## 5. Real Example — What the Logs Show

From the user's test session (conquest `star-star-23`, `ai-2 → ai-1`):

```
[SnapshotRecorder] DIFF (production):
  unchanged=28 changed=14 inserted=3 deleted=3
  regions: unchanged=7 changed=9 inserted=0 deleted=0
```

So for a typical 8-player map conquest:
- **28 unchanged frontiers** — most of the map boundary stays fixed
- **14 changed frontiers** — sections where the power Voronoi shifted
- **3 inserted** (new owner-owner boundaries), **3 deleted** (old boundaries gone)
- **9 changed regions** (territory shapes shifted), 0 spawned/despawned

The active-front approach would: freeze the 28, interpolate only the 14 changed, produce gap-free fills from reconstructed loops — the 9 affected regions rebuild correctly from mixed frozen+interpolated sections.

**ownerPairKey format**: sorted, pipe-delimited — e.g. `"ai-1|ai-2"`, `"ai-3|neutral"`, `"human-player|ai-2"`, `"ai-1|world"` (world borders).
