# Geometry Data Shape Reference

**Purpose:** Concrete reference for the data flowing through the territory pipeline. Use this to understand what `GeometrySnapshot` looks like.

---

## GeometrySnapshot (one per frame, produced by Geometry layer)

```typescript
{
  version: string,              // Cache key — deterministic hash of ownership state
  sourceMode: GeometryModeId,   // "boundary_aware_frontier" | "power_voronoi" | "seed_graph"
  ownershipVersion: string,     // Hash of star-owner assignments

  // FILLS — closed polygons, one per territory region
  territoryRegions: [{
    ownerId: string,            // Player ID, e.g. "player_0"
    points: [number, number][], // Closed polygon vertices (Chaikin-smoothed)
                                // Typically 40-200 points per region
  }],

  // BORDERS — shared frontier polylines between adjacent territories
  frontierPolylines: [{
    ownerPairKey: string,       // "player_0|player_1" (sorted canonical key)
    points: [number, number][], // Open polyline vertices (Chaikin-smoothed)
                                // Typically 10-60 points per frontier
  }],

  // WORLD BORDERS — edges where a territory meets the map boundary
  worldBorderPolylines: [{
    ownerPairKey: string,       // "player_0|world" or similar
    points: [number, number][], // Open polyline vertices along the map edge
  }],

  // MAP — keyed lookup for frontier polylines
  sharedFrontierMap: Map<string, FrontierPolylineShape>,
}
```

## Key Relationships

- `frontierPolylines` = inter-territory borders (Red↔Blue)
- `worldBorderPolylines` = territory↔map-edge borders (Red↔world)
- Both are used together by `executeChainWalk` to build closed fill rings
- `territoryRegions` = the closed fill polygons built from chaining frontiers + world borders
- Fill vertices ARE the same as border vertices — they come from the same smoothed polylines

## What Changes on Conquest

When star X is conquered (player A takes from player B):
- Polylines involving A or B near star X get **new point arrays** (drifted)
- Polylines far from X stay **exactly identical** (static)
- Some polylines may **spawn** (new A↔C border where none existed)  
- Some polylines may **vanish** (old B↔C border near X disappears)

## How to Get Real Data

Run the game with territory rendering enabled. On the first conquest, a JSON file
(`geometry-snapshot-dump.json`) will auto-download containing both the previous
and current `GeometrySnapshot`. This capture is one-shot per session.
