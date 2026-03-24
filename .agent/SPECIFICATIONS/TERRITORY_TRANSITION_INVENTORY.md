# Territory Transition Implementation Inventory

**Generated:** 2026-03-24 via AST analysis  
**Root:** `pax-fluxia/src/lib/territory/`

---

## 1. Transition Planning Entry Points

### Primary Orchestration

| File | Symbol | Signature |
|------|--------|-----------|
| `transitions/createCanonicalTransitionPlan.ts` | `createCanonicalTransitionPlan` | `(prevData: TerritoryGeometryData, nextData: TerritoryGeometryData, conquestStar: Vec2, durationMs: number): TerritoryTransitionPlanSet` |
| `transitions/sampleTransitionFrame.ts` | `sampleTransitionFrame` | `(planSet: TerritoryTransitionPlanSet, progress: number): TerritoryFrameGeometry` |
| `transitions/drawTerritoryFrame.ts` | `drawTerritoryFrame` | `(graphics: PIXI.Graphics, frameGeom: TerritoryFrameGeometry, styles: Map<string, TerritoryDrawStyle>): void` |
| `engine/TerritoryEngineController.ts` | `TerritoryEngineController` | Class: `update(input: ControllerInput)`, `getState()`, `_recompile()` |

### Transition Pipeline Sub-Functions

| File | Symbol | Role |
|------|--------|------|
| `transitions/computeTerritoryDeltaContext.ts` | `computeTerritoryDeltaContext` | Identifies `changedSiteIds` and `affectedTerritoryIds` from prev/next geometry |
| `transitions/buildTerritoryBoundarySnapshots.ts` | `buildTerritoryBoundarySnapshots` | Builds `TerritoryBoundarySnapshot[]` from `TerritoryGeometryData` (span-annotated rings) |
| `transitions/buildSnapshotsFromTMAP.ts` | `buildSnapshotsFromTMAP` | Builds snapshots from `TerritoryFrontierMap` (canonical loop route) |
| `transitions/findRingSpliceWindow.ts` | `findRingSpliceWindow` | Combined topological+geometric splice: rotation, prefix/suffix matching, changed window |
| `transitions/findRingSpliceWindowTopological.ts` | `findRingSpliceWindowTopological` | Pass 1 only: span-based rotation alignment and candidate window |
| `transitions/refineSpliceWindowGeometrically.ts` | (not outlined — Pass 2) | Geometric refinement within candidate window |
| `transitions/classifyRingTransitionKind.ts` | `classifyRingTransitionKind` | Classifies each ring → `'unchanged' | 'splice-replace' | 'splice-insert' | 'splice-delete' | 'fallback-snap'` |
| `transitions/buildPatchMorphPlan.ts` | `buildPatchMorphPlan` | Builds `PatchMorphPlan` for the changed arc between two anchor points |
| `transitions/diffFrontierMaps.ts` | `diffFrontierMaps` | Compares two `TerritoryFrontierMap`s → `FrontierMapDiff` (added/removed/changed/unchanged pair entries) |

### Legacy Transition (PVV2 Renderer-Internal)

| File | Symbol | Role |
|------|--------|------|
| `transitions/OptimalTransportBorderTransition.ts` | `OptimalTransportBorderTransition` | Class: `interpolate(prevRegions, nextRegions, progress)` — polygon resample+align+lerp |
| `renderers/PowerVoronoiRenderer.ts` | `renderInterpolatedBorders` | Internal: lerps `prevSharedPolylines → targetSharedPolylines` at progress t |
| `renderers/PowerVoronoiRenderer.ts` | `buildLerpedPolylines` | Internal: CDF-based OT interpolation of polyline arrays |

### Call Flow

```
TerritoryEngineController.update()
  → _recompile()
    → [GeometryMode].compute() → GeometrySnapshot
    → createCanonicalTransitionPlan(prev, next, conquestStar, durationMs)
       → computeTerritoryDeltaContext()
       → buildTerritoryBoundarySnapshots() or buildSnapshotsFromTMAP()
       → findRingSpliceWindow() per ring
       → classifyRingTransitionKind() per ring
       → buildPatchMorphPlan() for changed arcs
       → TerritoryTransitionPlanSet

each frame:
  → sampleTransitionFrame(planSet, progress)
    → sampleRingFrame() per ring (static segments + patch lerp)
    → TerritoryFrameGeometry
  → drawTerritoryFrame(graphics, frameGeom, styles)
```

