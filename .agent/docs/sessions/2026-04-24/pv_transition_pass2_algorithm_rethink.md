# PV Transition Pass 2 — Algorithm Rethink Report

## Core correction
The previous plan was too geometry-first and not front-first.

The correct PV algorithm is:

1. identify the matching PRE and POST frontier chains
2. find the two ChangeAnchors by dense chain diff
3. cut each chain at those anchors
4. define `preConquestFront` and `postConquestFront`
5. sample both fronts to the same ordered vertex count
6. animate one coherent `TransientTransitionFrontline`
7. rebuild adjacent PV loops from that line each frame

That is the whole machine.

---

## What the algorithm is trying to solve
Not “how do we animate polygons?”

It solves one narrower problem:

**Given two static frontier lines with the same endpoints, build one moving frontier line between them.**

---

## Objects

### FrontierPolyline
One exact PV frontier polyline from the geometry stage.

### FrontierChain
One ordered chain of connected frontier polylines for the same owner pair in the local conquest area.

Why needed:
- change anchors may lie across more than one polyline
- the active front can span multiple connected polylines

### ChangeAnchor
The first diverging coordinate between PRE and POST when diffing a matched frontier chain from one end.

### preConquestFront / postConquestFront
The exact frontier sections between the two change anchors.

### TransitionVertex
One sampled point on a ConquestFront.

### TransitionPair
A pair of sampled PRE/POST transition vertices at the same normalized front position `u`.

### TransitionFront
The ordered array of TransitionPairs for one conquest front.

### TransientTransitionFrontline
The per-frame moving frontier polyline evaluated from a TransitionFront.

---

## Exact algorithm

## Phase 1. Capture PRE and POST
Capture both at the same moment:
- after conquest outcomes are known
- before later mutation

Outputs:
- `preFrontiers`
- `postFrontiers`

## Phase 2. Build local frontier chains
For the conquest owner pair and local area:
- collect frontier polylines from PRE
- collect frontier polylines from POST
- connect touching polylines into ordered chains

If a chain branches, split it into separate simple chains before continuing.

Output:
- `preChains`
- `postChains`

## Phase 3. Canonicalize direction
Every chain must be walked in a stable direction.

Use:
1. polyline endpoint dominant-axis top/left start rule
2. then chain the polylines consistently from chain start to chain end

Output:
- directed `preChain`
- directed `postChain`

## Phase 4. Dense search sampling
Sample each chain at a small fixed step:
- `anchorSearchSpacing`, e.g. 1 px

This creates:
- `preSearchPoints[]`
- `postSearchPoints[]`

These are **search samples only**.
They are not transition vertices.

## Phase 5. Find the change anchors
Compare search samples from the start:

- walk index `i = 0, 1, 2...`
- while distance(`preSearchPoints[i]`, `postSearchPoints[i]`) <= `anchorTolerance`, continue
- the last matching search point is `ChangeAnchorStart`

Compare from the end:

- walk index `j = end, end-1, ...`
- while distance(`preSearchPoints[j]`, `postSearchPoints[j]`) <= `anchorTolerance`, continue
- the last matching search point from the end is `ChangeAnchorEnd`

If multiple separate divergence intervals exist in one simple chain, split them into multiple ConquestFronts.

This step is the answer to active-front isolation.

## Phase 6. Cut the chains at the anchors
Cut the exact PRE and POST chains at:
- `ChangeAnchorStart`
- `ChangeAnchorEnd`

The exact section between them becomes:
- `preConquestFront`
- `postConquestFront`

This cut may fall inside a source segment.
That is an internal geometric cut operation, not a public architecture concept.

## Phase 7. Insert transition vertices on-demand
Choose:
- `transitionVertexSpacing`

Let:
- `K = ceil(max(preFrontLength, postFrontLength) / transitionVertexSpacing) + 1`

For each:
- `u_i = i / (K - 1)`

Sample both fronts at the same `u_i`.

This produces:
- `preTransitionVertices[i]`
- `postTransitionVertices[i]`

## Phase 8. Build TransitionPairs
For each index `i`:
- `TransitionPair[i].pre = preTransitionVertices[i]`
- `TransitionPair[i].post = postTransitionVertices[i]`

This is the correspondence.

No additional search happens here.

## Phase 9. Build paths
V1 path:
- start = PRE point
- end = POST point
- guide = midpoint(PRE, POST)

Path form:
- quadratic curve through midpoint guide

Optional V2:
- shaped guide line
- lane-biased or arc-biased control points

## Phase 10. Evaluate the TransientTransitionFrontline
For each frame progress `t`:
1. evaluate each TransitionPair path at `t`
2. relax the interior current points 1–2 passes so neighboring points remain smooth
3. keep the two anchors fixed

The resulting ordered current points are:
- `TransientTransitionFrontline`

## Phase 11. Rebuild PV loops
For each frame:
1. take the two adjacent region loops
2. replace their shared frontier section with `TransientTransitionFrontline`
3. use opposite orientation for the two loops
4. render

## Phase 12. Final verification
At final frame:
- compare rebuilt geometry against exact POST geometry
- deviation must be zero or within small tolerance

---

## Why this is better
1. It uses the user’s ChangeAnchor definition.
2. It removes the false “preserved vertex inside active front” step.
3. It keeps raw polyline geometry as source truth.
4. It inserts transition vertices only where needed.
5. It makes correspondence index-based after exact front extraction.
6. It gives one coherent moving line instead of many unrelated point lerps.

---

## What the grid does now
Only optional:
- localizer
- broad-phase
- debug overlay

It is not part of the core PV transition algorithm.

---

## Main blind spots checked
1. Change anchor inside a source segment -> solved by exact cut at anchor.
2. Front spanning multiple polylines -> solved by FrontierChain.
3. Multiple divergence intervals -> split into multiple ConquestFronts.
4. Victor/loser asymmetry -> irrelevant in PV mode; both sides are just boundary lines.
5. Final drift from POST -> explicit final-geometry comparison required.
