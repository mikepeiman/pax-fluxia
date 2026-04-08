# Brainstorming ideas index — Doc A (v1)

**Row shape:** `idea_id | one_line_idea | suggested_family | H/M/L | source_path | date | tried/untried/partial | notes`

**Procedure:** Buckets were enumerated with `**/glob` under repo roots; territory/render relevance is implicit for paths under `game/territory`, `plans/*territory*`, `implementation-plans`, `frontier-topology`, `geometry-refactor`, `research` (when added in Doc B). Expand rows in Doc B/C; promote to `_FINAL` in Doc C.

---

## A. File manifest by bucket (paths only)

### A.1 Implementation plans (`2026-04-07`, `2026-04-08`)

- `.agent/docs/project/implementation-plans/2026-04-07/deep-audit-territory-phased-plan.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-pipeline-onboarding-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-transition-wip-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`
- `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_p0.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/CONTEXT_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/THINKING_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/PLAN_CONDENSED.md`

### A.2 Plans root + dated + subplans

- `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md`
- `.agent/docs/plans/PVV2_EXCAVATION_PLAN.md`
- `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
- `.agent/docs/plans/Graph-Native Territory Rendering for a Star–Lane RTS (SvelteKit + Pixi.js).md`
- `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md`
- `.agent/docs/plans/2026-03-31/territory-architecture-compact-outline.md`
- `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md`
- `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md`
- `.agent/docs/plans/2026-04-01/external-agent-codebase-package.md`
- `.agent/docs/plans/2026-04-04/doc-review-architecture-docs.md`
- `.agent/docs/plans/frontier-topology/00-PROJECT-OVERVIEW.md`
- `.agent/docs/plans/frontier-topology/00A-PHASE-0-AUDIT.md`
- `.agent/docs/plans/frontier-topology/01-PHASE-1-TYPES.md`
- `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/docs/plans/frontier-topology/05-PHASE-5-PRESENTATION.md`
- `.agent/docs/plans/frontier-topology/CODE-MAP.md`
- `.agent/docs/plans/geometry-refactor/00-OVERVIEW.md`
- `.agent/docs/plans/geometry-refactor/04-REFACTOR-CONSUMERS.md`
- `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md`
- `.agent/docs/plans/geometry-refactor/COMPLETED_STEPS_SUMMARY.md`

### A.3 Game territory specs (selected; geometry-atlas + `_archive` truncated)

- `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`
- `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/docs/game/territory/GEOMETRY_IMPLEMENTATION_STRATEGIES.md`
- `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/*` (9 Perplexity / status files — enumerate in Doc B if needed)

### A.4 Sessions in band 2026-03-23 … 2026-04-08

- `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-25.md`

### A.5 Atlas (territory-adjacent)

- `.atlas/TERRITORY_SPEC.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- (other `.atlas/*.md` — cross-check for territory keywords in Doc B)

### A.6 Tool memory

- `.gemini/MEMORY/agent-context.md`
- `.gemini/MEMORY/git-branch-workflow.md`

---

## B. Idea rows (v1 seed)

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

---

## C. Next (Doc B)

- Add `research/2026-03-20 transition research/` and `_review-reconcile/` manifests.  
- Expand §A.3 `_archive` to explicit file list.  
- Merge duplicate Perplexity rounds per unified plan VII.  
- Add idea rows for each post-mortem in `.atlas/post-mortems/` (pre-03-23 band).
