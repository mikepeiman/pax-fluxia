# FG2 Global Junctions and Face Resolution (2026-03-12)

## Summary
Moved FG2 one level closer to canonical frontier geometry by making star-side junction synthesis global across all contested seeds, then using a global face walk to derive stronger owner-region candidates.

## Files
- `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts`

## Slice A: Global Star Junctions
- Added `buildGlobalStarIncidence(...)` over all FG2 seeds.
- Added `buildGlobalStarJunctionCatalog(...)` so star-side junctions are synthesized from global angular adjacency, not owner-pair-local adjacency.
- `buildPairTopologyGraph(...)` now consumes that shared catalog.
- Pair graphs only extend to the world boundary when the corresponding star truly has `<= 1` global contested seed on that side.
- Topology summaries now expose `sharedJunctionCount`.

## Why This Matters
- Different owner-pairs can now terminate at the same actual star-side junction.
- This removes one major source of pair-local fake closure and is a prerequisite for unified territories that fit together.

## Slice B: Global Face Resolution
- Built a global topology graph by merging all pair graphs.
- Ran half-edge face walking across that merged arrangement.
- Added a global owner-hint resolver that assigns a face to an owner when `viaOwner` evidence has a strict winner.
- Loop artifacts now prefer globally resolved owner-region loops when available, while retaining pairwise owner-region loops as fallback diagnostics.
- Added loop summaries for:
  - `globalHalfEdgeCount`
  - `globalFaceWalkCount`
  - `globalClosedFaceWalkCount`
  - `resolvedOwnerRegionLoopCount`
  - `ambiguousGlobalFaceWalkCount`

## Current Interpretation
- `regionLoops` remain pairwise scaffolding.
- `pairOwnerRegionLoops` are pair-local owner-attributed candidates.
- `resolvedOwnerRegionLoops` are stronger candidates derived from the global frontier arrangement.
- `ownerRegionLoops` now publishes the resolved global set when available, otherwise the pair-local fallback set.

## Verification
- Targeted `bun run check` for `src/lib/territory-engine/*` passed after the topology and global-face changes.
- Remaining reported items were the same existing unused CSS selector warnings in `ControlsSection-Territory.svelte`.

## Demo Expectation
With trace mode enabled, the frontier/junction scaffold should be more coherent around contested stars, and owner-colored candidate region fills should increasingly come from the unified global face walk instead of isolated pair loops.

## Next
- Use the globally shared junctions to reduce remaining pair-local world-edge duplication.
- Promote resolved owner-region loops into more stable fill-ready owner shells/components.
- Add stronger ambiguity diagnostics for unresolved global faces.
