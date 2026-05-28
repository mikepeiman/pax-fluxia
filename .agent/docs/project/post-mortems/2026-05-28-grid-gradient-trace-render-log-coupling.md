# Post-Mortem: 2026-05-28 - Grid Gradient Trace Render Log Coupling

## What Happened

The `Grid Gradient transition trace` toggle also enabled the broad Render log channel. The user reported that logs still scrolled endlessly while paused.

## Root Cause

The trace toggle was implemented as a mode-specific switch but still emitted through `log.renderer(...)`. To make those trace messages visible, the UI handler also set `logFlags.renderer = true`. That coupled a narrow Grid Gradient diagnostic to a broad, noisy renderer logging category.

## Impact

- Enabling a Grid Gradient diagnostic unexpectedly changed another visible Logging control.
- Unrelated renderer logs could stream during paused gameplay.
- The trace was not an isolated diagnostic surface.

## Corrective Actions

- Added `log.gridGradientTrace(...)`.
- Routed Grid Gradient transition trace output through the new scoped telemetry method.
- Removed the automatic Render-log toggle.
- Updated metadata and docs to state that the Grid Gradient trace does not enable broad Render logs.
- Added an `AGENT.md` rule against narrow diagnostics mutating broad log-channel toggles.

## Lessons

Scoped diagnostics need scoped output paths. A mode trace should not piggyback on a broad channel and then mutate that channel just to become visible.
