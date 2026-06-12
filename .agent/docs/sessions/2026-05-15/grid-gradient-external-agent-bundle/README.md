# Grid Gradient External Agent Bundle

This directory is a compact, self-contained reference packet for reviewing and performance-optimizing the experimental `grid_gradient` render-family mode.

Main file: `GRID_GRADIENT_GOD_OBJECT.ts`. It is not compiled. It concatenates the current mode source, its shared grid dependencies, relevant settings/diagnostics surfaces, Pixi renderer diagnostics, and the `GameCanvas.svelte` dispatch/cache ranges. Every section header includes the original file path and source line range for reintegration.

Companion files:

- `PERFORMANCE_CONTEXT.md`: screenshot-derived hot-path summary and likely refactor order.
- `REQUESTED_AGENT_INFO.md`: answers to the external agent's requested info, plus capture instructions for raw traces, live cell counts, accepted-look media, and Pixi renderer type.

## Layer Map

- Ownership: sections 04, 39, and parts of 40 build/read ownership snapshots. Do not create a second ownership truth in the renderer.
- Geometry: sections 04, 05, 06, 39, and 40 provide PV/vector geometry and grid classification inputs.
- Transition: sections 03, 07, 08, 12, 38, 39, and 40 organize previous/next snapshots and per-cell transition timing.
- Presentation: sections 13, 14, 18, 24, 27, 30, and 40 are where cells become Pixi-visible marks, vector borders, and border dots.
- Settings/diagnostics: sections 10, 11, 15, 16, 17, 24, 28-36, 41, and 42 are the UI/config/status surfaces to keep aligned.
- Routing/selection: sections 22, 23, 36, 37, and 40 wire the mode id into runtime dispatch.

## Suggested Grep Targets

- Main perf hot path: `buildGridGradientPlan`, `buildGridClassification`, `resolveOwnerAt`, `pointInPolygon`, `drawGridGradientCell`, `GridGradientFamily.update`.
- Renderer diagnostics: `resolvePixiRendererDiagnostics`, `rendererDiagnostics`, `Renderer`, `TerritoryRenderStatus`.
- Reintegration markers: `SOURCE:`, `SECTION`, and the original file paths in each header.
- Dispatch-only work: `case grid_gradient`, `createGridGradientFamily`, `gg.update`.

## God Object Section Index

