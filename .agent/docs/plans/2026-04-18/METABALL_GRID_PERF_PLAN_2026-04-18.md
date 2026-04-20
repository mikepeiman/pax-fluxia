# Metaball-Grid Performance & Tuning Plan — 2026-04-18

## Purpose (user's words, verbatim)

> "I need maximum tuning handles for this mode. How many vstars are we using? I need to control the distribution and amounts. It still lags hard at lower resolutions, and so on slower computers it won't be as smooth as I want even at chunky resolutions. Do some serious computer science performance work here. How fast can we get metaballs? Or, can we use a similar but different, high-performance distance field, bubble, physics library or something? Do research on this."

Status: **planning — implementation pending user direction.**

---

## 1. Current-State Audit

### 1.1 Vstar distribution

- Source: `buildGridClassification.ts:179-206`.
- Formula: `cols = ceil(world.width / spacingPx)`, `rows = ceil(world.height / spacingPx)`; cell center `(ix*spacing + offset, iy*spacing + offset)` with `offset = spacing/2` for `centered`, `0` for `origin`.
- **Only knob controlling count: `METABALL_GRID_SPACING_PX`.** Pure square grid. No jitter, no hex-offset positioning, no Poisson-disk, no density modulation.

### 1.2 Vstar counts at 1920×1080

| spacingPx | cols × rows | emittable cells |
|-----------|------------:|----------------:|
| 4         | 480 × 270   | ≤ 129,600 |
| 8         | 240 × 135   | ≤ 32,400  |
| 16        | 120 × 68    | ≤ 8,160   |
| 24        | 80 × 45     | ≤ 3,600   |
| 48        | 40 × 23     | ≤ 920     |

### 1.3 Per-frame + per-transition cost

- **Classification + wave plan** cached across frames via `transitionKey` (`MetaballGridFamily.ts:434-467`). Correct.
- **But scene cells are rebuilt and re-painted every frame** (`renderMetaballGridScene.ts:56-92`), even in steady state with no visual change. This is the paused-lag root cause.
- Per-cell PIXI ops: 2 (fill primitive + fill call) + 2 more if `per_cell` border stroke. Territory-edge borders route through the polyline pass (cheap, O(boundary edges)).

### 1.4 UI coverage

Every declared `METABALL_GRID_*` key in `game.config.ts` is already surfaced in `MetaballGridTuning.svelte`. No dead knobs. Missing tunables below are net-new.

---

## 2. Perf Trace Findings (2026-04-18)

Two user-captured DevTools traces.

### 2.1 16px spacing (~8,160 cells)

Bottom-up totals over ~16 s:

| Symbol | Self | Share | Where |
|---|---:|---:|---|
| `update` | 23.4 ms | 51.4 % total | `MetaballGridFamily.ts:434` |
| `buildPlanForTransition` | 0.1 ms | 37.9 % total | `MetaballGridFamily.ts:302` |
| `addRenderable` | 0.1 ms | 35.6 % total | `GraphicsPipe.ts:99` |
| `updateGpuContext` | 6.0 ms | 35.1 % total | `GraphicsContextSystem.ts:189` |
| `buildGridClassification` | **108.8 ms** | **29.0 % total** | `buildGridClassification.ts:162` |
| `triangulate` | 59.2 ms | 16.7 % total | `buildCircle.ts:167` |

Pattern: **classification + PIXI rendering stack are co-dominant.** Triangulation of circle/hex fills is visible.

### 2.2 4px spacing (~129,600 cells), 3-sec slice

| Symbol | Total | Share | Where |
|---|---:|---:|---|
| `buildPowerVoronoi0319RenderFamilyGeometry` | 25.7 ms | **45.8 %** | `buildFamilyGeometry.ts:245` |
| `computeGeometry0319` | 25.2 ms | **44.8 %** | `Geometry_0319.ts:114` |
| `update` | 24.5 ms | 43.7 % | `MetaballGridFamily.ts:434` |
| `updateGpuContext` | 10.0 ms | 17.8 % | `GraphicsContextSystem.ts:189` |
| `buildGridClassification` | 8.7 ms | 15.6 % | `buildGridClassification.ts:162` |
| `mergeSameOwnerCells` | 6.1 ms | 10.9 % | `powerVoronoiTerritoryGeometryGenerator.ts:431` |
| `triangulate` | 6.0 ms | 10.8 % | `buildCircle.ts:167` |

