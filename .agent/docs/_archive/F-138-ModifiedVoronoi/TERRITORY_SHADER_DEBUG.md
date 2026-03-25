# Territory Shader Alignment — Complete Debug Context

> **Purpose**: Full context dump for debugging the distance-field territory renderer's shader alignment with star positions, and zoom/pan tracking. Use this to recruit help.
> **Date**: 2026-03-04
> **Status**: BROKEN — dots render but don't correctly align or follow zoom

---

## 1. Problem Statement

The territory renderer uses a custom WebGL shader (GLSL) to render territory overlays aligned with star positions. The shader must:
1. Render diagnostic dots at the EXACT world-space coordinates of each star
2. Follow zoom (scroll wheel) — dots must scale/move with stars
3. Follow pan (drag) — dots must stay fixed relative to stars
4. Follow viewport resize — stable on window resize

**Current symptom (Filter approach)**: Dots appeared "nearly aligned" at max zoom-out but drifted when zooming in. The "yellowstar map" stopped updating while the actual game map continued zooming.

**Current symptom (Mesh approach)**: Nothing renders at all.

---

## 2. Architecture Overview

- **Engine**: PIXI.js v8 (WebGL2 renderer)
- **Container hierarchy**: `app.stage` → `voronoiContainer` → territory element
- **Game world**: ~1774×999 world units, with 200px padding on all sides (configurable via `GAME_CONFIG.DF_EDGE_FADE`)
- **Star data**: Encoded into a 64×4 RGBA8 data texture (`starDataTexture`). Row 0 = positions (16-bit encoded x,y per star).
- **Star position encoding**: `x → [xh, xl] = [floor(x) >> 8, floor(x) & 0xFF]`, stored in R,G channels. Y in B,A.
- **Shader decodes**: `sx = floor(posRaw.r * 255.0 + 0.5) * 256.0 + floor(posRaw.g * 255.0 + 0.5)` — confirmed correct via console logging.

### File
`pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`

---

## 3. Approaches Tried

### Approach 1: PIXI Filter + Custom uVtcScale (PARTIALLY WORKED)
- Used `PIXI.Filter` applied to a `PIXI.Sprite` (Texture.WHITE, sized to world+padding)
- Fragment shader had `uniform vec2 uVtcScale` computed on JS side as `spritePixelSize / nextPow2(spritePixelSize)`
- **Result**: Dots appeared at "nearly aligned" positions (~10% error), but did NOT follow zoom

### Approach 2: PIXI Filter + Built-in uInputSize/uOutputFrame (FAILED)
- Replaced custom uVtcScale with PIXI's built-in filter uniforms
- Fragment shader: `vec2 vtcScale = uOutputFrame.zw * uInputSize.zw; normalizedPos = vTextureCoord / vtcScale;`
- **Result**: Same as Approach 1 — dots nearly aligned but not following zoom

### Approach 3: PIXI Mesh with Custom Shader (FAILED — NOTHING RENDERS)
- Replaced Filter+Sprite with PIXI.Mesh (quad geometry in world space, UVs 0→1)
- Custom vertex shader using PIXI-injected `uProjectionMatrix` and `uTransformMatrix`
- **Result**: Nothing renders at all. Mesh likely has shader binding issues.

---

## 4. Root Cause Analysis

### Why Filter approach doesn't follow zoom:
The filter IS re-applied every frame by PIXI's FilterSystem. The VTC normalization should give correct world coordinates regardless of zoom. BUT:

1. **Possible**: `uInputSize`/`uOutputFrame` may not be correctly received by standalone uniform declarations in the fragment shader. Even though FilterSystem uses non-UBO `UniformGroup` in WebGL, there could be a name-matching issue.
2. **Possible**: The sprite's filters are NOT re-rendered because the `renderDistanceFieldTerritory` function returns early (`needsUpdate=false`) when nothing changes except zoom. BUT filters should still re-render via PIXI's render loop.
3. **Possible**: The render target size caps at WebGL's MAX_TEXTURE_SIZE, causing the filter to "freeze" at a particular zoom level.

### Why Mesh approach renders nothing:
Identified root cause: **`_uniformBindMap` is empty**.

PIXI's `generateShaderSyncCode` (line 49-64) needs `shader._uniformBindMap[groupIndex][resourceIndex]` to find the uniform name for `TextureSource` resources. Since we construct `PIXI.Shader` without providing `uniformBindMap`, it defaults to `{}`. The `uStarData` texture source never gets bound to the `uStarData` sampler uniform.

For `UniformGroup` resources (non-UBO), the sync code at line 36-38 calls `updateUniformGroup` which matches by NAME — so this should work. But textures require the bind map.

---

## 5. PIXI v8 Internals — Key Findings

### Global Uniforms (Group 100) — set by `GlMeshAdaptor.execute`
```js
shader.groups[100] = renderer.globalUniforms.bindGroup;
```
Contains (`GlobalUniformSystem._createUniforms`):
- `uProjectionMatrix` (mat3x3) — viewport clip transform
- `uWorldTransformMatrix` (mat3x3) — GLOBAL world transform (NOT per-mesh!)
- `uWorldColorAlpha` (vec4) — tint
- `uResolution` (vec2) — viewport pixel size

### Local Uniforms (Group 101) — set by `GlMeshAdaptor.execute`
```js
shader.groups[101] = meshPipe.localUniformsBindGroup;
```
Contains (`localUniformBitGl`):
- `uTransformMatrix` (mat3) — per-mesh world transform
- `uColor` (vec4) — mesh color/alpha
- `uRound` (float) — pixel rounding flag

