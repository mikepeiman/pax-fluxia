# Semantic Rename Proposal

**Purpose:** Align codebase naming with game domain vocabulary for better comprehensibility.

**Instructions:** Check the boxes for renames you approve. Unchecked items will be skipped.

**Last Updated:** 2026-02-03

---

## Functions: GameEngine.ts

### Core Game Loop

- [ ] `executeTick` → `runGameTick`
  - **What it does:** Main tick execution - production, transfers, combat, repair, stats, win check
  - **Why rename:** More descriptive; "run" implies orchestration of multiple systems

### Ship Movement & Combat

- [ ] `processFlowLinks` → `executeTransferOrders`
  - **What it does:** Processes all active ship movement orders, distinguishes attacks (enemy targets) from reinforcements (friendly targets), aggregates multi-source attacks, triggers combat
  - **Why rename:** "Flow" is abstract jargon; "transfer orders" matches game terminology

- [x] CONSOLIDATE: `resolveMultiSourceCombat` + `resolveRemoteCombat` → `resolveBattle` (single function)
  - **What it does:** Resolves combat for any number of attackers (1-n) - aggregates forces, calculates damage, applies return fire, checks conquest
  - **Why consolidate:** One unified battle resolution function regardless of attacker count; eliminates redundancy and unclear separation

- [ ] `executeConquest` → `captureStarWithScatter`
  - **What it does:** Captures star, handles scatter/retreat (ships escape to friendly neighbors), transfers captured ships, moves attacker ships
  - **Why rename:** "Conquest" is good but adding "WithScatter" clarifies the escape mechanic

### Player Actions

- [ ] `createLink` → `issueOrder`
  - **What it does:** Creates a movement/attack order from one star to another (human player only)
  - **Why rename:** "Link" is graph theory jargon; "order" is military/game language

- [ ] `cancelLink` → `cancelOrder`
  - **What it does:** Cancels a movement/attack order for a star
  - **Why rename:** Consistent with `issueOrder` rename

- [ ] `setDeferredOrder` → `queueOrderOnCapture`
  - **What it does:** Sets an order on an enemy star to execute when captured (chain-through orders)
  - **Why rename:** "Deferred" is vague; "queue on capture" explains the trigger condition

- [ ] `getDeferredOrder` → `getQueuedOrderOnCapture`
  - **What it does:** Retrieves a deferred order for a star, if any
  - **Why rename:** Consistent with above rename

### Game State

- [ ] `checkWinCondition` → `eliminateDefeatedPlayers`
  - **What it does:** Checks if players should be eliminated (no stars and no ships)
  - **Why rename:** The function eliminates players, not just checks - name should reflect side effect

- [x] `recordHistory` → `recordGameplayData`
  - **What it does:** Records game state statistics for each tick
  - **Why rename:** "Gameplay data" is more specific than "history"; prepares for chart generation

- [x] `getStatsHistory` → `getGameplayData`
  - **What it does:** Returns the recorded game history array for endgame charts
  - **Why rename:** Consistent with "recordGameplayData"; clearer purpose

- [x] ADD: `generateGameplayCharts`
  - **What it does:** Generates chart data from gameplay data
  - **Why add:** Completes the data pipeline: record → get → generate

### Initialization

- [ ] `initializeMap` → `generateStandardMap`
  - **What it does:** Generates the standard game map with hex grid, star positions, connections
  - **Why rename:** "Initialize" is generic; "generate standard map" is specific

- [ ] `initDebugMap` → `generateDebugMap`
  - **What it does:** Creates a fixed 4-star debug map for testing
  - **Why rename:** Consistent with above

- [ ] `updateTerritories` → `calculateVoronoiTerritories`
  - **What it does:** Computes Voronoi polygons from star positions for territory visualization
  - **Why rename:** Specifies the algorithm used

---

## Internal Variables: GameEngine.ts (in processFlowLinks/executeTransferOrders)

- [ ] `flowOrders` → `reinforcementOrders`
  - **What it does:** Array of orders to friendly stars (no combat)
  - **Why rename:** "Flow" is unclear; "reinforcement" is precise game term

- [ ] `attackOrders` → `battleOrders`
  - **What it does:** Array of orders to enemy stars (triggers combat)
  - **Why rename:** Consistent with "battle" terminology

- [ ] `attacksByTarget` → `battlesByDefender`
  - **What it does:** Map grouping multiple attackers by their common target
  - **Why rename:** Clarifies the grouping key is the defender star

---

## Functions: Star.ts

- [ ] `setTarget` → `setOrderDestination`
  - **What it does:** Sets the destination star for outgoing ship transfers
  - **Why rename:** "Target" implies attack-only; transfers can be friendly

- [ ] `clearTarget` → `clearOrderDestination`
  - **What it does:** Cancels the outgoing order
  - **Why rename:** Consistent with above

- [ ] `produce` → `produceShips`
  - **What it does:** Generates new active ships each tick based on production rate
  - **Why rename:** More specific - what is being produced?

