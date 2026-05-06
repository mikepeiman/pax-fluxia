# Pax Fluxia — Comprehensive Game Specification

**Version:** 4.1  
**Last Updated:** 2026-03-27  
**Status:** Alpha (Engine unified, Territory refactor in progress)

> [!IMPORTANT]
> This is the **master specification**. For definitive tuning values and combat formulas, see [MECHANICS.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/docs/game/design/MECHANICS.md) (v4.1, ground-truth confirmed 2026-03-27).

### Sub-Specifications (Component Breakouts)

| # | Category | Source Document | Status |
|---|----------|----------------|--------|
| 1 | Combat & Conquest | [MECHANICS.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/docs/game/design/MECHANICS.md) §5-8 | ✅ Ground truth |
| 2 | Economy & Production | MECHANICS.md §4, §9 | ✅ Ground truth |
| 3 | Orders & Flow | MECHANICS.md §3, §10 | ✅ Ground truth |
| 4 | Territory & Geometry | [TERRITORY_ARCHITECTURE.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md) | 🔶 In refactor |
| 5 | AI & Strategy | MECHANICS.md §11, [AI strategies](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/docs/game/design/AI_STRATEGIES.md) | ✅ Spec'd |
| 6 | Visual & Animation | [VFX docs](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/docs/game/vfx/) | 📋 Needs synthesis |
| 7 | UI & Controls | This doc §8, [CONTROLS.md](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/docs/game/ui/) | 📋 Needs synthesis |
| 8 | Multiplayer | This doc §2.3, FEATURE_STATUS F-38/66/92 | 📋 Needs synthesis |

---

## 1. Vision

**Pax Fluxia** is a tick-based realtime strategy game of galactic conquest. Players command fleets of ships flowing between stars connected by lanes to dominate the map. The game emphasizes **topological strategy** (the map IS the terrain), **rhythmic warfare** (all actions resolve on a synchronized tick), and **flow of force** (ships visibly travel, attack, and conquer).

---

## 2. Architecture

### 2.1. Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Client | SvelteKit + Svelte 5 (Runes) | `pax-fluxia/` |
| Renderer | PixiJS 8.x (WebGL) | Canvas-based, 60fps |
| Server | Node.js + Colyseus | `pax-server/` — authoritative game state |
| Shared | TypeScript package | `common/` — types, schemas, engine, combat |
| Desktop | Tauri 2.0 (deferred) | Rust wrapper for local play |
| Package Manager | Bun | Monorepo with workspaces |

### 2.2. Monorepo Structure

```
PRISM-Atlas-DART v1/
├── common/src/           # Shared game logic
│   ├── engine/           # GameEngine.ts (stateless tick processor)
│   │   └── GameInput.ts  # Input type definitions
│   ├── schema/           # Colyseus schema definitions (GameState.ts)
│   ├── combat.ts         # Combat calculation (shared client+server)
│   ├── types.ts          # Definitive type definitions
│   ├── orders.ts         # Order processing
│   └── production.ts     # Ship production logic
├── pax-fluxia/src/lib/   # Client application
│   ├── engine/           # Client-side AI, Star, Combat, Fleet
│   ├── stores/           # Svelte 5 reactive stores
│   ├── components/       # UI components (Svelte)
│   ├── config/           # game.config.ts (40+ tunable variables)
│   ├── audio/            # AudioManager.ts (Tone.js)
│   ├── utils/            # logger.ts, math, hex, render utils
│   └── types/            # Client-side type definitions
├── pax-server/src/       # Colyseus game server
│   ├── rooms/            # GameRoom.ts, TestRoom.ts
│   ├── schema/           # Server schema variants
│   └── utils/            # Server-side logger
├── .atlas/               # Architecture documentation (SSOT)
└── .agent/rules/         # Agent behavioral rules
```

### 2.3. Data Flow

```
Player Input → Client Store → Colyseus Message → Server GameRoom
                                                       ↓
                                              GameEngine.processInput()
                                              GameEngine.tick()
                                                       ↓
                                              Schema State Change
                                                       ↓
                                              Colyseus Auto-Sync → Client
                                                       ↓
                                              PixiJS Render (interpolated)
```

---

## 3. Entities

### 3.1. Star

The fundamental unit of territory. Stars produce ships, are connected by lanes, and are the targets of orders.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `x`, `y` | number | Position on map |
| `radius` | number | Visual size |
| `ownerId` | PlayerId | Current owner's session ID |
| `starType` | StarType | grey, yellow, blue, purple, red, green |
| `activeShips` | number | Combat-ready ships |
| `damagedShips` | number | Ships in repair pool |
| `targetId` | StarId | Active order target (attack/reinforce) |
| `queuedOrderTargetId` | StarId | Deferred order (activates on conquest) |
| `productionRate` | number | Ships produced per tick |
| `repairRate` | number | % of damaged ships repaired per tick |
| `transferRate` | number | % of ships sent per tick on order |
| `activationRate` | number | % of captured damaged ships becoming active |
| `defensivePosture` | number | % of casualties destroyed vs disabled |
| `defenseStrength` | number | Global defense modifier |
| `icon` | string | Random emoji for visual identity |

