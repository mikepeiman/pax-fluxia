# Feature And Task Queue - 2026-04-18

- Audit production accounting against the shared engine and the UI production readouts.
- Correct production display math so per-player and per-star production match `BASE_PRODUCTION` and star-type multipliers.
- Fix fractional production accumulation so `0.6` per tick yields exactly `6` ships in `10` ticks instead of drifting low.
- Add inline config-key metadata and hover descriptions across the settings panels, including diagnostics/local-state controls where applicable.
- Merge `claude/goofy-raman` metaball-grid renderer work onto `master`, including the render family, canvas dispatch, and territory tuning UI.
- Patch post-merge integration drift for metaball-grid: add panel-sync mappings for every `METABALL_GRID_*` control, extend settings metadata coverage so the new controls show config-key chips/tooltips, and fix the `Origin Mode` UI to write the live `'corner'` enum value instead of a dead `'origin'` string.