Pattern: **the underlayer Power-Voronoi rebuild dominates.** At dense spacings, each transition triggers a full PREV-geometry rebuild from reverted stars (`MetaballGridFamily.ts:310-319`), and this is the cliff — not per-frame paint.

### 2.3 Revised priority stack

Previously I believed steady-state paint was the primary cliff. The traces corrected that:

1. **At dense spacings: PREV-geometry rebuild per transition.** A known simplification flagged in `MetaballGridFamily.ts:16-26` ("future MG checkpoint can move truth capture upstream into `GameCanvas`"). That checkpoint is now blocking.
2. **At medium spacings: classification + rendering co-dominant.** Phase B (two-layer caching) addresses rendering; classification will be lifted with #1.
3. **Steady-state redundant repaint.** Cheap to fix (dirty-flag gate). Included in Phase A.

---

## 3. Research Summary (web-research pass, April 2026)

### 3.1 PixiJS 8 painting-throughput ranking (N cells/frame at 60 fps)

| Approach | Ceiling | Effort | Notes |
|---|---:|---:|---|
| Current `Graphics` per cell | ~5-8k | — | where we are |
| `ParticleContainer` (tinted unit quads) | 100-200k | 2-4h | v8 rewrote the API: declare `dynamicProperties` up front |
| Static RenderTexture + dirty-rect blit | 500k-1M | 1-2d | the correct architecture for "mostly static" |
| Single instanced Mesh (custom Geometry + Shader) | 200k iGPU / 1M+ dGPU | 2-3d | one draw call; WGSL needed for WebGPU |
| JFA field (resolution-bound, not N-bound) | any N | 3-5d | decouples perf from cell count |
| Splat-and-threshold @ ¼ res | ≤50k splats | 1-2d | real "metaballs" mode |

### 3.2 Metaball rendering at scale

- Naive per-pixel summation = O(pixels × N). Dead past ~200 samples.
- **Splat-and-threshold**: additive-blend a pre-baked gaussian sprite per sample into a float RT, threshold in postprocess. O(N × kernel + screen). Reference: Pavel Dobryakov's `WebGL-Fluid-Simulation`; iq's shadertoy metaballs (view/ld2GRz).
- **Low-res + upsample**: ¼-res accumulation RT, bilinear upscale. 16× cheaper; imperceptible on soft territory edges.
- **Jump Flooding Algorithm (JFA)**: log₂(max(W,H)) passes of a cheap fragment shader; 2048² ≈ 11 passes < 2 ms. Gives "nearest-owner + distance" per pixel; can produce hard Voronoi, soft blended, or isoline-metaball from the same data. Libraries: `gpu-io` (github.com/amandaghassaei/gpu-io). Pixi 8's `Filter` is single-pass — build JFA as a manual render pipeline, not a Filter.

### 3.3 WebGPU status in 2026

- Chrome/Edge stable since 2023; Firefox stable late 2024; Safari 17+ enabled default mid-2024.
- Coverage ~92% desktop / ~85% mobile.
- PixiJS 8's WebGPU renderer is stable but compute shaders are not first-class — reach through `renderer.gpu.device` or use `gpu-io`.

### 3.4 Physics / bubble libs

Not a fit. matter/p2/planck/rapier are rigid-body solvers. Metaball visual is a postprocess regardless of solver. LiquidFun is dead. npm `metaballs-*` packages cap around 50 balls.

---

## 4. Phase Plan

### Phase A — Tuning surface + steady-state gate (3-4 h)

**Goal:** address "maximum tuning handles" + "control the distribution and amounts" + free quick win.

