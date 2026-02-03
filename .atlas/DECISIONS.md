# Architectural Decisions Log

**Project:** Pax Fluxia  
**Started:** 2026-01-29

---

## Decision Index

| ID | Date | Decision | Status |
|----|------|----------|--------|
| ADR-001 | 2026-01-29 | Use Tauri 2.x for Desktop Wrapper | ✅ Accepted |
| ADR-002 | 2026-01-29 | Use SvelteKit + Svelte 5 Runes | ✅ Accepted |
| ADR-003 | 2026-01-29 | Use PixiJS 8.x for Rendering | ✅ Accepted |
| ADR-004 | 2026-01-29 | Separate Engine from View | ✅ Accepted |
| ADR-005 | 2026-01-29 | 1:1 Combat Exchange Ratio | ✅ Accepted |
| ADR-006 | 2026-01-29 | Defer Multiplayer to Post-MVP | ✅ Accepted |
| ADR-007 | 2026-01-29 | Defer Stalemate Resolution | ✅ Accepted |
| ADR-008 | 2026-01-29 | No Neutral Stars in MVP | ✅ Accepted |
| ADR-009 | 2026-01-31 | Strict Topology Validation for AI | ✅ Accepted |

---

## [ADR-001] Use Tauri 2.x for Desktop Wrapper

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
The PRD specifies "Web Browser (Desktop)" as the platform. We need to decide between:
- Pure web (browser-only)
- Electron wrapper
- Tauri wrapper

### Decision
Use **Tauri 2.x** as the desktop wrapper.

### Rationale
- PRD Phase 1 explicitly calls for `bun create tauri-app`
- Tauri is significantly lighter than Electron (~10MB vs ~150MB)
- Rust backend allows future performance optimizations
- Hot reload works well with SvelteKit
- Cross-platform with minimal effort

### Consequences
- Requires Rust toolchain installed
- Bundle size is small and fast
- Can still run in browser during development

---

## [ADR-002] Use SvelteKit + Svelte 5 Runes

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
PRD specifies Svelte for UI. Need to decide version and paradigm.

### Decision
Use **Svelte 5** with **Runes** (`$state`, `$derived`, `$effect`).

### Rationale
- Svelte 5 is production-ready (stable release)
- Runes provide fine-grained reactivity perfect for tick-based updates
- `$state` eliminates need for separate store library
- Better TypeScript support than Svelte 4
- PRD references "Svelte Runes" explicitly

### Consequences
- Must use Svelte 5 syntax (not legacy stores)
- `.svelte.ts` files for reactive TypeScript modules
- Learning curve for devs familiar with Svelte 4

---

## [ADR-003] Use PixiJS 8.x for Rendering

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
Need WebGL-accelerated 2D rendering for ship animations. Options:
- Canvas 2D API
- PixiJS
- Three.js (overkill)
- Phaser (too opinionated)

### Decision
Use **PixiJS 8.x** with `@pixi/ui` for future UI overlays.

### Rationale
- PRD explicitly specifies PixiJS
- WebGL provides smooth 60fps animations
- PixiJS 8 has improved performance and smaller bundle
- Good hit detection (raycast) built-in
- Familiar API for game developers

### Consequences
- Must manage PixiJS lifecycle (create/destroy)
- Canvas sits in Svelte component
- Event coordination between Svelte and Pixi needed

---

## [ADR-004] Separate Engine from View

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
Game logic (tick loop, combat, flow) could live in:
- Svelte components directly
- A separate TypeScript module
- A Web Worker

### Decision
Create a **pure TypeScript GameEngine** with no framework dependencies.

### Rationale
- Testable without DOM
- Reusable for future multiplayer server
- Clear separation of concerns
- Easier to reason about state
- PRD Phase 2 calls for "Ghost Engine" before graphics

### Consequences
- Engine exposes snapshots via getState()
- Store bridges Engine ↔ View
- Engine knows nothing about Svelte or Pixi

---

## [ADR-005] 1:1 Combat Exchange Ratio

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
Original Pax Galaxia used simultaneous 1:1 attrition. Alternatives:
- Attacker advantage (2:1)
- Defender advantage (1:2)
- Random outcomes

### Decision
Keep **1:1 simultaneous exchange** for MVP.

### Rationale
- Faithful to original game
- Simple to implement and understand
- Creates attrition-based gameplay
- Encourages overwhelming force
- Balances attack vs defense

### Consequences
- Both sides always take equal losses
- Battles favor larger armies
- No randomness in combat

---

## [ADR-006] Defer Multiplayer to Post-MVP

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
PRD states "Multiplayer focus (2-8 players)" but also defines single-player AI gameplay.

### Decision
**MVP is single-player vs AI only.** Multiplayer deferred.

### Rationale
- Reduces scope for initial release
- AI provides immediate gameplay value
- Network code adds significant complexity
- Can validate core mechanics in single-player
- PRD Phase 3 mentions "Server: Authoritative Loop" as future work

### Consequences
- AI opponent required for MVP
- No WebSocket/Socket.io initially
- Architecture must support future multiplayer (Engine is authoritative)

---

## [ADR-007] Defer Stalemate Resolution

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
What happens if two players reach equilibrium and neither can win?

### Decision
**Stalemate resolution deferred to roadmap.** Games can technically run forever.

### Rationale
- PRD explicitly marks this as "Deferred to Roadmap"
- MVP focus is core gameplay loop
- Edge case unlikely with competent AI
- Can add timer/tiebreaker later

### Consequences
- No automatic draw detection
- Players must manually surrender
- Potential infinite games

---

## [ADR-008] No Neutral Stars in MVP

**Date:** 2026-01-29  
**Status:** ✅ Accepted

### Context
Should the map have unclaimed stars at game start?

### Decision
**All stars are owned at start.** No neutral stars in MVP.

### Rationale
- PRD Section 4.2: "Default mode has 0 Neutral stars"
- Simplifies initial map generation
- Guarantees immediate conflict
- Neutrals moved to Roadmap/Settings

### Consequences
- All stars have an owner at tick 0
- No "expansion" phase before combat
- Can add neutral star option later

---

---

## [ADR-009] Strict Topology Validation for AI

**Date:** 2026-01-31  
**Status:** ✅ Accepted

### Context
A discrepancy existed where the Human Player was constrained by the connection graph (Star A <-> Star B), but the AI could target any star it "saw" based on distance, bypassing the graph structure.

### Decision
**The GameEngine must act as the supreme referee for ALL orders, including AI.**
1. AI.ts must awareness of `connections`.
2. GameEngine.ts must validate `areConnected(source, target)` before executing any AI order.

### Rationale
- **Fair Play:** Human and AI must follow the exact same topological constraints.
- **Strategic Integrity:** The map topology is the terrain. Ignoring it breaks the strategic layer.
- **Security:** "Defense in Depth" - The engine should never trust the order generator (whether input or AI).

### Consequences
- AI calculation cost slightly increases (checking connection existence).
- "Illegal Attack" errors are now logged if AI fails logic.
- Ensures consistent "Remote Engagement" model.

---

## Deferred Items (Roadmap)

These items are explicitly **out of scope for MVP**:

| Item | Reason |
|------|--------|
| Multiplayer (WebSocket) | Requires server infrastructure |
| Neutral Stars | Settings option, not default |
| Stalemate Resolution | Edge case, timer needed |
| Random Cluster Maps | Map generator complexity |
| Map Editor | Separate feature |
| Audio/Video Settings | Polish phase |
| Mobile Support | Desktop-first |

---

*Update this file when: Making or revisiting architectural decisions.*
