# Agent Prompt: Build `Geometry_0319` Frontier Module

## Context

You are working on **Pax Fluxia**, a space strategy game. Territory borders (strokes) render correctly with smooth Chaikin-smoothed curves. Territory fills (colored polygons) fail to close properly and diverge from borders because they use different geometry sources.

**Your goal:** Create a new Geometry module (`Geometry_0319`) that produces properly-closed fill regions using the exact same smoothed frontier data that borders use. This will be selectable in the UI as **"New-Frontiers-0319"**.

---

## Mandatory Reading

Read `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` before writing any code. Key rules:

1. **4-Layer Pipeline:** Ownership → Geometry → Transition → Presentation
2. **Compiler Rules (Geometry Layer):**
   - NO rendering, NO PIXI imports, NO placeholder geometry
   - Return typed data only
   - **Chaikin smoothing is EXCLUSIVELY a Geometry layer concern** — coordinates shipped to Presentation are FINAL
3. **Renderer Rules (Presentation Layer):**
   - **Fill + border on the SAME points** — `poly(pts).fill()` then `poly(pts).stroke()` from ONE point array
   - NO smoothing in renderers. Geometry arrives pre-smoothed.

---

## The Problem You Are Solving

### How borders work today (correctly):

```
Step 1: extractSharedEdges(cells) → SharedBorderEdge[]
        Each raw Voronoi edge between two cells with different owners.
        Interface at L62 of powerVoronoiTerritoryGeometryGenerator.ts:
        { x1, y1, x2, y2, ownerA, ownerB, colorA, colorB, siteIdA, siteIdB }

Step 2: chainSharedEdgesIntoPolylines(edges, chaikinPasses) → SharedPolyline[]
        Function at L714 of powerVoronoiTerritoryGeometryGenerator.ts.
        Groups edges by sorted owner pair ("A|B").
        Chains consecutive edges endpoint-to-endpoint using ptKey adjacency.
        Applies chaikinSmoothPolyline (preserves first/last vertex).
        Result: ~26 smoothed polylines with ownerPairKey.
        Interface at L74: { points: [number,number][], ownerPairKey: string, color: number }

Step 3: extractWorldBorderPolylines(mergedRaw, worldW, worldH) → SharedPolyline[]
        Function at L301 of powerVoronoiTerritoryGeometryGenerator.ts.
        Extracts edges of merged polygons where BOTH endpoints are on the
        same world boundary side. ownerPairKey = "owner|world".
        ⚠️ MISSES corner-crossing edges where endpoints span two boundary sides.

Step 4: Renderer draws each SharedPolyline as a PIXI.Graphics stroke.
        File: renderers/PowerVoronoiRenderer.ts
```

### How fills work today (broken):

```
Step 1: mergeSameOwnerCells(cells, ...) → MergedTerritory[]
        Function at ~L440 of powerVoronoiTerritoryGeometryGenerator.ts.
        Unions all cells with same owner into one closed polygon.
        Result: 7 raw closed polygons (one per owner).
        Interface at L55: { points: [number,number][], ownerId: string, color: number }

Step 2: constructFillsFromFrontierChain(sharedPolylines, worldBorderPolylines)
        Function at L562 of powerVoronoiTerritoryGeometryGenerator.ts.
        CURRENT BROKEN IMPLEMENTATION — attempts to chain polylines at junction
        vertices per owner, but fails because:
        - World border polylines don't cover corner-crossing edges
        - Junction vertex matching via ptKey fails at precision boundaries
        - Some polylines have only 2 points (single unsmoothed edge)

Step 3: Renderer draws each MergedTerritory as a PIXI.Graphics fill.
        drawTerritoryFillOnly() at L466 of PowerVoronoiRenderer.ts.
```

### The gap

| Aspect | Borders | Fills |
|--------|---------|-------|
| Source | `extractSharedEdges` → raw Voronoi edges | `mergeSameOwnerCells` → polygon union |
| Smoothing | `chaikinSmoothPolyline` (smooth curves) | None or `chaikinSmoothPolygon` (angular at junctions) |
| Vertices | Many smoothed points per curve | Few raw angular points |
| Closure | Open polylines (start ≠ end) | Closed polygon (start = end) |
| World boundary | Separate `worldBorderPolylines` (incomplete) | Part of the merged polygon |

---

## What You Must Build

### New file: `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`

A single exported function that produces `TerritoryGeometryData` (interface at L85 of `powerVoronoiTerritoryGeometryGenerator.ts`) where **`mergedTerritories` are closed rings whose contested edges use the exact same smoothed vertices as `sharedPolylines`**.

### Architecture: Ownership-Annotated Frontier

The key insight: every frontier point has TWO owners (one on each side). Build a unified frontier where world boundaries are first-class (not an afterthought).

#### Proposed algorithm:

1. **Extract ALL frontier edges** — both inter-owner AND owner-world:
   - Inter-owner: from `extractSharedEdges(cells)` — `ownerA | ownerB`
   - Owner-world: EVERY edge of each merged polygon that is NOT an inter-owner edge. This naturally includes corner-crossing edges. `ownerPairKey = "owner|world"`