---

## 2. Ownership Pipeline

> **Note:** There is NO render-texture (RT) ownership pipeline. Ownership is computed entirely on the CPU from star state.

| File | Symbol | Signature |
|------|--------|-----------|
| `contracts/OwnershipContracts.ts` | `TerritoryConquestEvent` | `{ starId, previousOwner, newOwner, atMs }` |
| `contracts/OwnershipContracts.ts` | `VirtualStar` | `{ id, starId, ownerId, pos: {x,y}, weight, conquestEventAtMs }` |
| `contracts/OwnershipContracts.ts` | `OwnershipSnapshot` | `{ version, starOwners: Map<string,string>, contestedLaneIds, conquestEvents, virtualStars }` |
| `contracts/OwnershipContracts.ts` | `OwnershipMode` | Interface: `compute(input: OwnershipLayerInput): OwnershipSnapshot` |
| `layers/ownership/modes/StarOwnershipSnapshotMode.ts` | `StarOwnershipSnapshotMode` | Class: `compute()`, `hashStarOwners()`, `computeConquestEvents()`, `computeVirtualStars()` |
| `layers/ownership/modes/VirtualStarOwnershipMode.ts` | (empty file) | Placeholder — not implemented |

**Owner encoding:** `string` owner IDs (player IDs). No texture/channel encoding.  
**Prev/curr support:** `OwnershipSnapshot.version` hash changes trigger recompilation; `previousSnapshot` passed to `compute()` for diff.  
**Virtual stars:** Created at conquest star position with `weight` and `ownerId` of previous owner (ghost influence during transition).

---

## 3. Geometry Morph Utils

**File:** `geometry/morphUtils.ts`

| Export | Signature | Assumptions |
|--------|-----------|-------------|
| `resamplePolygon` | `(polygon: [number,number][], targetCount: number): [number,number][]` | Arc-length-based equal-spacing resampling. Closed polygon. |
| `resamplePolyline` | `(polyline: [number,number][], targetCount: number): [number,number][]` | Same but open polyline. |
| `lerpPolygon` | `(a: [number,number][], b: [number,number][], t: number): [number,number][]` | Per-vertex linear interpolation. Requires `a.length === b.length`. |
| `alignPolygon` | `(source: [number,number][], target: [number,number][]): [number,number][]` | Rotates `source` to minimize total squared displacement to `target`. Returns rotated source. |
| `polygonCentroid` | `(pts: [number,number][]): [number,number]` | Arithmetic mean centroid. |

**Also in `transitions/buildPatchMorphPlan.ts`:**

| Export | Signature |
|--------|-----------|
| `resamplePolylineByArcLength` | `(pts: Vec2[], count: number): Vec2[]` — arc-length resampling for open polylines |
| `buildPatchMorphPlan` | `(ringId, prevRing, nextRing, prevRange, nextRange, conquestStar): PatchMorphPlan` |

---

## 4. Full Type Definitions

### Geometry Output Types

**File:** `compiler/powerVoronoiTerritoryGeometryGenerator.ts` (L39-104)

```typescript
interface PowerSite { x, y, weight, ownerId, starId, virtual?: 'corridor'|'disconnect' }
interface TerritoryCell { points: [number,number][], ownerId, siteId }
interface MergedTerritory { points: [number,number][], ownerId, color: number, starIds: string[] }
interface SharedBorderEdge { x1,y1,x2,y2, ownerA, ownerB, colorA, colorB, siteIdA, siteIdB }
interface SharedPolyline { points: [number,number][], ownerPairKey, color: number }

interface TerritoryGeometryData {
    cells: TerritoryCell[];
    mergedTerritories: MergedTerritory[];
    sharedEdges: SharedBorderEdge[];
    rawSharedPolylines: SharedPolyline[];  // before smoothing
    sharedPolylines: SharedPolyline[];     // after Chaikin smoothing
    worldBorderPolylines: SharedPolyline[];
    enclaveMap: Map<number, [number,number][][]>;
    fingerprint: string;
    frontierMap?: TerritoryFrontierMap;
}

interface FrontierLoop { points: [number,number][], ownerId }
```

