# Grid Gradient External Agent Bundle

This directory is a compact, self-contained reference packet for reviewing and performance-optimizing the experimental `grid_gradient` render-family mode.

Main file: `GRID_GRADIENT_GOD_OBJECT.ts`. It is not compiled. It concatenates the current mode source, its shared grid dependencies, relevant settings/diagnostics surfaces, and the `GameCanvas.svelte` dispatch/cache ranges. Every section header includes the original file path and source line range for reintegration.

Companion files:

- `PERFORMANCE_CONTEXT.md`: screenshot-derived hot-path summary and likely refactor order.
- `REQUESTED_AGENT_INFO.md`: answers to the external agent's requested info, plus capture instructions for raw traces, live cell counts, accepted-look media, and Pixi renderer type.

## Layer Map

- Ownership: sections 04, 35, and parts of 36 build/read ownership snapshots. Do not create a second ownership truth in the renderer.
- Geometry: sections 04, 05, 06, 35, and 36 provide PV/vector geometry and grid classification inputs.
- Transition: sections 03, 07, 08, 12, 34, 35, and 36 organize previous/next snapshots and per-cell transition timing.
- Presentation: sections 13, 14, 16, 21, 24, 26, and 36 are where cells become Pixi-visible marks, vector borders, and border dots.
- Settings/diagnostics: sections 10, 11, 15, 21, 25-32, and 37 are the UI/config/status surfaces to keep aligned.
- Routing/selection: sections 19, 20, 32, 33, and 36 wire the mode id into runtime dispatch.

## Suggested Grep Targets

- Main perf hot path: `buildGridGradientPlan`, `buildGridClassification`, `resolveOwnerAt`, `pointInPolygon`, `drawGridGradientCell`, `GridGradientFamily.update`.
- Reintegration markers: `SOURCE:`, `SECTION`, and the original file paths in each header.
- Dispatch-only work: `case "grid_gradient"`, `createGridGradientFamily`, `gg.update`.

## God Object Section Index

