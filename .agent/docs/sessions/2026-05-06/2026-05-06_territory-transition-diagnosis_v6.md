# Territory Transition Diagnosis v6
Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Purpose

Answer two architecture questions precisely:

1. How does the active ownership layer determine who owns each star?
2. Why does the territory runtime currently re-derive conquest events instead of consuming the authoritative conquest events already emitted by the shared game engine?

## Exact Ownership Flow

The active ownership layer does **not** decide ownership.

It reads ownership from the star state that already came out of the simulation.

Files:

- `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
- `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
- `common/src/combatResolution.ts`
- `common/src/conquest.ts`
- `common/src/engine/GameEngine.ts`

### What the ownership layer actually does

`StarOwnershipSnapshotMode.compute(...)` calls:

- `buildOwnershipStarOwners(input.stars)`
- `buildOwnershipContestedLaneIds(input.lanes, starOwners)`
- `computeConquestEvents(input, starOwners)`

`buildOwnershipStarOwners(...)` is simple:

- iterate `stars`
- read `star.ownerId`
- copy it into `Map<starId, ownerId>`

So the ownership layer is building a territory-friendly snapshot of ownership truth.
It is not calculating conquest or choosing a winner.

### Where ownership is really decided

Ownership is decided earlier, in the shared combat/conquest path:

- `resolveMultiSourceCombat(...)` in `common/src/combatResolution.ts`
- `applyConquest(...)` in `common/src/conquest.ts`

The actual ownership mutation is:

- `defender.ownerId = attacker.ownerId`

That happens inside `applyConquest(...)`.

So the real order is:

1. combat resolves
2. conquest logic mutates the star owner
3. engine emits conquest event
4. territory later reads the already-mutated star state

## Exact Conquest Event Flow

The shared engine already emits authoritative conquest events.

Files:

- `common/src/engine/TickEvents.ts`
- `common/src/engine/GameEngine.ts`
- `pax-fluxia/src/lib/stores/activeGameStore.svelte.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

### Engine event emission

`GameEngine.resolveMultiSourceCombat(...)` pushes:

- `events.conquests.push({ ... })`

with authoritative data such as:

- `tick`
- `starId`
- `attackerStarId`
- `attackerStarIds`
- `attackerShipTransfers`
- `previousOwner`
- `newOwner`
- `conquestType`

### Client event pipeline

The client already queues and consumes these events:

- `activeGameStore.pushTickEvents(...)`
- `activeGameStore.consumeTickEvents()`
- `GameCanvas.svelte` processes `tickEvents`
- `FXOrchestrator` dispatches conquest events for VFX

So the application already has an authoritative conquest event stream.

## Why Territory Re-Derives Conquests Today

Because the territory runtime input contract does not receive authoritative conquest events.

`TerritoryFrameInput` currently contains:

- `tickId`
- `nowMs`
- `stars`
- `lanes`
- `players`
- `world`
- `selection`
- `tunables`

It does **not** contain:

- `tickEvents`
- `conquests`
- any authoritative conquest batch

Because of that, `StarOwnershipSnapshotMode.computeConquestEvents(...)` falls back to diffing:

1. current `starOwners`
2. previous `starOwners`

and emits a territory-local conquest event whenever:

- a star existed before
- the owner changed

This is why territory conquest events currently carry:

- `starId`
- `previousOwner`
- `newOwner`
- `atMs`

and only optionally carry attacker fields when some other path overlays them later.

## Architectural Assessment

### What is good about the current diff

The diff-based method is:

- simple
- self-contained
- independent of the simulation event pipeline

It guarantees that territory can still detect ownership changes from raw frame state alone.

### What is wrong with it

It is not the best source of conquest truth.

It loses information the engine already knows:

- authoritative tick of conquest
- attacker star set
- per-attacker ship transfers
- conquest type

It also duplicates a decision the engine already made.

So the current situation is:

- ownership truth is authoritative
- conquest event truth is re-derived

That split is workable, but it is not the clean end-state architecture.

## Recommended Direction

Keep the ownership layer responsible for:

- `starOwners`
- `contestedLaneIds`
- ownership-version building

Stop forcing it to be the primary conquest-event detector once authoritative conquest events are available.

The cleaner design is:

1. simulation decides conquest
2. engine emits authoritative `TickEvents.conquests`
3. `TerritoryFrameInput` carries a conquest batch for that frame or tick
4. territory uses that authoritative batch directly
5. ownership diff remains only as a safety check or fallback

## Conclusion

`StarOwnershipSnapshotMode` does not decide who owns each star.
It reads `star.ownerId` after the simulation has already decided conquest.

The territory runtime currently re-derives conquest events only because its input contract does not receive the authoritative conquest events that the engine and client already have.
