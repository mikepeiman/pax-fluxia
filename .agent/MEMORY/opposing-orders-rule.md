

# Opposing Orders Rule

## Definition
"Opposing orders" means ONLY a same-player two-star loop:
- Player owns Star A and Star B
- Player sets A→B and B→A simultaneously
- This is self-contradictory and wasteful

## What it does NOT mean
Cross-player mutual combat is ALWAYS allowed:
- Player's Star A → Enemy's Star B (attack)
- Enemy's Star B → Player's Star A (attack)
- This is NORMAL GAMEPLAY — enemies mutually attacking each other

## Implementation Rule
When `ALLOW_OPPOSING_ORDERS` is `false`:
- Cancel same-owner loops: `target.ownerId === source.ownerId`
- NEVER interfere with cross-owner combat
