

# Scaffold-First Design Pattern

## Principle
Always scaffold UI elements as early as possible, even before the backing logic is implemented.

**Why**: Having the UI in place lets us wire up functions and data at any point. It also serves as a visual specification and makes it obvious what's "not wired yet" vs "not designed yet."

**This applies to**:
- Feature UI that references planned but unimplemented systems (AI strategies, handicaps, etc.)
- Tuning variables — expose as many as possible in the in-game UI for real-time adjustment
- Configuration panels — build the full scaffold even if some values are read-only or no-op initially

**Related principle**: "Expose as many tuning variables as possible within in-game UI" — every numeric constant should ideally have a slider somewhere.

