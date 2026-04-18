# Feature And Task Queue - 2026-04-18

- Audit production accounting against the shared engine and the UI production readouts.
- Correct production display math so per-player and per-star production match `BASE_PRODUCTION` and star-type multipliers.
- Fix fractional production accumulation so `0.6` per tick yields exactly `6` ships in `10` ticks instead of drifting low.
- Add inline config-key metadata and hover descriptions across the settings panels, including diagnostics/local-state controls where applicable.
