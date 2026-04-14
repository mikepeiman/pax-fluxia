# Feature And Task Queue - 2026-04-14

## Purpose

Keep one clean, date-scoped execution queue for the active work on 2026-04-14 while carrying forward the menu-theme expansion state from 2026-04-13.

## Carryover

- Prior active queue: `.agent/docs/project/implementation-plans/2026-04-13/FEATURE_AND_TASK_QUEUE_2026-04-13.md`
- The 2026-04-13 queue remains the detailed record of the menu theme-system expansion across the main menu and settings modal.

## Completed This Slice

- [x] Trace the settings modal regression to the modal render boundary and overlay sizing path rather than guessing from symptoms.
- [x] Mount the menu settings modal to `document.body` so it no longer depends on the main menu's stacking context or scroll container.
- [x] Make the modal overlay scroll-safe so tall modal content cannot clip inside the fixed overlay on shorter viewports.

## In Progress

- [ ] User verification that the settings modal now renders fully above the main menu with no partial overlap or hidden edges.

## Top Queue

- [ ] If the modal still misbehaves after the portal/scroll-safe fix, collect a fresh screenshot and exact viewport/context from the user and trace the remaining boundary.

## Notes

- The traced fix was applied in `pax-fluxia/src/lib/components/ui/AudioSettings.svelte`.

## Lossless User Instruction Log

1. Settings modal regression report:
   - "The settings modal is broken; shows partially overlapping and partially hidden under main menu."
   - "If I can help diagnose/debug ask me."
