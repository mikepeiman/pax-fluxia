<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Ok, go ahead

Yes. I think the next step is to introduce two explicit contracts: one for **ownership-field computation** and one for **canonical geometry output**, with raster-derived geometry normalized into the same geometry shape used by vector modes wherever practical.[^1][^2][^3]

## Contract direction

Your current `GeometrySnapshot` is a good starting point, but it is too thin to support both canonical vector output and raster-derived geometry with provenance, confidence, and sampling metadata. Your `CanonicalTerritoryData` is also useful because it already centers shells and loops as the common representation consumed by styles and transitions.[^2][^3]

So I would do this:

1. Introduce `OwnershipFieldSnapshot`.
2. Replace or extend `GeometrySnapshot` into a richer `CanonicalGeometrySnapshot`.
3. Make both vector and raster geometry producers emit that richer geometry contract.
4. Keep provenance explicit so raster-derived geometry is compatible, but never misrepresented as identical to vector-native topology.[^4][^3][^2]

## Ownership contract

This should represent sampled space ownership, independent of how it will later be rendered or contoured. That matches what Pixel, Graph, Lane, and DistanceField are already computing in different forms.[^5][^6][^7][^4]

A good contract would look like this:

```ts
export type OwnershipFieldFamily = 'raster';
export type OwnershipFieldStrategy =
  | 'distance'
  | 'graph'
  | 'lane'
  | 'contour'
  | 'sdf';

export interface OwnershipFieldBounds {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface OwnershipFieldSampleGrid {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

export interface OwnershipFieldSnapshot {
  version: string;
  family: OwnershipFieldFamily;
  strategy: OwnershipFieldStrategy;
  ownershipVersion: string;

  bounds: OwnershipFieldBounds;
  grid: OwnershipFieldSampleGrid;

  ownerIds: readonly string[];
  ownerIndexById: ReadonlyMap<string, number>;

  // Required core field
  ownerIndexGrid: Int16Array | Uint16Array;

  // Optional richer sampled data
  confidenceGrid?: Float32Array;
  nearestBoundaryDistance?: Float32Array;
  secondBestDelta?: Float32Array;

  // Optional semantic extras
  barrierSegments?: readonly [number, number, number, number][];
  laneSegments?: readonly [number, number, number, number, number][];
  virtualSiteCount?: number;

  diagnostics?: {
    topologyFingerprint?: string;
    geometryFingerprint?: string;
    visualFingerprint?: string;
    sampleResolution?: number;
    notes?: readonly string[];
  };
}
```

Why this shape:

- `ownerIndexGrid` is the true common denominator across raster modes.[^4][^5]
- `nearestBoundaryDistance` fits DistanceField cleanly.[^4]
- `barrierSegments` and `laneSegments` preserve Graph/Lane semantics rather than losing them in the refactor.[^6][^7]
- `ownershipVersion` aligns it with the existing ownership/geometry separation.[^3]

Common-sense explanation: this contract says, “for every sample on the map, who owns it, and what extra field info did we compute while deciding that?”

## Geometry contract

Now the geometry side should consume either:

- vector-native geometric compute, or
- an `OwnershipFieldSnapshot` plus an extraction method.

The output should be one unified geometry shape. I would replace today’s thin `GeometrySnapshot` with something like this:

