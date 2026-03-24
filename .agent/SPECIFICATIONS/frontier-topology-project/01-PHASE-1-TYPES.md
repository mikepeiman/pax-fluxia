# Phase 1: Frontier Topology Type Definitions

**Sprint:** 1 of 5 | **Risk:** Low | **Estimated effort:** ~100 lines of new types  
**Prerequisite:** Read `CODE-MAP.md` first.

---

## Goal

Define the new `FrontierTopology` type system that the compiler will populate (Phase 2) and the transition planner will consume (Phase 3). This phase is pure type definitions — no runtime changes.

## Where to Create

**New file:** `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts`

This follows the existing pattern where all contract types live in `territory/contracts/`.

## Types to Define

### FrontierVertex

```typescript
/** A structural vertex in the frontier topology.
 *  These are the "anchor points" — 3-way junctions, world-border intersections,
 *  and world corners. NOT arbitrary render samples. */
export interface FrontierVertex {
    /** Stable identifier. Use ptKey(x, y) from the compiler for compatibility. */
    id: string;
    /** What kind of structural vertex this is. */
    kind: 'junction_3way' | 'world_intersection' | 'world_corner' | 'lane_anchor' | 'star_anchor';
    /** World-space position. */
    point: [number, number];
    /** IDs of FrontierSections incident at this vertex. */
    incidentSectionIds: string[];
    /** Owner IDs that meet at this vertex (2 for world intersections, 3 for 3-way junctions). */
    ownerIds: string[];
    /** Optional semantic key for stable cross-frame matching (e.g. "corner:top-right"). */
    semanticKey?: string;
}
```

### FrontierSection

```typescript
/** One shared topological edge between two frontier vertices.
 *  This is the PRIMARY geometry unit. Exists EXACTLY ONCE — two owners
 *  do NOT get separate copies. */
export interface FrontierSection {
    /** Stable identifier derived from ownerPairKey + start/end vertex IDs. */
    id: string;
    /** Section type. */
    kind: 'owner_border' | 'world_border';
    /** Start vertex ID (defines canonical orientation). */
    startVertexId: string;
    /** End vertex ID. */
    endVertexId: string;
    /** Owner on the LEFT of the canonical direction (start → end). */
    leftOwnerId: string;
    /** Owner on the RIGHT, or 'world' for world borders. */
    rightOwnerId: string;
    /** Full smoothed point array from start vertex to end vertex.
     *  First point === FrontierVertex[startVertexId].point.
     *  Last point === FrontierVertex[endVertexId].point. */
    points: [number, number][];
    /** Total arc length of the section. */
    length: number;
    /** Canonical owner-pair key (sorted, e.g. "player_0|player_1"). */
    ownerPairKey: string;

    // ── Influence attribution ──
    /** Dominant star influence on the left side. */
    leftInfluence: SectionInfluence;
    /** Dominant star influence on the right side. */
    rightInfluence: SectionInfluence;
}

/** Star influence data for one side of a section. */
export interface SectionInfluence {
    ownerId: string;
    primaryStarId: string;
    primaryScore: number; // 0-1, how much this star dominates this side
    secondaryStarId?: string;
    secondaryScore?: number;
}
```

### RegionLoop

```typescript
/** A closed territory boundary defined as ordered section references.
 *  Fills are rebuilt from these references — NOT from independent polygon data. */
export interface RegionLoop {
    /** Stable identifier. */
    id: string;
    /** Owner of this region. */
    ownerId: string;
    /** Connected component ID (distinguishes disconnected islands of same owner). */
    componentId: string;
    /** Ordered section references forming the closed loop. */
    sectionRefs: SectionRef[];
    /** Signed area (positive = clockwise outer boundary, negative = hole). */
    signedArea: number;
}

/** Reference to a section within a region loop. */
export interface SectionRef {
    /** ID of the FrontierSection. */
    sectionId: string;
    /** Whether this loop traverses the section in canonical or reversed direction. */
    direction: 'forward' | 'reverse';
}
```

### FrontierTopology (top-level)

```typescript
/** Complete semantic frontier state for one frame.
 *  This is the output of the geometry layer and the input to the transition planner. */
export interface FrontierTopology {
    /** Deterministic version hash. */
    version: string;
    /** Ownership version this topology was computed from. */
    ownershipVersion: string;
    /** World bounds. */
    worldBounds: { width: number; height: number };

    /** All frontier vertices (junctions, world intersections, corners). */
    vertices: ReadonlyMap<string, FrontierVertex>;
    /** All frontier sections (shared edges between vertices). */
    sections: ReadonlyMap<string, FrontierSection>;
    /** All region loops (closed boundaries per owner). */
    loops: readonly RegionLoop[];

    // ── Indexes for fast lookup ──
    /** Sections by owner pair key. */
    sectionsByOwnerPair: ReadonlyMap<string, readonly string[]>;
    /** Sections incident to a given vertex. */
    sectionsByVertex: ReadonlyMap<string, readonly string[]>;
    /** Sections owned by (left or right) a given owner. */
    sectionsByOwner: ReadonlyMap<string, readonly string[]>;
}
```

## Integration Point

After creating these types, add an OPTIONAL field to `GeometrySnapshot` in `GeometryContracts.ts`:

```typescript
// In GeometrySnapshot interface, add:
/** Semantic frontier topology — new canonical format.
 *  Optional during migration; will become required once all consumers are updated. */
frontierTopology?: FrontierTopology;
```

This import should come from `'./FrontierTopologyContracts'`.

## Verification

- `npx vite build` must pass with zero errors
- No runtime behavior changes — types only
- All existing tests must still pass

## What NOT to do

- Do NOT modify any existing types
- Do NOT add runtime code
- Do NOT import PIXI or any rendering library
- Do NOT change the compiler pipeline
- Do NOT change the transition layer
