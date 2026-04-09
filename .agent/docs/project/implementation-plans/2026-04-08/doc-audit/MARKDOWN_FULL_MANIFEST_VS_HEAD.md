**Generated:** 2026-04-09 12:45 (local)

**Regenerate:** run from repo root: `powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_manifest_index.ps1`

# Markdown full manifest: historical commits vs current HEAD

**Method:** `git ls-tree -r --name-only <ref>` filtered to paths ending in `.md` (ASCII). Paths containing `bmad` (case-insensitive) are **excluded** from this audit manifest.

## Snapshot commits

- **Current HEAD** - f10a94a1 2026-04-08 15:34:45 -0400 fix(archive): dedupe pre-ontology recovery files and harden naming
- **End 2026-03-24 (c4a3076)** - c4a30769 2026-03-24 21:58:45 -0400 docs: D-93 geometry refactor decision, D-94 DY4 virtual-star preservation
- **End 2026-03-23 (ff5c3df)** - ff5c3dfd 2026-03-23 21:55:04 -0400 docs: add Phase 0 audit + session notes, note legacy geometry mode audit priority
- **End 2026-03-22 (504bf64)** - 504bf644 2026-03-22 22:13:11 -0400 fix: territory re-renders while paused when config changes (config fingerprint gate)

## Counts

| Snapshot | .md files |
|----------|-----------|
| Current HEAD | 893 |
| End 2026-03-24 (c4a3076) | 494 |
| End 2026-03-23 (ff5c3df) | 466 |
| End 2026-03-22 (504bf64) | 447 |

## Only in historical tree, not in current HEAD (by snapshot)

These paths existed in git at that commit but are absent at HEAD (deleted, renamed, or not on this branch).

### End 2026-03-24 vs HEAD (425 paths)

- `.agent/AGENT-GUIDE_MCP_atlas-harness.md` - *same basename at HEAD:* `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/CURRENT_OBJECTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md`
- `.agent/CURRENT_SPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` - *same basename at HEAD:* `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md` - *same basename at HEAD:* `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md` - *same basename at HEAD:* `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md | .agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/SPECIFICATIONS/CONTROLS.md` - *same basename at HEAD:* `.agent/docs/game/ui/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md | .agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md` - *same basename at HEAD:* `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md | .agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md`
- `.agent/SPECIFICATIONS/MECHANICS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md | .agent/docs/game/design/MECHANICS.md | .atlas/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md` - *same basename at HEAD:* `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md | .agent/docs/engineering/tech-stack/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md | .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/TERRITORY_TRANSITION_INVENTORY.md` - *same basename at HEAD:* `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/SPECIFICATIONS/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` - *same basename at HEAD:* `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/00-PROJECT-OVERVIEW.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/00A-PHASE-0-AUDIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/01-PHASE-1-TYPES.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/05-PHASE-5-PRESENTATION.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/CODE-MAP.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md`
- `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_ATLAS.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GEOMETRY_CONSOLIDATION_ANALYSIS.md | .agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2026-03-24.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 1.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 2.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 3.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 3.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 1.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 2.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 3.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 3.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 1.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 2.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 1.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 2.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan round 2.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/00-OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/plans/geometry-refactor/00-OVERVIEW.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/01-CANONICAL-CONTRACT.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/01-CANONICAL-CONTRACT.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/02-UNIFIED-COMPILER.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/02-UNIFIED-COMPILER.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/03-ENFORCE-SINGLE-MODE.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/04-REFACTOR-CONSUMERS.md` - *same basename at HEAD:* `.agent/docs/plans/geometry-refactor/04-REFACTOR-CONSUMERS.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/05-QUARANTINE-AND-PURGE.md` - *same basename at HEAD:* `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md`
- `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md` - *same basename at HEAD:* `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md` - *same basename at HEAD:* `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md` - *same basename at HEAD:* `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md | .agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md` - *same basename at HEAD:* `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-24.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md | .agent/docs/project/decisions/DECISIONS.md | .atlas/DECISIONS.md | pax-fluxia/.atlas/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md` - *same basename at HEAD:* `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md` - *same basename at HEAD:* `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md | .agent/docs/project/features/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md | .agent/docs/project/features/FEATURE_STATUS.md | .atlas/FEATURE_STATUS.md | pax-fluxia/.atlas/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md` - *same basename at HEAD:* `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-24.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md` - *same basename at HEAD:* `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/slider-reactivity.md | .agent/rules/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/document-everything.md | .agent/rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/powershell-no-chain.md | .agent/rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trust-user-feedback.md | .agent/rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/verification-first.md | .agent/rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/context/architecture.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md | .agent/docs/agentic/context/architecture.md`
- `.agent/context/code-standards.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md | .agent/docs/agentic/context/code-standards.md`
- `.agent/context/debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/context/debugging.md | .agent/rules/debugging.md`
- `.agent/context/game-design.md` - *same basename at HEAD:* `.agent/docs/agentic/context/game-design.md`
- `.agent/context/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/context/tech-gotchas.md` - *same basename at HEAD:* `.agent/docs/agentic/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md` - *same basename at HEAD:* `.agent/docs/agentic/context/ui-patterns.md`
- `.agent/context/workflow.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md | .agent/docs/agentic/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md` - *same basename at HEAD:* `.agent/docs/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md` - *same basename at HEAD:* `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/sessions/2026-02-26_breadcrumb.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `LESSONS_LEARNED.md` - *same basename at HEAD:* `.agent/docs/project/process/LESSONS_LEARNED.md`
- `ONBOARDING.md` - *same basename at HEAD:* `.agent/docs/agentic/ONBOARDING.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` - *same basename at HEAD:* `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` - *same basename at HEAD:* `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md | .agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` - *same basename at HEAD:* `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md` - *same basename at HEAD:* `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md` - *same basename at HEAD:* `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `reference/legacy_app/screencapnotes.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/todo.md`
- `reference/research/3d pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/florin-pop pulse.md`

### End 2026-03-23 vs HEAD (397 paths)

- `.agent/AGENT-GUIDE_MCP_atlas-harness.md` - *same basename at HEAD:* `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/CURRENT_OBJECTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md`
- `.agent/CURRENT_SPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` - *same basename at HEAD:* `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md` - *same basename at HEAD:* `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md` - *same basename at HEAD:* `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md | .agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/SPECIFICATIONS/CONTROLS.md` - *same basename at HEAD:* `.agent/docs/game/ui/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md | .agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md` - *same basename at HEAD:* `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md | .agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md`
- `.agent/SPECIFICATIONS/MECHANICS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md | .agent/docs/game/design/MECHANICS.md | .atlas/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md` - *same basename at HEAD:* `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md | .agent/docs/engineering/tech-stack/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md | .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/00-PROJECT-OVERVIEW.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/00A-PHASE-0-AUDIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/01-PHASE-1-TYPES.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/05-PHASE-5-PRESENTATION.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md` - *same basename at HEAD:* `.agent/docs/plans/frontier-topology/CODE-MAP.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md` - *same basename at HEAD:* `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md` - *same basename at HEAD:* `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md` - *same basename at HEAD:* `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md | .agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md` - *same basename at HEAD:* `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md | .agent/docs/project/decisions/DECISIONS.md | .atlas/DECISIONS.md | pax-fluxia/.atlas/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md` - *same basename at HEAD:* `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md` - *same basename at HEAD:* `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md | .agent/docs/project/features/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md | .agent/docs/project/features/FEATURE_STATUS.md | .atlas/FEATURE_STATUS.md | pax-fluxia/.atlas/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md` - *same basename at HEAD:* `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md` - *same basename at HEAD:* `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/slider-reactivity.md | .agent/rules/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/document-everything.md | .agent/rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/powershell-no-chain.md | .agent/rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trust-user-feedback.md | .agent/rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/verification-first.md | .agent/rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/context/architecture.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md | .agent/docs/agentic/context/architecture.md`
- `.agent/context/code-standards.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md | .agent/docs/agentic/context/code-standards.md`
- `.agent/context/debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/context/debugging.md | .agent/rules/debugging.md`
- `.agent/context/game-design.md` - *same basename at HEAD:* `.agent/docs/agentic/context/game-design.md`
- `.agent/context/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/context/tech-gotchas.md` - *same basename at HEAD:* `.agent/docs/agentic/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md` - *same basename at HEAD:* `.agent/docs/agentic/context/ui-patterns.md`
- `.agent/context/workflow.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md | .agent/docs/agentic/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md` - *same basename at HEAD:* `.agent/docs/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md` - *same basename at HEAD:* `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/rules/dy4-sacrosanct.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md`
- `.agent/sessions/2026-02-26_breadcrumb.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `LESSONS_LEARNED.md` - *same basename at HEAD:* `.agent/docs/project/process/LESSONS_LEARNED.md`
- `ONBOARDING.md` - *same basename at HEAD:* `.agent/docs/agentic/ONBOARDING.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` - *same basename at HEAD:* `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` - *same basename at HEAD:* `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md | .agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` - *same basename at HEAD:* `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md` - *same basename at HEAD:* `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md` - *same basename at HEAD:* `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `reference/legacy_app/screencapnotes.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/todo.md`
- `reference/research/3d pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/florin-pop pulse.md`

### End 2026-03-22 vs HEAD (378 paths)

