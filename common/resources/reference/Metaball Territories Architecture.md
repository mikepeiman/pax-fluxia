# Svelte 5 + Pixi.js Metaball Territories Architecture

## Overview

This architecture uses GPU-accelerated implicit surface rendering (metaballs / influence fields) via WebGL fragment shaders to create smooth, blobby, fluid-like territories that blend and merge organically around 60 faction stars. Instead of explicit polygons, each faction's territory is defined by a summed influence field; territorial ownership is determined per-pixel by which faction's field is strongest.

**Key advantages over Voronoi:**
- Naturally smooth, rounded boundaries with zero post-processing[^1]
- Beautiful gradient blending "for free" by rendering multiple field strengths per-pixel[^2][^1]
- Highly tunable: falloff curve, blend sharpness, field strength, and colors easily exposed[^3][^4][^2]
- GPU-intensive, CPU-light (perfect for 60 FPS on modern hardware)[^1]

## Core Concept: Influence Fields

### Implicit Surface Definition

For each faction (or star), define an influence function:

\[ f_i(\mathbf{p}) = \frac{1}{1 + (d_i / r_i)^2} \]

where:
- \(\mathbf{p}\) = pixel position
- \(d_i\) = distance from pixel to star i
- \(r_i\) = influence radius (tunable)

At each pixel, compute all influence fields and apply logic:

- **Ownership:** Pixel belongs to faction with \( \max(f_i) \)
- **Blending:** Smooth blend between two strongest fields based on their relative strength
- **Color:** Interpolate faction colors weighted by field strengths

This is exactly how metaballs and smooth implicit surfaces work.[^2][^1]

### Falloff Functions

You can vary the falloff curve for aesthetic control:

1. **Inverse-square (default):** \( 1 / (1 + (d/r)^2) \) — organic, natural feel
2. **Smooth Gaussian:** \( e^{-(d/r)^2} \) — very soft, fluid
3. **Linear with smooth cutoff:** \( \max(0, \text{smoothstep}(r, 0, d)) \) — more defined edges
4. **Smooth maximum blend:** Higher-order smooth blending for better transitions[^4][^5]

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│ Svelte 5 Component (TerritoryMap.svelte)                       │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  let stars = $state.frozen([...])  // Immutable star array     │
│  let params = $state({              // Tunable appearance       │
│    influenceRadius: 80,                                         │
│    falloffCurve: 'inverse-square',                              │
│    blendSharpness: 3,                                           │
│    gradientBias: 0.5,                                           │
│    pixelGridSize: 2, // supersampling for smoothness           │
│  })                                                              │
│                                                                  │
│  $effect(() => {                                               │
│    updateShaderUniforms(stars, params)                         │
│    renderFramebuffer()                                         │
│  })                                                              │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ GPU Pipeline (WebGL Render-to-Texture)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vertex Shader (fullscreen quad):                               │
│  - Pass through: gl_Position = 2D quad, vTexCoord             │
│                                                                  │
│  Fragment Shader (60+ samples per pixel):                       │
│  - For each star, compute influence(pixel, star)               │
│  - Find top 2–3 factions by field strength                     │
│  - Smooth blend colors based on field overlap                  │
│  - Output: RGBA color (faction ownership + blend gradient)     │
│                                                                  │
│  Output: Framebuffer texture (canvas size)                      │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ Pixi Display                                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Blit framebuffer texture to Pixi canvas via quad geometry     │
│  Optional: Draw stars/labels on top with separate layer        │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Svelte State & Reactivity

```javascript
let stars = $state.frozen([
  { id: 's0', x: 150, y: 200, faction: 'red', strength: 1.0 },
  { id: 's1', x: 400, y: 350, faction: 'blue', strength: 1.2 },
  // ... 58 more
]);

let factionColorMap = $state.frozen({
  red: [1.0, 0.2, 0.2],
  blue: [0.2, 0.5, 1.0],
  green: [0.2, 1.0, 0.2],
  // ...
});

let params = $state({
  influenceRadius: 80,     // how far each star's field extends
  falloffCurve: 'inverse-square', // 'inverse-square' | 'gaussian' | 'smoothstep'
  blendSharpness: 3.0,    // higher = sharper boundaries
  gradientBias: 0.5,      // 0 = hard lines, 1 = full gradient
  supersampling: 2,       // pixel grid density for anti-aliasing
});
```

