# Post-Mortem: 2026-04-14 - Star-Center Reconstruction Instead of Real Perimeter State

## What Happened
`perimeter_field` transition debugging showed that at transition-state `0`, the displayed loser/victor vstars did not match the actual PREV frontier-offset state. The builder was generating transition samples from star-center radial ray hits between old and new owner regions, instead of starting from the real perimeter-vstar state that gameplay had already derived for PREV and NEXT.

That produced obvious failures:
- `F0` was not true PREV
- loser and victor samples appeared mixed at the origin state
- some transition samples appeared as strays or beyond meaningful region bounds
- the diagnostic view could not be trusted to represent actual gameplay truth

## Root Cause
The transition builder solved the wrong problem.

It treated the problem as:
- "given a conquered star and two owner regions, synthesize transition points from the star center"

But the actual gameplay representation was already:
- "the displayed territory is driven by derived perimeter vstars offset from the real perimeter"

So the builder ignored the actual stateful transition primitive and reconstructed a different one from a simpler geometric shortcut. That shortcut was architecturally wrong because it bypassed the same representation used by gameplay.

This is not a tuning miss. It is a representation mismatch:
- gameplay truth was perimeter-vstar state
- transition truth was rebuilt from star-center rays

## Impact
- transition frame `0` was wrong by construction
- debug interpretation became expensive and confusing
- user time was wasted identifying obviously wrong motion that should have been impossible if the diagnostic path were honest
- development attention was pulled into explaining artifacts produced by the wrong primitive

## Corrective Actions
- treat live PREV/NEXT perimeter-vstar state as the authoritative transition endpoints for diagnostics
- capture real family-produced frames from the gameplay loop instead of reconstructing them in a separate diagnostic path
- keep the star-center reconstruction logic under suspicion until it is either replaced with perimeter-sample correspondence or explicitly proven correct for a given mode
- require any future transition builder to demonstrate that `progress = 0` equals real PREV and `progress = 1` equals real NEXT

## Lessons
- never synthesize a new transition primitive when the gameplay system already has one
- frame-zero and frame-one identity are hard invariants, not aesthetic goals
- if a diagnostic frame at `0` is not exactly PREV, the transition model is wrong or the diagnostic path is disconnected
- "simple geometric reconstruction" is not acceptable when the active renderer depends on a richer derived state