| Section | God file lines | Layer | Original source | What to grep |
|---|---:|---|---|---|
| 00 | 8-111 | contract | `pax-fluxia\src\lib\territory\families\RenderFamilyTypes.ts:1-97` | `RenderFamilyInput, RenderFamily, RenderFamilyOutput` |
| 01 | 112-136 | contract | `pax-fluxia\src\lib\territory\families\renderFamilyRegistry.ts:1-18` | `registerRenderFamily, getRenderFamily` |
| 02 | 137-273 | contract | `pax-fluxia\src\lib\territory\families\buildRenderFamilyInput.ts:1-130` | `buildRenderFamilyInput, collectRenderFamilyTunables` |
| 03 | 274-453 | transition | `pax-fluxia\src\lib\territory\transitions\renderFamilyTransitionLifecycle.ts:1-173` | `buildRenderFamilyTransitionLifecycle` |
| 04 | 454-741 | ownership/geometry | `pax-fluxia\src\lib\territory\families\buildFamilyGeometry.ts:1-281` | `buildOwnershipSnapshotFromStars, buildPerimeterFieldRenderFamilyGeometry` |
| 05 | 742-771 | geometry | `pax-fluxia\src\lib\territory\geometry\geometryUtils.ts:60-82` | `pointInPolygon` |
| 06 | 772-1374 | classification | `pax-fluxia\src\lib\territory\families\metaballGrid\buildGridClassification.ts:1-596` | `buildGridClassification, resolveOwnerAt` |
| 07 | 1375-1974 | transition | `pax-fluxia\src\lib\territory\families\metaballGrid\planGridWave.ts:1-593` | `planGridWave` |
| 08 | 1975-2340 | transition/presentation | `pax-fluxia\src\lib\territory\families\metaballGrid\renderMetaballGridScene.ts:1-359` | `renderMetaballGridScene` |
| 09 | 2341-2711 | types | `pax-fluxia\src\lib\territory\families\metaballGrid\metaballGridTypes.ts:1-364` | `GridClassification, GridVStar, GridRenderCell` |
| 10 | 2712-2738 | settings | `pax-fluxia\src\lib\territory\families\gridGradient\config.ts:1-20` | `gridGradientFamilyConfigDefaults` |
| 11 | 2739-3043 | settings | `pax-fluxia\src\lib\territory\families\gridGradient\settings.ts:1-298` | `resolveGridGradientSettings, GRID_GRADIENT_TUNABLE_KEYS` |
| 12 | 3044-3204 | classification/transition | `pax-fluxia\src\lib\territory\families\gridGradient\plan.ts:1-154` | `buildGridGradientPlan, buildGridGradientPlanKey` |
| 13 | 3205-3455 | presentation | `pax-fluxia\src\lib\territory\families\gridGradient\gridGradientScene.ts:1-244` | `resolveGridGradientCellSize, buildGridGradientBorderDots` |
| 14 | 3456-3610 | presentation | `pax-fluxia\src\lib\territory\families\gridGradient\paint.ts:1-148` | `drawGridGradientCell, drawGridGradientVectorBorders` |
| 15 | 3611-3688 | diagnostics | `pax-fluxia\src\lib\territory\families\gridGradient\gridGradientStats.ts:1-71` | `GridGradientStats, updateGridGradientStats` |
| 16 | 3689-4018 | presentation/runtime | `pax-fluxia\src\lib\territory\families\gridGradient\GridGradientFamily.ts:1-323` | `GridGradientFamily.update, resolvePlan` |
| 17 | 4019-4029 | exports | `pax-fluxia\src\lib\territory\families\gridGradient\index.ts:1-4` | `exports` |
| 18 | 4030-4232 | tests | `pax-fluxia\src\lib\territory\families\gridGradient\gridGradientScene.test.ts:1-196` | `tests` |
| 19 | 4233-4322 | routing | `pax-fluxia\src\lib\territory\integration\TerritoryArchitectureRouter.ts:1-83` | `resolveTerritoryArchitectureRoute, grid_gradient` |
| 20 | 4323-4474 | routing/ui | `pax-fluxia\src\lib\territory\ui\territoryRenderModeCatalog.ts:1-145` | `TERRITORY_RENDER_MODE_CATALOG, grid_gradient` |
| 21 | 4475-4765 | settings/ui | `pax-fluxia\src\lib\components\ui\settings\GridGradientTuning.svelte:1-284` | `GRID_GRADIENT_* UI writes` |
| 22 | 4766-4962 | settings/ui | `pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:1-190` | `GridGradientTuning import, support helpers` |
| 23 | 4963-5170 | settings/ui | `pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:450-650` | `TERRITORY_RENDER_MODE, isGridGradientStyle` |
| 24 | 5171-5405 | settings/ui | `pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:2068-2295` | `Grid Gradient cards` |
| 25 | 5406-5502 | diagnostics/ui | `pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte:1-90` | `gridGradientStats, showGridGradientDiagnostics` |
| 26 | 5503-5528 | diagnostics/ui | `pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte:706-724` | `Grid Gradient diagnostics rows` |
| 27 | 5529-5557 | settings/metadata | `pax-fluxia\src\lib\components\ui\settingsDefs.ts:615-636` | `GRID_GRADIENT settingsDefs` |
| 28 | 5558-5584 | settings/metadata | `pax-fluxia\src\lib\components\ui\settings\settingMetadata.ts:474-493` | `Grid Gradient metadata` |
| 29 | 5585-5670 | settings/config | `pax-fluxia\src\lib\config\game.config.ts:442-520` | `GRID_GRADIENT config keys` |
| 30 | 5671-5698 | settings/config | `pax-fluxia\src\lib\config\categoryThemes.ts:280-300` | `GRID_GRADIENT category keys` |
| 31 | 5699-5740 | settings/config | `pax-fluxia\src\lib\territory\buildTerritoryConfigFingerprint.ts:1-35` | `GRID_GRADIENT_` |
| 32 | 5741-5892 | ui/shortcut | `pax-fluxia\src\lib\territory\ui\territoryModeShortcuts.ts:1-145` | `grid_gradient shortcut` |
| 33 | 5893-5947 | runtime/dispatch | `pax-fluxia\src\lib\components\game\GameCanvas.svelte:108-155` | `imports` |
| 34 | 5948-6152 | runtime/dispatch | `pax-fluxia\src\lib\components\game\GameCanvas.svelte:1838-2035` | `transition/input helpers` |
| 35 | 6153-6391 | runtime/geometry | `pax-fluxia\src\lib\components\game\GameCanvas.svelte:2614-2845` | `getCurrentRenderFamilyGeometry, prevGeometry` |
| 36 | 6392-7139 | runtime/dispatch | `pax-fluxia\src\lib\components\game\GameCanvas.svelte:5380-6120` | `case grid_gradient, gg.update` |
| 37 | 7140-7204 | diagnostics/runtime | `pax-fluxia\src\lib\components\game\GameCanvas.svelte:6993-7052` | `getBenchmarkTerritorySchedulerSnapshot, gridGradientDebug` |
