# Planning Document Audit — 2026-03-25

**Purpose:** Identify documents for distillation to reduce context bloat.
**Token estimation:** bytes ÷ 4 (rough approximation for English markdown).

**Idea-first note (2026-04-08):** This inventory is a **map of where prose (and latent ideas) are dense** — rendering, geometry, VFX, features, architecture, transitions, tooling, UX, diagnostics, etc. Distillation saves tokens; it does **not** replace **extracting ideas** into ledgers and `BRAINSTORMING_IDEAS_INDEX*`. Order of concern: **ideas → architect-owned plans → implementation** (see [territory-rendering-jumpstart.md](../implementation-plans/2026-04-08/territory-rendering-jumpstart.md), [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md)).

**Hub / navigation:** [PLANNING_DOCS_AUDIT.md](./PLANNING_DOCS_AUDIT.md) — jumpstart, dated audit (this file), manifest, recovery list, unified plan (code-sequence hypothesis only).

---

## 2026-04-08 — Meta-audit of this document (re-framed)

### What this March 25 audit is *for*

- **Idea mining:** The tables below point at **clusters** that historically contained lots of proposals, alternatives, failed experiments, and specs — i.e. **raw material for ideas**, not a single “winning plan.”
- **Reading priority:** Token estimates help decide **where to look first** when expanding the brainstorming file list and scorecards; they are not a verdict that “small doc = unimportant ideas.”
- **Hygiene:** KEEP / ARCHIVE / DISTILL still matter so you **do not re-read duplicate Perplexity rounds** when the same ideas already sit in a later synthesis — but archived rounds can still be **mined once** for ideas before they leave hot storage.

### What this audit is *not*

- **Not** the authority on which **ideas** are valid. New or recovered ideas can overturn any plan written the same week.
- **Not** superseded by the Render Family write-up in the sense of “stop looking here.” The [unified plan](../implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) is mainly an **implementation sequencing hypothesis** (Impl 0–3) plus **proposed** architecture; **Doc A–C** exist to **surface ideas** first. If synthesis finds a better direction, the plan changes — not the other way around.

### Corrections to the original framing

1. **Paths** — Short names (`geometry-atlas/`, `plans/…`) map to Ontology E trees under **`.agent/docs/`** (e.g. `.agent/docs/game/territory/geometry-atlas/`, `.agent/docs/plans/active/…`). Use this file as **cluster labels**, not guaranteed paths.
2. **Linear refactor story** — The March 25 narrative centered Step 4 + geometry refactor. That is one **plan thread** among many **idea threads** in the corpus. Continue to mine **all** threads for ideas; the architect **then** commits plans.
3. **Codex `RENDERING_*.md` + 03-16 folder** — Treat as **high-value idea sources** (architecture, candidates, visual intent). Copies also appear under **`_archive/pre-ontology-md-recovery-2026-03-22-24/`** when blob SHAs differed from HEAD. Pull **ideas** into the brainstorming index and scorecards; do not defer reading them just because another doc claims to be “current.”
4. **Scale** — [territory-rendering-jumpstart.md](../implementation-plans/2026-04-08/territory-rendering-jumpstart.md): **enumerate** per bucket, **date-band** ingestion, tranche acceleration — still the right way to **cover ideas** without reading every file linearly.

### How this artifact feeds 2026-04-08 work

| This March 25 artifact | Role for **idea surfacing** (then engineering) |
|------------------------|-----------------------------------------------|
| Directory summaries + token estimates | Prioritize buckets and **heavy** folders when building exhaustive file lists; cross-check [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](../implementation-plans/2026-04-08/doc-audit/MARKDOWN_FULL_MANIFEST_VS_HEAD.md). |
| Codex rendering + 03-16 tables | Explicit **idea harvest** targets: approaches, concerns, VFX/rendering/geometry language → rows in **BRAINSTORMING_IDEAS_INDEX** + **APPROACH_EVIDENCE_SCORECARD**. |
| Distillation recommendations | **After** a pass has extracted ideas into registries/index, reduce duplicate bulk so future sessions spend tokens on **new** material — not before ideas are captured. |
| Proposed `docs_audit` tool | Optional automation (sizes, headings) to support **idea inventory** passes. |

**Next actions:** Continue Doc B/C per jumpstart: **expand idea coverage** (exhaustive lists, index rows, contradictions, hidden/untried). Use this file as a **treasure map**, not as permission to skip clusters that did not appear in March 25.

---

## Summary

