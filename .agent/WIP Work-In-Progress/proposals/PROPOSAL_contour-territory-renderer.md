# Proposal: Contour Territory Renderer (F-104)

**Date**: 2026-03-01  
**Status**: Proposed  

---

## Problem

All current territory renderers (pixel, voronoi, metaball, lane) work on **rasterized grids** — ownership per-pixel, then render the grid. This is why the `BORDER_FEEL` post-processing (smooth/angular) fails: extracting geometry from pixels after the fact.

## New Approach: Contour Extraction → Path Simplification

**Work in vector space from the start**, never rasterize ownership:

1. **Compute ownership grid** (cheap, low-res, existing `ownerGrid` logic — 64 to 256px)
2. **Extract contour lines** via [marching squares](https://en.wikipedia.org/wiki/Marching_squares) on ownership boundaries — sub-pixel boundary polylines between adjacent owners
3. **Simplify paths** via Douglas-Peucker or Visvalingam — this is where `BORDER_FEEL` actually works, operating on geometry not pixels
4. **Optional smoothing**: Chaikin subdivision (smooth curves) or corner quantization (angular feel)
5. **Render fills** as PixiJS `Graphics.poly()` or WebGL triangulated meshes
6. **Render borders** as stroked vector paths — configurable width, dash, glow

## Why It's Fundamentally Different

| Aspect | Current (Pixel/Voronoi/Metaball) | Contour Vector |
|--------|----------------------------------|----------------|
| Border feel | Pixel-level morphology (broken) | Geometry simplification (✅ works) |
| Smooth/Angular | Majority-vote kernel | Chaikin vs corner-snap |
| Resolution | Tied to grid resolution | Scales to any zoom |
| Border styling | Pixel painting | Stroked paths (width, dash, glow) |
| Performance | Full-canvas raster/frame | Extract once, cache paths |
| Animation | Full recalc | Lerp control points |

## Worker Flow

```
Input: star positions + colors (same as now)
  1. Build low-res ownerGrid (128×128)
  2. Run marching squares → boundary polylines per player
  3. Apply simplification (Douglas-Peucker, configurable tolerance)
  4. Optional: Chaikin smooth OR angular quantize
Output: { playerId, fillPolygon: Point[], borderPath: Point[] }[]
```

## Config Keys

| Key | Range | Default | Purpose |
|-----|-------|---------|---------|
| `CONTOUR_RESOLUTION` | 64–256 | 128 | Grid size for ownership computation |
| `CONTOUR_SIMPLIFY` | 0–20 | 5 | Douglas-Peucker tolerance |
| `CONTOUR_SMOOTH` | 0–4 | 2 | Chaikin subdivision iterations |
| `CONTOUR_ANGULAR` | 0/45/90 | 0 | Corner snap angle (0=off) |
| `CONTOUR_BORDER_WIDTH` | 0–8 | 2 | Border stroke width |
| `CONTOUR_BORDER_ALPHA` | 0–1 | 0.6 | Border opacity |
| `CONTOUR_FILL_ALPHA` | 0–1 | 0.15 | Fill opacity |

## Why This Works

This is the **only** approach that operates on **vector geometry** rather than pixel grids. The existing renderers are all variations of "paint pixels, then try to make them look nice." This one says "extract the shape first, then draw it." That's why border feel will actually *work* — you're smoothing/sharpening a path, not running a convolution kernel on a bitmap.
