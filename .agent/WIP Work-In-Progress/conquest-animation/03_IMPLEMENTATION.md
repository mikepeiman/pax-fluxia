# 03 — Implementation Plan: Attack-Conquest Ship & Star Animations

**Date:** 2026-02-13

## Problem Summary

The conquest animation has failed twice because both modes ("immediate" and "surge") place ships directly at the conquered star. Neither makes ships **visually travel** from the attacker star to the conquered star.

## Solution: "Travel" Mode

Add a third conquest animation mode that reuses the **existing transfer travel pipeline** (the same code that makes ships fly between allied stars on regular transfers).

### The Key Insight

The transfer pipeline (L1264-1364 in GameCanvas) already does exactly what we need:
1. Splices ships from source star's `visualShips[]`
2. Sets up lane geometry (start/end points)
3. Sets ship state = "departing" with timing data
4. Pushes to `travelingShips[]`
5. `renderTravelingShips()` handles the visual lifecycle
6. On arrival: ships get added to destination `visualShips[]` with settle animation

**We just need to do the same thing for conquest transfer ships**, instead of placing them directly.

## Changes Required

### 1. `game.config.ts` — Add 'travel' to mode type
```diff
- CONQUEST_ANIMATION_MODE: 'immediate' | 'surge';
+ CONQUEST_ANIMATION_MODE: 'immediate' | 'surge' | 'travel';
```
Default: `'travel'`

### 2. `GameCanvas.svelte` — Conquest handler (L1507-1637)

Replace the current "immediate" and "surge" blocks with a third "travel" branch at the attacker ships section (after `conquestShips = atkShips.splice(0, transferCount)`):

```typescript
if (conquestMode === 'travel') {
    // Reuse the transfer travel pipeline
    const dx = conqueredStar.x - attackerStar.x;
    const dy = conqueredStar.y - attackerStar.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;
    
    const laneStartX = attackerStar.x + ndx * (attackerStar.radius + 5);
    const laneStartY = attackerStar.y + ndy * (attackerStar.radius + 5);
    const laneEndX = conqueredStar.x - ndx * (conqueredStar.radius + 5);
    const laneEndY = conqueredStar.y - ndy * (conqueredStar.radius + 5);
    
    const halfTick = activeGameStore.effectiveTickMs / 2;
    const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
    const departDuration = halfTick * departFraction;
    const travelDuration = halfTick * (1 - departFraction);
    const jitterMax = GAME_CONFIG.DEPART_JITTER_MS ?? 80;
    const laneOffsetPx = GAME_CONFIG.LANE_OFFSET_PX ?? 8;
    
    for (const ship of conquestShips) {
        ship.departFromX = ship.x;  // Current position in attacker orbit
        ship.departFromY = ship.y;
        ship.state = "departing";
        ship.fromStarId = conquest.attackerStarId;
        ship.toStarId = conquest.starId;
        ship.departTime = now + Math.random() * Math.min(jitterMax, 300 / Math.max(1, conquestShips.length));
        ship.travelDuration = travelDuration;
        ship.departDuration = departDuration;
        ship.laneStartX = laneStartX;
        ship.laneStartY = laneStartY;
        ship.laneEndX = laneEndX;
        ship.laneEndY = laneEndY;
        ship.laneOffset = (Math.random() - 0.5) * laneOffsetPx * 2;
        ship.staggerDelay = 0;
        ship.ownerId = conquest.newOwner;
        (ship as any).conquestSettle = true; // For longer settle on arrival
        travelingShips.push(ship);
    }
    // Update both star arrays
    visualShips.set(conquest.attackerStarId, atkShips);
    // Don't add to conquest.starId yet — they'll arrive via travelingShips pipeline
}
```

### 3. `CombatDebugPanel.svelte` — Add 'travel' option to dropdown
```html
<option value="travel">Travel</option>
```

### 4. Keep existing modes
- "immediate" stays as-is (fallback for users who prefer instant)
- "surge" stays as-is (fallback for settle-from-above look)
- "travel" becomes the new default

## Why This Will Work

1. Ships are **visually at the attacker star** when conquest fires (they're in `visualShips[attackerStarId]`)
2. We splice them and set them as `"departing"` (just like regular transfers)
3. The existing `renderTravelingShips()` handles the **departing → traveling → arriving** visual lifecycle
4. On arrival at the conquered star, they settle into orbit with the existing settle animation
5. No new animation system needed — 100% reuse of proven, working code

## Risks
- The only subtlety is that conquest ships might overlap with combat surge visuals at the attacker star (since conquest happens mid-combat). This is cosmetic and can be tuned later.
- Ships that were already "surging" toward the defender may need their departure position reset, but `ship.departFromX = ship.x` handles this since x/y are updated each frame.