### Canonical Types (Frontier Map)

**File:** `compiler/canonicalTypes.ts`

```typescript
type CanonicalVertexKind = 'junction' | 'world-corner' | 'world-edge' | 'interior';

interface CanonicalVertex {
    ptKey: string;
    x: number; y: number;
    kind: CanonicalVertexKind;
    adjacentOwnerIds: string[];
    worldEdge?: 'top'|'bottom'|'left'|'right';
    // computed fields
    degree?: number;
    isTerminal?: boolean;
}

interface CanonicalEdge {
    edgeId: string;
    fromPtKey: string;
    toPtKey: string;
    ownerLeft: string;
    ownerRight: string;
    ownerPairKey: string;
    polylineIndex: number;
    segmentIndex: number;
    isWorldBoundary: boolean;
    // computed
    dx?: number; dy?: number;
    length?: number;
}

interface CanonicalLoop {
    loopId: string;
    ownerId: string;
    edgeIds: string[];
    closed: boolean;
    validity: CanonicalLoopValidity;
    vertexCount: number;
    perimeter?: number;
    // assembled points
    points?: [number,number][];
}

type CanonicalLoopValidity = 'valid' | 'open' | 'degenerate' | 'unknown';

interface TerritoryFrontierMap {
    vertices: Map<string, CanonicalVertex>;
    edges: CanonicalEdge[];
    loops: CanonicalLoop[];
    ownerPairKeys: Set<string>;
}
```

### Geometry Contracts (Clean Architecture Layer)

**File:** `contracts/GeometryContracts.ts`

```typescript
interface TerritoryRegionShape { ownerId: string, points: [number,number][] }
interface FrontierPolylineShape { ownerPairKey: string, points: [number,number][] }
type SharedFrontierMap = ReadonlyMap<string, FrontierPolylineShape>;

interface GeometrySnapshot {
    version: string;
    sourceMode: GeometryModeId;
    sourceStyle: TerritoryStyleModeId;
    ownershipVersion: string;
    territoryRegions: readonly TerritoryRegionShape[];
    frontierPolylines: readonly FrontierPolylineShape[];
    worldBorderPolylines: readonly FrontierPolylineShape[];
    sharedFrontierMap: SharedFrontierMap;
    legacyGeometryBridge?: unknown;   // @deprecated bridge to TerritoryGeometryData
}

interface GeometryLayerInput {
    nowMs, stars: StarState[], lanes: StarConnection[],
    world: TerritoryWorldBounds, tunables: TerritoryTunables,
    ownership: OwnershipSnapshot, styleMode, previousSnapshot?
}
```

### Transition Contracts

**File:** `contracts/TransitionContracts.ts`

```typescript
interface TransitionEnvelope { transitionId, startedAtMs, durationMs, progress, conquestEvents }
interface VirtualStarTransitionState { virtualStarId, startedAtMs, durationMs, progress, computedWeight }
interface FillTransitionFrame { regions: { ownerId, points }[] }
interface BorderTransitionFrame { frontiers: { ownerPairKey, points }[] }
interface TransitionSnapshot { geometryVersion, envelope, fillFrame, borderFrame }
interface TransitionSampleContext { nowMs, progress }
interface FillTransitionPlan { planId, sourceMode, startGeometryVersion, endGeometryVersion, conquestEvents }
interface BorderTransitionPlan { planId, sourceMode, startGeometryVersion, endGeometryVersion, conquestEvents }
interface FillTransitionMode { id, label, plan(input): FillTransitionPlan, sample(plan, ctx): FillTransitionFrame }
interface BorderTransitionMode { id, label, plan(input): BorderTransitionPlan, sample(plan, ctx): BorderTransitionFrame }
```

### Localized Boundary Transition Types

**File:** `transitions/types.ts` (171 lines — full 2-pass splice model)

