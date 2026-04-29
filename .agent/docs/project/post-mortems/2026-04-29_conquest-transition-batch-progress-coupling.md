# Post-Mortem - 2026-04-29 - Conquest Transition Batch Progress Coupling

## Failure
- Live `metaball_grid` conquest timing no longer respected the Territory Transition slider.
- User symptom: conquest fill looked very short, roughly `~150ms`, despite a stored transition duration near `1400ms`.

## Root Cause
- `renderFamilyTransitionLifecycle.ts` merged all active conquest entries into one shared `activeTransition`.
- The aggregate transition used the oldest cohort start time and the most advanced raw progress.
- When a newer conquest began while an older conquest entry was still active, the newer conquest inherited a near-finished progress value.

## Fix
- The active render-family transition now renders only the newest conquest tick cohort.
- Terminal-frame bookkeeping still runs across older entries so cleanup can retire them safely.

## Guardrails Added
- `renderFamilyTransitionLifecycle.test.ts` now covers:
  - newest-tick cohort drives visible family progress
  - older ticks still emit terminal-frame retirement markers
