# Post-Mortem: Region Disappearance Category Error
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Characterization

This failure was:

- **category-error-driven**
  - I tried to solve a region-persistence problem with boundary-local hints.

- **indirect when the truth was direct**
  - The real truth was region star membership.
  - I chased section influence instead.

- **pseudo-analytical**
  - I produced intricate reasoning around the wrong object.
  - That is not careful engineering. It is decorated confusion.

- **architecture-blind**
  - I attempted to reason about region disappearance without first insisting on authoritative region membership in the transition path.
  - That means I was solving from the wrong layer.

- **overcomplicated in the face of a deterministic rule**
  - The rule was simple:
    - stars belong to regions
    - a one-star region is an island
    - if that star is conquered, collapse it
  - I failed to stay anchored to that.

- **trust-damaging**
  - I spoke as if local fixes were meaningful progress before they were proven in gameplay.
  - That overclaimed certainty and wasted review cycles.

- **explanation-heavy and accountability-light**
  - When challenged, I drifted into explaining the bad reasoning instead of first naming it as bad reasoning.
  - That is evasive behavior in effect, even if not intended as such.

- **time-wasting**
  - This did not just miss the target.
  - It multiplied effort around the wrong approach.

## Exact Failure

I treated:

- section-local star influence

as if it were:

- authoritative region membership

That was the core mistake.

## Correct Rule

For disappearance and collapse:

- use region ownership and region star membership
- do not infer island status from boundary sections
- do not use shape, centroid, proximity, or secondary evidence

## Required Discipline Change

When the problem is:

- persistence
- disappearance
- identity
- ownership

I must first demand the authoritative object and its deterministic membership.

If I do not have that truth in the pipeline, the first task is to thread it in.
Not to improvise with nearby heuristics.

## Process Failure

I also failed in communication:

- I gave explanations where you requested characterization
- I answered at the wrong level of abstraction
- I used too many words to avoid saying the simple ugly truth:
  - I was reasoning from the wrong data

## Standing Correction

For this workstream:

- no more disappearance logic built from section-local inference
- no more claims of “fixed” before gameplay validation
- no more verbose explanatory detours when a blunt diagnosis is what is required
