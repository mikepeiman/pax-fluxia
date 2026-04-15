# Territory clean-architecture map

**Code root:** pax-fluxia/src/lib/territory/ (~159 .ts files).

**Related:** [territory-rendering-overview.md](./territory-rendering-overview.md), [territory-rendering-jumpstart.md](./territory-rendering-jumpstart.md).

---

## Clean-architecture Territory System

The "new" architecture at `pax-fluxia/src/lib/territory/` (~159 `.ts` files). This is the 4-layer pipeline that has been the focus of recent work. The transition layer is what has been failing persistently.

### `territory/contracts/` (9 files)
`OwnershipContracts.ts`, `GeometryContracts.ts`, `TransitionContracts.ts`, `PresentationContracts.ts`, `FrontierTopologyContracts.ts`, `TerritoryFrameInput.ts`, `TerritoryModeSelection.ts`, `TerritoryModeCatalog.ts`, `DiagnosticsContracts.ts`

### `territory/compiler/` (13 files)
`TerritoryCompiler.ts`, `TerritoryTransitionPlanner.ts`, `buildFrontierTopology.ts`, `buildFrontierMap.ts`, `chainWalkCore.ts`, `canonicalTypes.ts`, `Geometry_0319.ts`, `frontierStage.ts`, `frontierFitter.ts`, `metricStage.ts`, `regionStage.ts`, `powerVoronoiTerritoryGeometryGenerator.ts`, `types.ts`

### `territory/runtime/` (7 files)
`TerritoryRuntimeCoordinator.ts`, `TerritoryRuntimeState.ts`, `TerritoryWorker.ts`, `TerritoryWorkerProtocol.ts`, `TerritoryCompatibilityMatrix.ts`, `TerritoryConfigNormalizer.ts`, `LayerCache.ts`

### `territory/layers/ownership/` (5 files)
`OwnershipLayerCoordinator.ts`, `OwnershipMode.ts`, `registry.ts`, modes: `StarOwnershipSnapshotMode.ts`, `VirtualStarOwnershipMode.ts`

### `territory/layers/geometry/` (15 files)
`GeometryLayerCoordinator.ts`, `GeometryMode.ts`, `compiler_UnifiedVectorGeometry.ts`, `registry.ts`, modes: `UnifiedVectorGeometryMode.ts`, `PowerVoronoiGeometryMode.ts`, `WeightedPowerVoronoiGeometryMode.ts`, `SeedGraphGeometryMode.ts`, `SeedGraphClusterSplitGeometryMode.ts`, `BoundaryAwareFrontierGeometryMode.ts`, `BoundaryConstrainedFrontierGeometryMode.ts`, `BoundaryAwareFrontierMode.ts`, `geometryModeUtils.ts`, planners: `FrontierTopologyBuilder.ts`, `GeometryFingerprint.ts`

### `territory/layers/transition/` (21 files) ← THE PROBLEM AREA
Root: `TransitionLayerCoordinator.ts`, `ActiveFrontTransition.ts`, `TopologyFrameSampler.ts`, `interpolatePolylines.ts`, `SharedTransitionClock.ts`, `FillTransitionMode.ts`, `BorderTransitionMode.ts`, `registry.ts`
Fill modes: `FrontierMorphFillMode.ts`, `FrontierTopologyMorphFillMode.ts`, `ActiveFrontFillMode.ts`, `CrossfadeFillMode.ts`, `AlphaCrossfadeFillMode.ts`
Border modes: `OptimalTransportBorderMode.ts`, `OptimalTransportCorrespondenceBorderMode.ts`, `RopeMorphBorderMode.ts`, `RopeInterpolatedBorderMode.ts`
Planners: `TerritoryTransitionPlanner.ts`, `FrontierTopologyPlanner.ts`, `GeometryTopologyDiff.ts`, `CorrespondencePlanner.ts`

### `territory/layers/presentation/` (12 files)
`PresentationLayerCoordinator.ts`, `TerritoryStyleMode.ts`, `registry.ts`, builders: `FillDrawCommandBuilder.ts`, `BorderDrawCommandBuilder.ts`, modes: `CanonicalVectorStyle.ts`, `CanonicalTerritoryStyle.ts`, `DistanceFieldStyle.ts`, `SignedDistanceFieldMeshStyle.ts`, `PixelTerritoryStyle.ts`, `PixelQuantizedMeshStyle.ts`, `VectorPolygonMeshStyle.ts`

### `territory/adapters/` (9 files)
`pixi/PixiFillPresenter.ts`, `pixi/PixiBorderPresenter.ts`, `pixi/PixiTerritoryPresenter.ts`, `pixi/PixiTerritoryDebugOverlay.ts`, `legacy/DistanceFieldLegacyAdapter.ts`, `legacy/PowerVoronoiAdapter.ts`, `legacy/PowerVoronoiLegacyAdapter.ts`, `legacy/PVV3LegacyAdapter.ts`, `legacy/SeedGraphAdapter.ts`

### `territory/integration/` (8 files)
`TerritorySettingsBridge.ts`, `TerritorySettingsBridge.test.ts`, `TerritoryArchitectureRouter.ts`, `TerritoryArchitectureRouter.test.ts`, `GameCanvasBridge.ts`, `GameCanvasTerritoryBridge.ts`, `TerritoryFxBridge.ts`, `TerritoryVFXBridge.ts`

### `territory/devtools/` (10 files)
`TransitionSnapshotRecorder.ts`, `TransitionBundleSerializer.ts`, `TransitionFrontierFrameRenderer.ts`, `TransitionGeometryRenderer.ts`, `TransitionDebugOverlay.ts`, `overlayConfig.ts`, `snapshotExport.ts`, `TerritoryTraceStore.ts`, `TerritoryStepRunner.ts`, `PolygonValidator.ts`

### `territory/transitions/` (15 files) — older transition implementations
`buildPatchMorphPlan.ts`, `buildSnapshotsFromTMAP.ts`, `buildTerritoryBoundarySnapshots.ts`, `classifyRingTransitionKind.ts`, `computeTerritoryDeltaContext.ts`, `createCanonicalTransitionPlan.ts`, `createTerritoryTransitionPlan.ts`, `diffFrontierMaps.ts`, `drawTerritoryFrame.ts`, `findRingSpliceWindow.ts`, `findRingSpliceWindowTopological.ts`, `OptimalTransportBorderTransition.ts`, `refineSpliceWindowGeometrically.ts`, `sampleTransitionFrame.ts`, `types.ts`

### `territory/render/` (5 files)
`TerritoryRenderer.ts`, `OwnerFillLayerRenderer.ts`, `BorderLayerRenderer.ts`, `buildFillMeshCache.ts`, `buildBorderMeshCache.ts`

### `territory/orchestrator/` (9 files)
`engine.ts`, `renderMode.ts`, `registry.ts`, `traceStore.ts`, `types.ts`, `index.ts`, methods: `fg2SeedGraph.ts`, `index.ts`

### `territory/engine/` (1 file)
`TerritoryEngineController.ts`

### `territory/geometry/` (2 files)
`geometryUtils.ts`, `morphUtils.ts`

### `territory/vfx/` (3 files)
`VFXBus.ts`, `VFXContracts.ts`, `handlers/ConquestParticles.ts`

### `territory/legacy/` (1 file)
`TerritoryLegacyBridge.ts`
