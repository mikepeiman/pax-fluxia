---
description: Semantic naming conventions for game domain code
globs: ["pax-fluxia/src/lib/**/*.ts", "pax-fluxia/src/lib/**/*.svelte", "common/src/**/*.ts"]
---

# Semantic Naming Guidelines

**Directive:** Code should read like a story about the game, not like abstract computer science.

## Core Principle

> *"If a junior developer reads this function name, can they guess what it does without reading the implementation?"*

## Domain Vocabulary Glossary

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

## Naming Patterns

- **Actions**: verb-first (`executeTransferOrders()`, `resolveBattle()`)
- **Queries**: `get`/`is`/`has` prefix (`getPlayerShipCount()`, `isUnderAttack()`)
- **Booleans**: `is`/`has`/`should` prefix (`isAttacking`, `hasEscapeRoute`)
- **Config**: ALL_CAPS with units (`TRANSFER_RATE_PER_TICK`, `BATTLE_DAMAGE_PER_SHIP`)
- **Collections**: plural nouns (`transferOrders`, `battleParticipants`)

## User Names Take Priority

When user provides terminology:
- ✅ Adopt it immediately
- ✅ Rename code to match user's mental model
- ❌ Do not argue for "technical accuracy" over user's preferred terms
