# Territory Stage 2A Scaffold Note

Date: 2026-03-08
Status: Implemented scaffold, not yet switched live canonical renderer

## What Was Implemented
- The central territory/settings liveness bridge was stabilized and committed.
- The lattice-derived centerline extractor in `centerlineGraph.ts` was explicitly demoted to legacy naming and comments.
- A new canonical frontier module was added in `pax-fluxia/src/lib/renderers/frontierGraph.ts`.
- The new module includes:
  - graph-distance view types,
  - analytic lane frontier point extraction,
  - frontier graph construction,
  - frontier polyline extraction scaffold.

## Intentional Temporary Divergence From Final Directive
The live renderer has **not** yet been switched from legacy owner-grid centerlines to the new frontier graph.

Reason:
- Stage 2A lane frontiers are now scaffolded, but Stage 2B / Stage 4 frontier completion is not yet complete.
- Switching the live mesh renderer to a lane-only frontier source at this point would create another partial-canonical regression: cleaner math source on lanes, but incomplete full-plane borders/fills elsewhere.
- The safer incremental move is to land the canonical frontier substrate first, then switch the renderer only when the merged frontier path is ready to preserve visual continuity and alignment.

## Current Practical Meaning
- `mesh` runtime output is still not canonical-quality.
- The new code exists to support the next implementation step:
  - merge analytic lane frontiers with refined field frontiers,
  - route canonical border polylines from `FrontierGraph`,
  - then backfill visible fills from the same geometry truth.

## Next Required Step
- Wire `FrontierGraph` into the live border pipeline behind the canonical branch only after Stage 2B/4 produce sufficient full-plane frontier coverage.
