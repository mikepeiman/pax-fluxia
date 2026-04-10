# Planning / documentation audit (hub)

**Ordering:** **Ideas** (mine from docs, ledgers, brainstorming index) → **plans** (architect commits) → **implementation** (code). Nothing in this hub reverses that.

**1. Territory idea ingestion — hub + topical files**

- [territory-rendering-jumpstart.md](../implementation-plans/2026-04-08/territory-rendering-jumpstart.md) — **assign this path**; **Section 0 only** = path, copy-paste instruction, phase status (0.B), companion index (0.C), load order, ingestion roots (0.1). Long-form runbooks: [territory-rendering-overview.md](../implementation-plans/2026-04-08/territory-rendering-overview.md), [territory-documentation-epic.md](../implementation-plans/2026-04-08/territory-documentation-epic.md), [territory-d3-voronoi-family-analysis.md](../implementation-plans/2026-04-08/territory-d3-voronoi-family-analysis.md), [territory-clean-architecture-map.md](../implementation-plans/2026-04-08/territory-clean-architecture-map.md). **Impl spine:** [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md).

**2. Where ideas are dense (maps + baselines)**

- [2026-03-25__1018 PLANNING_DOCS_AUDIT.md](./2026-03-25__1018%20PLANNING_DOCS_AUDIT.md) — token/triage table: **treasure map** for clusters to search, not a substitute for the brainstorming index.
- [doc-audit/README.md](../implementation-plans/2026-04-08/doc-audit/README.md) — canonical **markdown inventory** (CSV master index, full manifest, generators, 2026-04-08 session docs).
- [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](../implementation-plans/2026-04-08/doc-audit/MARKDOWN_FULL_MANIFEST_VS_HEAD.md) — every tracked `.md` at HEAD (BMAD paths excluded; regenerate via `_generate_markdown_manifest_index.ps1` in that folder).
- `../../_archive/pre-ontology-md-recovery-2026-03-22-24/RECOVERED_LEGACY_DOC_LIST.md` — recovered bodies (BMAD excluded) when SHAs diverged from HEAD.

**3. Implementation sequencing (after ideas → plans; revisable by Doc C)**

- [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](../implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) — P0 → Doc A–C (**idea epic**) → Impl 0–3 (**code**). **Canonical for Impl ordering and interface sketch once the architect locks direction**; **not** canonical for the full idea space.

**Master map:** `../../_INDEX.md` — *Major documentation audit (2026-04)*.
