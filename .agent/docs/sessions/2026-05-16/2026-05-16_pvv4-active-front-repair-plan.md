# PVV4 Active Front Repair Plan

Date: 2026-05-16

Purpose: replace the current coordinate-chain active-front planner with a region/topology-first planner that discovers real Change Anchors, matches PRE|POST active front sections, and only then creates Transition Vertices.

Primary files:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`

## Terms Used Here

- PRE: territory/frontier state before the conquest tick.
- POST: territory/frontier state after the conquest tick.
- Region: connected territory owned by one player, with an explicit star membership.
- Border/frontier: line where two players' territories meet, or where one player's territory meets the world edge.
- 3V: point where three or more regions meet.
- Change Anchor: an unmoving coordinate where the active front begins or ends. It is the local PRE|POST matching point at the boundary of change.
- Active front: the changed border portion between Change Anchors.
- Active front section: one planned PRE|POST piece inside an active front, possibly bounded by Change Anchors, moving 3Vs, or branch points.
- Moving 3V: a PRE|POST-matched 3V whose coordinate changed. It is not a Change Anchor. It is a shared internal transition constraint.
- Transition Vertex, or TV: one point sampled on a planned active front section after PRE|POST section correspondence is known.

## Old Process: Current Code

This is the current active-front planning process in `ActiveFrontTransition.ts`.

1. `findStableAnchors(prev, next, eps)` finds topology vertices whose coordinate-key ID exists in both PRE and POST and whose coordinates are within EPS.

2. `buildChainsBetweenAnchors(topo, anchors)` walks frontier sections from one stable topology vertex to another.

3. At a branch, `buildChainsBetweenAnchors` sorts candidate sections and chooses the first unused section.

4. `groupChainsByAnchorPair` groups chains by `anchorStartId|anchorEndId`.

5. `buildConquestRelevantAnchorPairKeys` keeps only anchor pairs whose sections touch conquest owners or conquest star influence.

6. `detectSplitMode` classifies each anchor pair by path count: `1:1`, `1:2`, `2:1`, or defect.

7. `findChangeSpanForPaths` finds changed point-index intervals by measuring distance from one side's chain points to the other side's chain polyline.

8. `buildLocalChangeWindow` converts the changed interval into PRE and POST arc-length positions. For `1:1`, this creates the current local window used as the active-front boundary.

9. `buildSectionSpans` marks POST sections active. For split/merge cases it marks whole POST paths active.

10. `getActiveFrontMonotonicCorrespondence` creates TVs only for `1:1` fronts.

11. `buildInterpolatedActiveFrontPath` writes the interpolated active-front TV polyline back into POST path point slots.

12. Split/merge cases use whole-path interpolation through `splitByNearest`, `mergeByNearest`, and `lerpMonotonicWholeFront`.

## What Was Missing

The current process finds unmoved coordinate-key vertices first. That is not the same as finding PRE|POST topology correspondence.

The current process can lose a moving 3V. If the same owner/region meeting point exists in PRE and POST but moved, it has a different coordinate-key ID and is not matched.

The current process walks one branch at a branch point. It does not exhaust all outward branches from a changed area, so it can miss required Change Anchors.

The current process treats an anchor pair as enough context to plan motion. It is not enough. A pair of Change Anchors only defines outer bounds; inside those bounds the planner must still match PRE active-front sections to POST active-front sections.

The current process only supports `1:1`, `1:2`, and `2:1` by path count. Valid cases can be `1:M`, `M:1`, or `M:N`.

The current process generates TVs before it has a complete active-front section correspondence model. That permits long TV paths, rotations, broad redrawing, and missed local motion.

## Fix In One Sentence

Plan active-front motion from region/topology correspondence first, use coordinates second to classify moved versus unmoved features, discover all Change Anchors by branch-exhaustive outward search, match PRE|POST active front sections inside those anchors, then generate TVs from that section plan.

## New Method: Brief

1. Build PRE|POST region correspondence.

2. Build PRE|POST topology correspondence for 3Vs, world contacts, and border sections using owner/region identity before coordinates.

3. Use EPS only after correspondence exists, to classify matched topology as unmoved or moved.

4. Seed changed frontier from changed regions, changed border sections, moving 3Vs, and conquest events.

5. From each changed seed, walk outward along every possible branch in both directions until all true PRE|POST matching coordinates are found.

6. Mark those matching coordinates as Change Anchors.

7. Build active-front components bounded by Change Anchors.

8. Inside each component, match PRE active-front sections to POST active-front sections. Support `1:1`, `1:M`, `M:1`, and `M:N`.

9. Preserve moving 3Vs as shared internal constraints.

10. Generate TVs only from the active-front section plan.

11. Rebuild territory loops by replacing exactly the planned active-front sections.

12. If a valid correspondence cannot be proven, emit a planner defect and freeze diagnostics. Do not invent a hidden repair path.

## New Method: Expanded Logic

### 1. Region Correspondence

Definition: two regions correspond if they are the same owned territory entity across PRE and POST.

Implementation identity:

- Primary: same owner and same real-star membership.
- Conquest-created or conquest-destroyed regions are explicitly classified from conquest events.
- Same-owner topology-changed regions are not ignored. They own their own transition plan.

Output:

- matched regions;
- appeared regions;
- disappeared regions;
- same-owner topology-changed regions;
- conquest-caused owner-change regions.

Why this matters:

Border motion belongs to regions. A border of an ownership-static region must not be consumed by another region's transition.

### 2. Topology Correspondence

Definition: topology correspondence matches PRE and POST structural features before asking whether their coordinates moved.

3V identity:

- owner/region set meeting at the 3V;
- incident owner-pair borders;
- incident region-loop membership.

World-contact identity:

- owner/region touching the world;
- world side;
- incident owner-pair border or world border.

Section identity:

- owner pair;
- adjacent region identities;
- ordered endpoint topology identities when available;
- region-loop membership.

Output:

- matched 3Vs;
- matched world contacts;
- matched border sections;
- unmatched PRE topology;
- unmatched POST topology;
- ambiguous topology buckets requiring branch logic.

Why this matters:

A moving 3V is still the same topology feature. Coordinate-key matching loses that fact.

### 3. Coordinate Stability

Definition: coordinate stability classifies matched topology features.

Rules:

- matched topology plus coordinate distance <= EPS means unmoved;
- matched topology plus coordinate distance > EPS means moved;
- unmatched topology is not "moved"; it is unmatched until resolved or classified as appeared/disappeared/defect.

Output:

- unmoved topology features;
- moving topology features;
- unresolved topology features.

Why this matters:

EPS is valid. Its role is classification after identity, not identity itself.

### 4. Changed Frontier Seeds

Definition: a changed seed is a local border feature known to be inside or touching transition motion.

Sources:

- conquered star region changed owner;
- region appeared or disappeared;
- same-owner region changed topology;
- matched border section moved beyond EPS;
- matched 3V moved beyond EPS;
- PRE-only or POST-only section belonging to a changed region.

Output:

- per-region changed frontier seed set;
- per-owner-pair changed frontier seed set;
- per-conquest changed frontier seed set.

Why this matters:

The planner should start at known change and walk outward to real PRE|POST agreement. It should not start from broad unchanged topology vertices and hope the changed part lies between them.

### 5. Branch-Exhaustive Change Anchor Discovery

Definition: Change Anchor discovery finds every unmoving local PRE|POST matching coordinate that bounds active-front motion.

Rules:

- Start from each changed seed.
- Walk outward along PRE and POST frontier graph branches.
- Walk both directions.
- At each branch, enqueue every valid outgoing branch.
- Stop a branch only when it reaches a true PRE|POST coordinate match for the same border responsibility.
- Record that stop point as a Change Anchor.
- If a branch reaches a moving 3V, continue through it; do not mark it as a Change Anchor.
- If a branch reaches already-resolved active-front territory, join the existing component.
- If a branch cannot resolve, classify the component as a planner defect.

Output:

- Change Anchor set;
- branch trace;
- unresolved branches;
- active-front component boundaries.

Why this matters:

This prevents the "wrong path at a 3V" bug. Every local branch must prove where change stops.

### 6. Active Front Components

Definition: an active-front component is a connected changed frontier subgraph bounded by Change Anchors.

Rules:

- A component may contain multiple PRE sections and multiple POST sections.
- A component may contain moving 3Vs.
- A component may contain branches.
- A component belongs to a region-transition responsibility, not merely to an owner pair.

Output:

- `ActiveFrontComponent[]`, each with:
  - responsible region IDs;
  - Change Anchors;
  - PRE section subgraph;
  - POST section subgraph;
  - internal moving 3Vs;
  - internal branch points.

Why this matters:

This is the missing object between Change Anchors and TVs.

### 7. Active Front Section Matching And Planning

Definition: active-front section matching determines which PRE border pieces correspond to which POST border pieces inside one active-front component.

Rules:

- Split components at Change Anchors, moving 3Vs, and branch points.
- Build atomic PRE pieces and atomic POST pieces.
- Match pieces by:
  - same responsible region;
  - same owner pair;
  - compatible endpoint identities;
  - monotone local order along region loops;
  - minimum local travel cost.
- Support `1:1`, `1:M`, `M:1`, and `M:N`.
- Preserve a moving 3V as one shared coordinate at each animation frame for every adjacent planned section.

Output:

- `ActiveFrontSectionPlan[]`;
- each plan contains PRE pieces, POST pieces, endpoint constraints, internal moving constraints, and TV budget.

Why this matters:

TVs need a correct PRE|POST section plan. Otherwise TVs can cross the map or cover only part of the visible moving front.

### 8. TV Correspondence

Definition: TV correspondence creates equal-count moving points after active-front section matching is known.

Rules:

- TVs are distributed across the full planned active-front section.
- First TV equals the start constraint.
- Last TV equals the end constraint.
- Internal moving 3Vs are fixed breakpoints in the TV plan.
- TV matching is monotone.
- TV matching minimizes local travel under endpoint, region, owner-pair, and moving-3V constraints.

Output:

- PRE TVs;
- POST TVs;
- active TVs at progress `t`;
- TV travel vectors;
- TV diagnostics.

Why this matters:

TVs are the last step, not the planner.

## Pseudocode

```ts
function planActiveFrontTransitionV2(input): ActiveFrontTransitionPlan {
  const regionDiff = buildRegionCorrespondence(input.prevRegions, input.nextRegions, input.conquestEvents);
  const topology = buildTopologyCorrespondence(input.prevTopology, input.nextTopology, regionDiff);
  const stability = classifyCoordinateStability(topology, input.tunables.stableAnchorEps);

  const seeds = findChangedFrontierSeeds({
    regionDiff,
    topology,
    stability,
    conquestEvents: input.conquestEvents,
  });

  const anchorSearch = discoverChangeAnchorsBranchExhaustive({
    prevTopology: input.prevTopology,
    nextTopology: input.nextTopology,
    regionDiff,
    topology,
    stability,
    seeds,
    eps: input.tunables.changeSpanEps,
  });

  const components = buildActiveFrontComponents({
    seeds,
    changeAnchors: anchorSearch.changeAnchors,
    movingTopology: stability.moved,
    branchTrace: anchorSearch.branchTrace,
    regionDiff,
  });

  const sectionPlans = planActiveFrontSections({
    components,
    topology,
    stability,
    prevTopology: input.prevTopology,
    nextTopology: input.nextTopology,
  });

  const fronts = sectionPlans.map(sectionPlan =>
    buildTvPlan(sectionPlan, input.tunables.transitionVertexCount),
  );

  const collapseTargets = planCollapseTargets(...);

  return {
    prevVersion: input.prevTopology.version,
    nextVersion: input.nextTopology.version,
    fronts,
    collapseTargets,
    diagnostics: buildDiagnostics(...),
  };
}
```

### Region Correspondence

```ts
function buildRegionCorrespondence(prevRegions, nextRegions, conquestEvents): RegionDiff {
  const prevByOwnerStars = indexByOwnerAndSortedStars(prevRegions);
  const nextByOwnerStars = indexByOwnerAndSortedStars(nextRegions);

  const matched = matchEqualOwnerStarSets(prevByOwnerStars, nextByOwnerStars);
  const changedByConquest = classifyConquestRegions(prevRegions, nextRegions, conquestEvents);
  const sameOwnerTopoChanged = findSameOwnerStarSetWithBoundaryChange(matched);

  return { matched, changedByConquest, sameOwnerTopoChanged, appeared, disappeared };
}
```

### Topology Correspondence

```ts
function topologyVertexKey(vertex, topology, regionDiff): string {
  if (vertex.kind === "junction_3way") {
    return keyFromIncidentRegionSet(vertex, topology, regionDiff);
  }
  if (vertex.kind === "world_intersection") {
    return keyFromWorldSideAndRegion(vertex, topology, regionDiff);
  }
  if (vertex.kind === "world_corner") {
    return keyFromWorldCorner(vertex);
  }
  return keyFromUnsupportedVertexKind(vertex);
}

