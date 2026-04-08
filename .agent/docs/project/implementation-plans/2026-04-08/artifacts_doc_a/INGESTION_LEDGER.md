# Ingestion ledger — Doc A (v1)

**Band:** 2026-03-23 … 2026-04-08 (primary), plus structural reads of plans/specs that anchor later phases.  
**Purpose:** Record what was indexed, skimmed, or deep-read for territory Render Family planning.

| Path | Action | Notes |
|------|--------|--------|
| `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` | Deep | Reference commit `8dce88c`; Hybrid vs Dynamic pinning claim; excavation anchor for VectorPolygonFamily. |
| `.agent/docs/project/implementation-plans/2026-04-07/*` | Deep | Audit, onboarding, transition WIP — aligns with family refactor narrative. |
| `.agent/docs/project/implementation-plans/2026-04-08/*` | Deep | Jumpstart, unified plan, P0 condensed, handoffs. |
| `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md` | Indexed | Requirements authority for transitions / tick binding. |
| `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` | Indexed | 4-layer baseline; treat transition details as possibly stale vs runtime. |
| `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md` | Indexed | Newer design intent than architecture doc alone. |
| `.agent/docs/game/territory/geometry-atlas/*` (2026-03-24 cluster) | Indexed | Large Perplexity tranche — cross-check against exclusions (duplicate rounds) in unified plan VII. |
| `.agent/docs/plans/2026-03-31/*` | Indexed | Transition redesign, UNIFIED_FILL_STROKE, external research brief. |
| `.agent/docs/plans/2026-04-04/doc-review-architecture-docs.md` | Indexed | Architecture doc review slice. |
| `.agent/docs/plans/frontier-topology/*` | Indexed | Phase map for compiler / sampler / presentation — maps to transition-layer work. |
| `.agent/docs/plans/geometry-refactor/*` | Indexed | Quarantine/purge and consumer refactor notes. |
| `.agent/docs/plans/PVV2_EXCAVATION_PLAN.md` | Indexed | Linked from PVV2 reference doc. |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md` | Queued | In-band chat — line-level digest deferred; path listed for Doc B if needed. |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md` | Queued | In-band. |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-25.md` | Queued | In-band (same day as PVV2 ref commit). |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md` | Queued | In-band. |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md` | Queued | In-band. |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-25.md` | Queued | In-band. |
| `.atlas/TERRITORY_SPEC.md` | Skim | Cross-check vs `.agent/docs/game/territory/`. |
| `.atlas/FEATURE_STATUS.md` | Skim | Project tracking; may lag human ground truth. |
| `.atlas/post-mortems/*` (2026-03-xx) | Indexed | Renderer/geometry bias, DX fill, polygon count — band-adjacent evidence. |
| `.gemini/MEMORY/agent-context.md` | Skim | Reinforces AGENT.md + PowerShell; references `.agent/context/*` paths — verify existence before relying. |
| `.gemini/MEMORY/git-branch-workflow.md` | Listed | Not territory-specific; no claims logged here. |

**Gaps (Doc B / C):** Post-mortems before 03-23; full line-by-line chat ingestion; `TERRITORY_TRANSITION_INVENTORY.md` deep pass; research `2026-03-20 transition research/`; exhaustive `_archive` territory trees.
