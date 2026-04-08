# Open Questions — Parking Lot

Items deferred from active sessions. Check before each work session.

---

## Architecture

### OQ-S4: Dirty-State Bucket Classification
- **Source:** Second-pass ingestion, Persona 2 (Reliability Engineer)
- **Question:** Config changes currently all trigger the same full geometry recompile path. Should changes be classified into: (A) topology, (B) geometry-family, (C) presentation-style — so presentation-only changes (color, alpha, width) never trigger a recompile?
- **Status:** Not a current problem per user (2026-03-25). Revisit if performance issues emerge.

### OQ-S1: Unified transition vs independent fill/border *timing*
- **Source:** Second-pass ingestion; revised **2026-04-07** (user mandate).
- **Question:** Should fill and frontier ever animate on **different** clocks or plans?
- **Decision made:** **No** for the shipped path — **one** transition step; fills and frontiers follow the **same** plan and timeline. Separate **caches** or draw lists for fill vs stroke are fine; separate **transition algorithms** with independent timing are not (they caused visible divergence). **Future:** optional separable VFX hooks may return for experimental modes if architecture keeps extension points.
- **Status:** Resolved for product defaults — see `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` §1.

### OQ-S7: Test Sub-Pixel Divergence Claim
- **Source:** Second-pass ingestion, Persona 6 (Empiricist)
- **Question:** Does PIXI.js v8 Graphics produce sub-pixel divergence between fill() and stroke() on identical vertex paths? The claim of "hundreds of pixels of divergence" cannot be from sub-pixel causes — likely a different root cause.
- **Status:** Pending test. A 15-minute experiment (draw identical fill polygon and stroked polygon, compare visually) would confirm or disprove.

### OQ-S6: Lane Split Formula Edge Cases
- **Source:** Second-pass ingestion, Persona 11 (Red Team)
- **Question:** Formula `t = (dV(v)−dU(u)+w)/(2w)` divides by zero when `w=0`. Also produces NaN when both distances are Infinity.
- **Decision made:** Guard against NaN/divide-by-zero. Lanes must always have an owner — "neutral" by default, never unowned.
- **Status:** Pending code fix in frontier geometry compiler.

### OQ-S8: CX/DX Virtual Stars vs Analytical Lane Split
- **Source:** Second-pass ingestion, Persona 9 (Historian)
- **Question:** `computeCorridorVirtuals()` and `computeDisconnectVirtuals()` still exist in codebase and produce geometry. Do they conflict with the analytical lane split approach?
- **Status:** CX/DX retained — no validated alternative. Investigate concurrency with lane split.

---

## Game Design

### OQ-S2: Dynamic MSR Feedback Loop
- **Source:** Second-pass ingestion, Persona 3 (Game Designer)
- **Question:** If territory size tracks fleet strength (dynamic MSR), winning players get more visual territory — potential "snowball" effect. Desired or not?
- **Status:** Deferred — not a current concern.

---

## Documentation

### OQ-S9: Doc Scope Granularity
- **Source:** Second-pass ingestion, Persona 4 (2nd-Order)
- **Heuristic adopted:** "One doc per topic, per scope, per audience" — not just one doc per topic. Large topics may need high-level + mid-level + low-level docs.

---

## Rules

### OQ-RULES: Agent Rules Audit
- **Source:** User feedback (2026-03-25)
- **Question:** All rules (including archived rules, and rule-worthy ideas implied in other files) need one independent phase of review. Active rules must stay in `.agent/rules/` for system effectiveness.
- **Status:** Pending dedicated session.