### Shader Sync Code (`GenerateShaderSyncCode.mjs`)
Iterates `shader.groups`, for each resource:
- `UniformGroup` (non-UBO): calls `updateUniformGroup(resource, programData)` — matches by NAME ✓
- `UniformGroup` (UBO): requires `_uniformBindMap` for block name
- `TextureSource`: requires `_uniformBindMap[group][resourceIndex]` for sampler name — **FAILS without bind map**
- `BufferResource`: requires `_uniformBindMap` for block name

### Filter Pipeline (not used in current Mesh approach)
`FilterSystem` pushes its own render target, sets `_filterGlobalUniforms` (group 0), and overrides shader groups. The filter vertex shader positions the quad in NDC space (no container transform!). This is why filters are screen-space, NOT world-space.

---

## 6. Current Code State (Mesh Approach)

### Vertex Shader
```glsl
precision highp float;
in vec2 aPosition;    // world-space quad corners
in vec2 aUV;          // 0→1 across quad
out vec2 vUV;

uniform mat3 uProjectionMatrix;   // from group 100
uniform mat3 uTransformMatrix;    // from group 101
uniform vec4 uColor;
uniform float uRound;
uniform vec2 uResolution;

void main() {
    vUV = aUV;
    mat3 mvp = uProjectionMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
```

### Fragment Shader
```glsl
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uStarData;
uniform int uNumStars;
uniform float uWorldWidth, uWorldHeight, uPadding;
// ... other territory uniforms ...

void main() {
    float totalW = uWorldWidth + uPadding * 2.0;
    float totalH = uWorldHeight + uPadding * 2.0;
    vec2 worldPos = vUV * vec2(totalW, totalH) - vec2(uPadding);
    
    // Decode star positions from texture and compute distance...
}
```

### Geometry (World Space)
```typescript
aPosition: [-padding, -padding,  ww+padding, -padding,  ww+padding, wh+padding,  -padding, wh+padding]
aUV:       [0,0,  1,0,  1,1,  0,1]
indexBuffer: [0,1,2, 0,2,3]
```

### Shader Construction
```typescript
cachedMeshShader = new PIXI.Shader({
    glProgram: GlProgram.from({ vertex: VERT_SHADER, fragment: FRAG_SHADER }),
    resources: {
        territoryUniforms: { /* uNumStars, uWorldWidth, ... */ },
        uStarData: starDataTexture?.source,
    },
    // NOTE: No uniformBindMap provided! This is likely the bug for texture binding.
});
```

---

## 7. Fix Plan

### Fix for Mesh approach:
1. **Provide `uniformBindMap`** when constructing the Shader — this maps group/resource indices to GLSL uniform sampler names, enabling TextureSource binding.
2. **OR** use PIXI's built-in resource mapping by examining how `Shader` constructor builds `_uniformBindMap` from the `resources` option.

### Alternative: Revert to Filter approach and fix zoom:
Instead of relying on `uInputSize`/`uOutputFrame`, use `gl_FragCoord` and pass a custom screen-to-world transform:
```glsl
uniform vec2 uRenderTargetSize;  // set from JS
vec2 normalizedPos = gl_FragCoord.xy / uRenderTargetSize;
```
This bypasses all VTC normalization. But `gl_FragCoord` Y is flipped in WebGL.

### Nuclear option: Raw WebGL
Bypass PIXI entirely. Create a custom WebGL program, render a screen quad, pass all transforms as custom uniforms. Guaranteed to work since we control everything.

---

## 8. Key PIXI v8 Source Files

| File | Purpose |
|------|---------|
| `node_modules/pixi.js/lib/scene/mesh/shared/Mesh.mjs` | Mesh display object |
| `node_modules/pixi.js/lib/scene/mesh/gl/GlMeshAdaptor.mjs` | GL mesh rendering, injects groups 100/101 |
| `node_modules/pixi.js/lib/scene/mesh/shared/MeshPipe.mjs` | Mesh render pipe |
| `node_modules/pixi.js/lib/rendering/renderers/gl/shader/GenerateShaderSyncCode.mjs` | Shader sync code generation (uniform binding) |
| `node_modules/pixi.js/lib/rendering/renderers/shared/shader/Shader.mjs` | Shader class, resource/group mapping |
| `node_modules/pixi.js/lib/rendering/renderers/shared/renderTarget/GlobalUniformSystem.mjs` | Global projection/transform uniforms |
| `node_modules/pixi.js/lib/rendering/high-shader/shader-bits/localUniformBit.mjs` | Local transform uniform declarations |
| `node_modules/pixi.js/lib/rendering/high-shader/shader-bits/globalUniformsBit.mjs` | Global uniform declarations |
| `node_modules/pixi.js/lib/filters/FilterSystem.mjs` | Filter pipeline internals |
| `node_modules/pixi.js/lib/rendering/renderers/shared/texture/TexturePool.mjs` | nextPow2 render target allocation |

---

## 9. Console Logs Confirmed

Star encoding roundtrip verified correct:
```
[DF_DEBUG] Star0: actual=(194.3,313.2) bytes=[0,194,1,57] decoded=(194,313)
[DF_DEBUG] Star1: actual=(479.8,125.7) bytes=[1,223,0,125] decoded=(479,125)
```
The encoding/decoding is correct. The problem is purely in VTC/UV → world coordinate mapping and/or the shader receiving the correct transform.
