# Post-Mortem: 2026-05-24 - Bottom-Center Command Bar Removal

## What Happened

The live HUD lost the user's bottom-center command controls during the UI/HUD cleanup sequence. The user identified this as deletion of surfaced UI without instruction.

## Root Cause

The cleanup pass over-generalized "remove duplicate quick-access/settings controls" and treated bottom control surfaces as expendable chrome instead of preserved user controls. The implementation did not first inventory every surfaced control and classify which were explicitly authorized for removal.

## Impact

- A visible user control surface disappeared.
- The selected-star tray became the only bottom-center HUD surface, which is contextual and does not replace persistent bottom controls.
- The change violated `.agent/AGENT.md` rule 4.6: never delete, simplify, or hardcode over a surfaced user control without explicit instruction.

## Corrective Actions

- Restored a persistent bottom-center command bar as its own component.
- Kept the selected-star tray separate and moved it above the restored bar to prevent overlap.
- Added the surfaced-control failure to session notes and queue.

## Lessons

- Before removing any visible UI, enumerate it by screen position, function, and current consumer.
- A duplicate control path can be removed only when the specific duplicate is named and the surviving path is identified.
- Contextual trays do not replace persistent command bars unless the user explicitly requests that substitution.
