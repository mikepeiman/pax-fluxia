# Feature And Task Queue - 2026-05-28

## Active

### Grid Gradient transition trace coupling

Purpose: make `Grid Gradient transition trace` a narrow, usable diagnostic that does not enable the broad Render log channel and does not scroll endlessly while paused.

User-reported failure:

- Toggling `Grid Gradient transition trace` automatically toggled Render logs.
- Logs still scrolled endlessly on pause.

Cause:

- `ControlsSection-Logging.svelte` set `(logFlags as any).renderer = true` when enabling the Grid Gradient trace.
- `transitionTraceLogger.ts` emitted through `log.renderer(...)`, so the narrow trace depended on the broad renderer channel.
- Broad renderer logs include many unrelated renderer sources and can scroll during paused gameplay.

Implemented correction:

- Added `log.gridGradientTrace(...)` in `logger.ts`.
- Changed `transitionTraceLogger.ts` to use `log.gridGradientTrace(...)`.
- Removed the UI mutation that turned on Render logs.
- Updated config comments, setting metadata, `AGENT.md`, session docs, and post-mortem.

Validation:

- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts`
- `bun run build` in `pax-fluxia/`

Follow-up:

- Paused behavior is now correct, but running-game output was still too verbose.
- The duplicated `[GG_TRANSITION]` prefix made the output harder to scan.

Follow-up correction:

- Suppressed routine per-frame stages in `transitionTraceLogger.ts`.
- Kept structural lifecycle/gate/rebuild/error records deduped without progress churn.
- Kept `family.update.exit` as the coarse progress summary.
- Removed the duplicated trace prefix.
- Added a focused trace-volume unit test.

Follow-up validation:

- `bun test src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts`
- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts`
- `bun run build` in `pax-fluxia/`
