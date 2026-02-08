

# Specification Compliance — Never Regress, Never Assume

## CRITICAL: Existing specs are LAW. Read them before every refactor.

### Post-Mortem: Multi-Star Combat Regression (2026-02-08)

**What happened**: During animation system refactoring, the multi-star combat system was rewritten. The new code grouped attacks by target star but NOT by owner (PlayerId). This violated the explicit specification in MECHANICS.md §3.3: `forces (Map of PlayerId → count)`.

**Why it happened**:
1. Agent did not re-read MECHANICS.md before refactoring combat code
2. Agent treated the refactor as "just animation" when it actually touched combat resolution
3. No test verified per-player force aggregation

**Lesson**: Before touching ANY game logic, re-read:
- `.atlas/MECHANICS.md` (combat formulas, conquest rules)
- `.atlas/GAME_SPECIFICATION.md` (canonical game spec)
- `.atlas/DECISIONS.md` (architectural decisions)

### Post-Mortem: Ship "Spawning" Instead of Transfer Animation (2026-02-08)

**What happened**: Conquered ships appeared ("bloomed") from the star center as if produced there, instead of being animated as arriving from the conquering star. The agent chose to "spawn" visual ships at the destination.

**Why it happened**:
1. Taking a shortcut — spawning is simpler than animating transfers
2. Not thinking about the user's visual experience
3. The specification says "ships teleport to conquered star" (§5.5 line 219) which was interpreted too literally as an instant visual spawn rather than an animated arrival

**Lesson**: "Transfer" and "movement" always mean animated visual travel. Ships never appear from nowhere. If the spec says "teleport", the engine logic is instant but the visual representation must show the journey.

### Rule: Never Assume Mechanics

The agent may SUGGEST changes to game mechanics. The agent may NOT implement unspecified or changed mechanics without explicit user consent.

Examples of violations:
- Changing transfer to "drain all remaining ships" when spec says percentage-based
- Adding a minimum ship retention rule that was never discussed
- Changing floor to ceil in formulas without discussion

The `clearTarget` block (`if transferAmount === 0 || source.activeShips === 0`) exists to auto-cancel move orders when a star has no ships left to send. This is a **housekeeping guard** — if transfer would be 0 or star is empty, stop trying. Modifying or removing it changes game behavior.
