# Tranche D Findings: Planning Documents & Active Work

**Date:** 2026-03-25 | **Documents Read:** 5 core + frontier-topology/geometry-refactor plans | **Methodology:** Gold-Mining Heuristic + Contractor(5), Visionary(10), Empiricist(6)

---

## 🏆 Gold Nuggets

### G-D1: DECISIONS.md Is Extraordinarily Valuable (624L, 19 Decisions)
Every design decision since 2026-02-07 is documented with context, rationale, and status. Key active decisions:
- **D-78**: Localized frontier updates (surgery, not global recompute)
- **D-79**: Shape morph, not crossfade, for fills
- **D-80**: Unified frontier pipeline (same points for fill + border)
- **4-layer architecture** (D-80 extension)
- **ONE GAME** — no SP/MP divergence
- **Orders persist** until explicitly cancelled
- **No mechanical travel** — visual only
- **Non-destructive dual-adapter** refactoring

### G-D2: CURRENT_OBJECTIVE Is Stale (Phase 2C)
References `transition-interpolation-plan.md` and Phase 2C tasks (interpolatePolylines, OptimalTransportBorderMode, FrontierMorphFillMode). These are from 2026-03-23. The project has progressed significantly since then (frontier topology plan, geometry refactor, etc.). **This file needs a complete rewrite.**

### G-D3: CURRENT_SPRINT Is Stale (2026-03-01)
References mobile UI work that is no longer active. Last updated 24+ days ago. **This file should be replaced or merged into a living work plan.**

### G-D4: FEATURE_STATUS Has Duplicate IDs
Multiple R-IDs are reused: R-31, R-32, R-33, R-38, R-39 each appear twice with different features. This makes cross-referencing unreliable. The 569L file has accumulated organically and needs either a cleanup pass or a fresh start.

### G-D5: FEATURE_STATUS Session Log Is the Best Work History
Lines 532-568 contain a day-by-day session log from 2026-02-02 through 2026-02-28 with commits, LOC changes, and summaries. This is an invaluable artifact for understanding the project's evolution.

### G-D6: GameCanvas Was Actually Reduced to 1384 Lines (Not 3020)
FEATURE_STATUS session log (2026-02-15) documents: "GameCanvas: 3020 → 1384 lines (-54%)". This contradicts RENDERER_WIRING_PLAN which lists it as 3020. **The wiring plan's data is PRE-extraction.** Phase C (extraction) and Phase D (wiring) are both listed as complete. Only D.6 (InputLayer) was skipped.

### G-D7: B-98 Is the Root Architecture Problem
Bug B-98 describes: "End-chain junctions of frontier segments produce sharp corner juts and animation side-effects. Frontiers should be singular continuous loops — when they change, the transition should be smooth like a string/rope with mathematical best-fit and most-efficient displacement (optimal transport)." This is the user's core visual specification that has never been fully achieved.

### G-D8: Two Active Refactor Plan Suites
1. **frontier-topology/** (6 files): Phases 0-5 for semantic frontier topology. Status: PLANNING.
2. **geometry-refactor/** (4 files): 5-step refactor. Steps 1-4 COMPLETE, Step 5 (Quarantine & Purge) pending.

---

## 🔍 Assumptions Made

| ID | Assumption | Evidence | Confidence | Need Input? |
|----|-----------|----------|------------|-------------|
| A-D1 | CURRENT_OBJECTIVE should be rewritten after this audit completes | It references Phase 2C which may be superseded | 90% | Yes |
| A-D2 | CURRENT_SPRINT should be merged into a new work plan, not maintained separately | It's been stale for 24 days | 85% | Yes |
| A-D3 | FEATURE_STATUS needs a cleanup pass to remove duplicate IDs | Multiple R-31, R-32, R-33, R-38, R-39 | 95% | No |
| A-D4 | The frontier-topology plan is the logical next step after geometry refactor Step 5 | It builds semantic identity on top of the clean geometry foundation | 85% | Yes |

---

## ❓ Questions for Discussion

| ID | Question |
|----|----------|
| Q-D1 | **B-98 priority?** This is the root cause of most visual limitations. Does it map to the frontier-topology plan, or is it a separate concern? |
| Q-D2 | **Geometry refactor Step 5 approval?** The quarantine & purge step is waiting for user confirmation. Ready to proceed? |
| Q-D3 | **FEATURE_STATUS refresh?** The 569L file needs either: (a) a cleanup pass with de-duplicated IDs and updated statuses, or (b) a fresh v2 that starts from the current codebase state instead of the historical accumulation. Preference? |
| Q-D4 | **Living work plan format?** What should replace CURRENT_OBJECTIVE + CURRENT_SPRINT? Options: single WORK_PLAN.md with phase/milestone tracking, or per-project tracking like the existing frontier-topology plan structure? |
