# Semantic Naming Conventions

> Code should read like a story about the game, not like abstract computer science.

## Core Principle

> *"If a junior developer reads this function name, can they guess what it does without reading the implementation?"*

## Domain Vocabulary

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
| Star ownership change | **setOwner**, **changeOwnership** | transfer (ambiguous) |
| Config keys | `ALL_CAPS_WITH_UNITS` | camelCase |

## Naming Patterns

- **Actions**: verb-first (`executeTransferOrders()`, `resolveBattle()`)
- **Queries**: `get`/`is`/`has` prefix (`getPlayerShipCount()`, `isUnderAttack()`)
- **Booleans**: `is`/`has`/`should` prefix (`isAttacking`, `hasEscapeRoute`)
- **Config**: ALL_CAPS with units (`TRANSFER_RATE_PER_TICK`, `BATTLE_DAMAGE_PER_SHIP`)
- **Collections**: plural nouns (`transferOrders`, `battleParticipants`)

## Anti-Patterns

- No legacy version suffixes (`V4`, `V2`, etc.) — use clean, functionally-semantic names
- User terminology takes priority over "technical accuracy"
