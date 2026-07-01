# Territory Review Phase 0 Update 25 - Pending Display Instrument Check

Timestamp: 2026-06-29 18:52:58 -04:00

Scope: measurement-instrument verification. No product-code fix was made.

## Question

Can I trust the `pending display age` comparison between original baseline, current master, the review branch, and the disposable scheduler-priority experiment?

## What The Instrument Reads

The benchmark samples `window.__PAX_BENCH__.getTerritorySchedulerSnapshot()`.

That app-side snapshot includes:

- `territoryPresentationPendingAgeMs`
- `territoryPresentationLastScheduleMode`
- `territoryPresentationLastCommitLagMs`
- `territoryPresentationPostedCount`
- `territoryPresentationCompletedCount`

Plain English: it is not guessing from frame timing. It reads the app's own territory presentation queue state while the benchmark is running.

## Instrument Check

I checked the `phase_edges.transition_diagnostic` artifacts for all four compared app versions.

| Version | Scheduler samples present? | Pending-display field present? | Schedule mode seen | Pending display max |
| --- | ---: | ---: | --- | ---: |
| Original starting point | yes | yes | `immediate` | 0 ms |
| Current master | yes | yes | `immediate` | 0 ms |
| Review branch | yes | yes | `scheduler-background` | 249.8 / 263.0 / 189.5 ms across the 3 runs |
| Disposable user-visible priority | yes | yes | `scheduler-user-visible` | 10.0 / 9.5 / 9.1 ms across the 3 runs |

## Conclusion

The pending-display instrument is valid for this specific conclusion:

- original baseline and current master showed immediate presentation in this diagnostic;
- the review branch showed background-scheduled presentation with large pending delay;
- changing only browser task priority to user-visible greatly reduced that delay.

This does not prove every visual issue. It proves the delayed-display queue problem is real and measured by a relevant app-side signal.

## Remaining Limit

The instrument measures queue delay, not whether the rendered picture is visually correct. Final product acceptance still needs screenshots or visual checks to catch blank, stale, or wrong territory even when pending-display age is low.
