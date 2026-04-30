# Decision: Animation Modularity via Strategy Pattern

**Date:** 2026-02-13
**Status:** Active

## Context
Repeated user instruction: when creating new animations, COLLECT rather than replace. Each animation style must be selectable. Future vision: players choose from visual style packs (R-34) that change the entire gameplay feel.

## Decision
- **Strategy Pattern**: Each animation behavior is a standalone function conforming to a shared interface
- All strategies are registered in a registry and selected via config string
- New animations = add a function + register it. No existing code touched.
- Config key selects the active strategy at runtime
- All tuning variables exposed in debug panel

## Architecture: ConquestTransferStrategy

```typescript
// Type: a function that takes conquest context and produces traveling ships
type ConquestTransferStrategy = (ctx: {
    ships: VisualShipState[];       // All ships at attacker star
    attackerStar: StarState;        // Attacker star
    conqueredStar: StarState;       // Conquered star
    transferCount: number;          // How many to transfer
    newOwner: string;               // New owner ID
    now: number;                    // performance.now()
    config: typeof GAME_CONFIG;     // Full config for tuning params
}) => {
    departing: VisualShipState[];   // Ships to push to travelingShips[]
    remaining: VisualShipState[];   // Ships staying at attacker
};

// Registry
const CONQUEST_STRATEGIES: Record<string, ConquestTransferStrategy> = {
    'immediate': conquestImmediate,   // Pop into orbit (legacy)
    'surge': conquestSurge,           // Settle from above (current)
    'travel': conquestTravel,         // Fly through lane (new)
    'optimal': conquestOptimal,       // Optimal transport matching (future)
};
```

## Enforcement
- `.agent/memory/collect-dont-rewrite.md` — never remove animation options
- `.agent/memory/expose-tuning-variables.md` — always expose params to UI

---

# Decision: Engine Convergence via Interface-Driven Refactor

**Date:** 2026-02-07
**Status:** Phase 1 Complete

## Context
Client and server engines diverged — client had rich game logic (overflow accumulation, star type multipliers, pinning penalty, conquest), server had minimal stubs. This caused MP combat regression, missing combat logs, and config mismatches.

## Decision
- **Option C targeting Option A**: Incrementally migrate client's rich logic into shared engine's stateless structure
- **Interface-driven**: `IStar` interface in `@pax/common`, both client class and server schema implement it
- **AGGRESSOR_ADVANTAGE**: Set to 0.7 (slight defender advantage)
- **STAR_TYPE_STATS**: Single source of truth in `@pax/common/config.ts`
- **Client Star.ts**: Public fields (Option A), implements `IStar`

## Phases
1. ✅ **Math Parity** — Production & Repair (completed)
2. ⬜ **Combat & Conquest** — Conquest/retreat/scatter logic
3. ⬜ **Cleanup** — Strip client engine, full delegation

## ADR References
- Follows ADR-010 (Ships Are Atomic Integers)
- Supersedes previous duplicated config approach

---

# Decision: Ship Transfer Animation — Unified Lifecycle

**Date:** 2026-02-08
**Updated:** 2026-02-10
**Status:** Implemented

## Context
Animation system had two completely disjoint systems: orbit rendering (per-star ship arrays with lerp physics) and fire-and-forget dots (separate animationStore events). Ships teleported out of orbit, separate dots flew the lane, different ships popped into orbit. Result: jerky, disjointed, ugly.

## Previous Issues (2026-02-10)
1. **Depart**: Per-frame lerp with tiny factor → ship barely moves, then SNAPS to lane start. "Ships peel off orbit and disappear."
2. **Travel**: Alpha fades in (first 20%) and out (last 20%). "Mere pulses along the lane" — ships flash instead of streaming.
3. **Arrive**: Ship goes directly to `orbiting` at `scale: 0.1`. "Ships poof out of star center."

## Decision
- **Unified lifecycle**: Each visual ship transitions through `orbiting → departing → traveling → arriving → orbiting`
- **Same entity**: The visual ship that departs orbit IS the ship that travels the lane IS the ship that arrives
- **Lane adherence**: Ships follow the connection line between stars with slight organic variation (±8px perpendicular offset per ship, fading at endpoints)
- **Magnetic easing**: Destination planet "pulls" ships toward it.
  - Depart: `easeInCubic` — reluctant departure (slow peel from orbit, then accelerate toward lane)
  - Travel: `easeInCubic` — starts slow, accelerates toward target (magnetic pull)
  - Arrive: per-frame orbit lerp — ship placed at lane end, lerp smoothly pulls into orbit slot (no bounce)
