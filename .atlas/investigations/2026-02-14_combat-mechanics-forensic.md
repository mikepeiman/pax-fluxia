# Combat Mechanics Forensic Report
**Date**: 2026-02-14 | **Status**: Active Investigation

## Executive Summary

The user reports attrition feels disproportionately high when attacking with large forces. After reading all combat code, the **user's hypothesis is confirmed**: the attacking force used in damage calculations is `attacker.activeShips` — the **total active ships at the source star**, not a fraction being "sent" to attack.

This means a star with 500 ships attacking a star with 50 ships takes return fire proportional to the defender's 50 ships, but also **deals damage based on all 500 ships**, which feels correct for the attacker's offense — but the defender's return fire is also applied to the **entire 500-ship pool** at the source star, which may feel like the attacker is losing more ships than expected.

> [!IMPORTANT]
> **Root Cause**: The combat model is "Remote Engagement" — ships fight from their home star. There is no concept of "ships in transit" during combat. ALL active ships at the attacking star participate every tick.

---

## How Combat Works (V4 Formula)

### Code Path
```
GameEngine.processOrders()
  → gathers attackOrders where source.ownerId ≠ target.ownerId
  → groups by target into attacksByTarget map
  → calls resolveMultiSourceCombat(attackerStars[], defender)
    → combatResolution.ts: aggregates attacker.activeShips
    → combat.ts: calculateCombat(defenderForce, effectiveAttackForce)
```

