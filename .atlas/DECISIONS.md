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
**Status:** Planned

## Context
Animation system had two completely disjoint systems: orbit rendering (per-star ship arrays with lerp physics) and fire-and-forget dots (separate animationStore events). Ships teleported out of orbit, separate dots flew the lane, different ships popped into orbit. Result: jerky, disjointed, ugly.

## Decision
- **Unified lifecycle**: Each visual ship transitions through `orbiting → departing → traveling → arriving → orbiting`
- **Same entity**: The visual ship that departs orbit IS the ship that travels the lane IS the ship that arrives
- **Lane adherence**: Ships follow the connection line between stars
- **Smooth easing**: `easeInOutCubic` at all transitions. Zero linear snapping.
- **Stream formation**: Multiple ships stagger along the lane as a visible stream
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
