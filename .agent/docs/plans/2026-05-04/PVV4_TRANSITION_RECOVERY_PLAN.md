# PVV4 Transition Recovery Plan

## Situation

The branch does not currently produce a reliable visual improvement over the earlier PVV4 baseline.

Observed reality:

- some conquests snap
- some conquests animate with gross deformation
- some conquests incorrectly collapse unrelated regions
- playtest alone is not a trustworthy judge right now because too much is erratic at once

This means the immediate problem is not "make it smoother."

The immediate problem is:

**restore a trustworthy path from evidence -> diagnosis -> local fix -> visual verification**

## Core Intention

Build one rock-solid PV transition mode whose motion is governed by **minimal border transport**.

That means:

- unchanged borders stay still
- changed borders move only inside the smallest justified interval
- 3-way junctions are treated as first-class structural anchors
- split cases are planned explicitly, not hand-waved
- when a safe local transition cannot be justified, the mode snaps instead of deforming

## Hard Rules

These are not preferences. They are branch law.

1. Snap is better than gross deformation.
2. Whole-region motion is invalid.
3. Whole-region birth is invalid.
4. A region may only collapse if it truly exists in `PREV` and truly disappears in `NEXT`.
5. Every animated border point must be explainable by a bounded transport story.
6. Change anchors are not decoration. They are the controlling concept.
7. Diagnostics must describe the actual runtime behavior, not an approximate story about it.

## The Real Target

The target is not "more conquests animate."

The target is:

**only the correct conquests animate, and they animate locally, coherently, and truthfully**

The practical hierarchy is:

1. correct snap
2. correct local animation
3. mildly distorted animation, only if clearly better than the corresponding snap
4. gross animation is unacceptable even if it feels more continuous

## Problem Decomposition

There are four distinct problems mixed together right now:

1. **Evaluation ambiguity**
   - live playtest does not clearly tell us which checkpoint is better
   - packages exist, but they are not yet the primary decision surface

2. **Planner truth problem**
   - the system does not yet define the moving frontier interval with enough structural rigor
   - especially around 3-way junctions and `1:2` / `2:1` cases

3. **Runtime truth problem**
   - even when a local changed span is identified, runtime may still move too much geometry
   - section-level transport can leak beyond the intended local frontier interval

4. **Lifecycle false-positive problem**
   - collapse / disappear logic can still produce catastrophic visual lies if loop identity is misread

These problems must be solved in order.

## Recovery Strategy

This is a recovery plan, not a "keep trying ideas" plan.

Each stage below exists to make the next stage trustworthy.

---

## Stage 0: Make Evaluation Trustworthy

### Intention

Stop relying on vague memory from playtest and build a fixed decision surface for judging PVV4.

### Non-goal

Do not improve the transition yet.

### Concrete Work

1. Create a locked **PVV4 casebook** of canonical conquest packages.
2. Group the casebook by failure class:
   - acceptable snap
   - unacceptable deformation
   - false collapse
   - long-front over-transport
   - split/junction ambiguity
3. For each case, store:
   - package path
   - one key frame path
   - one-sentence diagnosis
   - expected acceptance rule
4. Use these same cases for every future bet.

### Success Condition

From one document, we can say:

- which cases define the branch
- what “better” means for each case
- whether a checkpoint won or lost

### Failure Condition

If we are still deciding by memory like “this maybe felt better,” Stage 0 is not complete.

---

## Stage 1: Make Diagnostics Truthful

### Intention

Ensure exported diagnostics and on-screen overlays reveal the exact runtime/planner truth.

### Non-goal

Do not yet change transition behavior unless necessary to expose the truth.

### Concrete Work

1. Make every active-front package answer these questions directly:
   - why did this pair animate?
   - why did this pair snap?
   - why did this loop collapse?
   - which anchors were treated as stable?
   - which anchors were treated as change anchors?
   - which local interval actually moved?
2. Add explicit split diagnostics:
   - `splitMode`
   - junction ids involved
   - whether the pair had a bounded local plan
   - why it was rejected if it was rejected
3. Add explicit lifecycle diagnostics:
   - which loops were matched across `PREV` and `NEXT`
   - which loops were considered truly disappearing
4. Make overlays derive from the same sampling logic the runtime uses.

### Success Condition

Given one package, we can determine the exact reason for:

- snap
- deformation
- collapse
- over-transport

without guessing.

### Failure Condition

If the package still tells a vague story like “animated_fronts” without showing the exact bounded moving interval and exact anchor logic, Stage 1 is not complete.

---

## Stage 2: Rebuild Anchor Semantics

### Intention

Define change anchors correctly and make them the structural boundary of motion.

### Non-goal

Do not yet optimize motion feel.

### Concrete Work

