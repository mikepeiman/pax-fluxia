

# Transfer Rate Floor vs Ceil — Design Thinking Post-Mortem

## Context
The transfer rate formula uses `Math.floor(activeShips * TRANSFER_RATE)`. User reported ships "stuck" at 8, 18, 26 ships.

## Why Floor Was Originally Used
The `floor` was chosen because ships are integers (ADR-010: "Ships Are Atomic Integers"). Rounding down prevents creating fractional ships. This is standard integer math for game engines.

## Why Floor Is NOT The Root Cause
With `Math.max(MIN_SHIPS_PER_TRANSFER=1, Math.floor(ships * 0.25))`:
- Star with 8 ships: `max(1, floor(2.0))` = 2 → transfers 2
- Star with 4 ships: `max(1, floor(1.0))` = 1 → transfers 1  
- Star with 3 ships: `max(1, floor(0.75))` = max(1, 0) = 1 → transfers 1

The `MIN_SHIPS_PER_TRANSFER=1` already prevents the floor from ever producing 0. So floor alone does NOT explain ships getting "stuck."

## The Real Cause: Production vs Transfer Equilibrium
Production happens BEFORE transfer every tick:
- Grey star with 4 ships: **produce 1** → 5 ships, **transfer floor(5*0.25)=1** → 4 ships. **Net: 0 change.**
- Yellow star (2x prod): produces MORE, plateaus higher.

The equilibrium point is where `production == transfer`, which depends on star type and transfer rate. This was a predictable consequence of the production-first tick order, not a rounding bug.

## Correction
User changed `floor` to `ceil`. This shifts the equilibrium but doesn't eliminate it. The real fix should be discussed with the user as a game design question, not assumed as a code bug.

## Lesson
Don't conflate rounding functions with the actual equilibrium mechanics. Investigate the full system (production + transfer interaction) before blaming a single function call.