### Key Files
| File | Role |
|------|------|
| [combat.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combat.ts) | Core damage formula (`calculateCombat`) |
| [combatResolution.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combatResolution.ts) | Multi-source aggregation, damage distribution |
| [GameEngine.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/engine/GameEngine.ts#L650-L713) | Order processing, attack grouping |

### Default Config Values

| Parameter | Value | Effect |
|-----------|-------|--------|
| `DAMAGE_PER_SHIP` | 0.075 | Base damage each ship deals per tick |
| `AGGRESSOR_ADVANTAGE` | 0.833 | Attackers deal 83% damage (slight defender edge) |
| `LETHALITY` | 0.25 | 25% of damage kills, 75% disables (→ damagedShips) |
| `FORCE_RATIO_EFFECT` | 0 | **Disabled** — no bonus for numerical superiority |
| `DAMAGED_SHIP_EFFECTIVENESS` | 0.5 | Damaged ships count as 50% for defense |
| `MINIMUM_DAMAGE` | 1 | At least 1 damage per tick (prevents stalemates) |
| `CONQUEST_THRESHOLD` | 20 | Need 20:1 ratio for instant conquest |

### The Formula (per tick)

```
Side B (Attacker) damages Side A (Defender):
  baseOutputB = sideBShips × DAMAGE_PER_SHIP
  aggressorB = AGGRESSOR_ADVANTAGE (since B is attacking)
  outputB = baseOutputB × aggressorB
  damageToA = max(MINIMUM_DAMAGE, outputB × forceRatioMod)
    → with FORCE_RATIO_EFFECT=0, forceRatioMod=1, so damageToA = outputB
  killsOnA = floor(damageToA × LETHALITY)
  disabledOnA = floor(damageToA × (1 - LETHALITY))

Side A (Defender) damages Side B (Attacker):
  baseOutputA = sideAShips × DAMAGE_PER_SHIP
  aggressorA = 1.0 (defender not attacking, unless they have an outbound order)
  outputA = baseOutputA × aggressorA
  damageToB = max(MINIMUM_DAMAGE, outputA × forceRatioMod)
  killsOnB = floor(damageToB × LETHALITY)
  disabledOnB = floor(damageToB × (1 - LETHALITY))
```

### Force Calculation Details

**Attacker force** ([combatResolution.ts:128-131](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combatResolution.ts#L128-L131)):
```typescript
validAttackers.forEach(attacker => {
    const ships = attacker.activeShips;  // ← ALL active ships at source
    totalAttackShips += ships;
});
```

**Defender force** ([combatResolution.ts:142-145](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combatResolution.ts#L142-L145)):
```typescript
const defenderBaseForce = defender.activeShips +
    Math.floor(defender.damagedShips * cfg.DAMAGED_SHIP_EFFECTIVENESS);
const defenderDefenseMult = STAR_TYPE_STATS[defender.starType].defense ?? 1;
const defenderForce = Math.floor(defenderBaseForce * defenderDefenseMult);
```

**Damage distribution to attackers** ([combatResolution.ts:223-238](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/common/src/combatResolution.ts#L223-L238)):
```typescript
contributions.forEach(({ attacker, ships }) => {
    const proportion = ships / totalAttackShips;
    const kills = Math.floor(result.killsOnB * proportion);
    const disabled = Math.floor(result.disabledOnB * proportion);
    attacker.activeShips = Math.max(0, attacker.activeShips - (kills + disabled));
    attacker.damagedShips += disabled;
});
```

---

## Worked Examples

### Example 1: Small Attack (100 vs 50)

**Setup**: Star A (100 active, grey) attacks Star B (50 active, 0 damaged, grey)

**Attacker force**: 100 (all active ships at Star A)
**Defender force**: 50 + floor(0 × 0.5) = 50

**Damage to Defender (per tick)**:
```
baseOutputB = 100 × 0.075 = 7.5
aggressorB = 0.833
outputB = 7.5 × 0.833 = 6.25
forceRatioMod = 1.0 (disabled)
damageToA = max(1, 6.25) = 6.25
killsOnA = floor(6.25 × 0.25) = 1
disabledOnA = floor(6.25 × 0.75) = 4
→ Defender loses 5 active ships/tick (1 killed, 4 disabled)
```

**Damage to Attacker (per tick)**:
```
baseOutputA = 50 × 0.075 = 3.75
aggressorA = 1.0 (defender not attacking)
outputA = 3.75 × 1.0 = 3.75
damageToB = max(1, 3.75) = 3.75
killsOnB = floor(3.75 × 0.25) = 0
disabledOnB = floor(3.75 × 0.75) = 2
→ Attacker loses 2 active ships/tick (0 killed, 2 disabled)
```

**Summary**: 2:1 advantage → attacker loses 2/tick, defender loses 5/tick. **Feels reasonable.**

---

### Example 2: Large Attack (500 vs 50) — *The Problem Scenario*

**Setup**: Star A (500 active, grey) attacks Star B (50 active, 0 damaged, grey)

**Attacker force**: 500
**Defender force**: 50

**Damage to Defender (per tick)**:
```
baseOutputB = 500 × 0.075 = 37.5
aggressorB = 0.833
outputB = 37.5 × 0.833 = 31.25
damageToA = 31.25
killsOnA = floor(31.25 × 0.25) = 7
disabledOnA = floor(31.25 × 0.75) = 23
→ Defender loses 30 ships/tick (7 killed, 23 disabled)
→ Defender eliminated in ~2 ticks
```

**Damage to Attacker (per tick)**:
```
baseOutputA = 50 × 0.075 = 3.75
aggressorA = 1.0
damageToB = max(1, 3.75) = 3.75
killsOnB = floor(3.75 × 0.25) = 0
disabledOnB = floor(3.75 × 0.75) = 2
→ Attacker loses 2 active ships/tick (0 killed, 2 disabled)
```

**Summary**: 10:1 advantage → attacker still loses 2/tick. Over 2 ticks: attacker loses 4 ships total, defender loses ~50 (eliminated). **Proportionally fine, but...** the attacker's 500 ships ALL participate, all take return fire. The 2 disabled ships come out of the full 500 pool.

> [!WARNING]
> **The issue the user sees**: With `FORCE_RATIO_EFFECT = 0`, a 500-ship force takes the SAME absolute return fire (3.75/tick) as a 100-ship force attacking the same 50-ship defender. The damage doesn't scale with attacker size — only with defender size. This means larger forces don't take proportionally MORE damage, they take the SAME damage, which is correct militarily but may feel wrong if you expect "more ships exposed = more casualties."

---

### Example 3: Mutual Attack (200 vs 200, both attacking)

**Setup**: Star A (200 active) attacks Star B (200 active), **and** Star B is also actively attacking Star A (both have outbound orders)

**Attacker force**: 200
**Defender force**: 200

**Damage to "Defender" (per tick)**:
```
baseOutputB = 200 × 0.075 = 15
aggressorB = 0.833 (B is attacking)
outputB = 15 × 0.833 = 12.5
damageToA = 12.5
killsOnA = floor(12.5 × 0.25) = 3
disabledOnA = floor(12.5 × 0.75) = 9
→ Side A loses 12 ships/tick
```

**Damage to "Attacker" (per tick)**:
```
baseOutputA = 200 × 0.075 = 15
aggressorA = 0.833 (A is ALSO attacking — has outbound order)
outputA = 15 × 0.833 = 12.5
damageToB = 12.5
killsOnB = floor(12.5 × 0.25) = 3
disabledOnB = floor(12.5 × 0.75) = 9
→ Side B loses 12 ships/tick
```

**Summary**: Symmetric forces, both attacking → both lose 12/tick. Both get aggressor "advantage" (which is actually 0.833, a slight penalty). **Perfectly symmetric, as expected.**

> [!NOTE]
> If the defender is NOT actively attacking (no outbound order), their damage output uses 1.0 instead of 0.833, meaning passive defenders actually deal 20% MORE return fire than active attackers. This is by design: `AGGRESSOR_ADVANTAGE = 0.833` is actually a *defender* advantage.

---

## Root Cause Analysis

The user's perception of "too-high attrition for large forces" has a nuanced answer:

### What IS Working Correctly
1. **Absolute damage scales linearly** with ship count — 500 ships deal 10× more damage than 50
2. **Return fire is proportional to defender size**, not attacker size — a 50-ship defender deals the same absolute damage whether facing 100 or 500 attackers
3. **Damage distribution** to multi-source attackers is proportional to each star's contribution

### What Might Feel Wrong
1. **`FORCE_RATIO_EFFECT = 0`** means numerical superiority provides ZERO bonus. A 500-ship force attacking 50 ships takes exactly the same casualties per tick as 100 ships attacking 50 ships. There is no "overwhelming force" effect.
2. **ALL ships at the source star participate** — there's no concept of "sending 50 ships while 450 stay home." The entire star is committed.
3. **`AGGRESSOR_ADVANTAGE = 0.833`** actually means attackers deal LESS damage (83% of base), giving defenders a 20% edge in damage output. This penalizes the attacker.

### Potential Fix: Enable FORCE_RATIO_EFFECT

If `FORCE_RATIO_EFFECT` is set to a non-zero value (e.g., 0.5):
- A 10:1 advantage would give `1 + log2(10) × 0.5 = 1 + 3.32 × 0.5 = 2.66×` damage bonus to the larger force
- The smaller force would deal only `1/2.66 = 0.376×` damage
- This would make large forces take proportionally less return fire relative to their size

### Alternative: Transfer-Based Combat
Instead of remote engagement with full-star participation, combat could use only the ships being transferred (the `TRANSFER_RATE` fraction). This would mean:
- A 500-ship star at 10% transfer rate → only 50 ships "in combat" per tick
- Return fire only applies to those 50, not the full 500
- This fundamentally changes the combat model from "remote bombardment" to "expeditionary warfare"

---

## Recommendations

| Option | Complexity | Effect |
|--------|-----------|--------|
| Enable `FORCE_RATIO_EFFECT` (set to 0.3-0.5) | Low | Large forces take proportionally less return fire |
| Increase `AGGRESSOR_ADVANTAGE` to 1.0+ | Low | Removes defender bonus, makes attacks less punishing |
| Transfer-based combat (only shipped fraction fights) | High | Fundamental model change — "sent ships" fight, not whole star |
| Cap attacker casualties at transfer rate | Medium | Limits exposure to TRANSFER_RATE × activeShips |
