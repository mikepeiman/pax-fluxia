# Shared Engine Architecture

## CRITICAL: This project uses a Unified Shared-Engine pattern

The `@pax/common` package contains the **authoritative GameEngine**. It is stateless, deterministic, and used by BOTH client (single-player + optimistic prediction) and server (authoritative multiplayer).

### Directory Structure
```
/root
├── common/              # (@pax/common) - THE BRAIN
│   ├── src/
│   │   ├── schema/      # Shared Colyseus Schema definitions
│   │   ├── engine/      # Pure Logic (GameEngine + GameInput)
│   │   ├── combat.ts    # Shared combat calculations
│   │   └── types.ts     # Shared TS Interfaces
├── pax-fluxia/          # Client (Svelte + Vite) - THE VIEW
│   ├── src/
│   │   ├── stores/      # State management
│   │   └── lib/         # Visual components
└── pax-server/          # Server (Node + Colyseus) - THE TRUTH
    ├── src/
    │   └── rooms/       # Networking & Loop orchestration
```

### Core Rules
1. **GameEngine methods are static** — never holds state internally
2. **State is injected** — `GameEngine.tick(state)`, not `this.state`
3. **Schema types required** — GameState uses Colyseus Schema (MapSchema, ArraySchema)
4. **Deterministic math** — no unseeded `Math.random()` in engine
5. **Visual separation** — Svelte components bind to interpolated values, not raw state

### Data Flow
- **Multiplayer**: Server runs `GameEngine.tick(masterState)` → Colyseus patches → Client reconciles
- **Single Player**: Client runs `GameEngine.tick(localState)` directly
- **Client-side `pax-fluxia/src/lib/engine/GameEngine.ts` should NOT contain separate game logic** — it should delegate to `@pax/common`

### Anti-Pattern to Watch For
If `pax-fluxia/src/lib/engine/GameEngine.ts` contains combat logic, production logic, or game rules that differ from `@pax/common/engine/GameEngine.ts`, **those engines have diverged** and this is an architectural violation that must be fixed.
