# Territory Implementation Update 01

**Created:** 2026-06-28 15:30:27 -04:00
**Branch:** `codex/territory-overnight-integration`

## What Changed

1. Added measurement for repeated physical-board layout scans in the render-family geometry cache key.
   - This does not change rendering behavior.
   - It records how often the app scans fixed star/lane layout and how much time that scan takes.

2. Fixed one exact-transition identity leak.
   - Territory transitions are keyed by exact conquest identity: tick, conquered star, previous owner, and new owner.
   - A legacy Power Voronoi path still marked transitions consumed by star ID.
   - That path now marks the exact transition key, so one recapture of a star cannot consume a different transition for the same star.

## First Measurement

Targeted benchmark:

`grid_gradientConquestAnimation`

Benchmark target map:

`First Symmetry-6_April 17b`, 172 saved stars, 214 saved lanes, 428 runtime connections.

The actual conquest diagnostic scenario loaded a small 7-star, 12-connection fixture for the capture animation.

Result from `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`:

- render-family geometry-key builds: 2,134
- physical-layout signature scans: 2,134
- scans that found the same physical layout again: 2,133
- time spent on repeated same-layout scans: about 28.3ms
- average scan cost: about 0.013ms

Plain meaning:

The per-scan cost is small on this fixture, but almost every scan was checking a board layout that did not change and cannot change during live gameplay. This is real repeated work, now measured instead of guessed.

## Verification

Passed:

`bunx vitest run src/lib/fx/handlers/territoryTransitionHandler.test.ts src/lib/territory/transitions/renderFamilyTransitionLifecycle.test.ts src/lib/territory/families/renderFamilyGeometryCacheKey.test.ts`

Result:

- 3 test files passed
- 22 tests passed

## Research Inputs Used

- MDN `requestAnimationFrame`: browser frame callbacks generally follow display refresh, and animation should use the timestamp argument.
- PixiJS performance guidance: changing Graphics every frame is expensive compared with stable objects or texture-backed rendering.
- MDN transferable objects and OffscreenCanvas: useful for future worker/off-main-thread experiments, but not used in this patch.

## Next

1. Measure repeated physical-layout scans on the large 172-star map path, not only the small conquest fixture.
2. Decide whether to remove the repeated render-family physical-layout scan or keep it only as a debug-only invariant check.
3. Continue transition identity audit beyond the fixed legacy path: star/ship visual flash state is still star-keyed, which may be acceptable for star color effects but should not drive territory geometry transitions.
