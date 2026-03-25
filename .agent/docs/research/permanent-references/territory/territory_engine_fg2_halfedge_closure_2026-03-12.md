# Territory Engine FG2 Half-Edge Closure Slice - 2026-03-12

## Branch
- `codex/territory-engine-epic-fg2-halfedge-closure`

## Objective
- Promote FG2 from seed-local pair chaining into a topology that can represent turns around stars and explicit map-edge termination without changing the territory-engine stage contract.

## Implemented In This Slice

### 1. Typed owner-pair topology graph
- `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts` now models owner-pair graphs with typed nodes (`seed`, `junction`, `boundary`) and typed links (`star_arc`, `boundary_extension`).
- Topology artifacts now report `graphNodeCount`, `junctionCount`, and `boundaryAnchorCount` in addition to link totals.

### 2. Star-junction synthesis
- Contested seeds are still created per hostile lane via biased tie solve.
- Around each star, incident seeds are sorted by angle.
- Adjacent seed pairs synthesize a junction node on a radius derived from star radius plus configured star margin.
- Two `star_arc` links connect the seed pair through that junction, giving the geometry stage an explicit turning node instead of a direct local heuristic edge.

### 3. Boundary anchors and first-pass world closure
- If a seed has only one continuation on a star side, that side is treated as open.
- A ray is projected from the seed away from the star to the world rectangle.
- The hit point becomes a `boundary` node, and a `boundary_extension` link connects the seed to that anchor.
- This gives FG2 a canonical place to terminate open frontiers on the map boundary instead of leaving them floating locally.

### 4. Generalized frontier extraction
- Geometry extraction now walks the generalized node/link graph instead of seed-only adjacency.
- Traversal prefers switching star sides when passing through a seed, approximating half-edge continuity across contested lanes.
- The extractor emits open or closed frontier polylines from the same graph that trace mode visualizes.

### 5. Trace-mode visibility
- Trace mode still shows white seed markers.
- It now also renders faint pair-graph links plus colored markers for synthesized junctions and boundary anchors.
- This makes the new topology surface inspectable in the interactive step pipeline.

## Verification
- Targeted `bun run check` filtering for `src/lib/territory-engine/*` returned no diagnostics via `atlas-harness` after the rewrite.

## Current Limits
- Traversal is still a heuristic scorer, not a canonical half-edge face walk.
- Boundary anchors stop at world edges, but world-corner stitching is not implemented yet.
- Fill-loop reconstruction still uses hints; a canonical closed-region assembler does not exist yet.

## Next Step
- Introduce explicit half-edge records, stitch boundary/corner segments into faces, and reuse that shared-edge truth for fills, borders, and geometric transitions.
