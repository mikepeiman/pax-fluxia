# Post-Mortem: 2026-05-04 - Background Runtime Scope Drift

## What Happened

During the Sprint 5 hardening pass for regional ambient backgrounds, the implementation was broadened to add explicit support for `distance_field` and `perimeter_field`. The user then corrected that this was outside the agreed scope. The maintained target runtime set for this lane was:

- `power_voronoi_canonical`
- `metaball_grid_phase_edges`
- `metaball_grid_ember_lattice`
- `metaball_grid_phase_field`

The broadened support was landed in code, tests, and handoff docs before that correction.

## Root Cause

- I treated a prior exploratory planning branch as if it were still the active implementation contract.
- I let a "hardening / compatibility" step widen scope without re-checking the agreed render-mode target list against the current user instruction.
- I updated the capability matrix and docs as if they were implementation-neutral metadata, when they were actually product-scope commitments.

## Impact

- The branch temporarily advertised and partially implemented support for territory runtimes the user had explicitly ruled out.
- The handoff and queue became misleading because they described a broader supported runtime set than the intended deliverable.
- Without correction, merge-back would have carried the wrong scope assumptions into later work.

## Corrective Actions

- Removed the accidental `distance_field` / `perimeter_field` support claims from the active background capability matrix.
- Restored the committed gameplay runtime support contract to:
  - `power_voronoi_canonical`
  - `metaball_grid_phase_edges`
  - `metaball_grid_ember_lattice`
  - `metaball_grid_phase_field`
- Updated gameplay UI copy, runtime gating, tests, queue, session notes, chat log, and handoff so they all reflect the corrected scope.

## Lessons

- "Hardening" is still feature work when it changes which runtimes are supported.
- The capability matrix is not harmless metadata; changing it is a scope decision and must be checked against the active plan.
- Before expanding support to any additional render mode, I need to restate the exact approved target mode list and compare it to the implementation surface being changed.
