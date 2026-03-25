# VIEW B: THE ASSET INVENTORY (Matter)

**Last Updated:** 2026-02-12  
**Project:** Pax Fluxia

---

## Class Diagram — Current Architecture

```mermaid
classDiagram
    direction TB

    %% Common Package (@pax/common)
    class SharedGameEngine {
        <<static, stateless>>
        +tick(state, config) TickEvents
        +processInput(state, input) void
        -processProduction(state, cfg) void
        -processOrders(state, cfg, events) void
        -processRepair(state, cfg) void
        -resolveMultiSourceCombat() void
        -executeConquest() void
        -checkWinCondition(state) void
    }

    class EngineConfig {
        <<interface>>
        +BASE_PRODUCTION: number
        +REPAIR_RATE: number
        +TRANSFER_RATE: number
        +DAMAGE_PER_SHIP: number
        +LETHALITY: number
        +AGGRESSOR_ADVANTAGE: number
        +CONQUEST_THRESHOLD: number
        +CONQUEST_TRANSFER_PERCENTAGE: number
        ...17 more fields
    }

    class STAR_TYPE_STATS {
        <<const>>
        grey | yellow | blue | purple | red | green
        defense, prod, speed, repair, attack, color
    }

    %% Client Package (pax-fluxia)
    class ClientGameEngine {
        <<stateful, SP only>>
        -stars: Map~StarId, Star~
        -connections: StarConnection[]
        -players: Map~PlayerId, Player~
        -aiPlayers: Map~PlayerId, AI~
        -tick: number
        -speed: GameSpeed
        +start() void
        +pause() void
        +resume() void
        +setSpeed(speed) void
        +createLink(sourceId, targetId) boolean
        +cancelLink(starId) void
        +setDeferredOrder() boolean
        +getState() GameState
        +destroy() void
        -executeTick() void
        -executeTransferOrders(events) void
        -resolveMultiSourceCombat() void
        -resolveCombat() void
        -executeConquest() void
        -executeAI() void
        -checkWinCondition() void
    }

    class Star {
        +id: StarId
        +x, y: number
        +activeShips: number
        +damagedShips: number
        +ownerId: PlayerId
        +targetId: StarId | null
        +starType: string
        +queuedOrderTargetId: StarId | null
        +produce() void
        +repair(tick) void
        +takeDamage(n) void
        +setTarget(id, persist?) void
        +setOwner(id) void
        +getState() StarState
    }

    class AI {
        +playerId: string
        +evaluate(stars, connections) Decision[]
    }

    class ActiveGameStore {
        <<SP/MP facade>>
        +getStars() Star[]
        +getConnections() Connection[]
        +getPlayers() Player[]
        +getPhase() string
        +issueOrder(src, tgt) void
        +cancelOrder(id) void
        +pauseGame() void
        +resumeGame() void
        +pushTickEvents(events) void
        +consumeTickEvents() TickEvents | null
    }

    %% Server Package (pax-server)
    class GameRoom {
        <<Colyseus Room>>
        +state: GameRoomState
        -engineConfig: EngineConfig
        +onCreate(options) void
        +onJoin(client) void
        +onLeave(client) void
        -registerMessageHandlers() void
        -initializeGame() void
        -initStandardMap() void
        -initDebugMap() void
        -executeTick() void
        -processAI() void
    }

    %% Relationships
    SharedGameEngine --> EngineConfig : uses
    SharedGameEngine --> STAR_TYPE_STATS : uses
    GameRoom --> SharedGameEngine : delegates to
    ClientGameEngine --> Star : manages
    ClientGameEngine --> AI : uses
    Star --> STAR_TYPE_STATS : reads
    ActiveGameStore --> ClientGameEngine : SP mode
```

---

## Types & Interfaces

### Shared Types (`common/src/types.ts`)