| Section | God file lines | Layer | Original source | What to grep |
|---|---:|---|---|---|
| 00 | 4-108 | contract | `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts:1-98` | `RenderFamilyInput, RenderFamily, RenderFamilyOutput` |
| 01 | 109-134 | contract | `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts:1-19` | `registerRenderFamily, getRenderFamily` |
| 02 | 135-272 | contract | `pax-fluxia/src/lib/territory/families/buildRenderFamilyInput.ts:1-131` | `buildRenderFamilyInput, collectRenderFamilyTunables` |
| 03 | 273-453 | transition | `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts:1-174` | `buildRenderFamilyTransitionLifecycle` |
| 04 | 454-742 | ownership/geometry | `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts:1-282` | `buildOwnershipSnapshotFromStars, buildPerimeterFieldRenderFamilyGeometry` |
| 05 | 743-772 | geometry | `pax-fluxia/src/lib/territory/geometry/geometryUtils.ts:60-82` | `pointInPolygon` |
| 06 | 773-1376 | classification | `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts:1-597` | `buildGridClassification, resolveOwnerAt` |
| 07 | 1377-1977 | transition | `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts:1-594` | `planGridWave` |
| 08 | 1978-2344 | transition/presentation | `pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts:1-360` | `renderMetaballGridScene` |
| 09 | 2345-2716 | types | `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridTypes.ts:1-365` | `GridClassification, GridVStar, GridRenderCell` |
| 10 | 2717-2744 | settings | `pax-fluxia/src/lib/territory/families/gridGradient/config.ts:1-21` | `gridGradientFamilyConfigDefaults` |
| 11 | 2745-3050 | settings | `pax-fluxia/src/lib/territory/families/gridGradient/settings.ts:1-299` | `resolveGridGradientSettings, GRID_GRADIENT_TUNABLE_KEYS` |
| 12 | 3051-3212 | classification/transition | `pax-fluxia/src/lib/territory/families/gridGradient/plan.ts:1-155` | `buildGridGradientPlan, buildGridGradientPlanKey` |
| 13 | 3213-3464 | presentation | `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientScene.ts:1-245` | `resolveGridGradientCellSize, buildGridGradientBorderDots` |
| 14 | 3465-3620 | presentation | `pax-fluxia/src/lib/territory/families/gridGradient/paint.ts:1-149` | `drawGridGradientCell, drawGridGradientVectorBorders` |
| 15 | 3621-3762 | diagnostics/runtime | `pax-fluxia/src/lib/renderers/pixiRendererDiagnostics.ts:1-135` | `resolvePixiRendererDiagnostics, PixiRendererDiagnostics` |
| 16 | 3763-3840 | diagnostics/store | `pax-fluxia/src/lib/stores/territoryRenderStatusStore.ts:1-71` | `TerritoryRenderStatus, setTerritoryRenderStatus` |
| 17 | 3841-3927 | diagnostics | `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientStats.ts:1-80` | `GridGradientStats, updateGridGradientStats` |
| 18 | 3928-4265 | presentation/runtime | `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts:1-331` | `GridGradientFamily.update, resolvePlan, rendererDiagnostics` |
| 19 | 4266-4277 | exports | `pax-fluxia/src/lib/territory/families/gridGradient/index.ts:1-5` | `exports` |
| 20 | 4278-4481 | tests | `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientScene.test.ts:1-197` | `tests` |
| 21 | 4482-4530 | tests | `pax-fluxia/src/lib/renderers/pixiRendererDiagnostics.test.ts:1-42` | `resolvePixiRendererDiagnostics tests` |
| 22 | 4531-4621 | routing | `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts:1-84` | `resolveTerritoryArchitectureRoute, grid_gradient` |
| 23 | 4622-4774 | routing/ui | `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts:1-146` | `TERRITORY_RENDER_MODE_CATALOG, grid_gradient` |
| 24 | 4775-5066 | settings/ui | `pax-fluxia/src/lib/components/ui/settings/GridGradientTuning.svelte:1-285` | `GRID_GRADIENT_* UI writes` |
| 25 | 5067-5263 | settings/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte:1-190` | `GridGradientTuning import, support helpers` |
| 26 | 5264-5471 | settings/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte:450-650` | `TERRITORY_RENDER_MODE, isGridGradientStyle` |
| 27 | 5472-5706 | settings/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte:2068-2295` | `Grid Gradient cards` |
| 28 | 5707-5803 | diagnostics/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte:1-90` | `gridGradientStats, showGridGradientDiagnostics` |
| 29 | 5804-5846 | diagnostics/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte:600-635` | `Mode Diagnostics Renderer row` |
| 30 | 5847-5884 | diagnostics/ui | `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte:720-750` | `Grid Gradient diagnostics rows, Renderer row` |
| 31 | 5885-5913 | settings/metadata | `pax-fluxia/src/lib/components/ui/settingsDefs.ts:615-636` | `GRID_GRADIENT settingsDefs` |
| 32 | 5914-5940 | settings/metadata | `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts:474-493` | `Grid Gradient metadata` |
| 33 | 5941-6026 | settings/config | `pax-fluxia/src/lib/config/game.config.ts:442-520` | `GRID_GRADIENT config keys` |
| 34 | 6027-6054 | settings/config | `pax-fluxia/src/lib/config/categoryThemes.ts:280-300` | `GRID_GRADIENT category keys` |
| 35 | 6055-6096 | settings/config | `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.ts:1-35` | `GRID_GRADIENT_` |
| 36 | 6097-6271 | ui/shortcut | `pax-fluxia/src/lib/territory/ui/territoryModeShortcuts.ts:1-168` | `grid_gradient shortcut` |
| 37 | 6272-6448 | runtime/dispatch | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:1-170` | `imports` |
| 38 | 6449-6653 | runtime/dispatch | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:1838-2035` | `transition/input helpers` |
| 39 | 6654-6892 | runtime/geometry | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:2614-2845` | `getCurrentRenderFamilyGeometry, prevGeometry` |
| 40 | 6893-7660 | runtime/dispatch | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:5380-6140` | `case grid_gradient, gg.update` |
| 41 | 7661-7748 | diagnostics/runtime | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:6490-6570` | `setTerritoryRenderStatus, rendererDiagnostics` |
| 42 | 7749-7822 | diagnostics/runtime | `pax-fluxia/src/lib/components/game/GameCanvas.svelte:7004-7070` | `getBenchmarkTerritorySchedulerSnapshot, gridGradientDebug, rendererDiagnostics` |
