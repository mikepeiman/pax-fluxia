# Brainstorming ideas index — **FINAL** (Doc C)

**Frozen snapshot:** 2026-04-08 — doc epic (P0 + Doc A + Doc B + Doc C) complete for territory Render Family planning.  
**Working draft (same rows, may drift):** [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md) — update only if the architect reopens ingestion; **Impl agents should cite this FINAL** unless told otherwise.

**Row shape:** `idea_id | one_line_idea | suggested_family | H/M/L | source_path | date | tried/untried/partial | notes`

---

## E. High-priority ideas only (quick ref for Impl)

| ID | One line |
|----|----------|
| I-001 | Hybrid PVV2 pin parity at ref commit |
| I-002 | DistanceField as first-class family |
| I-012 | Transition recorder / bundle regression |
| I-013 | GPT-5.4 territory plan for requirements wording |
| I-014 | Gated `USE_RENDER_FAMILIES` default off |
| I-016 | DX fill vs owner truth — diagnostics |
| I-017 | Don’t bury transition under geometry-only refactors |
| I-029 | Use transition inventory as code boundary map |
| I-030 | GAME_CONFIG ↔ settingsDefs parity for tunables |

---

## A. File manifest by bucket (paths only)

### A.1 Implementation plans (`2026-04-07`, `2026-04-08`) + handoffs + Doc C outputs

