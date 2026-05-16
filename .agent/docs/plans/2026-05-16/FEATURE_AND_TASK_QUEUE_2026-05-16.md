# Feature And Task Queue - 2026-05-16

## Active

- Plan integration of the external Grid Gradient shader-field rewrite package.

## Completed

- Imported the external shader-field handoff package into project session docs as reference-only material.
- Added a dated integration plan for adapting the external package into the live render-family implementation.

## Next Useful Follow-Ups

- Start with a compile-safe shader-field module skeleton under `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/`.
- Add packing tests before changing the active Grid Gradient renderer.
- Wire the backend behind an explicit `GRID_GRADIENT_DRAW_BACKEND` setting with `graphics` fallback.
