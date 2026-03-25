# FG2 Loop Face Classification — 2026-03-12

## Purpose
Advance FG2 from raw half-edge scaffolding toward canonical region extraction by explicitly classifying closed left-face walks.

## State Before This Slice
FG2 already had:
- typed pair graphs with seeds, junctions, boundary anchors, and world-perimeter corner closure
- half-edge construction from pair-graph links
- left-face walk enumeration

But loop output was still too weak to drive anything downstream. It only reported counts of open/closed walks, with no notion of which closed walk was probably the rectangle exterior and which closed walks might represent canonical interior faces.

## What Landed
### 1. Richer face-walk diagnostics
`FG2FaceWalk` now carries:
- stable `faceWalkId`
- signed `area` and `absArea`
- per-node-type counts (`seed`, `junction`, `boundary`, `corner`)
- `touchesWorldBoundary`
- `isExteriorCandidate`
- `isCanonicalCandidate`

### 2. Pair-level face classification output
`FG2PairHalfEdgeGraph` now records:
- `canonicalFaceWalks`
- `canonicalFaceWalkCount`
- `exteriorFaceWalkId`

### 3. Deterministic current heuristic
After left-face walks are built:
- closed non-zero-area walks are sorted by absolute area, then world-boundary touch, then stable ID
- the largest walk becomes the current exterior-face candidate
- the remaining non-zero closed walks become canonical-face candidates

This is intentionally diagnostic. It is not the final correctness rule for region ownership, but it gives the next slice concrete structured input instead of raw walk lists.

## Files Changed
- `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts`
- `.atlas/MECHANICS.md`
- `.atlas/DECISIONS.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md`

## Verification
Targeted `bun run check` filtering for `src/lib/territory-engine/*` returned no diagnostics after the slice landed.

## Important Limitation
Exterior detection is still heuristic. The current rule is:
- largest closed face wins, with world-boundary touch as tiebreaker

That is enough to progress diagnostics and shape the next implementation step, but it is not yet a final canonical exterior/interior proof.

## Next Slice
Use face-walk metadata to replace the current heuristic with stronger exterior detection and then promote canonical face candidates into owner-region loop artifacts consumable by later fill reconstruction.
