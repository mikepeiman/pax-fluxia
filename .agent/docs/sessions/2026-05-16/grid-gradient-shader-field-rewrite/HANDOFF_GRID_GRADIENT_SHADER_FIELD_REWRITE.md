# Grid Gradient Shader Field Rewrite Handoff

## Purpose

This handoff package turns Grid Gradient from a dense Pixi `Graphics` mark renderer into a shader-field rendering backend that packs grid ownership and transition data into textures and reconstructs the stippled field in the fragment shader.

The goal is to preserve the visual premise of Grid Gradient while removing the structural performance problems caused by per-cell draw commands, repeated circle tessellation, recurring batch rebuilds, repeated GPU buffer uploads, and avoidable per-frame rebuilds.

## Scope

This package provides:

- a shader-field backend architecture
- patch-ready TypeScript modules for the new backend
- a replacement-style `GridGradientFamily` implementation draft
- config/settings/stat patch fragments
- shader source strings
- texture packing utilities
- a focused test for texture packing
- integration notes and acceptance checks

This package does not claim live validation. It has not been compiled or run against the full repository. It is designed for an in-project agent to patch into the real tree, adapt Pixi v8 shader construction if required, run build/tests, and iterate from there.

## Limitations

1. The code bundle is generated from the uploaded external-agent source packet and not from a live checked-out repository.
2. The exact Pixi v8 custom shader construction may need adapter adjustment inside `GridGradientShaderFieldRenderer.ts`.
3. The package intentionally keeps the old `graphics` backend available as a fallback.
4. Worker-based planning and scanline raster classification are not fully implemented in this package. They are specified as the next implementation sprint after shader-field presentation is wired.
5. The replacement `GridGradientFamily.shaderField.rewrite.ts` is intended as a patch template. It should be copied into the real file, reconciled with local imports, and compiled.

## Strategic Decision

Pursue `shader_field` as the best long-term Grid Gradient implementation.

The current visual concept is good: a world-anchored grid of marks, with larger marks in region interiors and smaller marks near borders, plus transition timing per cell. That data model is naturally shader-friendly. It does not need individual display objects per cell.

The shader-field backend should become the default backend, while `graphics` remains as a temporary fallback.

```ts
type GridGradientDrawBackend = 'graphics' | 'shader_field' | 'mesh_quads';
```

Recommended initial default:

```ts
GRID_GRADIENT_DRAW_BACKEND = 'shader_field'
GRID_GRADIENT_SHADER_NEIGHBOR_MODE = 'eight'
```

`eight` neighbor mode is important because current defaults allow center marks larger than cell spacing. A shader that shades only the current cell would clip overlapping marks at cell boundaries. The 3x3 neighbor sample preserves the current stippled look.

## Files in This Package

```text
HANDOFF_GRID_GRADIENT_SHADER_FIELD_REWRITE.md

src/lib/territory/families/gridGradient/
├─ GridGradientFamily.shaderField.rewrite.ts
├─ config.shaderField.patch.ts
├─ settings.shaderField.patch.ts
├─ gridGradientStats.shaderField.patch.ts
└─ shaderField/
   ├─ GridGradientShaderFieldRenderer.ts
   ├─ gridGradientShaderFieldPacking.ts
   ├─ gridGradientShaderFieldShaders.ts
   ├─ gridGradientShaderFieldTypes.ts
   └─ index.ts

tests/
└─ gridGradientShaderFieldPacking.test.ts
```

## Integration Steps

### Step 1: Add new shaderField directory

Copy this directory into the real project:

```text
src/lib/territory/families/gridGradient/shaderField/
```

Expected new exports:

```ts
export * from './GridGradientShaderFieldRenderer';
export * from './gridGradientShaderFieldPacking';
export * from './gridGradientShaderFieldShaders';
export * from './gridGradientShaderFieldTypes';
```

### Step 2: Patch config

Open:

```text
src/lib/territory/families/gridGradient/config.ts
```

Add:

```ts
export type GridGradientDrawBackend = 'graphics' | 'shader_field' | 'mesh_quads';
export type GridGradientShaderNeighborMode = 'center' | 'cross' | 'eight';
export type GridGradientShaderDebugMode =
    | 'off'
    | 'cell_grid'
    | 'owner_index'
    | 'distance_band'
    | 'flip_time'
    | 'role';
```

Append these defaults to `gridGradientFamilyConfigDefaults`:

```ts
GRID_GRADIENT_DRAW_BACKEND: 'shader_field',
GRID_GRADIENT_SHADER_NEIGHBOR_MODE: 'eight',
GRID_GRADIENT_SHADER_RESOLUTION_SCALE: 1,
GRID_GRADIENT_SHADER_MARK_SOFTNESS: 0.18,
GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX: 0.85,
GRID_GRADIENT_SHADER_NOISE_STRENGTH: 0.35,
GRID_GRADIENT_SHADER_PULSE_STRENGTH: 0.06,
GRID_GRADIENT_SHADER_PULSE_SPEED: 3.0,
GRID_GRADIENT_SHADER_FIELD_DRIFT_PX: 0,
GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED: 0.25,
GRID_GRADIENT_SHADER_GLOW_STRENGTH: 0.08,
GRID_GRADIENT_SHADER_BLUR_STRENGTH: 0,
GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST: 1,
GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST: 0.88,
GRID_GRADIENT_SHADER_COLOR_MIX_POWER: 1,
GRID_GRADIENT_SHADER_DEBUG_MODE: 'off',
```

### Step 3: Patch settings resolver

Open:

```text
src/lib/territory/families/gridGradient/settings.ts
```

Add the new config keys to `GRID_GRADIENT_TUNABLE_KEYS`.

Add fields to `GridGradientSettings`:

```ts
readonly drawBackend: GridGradientDrawBackend;
readonly shaderNeighborMode: GridGradientShaderNeighborMode;
readonly shaderResolutionScale: number;
readonly shaderMarkSoftness: number;
readonly shaderEdgeSoftnessPx: number;
readonly shaderNoiseStrength: number;
readonly shaderPulseStrength: number;
readonly shaderPulseSpeed: number;
readonly shaderFieldDriftPx: number;
readonly shaderFieldDriftSpeed: number;
readonly shaderGlowStrength: number;
readonly shaderBlurStrength: number;
readonly shaderInteriorAlphaBoost: number;
readonly shaderEdgeAlphaBoost: number;
readonly shaderColorMixPower: number;
readonly shaderDebugMode: GridGradientShaderDebugMode;
```

Resolve those fields in `resolveGridGradientSettings()` using the same `readTunableNumber`, `readTunableString`, and `clamp` helpers already present in the file.

### Step 4: Patch stats

Open:

```text
src/lib/territory/families/gridGradient/gridGradientStats.ts
```

Add fields:

```ts
readonly drawBackend: 'graphics' | 'shader_field' | 'mesh_quads';
readonly planCacheHit: boolean;
readonly planRebuildReason: string | null;
readonly presentationCacheHit: boolean;
readonly presentationRebuildReason: string | null;
readonly textureUploaded: boolean;
readonly textureUploadMs: number;
readonly texturePackMs: number;
readonly distanceBuildMs: number;
readonly ownerSummaryBuildMs: number;
readonly uniformUpdateMs: number;
readonly ownerTextureBytes: number;
readonly metricsTextureBytes: number;
readonly paletteTextureBytes: number;
readonly textureBytes: number;
readonly activeTransitionCells: number;
readonly outsideCells: number;
readonly shaderNeighborMode: string;
readonly shaderDebugMode: string;
```

Initialize them with safe defaults in `INITIAL`.

### Step 5: Replace or patch GridGradientFamily

Use:

```text
GridGradientFamily.shaderField.rewrite.ts
```

as the replacement template for:

```text
src/lib/territory/families/gridGradient/GridGradientFamily.ts
```

Important behavior changes:

```text
Old path:
  one Graphics object
  clear every update
  loop scene.cells
  graphics.circle/rect/poly().fill()
  draw vector borders into same Graphics

New path:
  shader-field renderer draws fill as one field mesh
  vector borders draw separately and only rebuild on signature changes
  border dots draw separately and only rebuild on signature changes
  graphics backend remains available as fallback
```

### Step 6: Patch diagnostics UI

Open:

```text
src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte
```

Add rows under Grid Gradient diagnostics:

```text
Backend
Plan Cache
Presentation Cache
Texture Upload
Texture Bytes
Shader Neighbor Mode
Shader Debug Mode
Active Transition Cells
Outside Cells
Distance Build
Texture Pack
Uniform Update
```

The important debugging rows are:

```text
Backend: shader_field
Plan: hit/miss + reason
Presentation: hit/miss + reason
Texture: uploaded yes/no + ms + bytes
Frame: update ms / EMA
```

### Step 7: Patch tuning UI

Open:

```text
src/lib/components/ui/settings/GridGradientTuning.svelte
```

Add a `Backend` section above `Grid Fill`:

```text
Draw Backend: graphics / shader_field / mesh_quads
Neighbor Mode: center / cross / eight
Shader Debug: off / cell_grid / owner_index / distance_band / flip_time / role
```

Add an `Shader Field FX` section:

```text
Mark Softness
Edge Softness
Noise Strength
Pulse Strength
Pulse Speed
Field Drift
Glow Strength
Interior Alpha Boost
Edge Alpha Boost
Color Mix Power
```

Keep the existing grid fill controls because they remain meaningful:

```text
Grid Spacing
Max Cells
Shape
Center Size
Edge Size
Gradient Curve
Border Offset
Position Jitter
Vector Borders
Border Dots
```