> [!IMPORTANT]
> Runtime ownership invariant: every live star must have an `ownerId`. If a map input omits `ownerId` or leaves it empty, game initialization must normalize that star to `"neutral"` before gameplay and territory rendering begin. Neutral stars still hold territory space even when they start with zero ships.

### 3.2. Star Types

Each star type has a **2× bonus** in one specialty. All other stats are at 1.0.

| Type | Color | 2× Bonus | Hex | Strategic Role |
|------|-------|----------|-----|---------------|
| **Grey** | `#8899aa` | None | Baseline | No advantage |
| **Yellow** | `#fbbf24` | Production | 2× ship generation | Economy star |
| **Blue** | `#3b82f6` | Speed | 2× transfer rate | Logistics star |
| **Purple** | `#a855f7` | Repair | 2× repair rate (0.4 vs 0.2) | Attrition star |
| **Red** | `#ef4444` | Defense | 2× defenseStrength | Fortress star |
| **Green** | `#22c55e` | Attack | 2× attack power | Assault star |

### 3.3. Connection

A bidirectional lane between two stars. Only connected stars can interact.

| Property | Type | Description |
|----------|------|-------------|
| `sourceId` | StarId | First star |
| `targetId` | StarId | Second star |
| `distance` | number | Euclidean distance |

### 3.4. Player

| Property | Type | Description |
|----------|------|-------------|
| `id` | PlayerId | Unique identifier |
| `name` | string | Display name |
| `color` | string | Hex color |
| `isAI` | boolean | Computer opponent |
| `isEliminated` | boolean | No stars remaining |
| `sessionId` | string | Colyseus session ID |
| `starCount` | number | Owned star count |
| `activeShips` | number | Total active across all stars |
| `damagedShips` | number | Total damaged across all stars |
| `totalShips` | number | active + damaged |
| `production` | number | Total production rate |

---

## 4. Game Loop (Tick Cycle)

Every tick (default 1200ms at 1× speed), the engine processes in this exact order:

```
1. PRODUCTION  → Stars generate ships (baseProduction × productionRate)
2. ORDERS      → Process reinforcements, then resolve attacks
3. REPAIR      → Damaged ships heal (repairRate × damagedShips, min 1)
4. STATS       → Aggregate player totals from stars
5. WIN CHECK   → Last player standing wins
```

### 4.1. Phases

| Phase | Description |
|-------|-------------|
| `lobby` | Waiting for players to join |
| `playing` | Active game, ticks running |
| `ended` | Winner determined or all eliminated |

### 4.2. Speed Control

| Speed | Tick Interval |
|-------|--------------|
| 0 (Paused) | ∞ |
| 1× | 1200ms |
| 2× | 600ms |
| 4× | 300ms |
| 10× | 120ms |

---

## 5. Combat System (V4 — Symmetric Damage Model)

### 5.1. Overview

Combat is **remote engagement**: Star A attacks Star B from a distance. Both sides take damage simultaneously. There is no "safe" attack.

### 5.2. Tunable Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DAMAGE_PER_SHIP` | 0.1 | Base damage each ship deals per tick |
| `LETHALITY` | 0.25 | 25% of damage kills, 75% disables |
| `AGGRESSOR_ADVANTAGE` | 0.8 | Multiplier for attacking side's damage (currently favors defender) |
| `FORCE_RATIO_EFFECT` | 0 | Log2 bonus for numerical superiority (disabled) |
| `DAMAGED_SHIP_EFFECTIVENESS` | 0.14 | ~1/7 — how much damaged ships contribute to defense |
| `CONQUEST_THRESHOLD` | 8 | Need 8× ships for instant overwhelm |
| `MINIMUM_DAMAGE` | 1 | Floor prevents infinite stalemates |

### 5.3. Combat Resolution Formula

```
For each side:
  1. baseOutput = shipCount × DAMAGE_PER_SHIP
  2. aggressorMod = isAttacking ? AGGRESSOR_ADVANTAGE : 1.0
  3. forceBonus = 1 + (log2(ratio) × FORCE_RATIO_EFFECT)  [if enabled]
  4. totalDamage = max(MINIMUM_DAMAGE, baseOutput × aggressorMod × forceBonus)
  5. kills = floor(totalDamage × LETHALITY)
  6. disabled = floor(totalDamage × (1 - LETHALITY))
```

