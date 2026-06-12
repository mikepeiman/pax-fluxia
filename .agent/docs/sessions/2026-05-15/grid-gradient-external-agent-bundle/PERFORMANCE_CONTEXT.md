# Grid Gradient Performance Context

Use this with `GRID_GRADIENT_GOD_OBJECT.ts` when deciding where to optimize first.

Observed screenshot costs from the user profile:

- `buildGridGradientPlan`: roughly 91-94 ms in captured hot frames.
- `buildGridClassification`: roughly 80-85 ms.
- `pointInPolygon`: roughly 73-76 ms self time.
- Pixi Graphics rebuild path: `buildContextBatches` roughly 39-48 ms, circle `triangulate` roughly 16-20 ms, `updateGpuContext` roughly 42-50 ms.
- GC spikes: roughly 6-27 ms.

Likely refactor order:

1. Add diagnostics for plan rebuild reason, cache hit/miss, visible cells, active cells, and draw backend.
2. Replace normal point-in-polygon grid classification with grid-native scanline raster classification.
3. Move plan generation off the animation frame or make it reuse retained results while a worker is pending.
4. Replace dense Pixi Graphics fill commands with retained mesh/texture batches.
5. Split stable fill, active transition fill, vector borders, and optional border dots into separately invalidated layers.
