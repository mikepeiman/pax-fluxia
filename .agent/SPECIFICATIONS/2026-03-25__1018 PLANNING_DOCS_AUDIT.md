# Planning Document Audit — 2026-03-25

**Purpose:** Identify documents for distillation to reduce context bloat.
**Token estimation:** bytes ÷ 4 (rough approximation for English markdown).

---

## Summary

| Directory | Files | Total Tokens |
|-----------|-------|-------------|
| `geometry-atlas/` (source research) | 18 | ~44,400 |
| `frontier-topology-project/` (phase specs) | 8 | ~13,400 |
| `geometry-refactor-plan/` (execution plan) | 6 | ~8,800 |
| Root-level specs (recent) | 11 | ~26,400 |
| **TOTAL** | **43** | **~93,000** |

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
