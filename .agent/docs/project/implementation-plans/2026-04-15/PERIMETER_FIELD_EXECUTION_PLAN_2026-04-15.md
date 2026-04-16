# Perimeter Field Execution Plan

Date: 2026-04-15
Status: Decision-complete execution plan
Scope: `perimeter_field` mode only
Prerequisite reading: `PERIMETER_FIELD_MODE_SPEC.md`, `PERIMETER_FIELD_GAP_REPORT_2026-04-15.md`

---

## What This Document Is

A deterministic implementation plan. Every step names exact types, functions, files, and algorithms. No step says "figure out how to"; every step says "do this specific thing."

An implementing agent reads this document and codes. It does not need to make design decisions.

---

## Existing Infrastructure Summary

### What already works and must be preserved
- Source geometry pipeline: `buildPerimeterFieldRenderFamilyGeometry()` in `buildFamilyGeometry.ts:256-298`
- Power-Voronoi generator with CX/DX/lane-pair virtual sites
- Shell loop extraction with `CanonicalShellLoop` (ownerId, starIds, points)
- Frontier topology: `FrontierTopology` with `FrontierSection` (ownerPairKey, leftOwnerId, rightOwnerId, polyline, arclength), `RegionLoop` (sectionRefs with direction), `sectionsByOwnerPair`, `sectionsByOwner`, `sectionsByVertex`
- Metaball renderer consuming `MetaballInfluenceSample` (x, y, playerIdx, strength)
- Family registration, tunable keys, mode catalog
- Inward-offset sampling via `offsetSampleInsideLoop()` in `buildPerimeterFieldScene.ts:153-189`

### What is replaced
- `buildTransitionSamples()` in `buildPerimeterFieldScene.ts:393-520` (synthetic conquest-only samples)
- `findClosestSampleByAngle()` in `buildPerimeterFieldScene.ts:362-391` (star-center angle correspondence)
- `sampleClosedLoop()` usage without section annotation (replaced by section-aware sampling)
- PREV capture via per-frame `revertStarsForTransition()` + rebuild (replaced by once-at-start cache)

---

## Types To Add

All new types live in a new file:
**`pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldTransitionTypes.ts`**

```typescript
/** A perimeter control point sampled from source geometry. */
export interface PerimeterV {
    id: string;               // deterministic: `v:${loopId}:${sectionId}:${indexInSection}`
    x: number;
    y: number;
    ownerId: string;
    playerIdx: number;
    strength: number;
    loopId: string;           // which RegionLoop this V belongs to
    sectionId: string;        // which FrontierSection this V sits on
    sectionKind: 'owner_border' | 'world_border';
    arclengthInSection: number;  // [0, section.length]
    arclengthInLoop: number;     // [0, loopPerimeter]
    normalX: number;          // inward normal at this point
    normalY: number;
}

/** Identifies a contiguous span of unmatched V's between two preserved V anchors. */
export interface UnmatchedSpan {
    spanId: string;                   // `span:${loopId}:${anchorBeforeId}:${anchorAfterId}`
    loopId: string;
    anchorBeforeId: string | null;    // preserved V before this span (null = whole-loop span)
    anchorAfterId: string | null;     // preserved V after this span (null = whole-loop span)
}

/** A paired PREV/NEXT unmatched span ready for remeshing. */
export interface SpanPair {
    pairId: string;                   // `sp:${index}`
    prevSpan: UnmatchedSpan;
    nextSpan: UnmatchedSpan;
    prevVs: PerimeterV[];             // arclength-ordered V's in PREV span
    nextVs: PerimeterV[];             // arclength-ordered V's in NEXT span
}

/** A remeshed, paired set of movers within one SpanPair. */
export interface TransitionMover {
    moverId: string;                  // `P${paddedIndex}` e.g. P00, P07
    prevPos: { x: number; y: number };
    nextPos: { x: number; y: number };
    ownerId: string;                  // owner of the V being moved (loser or victor side)
    ownerRole: 'loser' | 'victor' | 'neighbor';
    pathType: 'straight' | 'arc';
    pathControlPoint?: { x: number; y: number };  // for arc: quadratic bezier control
}

/** V's that appear only in NEXT (no PREV counterpart). Fade in. */
export interface AppearingV {
    v: PerimeterV;
    reason: 'new_section' | 'region_created' | 'dx_midpoint_added';
}

/** V's that exist only in PREV (no NEXT counterpart). Fade out. */
export interface DisappearingV {
    v: PerimeterV;
    reason: 'section_removed' | 'region_eliminated' | 'dx_midpoint_removed';
}

/** Complete transition plan, computed once at transition start, replayed every frame. */
export interface TransitionPlan {
    conquestKey: string;              // from buildTransitionKey()
    prevVSet: PerimeterV[];           // all PREV V's, arclength-ordered per loop
    nextVSet: PerimeterV[];           // all NEXT V's, arclength-ordered per loop
    preservedVIds: Set<string>;       // V ID's that exist in both PREV and NEXT within MOE
    movers: TransitionMover[];        // paired movers within unmatched spans
    appearing: AppearingV[];          // NEXT-only V's (fade in)
    disappearing: DisappearingV[];    // PREV-only V's (fade out)
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
}
```