- **Always visible**: Ships have alpha=1 throughout travel. No fading. No pulses.
- **Crowd rush departure**: Ships leave nearly simultaneously with random jitter (0-80ms), not in clean sequence or unified waves. A crowd with a small degree of chaos.
- **Natural arrival**: No dedicated arriving phase. Ship transitions to orbiting at lane end position, and the orbit lerp continuously updates the target as the orbit rotates — creating a smooth spiral into orbit.
- **Orbit facing**: Ships cluster toward the target direction via `biasAngle`/`biasStrength` in `getOrbitSlot`. Angular compression (70% at strength 1.0) preserves spacing while biasing distribution. Idle stars (no target) remain uniform.
- **Tick-synchronized travel**: All ships arrive at half-tick regardless of distance. `totalAnimTime = effectiveTickMs / 2`, split into depart (30%) and travel (70%) phases. No distance-based timing.
- **Animation controls**: `ORBIT_BIAS_STRENGTH`, `DEPART_FRACTION`, `DEPART_JITTER_MS`, `LANE_OFFSET_PX` all tunable via CombatDebugPanel sliders.
- **Absolute interpolation**: Depart phase captures origin position and uses absolute `from + (to - from) * t`, not per-frame lerp
- **Imperative events**: Engine emits typed events (`reinforce`, `conquest`, `scatter`, `retreat`). Animation consumes events, NOT state diffs.
- **No attack travel**: Attacks are remote engagement. Ships stay at source. No travel animation for attacks.

---

# Decision: Orders Persist Until Cancelled

**Date:** 2026-02-08
**Status:** Active

## Context
A `clearTarget` guard auto-cancelled move orders when a star had 0 ships. This broke flow topology — the whole game is about chains of command. An empty star should continue forwarding ships when reinforcements arrive.

## Decision
- Orders persist until **explicitly cancelled** by the player
- Zero ships does NOT auto-cancel orders
- `clearTarget` guard removed from `processFlowLinks`

---

# Decision: Damaged Ships Are Never Destroyed in Combat

**Date:** 2026-02-08 (extracted from dev notes 2026-01-31)
**Status:** Active

## Context
User clarified: damaged ships are removed from combat after being damaged. They are NOT destroyed during combat ticks. They will either:
1. Repair over time (at the owning star)
2. Be captured upon conquest (in damaged state)
3. Be partially destroyed as attrition on loss (star conquered)

## Decision
- Combat damage transitions active → damaged & active → destroyed (moderated ratio via "Lethality" variable (which needs a better name)), but never damaged → destroyed*.
*Pax-Fluxia roadmap: ideas: perhaps there could be star types or ship types that favor attacking damaged ships.
- Damaged ships are out of combat; they contribute 1/7th defensive value (configurable via `DAMAGED_SHIP_EFFECTIVENESS`)


---

# Decision: No Mechanical Travel Between Stars

**Date:** 2026-02-08 (extracted from dev notes 2026-01-30)
**Status:** Active

## Context
Repeated misunderstandings about "ships traveling between stars". The user was emphatic: there is NO intermediate state between stars. All mechanics are computed on the tick. Visual travel animations are purely presentational.

## Decision
- Mechanically there is no "in transit" state. Everything happens on the tick.
- Visual animations (orbit→depart→travel→arrive) fill the inter-tick period for human comprehension.
- Attack is "remote engagement": ships surge toward target visually but remain at source star.
- Transfer/reinforce: ships visually travel the lane between ticks, but mechanically the ship count changes at source and destination simultaneously on the tick.

---

# Decision: Retreat Reduces Capture Rate

**Date:** 2026-02-08 (extracted from dev notes 2026-02-04)
**Status:** Active

## Context
Retreat order should meaningfully affect conquest outcomes vs. passive loss.

## Decision
- **Active retreat ordered**: `captureRate = 0.35` — defender preserves more ships by fleeing
- **Passive loss (no retreat)**: `captureRate = 0.70` — more ships captured by victor
- **No escape routes**: Capture is total regardless of orders
- Active retreat = player has escape route AND has ordered retreat on that star

---

# Decision: Star Types Multiply Global Config Variables

**Date:** 2026-02-08
**Status:** Active

## Context
All gameplay variables (transfer rate, production, defense, attack, repair) should be tunable via global config sliders. Star types provide bonuses as multipliers on global base values.

## Decision
- **Global slider** = base value (e.g., `TRANSFER_RATE = 0.1`)
- **Star type** = multiplier from `STAR_TYPE_STATS[type].{speed|prod|defense|attack|repair}`
- **Effective value** = `globalBase × starTypeMultiplier`
- Example: Blue star transfer rate = `0.1 × 2 = 0.2` (Blue has `speed = 2`)
- Same principle for all star types: Yellow 2× production, Red 2× defense, Green 2× attack, Purple 2× repair
- Future (Pax Fluxia roadmap): additional multipliers from star upgrades possible

---

# Decision: Unified Game Settings — SP and MP

**Date:** 2026-02-09
**Status:** Active

## Context
SP MainMenu had full game settings (stars/player, ships/star, spacing, links). MP lobby only sent `playerCount`/`mapType`. Server `initStandardMap()` used hardcoded values (`starsPerPlayer = 5`, `minSpacing = 120`). Two completely separate map generators — a DRY violation.

## Decision
- MP lobby now has the **same settings UI** as SP MainMenu
- Both read/write to the **same localStorage keys** (`pax-fluxia-starsPerPlayer`, etc.)
- MP lobby passes settings as `RoomOptions` to the server
- Server `initStandardMap()` reads from `roomOptions` with sensible defaults

