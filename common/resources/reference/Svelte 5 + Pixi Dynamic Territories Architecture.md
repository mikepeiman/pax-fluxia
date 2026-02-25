# Svelte 5 + Pixi.js Dynamic Territories Architecture

## Overview

This guide provides a production-ready architecture for rendering 60 dynamic territories in Svelte 5 + Pixi.js (WebGL 2D), with smooth rounded contours, gradient blending, and optimized performance. The stack prioritizes fine-grained reactivity, GPU batching efficiency, and tunable visual parameters.

## Core Technology Stack & Performance Notes

### Svelte 5 Reactivity Performance

Svelte 5's runes system (`$state`, `$derived`, `$effect`) offers significantly better fine-grained reactivity than Svelte 4. For your use case:[^1][^2]

- **Deep reactive state scales well** when using `$state.frozen()` for large arrays of immutable star data; frozen state is ~3-5× faster than deeply reactive state for read-heavy operations, which applies to terrain calculation.[^3]
- Svelte 5's reactivity layer is among the fastest in the JavaScript ecosystem (outperforming Vue, MobX, and others on standard benchmarks), so avoiding unnecessary renders is more effective than optimizing component re-render speed.[^4]

**Implication:** Store stars in a frozen reactive state; derive territory polygons in a `$derived` block that only invalidates when star positions change, not on every frame paint.

### Pixi.js Rendering & Batching

Pixi.js uses automatic WebGL batching, and with 60 territories, you're well within safe bounds:[^5]

- **Graphics batching:** Graphics objects under ~100 points batch efficiently; "sprite / graphic / sprite / graphic" ordering matters more than object count—avoid alternating types.[^5]
- **Blend mode costs:** Different blend modes break batches. Use a single blend mode for all territories if rendering gradient overlays.[^5]
- **Text rendering:** BitmapText is far faster than regular Text for dynamic updates.[^5]
- **No unnecessary interactivity:** Setting `interactiveChildren = false` on parent containers saves significant per-frame cost if events don't bubble down.[^5]

**Implication:** Render all territory polygons as a single Graphics object per faction or as layered Graphics with consistent ordering. Use layer separation (faction boundaries as one batch, gradient overlays as another) to maintain batch coherence.

### Canvas 2D vs WebGL Context

For pure 2D rendering of vector polygons and gradients, the modern benchmark comparison shows WebGL (Pixi) is generally faster than Canvas 2D API, especially at scale, due to GPU acceleration and batching. However, Canvas 2D can be simpler for small scenes.[^6]

**Decision for your case:** Pixi.js + WebGL is the right call for 60 territories with animated transitions and gradient overlays—you get GPU batching, tinting (free overhead in WebGL), and layer control.[^7]

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Svelte 5 Component (TerritoryMap.svelte)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  let stars = $state.frozen([...])  // Immutable star array      │
│  let territories = $derived(...)   // Computed Voronoi cells    │
│  let params = $state({smoothing: 2, blendRadius: 50, ...})      │
│                                                                   │
│  $effect(() => {                                                 │
│    updatePixiRendering(territories, params)                      │
│  })                                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Data Processing Layer (CPU)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. d3-delaunay.voronoi() → raw polygon vertices                │
│  2. Chaikin smoothing per cell boundary                          │
│  3. Distance-weighted blending info (per-pixel or cached)        │
│  4. Gradient color computation                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Pixi Rendering Layer (GPU)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  • Graphics object(s) batched by layer                           │
│  • Smoothed polygon fill + stroke per territory                  │
│  • Optional: blended overlay Graphics for soft borders           │
│  • Cull off-screen territories (pixi-cull or app-level)         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: From Stars to Screen

### 1. Star State (Immutable, Frozen)

```javascript
let stars = $state.frozen([
  { id: 's0', x: 150, y: 200, faction: 'red', strength: 1.0 },
  { id: 's1', x: 400, y: 350, faction: 'blue', strength: 1.2 },
  // ... 58 more
]);
```

**Why frozen?** Preventing deep reactivity on the stars array itself avoids the 29× slowdown cited in the reactivity benchmark. Stars are inputs; only territory re-computation should trigger re-renders.[^3]

### 2. Compute Voronoi Cells (via d3-delaunay)

