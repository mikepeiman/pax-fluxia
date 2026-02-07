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