| Directory | Files | Total Tokens | Status |
|-----------|-------|-------------|--------|
| `geometry-atlas/` (source research) | 3 kept + 12 archived | ~7,500 active | ✅ Cleaned |
| `frontier-topology-project/` (phase specs) | 8 | ~13,400 | Active |
| `geometry-refactor-plan/` (execution plan) | 4 kept + 3 to review | ~8,800 | ✅ Cleaned |
| Root-level specs (recent) | ~6 kept + 5 to review | ~26,400 | Partially cleaned |
| **2026-03-22 Rendering refactor plan (Codex)** | **5** | **~15,700** | **NEW — needs triage** |
| **2026-03-16 render architecture update V2** | **11** | **~22,200** | **NEW — needs triage** |
| `_review-reconcile/` | 11 | ~19,000 | Pending review |
| `geometry-atlas/_archive/` | 12 | ~35,000 | Archived |
| **TOTAL** | **~73** | **~148,000** | |
| **Active (excl. archive/review)** | **~27** | **~94,000** | |


---

## geometry-atlas/ — Source Research (External AI Outputs)

These are Perplexity/NotebookLM outputs used to produce the refactor plan. Most are **input documents** that have been synthesized into `geometry-refactor-plan/`.

| Tokens | File | Summary | Verdict |
|--------|------|---------|---------|
| 4,207 | `GEOMETRY_ATLAS.md` | Complete inventory of all ~12K LOC geometry code: 8 compilers/generators, 6 renderers, 3 mode classes. Architecture diagram. | **KEEP** — authoritative inventory |
| 1,562 | `GEOMETRY_CONSOLIDATION_ANALYSIS.md` | Distills ~12K LOC into 2 methods (A: Power Voronoi, B: Raster). Ranks each file by unique contribution. Identifies what to extract and delete. | **KEEP** — essential triage guide |
| 1,746 | `Geometry pipeline refactor 2026-03-24.md` | Migration Map v3.1 — 4-phase plan: math extraction, unified vector engine, renderer rewrite, purge. | **KEEP** — authoritative plan |
| 1,746 | `NotebookLM Migration Map...v3.1.md` | Duplicate of Migration Map v3.1 (NotebookLM export). | **DELETE** — exact duplicate |
| 2,133 | `Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` | Early Perplexity round exploring architecture options before the mandate was defined. | **ARCHIVE** — superseded by v3.1 |
| 3,336 | `Perplexity...code agent detailed prompt.md` | 12-step execution directive for code agent. Architecture-first mandate. | **DISTILL** — key rules already in `geometry-refactor-plan/00-OVERVIEW.md` |
| 3,610 | `Perplexity...code output round 1.md` | TypeScript interfaces for canonical contract, compiler stub. | **ARCHIVE** — already implemented |
| 3,160 | `Perplexity...code output round 2.md` | More TypeScript: raster contract, provenance types. | **ARCHIVE** — partially implemented |
| 2,446 | `Perplexity...code output round 3.md` | More TypeScript: shell classification, diagnostic types. | **ARCHIVE** — partially implemented |
| 2,986 | `Perplexity...plan round 1.md` | First refactor plan iteration. | **ARCHIVE** — superseded by v3.1 |
| 3,160 | `Perplexity...plan round 2.md` | Second plan iteration with raster tier. | **ARCHIVE** — superseded by v3.1 |
| 2,446 | `Perplexity...plan round 3.md` | Third plan iteration. | **ARCHIVE** — superseded by v3.1 |
| 2,953 | `Perplexity...review recommendations 1.md` | Review corrections to the agent's plan. | **ARCHIVE** — corrections applied |
| 2,717 | `Perplexity...review recommendations 2.md` | More review corrections. | **ARCHIVE** — corrections applied |
| 2,611 | `Perplexity...review tranche 1.md` | Detailed review of existing code. | **ARCHIVE** — findings absorbed |
| 1,644 | `Perplexity...review tranche 2.md` | More review findings. | **ARCHIVE** — findings absorbed |
| 3,663 | `Perplexity...new renderer contextual plan.md` | Plan for renderer rewrite with full context. | **DISTILL** — has renderer rewrite details not yet in refactor plan |
| 2,142 | `Perplexity...new renderer contextual plan round 2.md` | Refined renderer plan. | **DISTILL** — same as above |

**Subtotal: ~44,400 tokens. Potential savings: ~35,000 tokens by archiving superseded rounds.**

---

## frontier-topology-project/ — Phase Specifications