| Type | Purpose |
|------|---------|
| `StarType` | `'grey' \| 'yellow' \| 'blue' \| 'purple' \| 'red' \| 'green'` |
| `EngineConfig` | Tunable game parameters (production, combat, conquest, etc.) |
| `TickEvents` | `{ transfers, combats, conquests }` — events emitted per tick |
| `TransferEvent` | Ship movement between friendly stars |
| `CombatEvent` | Per-tick combat damage exchange |
| `ConquestEvent` | Star ownership change with scatter/retreat details |
| `ConquestContext` | Interface for neighbor lookups during conquest |

### Client Types (`pax-fluxia/src/lib/types/`)

| Type | Purpose |
|------|---------|
| `GameState` | Full snapshot for UI binding (stars, connections, players, tick, winner) |
| `GameSpeed` | `0 \| 1 \| 2 \| 4 \| 10 \| 50` |
| `GameView` | `'menu' \| 'lobby' \| 'game' \| 'results'` |
| `StarState` | Serializable star state for UI rendering |
| `PlayerState` | Player stats snapshot (ships, stars, production) |
| `GameHistoryEntry` | Per-tick snapshot for graphs (ship counts, combat events) |

---

## Exported Functions

### Shared Functions (`@pax/common`)

| Function | File | Purpose |
|----------|------|---------|
| `GameEngine.tick(state, config)` | `engine/GameEngine.ts` | Stateless tick processor |
| `calculateCombat(forceA, forceB, ...)` | `combat.ts` | Symmetric damage with lethality split |
| `applyConquest(attacker, defender, ctx, cfg)` | `conquest.ts` | Ownership transfer + scatter/retreat |
| `applyProduction(star, cfg)` | `production.ts` | Overflow-based integer ship production |
| `applyRepair(star, cfg)` | `repair.ts` | Overflow-based integer ship repair |
| `calculateTransfer(activeShips)` | `orders.ts` | Transfer amount calculation |
| `validateOrder(source, target, ...)` | `orders.ts` | Order validation |

### Client Functions

| Function | File | Purpose |
|----------|------|---------|
| `createEngine(config)` | `engine/GameEngine.ts` | Factory for SP engine |
| `calculateCombatV4(...)` | `engine/Combat.ts` | **Client combat formula (duplicates shared)** |
| `getOrbitSlot(index, ...)` | `utils/render.utils.ts` | Ship orbit packing |

---

## Stores

| Store | File | Purpose |
|-------|------|---------|
| `activeGameStore` | `activeGameStore.svelte.ts` | SP/MP facade — single API for both modes |
| `gameStore` | `gameStore.svelte.ts` | SP game state (engine instance, snapshot) |
| `multiplayerStore` | `multiplayerStore.svelte.ts` | MP Colyseus connection state |
| `combatLog` | `combatLog.ts` | Rolling combat log for UI display |

---

## Configuration Sources

| Source | File | Mutable? | Persistence | Purpose |
|--------|------|----------|-------------|---------|
| `GAME_CONFIG` | `pax-fluxia/src/lib/config/game.config.ts` | ✅ Yes | localStorage | Client-side runtime config (all tunable params) |
| `DEFAULT_ENGINE_CONFIG` | `common/src/config.ts` | ❌ No | None | Default values for server & fallback |
| `ORDER_CONFIG` | `common/src/orders.ts` | ❌ No | None | **Stale — TRANSFER_RATE=0.25 (conflicts)** |
| `STAR_TYPE_STATS` | `common/src/config.ts` | ❌ No | None | Star type multipliers (single source of truth) |

---

## Constants

| Constant | File | Value | Purpose |
|----------|------|-------|---------|
| `BASE_TICK_MS` | `game.config.ts` | `1200` | Tick interval at 1x speed |
| `SHIP_BASE_SIZE` | `game.config.ts` | `4` | Ship circle radius (px) |
| `ORBIT_RING_MULT` | `game.config.ts` | `1.4` | Ring spacing multiplier |
| `WOBBLE_AMP` | `game.config.ts` | `12` | Travel wobble amplitude (px) |
| `SETTLE_DURATION_MS` | `game.config.ts` | `150` | Ship settle-into-orbit time |

---

*Update this file when: Exporting new functions, classes, or types; changing signatures.*
