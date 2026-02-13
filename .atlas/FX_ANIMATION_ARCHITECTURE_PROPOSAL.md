# FX & Animation Architecture Proposal

**Purpose:** Refactor from procedural, monolithic animation logic to a modular, extensible system that supports infinite specialFX and animation variations without touching core code.

**Date:** 2026-02-04

---

## 1. Current State Analysis

### 1.1 What Works Well

| Component | Location | Strength |
|-----------|----------|----------|
| **Event-driven pipeline** | Engine → TickEvents → activeGameStore → GameCanvas | Animations are triggered by typed events, not state diffs. Correct architectural choice. |
| **Conquest strategy registry** | `animations/conquest/strategies.ts` | `CONQUEST_STRATEGIES` map + `executeConquestTransfer(ctx)` — adding a new mode = add function + register. Good pattern. |
| **TickEvents contract** | `common/src/engine/TickEvents.ts` | Clean `TransferEvent`, `CombatEvent`, `ConquestEvent` types. Stable API. |

### 1.2 Pain Points (Why Agent Struggles)

| Problem | Location | Impact |
|---------|----------|--------|
| **Monolithic `processTickEvents`** | GameCanvas.svelte L1246–1600 | ~350 lines. Transfer, scatter, retreat, conquest all inline. Adding a new event type or FX requires editing this giant function. |
| **Inline travel lifecycle** | GameCanvas.svelte L1687–2100 | `renderTravelingShips` has ORB vs LANE vs BEZIER branches, wobble logic, settle logic — all procedural. No composition. |
| **Config sprawl** | game.config.ts | 50+ animation keys. Each new effect = new config key. No grouping or presets. |
| **No FX composition** | — | Cannot combine effects: e.g., "transfer + glow" or "conquest + particle burst + star pulse". Each is hardcoded separately. |
| **Tight coupling** | GameCanvas ↔ GAME_CONFIG ↔ render.utils | Changing one behavior requires understanding multiple files. |

### 1.3 Root Cause

**Procedural, not compositional.** The system answers "what happens when event X fires?" with a single block of code. It does not answer "what FX can I attach to event X?" or "how do I compose multiple FX?"

---

## 2. Target Architecture: Event → FX Registry + Composable Pipeline

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Engine (unchanged)                                                          │
│  emit TickEvents { transfers, combats, conquests }                           │
└───────────────────────────────────────────────┬─────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FX Orchestrator (new)                                                        │
│  For each event: lookup FXRegistry[eventType] → run handlers in order         │
│  Handlers receive (event, context) and return/modify animation state          │
└───────────────────────────────────────────────┬─────────────────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│  Transfer FX Handlers    │  │  Combat FX Handlers       │  │  Conquest FX Handlers     │
│  - ShipTravelPipeline    │  │  - SurgeAnimation        │  │  - ScatterEscape          │
│  - OrbMerge (optional)   │  │  - DamageFlash           │  │  - RetreatEscape          │
│  - LaneWobble (optional)  │  │  - ScreenShake (future)  │  │  - AttackerTransfer       │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

### 2.2 Core Abstractions

#### A. FX Handler Interface

```typescript
// lib/fx/types.ts
export type FXEventType = 'transfer' | 'combat' | 'conquest';

export interface FXContext {
  now: number;
  starsById: Map<string, StarState>;
  visualShips: Map<string, VisualShipState[]>;
  travelingShips: VisualShipState[];
  connections: StarConnection[];
  effectiveTickMs: number;
}

export interface FXHandler<T extends FXEvent> {
  /** Unique id for debugging and ordering */
  id: string;
  /** Priority: lower runs first. Default 100. */
  priority?: number;
  /** Process the event, optionally mutate context */
  handle(event: T, ctx: FXContext): void;
}

export type TransferFXHandler = FXHandler<TransferEvent>;
export type CombatFXHandler = FXHandler<CombatEvent>;
export type ConquestFXHandler = FXHandler<ConquestEvent>;
```

#### B. FX Registry (pluggable handlers)

```typescript
// lib/fx/registry.ts
const transferHandlers: TransferFXHandler[] = [];
const combatHandlers: CombatFXHandler[] = [];
const conquestHandlers: ConquestFXHandler[] = [];

export const FXRegistry = {
  registerTransfer(handler: TransferFXHandler) {
    transferHandlers.push(handler);
    transferHandlers.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  },
  registerCombat(handler: CombatFXHandler) { /* same */ },
  registerConquest(handler: ConquestFXHandler) { /* same */ },
  // For "style packs" — replace entire handler sets
  setTransferHandlers(handlers: TransferFXHandler[]) { /* ... */ },
};
```

