# Territory Pipeline: What Produces Data vs What Draws It

## Three Orthogonal Concerns

```
GEOMETRY DATA MODE          TRANSITION STRATEGY         PRESENTATION STYLE
─────────────────           ───────────────────         ──────────────────
What territory shapes       How shapes animate          How shapes look
get computed                 during conquest             on screen
─────────────────           ───────────────────         ──────────────────
Produces: geometry data     Produces: interpolated      Produces: colors,
for frontiers, regions;     frame geometry at time t    widths, alpha, glow
as polygons or coordinate 
series                          
─────────────────           ───────────────────         ──────────────────
Changes on: ownership       Changes on: every frame     Changes on: slider
tick (topology change)      during conquest              tweak (uniform update)  
─────────────────           ───────────────────         ──────────────────
EXAMPLES:                   EXAMPLES:                   EXAMPLES:
• FG1 Adaptive Field        • GraphicsPathMorpher       • Border width
• FG2 Seed Graph            • RopeBorderRenderer        • Border alpha
• NEW: unified polygon      • FrontierLoopMorpher       • Saturation
  (dense-resampled          • DY4 optimal transport     • Glow layers
   closed polygons)         • Crossfade                 • Smoothing passes
```

## The Rule

> **A geometry data mode determines WHAT DATA exists.**
> **A transition strategy determines HOW DATA MOVES between frames.**
> **A presentation style determines HOW DATA LOOKS.**
>
> They are independent axes. Any geometry mode can pair with any transition strategy.

## What Each Layer Produces (PRD Layers 1-6)

| Layer | Concern | Output | Changes When |
|-------|---------|--------|-------------|
| 1. Territory Truth | **Data** | `MetricState` (ownership per node) | Star captured |
| 2. Frontier Extraction | **Data** | `FrontierGraph` (boundary lines) | Ownership changes |
| 3. Geometry Fitting | **Data** | `FittedFrontierPath[]` (smoothed/styled geometry) | Family or tolerance change |
| 4. Region Derivation | **Data** | `TerritoryRegion[]` (closed owned polygons) | Frontiers change |
| 5. Presentation | **Rendering** | GPU meshes, colors, stroke widths | Style slider moved |
| 6. Transition | **Animation** | Interpolated frame geometry at time t | Every frame during conquest |

**Layers 1-4 = Geometry Data Generation (compiler, no PIXI)**
**Layer 5 = Presentation (renderer, consumes data)**
**Layer 6 = Transition (animator, interpolates between two data states)**

## FG1 vs New Mode: What's Actually Different

Both use d3-weighted-voronoi power diagram. Both produce `MergedTerritory[]`.

| | FG1 Adaptive Field (current) | New: Unified Polygon |
|---|---|---|
| **Data outputs** | `MergedTerritory[]` + `SharedPolyline[]` | `MergedTerritory[]` only (densely resampled) |
| **Border source** | SharedPolyline segments (open polylines) | Territory polygon outline (closed polygon) |
| **Fill source** | Territory polygon interior | Same polygon outline |
| **Fill = Border?** | NO — different vertex sets | YES — same vertices |
| **Smoothing** | Two separate Chaikin passes | One Chaikin pass + dense resampling |

**The new mode is a different GEOMETRY DATA MODE because it produces different data artifacts** — not because it animates differently.

## What I Got Wrong

I put the new mode in the **transition animation dropdown** (alongside GraphicsPathMorpher, Rope, etc.). This is incorrect because:
- The transition dropdown selects HOW to animate between two states
- The new work changes WHAT DATA is produced (single polygon vs dual polygon+polyline)
- It belongs in the **geometry data mode selector** (alongside FG1, FG2, etc.)

## File Naming

| Current Name | Problem | Better Name |
|---|---|---|
| `pvv2MetricStage.ts` | "Metric" implies measurement | Describes a weighted Voronoi territory compiler |
| `activeMorpher` | Generic | It morphs border segments during conquest |
| `activeLoopMorpher` | Generic | It morphs territory shapes during conquest |
