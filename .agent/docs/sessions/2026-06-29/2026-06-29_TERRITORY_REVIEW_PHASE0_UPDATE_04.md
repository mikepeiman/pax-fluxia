# Territory Review Update 04

Timestamp: 2026-06-29T13:10:00-04:00

Status: review phase only. No product remediation has been applied.

## What Changed In Measurement

I added a `mode_switch` measurement to the release benchmark. It starts a live game, clicks the visible render-mode button in the top bar, and records the next three seconds.

This is closer to what a player experiences than directly changing the mode inside the benchmark.

## Important Finding

The review branch does have player-facing switch regressions:

1. Switching into Ember Lattice is much worse: p99 frame time changed from 9.3 ms on the original baseline and 16.6 ms on current master to 66.3 ms on the review branch.
2. Switching into Phase Field is worse: p99 changed from about 9 ms on both comparison points to 42.1 ms on the review branch.
3. Switching into Phase Edges and Cell Grid also got worse in their slowest frames.
4. Switching into Grid Gradient has better frame timing than baseline/master, but the delay before the prepared territory picture is shown got worse.

## Current Interpretation

Observation: the earlier steady gameplay and conquest-transition table did not reproduce "worse in every mode" by frame timing.

Observation: this topbar-switch test does find clear regressions in player-facing mode changes.

Hypothesis: some of the user's "more janky" report may come from mode switching and delayed territory presentation, not only from steady gameplay frame timing.

This hypothesis still needs change-by-change isolation before blaming any product change.

## Next

The next review target is isolating the Ember Lattice and Phase Field mode-switch regressions because they are the clearest branch-only harm found so far.
