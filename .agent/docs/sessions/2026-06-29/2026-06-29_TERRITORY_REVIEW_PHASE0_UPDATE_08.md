# Territory Review Phase 0 - Update 08

Timestamp: 2026-06-29T15:01:35-04:00

## What Changed In The Investigation

The earlier experiment that removed star ownership from the render-family geometry cache key is not safe to ship as-is.

Plain English: that cache is not just "where are the stars and lanes?" It also appears to hold the calculated territory ownership shapes. Reusing it after a star changes owner can make the benchmark look faster by keeping old territory geometry alive. That is useful as a measurement clue, but it is not a correct product fix unless a visual/correctness check proves the visible territory still updates exactly.

## Current Measured Facts

1. The several-hundred-millisecond presentation delay is real on the integration branch.
   - In review measurements, prepared territory frames sometimes waited roughly 390-520ms before display.
   - Changing the scheduler priority from background to user-visible removed most of that queue wait in the disposable experiment.

2. Removing queue delay did not solve all Cell Grid jank.
   - Latest focused run: `C:\Users\mikep\.codex\worktrees\territory-isolate-revert-presentation-yield-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T18-56-41-037Z.json`
   - Cell Grid still had isolated visible update costs around 70-116ms.
   - The draw loop itself was much smaller on the bad frames, often around 16ms.

3. The remaining Cell Grid spike lines up with full territory-shape work.
   - Bad frames include `territory.geometry0319.compute` and `territory.geometry0319.authority`.
   - Those are the main-thread stages that compute and validate territory shapes.
   - This does not mean "the map moved." It means ownership changed and the current code rebuilds a lot of territory shape data in response.

4. The old "map topology scan" target remains small.
   - Previous measured total was under 1ms for the scan path.
   - That is not a core jank cause.

## External Research Used

1. MDN and Chrome docs confirm that `scheduler.postTask` supports priority levels, including `background` and `user-visible`. A background task is allowed to run later than visible work, so it is a plausible cause of delayed territory presentation.
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask
   - Chrome status: https://chromestatus.com/feature/6031161734201344

2. MDN confirms worker `postMessage` uses structured cloning. That matters because moving large geometry or plan objects through workers can itself cost time.
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
   - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm

3. PixiJS docs describe `cacheAsTexture` as useful for static or infrequently updated content. Current local measurements did not show it as the primary Cell Grid transition stall, so it is not the next main target.
   - PixiJS: https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture

## Corrected Technical Direction

The right optimization target is not "skip ownership." The right target is to split the work:

1. Reuse what is truly owner-independent: star positions, lane layout, weighted Voronoi base cells, and other data that should not change during a loaded game.
2. Recompute only what actually depends on ownership: which territory cells belong to which player, frontier borders, fills, and transition geometry.
3. Keep presentation scheduling visible-priority so finished frames are not left waiting behind background tasks.
4. Do not ship any cache change unless a conquest visibly changes territory correctly and the benchmark improves.

## Immediate Next Checks

1. Continue disposable instrumentation around the gap before Cell Grid draws.
2. Ask parallel explorers to identify the safest geometry split and the safest presentation scheduling change.
3. Build the product fix as small commits:
   - commit 1: presentation scheduling delay fix,
   - commit 2: geometry correctness tests/spec correction if needed,
   - commit 3+: deeper geometry split only after isolation proves it.

