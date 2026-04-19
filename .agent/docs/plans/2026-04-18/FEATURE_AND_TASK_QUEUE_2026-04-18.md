# Feature And Task Queue - 2026-04-18

- Audit production accounting against the shared engine and the UI production readouts.
- Correct production display math so per-player and per-star production match `BASE_PRODUCTION` and star-type multipliers.
- Fix fractional production accumulation so `0.6` per tick yields exactly `6` ships in `10` ticks instead of drifting low.
- Add inline config-key metadata and hover descriptions across the settings panels, including diagnostics/local-state controls where applicable.
- Merge `claude/goofy-raman` metaball-grid renderer work onto `master`, including the render family, canvas dispatch, and territory tuning UI.
- Patch post-merge integration drift for metaball-grid: add panel-sync mappings for every `METABALL_GRID_*` control, extend settings metadata coverage so the new controls show config-key chips/tooltips, and fix the `Origin Mode` UI to write the live `'corner'` enum value instead of a dead `'origin'` string.
- Audit Metaball Grid settings wiring end to end (panel -> config -> family plan cache -> renderer draw path) after user reported dead controls.
- Fix dead Metaball Grid controls: honor `METABALL_GRID_ENABLED`, rebuild cached classification/wave plans when geometry-generation knobs change, and make `METABALL_GRID_INWARD_OFFSET_PX` actually move boundary cells inward during draw.
- Stop treating `common/resources/settings-live/current-settings.json` as runtime input after confirming it is a dev-only write sink, and add deterministic `Geometry_0319` runtime telemetry for config load, panel hydration, theme apply, and generator entry.

- Audit metaball grid renderer mode end-to-end: explain code-path behavior, surfaced and hidden settings, vstar counts/spacing semantics, and identify any missing or dead wiring before it becomes the default render mode.
