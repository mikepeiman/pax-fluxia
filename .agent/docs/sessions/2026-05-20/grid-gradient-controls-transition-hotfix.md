# 2026-05-20 - Grid Gradient Controls and Transition Hotfix

## Status Update

This pass was superseded later on 2026-05-20. User verification found that the worker handoff could leave Grid Gradient visually dead, the dual-mark/border-blend shader path could produce a large blue overlay, and loading could intermittently stall for many seconds. The follow-up correction removed the worker handoff, the border-blend/dual-mark shader changes, and the surfaced shader debug path that could paint a blue diagnostic field.

## Context

User feedback after the shader-field integration:

- Fill conquest transition was not visible.
- Conquests caused animation stutter.
- Shader-field Grid Gradient could show a large blue overlay.
- The visible `Grid Gradient Backend` selector was confusing and was not requested as a player-facing option.
- Several shader controls were unclear or only partially reflected by the shader path.

## Runtime Shape

Grid Gradient remains a render-family mode. It now reuses the existing metaball-grid plan worker for the expensive classification and wave-plan step. The shader-field renderer remains the intended production presentation path; the Pixi Graphics path is retained only as an internal fallback and diagnostics/reference path.

## Changes

- Removed the normal settings-panel `Grid Gradient Backend` selector.
  - `shader_field` is the normal path.
  - `graphics` remains available internally when shader field cannot run, and diagnostics still show requested -> active backend plus fallback reason.
- Moved grid classification/wave planning off the main thread after the first plan.
  - While the requested transition plan is pending, the previous plan remains visible.
  - When the worker response lands, Grid Gradient starts a local visual transition clock for that plan.
  - This prevents the global conquest clock from being mostly spent during synchronous plan build, which was the main reason no fill transition appeared.
- Added Grid Gradient diagnostics for:
  - `clockSource`
  - `visibleFrameState`
  - `requestedPlanPending`
  - local visual-transition activity
  - scheduler progress
- Fixed shader border offset semantics in the shader path by discarding fill marks inside the configured border-offset band instead of only shifting the size/alpha gradient.
- Reduced the blue-overlay failure mode by returning transparent output early for zero-alpha marks before color math and by discarding fully transparent shader fragments.
- Reworked shader pulse from a visibly column-correlated phase into a 2D value-noise phase field.
- Clarified control labels:
  - `Shader Edge Softness` -> `Edge Feather`
  - `Shader Noise` -> `Shader Noise Roughness (Noise)`, now disabled when the active fill path cannot consume it
  - `Shader Pulse Speed` now shows `rad/s`
- Later update: removed the shader post-color power/gamma control entirely and replaced it with `Fill HSLA` controls.

## Current Control Semantics

- `Fill HSLA`: Hue Shift applies inside Grid Gradient palette construction; Saturation, Lightness, and Alpha reuse the shared territory/metaball fill controls that Grid Gradient already consumes.
- `Center Size` and `Edge Size`: mark diameter at interior and near-border distance bands.
- `Gradient Curve`: remaps border distance into mark size progression.
- `Border Offset`: fill exclusion band from ownership frontier, in world pixels.
- `Edge Feather`: fixed pixel feather around each mark edge.
- `Shader Mark Softness`: radius-relative mark feather; more visible on larger center marks.
- `Shader Noise Roughness (Noise)`: only active for shader-field pointillist noise marks; otherwise the row is disabled instead of acting like a live no-op control.
- `Shader Pulse Speed`: angular phase rate in radians per second.
- The removed color power/gamma path no longer has a shader uniform or settings key.
- `Solid Fill` disables pointillist-only sampling controls instead of leaving active knobs that cannot affect the fill.

## Remaining Risk

- The first ever Grid Gradient plan can still build synchronously if no previous cached plan exists. Normal play after the initial frame uses the worker path.
- Visual transition quality still needs user verification under real conquest events. Diagnostics should show `local / requested_plan` when a worker-built transition plan begins.
- Screenshot capture through Browser timed out on the heavy canvas page, so browser verification relied on DOM state and console health rather than image evidence.

## Validation

- `bun test ./src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts ./src/lib/territory/families/gridGradient/gridGradientScene.test.ts ./src/lib/components/game/territoryPresentationSpace.test.ts`
  - Passed: 10 tests.
- `bun run build`
  - Passed. Existing CSS/chunk warnings remain.
- Browser smoke on `http://127.0.0.1:1441/play`
  - Started a local game.
  - Selected `Grid Gradient`.
  - No GridGradient/shader/WebGL compile errors appeared.
  - Existing unrelated dev warnings/errors remained: SvelteKit `history.pushState` warning and RoomBrowser lobby JSON error.
  - FPS returned to 120 after the initial plan turn.
