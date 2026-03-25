<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Ok, please take all I've provided and prompted, and produce the full plan for my agent to implement. Of course, token-counts matter - the shorter the better for agentic performance - so make it as concise as possible while stil being explicit about what needs to be done.

Here is a concise, implementation-ready plan for your agent, tuned for short prompts but explicit responsibilities.

***

## 1. High-level goals

- Replace generic polygon morphing with **local boundary patch replacement**: unchanged arcs stay bitwise-identical, only the changed arc near `changedSiteIds` animates.
- Make Geometry emit a **transition-ready boundary snapshot** (rings, spans, provenance), not just fills.
- Make Transition a pure function from `(prev, next, changedSiteIds, stars, duration, easing)` → `transitionPlan`, and from `(transitionPlan, t)` → `frameGeometry`.
- Make Presentation render **both fills and borders from the same per-frame ring geometry**.

***

## 2. New files and their roles

Create these new modules with clear contracts:

```txt
src/lib/territory/transition/types.ts
src/lib/territory/transition/buildTerritoryBoundarySnapshots.ts
src/lib/territory/transition/computeTerritoryDeltaContext.ts
src/lib/territory/transition/findRingSpliceWindow.ts
src/lib/territory/transition/buildPatchMorphPlan.ts
src/lib/territory/transition/createTerritoryTransitionPlan.ts
src/lib/territory/transition/sampleTransitionFrame.ts

src/lib/territory/presentation/drawTerritoryFrame.ts
```

Delete (or stop using):

- `PolygonMorphTransitionHandler`
- `buildEvenDistributionTargets()`

***

## 3. New core types (minimal, focused)

`src/lib/territory/transition/types.ts`:

```ts
export interface Vec2 { x: number; y: number; }

export interface BoundarySpan {
  spanId: string;
  startSample: number;      // inclusive
  endSample: number;        // exclusive
  leftOwnerId: string;
  rightOwnerId: string | null;  // 'world' for world-border
  sharedKey?: string;           // e.g. ownerPairKey or edgeKey group
}

export interface BoundaryRingSnapshot {
  ringId: string;
  kind: 'outer' | 'hole';
  points: Vec2[];
  cumulativeLengths: number[];
  spans: BoundarySpan[];
}

export interface TerritoryBoundarySnapshot {
  territoryId: string;
  ownerId: string;
  starIds: string[];
  rings: BoundaryRingSnapshot[];
  fingerprint: string;
}

export interface TerritoryDeltaContext {
  changedSiteIds: Set<string>;
  affectedTerritoryIds: Set<string>;
}

export interface RingSpliceWindow {
  ringId: string;
  anchorStartPrev: number;
  anchorEndPrev: number;
  anchorStartNext: number;
  anchorEndNext: number;
  changedPrevRange: [number, number] | null; // sample indices
  changedNextRange: [number, number] | null;
}

export interface PatchMorphPlan {
  ringId: string;
  anchorA: Vec2;
  anchorB: Vec2;
  fromSamples: Vec2[];   // changed arc prev
  toSamples: Vec2[];     // changed arc next
  localOrigin?: Vec2;    // e.g. conquest star position
}

export interface AnimatedRingPlan {
  ringId: string;
  staticSegmentsPrev: Vec2[][];  // segments that stay exactly as in prev
  patchMorph: PatchMorphPlan | null;
  targetRing: BoundaryRingSnapshot;
}

export interface TerritoryBoundaryTransitionPlan {
  territoryId: string;
  ownerId: string;
  durationMs: number;
  rings: AnimatedRingPlan[];
}

export interface TerritoryTransitionPlanSet {
  plansByTerritoryId: Map<string, TerritoryBoundaryTransitionPlan>;
}
```

Keep this file tight; avoid adding anything else until needed.

***

## 4. Geometry adaptations (no behavior change, just extra output)

Goal: from `TerritoryGeometryData` (Geometry_0319) build **boundary snapshots** with span metadata.

### 4.1. Build snapshots

`buildTerritoryBoundarySnapshots.ts`:

```ts
export function buildTerritoryBoundarySnapshots(
  geom: TerritoryGeometryData,
): TerritoryBoundarySnapshot[] {
  // 1. Index mergedTerritories by ownerId / starIds.
  // 2. For each MergedTerritory, build BoundaryRingSnapshot.
  //    - ringId: `${ownerId}:${idx}`
  //    - points: convert [number,number][] → Vec2[]
  //    - cumulativeLengths: arc-length prefix sums.
  //    - spans: use sharedPolylines + worldBorderPolylines to tag intervals
  //      along the ring as BoundarySpan with spanId + left/rightOwnerId.
  return snapshots;
}
```

Key requirement:

- Use **sharedPolylines** and **worldBorderPolylines** as span sources.
- Each polyline should generate one or more `BoundarySpan`s with a stable `spanId` (e.g. derived from polyline index + ownerPairKey).
- Record sample index ranges along the ring that belong to each span.[^1][^2]

You do **not** need a full half-edge mesh; just enough span identity to tell “this arc is the same shared/world span as last frame.”[^3][^4]

***

## 5. Delta context

`computeTerritoryDeltaContext.ts`:

```ts
export function computeTerritoryDeltaContext(
  prev: TerritoryBoundarySnapshot[],
  next: TerritoryBoundarySnapshot[],
  changedSiteIds: Set<string>,
): TerritoryDeltaContext {
  // 1. Any territory whose starIds intersect changedSiteIds is "affected".
  // 2. Return set of affected territoryIds.
}
```

This narrows work; only build detailed plans for affected territories.

***

## 6. Splice detection per ring

`findRingSpliceWindow.ts`:

```ts
export function findRingSpliceWindow(
  prevRing: BoundaryRingSnapshot,
  nextRing: BoundaryRingSnapshot,
  epsilon: number,
): RingSpliceWindow | null {
  // 1. Use spans to find maximal prefix/suffix where spanId and orientation match.
  //    - Walk from start: while spanId & owner sides equal → unchanged prefix.
  //    - Walk from end: same for suffix.
  // 2. Convert these unchanged ranges into sample index ranges.
  // 3. The middle region is the "changed" arc for prev/next.
  // 4. If everything matches → changed ranges null (no animation needed).
  // 5. Return RingSpliceWindow with:
  //    - anchors at boundary between unchanged and changed (start/end indices).
  //    - changedPrevRange & changedNextRange as [start, end).
}
```

Notes:

- First compare spans by `spanId` and left/right owners; only use geometric distance within `epsilon` as a tie-breaker.[^5][^6]
- Assume exactly one contiguous changed window per ring for now; if more are detected, return `null` and let caller fall back. (This keeps the first implementation simple.)

***

## 7. Local patch morph plan

`buildPatchMorphPlan.ts`:

```ts
import { resamplePolylineByArcLength } from './resampleUtils'; // new helper

export function buildPatchMorphPlan(
  prevRing: BoundaryRingSnapshot,
  nextRing: BoundaryRingSnapshot,
  window: RingSpliceWindow,
  sampleCount: number,
  conquestOrigin?: Vec2,
): PatchMorphPlan | null {
  if (!window.changedPrevRange || !window.changedNextRange) return null;

  const [pStart, pEnd] = window.changedPrevRange;
  const [nStart, nEnd] = window.changedNextRange;

  const prevArc = sliceClosedRing(prevRing.points, pStart, pEnd);
  const nextArc = sliceClosedRing(nextRing.points, nStart, nEnd);

  // Resample both arcs to same number of points along arc length
  // (standard “resample polyline by length” approach). [web:49][web:65]
  const fromSamples = resamplePolylineByArcLength(prevArc, sampleCount);
  const toSamples   = resamplePolylineByArcLength(nextArc, sampleCount);

  const anchorA = fromSamples[^0];
  const anchorB = fromSamples[fromSamples.length - 1];

  return { ringId: prevRing.ringId, anchorA, anchorB, fromSamples, toSamples, localOrigin: conquestOrigin };
}
```

Helper `resamplePolylineByArcLength` is straightforward: compute cumulative lengths, then interpolate positions at equal length intervals.[^7][^1]

***