### Types To Modify

**`PerimeterFieldDebugSample`** in `buildPerimeterFieldScene.ts:14-27` — add:
```typescript
    vId?: string;             // PerimeterV.id for traceability
    moverId?: string;         // TransitionMover.moverId (e.g. "P07")
    transitionRole?: 'preserved' | 'mover' | 'appearing' | 'disappearing' | 'static';
```

**`PerimeterFieldDebugSnapshot`** in `buildPerimeterFieldScene.ts:29-37` — add:
```typescript
    transitionPlan?: TransitionPlan;
```

---

## Types To Modify In Geometry Layer

**`adaptPowerVoronoiGeometryToSnapshot()`** in `buildFamilyGeometry.ts:94-198`:

Change line ~105 from:
```typescript
regionId: `pfield-region:${territory.ownerId}:${index}`
```
To:
```typescript
regionId: `region:${territory.ownerId}:${territory.starIds.sort().join('+')}`
```

This makes region IDs deterministic from star membership, not index order. Two snapshots with the same star membership produce the same region ID.

Add to the adapted output: split `starIds` into:
```typescript
anchorStarIds: territory.starIds.filter(id => !isVirtualSiteId(id)),
contributingSiteIds: territory.starIds.filter(id => isVirtualSiteId(id)),
```

Where `isVirtualSiteId(id)` checks for the prefixes used by CX/DX virtual sites (`'cx-'`, `'dx-'`, `'__disconnect__'`).

This requires adding `anchorStarIds` and `contributingSiteIds` to `TerritoryRegionShape` in `GeometryContracts.ts:94-105` as optional fields (backward compatible).

---

## Phase 1: Atomic PREV/NEXT Capture

### Goal
Compute PREV and NEXT geometry+V-sets exactly once at transition start. Cache for the transition duration. No re-derivation per frame.

### Location
**`PerimeterFieldFamily.ts`**, modifying the `update()` method.

### Current behavior (lines 169-189)
On first frame of transition, calls `revertStarsForTransition(input)` to patch star ownership back to `previousOwner`, then rebuilds geometry from those patched stars. Caches as `this.oldGeometry`. This happens once (guarded by `oldGeometryKey !== transitionKey`).

### New behavior
Replace `oldGeometry: CanonicalGeometrySnapshot | null` with `transitionPlan: TransitionPlan | null`.

When `buildTransitionKey(input)` produces a new key (transition just started):

1. **Build PREV geometry**: Call `revertStarsForTransition(input)` → `buildPerimeterFieldRenderFamilyGeometry(revertedStars, ...)`. This produces `prevGeometry: CanonicalGeometrySnapshot`.
2. **Build NEXT geometry**: The current `input.geometry` IS the NEXT geometry (star ownership already updated by the engine). Store as `nextGeometry`.
3. **Sample PREV V-set**: Call `sampleVSetFromGeometry(prevGeometry, input)` → `PerimeterV[]`.
4. **Sample NEXT V-set**: Call `sampleVSetFromGeometry(nextGeometry, input)` → `PerimeterV[]`.
5. **Build transition plan**: Call `buildTransitionPlan(prevVSet, nextVSet, conquestEvents, prevGeometry, nextGeometry)` → `TransitionPlan`.
6. Cache `this.transitionPlan`.