```ts
export type GeometryFamily = 'vector-native' | 'raster-derived';
export type GeometrySourceMethod =
  | 'power_voronoi'
  | 'fg2_enriched'
  | 'raster_distance'
  | 'raster_graph'
  | 'raster_lane'
  | 'raster_contour'
  | 'raster_sdf';

export interface CanonicalFrontierPolyline {
  frontierId: string;
  ownerA: string;
  ownerB: string; // use '__world__' for world boundary
  ownerPairKey: string;
  points: [number, number][];
  closed?: boolean;
  confidence: number;
}

export interface CanonicalShell {
  shellId: string;
  ownerId: string;
  points: [number, number][];
  area: number;
  absArea: number;
  confidence: number;
  holeLoopIds: string[];
}

export interface CanonicalShellLoop {
  shellLoopId: string;
  shellId?: string;
  ownerId: string;
  points: [number, number][];
  classification: 'outer' | 'hole' | 'border' | 'unknown';
  confidence: number;
}

export interface CanonicalGeometrySnapshot {
  version: string;
  geometryFamily: GeometryFamily;
  sourceMethod: GeometrySourceMethod;
  ownershipVersion: string;

  territoryRegions: readonly {
    regionId: string;
    ownerId: string;
    points: [number, number][];
    confidence: number;
  }[];

  frontierPolylines: readonly CanonicalFrontierPolyline[];
  worldBorderPolylines: readonly CanonicalFrontierPolyline[];

  sharedFrontierMap: ReadonlyMap<string, CanonicalFrontierPolyline[]>;

  shells: readonly CanonicalShell[];
  shellLoops: readonly CanonicalShellLoop[];

  provenance: {
    derivedFromField: boolean;
    sourceFieldStrategy?: OwnershipFieldStrategy;
    sampleGrid?: OwnershipFieldSampleGrid;
    simplifyTolerance?: number;
    smoothPasses?: number;
  };

  diagnostics?: {
    topologyReliable: boolean;
    identityReliable: boolean;
    closureReliable: boolean;
    notes?: readonly string[];
  };

  legacyGeometryBridge?: unknown;
}
```

This deliberately combines the useful parts of the existing `GeometrySnapshot` contract with the `CanonicalTerritoryData` shell/loop model.[^2][^3]

## Why this works

This lets vector and raster-derived geometry meet at the same abstraction level:

- both can provide `territoryRegions`,
- both can provide `frontierPolylines`,
- both can provide `worldBorderPolylines`,
- both can provide `shells` and `shellLoops`.[^1][^3][^2]

But raster-derived output also carries provenance showing it came from sampled ownership and may be less trustworthy for exact identity/topology work.[^1][^4]

Common-sense explanation: the shape of the answer is the same, but the contract openly says whether that answer came from exact vector construction or traced-from-grid approximation.

## Extraction contract

You also need one explicit contract for “emit derived contours in addition to textures.” That is just a geometry extraction service from ownership fields, which Contour already implies by extracting marching-squares polygons from sampled ownership boundaries.[^1]

I would define:

```ts
export type RasterGeometryExtractionMethod =
  | 'marching_squares'
  | 'centerline_frontier'
  | 'owner_boundary_trace'
  | 'none';

export interface RasterGeometryExtractionInput {
  field: OwnershipFieldSnapshot;
  method: RasterGeometryExtractionMethod;
  simplifyTolerance?: number;
  smoothPasses?: number;
  junctionCorrection?: number;
}

export interface RasterGeometryExtractor {
  extract(input: RasterGeometryExtractionInput): CanonicalGeometrySnapshot;
}
```

That gives you a clean separation:

- `computeRasterOwnership(strategy)` → field
- `extractGeometryFromOwnershipField(method)` → canonical geometry
- `style.draw(...)` → appearance
- transitions act on canonical geometry or on fields, depending on chosen transition family.[^2][^1]


## Mapping existing raster modes

Here is how the current raster modes map into the new architecture.


| Current mode | Ownership contract | Geometry extraction | Style output |
| :-- | :-- | :-- | :-- |
| Pixel | Yes, distance-like sampled ownership.[^5] | Optional, currently absent.[^5] | Texture/sprite style.[^5] |
| Graph | Yes, barrier-aware ownership field.[^6] | Optional, currently absent.[^6] | Texture/sprite style.[^6] |
| Lane | Yes, lane-influence ownership field.[^7] | Optional, currently absent.[^7] | Texture/sprite style.[^7] |
| Contour | Yes, sampled ownership grid implicit in worker input/output.[^1] | Yes, marching-squares polygons.[^1] | Vector contour style.[^1] |
| DistanceField | Yes, ownership RT + nearest-boundary field.[^4] | Yes, at least for border polylines / canonical frontier extraction paths.[^4] | Shader-based fill/border style + temporal blend.[^4] |

