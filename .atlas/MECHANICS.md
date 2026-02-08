# Pax Fluxia — Game Mechanics

**Version:** 4.0  
**Last Updated:** 2026-02-08

This document is the canonical, definitive specification of all game mechanics. It describes *what the game does*, not how to implement it.

---

## 1. Star Types

Each star type has a **2× bonus** in one specialty. All other multipliers are 1.0.

| Type | Color | Specialty | Effect | Strategic Role |
|------|-------|-----------|--------|---------------|
| **Grey** | `#8899aa` | None | Baseline stats | No advantage |
| **Yellow** | `#fbbf24` | Production | 2× ship generation rate | Economy |
| **Blue** | `#3b82f6` | Speed | 2× transfer rate (0.2 vs 0.1) | Logistics |
| **Purple** | `#a855f7` | Repair | 2× repair rate (0.4 vs 0.2) | Attrition |
| **Red** | `#ef4444` | Defense | 2× defense strength | Fortress |
| **Green** | `#22c55e` | Attack | 2× attack power | Assault |

### Star Properties

| Property | Default | Description |
|----------|---------|-------------|
| `activationRate` | 0.50 | % of captured damaged ships becoming active |
| `defensivePosture` | 1.0 | Defensive posture modifier |
| `defenseStrength` | 1.0 | Defense multiplier (Red = 2.0) |
| `repairRate` | 0.20 | % of damaged ships repaired per tick (Purple = 0.4) |
| `transferRate` | 0.10 | Base transfer rate (Blue = 0.2) |

---

## 2. Ship States

Ships exist in two states:

| State | Description |
|-------|-------------|
| **Active** | Combat-ready. Participate in attacks, defense, and transfer. |
| **Damaged** | In repair pool. Contribute to defense at reduced effectiveness (14%). Cannot attack or transfer. |

---

## 3. Tick Order

Every tick (default 1200ms at 1× speed), the engine processes in this exact order:

1. **Production** — Stars generate ships: `BASE_PRODUCTION × productionRate`
2. **Orders** — Process reinforcements (friendly transfers), then resolve attacks
3. **Repair** — Damaged ships heal: `max(MIN_REPAIR, repairRate × damagedShips)`
4. **Stats** — Aggregate player totals
5. **Win Check** — Last player standing wins

---

## 4. Production

Each owned star produces ships per tick:

```
shipsProduced = BASE_PRODUCTION × starType.prod
```

- `BASE_PRODUCTION`: 0.5 ships/tick (default)
- Yellow stars produce at 2× rate (1.0 ships/tick)
- Fractional ships accumulate; a ship appears when the total reaches the next integer

---

## 5. Transfer (Reinforcement)

When a star has an order targeting a **friendly** star, it sends ships along the lane each tick.

```
transferAmount = max(MIN_SHIPS_PER_TRANSFER, ceil(activeShips × TRANSFER_RATE))
```

- `TRANSFER_RATE`: 10% of active ships per tick (default)
- `MIN_SHIPS_PER_TRANSFER`: 1
- Blue stars: 2× transfer rate

**Order Persistence**: Orders persist until explicitly cancelled by the player. 

**Attack vs Transfer**: Attacks are remote engagement, with an animation "surge/recede" effect to represent combat force — ships stay at their source star and deal damage across the lane. Only reinforcements (friendly transfers) involve physical ship movement from star to star.

---

## 6. Combat (V4 — Symmetric Damage Model)

Combat occurs when a star has an order targeting an **enemy** star. Both sides take damage simultaneously each tick. Ships do not effectively leave their star during combat, aside from the visual representation as mentioned.

### 6.1. Damage Formula (Per Tick)

```
baseOutput   = myShips × DAMAGE_PER_SHIP
aggressorMod = isAttacking ? AGGRESSOR_ADVANTAGE : 1.0
ratioBonus   = 1 + log₂(ratio) × FORCE_RATIO_EFFECT
finalDamage  = ceil(baseOutput × aggressorMod × ratioBonus)
```

### 6.2. Damage Split

```
killed   = floor(finalDamage × LETHALITY)
disabled = floor(finalDamage × (1 - LETHALITY))
```

- Killed ships are permanently removed
- Disabled ships move to the damaged pool (can be repaired)

### 6.3. Combat Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DAMAGE_PER_SHIP` | 0.10 | Base damage per ship per tick |
| `LETHALITY` | 0.25 | % of damage that destroys (rest disables) |
| `AGGRESSOR_ADVANTAGE` | 0.70 | Multiplier for attacking side (<1 = defender advantage) |
| `FORCE_RATIO_EFFECT` | 0.00 | Numerical superiority bonus (0 = disabled) |
| `MINIMUM_DAMAGE` | 1 | Floor damage per tick |
| `DAMAGED_SHIP_EFFECTIVENESS` | 0.14 | Fraction of damaged ships counting toward defense |

### 6.4. Effective Defender Force

Damaged ships contribute to defense at reduced effectiveness:

```
defenderForce = activeShips + floor(damagedShips × DAMAGED_SHIP_EFFECTIVENESS)
```

### 6.5. Multi-Star Combat (Per-Player Aggregation)

When multiple stars attack the same target:

1. Group all attackers by **ownerId** (player)
2. **Total damage** to defender = all attackers combined (all players)
3. Damage to attackers distributed proportionally by each star's ship contribution
4. **Victor** = the **player** with the largest total attacking ships, not any individual star
5. `executeConquest` receives the strongest individual star of the winning player

---

## 7. Conquest

Conquest triggers when:

- `defender.activeShips ≤ 0` (attrition victory), **OR**
- `defender.activeShips ≤ totalAttackerShips / CONQUEST_THRESHOLD` (overwhelm)

| Variable | Default | Description |
|----------|---------|-------------|
| `CONQUEST_THRESHOLD` | 8 | Attacker:defender ratio for overwhelm |
| `CONQUEST_TRANSFER_PERCENTAGE` | 50% | Winning ships transferred to conquered star |

### 7.1. Conquest Resolution

1. Defender ownership transfers to winning **player**
2. 50% of winning player's attacking ships transfer to conquered star
3. Defender's damaged ships are zeroed
4. Surviving defender ships undergo scatter/retreat (see §8)
5. All orders targeting this star from **other players** are cancelled (including chained orders)
6. Winning player's orders to this star are cancelled (star is now friendly) IF the player has chosen that option `MAINTAIN_ORDERS_ON_CONQUEST = false`
7. Queued (deferred) orders activate if set

---

## 8. Scatter & Retreat

When a star is conquered, the defender's surviving ships attempt to escap if possible (if escape routes exist).

### 8.1. Retreat (Ordered)

If the defending star has an active order targeting a **friendly** star:

- `RETREAT_CAPTURE_RATE` (35%) of ships are captured by the attacker
- Remaining 65% escape to the ordered target

### 8.2. Scatter (Unordered)

If the defending star has **no retreat order** but has friendly neighbors:

- `SCATTER_CAPTURE_RATE` (50%) of ships are captured
- Of the remaining 50%:
  - `SCATTER_DESTROY_RATE` (50%) are destroyed
  - Rest scatter equally to connected friendly stars

### 8.3. No Escape

If no friendly neighbors exist:

- 100% of ships are captured by the attacker

| Variable | Default | Description |
|----------|---------|-------------|
| `RETREAT_CAPTURE_RATE` | 0.35 | % captured when defender retreats |
| `SCATTER_CAPTURE_RATE` | 0.50 | % captured when defender scatters |
| `SCATTER_DESTROY_RATE` | 0.50 | % of non-captured destroyed on scatter |

---

## 9. Repair

Each tick, damaged ships are repaired:

```
repaired = max(MIN_REPAIR, repairRate × damagedShips)
```

- `REPAIR_RATE`: 0.20 (20% per tick, default)
- `MIN_REPAIR`: 1 ship minimum per tick
- Purple stars: 2× repair rate (0.4)
- `REPAIR_COMBAT_PENALTY`: 0.1 — repair is reduced to 10% during active combat

---

## 10. Orders

### 10.1. Active Order

A star's `targetId` directs its behavior:

- **Friendly target** → Reinforcement (ships transfer along lane)
- **Enemy target** → Attack (remote engagement, ships stay)
- **null** → Idle (produce and repair only)

### 10.2. Queued (Deferred) Order

`queuedOrderTargetId` stores a second order that activates when the star is conquered. This enables chain-through strategies where a player pre-plans the flow after capturing a key star.

### 10.3. Order Persistence

- Orders persist until **explicitly cancelled** by the player
- Zero remaining ships does NOT auto-cancel an order
- When a star is conquered by a third party, orders from non-victors targeting that star are cancelled
- The conquering player's orders to the now-friendly star are also cancelled

---

## 11. AI Behavior

The AI evaluates all its stars each tick and issues orders based on configurable thresholds.

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ATTACK_THRESHOLD` | 1.33 | Min ship ratio to initiate attack |
| `AI_DESIST_THRESHOLD` | 1.00 | Ratio at which AI stops attacking |
| `AI_RANDOM_AGGRESSION` | 0.05 | Chance per tick for random attack |
| `AI_TACTICAL_AGGRESSION` | 0.10 | Chance to attack weak target as bait |

---

## 12. Map Generation

Stars are placed on a hex grid and connected via Delaunay triangulation.

| Variable | Default | Description |
|----------|---------|-------------|
| `STARS_PER_PLAYER` | 5 | Stars each player starts with |
| `MIN_LINKS_PER_STAR` | 1 | Minimum connections per star |
| `MAX_LINKS_PER_STAR` | 6 | Maximum connections per star |
| `STARTING_SHIPS` | 40 | Ships per star at game start |

---

## 13. Victory

The last player with at least one star wins. A player is eliminated when they lose all stars.