```typescript
interface Vec2 { x, y }
interface BoundarySpan { spanId, startSample, endSample, leftOwnerId, rightOwnerId, sharedKey? }
interface BoundaryRingSnapshot { ringId, kind: 'outer'|'hole', points: Vec2[], cumulativeLengths, spans }
interface TerritoryBoundarySnapshot { territoryId, ownerId, starIds, rings, fingerprint }
interface TerritoryDeltaContext { changedSiteIds: Set<string>, affectedTerritoryIds: Set<string> }

// Pass 1 (topological)
interface TopologicalSpliceResult { rotation, prefixLen, suffixLen, candidateChangedPrevSpanRange, candidateChangedNextSpanRange, allSpansMatch }

// Pass 2 (geometric)
interface GeometricRefinementResult { prevChangedRange, nextChangedRange, staticPrefixEnd, staticSuffixStart, geomEqualOutsidePatch }

type RingTransitionKind = 'unchanged' | 'splice-replace' | 'splice-insert' | 'splice-delete' | 'fallback-snap';

interface PatchMorphPlan { ringId, anchorA, anchorB, fromSamples: Vec2[], toSamples: Vec2[], localOrigin? }
interface AnimatedRingPlan { ringId, kind, staticSegmentsPrev, patchMorph, targetRing, prevRingPoints, diagnostics }
interface TerritoryBoundaryTransitionPlan { territoryId, ownerId, durationMs, rings: AnimatedRingPlan[] }
interface TerritoryTransitionPlanSet { plansByTerritoryId: Map<string, TerritoryBoundaryTransitionPlan> }
interface TerritoryFrameRing { ringId, points: Vec2[] }
interface TerritoryFrameGeometry { byTerritoryId: Map<string, TerritoryFrameRing[]> }
```

### Presentation Contracts

**File:** `contracts/PresentationContracts.ts`

```typescript
interface FillDrawCommand { ownerId, points, alpha, color? }
interface BorderDrawCommand { ownerPairKey, points, width, alpha, color? }
interface TerritoryDebugCommand { label, points? }
interface TerritoryPresentationFrame { fills, borders, debug }
interface PresentationLayerInput { nowMs, ownership, geometry, transition }
interface TerritoryStyleMode { id, label, buildFrame(input): TerritoryPresentationFrame }
```

---

## 5. Border/Fill Cache & Renderer Inputs

### PVV2RendererState (Cache)

**File:** `renderers/PowerVoronoiRenderer.ts` (L69-132)

| Group | Fields |
|-------|--------|
| Shape cache | `cachedShapeFingerprint`, `cachedVisualFingerprint`, `fillGraphics`, `borderGraphics` |
| Border transition (segment) | `prevBorderEdges`, `targetBorderEdges`, `borderTransitionStart`, `isBorderTransitioning` |
| Border transition (smooth) | `prevSharedPolylines`, `targetSharedPolylines`, `targetRawSharedPolylines`, `smoothTransitionStart`, `isSmoothTransitioning` |
| Fill transition | `prevMergedTerritories`, `prevEnclaveMap`, `fillTransitionStart`, `isFillTransitioning`, `lastMergedTerritories` |
| Active morphers | `activeBorderTransitionHandler`, `activeRopeRenderer`, `activeShapeTransitionHandler` |
| Cell tracking | `lastCells`, `changedSiteIds`, `changedSitePrevOwners` |
| Localized boundary | `prevGeometryData`, `lastGeometryData`, `activeTransitionPlan`, `transitionStartTime`, `transitionDurationMs` |
| Weight lerp (DY4) | `weightLerp*` (12 fields: `Active`, `StartTime`, `DurationMs`, `Stars`, `Connections`, `Config`, `ConqueredStarIds`, `PrevWeights`, `TargetWeights`, `GhostSites`, `GhostWeightStart`, `GhostTargetPos`) |
| Dying islands | `dyingIslands[]` |

### Renderer Entry Point

| File | Symbol | Signature |
|------|--------|-----------|
| `renderers/PowerVoronoiRenderer.ts` | `renderPowerVoronoi` | `(app, stars, connections, config, state?: PVV2RendererState): void` (1050 lines) |
| `renderers/PowerVoronoiRenderer.ts` | `createPVV2State` | `(): PVV2RendererState` |
| `renderers/PowerVoronoiRenderer.ts` | `resetPowerVoronoiCache` | `(state: PVV2RendererState): void` |

### Renderer Inputs

`renderPowerVoronoi` receives:
- `app: PIXI.Application` — for drawing
- `stars: StarState[]` — positions, owners, orbit radii
- `connections: StarConnection[]` — lane topology
- `config: TerritoryGeneratorSettings` — all tuning params
- `state: PVV2RendererState` — mutable cache