So you can preserve all of them, but express them in one clean pipeline family.

## Transition compatibility

Your architecture says styles render data, while fill and border transitions transform data. That means raster transitions should also stop living inside renderers.[^2]

I would therefore treat raster transition support in two tiers:

- **Field-level transitions:** e.g. DistanceField temporal blend between previous and current ownership textures.[^4]
- **Geometry-level transitions:** once contours or frontiers are extracted, use the same border/fill transition interfaces as vector modes, as long as diagnostics say topology is reliable enough.[^2]

Practical rule:

- If `diagnostics.topologyReliable === true`, geometry transitions may operate directly on raster-derived geometry.
- If false, fall back to field-level crossfade / temporal blend / shader transition.

That gives you interchangeability without overpromising identical behavior.

## Recommended compatibility rules

To make raster-derived geometry “maximally compatible” with vector geometry, I would adopt these rules:

- Same owner id semantics everywhere.
- Same world-boundary convention everywhere, e.g. owner B = `__world__`.
- Same shell / loop / frontier vocabulary everywhere.[^3][^2]
- Same top-level output object for both families.
- Required provenance on every geometry snapshot.
- Reliability flags on topology, closure, and identity.
- Stable ids only when confidence is high; otherwise ids are snapshot-local.

That last point matters a lot. Vector-native geometry can support durable ids far better than traced contours. Raster-derived geometry can still have ids, but they should be treated as “best effort unless reliability is high.”

## Recommended interfaces

If I were actually refactoring this, I would expose these core interfaces:

```ts
export interface OwnershipMode {
  readonly id: string;
  computeField(input: GeometryLayerInput): OwnershipFieldSnapshot;
}

export interface GeometryMode {
  readonly id: string;
  computeGeometry(input: GeometryLayerInput): CanonicalGeometrySnapshot;
}

export interface RasterDerivedGeometryMode {
  readonly id: string;
  computeField(input: GeometryLayerInput): OwnershipFieldSnapshot;
  extractGeometry(
    field: OwnershipFieldSnapshot,
    input: GeometryLayerInput
  ): CanonicalGeometrySnapshot;
}
```

Then:

- vector master mode implements `GeometryMode`,
- raster master mode implements `RasterDerivedGeometryMode`,
- styles consume canonical geometry and/or fields as appropriate.[^3][^2]


## Practical recommendation

So, concretely, I recommend:

1. Add `OwnershipFieldSnapshot` as a first-class contract.[^5][^4]
2. Replace thin `GeometrySnapshot` with richer `CanonicalGeometrySnapshot` that includes shells, loops, frontiers, provenance, and reliability flags.[^3][^2]
3. Refactor raster modes so they first compute an ownership field, then optionally extract canonical geometry from that field.[^4][^1]
4. Normalize raster-derived geometry into the same output shape as vector geometry, while preserving provenance and confidence metadata.[^1][^2]
5. Move transition behavior out of renderer implementations and into explicit transition contracts, with field-level fallback when topology reliability is low.[^4][^2]

That is the cleanest way to preserve everything you have now while making future interchangeability between vector and raster-derived pipelines actually possible.

<div align="center">⁂</div>

[^1]: renderer_ContourTerritoryRenderer.txt

[^2]: orchestrator_renderMode.txt

[^3]: contract_GeometryContracts.txt

[^4]: renderer_DistanceFieldTerritoryRenderer.txt

[^5]: renderer_PixelTerritoryRenderer.txt

[^6]: renderer_GraphTerritoryRenderer.txt

[^7]: renderer_LaneTerritoryRenderer.txt