These define the frontier topology architecture (phases 0-5). Written before the geometry refactor plan, they feed into Step 4 (consumer refactor).

| Tokens | File | Summary | Verdict |
|--------|------|---------|---------|
| 743 | `00-PROJECT-OVERVIEW.md` | Goal/scope/phase summary for 5-phase frontier topology project. | **KEEP** — index doc |
| 1,172 | `00A-PHASE-0-AUDIT.md` | Audit of existing compiler; finds 95% of topology data already computed. | **KEEP** — key finding |
| 1,540 | `01-PHASE-1-TYPES.md` | Type definitions: `FrontierVertex`, `FrontierSection`, `RegionLoop`, `FrontierTopology`. | **KEEP** — implemented, still authoritative |
| 1,954 | `02-PHASE-2-COMPILER-EMIT.md` | Compiler changes to emit `FrontierTopology` on `GeometrySnapshot`. | **KEEP** — partially implemented |
| 1,706 | `03-PHASE-3-TRANSITION-PLANNER.md` | 10-step transition planner algorithm with star influence matching. | **KEEP** — not yet implemented |
| 1,772 | `04-PHASE-4-FRAME-SAMPLER.md` | 7-step frame sampler ensuring fill/border alignment. | **KEEP** — not yet implemented |
| 1,367 | `05-PHASE-5-PRESENTATION.md` | Shared-plan transition mode pattern. | **KEEP** — not yet implemented |
| 3,150 | `CODE-MAP.md` | File/function/line references for all phases. | **KEEP** — navigation aid |

**Subtotal: ~13,400 tokens. All needed for Step 4 implementation. No distillation recommended yet.**

---

## geometry-refactor-plan/ — Execution Plan

The active, synthesized plan being executed. Created by distilling the geometry-atlas source docs.

| Tokens | File | Summary | Verdict |
|--------|------|---------|---------|
| 1,848 | `00-OVERVIEW.md` | Master plan: objective, principles, before/after architecture, step map, constraints. | **KEEP** — master index |
| 1,732 | `01-CANONICAL-CONTRACT.md` | Step 1 spec: `CanonicalGeometrySnapshot` types. | **DONE** — implemented, keep as reference |
| 1,069 | `02-UNIFIED-COMPILER.md` | Step 2 spec: `compileVectorGeometry()` compiler. | **DONE** — implemented |
| 947 | `03-ENFORCE-SINGLE-MODE.md` | Step 3 spec: single mode enforcement. | **DONE** — implemented |
| 2,034 | `04-REFACTOR-CONSUMERS.md` | Step 4 spec: transition layer + renderer rewrite. 6 subsections covering transitions, topology matching, smoothing, DY4, localized boundary, renderer-as-presenter. | **ACTIVE** — next work item |
| 1,189 | `05-QUARANTINE-AND-PURGE.md` | Step 5 spec: extraction checklist, 4 deletion batches. | **PENDING** — after Step 4 |

**Subtotal: ~8,800 tokens. All actively needed. Could distill completed steps into a single "completed" summary.**

---

## Root-level specs (recently modified)

