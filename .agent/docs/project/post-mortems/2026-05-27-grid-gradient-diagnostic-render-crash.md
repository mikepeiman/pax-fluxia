# Post-Mortem: 2026-05-27 - Grid Gradient Diagnostic Render Crash

## What Happened

Grid Gradient transition diagnostics introduced a runtime exception in the active presentation path:

`Cannot read properties of undefined (reading 'length')` at `GameCanvas.svelte:6344`.

The diagnostic log tried to read `geometry.regions.length` and `geometry.frontiers.length`. The active geometry object at that point does not guarantee those arrays, so the logging statement threw before the Grid Gradient family could update and render. The visible result was no territory fill or border.

## Root Cause

The diagnostic code assumed a debug-facing shape from the geometry snapshot instead of treating diagnostic fields as optional. This violated the rule that diagnostics must observe the pipeline without becoming a required runtime precondition.

## Impact

- Territory presentation stopped before Grid Gradient rendering.
- The user saw fill and border disappear.
- The crash was caused by diagnostic instrumentation, not by the renderer's fill or border primitives.

## Corrective Actions

- Added `optionalArrayLength(...)` in `GameCanvas.svelte`.
- Changed the Grid Gradient geometry diagnostic to report `null` when optional geometry arrays are absent instead of throwing.
- Ran targeted Grid Gradient transition tests and `bun run build`.

## Lessons

Presentation diagnostics must be exception-safe. Logging should tolerate missing optional fields and should never block rendering.
