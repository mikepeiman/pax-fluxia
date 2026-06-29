# Territory Review Update 07

Timestamp: 2026-06-29T14:00:00-04:00

Status: review phase. Product-code changes below were made only in a disposable isolation worktree.

## Narrowing Question

Is the broad old behavior needed, or is it enough to make only territory presentation immediate again?

Plain English: I tested whether the fix needs to affect every presentation throttle, or just the part that shows the colored territory picture.

## Targeted Isolation

The targeted patch left the current input-pressure helper alone, but changed the territory-picture queue so smoothness-first mode skips the background task.

Plain English: other input-aware throttling stayed as-is. Only the delayed territory-picture queue was removed from this transition path.

## Evidence

Five-run transition benchmark, release build, `/play?bench=1`, saved large map `First Symmetry-6_April 17b`.

`slow frames` means frames slower than about 30 frames per second across the five runs.

`screen delay max` means the longest sampled delay before a prepared territory picture appeared on screen.

| Target | Cell Grid p99 frame / slow frames / screen delay max | Phase Field p99 frame / slow frames / screen delay max |
| --- | ---: | ---: |
| Original baseline | 49.9 ms / 59 / 195.3 ms | 41.7 ms / 21 / 123.0 ms |
| Current master | 66.7 ms / 43 / 229.7 ms | 50.1 ms / 28 / 134.6 ms |
| Review branch | 50.0 ms / 15 / 626.4 ms | 49.9 ms / 25 / 462.1 ms |
| Territory-only immediate isolation | 50.0 ms / 15 / 103.3 ms | 17.8 ms / 7 / 28.5 ms |

Additional observation: the targeted isolation used immediate territory presentation only. The review branch used both immediate presentation and browser background-task presentation.

## Interpretation

Observation: the targeted territory-only change is enough to remove the long pending territory waits in these tests.

Observation: the targeted change does not increase slow-frame counts in these tests. Phase Field improves sharply.

Conclusion: the product fix should start narrow. Restore immediate territory presentation for the smoothness-first path without reverting unrelated scheduling work.

## Next

Create a remediation branch from the review branch and apply the targeted territory-only fix there. Then run build, Svelte check, graph rebuild, and the same focused benchmark before broadening to more modes.

