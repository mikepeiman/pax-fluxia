# Post-Mortem: 2026-04-13 - Metaball Control Surface Drift

## What Happened

Metaball conquest transitions existed in code, but the user could not tune them from the exposed control surfaces.

The Conquest panel still presented a legacy `Ghost Mode` / `VS Transition` surface that primarily belonged to the Power Voronoi path, while Metaball was using separate hardcoded timing behavior in its family scene builder. I initially discussed Metaball transition behavior without first reconciling which panel controls actually drove the live renderer.

The result was a mismatch between UI, config, and runtime:

- Territory did not own renderer-specific transition mode selection.
- Conquest surfaced numeric `VS_*` controls that were not wired into Metaball.
- Metaball had no explicit renderer-contextual mode selector for its own conquest variants.

## Root Cause

This was architecture drift across three layers:

- UI ownership drift: renderer-specific mode selection and numeric transition tuning were mixed together in the wrong panel.
- Config drift: `VS_TRANSITION_MODE` encoded only the legacy Voronoi transition variants even though Metaball now needed its own renderer-specific modes.
- Runtime drift: Metaball conquest behavior was implemented as bespoke family logic without consuming the existing tuning surface that already existed in config.

The deeper failure was process: I implemented the first Metaball transition by adding renderer behavior first, instead of first tracing the control surface, config contract, and runtime consumer as one coherent system.

## Impact

- The user could not tune Metaball conquest behavior from the UI even though adjacent controls implied that they should.
- The UI language was misleading because `Ghost Mode` described a legacy PV concept, not the actual renderer-specific transition mode in use.
- Extra iteration was required to trace which controls were live, which were legacy-only, and which were dead knobs for Metaball.

## Corrective Actions

- Added a shared transition-mode catalog that supports both legacy PV/VS modes and Metaball modes under `VS_TRANSITION_MODE`.
- Moved renderer-specific transition mode selection into Territory, where renderer choice already lives.
- Kept numeric conquest tuning in Conquest and surfaced `VS_BIND_TO_TICK` there instead of leaving it hidden.
- Wired Metaball directly to the existing `VS_*` timing and influence controls.
- Added a Metaball-specific conditional control for `METABALL_BURST_BOUNDARY_BASIS`.
- Added tests for renderer-contextual transition mode coercion and for Metaball mode-specific scene generation.

## Lessons

- For renderer work, a feature is not complete until UI surface, config contract, and runtime consumer are aligned.
- Shared config keys are acceptable only if the option set is contextualized by renderer; otherwise the control surface becomes dishonest.
- Before answering “is this control enabled,” I need to trace the full path from panel input to runtime consumer, not infer intent from naming or proximity.
