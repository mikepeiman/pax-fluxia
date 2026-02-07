# Pax Fluxia — Development History & Roadmap

**Last Updated:** 2026-02-07

This document serves as a running history of all work done on the game, sequenced chronologically. Use this as a rebuild roadmap.

---

## Phase 1 — Foundation (Commit: `a6cfa7b`)

**UI Shell + Ghost Engine**

- Created SvelteKit project with Svelte 5 Runes
- Built main menu → game transition
- Implemented headless `GameEngine.ts` (no visuals)
- Core game loop: production, combat, win detection
- Pure TypeScript, no framework dependencies
- Basic star and player types defined

## Phase 2 — Visualization (Commits: `3426490` → `0e6ca7a`)

**PixiJS Canvas + Animations**

- Integrated PixiJS 8 for WebGL rendering
- Star visualization with colored circles + emoji icons
- Ship animations: orbit (idle) and surge (attack)
- Drag-to-attack and click-click input modes
- AI opponent (greedy strategy, topology-validated)

## Phase 3 — Combat V2/V3 (Commits: `8482cbf` → `a2c317b`)

**Combat Mechanics Overhaul**

- Implemented symmetric attrition model (both sides take damage)
- Added ship states: Active (combat-ready) vs Damaged (repair pool)
- Lethality split: kills vs disables
- Conquest: overwhelm threshold, 50% ship transfer
- Scatter/retreat on conquest (35%/50% capture rates)
- Star types with 2× specialty bonuses (Yellow=Prod, Green=Atk, etc.)
- Repair system with combat penalty
- AI topology enforcement (ADR-009)

## Phase 4 — Visual Polish (Commits: `9256649` → `e079bea`)

**Fleet Rendering & UX**

- Concentric ring ship visualization (exact counts)
- Hex grid star positioning with Delaunay connections
- Tick orb metronome (visual heartbeat)
- Vector arrows for active orders
- Persistent star counters
- Star size slider (spacing control)
- Right-click cancel orders
- Expanded star hitboxes

## Phase 5 — Combat V4 + Audio (Commits: `3cbf53a` → `f414f10`)

**Symmetric Damage Model + Sound**

- 5-variable combat system (DAMAGE_PER_SHIP, LETHALITY, AGGRESSOR_ADVANTAGE, FORCE_RATIO_EFFECT, CONQUEST_THRESHOLD)
- Tweakpane control panel for real-time tuning
- Audio system (Tone.js): tick metronome, order chimes, combat sounds, conquest fanfare
- Passthrough (deferred) orders with dashed arrows
- Chain conquest fix (invalidate orders on ownership change)
- Combat log showing player owners (YOU, AI1, etc.)
- Star spacing slider saved to localStorage

## Phase 6 — Colyseus Multiplayer Migration (Commits: `dac66e8` → `97231f0`)

**Client-Server Architecture**

- Created monorepo: `common/`, `pax-fluxia/`, `pax-server/`
- Moved GameEngine to `common/` (shared between client and server)
- Moved combat logic to `common/combat.ts`
- Implemented Colyseus schemas with `schema()` function API (avoided decorator issues)
- Created `GameRoom.ts` on server
- Client connects via WebSocket, receives state sync
- Fixed star ownership using `sessionId` for player lookups
- Resolved schema decorator crashes with tsx/esbuild
- Visual hex grid overlay (debug)
- Physics-based ship orbit transitions

---

## Current State (2026-02-07)

### Working ✅
- Core gameplay loop (production, combat, repair, win detection)
- All input modes (click, drag, right-click cancel, passthrough)
- 6 star types with specialty bonuses
- AI opponent with configurable difficulty
- Combat V4 symmetric model with 7 tunable variables
- Tweakpane control panel
- Audio system
- Colyseus multiplayer (basic connection + sync)
- Combat logging with player identification

### Known Issues 🐛
- Star selection "sticking" after issuing order sequences
- Repair verification needed
- Multiplayer not deployed (local only)

---

## Planned Features (Roadmap)

### Near-Term (Priority)

| Feature | Status | Priority |
|---------|--------|----------|
| Ship transfer animations | 📋 Planned | 🔴 High |
| Conquer-scatter animations | 📋 Planned | 🔴 High |
| Retreat animations | 📋 Planned | 🔴 High |
| Logging levels (toggleable flags) | 📋 Planned | 🟡 Medium |
| Multiplayer deployment (alpha) | 📋 Planned | 🟡 Medium |
| Combat log: ships captured count | 📋 Planned | 🟢 Standard |
| Combat log: "You" filter | 📋 Planned | 🟢 Standard |
| Damaged ships defensive value in UI | 📋 Planned | 🟢 Standard |
| Star selection bug fix | 📋 Planned | 🟢 Standard |

### Medium-Term

| Feature | Status | Priority |
|---------|--------|----------|
| AI: Frontline Forces strategy | 📋 Planned | 🟢 Standard |
| AI: Match opposing forces | 📋 Planned | 🟢 Standard |
| AI: Evenly-distributed forces | 📋 Planned | 🟢 Standard |
| AI: Backline-and-pounce | 📋 Planned | 🟢 Standard |
| AI: Tactical surround/capture | 📋 Planned | 🟢 Standard |
| AI: Star type awareness | 📋 Planned | 🟢 Standard |
| Comprehensive AI tuning panel | 📋 Planned | 🟢 Standard |

### Long-Term

| Feature | Status | Priority |
|---------|--------|----------|
| Custom map editor | 📋 Planned | 🔵 Backlog |
| Neutral stars (optional) | 📋 Planned | 🔵 Backlog |
| Stalemate resolution | 📋 Planned | 🔵 Backlog |
| Mobile support | 📋 Planned | 🔵 Backlog |

---

## Architectural Decisions

See `.atlas/DECISIONS.md` for all 9 ADRs (Tauri, SvelteKit, PixiJS, Engine/View separation, 1:1 Combat, Defer Multiplayer, Defer Stalemate, No Neutral Stars, Strict AI Topology).