function buildTopologyCorrespondence(prev, next, regionDiff): TopologyCorrespondence {
  const prevBuckets = bucketVerticesByTopologyKey(prev, regionDiff);
  const nextBuckets = bucketVerticesByTopologyKey(next, regionDiff);

  for (const key of unionKeys(prevBuckets, nextBuckets)) {
    resolveUniqueOrAmbiguousVertexBucket(key, prevBuckets.get(key), nextBuckets.get(key));
  }

  matchSectionsByRegionOwnerPairAndEndpointIdentity(prev, next, resolvedVertices, regionDiff);
}
```

### Coordinate Stability

```ts
function classifyCoordinateStability(correspondence, eps): CoordinateStability {
  for (const match of correspondence.vertexMatches) {
    const d = distance(match.prev.point, match.next.point);
    if (d <= eps) markUnmoved(match);
    else markMoved(match, d);
  }
}
```

### Branch-Exhaustive Change Anchor Discovery

```ts
function discoverChangeAnchorsBranchExhaustive(input): ChangeAnchorSearchResult {
  const queue = seedOutwardWalkStates(input.seeds);
  const visited = new Set<WalkStateKey>();
  const anchors = [];
  const defects = [];

  while (queue.length > 0) {
    const state = queue.shift();
    if (visited.has(key(state))) continue;
    visited.add(key(state));

    const match = findLocalPrePostMatchAtState(state, input);
    if (match && match.coordinateDistance <= input.eps) {
      anchors.push(makeChangeAnchor(match));
      continue;
    }

    if (match && match.isMoving3V) {
      recordMovingConstraint(match);
      queue.push(...outgoingBranchesThroughMoving3V(state, match, input));
      continue;
    }

    const branches = listAllValidOutgoingFrontierBranches(state, input);
    if (branches.length === 0) {
      defects.push(makeUnresolvedBranchDefect(state));
      continue;
    }

    for (const branch of branches) {
      queue.push(walkAlongBranch(state, branch));
    }
  }

  return { changeAnchors: anchors, movingConstraints, branchTrace, defects };
}
```

### Active Front Section Matching

```ts
function planActiveFrontSections(input): ActiveFrontSectionPlan[] {
  const components = splitChangedSubgraphIntoComponents(input);
  const plans = [];

  for (const component of components) {
    const prevPieces = splitAtConstraints(component.prevSubgraph, component.constraints);
    const postPieces = splitAtConstraints(component.postSubgraph, component.constraints);

    const correspondenceGraph = buildPieceCorrespondenceGraph({
      prevPieces,
      postPieces,
      requiredSameRegion: true,
      requiredSameOwnerPair: true,
      endpointConstraints: component.constraints,
    });

    const groups = solveComponentPieceGroups(correspondenceGraph);

    for (const group of groups) {
      plans.push({
        componentId: component.id,
        prevPieces: group.prevPieces,
        postPieces: group.postPieces,
        startConstraint: group.startConstraint,
        endConstraint: group.endConstraint,
        internalMovingConstraints: group.internalMovingConstraints,
      });
    }
  }

  return plans;
}
```

### TV Correspondence

```ts
function buildTvPlan(sectionPlan, requestedTvCount): TvPlan {
  const segments = splitPlanAtInternalMoving3Vs(sectionPlan);
  const tvBudget = distributeTvBudgetByPostLength(segments, requestedTvCount);

  const tvSegments = segments.map((segment, index) => {
    const count = tvBudget[index];
    const prev = samplePrevSegment(segment, count);
    const post = samplePostSegment(segment, count);
    const matchedPrev = solveMonotoneMinimumTravel(prev, post, segment.constraints);
    return { prev: matchedPrev, post };
  });

  return joinTvSegmentsWithoutDuplicatingSharedConstraints(tvSegments);
}
```

## Code Plan

### Step 1: Add New Planning Types

File: `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