Internally calls `generateVoronoiTerritoryGeometry(sites, config)` → `TerritoryGeometryData`, then draws fills/borders/transitions.

---

## 6. Star/Lane/World-Bounds Data Access

| Data | Source Type | Access Path |
|------|------------|-------------|
| Star positions | `StarState` | `stars[i].x`, `stars[i].y` |
| Star ownership | `StarState` | `stars[i].ownerId` |
| Star orbit radius | `StarState` | `stars[i].orbitRadius` |
| Lane topology | `StarConnection` | `{ sourceId, targetId }` |
| World bounds | `TerritoryWorldBounds` | `{ width, height }` via `TerritoryFrameInput.world` |
| World bounds (generator) | `TerritoryGeneratorSettings` | `worldWidth`, `worldHeight` |
| Star margin | `TerritoryTunables` | `starMargin` — minimum star boundary distance |

**Key input types from `$lib/types/game.types`:**

| Type | Key Fields |
|------|------------|
| `StarState` | `id, x, y, ownerId, name, orbitRadius, resources, population` |
| `StarConnection` | `sourceId, targetId` (+ optional visual/gameplay fields) |

---

## 7. Identity Helpers

### ptKey / edgeKey (canonical rounding)

**File:** `compiler/powerVoronoiTerritoryGeometryGenerator.ts` (L132-141)

```typescript
function edgeKey(x1, y1, x2, y2): string
  // Rounds to 2 decimals, canonical ordering (lower coord first)
  // Format: "ax,ay-bx,by"

function ptKey(x, y): string
  // Format: "x.xx,y.yy" (2 decimal places)
```

**Also duplicated in:** `renderers/PowerVoronoiRenderer.ts` (L288-297) — identical logic.

### ownerPairKey

**Convention:** `ownerA|ownerB` with alphabetical ordering. Used by `SharedPolyline.ownerPairKey`, `FrontierPolylineShape.ownerPairKey`, `CanonicalEdge.ownerPairKey`.

Built in multiple files:
- `transitions/createCanonicalTransitionPlan.ts` → `extractOwnerPairKey()`
- `transitions/diffFrontierMaps.ts` → `extractOwnerPairKey()`
- `transitions/buildTerritoryBoundarySnapshots.ts` → `parseOwnerPairKey()`
- `compiler/buildFrontierMap.ts` → `resolveOwnerSides()` + `edgeIdFromSegment()`

### Chaining Helpers

| File | Symbol | Role |
|------|--------|------|
| `compiler/powerVoronoiTerritoryGeometryGenerator.ts` | `chainSharedEdgesIntoPolylines` | Chains `SharedBorderEdge[]` into continuous `SharedPolyline[]` via ptKey matching |
| `compiler/powerVoronoiTerritoryGeometryGenerator.ts` | `extractJunctionVertices` | Returns `Set<string>` of ptKeys where 3+ owners meet |
| `compiler/powerVoronoiTerritoryGeometryGenerator.ts` | `constructFillsFromFrontierChain` | Chains frontier polylines at junctions into closed fill polygons |
| `compiler/chainWalkCore.ts` | `executeChainWalk` | Junction-aware polyline chaining → `ChainWalkResult { loops, junctionMap }` |
| `compiler/chainWalkCore.ts` | `flattenLoopPoints` | Flattens `ChainWalkLoop` segments into point array |

### Epsilon / Snapping

- `ptKey` uses `toFixed(2)` — effective epsilon of 0.005 world units.
- `transitions/buildTerritoryBoundarySnapshots.ts` → `ptKeySnap(x,y)` — same `toFixed(2)` rounding.
- `TerritoryTunables.boundaryEps` — boundary proximity threshold (default 6px).

---

## 8. Debug Overlays

### DevTools

| File | Symbol | Role |
|------|--------|------|
| `devtools/TerritoryTraceStore.ts` | `canonicalTraceStore` | Svelte store. Records `CanonicalTraceEntry { tick, timestamp, ownership, geometry, frontierMap, transitionPlan, diagnostics, label }` |
| `devtools/TerritoryStepRunner.ts` | `TerritoryStepRunner` | Class: `initRun()`, `advanceStage()`, `metric()`, `frontier()`, `regions()`. Stages: `'metric' | 'frontier' | 'region' | 'done'` |

