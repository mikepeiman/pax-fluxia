# Modified Voronoi — Corrections & Ground Truth

## ❌ FALSE DIAGNOSIS: "Unowned Stars Cause Gaps"
**All stars are currently owned.** There are no unowned stars in the present game state.
- My error: diagnosing "unowned stars" as the cause of gaps TWICE, when they don't exist
- The owned-only Voronoi computation IS correct design (future maps may have unowned stars)
- But the CURRENT gaps are from pipeline modifications, NOT from missing cells
- NEVER claim unowned stars are causing the current visual gaps

## ❌ FALSE APPROACH: "Dual-Layer Backfill"
**DO NOT render multiple layers.** No base layer + top layer.
- Pipeline produces ONE set of modified polygons via compute passes
- A single set of finalized polygons is rendered
- Corrected by user once

## ❌ FALSE APPROACH: "Bleed/Overlap"
**DO NOT enlarge polygons by pixels to overlap.** This is a hack, not a solution.

## ✅ GROUND TRUTH: Gap Root Cause
The Voronoi from d3-delaunay tiles PERFECTLY — every point belongs to exactly one cell.
Gaps are introduced ONLY by pipeline modifications:
1. **Star margin** pushes boundary vertices inward → both adjacent polygons shrink → gap
2. **Arc smoothing** modifies shared vertices independently per polygon → misalignment
3. **Disconnect buffer** pushes vertices → creates space not filled by neighbors

## ✅ GROUND TRUTH: What the User Wants
- Single-layer rendering of ONE set of modified polygons
- Pipeline = compute passes that refine polygon shapes
- 100% map coverage — no empty dark space
- Disconnect buffer: non-connected same-owner pairs get enemy territory wedged between them
- Corridors: virtual sites along same-owner lanes for connected territory feel

## ✅ DESIGN RULES
- Star margin is a HARD CONSTRAINT applied LAST in pipeline
- Modifications must preserve the tiling property (shared edges stay consistent)
- Cluster split separates non-connected same-owner regions