1. Define two anchor classes clearly:
   - **Stable anchors**
     - points that must remain pinned
   - **Change anchors**
     - the first and last points that justify local border transport
2. Elevate **3-way junctions** to default change-anchor candidates.
3. Treat `1:1`, `1:2`, and `2:1` as distinct planning modes.
4. For each owner-pair frontier candidate, compute:
   - stable anchor envelope
   - candidate junction anchors
   - bounded local changed interval
5. Only accept a pair if a **monotone local transport story** exists.

### Success Condition

For every planned animated pair, we can point to:

- stable anchor start/end
- change anchor start/end
- one bounded local interval that must move

### Failure Condition

If the planner still says “this whole section overlaps the change” and therefore moves it, Stage 2 is not complete.

---

## Stage 3: Rebuild Runtime Sampling Around Local Intervals

### Intention

Make runtime transport obey the planner’s local interval exactly.

### Non-goal

Do not solve every split case yet.

### Concrete Work

1. Start from stable `NEXT` geometry.
2. Replace only the local moving interval.
3. Keep both tails outside the change anchors static.
4. For `1:1` cases:
   - local interpolation must be bounded by the change anchors
5. For split cases:
   - animate only if each branch receives a bounded local interval
   - otherwise snap

### Success Condition

Mid-transition frames show:

- moving interior
- pinned tails
- no whole-section drag
- no whole-region drift

### Failure Condition

If distant static geometry still influences the moving interior, Stage 3 is not complete.

---

## Stage 4: Lock Lifecycle Rules

### Intention

Ensure collapse/disappearance behavior is narrow, correct, and never creates fake region events.

### Non-goal

Do not invent a symmetric “appearance” animation.

### Concrete Work

1. Collapse only genuinely disappearing `PREV` loops.
2. Never animate a `NEXT`-only loop by growing it from a center.
3. Match loops semantically before deciding disappearance:
   - owner
   - component
   - outer vs hole
   - centroid/area fallback
4. If lifecycle truth is ambiguous, prefer snap over fake collapse.

### Success Condition

No unrelated region collapses. No appearing region “births.”

### Failure Condition

If a package shows a stable region outlined as collapsing, Stage 4 is not complete.

---

## Stage 5: Solve Split Planning Explicitly

### Intention

Handle `1:2` and `2:1` cases as a first-class problem rather than a leftover exception.

### Non-goal

Do not pursue continuity at any cost.

### Concrete Work

1. Build explicit planning rules for split pairs around junctions.
2. Require the split to be decomposable into bounded local sub-fronts.
3. Use the junction as the natural structural anchor when appropriate.
4. If the split cannot be explained as bounded local border transport, snap it.

### Success Condition

A split case either:

- animates with clearly bounded local motion on each branch

or

- snaps cleanly without collateral deformation

### Failure Condition

If split support requires broad translation of neighboring borders, Stage 5 is not complete.

---

## Stage 6: Only Then Tune Feel

### Intention

After correctness is trustworthy, tune fluidity.

### Non-goal

Do not use easing or smoothing to hide a planner/runtime lie.

### Concrete Work

1. Revisit progress timing.
2. Revisit mild anti-kink shaping inside already-correct moving intervals.
3. Reject any feel improvement that broadens transport.

### Success Condition

The mode feels smoother **without** becoming less truthful.

### Failure Condition

If a timing or smoothing change makes a case look “better” only by disguising the wrong motion, Stage 6 is not complete.

## Immediate Execution Order

This is the exact order to proceed.

1. Build the fixed PVV4 casebook.
2. Upgrade diagnostics so one package fully explains one conquest.
3. Rework anchor semantics, with 3-way junctions treated as default structural candidates.
4. Rework runtime sampling so only bounded local intervals move.
5. Lock collapse-only lifecycle truth.
6. Add explicit split planning.
7. Only then return to timing/feel tuning.

## Decision Gates

Do not advance stages casually.

- Do not leave Stage 0 until evaluation is stable.
- Do not leave Stage 1 until packages are truthful.
- Do not leave Stage 2 until anchor logic is explicit and inspectable.
- Do not leave Stage 3 until long-front over-transport is visibly reduced.
- Do not leave Stage 4 until false collapses are gone.
- Do not leave Stage 5 until split cases either animate locally or snap cleanly.
- Do not enter Stage 6 while correctness remains erratic.

## What This Plan Explicitly Rejects

This plan rejects:

- architecture-first cleanup
- broad transition rewrites justified only by elegance
- whole-region continuity stories
- “animate more cases” as a success metric
- smoothing over wrong transport
- continuing by intuition alone

## The First Real Next Step

The next implementation step should be:

**build the PVV4 casebook and upgrade diagnostics until one package can explain one conquest with no ambiguity**

That is the foundation required before touching transition behavior again.
