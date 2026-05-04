# PVV4 Transition Bets Plan

## Purpose

Improve `PVV4` so its transitions are visually good enough for acceptance without destabilizing the geometry or steady-state result, and without paying a noticeable performance cost.

User goal, in the user's words:

> this mode is close to acceptance. it is good. it is much less messed up than 50 prior attempts. what we need to improve are small details.

This plan is intentionally **result-first**, not architecture-first. Any concept only survives if it improves the actual visual result.

## Current Truth

- The user reports:
  - steady-state geometry is already good enough
  - the remaining problem is transition fluidity and correctness/consistency
  - the failure mode to avoid is over-correcting into a broader rewrite
- Working technical read:
  - the likely remaining issues are local motion issues, not global geometry issues
  - the most plausible seams are:
    - time shaping
    - changed-front isolation
    - correspondence stability on edge cases
    - local path smoothness during motion
    - birth/death/split handling
- Process implication:
  - no large rewrite
  - no additive pile of half-related tweaks
  - one bet at a time, with a visible yes/no read before stacking another

## Non-Negotiables

- Preserve the current steady-state look unless an experiment explicitly proves a visual win.
- Preserve exact `t=0` and exact `t=1` parity.
- Do not broaden the moving area unless the experiment is specifically about that.
- Prefer changes that stay inside the runtime transition seam over changes that spread into unrelated layers.
- Do not clean up naming, architecture, or docs as part of the visual fix unless they directly unblock the experiment.

## Acceptance Criteria

The mode is acceptable when all of these are true:

1. `PRE` looks exact at transition start.
2. `POST` looks exact at transition end.
3. Unchanged fronts stay visually locked.
4. The changed front moves as one coherent visual event.
5. No obvious kinks, pops, breathing, sliver flicker, or wrong-side motion.
6. Repeated conquests do not produce inconsistent motion quality between similar cases.
7. There is no noticeable FPS regression in live play or transition stress cases.

## Baseline Cases

Before changing behavior, keep a small fixed comparison set:

1. Simple bite: one attacker taking one adjacent star.
2. Shallow graze: a conquest where the changed front slides more than it expands.
3. Junction case: a conquest near a 3-way junction or split/merge-looking area.
4. Small loser remnant: a case that creates or removes a small sliver/island.
5. Back-to-back conquests: two nearby conquests in short succession.

Every experiment is judged against the same set.

## Experiment Protocol

### Branch / commit discipline

- This worktree is currently at detached `HEAD`.
- Before implementation work begins, attach it to a named branch.
- Recommended branch:
  - `codex/render-infra/pvv4-transition-bets`
- Commit cadence:
  - one approach = one commit series
  - one substantive visual bet per commit
  - push after each checkpoint commit
- If a bet clearly loses visually, revert it before starting the next bet.

### Guardrails

- Do not stack two independent motion ideas before reading the first one visually.
- If a change touches more than the transition seam plus one supporting file, stop and justify it before continuing.
- If a change makes one baseline case better but two worse, reject it.
- If a change improves visuals but costs noticeable frame time, either optimize it immediately or reject it.

### Artifacts per experiment

For each bet, capture:

- files touched
- exact hypothesis
- baseline cases checked
- visual verdict
- performance verdict
- keep / revert decision

## Distinct Approaches

## Approach A: Time-Profile Refinement

### Hypothesis

The spatial motion is mostly acceptable already. The remaining "not fluid enough" problem is largely caused by the time curve and handoff shape.

### Change scope

- `pax-fluxia/src/lib/territory/layers/transition/SharedTransitionClock.ts`
- any progress shaping inside the active-front sampler, if needed

### Candidate bets

1. Replace purely linear progress with a gentler ease that preserves exact endpoints.
2. Try a slightly slower start and faster middle to reduce "mechanical" motion.
3. Try a slightly stronger ease-out near settle if the front currently feels abrupt at the end.

### Why this is attractive

- lowest risk to geometry correctness
- near-zero code spread
- likely free or nearly free in performance terms

### Failure signs

- motion feels laggy or indecisive
- the transition loses urgency
- repeated conquests feel mushy

## Approach B: Motion-Isolation Tightening

### Hypothesis