**Why frozen?** As before, avoiding deep reactivity on star positions prevents the reactivity slowdown. Changes to params (tuning) or star count changes will trigger shader uniform updates, but the rendering itself is GPU-driven.[^6]

### 2. WebGL Setup in Pixi

Pixi.js is built on WebGL, so you can inject custom shader logic. Create a custom geometry + material or use Pixi's `RenderTexture` to render to an offscreen texture:

```javascript
import * as PIXI from 'pixi.js';

let pixiApp = new PIXI.Application({
  width: 800,
  height: 600,
  antialias: true,
});

// Create a RenderTexture to draw the influence field
let renderTexture = PIXI.RenderTexture.create({
  width: pixiApp.canvas.width,
  height: pixiApp.canvas.height,
});

// Use custom WebGL shaders to compute the field
let customShaderMaterial = createInfluenceFieldShader(pixiApp.renderer, stars, params);
```

**Alternative (more direct control):** Use Pixi's low-level `Program` API to create a custom WebGL program and render a fullscreen quad directly, bypassing Pixi's high-level sprite/graphics layer.

### 3. Fragment Shader (Core Logic)

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_screenTexture;
uniform vec2 u_canvasSize;

// Per-star data packed into a texture
uniform sampler2D u_starData; // 60 stars × (pos_xy, faction_id, strength)

// Visual parameters
uniform float u_influenceRadius;
uniform int u_numStars;
uniform sampler2D u_factionColors; // texture mapping faction id -> RGB

// Falloff function
uniform int u_falloffType; // 0 = inverse-square, 1 = gaussian, 2 = smoothstep

in vec2 v_texCoord;
out vec4 outColor;

// Inverse-square falloff
float influenceInverseSquare(float distance, float radius) {
  float d = distance / radius;
  return 1.0 / (1.0 + d * d);
}

// Gaussian falloff
float influenceGaussian(float distance, float radius) {
  float d = distance / radius;
  return exp(-d * d);
}

// Smooth step falloff (more defined edges)
float influenceSmoothstep(float distance, float radius) {
  return smoothstep(radius, 0.0, distance);
}

float influence(float distance, float radius, int falloffType) {
  if (falloffType == 0) return influenceInverseSquare(distance, radius);
  if (falloffType == 1) return influenceGaussian(distance, radius);
  return influenceSmoothstep(distance, radius);
}

void main() {
  vec2 pixelPos = v_texCoord * u_canvasSize;
  
  // Compute influence field for each star
  float maxInfluence = 0.0;
  vec3 topColor = vec3(0.0);
  float secondInfluence = 0.0;
  vec3 secondColor = vec3(0.0);
  
  for (int i = 0; i < 60; i++) {
    if (i >= u_numStars) break;
    
    // Fetch star data from texture (x, y, faction_id, strength)
    vec4 starData = texelFetch(u_starData, ivec2(i, 0), 0);
    vec2 starPos = starData.xy;
    int factionId = int(starData.z);
    float strength = starData.w;
    
    // Compute distance and influence
    float dist = length(pixelPos - starPos);
    float inf = influence(dist, u_influenceRadius, u_falloffType) * strength;
    
    // Fetch faction color
    vec3 factionColor = texelFetch(u_factionColors, ivec2(factionId, 0), 0).rgb;
    
    // Track top 2 influences for blending
    if (inf > maxInfluence) {
      secondInfluence = maxInfluence;
      secondColor = topColor;
      maxInfluence = inf;
      topColor = factionColor;
    } else if (inf > secondInfluence) {
      secondInfluence = inf;
      secondColor = factionColor;
    }
  }
  
  // Smooth blend between top 2 influences
  float blendFactor = maxInfluence / (maxInfluence + secondInfluence + 0.0001);
  vec3 blendedColor = mix(secondColor, topColor, smoothstep(0.3, 0.7, blendFactor));
  
  // Output with slight transparency for layering
  outColor = vec4(blendedColor, 0.7);
}
```

**Key points:**
- Loop over all 60 stars per-pixel (expensive but GPU-parallel).[^1]
- Fetch star positions and faction data from a texture uniform (or use structured buffers in WebGL 2).[^7]
- Compute influence using the selected falloff function.
- Track top 2 influences to enable smooth blending at boundaries.
- Smooth transition between colors using `smoothstep` for anti-aliased edges.[^5]

### 4. Passing Star Data to GPU

Pack stars into a texture for efficient access:

```javascript
// CPU side: prepare star data
let starTexture = PIXI.Texture.from(new Uint8Array(60 * 4 * 4)); // 60 stars, 4 floats each
let starData = new Float32Array(60 * 4);