```javascript
import { Delaunay } from 'd3-delaunay';

let territories = $derived.by(() => {
  const coords = stars.flatMap(s => [s.x, s.y]);
  if (coords.length < 6) return []; // need at least 2 points
  
  const delaunay = Delaunay.from(coords);
  const voronoi = delaunay.voronoi([0, 0, canvasWidth, canvasHeight]);
  
  return stars.map((star, i) => {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon) return null;
    
    return {
      star,
      vertices: polygon,
      smoothed: smoothPolygon(polygon, params.smoothing),
      centroid: computeCentroid(polygon),
    };
  }).filter(Boolean);
});
```

**Cost:** Voronoi computation for 60 sites is negligible (~1–2ms on modern hardware per update). d3-delaunay is fast and robust.[^8][^9][^10]

### 3. Polygon Smoothing (Chaikin Algorithm)

```javascript
function smoothPolygon(vertices, iterations = 2) {
  let smooth = [...vertices];
  for (let iter = 0; iter < iterations; iter++) {
    const newSmooth = [];
    for (let i = 0; i < smooth.length; i++) {
      const p0 = smooth[i];
      const p1 = smooth[(i + 1) % smooth.length];
      // Chaikin: emit 0.75*p0 + 0.25*p1 and 0.25*p0 + 0.75*p1
      newSmooth.push([
        0.75 * p0 + 0.25 * p1,
        0.75 * p0[^1] + 0.25 * p1[^1],
      ]);
      newSmooth.push([
        0.25 * p0 + 0.75 * p1,
        0.25 * p0[^1] + 0.75 * p1[^1],
      ]);
    }
    smooth = newSmooth;
  }
  return smooth;
}
```

**Tunable:** `params.smoothing` (0–4 iterations) exposes "roundedness" to your designer or player.

### 4. Gradient Blending Info

For soft borders, pre-compute per-territory which neighboring territories should blend:

```javascript
let blendingData = $derived.by(() => {
  return territories.map(terr => {
    const neighbors = findNeighboringTerritories(terr.star, territories, params.blendRadius);
    return {
      territory: terr,
      neighbors: neighbors.map(n => ({
        star: n.star,
        distance: dist(terr.star, n.star),
        blendAlpha: 0.3, // tunable
      })),
    };
  });
});
```

### 5. Render to Pixi

```javascript
let pixiApp = $state(null);
let territoriesGraphics = $state(null);

$effect(() => {
  if (!pixiApp) return;
  
  if (territoriesGraphics) pixiApp.stage.removeChild(territoriesGraphics);
  
  territoriesGraphics = new PIXI.Graphics();
  
  territories.forEach(terr => {
    const color = factionColorMap[terr.star.faction];
    territoriesGraphics.fillStyle.color = color;
    territoriesGraphics.fillStyle.alpha = 0.6;
    
    // Draw smoothed polygon
    territoriesGraphics.moveTo(terr.smoothed, terr.smoothed[^1]);
    terr.smoothed.forEach(([x, y]) => {
      territoriesGraphics.lineTo(x, y);
    });
    territoriesGraphics.closePath();
    territoriesGraphics.fill();
    
    // Optional: thin stroke for clarity
    territoriesGraphics.strokeStyle.width = 1;
    territoriesGraphics.strokeStyle.color = darkenColor(color);
    territoriesGraphics.stroke();
  });
  
  pixiApp.stage.addChild(territoriesGraphics);
  pixiApp.render(); // or call this in your game loop
});
```

## Tunable Visual Parameters

Expose these in a settings panel or debug UI:

```javascript
let params = $state({
  // Polygon smoothing
  smoothingIterations: 2,      // 0–5, controls roundedness
  
  // Blending
  blendRadius: 50,             // pixel radius for soft borders
  blendAlpha: 0.2,             // opacity of blend overlay
  
  // Colors
  useGradientBorders: true,    // enable distance-weighted color blend
  territoryAlpha: 0.6,         // territory fill opacity
  strokeWidth: 1,              // territory boundary line width
  
  // Optional: CVT relaxation (if implemented)
  relaxationIterations: 0,     // 0 = pure Voronoi, 1+ = centroidal
});
```

## Performance Considerations

### CPU Budget (per frame, 60 Hz = 16.7ms)

| Operation | Est. Time | Notes |
|-----------|-----------|-------|
| Voronoi recompute (60 sites) | 1–2ms | Only on star change |
| Polygon smoothing (2 iterations) | 0.5–1ms | Per-frame if params.smoothing changes |
| Blending data lookup | 0.5ms | Cached if star positions static |
| **Total (star move)** | **~2–3ms** | Not every frame, only on change |
| **Total (idle render)** | **<0.1ms** | Voronoi data reused |

For 60 fps with 16.7ms per frame, you have plenty of headroom.[^11]

### GPU Budget (Batching)