Short-term: define these in the same file to keep the refactor local.

Long-term: move them into focused transition modules after behavior is proven.

```ts
type TopologyMotionKind = "unmoved" | "moved";

interface TopologyVertexMatch {
  identityKey: string;
  kind: FrontierVertexKind;
  prevVertexId: string;
  nextVertexId: string;
  prevPoint: Vec2;
  nextPoint: Vec2;
  distance: number;
  motion: TopologyMotionKind;
}

interface ChangeAnchor {
  id: string;
  point: Vec2;
  prevRef: FrontierCoordinateRef;
  nextRef: FrontierCoordinateRef;
  reason: "branch_match" | "world_match" | "component_join";
}

interface MovingTopologyConstraint {
  identityKey: string;
  prevPoint: Vec2;
  nextPoint: Vec2;
  activePointAt(progress: number): Vec2;
}

interface ActiveFrontComponent {
  id: string;
  responsibleRegionIds: string[];
  ownerPairKeys: string[];
  changeAnchorIds: string[];
  prevSectionIds: string[];
  nextSectionIds: string[];
  movingConstraintIds: string[];
}

interface ActiveFrontSectionPlan {
  id: string;
  componentId: string;
  prevSectionIds: string[];
  nextSectionIds: string[];
  startConstraintId: string;
  endConstraintId: string;
  internalMovingConstraintIds: string[];
  ownerPairKey: string;
  responsibleRegionIds: string[];
}
```

