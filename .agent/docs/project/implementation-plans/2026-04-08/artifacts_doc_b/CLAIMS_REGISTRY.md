# Claims registry — Doc B (v2)

**Extends:** [artifacts_doc_a/CLAIMS_REGISTRY.md](../artifacts_doc_a/CLAIMS_REGISTRY.md) — all Doc A claim IDs remain valid.

**Schema:** `claim_id | claim | source_path | strength (H/M/L) | verify how`

| ID | Claim | Source | Str | Verify |
|----|--------|--------|-----|--------|
| C-B-RESEARCH-01 | Morphing boundary vertices along star–star segments is a proposed fix for midpoint drift / kinks during PV transitions. | `2026-03-20 morph boundary vertices.md` (v2 + impl plan) | M | Code vs worker geometry path; user visual. |
| C-B-RESEARCH-02 | Virtual star positions can be lerped (F-165) to smooth ownership-driven motion without discrete jumps. | `2026-03-20 F-165 virtual-star-position-lerp.md` | M | Settings + ownership layer behavior. |
| C-B-RESEARCH-03 | External Perplexity “novel transition solutions” prompt packages constraints for alternative transition formulations. | `2026-03-20 novel-transition-solutions-prompt.md` | L | Compare to active-front / OT docs. |
| C-B-RECON-01 | `_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` states clean-arch migration for territory; overlaps geometry-refactor narrative. | `_review-reconcile/` | M | Diff vs `geometry-refactor/00-OVERVIEW.md`. |
| C-B-RECON-02 | Guiding principles docs in reconcile folder overlap `TERRITORY_ARCHITECTURE.md` — authority per topic still open (see contradiction register). | `ARCHITECTURE_GUIDING_PRINCIPLES.md`, `PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` | M | Architect picks canonical doc per concern. |
| C-B-PM-01 | Post-mortem 2026-03-10: DX fill showed wrong owner — UI/ownership display sync risk. | `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | M | Regression checklist for fills vs labels. |
| C-B-PM-02 | Post-mortem 2026-03-17: planning bias toward geometry refactors vs render/transition reality. | `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` | H | Influences idea prioritization (Render Family doc epic). |
| C-B-PM-03 | Renderers invoked every frame caused perf concern — may affect which families default to continuous vs event-driven updates. | `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` | M | Profiler + coordinator tick model. |
