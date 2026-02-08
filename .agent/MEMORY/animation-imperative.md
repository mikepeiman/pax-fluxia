
# Animation Must Be Imperative, Not Diff-Based

## CRITICAL: Animations are driven by PLAYER COMMANDS via engine events, not state diffs.

### Rule
**Never use state diffs to decide what to animate.** The engine emits typed events (`reinforce`, `conquest`, `scatter`, `retreat`) with full context (source, target, count, owner). The animation layer consumes these events.

### Why
Diffing ship counts between frames cannot distinguish:
- Reinforcement (ships travel along lane)
- Attack damage (ships destroyed at source, never travel)
- Conquest (ships arrive at destination with ownership change)

Each requires a DIFFERENT animation from the SAME "ship count changed" observation. The engine already knows the action type — don't reverse-engineer it.

### Anti-Pattern
```
// BAD: observing state changes
if (prev.ships > current.ships && star.targetId) {
    animateTravelToTarget(); // Wrong for attacks!
}
```

### Correct Pattern
```
// GOOD: consuming engine events
engine.events.forEach(event => {
    if (event.type === 'reinforce') animateTravel(event);
    if (event.type === 'conquest') animateConquestTransfer(event);
    // No event for attacks — they're remote engagement
});
```