## Future Work
- Full engine unification: server should use the shared `GameEngine.initializeMap()` (hex grid with Delaunay connections) instead of custom `initStandardMap()` (random positions with nearest-neighbor connections)

---

# Decision: ONE GAME — No SP/MP Divergence

**Date:** 2026-02-10
**Status:** Active (CRITICAL)

## Context
Repeated refactors to fix SP/MP parity have failed to prevent regression because the architecture permits divergence: separate MainMenu vs MultiplayerLobby, separate `gameStore` vs `multiplayerStore`, separate `GameEngine.initializeMap()` vs `GameRoom.initStandardMap()`. Every new feature risks being wired to only one path.

## Decision
- **This is ONE game.** A singleplayer game with AI is mechanically identical to a multiplayer lobby where all other players happen to be AI.
- **One UI flow**: The MainMenu/lobby distinction must converge. Settings live in one place. There are not two "start game" paths.
- **One settings pipeline**: All game config variables must be applied uniformly. If a slider exists, it must work in both SP and MP.
- **One engine**: Server-side map generation must use the same shared engine logic as client-side.
- **No exceptions**: Any PR/change that adds a feature to SP-only or MP-only without justification is a regression.

## Enforcement
- Before creating any new UI component, check: does the equivalent already exist for the other mode?
- Before adding any game config variable, verify: is it wired to both paths?
- `activeGameStore` facade must remain the single API for all game interactions.

---

# Decision: Remove Tone.js — Use Web Audio API Directly (or No Audio)

**Date:** 2026-02-10
**Status:** Approved

## Context
Tone.js was added for combat/conquest/tick sounds. Despite aggressive throttling (200ms cooldown, 4 max/sec combat sounds, capped polyphony at 6), the library continued causing noticeable performance lag. The overhead isn't justified for simple synth beeps.

## Decision
- **Remove Tone.js entirely** — uninstall the package and delete `AudioManager.ts`
- **Stub all call sites** so audio calls become no-ops
- **Future audio**: If needed later, use raw Web Audio API with minimal oscillators, or pre-rendered audio sprites

---

# Decision: Conquest Damaged Ship Handling

**Date:** 2026-02-10
**Status:** Planned

## Context
At conquest time, `conquest.ts:160` sets `defender.damagedShips = 0` — all damaged ships vanish. User observed 50 damaged → 0 on capture. Currently no configurability for what happens to damaged ships.

## Decision
- Add configurable percentage for damaged ships at capture: what % are repaired instantly, destroyed, or captured as-damaged
- **Default**: all damaged ships are captured (as damaged) by the conquering player — no instant repair, no destruction
- Expose as sliders in Control Panel for playtesting
- Future: separate "retreat damaged" vs "retreat active" percentages

---

# Decision: Star Type Distribution

**Date:** 2026-02-10
**Status:** Planned

## Context
Current random map generation skews star types: grey 30%, yellow 20%, red 15%, green 15%, purple 10%, blue 5%, grey fallback 5%. Specialized types like blue (movement) are too rare.

## Decision
- **Even distribution** for random maps: ~16.7% each (6 types)
- Switched from `Math.random()` to round-robin for guaranteed ±1 balance
- Future: tunable distribution sliders. Most gameplay will use human-designed maps.

---

# Decision: Star Types Affect Combat

**Date:** 2026-02-10
**Status:** Active

## Context
Star types have defined `attack` and `defense` multipliers in `STAR_TYPE_STATS` (Green=2× attack, Red=2× defense) but these were never applied in the combat calculation. Combat used raw ship counts only.

## Decision
- Apply star type `attack` multiplier to effective attacking force before passing to combat function
- Apply star type `defense` multiplier to effective defending force (including damaged ship contribution)
- For multi-star attacks, use weighted average of attackers' attack multipliers proportional to each star's ship contribution
- Display absolute/derived/relative forces in the Stars Panel

> [!WARNING]
> This logic is currently duplicated in both `common/src/engine/GameEngine.ts` and `pax-fluxia/src/lib/engine/GameEngine.ts`. The core refactor to unify to a single engine is pending — this duplication is tech debt, not target architecture.

---

# Decision: Engine Unification Priority

**Date:** 2026-02-11
**Status:** Pending

## Context
Client and server engines remain split. User confirms engine unification is imminent ("It'll be time to unify the engine shortly"). Animation polish also noted as ongoing priority.

## Next Steps
- Phase 2 of Engine Convergence: Combat & Conquest logic into shared engine
- Phase 3: Strip client duplicate, full delegation to shared
- Animation system: user reports current feel is "not quite right" — further iteration needed

---

# Decision: ParticleContainer Ship Rendering

**Date:** 2026-02-11
**Status:** Approved — Implementation Pending

## Context
At 10k ships, `Graphics.circle().fill()` per ship per frame drops to <10 FPS. This is CPU-bound: PixiJS tessellates each circle into triangles every frame. The GPU is idle while JavaScript does geometry work.

## Options Evaluated

