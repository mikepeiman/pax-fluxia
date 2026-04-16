# Post-Mortem: 2026-04-16 - Perimeter Field Plan / Spec / Status Discipline Failure

## Summary

This failure was not just a bad diagnosis. It was a repeated process failure.

I repeatedly reasoned from current implementation details as if they were the operating design, even though the active `perimeter_field` spec and implementation plan already said that key parts of the live path were wrong. That wasted time, degraded trust, and pulled the discussion into fake "debug mode" instead of the required first question:

- what does the active plan/spec require?
- what is the current implementation status against that requirement?

The user was forceful, angry, and explicit about this because the reasoning error was severe, repeated, and expensive. That intensity was not noise. It was an accurate signal that the process had gone off the rails.

## What Went Wrong

### 1. I skipped the contract check

The active docs already established:

- `perimeter_field` transition must use real `PREV` and real `NEXT` perimeter-V states
- changed-front selection must drive motion
- star-center angle heuristics are forbidden
- temporary synthetic transition samples are not compliant

Instead of starting from those facts, I reasoned as if the live implementation might already be basically correct and just suffering from an obscure bug.

That was wrong.

### 2. I treated off-spec logic as something to evaluate

I described the star-centered legacy transition path as if it were a plausible local strategy worth analyzing on its own merits.

That was directly against the active plan and spec. The correct framing was:

- this path is already declared wrong
- the task is to measure current status against that declaration
- any analysis of the path must be framed as diagnosis of a known deviation, not as design evaluation

### 3. I blurred intended design and current code

I repeatedly failed to keep these separate:

- intended design
- current implementation
- current implementation status against intended design

That made explanations sound like goalpost-moving:

- a forbidden heuristic was discussed as if it might be fine
- a missing implementation of the core concept was described too softly
- basic contract violations were narrated like mysterious runtime behavior

### 4. I invented or preserved bad concepts instead of deleting them

Examples:

- `freeze base`
- "NEXT after settle"

Those are not geometry-truth concepts. They are implementation drift or presentation artifacts. By repeating them in reasoning, I helped legitimize them instead of removing them.

### 5. I overcommitted before the evidence justified it

I moved too quickly from partial code inspection to strong causal claims. Some claims had a real basis, but I did not separate:

- confirmed fact
- design violation
- plausible contributor
- proven dominant cause

That violated the reflective-thinking rule and made the conversation more adversarial than it needed to be.

## Why The User's Forcefulness Mattered

The user was not merely objecting to tone. They were objecting to a recurring structural failure:

- plan ignored
- spec ignored
- active status not stated first
- obvious implementation drift described too gently
- wrong concepts preserved in reasoning

The strong language reflected the seriousness of the failure mode:

- time was wasted
- the same class of reasoning error recurred
- the conversation repeatedly drifted away from the binding docs

The correct response to that forcefulness is not defensiveness. It is to harden the operating rules so the failure is less likely to recur.

## Root Cause

The root cause was a process ordering failure:

1. inspect some code
2. start theorizing about the bug
3. only later reconcile findings with the active plan/spec

The correct order is:

1. identify active plan/spec
2. identify current implementation status against them
3. declare whether the path is already off-spec
4. only then diagnose detailed defects

When that order is reversed, implementation drift starts pretending to be design truth.

## Concrete Perimeter-Field Lessons

### 1. `PREV` and `NEXT` are both geometry truth at conquest start

There is no such thing as waiting for geometry to "settle." Settling is a visual or transition-experience concern, not a truth-state concern.

### 2. `freeze base` is a crutch, not a primitive

If a transition needs an imperative "hold the base still" concept to stay coherent, the transition state model is incomplete or wrong.

### 3. `appearing` / `disappearing` is only a provisional classification

Treating unmatched `PREV`/`NEXT` V's as pure births/deaths may be acceptable as an initial implementation device, but it is not yet proven to be the right invariant. It may be necessary to match 100% of changed `PREV`/`NEXT` V's.

### 4. Current code can be known-wrong before it is fully explained

If the plan/spec already forbids a mechanism, the mechanism is wrong even before every symptom is traced.

## Rules Derived

### Rule 1. Plan / spec / status first

Before debugging any bug, regression, or deficiency:

1. identify the active plan
2. identify the governing specs/requirements
3. state current implementation status against them
4. decide whether the code is already off-spec
5. only then begin bug-level hypothesis work

### Rule 2. Never evaluate forbidden heuristics as design options

If the plan/spec says a mechanism is wrong, do not describe it as reasonable, plausible, or maybe-good-enough. Describe it as current wrong behavior.

### Rule 3. Separate four categories explicitly

Every serious diagnosis must distinguish:

- confirmed code fact
- contract/spec requirement
- current implementation status
- causal hypothesis

### Rule 4. Delete drifted concepts instead of reasoning from them

If a concept exists only because of implementation drift, remove it from code and docs. Do not promote it by repeated explanation.

## Required Behavior Change

From this point forward, every substantial perimeter-field investigation must open with:

1. active plan/spec list
2. current implementation status against them
3. explicit statement of off-spec vs on-spec
4. only then root-cause analysis

If that opening is missing, the investigation is already suspect.
