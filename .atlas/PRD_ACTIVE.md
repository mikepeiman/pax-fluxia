# PRD V3.0: Pax Fluxia

**Version:** 3.1 (Implementation Complete - Alpha)
**Date:** 2026-01-31
**Protocol:** PRISM-Atlas DART-BEAM

---

## 1. Vision & Core Philosophy

**Pax Fluxia** is a tick-based realtime strategy game of galactic conquest, where players command fleets of ships flowing between stars to dominate the map.

### 1.1. Core Experience
*   **Flow of Force**: Players direct fleets from star to star. Ships visibly travel, attack, and conquer.
*   **Rhythmic Warfare**: All actions (production, combat, movement) resolve on a synchronized heartbeat — the Tick.
*   **Topological Strategy**: Stars are connected by lanes; only connected stars can interact. The map IS the terrain.
*   **Topological Fairness**: AI and Human players alike are strictly bound by the connection graph.

### 1.2. Implementation Note (Developer Reference)
> The engine processes ship transfers discretely on each tick. The visual layer interpolates smooth animations between tick states. This is an optimization detail—not a redefinition of gameplay.


---

## 2. Gameplay Mechanics

### 2.1. Time & Flow
*   **Tick Rate**: Discrete time steps (Default ~750ms). Configurable.
*   **Flow Pulse**: On every tick, Stars with active targets "pulse" force.

### 2.2. Combat Rules (The "Attrition" Engine)
When Star A (Source) attacks Star B (Target):

1.  **Pinning (The Siege State)**
    *   Both Star A and Star B are marked as **Engaged**.
    *   **Penalty**: Engaged stars suffer a **90% Repair Penalty** (Repair Rate drops from 0.20 to 0.02).
    *   *Effect*: Even a single attacking ship can "pin" a massive defensive fleet by negating its regeneration.

2.  **Remote Damage Exchange**
    *   **Force A** (Source) deals damage to **Star B**.
    *   **Force B** (Target) deals damage *back* to **Star A**.
    *   There is no "safe" attack. Attacking costs ships locally.
    *   **Formula**: `Damage = AttackingForce * DAMAGE_RATE`. (No clamps. Massive force = Massive damage).

3.  **Overwhelm (Instant Surrender)**
    *   If `DefenderShips < (AttackerShips * 0.10)`:
    *   **Result**: Immediate Surrender. No combat roll.

4.  **Conquest & Movement**
    *   **Victory Condition**: Star B Active Ships <= 0 (via Attrition or Overwhelm).
    *   **Movement**: Movement **ONLY** occurs on Victory.
    *   **Transfer**: 50% of the Winner's ships instantly teleport from Source to Target to occupy.
    *   **Truce**: Flow link automatically clears.

### 2.3. Economy
*   **Production**: Linear growth per tick (`+1` base).
*   **Repair**: Percentage-based healing of "Damaged" ships (`20%` per tick unpinned).

---

## 3. Visual Specification

### 3.1. The "Neon Void" Aesthetic
*   **Palette**: Deep Void Background (`#0a0a12`), Cyan Accents (`#00ffff`), Bright White Typography.
*   **Identity**: Stars display randomly generated Emoji Icons (e.g., 🌟, 🌋, 🪐) for immediate recognition.

### 3.2. Representation
*   **Ships**:
    *   *Active*: Solid colored dots packed in concentric rings.
    *   *Damaged*: Hollow rings (outlined) orbiting lazily.
*   **Connections**:
    *   *Topology*: Bold White Lines (Valid Paths).
    *   *Flow*: Animated Chevron overlays indicating active force projection.
*   **Telemetry**:
    *   Star Labels: Icon + Active Count (Bright) + Damaged Count (Dim).
    *   Combat Logs: Detailed breakdown of "Ships Damaged" vs "Ships Destroyed".

### 3.3. Star Type Functional Effects
Each star type has a 2x bonus in one specialty (all other stats @ 1.0):

| Type | Color | 2x Bonus | Gameplay Effect |
|------|-------|----------|-----------------|
| **Grey** | `#8899aa` | None | Baseline - no bonuses |
| **Yellow** | `#fbbf24` | Production | 2x ship generation rate |
| **Blue** | `#3b82f6` | Speed | 2x transfer/movement rate |
| **Purple** | `#a855f7` | Repair | 2x repair rate (0.4 vs 0.2 base) |
| **Red** | `#ef4444` | Defense | 2x defenseStrength |
| **Green** | `#22c55e` | Attack | 2x attack power |

*Note: `defensivePosture` is 1.0 for all types (reserved for future feature).*
*See `Star.ts:TYPE_STATS` for canonical values.*

---

## 4. Technical Architecture (Atlas Compliant)

### 4.1. Stack
*   **Frontend**: Svelte 5 (Runes)
*   **Renderer**: PixiJS 8 (WebGL)
*   **Backend**: Tauri 2.0 (Rust context)
*   **Package Manager**: Bun
*   **State**: `gameStore.svelte.ts` (Reactive Bridge)

### 4.2. File Registry Key
*   **Engine**: `src/lib/engine/GameEngine.ts` (The Clock)
*   **Rules**: `src/lib/engine/CombatRules.ts` (The Logic)
*   **Entities**: `src/lib/engine/Star.ts` (The State)
*   **View**: `src/lib/components/game/GameCanvas.svelte` (The Renderer)

---

## 5. User Stories

1.  **" The Pin"**: Player sends 1 ship to attack a fortress of 1000. The fortress takes negligible damage, but its Repair Rate is effectively paused, preventing it from recovering from a separate main assault.
2.  **" The Wipe"**: Player sends 100 ships against 5. The generic "Overwhelm" triggers, instantly flipping the star without a combat tick.
3.  **" The Grind"**: Two equal forces clash. Both stars whittle down. Logs show "Exchange" with high casualties on both sides (Source and Target).

---
*Reference this document as the absolute source of truth for all Game Mechanics.*