| Approach | Expected @ 10k | Effort | Risk |
|----------|----------------|--------|------|
| Sprite Pool (tried, reverted) | ~120 FPS | 2-3h | Low |
| **ParticleContainer** ⭐ | ~200 FPS | 3-4h | Low |
| Custom WebGL Instanced | ~500 FPS | 8-12h | Med |
| Graphics Batching | ~40-60 FPS | 1-2h | Low |
| Raw Canvas 2D | ~60-80 FPS | 4-6h | Med |
| WASM Position Math | Depends | 12-20h | High |
| Three.js InstancedMesh | ~300 FPS | 16-24h | High |

## Decision
- **ParticleContainer** with pre-rendered 128px circle texture
- Texture uses radial gradient edge for anti-aliasing
- `scaleMode = 'linear'` for smooth downscaling
- `roundPixels = true` for pixel-snapped positioning
- Multiplier borders: second particle layer behind main ships
- Damaged indicators: third particle layer
- If ParticleContainer insufficient at 50k+: escalate to custom WebGL instanced rendering

## Trade-offs
- Circles are rasterized rather than mathematically perfect (indistinguishable at game scale)
- No per-sprite rotation or complex blend modes (not needed for circles)
- Multiplier borders require additional sprites (acceptable overhead)

---

# Decision: Conquest Transfer Ships — Separate From Normal inFlightToStar

**Date:** 2026-02-12
**Status:** Active

## Context
Conquest ships spawned at the conquered star were being immediately truncated by `renderShips` because `inFlightToStar` counted the cosmetic transfer animation ships. `actualCount = max(0, schemaShips - inFlightToStar) = 0`, so renderShips deleted the spawned ships.

## Decision
- Tag conquest transfer traveling ships with `_conquestInFlight = true`
- The `inFlightToStar` counter in `renderShips` EXCLUDES these conquest transfer ships
- Immediate-spawn ships at the conquered star are the real occupation
- Conquest transfer ships are purely cosmetic and merge/despawn when they arrive

---

# Decision: CONQUEST_TRAVEL_SPEED — Intuitive Direction (>1 = faster)

**Date:** 2026-02-12
**Status:** Active

## Context
`CONQUEST_TRAVEL_SPEED = 0.7` was meant to make conquest travel 30% faster, but the value was used as a duration multiplier. A value of 0.7 meaning "faster" is counter-intuitive. Users expect 1.3 = 30% faster.

## Decision
- Invert semantics: `CONQUEST_TRAVEL_SPEED` is now a speed multiplier, not a duration multiplier
- `>1 = faster`, `<1 = slower`, `1 = normal`
- Code applies as `duration / speed` instead of `duration * speed`
- Default: 1.3 (was 0.7)

---

# Decision: Transfer Rate — Duplication Warning

**Date:** 2026-02-12
**Status:** Open (needs resolution)

## Context
Three separate `TRANSFER_RATE` values exist:
1. `EngineConfig.TRANSFER_RATE = 0.1` (in `common/src/config.ts`) — used by `GameEngine.ts`
2. `ORDER_CONFIG.TRANSFER_RATE = 0.25` (in `common/src/orders.ts`) — used by `executeTransfer()`
3. Per-star-type `transferRate` (in `STAR_TYPE_STATS`) — multiplier on base rate

> [!WARNING]
> This is a real duplication bug risk. The Battle panel slider controls `EngineConfig.TRANSFER_RATE` but `orders.ts` uses its own hardcoded 0.25. Need to unify to a single source.

## Next Steps
- Determine which is authoritative (likely `EngineConfig.TRANSFER_RATE`)
- Remove `ORDER_CONFIG.TRANSFER_RATE` and wire `orders.ts` to use the engine config
- Or clarify if they serve genuinely different purposes

---

# Decision: Variable Descriptions — Plain English Required

**Date:** 2026-02-12
**Status:** Active

## Context
User feedback: variable descriptions were too technical or meaningless ("Overall combat lethality multiplier" tells the user nothing).

## Decision
- All UI variable descriptions must describe **what the user will see change**, not the internal mechanics
- Lethality → "Percentage of damaged ships destroyed per attack tick"
- Conquest Transfer % → "Percentage of victor's ships that immediately transfer to conquered star"
- All variables must have tooltips/subtitles in the UI panel

---

# Decision: Engine Unification — Atlas-First Approach

**Date:** 2026-02-12
**Status:** Planning

## Context
Full architecture audit revealed significant logic duplication across three packages:
- **Client** `GameEngine.ts` (1594 lines) reimplements combat, transfer, win check, tick orchestration
- **Common** `GameEngine.ts` (480 lines, stateless) is the authority, used only by server
- **Server** `GameRoom.ts` (700 lines) correctly delegates to Common but has its own map gen and AI

Key conflicts: `calculateCombatV4` (client) vs `calculateCombat` (common), three `TRANSFER_RATE` sources, two map generators, two AI systems.

