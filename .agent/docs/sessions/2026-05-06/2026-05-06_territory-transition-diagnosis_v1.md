# Territory Transition Diagnosis v1

## Scope

Diagnose why PVV4 still shows little or no visible gameplay improvement even after the `v7` recovery work and the new diagnostics harness.

This document is diagnostic. It is not a new plan.

## Evidence Base

Reviewed package summaries from:

- `C:\Users\mikep\Downloads\19-07-58---665`
- `C:\Users\mikep\Downloads\15-27-15---056_transition-diagnostic-package`
- `C:\Users\mikep\Downloads\19-07-34---305_unknown-star(human-player)_conquers_star-22(ai-3)_transition-diagnostic-package`
- `C:\Users\mikep\Downloads\15-28-02---366_transition-diagnostic-package`
- `C:\Users\mikep\Downloads\19-41-53---061_cq_s10_a3-hp_tdp.zip`
- `C:\Users\mikep\Downloads\19-41-54---111_cq_s21_a3-a4_tdp.zip`

Reviewed active planner code in:

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\transition\ActiveFrontTransition.ts`

## Main Conclusion

The branch is more truthful and better instrumented, but the active-front planner is still selecting and classifying the wrong universe of border pairs.

That is why gameplay still does not look meaningfully better.

The core problem is not merely polish. It is that the planner still spends most of its effort on unrelated or duplicated border pairs instead of the conquest-local changed frontier.

## Finding 1: The Planner Is Still Global, Not Conquest-Local

In `planActiveFrontTransition(...)`, ownership is passed in, but frontier-pair planning is built from:

- all stable anchors in PRE and POST
- all chains between those anchors
- the union of all anchor-pair keys across the whole topology

Relevant code shape:

- `findStableAnchors(prev, next, ...)`
- `buildChainsBetweenAnchors(prev, anchors)`
- `buildChainsBetweenAnchors(next, anchors)`
- `const allKeys = new Set([...prevByKey.keys(), ...nextByKey.keys()])`

Only collapse planning actually consumes `ownership.conquestEvents` directly.

Result:
- a single conquest still causes the planner to evaluate dozens of anchor-pair keys across the entire map
- most of those keys are unrelated to the conquest
- they naturally resolve to:
  - no change span
  - topology gap
  - fake split classification

This matches the package evidence:

- `19-07-34---305...`
  - pair keys: `40`
  - planned pairs: `1`
- `15-28-02---366...`
  - pair keys: `37`
  - planned pairs: `1`
- `19-07-58---665`
  - pair keys: `38`
  - planned pairs: `2`

The planner is not starved because the conquest is small. It is diluted because the search space is still global.

## Finding 2: Many "Unsupported Split" Defects Are Not Real Splits

The package diagnostics show many cases like:

- `prevPathCount = 2`
- `nextPathCount = 2`

but both paths are just:

- forward orientation of one section
- reverse orientation of that same section

Example from `19-07-34---305...`:

- anchor key: `1054.74,338.83|1113.36,331.86`
- prev paths:
  - `1054.74,338.83->1113.36,331.86:ai-3|ai-4`
  - `1113.36,331.86->1054.74,338.83:ai-3|ai-4`
- next paths:
  - same two oriented duplicates

This is not a real `2:2` split.
It is one foundational section represented twice by direction.

So a large share of current split defects are classification noise caused by path duplication, not actual topological ambiguity.

## Finding 3: "No Change Span" Counts Are Inflated By Unrelated Border Pairs

Many `no-change-span` cases are ordinary unchanged borders elsewhere on the map.

Examples from the same package include keys like:

- `-50,330.43|933.22,-50`
- `-50,330.43|-50,678.03`
- `-50,678.03|844.71,962.5`

These are valid topology pairs, but they are not the conquest-local frontier.

So the current `no-change-span` volume is not telling us "the detector is bad everywhere."
It is telling us:

- the planner is still examining far too many unrelated border pairs

## Finding 4: Coverage Failure Explains The Visual Outcome

The visible result is weak because too few border pairs actually become active fronts.

Observed package summaries:

- `19-07-58---665`
  - planned pairs: `2 / 38`
- `15-27-15---056_transition-diagnostic-package`
  - planned pairs: `2 / 31`
- `19-07-34---305...`
  - planned pairs: `1 / 40`
- `15-28-02---366...`
  - planned pairs: `1 / 37`
- `19-41-53---061_cq_s10_a3-hp_tdp.zip`
  - planned pairs: `0 / 47`
  - evaluation: `collapse_only`
- `19-41-54---111_cq_s21_a3-a4_tdp.zip`
  - planned pairs: `0 / 46`
  - evaluation: `snap_no_fronts`

Even when the internals are more correct, that level of active-front coverage is too sparse to produce a convincing visible transition.

## Finding 5: The Harness Needed One More Compatibility Pass

The newest short-name zip exports use:

- `_diag.json`
- `_geo.json`
- `_topo.json`

The summarizer originally missed those names. That is now fixed.

This matters because diagnosis must work against the actual exported artifacts the user already has, not just the newest package layout.

## Practical Root Cause

There are two immediate root causes:

1. The planner still enumerates global anchor-pair keys instead of first restricting itself to the conquest-local changed frontier.
2. The planner still treats directional duplicates as multiple paths, which inflates fake split classifications.

Together, those two issues bury the real changed frontier inside a large amount of irrelevant or duplicated work.

## Next Fix Sequence

1. Conquest-local frontier gating
   - before pair planning, filter foundational sections to only those relevant to the conquering stars and owners
   - then derive stable-anchor pairs only inside that local envelope

2. Directional deduplication of foundational sections
   - do not let forward/reverse representations of one section become fake multi-path split cases

3. Re-evaluate no-change-span only after steps 1 and 2
   - current no-span counts are too polluted to be the next primary target

## Bottom Line

The branch is not failing because the new diagnostics are wrong.

It is failing because the active-front planner is still global and duplicated where it must become:

- conquest-local
- section-deduplicated
- then change-anchor bounded
