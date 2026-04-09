# Contradiction adjudication — Doc C (for architect)

**Purpose:** Pick **one primary narrative per concern** so Impl agents do not implement against three masters.

## 1. Clean-architecture blueprint vs geometry-refactor vs Render Family

| Source | Emphasis |
|--------|----------|
| `_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | Layered clean migration into territory package |
| `plans/geometry-refactor/*` | Canonical compiler + quarantine legacy + consumer (transition) rewrite |
| `TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md` (Parts I–II) | **Families**: shared ownership + per-family geometry/transition/presentation |

**Adjudication (Doc C recommendation):** Treat **Render Family** as the **outer** program shape for **renderer** work (Impl 0–3). Treat **geometry-refactor** as the **authoritative** story for **vector compiler** innards inside `VectorPolygonFamily`. Treat the **blueprint** as **historical** migration color; mine it for ideas, but do **not** fork a third implementation plan — merge any unique blueprint ideas into family + refactor docs as one-offs.

**Still open:** If architect prefers blueprint sequencing over family-first, revise unified plan Part II **before** Impl 1–2.

## 2. Reconcile-folder Perplexity vs `geometry-atlas/_archive`

**Adjudication:** Prefer **`game/territory/geometry-atlas/`** tree as canonical location; `_review-reconcile` copies are **duplicates** for triage — read once, then archive/distill per March 25 audit hygiene.

## 3. “What works” (Doc A register)

**Unchanged open:** Agent status vs human observation — **recorder + session notes** beat FEATURE_STATUS for evidence until Render Family path is visually validated.
