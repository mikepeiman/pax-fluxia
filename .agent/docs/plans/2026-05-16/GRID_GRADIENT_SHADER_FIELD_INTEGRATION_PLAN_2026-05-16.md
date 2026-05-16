# Grid Gradient Shader Field Integration Plan - 2026-05-16

## Purpose

Commit the external Grid Gradient shader-field research package into project documentation, then plan how to integrate it safely into Pax Fluxia.

## Current Status

The package began as documentation/reference material. It is now partially integrated into source as the default Grid Gradient fill backend, with graphics fallback retained.

Committed reference location:

```text
.agent/docs/sessions/2026-05-16/grid-gradient-shader-field-rewrite/
```

Important artifact paths:

```text
HANDOFF_GRID_GRADIENT_SHADER_FIELD_REWRITE.md
GridGradientFamily.shaderField.rewrite.ts
GridGradientShaderFieldRenderer.ts
gridGradientShaderFieldPacking.ts
gridGradientShaderFieldShaders.ts
full-package/grid_gradient_shader_field_rewrite/
```

The `full-package` directory includes patch fragments and tests not present in the individually supplied files, including:

```text
gridGradientShaderFieldTypes.ts
index.ts
config.shaderField.patch.ts
settings.shaderField.patch.ts
gridGradientStats.shaderField.patch.ts
GridGradientTuning.shaderField.patch.svelte
ControlsSection-Diagnostics.gridGradient.shaderField.patch.svelte
gridGradientShaderFieldPacking.test.ts
```

Implementation source location:

```text
pax-fluxia/src/lib/territory/families/gridGradient/shaderField/
```

## Architecture Decision

Integrate this as a `grid_gradient` render-family presentation backend, not as a new direct renderer and not as a separate runtime.

Reason:

- The mode already belongs to the render-family path.
- The shader-field package consumes existing ownership, geometry, transition, and settings inputs.
- The proposed change is presentation-side: replace dense Pixi `Graphics` mark drawing with packed textures plus a shader field.
- Keeping it inside `GridGradientFamily` preserves current mode selection, diagnostics, settings, and runtime dispatch.

## Intended Boundary Map

| Layer | Integration responsibility |
|---|---|
| Ownership | Reuse existing `OwnershipSnapshot` and owner ids. Do not create a second owner truth. |
| Geometry | Reuse current PV-derived region/frontier geometry and existing grid classification until scanline raster work is ready. |
| Transition | Reuse existing render-family transition lifecycle and per-cell wave plan data. |
| Presentation | Add shader-field backend that packs grid truth into textures and renders one world-space field mesh. |

## Integration Plan

### Phase 0 - Artifact Audit

1. Compare the external package against current files on this branch.
2. Identify stale assumptions from the package, especially Grid Gradient diagnostics already added on 2026-05-15.
3. Confirm Pixi 8 shader, geometry, mesh, and texture APIs in the installed `pixi.js` version before copying renderer code.
4. Decide which package code is copied directly and which must be rewritten to match local patterns.

Exit criteria:

- A short adapter note identifies the exact Pixi APIs to use for shader creation, uniforms, buffer textures, and mesh construction.

### Phase 1 - Compile-Safe Module Skeleton

1. Add `shaderField/` under `pax-fluxia/src/lib/territory/families/gridGradient/`.
2. Add type definitions, texture packing utilities, shader sources, renderer wrapper, and index export.
3. Add packing tests from the package and adapt imports to the local tree.
4. Do not change the active renderer path yet.

Exit criteria:

- Focused shader-field packing tests pass.
- `bun run build` still passes with no active behavior change.

### Phase 2 - Settings, Config, And Diagnostics

1. Add `GRID_GRADIENT_DRAW_BACKEND` with values `graphics`, `shader_field`, and future `mesh_quads`.
2. Add shader-field settings through the existing settings system:
   - `settingsDefs.ts`
   - `settingMetadata.ts`
   - `categoryThemes.ts`
   - `game.config.ts`
   - `gridGradient/settings.ts`
   - `GridGradientTuning.svelte`
3. Extend `gridGradientStats.ts` for backend, plan cache, presentation cache, texture bytes, texture upload, packing time, active transition cells, outside cells, neighbor mode, and debug mode.
4. Add diagnostics UI rows under existing Grid Gradient diagnostics.