## Decision
- **Atlas-first method**: Document current state, document target state, use delta as work guide
- **Client delegates to Common** (same pattern as server): `GameEngine.tick(state, config)`
- **IStar interface** enables both `Star.ts` (client) and `StarSchema` (server) to work with Common
- **6-phase migration**: Combat formula → Transfer rate → Combat delegation → Full tick delegation → Map gen → Config sync
- **Client keeps**: tick loop/timing, AI evaluation, combat logging, history, animation hooks

## Reference Docs
- `ENGINE_ARCHITECTURE_CURRENT.md` — current duplication inventory
- `ENGINE_ARCHITECTURE_TARGET.md` — desired unified state

---

# Decision: Node Runtime for Production Server (Not Bun)

**Date:** 2026-02-14
**Status:** Active

## Context
Colyseus WebSocket connections fail with "seat reservation expired" (close code 4002) when the server runs under Bun's runtime. The `@colyseus/ws-transport` depends on the `ws` library (Node.js WebSocket implementation). Bun's runtime replaces Node's `http` module internals with its own implementation, which is incompatible with how `ws` handles the HTTP `upgrade` event for WebSocket connections. This was discovered locally first — `bun --watch src/index.ts` failed, but `npx tsx --watch src/index.ts` (Node runtime) worked.

## Decision
- **Build stage**: Use `oven/bun:1` (fast install + Vite build)
- **Production stage**: Use `node:20-slim` with `tsx` for TypeScript execution
- **CMD**: `tsx pax-server/src/prod.ts` (NOT `bun run`)
- **NEVER** use Bun's runtime for the Colyseus server until Bun resolves `ws` library compatibility

---

# Decision: Colyseus Module Resolution — No Explicit WebSocketTransport Import

**Date:** 2026-02-14
**Status:** Active (CRITICAL)

## Context
Explicit `import { WebSocketTransport } from "@colyseus/ws-transport"` in `prod.ts` caused bun's content-addressable node_modules to load **two separate `@colyseus/core` instances** — each with its own `matchMaker` singleton and `rooms` map. Rooms were created in one map but looked up from the other, causing "seat reservation expired" (4002).

## Decision
- **NEVER** explicitly import `@colyseus/ws-transport` in server entry points
- Let `Server.getDefaultTransport()` handle transport creation via `dynamicImport`
- This ensures a single shared `@colyseus/core` module instance


---

# Decision: Settings Panel — "Economy" Is "Global Settings" + Mirrored Duplicates OK

**Date:** 2026-03-01
**Status:** Active

## Context
Agent proposed removing duplicate Attack/Defense sliders from Economy section since they control the same variables as Battle section (`AGGRESSOR_ADVANTAGE`, `DAMAGE_PER_SHIP`). User corrected this.

## Decision
1. **"Economy" is the wrong label** → rename to **"Global Settings"**
2. **Attack/Defense sliders belong in Global** — they are global modifiers, not economy-specific
3. **Variables MAY be duplicated across panels** under two conditions:
   - Labels must be **exactly the same** in both panels
   - Values must be **bound together as mirrors** — changing one updates the other in real-time
4. Current problem: labels differ ("Defense" ≠ "Aggressor Advantage") and values are not bound

## Action Items
- Rename "Economy" section → "Global Settings"
- Harmonize labels across Global and Battle panels
- Implement two-way binding for shared variables
- Add `REPAIR_SUPPRESS_ATTACKER` / `REPAIR_SUPPRESS_DEFENDER` sliders to Global

---

# D-78: Conquest Animation — Localized Frontier Updates

**Date:** 2026-03-18
**Status:** Specification

## Specification

On conquest, only update territory and frontiers **around the conquered star and its neighbors**. All other geometry remains static.

1. **Anchor points**: Where the affected frontier meets unaffected geometry — the geometry beyond these points does not move
2. **Dense control vertices**: Between anchor points, create densely-sampled vertices along the frontier
3. **Sequential lerp**: Lerp vertices in order to their new positions over the transition duration
4. **Per-frame Chaikin**: Apply Chaikin smoothing pass(es) every frame so the morphing segment remains smooth throughout
5. **Performance note**: Chaikin is O(n) per pass. With ~128 vertices and 2-3 passes at 60fps, this is ~23k array ops/sec per segment — trivial

## Why

Current approach recomputes ALL frontiers globally and morphs everything. Borders far from the conquest ripple unnecessarily. Localized updates produce a surgical visual: only the affected region reshapes.

---

# D-79: Territory Fill Morph — Shape, Not Crossfade

**Date:** 2026-03-18
**Status:** Specification

## The Bug

During conquest transitions, fills do alpha-crossfade:
- Old territory shape fades out at `alpha × (1-t)`
- New territory shape fades in at `alpha × t`

This produces a ghostly dissolve, not a reshaping territory.

## The Specification

Fills must draw the **morphed polygon shape at full alpha** every frame. The fill region IS the area enclosed by the morphed border polylines. Every frame of the transition:

1. Compute the morphed border shape (already done for border rendering)
2. Fill the enclosed polygon at the target alpha
3. No crossfade. No ghost. Solid fill that reshapes.

---

# D-80: Unified Frontier Pipeline — Point-Line Canonical Data

