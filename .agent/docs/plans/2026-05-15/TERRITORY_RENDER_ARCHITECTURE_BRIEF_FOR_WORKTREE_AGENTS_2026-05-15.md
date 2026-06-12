# Territory Render Architecture Brief For Worktree Agents - 2026-05-15

**Purpose:** Compact integration map for external worktree agents building complex territory rendering modes that must reintegrate into Pax Fluxia master with minimal conflict.

## 1. Overall App Shape

- `pax-fluxia/`: SvelteKit 5 + PixiJS 8 client. Territory rendering is driven from `src/lib/components/game/GameCanvas.svelte`.
- `pax-server/`: Colyseus game server. Rendering agents should usually not touch it.
- `common/`: shared game resources/types. Rendering agents should avoid changes unless a cross-client/server contract truly changes.
- Live settings flow through `GAME_CONFIG` plus UI panel state. UI writes should use the existing settings components and `bumpTerritoryVisualConfig()`.

## 2. Core Territory Boundary

Keep this boundary intact:

`ownership -> geometry -> transition -> presentation`

- Ownership: who owns stars/regions. Do not duplicate this as renderer-owned truth.
- Geometry: PV/vector/frontier output derived from ownership and map topology.
- Transition: previous/next state and time/progress organization.
- Presentation: Pixi drawing, shaders, meshes, textures, diagnostics, and mode-specific visual expression.

## 3. Current Runtime Shapes

The repo currently has three territory runtime shapes side by side.

| Runtime shape | Main files | Use for |
|---|---|---|
| Pipeline runtime | `TerritoryRuntimeCoordinator.ts`, `GameCanvasTerritoryBridge.ts`, `PixiTerritoryPresenter.ts` | Structured ownership/geometry/transition/presentation pipeline modes. |
| Render-family runtime | `RenderFamilyTypes.ts`, `buildRenderFamilyInput.ts`, `renderFamilyRegistry.ts`, `renderFamilyTransitionLifecycle.ts` | New serious visual modes with mode-local presentation and shared ownership/geometry input. Prefer this for new complex modes. |
| Direct legacy renderer runtime | `GameCanvas.svelte`, `src/lib/renderers/*TerritoryRenderer.ts` | Older direct renderers. Avoid adding new modes here unless explicitly approved and documented. |

## 4. Selection And Dispatch

Key files:

- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
  - `TERRITORY_RENDER_MODE_CATALOG`
  - `resolveTerritoryRenderModeOptions()`
  - `getTerritoryRenderModeLabel()`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
  - `resolveTerritoryArchitectureRoute()`
  - route outputs: `runtime_clean_bridge`, `runtime_legacy_bridge`, `render_family_renderer`, `legacy_style_renderer`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `resolveActiveTerritoryMode()`
  - `renderFrame(...)`
  - `queueTerritoryPresentation(...)`
  - `getCurrentRenderFamilyGeometry(...)`
  - `buildRenderFamilyTransitionState(...)`
  - mode branches that register and call render families

Any new mode id must be traced through catalog, UI, router, dispatch, settings, diagnostics, tests, and docs.

## 5. Pipeline Runtime

Entry:

- `GameCanvasTerritoryBridge.update(input)`
- `TerritoryRuntimeCoordinator.update(rawInput)`

Core flow inside `TerritoryRuntimeCoordinator.update()`:

1. `normalizeTerritoryFrameInput(...)`
2. `OwnershipLayerCoordinator.compute(...)`
3. `TerritoryWorker.computeGeometrySync(...)`
4. `TransitionLayerCoordinator.compute(...)`
5. `PresentationLayerCoordinator.compute(...)`
6. `PixiTerritoryPresenter.present(...)`

Mode selection contract:

