# Territory Transition Diagnosis v7
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Implement the ownership/conquest-source cleanup:

- keep ownership snapshotting simple
- thread authoritative engine conquest events into the territory runtime
- stop using owner diffs as the only conquest source
- still preserve supplemental owner-diff events for multi-star side effects not named directly by the engine conquest batch

## What Changed

Files:

- `pax-fluxia/src/lib/territory/contracts/OwnershipContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryFrameInput.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts`

## Exact Behavior Now

### Territory input

`TerritoryFrameInput` now optionally carries:

- `authoritativeConquests?: readonly ConquestEvent[]`

`GameCanvas.svelte` now feeds the canonical territory runtime from:

- `activeGameStore.peekTickEvents()?.conquests ?? []`

This happens before the later `consumeTickEvents()` call, so territory sees the current conquest batch on the same render frame without interfering with the existing FX/combat-log pipeline.

### Ownership layer

`StarOwnershipSnapshotMode.computeConquestEvents(...)` now does this:

1. map any authoritative engine conquest events into `TerritoryConquestEvent`
2. if no previous snapshot exists, return those authoritative events directly
3. otherwise diff current `starOwners` against previous `starOwners`
4. add only those diff-based conquest events whose `starId` was **not** already covered by the authoritative batch

So the active priority is now:

- authoritative engine conquest truth first
- owner-diff supplementation second

### Territory conquest event payload

When the event comes from the engine, territory now preserves:

- `tick`
- `attackerStarId`
- `attackerStarIds`
- `attackerShipTransfers`
- `shipsCaptured`
- `shipsEscaped`
- `shipsDestroyed`
- `shipsTransferred`
- `conquestType`
- `retreatTargetId`
- `scatterTargetIds`
- `scatterShipCounts`

and still adds:

- `atMs`

## Why The Supplement Matters

This keeps side-effect ownership changes visible to territory.

Example:

- one direct conquest event is emitted for the conquered star
- portal-group or other game-rule side effects also flip additional stars
- those additional star flips may change geometry and must still be visible to territory transition logic

If territory used the authoritative conquest batch alone, those additional ownership flips could become invisible to the transition layer.

The supplement closes that gap.

## Validation

Passed:

- `bun vitest run src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
