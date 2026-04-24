# Feature And Task Queue - 2026-04-24

## Active Focus

1. Gameplay responsiveness under render load
   - Order issue/cancel still feels too slow on the pointer path even after the territory renderer improvements.
   - The product requirement remains: action input must stay responsive even if rendering is struggling.
   - The interaction overlay split helped local visible acknowledgement, but broader main-thread work still dominates the lag.

2. Start-game reliability
   - The blank-screen-on-start regression was traced to a geometry contract bug in `compiler_UnifiedVectorGeometry.ts`.
   - Start -> game-shell -> gameplay is now verified again through the CDP-driven diagnostic harness.

3. Browser and CLI benchmark quality
   - The browser harness is now the authority for real gameplay/input timing.
   - Benchmark and diagnostic scripts now recover from crowded local port ranges by falling back to ephemeral ports.
   - CLI summaries now print interaction-infra measures explicitly, including cached client-rect refresh cost.

4. Input-path cleanup and architecture
   - `GameCanvas.svelte` now caches the canvas client rect and invalidates it on resize/scroll/viewport changes.
   - Drag-preview overlay redraws are now coalesced to animation frames instead of running on every raw `pointermove`.
   - Remaining input latency is therefore less likely to be layout-read driven and more likely to be broader frame work.

5. End-to-end telemetry
   - Continue expanding semantic logs from map generation -> ownership -> geometry -> render-family scene -> renderer -> visible commit.
   - Keep using the shared `log` utility and explicit source / destination / purpose summaries.

## Verified Current State

- Local browser diagnostic artifact:
  - `.agent-harness/metrics/diagnose-beginGameplay.json`
- Latest verified start-game diagnostic run:
  - generated at `2026-04-24T13:58:32.939Z`
  - state reached `phase=playing`, `currentView=game`, `hasStarted=true`
  - this confirms the blank-screen regression is cleared in the automated start path

- Local browser benchmark artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`
- Latest benchmark run:
  - generated at `2026-04-24T14:06:45.656Z`

Key current numbers:

- `metaballOrders`
  - `pointer issue = 217.367ms avg`
  - `target-click issue = 83.267ms avg`
  - `direct issue = 47.25ms avg`
  - `pointer cancel = 104.967ms avg`
  - `direct cancel = 53.25ms avg`
  - `game.input.visualAck.present = 0.7ms avg`
  - `game.input.clientRect.refresh = 0.1ms avg`, `count=2`
  - `input.pointermove.handled = 17.5ms avg`

- `perimeterOrders`
  - `pointer issue = 166ms avg`
  - `target-click issue = 63.2ms avg`
  - `direct issue = 50.6ms avg`
  - `pointer cancel = 73.133ms avg`
  - `direct cancel = 50.225ms avg`
  - `game.renderFrame.territory.perimeter_field = 3.551ms avg`, `41.1ms max`
  - `input.pointermove.handled = 16.75ms avg`

Current dominant residual hotspots:

- `renderShips`
- `updateBuffer`
- `bufferSubData`
- `packAttributes`
- `buildLine`
- Perimeter-Field transition / old-geometry work

## Work Completed Today

1. Fixed the start-game regression
   - Root cause: `input.tunables.entries is not a function`
   - File: `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
   - Fix: serialize tunables as the plain object the contract already defines

2. Verified recovery through browser automation
   - Reproduced and re-checked start -> lobby -> gameplay using `tools/debug/diagnose-game-shell-load.ts`

3. Hardened browser tooling
   - `tools/debug/benchmark-browser-gameplay.ts`
   - `tools/debug/diagnose-game-shell-load.ts`
   - both now fall back to ephemeral ports after exhausting the preferred port range

4. Reduced hot input-path layout work
   - File: `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
   - Added cached canvas client-rect access
   - Invalidates on resize, scroll, and viewport changes
   - Replaced repeated `getBoundingClientRect()` reads in wheel, pointer, benchmark, long-press, and cancel paths

5. Reduced duplicate drag-preview work
   - File: `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
   - Drag preview now schedules overlay presentation on `requestAnimationFrame`
   - Immediate command acknowledgement remains immediate

