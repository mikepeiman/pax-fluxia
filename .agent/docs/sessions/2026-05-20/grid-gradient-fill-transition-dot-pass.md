# 2026-05-20 - Grid Gradient Fill Transition Dot Pass

## Context

User asked to prioritize conquest transitions for fills before borders, using the core Grid Gradient visual idea: a fine dot grid whose marks can grow, fade, and blend without changing ownership or geometry.

## Runtime Shape

Grid Gradient remains a render-family mode. This pass changes presentation only:

- Ownership: unchanged; star owners and conquest events still come from the existing render-family transition lifecycle.
- Geometry: unchanged; PV geometry and localized `ResolvedGeometrySnapshot` still define regions and borders.
- Transition: unchanged; `buildGridClassification()` and `planGridWave()` still decide changing cells and per-cell flip timing.
- Presentation: changed; changing fill marks now use two visual passes instead of one color-mixed mark.

## Implementation

- Graphics fallback: transition cells scale with their emitted scene alpha. Old-owner marks shrink/fade out, and new-owner marks grow/fade in.
- Shader-field backend: `shadeCell()` now composites two `shadeCellSide()` passes for non-native cells. `uFlipWindow` is wired from the existing `METABALL_GRID_FLIP_WINDOW` setting.
- Native cells remain one stable mark.
- No new runtime path, ownership truth, geometry source, or player-facing control was added.
- The previous border-proximity blend work is not reintroduced here; this is fill transitions only.

## Validation Plan

- Run focused Grid Gradient scene/shader tests.
- Run `bun run build` in `pax-fluxia/`.
- Browser verification should look for conquered fill dots growing into the new owner color while old-owner dots shrink out along the existing wave timing.

## Validation Completed

- `bun test "src/lib/territory/families/gridGradient/gridGradientScene.test.ts" "src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts" "src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts" "src/lib/territory/families/gridGradient/paint.test.ts"` passed: 15 tests.
- `bun run build` passed in `pax-fluxia/`; existing Svelte unused-CSS and chunk-size warnings remain.
- Dev server smoke returned HTTP 200 at `http://127.0.0.1:1464/`.
- Visual transition review is still required in the browser because this environment did not provide a working browser automation tool.
