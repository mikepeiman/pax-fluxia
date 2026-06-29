---
date created: 2026-06-29
last updated: 2026-06-29
last updated by: AI (Claude Opus 4.8, opus-territory)
relevant prior docs: .agent/docs/game/design/2026-06-27_SETTINGS_BUGS_AND_OPEN_ITEMS.md
---

# Post-Mortem: 2026-06-29 — FIELD fill-vs-border inverted in my code reasoning

## What Happened
Across several turns I told the user that the "smooth fill matching borders" defect was
the *frontier technique* (shader-band vs control), then that it was *phase sampling*
(nearest vs linear), then — for Phase Field (FIELD) — that "FIELD's border is stroked
from cell edges while its fill is masked by smooth region-ring geometry." Each was stated
as a conclusion. The user's live results proved them wrong in sequence, and the FIELD claim
was **inverted**: in reality FIELD's BORDER is the smooth one and its FILL is the
cell-stepped one.

## Root Cause (the actual code truth)
For `borderMode = territory_edge` + blended borders (FIELD's defaults, both ON in the
screenshots), `CellGridPhaseFieldFamily` sets
`useConstraintAlignedCenterlineBorders = true`, which:
- routes the border to `drawConstraintAlignedTerritoryBorderOverlay(geometry = currentResolvedGeometry)`
  → a **smooth** centerline stroke from the constraint geometry, and
- **bypasses** the cell-edge `drawBorderOverlay` (`borderSceneCells` is only filled in the
  `!useConstraintAlignedCenterlineBorders` branches, so it stays empty).

Meanwhile the FILL is ownership cells (`renderPatternTexture` → `paintCellScene`) masked by
`drawGeometryFill(currentFillGeometry)` where `currentFillGeometry` is the **merged** outer
territory. The merged white mask clips only the OUTER perimeter; the **internal
player-vs-player frontiers are cell ownership boundaries** → 64px steps. So: smooth border,
stepped fill → they can't coincide. That is the visible FIELD defect.

## Mistaken Reasoning (why I inverted it)
1. I grepped `drawBorderOverlay`, saw it stroke cell edges, and concluded "FIELD's border =
   cell edges" **without reading its guard**. The guard (`useConstraintAlignedCenterlineBorders`)
   bypasses that whole path for FIELD's actual settings. I read a function, not the path.
2. I called the region-ring mask "smooth" and assumed it shaped the visible fill edge,
   **without checking that it only masks the merged outer boundary** (not internal frontiers,
   which are what the user sees between colored regions).
3. I stated both as fact (§2.2 violation) and never reconciled them against the screenshots
   until the user forced it. Repeated "wait, actually" reversals (§7.4) were the tell that I
   was theorizing, not tracing.

## Diagnostic Method (what finally worked)
- Read the user's two FIELD screenshots LITERALLY (RULE 0.4): fill edge is cell-grid-stepped,
  gets finer (not smoother in shape) as Cell Spacing drops — proving the fill follows the cell
  grid, not a curve.
- Traced the FULL steady-state render path in `CellGridPhaseFieldFamily.update` (lines
  ~1801, ~2261–2370): the `useConstraintAlignedCenterlineBorders` gate → which border draws →
  which mask the fill uses. Only after the end-to-end trace did the inversion become obvious.

## Impact
- Wasted several turns + multiple false "found it / fixed it" claims, eroding trust.
- Two real but MIS-AIMED changes shipped to Phase Edges/Ember (shader-band default — reverted;
  linear phase sampling — kept, harmless). They did not address FIELD at all.
- FIELD still renders smooth-border-over-stepped-fill.

## Corrective Actions
- RULE for myself, enforced from here: **never conclude which primitive draws a thing from a
  single function read — trace the guard/dispatch that selects it, end to end, every time**
  (RULE 0 + §7.4). When a claim is about GPU output I haven't seen, mark it a hypothesis, not
  a fact (§2.2), and prefer the user's live view as ground truth.
- The FIELD fix must make the FILL follow the SAME smooth constraint geometry the border
  already uses (clip each owner's cells to its smooth region), so fill frontiers match the
  smooth border — keeping the cell texture (the Cell Shape/Inset/Corner controls must remain
  meaningful, so do NOT replace cells with flat polygons).

## Lessons
1. A function existing ≠ that function being on the active path. Read the dispatch.
2. "The mask is smooth" says nothing about the internal frontiers unless the mask is
   per-owner. Check WHAT a mask actually bounds.
3. Inverting fill/border from my own reading is a hard signal I skipped the trace. Stop and
   re-trace on the first reversal, not the fourth.