When transition ends (`buildTransitionKey(input)` returns null): clear `this.transitionPlan`.

### Why revertStarsForTransition is acceptable for PREV

`revertStarsForTransition()` takes current stars and patches conquered star ownership back to `previousOwner`. This is deterministically correct because:
- Star positions never change during gameplay
- The conquest event carries the exact `previousOwner`
- The geometry generator is a pure function of (star positions, star ownership, tuning params)
- No other star mutations occur between engine tick and render frame

If simultaneous conquests exist, ALL conquered stars are reverted (the loop at line 76 handles all events). PREV geometry thus reflects the state before ANY conquest in the batch.

### What changes in `update()`

```
// Pseudocode for the modified update():
update(input: RenderFamilyInput): RenderFamilyOutput {
    // ... session key check (unchanged) ...
    const currentGeometry = input.geometry;
    if (!currentGeometry) { ... return invisible ... }

    const transitionKey = buildTransitionKey(input);

    // --- TRANSITION PLAN LIFECYCLE ---
    if (transitionKey && this.transitionPlanKey !== transitionKey) {
        // Transition just started: build plan ONCE
        const revertedStars = revertStarsForTransition(input);
        const prevGeometry = buildPerimeterFieldRenderFamilyGeometry({
            stars: revertedStars, lanes, world, nowMs, geometrySource
        });
        const nextGeometry = currentGeometry;
        const prevVSet = sampleVSetFromGeometry(prevGeometry, input);
        const nextVSet = sampleVSetFromGeometry(nextGeometry, input);
        this.transitionPlan = buildTransitionPlan(
            prevVSet, nextVSet,
            input.activeTransition!.events,
            prevGeometry, nextGeometry
        );
        this.transitionPlanKey = transitionKey;
    } else if (!transitionKey) {
        this.transitionPlan = null;
        this.transitionPlanKey = null;
    }

    // --- BUILD FRAME ---
    const progress = input.activeTransition?.progress ?? null;
    const scene = buildPerimeterFieldFrame(
        this.transitionPlan, progress, input, currentGeometry
    );
    // ... render scene via renderMetaball() (unchanged) ...
}
```

### Purity invariant
`TransitionPlan` is immutable after construction. `buildPerimeterFieldFrame(plan, t, ...)` is a pure function of the plan and progress `t`. Same plan + same `t` = same output. This makes replay deterministic.

---

## Phase 2: Section-Aware V Sampling

### Goal
Replace `sampleClosedLoop()` with a section-aware sampler that tags each V with the frontier section it sits on.

### New function
**File**: `buildPerimeterFieldScene.ts` (or a new `perimeterFieldSampling.ts`)

```
function sampleVSetFromGeometry(
    geometry: CanonicalGeometrySnapshot,
    input: RenderFamilyInput,
): PerimeterV[]
```

**Algorithm:**

1. Read tunables: `spacing`, `offsetPx`, `strength` from `input.tunables`.
2. Get `FrontierTopology` from `geometry.frontierTopology`.
3. For each `RegionLoop` in `topology.loops` where `signedArea > 0` (outer boundaries only):
   a. Build the loop polyline by concatenating section polylines in `sectionRefs` order, respecting `direction`.
   b. Compute total loop perimeter.
   c. Determine sample count: `N = max(3, round(perimeter / spacing))`.
   d. Walk the concatenated polyline at equal arclength intervals, producing `N` sample points.
   e. For each sample point:
      - Determine which section it falls on (by accumulated arclength vs section boundaries).
      - Compute local tangent and inward normal from neighboring polyline points.
      - Offset the point inward by `offsetPx` along the normal.
      - Check offset point is inside the loop polygon; if not, clamp to a safe interior position.
      - Create `PerimeterV` with all fields populated.
