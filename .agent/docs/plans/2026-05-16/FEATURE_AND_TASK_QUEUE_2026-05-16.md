# Feature And Task Queue - 2026-05-16

## Active

- User verification: run Grid Gradient in the browser, confirm the shader-field backend renders the accepted look, and capture a new Chrome Performance trace at 6px/8px spacing.

## Completed

- Imported the external shader-field handoff package into project session docs as reference-only material.
- Added a dated integration plan for adapting the external package into the live render-family implementation.
- Implemented the Grid Gradient shader-field backend inside the existing render-family path.
- Added shader-field texture packing tests, settings controls, diagnostics rows, and graphics fallback.
- Validated focused Grid Gradient tests and `bun run build` in `pax-fluxia/`.

## Next Useful Follow-Ups

- Use Territory settings -> Grid Gradient -> Backend to switch between `Shader Field` and `Graphics`.
- In Mode Diagnostics, confirm Backend reads `shader_field -> shader_field`, Texture reads `cached` after warm-up, and Plan Cache / Paint Cache settle to `hit`.
- If the shader-field visuals profile well, replace point-in-polygon grid classification with a scanline/raster classification path next.