- `.agent/CURRENT_SPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md` - *same basename at HEAD:* `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md` - *same basename at HEAD:* `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/CONTROLS.md` - *same basename at HEAD:* `.agent/docs/game/ui/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md | .agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md` - *same basename at HEAD:* `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md | .agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/MECHANICS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md | .agent/docs/game/design/MECHANICS.md | .atlas/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md` - *same basename at HEAD:* `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md` - *same basename at HEAD:* `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md | .agent/docs/engineering/tech-stack/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md | .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` - *same basename at HEAD:* `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md` - *same basename at HEAD:* `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md` - *same basename at HEAD:* `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md` - *same basename at HEAD:* `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md` - *same basename at HEAD:* `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md` - *same basename at HEAD:* `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md | .agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md` - *same basename at HEAD:* `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md | .agent/docs/project/decisions/DECISIONS.md | .atlas/DECISIONS.md | pax-fluxia/.atlas/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md` - *same basename at HEAD:* `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md` - *same basename at HEAD:* `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` - *same basename at HEAD:* `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md | .agent/docs/project/features/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md | .agent/docs/project/features/FEATURE_STATUS.md | .atlas/FEATURE_STATUS.md | pax-fluxia/.atlas/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md` - *same basename at HEAD:* `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md` - *same basename at HEAD:* `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md` - *same basename at HEAD:* `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md` - *same basename at HEAD:* `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md` - *same basename at HEAD:* `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md` - *same basename at HEAD:* `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md` - *same basename at HEAD:* `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` - *same basename at HEAD:* `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md` - *same basename at HEAD:* `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md` - *same basename at HEAD:* `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md` - *same basename at HEAD:* `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md` - *same basename at HEAD:* `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md` - *same basename at HEAD:* `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/slider-reactivity.md | .agent/rules/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/document-everything.md | .agent/rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/powershell-no-chain.md | .agent/rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/trust-user-feedback.md | .agent/rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/verification-first.md | .agent/rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/context/architecture.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md | .agent/docs/agentic/context/architecture.md`
- `.agent/context/code-standards.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md | .agent/docs/agentic/context/code-standards.md`
- `.agent/context/debugging.md` - *same basename at HEAD:* `.agent/docs/agentic/context/debugging.md | .agent/rules/debugging.md`
- `.agent/context/game-design.md` - *same basename at HEAD:* `.agent/docs/agentic/context/game-design.md`
- `.agent/context/model-selection.md` - *same basename at HEAD:* `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `.agent/context/tech-gotchas.md` - *same basename at HEAD:* `.agent/docs/agentic/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md` - *same basename at HEAD:* `.agent/docs/agentic/context/ui-patterns.md`
- `.agent/context/workflow.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md | .agent/docs/agentic/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md` - *same basename at HEAD:* `.agent/docs/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md` - *same basename at HEAD:* `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/rules/dy4-sacrosanct.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md`
- `.agent/sessions/2026-02-26_breadcrumb.md` - *same basename at HEAD:* `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `LESSONS_LEARNED.md` - *same basename at HEAD:* `.agent/docs/project/process/LESSONS_LEARNED.md`
- `ONBOARDING.md` - *same basename at HEAD:* `.agent/docs/agentic/ONBOARDING.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` - *same basename at HEAD:* `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` - *same basename at HEAD:* `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md | .agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` - *same basename at HEAD:* `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md` - *same basename at HEAD:* `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md` - *same basename at HEAD:* `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md` - *same basename at HEAD:* `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `reference/legacy_app/screencapnotes.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md` - *same basename at HEAD:* `.agent/docs/research/reference/legacy_app/todo.md`
- `reference/research/3d pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md` - *same basename at HEAD:* `.agent/docs/research/reference/research/florin-pop pulse.md`

## Union: in any of Mar22-Mar24 snapshots but not in HEAD (426 unique paths)

Tag key: `22` = present at end Mar22, `23` = end Mar23, `24` = end Mar24.

- `[24,23]` `.agent/AGENT-GUIDE_MCP_atlas-harness.md` -> `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`
- `[24,23]` `.agent/CURRENT_OBJECTIVE.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md`
- `[24,23,22]` `.agent/CURRENT_SPRINT.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `[24,23]` `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` -> `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md` -> `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/AI_mental_models_article.md` -> `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md` -> `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `[24,23]` `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md` -> `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `[24,23]` `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md | .agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/CONTROLS.md` -> `.agent/docs/game/ui/CONTROLS.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md | .agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md` -> `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` -> `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md | .agent/docs/game/design/GAME_SPECIFICATION.md`
- `[24,23]` `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md` -> `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/MECHANICS.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md | .agent/docs/game/design/MECHANICS.md | .atlas/MECHANICS.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/PRD_ACTIVE.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `[24,23]` `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` -> `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md` -> `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/SURGE_ANIMATION.md` -> `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md` -> `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/TECH_STACK.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md | .agent/docs/engineering/tech-stack/TECH_STACK.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md | .agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` -> `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `[24]` `.agent/SPECIFICATIONS/TERRITORY_TRANSITION_INVENTORY.md` -> `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `[24]` `.agent/SPECIFICATIONS/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` -> `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md` -> `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md` -> `.agent/docs/plans/frontier-topology/00-PROJECT-OVERVIEW.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md` -> `.agent/docs/plans/frontier-topology/00A-PHASE-0-AUDIT.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md` -> `.agent/docs/plans/frontier-topology/01-PHASE-1-TYPES.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md` -> `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md` -> `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md` -> `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md` -> `.agent/docs/plans/frontier-topology/05-PHASE-5-PRESENTATION.md`
- `[24,23]` `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md` -> `.agent/docs/plans/frontier-topology/CODE-MAP.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md` -> `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `[24,23,22]` `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md` -> `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_ATLAS.md` -> `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GEOMETRY_CONSOLIDATION_ANALYSIS.md | .agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2026-03-24.md` -> `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md` -> `.agent/docs/_review-reconcile/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 1.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 1.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 2.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 2.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 3.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 3.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 1.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 1.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 2.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 2.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 3.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 3.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 1.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 1.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 2.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 2.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 1.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 1.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 2.md` -> `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 2.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan round 2.md` -> `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan round 2.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan.md` -> `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/00-OVERVIEW.md` -> `.agent/docs/plans/geometry-refactor/00-OVERVIEW.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/01-CANONICAL-CONTRACT.md` -> `.agent/docs/_review-reconcile/01-CANONICAL-CONTRACT.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/02-UNIFIED-COMPILER.md` -> `.agent/docs/_review-reconcile/02-UNIFIED-COMPILER.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/03-ENFORCE-SINGLE-MODE.md` -> `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/04-REFACTOR-CONSUMERS.md` -> `.agent/docs/plans/geometry-refactor/04-REFACTOR-CONSUMERS.md`
- `[24]` `.agent/SPECIFICATIONS/geometry-refactor-plan/05-QUARANTINE-AND-PURGE.md` -> `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md`
- `[24,23]` `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md` -> `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `[24,23,22]` `.agent/SYSTEM/Agentic harness for Windows CLI.md` -> `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `[24,23,22]` `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md` -> `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `[24,23,22]` `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md` -> `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `[24,23,22]` `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md` -> `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `[24,23,22]` `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md` -> `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md` -> `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md` -> `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md` -> `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md` -> `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/README.md` -> `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md` -> `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md` -> `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md | .agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md` -> `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md` -> `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md | .agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md` -> `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `[24,23,22]` `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md` -> `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md | .agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `[24,23,22]` `.agent/SYSTEM/context-distillation-plan-2026-02-25.md` -> `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md | .agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md` -> `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `[24,23]` `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md` -> `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `[24,23]` `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `[24]` `.agent/WIP Work-In-Progress/CHAT_2026-03-24.md` -> `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/DECISIONS.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md | .agent/docs/project/decisions/DECISIONS.md | .atlas/DECISIONS.md | pax-fluxia/.atlas/DECISIONS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md` -> `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md` -> `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` -> `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md | .agent/docs/project/features/FEATURE_IDEAS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/FEATURE_STATUS.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md | .agent/docs/project/features/FEATURE_STATUS.md | .atlas/FEATURE_STATUS.md | pax-fluxia/.atlas/FEATURE_STATUS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/POST_MORTEMS.md` -> `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `[24]` `.agent/WIP Work-In-Progress/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md` -> `.agent/docs/project/post-mortems/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md` -> `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md` -> `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md` -> `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md` -> `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md` -> `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `[24,23]` `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `[24]` `.agent/WIP Work-In-Progress/SESSION_2026-03-24.md` -> `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md` -> `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/UI/2026-03-02.md` -> `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md` -> `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md` -> `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md` -> `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md` -> `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md` -> `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` -> `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` -> `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` -> `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` -> `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` -> `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md` -> `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md` -> `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md` -> `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md` -> `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md` -> `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` -> `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` -> `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` -> `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` -> `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` -> `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` -> `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` -> `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` -> `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md` -> `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md` -> `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md` -> `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` -> `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` -> `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` -> `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` -> `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` -> `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` -> `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` -> `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` -> `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` -> `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` -> `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` -> `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` -> `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` -> `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md` -> `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` -> `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md` -> `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` -> `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md` -> `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md` -> `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md` -> `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md` -> `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md` -> `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md` -> `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md` -> `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md` -> `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md | .agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `[24,23,22]` `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md` -> `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md | .agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `[24,23,22]` `.agent/_archive_memory/active-settings-reference.md` -> `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `[24,23,22]` `.agent/_archive_memory/animation-imperative.md` -> `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `[24,23,22]` `.agent/_archive_memory/ask-user-for-visuals.md` -> `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `[24,23,22]` `.agent/_archive_memory/backwards-compat-effects.md` -> `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `[24,23,22]` `.agent/_archive_memory/clickable-code-refs.md` -> `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `[24,23,22]` `.agent/_archive_memory/collect-dont-rewrite.md` -> `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `[24,23,22]` `.agent/_archive_memory/colyseus-module-resolution.md` -> `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `[24,23,22]` `.agent/_archive_memory/css-grid-named-areas.md` -> `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `[24,23,22]` `.agent/_archive_memory/debug-forensics-scope.md` -> `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `[24,23,22]` `.agent/_archive_memory/deep-thinking-protocol.md` -> `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `[24,23,22]` `.agent/_archive_memory/docs-first-policy.md` -> `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `[24,23,22]` `.agent/_archive_memory/dry-principles.md` -> `.agent/docs/agentic/archive-memory/dry-principles.md`
- `[24,23,22]` `.agent/_archive_memory/engine-convergence.md` -> `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `[24,23,22]` `.agent/_archive_memory/exhaustive-reference-cleanup.md` -> `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `[24,23,22]` `.agent/_archive_memory/expose-tuning-variables.md` -> `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `[24,23,22]` `.agent/_archive_memory/file-size-limits.md` -> `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `[24,23,22]` `.agent/_archive_memory/fresh-start-debugging.md` -> `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `[24,23,22]` `.agent/_archive_memory/git-branching.md` -> `.agent/docs/agentic/archive-memory/git-branching.md`
- `[24,23,22]` `.agent/_archive_memory/git-version-control.md` -> `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `[24,23,22]` `.agent/_archive_memory/mandatory-search-before-refactor.md` -> `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `[24,23,22]` `.agent/_archive_memory/maximum-tuning.md` -> `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `[24,23,22]` `.agent/_archive_memory/modularize-large-files.md` -> `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `[24,23,22]` `.agent/_archive_memory/multiple-hypotheses.md` -> `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `[24,23,22]` `.agent/_archive_memory/no-goalpost-moving.md` -> `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `[24,23,22]` `.agent/_archive_memory/no-special-case-exceptions.md` -> `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `[24,23,22]` `.agent/_archive_memory/opposing-orders-rule.md` -> `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `[24,23,22]` `.agent/_archive_memory/pax-fluxia-gdd-context.md` -> `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `[24,23,22]` `.agent/_archive_memory/pax-galaxia-vs-fluxia.md` -> `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `[24,23,22]` `.agent/_archive_memory/problem-solving-integrity.md` -> `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `[24,23,22]` `.agent/_archive_memory/repeated-instructions-tracker.md` -> `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `[24,23,22]` `.agent/_archive_memory/scaffold-first.md` -> `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `[24,23,22]` `.agent/_archive_memory/scope-shared-functions.md` -> `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `[24,23,22]` `.agent/_archive_memory/semantic-naming.md` -> `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `[24,23,22]` `.agent/_archive_memory/session-documents.md` -> `.agent/docs/agentic/archive-memory/session-documents.md`
- `[24,23,22]` `.agent/_archive_memory/shared-engine-architecture.md` -> `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `[24,23,22]` `.agent/_archive_memory/slider-reactivity.md` -> `.agent/docs/agentic/archive-memory/slider-reactivity.md | .agent/rules/slider-reactivity.md`
- `[24,23,22]` `.agent/_archive_memory/spec-compliance.md` -> `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `[24,23,22]` `.agent/_archive_memory/task-queue-discipline.md` -> `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `[24,23,22]` `.agent/_archive_memory/tech-stack.md` -> `.agent/docs/agentic/archive-memory/tech-stack.md`
- `[24,23,22]` `.agent/_archive_memory/theme-versioning.md` -> `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `[24,23,22]` `.agent/_archive_memory/ui-dark-theme-contrast.md` -> `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `[24,23,22]` `.agent/_archive_memory/use-bun-only.md` -> `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `[24,23,22]` `.agent/_archive_memory/use-gametime-only.md` -> `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `[24,23,22]` `.agent/_archive_memory/user-words-are-specs.md` -> `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `[24,23,22]` `.agent/_archive_memory/verify-ui-placement.md` -> `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/load-context.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md` -> `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `[24,23,22]` `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `[24,23,22]` `.agent/_archive_rules/browser-usage.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md | .agent/docs/agentic/archive-rules/browser-usage.md`
- `[24,23,22]` `.agent/_archive_rules/document-everything.md` -> `.agent/docs/agentic/archive-rules/document-everything.md | .agent/rules/document-everything.md`
- `[24,23,22]` `.agent/_archive_rules/git-version-control.md` -> `.agent/docs/agentic/archive-memory/git-version-control.md | .agent/docs/agentic/archive-rules/git-version-control.md | .agent/rules/git-version-control.md`
- `[24,23,22]` `.agent/_archive_rules/never-remove-user-controls.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md | .agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `[24,23,22]` `.agent/_archive_rules/no-console-log.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md | .agent/docs/agentic/archive-rules/no-console-log.md`
- `[24,23,22]` `.agent/_archive_rules/powershell-no-chain.md` -> `.agent/docs/agentic/archive-rules/powershell-no-chain.md | .agent/rules/powershell-no-chain.md`
- `[24,23,22]` `.agent/_archive_rules/semantic-naming.md` -> `.agent/docs/agentic/archive-memory/semantic-naming.md | .agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md | .agent/docs/agentic/archive-rules/semantic-naming.md`
- `[24,23,22]` `.agent/_archive_rules/trigger-matrix.md` -> `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `[24,23,22]` `.agent/_archive_rules/trust-user-feedback.md` -> `.agent/docs/agentic/archive-rules/trust-user-feedback.md | .agent/rules/trust-user-feedback.md`
- `[24,23,22]` `.agent/_archive_rules/verification-first.md` -> `.agent/docs/agentic/archive-rules/verification-first.md | .agent/rules/verification-first.md`
- `[24,23,22]` `.agent/_archive_rules/verify-assumptions.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md | .agent/docs/agentic/archive-rules/verify-assumptions.md`
- `[24,23,22]` `.agent/context/architecture.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md | .agent/docs/agentic/context/architecture.md`
- `[24,23,22]` `.agent/context/code-standards.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md | .agent/docs/agentic/context/code-standards.md`
- `[24,23,22]` `.agent/context/debugging.md` -> `.agent/docs/agentic/context/debugging.md | .agent/rules/debugging.md`
- `[24,23,22]` `.agent/context/game-design.md` -> `.agent/docs/agentic/context/game-design.md`
- `[24,23,22]` `.agent/context/model-selection.md` -> `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md | .agent/docs/agentic/context/model-selection.md`
- `[24,23,22]` `.agent/context/tech-gotchas.md` -> `.agent/docs/agentic/context/tech-gotchas.md`
- `[24,23,22]` `.agent/context/ui-patterns.md` -> `.agent/docs/agentic/context/ui-patterns.md`
- `[24,23,22]` `.agent/context/workflow.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md | .agent/docs/agentic/context/workflow.md`
- `[24,23,22]` `.agent/plans/pax-fluxia-redesign.md` -> `.agent/docs/plans/pax-fluxia-redesign.md`
- `[24,23,22]` `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md` -> `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `[23,22]` `.agent/rules/dy4-sacrosanct.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md`
- `[24,23,22]` `.agent/sessions/2026-02-26_breadcrumb.md` -> `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `[24,23,22]` `LESSONS_LEARNED.md` -> `.agent/docs/project/process/LESSONS_LEARNED.md`
- `[24,23,22]` `ONBOARDING.md` -> `.agent/docs/agentic/ONBOARDING.md`
- `[24,23,22]` `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` -> `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `[24,23,22]` `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` -> `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md | .agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `[24,23,22]` `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` -> `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `[24,23,22]` `reference/GDD/design-inspiration-landingpage.md` -> `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `[24,23,22]` `reference/Pax_Galaxia_dev_notes_2026-02-08.md` -> `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `[24,23,22]` `reference/legacy_app/README.md` -> `.agent/.skills/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md | .agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md | .agent/docs/agentic/atlas-harness/README.md | .agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md | .agent/docs/research/permanent-references/territory/screenshots/README.md | .agent/docs/research/reference/legacy_app/README.md | README.md | under_development/pax-fluxia-ui/README.md`
- `[24,23,22]` `reference/legacy_app/screencapnotes.md` -> `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `[24,23,22]` `reference/legacy_app/todo.md` -> `.agent/docs/research/reference/legacy_app/todo.md`
- `[24,23,22]` `reference/research/3d pulse.md` -> `.agent/docs/research/reference/research/3d pulse.md`
- `[24,23,22]` `reference/research/circle-orb-effect.md` -> `.agent/docs/research/reference/research/circle-orb-effect.md`
- `[24,23,22]` `reference/research/florin-pop pulse.md` -> `.agent/docs/research/reference/research/florin-pop pulse.md`

## Only in current HEAD, not at end of 2026-03-24 (824 paths)

New or re-introduced since the Mar 24 snapshot.