4. Convert each `PerimeterV` to `MetaballInfluenceSample` for rendering.
5. Return the full V-set.

### Section-to-arclength mapping

During the polyline walk, maintain a running arclength counter. Each section has a known `length` field. When a sample point's accumulated arclength falls within `[sectionStart, sectionStart + section.length]`, that sample belongs to that section. `arclengthInSection = sampleArclength - sectionStart`.

### Mapping RegionLoop to owner

`RegionLoop.ownerId` gives the owner. `RegionLoop.componentId` distinguishes disconnected islands. This naturally handles multi-component owners.

### What this replaces

Replaces `listPerimeterSources()` → `buildPerimeterSourceSampleSets()` → `flattenPerimeterSampleSets()` chain (lines 191-340 of buildPerimeterFieldScene.ts). The new function produces the same output shape (influence samples for MetaballRenderer) but with richer identity.

---

## Phase 3: Changed-Front Detection

### Goal
Given PREV and NEXT V-sets and conquest events, determine which V's are preserved (static) and which are in changed spans (movers, appearing, or disappearing).

### Algorithm: Preserved-V Detection

**Input:** `prevVSet: PerimeterV[]`, `nextVSet: PerimeterV[]`
**Output:** `Set<string>` of preserved V IDs (IDs that exist in both sets within tolerance)

**Key insight**: V's on unchanged frontier sections will be in nearly identical positions in PREV and NEXT. V's on changed sections will be in very different positions. We use a spatial + structural match to distinguish.

**Step 1: Build section-change set**

From the conquest events, derive which frontier sections changed:

```
function findChangedSectionIds(
    prevTopology: FrontierTopology,
    nextTopology: FrontierTopology,
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>,
): { removedSectionIds: Set<string>; addedSectionIds: Set<string>; unchangedSectionIds: Set<string> }
```

Algorithm:
1. Collect all section IDs from PREV topology: `prevSections = new Set(prevTopology.sections.keys())`
2. Collect all section IDs from NEXT topology: `nextSections = new Set(nextTopology.sections.keys())`
3. `removedSectionIds = prevSections - nextSections` (in PREV but not NEXT)
4. `addedSectionIds = nextSections - prevSections` (in NEXT but not PREV)
5. `unchangedSectionIds = prevSections ∩ nextSections` (in both)

Section IDs are derived from `(ownerPairKey, startVertexId, endVertexId)` by the topology builder. When a conquest changes star ownership, the affected sections get new owner-pair keys → new IDs. Sections far from the conquest keep the same vertices and owner-pairs → same IDs. This makes the set-diff a reliable changed-section detector without needing spatial queries.

**Step 2: Classify V's**

For each V in `prevVSet`:
- If `V.sectionId ∈ removedSectionIds`: V is in a changed area (potential mover or disappearing)
- If `V.sectionId ∈ unchangedSectionIds`: V is preserved (zero displacement guaranteed)

For each V in `nextVSet`:
- If `V.sectionId ∈ addedSectionIds`: V is in a changed area (potential mover or appearing)
- If `V.sectionId ∈ unchangedSectionIds`: V is preserved (zero displacement guaranteed)

### Why this is better than MOE-distance matching

MOE matching (distance < 3px) is heuristic and can mis-classify V's near section boundaries. Section-ID matching is structural: a V on an unchanged section has **guaranteed zero displacement** regardless of sub-pixel position differences between PREV and NEXT sampling.

### Algorithm: Span Extraction

After classifying V's:

1. Walk each PREV loop in arclength order.
2. Group contiguous runs of changed-area V's into spans, bounded by preserved V's.
3. Do the same for each NEXT loop.

A span is:
```
{ loopId, anchorBeforeId (preserved V ID or null), anchorAfterId (preserved V ID or null), vs: PerimeterV[] }
```

If an entire loop has no preserved V's, the span covers the whole loop. `anchorBeforeId` and `anchorAfterId` are both null.

