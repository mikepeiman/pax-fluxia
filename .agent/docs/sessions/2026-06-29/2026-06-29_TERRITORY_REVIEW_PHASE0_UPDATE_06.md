# Territory Review Update 06

Timestamp: 2026-06-29T13:55:08-04:00

Status: review phase. Product-code changes below were made only in disposable isolation worktrees, not on the review branch.

## Question Tested

Does the branch feel worse because territory updates are being prepared but then shown late during conquest transitions?

Plain English: when a star is captured, the colored territory picture should update promptly. A delayed update can look like stutter or stale territory even if animation frames are still arriving.

## What I Isolated

The review branch can send territory presentation work through the browser's background task queue.

Plain English: the browser is asked to run the territory update later, at low priority. That can protect other work, but it can also make the territory picture appear late.

The old baseline/current-master behavior in this focused test used immediate territory presentation only. The review branch used a mix of immediate presentation and background-queued presentation.

## Evidence

Five-run transition benchmark, release build, `/play?bench=1`, saved large map `First Symmetry-6_April 17b`.

`screen delay max` means the longest sampled delay before a prepared territory picture appeared on screen.

| Target | Cell Grid p99 frame / slow frames / screen delay max | Phase Field p99 frame / slow frames / screen delay max |
| --- | ---: | ---: |
| Original baseline | 49.9 ms / 59 / 195.3 ms | 41.7 ms / 21 / 123.0 ms |
| Current master | 66.7 ms / 43 / 229.7 ms | 50.1 ms / 28 / 134.6 ms |
| Review branch | 50.0 ms / 15 / 626.4 ms | 49.9 ms / 25 / 462.1 ms |
| Full immediate isolation | 41.6 ms / 11 / 110.9 ms | 16.8 ms / 6 / 66.7 ms |

## Interpretation

Observation: the review branch is much worse than both comparison points for territory screen delay in these transition tests.

Observation: restoring immediate territory presentation in a disposable worktree removes the background queue from this test and improves both tested modes.

Observation: the same isolation also improves slow-frame counts in these two tests, so it did not merely trade late territory updates for worse frame timing in this measurement.

Conclusion: the branch's background territory-presentation path is a confirmed regression source for these Cell Grid and Phase Field transition measurements.

## What This Does Not Prove

This does not prove it is the only regression source.

This does not prove all modes are fixed.

This does not prove the visual result in the user's live dev-server tab is fixed. The benchmark runs release builds through its own preview server.

## Next

Prepare the smallest product-fix branch that restores immediate territory presentation for the smoothness-first path, then run the same transition benchmark plus broader primary-mode coverage.

