# Post-Mortem: 2026-05-27 - Grid Gradient Logging Toggle Placement

## What Happened

During Grid Gradient transition debugging, the transition trace flag was first exposed from the Grid Gradient tuning surface and the user was told to enable the renderer log channel through a console command.

That violated the project UI model: runtime logging switches belong in the existing Logging debug section, not in a mode tuning subsection or ad hoc console instructions.

## Root Cause

The diagnostic implementation followed the renderer code path instead of the product/debug UI path. I treated `GRID_GRADIENT_DEBUG_TRANSITIONS` as a mode-specific tuning switch because the logs were mode-specific, but the user-facing workflow was logging control.

## Impact

- The user was pointed to a UI location that did not match the existing product structure.
- The instruction path required a console-side state change even though the app already has a Logging section for this purpose.
- The search metadata also classified the trace switch under Grid Gradient instead of Logging.

## Corrective Actions

- Move `Grid Gradient transition trace` to `ControlsSection-Logging.svelte`.
- Keep the switch wired to `GRID_GRADIENT_DEBUG_TRANSITIONS`.
- When enabled, the switch also enables the renderer log channel internally.
- Move settings search metadata for this switch to the Logging scope.
- Update session and queue docs to use only the Logging UI path.
- Add an `AGENT.md` logging rule forbidding console-command log flag instructions when a project Logging control should be used.

## Lessons

Diagnostics are product surfaces. A diagnostic flag's implementation owner does not determine its user-facing location; the workflow does.
