# Feature And Task Queue - 2026-04-14

## Purpose

Keep one clean, date-scoped execution queue for the active work on 2026-04-14 while carrying forward the menu-theme expansion state from 2026-04-13.

## Carryover

- Prior active queue: `.agent/docs/project/implementation-plans/2026-04-13/FEATURE_AND_TASK_QUEUE_2026-04-13.md`
- The 2026-04-13 queue remains the detailed record of the menu theme-system expansion across the main menu and settings modal.

## Completed This Slice

- [x] Run a comprehensive live-source LOC inventory across `common/src`, `pax-fluxia/src`, and `pax-server/src`.
- [x] Save the full file/LOC inventory at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv`.
- [x] Save the first comprehensive audit synthesis at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_REPORT_2026-04-14.md`.
- [x] Derive a ranked execution list from the audit and save it at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_ACTION_LIST_2026-04-14.md`.
- [x] Replace the older overplanned LOC audit guidance with a concise technical implementation plan focused on canonicality, drift, strategic interest, and feature opportunity.
- [x] Save the current canonical LOC audit plan at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_IMPLEMENTATION_PLAN_2026-04-14.md`.
- [x] Mark the 2026-04-12 LOC audit prompt file as historical and point it at the new concise canonical plan.
- [x] Trace the settings modal regression to the modal render boundary and overlay sizing path rather than guessing from symptoms.
- [x] Mount the menu settings modal to `document.body` so it no longer depends on the main menu's stacking context or scroll container.
- [x] Make the modal overlay scroll-safe so tall modal content cannot clip inside the fixed overlay on shorter viewports.
- [x] Move menu theme switching out of the audio settings modal and into a dedicated topbar widget placed after the background selector.
- [x] Generate dedicated theme image assets for `imperial`, `neon`, and `mythic` and wire them into the switcher, title shell, panel chrome, command band, and modal surfaces.
- [x] Convert the audio settings modal back to an audio-only surface so theme switching is no longer nested under the wrong information architecture.
- [x] Replace the clipped inline background dropdown with a real body-mounted modal so the gallery sizes against the viewport instead of the topbar.
- [x] Bind main-menu background selection to the active theme mode so each theme restores its own saved backdrop.
- [x] Expand the menu theme system with per-theme typography and stronger geometry/frame language so `imperial`, `neon`, and `mythic` no longer read like near-identical colorways.

## In Progress

- [ ] User verification that the settings modal now renders fully above the main menu with no partial overlap or hidden edges.
- [ ] User verification that the new topbar theme widget placement and the stronger theme personalities land correctly in-browser.

## Top Queue

- [ ] Audit the ship/VFX movement pipeline under sub-60 FPS so travel, conquest, and surge visuals remain readable and temporally stable during frame drops.
- [ ] Execute the ranked LOC audit action list starting with the territory surface honesty pass and the settings truth surface split.
- [ ] Generate a persistent LOC dashboard from `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv` so future drift is visible without rerunning manual inventory work.
- [ ] Run a focused classification pass over `pax-fluxia/src/lib/territory` and `pax-fluxia/src/lib/renderers` to separate canonical, favored experimental, compatibility, and dead/suspect files.
- [ ] If the modal still misbehaves after the portal/scroll-safe fix, collect a fresh screenshot and exact viewport/context from the user and trace the remaining boundary.
- [ ] If the three theme modes still read as too similar in-browser, push the next pass toward stronger structural differentiation rather than only adding more overlays.
- [ ] User verification that the new background picker modal presents fully above menu chrome and closes correctly on selection, scrim click, and `Esc`.
- [ ] User verification that each theme now feels materially distinct in-browser once the theme-bound backgrounds and per-theme fonts are active.

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
3. Background picker follow-up:
   - "Background select presents options that are hidden, as it tries to display them within the topbar."
   - "It will need to present as a modal."
4. Theme follow-up:
   - "BG image must be saved per-theme."
   - "Whatever the user selects should bind to that theme mode."
   - "Also each theme deserves its own font."
   - "These are still weakly-differentiated styles."
   - "Strengthen them with flavor, personality, and vigor."
5. LOC audit planning direction:
   - "This plan is far too verbose and overplanned."
   - "I want something simpler, more curiosity-insight-ideas-features focused."
   - "The core of this is a LOC audit. Do not lose the technical core."
   - "Implement plan"
6. LOC audit scope correction:
   - "Just to be clear, this is to be comprehensive, every file, every LOC counted"
