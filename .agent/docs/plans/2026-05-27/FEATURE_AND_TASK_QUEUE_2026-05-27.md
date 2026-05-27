# Feature And Task Queue - 2026-05-27

## Active

### Grid Gradient fill transitions

Purpose: make Grid Gradient conquest fills visibly transition through the mode's point-grid presentation, not snap from pre-conquest to post-conquest state while diagnostics report progress.

Current status:

- Implemented a targeted correction in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- Added `pax-fluxia/src/lib/territory/transitions/renderFamilyPreviousFrame.ts` to validate that a transition is ready for rendering and that a cached previous frame still represents previous conquest owners.
- Added focused tests in `pax-fluxia/src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts`.

Findings:

- Grid Gradient could receive a transition from pending conquest preview before the star owners and geometry had advanced to the post-conquest state.
- The Grid Gradient transition plan could therefore have a live progress clock but no real PREV/NEXT geometry delta to draw.
- The previous-frame cache was trusted without checking that it still contained the previous owner for every active conquest event.

Validation:

- `bun test src/lib/territory/transitions/renderFamilyPreviousFrame.test.ts`
- `bun test src/lib/territory/families/gridGradient/GridGradientFamily.test.ts src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts`
- `bun run build` in `pax-fluxia/`

Needs user verification:

- In the live app, select `Grid Gradient`, `Fill Style = Point Fill`, and shader field backend.
- Trigger a conquest and confirm the fill dots animate as a wave/growth/fade rather than snapping.
- If still invisible, next step is to inspect whether the WebGL uniform update is reaching the shader at runtime, because code-side progress and texture data have separate connection points.