### Step 8: Patch game config metadata

Open:

```text
src/lib/config/game.config.ts
src/lib/components/ui/settingsDefs.ts
src/lib/components/ui/settings/settingMetadata.ts
src/lib/config/categoryThemes.ts
```

Add corresponding config keys and metadata labels.

### Step 9: Add focused tests

Copy:

```text
tests/gridGradientShaderFieldPacking.test.ts
```

into the closest existing Grid Gradient test location, likely:

```text
src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts
```

Run focused tests before broader build.

## Intended Runtime Behavior

### Steady frame

```text
- no plan rebuild
- no classification rebuild
- no distance field rebuild
- no Graphics fill rebuild
- no circle triangulation
- no dense GPU bufferSubData from fill marks
- uniforms update only
```

### Plan change frame

```text
- build plan if plan key changes
- build texture plan if presentation key changes
- upload owner/metrics/palette textures once
- retain shader mesh
```

### Transition frame

```text
- update progress uniform
- shader blends prev/next owner per cell
- no full per-cell redraw
```

### Visual setting change

```text
- change uniforms when possible
- rebuild packed textures only when texture-dependent settings change
- avoid full plan rebuild when classification truth is unchanged
```

## Core Architecture

```text
GridGradientFamily
├─ shaderFieldRenderer.container
├─ legacyGraphics
├─ borderDotGraphics
└─ vectorBorderGraphics
```

Shader field path:

```text
GridGradientFamily.update
├─ resolve settings
├─ resolve plan
├─ build palette
├─ resolve shader texture plan
│  ├─ owner texture
│  ├─ metrics texture
│  └─ palette texture
├─ update shader field renderer
├─ draw/reuse vector borders
├─ draw/reuse border dots if enabled
└─ update diagnostics
```

## Texture Packing

### Owner texture

RGBA8 texture, one pixel per grid cell:

```text
R = previous owner low byte
G = previous owner high byte
B = next owner low byte
A = next owner high byte
```

Owner palette index `0` is reserved for transparent outside/null owner. Real owner palette indices start at `1`.

### Metrics texture

RGBA8 texture, one pixel per grid cell:

```text
R = normalized distance band
G = transition flip time
B = role byte
A = deterministic noise seed
```

Role bytes:

```text
0 = outside
1 = native
2 = dispossessed
3 = emergent
4 = vacating
```

### Palette texture

One-row RGBA8 texture:

```text
pixel 0 = transparent outside/null owner
pixel N = owner fill color with alpha
```

## Shader Sampling

The shader reconstructs marks directly from grid data.

```text
world position
→ grid cell coordinate
→ sample current cell and neighbors
→ unpack prev/next owner
→ sample distance/flip/role/noise
→ compute mark size
→ compute shape mask
→ blend prev/next owner by transition progress
→ alpha-over mark contribution
```

Neighbor modes:

```text
center = current cell only
cross  = current + cardinal neighbors
eight  = current + all 8 surrounding neighbors
```

Use `eight` by default because marks can be larger than grid spacing.

## Visual Tuning Axes

### Existing axes preserved

```text
Spacing
Max Cells
Distribution
Position Jitter
Center Size
Edge Size
Curve Power
Border Offset
Cell Shape
Vector Borders
Border Dots
Border Dot Size
Border Dot Style
Fill Alpha
Fill Saturation
Fill Lightness
Border Width
Border Alpha
```

### New shader axes

```text
Draw Backend
Shader Neighbor Mode
Shader Mark Softness
Shader Edge Softness
Shader Noise Strength
Shader Pulse Strength
Shader Pulse Speed
Shader Field Drift
Shader Field Drift Speed
Shader Glow Strength
Shader Blur Strength
Shader Interior Alpha Boost
Shader Edge Alpha Boost
Shader Color Mix Power
Shader Debug Mode
```

### Future axes

```text
Shape Blend
Hex distribution display
Owner gradient mode
Frontier heat
Pressure modulation
Tick-locked phase waves
Blur pass after field composite
Bloom pass after field composite
Cell-grid LOD by zoom
Texture plan worker
Scanline raster classification
```

## Sub-Agent Workstreams Executed as Design Synthesis

### Workstream A: Performance triage

Conclusion:

```text
The dense Graphics fill path is the main structural problem.
Classification is also expensive, but presentation must be replaced to make 6px viable.
```

Action taken:

```text
Added shader_field backend architecture.
Kept graphics backend as fallback.
Split vector borders and border dots from fill rendering.
Added cache-hit and rebuild-reason diagnostics.
```

### Workstream B: Shader field architecture

Conclusion:

```text
One shader field mesh can replace tens of thousands of Pixi Graphics primitives.
Owner and metrics textures are the right bridge from CPU truth to GPU presentation.
```

