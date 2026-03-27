# Geometry Implementation Strategies & Ideas

**Created:** 2026-03-27
**Source:** Extracted from MECHANICS_atlas §25 (FG2 Diagnostic Geometry, 2026-03-12)

> [!NOTE]
> Preserved as valuable IP. Status and relevance to be reviewed in a future round. This document is a home for implementation-level geometry notes and strategies for any gameplay/architecture component.

---

## FG2 Diagnostic Geometry (2026-03-12)

Notes on FG2 diagnostic semantics for frontier geometry development.

- `regionLoops` are owner-pair loop artifacts extracted from half-edge face walking. They remain pairwise diagnostic surfaces, including the current exterior-face candidate.
- `ownerRegionLoops` are promoted only from pairwise loops that have a strict owner attribution from link provenance (`viaOwner` on `star_arc` and `boundary_extension` edges).
- Tied owner attribution is intentionally kept out of owner-region promotion. Ambiguous loops remain diagnostic-only until a stronger ownership classifier exists.
- In trace mode, owner-region loops should be interpreted as the first candidate territory pieces presently available from FG2, while pairwise region loops remain scaffolding for debugging frontier topology and exterior/partitioning.
- FG2 star-side junctions now come from the global angular order of all contested seeds incident to a star, not from owner-pair-local incidence only. Different owner-pairs can therefore terminate at the same synthesized junction.
- FG2 only projects a frontier side to the world boundary when the corresponding star truly has `<= 1` global contested seed on that side.
- `ownerRegionLoops` now prefers globally resolved owner-region candidates from a merged face walk when available; pair-local owner-region loops remain the fallback diagnostic set.
- `ownerShells` are snapshotted into shell frames and fingerprinted so FG2 can detect shell-geometry or shell-topology changes between updates.
- `ownerShellTransitions` pair shells per owner using centroid, area, perimeter, hole-count, and world-boundary heuristics, then attach explicit contour correspondences; spawn/vanish transitions collapse to the shell centroid.
- While shell playback is active, displayed border presentation now uses animated shell contours (`animated_shell_contours`) instead of the target frame's static pair-frontier polylines.
- FG2 now keeps owner-shell contours as the displayed border source whenever shell geometry exists. `pair_frontiers` are render-stage fallback only when shell geometry is unavailable.
- Static owner-shell fills now draw the outer shell path, then subtract each classified `holeLoopId` using Pixi `Graphics.cut()`, so enclave holes survive in the visible fill artifact.
- Owner-shell frame snapshots and transition artifacts now carry explicit hole-loop geometry, and shell-frame fingerprints include hole geometry rather than only hole counts.
- Interpolated displayed shells now publish a usable hole-loop set chosen from previous/current shell state so playback can continue cutting holes; true hole-to-hole interpolation is still pending.
- Owner-shell transitions now select shell matches globally per owner from all previous/current candidates rather than greedily by current-shell iteration. Each previous shell can match at most one current shell.
- Hole transitions inside a shell transition now use the same non-conflicting candidate selection model, providing a more stable identity mapping for enclaves during topology changes.
- Interpolated hole loops are sanitized against the currently displayed shell polygon before render use. Degenerate or out-of-shell hole loops are dropped instead of being passed through to cutout rendering.
- Animation and render diagnostics now expose owner-shell-hole transition counts and contour sample counts for trace/debug review.
