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