**Date:** 2026-03-18
**Status:** In Progress

## Architecture

Canonical frontier data = **array of arrays of x,y coordinate points with ownership**. One data source for both fill and border rendering.

Pipeline:
1. d3-weighted-voronoi → raw cells
2. Merge same-owner cells → closed polygons (`MergedTerritory`)
3. Chaikin smoothing (junction + boundary pinning) — unchanged
4. **Dense resampling** at `FRONTIER_RESOLUTION` px spacing (`resampleClosedPolygonBySpacing`)
5. **Fill + stroke** from same densely-sampled points (`FrontierLoopMorpher`)

Morph alignment:
- Multi-region matching (arrays per owner + nearest centroid)
- Polygon rotation alignment (`alignClosedPolygon`) — minimizes total vertex displacement

## Key Decision

The old approach used TWO separate geometry pipelines:
- **Fills** from `MergedTerritory` polygons (closed-polygon Chaikin)
- **Borders** from `SharedPolyline` segments (open-polyline Chaikin)

These produced different vertex sets and were the root cause of fill-border divergence. The unified pipeline eliminates this by design.

## Next Step

**Split this point-line frontier work into a new data mode.** Restore FG2 as it was. The unified frontier morpher is a separate rendering mode, not a replacement for the existing FG2 pipeline.

---

# Decision: 4-Layer Territory Architecture

**Date:** 2026-03-19
**Status:** Active
**Ref:** D-80

## Context
The PRD defined a 6-layer model (Truth → Frontier → Fitting → Region → Presentation → Transition). Code review revealed that layers 2-4 are sub-steps of one concern ("turn ownership into shapes"), while the live code in `renderMode.ts` already has a cleaner 3-concern contract.

## Decision
Adopt 4-layer model:
1. **Ownership** — "Who owns what" (`territory/ownership/`, `GraphOwnershipState`)
2. **Geometry** — "What shapes exist" (`territory/geometry/`)
3. **Transition** — "How shapes change between ticks" (`territory/transitions/`, as FX handlers)
4. **Presentation** — "How shapes become pixels" (`territory/render/`)

## Rationale
- Layers 2-4 of PRD are implementation details of one geometry generator
- Transition and Presentation are orthogonal to Geometry mode
- FX handler pattern already exists and works for transitions

---

# Decision: Territory Engine → TerritoryOrchestrator

**Date:** 2026-03-19
**Status:** Active
**Ref:** D-81

## Decision
Rename `territory-engine/` to `territory/orchestrator/` and rename `engine.ts` concepts to "orchestrator" — this better describes its role as a route-and-dispatch coordinator, not a compute engine.

# Decision: Non-Destructive Dual-Adapter Refactoring

**Date:** 2026-03-19
**Status:** Active
**Ref:** D-82

## Decision
Refactoring the territory renderer uses a **dual-adapter approach**: a new `refactored_pvv2` adapter runs alongside the untouched `legacy_pvv2`. New registry entries (`FG1 Mar19 Refactor`, `DY4 Mar19 Refactor`) appear in the Mode dropdown, letting the user switch between working original and refactored code at runtime. Original `legacy_pvv2` path is **never modified** — zero risk to DY4 SACROSANCT animation.

## Rationale
- PVV2 has ~25 module-level state variables tightly coupled to its render function
- Modifying in-place risks breaking the SACROSANCT DY4 border animation
- Dual-adapter gives instant rollback via UI dropdown without git operations
- Enables incremental migration of state into class fields

---

# Decision: Metaball-Grid 3-Phase Perf Plan

**Date:** 2026-04-18
**Status:** Planned (awaiting user go-ahead per phase)
**Ref:** D-MG-PERF-2026-04-18
**Plan:** `.agent/docs/plans/2026-04-18/METABALL_GRID_PERF_PLAN_2026-04-18.md`

## Context
metaball-grid mode (shipped MG5..MG-BORDER v2 over 2026-04-17..18) lags at dense spacings. User captured DevTools traces at 16 px (8 160 cells) and 4 px (129 600 cells). Web research + local audit completed.

## Key Trace Finding
At 4 px the dominant cost is the **per-transition Power-Voronoi PREV-geometry rebuild** inside `MetaballGridFamily.buildPlanForTransition` (45.8 % of trace time) — not per-frame paint. This was flagged as a known simplification in the family file header. Phase C promotes that checkpoint to blocking.

## Decision
Three-phase execution, user-directed:

- **Phase A (3-4 h):** tuning surface (distribution modes, jitter, cell-count cap, render-backend toggle) + steady-state dirty-flag gate + live cell-count / frame-ms readouts.
- **Phase B (1-2 d):** two-layer caching — static RenderTexture for natives + dirty-rect blit on ownership change + dynamic overlay for dispossessed cells during transitions. Target: 100 k+ cells @ 60 fps on iGPU.
- **Phase C (~1 d):** lift PREV-geometry capture upstream into `GameCanvas` so transitions stop triggering Power-Voronoi rebuild. Addresses the dense-spacing cliff directly.
- **Phase D (stretch, 1-5 d):** pick one — splat-and-threshold metaballs (real soft blobs, ≤50 k splats) OR JFA territory field (resolution-bound, decouples from N).

