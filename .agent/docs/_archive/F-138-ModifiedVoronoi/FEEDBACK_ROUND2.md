# Visual Feedback Round 2 — 2026-03-03 12:50

## Screenshot Analysis (user-annotated)

### Issue 1: Junction vertices — "green and yellow should meet"
- **Location:** Center-right area where green and yellow territories converge
- **Problem:** At multi-owner junction points, boundary edges from different owner polygons don't share exact vertices. Boundaries end near each other but don't connect cleanly.
- **Root cause:** Each merged polygon is computed independently per cluster. Shared boundary vertices between different owners aren't explicitly synchronized.
- **Fix needed:** When two different-owner cells share an edge, both polygons should use the exact same vertex coordinates at the junction. This is already handled by the Voronoi diagram geometry (shared edges have identical endpoints), so the issue may be introduced by the star margin or arc smoothing stages which modify vertices independently per polygon.

### Issue 2: Star margin must take precedence — "clear error"
- **Location:** Lower-right area, circled in orange
- **Problem:** Territory boundaries cut through or pass too close to star centers. The modified boundaries should maintain the minimum star margin as a HARD constraint.
- **Root cause:** The arc smoothing stage (Stage 4) runs AFTER star margin (Stage 3), and may pull vertices back toward stars. Arc smoothing creates Bézier control points by retracting toward the nearest star, which can move the boundary CLOSER to stars — violating the margin.
- **Fix needed:** Either:
  - (a) Re-apply star margin AFTER arc smoothing to enforce the constraint last, OR
  - (b) Ensure arc smoothing's Bézier control point calculation respects the star margin minimum distance

### Issue 3: No empty spaces — "need to backfill"
- **Location:** Lower-left area with visible gaps between territory polygons
- **Problem:** Empty/uncovered regions exist between territory polygons. The user wants COMPLETE coverage — every pixel within the game world should belong to some territory.
- **Root cause:** The original Voronoi diagram provides complete coverage (every point belongs to exactly one cell). But the merging algorithm only keeps OWNED star cells. Unowned stars' cells create gaps. Additionally, if star margin pushes boundaries inward, gaps appear between adjacent different-owner territories.
- **Fix needed:** This is essentially **F-137 (Periphery Coverage)** expanded: ensure full spatial coverage by either:
  - (a) Including unowned stars' cells in the rendering (filled with neutral color), OR
  - (b) Extending owned territory boundaries outward to fill gaps, OR
  - (c) Computing boundaries using ALL stars (owned + unowned), then only rendering owned cells — which the Voronoi already does, so the gaps may be coming from the margin/smoothing stages

## Current Pipeline Order
```
d3-delaunay Voronoi → Merge same-owner → Star Margin → Arc Smoothing → Chaikin → Render
```

## Proposed Pipeline Fix
```
d3-delaunay Voronoi (ALL stars) → Merge same-owner → Arc Smoothing → Star Margin (last, hard constraint) → Chaikin → Render
```
Moving Star Margin to AFTER Arc Smoothing ensures it's the final geometric constraint applied.

## Settings Used in Screenshot
- Star Margin: ~90px
- Arc Strength: slider visible (mid-range)
- Arc Threshold: ~150°
- Arc Min Segment: slider visible
- Cluster Split: ON
- Modified Voronoi: ON
