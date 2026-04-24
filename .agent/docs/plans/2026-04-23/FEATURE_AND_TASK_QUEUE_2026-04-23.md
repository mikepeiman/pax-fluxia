# Feature And Task Queue - 2026-04-23

## Active Focus

1. Territory gameplay performance and responsiveness
   - Metaball-Grid gameplay/update/render is still the dominant main-thread cost.
   - Perimeter-Field gameplay/update/render remains too expensive, especially transition planning and scene build.
   - Real order issuance latency remains far too high under territory load.

2. Input / render separation
   - Orders must remain responsive even when territory rendering stalls.
   - Current queued order mutations reduce handler cost but do not solve main-thread starvation.
   - Next architecture step is off-thread territory solve plus non-blocking render-commit scheduling.

3. End-to-end visual telemetry
   - Add complete pipeline instrumentation from map generation through ownership, geometry, scene build, renderer solve, and draw commit.
   - Replace remaining raw map-init diagnostics with logger-based structured telemetry.
   - Logs must clearly state source, destination, purpose, and concise payload summaries.

4. Benchmarks and evidence
   - Keep CLI/browser benchmarks current against real gameplay and order-click paths.
   - Expand benchmark output into line-item timings for scene build, transition plan, solve, upload, border draw, and input dispatch latency.
   - Keep latest benchmark artifacts in `.agent-harness/metrics/`.

## Verified Current Performance Snapshot

- Browser benchmark artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`
- Latest measured browser state:
  - `metaballGameplay`
    - `game.renderFrame.territory.metaball = 0.812ms avg`
    - `territory.metaballFamily.update = 0.63ms avg`
    - `territory.metaballFamily.render = 0.33ms avg`
  - `perimeterGameplay`
    - `game.renderFrame.territory.perimeter_field = 2.296ms avg`
    - `territory.perimeterFieldFamily.update = 1.696ms avg`
    - `territory.perimeterFieldFamily.buildScene = 1.332ms avg`
  - order state-commit latency:
    - Metaball issue avg `108.5ms`, cancel avg `55.03ms`
    - Perimeter issue avg `113.27ms`, cancel avg `50.1ms`
- Latest measured CLI territory state:
  - `metaball-transition frameTotalMsAvg = 2.1478ms`
  - `perimeter-transition frameTotalMsAvg = 1.7322ms`
- Current residual non-territory gameplay hotspots from browser CPU profiles:
  - Pixi line packing / `buildLine`
  - `bufferSubData`
  - ship rendering
  - lane geometry sampling

## Immediate Work Queue

1. Preserve this improved browser + CLI benchmark checkpoint in docs and local commits.
2. Keep shrinking order state-commit latency below the current ~`100-120ms` issue band.
3. Target the new dominant gameplay hotspots outside territory:
   - Pixi geometry upload / line batching
   - ship renderer update cost
   - lane geometry sampling
4. Continue expanding end-to-end pipeline logs so every major handoff has a concise source/destination/purpose record.
5. Keep browser/CDP and CLI perf harnesses aligned with the current real gameplay path.
6. Checkpoint with local commits regularly.

## Risks / Open Questions

- Off-thread solve must not break visual equivalence or flicker stale results into the frame.
- Texture upload and border draw still remain on the main thread after workerization and may need further slicing.
- Pointer responsiveness can only improve materially if expensive territory solve leaves the main thread.
- Perimeter transition planning may also need a worker path if scene-build work remains dominant after renderer offload.