### Step 2: Replace `findStableAnchors` As The First Planning Step

Current:

```ts
const anchors = findStableAnchors(prev, next, stableAnchorEps);
const prevChains = dedupeChainsByGeometry(buildChainsBetweenAnchors(prev, anchors));
const nextChains = dedupeChainsByGeometry(buildChainsBetweenAnchors(next, anchors));
```

New:

```ts
const regionDiff = buildRegionCorrespondence(previousRegions, nextRegions, ownership.conquestEvents);
const topologyCorrespondence = buildTopologyCorrespondence(prev, next, regionDiff);
const coordinateStability = classifyCoordinateStability(topologyCorrespondence, stableAnchorEps);
const changedSeeds = findChangedFrontierSeeds(regionDiff, topologyCorrespondence, coordinateStability, ownership.conquestEvents);
```

Do not delete `findStableAnchors` immediately. First move it behind diagnostics as `legacyFindCoordinateStableVertices` so old and new traces can be compared. It must not decide active-front planning after this step lands.

### Step 3: Replace Single-Path Chain Walk With Branch-Exhaustive Search

Current branch behavior:

```ts
const candidates = (...).sort();
const nextSectionId = candidates[0];
```

New behavior:

```ts
const branches = listAllValidOutgoingFrontierBranches(state, graph);
for (const branch of branches) {
  queue.push(walkAlongBranch(state, branch));
}
```

