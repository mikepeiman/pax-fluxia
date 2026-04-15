# Territory idea corpus — narrative digest

**Date:** 2026-04-08 (snapshot; idea space stays open per unified plan.)  
**Role:** Reader-facing consolidation of **Ideas** (ordering principle #1). Not a replacement for [BRAINSTORMING_IDEAS_INDEX_FINAL.md](../BRAINSTORMING_IDEAS_INDEX_FINAL.md) or ledgers—those remain the row-level and evidence layer.

---

## Mandate and how this fits

[TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) states:

> **Ideas** — Doc phases A–B–C and their artifacts exist primarily to **surface** rendering, geometry, transition, VFX, feature, architecture, UX, diagnostic, and process **ideas** from the corpus … **No implementation plan “closes” the idea space.**

This document **stories** those axes in prose. Part II of the unified plan is **plan layer** (hypothesis); Part III describes **documentation epic** goals. When they differ, treat conflicting engineering choices as **plan**, not as a cap on **ideas** worth mining from older prose.

**Work queue:** [MARKDOWN_MASTER_INDEX.csv](./MARKDOWN_MASTER_INDEX.csv) — one row per tracked `.md`; use `processing_status` / `notes` as you skim or extract (regenerating via `_generate_markdown_master_index.ps1` resets defaults unless you merge status afterward).  
**Row ledger:** `BRAINSTORMING_IDEAS_INDEX*.md` — idea IDs, priority, tried/untried.  
**Path ↔ commit map:** FINAL index §C.

---

## 1. Rendering

The corpus repeatedly contrasts **vector / polyline / Power Voronoi** paths with **distance-field (GPU)**, **contour / worker** presentations, and **graph-native** “lanes + stars” speculation. The **4-layer** mental model (ownership → geometry → transition → presentation) fits **one** paradigm well (vector morph to draw commands); other paradigms need **family-internal** contracts, not forced through the same DTOs ([TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) Part I).

- **PVV / hybrid pin parity (I-001)** — Pin frontier-derived fills at 3-ways and map edges via hybrid seed+delta; validated at ref commit; modular parity still a question. Source: `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` (`f0177372518fa453141f4e92489669b4c9bc4f46`).
- **Distance field as first-class family (I-002)** — Shader-native morph, not squeezed through vector transition-only types. Spec: `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` (`f4dc6da439ea689ee816482911ab0c7b64ae5f0c`). Aligns with unified plan II.5 (DF priority after shell—revisable if evidence changes).
- **Contour as its own family behind one container (I-009)** — Worker exists; treat as optional family, not bolt-on. `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **Graph-native rendering (I-008)** — Strategic alternative: render territory as graph structure (lanes + stars); heavy lift, largely untried. `.agent/docs/plans/Graph-Native Territory Rendering for a Star–Lane RTS (SvelteKit + Pixi.js).md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **Unified stroke/fill command builder (I-004)** — Presentation-layer unification across modes. `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **PVV / Power Voronoi nuance excavation (I-023)** — Perplexity round on `renderPowerVoronoi`. `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **Polygon count / LOD (I-027)** — Quality vs cost; simplification ideas. `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md` (`db55d8860bdd172f9edff4b232d425a404447448`).
- **Every-frame renderer calls (I-026)** — Prefer event-driven or cached family updates where possible. `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` (`db55d8860bdd172f9edff4b232d425a404447448`).
- **GPT-5.4 design plan as requirements wording (I-013)** — Use to refresh narrative in older architecture docs. `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md` (`2cdce84ef9df8fd8ec4e8a772815f7048e59b34a`).

**Tension (adjudicated):** Render Family = outer shape; geometry-refactor = inside VectorPolygon; clean-architecture blueprint = secondary idea mine, not a third master plan ([CONTRADICTION_ADJUDICATION.md](../artifacts_doc_c/CONTRADICTION_ADJUDICATION.md)).

---

## 2. Geometry

Canonical snapshots and **polyline-centric** assumptions collide with DF and other families that want different native shapes. Refactor docs push **compiler + quarantine + consumer rewrite** inside the vector story.

- **Quarantine legacy helpers before consumer rewrite (I-007)** — Risky without a family boundary first. `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **Morph boundary vertices / star segments (I-018)** — Midpoint/kink artifacts; boundary vertices along star segments. `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **Even-distribution / canonical boundary for morph fairness (I-020)** — Pairs with morph boundary work. `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **Virtual star position lerp (I-019)** — Smooth conquest motion feel. `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **CDF-OT semantic frontier vertices (I-010)** — Research → compiler contract. `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).

Sacrosanct from unified plan: **ownership** stays shared truth; **FrontierTopologyContracts** remain a useful graph shape as library / vector family; PIXI at the edge.

---

## 3. Transition

Doc + code inventory shows a **canonical** transition pipeline (`createCanonicalTransitionPlan` → `sampleTransitionFrame` → `drawTerritoryFrame`) alongside **legacy PVV-internal** OT-style border interpolation ([TERRITORY_TRANSITION_INVENTORY.md](../../../../game/territory/TERRITORY_TRANSITION_INVENTORY.md) — `023f8c34c6435bee96cc6f58a2e8d162a58cef76`). Idea work: treat **techniques** (splice, patch morph, ring classification, TMAP vs boundary snapshots) as a **menu of ideas**, not only “the current stack.”

- **Active-front interpolation as primary fill transition (I-003)** — Tried; transition layer remains painful; devtools added. `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md` (`1e51567507706a9b24eebcf42672324ffc934d92`).
- **Topology compiler stable IDs (I-005)** — `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`; `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **Frame sampler bridges topology ↔ presentation timing (I-006)** — `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).
- **Recorder + bundle export for regression (I-012)** — Devtools path. `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` (`023f8c34c6435bee96cc6f58a2e8d162a58cef76`).
- **OT / warp literature (I-011, I-022)** — External brief + Perplexity snapshot; dedupe consciously. `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md`; `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **Novel transition solutions as prompt constraints (I-021)** — Meta for future sessions. `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md` (`183ee9d1b4fa86d6f38ce996c9a2c427b185acb3`).
- **Use transition inventory as boundary map (I-029)** — When drawing VectorPolygon facade vs legacy seams. Same inventory file as above.
- **Don’t bury transition under geometry-only refactors (I-017)** — Planning bias note. `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` (`f4124c354b2d951bccf0d74e9003a2d28eb6ee78`).

---

## 4. VFX

Unified plan Part II.3: **runtime** emits conquests from **ownership diff** → `VFXBus`; families may emit `events[]` later for fine-grained sync. Corpus beyond that is **thin** for dedicated VFX specs—many “effects” ideas sit under **presentation** or **feature**.

- **Territory alpha / fog-of-war style overlay (I-031)** — Product-pending; not a Render Family shell blocker. `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md` (`f2848596e21930243aa4350699e3bdf508b2dffb`).
- **Shader / presentation flourishes** — Often folded into DF spec and UNIFIED_FILL_STROKE plan (see §1).

*Sparse axis:* expect future rows in `BRAINSTORMING*` when VFX docs grow.

---

## 5. Feature (gameplay-adjacent)

Ideas that touch **feel** and **product** more than shader internals—labelled here as **feature** when they inform territory UX or game loop.

- **Orb travel / arrival easing (I-032)** — Quality bar for “no hard jump” norms; cross-link to conquest feel. `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md` (`f2848596e21930243aa4350699e3bdf508b2dffb`).
- **Strategic alternatives / Codex tranche (I-028)** — Read with directives doc. `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md` (`9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7`).

**Boundary:** Keep **renderer contract** ideas in §1–3; park pure game-design items outside territory render docs unless they appear in session/spec hooks.

---

## 6. Architecture

- **Render Family + registry + gated flag (I-014)** — `USE_RENDER_FAMILIES` default off until DF path validated; sequencing in [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) (`10622718f851f8f76aec08f5a8c7bc0b82208c3b`). *Plan artifact; idea is the **gated experiment** mindset.*
- **Single-mode enforcement (I-025)** — Contract gate. `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md` (`f4dc6da439ea689ee816482911ab0c7b64ae5f0c`).
- **Clean-architecture blueprint vs family (I-024)** — Adjudicated: mine for ideas; do not fork a parallel Impl master ([CONTRADICTION_ADJUDICATION.md](../artifacts_doc_c/CONTRADICTION_ADJUDICATION.md)). `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` (`f4dc6da439ea689ee816482911ab0c7b64ae5f0c`).
- **Scorecard / themes** — [SYNTHESIS_FINAL.md](../artifacts_doc_c/SYNTHESIS_FINAL.md): DF + shader-native slice after shell; transition = failure cluster; human + recorder for “works.”

---

## 7. UX

- **GAME_CONFIG ↔ settingsDefs parity (I-030)** — No stale sliders; per-family `tunableKeys` need a single source of truth. `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md` (`f2848596e21930243aa4350699e3bdf508b2dffb`).
- **Unified plan II sketch** — One primary **family** selector + family-specific sub-options (replace misleading independent dropdown combos). [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) §I.2–I.3.

---

## 8. Diagnostic

- **DX fill vs true owner (I-016)** — Dual-source truth check; diagnostics idea. `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` (`085497746e6f29df54da8378bac3aef047c29e64`).
- **D1–D13 menu + optional DiagnosticProvider** — Unified plan II.2; ship with renderer work, not a standalone epic.
- **Recorder / bundle as evidence (I-012)** — Same as §3; underwrites “what actually happened” vs chat claims ([RECOMMENDATIONS_FOR_ARCHITECT.md](../RECOMMENDATIONS_FOR_ARCHITECT.md) item 6).

---

## 9. Process

- **Atlas MECHANICS terminology sync (I-015)** — Reduce agent confusion. `.agent/docs/project/process/TRANCHE_A_FINDINGS.md` (`0b6904a172b21ee511858a5f7f034a09627b7b0e`).
- **Review-reconcile vs geometry-atlas canonical home (I-033)** — Hygiene: prefer `game/territory/geometry-atlas/`; `_review-reconcile` duplicates for triage ([CONTRADICTION_ADJUDICATION.md](../artifacts_doc_c/CONTRADICTION_ADJUDICATION.md) §2).
- **Evidence hierarchy** — Session notes + recorder + human eyes over FEATURE_STATUS ([RECOMMENDATIONS_FOR_ARCHITECT.md](../RECOMMENDATIONS_FOR_ARCHITECT.md)).
- **Master markdown queue** — [MARKDOWN_MASTER_INDEX.csv](./MARKDOWN_MASTER_INDEX.csv); methodology: [IDEA_MINING_PIPELINE_POSTMORTEM.md](./IDEA_MINING_PIPELINE_POSTMORTEM.md).
- **When to reopen doc epic** — [RECOMMENDATIONS_FOR_ARCHITECT.md](../RECOMMENDATIONS_FOR_ARCHITECT.md) item 10: new paradigm or major contradiction vs FINAL index.

---

## Appendix A — Idea IDs → primary paths (ledger)

Full table with commits: [BRAINSTORMING_IDEAS_INDEX_FINAL.md §C](../BRAINSTORMING_IDEAS_INDEX_FINAL.md). This narrative groups by **axis**; the FINAL table remains authoritative for **ID ↔ path ↔ git_last_commit**.

---

## Appendix B — Paths heavily cited in this digest (queue hint)

Editors may set `processing_status` to `ideas_extracted` (or `skimmed`) for these rows in `MARKDOWN_MASTER_INDEX.csv` after review. **Note:** Re-running `_generate_markdown_master_index.ps1` resets `processing_status` to `unprocessed` unless the script is later extended to preserve overrides.

- `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md`
- `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md`
- `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md`
- `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md`
- `.agent/docs/plans/Graph-Native Territory Rendering for a Star–Lane RTS (SvelteKit + Pixi.js).md`
- `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`
- `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `.agent/docs/project/process/TRANCHE_A_FINDINGS.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- `.agent/docs/research/2026-03-20 transition research/` (multiple files; see FINAL §C)
- `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- [artifacts_doc_c/SYNTHESIS_FINAL.md](../artifacts_doc_c/SYNTHESIS_FINAL.md)
- [artifacts_doc_c/CONTRADICTION_ADJUDICATION.md](../artifacts_doc_c/CONTRADICTION_ADJUDICATION.md)
- [RECOMMENDATIONS_FOR_ARCHITECT.md](../RECOMMENDATIONS_FOR_ARCHITECT.md)

---

## Related entry points

- [2026-04-08_session_work_summary_and_prompt_log.md](./2026-04-08_session_work_summary_and_prompt_log.md) — **Plain-language summary** of today’s work, TSV explained, and **prompt log**.
- [territory-rendering-jumpstart.md](../territory-rendering-jumpstart.md) — Section 0.
- [MARKDOWN_MASTER_INDEX.md](./MARKDOWN_MASTER_INDEX.md) — Counts + regen command.
