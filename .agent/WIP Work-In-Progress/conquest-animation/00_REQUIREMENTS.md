# 00 — Requirements: Attack-Conquest Ship & Star Animations

**Date:** 2026-02-13  
**Scope:** Visual ship animation during attack combat → conquest → ownership transfer

## What Must Happen Visually

### During Combat (Before Conquest)
1. Attacker ships **surge** toward target star ([GameCanvas:L2081-2201](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/components/game/GameCanvas.svelte#L2081-L2201))
2. Defender ships orbit normally (no counter-surge currently)
3. Ships disappear (killed/disabled) from both sides per tick

### At Conquest (The Critical Moment)
1. **Defender ships**: scatter/retreat/captured depending on escape routes
2. **Attacker ships**: a subset transfers from attacker star → conquered star
3. **Star color**: changes to attacker's color
4. Ships that transfer must **visually fly from attacker → conquered star** (like regular transfers)
5. Ships arrive at conquered star and **settle into orbit from above**

### After Conquest
1. Remaining attacker ships continue normal orbit
2. Conquered star shows new owner's ships in orbit
3. Any escape/scatter ships visually travel to their escape routes

## User's Core Requirement
> "Ships fly from the attacker to the conquered star and settle into orbit"

This means: conquest ship transfer → same visual as regular ship transfer animation (depart orbit → travel lane → arrive → settle). NOT a teleport or radius-only settle.

## Previous Failed Approaches
1. **Immediate spawn** (popcorn): Ships appear instantly at conquered star — no travel ❌
2. **Surge-to-orbit** (settleStartRadius above orbit): Ships appear at conquered star from above — but no actual travel from attacker ❌

## What Will Work
Use the **existing transfer travel animation** (depart → lane → arrive → settle) for conquest ships. The conquest handler should splice attacker ships and feed them through the same `travelingShips` pipeline used by regular transfers, NOT place them at the destination immediately.
