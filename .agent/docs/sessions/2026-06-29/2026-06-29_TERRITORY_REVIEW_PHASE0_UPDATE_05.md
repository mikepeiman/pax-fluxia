# Territory Review Update 05

Timestamp: 2026-06-29T13:34:00-04:00

Status: review phase only. No product remediation has been applied.

## Measurement Added

The benchmark now samples territory screen-update delay during each measured window.

Plain English: it checks whether the game has prepared a new territory picture but waits too long before showing it.

## Corrected Finding

The earlier severe mode-switch result did not reproduce in a five-run focused rerun.

That means I cannot honestly call Ember Lattice or Phase Field mode switching a confirmed branch regression yet. The earlier three-run spike is now treated as an unstable spike, not a proven cause.

## Stronger Finding

Cell Grid and Phase Field conquest transitions now show a clearer problem:

1. Cell Grid transition: frame p99 on the branch is about the same as baseline, but sampled screen-update delay max is 626 ms on the branch versus 195 ms baseline and 230 ms current master.
2. Phase Field transition: frame p99 on the branch is similar to current master, but sampled screen-update delay max is 462 ms on the branch versus 123 ms baseline and 135 ms current master.
3. The branch had pending territory pictures waiting during these windows; baseline and current master did not in this focused run.

## Current Interpretation

Observation: raw frame timing does not fully explain the user's visible jank report.

Observation: delayed territory presentation now does reproduce in focused transition measurements.

Hypothesis: some changes made the app protect frame cadence by letting territory pictures wait too long. That can look worse to a player even if the frame-time table looks better.

This is still not final attribution. The queue-related commits conflict when reverted blindly, so they need deliberate isolation rather than a casual revert.

## Next

Isolate the territory presentation queue changes against Cell Grid and Phase Field transitions. The decisive question is whether removing or narrowing the queue delay brings screen-update delay back near baseline without reintroducing worse frame spikes.
