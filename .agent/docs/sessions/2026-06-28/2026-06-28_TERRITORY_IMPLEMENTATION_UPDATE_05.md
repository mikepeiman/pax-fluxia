# Territory Implementation Update 05

Timestamp: 2026-06-28 16:22:38 -04:00

## Core Question

Is this necessary or beneficial at all?

For repeated board-shape checking during live play: no. The board is fixed after a game starts, so rereading star positions and lane connections every frame is wasted work.

For having a board identity at all: yes. The renderer still needs a stable name for the loaded board so it can know whether cached territory geometry belongs to this board or to a previous board.

Decision: keep a fixed-board identity, but compute it only when the loaded board changes. Do not reread the physical board during normal rendering.

## What Changed

1. Added an exact fixed-board key in `GameCanvas.svelte`.
   - It reads the physical board when the loaded board changes.
   - It reuses that key during live play.
   - It is shared by runtime territory and render-family territory.

2. Updated `RenderFamilyGeometryCacheKeyBuilder`.
   - When it receives the fixed-board key, it no longer reads star positions or lane connections.
   - It still checks ownership, because ownership changes during the game and territory output depends on it.
   - The old full physical-board read remains as a fallback for callers that do not pass the fixed-board key.

3. Updated benchmark collection.
   - Benchmark JSON now keeps the fixed-board-key counters.
   - The text summary now prints fixed board key builds, reuses, exact board reads, and read time.

## Measured Results

Large map: `First Symmetry-6_April 17b`

Map size:
- 172 stars
- 428 directed connections in the app

Grid Gradient gameplay, generated at `2026-06-28T20:18:26.720Z`:
- Fixed-board key calls: 1455
- Fixed-board key reuses: 1453
- Exact physical-board reads: 2
- Physical-board read time: about 1ms total
- Render-family old physical-board scans: 0
- Frame result: average 8.693ms, p95 8.5ms, max 25ms

Layered Runtime gameplay, generated at `2026-06-28T20:20:38.629Z`:
- Fixed-board key calls: 414
- Fixed-board key reuses: 412
- Exact physical-board reads: 2
- Physical-board read time: about 1ms total
- Runtime worker old physical-board scans: 0
- Frame result: average 9.811ms, p95 16.7ms, max 16.8ms

Plain result: the repeated board-shape checking is gone in the measured render-family and runtime paths. The remaining frame cost is mostly Pixi stage rendering, meaning the final browser/GPU draw of all Pixi objects, not territory geometry computation.

## Validation

Passed:
- `bunx vitest run src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts src/lib/territory/runtime/TerritoryWorker.test.ts src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts`
- `bun run check`
- `bun run agentic:graphify:build`
- Large-map Grid Gradient gameplay benchmark
- Large-map Layered Runtime gameplay benchmark

Existing warning still present:
- `src/lib/components/ui/GameThemeManager.svelte`: unused CSS selector `.game-theme-manager--menu .theme-chip-name`

## Failures And Corrections

1. I first ran the targeted test command from the monorepo root with app-relative paths. Two runtime test files failed before running because `$lib/...` aliases were not resolved from that root. I reran from `pax-fluxia/`, and all targeted tests passed.

2. The first large-map benchmark showed the downstream win, but the new fixed-board-key counters were missing from the benchmark artifact. The app exposed the counters, but the benchmark collector dropped the field. I updated the collector and reran the benchmark.

## Remaining Work

1. The map-checking waste is no longer the main target in the measured paths.

2. The next performance target should be Pixi stage render cost. In plain terms: the app is spending more time drawing the final scene than computing territory geometry.

3. Cell Grid transition presentation still needs focused work. Its worst frames are not caused by board-shape checking; they are caused by presenting/updating the cell grid during transitions.
