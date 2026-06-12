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

## Follow-Up

The user confirmed paused behavior was corrected, but reported that running-game trace output was still too verbose and that messages showed a duplicated `[GG_TRANSITION]` prefix.

Additional cause:

- `transitionTraceLogger.ts` included progress buckets in every stage signature, so routine stage records repeated as progress advanced.
- The helper prepended `[GG_TRANSITION]` even though `log.gridGradientTrace(...)` already included the context.

Additional corrective actions:

- Suppressed routine per-frame trace labels.
- Kept lifecycle/gate/rebuild/error labels deduped without progress churn.
- Kept `family.update.exit` as the only coarse progress summary.
- Removed the duplicate context prefix.
- Added a focused unit test for the trace helper.

Additional validation:

- `bun test src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts`
- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts`
- `bun run build` in `pax-fluxia/`

## Lessons

Scoped diagnostics need scoped output paths. A mode trace should not piggyback on a broad channel and then mutate that channel just to become visible.

Diagnostic traces also need a single aggregation point. Stage-by-stage logging is useful while wiring a path, but it must collapse into lifecycle, structural changes, and sparse summaries before it becomes a usable UI-controlled diagnostic.