## 8. Territory transition plan creation

`createTerritoryTransitionPlan.ts`:

```ts
export function createTerritoryTransitionPlan(
  prevSnapshots: TerritoryBoundarySnapshot[],
  nextSnapshots: TerritoryBoundarySnapshot[],
  delta: TerritoryDeltaContext,
  durationMs: number,
): TerritoryTransitionPlanSet {
  const plans = new Map<string, TerritoryBoundaryTransitionPlan>();

  for each affected territoryId in delta.affectedTerritoryIds:
    const prevT = find snapshot in prevSnapshots
    const nextT = find snapshot in nextSnapshots
    if (!prevT || !nextT) continue;

    const rings: AnimatedRingPlan[] = [];

    for each matching ring index (assume same count for v1):
      const prevRing = prevT.rings[i];
      const nextRing = nextT.rings[i];

      const window = findRingSpliceWindow(prevRing, nextRing, epsilon);
      if (!window) {
        // Fallback: no animation for this ring; snap to target
        rings.push({
          ringId: prevRing.ringId,
          staticSegmentsPrev: [],
          patchMorph: null,
          targetRing: nextRing,
        });
        continue;
      }

      const patchMorph = buildPatchMorphPlan(prevRing, nextRing, window, sampleCount, conquestOriginForTerritory);
      const staticSegmentsPrev = extractStaticSegments(prevRing.points, window);

      rings.push({
        ringId: prevRing.ringId,
        staticSegmentsPrev,
        patchMorph,
        targetRing: nextRing,
      });

    plans.set(territoryId, { territoryId, ownerId: nextT.ownerId, durationMs, rings });

  return { plansByTerritoryId: plans };
}
```

`extractStaticSegments` should produce polylines for the unchanged portions of the ring (before the changed window and after it), using the **prev** ring’s points, not interpolated ones. That guarantees stationarity.

***

## 9. Frame sampling

`sampleTransitionFrame.ts`:

```ts
export interface TerritoryFrameRing {
  ringId: string;
  points: Vec2[]; // closed, draw-ready
}

export interface TerritoryFrameGeometry {
  byTerritoryId: Map<string, TerritoryFrameRing[]>;
}

export function sampleTransitionFrame(
  planSet: TerritoryTransitionPlanSet,
  rawT: number,
  easing: (t: number) => number,
): TerritoryFrameGeometry {
  const t = easing(clamp01(rawT));
  const result = new Map<string, TerritoryFrameRing[]>();

  for (const [territoryId, plan] of planSet.plansByTerritoryId) {
    const rings: TerritoryFrameRing[] = [];

    for (const ringPlan of plan.rings) {
      if (!ringPlan.patchMorph || t >= 1) {
        // Snap to target ring at end or no animation configured
        rings.push({ ringId: ringPlan.ringId, points: ringPlan.targetRing.points });
        continue;
      }

      const { fromSamples, toSamples } = ringPlan.patchMorph;
      const k = t; // apply easing earlier

      const patch: Vec2[] = [];
      for (let i = 0; i < fromSamples.length; i++) {
        patch.push({
          x: fromSamples[i].x + (toSamples[i].x - fromSamples[i].x) * k,
          y: fromSamples[i].y + (toSamples[i].y - fromSamples[i].y) * k,
        });
      }

      // Rebuild full ring as: static prefix + patch + static suffix
      const fullPoints = stitchRing(ringPlan.staticSegmentsPrev, patch);

      rings.push({ ringId: ringPlan.ringId, points: fullPoints });
    }

    result.set(territoryId, rings);
  }

  return { byTerritoryId: result };
}
```

Key invariant: **all unchanged segments come straight from prev geometry**, never interpolated, so they do not move.

***

## 10. Presentation integration

`drawTerritoryFrame.ts`:

```ts
export function drawTerritoryFrame(
  frame: TerritoryFrameGeometry,
  fillGraphics: PIXI.Graphics,
  borderGraphics: PIXI.Graphics,
  style: StyleConfig,
): void {
  // Clear graphics
  // For each territory → each ring.points:
  //   - draw filled polygon (outer + holes)
  //   - draw stroke along same points
}
```