Side A's output damages Side B, and vice versa.

### 5.4. Effective Defender Force

Defenders fight with both active AND damaged ships, but damaged ships at reduced effectiveness:

```
effectiveForce = activeShips + floor(damagedShips × DAMAGED_SHIP_EFFECTIVENESS)
```

### 5.5. Conquest

Conquest occurs when:
- `defender.activeShips <= 0` (attrition victory), OR
- `defender.activeShips <= totalAttackerShips / CONQUEST_THRESHOLD` (overwhelm)

> [!IMPORTANT]
> **Multi-Star / Multi-Player Combat**: When multiple stars attack the same defender:
> 1. Group ALL attackers by `ownerId` (player)
> 2. Sum ships per player to get each player's total attacking ships
> 3. Total of ALL attackers (all players combined) determines damage dealt to defender
> 4. Damage to attackers distributed proportionally by each star's ship contribution
> 5. **Victor** = the **player** (ownerId) with the largest total attacking ships, NOT the single largest star
> 6. `executeConquest` receives the strongest individual star of the winning player

On conquest:
1. Defender ownership transfers to winning **player** (not star)
2. 50% of winning player's attacking ships transfer to conquered star
3. Defender's damaged ships are zeroed
4. All orders targeting conquered star from OTHER players are cancelled (including chained orders)
5. Winning player's orders to conquered star are cancelled (it's now friendly)
6. Queued (deferred) orders activate if set

### 5.6. Scatter & Retreat (Conquest Aftermath)

| Scenario | Capture Rate | Remaining |
|----------|-------------|-----------|
| **Retreating** (active order to friendly star) | 35% captured | 65% escape to target |
| **Scatter** (has escape routes, no active retreat) | 50% captured | 50% of rest destroyed, 50% escape to connections |
| **No escape** (surrounded) | 100% captured | — |

---

## 6. Economy

### 6.1. Production

- Every owned star produces ships each tick
- Base rate: configurable (default 0.5 per tick → 1 ship every 2 ticks)
- Yellow stars: 2× production rate
- Ships go directly to `activeShips` pool

### 6.2. Repair

- Damaged ships heal at `repairRate` per tick (default 20%)
- Minimum 1 ship repaired per tick
- Purple stars: 2× repair rate
- Repair penalty when under active attack: 10% effectiveness (`REPAIR_COMBAT_PENALTY: 0.1`)

### 6.3. Transfer (Reinforcement)

- On each tick, stars with active move orders send ships to friendly targets
- Transfer amount: `max(MIN_SHIPS_PER_TRANSFER, ceil(activeShips × TRANSFER_RATE))`
- Default transfer rate: 25% of active ships per tick
- Blue stars: 2× transfer rate

> [!IMPORTANT]
> **Order Persistence**: Orders persist until explicitly cancelled by the player. Zero remaining ships does NOT auto-cancel an order. When reinforcements arrive at an empty star with an active order, they immediately flow onward. This is fundamental to the flow topology design.

> [!IMPORTANT]
> **Attack vs Transfer**: Attacks are REMOTE ENGAGEMENT — ships stay at their source star and deal damage across the lane. Ships do NOT physically travel to the target during an attack. Only reinforcements (friendly transfers) involve physical ship movement along lanes.

---

## 7. Player Controls

### 7.1. Order Input

| Action | Method | Effect |
|--------|--------|--------|
| Select star | Left-click | Highlights star, shows info |
| Issue order | Drag from star A to B, or click A then click B | Sets `targetId` |
| Cancel order | Right-click on star | Clears `targetId` |
| Deferred order | Click through enemy star (passthrough) | Sets `queuedOrderTargetId` — activates on capture |

### 7.2. Game Controls

| Action | Control |
|--------|---------|
| Pause/Resume | Pause button |
| Speed 1×–10× | Speed control buttons |

---

## 8. AI System (Current: Greedy Strategy)

### 8.1. Difficulty Levels

| Level | Aggression Threshold | Evaluation Chance | Behavior |
|-------|---------------------|-------------------|----------|
| Easy | 2.0 (need 2:1) | 30% of ticks | Cautious, infrequent |
| Normal | 1.2 (need 20% edge) | 50% of ticks | Standard |
| Hard | 0.8 (attacks at disadvantage) | 80% of ticks | Aggressive |
| Expert | 0.6 (very aggressive) | 100% of ticks | Always active |

### 8.2. Tunable AI Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ATTACK_THRESHOLD` | 1.33 | Min ship ratio to initiate attack |
| `AI_DESIST_THRESHOLD` | 1.0 | Ratio to stop attacking (retreat at parity) |
| `AI_RANDOM_AGGRESSION` | 0.05 | Chance per tick for random attack |
| `AI_TACTICAL_AGGRESSION` | 0.1 | Chance to attack weak target (baiting) |