- `.agent/WIP Work-In-Progress/CHAT_2026-03-25.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-29.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-30.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-31.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-04-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-04-02.md`
- `.agent/WIP Work-In-Progress/KICKSTART_2026-03-30.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-29.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-30.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-31.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-04-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-04-02.md`
- `.agent/docs/_INDEX.md`
- `.agent/docs/_archive/CURRENT_OBJECTIVE_archived.md`
- `.agent/docs/_archive/CURRENT_SPRINT_archived.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/docs/_archive/MECHANICS_atlas_archived.md`
- `.agent/docs/_archive/PRD_v3.1_archived.md`
- `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/AGENT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/action-platformer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/adventure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-architecture.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-compilation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-menu-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-plan.template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architect.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/backlog-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/balance-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorm-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorming-coach.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brief-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/card-game.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/certification-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/checklist.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/compatibility-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/creative-problem-solver.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/critical-actions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/csv-data-file-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/design-thinking-coach.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/documentation-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-01-load-existing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-02-discover-edits.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-04-sidecar-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-05-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-06-commands-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-07-activation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-08-edit-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-09-celebrate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e2e-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/fighting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/frontmatter-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/full-scan-instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-architect.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-brief-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-designer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-dev.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-qa.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-scrum-master.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-solo-dev.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/gdd-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/godot-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/help.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/horror.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/idle-incremental.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/index-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/innovation-strategist.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-discovery-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions-narrative.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/intent-vs-prescriptive-spectrum.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/localization-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/menu-handling-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/metroidvania.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/minimal-output-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/moba.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-help-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-yaml-conventions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/multiplayer-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/narrative-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/output-format-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/party-game.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/persona-properties.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtest-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtesting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/presentation-master.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/principles-crafting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-context-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-overview-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/puzzle.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/qa-automation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/racing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/regression-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rhythm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/roguelike.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rpg.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sandbox.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/save-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/shooter.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/simulation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/smoke-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/source-tree-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sports.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-00-conversion.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-agent-loading.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-brainstorm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discover.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discovery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init-continuable-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-brief.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-target.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-mode-detection.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-session-setup.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-understand.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate-max-mode.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-welcome.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continuation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continue.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-classification.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context-gathering.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discovery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discussion-orchestration.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-file-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-foundation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-frontmatter-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-investigate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-select-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-spark.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-vision.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02a-user-selected.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-ai-recommended.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-path-violations.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02c-random-selection.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02d-progressive-flow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-apply-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-config.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-execute.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-graceful-exit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-ideation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-market.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-menu-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-type.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-yaml.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-platforms.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-requirements.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-sidecar-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-starter.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-story.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-technique-execution.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agent-specs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agents.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-characters.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-decisions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-fundamentals.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-idea-organization.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-self-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-step-type-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-tools.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-vision.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-adversarial-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-commands-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-confirm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-core-gameplay.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-crosscutting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-identity.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-output-format-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-plan-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-scope.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflow-specs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflows.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-world.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-activation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-design.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-dialogue.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-docs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-documentation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-mechanics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-references.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-resolve-findings.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-users.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-validation-design-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-build-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-content.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-environmental.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-foundation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-game-type.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-installation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-instruction-style-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-value.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-agents.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-build-step-01.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-celebrate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-collaborative-experience-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-delivery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-progression.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-report.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08b-subprocess-optimization.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-build-next-step.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-cohesive-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-integration.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-levels.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-workflows.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-art-audio.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-confirmation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-production.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-report-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-tools.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-completion.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-plan-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-scenarios.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-technical.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-creative.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-epics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-metrics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-finalize.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-1b-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-01-assess-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-02-discover-edits.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-03-fix-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-04-direct-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-05-apply-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-06-validate-after.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-07-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-file-rules.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-type-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/stories-told.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/story-preferences.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/storyteller.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/strategy.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/subprocess-optimization-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/survival.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-writer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-design-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-priorities.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-review-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/text-based.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tower-defense.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/trimodal-workflow-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/turn-based-tactics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/understanding-agent-types.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unity-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unreal-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-01-load-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02a-validate-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02b-validate-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02c-validate-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02d-validate-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02e-validate-sidecar.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-03-summary.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/visual-novel.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-chaining-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module-brief.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-examples.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-rework-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-type-criteria.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-max-parallel-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/yy-mm-dd-entry-template.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/docs/_review-reconcile/01-CANONICAL-CONTRACT.md`
- `.agent/docs/_review-reconcile/02-UNIFIED-COMPILER.md`
- `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md`
- `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md`
- `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan round 2.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan.md`
- `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `.agent/docs/agentic/ONBOARDING.md`
- `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `.agent/docs/agentic/archive-memory/dry-principles.md`
- `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `.agent/docs/agentic/archive-memory/git-branching.md`
- `.agent/docs/agentic/archive-memory/git-version-control.md`
- `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `.agent/docs/agentic/archive-memory/semantic-naming.md`
- `.agent/docs/agentic/archive-memory/session-documents.md`
- `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `.agent/docs/agentic/archive-memory/slider-reactivity.md`
- `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `.agent/docs/agentic/archive-memory/tech-stack.md`
- `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md`
- `.agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/docs/agentic/archive-rules/document-everything.md`
- `.agent/docs/agentic/archive-rules/git-version-control.md`
- `.agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/docs/agentic/archive-rules/powershell-no-chain.md`
- `.agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `.agent/docs/agentic/archive-rules/trust-user-feedback.md`
- `.agent/docs/agentic/archive-rules/verification-first.md`
- `.agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `.agent/docs/agentic/atlas-harness/README.md`
- `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md`
- `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md`
- `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md`
- `.agent/docs/agentic/context/architecture.md`
- `.agent/docs/agentic/context/code-standards.md`
- `.agent/docs/agentic/context/debugging.md`
- `.agent/docs/agentic/context/game-design.md`
- `.agent/docs/agentic/context/model-selection.md`
- `.agent/docs/agentic/context/tech-gotchas.md`
- `.agent/docs/agentic/context/ui-patterns.md`
- `.agent/docs/agentic/context/workflow.md`
- `.agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/docs/agentic/mental-models/2026-04-07 innovative_thinking.md`
- `.agent/docs/agentic/mental-models/2026-04-07 master_debug_prompt.md`
- `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/docs/agentic/prompts/HEURISTIC_gold-mining-deep-ingestion.md`
- `.agent/docs/atlas/00_PHYSICAL_MAP.md`
- `.agent/docs/atlas/01_ASSET_INVENTORY.md`
- `.agent/docs/atlas/02_IO_REGISTRY.md`
- `.agent/docs/atlas/03_EVENT_MATRIX.md`
- `.agent/docs/atlas/04_FUNCTIONAL_STORY.md`
- `.agent/docs/atlas/DESIGN_RULES.md`
- `.agent/docs/atlas/TERRITORY_SPEC.md`
- `.agent/docs/engineering/NAMING_CONVENTIONS.md`
- `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/docs/engineering/tech-stack/TECH_STACK.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/design/MECHANICS.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`
- `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/game/territory/GEOMETRY_IMPLEMENTATION_STRATEGIES.md`
- `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 3.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 3.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/docs/game/ui/CONTROLS.md`
- `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md`
- `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md`
- `.agent/docs/plans/2026-03-31/territory-architecture-compact-outline.md`
- `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md`
- `.agent/docs/plans/2026-04-01/external-agent-codebase-package.md`
- `.agent/docs/plans/2026-04-04/doc-review-architecture-docs.md`
- `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/docs/plans/PVV2_EXCAVATION_PLAN.md`
- `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md`
- `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
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
- `.agent/docs/plans/pax-fluxia-redesign.md`
- `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `.agent/docs/project/TERRITORY_PIPELINE_STATUS.md`
- `.agent/docs/project/WORK_HISTORY.md`
- `.agent/docs/project/decisions/DECISIONS.md`
- `.agent/docs/project/decisions/DECISIONS_atlas.md`
- `.agent/docs/project/features/FEATURE_IDEAS.md`
- `.agent/docs/project/features/FEATURE_STATUS.md`
- `.agent/docs/project/features/FEATURE_STATUS_atlas.md`
- `.agent/docs/project/implementation-plans/2026-04-07/deep-audit-territory-phased-plan.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-pipeline-onboarding-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-transition-wip-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-08/BRAINSTORMING_IDEAS_INDEX.md`
- `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/APPROACH_EVIDENCE_SCORECARD.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CLAIMS_REGISTRY.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CONTRADICTION_REGISTER.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/INGESTION_LEDGER.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/TIMELINE_CANON.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/CONTEXT_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/PLAN_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/THINKING_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_a.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_p0.md`
- `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`
- `.agent/docs/project/open-questions/OPEN_QUESTIONS.md`
- `.agent/docs/project/planning-docs-chronological-index.md`
- `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-commit-before-tweaks.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-responsive-design-failure.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-slider-reactivity-scope-failure.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-03-polygon-count-reasoning.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-03-renderers-called-every-frame.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-17-planning-bias-geometry-vs-render.md`
- `.agent/docs/project/post-mortems/atlas/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.agent/docs/project/process/2026-03-25__1018 PLANNING_DOCS_AUDIT.md`
- `.agent/docs/project/process/2026-03-25__1247 DEEP_INGESTION_FINDINGS.md`
- `.agent/docs/project/process/2026-03-25__1253 SECOND_PASS_ONTOLOGY_AND_INGESTION.md`
- `.agent/docs/project/process/DEEP_PROCESSING_PLAN.md`
- `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `.agent/docs/project/process/LESSONS_LEARNED.md`
- `.agent/docs/project/process/MARKDOWN_FULL_MANIFEST_VS_HEAD.md`
- `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `.agent/docs/project/process/TRANCHE_A_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_B_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_C_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_D_FINDINGS.md`
- `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `.agent/docs/project/process/post-mortem_2026-03-29-unauthorized-changes.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26_breadcrumb.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-04-08.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/screenshots/README.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `.agent/docs/research/reference/legacy_app/README.md`
- `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `.agent/docs/research/reference/legacy_app/todo.md`
- `.agent/docs/research/reference/research/3d pulse.md`
- `.agent/docs/research/reference/research/circle-orb-effect.md`
- `.agent/docs/research/reference/research/florin-pop pulse.md`
- `.agent/rules/information-vs-action.md`
- `.agent/rules/planning-mode-enforcement.md`
- `.agent/rules/verify-cli-output.md`
- `.atlas/SPRINT_2026-03-30.md`
- `pax-fluxia/.atlas/DECISIONS.md`
- `pax-fluxia/.atlas/FEATURE_STATUS.md`
- `pax-fluxia/.atlas/MAIN_MENU_V2_DESIGN.md`
- `pax-fluxia/.atlas/MP_LOBBY_DESIGN.md`

## Cross-index: every HEAD path vs snapshots (exact path)

For each `.md` at current HEAD: whether the **same path** existed at end Mar22 / Mar23 / Mar24 (`Y` = yes, `-` = no).

| Path | Mar22 | Mar23 | Mar24 |
|------|-------|-------|-------|
| `.agent/.skills/README.md` | Y | Y | Y |
| `.agent/.skills/assumption-validation/SKILL.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/SKILL.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/asset_inventory.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/event_matrix.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/functional_story.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/io_registry.md` | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/physical_map.md` | Y | Y | Y |
| `.agent/.skills/coding-standards/SKILL.md` | Y | Y | Y |
| `.agent/.skills/dart-method/SKILL.md` | Y | Y | Y |
| `.agent/.skills/learning-protocol/SKILL.md` | Y | Y | Y |
| `.agent/.skills/prism-architect/SKILL.md` | Y | Y | Y |
| `.agent/.skills/trigger-matrix/SKILL.md` | Y | Y | Y |
| `.agent/.skills/visual-telemetry/SKILL.md` | Y | Y | Y |
| `.agent/AGENT.md` | Y | Y | Y |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-25.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-27.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-29.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-30.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-31.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-04-01.md` | - | - | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-04-02.md` | - | - | - |
| `.agent/WIP Work-In-Progress/KICKSTART_2026-03-30.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` | Y | Y | Y |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-25.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-27.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-29.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-30.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-31.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-04-01.md` | - | - | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-04-02.md` | - | - | - |
| `.agent/docs/_INDEX.md` | - | - | - |
| `.agent/docs/_archive/CURRENT_OBJECTIVE_archived.md` | - | - | - |
| `.agent/docs/_archive/CURRENT_SPRINT_archived.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` | - | - | - |
| `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` | - | - | - |
| `.agent/docs/_archive/MECHANICS_atlas_archived.md` | - | - | - |
| `.agent/docs/_archive/PRD_v3.1_archived.md` | - | - | - |
| `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md` | - | - | - |
| `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` | - | - | - |
| `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` | - | - | - |
| `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` | - | - | - |
| `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` | - | - | - |
| `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` | - | - | - |
| `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md` | - | - | - |
| `.agent/docs/_archive/investigations/travel-trace-1771364190214.md` | - | - | - |
| `.agent/docs/_archive/investigations/travel-trace-1771365220713.md` | - | - | - |
| `.agent/docs/_archive/investigations/travel-trace-1771365373383.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/AGENT.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GEOMETRY_CONSOLIDATION_ANALYSIS.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/action-platformer.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/adventure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-architecture.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-builder.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-compilation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-menu-patterns.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-metadata.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-plan.template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-spec-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architect.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/backlog-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/balance-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorm-context.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorming-coach.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brief-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/card-game.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/certification-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/checklist.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/compatibility-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/creative-problem-solver.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/critical-actions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/csv-data-file-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-instructions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/design-thinking-coach.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/documentation-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-01-load-existing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-02-discover-edits.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-04-sidecar-metadata.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-05-persona.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-06-commands-menu.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-07-activation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-08-edit-agent.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-09-celebrate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e2e-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/fighting.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/frontmatter-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/full-scan-instructions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-architect.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-brief-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-context.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-designer.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-dev.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-qa.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-scrum-master.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-solo-dev.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/gdd-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/godot-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/help.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/horror.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/idle-incremental.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/index-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/innovation-strategist.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-discovery-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions-narrative.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/intent-vs-prescriptive-spectrum.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/localization-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/menu-handling-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/metroidvania.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/minimal-output-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/moba.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-builder.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-help-generate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-yaml-conventions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/multiplayer-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/narrative-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/output-format-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/party-game.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/persona-properties.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtest-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtesting.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/presentation-master.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/principles-crafting.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-context-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-overview-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/puzzle.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/qa-automation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/racing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/regression-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rhythm.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/roguelike.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rpg.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sandbox.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/save-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/shooter.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/simulation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/smoke-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/source-tree-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sports.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-00-conversion.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-agent-loading.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-brainstorm.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discover.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discovery.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init-continuable-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-brief.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-target.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-mode-detection.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-session-setup.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-understand.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate-max-mode.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-welcome.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continuation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continue.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-classification.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context-gathering.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discovery.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discussion-orchestration.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-file-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-foundation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-frontmatter-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-generate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-investigate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-select-edit.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-spark.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-vision.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02a-user-selected.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-ai-recommended.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-path-violations.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02c-random-selection.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02d-progressive-flow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-apply-edit.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-config.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-execute.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-generate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-graceful-exit.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-ideation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-market.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-menu-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-type.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-yaml.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-platforms.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-requirements.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-sidecar-metadata.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-starter.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-story.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-technique-execution.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agent-specs.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agents.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-characters.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-decisions.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-fundamentals.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-idea-organization.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-persona.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-self-check.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-step-type-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-tools.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-vision.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-adversarial-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-commands-menu.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-confirm.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-core-gameplay.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-crosscutting.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-identity.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-output-format-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-plan-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-scope.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflow-specs.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflows.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-world.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-activation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-design.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-dialogue.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-docs.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-documentation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-mechanics.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-references.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-resolve-findings.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-users.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-validation-design-check.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-build-agent.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-content.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-environmental.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-foundation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-game-type.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-installation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-instruction-style-check.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-patterns.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-value.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-agents.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-build-step-01.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-celebrate.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-collaborative-experience-check.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-delivery.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-progression.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-report.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08b-subprocess-optimization.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-build-next-step.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-cohesive-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-integration.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-levels.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-workflows.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-art-audio.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-confirmation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-production.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-report-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-tools.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-completion.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-plan-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-scenarios.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-technical.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-creative.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-epics.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-metrics.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-finalize.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-1b-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-01-assess-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-02-discover-edits.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-03-fix-validation.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-04-direct-edit.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-05-apply-edit.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-06-validate-after.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-07-complete.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-file-rules.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-type-patterns.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/stories-told.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/story-preferences.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/storyteller.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/strategy.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/subprocess-optimization-patterns.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/survival.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-spec-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-writer.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-design-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-priorities.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-review-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/text-based.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tower-defense.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/trimodal-workflow-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/turn-based-tactics.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/understanding-agent-types.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unity-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unreal-testing.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-01-load-review.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02a-validate-metadata.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02b-validate-persona.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02c-validate-menu.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02d-validate-structure.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02e-validate-sidecar.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-03-summary.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/visual-novel.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-builder.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-chaining-standards.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-agent.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module-brief.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-agent.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-module.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-examples.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-rework-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-spec-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-template.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-type-criteria.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-agent.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-max-parallel-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-module.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md` | - | - | - |
| `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/yy-mm-dd-entry-template.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md` | - | - | - |
| `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md` | - | - | - |
| `.agent/docs/_review-reconcile/01-CANONICAL-CONTRACT.md` | - | - | - |
| `.agent/docs/_review-reconcile/02-UNIFIED-COMPILER.md` | - | - | - |
| `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md` | - | - | - |
| `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md` | - | - | - |
| `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md` | - | - | - |
| `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md` | - | - | - |
| `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` | - | - | - |
| `.agent/docs/_review-reconcile/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md` | - | - | - |
| `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan round 2.md` | - | - | - |
| `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan.md` | - | - | - |
| `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | - | - | - |
| `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md` | - | - | - |
| `.agent/docs/agentic/Agentic harness for Windows CLI.md` | - | - | - |
| `.agent/docs/agentic/ONBOARDING.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/active-settings-reference.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/animation-imperative.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/backwards-compat-effects.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/clickable-code-refs.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/css-grid-named-areas.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/debug-forensics-scope.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/docs-first-policy.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/dry-principles.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/engine-convergence.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/expose-tuning-variables.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/file-size-limits.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/fresh-start-debugging.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/git-branching.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/git-version-control.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/maximum-tuning.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/modularize-large-files.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/multiple-hypotheses.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/no-goalpost-moving.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/opposing-orders-rule.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/problem-solving-integrity.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/scaffold-first.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/scope-shared-functions.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/semantic-naming.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/session-documents.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/shared-engine-architecture.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/slider-reactivity.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/spec-compliance.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/task-queue-discipline.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/tech-stack.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/theme-versioning.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/use-bun-only.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/use-gametime-only.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/user-words-are-specs.md` | - | - | - |
| `.agent/docs/agentic/archive-memory/verify-ui-placement.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/browser-usage.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/document-everything.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/git-version-control.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/never-remove-user-controls.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/no-console-log.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/powershell-no-chain.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/semantic-naming.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/trigger-matrix.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/trust-user-feedback.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/verification-first.md` | - | - | - |
| `.agent/docs/agentic/archive-rules/verify-assumptions.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/01-methodology-review.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/README.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/prism-critique.md` | - | - | - |
| `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md` | - | - | - |
| `.agent/docs/agentic/context/architecture.md` | - | - | - |
| `.agent/docs/agentic/context/code-standards.md` | - | - | - |
| `.agent/docs/agentic/context/debugging.md` | - | - | - |
| `.agent/docs/agentic/context/game-design.md` | - | - | - |
| `.agent/docs/agentic/context/model-selection.md` | - | - | - |
| `.agent/docs/agentic/context/tech-gotchas.md` | - | - | - |
| `.agent/docs/agentic/context/ui-patterns.md` | - | - | - |
| `.agent/docs/agentic/context/workflow.md` | - | - | - |
| `.agent/docs/agentic/harness-perplexity/agent-harness-schema.md` | - | - | - |
| `.agent/docs/agentic/harness-perplexity/implementation-reference.md` | - | - | - |
| `.agent/docs/agentic/harness-perplexity/project-scaffold.md` | - | - | - |
| `.agent/docs/agentic/mental-models/2026-04-07 innovative_thinking.md` | - | - | - |
| `.agent/docs/agentic/mental-models/2026-04-07 master_debug_prompt.md` | - | - | - |
| `.agent/docs/agentic/mental-models/AI_mental_models_article.md` | - | - | - |
| `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md` | - | - | - |
| `.agent/docs/agentic/prompts/HEURISTIC_gold-mining-deep-ingestion.md` | - | - | - |
| `.agent/docs/atlas/00_PHYSICAL_MAP.md` | - | - | - |
| `.agent/docs/atlas/01_ASSET_INVENTORY.md` | - | - | - |
| `.agent/docs/atlas/02_IO_REGISTRY.md` | - | - | - |
| `.agent/docs/atlas/03_EVENT_MATRIX.md` | - | - | - |
| `.agent/docs/atlas/04_FUNCTIONAL_STORY.md` | - | - | - |
| `.agent/docs/atlas/DESIGN_RULES.md` | - | - | - |
| `.agent/docs/atlas/TERRITORY_SPEC.md` | - | - | - |
| `.agent/docs/engineering/NAMING_CONVENTIONS.md` | - | - | - |
| `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md` | - | - | - |
| `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md` | - | - | - |
| `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md` | - | - | - |
| `.agent/docs/engineering/tech-stack/TECH_STACK.md` | - | - | - |
| `.agent/docs/game/design/GAME_SPECIFICATION.md` | - | - | - |
| `.agent/docs/game/design/MECHANICS.md` | - | - | - |
| `.agent/docs/game/design/TERMINOLOGY.md` | - | - | - |
| `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md` | - | - | - |
| `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md` | - | - | - |
| `.agent/docs/game/territory/GEOMETRY_IMPLEMENTATION_STRATEGIES.md` | - | - | - |
| `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md` | - | - | - |
| `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` | - | - | - |
| `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` | - | - | - |
| `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md` | - | - | - |
| `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` | - | - | - |
| `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md` | - | - | - |
| `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md` | - | - | - |
| `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md` | - | - | - |
| `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md` | - | - | - |
| `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 1.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 2.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 3.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 1.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 2.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 3.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 1.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 2.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 1.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 2.md` | - | - | - |
| `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` | - | - | - |
| `.agent/docs/game/ui/CONTROLS.md` | - | - | - |
| `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md` | - | - | - |
| `.agent/docs/game/ui/WIP-UI/2026-03-02.md` | - | - | - |
| `.agent/docs/game/vfx/ANIMATION_GUIDE.md` | - | - | - |
| `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` | - | - | - |
| `.agent/docs/game/vfx/SURGE_ANIMATION.md` | - | - | - |
| `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md` | - | - | - |
| `.agent/docs/game/vfx/VFX_TIMING_MODEL.md` | - | - | - |
| `.agent/docs/game/visual/gdd/00_OVERVIEW.md` | - | - | - |
| `.agent/docs/game/visual/gdd/01_ANIMATIONS.md` | - | - | - |
| `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` | - | - | - |
| `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md` | - | - | - |
| `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md` | - | - | - |
| `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md` | - | - | - |
| `.agent/docs/plans/2026-03-31/territory-architecture-compact-outline.md` | - | - | - |
| `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md` | - | - | - |
| `.agent/docs/plans/2026-04-01/external-agent-codebase-package.md` | - | - | - |
| `.agent/docs/plans/2026-04-04/doc-review-architecture-docs.md` | - | - | - |
| `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md` | - | - | - |
| `.agent/docs/plans/PVV2_EXCAVATION_PLAN.md` | - | - | - |
| `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` | - | - | - |
| `.agent/docs/plans/REPORT_attack-defense-config-duplication.md` | - | - | - |
| `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md` | - | - | - |
| `.agent/docs/plans/REPORT_pax-galaxia-map-format.md` | - | - | - |
| `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md` | - | - | - |
| `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md` | - | - | - |
| `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md` | - | - | - |
| `.agent/docs/plans/Territory directives and specs 2026-03-08.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/00-PROJECT-OVERVIEW.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/00A-PHASE-0-AUDIT.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/01-PHASE-1-TYPES.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/02-PHASE-2-COMPILER-EMIT.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/03-PHASE-3-TRANSITION-PLANNER.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/04-PHASE-4-FRAME-SAMPLER.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/05-PHASE-5-PRESENTATION.md` | - | - | - |
| `.agent/docs/plans/frontier-topology/CODE-MAP.md` | - | - | - |
| `.agent/docs/plans/geometry-refactor/00-OVERVIEW.md` | - | - | - |
| `.agent/docs/plans/geometry-refactor/04-REFACTOR-CONSUMERS.md` | - | - | - |
| `.agent/docs/plans/geometry-refactor/05-QUARANTINE-AND-PURGE.md` | - | - | - |
| `.agent/docs/plans/geometry-refactor/COMPLETED_STEPS_SUMMARY.md` | - | - | - |
| `.agent/docs/plans/pax-fluxia-redesign.md` | - | - | - |
| `.agent/docs/project/DEVELOPMENT_HISTORY.md` | - | - | - |
| `.agent/docs/project/TERRITORY_PIPELINE_STATUS.md` | - | - | - |
| `.agent/docs/project/WORK_HISTORY.md` | - | - | - |
| `.agent/docs/project/decisions/DECISIONS.md` | - | - | - |
| `.agent/docs/project/decisions/DECISIONS_atlas.md` | - | - | - |
| `.agent/docs/project/features/FEATURE_IDEAS.md` | - | - | - |
| `.agent/docs/project/features/FEATURE_STATUS.md` | - | - | - |
| `.agent/docs/project/features/FEATURE_STATUS_atlas.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-07/deep-audit-territory-phased-plan.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-07/territory-pipeline-onboarding-notes.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-07/territory-transition-wip-notes.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/BRAINSTORMING_IDEAS_INDEX.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/APPROACH_EVIDENCE_SCORECARD.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CLAIMS_REGISTRY.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CONTRADICTION_REGISTER.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/INGESTION_LEDGER.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/TIMELINE_CANON.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/condensed/CONTEXT_CONDENSED.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/condensed/PLAN_CONDENSED.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/condensed/THINKING_CONDENSED.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_a.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/handoff_p0.md` | - | - | - |
| `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md` | - | - | - |
| `.agent/docs/project/open-questions/OPEN_QUESTIONS.md` | - | - | - |
| `.agent/docs/project/planning-docs-chronological-index.md` | - | - | - |
| `.agent/docs/project/post-mortems/POST_MORTEMS.md` | - | - | - |
| `.agent/docs/project/post-mortems/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md` | - | - | - |
| `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md` | - | - | - |
| `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md` | - | - | - |
| `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-01-commit-before-tweaks.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-01-responsive-design-failure.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-01-slider-reactivity-scope-failure.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-03-polygon-count-reasoning.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-03-renderers-called-every-frame.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/2026-03-17-planning-bias-geometry-vs-render.md` | - | - | - |
| `.agent/docs/project/post-mortems/atlas/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | - | - | - |
| `.agent/docs/project/process/2026-03-25__1018 PLANNING_DOCS_AUDIT.md` | - | - | - |
| `.agent/docs/project/process/2026-03-25__1247 DEEP_INGESTION_FINDINGS.md` | - | - | - |
| `.agent/docs/project/process/2026-03-25__1253 SECOND_PASS_ONTOLOGY_AND_INGESTION.md` | - | - | - |
| `.agent/docs/project/process/DEEP_PROCESSING_PLAN.md` | - | - | - |
| `.agent/docs/project/process/DEFECT_PREVENTION.md` | - | - | - |
| `.agent/docs/project/process/LESSONS_LEARNED.md` | - | - | - |
| `.agent/docs/project/process/MARKDOWN_FULL_MANIFEST_VS_HEAD.md` | - | - | - |
| `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md` | - | - | - |
| `.agent/docs/project/process/TRANCHE_A_FINDINGS.md` | - | - | - |
| `.agent/docs/project/process/TRANCHE_B_FINDINGS.md` | - | - | - |
| `.agent/docs/project/process/TRANCHE_C_FINDINGS.md` | - | - | - |
| `.agent/docs/project/process/TRANCHE_D_FINDINGS.md` | - | - | - |
| `.agent/docs/project/process/context-distillation-plan-2026-02-25.md` | - | - | - |
| `.agent/docs/project/process/post-mortem_2026-03-29-unauthorized-changes.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md` | - | - | - |
| `.agent/docs/project/sessions/chats/CHAT_2026-03-25.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-26_breadcrumb.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-17.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-03-25.md` | - | - | - |
| `.agent/docs/project/sessions/notes/SESSION_2026-04-08.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md` | - | - | - |
| `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md` | - | - | - |
| `.agent/docs/research/PRISM critique improvements 2026-02-18.md` | - | - | - |
| `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/D40_research_prompt.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/screenshots/README.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` | - | - | - |
| `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` | - | - | - |
| `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md` | - | - | - |
| `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md` | - | - | - |
| `.agent/docs/research/reference/legacy_app/README.md` | - | - | - |
| `.agent/docs/research/reference/legacy_app/screencapnotes.md` | - | - | - |
| `.agent/docs/research/reference/legacy_app/todo.md` | - | - | - |
| `.agent/docs/research/reference/research/3d pulse.md` | - | - | - |
| `.agent/docs/research/reference/research/circle-orb-effect.md` | - | - | - |
| `.agent/docs/research/reference/research/florin-pop pulse.md` | - | - | - |
| `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md` | Y | Y | Y |
| `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md` | Y | Y | Y |
| `.agent/rules/architectural-transfer-precheck.md` | Y | Y | Y |
| `.agent/rules/chat-first-response.md` | Y | Y | Y |
| `.agent/rules/debugging.md` | Y | Y | Y |
| `.agent/rules/document-everything.md` | Y | Y | Y |
| `.agent/rules/fill-equals-paint-bucket.md` | Y | Y | Y |
| `.agent/rules/git-version-control.md` | Y | Y | Y |
| `.agent/rules/hard-rules.md` | Y | Y | Y |
| `.agent/rules/information-vs-action.md` | - | - | - |
| `.agent/rules/logs-first.md` | Y | Y | Y |
| `.agent/rules/lossless-chat-documentation.md` | Y | Y | Y |
| `.agent/rules/no-duplicate-implementations.md` | Y | Y | Y |
| `.agent/rules/persist-user-data.md` | Y | Y | Y |
| `.agent/rules/planning-mode-enforcement.md` | - | - | - |
| `.agent/rules/powershell-no-chain.md` | Y | Y | Y |
| `.agent/rules/pre-flight.md` | Y | Y | Y |
| `.agent/rules/reflective-thinking.md` | Y | Y | Y |
| `.agent/rules/restore-whole-state.md` | Y | Y | Y |
| `.agent/rules/session-memory.md` | Y | Y | Y |
| `.agent/rules/slider-reactivity.md` | Y | Y | Y |
| `.agent/rules/trust-user-feedback.md` | Y | Y | Y |
| `.agent/rules/verification-first.md` | Y | Y | Y |
| `.agent/rules/verify-cli-output.md` | - | - | - |
| `.agent/rules/visual-bug-protocol.md` | Y | Y | Y |
| `.agent/workflows/git-diff.md` | Y | Y | Y |
| `.agent/workflows/read_website.md` | Y | Y | Y |
| `.agent/workflows/repo-multi-agent-concurrency-protocol.md` | Y | Y | Y |
| `.atlas/00_PHYSICAL_MAP.md` | Y | Y | Y |
| `.atlas/01_ASSET_INVENTORY.md` | Y | Y | Y |
| `.atlas/02_IO_REGISTRY.md` | Y | Y | Y |
| `.atlas/03_EVENT_MATRIX.md` | Y | Y | Y |
| `.atlas/04_FUNCTIONAL_STORY.md` | Y | Y | Y |
| `.atlas/DECISIONS.md` | Y | Y | Y |
| `.atlas/DESIGN_RULES.md` | Y | Y | Y |
| `.atlas/FEATURE_STATUS.md` | Y | Y | Y |
| `.atlas/MECHANICS.md` | Y | Y | Y |
| `.atlas/SPRINT_2026-03-30.md` | - | - | - |
| `.atlas/TERRITORY_SPEC.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-responsive-design-failure.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` | Y | Y | Y |
| `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` | Y | Y | Y |
| `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | Y | Y | Y |
| `.gemini/MEMORY/agent-context.md` | Y | Y | Y |
| `.gemini/MEMORY/git-branch-workflow.md` | Y | Y | Y |
| `README.md` | Y | Y | Y |
| `common/resources/reference/HSLA-color-standard.md` | Y | Y | Y |
| `common/resources/reference/Metaball Territories Architecture.md` | Y | Y | Y |
| `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md` | Y | Y | Y |
| `common/resources/reference/pax-galaxia-reddit.md` | Y | Y | Y |
| `common/resources/reference/territory-algorithms-voronoi.md` | Y | Y | Y |
| `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md` | Y | Y | Y |
| `pax-fluxia/.atlas/DECISIONS.md` | - | - | - |
| `pax-fluxia/.atlas/FEATURE_STATUS.md` | - | - | - |
| `pax-fluxia/.atlas/MAIN_MENU_V2_DESIGN.md` | - | - | - |
| `pax-fluxia/.atlas/MP_LOBBY_DESIGN.md` | - | - | - |
| `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md` | Y | Y | Y |
| `under_development/pax-fluxia-ui/README.md` | Y | Y | Y |

## Cross-index: every historical path (union of three snapshots) vs HEAD

Union of all `.md` paths that appear in **any** of the three snapshots (495 unique paths). `HEAD` = exact path at current HEAD; if `-`, check basename hints in sections above.

| Path | in 22 | in 23 | in 24 | at HEAD |
|------|-------|-------|-------|---------|
| `.agent/.skills/README.md` | Y | Y | Y | Y |
| `.agent/.skills/assumption-validation/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/asset_inventory.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/event_matrix.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/functional_story.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/io_registry.md` | Y | Y | Y | Y |
| `.agent/.skills/atlas-protocol/templates/physical_map.md` | Y | Y | Y | Y |
| `.agent/.skills/coding-standards/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/dart-method/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/learning-protocol/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/prism-architect/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/trigger-matrix/SKILL.md` | Y | Y | Y | Y |
| `.agent/.skills/visual-telemetry/SKILL.md` | Y | Y | Y | Y |
| `.agent/AGENT-GUIDE_MCP_atlas-harness.md` | - | Y | Y | - |
| `.agent/AGENT.md` | Y | Y | Y | Y |
| `.agent/CURRENT_OBJECTIVE.md` | - | Y | Y | - |
| `.agent/CURRENT_SPRINT.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/AI_mental_models_article.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/CONTROLS.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/MECHANICS.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/PRD_ACTIVE.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/SURGE_ANIMATION.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/TECH_STACK.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/TERRITORY_TRANSITION_INVENTORY.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/TRANSITION_SNAPSHOT_RECORDER_SPEC.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md` | - | Y | Y | - |
| `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md` | Y | Y | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_ATLAS.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2026-03-24.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 1.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 2.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 3.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 1.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 2.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 3.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 1.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 2.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 1.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 2.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan round 2.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/00-OVERVIEW.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/01-CANONICAL-CONTRACT.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/02-UNIFIED-COMPILER.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/03-ENFORCE-SINGLE-MODE.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/04-REFACTOR-CONSUMERS.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/geometry-refactor-plan/05-QUARANTINE-AND-PURGE.md` | - | - | Y | - |
| `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md` | - | Y | Y | - |
| `.agent/SYSTEM/Agentic harness for Windows CLI.md` | Y | Y | Y | - |
| `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md` | Y | Y | Y | - |
| `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md` | Y | Y | Y | - |
| `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md` | Y | Y | Y | - |
| `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/README.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md` | Y | Y | Y | - |
| `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md` | Y | Y | Y | - |
| `.agent/SYSTEM/context-distillation-plan-2026-02-25.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md` | - | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md` | - | Y | Y | - |
| `.agent/WIP Work-In-Progress/CHAT_2026-03-24.md` | - | - | Y | - |
| `.agent/WIP Work-In-Progress/DECISIONS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/FEATURE_STATUS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/POST_MORTEMS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md` | - | - | Y | - |
| `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` | Y | Y | Y | Y |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md` | - | Y | Y | - |
| `.agent/WIP Work-In-Progress/SESSION_2026-03-24.md` | - | - | Y | - |
| `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/UI/2026-03-02.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md` | Y | Y | Y | - |
| `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md` | Y | Y | Y | - |
| `.agent/_archive_memory/active-settings-reference.md` | Y | Y | Y | - |
| `.agent/_archive_memory/animation-imperative.md` | Y | Y | Y | - |
| `.agent/_archive_memory/ask-user-for-visuals.md` | Y | Y | Y | - |
| `.agent/_archive_memory/backwards-compat-effects.md` | Y | Y | Y | - |
| `.agent/_archive_memory/clickable-code-refs.md` | Y | Y | Y | - |
| `.agent/_archive_memory/collect-dont-rewrite.md` | Y | Y | Y | - |
| `.agent/_archive_memory/colyseus-module-resolution.md` | Y | Y | Y | - |
| `.agent/_archive_memory/css-grid-named-areas.md` | Y | Y | Y | - |
| `.agent/_archive_memory/debug-forensics-scope.md` | Y | Y | Y | - |
| `.agent/_archive_memory/deep-thinking-protocol.md` | Y | Y | Y | - |
| `.agent/_archive_memory/docs-first-policy.md` | Y | Y | Y | - |
| `.agent/_archive_memory/dry-principles.md` | Y | Y | Y | - |
| `.agent/_archive_memory/engine-convergence.md` | Y | Y | Y | - |
| `.agent/_archive_memory/exhaustive-reference-cleanup.md` | Y | Y | Y | - |
| `.agent/_archive_memory/expose-tuning-variables.md` | Y | Y | Y | - |
| `.agent/_archive_memory/file-size-limits.md` | Y | Y | Y | - |
| `.agent/_archive_memory/fresh-start-debugging.md` | Y | Y | Y | - |
| `.agent/_archive_memory/git-branching.md` | Y | Y | Y | - |
| `.agent/_archive_memory/git-version-control.md` | Y | Y | Y | - |
| `.agent/_archive_memory/mandatory-search-before-refactor.md` | Y | Y | Y | - |
| `.agent/_archive_memory/maximum-tuning.md` | Y | Y | Y | - |
| `.agent/_archive_memory/modularize-large-files.md` | Y | Y | Y | - |
| `.agent/_archive_memory/multiple-hypotheses.md` | Y | Y | Y | - |
| `.agent/_archive_memory/no-goalpost-moving.md` | Y | Y | Y | - |
| `.agent/_archive_memory/no-special-case-exceptions.md` | Y | Y | Y | - |
| `.agent/_archive_memory/opposing-orders-rule.md` | Y | Y | Y | - |
| `.agent/_archive_memory/pax-fluxia-gdd-context.md` | Y | Y | Y | - |
| `.agent/_archive_memory/pax-galaxia-vs-fluxia.md` | Y | Y | Y | - |
| `.agent/_archive_memory/problem-solving-integrity.md` | Y | Y | Y | - |
| `.agent/_archive_memory/repeated-instructions-tracker.md` | Y | Y | Y | - |
| `.agent/_archive_memory/scaffold-first.md` | Y | Y | Y | - |
| `.agent/_archive_memory/scope-shared-functions.md` | Y | Y | Y | - |
| `.agent/_archive_memory/semantic-naming.md` | Y | Y | Y | - |
| `.agent/_archive_memory/session-documents.md` | Y | Y | Y | - |
| `.agent/_archive_memory/shared-engine-architecture.md` | Y | Y | Y | - |
| `.agent/_archive_memory/slider-reactivity.md` | Y | Y | Y | - |
| `.agent/_archive_memory/spec-compliance.md` | Y | Y | Y | - |
| `.agent/_archive_memory/task-queue-discipline.md` | Y | Y | Y | - |
| `.agent/_archive_memory/tech-stack.md` | Y | Y | Y | - |
| `.agent/_archive_memory/theme-versioning.md` | Y | Y | Y | - |
| `.agent/_archive_memory/ui-dark-theme-contrast.md` | Y | Y | Y | - |
| `.agent/_archive_memory/use-bun-only.md` | Y | Y | Y | - |
| `.agent/_archive_memory/use-gametime-only.md` | Y | Y | Y | - |
| `.agent/_archive_memory/user-words-are-specs.md` | Y | Y | Y | - |
| `.agent/_archive_memory/verify-ui-placement.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/load-context.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md` | Y | Y | Y | - |
| `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md` | Y | Y | Y | - |
| `.agent/_archive_rules/browser-usage.md` | Y | Y | Y | - |
| `.agent/_archive_rules/document-everything.md` | Y | Y | Y | - |
| `.agent/_archive_rules/git-version-control.md` | Y | Y | Y | - |
| `.agent/_archive_rules/never-remove-user-controls.md` | Y | Y | Y | - |
| `.agent/_archive_rules/no-console-log.md` | Y | Y | Y | - |
| `.agent/_archive_rules/powershell-no-chain.md` | Y | Y | Y | - |
| `.agent/_archive_rules/semantic-naming.md` | Y | Y | Y | - |
| `.agent/_archive_rules/trigger-matrix.md` | Y | Y | Y | - |
| `.agent/_archive_rules/trust-user-feedback.md` | Y | Y | Y | - |
| `.agent/_archive_rules/verification-first.md` | Y | Y | Y | - |
| `.agent/_archive_rules/verify-assumptions.md` | Y | Y | Y | - |
| `.agent/context/architecture.md` | Y | Y | Y | - |
| `.agent/context/code-standards.md` | Y | Y | Y | - |
| `.agent/context/debugging.md` | Y | Y | Y | - |
| `.agent/context/game-design.md` | Y | Y | Y | - |
| `.agent/context/model-selection.md` | Y | Y | Y | - |
| `.agent/context/tech-gotchas.md` | Y | Y | Y | - |
| `.agent/context/ui-patterns.md` | Y | Y | Y | - |
| `.agent/context/workflow.md` | Y | Y | Y | - |
| `.agent/plans/pax-fluxia-redesign.md` | Y | Y | Y | - |
| `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md` | Y | Y | Y | - |
| `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md` | Y | Y | Y | Y |
| `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md` | Y | Y | Y | Y |
| `.agent/rules/architectural-transfer-precheck.md` | Y | Y | Y | Y |
| `.agent/rules/chat-first-response.md` | Y | Y | Y | Y |
| `.agent/rules/debugging.md` | Y | Y | Y | Y |
| `.agent/rules/document-everything.md` | Y | Y | Y | Y |
| `.agent/rules/dy4-sacrosanct.md` | Y | Y | - | - |
| `.agent/rules/fill-equals-paint-bucket.md` | Y | Y | Y | Y |
| `.agent/rules/git-version-control.md` | Y | Y | Y | Y |
| `.agent/rules/hard-rules.md` | Y | Y | Y | Y |
| `.agent/rules/logs-first.md` | Y | Y | Y | Y |
| `.agent/rules/lossless-chat-documentation.md` | Y | Y | Y | Y |
| `.agent/rules/no-duplicate-implementations.md` | Y | Y | Y | Y |
| `.agent/rules/persist-user-data.md` | Y | Y | Y | Y |
| `.agent/rules/powershell-no-chain.md` | Y | Y | Y | Y |
| `.agent/rules/pre-flight.md` | Y | Y | Y | Y |
| `.agent/rules/reflective-thinking.md` | Y | Y | Y | Y |
| `.agent/rules/restore-whole-state.md` | Y | Y | Y | Y |
| `.agent/rules/session-memory.md` | Y | Y | Y | Y |
| `.agent/rules/slider-reactivity.md` | Y | Y | Y | Y |
| `.agent/rules/trust-user-feedback.md` | Y | Y | Y | Y |
| `.agent/rules/verification-first.md` | Y | Y | Y | Y |
| `.agent/rules/visual-bug-protocol.md` | Y | Y | Y | Y |
| `.agent/sessions/2026-02-26_breadcrumb.md` | Y | Y | Y | - |
| `.agent/workflows/git-diff.md` | Y | Y | Y | Y |
| `.agent/workflows/read_website.md` | Y | Y | Y | Y |
| `.agent/workflows/repo-multi-agent-concurrency-protocol.md` | Y | Y | Y | Y |
| `.atlas/00_PHYSICAL_MAP.md` | Y | Y | Y | Y |
| `.atlas/01_ASSET_INVENTORY.md` | Y | Y | Y | Y |
| `.atlas/02_IO_REGISTRY.md` | Y | Y | Y | Y |
| `.atlas/03_EVENT_MATRIX.md` | Y | Y | Y | Y |
| `.atlas/04_FUNCTIONAL_STORY.md` | Y | Y | Y | Y |
| `.atlas/DECISIONS.md` | Y | Y | Y | Y |
| `.atlas/DESIGN_RULES.md` | Y | Y | Y | Y |
| `.atlas/FEATURE_STATUS.md` | Y | Y | Y | Y |
| `.atlas/MECHANICS.md` | Y | Y | Y | Y |
| `.atlas/TERRITORY_SPEC.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-responsive-design-failure.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md` | Y | Y | Y | Y |
| `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md` | Y | Y | Y | Y |
| `.gemini/MEMORY/agent-context.md` | Y | Y | Y | Y |
| `.gemini/MEMORY/git-branch-workflow.md` | Y | Y | Y | Y |
| `LESSONS_LEARNED.md` | Y | Y | Y | - |
| `ONBOARDING.md` | Y | Y | Y | - |
| `README.md` | Y | Y | Y | Y |
| `common/resources/reference/HSLA-color-standard.md` | Y | Y | Y | Y |
| `common/resources/reference/Metaball Territories Architecture.md` | Y | Y | Y | Y |
| `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md` | Y | Y | Y | Y |
| `common/resources/reference/pax-galaxia-reddit.md` | Y | Y | Y | Y |
| `common/resources/reference/territory-algorithms-voronoi.md` | Y | Y | Y | Y |
| `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md` | Y | Y | Y | Y |
| `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md` | Y | Y | Y | - |
| `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md` | Y | Y | Y | - |
| `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md` | Y | Y | Y | Y |
| `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` | Y | Y | Y | - |
| `reference/GDD/design-inspiration-landingpage.md` | Y | Y | Y | - |
| `reference/Pax_Galaxia_dev_notes_2026-02-08.md` | Y | Y | Y | - |
| `reference/legacy_app/README.md` | Y | Y | Y | - |
| `reference/legacy_app/screencapnotes.md` | Y | Y | Y | - |
| `reference/legacy_app/todo.md` | Y | Y | Y | - |
| `reference/research/3d pulse.md` | Y | Y | Y | - |
| `reference/research/circle-orb-effect.md` | Y | Y | Y | - |
| `reference/research/florin-pop pulse.md` | Y | Y | Y | - |
| `under_development/pax-fluxia-ui/README.md` | Y | Y | Y | Y |

