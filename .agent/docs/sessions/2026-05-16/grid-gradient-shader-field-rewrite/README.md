# Grid Gradient Shader Field Rewrite Artifacts

This directory stores the external shader-field rewrite package as project documentation and reference material. The files here are not compiled and are not active source.

## Top-Level Supplied Files

```text
HANDOFF_GRID_GRADIENT_SHADER_FIELD_REWRITE.md
GridGradientFamily.shaderField.rewrite.ts
GridGradientShaderFieldRenderer.ts
gridGradientShaderFieldPacking.ts
gridGradientShaderFieldShaders.ts
```

## Extracted Full Package

```text
full-package/grid_gradient_shader_field_rewrite/
```

This extracted package includes the files above plus patch fragments, type definitions, UI additions, config additions, and a focused packing test.

## Integration Plan

Use:

```text
.agent/docs/plans/2026-05-16/GRID_GRADIENT_SHADER_FIELD_INTEGRATION_PLAN_2026-05-16.md
```

The plan treats the external code as a reference package. Do not drop the rewrite file directly over the live `GridGradientFamily.ts` without reconciling local diagnostics, settings, Pixi 8 APIs, and the graphics fallback path.
