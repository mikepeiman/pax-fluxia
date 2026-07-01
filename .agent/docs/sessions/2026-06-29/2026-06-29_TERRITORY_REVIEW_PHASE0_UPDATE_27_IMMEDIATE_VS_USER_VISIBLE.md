# Territory Review Phase 0 Update 27 - Immediate Versus User-Visible Presentation

Timestamp: 2026-06-29 19:00:28 -04:00

Scope: disposable isolation comparison. No product-code fix was committed.

## Question

Should the recovery fix force territory presentation to happen immediately, or is browser `user-visible` scheduling enough?

## Compared Variants

1. Review branch:
   - visible territory presentation scheduled as browser background work.

2. Disposable user-visible scheduler-priority experiment:
   - same review branch, but visible territory task priority changed from `background` to `user-visible`.

3. Disposable immediate-display isolation:
   - background conquest scheduling removed;
   - input-pressure display delay removed;
   - measurement probes added.

## Deterministic Replay

Immediate-display isolation replay hash:

`9f6dae73473ad7528eaa767902a9bcac067a3197c5a0315c9e5577d9e9741910`

This matches the prior replay hash. The immediate-display isolation did not change simulated game rules in this replay.

## Transition Diagnostic Result

`pending display age` means: how long a prepared territory update waits before being shown.

`commit lag` means: time from queue request to finished presentation.

| Mode | Variant | Pending display | Commit lag | Frame p95/p99/worst |
| --- | --- | ---: | ---: | ---: |
| Phase Edges | Review background | median 249.8 ms, worst 263.0 ms | median 211.4 ms, worst 306.3 ms | 25.0 / 33.4 / 141.7 ms |
| Phase Edges | User-visible | median 9.5 ms, worst 10.0 ms | median 116.8 ms, worst 150.8 ms | 41.7 / 50.0 / 158.3 ms |
| Phase Edges | Immediate | 0 / 0 ms | median 35.6 ms, worst 48.9 ms | 50.1 / 66.7 / 166.0 ms |
| Ember Lattice | Review background | median 159.5 ms, worst 268.8 ms | median 127.4 ms, worst 328.8 ms | 25.0 / 33.4 / 125.0 ms |
| Ember Lattice | User-visible | median 9.0 ms, worst 10.9 ms | median 115.0 ms, worst 125.8 ms | 41.6 / 50.0 / 117.7 ms |
| Ember Lattice | Immediate | 0 / 0 ms | median 35.7 ms, worst 37.3 ms | 42.5 / 50.1 / 133.9 ms |
| Phase Field | Review background | median 153.1 ms, worst 199.9 ms | median 203.7 ms, worst 252.3 ms | 16.8 / 33.3 / 100.0 ms |
| Phase Field | User-visible | median 4.0 ms, worst 10.9 ms | median 87.2 ms, worst 106.1 ms | 41.7 / 42.3 / 108.4 ms |
| Phase Field | Immediate | 0 / 0 ms | median 14.4 ms, worst 21.8 ms | 33.3 / 49.9 / 108.3 ms |
| Power Voronoi Runtime | Review background | median 1.4 ms, worst 12.3 ms | median 48.7 ms, worst 59.0 ms | 16.7 / 25.1 / 58.3 ms |
| Power Voronoi Runtime | User-visible | median 1.3 ms, worst 1.3 ms | median 45.4 ms, worst 63.4 ms | 16.7 / 25.0 / 66.6 ms |
| Power Voronoi Runtime | Immediate | 0 / 0 ms | median 0.5 ms, worst 0.7 ms | 16.8 / 25.0 / 74.8 ms |

## Interpretation

Observation:

- Background scheduling hides work by showing old territory longer.
- User-visible scheduling makes visible updates much fresher, usually within about one frame-sized budget in this test.
- Immediate presentation removes queue delay completely and greatly reduces commit lag.
- Immediate presentation can expose worse frame spikes because the expensive work is no longer hidden or delayed.

Conclusion:

The final product fix should not be a simple "always immediate" change by itself.

The final product fix should be:

1. show correct current ownership immediately or within a strict small budget;
2. move expensive transition decoration out of the critical visible update;
3. skip fancy transition decoration when it is late instead of showing stale territory.

Plain English: do not trade stale visuals for smoother-looking frame tables, and do not trade huge frame spikes for perfect freshness if the expensive work can be split.

## Product Direction

Best current target:

- basic correct territory display: immediate or user-visible with strict deadline;
- fancy capture transition: separate preparation path with a deadline;
- if the fancy part misses the deadline, show correct stable territory and skip the fancy transition for that capture.

## Artifacts

Review branch diagnostic:

`C:\Users\mikep\.codex\worktrees\territory-overnight-integration\pax-fluxia\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-25-55-829Z.json`

User-visible scheduler-priority diagnostic:

`C:\Users\mikep\.codex\worktrees\territory-isolate-scheduler-user-visible-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-45-23-340Z.json`

Immediate-display diagnostic:

`C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-release\review-release-gameplay-benchmark-2026-06-29T22-58-19-375Z.json`

Immediate-display replay hash:

`C:\Users\mikep\.codex\worktrees\territory-isolate-revert-conquest-background-20260629\.agent-harness\metrics\review-sim-replay\review-sim-replay-hash-2026-06-29T23-00-17-914Z.json`
