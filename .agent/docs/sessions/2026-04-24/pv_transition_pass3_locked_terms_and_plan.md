# PV Transition Pass 3 — Locked Terms and Implementation Plan

## Locked terms

### PRE
Old geometry state, captured at conquest decision time.

### POST
New geometry state, captured at the same moment as PRE.

### ChangeAnchor
The last matching coordinate before divergence when diffing PRE and POST from one end.

### FrontierPolyline
One exact PV frontier polyline.

### FrontierChain
One ordered chain of connected frontier polylines in the local conquest area.

### preConquestFront
The PRE frontier section between `ChangeAnchorStart` and `ChangeAnchorEnd`.

### postConquestFront
The POST frontier section between `ChangeAnchorStart` and `ChangeAnchorEnd`.

### TransitionVertex
One sampled point on a ConquestFront.

### TransitionPair
One PRE/POST pair of TransitionVertices at the same normalized front position.

### TransitionFront
The ordered array of TransitionPairs for one conquest front.

### TransientTransitionFrontline
The current moving frontier line evaluated from a TransitionFront.

---

## Locked plan

## 1. Capture PRE and POST
Capture both at the same moment:
- after conquest results are known
- before later mutation

## 2. Build local FrontierChains
In the local conquest area:
- collect connected PRE frontier polylines
- collect connected POST frontier polylines
- split branches into simple chains

## 3. Canonicalize chain direction
Walk each chain in a stable direction using:
- dominant-axis top/left polyline start rule
- consistent chaining from start to end

## 4. Find ChangeAnchorStart and ChangeAnchorEnd
Sample PRE and POST chains densely at `anchorSearchSpacing`.

From the start:
- advance while PRE/POST points match within `anchorTolerance`
- last match = `ChangeAnchorStart`

From the end:
- advance while PRE/POST points match within `anchorTolerance`
- last match = `ChangeAnchorEnd`

If multiple divergence intervals exist, split into multiple ConquestFronts.

## 5. Cut out the conquest fronts
Cut each exact chain at the two anchors.

The sections between them are:
- `preConquestFront`
- `postConquestFront`

## 6. Insert TransitionVertices on-demand
Choose `transitionVertexSpacing`.

Sample both conquest fronts at the same ordered `u` positions.

This creates:
- PRE TransitionVertices
- POST TransitionVertices

## 7. Build TransitionPairs
For each sample index `i`:
- pair PRE vertex `i` with POST vertex `i`

Store the ordered array as `TransitionFront`.

## 8. Build the TransientTransitionFrontline each frame
For each pair:
- evaluate its path from PRE to POST

V1 path:
- quadratic curve through midpoint guide

Then:
- smooth the interior current points 1–2 passes
- keep anchors fixed

The resulting ordered points are the `TransientTransitionFrontline`.

## 9. Rebuild PV loops
Each frame:
- replace the shared frontier section in the two adjacent region loops with `TransientTransitionFrontline`
- render from the rebuilt loops

## 10. Verify final frame
Compare final rebuilt geometry against exact POST geometry.

Required:
- zero deviation, or very small tolerance only

---

## Out of scope for V1
- global optimal transport
- grid-driven correspondence
- influence weighting
- tangents as a required data field
- branch animation inside one TransitionFront

---

## Required diagnostics
Show:
- local PRE/POST FrontierChains
- ChangeAnchorStart / ChangeAnchorEnd
- preConquestFront / postConquestFront
- TransitionVertices
- TransitionPairs
- TransientTransitionFrontline

---

## Failure conditions
Stop and inspect if:
1. a simple chain cannot be formed
2. anchors cannot be found from both ends
3. multiple divergence intervals are not split cleanly
4. final frame does not match POST
5. rebuilt loops do not close