Rendering 60 territories as a single Graphics object in Pixi results in **1 draw call**. If you use separate Graphics per faction (say, 3–5 factions), you get 3–5 draw calls total, still excellent.[^5]

**Avoid:**
- Frequently modifying Graphics objects per frame (rebuild entire Graphics, don't patch). Create a new Graphics, swap it, destroy the old one.[^5]
- Alternating blend modes between territories (use one blend mode per layer).[^5]
- Interactive event handlers on each territory polygon (set `interactiveChildren = false`).[^5]

### Memory

60 territories with ~20–50 vertices each (after smoothing) → ~60–120 KB for polygon data. Negligible.

## Implementation Strategy

### Phase 1: Core Voronoi + Static Rendering

1. Install `d3-delaunay`: `npm install d3-delaunay`
2. Wire up Svelte state → Voronoi computation → Pixi rendering.
3. Verify polygon rendering and basic smoothing.

### Phase 2: Add Gradient Blending

1. Implement distance-weighted color blending.
2. Optional: Add a second Graphics layer for soft overlay at territory borders.

### Phase 3: Tunable Parameters & UI

1. Add a debug/settings panel with sliders for smoothing, blend radius, alpha.
2. Real-time feedback via `$effect` reactivity.

### Phase 4: Optimization (if needed)

1. Implement pixi-cull or app-level culling if territories go off-screen.
2. Cache Voronoi if star positions are stable for multiple frames.
3. Consider pre-rendering static territory backgrounds to offscreen canvas if UI is heavy.[^11]

## Implementation Gotchas

### Svelte 5 Deeply Reactive State

Avoid deeply reactive state for star positions. Use `$state.frozen()` instead.[^3]

### Pixi Graphics Lifecycle

Graphics objects are cheap to create but expect complete rebuilds, not incremental updates. On star change, create a new Graphics object, add it to the stage, and remove the old one.[^5]

### Polygon Winding Order

d3-delaunay returns CCW polygons; Pixi.Graphics.fill() expects CCW or CW consistently. Verify polygon order or normalize before rendering.

### WebGL Context Loss

If your browser tab loses focus (rare in modern browsers), the WebGL context may be lost. Pixi handles recovery, but be aware.

## Code Snippet: Minimal Example

```svelte
<script>
  import { onMount } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { Delaunay } from 'd3-delaunay';

  let canvasContainer;
  let pixiApp;

  let stars = $state.frozen([
    { id: 's0', x: 150, y: 200, faction: 'red' },
    { id: 's1', x: 400, y: 350, faction: 'blue' },
    // ... 58 more
  ]);

  let params = $state({
    smoothing: 2,
    blendRadius: 50,
  });

  let territories = $derived.by(() => {
    const coords = stars.flatMap(s => [s.x, s.y]);
    if (coords.length < 6) return [];
    
    const delaunay = Delaunay.from(coords);
    const voronoi = delaunay.voronoi([0, 0, 800, 600]);
    
    return stars.map((star, i) => {
      const polygon = voronoi.cellPolygon(i);
      return {
        star,
        vertices: polygon || [],
        smoothed: smoothPolygon(polygon || [], params.smoothing),
      };
    });
  });

  $effect(() => {
    if (!pixiApp) return;
    
    const g = new PIXI.Graphics();
    
    territories.forEach(terr => {
      const colorMap = { red: 0xff0000, blue: 0x0000ff, green: 0x00ff00 };
      g.fillStyle.color = colorMap[terr.star.faction];
      g.fillStyle.alpha = 0.6;
      
      if (terr.smoothed.length > 0) {
        g.moveTo(terr.smoothed, terr.smoothed[^1]);
        terr.smoothed.forEach(([x, y]) => g.lineTo(x, y));
        g.closePath();
        g.fill();
      }
    });
    
    pixiApp.stage.removeChildren();
    pixiApp.stage.addChild(g);
  });

  function smoothPolygon(vertices, iterations) {
    let smooth = [...vertices];
    for (let iter = 0; iter < iterations; iter++) {
      const newSmooth = [];
      for (let i = 0; i < smooth.length; i++) {
        const p0 = smooth[i];
        const p1 = smooth[(i + 1) % smooth.length];
        newSmooth.push([0.75 * p0 + 0.25 * p1, 0.75 * p0[^1] + 0.25 * p1[^1]]);
        newSmooth.push([0.25 * p0 + 0.75 * p1, 0.25 * p0[^1] + 0.75 * p1[^1]]);
      }
      smooth = newSmooth;
    }
    return smooth;
  }

  onMount(async () => {
    pixiApp = new PIXI.Application({ width: 800, height: 600, antialias: true });
    canvasContainer.appendChild(pixiApp.canvas);
  });
</script>

<div bind:this={canvasContainer}></div>

<div class="controls">
  abel>
    Smoothing:
    <input type="range" min="0" max="5" bind:value={params.smoothing} />
  </label>
  abel>
    Blend Radius:
    <input type="range" min="10" max="100" bind:value={params.blendRadius} />
  </label>
</div>

<style>
  div.controls {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    color: white;
  }
</style>
```

## Next Steps

1. **Weighted Voronoi:** If some stars should exert more territorial influence, weight their positions or implement centroidal Voronoi tessellation (CVT) relaxation.[^12]
2. **Animated Transitions:** Interpolate territory changes when stars move (e.g., GSAP or Svelte transitions on polygon vertices).
3. **Interaction:** Add click-to-select territories, hover info, etc. via Pixi hit-testing or a separate overlay layer.
4. **Shader-Based Blending (advanced):** For extremely smooth gradients and metaball-like softness, replace Graphics polygons with a fragment shader that computes per-pixel influence fields (SDF-based).[^13][^14]

## References

For detailed algorithm background, see:
- d3-delaunay GitHub — fast Delaunay triangulation and Voronoi derivation[^9][^8]
- Pixi.js performance tips — Graphics batching, blend mode costs, optimization strategies[^5]
- Canvas optimization (MDN) — general 2D rendering best practices[^11]
- Svelte 5 fine-grained reactivity — performance implications of `$state` vs `$state.frozen()`[^2]
- Signed distance fields (NVIDIA GPU Gems) — advanced smoothing techniques if you go shader-based later[^14]

---

## References

1. [You Should Try Svelte 5 - Atomic Spin](https://spin.atomicobject.com/you-should-try-svelte-5/) - Svelte Runes break apart the $: reactive variable into a few much more React-like features that real...

2. [Fine-Grained Reactivity in Svelte 5 – Frontend Masters Blog](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/) - Svelte is already quite lightweight and fast, but Svelte 5 still overs big improvements in fine-grai...

3. [Performance of accessing deeply reactive state · Issue #11851 · sveltejs/svelte](https://github.com/sveltejs/svelte/issues/11851) - Describe the bug Context Our libraries state is an array of objects. The deepest nesting level is ma...

4. [Svelte v5 runes benchmark results & discussion 🔥 #13277](https://github.com/sveltejs/svelte/discussions/13277) - To my surprise, Svelte v5 outperformed all other reactivity libs by quite a solid margin on all benc...

5. [Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips) - Graphics objects are batched when under a certain size (100 points or smaller); Small Graphics objec...

6. [A look at 2D vs WebGL canvas performance - semi/signal](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/) - Looking at the performance between directly manipulating pixels on a 2D canvas versus using a fragme...

7. [v4 Performance Tips · pixijs/pixijs Wiki - GitHub](https://github.com/pixijs/pixijs/wiki/v4-Performance-Tips) - The HTML5 Creation Engine: Create beautiful digital content with the fastest, most flexible 2D WebGL...

8. [delaunator - NPM](https://www.npmjs.com/package/delaunator) - An incredibly fast JavaScript library for Delaunay triangulation of 2D points. Latest version: 5.0.1...

9. [mapbox/delaunator: An incredibly fast JavaScript library for ...](https://github.com/mapbox/delaunator) - An incredibly fast JavaScript library for Delaunay triangulation of 2D points - mapbox/delaunator

10. [d3-delaunay](https://www.npmjs.com/package/d3-delaunay) - Compute the Voronoi diagram of a set of two-dimensional points.. Latest version: 6.0.4, last publish...

11. [Optimizing canvas - Web APIs | MDN - Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - More tips · Batch canvas calls together. · Avoid unnecessary canvas state changes. · Render screen d...

12. [Introducing Voronator, A Voronoi Diagram and Delaunay Triangulation library](https://www.reddit.com/r/rust/comments/hjbl0y/introducing_voronator_a_voronoi_diagram_and/)

13. [Where can I find resources on the meshing of metaballs/blended surfaces/smooth merging?](https://www.reddit.com/r/GraphicsProgramming/comments/15szaui/where_can_i_find_resources_on_the_meshing_of/)

14. [Chapter 34. Signed Distance Fields Using Single-Pass ...](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu) - by K Erleben · Cited by 21 — A signed distance field is represented as a grid sampling of the closes...

