# Post-Mortem: 2026-05-27 - Grid Gradient Fill Transition Disconnection

## What Happened

Grid Gradient fill transitions were repeatedly reported as visually absent even though diagnostics showed transition progress. The implementation had transition code in the family and shader path, but that was not sufficient evidence that the family was receiving drawable PREV/NEXT transition data.

## Root Cause

Grid Gradient accepted `activeTransition` from the render-family lifecycle while the event could still be a pending conquest preview. At that point the star ownership and geometry may still represent the pre-conquest state, so a transition clock can exist before the drawable post-conquest state exists.

The previous-frame cache was also trusted without checking that its ownership snapshot still contained the previous owner for each event. If that cache had already advanced, it could no longer serve as the PREV side of the transition.

## Impact

The UI could display progress, local clock state, and active transition diagnostics while the rendered fill had no meaningful visual delta to animate.

## Corrective Actions

- Added a helper that requires every event star to show the `newOwner` before Grid Gradient receives `activeTransition`.
- Added a helper that validates cached previous-frame ownership against every event's `previousOwner`.
- Rebuilt previous geometry from reverted stars when the stable cache is missing or owner-mismatched.
- Added unit tests for both guards.

## Lessons

- A live transition clock is not proof that presentation has a drawable state delta.
- Render-family modes that consume pending conquest previews must explicitly distinguish preview timing from post-owner geometry availability.
- Previous-frame caches used for rendering must validate their ownership contents, not only their existence.
