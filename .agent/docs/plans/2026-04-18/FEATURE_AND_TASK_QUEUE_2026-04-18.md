# Feature And Task Queue - 2026-04-18

- Audit production accounting against the shared engine and the UI production readouts.
- Correct production display math so per-player and per-star production match `BASE_PRODUCTION` and star-type multipliers.
- Fix fractional production accumulation so `0.6` per tick yields exactly `6` ships in `10` ticks instead of drifting low.
- Add inline config-key metadata and hover descriptions across the settings panels, including diagnostics/local-state controls where applicable.
- Merge `claude/goofy-raman` metaball-grid renderer work onto `master`, including the render family, canvas dispatch, and territory tuning UI.
- Patch post-merge integration drift for metaball-grid: add panel-sync mappings for every `METABALL_GRID_*` control, extend settings metadata coverage so the new controls show config-key chips/tooltips, and fix the `Origin Mode` UI to write the live `'corner'` enum value instead of a dead `'origin'` string.
- Audit Metaball Grid settings wiring end to end (panel -> config -> family plan cache -> renderer draw path) after user reported dead controls.
- Fix dead Metaball Grid controls: honor `METABALL_GRID_ENABLED`, rebuild cached classification and wave plans when geometry-generation knobs change, and make `METABALL_GRID_INWARD_OFFSET_PX` actually move boundary cells inward during draw.
- Stop treating `common/resources/settings-live/current-settings.json` as runtime input after confirming it is a dev-only write sink, and add deterministic `Geometry_0319` runtime telemetry for config load, panel hydration, theme apply, and generator entry.
- Audit metaball-grid renderer mode end to end: explain code-path behavior, surfaced and hidden settings, vstar counts and spacing semantics, and identify any missing or dead wiring before it becomes the default render mode.

## Completed Today

- Reworked the map editor shell into a lower-chrome tactical workbench layout:
  - replaced the permanent full-height form stack with an icon-led tool rail and anchored flyouts
  - moved primary session commands into a compact bottom command dock
  - added a floating board HUD for viewport fit, zoom/grid readout, validation summary, and density controls
  - converted selection editing into a contextual right-side panel that only appears when something is selected
- Added a dedicated editor UI presentation store:
  - introduced persisted `compact`, `standard`, and `expanded` density presets
  - added transient tool panel and side-sheet state outside the authored-map document store
- Split the map editor route UI into focused editor components:
  - tool rail
  - board HUD
  - command dock
  - selection panel
  - library sheet
  - validation sheet
  - overflow / metadata sheet
- Reworked map loading UX:
  - `Load` now opens a searchable library sheet with recent maps pinned first
  - saved, built-in, fixture, and autosave sources remain grouped in one coherent surface
- Added UI hotkey support for numeric star placement shortcuts and `Escape` to close transient editor surfaces

## Verification Notes

- `bunx tsc --noEmit -p common/tsconfig.json` passed.
- Filtered `svelte-check` and filtered client `tsc` scans did not report direct hits for the new map editor shell files.
- Full client `svelte-check` and full client `tsc` still have an existing repo-wide baseline outside the editor slice.

## Follow-Up

- Manual verification needed for:
  - density presets across desktop and tablet widths
  - tool flyout behavior and board-space protection
  - selection panel, validation sheet, and library sheet interaction overlap
  - numeric star-type hotkeys and `Escape` sheet close behavior

## Additional Historical Branch Thread

### Metaball-Grid Perf And Tuning Expansion

Detailed plan: `./METABALL_GRID_PERF_PLAN_2026-04-18.md`. Source branch: `claude/goofy-raman`.

Completed in that branch thread:

- [x] MG-PERF-ANALYSIS - DevTools perf traces captured by user at `16px` and `4px` spacings, with bottom-up breakdown recorded.
- [x] MG-PERF-RESEARCH - Web research on PixiJS 8 high-throughput patterns, JFA, metaball splat-and-threshold, and WebGPU 2026 status.
- [x] MG-PERF-AUDIT - Local audit of vstar distribution knobs, per-frame cost, existing tunables, and prior metaball compositor behavior.

Proposed next items recorded in that branch:

- [ ] MG-PERF-PHASE-A - tuning surface expansion: distribution modes, jitter, cell cap, cell-count readout, dirty-flag repaint gate, ParticleContainer backend option
- [ ] MG-PERF-PHASE-B - two-layer caching architecture: static RenderTexture baked from natives plus dynamic overlay for dispossessed cells
- [ ] MG-PERF-UNDERLAYER-CAPTURE - lift PREV geometry capture upstream into `GameCanvas`
- [ ] MG-PERF-PHASE-C - true metaball mode via splat-and-threshold or JFA-based territory field

Checkpoint progression captured in that branch:

- [x] MG0..MG6 (plan, types, classification, wave, scene, family, settings panel)
- [x] MG-REVERT+MOAT+PERF
- [x] MG-PERF v3 (compositor bypass)
- [x] MG-STYLE v1 (HSLA + shapes + easing + jitter)
- [x] MG-BORDER v1 (hex cell + centered-blended)
- [x] MG-BORDER v2 (joined corners + Chaikin + pointy-top hex)
- [ ] MG7 - acceptance tests
- [ ] MG8 - perf bench + default
- [ ] MG9 - paused debug overlay

Historical notes:

- The source branch explicitly noted that `settings-live/current-settings.json` had unrelated local edits. That settings snapshot is intentionally excluded from this merge-in.
