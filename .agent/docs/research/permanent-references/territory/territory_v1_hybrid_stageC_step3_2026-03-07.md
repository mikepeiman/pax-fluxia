# Territory Rendering V1 Hybrid - Stage C Step 3 (2026-03-07)

## Scope
Step 3 of the approved execution order:
- Centerline graph extraction from ownership lattice
- Straight-family fitter split behind a shared centerline contract
- No canonical renderer switch in this step (structure-first refactor)

## Implemented Changes
1. Refactored vector-border extraction into explicit stages:
- `buildCenterlineGraphsFromOwnerGrid(...)`
- `fitStraightPolylinesFromCenterlineGraphs(...)`
- `extractVectorBorderPolylines(...)` now acts as a composition wrapper.

2. Introduced explicit centerline graph primitive:
- `CenterlineGraphPair` with:
  - stable owner pair key (`ownerA`, `ownerB`)
  - adjacency map of sampled boundary vertices

3. Preserved deterministic traversal and output behavior:
- Owner-pair processing is key-sorted.
- Junction-first traversal is retained for stable path decomposition.
- Existing simplify/linearize pipeline is retained for straight fitting parity.

4. Kept ownership alignment contract intact:
- No changes to ownership/fill canonical mapping in this step.
- No changes to pass-1/pass-2 resource mapping in this step.

## Why this step exists
This refactor separates "extract centerline graph" from "fit family-specific path geometry",
which is required before promoting geometry borders to canonical in Step 4. It lowers risk by
making the next renderer switch a localized change rather than a rewrite of mixed responsibilities.

## Notes
- This step is intentionally structural and deterministic.
- Visual quality deltas are expected in Stage C Step 4, not in this refactor commit.
