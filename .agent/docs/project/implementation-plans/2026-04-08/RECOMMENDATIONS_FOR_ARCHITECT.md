# Recommendations for the architect (post–Doc C)

**Date:** 2026-04-08  
**Context:** P0 + Doc A + Doc B + Doc C complete; `BRAINSTORMING_IDEAS_INDEX_FINAL.md` frozen; contradiction adjudication in `artifacts_doc_c/CONTRADICTION_ADJUDICATION.md`.

---

1. **Lock the outer shape:** Proceed with **Render Family** + shared ownership + gated `USE_RENDER_FAMILIES` (I-014) unless product evidence demands a different split. Re-read **Part II** of the unified plan before greenlighting Impl 0.

2. **Keep geometry-refactor inside VectorPolygon:** Do not restart a parallel “blueprint-only” migration (I-024); fold any unique blueprint ideas into family work items.

3. **First family after Impl 0 — Metaball (2026-04-09):** Adopt **MetaballFamily** before DF/vector extraction to prove the shell on the smallest adapter. Rationale and history: [RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md](./RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md); engineering checklist: [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) §II.5.

4. **Trust inventory for boundaries:** Use `TERRITORY_TRANSITION_INVENTORY.md` when drawing `VectorPolygonFamily` vs legacy renderer seams (I-029).

5. **Config discipline:** Require `GAME_CONFIG` ↔ `settingsDefs` parity tests as families add `tunableKeys` (I-030).

6. **Evidence hierarchy:** For “does it work?”, weight **session notes + recorder exports + your eyes** over FEATURE_STATUS or agent chat (open contradiction from Doc A).

7. **Hygiene backlog:** Dedupe `_review-reconcile` Perplexity files against `geometry-atlas/` when you next distill (I-033); non-blocking for Impl.

8. **Product optional:** Territory alpha overlay (I-031) and spectator (R-124) are **not** Render Family blockers — schedule separately.

9. **Atlas / MECHANICS:** Schedule a small sync pass for I-015 when copy conflicts confuse agents.

10. **When to reopen doc epic:** Only if a new renderer paradigm is adopted or a major contradiction appears between human observation and the FINAL index — then append dated rows to `BRAINSTORMING_IDEAS_INDEX.md` and cut a new `_FINAL` with architect sign-off.
