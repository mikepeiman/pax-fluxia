---
title: Handoff prompt — Metaball renderer + DX (disconnect) codebase map
date: 2026-04-09
purpose: Paste or attach for another agent; paths are repo-root relative.
---

## Task framing (one paragraph)

Work touches **CPU Metaball territory** (`pax-fluxia/src/lib/renderers/MetaballRenderer.ts`): influence grid, **CX** corridor samples, **DX** disconnect midpoint virtuals (`computeDisconnectVirtuals` → `buildDisconnectSamples`), and the split between **`infGeom`** (includes CX/DX for borders) vs **`infReal`** (stars only for fill gating). **DX** also appears as **polygon vertex warping** (`applyDisconnectBuffer`) in Voronoi/geometry pipelines and as **virtual Power sites** in PV/DF/compiler paths. **Config** for Metaball uses `METABALL_*`; panel/UI often maps **DX** through `MODIFIED_VORONOI_DISCONNECT_*` + `TERRITORY_DX_WEIGHT` (Metaball/bridge), while **DF** can use separate `DF_DISCONNECT_*`.

---

## File index (path — role — key imports / exports)

### Metaball core

- **`pax-fluxia/src/lib/renderers/MetaballRenderer.ts`** — Main renderer: grid samples, `buildCorridorSamples` / **`buildDisconnectSamples`** (DX → `InfluenceSample` with `disconnectVirtual`), `resolveMetaballCellWinner` geom vs real, borders/fill/Chaikin, fingerprint incl. `dx${...}`. **Imports:** `GAME_CONFIG`, `StarState`/`StarConnection`, `findConnectedClustersOptimized`, `ColorUtils` type, `chaikinSmoothPolyline`, **`computeDisconnectVirtuals`**, `buildCorridorVirtualSites`, `getLanePolyline`. **Exports:** `renderMetaball`, `renderMetaballScene`, `resetMetaballCache`, `MetaballRenderOptions`.

- **`pax-fluxia/src/lib/renderers/index.ts`** — Barrel: re-exports `renderMetaball`, `renderMetaballScene`, `resetMetaballCache`.

### RenderFamily + canvas wiring

- **`pax-fluxia/src/lib/territory/families/metaball/MetaballFamily.ts`** — `RenderFamily` adapter calling `renderMetaball` + `resetMetaballCache`; **`tunableKeys`** includes `MODIFIED_VORONOI_DISCONNECT_ENABLED`, `MODIFIED_VORONOI_DISCONNECT_DISTANCE`, `TERRITORY_DX_WEIGHT` and all `METABALL_*`. **Exports:** `MetaballFamily`, `createMetaballFamily`.

- **`pax-fluxia/src/lib/components/game/GameCanvas.svelte`** — Instantiates `MetaballFamily`, calls `renderMetaballScene`, `resetMetaballCache`; territory fingerprint string includes DX config keys.

- **`pax-fluxia/src/lib/territory/legacy/TerritoryLegacyBridge.ts`** — Legacy mode `metaball`: dynamic `import('$lib/renderers/MetaballRenderer')` → `renderMetaball`.

- **`pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`** — Catalog entry `id: 'metaball'` (labels / legacy dispatch flags).

### Virtual sites: CX + DX (shared logic)

- **`pax-fluxia/src/lib/renderers/territoryFeatures.ts`** — **Single source** for **`computeDisconnectVirtuals`** (midpoint pins, `ownerId` = nearest enemy at midpoint, `kind: 'disconnect'`) and **`computeCorridorVirtuals`** (delegates to `buildCorridorVirtualSites` + canonicalize). **Exports:** `VirtualSite`, **`DISCONNECT_OWNER_ID`** (`'__disconnect__'`), `computeCorridorVirtuals`, `computeDisconnectVirtuals`.

- **`pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts`** — **CX** polyline/chord sampling, cross-owner split at half arc-length. **Exports:** `buildCorridorVirtualSites`, `BuiltCorridorVirtualSite`.

- **`pax-fluxia/src/lib/lanes/lanePolylineCache.ts`** — Runtime edge → waypoints; **`getLanePolyline`** passed into corridor builder / `computeCorridorVirtuals` default. **Imports:** `attachLaneWaypointsToConnections`, `MapConnection` from **`@pax/common/mapgen`**. **Exports:** `getLanePolyline`, `rebuildLanePolylineCache`, `seedLanePolylineCacheFromMapGen`, `clearLanePolylineCache`, `edgeKey`, `canonicalUniConnections`.

- **`common/src/mapgen/lanePolylines.ts`** — **`attachLaneWaypointsToConnections`** (straight vs curve-if-needed); used when rebuilding lane cache. **Exports:** `attachLaneWaypointsToConnections`, `MapLaneMode`, types as re-exported from common mapgen.

### Metaball helpers

- **`pax-fluxia/src/lib/renderers/territoryUtils.ts`** — **`findConnectedClustersOptimized`** (cluster map for Metaball player indices; same-owner components when `TERRITORY_CLUSTER_SPLIT`). **Exports:** `ClusterInfo`, `findConnectedClustersOptimized`.

- **`pax-fluxia/src/lib/renderers/geometry/chaikin.ts`** — **`chaikinSmoothPolyline`** for border polylines.

