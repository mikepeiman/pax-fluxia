---
description: Semantic naming conventions for game domain code - ensures function and variable names communicate intent clearly
globs: ["pax-fluxia/src/lib/**/*.ts", "pax-fluxia/src/lib/**/*.svelte"]
---

# Semantic Naming Guidelines

**Directive:** Code should read like a story about the game, not like abstract computer science.

---

## Core Principle

> *"If a junior developer reads this function name, can they guess what it does without reading the implementation?"*

Function names should answer **"What does this do?"** using game-domain vocabulary, not implementation details.

---

## Domain Vocabulary Glossary

Use these terms consistently across the codebase:

| Game Concept | Preferred Terms | Avoid |
|--------------|-----------------|-------|
| Ships moving between stars | **transfer**, **transit** | flow, stream |
| Player command to move/attack | **order** | link, command, directive |
| Combat between forces | **battle**, **engagement** | combat (too generic), fight |
| Capturing a star | **conquest**, **capture** | takeover, seize |
| Star-to-star connection | **link**, **route** | connection, edge, path |
| Damaged ships healing | **repair** | heal, restore, fix |
| Ships escaping conquest | **scatter**, **retreat** | escape, flee, run |
| Ship generation | **production**, **produce** | spawn, create, generate |
| Game time unit | **tick** | turn, frame, cycle |
| Star ownership change | **setOwner**, **changeOwnership** | transfer (ambiguous with ship transfer) |

---

## Function Naming Patterns

### Action Functions (verbs first)
```typescript
// GOOD: Clear action + object
executeTransferOrders()
resolveBattle()
captureStarWithScatter()
issueOrder()
cancelOrder()
produceShips()
repairDamagedShips()

// BAD: Vague or implementation-focused
processFlowLinks()      // What's a "flow link"?
resolveMultiSourceCombat()  // Technical jargon
createLink()            // "Link" is ambiguous
```

### Query Functions (get/is/has prefix)
```typescript
// GOOD
getPlayerShipCount()
isUnderAttack()
hasEscapeRoutes()
getActiveOrders()

// BAD
playerShips()      // Is this a getter or setter?
attacking()        // Unclear return type
```

### Predicate Functions (is/has/can prefix)
```typescript
// GOOD
isStarConnectedTo(targetId)
hasQueuedOrder()
canRetreatTo(starId)

// BAD
connected()        // Connected to what?
retreat()          // Action or check?
```

---

## Variable Naming Patterns

### Collections (plural nouns)
```typescript
// GOOD
const transferOrders: Order[] = [];
const battleParticipants: Star[] = [];
const escapedShips: number = 0;

// BAD
const orderList = [];   // Redundant "list"
const attackers = [];   // OK but "battleParticipants" is clearer
```

### Counts and Amounts
```typescript
// GOOD
const shipsToTransfer = 50;
const damageDealt = 10;
const capturedShipCount = 30;

// BAD
const n = 50;           // Meaningless
const amt = 10;         // Abbreviated
const count = 30;       // Count of what?
```

### Booleans (is/has/should prefix)
```typescript
// GOOD
const isAttacking = true;
const hasEscapeRoute = false;
const shouldRetreat = ratio < 0.5;

// BAD
const attacking = true;     // Could be a function
const escape = false;       // Noun or verb?
```

---

## Config Variable Naming

Config variables should be:
1. ALL_CAPS with underscores
2. Self-documenting (no abbreviations)
3. Include units where applicable

```typescript
// GOOD
TRANSFER_RATE_PER_TICK: 0.25      // Clear unit
MIN_TRANSFER_SHIPS: 1
BATTLE_DAMAGE_PER_SHIP: 0.1
CONQUEST_THRESHOLD_RATIO: 8

// BAD
FLOW_PERCENTAGE: 0.25    // "Flow" is unclear
COMBAT_MODIFIER: 0.1     // Modifier of what?
THRESHOLD: 8             // Threshold for what?
```

---

## File Naming

| Purpose | Pattern | Example |
|---------|---------|---------|
| Entity class | `PascalCase.ts` | `Star.ts`, `Fleet.ts` |
| System/manager | `PascalCase.ts` | `GameEngine.ts`, `AudioManager.ts` |
| Utilities | `camelCase.utils.ts` | `math.utils.ts`, `render.utils.ts` |
| Types | `camelCase.types.ts` | `game.types.ts` |
| Config | `camelCase.config.ts` | `game.config.ts` |
| Stores | `camelCase.svelte.ts` or `camelCaseStore.ts` | `gameStore.svelte.ts` |

---

## Comment Standards (from coding-standards)

When renaming, also ensure proper documentation:

```typescript
/**
 * Executes all pending ship transfer orders for the current tick.
 * 
 * Distinguishes between:
 * - Reinforcements: transfers to friendly stars (no combat)
 * - Attacks: transfers to enemy stars (triggers battle resolution)
 * 
 * @see resolveBattle() for combat handling
 */
function executeTransferOrders(): void {
    // ... implementation
}
```

---

## Checklist Before Naming

- [ ] Does the name use game vocabulary, not CS jargon?
- [ ] Would a player understand this term?
- [ ] Is the action/object clear without reading the code?
- [ ] Does it avoid abbreviations?
- [ ] Is it consistent with similar functions in the codebase?
