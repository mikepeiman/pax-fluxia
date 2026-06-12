# 2026-05-20 - Grid Gradient Geometry Source and Border Fix

## Context

User verification found that Grid Gradient borders became glitchy when the shared `Geometry Source` selector was set to `resolved_vector`. The user also clarified that the border complaint was about real vector borders with `Vector borders` enabled, not the optional dotted-border presentation.

## Cause

- `TerritoryGeometrySourceTuning.svelte` and the `PERIMETER_FIELD_GEOMETRY_SOURCE` selector predated Grid Gradient.
- This worktree made the existing shared source selector visible for Grid Gradient by including `isGridGradientStyle()` in `showsDerivedGeometryInput()`.
- Grid Gradient also inherited saved global geometry-source state because its render-family input did not receive a mode-specific config source.
- `drawGridGradientVectorBorders()` stroked each display polyline independently. When one logical owner-pair front arrived as multiple touching display sections, Grid Gradient could show caps/seams and per-section color differences instead of one continuous blended owner-pair border.

## Fix

- Grid Gradient no longer shows the shared `Geometry Source` card.
- Grid Gradient now gets a mode-specific render-family config source that pins `PERIMETER_FIELD_GEOMETRY_SOURCE` to `power_voronoi_0319`, so a saved `resolved_vector` setting cannot feed this mode.
- Grid Gradient render-family input now receives that config source, keeping settings, diagnostics, and geometry dispatch aligned.
- Vector borders now group display-border polylines by normalized owner pair, join touching sections, and stroke each joined chain with one blended owner-pair color.
- Vector-border cache invalidation now includes the display-border fingerprint and hue shift.

## Validation

- Targeted Vitest passed:
  - `bun test "src/lib/territory/families/gridGradient/paint.test.ts" "src/lib/territory/families/gridGradient/gridGradientScene.test.ts"`
  - 9 tests passed.
- `bun run build` passed in `pax-fluxia/`.
- Started an isolated dev server on `127.0.0.1:1462` and confirmed HTTP 200, then stopped it.
- Browser automation could not complete because the bundled Playwright package is missing `playwright-core`; user visual verification is still needed for the final border appearance.
