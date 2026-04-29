# Post-Mortem - 2026-04-29 - Territory Transition Debug Failure

## Failure
- The live `metaball_grid` conquest transition timing bug was not fixed after multiple debugging passes and multiple commits.
- User-visible symptom remained constant:
  - conquest transitions still completed visually in roughly `~100-150ms`
  - the Territory Transition slider did not visibly control conquest duration
- I repeatedly changed adjacent timing systems without proving which timing source actually drove the visible `metaball_grid` wave.

## Impact
- Multiple commits were spent on incorrect or incomplete hypotheses.
- User trust was damaged because I claimed plausible causes and partial fixes that did not change live behavior.
- Time was wasted modifying timing policy, transition lifecycle, and scheduler clocks before isolating the exact runtime path that produced the visible motion.

## What The User Saw
- Normal live gameplay.
- `metaball_grid` conquest transitions looked extremely short.
- Slider changes did not matter by eye.
- The same bug remained after several claimed fixes.

## What The Code Actually Did
- There are multiple timing systems in play:
  - shared FX clock for ships and other animation paths
  - territory transition scheduler timing
  - a newer `metaball_grid` local visual-transition timing path in the dirty worktree
- I initially traced and modified the scheduler-side transition path.
- But the active `metaball_grid` family path in the current worktree was also reading `input.nowMs` for a local visual-transition clock.
- `GameCanvas.svelte` was still feeding render-family input with `fxOrchestrator.gameTime` for territory families.
- That meant the visible conquest wave could remain governed by the wrong clock even after I changed the scheduler clock path.

## Mistaken Reasoning
1. I treated one timing path as authoritative before proving it was the one producing the visible wave.
2. I solved by names instead of by final visual consumer.
3. I reasoned from `HEAD` and isolated files too early, while the active dirty worktree contained newer territory-family timing logic.
4. I treated successful tests and builds as meaningful evidence for a live visual bug without equivalent runtime verification.
5. I repeatedly accepted "this seems like the cause" without instrumenting the decisive values at the moment the family consumed them.

## Failed Hypotheses
1. `Bind Territory Transition To Tick` was collapsing duration to a short value.
- This was asserted too strongly and was not consistent with the user's actual play speed.
- The user immediately falsified it.

2. Overlapping conquest entries in `renderFamilyTransitionLifecycle.ts` were the primary cause.
- This was a real lifecycle issue, but not the bug the user was reporting at that moment.
- Fixing it did not resolve live timing.

3. Scheduler-side territory transition clock coupling was the whole problem.
- This was only part of the story.
- The visible `metaball_grid` path had a second local clock.

4. One-sided conquest cell classification was the decisive timing failure.
- That affected which cells animated, but not the slider-insensitive duration bug.

## Process Errors
### 1. I violated the "follow the data, not the names" rule
- I should have started at the exact render-family input consumed by `metaball_grid.update(...)`.
- Instead I changed upstream clocks before proving which value the family actually used for visible progress.

### 2. I failed to treat the user's observation as the main truth source
- The user repeatedly said the live behavior was unchanged.
- I still continued with additional adjacent hypotheses instead of immediately resetting the model.

### 3. I did not respect the dirty-worktree reality soon enough
- `GameCanvas.svelte`, `MetaballGridFamily.ts`, and related files had active local changes.
- I should have treated the current working tree as the runtime truth and traced the entire live path there first.

### 4. I changed code before decisive instrumentation
- The correct debug move was to log or inspect:
  - slider value in `GAME_CONFIG`
  - `activeTransition.durationMs`
  - render-family `input.nowMs`
  - family-local `activeVisualTransition.durationMs`
  - resolved visible `rawProgress`
- I changed logic without first collecting those values from the active runtime path.

### 5. I overvalued build/test success
- Tests and builds only proved code consistency.
- They did not prove that the live visual path the user was seeing had changed.

## Specific Commits In The Failed Sequence
- `ad7d4b80` `fix: restore slider-controlled territory timing defaults`
- `0c87a97a` `fix: decouple territory transition timing from fx clock`
- `4e0b8f86` `fix: drive territory family timing from transition clock`

These commits were not all logically wrong in isolation, but they were part of a failed debugging sequence because each was made before the decisive runtime owner of visible progress was fully proven.

## What I Should Have Done
1. Start from the visible `metaball_grid` motion path and trace forward and backward:
   - `GameCanvas` render-family input
   - `MetaballGridFamily.update(...)`
   - `resolveMetaballGridDisplayProgress(...)`
   - local visual-transition timing
   - actual wave scene emission
2. Instrument the decisive timing values in the active worktree before changing logic.
3. Use git archaeology as soon as the user said the system used to behave differently.
4. Refuse to generalize from scheduler code until the family-local clock path was ruled out.
5. Treat "user says unchanged" as a hard stop requiring model reset, not as a request for one more patch.

## Derived Rules
1. For any visual motion bug, identify every clock in the path before changing any clock.
2. For render-family bugs, trace the exact family input payload that reaches `update(...)`.
3. In a dirty worktree, debug the current worktree path first; do not reason from a cleaner historical mental model.
4. No more timing fixes without logging the consumed values at the final visual owner.
5. If the user reports "same bug, no change," stop patching and reset the diagnosis immediately.

## Required Next Debug Method
- No more speculative timing edits.
- Add temporary runtime diagnostics at the exact `metaball_grid` consumption points:
  - `GameCanvas` render-family input `nowMs`
  - `activeTransition.durationMs`
  - local `activeVisualTransition.durationMs`
  - resolved `rawProgress`
  - source of visible clock selection
- Then reproduce a single conquest and compare those values against the slider setting.

## Status
- Bug remains unresolved at the time of this post-mortem.
- This document is about debugging failure, not a fix.
