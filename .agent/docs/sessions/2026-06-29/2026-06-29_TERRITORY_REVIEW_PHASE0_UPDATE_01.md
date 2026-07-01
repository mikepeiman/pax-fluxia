# Territory Review Phase 0 Update 01

Timestamp: 2026-06-29T12:15:00-04:00

Status: review phase only. No product fixes have been made in this pass.

## What Is Confirmed

1. The review branch builds.
2. The original baseline builds.
3. Current master builds in a clean detached comparison worktree.
4. A deterministic 36-tick replay on `First Symmetry-6_April 17b` produced the same final hash on baseline, current master, and the review branch.
5. A corrected release benchmark now runs on the large saved map instead of the earlier tiny fixture.
6. The current review branch is not repeatedly spending meaningful measured time checking whether the physical board changed in the focused probe: 2 actual physical-map scans, about 0.9 ms total, across 1,788 cache uses.

## What Is Not Confirmed

1. The benchmark does not yet prove the normal visible game is smoother. The user's live observation says it is worse, and that remains ground truth.
2. No specific regression has been attributed to a specific commit or change-unit yet. Attribution requires isolated revert or apply tests.
3. The benchmark currently measures frame timing and named app timing blocks. It does not yet measure GPU time, draw-call count, or allocations.
4. The normal app at `http://localhost:5173/` was not reachable from this shell during this update, so the visible browser session has not yet been measured directly.

## Important Correction

Earlier benchmark readings from this review pass are invalid as verdict evidence if they used the tiny 7-star fixture, the dev-only route, the wrong browser target, sticky transition recording, or the heavier diagnostic transition path mislabeled as the normal transition path.

## Current Direction

The next highest-value question is why the corrected benchmark fails to reproduce the user's visible complaint. Until that is answered, automated improvements cannot be treated as UX improvements.
