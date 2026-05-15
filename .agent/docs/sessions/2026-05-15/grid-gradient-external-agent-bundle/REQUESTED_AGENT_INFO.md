# Requested Agent Info For Grid Gradient Optimization

## Answers Available From Current Code

### Current code shape

Use `GRID_GRADIENT_GOD_OBJECT.ts`:

- `GridGradientFamily.update`: section 16.
- `drawGridGradientCell`: section 14.
- `buildGridClassification`: section 06.
- Grid mode settings/defaults: sections 10 and 11.
- `GameCanvas` dispatch and shared geometry path: sections 33-37.

### Default settings

Current Grid Gradient defaults:

- spacing: `6px`
- max cells: `160000`
- distribution: `square`
- jitter: `0`
- center mark size: `10px`
- edge mark size: `1.5px`
- curve power: `1.6`
- border offset: `0px`
- shape: `circle`
- vector borders: enabled
- border dots: disabled
- border dot size: `2.5px`
- border dot style: `blended`

### Total grid cell counts at common world sizes

These are total grid slots before geometry ownership filtering. Actual `emittable` and `painted` counts depend on live territory geometry and must be captured from diagnostics.

Current cap behavior uses `GRID_GRADIENT_MAX_CELLS = 160000`. Due to ceiling math, requests below the cap threshold currently land at about `160200` cells on these rectangular worlds.

| World | Requested spacing | Effective spacing | Grid | Total cells |
|---|---:|---:|---:|---:|
| 1600x900 fallback | 2px | 3.002px | 534x300 | 160200 |
| 1600x900 fallback | 3px | 3.002px | 534x300 | 160200 |
| 1600x900 fallback | 4px | 4px | 400x225 | 90000 |
| 1600x900 fallback | 6px default | 6px | 267x150 | 40050 |
| 1600x900 fallback | 8px | 8px | 200x113 | 22600 |
| 1600x900 fallback | 12px | 12px | 134x75 | 10050 |
| 1600x900 fallback | 16px | 16px | 100x57 | 5700 |
| 1760x990 common theme | 2px | 3.302px | 534x300 | 160200 |
| 1760x990 common theme | 3px | 3.302px | 534x300 | 160200 |
| 1760x990 common theme | 4px | 4px | 440x248 | 109120 |
| 1760x990 common theme | 6px default | 6px | 294x165 | 48510 |
| 1760x990 common theme | 8px | 8px | 220x124 | 27280 |
| 1760x990 common theme | 12px | 12px | 147x83 | 12201 |
| 1760x990 common theme | 16px | 16px | 110x62 | 6820 |
| 1920x1080 reference | 2px | 3.602px | 534x300 | 160200 |
| 1920x1080 reference | 3px | 3.602px | 534x300 | 160200 |
| 1920x1080 reference | 4px | 4px | 480x270 | 129600 |
| 1920x1080 reference | 6px default | 6px | 320x180 | 57600 |
| 1920x1080 reference | 8px | 8px | 240x135 | 32400 |
| 1920x1080 reference | 12px | 12px | 160x90 | 14400 |
| 1920x1080 reference | 16px | 16px | 120x68 | 8160 |

Visual-quality target guidance:

- `2-4px`: fine/high-quality target; current cap coarsens 2-3px up to about 160k cells, and 4px remains very expensive.
- `6px`: current default; good visual density, still expensive in current implementation.
- `8-12px`: medium density; useful for perf comparison.
- `16px+`: coarse fallback for isolating whether cost is cell count or fixed overhead.

### Mark animation requirements from current implementation

Current marks do not rotate and do not have independent per-cell animation. The mode currently changes:

- size by distance-to-border,
- alpha by transition rendering,
- color by owner / transition blend,
- shape by setting: circle, square, or deterministic noise polygon.

Noise mark geometry is deterministic by cell id, not animated.

### Camera zoom and grid LOD

Current grid sampling is in world coordinates and does not dynamically change with camera zoom. There is no explicit camera-zoom LOD path in Grid Gradient today.

Open decision for optimization: if retained GPU batches are implemented, zoom-based LOD may be useful for presentation cost, but it would be a new product/architecture decision. It should not silently change gameplay geometry or ownership classification.

## Answers Still Needed From Live App

### Actual current painted/emittable cell counts

How to capture:

1. Open the app.
2. Select `Grid Gradient`.
3. Open the diagnostics/settings panel that shows Grid Gradient diagnostics.
4. Capture the rows:
   - `Cells`: painted / emittable / total.
   - `Spacing`: requested / effective.
   - `Frame`: visible frame state / ms / EMA.
5. Repeat at the target spacings the agent asks about, usually `4px`, `6px`, `8px`, `12px`, and `16px`.

### Raw Chrome trace

The requested file is the DevTools Performance recording export, not screenshots.

How to capture:

1. Open Chrome DevTools.
2. Go to the `Performance` panel.
3. Keep `Screenshots` enabled.
4. Click record.
5. Interact with the app for about 15-30 seconds on `Grid Gradient`.
6. Include at least one steady period and one conquest/transition if possible.
7. Stop recording.
8. Click the export/save icon in the Performance panel toolbar.
9. Save the `.json` trace file.

Good naming example:

`grid-gradient-6px-1760x990-transition-2026-05-15.json`

The agent wants this because screenshots only show a few selected rows. The raw trace lets them inspect full call stacks, frame timing, GC, scripting/rendering split, and whether costs recur or are one-off.

### Screenshot or video of accepted look

Needed because performance refactors may alter mark shape, density, and border readability.

How to capture:

- Take one screenshot at the visually accepted settings.
- If possible, also capture a short video during conquest so the agent sees transition behavior.
- Include current settings or diagnostics in the screenshot if practical.

### WebGL vs WebGPU active in Pixi

How to capture:

1. Open DevTools Console.
2. Run:

```js
window.__PIXI_APP__?.renderer?.type ?? window.__PAX_BENCH__?.canvasApi?.app?.renderer?.type
```

If that does not return a useful value, inspect the renderer object:

```js
window.__PIXI_APP__?.renderer
```

Alternative from DevTools:

- In the Performance trace, renderer stack names often reveal WebGL/WebGPU paths.
- In Chrome GPU internals, `chrome://gpu` can confirm hardware acceleration, but Pixi renderer type is better.

If no global Pixi app handle is exposed, add a temporary telemetry-only diagnostic in `GameCanvas.svelte` or expose renderer type through the existing benchmark/diagnostics snapshot.

## Should The User Record Differently?

The current workflow is good for first-pass diagnosis: record, find red frames, use Bottom-up sorted by total time.

For this optimization pass, add these details:

1. Export the raw trace JSON after recording.
2. Record both steady-state and transition/conquest in the same trace, or record two separate traces named clearly.
3. Keep recordings around 15-30 seconds. Longer traces are larger and harder to inspect.
4. Also capture the Grid Gradient diagnostics panel at the same settings.
5. Record one trace at the visually accepted setting and one at a coarser comparison setting such as 12px or 16px.

Do not rely only on the largest red interval. Also check whether the same hot functions appear repeatedly across many frames.