stars.forEach((star, i) => {
  starData[i * 4 + 0] = star.x;              // position x
  starData[i * 4 + 1] = star.y;              // position y
  starData[i * 4 + 2] = factionIndexMap[star.faction]; // faction id
  starData[i * 4 + 3] = star.strength;       // influence strength
});

// Upload to GPU as texture
let starDataTexture = pixiApp.renderer.texture.upload(starData, 60, 1);
shader.uniforms.u_starData = starDataTexture;
```

### 5. Tunable Visual Parameters

Expose sliders for real-time tweaking:

```javascript
let params = $state({
  influenceRadius: 80,
  falloffCurve: 'inverse-square',
  blendSharpness: 3.0,
  gradientBias: 0.5,
});

$effect(() => {
  shader.uniforms.u_influenceRadius = params.influenceRadius;
  shader.uniforms.u_falloffType = {
    'inverse-square': 0,
    'gaussian': 1,
    'smoothstep': 2,
  }[params.falloffCurve];
  shader.uniforms.u_blendSharpness = params.blendSharpness;
  // Re-render framebuffer
  pixiApp.render();
});
```

## Performance Considerations

### GPU Cost Analysis

| Operation | Cost | Notes |
|-----------|------|-------|
| **Fragment shader cost per-pixel** | 60 × distance + influence + color lookup | ~60 ops/pixel, highly parallelizable |
| **800×600 canvas** | 480k pixels × 60 shader ops | ~29M ops per frame, **negligible** on modern GPU |
| **60 FPS** | 16.7ms per frame | GPU spends <0.5ms; GPU is idle most of the time |

**Verdict:** This is extremely efficient. The GPU loves this kind of parallel work; you can easily handle 60 stars at full resolution with headroom for other effects.[^1]

### CPU Cost Analysis

| Task | Cost | Trigger |
|------|------|---------|
| **Update star positions** | ~0.1ms | Per star move (not every frame) |
| **Pack stars into texture** | ~0.5ms | On star change only |
| **Update shader uniforms** | <0.1ms | Per-frame if params change |
| **SVG/Voronoi comparison** | This approach costs almost nothing | N/A |

**Verdict:** CPU is basically idle. Svelte's fine-grained reactivity handles reactive updates without re-rendering the entire scene.[^8]

### Memory Usage

- Star texture: 60 × 4 floats = 960 bytes
- Framebuffer: 800×600×4 bytes = 1.9 MB
- **Total:** ~2 MB (negligible)

### Key Optimization: Loop Unrolling

If you want extreme performance, you can **unroll the star loop** in the shader (generate shader source code dynamically with exactly 60 iterations rather than a loop). This avoids loop overhead and enables compiler optimizations. For 60 stars, a `for (int i = 0; i < 60; i++)` loop is usually compiled away by the GPU driver anyway.[^1]

## Implementation Strategy

### Phase 1: Basic Metaball Rendering

1. Set up Pixi app with WebGL.
2. Create fullscreen quad geometry and custom fragment shader.
3. Render influence fields for 2–3 factions.
4. Verify smooth blending and visual quality.

### Phase 2: Star Dynamics

1. Hook up Svelte state to shader uniforms.
2. Update star texture each frame when positions change.
3. Test smooth transitions as stars move.

### Phase 3: Tunable Parameters

1. Add debug UI sliders: influence radius, falloff curve, blend sharpness.
2. Expose gradient bias to control soft vs. hard borders.
3. Real-time feedback via `$effect` reactivity.

### Phase 4: Polish & Interactivity

1. Add faction labels/icons rendered over top layer.
2. Optional: Animate territory border thickness/glow.
3. Optional: Layer multiple territory passes for enhanced depth (e.g., territorial control % overlay).

## Advanced Techniques

### Smooth Union / Max Blending

The basic `max()` gives hard boundaries. For smoother transitions, use **smooth maximum**:[^4][^5]

```glsl
// Smooth maximum (higher k = sharper blend)
float smoothMax(float a, float b, float k) {
  return max(a, b) + log(exp(k * (a - max(a, b))) + exp(k * (b - max(a, b)))) / k;
}
```

This is used in SDF blending and produces beautiful smooth unions between shapes.[^5][^4]

### Distance-to-Boundary Overlay

Render an additional pass that computes distance from each pixel to the nearest territorial boundary, for optional border visualization or glow effects.[^2]

### Animated Transitions

When a star moves, interpolate its position in the shader over N frames using `mix()`. This creates smooth territorial shift animations without recomputing the field structure.[^1]

## Code Sketch: Minimal Metaball Example

```svelte
<script>
  import { onMount } from 'svelte';
  import * as PIXI from 'pixi.js';

  let canvasContainer;
  let pixiApp;
  let shader;

  let stars = $state.frozen([
    { id: 's0', x: 150, y: 200, faction: 'red', strength: 1.0 },
    { id: 's1', x: 400, y: 350, faction: 'blue', strength: 1.2 },
    // ... 58 more
  ]);

  let params = $state({
    influenceRadius: 80,
    falloffType: 0, // 0 = inverse-square
    blendSharpness: 3.0,
  });

  const factionMap = { red: 0, blue: 1, green: 2, yellow: 3 };
  const colorMap = {
    0: [1.0, 0.2, 0.2],
    1: [0.2, 0.5, 1.0],
    2: [0.2, 1.0, 0.2],
    3: [1.0, 1.0, 0.2],
  };

  $effect(() => {
    if (!shader) return;
    
    // Pack stars into texture data
    let starData = new Float32Array(60 * 4);
    stars.forEach((star, i) => {
      starData[i * 4] = star.x;
      starData[i * 4 + 1] = star.y;
      starData[i * 4 + 2] = factionMap[star.faction];
      starData[i * 4 + 3] = star.strength;
    });
    
    // Update uniforms
    shader.uniforms.u_influenceRadius = params.influenceRadius;
    shader.uniforms.u_falloffType = params.falloffType;
    shader.uniforms.u_blendSharpness = params.blendSharpness;
    shader.uniforms.u_numStars = stars.length;
    
    // Re-render
    pixiApp.render();
  });

  onMount(async () => {
    pixiApp = new PIXI.Application({
      width: 800,
      height: 600,
      antialias: true,
    });
    canvasContainer.appendChild(pixiApp.canvas);

    // Create fullscreen quad
    const quad = new PIXI.Mesh(
      PIXI.Geometry.from({ positions: [-1, -1, 1, -1, 1, 1, -1, 1] }),
      new PIXI.MeshMaterial(PIXI.Shader.from(
        // Vertex shader
        `
        varying vec2 v_texCoord;
        void main() {
          gl_Position = vec4(aVertexPosition, 0.0, 1.0);
          v_texCoord = (aVertexPosition + 1.0) * 0.5;
        }
        `,
        // Fragment shader (metaball influence field)
        `
        precision highp float;
        uniform float u_influenceRadius;
        uniform int u_falloffType;
        uniform int u_numStars;
        // ... (shader code from Phase 3 above)
        `
      ))
    );

    pixiApp.stage.addChild(quad);
    shader = quad.shader;
  });