The new walk records why each branch stopped:

- found Change Anchor;
- joined existing component;
- crossed moving 3V;
- reached unresolved topology;
- reached invalid branch.

### Step 4: Introduce Active Front Components

Replace anchor-pair grouping as the primary planning object.

Current:

```ts
const prevByKey = groupChainsByAnchorPair(prevChains);
const nextByKey = groupChainsByAnchorPair(nextChains);
```

New:

```ts
const activeFrontComponents = buildActiveFrontComponents({
  changedSeeds,
  changeAnchors,
  movingConstraints,
  regionDiff,
  prev,
  next,
});
```

This is where same-owner topology-changed regions must plan their own motion.

### Step 5: Implement Active Front Section Matching

Add:

```ts
const activeFrontSectionPlans = planActiveFrontSections({
  components: activeFrontComponents,
  topologyCorrespondence,
  coordinateStability,
  prev,
  next,
});
```

This replaces direct `detectSplitMode(prevPaths.length, nextPaths.length)` as the main planner.

`detectSplitMode` may remain only as a diagnostic label derived from section plan cardinality:

- `1:1`;
- `1:M`;
- `M:1`;
- `M:N`.

### Step 6: Generate TVs From Section Plans

Current:

```ts
getActiveFrontMonotonicCorrespondence(front, progress, transitionVertexCount)
```

