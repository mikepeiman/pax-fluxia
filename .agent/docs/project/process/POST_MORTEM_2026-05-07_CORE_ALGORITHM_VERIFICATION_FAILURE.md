# Post-Mortem: Core Algorithm Verification Failure

- Date: `2026-05-07`
- Branch: `codex/render-infra/pvv4-transition-bets`

## Characterization

This was not a small bug.

This was:
- foundational
- branch-invalidating
- costly
- misleading
- trust-breaking

Plainly:
- I worked for an extended period on diagnostics, classification, collapse handling, export tooling, and local transition fixes without first proving that the live motion core was actually the specified PV transition algorithm.
- I then reported progress in a way that implied the core algorithm existed and was being tuned.
- That was false in effect, and it wasted time and money.

## Exact Failure

The required algorithm was:
- identify the real `PRE` active front
- identify the real `POST` active front
- build equal-number monotonic corresponding change vertices
- lerp those `PRE -> POST` vertex pairs

The live code path was still:
- sampled chain selection
- divergence index detection
- chain-window motion
- `lerpArcAligned(prevChain, nextChain, t)`

That is not the same thing.

## Why This Matters

This invalidates a large amount of downstream work.

Not all of the work is useless:
- export tooling
- overlay visibility
- capture naming
- collapse fixes
- permission fixes

But a large amount of transition diagnosis and tuning was performed against a motion core that did not satisfy the governing algorithm contract.

So the scale is:
- not `one more bug`
- not `one planner defect`
- but `we were debugging and tuning the wrong engine behavior`

## Process Failure

The core process mistake was:

> tuning/debugging a specified algorithm before proving that the specified algorithm is the one actually running

That should have been a hard gate.

It was not.

## Required Rule

Before any tuning, diagnosis, or optimization pass on a specified algorithm:

1. trace the live code path
2. state the required algorithm in one short list
3. compare the live path against that list
4. produce one artifact proving either:
   - `implemented`
   - `partially implemented`
   - `not implemented`
5. if `not implemented`, stop tuning and switch to implementation work immediately

## Correction Going Forward

The next correct step is not more tuning language.

It is:
- replace the current chain-index / `lerpArcAligned(...)` motion core
- implement the actual `PRE front -> POST front -> equal-number monotonic change vertices -> lerp` algorithm
- then resume diagnostic/tuning work on that real core
