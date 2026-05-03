# PV Transition Pass 1 — Feedback Processing Ledger

## Purpose
Process the feedback rigorously, accept or reject each point, and remove the parts of the prior plan that caused confusion.

## Hard rules adopted
1. Never introduce a new technical term without defining the object, the need, and the distinction.
2. Never answer a different question than the one asked.
3. Never use rhetorical filler in a technical plan.
4. Never name a later-phase result before specifying how it is produced.
5. For PV mode, the moving object is one ordered transition front between two change anchors.

## Direct answers

### 1. Left / right owners
Accepted. The earlier answer was incomplete because it did not define frontier direction first.

**Correct rule**
1. Give every frontier polyline a canonical direction.
2. Use your suggested dominant-axis rule:
   - compare `abs(dx)` and `abs(dy)` between endpoints
   - if `abs(dx) > abs(dy)`, start = leftmost endpoint
   - else, start = topmost endpoint
   - tie-break by `x`, then `y`
3. Once direction is fixed, sample the midpoint, step epsilon left and right, and query region ownership there.

**Why this is better**
- direction is explicit
- left/right is stable
- no downstream reversal logic is needed

### 2. Region / loop direction
Accepted as a useful secondary rule.
- region loops should be walked clockwise
- that can be used as a validation check
- but the frontier-polyline direction rule above is enough by itself

### 3. ChangeAnchor
Accepted. The earlier definition was wrong.

**Correct definition**
A ChangeAnchor is the first diverging coordinate between PRE and POST frontier lines, within a chosen tolerance, when diffing from one end.

It is **not** a 3-way junction concept.

### 4. How to find a ChangeAnchor
Accepted. Your proposed method is the right basis.

**Correct method**
1. take matching PRE/POST frontier chains
2. diff them from the start
3. last matching coordinate before divergence = `ChangeAnchorStart`
4. diff them from the end
5. first matching coordinate before divergence = `ChangeAnchorEnd`

### 5. “local overlay vertex”, “split frontier segment”, “component”, “run”, “preserved vertex inside active front”
Rejected from the public plan.

These terms caused confusion because they were either undefined, unnecessary, or used in the wrong phase.

### 6. “Without split frontier segments, exact change-anchor placement is impossible”
Reconsidered.

**True**
If a change anchor can fall inside a source segment, then some kind of cut/split operation is needed internally.

**False**
It does **not** need to become a first-class public architectural concept.
It can remain an internal geometric operation:
- cut chain at anchor position
- continue with ordered vertices

**Decision**
Keep “cut at anchor position” as an internal step.
Drop “SplitFrontierSegment” from the public plan.

### 7. ConquestFront structure
Accepted and corrected.

A `ConquestFront` needs:
- `ChangeAnchorStart`
- `ChangeAnchorEnd`
- ordered sections / polyline data between them

That is enough to define:
- membership
- direction
- front length
- later sampling

### 8. Transition hierarchy
Accepted.

Correct hierarchy:
1. `TransitionFront`
2. `TransitionPair`
3. `TransitionVertex`

### 9. `TransientTransitionFrontline`
Accepted.
This is the correct name for the per-frame moving front.

### 10. “every frontier polyline must include exact source geometry”
Accepted as a bad phrase.

Your criticism is correct:
- a polyline already *is* geometry
- “source geometry” added no clarity there

**Correction**
Only say:
- frontier polyline geometry
- transition vertices inserted on-demand on active fronts only

### 11. “What changed from what?”
Accepted. I failed to answer that directly.

**Correct answer**
The proposed change is from:
- frontier polylines as raw PV output only

to:
- frontier polylines plus deterministic transition sampling on the extracted active front only

This is not a global compiler rewrite. It is an added transition sampling step.

### 12. “incidental source tessellation”
Accepted as undefined and unnecessary.

**Meaning**
The arbitrary spacing of raw source vertices can distort correspondence if used directly.

**Decision**
Drop the phrase from the public plan. Just say:
- raw source vertex spacing is not stable enough for direct correspondence

### 13. Grid discussion
Accepted as off-axis in the PV plan.

**Decision**
Grid is optional only for:
- broad-phase local search
- debug visualization

Grid is not the core PV transition method.

### 14. “The grid may help if useful”
That sentence was empty filler. It should not have been written.

### 15. Tangent on a point
Accepted as poorly phrased.

**Correct meaning**
Not “the point has a tangent”.
It means:
- the frontier line has a local direction at that sampled point

**Decision**
Remove tangents from V1 core plan.
They may return later for path shaping.

### 16. Final-frame comparison
Accepted.

Correct rule:
- POST is computed up front
- final evaluated transition frame is compared against exact POST geometry
- deviation must be zero or within a very small tolerance

## What stays
1. PRE and POST must be captured at the same moment: after conquest outcomes are known, before later mutation.
2. The active front is between two change anchors.
3. The transition primitive is a normalized ordered vertex series built from that front.
4. The moving object is one coherent transition front.
5. Each frame rebuilds adjacent PV loops from the current transition front.

## What is removed
1. junction-based ChangeAnchor definition
2. public “split frontier segment” concept
3. “overlay vertex” as a public concept
4. preserved-vertex search inside the already-defined active front
5. grid as core logic
6. compiler rhetoric about “exact source geometry”

## Immediate corrected model
- Diff PRE and POST frontier chains directly.
- Find `ChangeAnchorStart` and `ChangeAnchorEnd` by forward and backward matching.
- Define `preConquestFront` and `postConquestFront` between those anchors.
- Insert `TransitionVertex` samples on those fronts only.
- Build `TransitionPair` objects by shared sample index.
- Evaluate `TransientTransitionFrontline` every frame from those pairs.