- `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- `DEFAULT_TERRITORY_MODE_SELECTION`
- `OwnershipModeId`, `GeometryModeId`, `FillTransitionModeId`, `BorderTransitionModeId`, `TerritoryStyleModeId`

Use this path when the mode is primarily a new pipeline style or transition behavior that fits the existing layered contracts.

## 6. Render-Family Runtime

Primary contract:

- `pax-fluxia/src/lib/territory/families/RenderFamilyTypes.ts`
- `RenderFamily`
  - `id`
  - `label`
  - `tunableKeys`
  - `update(input: RenderFamilyInput): RenderFamilyOutput`
  - `dispose()`
- `RenderFamilyInput`
  - `ownership`
  - `geometry`
  - `prevGeometry`
  - `stars`
  - `lanes`
  - `world`
  - `tunables`
  - `configSource`
  - `renderer`
  - `activeTransition`
  - `transitionSessions`

Registration:

- `renderFamilyRegistry.ts`
  - `registerRenderFamily(family)`
  - `getRenderFamily(id)`
  - `disposeAllRenderFamilies()`

Input construction:

- `buildRenderFamilyInput(...)`
- `buildRenderFamilyTransitionLifecycle(...)`
- `buildOwnershipSnapshotFromStars(...)`
- `buildVectorRenderFamilyGeometry(...)`
- `buildPerimeterFieldRenderFamilyGeometry(...)`

Current family examples:

- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
  - `MetaballGridFamily.update(...)`
  - `createMetaballGridFamily(...)`
- `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts`
  - `GridGradientFamily.update(...)`
  - `createGridGradientFamily(...)`
- `pax-fluxia/src/lib/territory/families/perimeterField/PerimeterFieldFamily.ts`
  - `PerimeterFieldFamily.update(...)`

Prefer this path for new complex visual modes. Keep the mode's heavy logic in its own family folder, not in `GameCanvas.svelte`.

## 7. Direct Legacy Renderers

Direct renderers are called from `GameCanvas.svelte` and usually own more cache/render state internally.

Examples:

- `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`
  - `renderDistanceFieldTerritory(...)`
  - `resetDistanceFieldTerritoryCache()`
- `pax-fluxia/src/lib/renderers/PixelTerritoryRenderer.ts`
  - `renderPixelTerritory(...)`
  - `resetPixelTerritoryCache()`
- `pax-fluxia/src/lib/renderers/GraphTerritoryRenderer.ts`
  - `renderGraphTerritory(...)`
- `pax-fluxia/src/lib/renderers/ContourTerritoryRenderer.ts`
  - `renderContourTerritory(...)`

Do not add a new direct renderer path for a new shipped candidate unless the mode cannot reasonably use the family or pipeline contracts.

## 8. Settings And Diagnostics Surfaces

Common setting surfaces:

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- mode tuning components such as:
  - `MetaballGridTuning.svelte`
  - `GridGradientTuning.svelte`
  - `TerritoryPhaseFieldSettings.svelte`
  - `TerritorySurfaceStyleTuning.svelte`
- config/default metadata:
  - `pax-fluxia/src/lib/config/game.config.ts`
  - `pax-fluxia/src/lib/components/ui/settings/settingsDefs.ts`
  - `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
  - `pax-fluxia/src/lib/components/ui/settings/settingsSearch.ts`

Diagnostics and benchmark hooks:

- `pax-fluxia/src/lib/stores/territoryRenderStatusStore.ts`
- mode stats stores such as `gridGradientStats.ts` and `metaballGridStats.ts`
- `pax-fluxia/src/lib/perf/benchmarkBridge.ts`
- `GameCanvas.svelte` exports `getBenchmarkTerritorySchedulerSnapshot()`

If a mode has tunables, expose them through UI, metadata, search, config fingerprinting, and diagnostics. Do not hide tuning only in code.

## 9. Low-Conflict Worktree Guidance

- Keep new mode code under `pax-fluxia/src/lib/territory/families/<mode>/`.
- Touch `GameCanvas.svelte` only for imports, registration, and the smallest dispatch branch.
- Add mode tests next to the family and update `TerritoryArchitectureRouter.test.ts`.
- Avoid changing shared contracts unless the new mode cannot work without that change.
- Use `RenderFamilyInput.tunables` and `configSource` before adding new global plumbing.
- Keep generated textures, workers, caches, and diagnostics mode-local.
- Use the project telemetry logger, not raw browser logging.
- Update docs and the dated queue in the same worktree.

## 10. Minimum Reintegration Checklist For A New Mode

1. Add mode id and label in `territoryRenderModeCatalog.ts`.
2. Add or confirm top-bar/settings UI exposure.
3. Add router classification in `TerritoryArchitectureRouter.ts`.
4. Add a small `GameCanvas.svelte` registration/dispatch branch.
5. Implement `RenderFamily` or pipeline contract, preferably render-family.
6. Add config defaults, metadata, search entries, and fingerprint coverage for tunables.
7. Add diagnostics and benchmark visibility.
8. Add focused tests for mode helpers and router behavior.
9. Update `.agent/docs/game/territory/` or a dated plan/session doc with runtime shape and constraints.
10. Run focused tests and `bun run build` in `pax-fluxia/`.
