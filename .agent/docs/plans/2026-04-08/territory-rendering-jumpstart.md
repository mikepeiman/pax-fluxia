# Territory Rendering: Fresh-Start Jumpstart (hub)

**Date:** 2026-04-08 (navigation split **2026-04-09**)

**Purpose:** Single **assignable path** for territory work: phase status, ingestion bucket index, and links to topical docs. Long-form runbooks are **not** duplicated here — open the linked files.

---

## 0. Fresh-context entry point (start here)

### 0.0 Path (give agents this one file)

`.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`

### 0.A Verbatim instruction (architect copy-paste)

> Start at **Section 0** of this file for path, **phase table (0.B)**, and **companion index (0.C)**. Follow the **Suggested load order** below. **Current phase:** **Impl 0** (doc epic complete) — confirm against **Phase status (0.B)**. For **rendering / config / renderer inventory**, read [territory-rendering-overview.md](./territory-rendering-overview.md). For **doc ingestion** (date bands, artifacts), read [territory-documentation-epic.md](./territory-documentation-epic.md). For **Impl sequencing and Parts I–II**, read [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md). **Ideas before plans before code** for new doc work; for **implementation**, follow the unified plan + `handoff_doc_c.md` and only write code when the architect directs it.

### 0.B Phase status (keep this table in sync when a phase finishes)

| Phase | Status | Handoff to read next |
|-------|--------|----------------------|
| P0 | Done | `handoff_p0.md` (historical) |
| Doc A | Done | `handoff_doc_a.md` |
| Doc B | Done | `handoff_doc_b.md` |
| Doc C | Done | `handoff_doc_c.md` |
| Impl 0–3 | **Next** (after architect locks direction) | [handoff_doc_c.md](./handoff_doc_c.md) + [handoff_i0.md](./handoff_i0.md) / [handoff_i1.md](./handoff_i1.md) + [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) |

**Doc epic (P0 + Doc A–C) is complete.** Deliverables: `artifacts_doc_c/`, `BRAINSTORMING_IDEAS_INDEX_FINAL.md`, `RECOMMENDATIONS_FOR_ARCHITECT.md`, `handoff_doc_c.md`. **Impl 0** may start when the architect greenlights code (default: after reading RECOMMENDATIONS + SYNTHESIS_FINAL).

### 0.C Companion files in this folder

| File | Role |
|------|------|
| [territory-rendering-overview.md](./territory-rendering-overview.md) | Renderer inventory, `renderers/geometry/`, config keys, Render Family strategy, tech stack, non-negotiables |
| [territory-documentation-epic.md](./territory-documentation-epic.md) | Mission, thinking models, core specs, ingestion strategy (§6), required outputs §9–13 |
| [territory-d3-voronoi-family-analysis.md](./territory-d3-voronoi-family-analysis.md) | d3-delaunay vs d3-weighted-voronoi modes; seam semantics; craftsmanship |
| [territory-clean-architecture-map.md](./territory-clean-architecture-map.md) | `pax-fluxia/src/lib/territory/` tree (contracts, layers, adapters, …) |
| [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) | **Impl spine** — execution checklist, Parts I–II, handoffs; not the full idea corpus |
| [RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md](./RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md) | **2026-04-09** — Metaball-first adapter ordering (supersedes DF-first for Impl 1) |
| [BRAINSTORMING_IDEAS_INDEX_FINAL.md](./BRAINSTORMING_IDEAS_INDEX_FINAL.md) | **Frozen** idea row ledger; §C links to [master inventory](./doc-audit/MARKDOWN_MASTER_INDEX.csv). Narrative: [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./doc-audit/TERRITORY_IDEA_CORPUS_NARRATIVE.md) |
| [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md) | Working draft; use if reopening ingestion |
| [RECOMMENDATIONS_FOR_ARCHITECT.md](./RECOMMENDATIONS_FOR_ARCHITECT.md) | Post–Doc C decisions backlog |
| `handoff_p0.md` | P0 checkpoint only |
| `handoff_doc_a.md` … `handoff_doc_c.md` | Continuity — read **`handoff_doc_c.md`** before Impl 0 |
| `artifacts_doc_a/`, `artifacts_doc_b/`, `artifacts_doc_c/`, `condensed/` | Ledgers, synthesis, short summaries |