- **`pax-fluxia/src/lib/renderers/RenderContext.ts`** — **`ColorUtils`** interface (player colors / HSL); **Metaball** takes `ColorUtils` instance.

- **`pax-fluxia/src/lib/types/game.types.ts`** — **`StarState`**, **`StarConnection`** (positions, owners, lanes).

### Config + UI (Metaball + DX toggles)

- **`pax-fluxia/src/lib/config/game.config.ts`** — Defaults/types: **`TERRITORY_METABALL`**, **`METABALL_*`**, **`MODIFIED_VORONOI_DISCONNECT_ENABLED`**, **`MODIFIED_VORONOI_DISCONNECT_DISTANCE`**, **`TERRITORY_DX_WEIGHT`**, **`DF_DISCONNECT_*`**, **`TERRITORY_CLUSTER_SPLIT`**, corridor keys used by Metaball fingerprint.

- **`pax-fluxia/src/lib/components/ui/settingsDefs.ts`** — Maps panel keys ↔ config keys for Metaball + **DX** (`disconnectEnabled`, `disconnectDistance`, `dxWeight`, …).

- **`pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`** — **DX Disconnect** checkbox + **DX Weight** / **DX Distance** sliders; copy references Metaball CX/DX behavior.

- **`pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`** — Bridges `GAME_CONFIG` → normalized **`disconnectEnabled`**, **`disconnectDistance`**, **`disconnectWeight`** for orchestrator/geometry.

- **`pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.ts`** — Clamps defaults for disconnect tunables.

- **`pax-fluxia/src/lib/territory/orchestrator/engine.ts`** — Passes **`disconnectEnabled`**, **`disconnectDistance`**, **`dxWeight`** into territory geometry input (when connections present).

- **`pax-fluxia/src/lib/territory/layers/geometry/modes/geometryModeUtils.ts`** — Forwards **`disconnectEnabled`**, **`disconnectDistance`**, **`dxWeight`** (as `disconnectWeight`) into compiler tunables.

### DX — polygon buffer (non-Metaball Voronoi-style)

- **`pax-fluxia/src/lib/renderers/ModifiedVoronoiRenderer.ts`** — **Local** **`applyDisconnectBuffer`** (two-phase push/pull vs merged polygons); called from MV render path. Not imported from geometry package.

- **`pax-fluxia/src/lib/renderers/geometry/geometryModifiers.ts`** — **`export function applyDisconnectBuffer`** — shared-style disconnect warp for geometry modifier pipeline (see `geometry/index.ts`).

- **`pax-fluxia/src/lib/renderers/geometry/index.ts`** — Re-exports **`applyDisconnectBuffer`** among modifiers.

- **`pax-fluxia/src/lib/territory/geometry/geometryUtils.ts`** — **Third** **`applyDisconnectBuffer`** implementation (territory geometry utilities — compare before editing; possible duplication).

- **`pax-fluxia/src/lib/renderers/geometry/borderPipeline.ts`** — Skips border pairing when side owner is **`__disconnect__`**.

### DX — virtual sites in other renderers / compilers (parity)

- **`pax-fluxia/src/lib/renderers/PVV3Renderer.ts`** — Injects **`computeDisconnectVirtuals`** into Power Voronoi site list when `MODIFIED_VORONOI_DISCONNECT_ENABLED`; maps **`DISCONNECT_OWNER_ID`** cells to nearest enemy fill.

- **`pax-fluxia/src/lib/renderers/PowerVoronoiRenderer_DY4.ts`** — Same pattern as PVV3 (DY4 variant).

- **`pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`** — **`computeDisconnectVirtuals`** when **`DF_DISCONNECT_ENABLED`**; texture/fingerprint handling; search file for `disconnectSites`, `DX_TELEMETRY_PANEL_KEYS`.

- **`pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`** — Compiler pipeline: **`computeDisconnectVirtuals`** + `DISCONNECT_OWNER_ID` sites when `config.disconnectEnabled`.

- **`pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`** — Alternate geometry path: disconnect virtuals + `DISCONNECT_OWNER_ID` handling.

### Product / constraint docs (context only)

- **`.agent/docs/project/MAP_GRAPH_LANE_AND_UI_CONSTRAINTS_CATALOG.md`** — G/L/C/D constraints including future **neutral DX** intent.

- **`.agent/docs/project/implementation-plans/2026-04-10/MAP_LANES_MSR_BUFFER_AND_CROSS_PLAYER_CX.md`** — CX module + lane clearance plan (related to `getLanePolyline` / corridor).

---

## Minimal dependency sketch (Metaball + DX virtuals)

`GAME_CONFIG` → `MetaballRenderer` / `MetaballFamily` → `findConnectedClustersOptimized` + `buildCorridorVirtualSites(..., getLanePolyline)` + **`computeDisconnectVirtuals`** → `buildDisconnectSamples` → grid `infGeom` / `infReal` → PIXI `Graphics` + optional blur layer.

---

## Out of scope for path list but relevant

- **`pax-fluxia/src/lib/stores/gameStore.svelte.ts`** (and server mapgen) — seeds **`lanePolylineCache`** from mapgen; changing lanes invalidates Metaball CX sampling.
- **`pax-fluxia/src/lib/territory/runtime/TerritoryWorker.ts`** — forwards disconnect fields into worker tunables.