| Tokens | File | Summary | Verdict |
|--------|------|---------|---------|
| 3,273 | `TERRITORY_ARCHITECTURE.md` | Canonical 4-layer pipeline spec. Smoothing = geometry concern (L69). | **KEEP** — authoritative architecture |
| 3,376 | `ARCHITECTURE_GUIDING_PRINCIPLES.md` | Smoothing placement table, layer separation rules. | **REVIEW** — overlaps with TERRITORY_ARCHITECTURE |
| 3,282 | `PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` | Broader project architecture principles. | **REVIEW** — may overlap with above |
| 4,640 | `TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | Clean architecture migration plan for territory system. | **REVIEW** — may be superseded by geometry-refactor-plan |
| 5,636 | `TERRITORY_TRANSITION_INVENTORY.md` | Complete inventory of all transition types, call flows, state fields. | **KEEP** — essential for Step 4 |
| 3,294 | `2026-03-23 CDF-OT vertex...PLAN.md` | Plan for CDF-based optimal transport vertex matching with semantic frontier data. | **KEEP** — informs Phase 3 planner |
| 820 | `TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` | Status snapshot from March 21. | **ARCHIVE** — outdated |
| 500 | `CONQUEST_ANIMATION_SPEC.md` | Conquest animation specification. | **KEEP** — small, relevant |
| 648 | `GEOMETRY_DATA_SHAPE.md` | Data shape definitions. | **REVIEW** — may be superseded by contracts |
| 491 | `TRANSITION_SNAPSHOT_RECORDER_SPEC.md` | Spec for transition snapshot recorder. | **KEEP** — small, specific |
| 482 | `AGENT_WORKTREE_COORDINATION_2026-03-21.md` | Multi-agent git coordination rules. | **UNRELATED** — not geometry |

**Subtotal: ~26,400 tokens.**

---

## 2026-03-22 Rendering Refactor Plan (Codex)

Generated by Codex on 2026-03-22. Five comprehensive documents covering the rendering system.

| Tokens | File | Summary |
|--------|------|---------|
| 3,404 | `RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` | Audits current rendering architecture for violations of clean-arch principles |
| 2,610 | `RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` | Step-by-step migration blueprint for the rendering layer |
| 4,066 | `RENDERING_SYSTEM_AUDIT_MASTER.md` | Master audit of all rendering systems, cross-referencing all renderers |
| 2,964 | `RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` | Decision matrix evaluating technical approaches for each rendering concern |
| 2,620 | `RENDERING_VISUAL_SPEC_GDD.md` | Visual specification from the GDD: what the final rendering should look like |

**Subtotal: ~15,700 tokens. Full ingestion cost: ~15.7K tokens.**
**Overlap assessment:** High overlap with `geometry-refactor-plan/` and `TERRITORY_ARCHITECTURE.md` — produced 3 days before the geometry refactor plan.

---

## 2026-03-16 Render Architecture Update V2

Older architecture documents (9 days old). Mix of Perplexity/NotebookLM outputs and structured specs.

| Tokens | File | Summary |
|--------|------|---------|
| 1,316 | `Analytical Lane Split Implementation Logic.md` | NotebookLM: lane split algorithm for territory corridors |
| 596 | `LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` | Perplexity: companion doc for FG2 extraction |
| 3,997 | `NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` | Perplexity: comprehensive PRD for territory geometry + rendering |
| 1,185 | `Territory System Intent.md` | Perplexity: distilled intent/vision for territory system |
| 2,508 | `CONSTRAINT_ARCHITECTURE_ANALYSIS.md` | Analysis of architecture constraints (MSR, CX, DX) |
| 244 | `ARCHITECTURE_README.md` | Index/readme for this directory |
| 1,403 | `COMPILER_CONTRACTS.md` | Contract definitions for compilers |
| 866 | `LEGACY_QUARANTINE.md` | Which legacy files to quarantine |
| 2,138 | `MASTER_TERRITORY_ARCHITECTURE.md` | Master architecture doc for territory system |
| 1,712 | `RENDER_AND_TRANSITIONS.md` | Rendering and transition pipeline spec |
| 6,277 | `script.py` | Python script (likely code analysis/generation helper) |

**Subtotal: ~22,200 tokens (including 6.3K python script). Full ingestion cost: ~22.2K tokens.**
**Overlap assessment:** Very high overlap — this is an earlier version of the architecture that was superseded by the 2026-03-22 Codex plan, which was itself superseded by the 2026-03-24 geometry refactor plan.

---

## Distillation Recommendation

### Immediate wins (~35K tokens freed)
1. **Archive 12 Perplexity round files** → move to `geometry-atlas/_archive/`. These are input research docs whose findings are already synthesized into `geometry-refactor-plan/`.
2. **Delete NotebookLM duplicate** of Migration Map v3.1.
3. **Archive completion status** from March 21 (outdated).

### Medium-term (after Step 4)
4. **Collapse completed steps** (01-03) in `geometry-refactor-plan/` into a single "completed" summary.
5. **Reconcile overlapping architecture docs** — `ARCHITECTURE_GUIDING_PRINCIPLES.md`, `PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`, and `TERRITORY_ARCHITECTURE.md` have significant overlap.

### Post-purge
6. **Documentation purge** of all superseded docs once the rewrite is confirmed working.

---

## Atlas-Harness Tool Assessment

**No existing tool** in atlas-harness covers bulk document summarization or token counting. The closest are `file_read` (single file) and `file_list` (directory listing with sizes).

**Proposed tool: `docs_audit`**
- **Input:** directory path, optional file pattern
- **Output:** for each matching file: path, byte size, estimated tokens (bytes/4), first 2-3 lines (title/summary), last modified date
- **Use case:** quickly assess document bloat, identify duplicates, and triage what to read vs archive
- **Implementation:** simple file system scan + head extraction, no AI summarization needed
