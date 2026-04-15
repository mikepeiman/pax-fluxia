# Feature And Task Queue - 2026-04-14

## Purpose

Keep one dated queue for the active 2026-04-14 work, including both the LOC-audit / Main Menu polish slice and the perimeter-field renderer / diagnostics slice.

## Carryover

- Prior active queue: `.agent/docs/project/implementation-plans/2026-04-13/FEATURE_AND_TASK_QUEUE_2026-04-13.md`
- The 2026-04-13 queue remains the detailed record of:
  - lane geometry / diagnostics hardening
  - Main Menu import work from the earlier UI branch
  - early Metaball transition-path work

## Completed This Slice

### LOC Audit And Main Menu / Settings Work

- [x] Run a comprehensive live-source LOC inventory across `common/src`, `pax-fluxia/src`, and `pax-server/src`.
- [x] Save the full file / LOC inventory at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv`.
- [x] Save the first comprehensive audit synthesis at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_REPORT_2026-04-14.md`.
- [x] Derive a ranked execution list from the audit and save it at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_ACTION_LIST_2026-04-14.md`.
- [x] Replace the older overplanned LOC audit guidance with a concise technical implementation plan focused on canonicality, drift, strategic interest, and feature opportunity.
- [x] Save the current canonical LOC audit plan at `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_IMPLEMENTATION_PLAN_2026-04-14.md`.
- [x] Mark the 2026-04-12 LOC audit prompt file as historical and point it at the new concise canonical plan.
- [x] Trace the settings modal regression to the modal render boundary and overlay sizing path rather than guessing from symptoms.
- [x] Mount the menu settings modal to `document.body` so it no longer depends on the Main Menu stacking context or scroll container.
- [x] Make the modal overlay scroll-safe so tall modal content cannot clip inside the fixed overlay on shorter viewports.
- [x] Move menu theme switching out of the audio settings modal and into a dedicated topbar widget placed after the background selector.
- [x] Generate dedicated theme image assets for `imperial`, `neon`, and `mythic` and wire them into the switcher, title shell, panel chrome, command band, and modal surfaces.
- [x] Convert the audio settings modal back to an audio-only surface so theme switching is no longer nested under the wrong information architecture.
- [x] Replace the clipped inline background dropdown with a real body-mounted modal so the gallery sizes against the viewport instead of the topbar.
- [x] Bind main-menu background selection to the active theme mode so each theme restores its own saved backdrop.
- [x] Expand the menu theme system with per-theme typography and stronger geometry / frame language so `imperial`, `neon`, and `mythic` no longer read like near-identical colorways.
- [x] Profile the Main Menu lag after the UI merges and prove the dominant cost sits in `/common` lane solving, not image encoding.
- [x] Move Main Menu preview generation off the UI thread via worker-backed preview generation while keeping preview geometry exact to runtime.
- [x] Stop mounting both desktop and mobile menu panel trees at once on desktop.
- [x] Remove `GameMapPanel` reactive link-range churn by routing `RangeDual` changes through direct user input callbacks.
- [x] Add a repeatable menu-preview benchmark harness for the high-lane-clearance failure band.
- [x] Reduce menu-preview lane-solver cost with per-build edge caching, DSU connectivity checks, and hot-path math/allocation reductions.

### Perimeter Field / Renderer / Diagnostics Work

- [x] Prototype `perimeter_field` as an experimental territory renderer.
- [x] Add `perimeter_field` to the render-mode catalog and exempt it from the RenderFamily gate.
- [x] Add dedicated territory control surfaces for:
  - `PerimeterFieldTuning`
  - `TerritoryTransitionTuning`
  - `TerritoryGeometrySourceTuning`
- [x] Expand `ControlsSection-Territory` into modular Territory System / Rendering & Topology shells with subsection chips and focused cards.
- [x] Add concise required-reading index / mode-level documentation for rendering agents.
- [x] Complete a docs-only spec clarification and compliance audit for `perimeter_field`.
- [x] Switch `perimeter_field` base geometry to a selectable shared source, defaulting to `power_voronoi_0319`.
- [x] Make the selected geometry source affect shared render-family geometry, including Metaball.
- [x] Expose source MSR, CX, contested midpoint pair, and DX controls alongside the source selector.
- [x] Add inward offset support so derived perimeter samples can sit inside the source boundary instead of directly on it.
- [x] Add in-game diagnostics and paused scrub tooling for `perimeter_field`:
  - show underlying geometry
  - show perimeter virtual stars
  - replay-select + scrub for recent captured conquests
  - current / next / interim overlays
- [x] Carry owner-color metadata into perimeter diagnostics and render owner-colored markers / rings.
- [x] Correct perimeter-field transition diagnostics so samples carry path start / end and fallback metadata.
- [x] Correct conquest-local ray selection so invalid rays are dropped instead of falling back to unrelated origins.
- [x] Preserve `starIds` through geometry-layer identity so conquest-local owner-region resolution can use deterministic membership first.
- [x] Add ZIP-based transition diagnostic export:
  - one ZIP per captured bundle
  - PREV + NEXT + intermediate frames
  - compact readable diagnostic JSON
- [x] Wire package export into the Transition Debug panel alongside the loose-file path.
- [x] Rewire perimeter-field conquest capture onto the real live family render path instead of the old DY4 export path.
- [x] Remove the destructive offscreen perimeter-field diagnostic render path.
- [x] Finalize perimeter-field capture from the first settled live frame after the transition completes.
- [x] Decouple paused gameplay from diagnostic replay presentation.
- [x] Restore ruler and Transition Debug panel wiring in the game runtime after earlier merge regressions.
- [x] Import the perimeter-field / transition diagnostics renderer slice from the renderer worktree and retain current runtime/perf fixes where they superseded stale branch code.
- [x] Reduce conquest-tick Metaball render cost by changing the hot solve from cell-by-cell full-sample checks to influence-bounded sample-to-cell accumulation.

## In Progress

- [ ] User verification that the settings modal renders fully above the Main Menu with no partial overlap or hidden edges.
- [ ] User verification that the three Main Menu themes now feel materially distinct in-browser.
- [ ] User verification that the perimeter-field mode, tuning panels, replay tools, and package export surface all appear correctly in the Territory / Debug UI.
- [ ] Gameplay performance investigation beyond the Main Menu, focused on conquest-time territory rendering and ship-movement jank under sub-60 FPS.

## Top Queue

- [ ] Audit the whole ship / VFX movement pipeline under sub-60 FPS so travel, conquest, and surge visuals remain readable and temporally stable during frame drops.
- [ ] Continue conquest-time renderer profiling after the first Metaball hot-path reduction and identify the next dominant cost center in gameplay traces.
- [ ] Execute the ranked LOC audit action list starting with the territory-surface honesty pass and the settings truth-surface split.
- [ ] Generate a persistent LOC dashboard from `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv` so future drift is visible without rerunning manual inventory work.
- [ ] Run a focused classification pass over `pax-fluxia/src/lib/territory` and `pax-fluxia/src/lib/renderers` to separate canonical, favored experimental, compatibility, and dead / suspect files.
- [ ] User-verify that the imported Main Menu presentation issues are resolved in-app.
- [ ] User-verify that territory renderer selection now boots straight into the saved active mode without requiring the settings panel to be opened.
- [ ] User-verify that the settings column open / closed state survives reloads on desktop.
- [ ] User-compare the active conquest transition modes in live gameplay and decide which should become the default baseline.
- [ ] If the handoff is still too subtle or too strong, tune the shared `VS_*` timings and mode-specific basis controls from the unified renderer baseline instead of adding another transition family.
- [ ] Diagnose and redesign DX distance / weight semantics after refreshing the exact intended constraint.

## Notes

- This dated queue carries two real work slices from the same day:
  - LOC audit plus Main Menu / settings polish
  - perimeter-field renderer, diagnostics, and transition tooling
- The Main Menu performance work kept exact preview semantics. The preview still uses the same shared lane geometry logic as runtime map generation.
- The renderer slice locked two invariants:
  - perimeter-field diagnostics must reflect the real live family path
  - the control surface for perimeter / transition / source geometry must live in Territory, not in detached or misleading surfaces

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
6. LOC audit scope correction:
   - "Just to be clear, this is to be comprehensive, every file, every LOC counted"
7. Renderer / territory control intent:
   - "We’re trying to bring in every change to update metaball, make the new perimeter mode, update diagnostic tooling and control panel UI."
8. Merge cleanup preference:
   - "Preference to keep and merge in maximally. Keep documents. Compare if same filenames. We can drop logs only. Keep the pngs."