## Full path lists (appendix)

### Current HEAD - 893 files

- `.agent/.skills/README.md`
- `.agent/.skills/assumption-validation/SKILL.md`
- `.agent/.skills/atlas-protocol/SKILL.md`
- `.agent/.skills/atlas-protocol/templates/asset_inventory.md`
- `.agent/.skills/atlas-protocol/templates/event_matrix.md`
- `.agent/.skills/atlas-protocol/templates/functional_story.md`
- `.agent/.skills/atlas-protocol/templates/io_registry.md`
- `.agent/.skills/atlas-protocol/templates/physical_map.md`
- `.agent/.skills/coding-standards/SKILL.md`
- `.agent/.skills/dart-method/SKILL.md`
- `.agent/.skills/learning-protocol/SKILL.md`
- `.agent/.skills/prism-architect/SKILL.md`
- `.agent/.skills/trigger-matrix/SKILL.md`
- `.agent/.skills/visual-telemetry/SKILL.md`
- `.agent/AGENT.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-25.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-29.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-30.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-31.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-04-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-04-02.md`
- `.agent/WIP Work-In-Progress/KICKSTART_2026-03-30.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-29.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-30.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-31.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-04-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-04-02.md`
- `.agent/docs/_INDEX.md`
- `.agent/docs/_archive/CURRENT_OBJECTIVE_archived.md`
- `.agent/docs/_archive/CURRENT_SPRINT_archived.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/docs/_archive/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/docs/_archive/MECHANICS_atlas_archived.md`
- `.agent/docs/_archive/PRD_v3.1_archived.md`
- `.agent/docs/_archive/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/docs/_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/docs/_archive/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/docs/_archive/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/docs/_archive/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/docs/_archive/investigations/travel-trace-1771364190214.md`
- `.agent/docs/_archive/investigations/travel-trace-1771365220713.md`
- `.agent/docs/_archive/investigations/travel-trace-1771365373383.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/README.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-02-26_breadcrumb.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-20 morph boundary vertices.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/AGENT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_OBJECTIVE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/CURRENT_SPRINT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/DECISIONS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_IDEAS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/FEATURE_STATUS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GAME_SPECIFICATION.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/MECHANICS.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/PRD_ACTIVE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/README.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TECH_STACK.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/action-platformer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/adventure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-architecture.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-compilation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-menu-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-plan.template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/agent-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architect.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/architecture.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/backlog-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/balance-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorm-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brainstorming-coach.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/brief-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/card-game.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/certification-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/checklist.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/code-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/compatibility-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/creative-problem-solver.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/critical-actions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/csv-data-file-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/deep-dive-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/design-thinking-coach.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/documentation-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/dy4-sacrosanct.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-01-load-existing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-02-discover-edits.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-04-sidecar-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-05-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-06-commands-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-07-activation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-08-edit-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e-09-celebrate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/e2e-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/fighting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/frontmatter-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/full-scan-instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-architect.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-brief-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-designer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-dev.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-qa.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-scrum-master.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/game-solo-dev.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/gdd-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/godot-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/help.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/horror.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/idle-incremental.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/index-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/innovation-strategist.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-discovery-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/input-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions-narrative.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/instructions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/intent-vs-prescriptive-spectrum.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/localization-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/menu-handling-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/metroidvania.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/minimal-output-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/moba.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-help-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/module-yaml-conventions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/multiplayer-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/narrative-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/output-format-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/party-game.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/performance-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/persona-properties.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtest-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/playtesting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/presentation-master.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/principles-crafting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-context-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/project-overview-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/puzzle.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/qa-automation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/racing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/regression-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rhythm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/roguelike.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/rpg.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sandbox.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/save-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/shooter.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/simulation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/smoke-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/source-tree-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/sports.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-00-conversion.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-agent-loading.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-brainstorm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discover.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-discovery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init-continuable-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-init.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-brief.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-load-target.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-mode-detection.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-session-setup.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-understand.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate-max-mode.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-validate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01-welcome.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continuation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-continue.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-01b-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-classification.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context-gathering.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-context.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discovery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-discussion-orchestration.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-file-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-foundation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-frontmatter-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-investigate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-select-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-spark.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02-vision.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02a-user-selected.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-ai-recommended.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02b-path-violations.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02c-random-selection.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-02d-progressive-flow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-apply-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-config.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-execute.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-generate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-graceful-exit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-ideation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-market.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-menu-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-type.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-module-yaml.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-platforms.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-requirements.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-sidecar-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-starter.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-story.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-03-technique-execution.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agent-specs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-agents.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-characters.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-decisions.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-fundamentals.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-idea-organization.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-self-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-step-type-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-tools.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-04-vision.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-adversarial-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-commands-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-confirm.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-core-gameplay.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-crosscutting.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-identity.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-output-format-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-plan-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-scope.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflow-specs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-workflows.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-05-world.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-activation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-design.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-dialogue.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-docs.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-documentation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-mechanics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-references.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-resolve-findings.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-users.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-06-validation-design-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-build-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-content.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-environmental.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-foundation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-game-type.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-installation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-instruction-style-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-07-value.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-agents.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-build-step-01.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-celebrate.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-collaborative-experience-check.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-delivery.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-progression.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-report.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-08b-subprocess-optimization.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-build-next-step.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-cohesive-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-integration.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-levels.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-09-workflows.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-art-audio.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-confirmation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-production.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-report-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-10-tools.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-completion.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-plan-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-scenarios.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-11-technical.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-creative.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-12-epics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-metrics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-13-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-14-finalize.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-1b-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-01-assess-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-02-discover-edits.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-03-fix-validation.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-04-direct-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-05-apply-edit.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-06-validate-after.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-e-07-complete.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-file-rules.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/step-type-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/stories-told.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/story-preferences.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/storyteller.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/strategy.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/subprocess-optimization-patterns.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/survival.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tech-writer.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-design-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-priorities.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/test-review-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/text-based.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/tower-defense.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/trimodal-workflow-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/turn-based-tactics.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/understanding-agent-types.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unity-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/unreal-testing.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-01-load-review.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02a-validate-metadata.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02b-validate-persona.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02c-validate-menu.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02d-validate-structure.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-02e-validate-sidecar.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/v-03-summary.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/visual-novel.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-builder.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-chaining-standards.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module-brief.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-create-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-edit-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-examples.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-rework-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-spec-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-template.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-type-criteria.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-agent.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-max-parallel-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-module.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow-validate-workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/workflow.md`
- `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/files/yy-mm-dd-entry-template.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_handoff_status_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/docs/_archive/territory-recovery-2026-03-08/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/docs/_review-reconcile/01-CANONICAL-CONTRACT.md`
- `.agent/docs/_review-reconcile/02-UNIFIED-COMPILER.md`
- `.agent/docs/_review-reconcile/03-ENFORCE-SINGLE-MODE.md`
- `.agent/docs/_review-reconcile/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/docs/_review-reconcile/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/docs/_review-reconcile/GEOMETRY_DATA_SHAPE.md`
- `.agent/docs/_review-reconcile/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan round 2.md`
- `.agent/docs/_review-reconcile/Perplexity 2026-03-24 new renderer contextual plan.md`
- `.agent/docs/_review-reconcile/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/docs/agentic/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/docs/agentic/Agentic harness for Windows CLI.md`
- `.agent/docs/agentic/ONBOARDING.md`
- `.agent/docs/agentic/archive-memory/active-settings-reference.md`
- `.agent/docs/agentic/archive-memory/animation-imperative.md`
- `.agent/docs/agentic/archive-memory/ask-user-for-visuals.md`
- `.agent/docs/agentic/archive-memory/backwards-compat-effects.md`
- `.agent/docs/agentic/archive-memory/clickable-code-refs.md`
- `.agent/docs/agentic/archive-memory/collect-dont-rewrite.md`
- `.agent/docs/agentic/archive-memory/colyseus-module-resolution.md`
- `.agent/docs/agentic/archive-memory/css-grid-named-areas.md`
- `.agent/docs/agentic/archive-memory/debug-forensics-scope.md`
- `.agent/docs/agentic/archive-memory/deep-thinking-protocol.md`
- `.agent/docs/agentic/archive-memory/docs-first-policy.md`
- `.agent/docs/agentic/archive-memory/dry-principles.md`
- `.agent/docs/agentic/archive-memory/engine-convergence.md`
- `.agent/docs/agentic/archive-memory/exhaustive-reference-cleanup.md`
- `.agent/docs/agentic/archive-memory/expose-tuning-variables.md`
- `.agent/docs/agentic/archive-memory/file-size-limits.md`
- `.agent/docs/agentic/archive-memory/fresh-start-debugging.md`
- `.agent/docs/agentic/archive-memory/git-branching.md`
- `.agent/docs/agentic/archive-memory/git-version-control.md`
- `.agent/docs/agentic/archive-memory/mandatory-search-before-refactor.md`
- `.agent/docs/agentic/archive-memory/maximum-tuning.md`
- `.agent/docs/agentic/archive-memory/modularize-large-files.md`
- `.agent/docs/agentic/archive-memory/multiple-hypotheses.md`
- `.agent/docs/agentic/archive-memory/no-goalpost-moving.md`
- `.agent/docs/agentic/archive-memory/no-special-case-exceptions.md`
- `.agent/docs/agentic/archive-memory/opposing-orders-rule.md`
- `.agent/docs/agentic/archive-memory/pax-fluxia-gdd-context.md`
- `.agent/docs/agentic/archive-memory/pax-galaxia-vs-fluxia.md`
- `.agent/docs/agentic/archive-memory/problem-solving-integrity.md`
- `.agent/docs/agentic/archive-memory/repeated-instructions-tracker.md`
- `.agent/docs/agentic/archive-memory/scaffold-first.md`
- `.agent/docs/agentic/archive-memory/scope-shared-functions.md`
- `.agent/docs/agentic/archive-memory/semantic-naming.md`
- `.agent/docs/agentic/archive-memory/session-documents.md`
- `.agent/docs/agentic/archive-memory/shared-engine-architecture.md`
- `.agent/docs/agentic/archive-memory/slider-reactivity.md`
- `.agent/docs/agentic/archive-memory/spec-compliance.md`
- `.agent/docs/agentic/archive-memory/task-queue-discipline.md`
- `.agent/docs/agentic/archive-memory/tech-stack.md`
- `.agent/docs/agentic/archive-memory/theme-versioning.md`
- `.agent/docs/agentic/archive-memory/ui-dark-theme-contrast.md`
- `.agent/docs/agentic/archive-memory/use-bun-only.md`
- `.agent/docs/agentic/archive-memory/use-gametime-only.md`
- `.agent/docs/agentic/archive-memory/user-words-are-specs.md`
- `.agent/docs/agentic/archive-memory/verify-ui-placement.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/browser-usage.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/load-context.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/model-selection.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/never-remove-user-controls.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-console-log.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/docs/agentic/archive-rules/2026-03-01-consolidated/verify-assumptions.md`
- `.agent/docs/agentic/archive-rules/browser-usage.md`
- `.agent/docs/agentic/archive-rules/document-everything.md`
- `.agent/docs/agentic/archive-rules/git-version-control.md`
- `.agent/docs/agentic/archive-rules/never-remove-user-controls.md`
- `.agent/docs/agentic/archive-rules/no-console-log.md`
- `.agent/docs/agentic/archive-rules/powershell-no-chain.md`
- `.agent/docs/agentic/archive-rules/semantic-naming.md`
- `.agent/docs/agentic/archive-rules/trigger-matrix.md`
- `.agent/docs/agentic/archive-rules/trust-user-feedback.md`
- `.agent/docs/agentic/archive-rules/verification-first.md`
- `.agent/docs/agentic/archive-rules/verify-assumptions.md`
- `.agent/docs/agentic/atlas-harness/01-methodology-review.md`
- `.agent/docs/agentic/atlas-harness/02-basic-harness-plan.md`
- `.agent/docs/agentic/atlas-harness/03-atlas-harness-plan.md`
- `.agent/docs/agentic/atlas-harness/04-perplexity-evaluation.md`
- `.agent/docs/agentic/atlas-harness/README.md`
- `.agent/docs/agentic/atlas-harness/reference/00-original-spec.md`
- `.agent/docs/agentic/atlas-harness/reference/agent-harness-schema.md`
- `.agent/docs/agentic/atlas-harness/reference/ai-mental-models.md`
- `.agent/docs/agentic/atlas-harness/reference/implementation-reference.md`
- `.agent/docs/agentic/atlas-harness/reference/prism-critique.md`
- `.agent/docs/agentic/atlas-harness/reference/project-scaffold.md`
- `.agent/docs/agentic/context/architecture.md`
- `.agent/docs/agentic/context/code-standards.md`
- `.agent/docs/agentic/context/debugging.md`
- `.agent/docs/agentic/context/game-design.md`
- `.agent/docs/agentic/context/model-selection.md`
- `.agent/docs/agentic/context/tech-gotchas.md`
- `.agent/docs/agentic/context/ui-patterns.md`
- `.agent/docs/agentic/context/workflow.md`
- `.agent/docs/agentic/harness-perplexity/agent-harness-schema.md`
- `.agent/docs/agentic/harness-perplexity/implementation-reference.md`
- `.agent/docs/agentic/harness-perplexity/project-scaffold.md`
- `.agent/docs/agentic/mental-models/2026-04-07 innovative_thinking.md`
- `.agent/docs/agentic/mental-models/2026-04-07 master_debug_prompt.md`
- `.agent/docs/agentic/mental-models/AI_mental_models_article.md`
- `.agent/docs/agentic/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/docs/agentic/prompts/HEURISTIC_gold-mining-deep-ingestion.md`
- `.agent/docs/atlas/00_PHYSICAL_MAP.md`
- `.agent/docs/atlas/01_ASSET_INVENTORY.md`
- `.agent/docs/atlas/02_IO_REGISTRY.md`
- `.agent/docs/atlas/03_EVENT_MATRIX.md`
- `.agent/docs/atlas/04_FUNCTIONAL_STORY.md`
- `.agent/docs/atlas/DESIGN_RULES.md`
- `.agent/docs/atlas/TERRITORY_SPEC.md`
- `.agent/docs/engineering/NAMING_CONVENTIONS.md`
- `.agent/docs/engineering/architecture/RENDERER_WIRING_PLAN.md`
- `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/docs/engineering/engine/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/docs/engineering/tech-stack/TECH_STACK.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/design/MECHANICS.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`
- `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`
- `.agent/docs/game/territory/GEOMETRY_IMPLEMENTATION_STRATEGIES.md`
- `.agent/docs/game/territory/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/docs/game/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/docs/game/territory/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/docs/game/territory/conquest-animation-archive/00_REQUIREMENTS.md`
- `.agent/docs/game/territory/conquest-animation-archive/01_ARCHITECTURE.md`
- `.agent/docs/game/territory/conquest-animation-archive/02_EVENT_MATRIX.md`
- `.agent/docs/game/territory/conquest-animation-archive/03_IMPLEMENTATION.md`
- `.agent/docs/game/territory/conquest-animation-archive/04_VERIFICATION.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_ATLAS.md`
- `.agent/docs/game/territory/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/docs/game/territory/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor code output round 3.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry refactor plan round 3.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review recommendations 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 1.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/Perplexity 2026-03-24 geometry review tranche 2.md`
- `.agent/docs/game/territory/geometry-atlas/_archive/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/docs/game/ui/CONTROLS.md`
- `.agent/docs/game/ui/WIP-UI/2026-02-19 UI main menu.md`
- `.agent/docs/game/ui/WIP-UI/2026-03-02.md`
- `.agent/docs/game/vfx/ANIMATION_GUIDE.md`
- `.agent/docs/game/vfx/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/docs/game/vfx/SURGE_ANIMATION.md`
- `.agent/docs/game/vfx/SURGE_ANIMATION_V2.md`
- `.agent/docs/game/vfx/VFX_TIMING_MODEL.md`
- `.agent/docs/game/visual/gdd/00_OVERVIEW.md`
- `.agent/docs/game/visual/gdd/01_ANIMATIONS.md`
- `.agent/docs/plans/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/docs/plans/2026-03-23 transition-interpolation-plan.md`
- `.agent/docs/plans/2026-03-31/UNIFIED_FILL_STROKE_PLAN.md`
- `.agent/docs/plans/2026-03-31/active-front-interpolation-transition-redesign.md`
- `.agent/docs/plans/2026-03-31/territory-architecture-compact-outline.md`
- `.agent/docs/plans/2026-03-31/territory-transition-external-research-brief.md`
- `.agent/docs/plans/2026-04-01/external-agent-codebase-package.md`
- `.agent/docs/plans/2026-04-04/doc-review-architecture-docs.md`
- `.agent/docs/plans/PROPOSAL_contour-territory-renderer.md`
- `.agent/docs/plans/PVV2_EXCAVATION_PLAN.md`
- `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md`
- `.agent/docs/plans/REPORT_attack-defense-config-duplication.md`
- `.agent/docs/plans/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/docs/plans/REPORT_pax-galaxia-map-format.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/docs/plans/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/docs/plans/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/docs/plans/Territory directives and specs 2026-03-08.md`
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
- `.agent/docs/plans/pax-fluxia-redesign.md`
- `.agent/docs/project/DEVELOPMENT_HISTORY.md`
- `.agent/docs/project/TERRITORY_PIPELINE_STATUS.md`
- `.agent/docs/project/WORK_HISTORY.md`
- `.agent/docs/project/decisions/DECISIONS.md`
- `.agent/docs/project/decisions/DECISIONS_atlas.md`
- `.agent/docs/project/features/FEATURE_IDEAS.md`
- `.agent/docs/project/features/FEATURE_STATUS.md`
- `.agent/docs/project/features/FEATURE_STATUS_atlas.md`
- `.agent/docs/project/implementation-plans/2026-04-07/deep-audit-territory-phased-plan.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-pipeline-onboarding-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-07/territory-transition-wip-notes.md`
- `.agent/docs/project/implementation-plans/2026-04-08/BRAINSTORMING_IDEAS_INDEX.md`
- `.agent/docs/project/implementation-plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/APPROACH_EVIDENCE_SCORECARD.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CLAIMS_REGISTRY.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/CONTRADICTION_REGISTER.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/INGESTION_LEDGER.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/README.md`
- `.agent/docs/project/implementation-plans/2026-04-08/artifacts_doc_a/TIMELINE_CANON.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/CONTEXT_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/PLAN_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/condensed/THINKING_CONDENSED.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_doc_a.md`
- `.agent/docs/project/implementation-plans/2026-04-08/handoff_p0.md`
- `.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`
- `.agent/docs/project/open-questions/OPEN_QUESTIONS.md`
- `.agent/docs/project/planning-docs-chronological-index.md`
- `.agent/docs/project/post-mortems/POST_MORTEMS.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/docs/project/post-mortems/POST_MORTEM_V2_CORRECTED.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-commit-before-tweaks.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-responsive-design-failure.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-01-slider-reactivity-scope-failure.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-03-polygon-count-reasoning.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-03-renderers-called-every-frame.md`
- `.agent/docs/project/post-mortems/atlas/2026-03-17-planning-bias-geometry-vs-render.md`
- `.agent/docs/project/post-mortems/atlas/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.agent/docs/project/process/2026-03-25__1018 PLANNING_DOCS_AUDIT.md`
- `.agent/docs/project/process/2026-03-25__1247 DEEP_INGESTION_FINDINGS.md`
- `.agent/docs/project/process/2026-03-25__1253 SECOND_PASS_ONTOLOGY_AND_INGESTION.md`
- `.agent/docs/project/process/DEEP_PROCESSING_PLAN.md`
- `.agent/docs/project/process/DEFECT_PREVENTION.md`
- `.agent/docs/project/process/LESSONS_LEARNED.md`
- `.agent/docs/project/process/MARKDOWN_FULL_MANIFEST_VS_HEAD.md`
- `.agent/docs/project/process/PROCESS_IMPROVEMENTS.md`
- `.agent/docs/project/process/TRANCHE_A_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_B_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_C_FINDINGS.md`
- `.agent/docs/project/process/TRANCHE_D_FINDINGS.md`
- `.agent/docs/project/process/context-distillation-plan-2026-02-25.md`
- `.agent/docs/project/process/post-mortem_2026-03-29-unauthorized-changes.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-27.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-02-28.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-01.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-07.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-08.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-10.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-12.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-14.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-15.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-15b.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-16.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-17.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-18.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-19.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-20.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-21.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-22.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-23.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-24.md`
- `.agent/docs/project/sessions/chats/CHAT_2026-03-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-17.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-19.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-26_breadcrumb.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-27.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-02-28.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-01.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-02.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-03.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-04.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-05.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-07.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-08.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-12.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-13.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-14.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-15.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-15b.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-16.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-17.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-18.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-19.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-20.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-21.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-22.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-23.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-24.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-03-25.md`
- `.agent/docs/project/sessions/notes/SESSION_2026-04-08.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity new transition guidance.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices v2.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 morph boundary vertices.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/docs/research/2026-03-20 transition research/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/docs/research/PRISM critique improvements 2026-02-18.md`
- `.agent/docs/research/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/docs/research/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/docs/research/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/docs/research/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/docs/research/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/docs/research/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/docs/research/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/docs/research/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/D40_research_prompt.md`
- `.agent/docs/research/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/docs/research/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/docs/research/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/docs/research/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/docs/research/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/docs/research/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/docs/research/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/docs/research/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/screenshots/README.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/docs/research/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/docs/research/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/docs/research/reference/GDD/design-inspiration-landingpage.md`
- `.agent/docs/research/reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `.agent/docs/research/reference/legacy_app/README.md`
- `.agent/docs/research/reference/legacy_app/screencapnotes.md`
- `.agent/docs/research/reference/legacy_app/todo.md`
- `.agent/docs/research/reference/research/3d pulse.md`
- `.agent/docs/research/reference/research/circle-orb-effect.md`
- `.agent/docs/research/reference/research/florin-pop pulse.md`
- `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md`
- `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md`
- `.agent/rules/architectural-transfer-precheck.md`
- `.agent/rules/chat-first-response.md`
- `.agent/rules/debugging.md`
- `.agent/rules/document-everything.md`
- `.agent/rules/fill-equals-paint-bucket.md`
- `.agent/rules/git-version-control.md`
- `.agent/rules/hard-rules.md`
- `.agent/rules/information-vs-action.md`
- `.agent/rules/logs-first.md`
- `.agent/rules/lossless-chat-documentation.md`
- `.agent/rules/no-duplicate-implementations.md`
- `.agent/rules/persist-user-data.md`
- `.agent/rules/planning-mode-enforcement.md`
- `.agent/rules/powershell-no-chain.md`
- `.agent/rules/pre-flight.md`
- `.agent/rules/reflective-thinking.md`
- `.agent/rules/restore-whole-state.md`
- `.agent/rules/session-memory.md`
- `.agent/rules/slider-reactivity.md`
- `.agent/rules/trust-user-feedback.md`
- `.agent/rules/verification-first.md`
- `.agent/rules/verify-cli-output.md`
- `.agent/rules/visual-bug-protocol.md`
- `.agent/workflows/git-diff.md`
- `.agent/workflows/read_website.md`
- `.agent/workflows/repo-multi-agent-concurrency-protocol.md`
- `.atlas/00_PHYSICAL_MAP.md`
- `.atlas/01_ASSET_INVENTORY.md`
- `.atlas/02_IO_REGISTRY.md`
- `.atlas/03_EVENT_MATRIX.md`
- `.atlas/04_FUNCTIONAL_STORY.md`
- `.atlas/DECISIONS.md`
- `.atlas/DESIGN_RULES.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`
- `.atlas/SPRINT_2026-03-30.md`
- `.atlas/TERRITORY_SPEC.md`
- `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md`
- `.atlas/post-mortems/2026-03-01-responsive-design-failure.md`
- `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.gemini/MEMORY/agent-context.md`
- `.gemini/MEMORY/git-branch-workflow.md`
- `README.md`
- `common/resources/reference/HSLA-color-standard.md`
- `common/resources/reference/Metaball Territories Architecture.md`
- `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md`
- `common/resources/reference/pax-galaxia-reddit.md`
- `common/resources/reference/territory-algorithms-voronoi.md`
- `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md`
- `pax-fluxia/.atlas/DECISIONS.md`
- `pax-fluxia/.atlas/FEATURE_STATUS.md`
- `pax-fluxia/.atlas/MAIN_MENU_V2_DESIGN.md`
- `pax-fluxia/.atlas/MP_LOBBY_DESIGN.md`
- `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md`
- `under_development/pax-fluxia-ui/README.md`

### End 2026-03-24 (c4a3076) - 494 files

- `.agent/.skills/README.md`
- `.agent/.skills/assumption-validation/SKILL.md`
- `.agent/.skills/atlas-protocol/SKILL.md`
- `.agent/.skills/atlas-protocol/templates/asset_inventory.md`
- `.agent/.skills/atlas-protocol/templates/event_matrix.md`
- `.agent/.skills/atlas-protocol/templates/functional_story.md`
- `.agent/.skills/atlas-protocol/templates/io_registry.md`
- `.agent/.skills/atlas-protocol/templates/physical_map.md`
- `.agent/.skills/coding-standards/SKILL.md`
- `.agent/.skills/dart-method/SKILL.md`
- `.agent/.skills/learning-protocol/SKILL.md`
- `.agent/.skills/prism-architect/SKILL.md`
- `.agent/.skills/trigger-matrix/SKILL.md`
- `.agent/.skills/visual-telemetry/SKILL.md`
- `.agent/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/AGENT.md`
- `.agent/CURRENT_OBJECTIVE.md`
- `.agent/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md`
- `.agent/SPECIFICATIONS/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md`
- `.agent/SPECIFICATIONS/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/SPECIFICATIONS/TRANSITION_SNAPSHOT_RECORDER_SPEC.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/2026-03-24 NotebookLM Migration Map Geometry Architecture Consolidation (v3.1).md`
- `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_ATLAS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/GEOMETRY_CONSOLIDATION_ANALYSIS.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2025-03-24 Perplexity part 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Geometry pipeline refactor 2026-03-24.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code agent detailed prompt.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor code output round 3.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry refactor plan round 3.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review recommendations 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 1.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 geometry review tranche 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan round 2.md`
- `.agent/SPECIFICATIONS/geometry-atlas/Perplexity 2026-03-24 new renderer contextual plan.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/00-OVERVIEW.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/01-CANONICAL-CONTRACT.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/02-UNIFIED-COMPILER.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/03-ENFORCE-SINGLE-MODE.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/04-REFACTOR-CONSUMERS.md`
- `.agent/SPECIFICATIONS/geometry-refactor-plan/05-QUARANTINE-AND-PURGE.md`
- `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-24.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_2026-03-24_FRONTIER_DEDUP.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-24.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md`
- `.agent/context/architecture.md`
- `.agent/context/code-standards.md`
- `.agent/context/debugging.md`
- `.agent/context/game-design.md`
- `.agent/context/model-selection.md`
- `.agent/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md`
- `.agent/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md`
- `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md`
- `.agent/rules/architectural-transfer-precheck.md`
- `.agent/rules/chat-first-response.md`
- `.agent/rules/debugging.md`
- `.agent/rules/document-everything.md`
- `.agent/rules/fill-equals-paint-bucket.md`
- `.agent/rules/git-version-control.md`
- `.agent/rules/hard-rules.md`
- `.agent/rules/logs-first.md`
- `.agent/rules/lossless-chat-documentation.md`
- `.agent/rules/no-duplicate-implementations.md`
- `.agent/rules/persist-user-data.md`
- `.agent/rules/powershell-no-chain.md`
- `.agent/rules/pre-flight.md`
- `.agent/rules/reflective-thinking.md`
- `.agent/rules/restore-whole-state.md`
- `.agent/rules/session-memory.md`
- `.agent/rules/slider-reactivity.md`
- `.agent/rules/trust-user-feedback.md`
- `.agent/rules/verification-first.md`
- `.agent/rules/visual-bug-protocol.md`
- `.agent/sessions/2026-02-26_breadcrumb.md`
- `.agent/workflows/git-diff.md`
- `.agent/workflows/read_website.md`
- `.agent/workflows/repo-multi-agent-concurrency-protocol.md`
- `.atlas/00_PHYSICAL_MAP.md`
- `.atlas/01_ASSET_INVENTORY.md`
- `.atlas/02_IO_REGISTRY.md`
- `.atlas/03_EVENT_MATRIX.md`
- `.atlas/04_FUNCTIONAL_STORY.md`
- `.atlas/DECISIONS.md`
- `.atlas/DESIGN_RULES.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`
- `.atlas/TERRITORY_SPEC.md`
- `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md`
- `.atlas/post-mortems/2026-03-01-responsive-design-failure.md`
- `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.gemini/MEMORY/agent-context.md`
- `.gemini/MEMORY/git-branch-workflow.md`
- `LESSONS_LEARNED.md`
- `ONBOARDING.md`
- `README.md`
- `common/resources/reference/HSLA-color-standard.md`
- `common/resources/reference/Metaball Territories Architecture.md`
- `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md`
- `common/resources/reference/pax-galaxia-reddit.md`
- `common/resources/reference/territory-algorithms-voronoi.md`
- `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md`
- `reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md`
- `reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md`
- `under_development/pax-fluxia-ui/README.md`

### End 2026-03-23 (ff5c3df) - 466 files

- `.agent/.skills/README.md`
- `.agent/.skills/assumption-validation/SKILL.md`
- `.agent/.skills/atlas-protocol/SKILL.md`
- `.agent/.skills/atlas-protocol/templates/asset_inventory.md`
- `.agent/.skills/atlas-protocol/templates/event_matrix.md`
- `.agent/.skills/atlas-protocol/templates/functional_story.md`
- `.agent/.skills/atlas-protocol/templates/io_registry.md`
- `.agent/.skills/atlas-protocol/templates/physical_map.md`
- `.agent/.skills/coding-standards/SKILL.md`
- `.agent/.skills/dart-method/SKILL.md`
- `.agent/.skills/learning-protocol/SKILL.md`
- `.agent/.skills/prism-architect/SKILL.md`
- `.agent/.skills/trigger-matrix/SKILL.md`
- `.agent/.skills/visual-telemetry/SKILL.md`
- `.agent/AGENT-GUIDE_MCP_atlas-harness.md`
- `.agent/AGENT.md`
- `.agent/CURRENT_OBJECTIVE.md`
- `.agent/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/2026-03-23 CDF-OT vertex and semantic frontier data PLAN.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/CONQUEST_ANIMATION_SPEC.md`
- `.agent/SPECIFICATIONS/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/GEOMETRY_DATA_SHAPE.md`
- `.agent/SPECIFICATIONS/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/PROJECT_ARCHITECTURE_GUIDING_PRINCIPLES.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00-PROJECT-OVERVIEW.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/00A-PHASE-0-AUDIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/01-PHASE-1-TYPES.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/02-PHASE-2-COMPILER-EMIT.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/03-PHASE-3-TRANSITION-PLANNER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/04-PHASE-4-FRAME-SAMPLER.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/05-PHASE-5-PRESENTATION.md`
- `.agent/SPECIFICATIONS/frontier-topology-project/CODE-MAP.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md`
- `.agent/SPECIFICATIONS/theory and explanations/OPTIMAL_TRANSPORT_BORDER_TRANSITIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/2026-03-23 transition-interpolation-plan.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-23.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-23.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md`
- `.agent/context/architecture.md`
- `.agent/context/code-standards.md`
- `.agent/context/debugging.md`
- `.agent/context/game-design.md`
- `.agent/context/model-selection.md`
- `.agent/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md`
- `.agent/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md`
- `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md`
- `.agent/rules/architectural-transfer-precheck.md`
- `.agent/rules/chat-first-response.md`
- `.agent/rules/debugging.md`
- `.agent/rules/document-everything.md`
- `.agent/rules/dy4-sacrosanct.md`
- `.agent/rules/fill-equals-paint-bucket.md`
- `.agent/rules/git-version-control.md`
- `.agent/rules/hard-rules.md`
- `.agent/rules/logs-first.md`
- `.agent/rules/lossless-chat-documentation.md`
- `.agent/rules/no-duplicate-implementations.md`
- `.agent/rules/persist-user-data.md`
- `.agent/rules/powershell-no-chain.md`
- `.agent/rules/pre-flight.md`
- `.agent/rules/reflective-thinking.md`
- `.agent/rules/restore-whole-state.md`
- `.agent/rules/session-memory.md`
- `.agent/rules/slider-reactivity.md`
- `.agent/rules/trust-user-feedback.md`
- `.agent/rules/verification-first.md`
- `.agent/rules/visual-bug-protocol.md`
- `.agent/sessions/2026-02-26_breadcrumb.md`
- `.agent/workflows/git-diff.md`
- `.agent/workflows/read_website.md`
- `.agent/workflows/repo-multi-agent-concurrency-protocol.md`
- `.atlas/00_PHYSICAL_MAP.md`
- `.atlas/01_ASSET_INVENTORY.md`
- `.atlas/02_IO_REGISTRY.md`
- `.atlas/03_EVENT_MATRIX.md`
- `.atlas/04_FUNCTIONAL_STORY.md`
- `.atlas/DECISIONS.md`
- `.atlas/DESIGN_RULES.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`
- `.atlas/TERRITORY_SPEC.md`
- `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md`
- `.atlas/post-mortems/2026-03-01-responsive-design-failure.md`
- `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.gemini/MEMORY/agent-context.md`
- `.gemini/MEMORY/git-branch-workflow.md`
- `LESSONS_LEARNED.md`
- `ONBOARDING.md`
- `README.md`
- `common/resources/reference/HSLA-color-standard.md`
- `common/resources/reference/Metaball Territories Architecture.md`
- `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md`
- `common/resources/reference/pax-galaxia-reddit.md`
- `common/resources/reference/territory-algorithms-voronoi.md`
- `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md`
- `reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md`
- `reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md`
- `under_development/pax-fluxia-ui/README.md`

### End 2026-03-22 (504bf64) - 447 files

- `.agent/.skills/README.md`
- `.agent/.skills/assumption-validation/SKILL.md`
- `.agent/.skills/atlas-protocol/SKILL.md`
- `.agent/.skills/atlas-protocol/templates/asset_inventory.md`
- `.agent/.skills/atlas-protocol/templates/event_matrix.md`
- `.agent/.skills/atlas-protocol/templates/functional_story.md`
- `.agent/.skills/atlas-protocol/templates/io_registry.md`
- `.agent/.skills/atlas-protocol/templates/physical_map.md`
- `.agent/.skills/coding-standards/SKILL.md`
- `.agent/.skills/dart-method/SKILL.md`
- `.agent/.skills/learning-protocol/SKILL.md`
- `.agent/.skills/prism-architect/SKILL.md`
- `.agent/.skills/trigger-matrix/SKILL.md`
- `.agent/.skills/visual-telemetry/SKILL.md`
- `.agent/AGENT.md`
- `.agent/CURRENT_SPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_ARCHITECTURE_INTEGRITY_AUDIT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_SYSTEM_AUDIT_MASTER.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_TECHNICAL_CANDIDATES_MATRIX.md`
- `.agent/SPECIFICATIONS/2026-03-22 Rendering refactor plan (Codex)/RENDERING_VISUAL_SPEC_GDD.md`
- `.agent/SPECIFICATIONS/AGENT_WORKTREE_COORDINATION_2026-03-21.md`
- `.agent/SPECIFICATIONS/AI_mental_models_article.md`
- `.agent/SPECIFICATIONS/ANIMATION_GUIDE.md`
- `.agent/SPECIFICATIONS/CONTROLS.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_CURRENT.md`
- `.agent/SPECIFICATIONS/ENGINE_ARCHITECTURE_TARGET.md`
- `.agent/SPECIFICATIONS/FX_ANIMATION_ARCHITECTURE_PROPOSAL.md`
- `.agent/SPECIFICATIONS/GAME_SPECIFICATION.md`
- `.agent/SPECIFICATIONS/MECHANICS.md`
- `.agent/SPECIFICATIONS/PRD_ACTIVE.md`
- `.agent/SPECIFICATIONS/RENDERER_WIRING_PLAN.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION.md`
- `.agent/SPECIFICATIONS/SURGE_ANIMATION_V2.md`
- `.agent/SPECIFICATIONS/TECH_STACK.md`
- `.agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md`
- `.agent/SPECIFICATIONS/TERRITORY_CLEAN_ARCHITECTURE_COMPLETION_STATUS_2026-03-21.md`
- `.agent/SPECIFICATIONS/VFX_TIMING_MODEL.md`
- `.agent/SPECIFICATIONS/gdd/00_OVERVIEW.md`
- `.agent/SPECIFICATIONS/gdd/01_ANIMATIONS.md`
- `.agent/SYSTEM/Agentic harness for Windows CLI.md`
- `.agent/SYSTEM/PRISM critique improvements 2026-02-18.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/agent-harness-schema.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/implementation-reference.md`
- `.agent/SYSTEM/Perplexity created Agentic Harness 2026-03-09/project-scaffold.md`
- `.agent/SYSTEM/atlas-harness-project/01-methodology-review.md`
- `.agent/SYSTEM/atlas-harness-project/02-basic-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/03-atlas-harness-plan.md`
- `.agent/SYSTEM/atlas-harness-project/04-perplexity-evaluation.md`
- `.agent/SYSTEM/atlas-harness-project/README.md`
- `.agent/SYSTEM/atlas-harness-project/reference/00-original-spec.md`
- `.agent/SYSTEM/atlas-harness-project/reference/agent-harness-schema.md`
- `.agent/SYSTEM/atlas-harness-project/reference/ai-mental-models.md`
- `.agent/SYSTEM/atlas-harness-project/reference/implementation-reference.md`
- `.agent/SYSTEM/atlas-harness-project/reference/prism-critique.md`
- `.agent/SYSTEM/atlas-harness-project/reference/project-scaffold.md`
- `.agent/SYSTEM/context-distillation-plan-2026-02-25.md`
- `.agent/WIP Work-In-Progress/2026-03-20 F-165 virtual-star-position-lerp.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity new transition guidance.md`
- `.agent/WIP Work-In-Progress/2026-03-20 Perplexity renderPowerVoronoi.md`
- `.agent/WIP Work-In-Progress/2026-03-20 canonical-boundary-implementation-plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2 implementation plan.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices v2.md`
- `.agent/WIP Work-In-Progress/2026-03-20 morph boundary vertices.md`
- `.agent/WIP Work-In-Progress/2026-03-20 novel-transition-solutions-prompt.md`
- `.agent/WIP Work-In-Progress/2026-03-20__1031 morph-even-distribution-algorithm.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-27.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-02-28.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-01.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-07.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-08.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-10.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-12.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-14.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-16.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-17.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-18.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-19.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-20.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-21.md`
- `.agent/WIP Work-In-Progress/CHAT_2026-03-22.md`
- `.agent/WIP Work-In-Progress/DECISIONS.md`
- `.agent/WIP Work-In-Progress/DEFECT_PREVENTION.md`
- `.agent/WIP Work-In-Progress/DEVELOPMENT_HISTORY.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/6th-approach.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/APPROACH_COMPARISON.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/CORRECTIONS_GROUND_TRUTH.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/DISCONNECT_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/Deep technical guidance.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND3.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/FEEDBACK_ROUND4.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/PIPELINE_DESIGN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG part 2.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/TERRITORY_SHADER_DEBUG.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/V2_IMPLEMENTATION_PLAN.md`
- `.agent/WIP Work-In-Progress/F-138-ModifiedVoronoi/VISUAL_ASSESSMENT.md`
- `.agent/WIP Work-In-Progress/FEATURE_IDEAS.md`
- `.agent/WIP Work-In-Progress/FEATURE_STATUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEMS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_ANIMATION_SPEED.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V1_FALLACIOUS.md`
- `.agent/WIP Work-In-Progress/POST_MORTEM_V2_CORRECTED.md`
- `.agent/WIP Work-In-Progress/PROCESS_IMPROVEMENTS.md`
- `.agent/WIP Work-In-Progress/SEMANTIC_RENAME_PROPOSAL.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-25.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-26.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-27.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-02-28.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-01.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-02.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-03.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-04.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-05.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-07.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-08.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-12.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-13.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-14.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-15b.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-16.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-18.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-19.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-20.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-21.md`
- `.agent/WIP Work-In-Progress/SESSION_2026-03-22.md`
- `.agent/WIP Work-In-Progress/UI/2026-02-19 UI main menu.md`
- `.agent/WIP Work-In-Progress/UI/2026-03-02.md`
- `.agent/WIP Work-In-Progress/conquest-animation/00_REQUIREMENTS.md`
- `.agent/WIP Work-In-Progress/conquest-animation/01_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/conquest-animation/02_EVENT_MATRIX.md`
- `.agent/WIP Work-In-Progress/conquest-animation/03_IMPLEMENTATION.md`
- `.agent/WIP Work-In-Progress/conquest-animation/04_VERIFICATION.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/00_README_PIPELINE_TRACE.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs 2.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/2026-03-17 console logs.md`
- `.agent/WIP Work-In-Progress/diagnostics/border-fill-mismatch/IMPLEMENTATION_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1 copy.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/2026-02-14_colyseus-4002-seat-reservation_SOLV1.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/IMMEDIATE_ACTION.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/QUICK_REFERENCE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SEARCH_PATTERNS.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/SOLUTION_SUMMARY.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_colyseus-4002-seat-reservation/START_HERE.md`
- `.agent/WIP Work-In-Progress/investigations/2026-02-14_combat-mechanics-forensic.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771364190214.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365220713.md`
- `.agent/WIP Work-In-Progress/investigations/travel-trace-1771365373383.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/atlas_harness_first_user_review_for_architect_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/16-chunk recovery DF rendering 2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-12 Perplexity Maximum options for unified frontier generation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1339 territory_engine_v3_analysis_and_questions.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-15__1435 territory_engine_master_plan_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (NotebookLM) Analytical Lane Split Implementation Logic.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity from NotebookLM) LEGACY_fg2SeedGraph_EXTRACTION_COMPANION.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) NEW MASTER ARCHITECTURE Territory Geometry & Rendering PRD.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/2026-03-16 (Perplexity) Territory System Intent.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/CONSTRAINT_ARCHITECTURE_ANALYSIS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/ARCHITECTURE_README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/COMPILER_CONTRACTS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/LEGACY_QUARANTINE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/MASTER_TERRITORY_ARCHITECTURE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16 render architecture update V2/Perplexity Plan V3 xyz/RENDER_AND_TRANSITIONS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-16__1202 CANONICAL_DATA_DIRECTIVE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/2026-03-18__1245_dy4_comparison_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Canonical Border Perf Lock Plan.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Codex border failure analysis 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/D40_research_prompt.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/FRONTIER_ALGORITHM_ANALYSIS_v5.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v1.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v3.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v4_frontier_fills.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/IMPLEMENTATION_DIRECTIVE_v5_frontier_animation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/PVV2 Frontier-Track Plan 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia standalone territory spec and research prompt 2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Pax Fluxia strategic plan, Perplexity 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity explainer renderer and borders 2026-03-09.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-03.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity territory renderer architecture 2026-03-04.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Perplexity voronoi render questions and plan 2026-02-24.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/Power Voronoi V3 Region-Graph Plan (Codex).md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/RED_TEAM_conquest_star_matching.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/TERRITORY_REFERENCE_INDEX_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/canonical_frontier_wiring_handoff_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/screenshots/README.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_15_mode_plan_review_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_animated_hole_carryover_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_epic_step1_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_face_walk_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_junctions_and_face_resolution_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_global_shell_and_hole_correspondence_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_halfedge_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_loop_face_classification_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_region_loops_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_owner_shell_synthesis_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_shell_playback_interpolation_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_anchor_fallbacks_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_transition_trace_inspector_2026-03-13.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_fg2_world_perimeter_closure_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/00_INDEX_AND_READING_ORDER.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/02_GLOSSARY_AND_MENTAL_MODEL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/03_ARCHITECT_REVIEW_V2.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/04_CURRENT_STATE_MATRIX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/05_VALIDATION_AND_DEMO_PROTOCOL.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/DF_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV2_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/backends/PVV3_backend.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_01_foundation_and_contracts.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_02_static_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_03_dynamic_methods.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_04_hybrid_orchestration.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/epics/EPIC_05_backends_diagnostics_and_validation.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY1_span_graph_morph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY2_local_delta_patch.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY3_field_interp_stabilized.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY4_optimal_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/DY5_corridor_event_decomposition.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG1_adaptive_field.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG2_seed_graph.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG3_implicit_trace.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG4_pairwise_arrangement.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/FG5_rt_assisted_publish.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY1_static_backbone_dynamic_refine.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY2_seed_graph_local_delta.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY3_implicit_field_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY4_pairwise_patch_transport.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/modes/HY5_rt_publish_corridor_events.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_INDEX.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_master_plan_v2_2026-03-13/tasks/TASK_PACKET_TEMPLATE.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_native_stage_dispatch_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_engine_trace_inspector_2026-03-12.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/permanent-references/territory/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/WIP Work-In-Progress/proposals/PROPOSAL_contour-territory-renderer.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_attack-defense-config-duplication.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_mobile-ui-issues-2026-03-01.md`
- `.agent/WIP Work-In-Progress/proposals/REPORT_pax-galaxia-map-format.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex V2.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY PLAN 2026-03-08 Codex.md`
- `.agent/WIP Work-In-Progress/proposals/TERRITORY_ARCHITECTURE_v3.md`
- `.agent/WIP Work-In-Progress/proposals/Territory directives and specs 2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_geometry_pipeline_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step1_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step2_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step3_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step4_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step5_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_border_quality_recovery_step6_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_handoff_status_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_refactor_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_pipeline_unified_alignment_perf_morph_plan_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_07_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunk_08_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_01_04_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_chunks_05_06_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_emergency_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_mesh_exposure_perf_hotfix_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_recovery_phase1_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_renderer_rearchitecture_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_stage2a_scaffold_note_2026-03-08.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageA_step1_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageB_step2_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step3_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageC_step4_2026-03-07.md`
- `.agent/WIP Work-In-Progress/territory_v1_hybrid_stageD_step5_2026-03-07.md`
- `.agent/_archive_memory/active-settings-reference.md`
- `.agent/_archive_memory/animation-imperative.md`
- `.agent/_archive_memory/ask-user-for-visuals.md`
- `.agent/_archive_memory/backwards-compat-effects.md`
- `.agent/_archive_memory/clickable-code-refs.md`
- `.agent/_archive_memory/collect-dont-rewrite.md`
- `.agent/_archive_memory/colyseus-module-resolution.md`
- `.agent/_archive_memory/css-grid-named-areas.md`
- `.agent/_archive_memory/debug-forensics-scope.md`
- `.agent/_archive_memory/deep-thinking-protocol.md`
- `.agent/_archive_memory/docs-first-policy.md`
- `.agent/_archive_memory/dry-principles.md`
- `.agent/_archive_memory/engine-convergence.md`
- `.agent/_archive_memory/exhaustive-reference-cleanup.md`
- `.agent/_archive_memory/expose-tuning-variables.md`
- `.agent/_archive_memory/file-size-limits.md`
- `.agent/_archive_memory/fresh-start-debugging.md`
- `.agent/_archive_memory/git-branching.md`
- `.agent/_archive_memory/git-version-control.md`
- `.agent/_archive_memory/mandatory-search-before-refactor.md`
- `.agent/_archive_memory/maximum-tuning.md`
- `.agent/_archive_memory/modularize-large-files.md`
- `.agent/_archive_memory/multiple-hypotheses.md`
- `.agent/_archive_memory/no-goalpost-moving.md`
- `.agent/_archive_memory/no-special-case-exceptions.md`
- `.agent/_archive_memory/opposing-orders-rule.md`
- `.agent/_archive_memory/pax-fluxia-gdd-context.md`
- `.agent/_archive_memory/pax-galaxia-vs-fluxia.md`
- `.agent/_archive_memory/problem-solving-integrity.md`
- `.agent/_archive_memory/repeated-instructions-tracker.md`
- `.agent/_archive_memory/scaffold-first.md`
- `.agent/_archive_memory/scope-shared-functions.md`
- `.agent/_archive_memory/semantic-naming.md`
- `.agent/_archive_memory/session-documents.md`
- `.agent/_archive_memory/shared-engine-architecture.md`
- `.agent/_archive_memory/slider-reactivity.md`
- `.agent/_archive_memory/spec-compliance.md`
- `.agent/_archive_memory/task-queue-discipline.md`
- `.agent/_archive_memory/tech-stack.md`
- `.agent/_archive_memory/theme-versioning.md`
- `.agent/_archive_memory/ui-dark-theme-contrast.md`
- `.agent/_archive_memory/use-bun-only.md`
- `.agent/_archive_memory/use-gametime-only.md`
- `.agent/_archive_memory/user-words-are-specs.md`
- `.agent/_archive_memory/verify-ui-placement.md`
- `.agent/_archive_rules/2026-03-01-consolidated/browser-usage.md`
- `.agent/_archive_rules/2026-03-01-consolidated/git-and-shell.md`
- `.agent/_archive_rules/2026-03-01-consolidated/load-context.md`
- `.agent/_archive_rules/2026-03-01-consolidated/model-selection.md`
- `.agent/_archive_rules/2026-03-01-consolidated/never-remove-user-controls.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-console-log.md`
- `.agent/_archive_rules/2026-03-01-consolidated/no-guessing.md`
- `.agent/_archive_rules/2026-03-01-consolidated/post-mortem-process.md`
- `.agent/_archive_rules/2026-03-01-consolidated/semantic-naming.md`
- `.agent/_archive_rules/2026-03-01-consolidated/tech-stack-docs.md`
- `.agent/_archive_rules/2026-03-01-consolidated/verify-assumptions.md`
- `.agent/_archive_rules/browser-usage.md`
- `.agent/_archive_rules/document-everything.md`
- `.agent/_archive_rules/git-version-control.md`
- `.agent/_archive_rules/never-remove-user-controls.md`
- `.agent/_archive_rules/no-console-log.md`
- `.agent/_archive_rules/powershell-no-chain.md`
- `.agent/_archive_rules/semantic-naming.md`
- `.agent/_archive_rules/trigger-matrix.md`
- `.agent/_archive_rules/trust-user-feedback.md`
- `.agent/_archive_rules/verification-first.md`
- `.agent/_archive_rules/verify-assumptions.md`
- `.agent/context/architecture.md`
- `.agent/context/code-standards.md`
- `.agent/context/debugging.md`
- `.agent/context/game-design.md`
- `.agent/context/model-selection.md`
- `.agent/context/tech-gotchas.md`
- `.agent/context/ui-patterns.md`
- `.agent/context/workflow.md`
- `.agent/plans/pax-fluxia-redesign.md`
- `.agent/prompts/GEOMETRY_0319_AGENT_PROMPT.md`
- `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md`
- `.agent/rules/2026-03-19 territory-pipeline-three-concerns.md`
- `.agent/rules/architectural-transfer-precheck.md`
- `.agent/rules/chat-first-response.md`
- `.agent/rules/debugging.md`
- `.agent/rules/document-everything.md`
- `.agent/rules/dy4-sacrosanct.md`
- `.agent/rules/fill-equals-paint-bucket.md`
- `.agent/rules/git-version-control.md`
- `.agent/rules/hard-rules.md`
- `.agent/rules/logs-first.md`
- `.agent/rules/lossless-chat-documentation.md`
- `.agent/rules/no-duplicate-implementations.md`
- `.agent/rules/persist-user-data.md`
- `.agent/rules/powershell-no-chain.md`
- `.agent/rules/pre-flight.md`
- `.agent/rules/reflective-thinking.md`
- `.agent/rules/restore-whole-state.md`
- `.agent/rules/session-memory.md`
- `.agent/rules/slider-reactivity.md`
- `.agent/rules/trust-user-feedback.md`
- `.agent/rules/verification-first.md`
- `.agent/rules/visual-bug-protocol.md`
- `.agent/sessions/2026-02-26_breadcrumb.md`
- `.agent/workflows/git-diff.md`
- `.agent/workflows/read_website.md`
- `.agent/workflows/repo-multi-agent-concurrency-protocol.md`
- `.atlas/00_PHYSICAL_MAP.md`
- `.atlas/01_ASSET_INVENTORY.md`
- `.atlas/02_IO_REGISTRY.md`
- `.atlas/03_EVENT_MATRIX.md`
- `.atlas/04_FUNCTIONAL_STORY.md`
- `.atlas/DECISIONS.md`
- `.atlas/DESIGN_RULES.md`
- `.atlas/FEATURE_STATUS.md`
- `.atlas/MECHANICS.md`
- `.atlas/TERRITORY_SPEC.md`
- `.atlas/post-mortems/2026-03-01-commit-before-tweaks.md`
- `.atlas/post-mortems/2026-03-01-responsive-design-failure.md`
- `.atlas/post-mortems/2026-03-01-slider-reactivity-scope-failure.md`
- `.atlas/post-mortems/2026-03-03-polygon-count-reasoning.md`
- `.atlas/post-mortems/2026-03-03-renderers-called-every-frame.md`
- `.atlas/post-mortems/2026-03-17-planning-bias-geometry-vs-render.md`
- `.atlas/post-mortems/post-mortem_2026-03-10-dx-fill-wrong-owner.md`
- `.gemini/MEMORY/agent-context.md`
- `.gemini/MEMORY/git-branch-workflow.md`
- `LESSONS_LEARNED.md`
- `ONBOARDING.md`
- `README.md`
- `common/resources/reference/HSLA-color-standard.md`
- `common/resources/reference/Metaball Territories Architecture.md`
- `common/resources/reference/Svelte 5 + Pixi Dynamic Territories Architecture.md`
- `common/resources/reference/pax-galaxia-reddit.md`
- `common/resources/reference/territory-algorithms-voronoi.md`
- `common/resources/settings-themes/pax-config-2026-02-17T23-41-18 keeper, streaming ships.md`
- `docs/territory/TERRITORY_1_DF_SPEC_LOCKED_COMPLETION_PLAN.md`
- `pax-fluxia/.agent/WIP Work-In-Progress/SESSION_2026-03-17.md`
- `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md`
- `pax-fluxia/src/lib/territory/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md`
- `reference/GDD/design-inspiration-landingpage.md`
- `reference/Pax_Galaxia_dev_notes_2026-02-08.md`
- `reference/legacy_app/README.md`
- `reference/legacy_app/screencapnotes.md`
- `reference/legacy_app/todo.md`
- `reference/research/3d pulse.md`
- `reference/research/circle-orb-effect.md`
- `reference/research/florin-pop pulse.md`
- `under_development/pax-fluxia-ui/README.md`

