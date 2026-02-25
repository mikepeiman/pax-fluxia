

# Use Game Time Only — NEVER Wall Clock for Game Logic or Animation

## CRITICAL RULE: All game timing MUST use `gameNowMs` (FXClock)

**The canonical time source for ALL game-related timing is `gameNowMs` from FXClock.**

### FORBIDDEN in game/animation code:
- `performance.now()`
- `Date.now()`
- `requestAnimationFrame` timestamp parameter (for computing deltas)

### WHERE to use what:

| Context | Time Source |
|---------|------------|
| Animation/VFX | `gameNowMs` (FXClock) |
| Tick progress | `gameNowMs` relative to tick start |
| Surge ramp | `gameNowMs` delta |
| Settle animations | `gameNowMs` |
| Ship travel | `gameNowMs` |
| Wall-clock stats (elapsed real time) | `Date.now()` — ONLY for end-game stats display |
| Tick scheduling (setInterval timing) | `performance.now()` — ONLY for scheduling the next `executeTick` |

### WHY
`gameNowMs` is pause-aware and speed-aware. Wall-clock time diverges from game time during pause/resume, speed changes, and tab backgrounding. Mixing them causes animation glitches on tick boundaries.

### The One Exception
`performance.now()` is acceptable ONLY for:
- Scheduling tick intervals (`lastTickTime` for `setInterval`/`setTimeout`)
- Real-world elapsed time display (end-game stats)

Everything else: **gameNowMs**.
