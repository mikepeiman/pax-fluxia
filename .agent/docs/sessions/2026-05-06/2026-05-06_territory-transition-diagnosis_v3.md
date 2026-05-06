# Territory Transition Diagnosis v3
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Audit the exact PVV4 disappearance path for island conquests and stop the long-running bug where an unrelated region stays visible while a duplicate copy of that same region shrinks to a point and disappears.

## High-Level PVV4 System Overview

For PVV4, the disappearing-region behavior is decided in four steps:

1. Ownership snapshot
   - `StarOwnershipSnapshotMode` derives `starOwners`, `contestedLaneIds`, `conquestEvents`, and `virtualStars`.
2. Geometry + topology
   - the geometry compiler builds region loops and frontier sections
   - `FrontierTopology` is the transition input
3. Active-front planning
   - `planActiveFrontTransition(...)` decides:
     - moving active fronts
     - disappearing loops to collapse
4. Active-front sampling
   - `sampleActiveFrontTransition(...)` draws:
     - every `NEXT` loop rebuilt from sampled section geometry
     - plus every `collapseTarget` from `PREV`, collapsed toward a center point

That last sampling step is the key to the duplicate-shrinking-region bug:

- if a loop is still present in `NEXT`, it is drawn
- if that same loop was also misclassified as a disappearing `PREV` loop, a second copy is drawn and shrunk away

## Exact Code That Causes Disappearance

In PVV4, a region can disappear visually in only these direct ways:

1. Animated collapse
   - `planCollapseTargets(...)` marks a `PREV` loop as disappearing
   - `sampleActiveFrontTransition(...)` calls `collapseLoopToPoint(...)`
   - result: the loop visibly shrinks toward a point over the transition

2. Immediate omission
   - the loop is absent from `NEXT`
   - and it is not drawn as a collapse target
   - result: it is simply not rendered during the transition frame

The exact collapse-render path is:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `planCollapseTargets(...)`
  - `sampleActiveFrontTransition(...)`
  - `collapseLoopToPoint(...)`

## The Island-Conquest Failure Mode

The reported bug is:

- an island is conquered
- some other region, often mainland of the same previous owner, also appears to shrink from its current position
- but that region also remains visible

That means the bug is not "the real region disappeared".
It means:

- the `NEXT` region still exists and is being drawn
- a duplicate `PREV` loop was also marked as disappearing and is being collapsed

That is exactly what the old code did.

## Why The Old Logic Failed

Before this checkpoint, `planCollapseTargets(...)` did this globally:

1. build `prevLoopInfos`
2. build `nextLoopInfos`
3. try to match persistent loops with heuristics
4. classify every remaining unmatched `PREV` loop as disappearing

That logic had three structural weaknesses:

1. It was global
   - it was not limited to the region whose final star set was actually conquered
2. It depended on brittle loop matching
   - `componentId` is still hardcoded to `owner:0` in `buildFrontierTopology.ts`
   - loop matching still falls back to area and centroid heuristics
3. It used the wrong collapse-center source on current-turn captures
   - `resolveConquestCenter(...)` used `virtualStars`
   - but `StarOwnershipSnapshotMode.computeVirtualStars(...)` spawns new virtual stars for `newOwner`, not `previousOwner`
   - so a current-turn disappearing island often fell back away from the real captured star center

## Exact Fix In This Checkpoint

The active-path fix is in:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`

The new rule is:

- an unmatched `PREV` loop is not automatically a collapse target
- it is eligible only if all star IDs contributing to that loop were conquered away on this tick

Mechanically:

1. derive per-loop star IDs from section influence
2. build `conqueredStarIdsByOwner` from conquest events
3. keep only `PREV` loops whose full star set is contained in that owner's conquered-star set
4. for single-star loops, collapse to the actual captured star center from live star positions

Result:

- a one-star island that is genuinely gone still collapses
- an unrelated mainland that was merely mis-matched no longer becomes a collapse target

## Exact Island-Conquest Audit Result

For the user-reported bug class, the exact failure chain was:

1. island conquest happens
2. persistent-loop matching fails on some unrelated loop
3. that unrelated `PREV` loop lands in the unmatched set
4. old code treated the whole unmatched set as disappearing
5. sampler draws:
   - the real `NEXT` loop
   - plus the false collapsing `PREV` copy
6. user sees a duplicate region shrinking away while the real region remains

This checkpoint removes step 4 for loops whose star set was not fully conquered.

## Remaining Structural Risks

The direct island bug is fixed at the transition layer, but two structural problems still remain upstream:

1. `componentId` is still semantically wrong in topology
   - `buildFrontierTopology.ts` still assigns every same-owner loop:
     - `componentId: ${ownerId}:0`
   - that weakens same-owner island/mainland matching

2. loop identity in the frontier map is still enumeration-based
   - `buildFrontierMap.ts` still assigns:
     - `loopId: ${ownerId}:${index}`
   - that is not stable identity

Those do not recreate the exact duplicate-collapse bug after this checkpoint, but they remain topology-quality debt and can still hurt matching quality in other ways.

## Validation

Passed:

- `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`

The new focused regression proves:

- a disappearing single-star loop still collapses
- an unrelated mainland is not collapsed when only a single-star island was conquered

## What To Inspect Next

Fresh PVV4 playtest cases:

1. conquer a true one-star island
   - expected: only that island collapses
   - expected: collapse center is the captured star center
2. conquer an island while the same previous owner still has mainland elsewhere
   - expected: the mainland stays drawn once
   - expected: no duplicate shrinking mainland copy
3. toggle underlying geometry diagnostics
   - expected: normal geometry still visible
   - expected: no ghost collapse polygons unless a real final-region disappearance happened