## Rationale
- Phase A is net-new tuning surface + free steady-state win; low risk.
- Phase C is the biggest direct fix for the 4 px trace; modest scope.
- Phase B is the correct long-term architecture but touches more code.
- Phase D deferred until A+B+C land and visual direction is confirmed.

## Risks Logged
- ParticleContainer backend restricts cell shape to tinted-quad (square/circle); hex/diamond stay on Graphics.
- Static RenderTexture GPU memory = `worldWidth × worldHeight × 4 bytes`; ½-res fallback may be needed for world > 4000 px.
- Upstream truth-capture change (Phase C) crosses the family boundary; coordinate with perimeter_field revised-plan work on alt-worktree.

---

# Decision: CX / CP / DX / MSR — Canonical Acronym Record

**Date:** 2026-04-19
**Status:** Active — corrects prior record in D-MG-PERF-2026-04-18 and in `CHAT_2026-04-18.md`
**Ref:** D-TERR-ACRONYMS-2026-04-19
**Supersedes:** Any prior definitions in this file or session logs for CX / CP / DX / MSR.

## Context
Yesterday's docs + chat summary used incorrect expansions for CX and MSR: CX was called "Corridor Exclusion" and MSR was called "Separation Radius" with an intentional moat. User corrected the record today. Per AGENT.md §3.6 (lossless chat rule), yesterday's `CHAT_2026-04-18.md` is left verbatim; this entry is the canonical correction.

## Decision
The canonical expansions and semantics for the four territory-geometry constraints are:

### CX — Corridor Extension
- **Expansion:** *distributed corridor virtual stars along lanes.*
- **Purpose:** Ensure same-owner lanes remain fully within that owner's territory. On contested lanes, ensure the two contesting owners' fronts meet along the lane's midline (arc-length midpoint, not necessarily geometric center) and that no third player impinges on the corridor.
- **Stage:** pre-metaball, in the geometry source pipeline. Mutates the site set fed to `power_voronoi_0319` / `computeGeometry0319`.
- **Knobs:** `MODIFIED_VORONOI_CORRIDOR_ENABLED`, `MODIFIED_VORONOI_CORRIDOR_SPACING`, `TERRITORY_CX_COUNT` (explicit count overrides spacing when > 0), `TERRITORY_CX_WEIGHT`.
- **Implementation:** `src/lib/territory/corridor/buildCorridorVirtualSites.ts` L1-288.

### CP — Contested-lane midpoint Pair
- **Expansion:** *paired virtual stars on either side of the midpoint of an enemy-owned (contested) lane.*
- **Purpose:** CX's contested-case mechanism. The paired Vs pull the two contesting owners' regions forward toward the midline and block any third party from touching the lane.
- **Stage:** pre-metaball, same pipeline as CX.
- **Knobs:** `TERRITORY_CX_CONTEST_MIDPOINT_VSTARS` (on/off), `TERRITORY_CX_CONTEST_PAIR_COUNT`, `TERRITORY_CX_CONTEST_PAIR_WEIGHT`.
- **Implementation:** `src/lib/territory/corridor/buildCorridorVirtualSites.ts` L183-242.
- **Known bugs flagged externally (to audit/fix later):** one metaball-family wiring gap; short lanes can suppress pair emission entirely.

### DX — Disconnect eXclusion
- **Expansion:** *conditional enemy virtual stars between disconnected same-owner components.*
- **Purpose:** Prevents territory rendering from visually suggesting star-star connections that don't exist as lanes.
- **Stage:** pre-metaball, same pipeline. Conditional by design — on many maps legitimately produces nothing (no owner has ≥ 2 disconnected components).
- **Knobs:** `MODIFIED_VORONOI_DISCONNECT_ENABLED`, `MODIFIED_VORONOI_DISCONNECT_DISTANCE`, `TERRITORY_DX_WEIGHT`.
- **Implementation:** `src/lib/territory/disconnect/buildDisconnectVirtualSites.ts` L1-229+.

### MSR — Minimum Star Range
- **Expansion:** *margin around a star within which lanes that do not originate at that star should not pass.*
- **Current implementation:** power-diagram site-weight term (`MODIFIED_VORONOI_STAR_MARGIN`, internally squared) in `powerVoronoiTerritoryGeometryGenerator.ts` L110-125. Not a hard "push geometry inward" stage — a weighting nudge. Can feel weak or ambiguous rather than presenting as a clean visible moat.
- **Semantics vs. implementation gap:** the *correct* semantic is a constraint on lane routing: lanes whose endpoints are neither endpoint of a given star must stay outside that star's MSR. A lane-level enforcement filter in `src/lib/lanes/**` is currently **missing**. The power-diagram weighting is the only MSR effect today.
- **Moat clarification:** the visible "moat" around stars at high MSR values is a side effect of the weighting scheme (uncovered regions in the power-diagram), not a requested feature. The fallback in `buildGridClassification.ts` L63-88 (`resolveOwnerByNearestStar` + `coverageRadiusPxSq`) exists to mask it by attributing uncovered cells to the nearest owned star.

