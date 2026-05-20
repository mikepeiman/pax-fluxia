# 2026-05-20 - Grid Gradient Shader-Field Correction

## Problem

User verification of the previous pass found three release-blocking regressions:

- No visible conquest transition and, in some cases, no visible ownership update.
- A large blue overlay over much of the map in the shader-field backend.
- Intermittent loading stalls reported around 18 seconds.

## Cause Assessment

- The Grid Gradient plan-worker handoff could keep presenting the previous cached plan while a new transition plan was pending. If the worker stalled, rejected, or returned too late, the mode looked dead because both fills and grid-derived borders were still based on the old plan.
- The dual-mark shader transition and border-proximity blend greatly expanded the fragment shader path and repurposed the metrics alpha channel from mark seed to clamped border distance. That increased risk in the exact path responsible for the blue overlay.
- The worker request reused the metaball-grid worker contract and shipped large geometry/classification inputs through structured clone. That was not a Grid Gradient-specific contract and is the most likely source of intermittent long stalls.
- The specific blue rectangle path was the shader debug `cell_grid` branch introduced with the shader-field backend. It emitted cyan-blue grid lines directly over the full shader mesh using `vec4(0.2, 0.8, 1.0, line * 0.35)`. Because that control was surfaced and persisted through settings, normal play could route into a diagnostic field overlay instead of the accepted dot-fill look.

## Correction Shape

Grid Gradient remains a render-family mode. It does not use a direct legacy renderer path.

- Ownership: unchanged; current and previous owners still come from the existing transition input and star ownership state.
- Geometry: unchanged; PV geometry still feeds grid classification and frontier distance.
- Transition: no new ownership truth is introduced. `GridGradientFamily` builds the transition plan synchronously and keeps that plan visible for a local visual clock after it has been built.
- Presentation: shader field returns to the simpler single-field color blend using previous owner, next owner, role, distance band, and flip time textures. Vector borders remain the normal border presentation. Graphics remains an internal fallback.

## Changes Made

- Removed Grid Gradient's reuse of `metaballGridPlan.worker.ts`.
- Removed the failed dual-mark shader transition, border-blend uniforms, and border-distance alpha-channel packing.
- Removed the public `Grid Gradient Backend` selector and the failed transition-scale/border-blend controls from surfaced settings metadata/UI.
- Removed the shader debug mode setting, uniform, diagnostics field, and GLSL branches so normal Grid Gradient rendering cannot draw the blue full-field diagnostic overlay.
- Added a local visual transition clock inside `GridGradientFamily`:
  - starts at progress `0` when an active-transition plan is built,
  - keeps the transition plan visible if the upstream active-transition object ends before the local visual clock finishes,
  - records diagnostics as `clockSource` and `visibleFrameState`.
- Fixed shader-field border offset so nonzero offset suppresses fill marks inside the offset band.

## Current Risk

- The first transition plan is synchronous again, so a conquest can still pay classification/wave-plan cost on the main thread. This is preferable to a dead map or blue overlay, but it is not the final performance answer.
- The visible fill transition is a conservative color blend over the existing per-cell flip timing. It is not the previously attempted old-mark-shrink/new-mark-grow effect.
- Border-proximity color blending is deferred until the baseline shader-field path is stable in user testing.

## Follow-Up: Pulse Field

User verification after the correction still saw `Shader Pulse` as vertically grouped. The first follow-up still used a smoothed low-frequency phase field and did not remove the visible grouping. The shader pulse path now derives phase from a per-cell hash that mixes both grid axes strongly, with owner-index salt. Mark center jitter and field-drift phase now use the same two-axis cell-hash approach instead of a single packed seed scalar. The packed metrics seed also now hashes `ix,iy` directly instead of hashing the string id `g:ix:iy`. These are presentation-only changes in `gridGradientShaderFieldShaders.ts` and `gridGradientShaderFieldPacking.ts`; ownership, geometry, and transition data are unchanged.

## Follow-Up: Solid Fill Verifier

User asked for a simple way to compare the resolved territory geometry against the pointillist fill. Grid Gradient now exposes `Fill Style` in the Grid Fill subsection:

- `Pointillist`: normal Grid Gradient dot/mark fill.
- `Solid Fill`: draws the resolved region polygons from `ResolvedGeometrySnapshot` using the same fill alpha and palette, with existing vector/dotted borders still drawn normally.

This stays inside the existing render-family path. It does not add ownership truth, fabricate geometry, or create a direct renderer path.

Validation for this follow-up:

- `bun test ./src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts ./src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts ./src/lib/territory/families/gridGradient/gridGradientScene.test.ts`
  - Passed: 9 tests.
- `bun run build`
  - Passed. Existing unused-CSS and chunk-size warnings remain.

## Validation

- `rg` verification:
  - No runtime references remain for `GRID_GRADIENT_SHADER_DEBUG_MODE`, `shaderDebugMode`, `uDebugMode`, or the cyan overlay color in Grid Gradient source.
- `bun test ./src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts ./src/lib/territory/families/gridGradient/gridGradientScene.test.ts ./src/lib/components/game/territoryPresentationSpace.test.ts`
  - Superseded by the focused run below.
- `bun test ./src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts ./src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts ./src/lib/territory/families/gridGradient/gridGradientScene.test.ts ./src/lib/components/game/territoryPresentationSpace.test.ts`
  - Passed: 11 tests.
- `bun run build`
  - Passed. Existing CSS/chunk warnings remain.
- Browser smoke on `http://127.0.0.1:1441/play?bench=1&showGame=1&internal=1`
  - Started a game, selected `Grad Grid Gradient`, and captured a screenshot.
  - Dot fills rendered across owned regions.
  - No large cyan-blue shader debug rectangle was visible.
  - Existing unrelated RoomBrowser lobby 404/HTML JSON error remained.
- Browser smoke on `http://127.0.0.1:1441/?bench=1&showGame=1&internal=1`
  - Selected and dispatched `grid_gradient`.
  - Renderer diagnostics reported WebGL and `drawBackend=shader_field` with no fallback.
  - Screenshot showed Grid Gradient fill and borders with no large blue overlay.
  - A forced conquest produced one transition bundle; Grid Gradient stats entered `clockSource=local`, `visibleFrameState=transition`, `transitionEventCount=1`, and `activeTransitionCells=221`.
  - Sampled local progress advanced from about `0.14` through `0.96`, then returned to `none / steady`.
  - Existing unrelated RoomBrowser lobby 404/HTML JSON error remained.

## Browser Verification Targets

- Open `http://127.0.0.1:1441/play`.
- Select territory mode `Grid Gradient`.
- Confirm no large blue overlay appears.
- Trigger conquest and confirm fills visually update. During transition, Grid Gradient live stats should show `local / transition` briefly, then return to `none / steady`.
- Confirm vector borders remain aligned with the territory frame.
