# Territory Transition Diagnosis v4
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Separate the real PVV4 conquest mechanism from `virtualStars`, and document why `virtualStars` drifted into the disappearance path even though they do not belong in this mode's conquest logic.

## Correct PVV4 Conquest Model

For PVV4, the intended conquest mechanism is:

1. a star changes owner
2. ownership emits a conquest event
3. geometry/topology changes
4. transition planning identifies:
   - stable vertices
   - change anchors
   - the minimum changed frontier
5. runtime samples moving frontier sections and rebuilds regions from those sections

That is it.

`virtualStars` are not part of that mechanism.

They are not supposed to decide:

- which region disappears
- where a PVV4 collapse goes
- how frontiers move
- how active-front spans are found

## What `virtualStars` Actually Do Right Now

### Ownership contract

- `pax-fluxia/src/lib/territory/contracts/OwnershipContracts.ts`
  - `OwnershipSnapshot` still includes `virtualStars`
  - `VirtualStar` is defined as ownership-layer payload

### Ownership layer

- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
  - `computeVirtualStars(...)` carries forward old virtual stars
  - on a new conquest, it spawns exactly one new virtual star for `event.newOwner`
  - it does **not** spawn one for `event.previousOwner`

### Ownership version pollution

- `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
  - `buildOwnershipVersion(...)` includes `virtualStarCount`
  - that means `virtualStars` still affect ownership identity even though they are not part of the true PVV4 conquest model

### VFX

- `pax-fluxia/src/lib/territory/integration/TerritoryVFXBridge.ts`
  - conquest emits `virtual_star_spawn` as a VFX event

That is defensible as presentation/VFX side data.
It is not defensible as PVV4 geometry or transition truth.

### Historic transition drift

Until the last checkpoint, `ActiveFrontTransition.ts` still did this:

- `resolveConquestCenter(...)` tried to find a `virtualStar` for the `previousOwner`

That was structurally wrong because the ownership layer only spawns a current-turn virtual star for `newOwner`.

So the code was asking `virtualStars` to answer a PVV4 conquest question they were not designed to answer.

## Exact Deviation

The deviation was:

- PVV4 conquest is supposed to be frontier-motion-based
- but the disappearance path still contained a fallback lookup into `OwnershipSnapshot.virtualStars`

That lookup was not just weak.
It was a category error.

It mixed:

- VFX / geometry-helper residue
with
- the core PVV4 conquest-transition mechanism

## Why This Was Wrong Even Before The Bug

Even when it did not visibly fail, it was still wrong because:

1. PVV4 disappearance should be determined from:
   - actual region loss
   - star membership
   - topology/section ownership
2. PVV4 collapse center for a single-star disappearance should come from:
   - the real captured star position
3. none of that requires `virtualStars`

So the old lookup was never a legitimate part of the design.

## Post-Mortem: Why This Was Only Fixed Now

This should have been audited earlier.

The direct reason it was not fixed earlier is:

1. I treated the disappearing-region bug as mainly a topology-matching problem
2. I spent too long working on:
   - diagnostics
   - local active-front bounds
   - split handling
   - global-vs-local front selection
3. I did not do the simple first-principles audit soon enough:
   - "exactly where does a disappearance get created?"
   - "exactly where does its center come from?"
   - "what data is being used there, and does that data belong in PVV4 at all?"

The real file that should have been audited earlier was:

- `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`

Specifically:

- `planCollapseTargets(...)`
- `resolveConquestCenter(...)`
- `sampleActiveFrontTransition(...)`

That audit would have surfaced earlier that:

- collapse planning was global over unmatched `PREV` loops
- collapse rendering always draws `NEXT` loops plus collapsing `PREV` loops
- collapse-center lookup was reaching into `virtualStars`
- and the ownership layer only spawns a current-turn virtual star for `newOwner`

So the honest answer is:

- I should have treated disappearance as a hard invariant much earlier
- I should have audited the exact line-of-code path sooner
- I did not do that soon enough

## What Is True Now

After checkpoint `30f48f0af`:

- the active PVV4 disappearance guard no longer depends on `virtualStars` for current-turn single-star collapse centers
- it uses live star positions directly
- collapse eligibility is now based on loop-attributed star IDs conquered away on that tick

That fixes the direct misuse.

## What Still Needs To Change

The deeper cleanup still remains:

1. `virtualStars` should move out of the shared PVV4 transition truth
   - they can remain in VFX or geometry-helper paths where genuinely needed
2. ownership versioning should stop depending on `virtualStarCount` for the active PVV4 path
3. any remaining PVV4 transition logic that reads `virtualStars` should be removed

## Recommended Next Diagnostics Surface

The user's request for a live classification overlay is correct.

That overlay should show, per conquest:

1. every structural vertex:
   - unchanged
   - stable anchor
   - change anchor
   - split junction
2. every foundational section:
   - unchanged
   - active
   - split branch
   - defect / unclassified
3. every active sub-section:
   - exact start index / point
   - exact end index / point
4. every collapse target:
   - eligible because full star set was conquered
   - ineligible and suppressed

And it should be able to pause automatically at conquest start and then step frame by frame.
