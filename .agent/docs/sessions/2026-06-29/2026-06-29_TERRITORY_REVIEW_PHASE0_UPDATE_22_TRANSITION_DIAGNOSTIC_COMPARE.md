# Territory Review Phase 0 Update 22 - Transition Diagnostic Comparison

Timestamp: 2026-06-29 18:39:56 -04:00

Scope: review only. No product-code fix was made in this step.

## What Was Compared

I compared the same release-mode transition diagnostic on three app versions:

1. Original starting point: `3ddd95386f09933094038d213f16c3b99591f0e6`.
2. Current master comparison worktree: `c2e9afb7a7eb44f9cb0cfa343003e7f6b16a0ffc`.
3. Review branch: `codex/territory-overnight-integration` at `77128de63`.

The test ran these visible territory modes:

- Phase Edges
- Ember Lattice
- Phase Field
- Power Voronoi Runtime

The test used the `transition_diagnostic` scenario on map `First Symmetry-6_April 17b`.

## Main Finding

The review branch often makes frame timing look better by delaying territory updates after conquest or mode changes.

That is not a real improvement. The player sees old territory for longer, so the game can feel stale or janky even when the frame table looks smoother.

## Evidence

`pending display age` means: how long a prepared territory update waited before it was shown. Lower is better. `0 ms` means the app did not leave a prepared territory picture waiting.

| Mode | Original pending display age | Current master pending display age | Review branch pending display age |
| --- | ---: | ---: | ---: |
| Phase Edges | 0 ms | 0 ms | median 249.8 ms, worst 263.0 ms |
| Ember Lattice | 0 ms | 0 ms | median 159.5 ms, worst 268.8 ms |
| Phase Field | 0 ms | 0 ms | median 153.1 ms, worst 199.9 ms |
| Power Voronoi Runtime | 0 ms | 0 ms | median 1.4 ms, worst 12.3 ms |

Observation: the delay is concentrated in Phase Edges, Ember Lattice, and Phase Field. Power Voronoi Runtime is not showing the same delay in this diagnostic.

## Important Correction

The diagnostic label `snap:` is not itself a new regression.

I observed `snap:` labels for Phase Edges, Ember Lattice, and Phase Field in all three versions: original, current master, and review branch. Therefore I should not treat `snap:` as proof that this branch broke transitions.

What is new on the review branch is the delayed display of prepared territory updates.

## Likely Cause To Verify In Isolation

The review branch schedules visible territory presentation through a browser background task in `GameCanvas.svelte`.

Plain English definition: a background task is work the browser is allowed to run later because it is marked as less urgent. That is the wrong priority for the visible map changing after a star is captured.

Code location observed:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `scheduleTerritoryPresentationQueue()`
- branch behavior: `scheduler.postTask(..., { priority: "background" })`

This matches prior web research:

- MDN says `scheduler.postTask()` accepts priorities including `user-blocking`, `user-visible`, and `background`.
- web.dev guidance says visible work should not be delayed behind lower-priority yielded work.

This is still listed as "likely cause" here because the final standard is isolation: revert or rewrite that behavior alone and confirm the delay disappears without creating a worse frame problem.

## Branch Divergence Risk

This review branch and current master both diverged from the original starting commit.

Current master contains fixes this review branch does not contain, including recent smooth-fill and resize/menu work. Therefore the recovery branch should start from current master, not from this review branch.

Do not merge this review branch wholesale into master.

## What This Means For Rectification

The recovery plan should be:

1. Start from current master.
2. Bring over the measurement harness and useful docs.
3. Do not bring over the visible-territory background scheduling as shipped.
4. Rebuild the territory presentation path so it shows correct conquest ownership immediately.
5. Put decorative or expensive transition work behind a separate budget, where it can be skipped if late.
6. Require acceptance tests that include actual delayed-display checks, not only frame timing.
7. Keep Distance Field out of the primary target list. The user's observation that it is janky is useful evidence that shared presentation choices may hurt multiple modes, but it is not the main mode to chase first.

## Current Verdict

- Revert or rewrite the delayed visible-territory scheduling before any product merge.
- Keep the benchmark/reporting tools if they continue to measure real user-visible delay.
- Current master is the safer base for further work.
- The branch is not ready for user-facing merge.

## Artifacts

Original starting point:

`C:\Users\mikep\.codex\worktrees\territory-compare-base-20260628\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-33-17-056Z.json`

Current master:

`C:\Users\mikep\.codex\worktrees\territory-compare-master-current-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-36-18-072Z.json`

Review branch:

`C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-25-55-829Z.json`