6. Improved benchmark observability
   - `tools/debug/benchmark-browser-gameplay.ts`
   - `tools/debug/summarize-browser-gameplay-benchmark.ts`
   - Added explicit reporting for:
     - `game.input.clientRect.refresh`
     - `game.input.dragPreview.present`

## Next Queue

1. Keep shrinking pointer-path latency toward the direct-issue baseline.
2. Add explicit stress scenarios where order input is exercised during intentionally heavy render work.
3. Instrument `handlePointerMove` and nearby state transitions more finely if pointer latency remains opaque.
4. Attack the dominant non-territory hotspots:
   - ship rendering
   - Pixi buffer uploads
   - line batching / `buildLine`
   - attribute packing
5. Continue Perimeter-Field spike reduction, especially transition planning and old-geometry build cost.
6. Continue the full semantic telemetry pass across the game dataflow.

## Not Yet Proven

- The responsiveness target is still not met.
- Input is better instrumented and somewhat improved, but not yet "lag-free under render stress".
- The main-thread budget is still too unstable to claim the control-path requirement is satisfied.

## Late-Day Update

### What changed after the earlier queue snapshot

1. The interaction-isolation experiment was removed.
   - It caused a real cancel-path regression and is not a valid continuation direction in its current form.

2. `GameCanvas.svelte` now treats queued order mutations as first-class visible state.
   - The interaction overlay can immediately reflect a queued cancel before the store mutation completes.
   - This restored immediate cancel visual acknowledgements.

3. Early-return frames now finalize correctly.
   - Even when heavier render work yields early, the interaction overlay and visual-ack flush path still complete.

4. Ship orbit-capacity cache invalidation was tightened.
   - `render.utils.ts` no longer builds a fingerprint string per ship-path lookup.
   - This removes a previously visible micro-hotspot and keeps the cache invalidation cost low.

5. Browser benchmark summaries now expose app-side reaction metrics explicitly.
   - `handled -> visualAck`
   - `handled -> commit`
   - This makes it easier to distinguish browser dispatch lag from our own reaction time.

### Current authority artifact

- `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`
  - generated at `2026-04-24T16:35:48.503Z`

### Current key numbers

Normal scenarios:

- `metaballOrders`
  - `target-click issue = 51.167ms`
  - `target handled -> visualAck = 0.7ms`
  - `target handled -> commit = 31.833ms`
  - `cancel handled -> visualAck = 0.633ms`
  - `cancel handled -> commit = 49.133ms`

- `perimeterOrders`
  - `target-click issue = 57.367ms`
  - `target handled -> visualAck = 0.433ms`
  - `target handled -> commit = 37.933ms`
  - `cancel handled -> visualAck = 0.467ms`
  - `cancel handled -> commit = 40.467ms`

Stress scenarios:

- `metaballOrdersStress`
  - `target-click issue = 64.1ms`
  - `target handled -> visualAck = 0.567ms`
  - `target handled -> commit = 44.8ms`
  - `cancel handled -> visualAck = 0.667ms`
  - `cancel handled -> commit = 38.767ms`

- `perimeterOrdersStress`
  - `target-click issue = 61.633ms`
  - `target handled -> visualAck = 0.433ms`
  - `target handled -> commit = 42.433ms`
  - `cancel handled -> visualAck = 0.5ms`
  - `cancel handled -> commit = 34.9ms`

### Interpretation

- The immediate acknowledgement requirement is much closer to satisfied than the whole-path pointer totals suggest.
- After the browser delivers the relevant event, local feedback is consistently sub-millisecond and commit is in the several-tens-of-milliseconds range.
- The bigger remaining offenders are:
  - browser/contextmenu dispatch lead for cancel
  - Pixi line/buffer work
  - ship rendering
  - Perimeter-Field transition spikes

### Highest-priority continuation

1. Keep pushing `handled -> commit` lower for both issue and cancel.
2. Investigate whether right-click/contextmenu dispatch should be replaced or supplemented with a faster path for cancel semantics.
3. Continue attacking:
   - `buildLine`
   - `bufferSubData`
   - `packAttributes`
   - `renderShips`
4. Preserve the rule:
   - input acknowledgement must remain fast even when territory or presentation work is under pressure.

### Environment constraint

- Production build verification is currently blocked by local disk pressure on `C:`.
- The failure mode is `ENOSPC` while building `.svelte-kit/output`, not a known compile error from this work.
