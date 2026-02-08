

# Animation Must Be Imperative, Not Diff-Based

## CRITICAL: Animations are driven by PLAYER COMMANDS, not state diffs.

### Bad Pattern (What Was Done)
```
"Detect transfers by diffing star ship counts between frames.
When ships decrease on a star with a target, move visual ships to travelingShips."
```
This is **reactive observation** of state changes — guessing what happened from numerical diffs. It cannot distinguish:
- Movement transfer (ships physically travel along lane) from
- Combat damage (ships destroyed at source, never travel) from
- Conquest capture (ships appear at destination via game mechanic)

### Good Pattern (What Must Be Done)
```
The engine IMPERATIVELY emits transfer/conquest events with full context.
The animation system consumes these events to create visual representations.
```

Game actions result from PLAYER COMMANDS (orders). The engine knows exactly:
- Who ordered what
- What type of action occurred (reinforce, attack, conquest)
- How many ships moved, where, why

The animation layer must receive this information explicitly from the engine, NOT try to reverse-engineer it from before/after snapshots.

### Why This Matters
- Attacks should NOT show ships traveling (they attack remotely)
- Conquests should show ships arriving WITH the ownership change, not a tick later
- Reinforcements should show smooth travel along lanes
- Each of these requires DIFFERENT animations from the SAME "ship count changed" observation

### Rule
**Never use state diffs to decide what to animate. Always use imperative events from the engine that include the action type, source, target, count, and reason.**
