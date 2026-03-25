

# Specification Compliance

## CRITICAL: Existing specs are LAW. Read them before every refactor.

### Rule
Before touching ANY game logic, re-read:
- `.atlas/MECHANICS.md` — combat formulas, conquest rules
- `.atlas/GAME_SPECIFICATION.md` — canonical game spec
- `.atlas/DECISIONS.md` — architectural decisions

### Anti-Patterns
1. **Refactoring combat-adjacent code without re-reading MECHANICS.md**
2. **Taking visual shortcuts** — ships never "spawn" at a destination; they always travel visually
3. **Assuming game mechanic changes** — agent may SUGGEST changes but NEVER implement without dialogue and consent

### Ship Movement Rule
"Transfer" and "movement" ALWAYS mean animated visual travel. Ships never appear from nowhere. If the engine spec says "teleport" or "instant", the **engine logic** is instant but the **visual representation** shows the journey (immediate start, animated over time).

### Orders Rule
Orders persist until explicitly cancelled by the player. Zero ships does NOT auto-cancel an order. The game is about chains of command and flows of forces — orders define the flow topology.
