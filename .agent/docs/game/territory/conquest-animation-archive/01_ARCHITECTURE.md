# 01 — Architecture: Attack-Conquest Ship & Star Animations

**Date:** 2026-02-13

## File Map

| File | Role |
|------|------|
| [common/src/combat.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combat.ts) | Symmetric damage formula |
| [common/src/combatResolution.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combatResolution.ts) | 9-step multi-source combat → conquest trigger |
| [common/src/conquest.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/conquest.ts) | Stateless conquest: scatter/retreat/capture + ownership transfer |
| [common/src/engine/TickEvents.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/engine/TickEvents.ts) | Event types: TransferEvent, CombatEvent, ConquestEvent |
| [common/src/engine/GameEngine.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/engine/GameEngine.ts) | Server engine: tick loop → resolveMultiSourceCombat → emit events |
| [pax-fluxia/src/lib/engine/GameEngine.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/engine/GameEngine.ts) | Client engine: tick loop, pause/resume, emits same events |
| [pax-fluxia/src/lib/stores/gameStore.svelte.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/stores/gameStore.svelte.ts) | Bridge: stores tickEvents from engine, consumed by GameCanvas |
| [pax-fluxia/src/lib/components/game/GameCanvas.svelte](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/components/game/GameCanvas.svelte) | Visual rendering: processTickEvents() → ship animations |

## Current Data Flow

```
Engine.executeTick()
  ├── Phase 2: Transfers → events.transfers[]
  ├── Phase 3: Combat → events.combats[]
  │   └── If conquest: events.conquests[]
  └── Callback: onTick(state), onTickEvents(events)

gameStore receives events → stores as tickEvents

GameCanvas.renderFrame()
  ├── const tickEvents = activeGameStore.consumeTickEvents()
  ├── processTickEvents(stars, tickEvents, ...) 
  │   ├── combats → starsInCombat set (for surge animation)
  │   ├── transfers → ship depart/travel pipeline (L1264-1364)
  │   └── conquests → 3 branches:
  │       ├── Scatter (L1377): ships flee to friendly neighbors
  │       ├── Retreat (L1441): ships flee to retreat target
  │       └── No-escape (L1497): 100% captured
  │       Then: attacker ships splice (L1507-1637)
  │           ├── Mode "immediate": teleport to orbit 
  │           └── Mode "surge": place at high radius (never actually travels)
  └── renderShips() → settle animation (L2268)
```

## Key Insight: Why Surge Failed

The surge mode creates ships at the conquered star at `settleStartRadius = star.radius + 40` and eases them into orbit. But this looks like ships appearing from thin air above the star — **they never visually exist at the attacker star** or travel between the two stars.

The **correct approach** is to reuse the existing transfer travel pipeline (L1264-1364) which already handles: depart from orbit → travel through lane → arrive at destination → settle into orbit. This is what regular transfers look like — conquest ship transfer should look identical.

## Transfer Travel Pipeline (The Working Reference)

```
processTickEvents() for transfers:
1. Get source/target stars
2. Calculate lane geometry (laneStart, laneEnd from star edges)
3. Calculate timing (halfTick * departFraction, halfTick * (1-departFraction))
4. Score & sort ships by departure mode (nearside/lifo/fifo)
5. Splice ships from visualShips[source]
6. Set ship state = "departing", departFromX/Y, lane coords, timing
7. Push to travelingShips[]

renderTravelingShips() processes the lifecycle:
- departing: ease from departFromX/Y → laneStartX/Y
- traveling: move along lane with wobble
- arriving (at destination): 
  - Add to visualShips[destination] 
  - Set settleStartTime/Angle/Radius from arrival position
  - Settle animation eases into orbit slot
```

## What Needs To Change

Replace the conquest attacker ship handler to:
1. Splice ships from attacker (same as now)
2. Set them up as **traveling ships** (same as transfer pipeline at L1341-1363)
3. They travel through the lane to the conquered star
4. On arrival, they add to visualShips[conqueredStar] with a settle from above

This eliminates the "naked tick" issue because ships are visually traveling — they're never invisible. The conquered star shows captured/retained ships immediately, and conquest transfer ships arrive ~half a tick later.