The mode is close because the core path is mostly right, but the runtime is letting too much geometry move, or it is identifying the changed span too broadly.

### Change scope

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

### Candidate bets

1. Tighten stable-anchor acceptance so only truly unchanged anchors pin the motion.
2. Tighten changed-span detection so neighboring static sections stay harder pinned.
3. Reduce activation of sections outside the real changed interval.
4. Raise or tune the "effectively static" threshold only if it visibly suppresses small noisy motion without causing snaps.

### Why this is attractive

- directly targets "correct/consistent enough"
- preserves the overall transition concept
- can improve both correctness and perceived smoothness by shrinking the moving area

### Failure signs

- front motion snaps instead of flows
- a genuinely moving section gets frozen incorrectly
- edge cases start teleporting

## Approach C: Correspondence Stabilization

### Hypothesis

The bad cases are not about time feel. They come from a minority of conquests where previous/next chains are matched or split poorly, especially around split/merge-like cases.

### Change scope

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

### Candidate bets

1. Improve chain matching beyond simple centroid-nearest behavior.
2. Add endpoint/orientation-aware scoring before accepting a chain match.
3. Replace naive split/merge helpers with more arc-position-aware pairing.

### Why this is attractive

- highest leverage for "looks wrong on some cases"
- attacks inconsistency at the source instead of masking it later

### Failure signs

- broader regressions across cases that were already good
- more code churn than the visual win justifies

## Approach D: Local Path Shaping / Anti-Kink Pass

### Hypothesis

Correspondence is mostly correct, but straight per-vertex lerp creates visible kinks or hard mechanical bending mid-transition.

### Change scope

- post-processing of interpolated active-front points only
- anchors/endpoints remain locked

### Candidate bets

1. One light relaxation pass on interior moving vertices only.
2. A capped tangent-guided local smoothing pass, only inside the active interval.
3. Optional smoothing strength taper toward anchors so endpoints stay exact and calm.

### Why this is attractive

- specifically targets "fluid enough"
- keeps PRE/POST exact if applied only between endpoints

### Failure signs

- front starts "breathing"
- apparent shrink/grow unrelated to conquest
- measurable frame cost from per-frame smoothing

## Approach E: Special-Case Birth / Death / Split Polish

### Hypothesis

Most of the ugliness may be concentrated in a few special cases:

- disappearing loser remnants
- new tiny slivers
- `1->2` and `2->1` front behavior

### Change scope

- collapse target handling
- split/merge-specific path logic
- special-case appearance/disappearance shaping

### Candidate bets

1. Improve collapse target placement so dying loops retract more naturally.
2. Add more disciplined handling for split/merge motion.
3. Delay or soften tiny born/dying details if they are the main source of pop/flicker.

### Why this is attractive

- can clean up the ugliest remaining edge cases without changing the common case

### Failure signs

- special-case logic starts multiplying
- rare-case fixes damage the simple cases

## Recommended Order

Run approaches in this order unless a specific baseline case proves otherwise:

1. Approach A: time-profile refinement
2. Approach B: motion-isolation tightening
3. Approach D: local path shaping / anti-kink pass
4. Approach C: correspondence stabilization
5. Approach E: special-case birth / death / split polish

Reason:

- `A` is the cheapest and safest visual bet.
- `B` is the next-best correctness bet without rewriting the model.
- `D` should only shape motion after the moving set is already constrained.
- `C` is more invasive and should be targeted by actual failing cases.
- `E` is best held for cleanup after the common path is stabilized.

## Stop Conditions

Pause and reassess if any of these happen:

- two consecutive bets make the mode worse or merely different
- a proposed fix needs a new parallel runtime path
- the work expands beyond transition-local files into broad architecture cleanup
- performance drops enough to become noticeable during live conquests

## Working Assumptions

- The user's visual report is the authority: the mode is already close.
- The winning path is likely a small number of local fixes, not a new system.
- The right answer may be "keep almost everything, change only motion shaping and one or two heuristics."

## Memory Gaps

- There is still some source-level inconsistency between mode naming/selection and the live result the user reports.
- Treat that as background noise unless a specific experiment proves it is on the hot path.
- Do not spend experiment budget on cleanup-only reconciliation unless it directly blocks a winning visual fix.

