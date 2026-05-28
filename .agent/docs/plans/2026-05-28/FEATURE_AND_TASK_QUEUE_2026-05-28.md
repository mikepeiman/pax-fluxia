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

### Grid Gradient fill transition visibility

Purpose: make conquest fill transitions visibly render in the active Grid Gradient point-fill presentation.

User-reported failure:

- Active diagnostics and logs were being treated as proof of transition rendering.
- In the actual game view, fills still appeared to snap PRE/POST with no visible transition.

Cause:

- Transition data reached the family and shader texture plan, but the shader presentation did not produce a strong visible dot transition.
- PREV and NEXT marks shared the same cell center.
- Transition mark scale retained a 28% floor, so outgoing/incoming marks did not clearly grow from or shrink to points.

Implemented correction:

- Transition marks now scale directly from side alpha.
- PREV and NEXT transition-side dots now separate deterministically during the middle of the blend and return to the cell center at the start/end.
- Graphics point-fill and shader-field point-fill use the same transition scale/offset semantics.

Validation:

- `bun test src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts`
- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts`
- `bun run build` in `pax-fluxia/` passed. Existing Svelte unused-CSS and chunk-size warnings remain unrelated to this pass.
