# Territory Recovery Chunk 08 Note (2026-03-08)

## Scope
- Chunk 08: liveness telemetry/guards (dev-focused guardrail subset).

## Changes
- Added `warnOnMissingTerritorySchemaCoverage(...)` to `settingsState.ts`.
  - Dev-only check scans territory config prefixes:
    - `TERRITORY_`
    - `DF_`
    - `VORONOI_`
    - `MODIFIED_VORONOI_`
  - Warns if any matching config keys are missing schema coverage in `PANEL_CONFIG_MAP`/settings schema.
- Wired this guard into `GameSettingsPanel.svelte` on mount before config sync.

## Why
- Prevent silent schema drift where new territory keys are introduced without panel bridge coverage.
- Makes liveness debugging faster by catching bridge gaps at startup.

## Notes
- Existing write telemetry (`recordSettingWrite`) remains active in settings bridge.
- Additional renderer-event telemetry can be expanded in later chunks; this chunk focuses on immediate schema guardrails.
