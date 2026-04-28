# Takeaways - 2026-04-27

## Technical
- `metaball_grid` is no longer broadly expensive in steady state; its remaining miss is a narrow update-burst issue.
- The biggest durable problem now is late-game stability rather than short-suite territory cost.
- Overlay redraw caching is worth keeping; it cut canonical overlay cost down into the low hundredths of a millisecond.

## Diagnostics
- The benchmark surface is now good enough for stage-based debugging instead of guess-based debugging.
- Named artifacts matter because `browser-gameplay-benchmark-latest.json` gets overwritten.
- The `214` saved-map lanes vs `428` runtime connections mismatch is still unresolved and should be verified in code.

## Process
- Commit cadence needs to stay regular during long autonomous passes.
- `common/resources/settings-live/current-settings.json` should continue to be included in commits without spending analysis time on it.