- `.agent/docs/project/implementation-plans/2026-04-07/deep-audit-territory-phased-plan.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-pipeline-onboarding-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-transition-wip-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`
- `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_p0.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_a.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_b.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_c.md`
- `.agent/docs/project/implementation-plans/2026-04-08/RECOMMENDATIONS_FOR_ARCHITECT.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/CONTEXT_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/THINKING_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/PLAN_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/AGENT_ENTRYPOINT.md` *(redirect → jumpstart)*
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/`, `artifacts_doc_b/`, `artifacts_doc_c/`

### A.2 Plans root + dated + subplans

*(unchanged from v2 — see [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md) §A.2 for full list)*

### A.3 Game territory specs (selected)

*(unchanged from v2 — full list in working file §A.3–A.9)*

### A.11 Sessions/chats band 2026-02-17 … 2026-03-07 (Doc C)

- `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26_breadcrumb.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`

**Remaining manifests (A.4–A.10, A.5–A.9):** identical to [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md) — not duplicated here to avoid drift; that file’s §A is the exhaustive path list.

---

## B. Idea rows (complete through Doc C)

| idea_id | one_line_idea | family | pri | source_path | date | status | notes |
|---------|---------------|--------|-----|-------------|------|--------|-------|
| I-001 | Pin frontier-derived fills at 3-way and map edges via hybrid seed+delta | VectorPolygon | H | PVV2_REFERENCE_COMMIT.md | 2026-03-25 | partial | Validated at ref commit; modular parity unproven. |
| I-002 | Treat DF renderer as first-class family with shader-native morph | DistanceField | H | TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md | — | partial | Aligns with unified plan priority. |
| I-003 | Active-front interpolation as primary fill transition | VectorPolygon | M | active-front-interpolation-transition-redesign.md | 2026-03-31 | tried | Ongoing transition-layer pain — devtools added. |
| I-004 | Unified stroke/fill command builder across modes | VectorPolygon | M | UNIFIED_FILL_STROKE_PLAN.md | 2026-03-31 | partial | Presentation layer concern. |
| I-005 | Frontier topology compiler emits stable IDs for transition planner | VectorPolygon | M | frontier-topology/02–03 | — | partial | Maps to `FrontierTopologyPlanner` work. |
| I-006 | Frame sampler bridges topology ↔ presentation timing | VectorPolygon | M | frontier-topology/04 | — | partial | `TopologyFrameSampler` in codebase. |
| I-007 | Quarantine legacy geometry helpers before consumer rewrite | VectorPolygon | L | geometry-refactor/05 | — | untried | Risky without family boundary first. |
| I-008 | Graph-native territory rendering (lanes + stars) | VectorPolygon / new | L | Graph-Native Territory Rendering…md | — | untried | Strategic alternative; heavy lift. |
| I-009 | Contour worker as own family behind single container | Contour | L | PROPOSAL_contour-territory-renderer.md | — | partial | Worker already exists. |
| I-010 | CDF-OT semantic frontier vertices for better correspondence | VectorPolygon | M | 2026-03-23 CDF-OT…md | 2026-03-23 | untried | Research → compiler contract. |
| I-011 | External research brief informs OT / warp literature | VectorPolygon | L | territory-transition-external-research-brief.md | 2026-03-31 | partial | Doc synthesis. |
| I-012 | Recorder + bundle export for transition regression | Shared | H | TRANSITION_SNAPSHOT_RECORDER_SPEC.md | — | partial | Implemented in devtools path. |
| I-013 | GPT-5.4 plan supersedes narrative in older architecture doc | Meta | H | 2026-04-04 design plan | 2026-04-04 | partial | Use for requirements wording. |
| I-014 | Render Family gated flag default off until DF path validated | Meta | H | TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md | 2026-04-08 | untried | Impl 0 acceptance criterion. |
| I-015 | Atlas mechanics terminology block should sync to canonical MECHANICS | Meta | M | TRANCHE_A_FINDINGS.md | 2026-03-25 | untried | Prevents agent confusion. |
| I-016 | DX/debug fill can disagree with true owner — harden ownership→display coupling | Shared / UI | H | `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | 2026-03-10 | partial | Diagnostics idea: dual-source truth check. |
| I-017 | Stop over-investing in geometry-only refactors while transition/render fails | Meta | H | `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` | 2026-03-17 | partial | Validates idea-first doc epic. |
| I-018 | Morph boundary vertices along star segments to fix midpoint/kink artifacts | VectorPolygon | M | `2026-03-20 morph boundary vertices v2.md` | 2026-03-20 | partial | See CLAIMS C-B-RESEARCH-01. |
| I-019 | Lerp virtual star positions for smooth conquest motion | VectorPolygon | M | `2026-03-20 F-165 virtual-star-position-lerp.md` | 2026-03-20 | untried | Ownership presentation interaction. |
| I-020 | Even-distribution / canonical boundary algorithm for morph fairness | VectorPolygon | L | `2026-03-20__1031 morph-even-distribution-algorithm.md` | 2026-03-20 | untried | Pair with I-018. |
| I-021 | Package “novel transition solutions” as prompt constraints for new modes | Meta | L | `2026-03-20 novel-transition-solutions-prompt.md` | 2026-03-20 | untried | Feeds brainstorming sessions. |
| I-022 | Perplexity transition guidance as literature snapshot (OT / warp) | VectorPolygon | M | `2026-03-20 Perplexity new transition guidance.md` | 2026-03-20 | partial | Dedupe vs 03-31 research brief. |
| I-023 | renderPowerVoronoi Perplexity round — PVV rendering nuances | VectorPolygon | L | `2026-03-20 Perplexity renderPowerVoronoi.md` | 2026-03-20 | partial | Excavation note for PVV2. |
| I-024 | Clean-architecture blueprint as alternate migration story vs geometry-refactor | Meta | M | `_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | 2026-03 | partial | **Adjudicated** — see `artifacts_doc_c/CONTRADICTION_ADJUDICATION.md`. |
| I-025 | Single-mode enforcement doc as contract gate | VectorPolygon | M | `_review-reconcile/03-ENFORCE-SINGLE-MODE.md` | 2026-03 | partial | Maps to registry enforcement. |
| I-026 | Renderer every-frame call pattern — prefer event-driven or cached families | DistanceField / Meta | M | `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` | 2026-03-03 | partial | Perf idea for family `update()`. |
| I-027 | Polygon count reasoning doc — LOD / simplification ideas | VectorPolygon | L | `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md` | 2026-03-03 | partial | Quality vs cost knob. |
| I-028 | Codex territory plan 2026-03-08 tranche — strategic alternatives | Meta | M | `TERRITORY PLAN 2026-03-08 Codex V2.md` | 2026-03-08 | partial | Read with directives doc. |
| I-029 | Use `TERRITORY_TRANSITION_INVENTORY.md` as cut-line map for VectorPolygon facade vs legacy | Meta | H | `TERRITORY_TRANSITION_INVENTORY.md` | 2026-03-24 | partial | Doc C deep index; symbols = boundaries. |
| I-030 | Enforce GAME_CONFIG-derived defaults for settings + family tunables (no stale sliders) | Shared | H | `SESSION_2026-03-01.md` | 2026-03-01 | partial | Pairs with per-family `tunableKeys`. |
| I-031 | Territory alpha overlay (fog-of-war style) still product-pending | Presentation | L | `SESSION_2026-02-17.md` | 2026-02-17 | untried | Not blocking Render Family shell. |
| I-032 | Orb travel / arrival easing quality bar may inform “no hard jump” territory norms | Meta | L | `SESSION_2026-02-17.md` | 2026-02-17 | partial | Cross-link to conquest spec feel. |
| I-033 | `_review-reconcile` Perplexity dupes: treat `geometry-atlas/` as canonical prose location | Meta | M | Doc C synthesis | 2026-04-08 | untried | Hygiene for future distill passes. |

---

## C. Idea rows → master inventory paths

Maps each §B row to a **repo-relative path** in [MARKDOWN_MASTER_INDEX.csv](./doc-audit/MARKDOWN_MASTER_INDEX.csv) (regenerate with `doc-audit/_generate_markdown_master_index.ps1`). **`git_last_commit`** is the inventory column of the same name (last commit touching that path at generation time).

| idea_id | inventory_path | git_last_commit |
|---------|----------------|-----------------|
| I-001 | `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` | `f0177372518fa453141f4e92489669b4c9bc4f46` |
| I-002 | `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` | `f4dc6da439ea689ee816482911ab0c7b64ae5f0c` |
| I-003 | `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md` | `1e51567507706a9b24eebcf42672324ffc934d92` |
| I-004 | `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-005 | `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`; `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-006 | `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-007 | `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-008 | `.agent/docs/plans/Graph-Native Territory Rendering for a Star–Lane RTS (SvelteKit + Pixi.js).md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-009 | `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-010 | `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-011 | `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-012 | `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` | `023f8c34c6435bee96cc6f58a2e8d162a58cef76` |
| I-013 | `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md` | `2cdce84ef9df8fd8ec4e8a772815f7048e59b34a` |
| I-014 | `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md` | `10622718f851f8f76aec08f5a8c7bc0b82208c3b` |
| I-015 | `.agent/docs/project/process/TRANCHE_A_FINDINGS.md` | `0b6904a172b21ee511858a5f7f034a09627b7b0e` |
| I-016 | `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | `085497746e6f29df54da8378bac3aef047c29e64` |
| I-017 | `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` | `f4124c354b2d951bccf0d74e9003a2d28eb6ee78` |
| I-018 | `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-019 | `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-020 | `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-021 | `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-022 | `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-023 | `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md` | `183ee9d1b4fa86d6f38ce996c9a2c427b185acb3` |
| I-024 | `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | `f4dc6da439ea689ee816482911ab0c7b64ae5f0c` |
| I-025 | `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md` | `f4dc6da439ea689ee816482911ab0c7b64ae5f0c` |
| I-026 | `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` | `db55d8860bdd172f9edff4b232d425a404447448` |
| I-027 | `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md` | `db55d8860bdd172f9edff4b232d425a404447448` |
| I-028 | `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md` | `9b5b5e4ad4de7bd802db05f03b7229b61a3dcff7` |
| I-029 | `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md` | `023f8c34c6435bee96cc6f58a2e8d162a58cef76` |
| I-030 | `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md` | `f2848596e21930243aa4350699e3bdf508b2dffb` |
| I-031 | `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md` | `f2848596e21930243aa4350699e3bdf508b2dffb` |
| I-032 | `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md` | `f2848596e21930243aa4350699e3bdf508b2dffb` |
| I-033 | — (Doc C cross-cutting synthesis; see `artifacts_doc_c/` + §B source column) | — |

---

## D. Doc epic closed

- Contradictions: **`artifacts_doc_c/CONTRADICTION_ADJUDICATION.md`**
- Architect-facing next actions: **`RECOMMENDATIONS_FOR_ARCHITECT.md`**
- Impl prelude: **`artifacts_doc_c/SYNTHESIS_FINAL.md`**, **`handoff_doc_c.md`**
