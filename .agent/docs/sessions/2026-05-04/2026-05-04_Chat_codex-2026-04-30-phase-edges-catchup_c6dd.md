# Chat Log - 2026-05-04

## User

Fix this please, and determine the cause - I've seen it happen in more than one worktree:

Machine logs/diagnostics summarized:
- Browser runtime error from `GeometryLayerCoordinator.ts:13`:
  - `Unknown geometry mode: canonical_power_voronoi`
- Error path:
  - `GeometryLayerCoordinator.compute`
  - `TerritoryWorker.computeGeometrySync`
  - `TerritoryRuntimeCoordinator.update`
  - `GameCanvasTerritoryBridge.update`
  - `GameCanvas.svelte`
- Additional route diagnostic surfaced:
  - `homeRouteDiagnostics.ts:156 [HomeRouteError] unhandledrejection Unknown geometry mode: canonical_power_voronoi`

## Assistant

- Traced the geometry-mode contract from UI/settings through `GameCanvas` into the territory worker runtime.
- Determined the failure class was cross-worktree contract drift:
  - runtime supports only `unified_vector`
  - legacy UI and legacy canonical bridge path still emitted `canonical_power_voronoi`
  - same seam also emitted retired fill-transition id `pv_frontline`
- Implemented runtime normalization, bridge repair, and UI cleanup.
- Revalidated with targeted tests and a production build.

