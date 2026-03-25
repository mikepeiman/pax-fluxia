# Architecture — Deep Dive

## Monorepo Structure

```
/root
├── common/              # @pax/common — THE BRAIN
│   ├── src/
│   │   ├── schema/      # Shared Colyseus Schema definitions
│   │   ├── engine/      # Pure Logic (GameEngine + GameInput)
│   │   ├── combat.ts    # Shared combat calculations
│   │   ├── conquest.ts  # Stateless conquest/scatter/retreat
│   │   └── types.ts     # Shared TS Interfaces
├── pax-fluxia/          # Client (Svelte + Vite) — THE VIEW
│   ├── src/
│   │   ├── stores/      # State management
│   │   ├── lib/         # Visual components
│   │   └── lib/config/  # GAME_CONFIG, themes, builtins
└── pax-server/          # Server (Node + Colyseus) — THE TRUTH
    ├── src/
    │   └── rooms/       # Networking & Loop orchestration
```

---

## Shared Engine Pattern

### Core Rules
1. **GameEngine methods are static** — never holds state internally
2. **State is injected** — `GameEngine.tick(state)`, not `this.state`
3. **Schema types required** — GameState uses Colyseus Schema (MapSchema, ArraySchema)
4. **Deterministic math** — no unseeded `Math.random()` in engine
5. **Visual separation** — Svelte components bind to interpolated values, not raw state

### Data Flow
- **Multiplayer**: Server runs `GameEngine.tick(masterState)` → Colyseus patches → Client reconciles
- **Single Player**: Client runs `GameEngine.tick(localState)` directly
- Client `pax-fluxia/src/lib/engine/GameEngine.ts` should delegate to `@pax/common`, NOT contain separate logic

### Anti-Pattern: Split Brain
If client engine has combat/production/game rules that differ from `@pax/common`:
- **The engines have diverged** — this is an architectural violation
- MP client will predict different values than server → desyncs, snapping, false cheat flags
- Fix by porting logic to `@pax/common` as stateless functions accepting interfaces

---

## Engine Convergence Status

### Strategy: Interface-Driven Refactor

**Step 1: Abstract Data Layer**
- `IStar`, `IFleet`, `IGameState` interfaces in `@pax/common`
- Both client local classes AND server Schema classes implement these

**Step 2: Port Logic to Stateless Functions**
- Rich logic from client → static functions in `@pax/common` accepting interfaces
- Example: `this.calculateProduction()` → `GameEngine.calculateProduction(star: IStar)`

**Step 3: Incremental Migration**
- Phase 1 (Math Parity): ✅ Complete
- Phase 2 (Combat & Capture): ✅ Complete — `applyConquest()` in `@pax/common/conquest.ts`
- Phase 3 (Cleanup): ⬜ Pending — strip duplicated logic from client engine

### Constraints
- Server remains authoritative
- Logic remains stateless (pass state in, get mutation out)
- NEVER delete client features — add missing features to shared engine instead
- Do NOT import client engine on server (kills Colyseus delta compression)

---

## Colyseus Patterns

### Module Resolution Gotcha (Bun/Docker)
**NEVER** explicitly import `WebSocketTransport`:
```typescript
// ✅ Let Server create transport internally
import { Server } from "colyseus";
const gameServer = new Server({
    express: (app) => { /* middleware */ },
});

// ❌ NEVER — causes dual module instances → "seat reservation expired" (4002)
import { WebSocketTransport } from "@colyseus/ws-transport";
```

Bun's content-addressable `node_modules` resolves `@colyseus/core` as two separate instances: one for server code, one for ws-transport's dependency. Each gets its own `matchMaker` singleton → rooms created in one map, looked up in the other.

### Schema Decorators
Use `defineTypes()` calls instead of `@type` decorators when using tsx/esbuild as the build tool. Decorator handling differs between build tools and the Colyseus library expectations.

---

## Theme System

| File | Purpose |
|------|---------|
| `pax-fluxia/src/lib/config/builtinThemes.ts` | Built-in presets shipped with game |
| `pax-fluxia/src/lib/config/themes.ts` | Theme system: extract, apply, save/load |
| `common/resources/settings-themes/*.json` | User's saved theme files |

### Theme Versioning Rule
When user updates a named theme: version it (v2, v3), never overwrite the original.
