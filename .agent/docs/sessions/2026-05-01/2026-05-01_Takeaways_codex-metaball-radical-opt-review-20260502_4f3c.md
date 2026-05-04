# Takeaways - 2026-05-01

## Key Findings

### `Perimeter Field` is currently using the `power_voronoi_0319` geometry engine

Live path:

1. `GameCanvas.svelte` render-family dispatch
2. `buildPerimeterFieldRenderFamilyGeometry(...)`
3. `buildPowerVoronoi0319RenderFamilyGeometry(...)`
4. `computeGeometry0319(...)`
5. adaptation into `CanonicalGeometrySnapshot`
6. `buildPerimeterFieldScene(...)`
7. `PerimeterFieldFamily.update(...)`
8. `MetaballRenderer` final presentation

### The apparent loss of transition is mostly a tuning regression

Current live values:

- `PERIMETER_FIELD_SAMPLE_SPACING = 120`
- `PERIMETER_FIELD_INFLUENCE_WEIGHT = 0.1`
- `PERIMETER_FIELD_STAR_METABALL_WEIGHT = 8`

This creates an extreme imbalance:

- perimeter shell is sparse
- perimeter shell is weak
- star anchors are strong

Approximate effect:

- a representative current star anchor is about `13.8` strength
- a perimeter shell sample is `0.1`
- roughly `138:1` in favor of the star anchor

Result:

- steady-state silhouette drifts toward star blobs
- dynamic perimeter motion becomes hard to see even if it is still present numerically

### There is also a real code defect

- `PerimeterFieldFamily.ts`
  - `readFreezeBaseDuringTransition(...)` ignores the surfaced `false` setting
  - it hard-forces `true`

Result:

- the mode always uses the PREV-base localized-overlay branch
- the user-facing control is currently lying about what the system will do

### Two exposed transition knobs are not governing the active engine

- `PERIMETER_FIELD_OLD_BOUNDARY_FADE`
- `PERIMETER_FIELD_NEW_BOUNDARY_GROW`

They still affect the legacy perimeter-source transition branch, not the active `plan` branch.

Result:

- they are poor debugging levers for the current live mode
- they should either be wired into the active engine or removed/retired from that UX surface

## Operational Lessons

1. When reintroducing star-centered metaballs into `Perimeter Field`, always evaluate their strength relative to perimeter-shell sample power, not in isolation.
2. `Perimeter Field` can look â€œtransition-deadâ€ even when the plan path is still active, if the static field mass dominates the localized movers.
3. Surfaced motion controls must be audited against the currently active transition engine, not merely kept alive because they still compile.
4. A user toggle that is intentionally ignored in code should be treated as a defect, not a temporary implementation detail.

## Recommended Next Fixes

1. Rebalance the perimeter-shell tuning versus star-anchor tuning.
2. Make `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION` honest.
3. Clean up or wire up `OLD_BOUNDARY_FADE` / `NEW_BOUNDARY_GROW` for the active `plan` path.

## Follow-up Repair Landed

### `Topology Plan` was dropping valid perimeter loops on winding sign

New confirmed invariant:

- a valid outer topology loop must not disappear from `Perimeter Field` because of arbitrary chain-walk winding

Fix that landed:

- frontier-topology loop construction now normalizes negative loops to positive winding
- plan-mode perimeter sampling also normalizes defensively before sampling
- the sampler no longer gates on `signedArea > 0`; it gates on non-zero area and then uses normalized winding

Practical result:

- the obvious `Topology Plan` bug where some territories had zero perimeter Vstars now has a concrete fix

### Important remaining distinction

This winding fix is not the same as fixing border placement.

After this pass:

- coverage loss from dropped loops is addressed
- border-vs-geometry-vs-vstar divergence may still remain, because the rendered borders are still extracted from the raster winner grid in `MetaballRenderer`

Operational lesson:

- do not use signed loop orientation from raw chain-walk output as an ownership-validity filter unless the topology builder has already canonicalized winding

### Small but real presentation fix

- shared metaball border strokes now use round caps / joins instead of butt / miter

This should reduce visible border gaps at chained segment joins, but it does not replace the need for a later equal-contour border extraction improvement if alignment against perimeter Vstar chains is still poor.

### Geometry-derived backfill is now the primary interior fill stabilizer

New rule for `Perimeter Field`:

- do not rely on star-centered metaballs as the only mechanism for keeping region interiors filled

What landed:

- deterministic interior support samples derived from the trusted region geometry
- support is inset away from the boundary so it backfills the interior without becoming the visible frontier

Practical result:

- `Star Metaball Power` can still help as augmentation
- but consistent fill should now come primarily from geometry-derived support, not from star cores

### Retraction: geometry-derived support is not part of the final intent

That previous takeaway was superseded in the same session.

User direction is explicit:

- `Perimeter Field` should not get its primary fill from a secondary interior metaball field

Final retained state from this repair line:

- keep the topology-loop coverage fix
- keep the border cap/join cleanup
- remove the geometry-derived support-sample fill experiment