New:

```ts
getActiveFrontSectionTvCorrespondence(sectionPlan, progress, transitionVertexCount)
```

The function consumes `ActiveFrontSectionPlan`, not raw anchor-pair chains.

It must:

- include both Change Anchors;
- distribute TVs over the full POST active-front section length;
- split at internal moving 3Vs;
- use the same moving 3V coordinate for every adjacent section at a given progress;
- solve monotone minimum-travel correspondence under constraints.

### Step 7: Rebuild Render Geometry From Section Plans

Current:

- Starts from POST geometry.
- Replaces point ranges on active POST sections.
- Split/merge cases may replace whole paths.

New:

- Starts from POST geometry.
- For each `ActiveFrontSectionPlan`, replace exactly the POST section subrange represented by that plan.
- When a section plan contains multiple POST sections, replace those exact section subranges.
- Do not replace unrelated POST sections.
- Do not use whole-path replacement unless the whole path is the active front.

### Step 8: Diagnostics Required Before Runtime Trust

Add these diagnostic layers:

- region correspondence view;
- topology correspondence view;
- coordinate stability view;
- branch-exhaustive Change Anchor search view;
- active-front component view;
- active-front section matching view;
- TV correspondence view.

Each diagnostic package should include JSON for:

- `06_region_correspondence.json`;
- `07_topology_correspondence.json`;
- `08_change_anchor_search.json`;
- `09_active_front_components.json`;
- `10_active_front_section_plans.json`;
- `11_tv_correspondence.json`.

## Acceptance Criteria

1. A moved 3V is matched by topology identity and classified as moved, not lost.

2. Change Anchors are always unmoving PRE|POST matching coordinates.

3. Branches are exhaustive: a branch point cannot be resolved by choosing the first sorted section.

4. Same-owner topology-changed regions plan their own active fronts.

5. Active-front section plans exist before TVs.

6. Valid `1:M`, `M:1`, and `M:N` cases are represented as section plans, not planner defects.

7. TVs are generated from active-front section plans and respect moving 3Vs.

8. Render replacement changes exactly the planned active-front sections.

9. Diagnostic render can show every stage of the planner's decision.

10. If correspondence cannot be proven, the frame freezes with a named planner defect.

## Implementation Order

1. Add diagnostics-only topology correspondence and coordinate stability.

2. Add diagnostics-only changed seed extraction.

3. Add branch-exhaustive Change Anchor search and render it.

4. Add active-front component construction and render it.

5. Add active-front section matching and render it.

6. Add TV generation from section plans.

7. Switch runtime geometry replacement to section plans.

8. Remove or quarantine old anchor-pair planning from runtime.

9. Update tests around moved 3Vs, branching, `1:M`, `M:1`, `M:N`, same-owner topology change, and dual conquest.

10. Use browser playtesting and diagnostic packages to compare against known failures.

## Immediate Code Touch List

Primary:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

Likely support files:

- `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionFrontierFrameRenderer.ts`
- `pax-fluxia/src/lib/territory/devtools/activeFrontDebugStyle.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`

Possible new files after first implementation slice:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTopologyCorrespondence.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontChangeAnchors.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontSectionPlanner.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTvCorrespondence.ts`

Keep the first implementation local if that reduces integration risk. Extract only after tests make boundaries clear.
