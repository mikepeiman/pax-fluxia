# Tranche A Findings: Game Design & Mechanics

**Date:** 2026-03-25 | **Documents Read:** 11 | **Methodology:** Gold-Mining Heuristic + GameSys(3), UXPsych(7), Architect(1), Empiricist(6)

---

## 🏆 Gold Nuggets

### G-A1: Canonical Terminology (from MECHANICS_atlas §0)
The atlas copy of MECHANICS contains a **§0 Canonical Terminology** section (D-70, 2026-03-14) that is **absent from the docs/ copy**:
- Territory, Front, Holding, Sector — active terms
- Frontier, District, Quadrant, Galaxy — future roadmap terms
- Notes that code still uses legacy names (`frontierGraph`, `ownerShells`, `holdings`)

**Risk:** This terminology block is load-bearing for the territory architecture work. Its absence from the `docs/` copy means agents loading that file miss it.

### G-A2: FG2 Diagnostic Geometry Notes (from MECHANICS_atlas §25)
The atlas copy contains a **§25 Territory Engine Diagnostic Geometry** section (2026-03-12) documenting FG2 internals: regionLoops, ownerRegionLoops, ownerShells, ownerShellTransitions, hole-loop geometry, interpolation. **Also absent from docs/ copy.** This is technical implementation detail — arguably doesn't belong in a game mechanics spec, but contains unique information about shell transitions and hole handling.

### G-A3: Lane Exclusivity Rule (MECHANICS_atlas §13)
D-75 (2026-03-15): "Only one or two player holdings may underlay any lane. No third player's territory may touch or extend over any point along a lane." **Replaces DX (disconnect separation) constraint.** Also atlas-only.

### G-A4: Two Fundamentally Different Actions (GDD 00_OVERVIEW §2)
The GDD has the clearest articulation of Attack vs Transfer as fundamentally different game actions, with a CAUTION callout. This framing is **not replicated at this level of clarity** in MECHANICS or GAME_SPECIFICATION.

### G-A5: Animation Speed Architecture is Declared Broken (GDD 01_ANIMATIONS §6)
The animation speed slider only controls ship transfer travel. Attack surge, orbit, settle, and spawn/despawn are **NOT connected**. Three solution options documented but none implemented.

### G-A6: MAINTAIN_ORDERS_ON_CONQUEST (MECHANICS_atlas §7.1 / §10.3)
The atlas MECHANICS adds a `MAINTAIN_ORDERS_ON_CONQUEST` player option for whether conquering player's orders persist after conquest. Original MECHANICS has this as unconditional cancel.

### G-A7: AI_RANDOM_ATTACK_PERSISTENCE (MECHANICS_atlas §11)
Atlas MECHANICS adds `AI_RANDOM_ATTACK_PERSISTENCE = 3` — number of ticks to maintain a random attack. Absent from non-atlas copy.

### G-A8: WIP-UI Design Vision (2026-02-19)
Detailed UI improvement analysis with two concrete design directions (Focused Tab Layout, Tactical Command Center). Contains actionable quick-wins. This is a **design reference document**, not implementation.

---

## 🔍 Assumptions Made

| ID | Assumption | Evidence | Confidence | Need Input? |
|----|-----------|----------|------------|-------------|
| A-A1 | MECHANICS_atlas is the more current copy | Contains D-70 (2026-03-14), D-75 (2026-03-15) additions | 95% | No |
| A-A2 | PRD_ACTIVE is stale and superseded | Dated 2026-01-31, references PRISM-Atlas DART-BEAM protocol, has different combat values (AGGRESSOR_ADVANTAGE=0.8 vs 0.7 in MECHANICS) | 90% | Yes |
| A-A3 | The FG2 diagnostic geometry notes (§25) belong in territory architecture, not game mechanics | They describe compiler internals, not player-facing mechanics | 85% | Yes |
| A-A4 | GAME_SPECIFICATION sections 2-11 are redundant with MECHANICS | Almost identical content with minor value differences | 90% | Yes |

---

## Value Divergences Found

| Variable | GAME_SPEC | MECHANICS | MECHANICS_atlas | PRD_ACTIVE |
|----------|-----------|-----------|-----------------|------------|
| `AGGRESSOR_ADVANTAGE` | 0.8 | 0.70 | 0.70 | 0.8 |
| `TRANSFER_RATE` | 25% | 10% | 10% | — |
| `CONQUEST_THRESHOLD` | 8 | 8 | 8 | 0.10 (10%) |
| `REPAIR_RATE` | 20% | 10% | 10% | 20% |
| `BASE_TICK_MS` | 1200ms | 1200ms | 1200ms | 750ms |
| `SCATTER_CAPTURE_RATE` | 50% | 40% | 40% | — |
| `RETREAT_CAPTURE_RATE` | 35% | 25% | 25% | — |

**These divergences mean no single document can be trusted as ground truth.** The actual code values (`game.config.ts` / `current-settings.json`) are the true authority.

---

## ❓ Questions for Discussion

| ID | Question |
|----|----------|
| Q-A1 | **Merge MECHANICS?** MECHANICS_atlas has §0, §13, §25, and several field additions not in docs/ copy. Merge atlas content into the canonical docs/ copy and archive the atlas copy? |
| Q-A2 | **Archive PRD_ACTIVE?** It's v3.1 from 2026-01-31 with stale values and PRISM-Atlas DART-BEAM references. Is there anything worth preserving, or can it be archived? |
| Q-A3 | **GAME_SPECIFICATION role?** It overlaps heavily with MECHANICS but also includes architecture, networking, and visual spec sections. Should it be the "overview" doc while MECHANICS is the "detailed rules" doc? Or merge into one? |
| Q-A4 | **Where should FG2 diagnostic geometry notes go?** They're implementation detail, not game design. Move to `docs/game/territory/` or `docs/engineering/`? |
| Q-A5 | **Verify values against code?** The divergences above mean I should read `game.config.ts` to determine which values are actually implemented. Should I do this now or defer? |
| Q-A6 | **Animation speed architecture.** Three options documented in GDD 01_ANIMATIONS §6. Has a decision been made? This affects VFX tranche processing. |