### 8.3. Current AI Decision Logic

1. **Already attacking?** Check if ratio dropped below desist threshold → retreat
2. **Skip weak stars** (< 5 ships)
3. **Find connected enemies** (topology-validated)
4. **Tactical aggression roll** → attack weakest enemy
5. **Random aggression roll** → attack random connected enemy
6. **Standard attack** → only when ratio ≥ attack threshold, pick weakest target

---

## 9. Visual Specification

### 9.1. Aesthetic: "Neon Void"

- **Background**: Deep Void (`#0a0a12`)
- **Accents**: Cyan (`#00ffff`)
- **Typography**: Bright White
- **Stars**: Emoji icons (random: 🌟, 🌋, 🪐, etc.)
- **Player colors**: Blue (human), Yellow/Red/Green/Purple/Orange (AI)

### 9.2. Ship Representation

| State | Visual |
|-------|--------|
| Active ships | Solid colored dots, packed in concentric rings |
| Damaged ships | Hollow rings (outlined), orbiting at reduced speed |

### 9.3. Map Elements

| Element | Visual |
|---------|--------|
| Connections | White lines, configurable alpha/width |
| Active orders | Animated chevron overlays (flow arrows) |
| Deferred orders | Dashed arrow lines |
| Star labels | Icon + active count (bright) + damaged count (dim) |

### 9.4. Animation Rules

> [!IMPORTANT]
> **Imperative, Not Reactive**: All animations are driven by typed engine events, NOT by observing state diffs between frames. The engine emits events specifying the action type, source, target, and ship count.

| Game Action | Animation | Event Type |
|-------------|-----------|------------|
| **Reinforcement** (friendly transfer) | Ships depart orbit → travel along lane → arrive in orbit | `reinforce` |
| **Attack** (remote engagement) | Surge visual at source star (ships stay) | `attack` (or no event — existing surge) |
| **Conquest** | Ships immediately begin traveling from victor star(s) to conquered star. Ownership color changes as ships arrive. | `conquest` |
| **Scatter** | Ships burst outward to connected friendly neighbors | `scatter` |
| **Retreat** | Ships fly to directed retreat target | `retreat` |

**Timing**: Conquest/scatter/retreat animations begin IMMEDIATELY (same frame as the game event), NOT on the following tick. The animation plays out over time (smooth travel), but its initiation is simultaneous with the engine state change.

**Ship Color**: Ships may fade toward white at the midpoint of travel and return to player color on arrival.

### 9.5. Audio (Tone.js)

- Tick metronome (ambient heartbeat)
- Order chimes (ascending tones)
- Combat sounds (intensity-scaled)
- Conquest fanfare

---

## 10. Map Generation

### 10.1. Current System (Hex Grid + Delaunay)

- Stars placed on hex grid positions with jitter
- Connections generated via Delaunay triangulation
- Configurable: `STARS_PER_PLAYER`, `MIN_LINKS_PER_STAR`, `MAX_LINKS_PER_STAR`
- Star spacing slider (0.5× dense to 2.0× sparse)

### 10.2. Map Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `STARS_PER_PLAYER` | 5 | Stars each player starts with |
| `HEX_RADIUS` | 50 | Hex cell radius |
| `MIN_LINKS_PER_STAR` | 1 | Minimum connections |
| `MAX_LINKS_PER_STAR` | 6 | Maximum connections |
| `STARTING_SHIPS` | 40 | Ships per star at game start |

---

## 11. Networking (Colyseus Multiplayer)

### 11.1. Architecture

- **Server**: Node.js + Colyseus, runs `GameEngine.tick()` authoritatively
- **Client**: Connects via WebSocket, receives schema state sync
- **Shared**: `common/` package ensures identical combat logic on both sides
- **Schema**: `@colyseus/schema` with `schema()` function API (avoids decorator issues)

### 11.2. Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ISSUE_ORDER` | Client → Server | Player issues attack/reinforce order |
| `CANCEL_ORDER` | Client → Server | Player cancels order |
| `SET_DEFERRED_ORDER` | Client → Server | Player sets passthrough order |
| `PAUSE`/`RESUME` | Client → Server | Game flow control |
| `SET_SPEED` | Client → Server | Speed change |
| `START_GAME` | Client → Server | Begin game from lobby |

---

## 12. Configuration Reference

All 40+ tunable variables are centralized in `pax-fluxia/src/lib/config/game.config.ts`. Combat-specific variables also in `common/src/combat.ts` (COMBAT_CONFIG).

Combat tuning is exposed via in-game Control Panel (Tweakpane integration).
