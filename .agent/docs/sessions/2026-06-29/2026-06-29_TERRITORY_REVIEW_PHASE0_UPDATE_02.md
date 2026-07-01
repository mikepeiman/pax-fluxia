# Territory Review Update 02

Timestamp: 2026-06-29T12:35:00-04:00

Status: review phase only. Product remediation has not started.

## What Changed In The Review

1. The release benchmark can now run either `/bench` or `/play?bench=1`.
2. `/play?bench=1` produced different results from `/bench`, so `/bench` alone is not valid evidence about the player-facing route.
3. A throwaway immediate-presentation experiment showed that forcing every territory update to display immediately is not a valid global fix.
4. A throwaway no-Pixi-probe experiment did not hold up as a strong cause after a five-run confirmation.

## Current Best Read

The main issue is not proven to be repeated physical-map checking. On the review branch, that cost appears low in the measured probe.

The strongest current lead is presentation scheduling: when visible territory updates are queued or delayed, the game can feel stale or uneven even when raw render work looks acceptable. But the fix cannot be a blunt "always render immediately" rule, because that harmed Cell Grid transitions.

## Next Best Work

1. Measure `/play?bench=1` across the primary modes with enough runs for stable p95/p99.
2. Add saved-settings seeding and visible-state checks to the harness.
3. Add a human mode-switch scenario, because direct benchmark mode assignment bypasses the normal UI path.
4. Narrow the scheduling experiment by mode and transition state before any product fix.