## How these reach metaball-grid (and other families)

All four are upstream-geometry concerns. They mutate the site set that `computeGeometry0319` feeds to the power-Voronoi solver, so by the time a render family reads `territoryRegions` off the `CanonicalGeometrySnapshot`, CX/CP/DX/MSR are already baked into the polygons.

- **Consume pre-shaped polygons → get CX/CP/DX/MSR for free:** metaball-grid, perimeter-field, any future polygon-consuming family.
- **Re-sample-and-shape:** legacy `MetaballRenderer.ts` uses `buildCorridorSamples` / `buildDisconnectSamples` in sample space; this is a parallel shaping path that does not affect metaball-grid.

## Actions triggered by this entry

1. `TerritoryGeometrySourceTuning` widget added to the metaball-grid settings card so the four knobs are accessible without switching sections. *(This session.)*
2. MSR tooltip/description corrected in `TerritoryGeometrySourceTuning.svelte`. *(This session.)*
3. **New queued task — MG-MSR-LANE-FILTER:** implement the missing lane-level MSR filter as a separate pass in lane generation, independent of the Voronoi site weight. Queued in today's daily queue; not scheduled yet.
4. **New queued task — MG-CP-SHORT-LANE-AUDIT:** verify CP emission on short lanes + the metaball-family wiring gap. Queued; not scheduled yet.

## Risks Logged

- MSR-as-weight and the new MSR-as-lane-filter may produce *different* visuals at the same numeric setting. Needs either (a) separation into two config keys or (b) a clear policy that the lane filter is the user-facing MSR and the weight is a downstream derivation.
- Enabling CX/DX by default is a visual change; do not flip defaults without explicit user sign-off.

---

# Decision: Metaball-Grid Replacement Should Use A Local Conquest Phase Field, Not Metaballs

**Date:** 2026-04-30
**Status:** Prototype Implemented / Needs Visual QA
**Ref:** D-MG-REPLACEMENT-2026-04-30

## Context

The current `metaball-grid` mode already has valuable deterministic transition structure:

- `PREV/NEXT` ownership classification
- conquest-local phase or wave planning
- family-local transition lifecycle integration

What it does not need to keep is the metaball presentation primitive itself. The user explicitly asked for a replacement that removes metaballs while preserving deterministic changed-region detection, smooth conquest motion, strong frontier emphasis, fills that follow borders, and low-end WebGL suitability.

## Decision

- Treat the grid as a **transition scheduling substrate**, not as a render primitive.
- Replace metaball presentation with a **local conquest phase field** carrying:
  - `prevOwner`
  - `postOwner`
  - `changed`
  - `phase in [0,1]`
- Prototype path:
  - conquest-local `PRE/POST` RenderTexture composite
  - conquest-local phase texture
  - frontier band derived from `phase == progress`
- Likely production path:
  - same local phase substrate
  - owner-index or palette-texture based presentation family
  - optional geometry-driven VFX overlays only as polish

## Rationale

- This preserves the useful part of `metaball_grid` while deleting the wrong performance target.
- A field-based scheduling model is more stable and debuggable than direct `PRE` border to `POST` border vertex correspondence.
- Local textures plus simple fragment math fit PixiJS 8, browser WebGL, and integrated GPUs better than another blob-field renderer.

## Artifact

- Detailed implementation spec: `.agent/docs/plans/2026-04-30/METABALL_GRID_REPLACEMENT_ARCHITECTURE_SPEC_2026-04-30.md`

## Implementation Note

- The first landed runtime pass is additive, not a rewrite: new mode id `metaball_grid_phase_field`, new family file `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`.
- It reuses the existing grid classification, conquest wave planning, and shared `METABALL_GRID_*` tunables instead of inventing a second config surface.
- Runtime integration is through the existing `RenderFamily` contract and `GameCanvas.svelte` dispatch path, plus explicit settings/diagnostics exposure so the mode is testable without hidden flags.

## Implementation Addendum - 2026-04-30 Follow-Up

- The stable PRE cache for phase-family modes must track the actually presented truth during active conquests. Freezing it on active transition replays stale conquest history when a second capture starts before the first finishes.
- If a visual choice is exposed in UI, mode defaults must not silently override it at runtime. `Propagation Shape` only became a valid tuning surface after removing the hidden phase-field wave-geometry override.
- Completion quality is a first-class part of the conquest moment. The mode now owns dedicated finish-tail controls for PRE fade timing, cell-size collapse timing, final cell size, and frontier fade timing rather than ending on a hard grid-pop.
- Starter values are part of UX, but they must not become fake locks. Recommended borders and frontier propagation belong in live starter settings, while the shared controls remain real user choices.
- Shared surface controls must keep one stable meaning unless they are explicitly split. Phase field now uses a dedicated `Frontier Highlight` toggle so `Centered-blended borders` can remain an actual border-behavior control instead of mode-specific overloaded jargon.
