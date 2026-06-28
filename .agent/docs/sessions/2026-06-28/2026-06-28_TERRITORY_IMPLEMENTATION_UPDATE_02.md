# Territory Implementation Update 02

**Created:** 2026-06-28 15:38:56 -04:00
**Branch:** `codex/territory-overnight-integration`

## Core Question Applied

Question:

Is repeated physical-board layout checking necessary or beneficial during live gameplay?

Answer:

No, not in the render-family hot path. The loaded board layout is fixed after game start. Ownership can change; star/lane layout cannot. Rechecking fixed layout every frame is not useful gameplay work.

## Code Change

`RenderFamilyGeometryCacheKeyBuilder` now reuses the previous physical-layout signature when the same star and lane arrays are rendered again.

It still checks ownership every call, because ownership changes during conquest.

## Measurement

### Small conquest animation fixture

Scenario:

`grid_gradientConquestAnimation`

Fixture:

7 stars, 12 connections

Before optimization:

- geometry-key builds: 2,134
- physical-layout scans: 2,134
- scans that found the same layout again: 2,133
- repeated-scan time: about 28.3ms

After optimization:

- geometry-key builds: 2,122
- physical-layout scans: 8
- reused prior physical-layout signature: 2,114
- measured scan time: about 0.3ms

### Large gameplay map

Scenario:

`grid_gradientGameplay`

Map:

`First Symmetry-6_April 17b`

Runtime size:

172 stars, 428 connections

After optimization:

- geometry-key builds: 1,491
- physical-layout scans: 5
- reused prior physical-layout signature: 1,486
- measured scan time: about 2.5ms
- estimated scan time avoided: about 743ms

Plain meaning:

On the large map, repeated layout scans were expensive enough to matter. The optimized path removes most of that wasted work without changing rendered territory output.

## Verification

Passed:

`bunx vitest run src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts`

Also previously passed in this implementation slice:

`bunx vitest run src/lib/fx/handlers/territoryTransitionHandler.test.ts src/lib/territory/transitions/renderFamilyTransitionLifecycle.test.ts src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts`

`bun run check`

Project check result:

- 0 errors
- 1 existing warning in `GameThemeManager.svelte` for an unused CSS selector

## Remaining Measurement Gap

This measured the render-family hot path. The runtime-clean `TerritoryWorker` also builds a physical-layout signature for its cache key. That path is not yet included in the benchmark summary, so it should be measured separately before changing it.
