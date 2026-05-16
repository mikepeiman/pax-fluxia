# Session - 2026-05-16 - Grid Gradient Shader Field Rewrite

## Goal

Preserve external Grid Gradient shader-field research and implementation artifacts in project documentation, then integrate the shader-field backend into the live Grid Gradient render-family implementation.

## Facts

- The external package proposes replacing dense Pixi `Graphics` mark drawing with a shader-field backend.
- The package is not live-validated against this worktree.
- The full zip contains additional patch fragments and tests beyond the individually supplied files.
- Runtime source is now changed in a follow-up implementation commit.
- The implementation uses the existing render-family runtime shape, not a direct `GameCanvas.svelte` renderer path.
- The shader-field backend is presentation-only: ownership and geometry truth remain upstream, transition timing remains the family wave plan, and the shader reconstructs marks from packed textures.

## Documentation Added

```text
.agent/docs/plans/2026-05-16/FEATURE_AND_TASK_QUEUE_2026-05-16.md
.agent/docs/plans/2026-05-16/GRID_GRADIENT_SHADER_FIELD_INTEGRATION_PLAN_2026-05-16.md
.agent/docs/sessions/2026-05-16/2026-05-16_Chat_grid-gradient-shader-field-rewrite.md
.agent/docs/sessions/2026-05-16/2026-05-16_Session_grid-gradient-shader-field-rewrite.md
.agent/docs/sessions/2026-05-16/grid-gradient-shader-field-rewrite/
```

## Implementation Added

```text
pax-fluxia/src/lib/territory/families/gridGradient/shaderField/
pax-fluxia/src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts
pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts
pax-fluxia/src/lib/territory/families/gridGradient/config.ts
pax-fluxia/src/lib/territory/families/gridGradient/settings.ts
pax-fluxia/src/lib/territory/families/gridGradient/gridGradientStats.ts
pax-fluxia/src/lib/components/ui/settings/GridGradientTuning.svelte
pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte
pax-fluxia/src/lib/components/ui/settingsDefs.ts
pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts
pax-fluxia/src/lib/config/categoryThemes.ts
pax-fluxia/src/lib/config/game.config.ts
```

## Runtime Shape

- Shape: render-family backend inside `GridGradientFamily`.
- Default fill backend: `shader_field`.
- Fallback backend: `graphics`, used for explicit selection, pending `mesh_quads`, WebGPU GL-shader mismatch, or shader-field runtime errors.
- Closest references used: existing Grid Gradient graphics path for semantics; `DistanceFieldTerritoryRenderer` and metaball-grid frontier shader layers for Pixi 8 `BufferImageSource`, high-shader, uniform, and mesh patterns.

## Boundary Map

- Ownership: reused owner ids from the existing classification and `OwnershipSnapshot`; no second owner truth.
- Geometry: reused PV-derived geometry and current grid classification.
- Transition: reused `GridWavePlan` flip times and active transition progress.
- Presentation: packed owner/metrics/palette textures plus one world-space shader field mesh; vector borders and border dots remain separate display layers.

## Performance Intent

- Avoid recurring `drawGridGradientCell`, Pixi circle triangulation, and dense `Graphics` batch rebuild costs on steady shader-field frames.
- Cache the render-family plan by plan key.
- Cache the shader presentation texture plan by presentation key.
- Keep vector borders and border dots behind signatures so they do not rebuild on every unchanged frame.

## Validation

Passed:

```text
bunx vitest run src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/renderers/pixiRendererDiagnostics.test.ts
bun run build
```

Additional check:

```text
bun run check
```

This still fails because the worktree has unrelated existing TypeScript/Svelte errors outside Grid Gradient. A filtered check showed no Grid Gradient errors after fixes; only shared-panel unused CSS warnings remain for `GridGradientTuning.svelte`.

## Current Status

Implementation is compiled and unit-tested. Browser visual verification and Chrome Performance profiling are still needed.

## Runtime Hotfix - Shader Compile Error

User reported a WebGL shader compile failure while loading `Grid Gradient` with the shader-field backend:

```text
'vUV' : redefinition
'roundPixels' : no matching overloaded function found
```

Cause:

- Pixi's high-shader GL template already declares and assigns `vUV`; the Grid Gradient bit redeclared it.
- `localUniformBitGl` emits a `roundPixels(gl_Position.xy, uResolution)` call, so the program must include Pixi's `roundPixelsBitGl`.

Patch:

- Removed the duplicate `vUV` declarations from `gridGradientShaderFieldShaders.ts`.
- Added `roundPixelsBitGl` to the compiled shader bits in `GridGradientShaderFieldRenderer.ts`.

Validated after patch:

```text
bunx vitest run src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/renderers/pixiRendererDiagnostics.test.ts
bun run build
```

Additional source check confirmed the generated shader has one vertex `vUV`, one fragment `vUV`, and one `roundPixels` definition.

## Next Action

In the UI, enable `Grid Gradient`, leave Backend as `Shader Field`, and check Mode Diagnostics for `shader_field -> shader_field`, texture cache hits after warm-up, and no fallback reason. Then profile 6px and 8px spacing to confirm `drawGridGradientCell` and Pixi circle triangulation are gone from steady fill frames.
