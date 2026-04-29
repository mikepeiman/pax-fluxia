# Post-Mortem - 2026-04-29 - Metaball Grid Cumulative Conquest Attribution

## Failure
- Successive `metaball_grid` conquests could re-mark broad settled territory as transition-active.
- User symptom: after the first capture, later captures made large parts of the map keep transitioning despite steady-state ownership.

## Root Causes
- `GameCanvas.svelte` cached the PREV render-family frame only when no transition was active, so later conquest keys could reuse an old idle frame instead of the most recently presented family frame.
- `planGridWave.ts` still built a synthetic default-event wave bucket for unattributed changed cells.
- `metaballGridActiveFrontier.ts` and `renderMetaballGridScene.ts` treated missing flip times as `0`, which let unattributed cells enter the animated path.

## Fix
- Moved render-family PREV-frame capture semantics to “last presented authoritative frame” by updating the cache after each family present, not only in idle state.
- Stopped building a wave plan for the synthetic default event bucket.
- Limited the active frontier to cells that have real conquest flip times.
- Changed unattributed changed cells in the scene builder to snap directly to settled NEXT output instead of animating.

## Guardrails Added
- `planGridWave.test.ts`: synthetic default bucket no longer animates.
- `renderMetaballGridScene.test.ts`: unattributed emergent/dispossessed/vacating cells render settled, not animated.
- Existing `MetaballGridFamily.test.ts` cleanup regression coverage remains in place.
