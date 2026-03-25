# Tranche C Findings: Territory Architecture & Geometry Pipeline

**Date:** 2026-03-25 | **Documents Read:** 15+ (core + survey of 25+ archive/research) | **Methodology:** Gold-Mining Heuristic + Architect(1), Reliability(2), Empiricist(6), Contractor(5)

---

## 🏆 Gold Nuggets

### G-C1: ARCHITECTURE_GUIDING_PRINCIPLES Is the Best Architecture Document
`_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md` (292L, D-83/84/85/86) is the most rigorous architecture spec in the entire project. It defines:
- Contract-first design with typed boundaries
- Naming convention table (Snapshot/Mode/Coordinator/Frame/Envelope/Plan/Command/Presenter/Bridge)
- PIXI-at-the-edge rule
- ConfigNormalizer single-read pattern
- Deletion protocol (D-85/D-87)
- Concrete runtime flow with TerritoryRuntimeCoordinator

**Risk:** This doc is in `_review-reconcile/`, not in the canonical territory docs location. It should be the **companion document** to TERRITORY_ARCHITECTURE.md — principles + architecture together.

### G-C2: Two Parallel Refactor Plans Exist
1. **Geometry Refactor** (`plans/active/geometry-refactor/`, 5 steps, steps 1-4 COMPLETE): Focus on unifying the compiler into `CanonicalGeometrySnapshot`. Step 5 (Quarantine & Purge) pending user approval.
2. **Frontier Topology** (`plans/active/frontier-topology/`, 5 phases, status PLANNING): Replace anonymous polygon geometry with semantic frontier topology for section-aware morph transitions.

**These plans are complementary, not competing.** Geometry Refactor creates the clean compiler foundation. Frontier Topology builds on it to add semantic identity to border sections.

### G-C3: The 4-Axis UI Model (TERRITORY_ARCHITECTURE §1)
The territory system has **4 independent dropdowns** (Geometry, Style, Fill Transition, Border Transition). This is a concrete, user-facing architecture decision that any agent must understand. Not all combinations are valid — but the independence is the design intent.

### G-C4: DY4 Is Split Across Two Layers (TERRITORY_ARCHITECTURE §1)
DY4 Optimal Transport has components in both Transition (border + fill algorithms) and Presentation (visual rendering style). This split is intentional and documented but creates coupling that must be carefully managed.

### G-C5: TERRITORY_TRANSITION_INVENTORY Is the Most Complete API Reference
482 lines of AST-generated type definitions, call flows, and data shapes. This is the ground-truth reference for what actually exists in code. The full type definitions for `TerritoryFrontierMap`, `CanonicalVertex/Edge/Loop`, `PatchMorphPlan`, `AnimatedRingPlan` etc. are here.

### G-C6: _review-reconcile Contains 3 Canonical Pipeline Steps
01-CANONICAL-CONTRACT.md, 02-UNIFIED-COMPILER.md, 03-ENFORCE-SINGLE-MODE.md — these are the first 3 steps of the geometry refactor plan. They should move to `plans/active/geometry-refactor/` or be archived if superseded by COMPLETED_STEPS_SUMMARY.

### G-C7: Naming Antipatterns Documented but Not Yet Resolved
ARCHITECTURE_GUIDING_PRINCIPLES §4 identifies: Geometry_0319 → BoundaryAwareFrontierGeometryMode, DY4 → OptimalTransportBorderMode, PVV2 → PowerVoronoiLegacyStyle, FG2 → SeedGraphGeometryMode. **These renames have NOT been executed.** Code still uses old names.

### G-C8: GEOMETRY_CONSOLIDATION_ANALYSIS — Target: 2 Methods
Analysis concludes only 2 fundamentally distinct geometry methods exist: Power Voronoi (site-based) and Unified Polygon (graph-metric). Everything else is a rendering style variation. This is the correct consolidation target.

---

## 🔍 Assumptions Made

| ID | Assumption | Evidence | Confidence | Need Input? |
|----|-----------|----------|------------|-------------|
| A-C1 | ARCHITECTURE_GUIDING_PRINCIPLES should be promoted to `docs/game/territory/` alongside TERRITORY_ARCHITECTURE | It's the theoretical companion; currently orphaned in _review-reconcile | 90% | Yes |
| A-C2 | Geometry refactor step 5 (Quarantine & Purge) is still pending | Marked as pending in previous session's walkthrough | 85% | Yes |
| A-C3 | Frontier topology plan is deferred until geometry refactor is complete | Phase 0 was PLANNING, and it builds on the geometry refactor foundation | 80% | Yes |
| A-C4 | The naming renames in G-C7 should be deferred to a dedicated cleanup session | They're cosmetic and risk churn during active refactoring | 70% | Yes |

---

## Document Disposition Recommendations

| Document | Current Location | Recommendation |
|----------|-----------------|----------------|
| ARCHITECTURE_GUIDING_PRINCIPLES | `_review-reconcile/` | **Move to** `docs/game/territory/` — this is the #1 territory architecture theory doc |
| PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES | `_review-reconcile/` | **Check if duplicate** of above. If so, archive. |
| 01-CANONICAL-CONTRACT, 02-UNIFIED-COMPILER, 03-ENFORCE-SINGLE-MODE | `_review-reconcile/` | **Move to** `plans/active/geometry-refactor/` or archive if superseded |
| GEOMETRY_DATA_SHAPE | `_review-reconcile/` | **Move to** `docs/game/territory/` or archive |
| TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT | `_review-reconcile/` | **Check overlap** with ARCHITECTURE_GUIDING_PRINCIPLES |
| Perplexity contextual plans (3 files) | `_review-reconcile/` | **Move to** `docs/research/` or archive |
| AGENT_WORKTREE_COORDINATION | `_review-reconcile/` | **Move to** `docs/agentic/` |

---

## ❓ Questions for Discussion

| ID | Question |
|----|----------|
| Q-C1 | **Geometry refactor Step 5?** Is Quarantine & Purge approved to proceed? |
| Q-C2 | **Frontier topology timeline?** Is this the next major work item after geometry refactor, or are there other priorities? |
| Q-C3 | **_review-reconcile disposition?** Should I move these files now or defer until after all tranches are processed? |
| Q-C4 | **Code naming renames?** The principles doc identifies 4+ renames. When should these happen? |
