# MSR Redesign And Geometry Diagnostics - 2026-05-01

## Problem

The user reported two linked issues in the live app:

1. `Show Underlying Geometry` was missing from the visible Diagnostics surface.
2. `MSR` was behaving opposite to intent:
   - acceptable at `0`
   - visibly harmful around `75px`
   - catastrophic at larger values
   - frontiers cut directly through owned stars instead of giving them breathing room

The screenshots confirmed that owned frontiers were intruding through the orange stars instead of routing around them.

## Previous Implementation

`MSR` was not acting as an explicit frontier-clearance rule. It was spread across three different mechanisms:

1. real Power Voronoi star sites used `starMargin * starMargin` as their weight
2. corridor and disconnect virtual sites also inherited `MSR`-scaled weights
3. merged territory fill vertices were pushed outward after geometry construction

That is force-like behavior, not a deterministic geometry constraint. It also means increasing `MSR` can destabilize the power diagram itself instead of cleanly enforcing star clearance.

## New Implementation

`MSR` is now treated as explicit geometry correction over the frontier network:

1. real star sites use fixed `0` weight
2. virtual corridor / disconnect sites use a fixed spatial reference weight scale independent of live `MSR`
3. shared frontiers and world-border frontiers are corrected by `applyExplicitMinStarMargin(...)`
4. merged territory fill regions are rebuilt from the corrected frontiers

This keeps fill and border geometry aligned and makes `MSR` deterministic.

## Local Radius Rule

The new `MSR` utility computes a per-star effective radius:

- start from requested `MSR`
- cap against nearest different-owner stars
- cap against world edges
- do not reduce because of same-owner neighbors

This matches the intended meaning: `MSR` is about owned-frontier breathing room around stars, not about crowding inside one connected territory.

## Diagnostics Surface

`Show Underlying Geometry` now belongs to Diagnostics `Mode Diagnostics` rather than the perimeter-field-only block.

`GameCanvas.svelte` now uses the active shared render-family geometry for the overlay in:

- `perimeter_field`
- `metaball`
- `metaball_grid`
- `metaball_grid_phase_edges`

Perimeter-field transition-target preview geometry remains available separately when that mode's scrub/replay tools are active.

## Validation

Verified with:

- `bunx vitest run src/lib/territory/geometry/minStarMargin.test.ts src/lib/config/geometry0319Debug.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts src/lib/territory/families/buildFamilyGeometry.test.ts`

Result:

- all 14 tests passed

`bun run check` filtered against the touched geometry/diagnostics files produced no new errors; only pre-existing unused CSS warnings remained in settings surfaces.

## Live Verification Needed

The user should verify in-app:

1. `Show Underlying Geometry` appears in Diagnostics `Mode Diagnostics`
2. the geometry overlay tracks the active territory geometry truth in the shared render-family modes
3. the previously bad stars no longer get cut by frontiers when `MSR` is increased to normal working values