- [ ] `repair` → `repairDamagedShips`
  - **What it does:** Converts damaged ships to active, applies combat penalty
  - **Why rename:** More specific - what is being repaired?

- [ ] `markCombat` → `recordCombatTick`
  - **What it does:** Records the tick when combat occurred (for repair penalty)
  - **Why rename:** "Mark" is vague; "record" clarifies it's storing data

- [ ] `takeDamage` → `applyDamageToShips`
  - **What it does:** Applies damage - converts active ships to damaged
  - **Why rename:** More specific about what takes damage

- [ ] `setQueuedOrder` → `queueOrderForNewOwner`
  - **What it does:** Queues an order to execute when star is captured by specified owner
  - **Why rename:** Clarifies the trigger condition

---

## Properties: Star.ts

- [ ] `_targetId` → `_orderDestinationId`
  - **What it does:** The destination star ID for outgoing orders
  - **Why rename:** Consistent with method renames

- [ ] `targetId` (getter) → `orderDestinationId`
  - **What it does:** Public getter for the order destination
  - **Why rename:** Consistent with above

- [ ] `isAttacking` (getter) → `hasActiveOrder`
  - **What it does:** Returns true if the star has an outgoing order
  - **Why rename:** Order might be reinforcement, not just attack

---

## Config Variables: game.config.ts

### Flow → Transfer

- [ ] `FLOW_PERCENTAGE` → `TRANSFER_RATE`
  - **What it does:** Percentage of ships that transfer per tick (0.0 - 1.0)
  - **Why rename:** "Flow" → "Transfer" per vocabulary

- [ ] `MIN_FLOW_SHIPS` → `MIN_SHIPS_PER_TRANSFER`
  - **What it does:** Minimum ships to transfer per tick
  - **Why rename:** Clearer unit

- [ ] `MAX_FLOW_SHIPS` → `MAX_SHIPS_PER_TRANSFER`
  - **What it does:** Maximum ships to transfer per tick (0 = unlimited)
  - **Why rename:** Clearer unit

- [ ] `FLOW_PULSE_FREQUENCY` → `TRANSFER_PULSE_INTERVAL`
  - **What it does:** Ticks between transfer batches (1 = every tick)
  - **Why rename:** "Interval" is more precise than "frequency"

### Combat Clarifications

- [ ] `COMBAT_MODIFIER` → `LEGACY_COMBAT_MODIFIER`
  - **What it does:** Legacy combat modifier (deprecated)
  - **Why rename:** Mark as legacy explicitly

- [ ] `CONQUEST_TRANSFER_MODIFIER` → `LEGACY_CONQUEST_TRANSFER_MODIFIER`
  - **What it does:** Legacy post-conquest transfer modifier
  - **Why rename:** Mark as legacy explicitly

---

## Functions: game.config.ts

- [ ] `calculateFlowAmount` → `calculateTransferAmount`
  - **What it does:** Calculates how many ships should transfer based on config
  - **Why rename:** Consistent with "transfer" vocabulary

- [ ] `calculateCombatV4` → `calculateBattleDamage`
  - **What it does:** Calculates symmetric damage between two forces
  - **Why rename:** Remove version number from public API; clearer purpose

---

## Files to Rename

- [ ] `FlowLink.ts` → `TransferOrder.ts`
  - **What it contains:** Class representing a directional ship transfer connection
  - **Why rename:** "Flow" is unclear; "TransferOrder" describes the game concept

- [ ] `Combat.ts` → `CombatLegacy.ts`
  - **What it contains:** Legacy wrapper around calculateCombatV4
  - **Why rename:** Clarify it's legacy/backwards-compat code

- [ ] `CombatRules.ts` → `MultiwayCombat.ts`
  - **What it contains:** Posture-based engagement model for multiple fleets
  - **Why rename:** Specifies the unique feature (multiway)

- [ ] `CombatLogger.ts` → `CombatEventLogger.ts`
  - **What it contains:** Logs combat events in legacy format
  - **Why rename:** Clarifies it logs events, not just "combat"

---

## Store Functions: gameStore.svelte.ts

- [ ] `issueOrder` → (keep as is)
  - **What it does:** Already correctly named - issues an order
  - **Note:** Already good!

- [ ] `cancelOrder` → (keep as is)
  - **What it does:** Already correctly named - cancels an order
  - **Note:** Already good!

---

## Summary Statistics

| Category | Total Items | Recommended Renames |
|----------|-------------|---------------------|
| GameEngine.ts functions | 15 | 15 |
| GameEngine.ts variables | 3 | 3 |
| Star.ts functions | 7 | 7 |
| Star.ts properties | 3 | 3 |
| game.config.ts variables | 6 | 6 |
| game.config.ts functions | 2 | 2 |
| Files | 4 | 4 |
| **Total** | **40** | **40** |

---

## Implementation Notes

After approval, implementation will:
1. Use IDE refactoring tools for safe renames (updates all references)
2. Update imports across the codebase
3. Update any comments/documentation referencing old names
4. Run tests to verify no regressions
5. Commit with clear message listing all renames
