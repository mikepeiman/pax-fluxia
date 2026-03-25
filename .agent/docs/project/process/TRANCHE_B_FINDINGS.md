# Tranche B Findings: Engineering Architecture & Tech Stack

**Date:** 2026-03-25 | **Documents Read:** 6 | **Methodology:** Gold-Mining Heuristic + Architect(1), PerfPhys(8), Contractor(5), Visionary(10)

---

## 🏆 Gold Nuggets

### G-B1: Engine Unification Is Well-Documented but NOT Started
ENGINE_ARCHITECTURE_CURRENT/TARGET form a clean pair (both 2026-02-12). The 6-phase migration path is defined but **Phase 1 is the only completed phase** (combat formula verified as unified via thin wrapper). Phases 2-6 (kill ORDER_CONFIG, full tick delegation, map gen, win condition, config sync) are all pending.

**Key finding:** Client GameEngine.ts is **1594 lines** and reimplements combat resolution, transfer orders, and tick orchestration. Target is ~500 lines. This is the single largest unification debt.

### G-B2: Three Transfer Rates — Only One Connected to UI
`GAME_CONFIG.TRANSFER_RATE` (user slider), `DEFAULT_ENGINE_CONFIG.TRANSFER_RATE` (0.1), and `ORDER_CONFIG.TRANSFER_RATE` (0.25, stale orphan). This is documented as a known problem.

### G-B3: GameCanvas.svelte is 3020 Lines — Decomposition Plan Exists
RENDERER_WIRING_PLAN (Phase D, 2026-02-15) has a concrete 6-step plan to reduce GameCanvas.svelte from ~3020 lines to ~630 lines. Steps D.2-D.6 are defined with LOC estimates. Only D.1 (colorUtils) is done (~150 LOC removed).

### G-B4: Colyseus Version Mismatch
GAME_SPECIFICATION says `Colyseus 0.15`, TECH_STACK says `^0.17.8`. TECH_STACK is likely correct (more recent), but the GAME_SPEC is stale.

### G-B5: TECH_STACK Has Stale Paths
References `.atlas/POST_MORTEMS.md`, `.atlas/FEATURE_STATUS.md`, `.agent/.skills/`. All need updating to new Ontology E locations.

---

## 🔍 Assumptions Made

| ID | Assumption | Evidence | Confidence | Need Input? |
|----|-----------|----------|------------|-------------|
| A-B1 | Engine unification (Phases 2-6) should wait until after territory rendering pipeline is complete | Territory work is the active priority; engine unification is lower risk | 80% | Yes |
| A-B2 | GameCanvas decomposition (Phase D) is partially blocked by the territory rendering refactor | Territory rendering is being rewritten; wiring old renderers to GameCanvas while they're changing seems wasteful | 75% | Yes |
| A-B3 | Codex rendering research docs (5 files) are reference-only and don't need consolidation | They're external AI research outputs, not project specs | 90% | No |

---

## ❓ Questions for Discussion

| ID | Question |
|----|----------|
| Q-B1 | **Engine unification priority?** The 6-phase plan is clean but untouched. Should this be a post-territory-refactor project, or should it be interleaved? |
| Q-B2 | **GameCanvas decomposition status?** Is the 3020-line monolith still the current state, or has any work been done beyond D.1? Hypothesis: territory renderer refactor is creating new renderer modules that may supersede the Phase D plan. |
| Q-B3 | **Renderer wiring vs territory rewrite?** If the territory pipeline rewrite replaces the rendering layer, does Phase D's plan for StarRenderer/LaneRenderer/ShipRenderer wiring still apply? |