#### C. Composable Travel Pipeline (phases as units)

Instead of one giant `renderTravelingShips` with if/else for ORB vs LANE vs BEZIER, each ship's travel is a **pipeline of phases**:

```typescript
// lib/fx/phases/travelPhases.ts
export type TravelPhase = 'depart' | 'travel' | 'arrive';

export interface TravelPhaseBehavior {
  /** Compute ship position at progress 0..1 */
  interpolate(ship: VisualShipState, progress: number, ctx: PhaseContext): { x: number; y: number; scale: number; alpha: number };
  /** Duration in ms (or 0 = use default) */
  durationMs?: number;
}

// Registry: "lane" | "bezier" | "orb" are just different phase implementations
export const DEPART_BEHAVIORS: Record<string, TravelPhaseBehavior> = {
  lane: { interpolate: laneDepartInterpolate },
  bezier: { interpolate: bezierDepartInterpolate },
  orb: { interpolate: orbDepartInterpolate },  // fade + converge
};

export const TRAVEL_BEHAVIORS: Record<string, TravelPhaseBehavior> = {
  lane: { interpolate: laneTravelInterpolate },
  bezier: { interpolate: bezierTravelInterpolate },
  orb: { interpolate: orbTravelInterpolate },  // group into orb, no per-ship draw
};
```

Each ship stores `travelStyle: 'lane' | 'bezier' | 'orb'` (from config or event metadata). The render loop just does:

```typescript
const behavior = DEPART_BEHAVIORS[ship.travelStyle] ?? DEPART_BEHAVIORS.lane;
const { x, y, scale, alpha } = behavior.interpolate(ship, progress, ctx);
```

**Adding a new travel style** = implement `TravelPhaseBehavior` + add to registry. No changes to GameCanvas.

---

## 3. Refactoring Plan (Phased)

### Phase 1: Extract Handlers from processTickEvents (Low Risk)

**Goal:** Move transfer/combat/conquest logic into separate handler modules. `processTickEvents` becomes a thin loop.

| Step | Action |
|------|--------|
| 1.1 | Create `lib/fx/handlers/transferHandler.ts` — move L1265–1364 (transfer block) into `handleTransfer(event, ctx)` |
| 1.2 | Create `lib/fx/handlers/combatHandler.ts` — move L1256–1263 (combat → starsInCombat) |
| 1.3 | Create `lib/fx/handlers/conquestHandler.ts` — move L1367–1600 (scatter/retreat/attacker) |
| 1.4 | `processTickEvents` becomes: `events.transfers.forEach(e => transferHandler.handle(e, ctx));` etc. |

**Result:** GameCanvas shrinks by ~300 lines. Each handler is testable in isolation. Agent can edit one file per event type.

### Phase 2: Introduce FX Registry (Medium Risk)

**Goal:** Handlers are registered, not hardcoded. Enables multiple handlers per event (e.g., transfer + optional particle trail).

| Step | Action |
|------|--------|
| 2.1 | Create `FXRegistry` and `FXContext` types |
| 2.2 | Register default handlers (transfer, combat, conquest) at app init |
| 2.3 | `processTickEvents` iterates `FXRegistry.getHandlers(eventType)` and calls each |
| 2.4 | Add a no-op "particle trail" handler for transfers as proof-of-concept |

**Result:** Adding a new FX = `FXRegistry.registerTransfer(myHandler)`. No GameCanvas edits.

### Phase 3: Composable Travel Phases (Higher Risk, High Reward)

**Goal:** Replace inline ORB/LANE/BEZIER branches with phase behavior registry.

| Step | Action |
|------|--------|
| 3.1 | Define `TravelPhaseBehavior` interface and extract `laneDepartInterpolate`, `bezierDepartInterpolate`, `orbDepartInterpolate` from current `renderTravelingShips` |
| 3.2 | Store `travelStyle` on `VisualShipState` (from `GAME_CONFIG.TRAVEL_MODE` or event) |
| 3.3 | `renderTravelingShips` loops: `const behavior = BEHAVIORS[ship.travelStyle]; behavior.interpolate(...)` |
| 3.4 | Add new style (e.g., "arc" or "spiral") by implementing interface + registering |

**Result:** New travel animations = new behavior module. No GameCanvas edits.

### Phase 4: Style Packs (Future)

