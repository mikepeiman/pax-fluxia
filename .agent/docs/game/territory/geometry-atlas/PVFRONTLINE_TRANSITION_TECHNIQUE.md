# pvFrontline — Power Voronoi Frontline Transition Technique

**IP-absorption record.** Written 2026-07-14 under cleanup-campaign ruling **Q29** ("capture what a
subsystem KNOWS before its code is deleted"). The code described here is scheduled for deletion. This
document plus the verbatim source at the bottom is the only thing that survives it.

**Subject:** `src/lib/territory/pvFrontline/` (planner + sampler + fixtures + tests) and
`src/lib/territory/layers/transition/TransitionLayerCoordinator.ts` + `SharedTransitionClock.ts`.
~1,900 LOC, fully tested, **zero non-test importers**.

**Name:** "PV Frontline" = **P**ower **V**oronoi **Frontline**. It is the transition-planning layer of
the retired **PVV4** runtime (`power_voronoi_runtime`).

---

## 0. Executive summary — read this before anything else

This subsystem was flagged as a plausibly serious attempt at the hard problem the design history
records: *vector* conquest morphs, where "vertex-correspondence lerp was NEVER reliable". Having read
all of it, the honest finding is narrower than the framing, and it matters that the record says so
rather than tells a tidy story:

> **pvFrontline's own transition math does not draw any pixels.** The polyline it computes per frame
> (`transientFrontlines`) is written into a diagnostics bundle and **never returned** to the renderer.
> The pixels come from `sampleActiveFrontTransition(...)` — a **different file**
> (`layers/transition/ActiveFrontTransition.ts`) that is **LIVE and is not being deleted**.

So the vector-morph engine is `ActiveFrontTransition`. pvFrontline is a **planning, pairing and
observability wrapper** around it. See §3 and §5 for the proof, quoted from source.

That said, three ideas here are genuinely worth keeping, and two of them exist **only** in the code
being deleted:

1. **The arc-length resampling trick** that dodges vertex correspondence (§3). pvFrontline has its own
   copy of it — a *weaker* copy (§8 defect D1) — but the strong version lives in the file that stays.
   Recorded here anyway, because it is the answer to the question the design history poses.
2. **The recomputed-PRE pairing** (§6.3) — the reason the whole thing needed a "resolved PV pair"
   instead of just reusing last frame's geometry. **This idea dies with the deletion** and is the most
   valuable thing in this document.
3. **The endpoint-exactness contract** pinned by the tests (§4) — a transition must be *bit-exact* to
   the PRE map at its first frame and *bit-exact* to the POST map at its last frame, verified by a
   real geometric comparison rather than trusted.

---

## 1. What it computes, in plain language — what a player would see

### 1.1 The situation being animated

The map is divided into coloured territories, one colour per player. The dividing lines between two
players' territories are **frontiers**. When a player captures a star, the territory maths produces a
*new* map where the frontiers sit in different places. Without a transition the map would **snap** —
the border teleports from its old position to its new one between two frames.

This subsystem's job is to fill in the frames between those two maps, so the border **slides** from
where it was to where it ends up.

### 1.2 Every term defined

| Term | What it means |
|---|---|
| **PRE map** | The map as it looked immediately *before* the capture. Also called `preGeometry`. |
| **POST map** | The map as it looks *after* the capture. Also called `postGeometry`. |
| **q** or **progress** or **t** | A number from 0 to 1 saying how far through the transition we are. **q = 0 is the first frame of the conquest** — the player still sees exactly the old map. **q = 1 is the last frame** — the player sees exactly the new map. q = 0.5 is halfway through, in wall-clock time. |
| **frontier** | A line on the map where one player's territory meets another's. |
| **section** | One indivisible piece of frontier line, stored as a list of points (a **polyline**). The map's frontiers are stored as a graph of sections joined at vertices. |
| **vertex** | A point where sections meet. |
| **anchor** | A *special* vertex that is expected **not to move** during the conquest — see §1.3. This is the load-bearing concept. |
| **chain** | A run of sections walked end-to-end from one anchor to another anchor. A chain is the unit that gets animated. Think "the stretch of border between two fixed pins". |
| **front** | One chain-or-chains-between-one-anchor-pair that actually *changed* between PRE and POST, packaged with everything needed to animate it. The word means "battle front" — the part of the border that is moving. |
| **owner pair key** | A string like `"blue\|red"` naming *which two players* a frontier separates. Always sorted, so blue-vs-red and red-vs-blue produce the same key. |
| **split mode** | Which of three topology changes happened to a front: `1to1` (one border stretch became one border stretch — it just moved), `1to2` (one stretch became two — a border **split in half**), `2to1` (two stretches became one — two borders **merged**). |
| **envelope** | The clock for a transition: when it started, how long it lasts, and its current q. One envelope covers *all* fronts, so every moving border on the map moves in lockstep. |
| **transition vertex** | A pair of points — one on the PRE border, one on the POST border — that are declared to be "the same point, before and after". Drawing the border at progress q means putting a point q of the way between them. |
| **loop** | A closed ring of sections that encloses one player's territory — i.e. the outline of a filled coloured region. |
| **region** | A filled coloured polygon handed to the renderer: `{ ownerId, points }`. |

### 1.3 The idea, as a picture

Imagine the border network as a set of **pins** and **strings between pins**.

- The **pins** are the anchors: three-way junctions where three players' territories meet, the corners
  of the world rectangle, and points where a frontier hits the world edge. When one star changes
  hands somewhere in the middle of the map, these pins overwhelmingly **stay put**.
- The **strings** are the chains. When the star flips, only *some* strings move, and each moving
  string is still tied to the same two pins at its ends.

So the animation problem shrinks: don't morph "the whole map into the whole map". Instead, find the
pins that survived, cut the border network into strings between pins, notice which strings changed,
and slide **only those strings** from their old shape to their new shape — while every pin, and every
unchanged string, stays exactly where it is.

**What the player sees:** at q=0 the old map, unchanged. As q rises, the stretches of border near the
captured star bow and sweep outward toward their new positions, pivoting around the junctions at their
ends, which do not move. Borders far from the action do not twitch at all. At q=1 the new map, exactly.
There is no cross-fade, no ghosting, no double image — every frame is **one coherent map** with one set
of borders, which is what the "conquest is a map state" principle demands.

---

## 2. The algorithm, step by step

### 2.0 The key idea, in one sentence

> **Pin the border network at the junction vertices that survive the conquest, cut it into chains
> between those pins, and morph a changed chain by declaring the NEW chain's vertex list authoritative
> and manufacturing each vertex's old-position partner by resampling the OLD chain at the same
> fractional distance along it — so correspondence is *constructed*, never *searched for*.**

The second half of that sentence is the answer to "how do you avoid vertex correspondence". §3 covers
it in full.

### 2.1 Inputs

`buildPowerVoronoiFrontlineRuntime(args)` — `planner.ts:402-500`:

| Input | Type | Meaning |
|---|---|---|
| `preGeometry` | `GeometrySnapshot` | The whole PRE map: filled regions, frontier polylines, and the frontier **topology** (the vertex/section graph). |
| `postGeometry` | `GeometrySnapshot` | The whole POST map, same shape. |
| `previousOwnership` | `OwnershipSnapshot` | Who owned what before. |
| `nextOwnership` | `OwnershipSnapshot` | Who owns what now, **including `conquestEvents`** — the list of stars that just changed hands. |
| `tunables` | `TerritoryTunables` | All the geometry knobs (frontier resolution, star margin, corridor settings…). |

The `FrontierTopology` inside each `GeometrySnapshot` is the real input. Its relevant fields:
`vertices: Map<id, FrontierVertex>`, `sections: Map<id, FrontierSection>`,
`sectionsByVertex: Map<vertexId, sectionId[]>`, `loops: RegionLoop[]`.
A `FrontierVertex` has `{ id, kind, point }`. A `FrontierSection` has
`{ id, startVertexId, endVertexId, points, ownerPairKey, ... }`.

### 2.2 Step 1 — find the stable anchors (the pins)

`findStableAnchors(prev, next)` — `planner.ts:49-60`:

```ts
for (const [vertexId, prevVertex] of prev.vertices) {
    if (!isStableAnchorKind(prevVertex.kind)) continue;
    const nextVertex = next.vertices.get(vertexId);
    if (!nextVertex || !isStableAnchorKind(nextVertex.kind)) continue;
    if (distance(prevVertex.point, nextVertex.point) <= ANCHOR_EPSILON) {
        anchors.add(vertexId);
    }
}
```

A vertex is an anchor iff **all three** hold:

1. Its `kind` is one of `junction_3way`, `world_intersection`, `world_corner` — `planner.ts:41-47`.
   (Meaning: a point where three territories meet, a point where a frontier hits the world edge, or a
   corner of the world rectangle. Plain two-territory points along a border are *not* anchors — they
   are free to move.)
2. **The same vertex id exists in both PRE and POST topologies, and is still that kind in both.**
   Identity is by id, supplied by the topology compiler upstream.
3. It moved no more than `ANCHOR_EPSILON = 2` world units — `planner.ts:35`. `distance` is
   `Math.hypot(a[0]-b[0], a[1]-b[1])`, i.e. ordinary Euclidean distance.

Condition 3 is the important one: it lets a junction jitter slightly (the power-diagram maths will
never reproduce a junction to the bit) and still count as "the same pin, unmoved".

### 2.3 Step 2 — cut the border network into chains between pins

`buildChainsBetweenAnchors(topo, anchors)` — `planner.ts:101-160`. Run **once on PRE and once on POST,
with the same anchor set**.

A greedy, deterministic walk:

```
unusedSections := every section id in the topology
for each anchorId in anchors, SORTED ASCENDING:
    for each sectionId incident to that anchor, SORTED ASCENDING:
        if already used, skip
        walk:
            currentVertex := anchorId ; previousSection := null
            loop:
                candidates := sections incident to currentVertex
                              that are not previousSection and are still unused,
                              SORTED ASCENDING
                if none, stop
                take candidates[0]
                mark it used; append it to this chain
                currentVertex := the section's OTHER endpoint
                previousSection := it
                if currentVertex is an anchor, stop
```

**Every iteration order is sorted.** That is deliberate and is what makes the PRE walk and the POST
walk produce *comparable* chains: the same anchors are visited in the same order, and at each junction
the same tie-break is taken. It is the cheap substitute for a real correspondence algorithm.

Then the chain is **canonicalised** — `normalizeChainOrder`, `planner.ts:82-99`:

```ts
if (anchorStartId <= anchorEndId) {
    return { orderedSectionIds: sectionIds, anchorStartId, anchorEndId };
}
return {
    orderedSectionIds: [...sectionIds].reverse(),
    anchorStartId: anchorEndId,
    anchorEndId: anchorStartId,
};
```

String-compare the two end anchor ids; if they are out of order, reverse the chain. **A chain from
anchor `b` to anchor `a` and a chain from `a` to `b` therefore become the same chain**, keyed `a|b`,
regardless of which end the walk happened to start from. This is what lets a PRE chain and a POST
chain be recognised as "the same stretch of border" without comparing any geometry.

Finally the chain's point list is built by walking its sections in order from `anchorStartId`,
**orienting** each section so it runs the right way (`getOrientedSectionPoints`, `planner.ts:66-71` —
reverse the section's points if we're entering it from its `endVertexId`) and **deduplicating the
shared junction** (`appendPolyline`, `planner.ts:73-80` — skip the segment's first point if it is
within `1e-3` of the last point already emitted).

Result per chain: `{ anchorStartId, anchorEndId, ownerPairKey, sectionIds, points }`.

### 2.4 Step 3 — pair PRE chains with POST chains and classify the change

`collectTransitionFronts(prev, next)` — `planner.ts:271-353`.

1. Group chains by the key `` `${anchorStartId}|${anchorEndId}` `` — `groupChainsByAnchorPair`,
   `planner.ts:162-171`. Both PRE and POST.
2. For every key appearing on either side:
   - **Skip if either side is empty** (`planner.ts:283`). An anchor pair that exists only in PRE or
     only in POST is a topology gap this algorithm declines to handle.
   - **Classify by counting** — `splitModeFromCounts`, `planner.ts:173-178`:
     ```ts
     if (prevCount === 1 && nextCount === 1) return '1to1';
     if (prevCount === 1 && nextCount === 2) return '1to2';
     if (prevCount === 2 && nextCount === 1) return '2to1';
     return null;   // → skip this anchor pair entirely
     ```
     So the *only* topology changes this thing admits are: it moved, it split in two, or two merged.
     Anything else (1→3, 2→2, 3→1…) is silently dropped.
   - **Skip world borders** — `isWorldOwnerPair`, `planner.ts:180-182`:
     `ownerPairKey.includes('world') || ownerPairKey.includes('__world__')`. The edge of the map does
     not animate.
   - **Skip unchanged chains** — `chainsChanged`, `planner.ts:194-205`: same chain count *and* every
     point equal within `1e-6` ⇒ nothing moved here, emit no front. **This is the "only animate what
     actually changed" gate**, and it is why borders far from the captured star do not twitch.

### 2.5 Step 4 — build the transition vertices (pvFrontline's own morph math)

`buildTransitionVertices(prevChains, nextChains)` — `planner.ts:241-259`. **Quoted in full because
this is the heart of the module:**

```ts
function buildTransitionVertices(
    prevChains: readonly ChainPath[],
    nextChains: readonly ChainPath[],
): PowerVoronoiTransitionVertex[] {
    const vertices: PowerVoronoiTransitionVertex[] = [];
    const prevReference = prevChains[0]?.points ?? [];
    const postReference = nextChains[0]?.points ?? [];
    const count = postReference.length;
    for (let index = 0; index < count; index += 1) {
        const u = count <= 1 ? 0 : index / (count - 1);
        vertices.push({
            vertexId: `transition-vertex:${index}`,
            progressIndex: index,
            prePoint: samplePolylineAtNormalizedLength(prevReference, u),
            postPoint: postReference[index],
        });
    }
    return vertices;
}
```

Read that carefully:

- **The POST chain's vertex list is the master.** `count = postReference.length`. The output has
  exactly one transition vertex per POST vertex. `postPoint` is taken **verbatim** —
  `postReference[index]`, no resampling, no smoothing.
- **The PRE partner is manufactured, not matched.** For POST vertex `index`, compute a fraction
  `u = index / (count - 1)` — 0 at the chain's start anchor, 1 at its end anchor — and then **sample
  the PRE polyline at that fraction of its total arc length**.
- No search. No nearest-neighbour. No optimal transport. No requirement that PRE and POST have the same
  vertex count, or the same vertices, or vertices in any relation whatsoever.

`samplePolylineAtNormalizedLength(points, u)` — `planner.ts:215-239` — is a standard arc-length lookup:

```ts
const clamped = Math.max(0, Math.min(1, u));
const lengths: number[] = [0];
let total = 0;
for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
    lengths[index] = total;
}
const target = total * clamped;
for (let index = 1; index < lengths.length; index += 1) {
    if (lengths[index] < target) continue;
    const previousLength = lengths[index - 1];
    const span = lengths[index] - previousLength;
    if (span <= 0) return points[index];
    const localT = (target - previousLength) / span;
    const a = points[index - 1];
    const b = points[index];
    return [ a[0] + (b[0] - a[0]) * localT,
             a[1] + (b[1] - a[1]) * localT ];
}
return points[points.length - 1];
```

Build a cumulative-distance table, find the target distance `total * u`, locate the segment containing
it, and linearly interpolate within that segment. Standard, correct.

> **Note the `u` used is `index / (count - 1)` — the POST vertex's *index* fraction, not its *arc-length*
> fraction.** This is a real defect; see §8, D1. The live `ActiveFrontTransition` gets this right and
> pvFrontline does not.

### 2.6 Step 5 — transition pairs (bookkeeping only)

`planner.ts:299-337` builds `transitionPairs`, recording which PRE chain feeds which POST chain:

- `1to2` → two pairs: `pre[0] → post[0]` and `pre[0] → post[1]` (one border splitting into two).
- `2to1` → two pairs: `pre[0] → post[0]` and `pre[1] → post[0]` (two borders merging into one).
- `1to1` → one pair: `pre[0] → post[0]`.

**Nothing reads `transitionPairs`.** Grep confirms `sampler.ts` touches only `frontId`, `ownerPairKey`,
`splitMode` and `transitionVertices`. The pairs are a declaration of intent that was never cashed in —
the actual split/merge handling lives in `ActiveFrontTransition` (§5.3).

### 2.7 Step 6 — assemble the runtime

`buildPowerVoronoiFrontlineRuntime` — `planner.ts:402-500` — produces `PowerVoronoiFrontlineRuntime`:

| Field | Contents |
|---|---|
| `preGeometry` / `postGeometry` | Stored verbatim. Used at the q endpoints (§2.8). |
| `activeFrontPlan` | **`planActiveFrontTransition(pre.frontierTopology, post.frontierTopology, nextOwnership)`** — `planner.ts:409-413`. Delegated wholesale to the live engine. **This is what actually renders.** |
| `plan` | `PowerVoronoiTransitionPlan` — `planId`, geometry versions, `conquestEvents`, `fronts` (from §2.4–2.6), `frozenTunables`, `unaffectedLoopIds`. |
| `diagnostics` | `PowerVoronoiDiagnosticBundle` — a four-stage record: `ownership`, `geometry`, `transition_planning`, `frame_evaluation`. |

Two details worth keeping:

- **`planId = `` `pv-frontline:${preGeometry.version}:${postGeometry.version}` ``** (`planner.ts:414`).
  The plan is identified by *which two maps it bridges*, not by a counter or a timestamp. Two identical
  conquests produce the same plan id. Good for replay/diffing.
- **Frozen tunables** — `cloneTunables` (`planner.ts:355-357`) snapshots the tunables at plan time, and
  the same frozen object is stamped onto **all four** diagnostic stages. The intent: a transition is
  evaluated against the knob values it was *planned* with, even if the user drags a slider mid-flight.
  The tests pin this (§4.1).

`unaffectedLoopIds` — `planner.ts:419-421`:

```ts
const unaffectedLoopIds = args.postGeometry.frontierTopology.loops
    .filter((loop) => !fronts.some((front) => front.ownerPairKey.includes(loop.ownerId)))
    .map((loop) => loop.id);
```

"Which filled regions are untouched by this conquest." Nothing consumes it beyond a count in the
summary. It also uses substring matching on owner ids — see §8, D3.

### 2.8 Step 7 — sampling a frame

`samplePowerVoronoiFrontlineTransition(runtime, progress)` — `sampler.ts:92-133`:

```ts
const t = Math.max(0, Math.min(1, progress));
const fillFrame =
    t <= 1e-6
        ? buildFillFrameFromGeometry(runtime.preGeometry)
        : t >= 1 - 1e-6
          ? buildFillFrameFromGeometry(runtime.postGeometry)
          : runtime.activeFrontPlan.fronts.length > 0
        ? sampleActiveFrontTransition(
              runtime.activeFrontPlan,
              runtime.preGeometry.frontierTopology,
              runtime.postGeometry.frontierTopology,
              t,
          )
        : buildFillFrameFromGeometry(runtime.postGeometry);
```

Four branches:

1. **q ≈ 0** (within `1e-6`) → hand back the PRE map's regions **verbatim**. Not "an interpolation that
   happens to land on PRE" — a literal copy. The first frame of the conquest is bit-exact the old map.
2. **q ≈ 1** → hand back the POST map's regions verbatim. Bit-exact the new map.
3. **otherwise, if the delegated plan found any fronts** → `sampleActiveFrontTransition(...)`. **All
   intermediate pixels come from here.**
4. **otherwise** (no fronts found) → snap to POST. Degrade to the old snapping behaviour rather than
   render something wrong.

Branches 1, 2 and 4 are the valuable part of this function and are pvFrontline's own: **exact
endpoints, and a safe snap when planning fails.**

Then — and this is the finding from §0:

```ts
const transientFrontlines = runtime.plan.fronts.map((front) =>
    buildTransientTransitionFrontline(front, t),
);
```

where `buildTransientTransitionFrontline` (`sampler.ts:23-37`) is the straight per-vertex lerp:

```ts
const points = front.transitionVertices.map((vertex) =>
    lerpPoint(vertex.prePoint, vertex.postPoint, progress),
);
```
with `lerpPoint(a, b, t) = [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]` (`sampler.ts:16-21`).

`transientFrontlines` is pushed into `runtime.diagnostics.frameEvaluationStage.sampledFrames` and
**is not part of the returned `fillFrame`**. The function returns `fillFrame` (`sampler.ts:132`), which
came from one of the four branches above. **pvFrontline's morph math is an observability product.**

### 2.9 The frame self-check

`frameMatchesGeometry(fillFrame, geometry)` — `sampler.ts:49-79` — decides whether a rendered frame is
*geometrically identical* to a given map. Order-insensitive multiset match:

- region counts must be equal;
- for each frame region, find an as-yet-unclaimed geometry region with the **same `ownerId`** and
  **exactly equal points** (`pointsEqual`, within `1e-6` per point, same count) and claim it;
- if any frame region finds no partner → false;
- all geometry regions must end up claimed (`unused.size === 0`).

O(n²) in region count, which is fine at map scale. Each sample records
`matchesPreGeometry` / `matchesPostGeometry`, so the diagnostics can *prove* the endpoint-exactness
contract rather than assume it. The tests lean on exactly this (§4.1).

### 2.10 Outputs

- **To the renderer:** `FillTransitionFrame = { regions: { ownerId, points }[] }`. That is the whole
  contract — a list of filled coloured polygons. No borders (`TransitionLayerCoordinator` always emits
  `buildEmptyBorderFrame()` on the PV path, `TransitionLayerCoordinator.ts:200`); borders are expected
  to be derived from the same interpolated sections downstream.
- **To the diagnostics panel:** `PowerVoronoiDiagnosticBundle` — the four-stage record, including every
  sampled frame with its q, region count, the transient frontlines, and the two match booleans.

---

## 3. How it avoids vertex correspondence — the central question

**Short answer: it does lerp vertices, but it never *matches* them. It manufactures the correspondence
by resampling, so a per-index lerp becomes trivially valid.**

The design history's complaint — "vertex-correspondence lerp was NEVER reliable" — is about the naive
approach: take PRE vertex *i*, take POST vertex *i*, lerp between them. That fails because the two
polylines are independently generated by the power-diagram maths. They have **different vertex counts**,
and vertex *i* of one has **no relationship** to vertex *i* of the other. Lerping them shears the line,
swaps points across each other, and produces the tangles the history records.

pvFrontline (and, better, `ActiveFrontTransition`) sidesteps it on **two levels**:

### 3.1 Topological level — anchors make the problem local

Correspondence between two *whole maps* is intractable. Correspondence between two *chains that
provably share the same two endpoints* is easy. The anchor test (`planner.ts:49-60`) supplies the
provably-shared endpoints: same vertex id, same junction kind, moved ≤ 2 units. Everything downstream
operates on one anchor-to-anchor chain at a time. **The identity problem is solved by the topology
compiler's stable vertex ids, not by geometry.**

The canonical `a|b` chain key (`normalizeChainOrder`, `planner.ts:82-99`) then matches a PRE chain to a
POST chain **by its endpoints alone** — no geometric comparison whatsoever.

### 3.2 Geometric level — resampling, not matching

Within one matched chain pair, `buildTransitionVertices` (`planner.ts:241-259`, quoted in §2.5) does:

> `prePoint: samplePolylineAtNormalizedLength(prevReference, u)` where `u = index / (count - 1)` and
> `count = postReference.length`.

The PRE chain is **resampled** to produce exactly as many points as the POST chain has, positioned at
matching fractional distances along it. After that step the two point lists are the same length **by
construction**, and index *i* of one genuinely does correspond to index *i* of the other — because that
correspondence is what the resampling *defined*. The subsequent lerp (`sampler.ts:23-37`) is then sound.

**This is the insight worth preserving.** Not "find which old vertex became which new vertex" — an
ill-posed question, since the old vertices do not *become* anything. Instead: **treat each chain as a
1-D parameterised curve, and interpolate the curves, not the vertices.** Vertices are just samples of a
curve; if you need a partner for a sample, take a fresh sample of the other curve at the same parameter.

To answer the checklist explicitly:

| Question | Answer |
|---|---|
| Does it lerp vertices? | **Yes** — `lerpPoint(vertex.prePoint, vertex.postPoint, progress)`, `sampler.ts:27-29`. But only *after* §3.2 has made the lerp meaningful. |
| Does it resample? | **Yes — this is the whole technique.** `samplePolylineAtNormalizedLength`, `planner.ts:215-239`. |
| Does it ray-cast? | **No.** Nothing casts rays. |
| Does it advance a front? | **No** — not in the wave/level-set sense. "Front" here is a naming choice for "the part of the border that changed"; it is morphed by curve interpolation, not propagated by any distance-field or wavefront rule. Contrast the shipped PowerCore "smooth live-sweep", which *does* sweep. |
| Does it do optimal transport / nearest-neighbour matching? | **Not in pvFrontline.** The live `ActiveFrontTransition` does use nearest-neighbour, but *only* to decide split/merge chain assignment (§5.3) — never to match individual vertices. |

### 3.3 The stronger version of the same trick (in the file that stays)

`ActiveFrontTransition.ts:546-566`, `lerpArcAligned` — the function that actually draws the frames:

```ts
function lerpArcAligned(prev: Vec2[], next: Vec2[], t: number): Vec2[] {
    if (next.length === 0) return [];
    const prevChain = prev.length > 0 ? prev : next;
    ...
    const prevTable = buildArcLengthTable(prevChain);
    const nextTable = buildArcLengthTable(next);
    const out: Vec2[] = new Array(next.length);
    for (let i = 0; i < next.length; i += 1) {
        const u = nextTable.total <= 0 ? 0 : nextTable.cumulative[i] / nextTable.total;
        const prevAt = samplePolylineAtParam(prevChain, prevTable, u);
        out[i] = lerpPoint(prevAt, next[i], t);
    }
    return out;
}
```

Identical idea, **correct parameter**: `u = nextTable.cumulative[i] / nextTable.total` — the true
arc-length fraction of the NEXT chain, rather than pvFrontline's `index / (count - 1)`. If a rebuilder
takes one formula from this document, take **this** one.

---

## 4. What the tests pin — the intended contract

The tests are the most reliable statement of intent in the subsystem. Every invariant they assert:

### 4.1 `pvFrontline/planner.test.ts` (359 lines, 4 tests)

**Test 1 — "builds a canonical PV runtime with typed diagnostics and a local front plan"** (`:135-174`).
Fixture: a PRE frontier `[[0,0],[5,5],[10,10]]` vs a POST frontier `[[0,0],[4,6],[10,10]]` — i.e. the
middle of the border moved, the ends did not.

- `plan.kind === 'power_voronoi_runtime'` — the plan is tagged.
- **`plan.fronts` has length 1** — one moved frontier ⇒ exactly one front. Not zero (it noticed), not
  two (it didn't double-count).
- `diagnostics.bundleId === 'pv-bundle:ownership:post:pv-frontline:pre:post'` — **id formation is
  pinned literally**: `` `pv-bundle:${nextOwnership.version}:${planId}` `` over
  `` `pv-frontline:${preVersion}:${postVersion}` ``.
- All four stage ids pinned: `pv-frontline:pre:post:{ownership,geometry,transition_planning,frame_evaluation}`.
- `geometryStage.preGeometry.version === 'pre'` — the PRE snapshot is retained whole, not just its
  topology.
- **All four stages' `tunables` equal `TEST_TUNABLES`** — the frozen-tunables propagation invariant.
- `transitionPlanningStage.transitionPlan.planId === plan.planId` — the diagnostics bundle carries *the*
  plan, not a copy with a different identity.

**Test 2 — "samples exact PRE and POST endpoints through the canonical PV sampler"** (`:176-217`). **The
most important test in the file.**

- `sampledFrames[0]` at q=0: `{ progress: 0, regions: 2, matchesPreGeometry: true, matchesPostGeometry: false }`
- `sampledFrames[1]` at q=1: `{ progress: 1, regions: 2, matchesPreGeometry: false, matchesPostGeometry: true }`

  ⇒ **THE ENDPOINT-EXACTNESS INVARIANT.** The first frame of the conquest is *geometrically identical*
  to the old map and *provably different* from the new one; the last frame is the exact converse. Note
  the `false`s are as load-bearing as the `true`s — they prove the fixture actually moved, so the test
  cannot pass vacuously.
- `sampledFrames` has length 2 — **every** sample is recorded, none dropped.
- `frameEvaluationStage.currentFrame` deep-equals the last returned frame.
- `summary` equals `{ sampledFrameCount: 2, lastProgress: 1, lastFrontlineCount: 1 }` — the running
  summary tracks the sample log exactly.
- `preFrame.regions[0]?.ownerId === 'red'` and `postFrame.regions[0]?.ownerId === 'red'` — **region
  order is preserved** from the source geometry across the transition. (Matters: a renderer keying off
  index would otherwise flicker colours.)

**Test 3 — "records explicit 1to2 and 2to1 split modes for local frontier-chain changes"** (`:219-282`).
Fixture: a hand-built topology with one chain `a→b`, vs one with two parallel chains `a→b`.

- one-chain → two-chains: **1 front**, `splitMode === '1to2'`, **2 transitionPairs**.
- two-chains → one-chain: **1 front**, `splitMode === '2to1'`, **2 transitionPairs**.

⇒ A border splitting in two, or two borders merging, is **one front with two pairs** — not two fronts.
The split is modelled as a property of the front, not as separate animations.

**Test 4 — "plans disjoint changed fronts independently within one transition envelope"** (`:284-358`).
Fixture: two spatially separate frontiers (`a→b` around x=0..10, `c→d` around x=20..30), both moved,
two conquest events.

- `plan.fronts` has length 2 — the two disjoint changes are planned **independently**.
- `ownershipStage.summary.conquestCount === 2`.
- `transitionPlanningStage.summary` matches `{ transitionFrontCount: 2, transitionPairCount: 2 }`.

⇒ **N simultaneous conquests in different parts of the map produce N independent fronts sharing ONE
envelope** — so they all animate in lockstep on one clock. This is the "one coherent map per frame"
principle expressed as a test.

**What the tests do NOT pin — an important gap.** No test samples at an intermediate q (0 and 1 only).
No test asserts anything about the *shape* of `transientFrontlines` beyond their count. **The entire
intermediate-frame behaviour of pvFrontline's own morph math is unverified** — which is consistent with
§0's finding that it never reached the screen. Defect D1 (§8) would not be caught by this suite.

### 4.2 `layers/transition/TransitionLayerCoordinator.test.ts` (130 lines, 2 tests)

**Test 1 — "builds and samples a PV frontline transition from paired PRE/POST geometry"** (`:21-72`).

- `activePvFrontlineTransition.plan.kind === 'power_voronoi_runtime'`; `plan.fronts` length 1.
- `transitionPlanningStage.summary` matches `{ transitionFrontCount: 1, transitionPairCount: 1 }`.
- `frameEvaluationStage.sampledFrames[0]` matches `{ progress: 0, matchesPreGeometry: true, matchesPostGeometry: false }` — endpoint exactness again, now end-to-end through the coordinator.
- **`result.activeFrontPlan` is (identity `toBe`) `result.activePvFrontlineTransition.activeFrontPlan`**
  — the coordinator *republishes the inner delegated plan* rather than planning its own. This test is
  the clearest statement in the codebase that pvFrontline **wraps** `ActiveFrontTransition`.
- **`result.transitionPrevTopology` is (identity) `preGeometry.frontierTopology`** — the PRE topology is
  captured and carried forward, so later frames sample against **the original PRE**, not against a
  drifting `previousGeometry`. (See §6.3 — this is the same concern as the recomputed pair.)
- `snapshot.envelope.transitionId === 'transition:100'` — pinned as `` `transition:${nowMs}` ``.
- `snapshot.fillFrame.regions` has length 2.

**Test 2 — "cancels an active PV frontline transition when geometry retunes without a new conquest"**
(`:74-129`). Starts a transition, then computes a second frame where the geometry version changed
(`frontierResolution` +2 ⇒ a `retuned` geometry) but **ownership has no conquest events**.

- `started.snapshot.envelope` is not null; then
- `cancelled.snapshot.envelope` is **null**, `activePvFrontlineTransition` **null**, `activeFrontPlan`
  **null**, `transitionPrevTopology` **null**, and `fillFrame.regions` has length 2.

⇒ **THE CANCEL INVARIANT: a geometry change *without* a conquest kills the in-flight transition and
snaps to the new steady geometry.** The rationale is recorded in commit `3e3610b5f` — *"cancel active
transition on tunable-only geometry change so MSR/CX/DX snap immediately mid-transition"*. If the user
drags a geometry slider mid-conquest, the map must obey the slider **now**, not finish animating toward
a map that no longer exists. Implemented at `TransitionLayerCoordinator.ts:180-186`.

The complementary rules, in the coordinator but not directly asserted:
- **Start condition** (`:93`): `hasNewConquests && hasGeometryDelta` — both required.
- **Teardown** (`:247-253`): once `envelope.progress >= 1`, every piece of transition state is cleared.

---

## 5. Relationship to `ActiveFrontTransition` (LIVE — stays)

`ActiveFrontTransition.ts` (802 lines) is **not being deleted**. Understanding the split matters,
because it determines what is actually lost.

### 5.1 What they share (duplicated, near-identically)

pvFrontline's `planner.ts` contains its **own copies** of `ActiveFrontTransition`'s helpers, with the
same names and near-identical bodies:

| Helper | pvFrontline | ActiveFrontTransition | Difference |
|---|---|---|---|
| `distance` | `planner.ts:37-39` | `:596-598` | none |
| `findStableAnchors` | `planner.ts:49-60` | `:193-209` | pvFrontline hardcodes eps = 2; AFT takes `changeEps` as a parameter (default 2) |
| `buildChainsBetweenAnchors` | `planner.ts:101-160` | `:215-279` | AFT additionally records `sectionSpans` and `sectionReversed` per chain |
| `normalizeChainOrder` | `planner.ts:82-99` | `:281-298` | none |
| `getOrientedSectionPoints` | `planner.ts:66-71` | `:332-343` | AFT deep-copies the reversed points; pvFrontline uses `[...].reverse()` |
| `appendPolyline` | `planner.ts:73-80` | `:349-360` | none |
| `groupChainsByAnchorPair` | `planner.ts:162-171` | `:366-375` | none |
| split-mode detection | `splitModeFromCounts`, `planner.ts:173-178` | `detectSplitMode`, `:377-382` | **AFT returns `'none'` for 1↔1; pvFrontline returns `'1to1'`.** Same meaning, different label. |
| arc-length polyline sampling | `samplePolylineAtNormalizedLength`, `planner.ts:215-239` | `samplePolylineAtParam` + `buildArcLengthTable`, `:676-708` | **AFT throws on empty input; pvFrontline returns `[0,0]`** — see §8, D2 |

This is straight duplication, ~120 lines of it. Steps 1–3 of §2 are computed **twice per conquest** —
once by `collectTransitionFronts` for the diagnostics, once by `planActiveFrontTransition` for the
pixels.

### 5.2 What pvFrontline adds on top

1. **PRE/POST *snapshot* pairing rather than *topology* pairing.** `planActiveFrontTransition` takes two
   `FrontierTopology` objects. pvFrontline takes two whole `GeometrySnapshot`s and keeps them, which is
   what makes the exact-endpoint branches possible (`sampler.ts:98-101`) — you need the PRE map's
   **regions**, not just its border graph, to hand back a bit-exact q=0 frame.
2. **Endpoint exactness + safe fallback** (§2.8). AFT's sampler always rebuilds regions from loops; it
   has no "just hand back the original" path. pvFrontline's `t <= 1e-6` / `t >= 1-1e-6` shortcuts are a
   real addition.
3. **The verification harness** — `frameMatchesGeometry` (`sampler.ts:49-79`) and the per-sample
   `matchesPreGeometry` / `matchesPostGeometry` booleans. AFT has none. This turns "the transition
   starts where it should" from an assumption into a checked fact.
4. **The four-stage typed diagnostics bundle** — ownership → geometry → transition planning → frame
   evaluation, each stamped with the frozen tunables, each with a typed summary. This is the "one
   bundle explains the whole conquest" observability model.
5. **Frozen tunables** (`planner.ts:355-357`, 422).
6. **Explicit `1to1` labelling** where AFT says `'none'`, plus `transitionPairs` naming the chain→chain
   assignment (never consumed, §2.6).
7. **`unaffectedLoopIds`** (never consumed beyond a count).

### 5.3 What `ActiveFrontTransition` has that pvFrontline does **not**

This list is why AFT is the real engine:

- **`lerpArcAligned`** (`:546-566`) — the correct arc-length-parameterised morph (§3.3).
- **Change-span detection** (`findChangeSpan`, `:413-434`) — within a *single* chain, find the index
  range whose points are further than `eps` from the other polyline, and mark only the **sections
  overlapping that span** as active (`buildSectionSpans`, `:440-493`). pvFrontline's `chainsChanged`
  (`:194-205`) is all-or-nothing per chain; AFT localises the animation **within** a chain. Strictly
  finer-grained.
- **Split/merge geometry**, not just labels:
  - `splitByNearest` (`:568-583`) — for `1to2`, halve the PRE chain and assign each half to whichever
    POST chain it is on average nearer to (`averageDistanceToPolyline`).
  - `mergeByNearest` (`:585-590`) — for `2to1`, project every point of **both** PRE chains onto the POST
    chain (`projectPointToPolyline`, `:632-663`, which returns an arc-length `param`), then **sort the
    combined set by that param**. Two separate borders are thereby woven into one ordered polyline
    before the lerp. Elegant, and it is the part pvFrontline's `transitionPairs` only gestures at.
- **Section-level output + loop rebuilding** (`sampleActiveFrontTransition`, `:133-187`) — it writes
  interpolated points back per **section**, then rebuilds each region by walking the POST topology's
  **loops** (`rebuildLoopPointsFromGeometry`, `:788-801`). Because neighbouring regions read the *same*
  interpolated section, **shared borders cannot gap or overlap** — the frame is watertight by
  construction. This is a major property pvFrontline does not have and does not need, because it never
  builds regions itself.
- **Collapse targets** (`planCollapseTargets`, `:718-763`; `collapseLoopToPoint`, `:776-786`) — when a
  loop present in PRE has no counterpart in POST (a territory was **wiped out**), match it to the
  conquest event whose star is nearest its centroid, and shrink it toward that star:
  `out[i] = center + (1 - t) * (p[i] - center)`. So an eliminated pocket **implodes onto the star that
  took it** rather than vanishing. pvFrontline has no equivalent — it inherits this only by delegation.
- **The `[0,0]` guards** (`:548-556`, `:692-696`) with their hard-won comments (§8, D2).

**Summary of the relationship:** `ActiveFrontTransition` is the engine. pvFrontline is a **harness**
around it — snapshot pairing, exact endpoints, a self-verifying frame check, and a diagnostics bundle —
which *additionally* recomputes a weaker copy of the engine's own front analysis for reporting purposes.

---

## 6. Why it is unwired — what the history actually says

The history **does** say. This is not speculation; each claim below has a command and an artefact.

### 6.1 It was never "turned off" — its host was deleted out from under it

```
$ git log --oneline -S 'new TransitionLayerCoordinator' -- pax-fluxia/src
634da8eed chore(cleanup): Stage 7 — delete the quarantine (217 files, 57,782 lines)
b6b7bdbb5 Agents f--d up hard and missed many commits. ...
6c3c13b06 scaffold: add territory clean architecture layer framework
```

```
$ git grep -l 'new TransitionLayerCoordinator' 634da8eed^ -- pax-fluxia/src
634da8eed^:pax-fluxia/src/lib/_quarantine/runtime/TerritoryRuntimeCoordinator.ts
634da8eed^:pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.test.ts
```

**The only non-test consumer, ever, was `_quarantine/runtime/TerritoryRuntimeCoordinator.ts`** — the
PVV4 / `power_voronoi_runtime` pipeline. Its own history:

```
$ git log --oneline --follow -- pax-fluxia/src/lib/_quarantine/runtime/TerritoryRuntimeCoordinator.ts
634da8eed chore(cleanup): Stage 7 — delete the quarantine (217 files, 57,782 lines)
6b91592d4 refactor(territory): Stage 3C-2 — quarantine the legacy render cluster (~24.7k LOC)
...
6c3c13b06 scaffold: add territory clean architecture layer framework
```

Timeline:
1. **`6c3c13b06`** — `TransitionLayerCoordinator` and its host are created together as the "territory
   clean architecture layer framework".
2. **`6b91592d4` (Stage 3C-2)** — the host is **quarantined** into `src/lib/_quarantine/` along with the
   rest of the legacy render cluster (~24.7k LOC), and excluded from tsconfig + vitest. **From this
   commit on, nothing live could reach pvFrontline.**
3. **`634da8eed` (Stage 7)** — the quarantine is **deleted**. Its message names the casualty explicitly:
   > "the three retired runtime pipelines (territory_engine orchestrator + fg2SeedGraph,
   > territory_runtime layers/ worker pipeline, **power_voronoi_runtime**)"

### 6.2 Why pvFrontline survived the deletion that killed its host

The cleanup master plan records the mechanism directly
(`.agent/docs/plans/2026-07-13/2026-07-13_COMPLETE_CODEBASE_CLEANUP_MASTER_PLAN.md:199-202`):

> "The move surfaced HIDDEN shared files via relative imports (moved out then back): **territory/layers/\*\*
> (kept — buildFamilyGeometry/adapters/pvFrontline/devtools)**, integration/TerritorySettingsBridge …
> LESSON: before a bulk move, resolve the TRANSITIVE import graph including RELATIVE imports (`../x`) —
> a name/substring grep misses them and causes move-then-move-back churn."

So during Stage 3C-2, `territory/layers/**` and `pvFrontline` were **moved into the quarantine and then
moved back out**, because the transitive import graph still tied them to kept code. They were left at
their live paths. When Stage 7 deleted everything *under* `_quarantine/`, pvFrontline — sitting outside
it — was untouched, and its consumer was not. **It is orphaned by path accident, not by a decision that
the technique was bad.** No commit anywhere says "this doesn't work" or "revert this".

Note the contrast with the *other* transition path: `unified_topology` / `active_front` was disabled and
re-enabled repeatedly with explicit verdicts — `1d6b95c66` *"HOTFIX: disable topology transition path —
produces malformed fills + perf regression"*, `c88dc66a6` *"revert: disable topology path — lag spikes +
broken fills, needs investigation"*, `521d2eb87` *"feat: enable section-based topology transition path"*.
**pvFrontline never received such a verdict.** It has no recorded failure. It simply lost its host.

### 6.3 It *was* fully wired once — and the wiring is the best idea in the subsystem

From the deleted host, `634da8eed^:pax-fluxia/src/lib/_quarantine/runtime/TerritoryRuntimeCoordinator.ts:97-116`:

```ts
const resolvedPowerVoronoiPair =
    selection.fillTransitionMode === 'pv_frontline' &&
    ownership.conquestEvents.length > 0 &&
    this.state.previousOwnership
        ? {
              preGeometry: this.worker.computeGeometrySync({
                  requestId: `territory:pv-prev:${input.tickId}:${input.nowMs}`,
                  nowMs: input.nowMs,
                  stars: input.stars,
                  lanes: input.lanes,
                  world: input.world,
                  tunables: input.tunables,
                  ownership: this.state.previousOwnership,
                  selection,
                  previousGeometry: this.state.previousGeometry,
              }).geometry,
              postGeometry: geometry,
              previousOwnership: this.state.previousOwnership,
              nextOwnership: ownership,
          }
        : null;
```

**Read what this does.** On the conquest tick, it does **not** reuse last frame's cached geometry as the
PRE map. It **synchronously recomputes the PRE map from scratch** — same `stars`, same `lanes`, same
`world`, same **current** `tunables` — changing exactly **one** input: `ownership` is set to
`this.state.previousOwnership`.

The consequence is the whole point: **PRE and POST differ by the conquest and by nothing else.** No
tunable drift, no star movement, no resolution change contaminating the pair. Last frame's cached
geometry would have been computed with *older* tunables and *older* star positions, so morphing toward
the new map would animate a mixture of "the star changed hands" and "you nudged a slider three frames
ago" — and the border would visibly lurch for reasons unrelated to the conquest.

This is the same concern as the coordinator's `transitionPrevTopology` (pinned by identity in
`TransitionLayerCoordinator.test.ts:69`): freeze the PRE side and sample against it for the whole
transition, rather than chasing a moving `previousGeometry`.

**The cost:** a synchronous, full geometry recompute on the conquest frame — the exact shape of hazard
the history records as *"lag spikes"* (`c88dc66a6`) for the neighbouring topology path. Whether this
ever caused a hitch is **not recorded anywhere I can find**; I am flagging it as an obvious risk, not
reporting a measured one.

### 6.4 Drift left behind — flagging, not fixing

The migration away from `pv_frontline` is half-done, and the leftovers are live:

- `src/lib/components/ui/settings/ControlsSection-Territory.svelte:356-360`:
  ```ts
  // Persisted-panel migration: pv_frontline belonged to the quarantined
  // PVV4 runtime; no kept mode can play it.
  if (resolveActiveFillTransitionId() === "pv_frontline") {
      selectFrontierTransition("active_front");
  }
  ```
  Same migration in `src/lib/territory/ui/territoryModeShortcuts.ts:46-49`. So the UI **actively
  rewrites** saved `pv_frontline` selections to `active_front` — an explicit in-code statement that
  nothing can play this mode.

- **But it is still the default in two places:**
  - `src/lib/config/territory.config.ts:15` — `TERRITORY_FILL_TRANSITION_MODE: 'pv_frontline' as const`
  - `src/lib/territory/contracts/TerritoryModeSelection.ts:36` — `DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode: 'pv_frontline'`
  - and `src/lib/territory/integration/TerritorySettingsBridge.ts:36` still resolves the string, with
    `TerritorySettingsBridge.test.ts:25-29` pinning that it does.

  **Two live defaults point at a mode that, by the code's own comment, "no kept mode can play".** They
  are presumably harmless today (the UI migration catches it, and the only consumer is gone), but they
  are drift and they will confuse the next reader. Not touching them in this read-only pass — flagged
  for the campaign's follow-up list.

- `src/lib/territory/contracts/DiagnosticsContracts.ts:1` imports `PowerVoronoiDiagnosticBundle` from
  `pvFrontline/contracts`, and `devtools/TransitionDiagnosticsAdapters.ts:2` does likewise. **This is why
  `contracts.ts` is LIVE and is not being deleted** — the diagnostics bundle *type* outlived the code
  that produced it. `TransitionDiagnosticsAdapters.test.ts` still calls
  `buildPowerVoronoiFrontlineRuntime` to manufacture a bundle for its assertions, so deleting
  `planner.ts` will require that test to be reworked or dropped.

---

## 7. If you rebuild this

### 7.1 Keep — the ideas worth carrying forward

1. **★ Recompute the PRE map with only ownership changed (§6.3).** The single most valuable idea here,
   and the one that dies with the code. Any conquest morph — vector, sweep, or otherwise — that pairs
   "the new map" with "whatever geometry happened to be cached last frame" is animating a mixture of the
   conquest and unrelated drift. Isolate the variable. If the synchronous recompute is too expensive,
   the *principle* still stands: the PRE side must be the map that the current inputs would have
   produced under the old ownership.
2. **★ Arc-length reparameterisation instead of vertex correspondence (§3).** Interpolate **curves**,
   not vertices. Take the target polyline's vertices as authoritative and *resample* the source at
   matching arc-length fractions. Use `lerpArcAligned`'s formula (`ActiveFrontTransition.ts:546-566`),
   **not** pvFrontline's (§8 D1).
3. **★ Anchors make the problem local.** Same-id + same-kind + moved ≤ ε ⇒ a pin. Chains between pins are
   the animation unit. Identity comes from the topology compiler's stable vertex ids — geometry never
   has to answer "which vertex is which".
4. **★ Canonical chain keys** (`normalizeChainOrder`) — sort the endpoint ids and reverse if needed, so
   a chain has one identity regardless of walk direction. Cheap, and it is what lets PRE and POST chains
   pair up with zero geometric comparison.
5. **★ Exact endpoints, verified.** `q≈0 ⇒ hand back the PRE map verbatim; q≈1 ⇒ the POST map verbatim`,
   plus `frameMatchesGeometry` to **prove** it rather than trust it. Cheap insurance against a whole
   family of "the map twitches at the start of every conquest" bugs.
6. **★ Cancel on a conquest-less geometry change** (§4.2 test 2, and commit `3e3610b5f`). If the user
   moves a slider mid-conquest, obey the slider now.
7. **★ One envelope, N fronts** (§4.1 test 4). Every moving border on one clock ⇒ one coherent map per
   frame.
8. **Frozen tunables in diagnostics.** Evaluate a transition against the knobs it was planned with.
9. **Deterministic sorted iteration everywhere.** Comparability of two independent walks depends on it
   entirely.
10. **From `ActiveFrontTransition` specifically** (which stays, but note it): `mergeByNearest`'s
    project-then-sort-by-arc-param weave (`:585-590`), the change-span localisation *within* a chain
    (`:413-434`), the section-level write-back that makes shared borders watertight by construction
    (`:133-187`), and `collapseLoopToPoint`'s implode-onto-the-capturing-star (`:776-786`).

### 7.2 What the author got right

- **Correctly identified the real problem** and refused the naive answer. The design history says
  vertex-correspondence lerp was never reliable; this code never attempts a correspondence *search*. It
  makes the question go away by reparameterising. That is the right instinct.
- **Anchors → chains → per-chain morph** is a sound decomposition, and it degrades gracefully: the parts
  it can't classify are skipped, not mangled.
- **Endpoint exactness as a checked invariant, not an assumption.** `frameMatchesGeometry` is a real
  geometric comparison, and the test asserts the `false` cases too, so it cannot pass vacuously. This is
  better discipline than most of the surrounding code.
- **The `matchesPre/matchesPost` booleans on every sample** turn the diagnostics bundle into something
  that can *fail loudly*. Good instinct.
- **The safe-snap fallback** (`sampler.ts:109`): when planning finds no fronts, snap rather than render
  something wrong. Degrading to the known-acceptable old behaviour beats a plausible-looking artefact.
- **Deterministic sorting** throughout, with the reason implicitly correct.
- **`planId` keyed by the two geometry versions** rather than a counter — replayable and diffable.
- **The recomputed PRE pair.** Worth saying twice.

### 7.3 Defects and limitations found in the code

**D1 — `buildTransitionVertices` uses the *index* fraction, not the *arc-length* fraction.**
`planner.ts:250`:
```ts
const u = count <= 1 ? 0 : index / (count - 1);
```
`u` should be POST vertex *i*'s fractional distance **along the POST chain**; instead it is *i*'s
fractional position in the POST **array**. These agree only if the POST chain's vertices are evenly
spaced by distance. Resampled power-Voronoi frontiers generally are **not** — vertex density follows
curvature and section boundaries. Where POST vertices bunch up, the corresponding PRE samples get spread
out (and vice versa), so the manufactured correspondence **slides along the chain** relative to the
truth, and the morph shears. The live `lerpArcAligned` computes
`u = nextTable.cumulative[i] / nextTable.total` (`ActiveFrontTransition.ts:561`) — the correct form.
**pvFrontline's copy of the technique is worse than the original it delegates to.** No test would catch
this (§4.1, no intermediate-q assertions).

**D2 — `samplePolylineAtNormalizedLength` can return a synthetic `[0,0]`.** `planner.ts:216`:
```ts
if (points.length <= 1) return (points[0] ?? [0, 0]) as Vec2;
```
`ActiveFrontTransition` treats this exact case as serious enough to **throw**, with a comment recording
the bug it caused (`:692-696`):
> "Never return a synthetic [0,0] — callers may use this as t=0 vertex position and map origin reads as
> top-left in screen space."

and again at `:548-556`, where an empty PRE chain falls back to `next` rather than injecting an origin:
> "sampling an empty prev used to return [0,0] per sample → vertices pile at world origin (top-left),
> then lerp toward real positions."

**pvFrontline reintroduces the exact footgun that AFT documents having been burned by.** An empty PRE
reference (reachable: `prevChains[0]?.points ?? []`, `planner.ts:246`) yields every `prePoint` at the
world origin. Today that only corrupts diagnostics; in a rebuild that renders these points, it is a
"borders fly in from the top-left corner" bug. **Port AFT's guard, not pvFrontline's.**

**D3 — `unaffectedLoopIds` uses substring matching on owner ids.** `planner.ts:420`:
```ts
.filter((loop) => !fronts.some((front) => front.ownerPairKey.includes(loop.ownerId)))
```
`ownerPairKey` is `"blue|red"`; testing `.includes(loop.ownerId)` is a substring test, so an owner id
that is a substring of another (`"red"` vs `"red2"`, or an id containing `|`) produces false positives.
Should split on `|` and compare exactly. Same class of bug in `isWorldOwnerPair` (`planner.ts:180-182`),
which will misfire on any owner id containing the letters "world". Low impact today (nothing consumes
`unaffectedLoopIds`), real in a rebuild.

**D4 — the front analysis is computed twice per conquest.** `collectTransitionFronts` and
`planActiveFrontTransition` both run steps 1–3 of §2 over the same two topologies (`planner.ts:409-418`),
via ~120 lines of duplicated helpers (§5.1). One of them feeds pixels; the other feeds a diagnostics
panel. On a conquest frame that is double work on top of D5's full geometry recompute.

**D5 — the pairing requires a synchronous full geometry recompute on the conquest frame** (§6.3). The
correctness argument is strong; the cost is a hitch risk on the one frame that most needs to be smooth.
Not measured — see §6.3. A rebuild should either compute the PRE map off the critical path (it depends
only on inputs known *before* the conquest resolves — it could be computed speculatively on the previous
tick) or cache it.

**D6 — `transitionPairs` and `unaffectedLoopIds` are dead outputs.** Nothing reads either (§2.6, §2.7).
`transitionPairs` in particular *looks* like the split/merge solution but contains no geometry — the
real split/merge work is AFT's `splitByNearest` / `mergeByNearest`. A reader could easily mistake the
labels for the mechanism. **Don't rebuild the labels without the mechanism.**

**D7 — only 1to1 / 1to2 / 2to1 are handled; everything else is silently dropped.**
`splitModeFromCounts` returns `null` for any other count pair and the front is skipped
(`planner.ts:285-286`), as is any anchor pair present on only one side (`:283`). A conquest producing a
1→3 split, or one that destroys an anchor, animates **nothing** for that stretch of border — it snaps
while its neighbours slide. AFT has the same limitation (`:83-96`), where the gap is at least marked
*"Topology gap — skip until diagnostics/logging added"*. pvFrontline's skips are silent. **A rebuild
should log or count these**, because "some borders snapped while others slid" is exactly the sort of
artefact that is maddening to diagnose from a screenshot.

**D8 — split-mode counting is topology-blind.** Classification is `prevChains.length` vs
`nextChains.length` for one anchor pair. It cannot distinguish "one border split in two" from "the walk
happened to segment this anchor pair differently in PRE and POST" — the greedy sorted walk (§2.3) is a
heuristic, and its output depends on section ids. Note the territory guardrails' recorded caution about
*"classification must be by construction"*; this classification is by counting. It is worth checking
against that principle before rebuilding on it.

### 7.4 The honest verdict

**Worth rebuilding: the ideas, not the code.** Specifically §7.1 items 1, 2 and 5 — the recomputed-PRE
pairing, the arc-length reparameterisation, and the verified exact endpoints. The first of those exists
nowhere else and is the reason to have read this file.

**Not worth rebuilding:** pvFrontline's `collectTransitionFronts` / `transitionVertices` /
`transitionPairs` as such. They are a duplicated, slightly-degraded (D1, D2) copy of an engine that is
staying in the tree, wired to an output that never reached the screen.

**The thing to be clear-eyed about:** this subsystem is *not* the lost answer to the vector-morph
problem. The answer it embodies — anchors + arc-length reparameterisation — is **already in the tree and
already live** in `ActiveFrontTransition.ts`, which is not being deleted. What the deletion actually
costs is (a) the recomputed-PRE pairing idea, (b) the endpoint-verification harness, and (c) the
four-stage diagnostics model. All three are captured above.

---

## 8. Defect index (quick reference)

| ID | Severity | Where | Summary |
|---|---|---|---|
| D1 | **High** (in a rebuild) | `planner.ts:250` | `u = index/(count-1)` is the index fraction, not the arc-length fraction. Shears the morph. AFT gets it right at `:561`. |
| D2 | **High** (in a rebuild) | `planner.ts:216` | Returns synthetic `[0,0]` on empty input — the exact footgun AFT documents having been burned by (`:692-696`). |
| D3 | Low | `planner.ts:420`, `:180-182` | Substring matching on owner ids / `'world'`. |
| D4 | Medium (perf) | `planner.ts:409-418` | Front analysis computed twice per conquest; ~120 lines duplicated. |
| D5 | Medium (perf) | deleted host `:102-112` | Synchronous full geometry recompute on the conquest frame. Correct but risky; unmeasured. |
| D6 | Low (clarity) | `planner.ts:299-337`, `:419-421` | `transitionPairs` / `unaffectedLoopIds` are dead outputs that look like mechanisms. |
| D7 | Medium | `planner.ts:283`, `:285-286` | Unhandled topology cases skipped **silently** ⇒ some borders snap while neighbours slide. |
| D8 | Medium (design) | `planner.ts:173-178` | Split mode classified by chain *counting*, not by construction. |

---

## 9. Provenance

| Fact | Evidence |
|---|---|
| Only ever consumer was the quarantined PVV4 runtime | `git grep -l 'new TransitionLayerCoordinator' 634da8eed^ -- pax-fluxia/src` |
| Host quarantined at Stage 3C-2 | `6b91592d4` |
| Host deleted at Stage 7; `power_voronoi_runtime` named as retired | `634da8eed` commit message |
| pvFrontline deliberately kept out of the quarantine (import-graph churn) | cleanup master plan `:199-202` |
| "no kept mode can play it" | `ControlsSection-Territory.svelte:356-357`, `territoryModeShortcuts.ts:46-48` |
| Still the config default (drift) | `territory.config.ts:15`, `TerritoryModeSelection.ts:36` |
| `contracts.ts` stays LIVE | `DiagnosticsContracts.ts:1`, `devtools/TransitionDiagnosticsAdapters.ts:2` |
| Cancel-on-retune rationale | `3e3610b5f` |
| Neighbouring topology path's recorded failures (pvFrontline has none) | `1d6b95c66`, `c88dc66a6`, `521d2eb87` |
| Recovery of any deleted file | `git checkout e48b1f458 -- <path>` (per Stage 7 message) |

**Recovering the code described here after its deletion:** it is deleted in a *later* commit than the
quarantine, so use the commit before that deletion. As of writing, the files are still present at
`master` = `3cbbb7012`:

```
git show 3cbbb7012:pax-fluxia/src/lib/territory/pvFrontline/planner.ts
git show 3cbbb7012:pax-fluxia/src/lib/territory/pvFrontline/sampler.ts
git show 3cbbb7012:pax-fluxia/src/lib/territory/pvFrontline/planner.test.ts
git show 3cbbb7012:pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts
```

The deleted host with the recomputed-PRE pairing (§6.3):
```
git show 634da8eed^:pax-fluxia/src/lib/_quarantine/runtime/TerritoryRuntimeCoordinator.ts
```

---
---

# VERBATIM SOURCE SNAPSHOTS

The atlas convention is verbatim snapshots under `geometry-atlas/code/`. Per the IP-absorption brief
these are inline here instead, so the technique and its source travel together.

Captured from `master` = `3cbbb7012`, 2026-07-14. Reproduced exactly, including comments and formatting.

## 9.1 `src/lib/territory/pvFrontline/planner.ts` (500 lines)

```ts
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
} from '../contracts/FrontierTopologyContracts';
import {
    planActiveFrontTransition,
    type ActiveFrontTransitionPlan,
} from '../layers/transition/ActiveFrontTransition';
import type {
    PowerVoronoiFrontlineRuntime,
    PowerVoronoiDiagnosticBundle,
    PowerVoronoiFrontChain,
    PowerVoronoiFrontSplitMode,
    PowerVoronoiTransitionAnchor,
    PowerVoronoiTransitionFront,
    PowerVoronoiTransitionPair,
    PowerVoronoiTransitionPlan,
    PowerVoronoiTransitionVertex,
} from './contracts';

type Vec2 = [number, number];

interface ChainPath {
    anchorStartId: string;
    anchorEndId: string;
    ownerPairKey: string;
    sectionIds: string[];
    points: Vec2[];
}

const ANCHOR_EPSILON = 2;

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function isStableAnchorKind(kind: FrontierVertex['kind']): boolean {
    return (
        kind === 'junction_3way' ||
        kind === 'world_intersection' ||
        kind === 'world_corner'
    );
}

function findStableAnchors(prev: FrontierTopology, next: FrontierTopology): Set<string> {
    const anchors = new Set<string>();
    for (const [vertexId, prevVertex] of prev.vertices) {
        if (!isStableAnchorKind(prevVertex.kind)) continue;
        const nextVertex = next.vertices.get(vertexId);
        if (!nextVertex || !isStableAnchorKind(nextVertex.kind)) continue;
        if (distance(prevVertex.point, nextVertex.point) <= ANCHOR_EPSILON) {
            anchors.add(vertexId);
        }
    }
    return anchors;
}

function otherVertex(section: FrontierSection, vertexId: string): string {
    return section.startVertexId === vertexId ? section.endVertexId : section.startVertexId;
}

function getOrientedSectionPoints(section: FrontierSection, fromVertexId: string): Vec2[] {
    if (section.startVertexId === fromVertexId) {
        return section.points as Vec2[];
    }
    return [...section.points].reverse() as Vec2[];
}

function appendPolyline(out: Vec2[], segment: readonly Vec2[]): void {
    if (segment.length === 0) return;
    const shouldSkipFirst =
        out.length > 0 && distance(out[out.length - 1], segment[0]) <= 1e-3;
    for (let index = shouldSkipFirst ? 1 : 0; index < segment.length; index += 1) {
        out.push(segment[index]);
    }
}

function normalizeChainOrder(
    sectionIds: string[],
    anchorStartId: string,
    anchorEndId: string,
): {
    orderedSectionIds: string[];
    anchorStartId: string;
    anchorEndId: string;
} {
    if (anchorStartId <= anchorEndId) {
        return { orderedSectionIds: sectionIds, anchorStartId, anchorEndId };
    }
    return {
        orderedSectionIds: [...sectionIds].reverse(),
        anchorStartId: anchorEndId,
        anchorEndId: anchorStartId,
    };
}

function buildChainsBetweenAnchors(topo: FrontierTopology, anchors: Set<string>): ChainPath[] {
    const unusedSections = new Set<string>([...topo.sections.keys()]);
    const chains: ChainPath[] = [];

    for (const anchorId of [...anchors].sort()) {
        const incident = [...(topo.sectionsByVertex.get(anchorId) ?? [])].sort();
        for (const sectionId of incident) {
            if (!unusedSections.has(sectionId)) continue;

            const chainSectionIds: string[] = [];
            let currentVertex = anchorId;
            let previousSectionId: string | null = null;

            while (true) {
                const candidates = (topo.sectionsByVertex.get(currentVertex) ?? [])
                    .filter((candidate) => candidate !== previousSectionId && unusedSections.has(candidate))
                    .sort();
                if (candidates.length === 0) break;

                const nextSectionId = candidates[0];
                const section = topo.sections.get(nextSectionId);
                if (!section) break;

                unusedSections.delete(nextSectionId);
                chainSectionIds.push(nextSectionId);
                previousSectionId = nextSectionId;
                currentVertex = otherVertex(section, currentVertex);
                if (anchors.has(currentVertex)) break;
            }

            if (chainSectionIds.length === 0) continue;

            const ordered = normalizeChainOrder(
                chainSectionIds,
                anchorId,
                currentVertex,
            );
            const points: Vec2[] = [];
            let walkVertex = ordered.anchorStartId;
            for (const orderedSectionId of ordered.orderedSectionIds) {
                const section = topo.sections.get(orderedSectionId);
                if (!section) continue;
                appendPolyline(points, getOrientedSectionPoints(section, walkVertex));
                walkVertex = otherVertex(section, walkVertex);
            }

            const ownerPairKey =
                topo.sections.get(ordered.orderedSectionIds[0])?.ownerPairKey ?? 'unknown';
            chains.push({
                anchorStartId: ordered.anchorStartId,
                anchorEndId: ordered.anchorEndId,
                ownerPairKey,
                sectionIds: ordered.orderedSectionIds,
                points,
            });
        }
    }

    return chains;
}

function groupChainsByAnchorPair(chains: readonly ChainPath[]): Map<string, ChainPath[]> {
    const grouped = new Map<string, ChainPath[]>();
    for (const chain of chains) {
        const key = `${chain.anchorStartId}|${chain.anchorEndId}`;
        const bucket = grouped.get(key);
        if (bucket) bucket.push(chain);
        else grouped.set(key, [chain]);
    }
    return grouped;
}

function splitModeFromCounts(prevCount: number, nextCount: number): PowerVoronoiFrontSplitMode | null {
    if (prevCount === 1 && nextCount === 1) return '1to1';
    if (prevCount === 1 && nextCount === 2) return '1to2';
    if (prevCount === 2 && nextCount === 1) return '2to1';
    return null;
}

function isWorldOwnerPair(ownerPairKey: string): boolean {
    return ownerPairKey.includes('world') || ownerPairKey.includes('__world__');
}

function pointsEqual(a: readonly Vec2[], b: readonly Vec2[]): boolean {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
        if (distance(a[index], b[index]) > 1e-6) {
            return false;
        }
    }
    return true;
}

function chainsChanged(
    prevChains: readonly ChainPath[],
    nextChains: readonly ChainPath[],
): boolean {
    if (prevChains.length !== nextChains.length) return true;
    for (let index = 0; index < prevChains.length; index += 1) {
        if (!pointsEqual(prevChains[index].points, nextChains[index].points)) {
            return true;
        }
    }
    return false;
}

function buildAnchor(vertex: FrontierVertex | undefined, vertexId: string): PowerVoronoiTransitionAnchor {
    return {
        vertexId,
        point: vertex?.point ?? [0, 0],
        kind: vertex?.kind ?? 'junction_3way',
    };
}

function samplePolylineAtNormalizedLength(points: readonly Vec2[], u: number): Vec2 {
    if (points.length <= 1) return (points[0] ?? [0, 0]) as Vec2;
    const clamped = Math.max(0, Math.min(1, u));
    const lengths: number[] = [0];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
        total += distance(points[index - 1], points[index]);
        lengths[index] = total;
    }
    const target = total * clamped;
    for (let index = 1; index < lengths.length; index += 1) {
        if (lengths[index] < target) continue;
        const previousLength = lengths[index - 1];
        const span = lengths[index] - previousLength;
        if (span <= 0) return points[index];
        const localT = (target - previousLength) / span;
        const a = points[index - 1];
        const b = points[index];
        return [
            a[0] + (b[0] - a[0]) * localT,
            a[1] + (b[1] - a[1]) * localT,
        ];
    }
    return points[points.length - 1];
}

function buildTransitionVertices(
    prevChains: readonly ChainPath[],
    nextChains: readonly ChainPath[],
): PowerVoronoiTransitionVertex[] {
    const vertices: PowerVoronoiTransitionVertex[] = [];
    const prevReference = prevChains[0]?.points ?? [];
    const postReference = nextChains[0]?.points ?? [];
    const count = postReference.length;
    for (let index = 0; index < count; index += 1) {
        const u = count <= 1 ? 0 : index / (count - 1);
        vertices.push({
            vertexId: `transition-vertex:${index}`,
            progressIndex: index,
            prePoint: samplePolylineAtNormalizedLength(prevReference, u),
            postPoint: postReference[index],
        });
    }
    return vertices;
}

function toFrontChain(prefix: string, chain: ChainPath, index: number): PowerVoronoiFrontChain {
    return {
        chainId: `${prefix}:${index}`,
        anchorStartId: chain.anchorStartId,
        anchorEndId: chain.anchorEndId,
        sectionIds: [...chain.sectionIds],
        points: [...chain.points],
    };
}

function collectTransitionFronts(
    prev: FrontierTopology,
    next: FrontierTopology,
): PowerVoronoiTransitionFront[] {
    const anchors = findStableAnchors(prev, next);
    const prevByPair = groupChainsByAnchorPair(buildChainsBetweenAnchors(prev, anchors));
    const nextByPair = groupChainsByAnchorPair(buildChainsBetweenAnchors(next, anchors));
    const fronts: PowerVoronoiTransitionFront[] = [];

    for (const key of new Set<string>([...prevByPair.keys(), ...nextByPair.keys()])) {
        const prevChains = prevByPair.get(key) ?? [];
        const nextChains = nextByPair.get(key) ?? [];
        if (prevChains.length === 0 || nextChains.length === 0) continue;

        const splitMode = splitModeFromCounts(prevChains.length, nextChains.length);
        if (!splitMode) continue;

        const [anchorStartId, anchorEndId] = key.split('|');
        const ownerPairKey = nextChains[0]?.ownerPairKey ?? prevChains[0]?.ownerPairKey ?? 'unknown';
        if (isWorldOwnerPair(ownerPairKey) || !chainsChanged(prevChains, nextChains)) {
            continue;
        }
        const preConquestFront = prevChains.map((chain, index) =>
            toFrontChain(`pre:${ownerPairKey}`, chain, index),
        );
        const postConquestFront = nextChains.map((chain, index) =>
            toFrontChain(`post:${ownerPairKey}`, chain, index),
        );
        const transitionPairs: PowerVoronoiTransitionPair[] =
            splitMode === '1to2'
                ? [
                      {
                          pairId: `${ownerPairKey}:pair:0`,
                          splitMode,
                          preChainId: preConquestFront[0]?.chainId ?? null,
                          postChainId: postConquestFront[0]?.chainId ?? null,
                      },
                      {
                          pairId: `${ownerPairKey}:pair:1`,
                          splitMode,
                          preChainId: preConquestFront[0]?.chainId ?? null,
                          postChainId: postConquestFront[1]?.chainId ?? null,
                      },
                  ]
                : splitMode === '2to1'
                  ? [
                        {
                            pairId: `${ownerPairKey}:pair:0`,
                            splitMode,
                            preChainId: preConquestFront[0]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                        {
                            pairId: `${ownerPairKey}:pair:1`,
                            splitMode,
                            preChainId: preConquestFront[1]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                    ]
                  : [
                        {
                            pairId: `${ownerPairKey}:pair:0`,
                            splitMode,
                            preChainId: preConquestFront[0]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                    ];

        fronts.push({
            frontId: `pv-front:${ownerPairKey}:${anchorStartId}:${anchorEndId}`,
            ownerPairKey,
            splitMode,
            changeAnchorStart: buildAnchor(next.vertices.get(anchorStartId), anchorStartId),
            changeAnchorEnd: buildAnchor(next.vertices.get(anchorEndId), anchorEndId),
            preConquestFront,
            postConquestFront,
            transitionVertices: buildTransitionVertices(prevChains, nextChains),
            transitionPairs,
        });
    }

    return fronts;
}

function cloneTunables(tunables: TerritoryTunables): TerritoryTunables {
    return { ...tunables };
}

function buildOwnershipStageSummary(
    previousOwnership: OwnershipSnapshot,
    nextOwnership: OwnershipSnapshot,
) {
    return {
        previousOwnerCount: previousOwnership.starOwners.size,
        nextOwnerCount: nextOwnership.starOwners.size,
        conquestCount: nextOwnership.conquestEvents.length,
        conquestStarIds: nextOwnership.conquestEvents.map((event) => event.starId),
    };
}

function buildGeometryStageSummary(
    preGeometry: GeometrySnapshot,
    postGeometry: GeometrySnapshot,
) {
    return {
        preRegionCount: preGeometry.territoryRegions.length,
        postRegionCount: postGeometry.territoryRegions.length,
        preFrontierCount: preGeometry.frontierPolylines.length,
        postFrontierCount: postGeometry.frontierPolylines.length,
        preLoopCount: preGeometry.frontierTopology.loops.length,
        postLoopCount: postGeometry.frontierTopology.loops.length,
    };
}

function buildTransitionPlanningStageSummary(
    activeFrontPlan: ActiveFrontTransitionPlan,
    fronts: readonly PowerVoronoiTransitionFront[],
    unaffectedLoopIds: readonly string[],
) {
    return {
        transitionFrontCount: fronts.length,
        activeFrontPlanFrontCount: activeFrontPlan.fronts.length,
        transitionPairCount: fronts.reduce(
            (count, front) => count + front.transitionPairs.length,
            0,
        ),
        unaffectedLoopCount: unaffectedLoopIds.length,
        splitModes: [...new Set(fronts.map((front) => front.splitMode))].sort(),
    };
}

export function buildPowerVoronoiFrontlineRuntime(args: {
    preGeometry: GeometrySnapshot;
    postGeometry: GeometrySnapshot;
    previousOwnership: OwnershipSnapshot;
    nextOwnership: OwnershipSnapshot;
    tunables: TerritoryTunables;
}): PowerVoronoiFrontlineRuntime {
    const activeFrontPlan = planActiveFrontTransition(
        args.preGeometry.frontierTopology,
        args.postGeometry.frontierTopology,
        args.nextOwnership,
    );
    const planId = `pv-frontline:${args.preGeometry.version}:${args.postGeometry.version}`;
    const fronts = collectTransitionFronts(
        args.preGeometry.frontierTopology,
        args.postGeometry.frontierTopology,
    );
    const unaffectedLoopIds = args.postGeometry.frontierTopology.loops
        .filter((loop) => !fronts.some((front) => front.ownerPairKey.includes(loop.ownerId)))
        .map((loop) => loop.id);
    const frozenTunables = cloneTunables(args.tunables);
    const ownershipSummary = buildOwnershipStageSummary(
        args.previousOwnership,
        args.nextOwnership,
    );
    const geometrySummary = buildGeometryStageSummary(
        args.preGeometry,
        args.postGeometry,
    );
    const transitionPlan: PowerVoronoiTransitionPlan = {
        kind: 'power_voronoi_runtime',
        planId,
        startGeometryVersion: args.preGeometry.version,
        endGeometryVersion: args.postGeometry.version,
        conquestEvents: args.nextOwnership.conquestEvents,
        fronts,
        frozenTunables,
        unaffectedLoopIds,
    };
    const transitionPlanningSummary = buildTransitionPlanningStageSummary(
        activeFrontPlan as ActiveFrontTransitionPlan,
        fronts,
        unaffectedLoopIds,
    );
    const diagnostics: PowerVoronoiDiagnosticBundle = {
        kind: 'power_voronoi_runtime',
        bundleId: `pv-bundle:${args.nextOwnership.version}:${planId}`,
        modeId: 'power_voronoi_runtime',
        planId,
        tunables: frozenTunables,
        ownershipStage: {
            stage: 'ownership',
            stageId: `${planId}:ownership`,
            tunables: frozenTunables,
            previousOwnership: args.previousOwnership,
            nextOwnership: args.nextOwnership,
            conquestEvents: args.nextOwnership.conquestEvents,
            summary: ownershipSummary,
        },
        geometryStage: {
            stage: 'geometry',
            stageId: `${planId}:geometry`,
            tunables: frozenTunables,
            preGeometry: args.preGeometry,
            postGeometry: args.postGeometry,
            summary: geometrySummary,
        },
        transitionPlanningStage: {
            stage: 'transition_planning',
            stageId: `${planId}:transition_planning`,
            tunables: frozenTunables,
            preTopology: args.preGeometry.frontierTopology,
            postTopology: args.postGeometry.frontierTopology,
            transitionPlan,
            summary: transitionPlanningSummary,
        },
        frameEvaluationStage: {
            stage: 'frame_evaluation',
            stageId: `${planId}:frame_evaluation`,
            tunables: frozenTunables,
            sampledFrames: [],
            currentFrame: null,
            summary: {
                sampledFrameCount: 0,
                lastProgress: null,
                lastFrontlineCount: 0,
            },
        },
    };

    return {
        kind: 'power_voronoi_frontline_runtime',
        preGeometry: args.preGeometry,
        postGeometry: args.postGeometry,
        activeFrontPlan: activeFrontPlan as ActiveFrontTransitionPlan,
        plan: transitionPlan,
        diagnostics,
    };
}
```

## 9.2 `src/lib/territory/pvFrontline/sampler.ts` (133 lines)

```ts
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { FillTransitionFrame } from '../contracts/TransitionContracts';
import { sampleActiveFrontTransition } from '../layers/transition/ActiveFrontTransition';
import type {
    PowerVoronoiFrontlineRuntime,
    PowerVoronoiTransitionFront,
    TransientTransitionFrontline,
} from './contracts';

type Vec2 = [number, number];

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
    ];
}

function buildTransientTransitionFrontline(
    front: PowerVoronoiTransitionFront,
    progress: number,
): TransientTransitionFrontline {
    const points = front.transitionVertices.map((vertex) =>
        lerpPoint(vertex.prePoint, vertex.postPoint, progress),
    );
    return {
        frontId: front.frontId,
        ownerPairKey: front.ownerPairKey,
        splitMode: front.splitMode,
        progress,
        points,
    };
}

function pointsEqual(a: readonly Vec2[], b: readonly Vec2[]): boolean {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
        if (distance(a[index], b[index]) > 1e-6) {
            return false;
        }
    }
    return true;
}

function frameMatchesGeometry(
    fillFrame: FillTransitionFrame,
    geometry: GeometrySnapshot,
): boolean {
    if (fillFrame.regions.length !== geometry.territoryRegions.length) {
        return false;
    }

    const unused = new Set<number>(
        geometry.territoryRegions.map((_region, index) => index),
    );
    for (const frameRegion of fillFrame.regions) {
        let matchedIndex: number | null = null;
        for (const index of unused) {
            const geometryRegion = geometry.territoryRegions[index];
            if (
                geometryRegion.ownerId === frameRegion.ownerId &&
                pointsEqual(geometryRegion.points, frameRegion.points)
            ) {
                matchedIndex = index;
                break;
            }
        }
        if (matchedIndex === null) {
            return false;
        }
        unused.delete(matchedIndex);
    }

    return unused.size === 0;
}

function buildFillFrameFromGeometry(
    geometry: GeometrySnapshot,
): FillTransitionFrame {
    return {
        regions: geometry.territoryRegions.map((region) => ({
            ownerId: region.ownerId,
            points: region.points,
        })),
    };
}

export function samplePowerVoronoiFrontlineTransition(
    runtime: PowerVoronoiFrontlineRuntime,
    progress: number,
): FillTransitionFrame {
    const t = Math.max(0, Math.min(1, progress));
    const fillFrame =
        t <= 1e-6
            ? buildFillFrameFromGeometry(runtime.preGeometry)
            : t >= 1 - 1e-6
              ? buildFillFrameFromGeometry(runtime.postGeometry)
              : runtime.activeFrontPlan.fronts.length > 0
            ? sampleActiveFrontTransition(
                  runtime.activeFrontPlan,
                  runtime.preGeometry.frontierTopology,
                  runtime.postGeometry.frontierTopology,
                  t,
              )
            : buildFillFrameFromGeometry(runtime.postGeometry);
    const transientFrontlines = runtime.plan.fronts.map((front) =>
        buildTransientTransitionFrontline(front, t),
    );
    const sampledFrame = {
        sampleId: `${runtime.plan.planId}:sample:${String(
            runtime.diagnostics.frameEvaluationStage.sampledFrames.length,
        ).padStart(2, '0')}`,
        progress: t,
        regions: fillFrame.regions.length,
        transientFrontlines,
        matchesPreGeometry: frameMatchesGeometry(fillFrame, runtime.preGeometry),
        matchesPostGeometry: frameMatchesGeometry(fillFrame, runtime.postGeometry),
    };

    runtime.diagnostics.frameEvaluationStage.currentFrame = fillFrame;
    runtime.diagnostics.frameEvaluationStage.sampledFrames.push(sampledFrame);
    runtime.diagnostics.frameEvaluationStage.summary = {
        sampledFrameCount: runtime.diagnostics.frameEvaluationStage.sampledFrames.length,
        lastProgress: t,
        lastFrontlineCount: transientFrontlines.length,
    };

    return fillFrame;
}
```

## 9.3 `SharedTransitionClock.ts` (27 lines) — included; it is small and it defines q

```ts
import type { TransitionEnvelope } from '../../contracts/TransitionContracts';

export class SharedTransitionClock {
    buildEnvelope(
        transitionId: string,
        startedAtMs: number,
        durationMs: number,
        conquestEvents: TransitionEnvelope['conquestEvents'],
    ): TransitionEnvelope {
        return {
            transitionId,
            startedAtMs,
            durationMs,
            progress: durationMs <= 0 ? 1 : 0,
            conquestEvents,
        };
    }

    sampleProgress(envelope: TransitionEnvelope, nowMs: number): number {
        if (envelope.durationMs <= 0) {
            return 1;
        }

        const elapsed = Math.max(0, nowMs - envelope.startedAtMs);
        return Math.min(1, elapsed / envelope.durationMs);
    }
}
```

**Note on the clock:** `q = min(1, (nowMs - startedAtMs) / durationMs)` — **strictly linear in wall-clock
time, no easing.** `durationMs` comes from `tunables.transitionDurationMs` (600ms in the test fixture).
A `durationMs <= 0` means "instant" and yields q = 1 immediately. Any easing would have to be applied by
the sampler, and none is — so a rebuilt version wanting an ease-in/out curve must add it, and should add
it in one place so that all fronts on the shared envelope stay in lockstep (§7.1 item 7).
