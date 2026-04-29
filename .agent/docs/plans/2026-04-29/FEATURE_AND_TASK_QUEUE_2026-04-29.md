# Feature And Task Queue - 2026-04-29

## Active
- Fix the `metaball_grid` retained-transition regression where conquest visuals can persist after the conquest has ended.
- Validate the `progress=1 -> no activeTransition` boundary in `MetaballGridFamily`.
- Keep scope tight: regression fix first, then user verification.

## Completed
- Added a guard so steady-state paint skipping is blocked while retained transition sprites are still live.
- Added a regression test covering the conquest-end cleanup frame.
- Wrote a dated post-mortem for the regression.

## Next
- User verification in live `metaball_grid` play.
- If any non-conquest cells still animate, revisit transition-attribution semantics separately from this cleanup-boundary fix.
