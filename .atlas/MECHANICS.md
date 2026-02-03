# V3 Combat mechanics

## 1. Core Concept

Expanded understanding and more comprehensive articulation of the gameplay mechanics of Pax Galaxia.

The AI developer agent has shifted and expanded their understanding from a simple attrition model to include the crucial tactical element of ship capture and strategic retreat. 

Key shifts:

- **Star Properties**: Star types influence how combat resolves (Hardened defenses vs Repair).
- **Postures**: "Holding Ground" (Defending) vs "Retreating" (Active Move Order). These apply ONLY to being under active attack, for V1.0. This idea may be expanded in Pax Fluxia roadmap (the successor to Pax Galaxia Redux)
- **Capture Dynamics**: Surrendering forces are subject to different destruction & capture dynamics based on whether they were trying to retreat or not.

## 2. User Specifications 

### 2.1. Formulas

- **Combat Ratio**: `attackingForce / defendingForce`
- **Casualty Calculation** (Per Tick for attrition):
    - `smallerForce = Math.min(my.force, enemy.force)`
    - `largerForce = Math.max(my.force, enemy.force)`
    - `myForceIsLarger = my.force > enemy.force`
    - **Damaged**: `shipsDamaged = myForceIsLarger ? (combatModifier * smallerForce) : (combatModifier * largerForce)`
    - **Destroyed**: `shipsDestroyed = Star.defensivePosture * (isLarger ? enemy.force : my.force)`
    - _Note_: This replaces the old "Attack * Rate" formula. It scales with engagement size.

### 2.2. Definitions

- **Escape Route**: Exists if the star has `connections.some(c => target(c).owner === self.owner)`.
- **Retreating**: targetId points to a friendly star (Active Order) AND Escape Route exists.
- **Capture Rate**:
    - If Retreating: `0.35` (Attacker captures 35% of force). Remaining 65% escapes to targetId.
    - If Not Retreating: `0.50` (Attacker captures 50% of force). Of remaining 50%:
        - half destroyed
        - half retreat
- **Force**: Integer quantity of ships. Also referred to varyingly as "ships" and "fleet" or "fleet size".

## 3. Implementation Specification

### 3.1. File: 

src/lib/types/game.types.ts

**Update StarConfig and StarState**:
```
interface StarConfig {
    // ... existing
    baseDefense?: number;
    // New Props for "Unique Properties"
    activationRate?: number;    // % of captured damaged ships that become active
    defensivePosture?: number;  // % of casualties that are Destroyed vs Damaged
    defenseStrength?: number;   // Global defense modifier (modifier vs attackerStrength)
    repairRate?: number;        // Repair rate per tick
    transferRate?: number;      // Rate of ship transfer (movement, travel)
}
```

### 3.2. File: 

src/lib/engine/Star.ts

**Logic Update**:

- Default properties in constructor (or `TYPE_STATS` mapping).
- `activationRate` default: 0.5
- `defensivePosture` default: 0.25 (25% destroyed, 75% damaged)
- Update repair(): Check `activeCombat` flag (inhibited).

### 3.3. File: 

src/lib/engine/CombatRules.ts

**Rewrite resolveMultiwayCombat**:

#### A. Combat Logic (Attrition)

- **Input**: `forces` (Map of PlayerId -> count).
- **Process**:
    - Identify `attackerForce` (Sum of non-owners).
    - Identify `defenderForce` (Owner ships).
    - Calculate casualties for defenders using **Casualty Calculation.
    - Apply damage to defending fleet `defendingStar.ships.active` 
    - Calculate casualties for attackers using **Casualty Calculation** (loop through attacking stars and apply damage to attacking fleets `attackingStar.ships.active`

#### B. Capture Logic (Conquest)

- Trigger: `defender.active <= 0` or `ratio >= 7`.
- **Retreat Check**:
    - `isRetreating = star.targetId && targetIsFriendly`. Upon defeat, this will direct all surviving ships to the target system (Star).
    - `escapeRouteExists` = Check connections for friendly neighbor.
    - `canRetreat = escapeRouteExists`. Upon defeat, this will scatter (equally) all surviving ships to every self-owned system connected to the just-conquered star.
- **Resolution**:
    - `captureRate = isRetreating ? 0.35 : (canRetreat ? 0.50 : 1.0)`.
    - `capturedShips = defender.total * captureRate`.
    - `survivingRetreaters = defender.total - capturedShips` 
    - **Execution**:
        - If `canRetreat`: detailed `Star.addActiveShips` to destination.
        - `Star.setOwner(victor)`.
        - `Star.ships.active = capturedShips * activationRate` (approx).
        - `Star.ships.damaged = capturedShips - (capturedShips * activationRate)` (approx).
