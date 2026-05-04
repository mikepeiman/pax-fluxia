# 2026-05-04 Phase Field Coordinate Contract Misdiagnosis

## Summary

I introduced a bad follow-up fix in `GameCanvas.svelte` by forcing multiple localized territory families to use `worldMinX = 0` and `worldMinY = 0`.

That patch was intended to remove a suspected double-offset in the presentation-localized render-family path. Instead, it mixed two different family contracts:

- `Phase Field`, whose working branch (`bea2`) still used canonical map-space stars, geometry, and world bounds
- `Phase Edges` / `Ember Lattice`, whose working branch (`c6dd`) already used localized presentation-space stars and geometry together with viewport-frame world mins

The result was predictable in hindsight:

- `Phase Field` remained misaligned because its real issue was not solved by a partial adapter tweak
- `Phase Edges` / `Ember` lost world-border correctness because I changed a branch-proven contract without proving the invariant

## What Went Wrong

I patched a symptom without first locking the mode-specific coordinate contract.

The critical mistake was assuming all branch-derived territory families shared one presentation-space rule:

1. localized stars
2. localized geometry
3. localized container origin
4. zeroed world origin

That assumption was false.

- `bea2` `Phase Field` consumes canonical map-space inputs end-to-end
- `c6dd` `Phase Edges` consumes localized inputs, but still expects the viewport-frame `worldMinX/worldMinY`

I changed the adapter before proving which mode expected which contract.

## Evidence

- `bea2` `GameCanvas.svelte` `metaball_grid_phase_field` path passes:
  - canonical `stars`
  - canonical `geometry`
  - `GAME_WIDTH` / `GAME_HEIGHT`
  - no presentation localization
- `c6dd` `GameCanvas.svelte` `metaball_grid_phase_edges` path passes:
  - localized `territoryPresentationStars`
  - localized geometry
  - `worldMinX/worldMinY = territoryPresentationFrame.minX/minY`

My bad patch forced the `c6dd`-style modes to use `worldMin = 0`, while still leaving `Phase Field` inside the localized path.

## Fix

The corrected fix split the adapter by mode:

- `Phase Field`
  - uses canonical `stars`
  - uses canonical `geometry`
  - uses canonical `GAME_WIDTH` / `GAME_HEIGHT`
  - renders with the territory container reset to `(0, 0)`
- localized shared-family modes
  - keep localized stars and geometry
  - restore `worldMinX/worldMinY = territoryPresentationFrame.minX/minY`

## Preventive Rule

Before changing a shared render-family adapter:

1. identify the source-of-truth branch for each affected mode
2. write down the exact input contract:
   - stars space
   - geometry space
   - world rect space
   - container origin
   - stable/prev-frame space
3. only then patch the adapter

Do not assume sibling territory modes share a coordinate model just because they live in the same runtime surface.