</script>

<div bind:this={canvasContainer}></div>

<div class="controls">
  abel>
    Influence Radius:
    <input type="range" min="20" max="200" bind:value={params.influenceRadius} />
  </label>
  abel>
    Falloff:
    <select bind:value={params.falloffType}>
      <option value={0}>Inverse Square</option>
      <option value={1}>Gaussian</option>
      <option value={2}>Smoothstep</option>
    </select>
  </label>
  abel>
    Blend Sharpness:
    <input type="range" min="0.5" max="5" step="0.1" bind:value={params.blendSharpness} />
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
    font-family: monospace;
    font-size: 12px;
  }
  label {
    display: block;
    margin-bottom: 8px;
  }
  input, select {
    margin-left: 8px;
  }
</style>
```

## Advantages Over Voronoi for Your Use Case

| Aspect | Voronoi | Metaballs |
|--------|---------|-----------|
| **Visual polish** | Angular, requires post-smoothing | Naturally smooth, organic feel |
| **Gradient blending** | Requires extra blending pass | Built-in per-pixel interpolation |
| **Tuning complexity** | Chaikin smoothing, blend radius | Single shader tweaks (radius, falloff, blend sharpness) |
| **Performance** | CPU: Voronoi compute + smoothing; GPU: polygon fill | GPU-driven; CPU idle |
| **Artistic control** | Limited flexibility | High: falloff curve, influence overlap, smooth max blending |
| **Scalability (60+ territories)** | Scales fine; polygon rendering batched | Scales beautifully; GPU loves parallel shading |

## Next Steps

1. **Prototype the shader:** Get a 3-faction metaball demo working to verify visual quality.
2. **Wire Svelte state:** Confirm reactive updates trigger shader re-renders smoothly.
3. **Expose tuning UI:** Build sliders for influence radius, falloff, and blend sharpness.
4. **Optimize if needed:** Profile GPU usage; typically you'll be GPU-idle with headroom for other effects.
5. **Advanced:** Implement smooth union blending, distance-field borders, or animated transitions.

## References

- GPU Gems 3, Chapter 7: Point-based visualization of metaballs on GPU[^1]
- Signed distance fields overview (Voxel Tools documentation)[^2]
- Smooth SDF blending and composition techniques[^3][^4][^5]
- WebGL multiple texture sampling[^7]
- Jamie Wong's "Metaballs and WebGL" walkthrough[^9]

---

## References

1. [Chapter 7. Point-Based Visualization of Metaballs on a GPU](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-7-point-based-visualization-metaballs-gpu) - In this chapter we present a technique for rendering metaballs on state-of-the-art graphics processo...

2. [Smooth terrains - Voxel Tools documentation](https://voxel-tools.readthedocs.io/en/latest/smooth_terrain/) - For any point in space, a signed distance field (SDF) is a distance to the closest surface. It is "s...

3. [SDFs - Max Mainio Beidler](https://maxmain.io/touchdesigner-components/tops/signed-distance-fields/) - Boolean & Smooth Shape Composition​​ These components provide methods for combining two Signed Dista...

4. [Complex Signed Distance Fields In Blender](https://www.youtube.com/watch?v=72crCbY7ZLk) - This is the second episode in a series of tutorials discussing Signed Distance Fields (SDFs) and the...

5. [Combining Signed Distance Fields - Procedural Shapes and Patterns - Episode 3](https://www.youtube.com/watch?v=R_5CTBgkfZ0) - In this video, I show how to create an animated lava lamp effect by combining two circle signed dist...

6. [Performance of accessing deeply reactive state · Issue #11851 · sveltejs/svelte](https://github.com/sveltejs/svelte/issues/11851) - Describe the bug Context Our libraries state is an array of objects. The deepest nesting level is ma...

7. [WebGL Using 2 or More Textures](https://webglfundamentals.org/webgl/lessons/webgl-2-textures.html) - We need to create 2 WebGL texture objects. WebGL has something called "texture units". You can think...

8. [Fine-Grained Reactivity in Svelte 5 – Frontend Masters Blog](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/) - Svelte is already quite lightweight and fast, but Svelte 5 still overs big improvements in fine-grai...

9. [Metaballs and WebGL](https://jamie-wong.com/2016/07/06/metaballs-and-webgl/)