Action taken:

```text
Added texture packing module.
Added shader source.
Added shader-field renderer.
Added 3x3 neighbor sampling support.
```

### Workstream C: Settings and tuning

Conclusion:

```text
The mode needs rich tuning but must separate gameplay truth from presentation.
```

Action taken:

```text
Added draw backend, neighbor mode, debug mode, softness, noise, pulse, drift, glow, alpha boost, and color tuning keys.
```

### Workstream D: Integration and diagnostics

Conclusion:

```text
The mode needs proof of why it rebuilt and what backend is active.
```

Action taken:

```text
Defined plan cache, presentation cache, texture upload, texture size, backend, and shader diagnostics.
```

### Workstream E: Patch-risk analysis

Conclusion:

```text
Exact Pixi v8 shader construction may need local adaptation.
```

Action taken:

```text
Concentrated that risk into GridGradientShaderFieldRenderer.ts so the patch agent can fix one adapter point without changing the whole mode architecture.
```

## Known Patch-Risk Areas

### Pixi shader construction

`GridGradientShaderFieldRenderer.ts` attempts multiple shader construction paths. If the app’s Pixi v8 build requires a different API, patch this helper only:

```ts
function createShader(uniforms: Record<string, unknown>): PIXI.Shader
```

### Uniform updates

If Pixi v8 stores uniforms in a resource group rather than `shader.uniforms`, patch this helper only:

```ts
function setShaderUniform(shader: PIXI.Shader | null, key: string, value: unknown): void
```

### Texture creation

If `Texture.fromBuffer` is not available, patch this helper only:

```ts
function createBufferTexture(data: Uint8Array, width: number, height: number): PIXI.Texture
```

### Stats typing

The replacement family currently casts extended stats as `never` in the `updateGridGradientStats` patch call. This should be removed after the `GridGradientStats` interface is extended.

### Settings interface

The replacement family safely casts settings to extended settings. Once the real `GridGradientSettings` interface is patched, that cast can remain harmless or be narrowed.

## Acceptance Criteria

### Build-level

```text
- TypeScript compiles.
- Existing Grid Gradient tests pass.
- New texture-packing test passes.
- App launches.
- Grid Gradient mode remains selectable.
- Graphics backend fallback still renders.
```

### Runtime diagnostics

```text
Backend: shader_field
Plan Cache: hit after warm-up
Presentation Cache: hit after warm-up
Texture Upload: no on steady frames
Frame: update ms and EMA visible
Cells: total/emittable/painted still visible
Renderer: webgl/webgpu/canvas/unknown still visible
```

### Performance

```text
- drawGridGradientCell absent from shader_field steady frames.
- circle triangulate absent from shader_field fill path.
- buildContextBatches no longer dominated by Grid Gradient fill marks.
- updateGpuContext no longer dominated by Grid Gradient fill marks.
- pointInPolygon may remain until scanline phase, but no longer combines with Graphics fill rebuilds on every steady frame.
- steady 6px frames should become dramatically calmer.
```

### Visual

```text
- 6px density remains attractive.
- center marks remain larger than edge marks.
- vector borders remain readable by default.
- ownership color remains clear.
- transition blend remains visible.
- active map remains playable.
```

## Next Sprint After This Package

This package focuses on shader-field presentation. The next sprint should target classification and planning.

### Sprint 2: Scanline raster classification

Deliverables:

```text
buildGridGradientRasterClassification.ts
scanlinePolygonFill.ts
typed owner arrays
old classifier parity tests
pointInPolygon fallback only
```

Target:

```text
pointInPolygon absent from normal Grid Gradient profile.
```

### Sprint 3: Worker plan generation

Deliverables:

```text
GridGradientPlanWorker.ts
worker request/response types
main-thread stale-response guard
last-valid-plan rendering while pending
```

Target:

```text
no 90ms buildGridGradientPlan block on animation frame.
```

### Sprint 4: Final shader polish

Deliverables:

```text
proper blur/glow pass if desired
field animation presets
tick-locked pulse controls
zoom-aware LOD option
presentation presets for themes
```

Target:

```text
Grid Gradient becomes a high-quality visual mode with selectable performance tiers.
```

## Recommended Commit Sequence

```text
1. Add shaderField modules and tests.
2. Add config/settings/stat keys.
3. Patch GridGradientFamily with backend switch.
4. Patch diagnostics UI.
5. Patch tuning UI.
6. Run focused tests.
7. Run app build.
8. Profile graphics backend unchanged.
9. Profile shader_field backend at 16px, 12px, 8px, 6px.
10. Tune defaults.
```

## Final Integration Note

The key is not merely “add a shader.” The key is to stop treating every grid sample as a Pixi display object. The shader-field backend turns Grid Gradient into the thing it naturally wants to be: a compact data texture plus a single visual field, animated by uniforms.
