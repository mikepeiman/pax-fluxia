# FG2 Transition Anchor Fallbacks — 2026-03-13

## Summary
This slice hardens the weakest part of the current FG2 holding animation path: unmatched spawn and vanish transitions. Previously those transitions collapsed toward an almost point-like contour, even when an anchor holding existed nearby. That made split/merge motion visually brittle and increased the chance of weird boundary motion at world edges and multi-owner junctions.

## What Changed
- Added `blendContourReferencePoints(...)` in `fg2SeedGraph.ts`.
- Updated `buildCollapsedShellContourCorrespondence(...)` so anchored spawn/vanish transitions no longer collapse a holding straight toward a near-point version of itself.
- When an anchor holding exists, the collapsed contour now blends the unmatched holding contour toward the aligned anchor contour first, then scales that blended shape around the anchor point.
- Increased the minimum collapsed scale for anchored transitions so the fallback remains visibly shape-like instead of degenerating into a tiny speck.
- Added `isRenderableClosedLoop(...)` as the shared validity gate for displayed holding geometry.
- Updated `resolveInterpolatedOwnerShellGeometry(...)` so all transition kinds, including `spawn` and `vanish`, can fall back to a valid previous/current endpoint geometry if the interpolated contour becomes invalid.

## Why
The intended player-facing behavior is simple:
- holdings should remain visible while they are being created, merged, split, or removed
- transitions should stay attached to recognizable nearby geometry when there is a plausible anchor
- invalid interpolated geometry should degrade to a stable endpoint, not disappear

This does not solve every dynamic continuity issue yet, but it removes a brittle fallback that was structurally biased toward vanishing geometry and point-collapse artifacts.

## Verification
- Filtered diagnostics for `fg2SeedGraph.ts` and `ControlsSection-Territory.svelte` came back clean.
- `bun run build` completed successfully under an elevated run.
- `bun run check` via Bun script runner is currently blocked by a Bun remap issue in this environment, and unprivileged direct checks still hit broader sandbox/esbuild noise outside this slice.

## Next
- Browser-validate split/merge and world-edge cases with FG2 trace mode enabled.
- Replace remaining contour-collapse heuristics with stronger holding correspondence around multi-component ownership changes.
- Move from shell-oriented interpolation language toward simpler holding/partition terminology in diagnostics and UI where it improves clarity.
