# Territory Implementation Update 06

Timestamp: 2026-06-28T16:52:03.9781477-04:00

Branch: `codex/territory-overnight-integration`

## Core Questions Asked

1. Is `RenderFamilyGeometryCacheKeyBuilder` necessary at all?

   Answer: partly. It is still useful for deciding when ownership or territory settings require a new rendered territory shape. It is not useful for repeatedly rediscovering the physical board layout during a live game, because the board layout is fixed after the game starts.

2. Is drawing every Cell Grid fill cell through `PIXI.Graphics` necessary when centered blended borders are enabled?

   Answer: no, for normal Cell Grid under the safe square-cell constraints. The fill and border can be split: sprites draw the fill, and the existing graphics layer still draws the centered blended border.

## Code Changes

1. Added Cell Grid stats to benchmark snapshots so benchmark JSON includes the live Cell Grid frame counters and settings.

2. Added narrow Cell Grid timing labels for:
   - scene build
   - frontier/boundary preparation
   - graphics cell drawing
   - blended border drawing
   - native sprite writing
   - transition sprite writing

3. Changed normal Cell Grid rendering so square-cell fill can use sprites while centered blended borders stay on the graphics layer.

   This only applies when the existing constraints are safe: normal `cell_grid`, square cells, no inset, no trim, no corner radius, no smoothing, no frontier FX, and centered blended territory borders. Other border modes and phase-derived variants stay on the old graphics path.

## Measured Results

Cell Grid conquest benchmark, before this fill/border split:

- File: `.agent-harness/metrics/browser-gameplay-benchmark-2026-06-28T20-39-53-298Z.json`
- Average frame: 9.962ms
- 95th percentile frame: 16.8ms
- Worst frame: 25.1ms
- Frames over 20ms: 5
- `game.renderFrame.territory.present.cell_grid`: average 1.511ms, max 28ms
- Cell Grid graphics fill drawing: average 2.072ms, max 6.1ms
- Cell Grid blended border drawing: average 0.806ms, max 10ms

Cell Grid conquest benchmark, after this fill/border split:

- File: `.agent-harness/metrics/browser-gameplay-benchmark-2026-06-28T20-45-33-923Z.json`
- Average frame: 8.639ms
- 95th percentile frame: 8.5ms
- Worst frame: 17.5ms
- Frames over 20ms: 0
- `game.renderFrame.territory.present.cell_grid`: average 0.834ms, max 19.3ms
- Cell Grid graphics fill drawing no longer appears as a top cost
- Cell Grid transition sprite writing: average 0.206ms, max 2.5ms
- Cell Grid blended border drawing: average 0.664ms, max 4.8ms

Plain-English result: the expensive part was repeatedly drawing thousands of filled grid cells as vector graphics during a conquest animation. Moving those fills to sprites removed the over-20ms frames in this benchmark. The border still costs real time, but it is now the remaining target rather than being mixed together with fill cost.

## Board-Layout Checking Cost

Confirmed current behavior:

- Grid Gradient large-map gameplay: 1,455 render-family key builds, 2 exact board-layout reads, 0 old physical-layout scans.
- Runtime territory large-map gameplay: 414 worker cache uses, 2 exact board-layout reads, 0 old physical-layout scans.
- Cell Grid conquest benchmark: about 2,000 key builds, 2 exact board-layout reads, 0 old physical-layout scans.

Best-effort waste estimate:

- The old repeated board-layout checks were not the main frame-time problem in the measured short captures.
- On small Cell Grid conquest captures before the exact board key, the old path showed 8 physical-layout scans, costing about 0.2ms total.
- On the large-map captures, each exact physical board read cost about 0.5ms. If a future or alternate path accidentally scanned the physical board every key build, that would be hundreds of milliseconds across a run. The current code avoids that by reading the fixed board layout twice and reusing the result.

Plain-English result: fixing board-layout checking was still the right architecture correction, but the biggest measured user-visible performance win in this step came from Cell Grid fill rendering, not from board-layout checking.

## Validation

- `bunx vitest run src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts src/lib/territory/runtime/TerritoryWorker.test.ts src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts src/lib/territory/families/cellGrid/CellGridFamily.test.ts`
  - Passed: 4 files, 39 tests.
- `bun run check`
  - Passed: 0 errors.
  - Existing warning remains: unused CSS selector in `GameThemeManager.svelte`.
- Screenshot sanity check:
  - `.agent-harness/metrics/browser-screenshots/2026-06-28T20-45-21-128Z/cell_gridConquestAnimation.png`
  - The Cell Grid fill and centered border are both visible.

## Limits And Open Work

1. The benchmark final Cell Grid stats still describe the final steady frame. The new timing labels are the better evidence for slow transition frames.

2. The current Cell Grid conquest benchmark uses a 7-star fixture with about 4,484 grid cells. It is useful for transition behavior, but it does not replace a large-map conquest benchmark.

3. Remaining Cell Grid costs are now mostly border drawing, frontier preparation, scene building, Pixi stage render, and occasional ship rendering spikes.

4. Next performance question: is the blended border work necessary every transition frame, or can the stable parts of the boundary graph be cached and only the active frontier section updated?
