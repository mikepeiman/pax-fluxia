# Territory Transition Diagnosis v5
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Remove the active ownership-layer `virtualStars` violation from the PVV4 path.

## What Changed

The active ownership mode no longer spawns or carries `virtualStars`.

Files:

- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
- `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts`

## Exact Behavior Now

### Star ownership snapshot mode

`StarOwnershipSnapshotMode.compute(...)` now returns:

- `starOwners`
- `contestedLaneIds`
- `conquestEvents`
- `virtualStars: []`

It no longer:

- carries previous `virtualStars`
- spawns new `virtualStars` on conquest

### Ownership identity

`buildOwnershipVersion(...)` and `hashOwnershipState(...)` no longer change with `virtualStarCount`.

That means ownership identity now reflects:

- who owns which star

not:

- helper/VFX residue

## What This Removes

This removes two active-path violations:

1. PVV4 conquest truth no longer contains ownership-layer `virtualStars`
2. ownership version no longer changes because helper objects existed

## What Still Remains

The contract still contains `virtualStars`, and export/VFX code can still serialize or reference that field.

That is acceptable for this checkpoint because:

- the active ownership mode now emits none
- the active PVV4 transition path no longer depends on them

Further cleanup can later remove the field from the shared contract entirely if desired.

## Validation

Passed:

- `bun vitest run src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
