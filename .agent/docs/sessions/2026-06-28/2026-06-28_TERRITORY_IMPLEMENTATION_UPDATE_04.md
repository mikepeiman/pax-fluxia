# Territory Implementation Update 04

Timestamp: 2026-06-28 16:03 America/New_York

## Purpose

Measure whether the fixed-board scan removal still holds during an actual capture transition.

## Scenario

- Mode: `territory_runtime`
- Benchmark: `territory_runtimeConquestAnimation`
- Fixture: 7-star conquest diagnostic map
- Duration: 3000ms

This benchmark forces a capture from `star-0` to `star-6` and watches the animation period.

## Result

- Scenario succeeded: yes
- Order issued: yes
- Target star captured: yes, `star-6` became owned by `human-player`
- Transition fallbacks: 0
- Worker physical-board scans: 0
- Board-layout-key uses: 767
- Worker cache misses: 2
- Worker cache hits: 765

Frame timing:

- Average frame: 8.357ms
- 95th percentile frame: 8.5ms
- Max frame: 16.6ms
- Over 20ms frames: 0
- Over 33ms frames: 0

## Meaning

The runtime worker no longer repeatedly reads the fixed physical board during this capture transition. Territory still updates when ownership changes.

The highest single territory cost in this run was one 7.4ms transition frame, which included a geometry recompute after the capture. That is expected to happen at capture time. It is not the repeated fixed-board scan problem.

## Remaining Work

The remaining renderer fingerprint candidates are mostly older renderers or mode-specific visual caches. They should not be labeled as waste until measured, because many include ownership, ship activity, or visual settings that legitimately change.