**Deprecated alias:** [AGENT_ENTRYPOINT.md](./AGENT_ENTRYPOINT.md) redirects here — do not add new content there.

### 0.D Doc B completion criteria (reference for auditors)

Doc B is complete when: (1) `artifacts_doc_b/` exists with v2 ledgers, (2) `BRAINSTORMING_IDEAS_INDEX.md` is v2 with expanded manifests, (3) `handoff_doc_b.md` lists deliverables and Doc C next steps. *(Already satisfied in this repo snapshot.)*

### 0.E Related hubs

- [PLANNING_DOCS_AUDIT.md](../../process/PLANNING_DOCS_AUDIT.md) — ideas → plans → implementation + manifest links.  
- [`_INDEX.md`](../../../_INDEX.md) — *Major documentation audit (2026-04)*.

---

### Suggested load order

1. [`.agent/AGENT.md`](../../../../AGENT.md) — non-negotiable behaviors and file ontology.
2. **This file** — Section **0** (path, phase, companion table, **§0.1** buckets).
3. [territory-rendering-overview.md](./territory-rendering-overview.md) — legacy renderers, config, Render Family pivot, tech stack, non-negotiables.
4. [territory-documentation-epic.md](./territory-documentation-epic.md) — when doing **ingestion** or filling tally / timeline / contradiction artifacts (§6, §9–13).
5. [territory-d3-voronoi-family-analysis.md](./territory-d3-voronoi-family-analysis.md) — when debugging **Voronoi / PVV / Modified Voronoi** seams or choosing a mode.
6. [territory-clean-architecture-map.md](./territory-clean-architecture-map.md) — when navigating **`src/lib/territory/`**.
7. [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) — **Impl** checklist, Parts I–II. Short mirror: [condensed/PLAN_CONDENSED.md](condensed/PLAN_CONDENSED.md). **Impl prelude:** [handoff_doc_c.md](./handoff_doc_c.md), [BRAINSTORMING_IDEAS_INDEX_FINAL.md](./BRAINSTORMING_IDEAS_INDEX_FINAL.md) (§E), [RECOMMENDATIONS_FOR_ARCHITECT.md](./RECOMMENDATIONS_FOR_ARCHITECT.md), [artifacts_doc_c/SYNTHESIS_FINAL.md](./artifacts_doc_c/SYNTHESIS_FINAL.md).
8. Latest **handoff** for your phase — see unified plan Part V–VI.

**Do not start by loading** raw harness logs (`.agent-harness/logs/*.jsonl`), code snapshots under `research/.../pipeline-snapshot-*`, or entire `node_modules` / `.svelte-kit` — see [territory-documentation-epic.md](./territory-documentation-epic.md) §6.4.

### 0.1 Ingestion roots checklist (for exhaustive brainstorming file lists)

**Canonical enumeration (mining):** [MARKDOWN_MASTER_INDEX.md](./doc-audit/MARKDOWN_MASTER_INDEX.md) and [MARKDOWN_MASTER_INDEX.csv](./doc-audit/MARKDOWN_MASTER_INDEX.csv) under `.agent/docs/project/implementation-plans/2026-04-08/doc-audit/` — one row per **git-tracked** `.md` at `HEAD` (category, git first/last touch, Mar22/Mar24 **tree** flags, default `processing_status`). Regenerate with `doc-audit/_generate_markdown_master_index.ps1`. That inventory is the ground truth for “every tracked doc”; the bucket table below is a **human triage** map on top of it.

