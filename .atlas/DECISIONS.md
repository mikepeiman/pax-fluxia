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