### Algorithm: Span Pairing

Pair PREV spans with NEXT spans. Two spans correspond if they share the same anchor-V boundaries:

1. For each PREV span with anchors `(A, B)`:
   - Find the NEXT span with the same anchors `(A, B)` (matched by preserved-V identity, which is stable because the V's section and position are unchanged).
2. If a PREV span has no matching NEXT span: all its V's are disappearing.
3. If a NEXT span has no matching PREV span: all its V's are appearing.
4. If an entire loop disappeared (PREV loop exists, no corresponding NEXT loop): all V's are disappearing.
5. If an entire loop appeared: all V's are appearing.

**Matching loops**: A PREV loop and NEXT loop correspond if they share at least one preserved V. (Preserved V's have the same section ID in both, so the loops that contain them are the corresponding loops.)

**Whole-loop spans (no preserved V's)**: Match by owner + spatial overlap. Find the NEXT loop(s) with the same `ownerId` whose centroid is closest to the PREV loop's centroid. If no match within a reasonable radius (e.g. max loop diameter): the PREV loop is disappearing and the NEXT loop is appearing independently.

### Algorithm: Local Remesh

For each `SpanPair`:

1. Let `Np = prevSpan.vs.length`, `Nn = nextSpan.vs.length`.
2. Target count `K = max(Np, Nn)`.
3. Resample PREV span to exactly `K` points at equal arclength spacing along the span.
4. Resample NEXT span to exactly `K` points at equal arclength spacing along the span.
5. Pair them monotonically: `prevResampled[i]` ↔ `nextResampled[i]` for `i = 0..K-1`.
6. Assign mover IDs: `P00, P01, ..., P{K-1}`.

**Resampling a span**: the span's V's define a polyline (from anchor-before position to anchor-after position, through all span V's in arclength order). Resample this polyline at `K` equal-arclength intervals. Each resampled point gets the owner, section, and other attributes from the nearest original V.

---

## Phase 4: Motion Path Planning

### Goal
For each `TransitionMover`, determine whether a straight path from PREV to NEXT is safe, or whether a curved path is needed.

### Crossing test

**Input:** `(prevPos, nextPos, staticFrontierPolylines[])`
**Output:** `boolean` (true = crosses)

`staticFrontierPolylines`: all NEXT frontier sections whose IDs are in `unchangedSectionIds`. These are the frontiers that should not be crossed.

Test: does the line segment `(prevPos → nextPos)` intersect any polyline in the static set?

Implementation: for each static frontier polyline, test segment–segment intersection against each edge of the polyline. Early-exit on first intersection.

### Path selection

For each mover:
1. Test straight path. If no crossing: `pathType = 'straight'`, done.
2. If crossing: compute a quadratic Bezier arc.
   - Control point = midpoint of (prevPos, nextPos) + perpendicular offset.
   - Perpendicular direction = toward the interior of the mover's owner region.
   - Offset magnitude: start at `0.3 * distance(prevPos, nextPos)`, increase until no crossing.
   - Test the arc (sample at 10 points) against static frontiers.
   - If still crossing at offset `1.0 * distance`: fall back to a two-segment polyline routing through the region centroid.

### Arc direction heuristic

The "interior" of the mover's owner region is determined by: take the mover's nearest preserved V (the span anchor), and offset the control point toward that anchor's inward normal direction.

For loser-side movers: bow toward the loser's interior (away from the conquering frontier).
For victor-side movers: bow toward the victor's interior.

This heuristic is simple and covers the common case (a frontier shifting inward for the loser, outward for the victor).

---

## Phase 5: Frame Rendering

### Goal
Given a `TransitionPlan` and progress `t ∈ [0, 1]`, produce the `MetaballInfluenceSample[]` for the current frame.

### New function

```
function buildPerimeterFieldFrame(
    plan: TransitionPlan | null,
    progress: number | null,
    input: RenderFamilyInput,
    currentGeometry: CanonicalGeometrySnapshot,
): PerimeterFieldBuiltScene
```

**If no plan (no transition):**
- Sample V-set from `currentGeometry` using `sampleVSetFromGeometry()`.
- Convert to `MetaballInfluenceSample[]`. Zero out real star influence.
- Return scene.

**If plan exists (transition active):**

1. Start with empty sample list.

2. **Preserved V's**: emit at their NEXT position (= PREV position within tolerance), full strength.

3. **Movers**: for each `TransitionMover`:
   - Compute position at `t`: interpolate along the motion path.
     - Straight: `lerp(prevPos, nextPos, t)`
     - Arc: evaluate quadratic Bezier at `t`
   - Compute strength: full strength throughout (the V is always present, just moving).
   - Emit as sample with `playerIdx` from the mover's `ownerId`.
   - **Owner attribution during transition**: the mover carries its `ownerRole`.
     - If `ownerRole == 'loser'`: at `t < 0.5`, emit with loser owner. At `t >= 0.5`, emit with victor owner. (Ownership assertion happens at the visual midpoint.)
     - If `ownerRole == 'victor'`: always emit with victor owner.
     - If `ownerRole == 'neighbor'`: keep original owner throughout.

4. **Appearing V's**: emit at NEXT position with `strength = t * baseStrength`. Fade in over the transition.

5. **Disappearing V's**: emit at PREV position with `strength = (1 - t) * baseStrength`. Fade out over the transition.

6. **Static V's (not in any affected loop)**: emit from the NEXT V-set at full strength.

7. Convert all to `MetaballInfluenceSample[]`.

### Frame 0 invariant

At `t = 0`:
- Preserved V's at NEXT position (= PREV position).
- Movers at prevPos.
- Appearing V's at strength 0 (invisible).
- Disappearing V's at full strength at PREV position.
- Static V's from NEXT (= PREV for unchanged loops).
- **Net result: visually identical to PREV state.** This is the frame-0 equality invariant.

### Frame 1 invariant (last frame before settle)

At `t = 1`:
- Preserved V's at NEXT position.
- Movers at nextPos.
- Appearing V's at full strength at NEXT position.
- Disappearing V's at strength 0 (invisible).
- Static V's from NEXT.
- **Net result: visually identical to NEXT state.**

---

## Phase 6: Region Identity Cleanup

### Goal
Stop generating synthetic index-based region IDs. Preserve upstream star-to-region membership.

### Changes to `adaptPowerVoronoiGeometryToSnapshot()` in `buildFamilyGeometry.ts`

**Line ~105**: Replace `pfield-region:${territory.ownerId}:${index}` with `region:${territory.ownerId}:${territory.starIds.sort().join('+')}`.

**Lines ~105, ~140, ~154**: Populate new fields on the adapted types:
```typescript
anchorStarIds: territory.starIds.filter(id => !id.startsWith('cx-') && !id.startsWith('dx-') && id !== '__disconnect__'),
contributingSiteIds: territory.starIds.filter(id => id.startsWith('cx-') || id.startsWith('dx-') || id === '__disconnect__'),
```

### Changes to `TerritoryRegionShape` in `GeometryContracts.ts`

Add optional fields (backward compatible):
```typescript
anchorStarIds?: string[];
contributingSiteIds?: string[];
```

### Changes to `CanonicalShellLoop` and `CanonicalShell` in `GeometryContracts.ts`

Same optional fields added. The adapter populates them.

---

## Phase 7: Diagnostics and Export

### Changes to diagnostic snapshot

`PerimeterFieldDebugSnapshot` gains `transitionPlan?: TransitionPlan`. This allows diagnostic UI to show:
- Preserved V's (marked, not moving)
- Movers with pair labels (P00, P01, ...)
- Motion paths (straight or arc)
- Appearing/disappearing V's with fade state
- Changed sections highlighted

### Export split

Modify `TransitionBundleSerializer.ts` to emit two directories per bundle:
- `render/` — frames captured from the live gameplay path with NO debug overlays
- `debug/` — same frames with V markers, pair labels, path lines overlaid

### Bundle naming

Format: `YYYY-MM-DD_HHMMSS_{conquestPairs}`
Where `conquestPairs` = each event as `star-{attackerId}_to_star-{targetId}`, joined by `__` for simultaneous events.

### Diagnostic labels on V's

- Static V's: `S00, S01, ...` (numbered per loop)
- Preserved V's: `K00, K01, ...` ("kept")
- Mover pairs: `P00, P01, ...` with `-O` (old/PREV pos) and `-N` (new/NEXT pos) suffixes
- Appearing: `A00, A01, ...`
- Disappearing: `D00, D01, ...`

### `diagnostic.json` additions

Per-V lookup table keyed by label:
```json
{
  "P07": {
    "ownerId": "player_1",
    "ownerRole": "loser",
    "prevPos": [120.5, 340.2],
    "nextPos": [98.1, 355.7],
    "pathType": "straight",
    "sectionId": "...",
    "moverId": "P07"
  }
}
```

---

## Phase 8: Degenerate Cases and Edge Handling

### Tiny regions (perimeter < 2 * offsetPx)

If a region's shell loop perimeter is less than `2 * offsetPx`:
- Reduce offset to `perimeter / 4` for that region.
- Minimum V count = 3 (triangle).

### Single-star regions (no contested frontier)

A region owned by one star with only world-border sections:
- Sample V's along world-border sections normally.
- These V's will always be preserved (world borders don't change on conquest).

### Neutral stars at game init

Per U008: neutral stars must have non-zero ownership weight. If a star has `ownerId = 'neutral'` or equivalent, it participates in geometry generation normally. Its V's render with neutral color.

### DX midpoint V's during conquest

When a DX midpoint exists between two disconnected same-owner stars, and one of them is conquered:
- If the two stars remain same-owner after conquest: DX midpoint V's are preserved.
- If they become different owners: the DX midpoint's section disappears. Its V's are classified as `disappearing` with `reason: 'dx_midpoint_removed'`. They fade out.
- If a new DX midpoint is needed in NEXT (two stars newly same-owner but disconnected): V's appear with `reason: 'dx_midpoint_added'`.

### Region merges

When conquest causes two formerly-disconnected same-owner components to merge (e.g., B had two islands and now they connect through S):
- PREV has two loops for B. NEXT has one.
- The shared frontier between the two old-B components disappears in NEXT.
- V's on that old interior frontier: `disappearing`.
- V's on the merged exterior: matched via preserved-V detection (section IDs for unchanged exterior sections persist).

### Region splits

When conquest causes a region to split (rare — requires the conquered star to be a bridge):
- PREV has one loop. NEXT has two.
- V's on the new interior frontier: `appearing`.
- Exterior V's: matched via preserved-V detection.

### Simultaneous conquests

Each conquest in the batch contributes to the same `TransitionPlan`. The PREV geometry reverts ALL conquered stars. The NEXT geometry reflects ALL conquests. Changed sections from all conquests are unioned. Span detection and pairing operate on the combined changed-section set.

Mover owner-role attribution: determined per-mover based on which conquest event affects it (the conquest whose `starId` is adjacent to the mover's section).

---

## Phase 9: Migration Safety

### Legacy path retained behind flag

During implementation, the current synthetic-sample transition path is NOT deleted. Instead:

1. Add a tunable: `PERIMETER_FIELD_TRANSITION_ENGINE` with values `'legacy'` | `'plan'`.
2. Default: `'plan'` (new path).
3. When `'legacy'`: use the existing `buildTransitionSamples()` path unchanged.
4. When `'plan'`: use the new `TransitionPlan` path.

This lets the user A/B compare at any time. The legacy path is deleted only after the plan path passes all acceptance criteria.

---

## Testing Invariants

These are programmatic tests, not visual wishes.

### T1: Frame-0 equals PREV

Capture PREV render (from `buildPerimeterFieldFrame(plan, 0, ...)`). Capture a static render with PREV geometry (no transition). The `MetaballInfluenceSample[]` arrays must be identical (same positions, same strengths, same playerIdx values, same count).

### T2: Frame-1 equals NEXT

Same test at `t = 1` against NEXT geometry static render.

### T3: Preserved-V zero displacement

For every V whose `sectionId ∈ unchangedSectionIds`: its position is identical in every frame of the transition. Displacement = 0.000 (exact, not approximate).

### T4: Static-loop zero displacement

For every loop that contains no changed sections: all its V's are static across all frames.

### T5: Bijection within spans

For each `SpanPair`, after remesh: `prevResampled.length === nextResampled.length` and the pairing is monotone (no index crossings).

### T6: Crossing-free paths

For each mover with `pathType = 'straight'`: the segment `(prevPos, nextPos)` does not intersect any polyline in `unchangedSectionIds` frontier set.

### T7: Plan purity

`buildPerimeterFieldFrame(plan, t)` is deterministic: same plan + same `t` produces byte-identical output.

### T8: Section-ID diff correctness

For a known conquest scenario (hardcoded test map):
- Verify `removedSectionIds` matches expected (sections that existed in PREV involving the conquered star's old owner-pair).
- Verify `addedSectionIds` matches expected.
- Verify `unchangedSectionIds` matches expected.

---

## Implementation Order

Each phase produces a testable artifact. Do not skip ahead.

| Step | What | New/Modified Files | Testable Output |
|------|------|--------------------|-----------------|
| 1 | Add `perimeterFieldTransitionTypes.ts` | New file | Types compile |
| 2 | Add `anchorStarIds`/`contributingSiteIds` to geometry types | `GeometryContracts.ts`, `buildFamilyGeometry.ts` | Existing tests pass; new fields populated |
| 3 | Implement `sampleVSetFromGeometry()` | `buildPerimeterFieldScene.ts` or new file | V's carry correct sectionId, arclength; static render unchanged |
| 4 | Implement `findChangedSectionIds()` | New function in transition module | T8 passes |
| 5 | Implement preserved-V detection + span extraction | New function | Preserved V's match expected for test scenario |
| 6 | Implement span pairing + local remesh | New function | T5 passes |
| 7 | Implement motion path planning + crossing test | New function | T6 passes |
| 8 | Implement `buildTransitionPlan()` (combines 4-7) | New function | Full plan builds for test conquest |
| 9 | Implement `buildPerimeterFieldFrame()` | Replaces frame-build path | T1, T2, T3, T4, T7 pass |
| 10 | Wire into `PerimeterFieldFamily.update()` with `PERIMETER_FIELD_TRANSITION_ENGINE` flag | `PerimeterFieldFamily.ts` | Mode runs end-to-end; A/B with legacy |
| 11 | Diagnostic snapshot + export split | `TransitionBundleSerializer.ts`, debug snapshot | Bundle contains render/ and debug/ dirs |
| 12 | Visual acceptance + tuning | Tunables | User validates |
| 13 | Delete legacy path | Remove `buildTransitionSamples()` and flag | Clean |

---

## Files Touched Summary

| File | Change Type |
|------|-------------|
| `perimeterFieldTransitionTypes.ts` | **NEW** |
| `buildPerimeterFieldScene.ts` | Major rewrite of transition path; static path preserved |
| `PerimeterFieldFamily.ts` | Modified update() for plan lifecycle |
| `buildFamilyGeometry.ts` | Region ID fix, anchorStarIds/contributingSiteIds |
| `GeometryContracts.ts` | Add optional fields to TerritoryRegionShape, CanonicalShellLoop, CanonicalShell |
| `TransitionBundleSerializer.ts` | Export split, naming, labels |
| Tunable definitions (wherever PERIMETER_FIELD_TRANSITION_ENGINE is registered) | Add new tunable |

---

## What Is NOT In This Plan

- **Firecracker mode**: deferred until standard mode passes acceptance. Firecracker is a per-mover delay offset layered on top of this plan's mover system.
- **Metaball geometry-following mode**: deferred. Different project scope.
- **Non-perimeter_field modes**: out of scope entirely.
- **Source geometry tuning changes**: MSR/CX/DX/lane-pair tuning remains unchanged. This plan consumes their output; it does not modify how they generate geometry.
