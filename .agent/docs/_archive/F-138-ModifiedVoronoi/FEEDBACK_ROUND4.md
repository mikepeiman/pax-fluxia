# Visual Feedback Round 4 — 2026-03-03 13:26

## CRITICAL DESIGN RULE: Disconnected Territory Buffer

**Hard Rule:** When same-player stars have adjacent territory but NO lane connection,
other players' territories MUST meet in between to create a visual buffer clearly
showing they are NOT connected.

- Same-owner stars with a lane connection → territories CAN merge (corridor)
- Same-owner stars WITHOUT a lane connection → enemy territory MUST separate them
- This means the merge algorithm should ONLY merge cells whose stars are lane-connected
- The current `clusterSplit` toggle already does this when ON — it uses connected clusters

## Single-Layer Rendering (CORRECTED)
- **DO NOT** render raw Voronoi as a base layer + modified on top
- The pipeline is a series of COMPUTE PASSES that refine polygons
- A SINGLE set of finalized polygons is rendered
- Gaps must be fixed in the compute pipeline, not by layering
- The Voronoi tiles perfectly; modifications must preserve the tiling property

## Gap Root Cause
The Voronoi (from ALL stars) tiles space perfectly. Gaps are introduced by:
1. Star margin pushing boundaries inward → both adjacent polygons shrink → sliver gap
2. Arc smoothing modifying shared vertices independently per polygon → misalignment

**Fix approach:** Modifications should preserve shared edges. When two polygons share an edge vertex, both polygons must use the same modified coordinate for that vertex. The pipeline should operate on SHARED vertices, not per-polygon vertices independently.

## Settings visible in screenshot
- Star Margin: ~110px
- Arc Strength: low
- Arc Threshold: ~150°
- Arc Min Segment: visible
- Cluster Split: ON
- Modified Voronoi: ON
