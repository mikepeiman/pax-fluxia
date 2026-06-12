# Post-Mortem: 2026-05-27 - Grid Gradient Transition Trace Spam

## What Happened

The Grid Gradient transition trace produced endless renderer logs even while the game was paused.

## Root Cause

The diagnostic path logged every frame-level scheduler, presentation, family, and shader stage whenever `GRID_GRADIENT_DEBUG_TRANSITIONS` was enabled. It did not require transition activity, and it did not dedupe repeated stage states. Several logged payloads included volatile timing fields, so the stream kept moving without producing better diagnostic signal.

## Impact

- The logging surface became noisy enough to be unusable.
- Paused gameplay still produced log churn.
- The diagnostic tool added cognitive load instead of isolating the transition failure.

## Corrective Actions

- Added a shared Grid Gradient transition trace logger.
- Dropped idle/no-transition payloads.
- Deduped each stage by transition activity signature.
- Built the signature from transition identity, active counts, and coarse progress buckets rather than volatile timing values.
- Added an `AGENT.md` rule that diagnostic traces must be idle-quiet.

## Lessons

Diagnostics should be bounded and event-scoped. A trace toggle should help locate state changes, not stream frame noise.