**Primary reader consolidation (ordering principle #1 — Ideas):** [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./doc-audit/TERRITORY_IDEA_CORPUS_NARRATIVE.md) — prose + sourced bullets across rendering, geometry, transition, VFX, feature, architecture, UX, diagnostic, and process (snapshot; does not replace `BRAINSTORMING_IDEAS_INDEX*`).

Use **buckets + keyword search** under each path to build **candidate lists** (then read in **date bands**, [territory-documentation-epic.md](./territory-documentation-epic.md) §6.2). Group the list by bucket in `BRAINSTORMING_IDEAS_INDEX*.md` or a `FILE_MANIFEST` section.

| Bucket | Path (from repo root) |
|--------|------------------------|
| Process acceleration | `.agent/docs/project/process/` — `TRANCHE_*_FINDINGS.md`, `planning-docs-chronological-index.md`; **master markdown index** lives in `implementation-plans/2026-04-08/doc-audit/` (`MARKDOWN_MASTER_INDEX.csv` + `.md`) |
| Ground truth | `.agent/docs/project/sessions/notes/`, `sessions/chats/` |
| WIP / scratch | `.agent/WIP Work-In-Progress/` (also indexed in the master CSV as category `WIP`) |
| Decisions / post-mortems | `.agent/docs/project/decisions/`, `project/post-mortems/` |
| Territory specs (canonical tree) | `.agent/docs/game/territory/` (include `geometry-atlas/` and `_archive/` when indexing) |
| Implementation plans (dated) | `.agent/docs/project/implementation-plans/2026-04-07/`, `2026-04-08/` |
| Plans | `.agent/docs/plans/` (root + dated subfolders), `plans/frontier-topology/`, `plans/geometry-refactor/` |
| PVV reference commit | `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` |
| Review / reconcile | `.agent/docs/_review-reconcile/` |
| Research | `.agent/docs/research/permanent-references/territory/` (all subfolders **except** excluded trees in doc epic §6.4), `research/2026-03-20 transition research/` |
| Archives | `.agent/docs/_archive/` (territory-related subtrees) |
| Engineering | `.agent/docs/engineering/architecture/` (e.g. `RENDERER_WIRING_PLAN.md`) |
| Agentic context (optional) | `.agent/docs/agentic/context/`, `agentic/atlas-harness/` |
| Atlas duplicates (cross-check) | `.atlas/`, `pax-fluxia/.atlas/` |
| Tool memory (skim) | `.gemini/MEMORY/*.md` |
| Canonical atlas mirror | `.agent/docs/atlas/` |

**Documentation audit baselines (do not skip for Doc B/C):** [PLANNING_DOCS_AUDIT.md](../../process/PLANNING_DOCS_AUDIT.md) (hub), [2026-03-25__1018 PLANNING_DOCS_AUDIT.md](../../process/2026-03-25__1018%20PLANNING_DOCS_AUDIT.md) (dated token/triage + 2026-04-08 meta-audit), [doc-audit/README.md](./doc-audit/README.md) (inventory folder index), [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](./doc-audit/MARKDOWN_FULL_MANIFEST_VS_HEAD.md), **[MARKDOWN_MASTER_INDEX.md](./doc-audit/MARKDOWN_MASTER_INDEX.md)** (full tracked `.md` inventory + processing queue columns), [IDEA_MINING_PIPELINE_POSTMORTEM.md](./doc-audit/IDEA_MINING_PIPELINE_POSTMORTEM.md) (why brainstorming rows ≠ exhaustive index), pre-ontology [RECOVERED_LEGACY_DOC_LIST.md](../../../_archive/pre-ontology-md-recovery-2026-03-22-24/RECOVERED_LEGACY_DOC_LIST.md) (**basename-deduped** recovery only — not a complete Mar 22 export), master [`_INDEX.md`](../../../_INDEX.md) (*Major documentation audit*).

**Code inventory (prose):** [territory-rendering-overview.md](./territory-rendering-overview.md) §1 (`renderers/`), [territory-clean-architecture-map.md](./territory-clean-architecture-map.md) (`territory/`).