New tunables:

| Config key | Domain | Purpose |
|---|---|---|
| `METABALL_GRID_DISTRIBUTION` | `square` / `hex_offset` / `jittered` | position pattern; hex_offset auto-pairs with hex cell shape |
| `METABALL_GRID_POSITION_JITTER` | 0.0 .. 0.5 | per-cell deterministic scatter (fraction of spacing, seeded by cell id) |
| `METABALL_GRID_MAX_CELLS` | 1 000 .. 500 000 | auto-coarsen spacing so `cols * rows` ≤ cap |
| `METABALL_GRID_RENDER_BACKEND` | `graphics` / `particle_container` | drop-in backend swap; restricts cell shape to square/circle under ParticleContainer |

UI additions:

- Live **cell-count readout** (actual emittable count after coarsening).
- Live **frame-ms readout** (EMA) for in-situ tuning.

Rendering changes:

- **Dirty-flag gate**: skip `renderMetaballGridScene` + re-paint when `(progress, planKey, paintConfigHash)` is unchanged. Zero cost steady-state frames.

### Phase B — Two-layer caching (1-2 d)

**Goal:** break the per-frame-paint barrier. Target: 100k+ cells at 60 fps on iGPU.

- Bake natives into a `RenderTexture` sized to world.
- Dirty-rect blit on per-cell ownership change.
- Dynamic overlay for dispossessed cells during transitions.
- Frame cost = 1 full-screen sprite draw + dispossessed-cell overlay (usually < 500 cells).

PixiJS 8 API note: `renderer.render({ container, target, clear: false })`. Signature changed from v7.

### Phase C — Underlayer capture upstream (1 d)

**Goal:** kill the dense-spacing cliff shown in the 4px trace. **Promotable to Phase 0 priority** if user directs.

- Capture PREV geometry once at conquest start in `GameCanvas` (mirrors the 2026-04-16 revised perimeter_field plan).
- `MetaballGridFamily.buildPlanForTransition` consumes the captured PREV instead of rebuilding.
- Removes `buildPerimeterFieldRenderFamilyGeometry` from the per-transition hot path.

### Phase D — True fields (stretch, pick one)

- **D1. Splat-and-threshold metaballs** (1-2 d) — real soft-blended blobs, ≤50k splats.
- **D2. JFA territory field** (3-5 d) — resolution-bound, decouples from cell count entirely, gives Voronoi + soft + metaball from one pipeline.

---

## 5. Risks & Tradeoffs

- **ParticleContainer restricts cell shape** to tinted-quad (square/circle). Hex/diamond stay on Graphics backend.
- **Static RenderTexture** consumes GPU memory = `worldWidth × worldHeight × 4 bytes` at full res; consider ½-res if world > 4000 px.
- **Underlayer capture** requires cooperation with `GameCanvas` truth-capture plumbing — some scope beyond the family boundary.
- **JFA** is the highest-ceiling option but the highest-unfamiliarity. Prototype on a branch before committing.

---

## 6. Verification Plan (when implementation begins)

Per AGENT.md §2.2 — user verifies visually. Pre-commit checks on my side:

1. `bun run check` — no new errors in `metaballGrid` files.
2. `bun test src/lib/territory/families/metaballGrid` — existing 42 tests green.
3. Frame-ms readout in UI shows expected improvement at test spacings (4 / 8 / 16 / 24 / 48 px).
4. Paused-state frame cost < 1 ms regardless of spacing (Phase A gate acceptance).
5. Transition cost at 4 px < 16 ms per frame (Phase B + C acceptance).

---

## 7. Open Questions

- **Which phase(s) to implement this session?** User has authorized push; not yet authorized implementation.
- **Preserve old metaball compositor** (`renderers/MetaballRenderer.ts`) as a selectable mode, or deprecate it once Phase D1/D2 lands?
- **Scope of `GameCanvas` truth-capture change** (Phase C) — small (just PREV geometry) or wider (conquest-scoped immutable snapshot bundle)?
