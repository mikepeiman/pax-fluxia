# Territory Engine FG2 Face-Walk Scaffold - 2026-03-12

## Branch
- `codex/territory-engine-epic-fg2-face-walk`

## Objective
- Add explicit half-edge and face-walk structure to FG2 without forcing an immediate change to the render-stage frontier output.

## Implemented In This Slice

### 1. Directed half-edge records
- Each owner-pair topology link now expands into two directed half-edges.
- Every half-edge records `fromNodeId`, `toNodeId`, a `twinHalfEdgeId`, and its outgoing angle.

### 2. Node-local angular ordering
- Outgoing half-edges are sorted per node by angle.
- At each destination node, the twin edge is used to derive `leftNextHalfEdgeId` and `rightNextHalfEdgeId` pointers.
- This gives FG2 the first explicit rotational embedding needed for later face extraction.

### 3. Left-face walks in loop stage
- Loop stage now walks directed half-edges with the left-next rule.
- It records per-owner-pair face walks, including whether each walk closed and the signed area of closed loops.
- Loop artifacts now expose `halfEdgeCount`, `faceWalkCount`, and `closedFaceWalkCount`.

### 4. Render contract preserved
- Geometry/render stages still emit the current frontier polylines from the node/link graph.
- This branch is architectural scaffolding: it adds canonical face metadata while keeping visual output stable for comparison.

## Verification
- Targeted `bun run check` filtering for `src/lib/territory-engine/*` returned no diagnostics via `atlas-harness` after the half-edge additions.

## Current Limits
- Left-face walks are not yet used to distinguish interior regions from exterior world faces.
- World-corner stitching is still absent, so boundary anchors do not yet produce full rectangle-aware face closure.
- Render-stage frontier extraction still uses the existing node/link traversal rather than the half-edge graph.

## Next Step
- Promote the half-edge graph into true face extraction: stitch world-corner segments, classify usable faces, and feed canonical shared-edge regions into fill reconstruction.