Exit criteria:

- UI exposes backend and shader controls through panel state, not direct `GAME_CONFIG` reads.
- Diagnostics can distinguish graphics fallback from shader-field rendering.

### Phase 3 - Backend Switch In GridGradientFamily

1. Keep the existing `graphics` path intact as fallback.
2. Add separate containers/graphics for:
   - shader-field fill,
   - vector borders,
   - border dots,
   - legacy graphics fallback.
3. Route fill rendering based on `drawBackend`.
4. Reuse vector borders and border dots with signatures so they do not rebuild on every steady frame.
5. Keep plan and distance-field ownership logic in the family for now; do not introduce worker planning in this phase.

Exit criteria:

- `graphics` backend renders as before.
- `shader_field` backend renders fill through the shader path.
- Vector borders remain readable by default.

### Phase 4 - Validation And Profiling

1. Run focused tests:
   - shader-field packing tests,
   - existing Grid Gradient scene tests.
2. Run `bun run build` in `pax-fluxia/`.
3. Start the app only when browser use is approved.
4. In UI, test:
   - select `Grid Gradient`,
   - switch backend between `graphics` and `shader_field`,
   - inspect diagnostics rows,
   - compare 16px, 12px, 8px, and 6px settings.
5. Record Chrome Performance traces after visual sanity passes.

Exit criteria:

- Shader-field steady frames do not show `drawGridGradientCell` or circle triangulation as recurring fill-path costs.
- Texture upload is false on steady frames after warm-up.
- `Plan Cache` and `Presentation Cache` show hits after warm-up.

## Known Risks

- Pixi 8 shader construction from the package was replaced with the local high-shader and `BufferImageSource` pattern; browser verification is still required.
- Texture creation may need a local Pixi 8-compatible `TextureSource` path rather than `Texture.fromBuffer`.
- The package still depends on current point-in-polygon classification until a later raster classification phase.
- Shader-field rendering may initially differ visually at cell boundaries; default neighbor mode should be `eight` because marks can exceed cell spacing.
- The replacement family file is a rewrite template, not a safe direct drop-in.
- Pixi high-shader bits must avoid declaring template-provided varyings such as `vUV`; any use of `localUniformBitGl` must include `roundPixelsBitGl`.

## Implementation Note - 2026-05-16

Completed:

1. Added `shaderField/` modules for type contracts, texture packing, shader source, renderer wrapper, and exports.
2. Added `gridGradientShaderFieldPacking.test.ts`.
3. Added `GRID_GRADIENT_DRAW_BACKEND` and shader-field tuning keys through config, settings, panel mapping, search metadata, and UI controls.
4. Reworked `GridGradientFamily` to use separate fill, shader-field, border-dot, and vector-border layers.
5. Added plan cache diagnostics, presentation cache diagnostics, texture upload stats, texture byte counts, active/outside cell counts, shader neighbor mode, and shader debug mode.
6. Kept `graphics` as explicit fallback and as the fallback for pending `mesh_quads`, WebGPU GL-shader mismatch, and shader update failure.

Validated:

```text
bunx vitest run src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/renderers/pixiRendererDiagnostics.test.ts
bun run build
```

Hotfix validation after first shader compile failure:

```text
bunx vitest run src/lib/territory/families/gridGradient/gridGradientScene.test.ts src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts src/lib/renderers/pixiRendererDiagnostics.test.ts
bun run build
```

The compile failure was caused by duplicate `vUV` declarations and a missing `roundPixelsBitGl` bit. The shader source now relies on Pixi's template-provided `vUV` and includes `roundPixelsBitGl` alongside `localUniformBitGl`.

Not yet validated:

```text
Browser visual render
Chrome Performance trace after warm-up
```

## Commit Sequence

1. Add shader-field module skeleton and packing tests.
2. Add config/settings/stat types and defaults.
3. Add diagnostics UI rows.
4. Add tuning UI controls.
5. Patch `GridGradientFamily` with backend switch and fallback.
6. Validate focused tests and build.
7. Browser-test and profile after user permits browser use.

## Follow-On Work

After shader-field presentation is stable:

1. Replace normal grid classification with scanline raster classification.
2. Move plan generation off the animation frame.
3. Add performance presets and optional zoom-aware presentation LOD.