In `PowerVoronoiRenderer.ts`:

- Replace `PolygonMorphTransitionHandler` fields with:

```ts
activeTransitionPlan: TerritoryTransitionPlanSet | null;
transitionStartTime: number | null;
transitionDurationMs: number;
```

- On shape change (where you currently construct `PolygonMorphTransitionHandler`):

```ts
const prevSnapshots = buildTerritoryBoundarySnapshots(prevGeometry);
const nextSnapshots = buildTerritoryBoundarySnapshots(lastGeometry);
const delta = computeTerritoryDeltaContext(prevSnapshots, nextSnapshots, changedSiteIds);

state.activeTransitionPlan = createTerritoryTransitionPlan(
  prevSnapshots, nextSnapshots, delta, GAME_CONFIG.TERRITORY_TRANSITION_MS,
);
state.transitionStartTime = now;
state.transitionDurationMs = GAME_CONFIG.TERRITORY_TRANSITION_MS;
```

- Each frame:

```ts
if (state.activeTransitionPlan) {
  const elapsed = now - state.transitionStartTime!;
  const rawT = clamp01(elapsed / state.transitionDurationMs);
  const frameGeom = sampleTransitionFrame(state.activeTransitionPlan, rawT, easingFn);

  drawTerritoryFrame(frameGeom, state.fillGraphics!, state.borderGraphics!, style);

  if (rawT >= 1) state.activeTransitionPlan = null;
} else {
  // current static draw path using mergedTerritories
}
```

This keeps Fill and Border transitions configurable at the style level but ensures they always use the same per-frame geometry.

***

## 11. Failure / fallback behavior

Define simple, explicit fallbacks:

- If `buildTerritoryBoundarySnapshots` fails to map spans cleanly, log and draw static target geometry (no animation) for that tick.
- If `findRingSpliceWindow` returns `null` for a ring, snap that ring to target without morphing.
- Do **not** fall back to generic whole-polygon morphing; better to show an instantaneous snap than a wrong, wobbly morph.

This plan gives your agent a small, explicit set of modules and functions to implement, each with narrow responsibilities and minimal legacy contamination, while directly enforcing your key requirements: stationary unchanged boundary, local animation around the conquest, and a single canonical geometry used for both fills and borders.[^8][^4][^1]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^9]</span>

<div align="center">⁂</div>

[^1]: https://mattools.github.io/matGeom/api/matGeom/polygons2d/resamplePolylineByLength.html

[^2]: https://spatialthoughts.com/2020/04/08/calculating-shared-border-lengths/

[^3]: https://stanford-cs248.github.io/Cardinal3D/meshedit/halfedge

[^4]: https://jerryyin.info/geometry-processing-algorithms/half-edge/

[^5]: https://www.esri.com/news/arcuser/0401/topo.html

[^6]: https://pro.arcgis.com/en/pro-app/latest/help/data/topologies/topology-in-arcgis.htm

[^7]: https://swharden.com/blog/2025-04-13-evenly-spaced-resampled-segmented-line/

[^8]: https://postgis.net/docs/ST_ChaikinSmoothing.html

[^9]: https://estebanhufstedler.com/2020/01/04/chaikin-like-smoothing-through-vertices/

[^10]: https://openlayers.org/en/latest/examples/chaikin.html

[^11]: https://www.sidefx.com/forum/topic/84692/

[^12]: https://www.reddit.com/r/GraphicsProgramming/comments/18q47c5/mesh_data_structures_finding_boundary_edges_hole/

[^13]: https://shapeworks.discourse.group/t/shared-boundary-implementation/105

[^14]: https://www.sidefx.com/docs/houdini/nodes/sop/resample.html

[^15]: https://geometry-central.net/surface/surface_mesh/internals/

[^16]: https://keithmaggio.wordpress.com/2018/05/29/math-magician-path-smoothing-with-chaikin/

[^17]: https://helpful.knobs-dials.com/index.php/Polylines_and_splines,_curves,_interpolation,_resampling,_easing

[^18]: https://cs184.eecs.berkeley.edu/su20/docs/HalfEdgePrimer

