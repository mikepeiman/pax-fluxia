# Territory Rendering — Complete Specification

## 1. Core Constraint: Alignment

**Territory fills + borders MUST align with the starmap.** Stars must be centered in their territories. This is non-negotiable — any renderer change that breaks alignment is a blocker.

- Working reference: commit `1c5283e` (single-pass renderer, confirmed aligned)
- Known broken: `55fe8fe` two-pass renderer (misaligned due to multiple coordinate mapping differences)

## 2. Visual Requirements

### 2.1 Fills
- Each player's territory is a contiguous colored region
- Color derived from player color with HSL adjustment (hue shift, saturation, lightness — user-tunable)
- Fill alpha tunable (default ~0.2, semi-transparent)
- Junction smoothing: rounded corners where 3+ territories meet (tunable radius)
- Edge fade at world boundaries (tunable padding)

### 2.2 Borders
Three border modes required (F-147), selectable via UI:

| Mode | Description | Visual Character |
|------|-------------|-----------------|
| **Gap** | Raw influence gap threshold | Organic, variable width — wider at periphery, narrower near stars |
| **Even** | fwidth(bestInfluence)-normalized | Uniform screen-space width everywhere |
| **Layered** | fwidth(influence gap)-normalized | Structured, per-side coloring at junctions. The "topo map" look |

**Border properties** (all tunable via sliders):
- Width, Softness, Alpha, Brighten
- Color: 50/50 blend of both owners' colors + brightening for contrast

### 2.3 Minimum Star Radius (MSR)
- Territory must extend a minimum radius around each star (tunable, default 0)
- Prevents stars from sitting on a territory boundary line
- Uses quadratic falloff to avoid ring artifacts at the MSR edge

## 3. Territory Features

### 3.1 Corridors (F-145)
Virtual stars placed along same-owner lanes to "pull" territory outward along connections.

- **Spacing mode**: Fixed px distance between virtual sites
- **Count mode**: Fixed number of virtual sites per lane (evenly distributed)
- Tunable: enabled toggle, spacing, count, weight

### 3.2 Disconnect Territories (DX)
When a player owns stars NOT connected by a direct lane, place enemy virtual sites at the midpoint to break the territory.

- Uses Union-Find to detect connected components within each player's stars
- For each pair in DIFFERENT components: place a disconnect site owned by nearest enemy player
- Tunable: enabled toggle, max detection distance, weight
- **Currently non-functional** — produces 0 sites. Bug needs investigation.

### 3.3 Temporal Morphing
Smooth animated transitions when territory ownership changes.

- Interpolates Dijkstra distance fields between current and previous state
- `uMorphFactor` decays from 1.0 → 0.0 over `TERRITORY_TRANSITION_MS`
- Fills and borders animate in sync (borders are emergent from the same data)

## 4. Influence Algorithm

```
TotalInfluence(pixel, star) = pixelDistance + dijkstra × influenceWeight
```

- `pixelDistance`: geometric distance from pixel to star
- `dijkstra`: pre-computed graph distance from star to empire center
- `influenceWeight`: user-tunable (0 = pure Voronoi, 1.0 = full graph influence)
- Lowest influence wins → that player owns the pixel
- Virtual sites (corridors/disconnects) get boost values subtracted from influence

## 5. Architecture Constraints

### 5.1 Single-Pass (Current Working)
- One shader computes influence, ownership, fills, and borders per pixel
- Alignment is correct
- Borders limited to influence-gap methods (no ownership texture for neighbor sampling)

### 5.2 Two-Pass (Target, Currently Broken)
- **Pass 1**: Ownership + gapNorm → RenderTexture
- **Pass 2**: Read ownership texture → player colors + neighbor-sampling borders
- Neighbor sampling produces the cleanest, most uniform borders
- **Blocked**: alignment bug not yet root-caused beyond the content-bounds overwrite

### 5.3 Hardware Compatibility (GLSL ES 3.0)
- No sampler2D in function params
- No macros in functions
- Unique variable names per texture sample
- Manual unrolling — no loops for texture sampling
- `texelFetch` for data textures, `texture()` for ownership texture

## 6. GPU Data Format

Star data packed into RGBA8 texture (MAX_STARS × 4 rows):

| Row | Contents |
|-----|----------|
| 0 | Position: (x_hi, x_lo, y_hi, y_lo) — 16-bit encoded |
| 1 | Current Dijkstra: (dist_hi, dist_lo, unused, unused) |
| 2 | Owner: (ownerIdx+1, unused, boost_hi, boost_lo) |
| 3 | Previous Dijkstra: (prev_hi, prev_lo, unused, unused) |

## 7. Config Keys Summary

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `DF_ALPHA` | float | 0.2 | Fill opacity |
| `DF_BORDER_WIDTH` | float | 15 | Border thickness |
| `DF_BORDER_SOFTNESS` | float | 10 | Border feathering |
| `DF_BORDER_ALPHA` | float | 0.6 | Border opacity |
| `DF_BORDER_BRIGHTEN` | float | 60 | Border color brightening |
| `DF_BORDER_MODE` | int | 1 | 0=gap, 1=even, 2=layered |
| `DF_INFLUENCE_WEIGHT` | float | 1.0 | Graph distance weighting |
| `DF_SMOOTHING` | float | 30 | Junction corner smoothing |
| `DF_MIN_STAR_RADIUS` | float | 0 | Minimum territory radius per star |
| `DF_CORRIDOR_ENABLED` | bool | false | Enable corridor virtual sites |
| `DF_CORRIDOR_MODE` | string | 'spacing' | 'spacing' or 'count' |
| `DF_CORRIDOR_SPACING` | float | 60 | Corridor site spacing (px) |
| `DF_CORRIDOR_COUNT` | int | 3 | Sites per lane (count mode) |
| `DF_CORRIDOR_WEIGHT` | float | 1.0 | Corridor influence weight |
| `DF_DISCONNECT_ENABLED` | bool | false | Enable disconnect virtual sites |
| `DF_DISCONNECT_DISTANCE` | float | 400 | Max detection distance (px) |
| `DF_DISCONNECT_WEIGHT` | float | 0.3 | Disconnect influence weight |
| `DF_EDGE_FADE` | float | 200 | Edge fade distance (px) |
| `DF_EXPANSION` | float | 0.10 | Mesh expansion beyond padding |
| `DF_ROUNDING` | float | 3 | Post-render blur for corner rounding |
| `TERRITORY_TRANSITION_MS` | float | 400 | Morph animation duration |

## 8. Open Bugs

| ID | Issue |
|----|-------|
| B-37 | Two-pass renderer alignment bug — root cause partially identified (content-bounds overwrite) but other factors exist |
| B-35 | Vector borders (Pass 3) not rendering — PIXI v8 `extract.pixels()` is async |
| DX | Disconnect produces 0 sites across all distance values — Union-Find or filtering logic bug |
