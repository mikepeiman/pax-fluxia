# Feature And Task Queue - 2026-04-23

## Active Focus

1. Territory gameplay performance and responsiveness
   - Metaball-Grid territory cost is now materially lower in steady gameplay, but overall gameplay responsiveness is still limited by pointer-path latency and non-territory render work.
   - Perimeter-Field remains too expensive on load and still spikes in gameplay.
   - Real order issuance through the pointer path remains far too high even though direct issue/cancel is now cheap.

2. Input / render separation
   - Orders must remain responsive even when territory rendering stalls.
   - Async territory presentation is now in place and supersedes stale visual work.
   - Current gains prove the core order mutation is cheap; remaining work is further separating pointer interaction from render-path stalls and other main-thread bursts.

3. End-to-end visual telemetry
   - Add complete pipeline instrumentation from map generation through ownership, geometry, scene build, renderer solve, and draw commit.
   - Runtime map ownership and lane-cache telemetry has been expanded; continue through the remaining geometry and draw branches.
   - Logs must clearly state source, destination, purpose, and concise payload summaries.

4. Benchmarks and evidence
   - Keep CLI/browser benchmarks current against real gameplay and order-click paths.
   - Expand benchmark output into line-item timings for scene build, transition plan, solve, upload, border draw, input dispatch latency, and async presentation queue delay.
   - Keep latest benchmark artifacts in `.agent-harness/metrics/`.

5. Workspace / harness reliability
   - The user-requested local path for this thread resolved to a non-repo directory.
   - The populated local checkout remains `C:\Users\mikep\.codex\worktrees\perimeter-field-metaball\pax-fluxia`.
   - Keep this mismatch documented until the harness thread cwd is corrected.

## Verified Current Performance Snapshot

- Browser benchmark artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`
- Latest measured browser state from `2026-04-24T00:20:07.584Z`:
  - `metaballGameplay`
    - `game.renderFrame.territory.metaball = 0.799ms avg`
    - `game.renderFrame.renderFamilyInput.metaball = 0.074ms avg`
    - `game.renderFrame.ownership.metaball = 0.059ms avg`
    - `ships = 0.911ms avg`
    - `stars = 0.94ms avg`
  - `perimeterGameplay`
    - `game.renderFrame.territory.perimeter_field = 1.893ms avg`
    - `game.renderFrame.geometry.perimeter_field = 0.418ms avg`
    - `ships = 1.185ms avg`
    - `stars = 0.963ms avg`
  - load spikes:
    - `metaballLoad territory = 6.8ms`
    - `perimeterLoad territory = 50ms`
    - `perimeterLoad geometry = 40.6ms`
  - order latency:
    - Metaball pointer issue avg `96.2ms`, target-click issue avg `29.167ms`, direct issue avg `1.575ms`
    - Perimeter pointer issue avg `75.767ms`, target-click issue avg `17.3ms`, direct issue avg `0.875ms`
    - Metaball pointer cancel avg `16.233ms`, direct cancel avg `4.225ms`
    - Perimeter pointer cancel avg `17.233ms`, direct cancel avg `4.525ms`
  - territory async queue:
    - Metaball gameplay queue wait about `6.7ms`, commit lag about `7.1ms`
    - Perimeter gameplay queue wait about `8.9ms`, commit lag about `10ms`
    - stale territory presentations are now being superseded in both modes
- Latest measured CLI territory state:
  - `metaball-transition frameTotalMsAvg = 2.1478ms`
  - `perimeter-transition frameTotalMsAvg = 1.7322ms`
- Current residual non-territory gameplay hotspots from browser CPU profiles:
  - Pixi line packing / `buildLine`
  - `bufferSubData`
  - ship rendering
  - lane geometry sampling
  - pointer-path sequencing and selection/order visual work

## Immediate Work Queue

1. Preserve this improved browser + CLI benchmark checkpoint in docs and local commits.
2. Keep shrinking pointer-path order latency toward the current direct-dispatch baseline.
3. Add explicit input-under-render-stress benchmarks so responsiveness is measured under contention.
4. Target the new dominant gameplay hotspots outside territory:
   - Pixi geometry upload / line batching
   - ship renderer update cost
   - lane geometry sampling
5. Continue expanding end-to-end pipeline logs so every major handoff has a concise source/destination/purpose record.
6. Keep browser/CDP and CLI perf harnesses aligned with the current real gameplay path.
7. Checkpoint with local commits regularly.

## Risks / Open Questions

- Off-thread solve must not break visual equivalence or flicker stale results into the frame.
- Texture upload and border draw still remain on the main thread after workerization and may need further slicing.
- Pointer responsiveness will not be fixed by territory changes alone if selection, line batching, or ship rendering still serialize with input.
- Perimeter transition planning may also need a worker path if scene-build work remains dominant after renderer offload.