**Goal:** User-selectable presets that swap handler sets and phase behaviors.

```typescript
// Example: "Cinematic" style pack
StylePack.cinematic = {
  transferHandlers: [shipTravelPipeline, particleTrailHandler],
  travelPhases: { depart: 'bezier', travel: 'orb', arrive: 'easeOut' },
  conquestHandlers: [scatterHandler, attackerTransferHandler, starPulseHandler],
};
```

---

## 4. Specific Improvements for Ship Travel, Attack, Conquest

### 4.1 Ship Travel

| Current | Proposed |
|---------|----------|
| Inline logic in `processTickEvents` (L1265–1364) + `renderTravelingShips` (L1687–2100) | `TransferFXHandler` that: (1) selects ships, (2) sets `travelStyle` from config, (3) pushes to `travelingShips` with phase metadata. Render loop uses phase behavior registry. |
| ORB/LANE/BEZIER as if/else | `TravelPhaseBehavior` registry. Add "spiral", "arc", "teleport" by implementing one interface. |
| Config: 20+ keys (DEPART_FRACTION, WOBBLE_AMP, etc.) | Group into `TravelStyleConfig` objects. One config per style. |

### 4.2 Attack (Surge)

| Current | Proposed |
|---------|----------|
| Surge logic mixed with orbit logic in `renderShips` (L2200+) | `CombatFXHandler` that sets `starsInCombat`. Separate `SurgeBehavior` with `interpolate(star, progress)` — registry: `sine`, `pulse`, `ramp`. |
| ATTACK_SURGE_* config keys | `SurgeStyleConfig` with presets: "subtle", "dramatic", "minimal". |

### 4.3 Conquest

| Current | Proposed |
|---------|----------|
| Scatter/retreat/attacker in one block (L1367–1600) | Split: `ScatterConquestHandler`, `RetreatConquestHandler`, `AttackerTransferHandler`. Each registered. |
| Conquest strategies (immediate/surge/travel) already modular | Keep. Ensure they receive `travelStyle` from config so they use the same phase behaviors as transfers. |
| No star-level FX (pulse, border glow) | Add `ConquestStarFXHandler` — subscribes to conquest, applies star visual effects. Composable. |

---

## 5. File Structure (Proposed)

```
lib/
├── fx/
│   ├── types.ts              # FXHandler, FXContext, TravelPhaseBehavior
│   ├── registry.ts           # FXRegistry
│   ├── orchestrator.ts       # processTickEvents → dispatch to registry
│   ├── handlers/
│   │   ├── transferHandler.ts
│   │   ├── combatHandler.ts
│   │   ├── conquestHandler.ts
│   │   └── conquest/
│   │       ├── scatterHandler.ts
│   │       ├── retreatHandler.ts
│   │       └── attackerTransferHandler.ts  # wraps executeConquestTransfer
│   └── phases/
│       ├── travelPhases.ts   # DEPART_BEHAVIORS, TRAVEL_BEHAVIORS, ARRIVE_BEHAVIORS
│       ├── laneBehavior.ts
│       ├── bezierBehavior.ts
│       └── orbBehavior.ts
├── animations/
│   └── conquest/
│       └── strategies.ts     # (unchanged — already good)
└── components/game/
    └── GameCanvas.svelte     # Thin: calls orchestrator, renders from state
```

---

## 6. Agent-Friendly Benefits

| Before | After |
|-------|-------|
| "Add conquest star pulse" → edit GameCanvas, find conquest block, add logic | "Add conquest star pulse" → create `ConquestStarPulseHandler`, `FXRegistry.registerConquest(handler)` |
| "Add new travel style" → edit renderTravelingShips, add branch | "Add new travel style" → create `spiralBehavior.ts`, add to `TRAVEL_BEHAVIORS` |
| "Change scatter to look different" → edit conquest block, risk breaking retreat | "Change scatter" → edit `ScatterConquestHandler` only |
| Config: add key, wire to UI, wire to logic | Config: add to `TravelStyleConfig` or handler's options |

---

## 7. Summary

1. **Extract handlers** from `processTickEvents` into `lib/fx/handlers/` — immediate win, low risk.
2. **Introduce FX registry** — handlers are pluggable, multiple per event.
3. **Composable travel phases** — replace if/else with `TravelPhaseBehavior` registry.
4. **Style packs** — swap handler sets for user-selectable presets.

This refactor makes the system **data-driven and compositional**: new FX = new handler or phase behavior, registered. No procedural branching in GameCanvas.