2. **Chain ALL frontier edges into polylines** — group by owner pair, chain endpoint-to-endpoint, apply Chaikin smoothing. Use the existing `chainSharedEdgesIntoPolylines` logic but run it on ALL frontier edges (not just inter-owner ones).

3. **Build per-owner fill regions** — for each owner X:
   - Collect all frontier polylines where X is one of the pair owners
   - Chain them at junction vertices (where polyline endpoints meet)
   - The result is a closed ring — guaranteed because the frontier fully encloses each territory
   - If any gaps remain (disconnected junction vertices), connect closest unmatched endpoints

4. **Output** `TerritoryGeometryData` with:
   - `playerTerritories`: the closed fill regions from step 3
   - `sharedFrontierPolylines`: the inter-owner polylines from step 2 (for border drawing)
   - `worldBorderPolylines`: the owner-world polylines from step 2

5. **Do not preserve** `mergeSameOwnerCells` and `chained shared-polylines` as truth sources.

### Critical: World boundary must be first-class

`extractWorldBorderPolylines` currently only captures edges where BOTH endpoints are on the SAME boundary side. This misses diagonal edges that cross from one side to another (e.g., top→right at a corner). Your implementation MUST capture ALL non-contested edges as world boundary edges.

The correct classification: for each edge of a merged raw polygon, check if `edgeKey` matches any `SharedBorderEdge`. If yes → contested. If no → world boundary. Don't filter by "same boundary side".

---

## Key Functions and Locations

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `computePowerVoronoiTerritoryGeometry` | `powerVoronoiTerritoryGeometryGenerator.ts` | ~L920 | Main pipeline orchestrator |
| `extractSharedEdges` | same file | ~L370 | Extracts raw shared border edges from cells |
| `chainSharedEdgesIntoPolylines` | same file | L714 | Chains + smooths raw edges into polylines |
| `extractWorldBorderPolylines` | same file | L301 | Extracts world boundary edges (INCOMPLETE) |
| `mergeSameOwnerCells` | same file | ~L440 | Unions same-owner cells into polygons |
| `constructFillsFromFrontierChain` | same file | L562 | BROKEN fill builder (current attempt) |
| `chaikinSmoothPolyline` | same file | L192 | Chaikin smoothing for open polylines (preserves endpoints) |
| `chaikinSmoothPolygon` | same file | L230 | Chaikin smoothing for closed polygons (pins junctions) |
| `edgeKey` | same file | L125 | Edge identity key (rounds to 2 decimal places) |
| `ptKey` | same file | L132 | Point identity key (rounds to 2 decimal places) |
| `drawTerritoryFillOnly` | `PowerVoronoiRenderer.ts` | L466 | Draws fill polygon |
| `renderPowerVoronoi` | `PowerVoronoiRenderer.ts` | - | Main render function |

---

## Key Interfaces

```typescript
// L55 — Fill polygon
interface MergedTerritory {
    points: [number, number][];  // closed polygon ring
    ownerId: string;
    color: number;               // 0 from geometry, renderer fills in
}

// L62 — Raw shared edge between two owners
interface SharedBorderEdge {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: string; ownerB: string;
    colorA: number; colorB: number;  // 0 from geometry
    siteIdA: string; siteIdB: string;
}

// L74 — Smoothed polyline between two owners (or owner|world)
interface SharedPolyline {
    points: [number, number][];
    ownerPairKey: string;  // "ownerA|ownerB" sorted, or "owner|world"
    color: number;         // 0 from geometry
}

// L85 — Output of geometry stage
interface TerritoryGeometryData {
    cells: TerritoryCell[];
    mergedTerritories: MergedTerritory[];
    sharedEdges: SharedBorderEdge[];
    rawSharedPolylines: SharedPolyline[];
    sharedPolylines: SharedPolyline[];
    worldBorderPolylines: SharedPolyline[];
    enclaveMap: Map<number, [number, number][][]>;
    fingerprint: string;
}
```

---

## Integration: Making It Selectable

Register the new method in `pax-fluxia/src/lib/territory/orchestrator/registry.ts`:

```typescript
{
    id: 'new_frontiers_0319',
    label: 'New-Frontiers-0319',
    implementedStages: { geometry: true },
}
```

Wire it in `pax-fluxia/src/lib/territory/orchestrator/engine.ts` to call your new geometry function when selected.

---

## Verification

1. `bunx svelte-check --threshold error` — 0 errors
2. Console diagnostic: fill regions should show ✓ closed for all territories
3. Fill point counts should be HIGH (matching sum of smoothed polyline points per owner, not raw polygon vertex count)
4. Visual: fills smooth, exactly matching border curves, no angular corners at junctions

---

## Helper: Configuration Values

Located in game.config.ts and passed via `TerritoryGeneratorSettings` (L106):
- `chaikinPasses` (default 5): number of Chaikin smoothing iterations
- `boundaryPad` (default 50): world-clip padding in px
- `boundaryEps` (default 6-8): boundary proximity threshold in px
- `worldWidth`, `worldHeight`: world dimensions
