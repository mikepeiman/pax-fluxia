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
- [x] Move menu theme switching out of the audio settings modal and into a dedicated topbar widget placed after the background selector.
- [x] Generate dedicated theme image assets for `imperial`, `neon`, and `mythic` and wire them into the switcher, title shell, panel chrome, command band, and modal surfaces.
- [x] Convert the audio settings modal back to an audio-only surface so theme switching is no longer nested under the wrong information architecture.

## In Progress

- [ ] User verification that the settings modal now renders fully above the main menu with no partial overlap or hidden edges.
- [ ] User verification that the new topbar theme widget placement and the stronger theme personalities land correctly in-browser.

## Top Queue

- [ ] If the modal still misbehaves after the portal/scroll-safe fix, collect a fresh screenshot and exact viewport/context from the user and trace the remaining boundary.
- [ ] If the three theme modes still read as too similar in-browser, push the next pass toward stronger structural differentiation rather than only adding more overlays.

## Notes

- The traced fix was applied in `pax-fluxia/src/lib/components/ui/AudioSettings.svelte`.

## Lossless User Instruction Log

1. Settings modal regression report:
   - "The settings modal is broken; shows partially overlapping and partially hidden under main menu."
   - "If I can help diagnose/debug ask me."
2. Theme IA and personality direction:
   - "The themes being located in Audio Settings is a strange and wrong choice."
   - "They belong as a small icon-set widget within the topbar above main menu, justified left, after Background select."
   - "The modes are too similar, they lack personality; it looks like nothing more than a colorway theme."
   - "Add 5x more personality."
   - "This must include generation of image assets."
   - "Think creatively."
   - "Use external APIs as needed."