### Diagnostics Contracts

**File:** `contracts/DiagnosticsContracts.ts`

```typescript
interface TerritoryDiagnosticMessage { level: 'info'|'warn'|'error', message, source }
interface TerritoryRuntimeDiagnostics { startedAtMs, finishedAtMs, messages }
```

### Presentation Debug

- `TerritoryDebugCommand { label, points? }` in `PresentationContracts.ts` — drawn by presentation layer
- `ControlsSection-Debug.svelte` — UI panel for debug settings

### Per-Ring Diagnostics

Every `AnimatedRingPlan` contains `diagnostics: RingPlanDiagnostics`:
```typescript
{ kind, rotation, matchedSpansPrefix, matchedSpansSuffix,
  prevChangedSamples, nextChangedSamples, staticSamples,
  anchorsPrev, anchorsNext, geomEqualOutsidePatch, valid, reason? }
```

---

## 9. Conquest Trace Data

### Trace Mechanism

`canonicalTraceStore.record(entry)` captures per-tick:
```typescript
interface CanonicalTraceEntry {
    tick: number;
    timestamp: number;
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    frontierMap?: TerritoryFrontierMap;
    transitionPlan?: TerritoryTransitionPlanSet;
    diagnostics?: TerritoryRuntimeDiagnostics;
    label?: string;
}
```

### Before/After Data Available

| Data | Before Conquest | After Conquest |
|------|----------------|----------------|
| Star ownership | `prevSnapshot.starOwners` | `nextSnapshot.starOwners` |
| Conquest events | — | `OwnershipSnapshot.conquestEvents[]` |
| Virtual stars | — | `OwnershipSnapshot.virtualStars[]` |
| Geometry | `prevGeometryData` / `previousSnapshot` | `nextGeometryData` / `nextGeometry` |
| Frontier map | `prevData.frontierMap` | `nextData.frontierMap` |
| Transition plan | — | `TerritoryTransitionPlanSet` |
| Ring diagnostics | — | `AnimatedRingPlan.diagnostics` per ring |
| Frontier diff | — | `diffFrontierMaps(prev, next)` → `FrontierMapDiff` |

### One-Shot Dump

**File:** `compiler/Geometry_0319.ts` → `computeGeometry0319` logs geometry data to console when `GEOMETRY_DUMP` config flag is enabled.

**No screenshot capture exists in code.** Visual verification is manual (run game, trigger conquest, observe).

---

## 10. Compiler Pipeline (Geometry Generation)

### PowerVoronoi Generator

**File:** `compiler/powerVoronoiTerritoryGeometryGenerator.ts` (1014 lines)

```
generateVoronoiTerritoryGeometry(sites: PowerSite[], config: TerritoryGeneratorSettings)
  → computePowerDiagram() → TerritoryCell[]
  → mergeSameOwnerCells() → MergedTerritory[]
  → extractSharedEdges() → SharedBorderEdge[]
  → chainSharedEdgesIntoPolylines() → SharedPolyline[] (raw)
  → chaikinSmoothPolyline() per polyline → SharedPolyline[] (smoothed)
  → extractWorldBorderPolylines() → SharedPolyline[]
  → detectEnclaves() → enclaveMap
  → constructFillsFromFrontierChain() → FrontierLoop[] (fills from borders)
  → buildFrontierMap() → TerritoryFrontierMap (canonical identity)
  → buildTerritoryGeometryFingerprint()
  → TerritoryGeometryData
```

### Clean-Architecture Compiler Stages

| File | Function | Input → Output |
|------|----------|----------------|
| `compiler/metricStage.ts` | `executeMetricStage` | Stars + lanes → Dijkstra distances, owner assignments |
| `compiler/frontierStage.ts` | `executeFrontierStage` | Metric output → Lane split points, frontier nodes |
| `compiler/regionStage.ts` | `executeRegionStage` | Frontier output → Territory regions, convex hulls |
| `compiler/buildFrontierMap.ts` | `buildFrontierMap` | SharedPolylines + worldBorders + chainWalk → `TerritoryFrontierMap` |
| `compiler/Geometry_0319.ts` | `computeGeometry0319` | Stars + config → full `TerritoryGeometryData` (alternate pipeline) |
