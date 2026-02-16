# Pax Fluxia — Game Design Document (GDD)

**Version:** 5.0  
**Last Updated:** 2026-02-16  
**Status:** Alpha (Multiplayer via Colyseus)

---

## 1. Core Identity

**Pax Fluxia** is a tick-based realtime strategy game of galactic conquest. Players command fleets orbiting stars connected by lanes. The game is defined by three pillars:

- **Flow of Force**: Ships orbit, surge, travel, and conquer — always visible, always animated
- **Rhythmic Warfare**: All game logic (production, combat, repair) resolves on a synchronized tick heartbeat
- **Topological Strategy**: The map IS the terrain — only connected stars can interact

---

## 2. The Two Fundamentally Different Actions

> [!CAUTION]
> These are NOT the same thing. Confusing them is a critical error.

### 2.1. Attack (Remote Engagement)

**Ships STAY at their source star.** They deal damage to the enemy star across the lane remotely. The visual representation is the **Attack Surge** — a rhythmic pulse/surge animation where orbiting ships visually push outward toward the target on each tick, then recede. This creates a visual "breathing" or "punching" effect.

- Ships do NOT leave the star
- Damage is applied remotely each tick
- Visual: **surge/recede pulse** synced to tick heartbeat
- Conquest happens when defender's active ships reach 0
- THEN (and only then) do ships physically transfer to the conquered star

### 2.2. Transfer (Reinforcement)

**Ships physically travel along lanes** from one star to another. This ONLY happens between friendly stars (reinforcement) or during conquest resolution (attacker ships moving to captured star).

- Ships depart orbit → travel along lane → arrive at destination
- Visual: ship sprites moving along connection lanes with easing
- Only between FRIENDLY stars (or on conquest)
- Governed by `TRANSFER_RATE` (% of active ships sent per tick)

---

## 3. Visual Animation Systems

The game has several distinct animation systems, each with its own timing:

| System | What It Is | Timing Source | Code Location |
|--------|-----------|---------------|---------------|
| **Attack Surge** | Ships pulse outward toward target during combat | `tickProgress` (0→1 within each tick) | `ShipRenderer.ts` L557-616 |
| **Ship Transfer** | Ships travel along lanes between friendly stars | `performance.now()` vs `ship.departTime` | `ShipRenderer.ts` L201-350, `transferHandler.ts` |
| **Orbit** | Ships orbit around their home star | `orbitTime` (continuous, frame-based) | `ShipRenderer.ts` L470-555 |
| **Settle** | Ships interpolate to new orbit positions | `performance.now()` vs `ship.settleStartTime` | `ShipRenderer.ts` L622-630 |
| **Conquest Transfer** | Ships fly from victor to conquered star | Same as Ship Transfer | `conquestHandler.ts` |
| **Conquest Flash** | Star flashes on conquest | `performance.now()` vs `startTime` | VSM-managed |
| **Spawn/Despawn** | Ships appearing/disappearing | `performance.now()` vs spawn timers | `ShipRenderer.ts` |

### 3.1. Attack Surge Details

The attack surge is the primary combat animation. When a star is attacking an enemy:

1. **Direction**: Ships surge toward the target star (locked direction to prevent flickering)
2. **Pulse**: `sin(tickProgress * π)` creates a sine wave pulse within each tick
3. **Ramp-in**: New attacks ramp up from 0→1 over `ATTACK_SURGE_RAMP_MS` (default 300ms)
4. **Facing bias**: Ships facing the target surge more than ships on the far side
5. **Force proportionality**: Surge amplitude scales with ship ratio (optional)

**Key config variables:**
- `ATTACK_SURGE_MULT` — base amplitude (fraction of star radius)
- `ATTACK_SURGE_RAMP_MS` — ramp-in duration
- `ATTACK_SURGE_SHAPE` — power curve (1 = sine, >1 = sharper)
- `ATTACK_SURGE_PROPORTIONAL` — scale with force ratio
- `ATTACK_SURGE_FORCE_COFACTOR` — force ratio scaling factor

---

## 4. Game Loop (Tick Cycle)

Every tick (default 1200ms at 1× speed):

```
1. PRODUCTION  → Stars generate ships
2. ORDERS      → Process reinforcements, then resolve attacks
3. REPAIR      → Damaged ships heal
4. STATS       → Aggregate player totals
5. WIN CHECK   → Last player standing wins
```

### 4.1. Timing Architecture

| Concept | Config Key | Default | Purpose |
|---------|-----------|---------|---------|
| **Tick Interval** | `BASE_TICK_MS` | 950ms | How often game logic executes |
| **Animation Speed** | `ANIMATION_SPEED_MS` | 1150ms | Visual animation timing (SHOULD control all visual animation speeds) |
| **Tick Progress** | computed | 0→1 within each tick | Drives attack surge pulse, chevron flow |
| **Game Speed** | 1×–10× | 1× | Divides tick interval for faster play |

---

## 5. Entities

### Stars
Fundamental territory unit. Produces ships, connected by lanes, target of orders.

### Ships
Exist in two states: **Active** (combat-ready) and **Damaged** (repair pool, 14% defense contribution).

### Connections
Bidirectional lanes between stars. Only connected stars can interact.

### Players
Human or AI. Identified by `sessionId`. Eliminated when they lose all stars.

---

## 6. Sub-Specifications

| Document | Scope |
|----------|-------|
| [01_ANIMATIONS.md](./01_ANIMATIONS.md) | All visual animation systems, timing, and config |
| [MECHANICS.md](../MECHANICS.md) | Complete game mechanics specification |
| [GAME_SPECIFICATION.md](../GAME_SPECIFICATION.md) | Full technical game specification |
| [CONTROLS.md](../CONTROLS.md) | Player input and controls |
| [FEATURE_STATUS.md](../FEATURE_STATUS.md) | Bug tracker, feature status, regressions, known issues |
| [FX_ANIMATION_ARCHITECTURE_PROPOSAL.md](../FX_ANIMATION_ARCHITECTURE_PROPOSAL.md) | Target VFX architecture |

---

## 7. Architecture Overview

```
common/         → Shared engine, combat, types (server + client)
pax-server/     → Colyseus game server (authoritative)
pax-fluxia/     → SvelteKit + PixiJS client
  └─ lib/
     ├── config/     → game.config.ts (40+ tunable variables)
     ├── stores/     → Svelte 5 reactive stores (gameStore, activeGameStore, animationStore)
     ├── fx/         → FX system (orchestrator, clock, handlers, phases)
     ├── renderers/  → ShipRenderer, StarRenderer, LaneRenderer
     └── components/ → UI (CombatDebugPanel, GameCanvas, SpeedControls)
```
