# docs/ — Master Index (Ontology E)
**Updated:** 2026-03-25 (reorganization pass 2)
**Structure:** Game System + Meta

---

## game/
| Path | Contents |
|------|----------|
| `game/design/` | GAME_SPECIFICATION, MECHANICS, PRD_ACTIVE, MECHANICS_atlas (duplicate for reconciliation) |
| `game/territory/` | TERRITORY_ARCHITECTURE, TERRITORY_TRANSITION_INVENTORY, CONQUEST_ANIMATION_SPEC, TRANSITION_SNAPSHOT_RECORDER, **geometry-atlas/** (GEOMETRY_ATLAS, GEOMETRY_CONSOLIDATION_ANALYSIS, refactor plan, _archive/, code/), conquest-animation-archive/ |
| `game/vfx/` | ANIMATION_GUIDE, SURGE_ANIMATION, SURGE_ANIMATION_V2, VFX_TIMING_MODEL, FX_ANIMATION_ARCHITECTURE_PROPOSAL |
| `game/ui/` | CONTROLS, WIP-UI/ |
| `game/visual/` | gdd/ (00_OVERVIEW, 01_ANIMATIONS) |
| `game/combat/` | *(empty — ship lifecycle specs not yet authored)* |
| `game/map/` | *(empty — stars/lanes specs not yet authored)* |
| `game/audio/` | *(empty — see engineering/engine for audio manager)* |
| `game/theming/` | *(empty — theming docs in source: `src/lib/config/THEMES_AGENT_DOC.md`)* |

## engineering/
| Path | Contents |
|------|----------|
| `engineering/architecture/` | RENDERER_WIRING_PLAN |
| `engineering/engine/` | ENGINE_ARCHITECTURE_CURRENT, ENGINE_ARCHITECTURE_TARGET |
| `engineering/tech-stack/` | TECH_STACK |

## agentic/
| Path | Contents |
|------|----------|
| `agentic/prompts/` | HEURISTIC_gold-mining, Agent Council V2.1, GEOMETRY_0319_AGENT_PROMPT |
| `agentic/context/` | architecture, code-standards, debugging, game-design, model-selection, tech-gotchas, ui-patterns, workflow |
| `agentic/mental-models/` | AI_mental_models_article, OPTIMAL_TRANSPORT_BORDER_TRANSITIONS |
| `agentic/atlas-harness/` | atlas-harness project docs (01–04, README, reference/) |
| `agentic/harness-perplexity/` | Perplexity-generated agentic harness plans |
| `agentic/archive-memory/` | 45 legacy agent memory fragments (from `_archive_memory/`) |
| `agentic/` (root) | ONBOARDING, AGENT-GUIDE_MCP_atlas-harness, Agentic harness for Windows CLI |

## atlas/
| Path | Contents |
|------|----------|
| `atlas/` | 00_PHYSICAL_MAP, 01_ASSET_INVENTORY, 02_IO_REGISTRY, 03_EVENT_MATRIX, 04_FUNCTIONAL_STORY, DESIGN_RULES, TERRITORY_SPEC |

## project/
| Path | Contents |
|------|----------|
| `project/decisions/` | DECISIONS, DECISIONS_atlas (duplicate for reconciliation) |
| `project/post-mortems/` | POST_MORTEMS, POST_MORTEM_2026-03-24_FRONTIER_DEDUP, POST_MORTEM_ANIMATION_SPEED, POST_MORTEM_V1_FALLACIOUS, POST_MORTEM_V2_CORRECTED, atlas/ (7 post-mortems from .atlas/) |
| `project/features/` | FEATURE_IDEAS, **FEATURE_STATUS** (primary); FEATURE_STATUS_atlas → pointer; `.atlas/FEATURE_STATUS.md` = stub → primary |
| `project/process/` | PROCESS_IMPROVEMENTS, DEFECT_PREVENTION, PLANNING_DOCS_AUDIT, DEEP_INGESTION_FINDINGS, SECOND_PASS_ONTOLOGY_AND_INGESTION, LESSONS_LEARNED, context-distillation-plan |
| `project/sessions/notes/` | SESSION_2026-02-17 through SESSION_2026-03-25 |
| `project/sessions/chats/` | CHAT_2026-02-27 through CHAT_2026-03-25 |
| `project/open-questions/` | OPEN_QUESTIONS |
| `project/` | DEVELOPMENT_HISTORY |

## plans/
| Path | Contents |
|------|----------|
| `plans/active/geometry-refactor/` | 00-OVERVIEW, 04-REFACTOR-CONSUMERS, 05-QUARANTINE-AND-PURGE, COMPLETED_STEPS_SUMMARY |
| `plans/active/frontier-topology/` | 00-PROJECT-OVERVIEW, phases 0-5, CODE-MAP |
| `plans/active/` | 2026-03-23 CDF-OT plan, 2026-03-23 transition-interpolation-plan |
| `plans/completed/proposals/` | Legacy territory proposals (Codex V1/V2, etc.) |

## research/
| Path | Contents |
|------|----------|
| `research/2026-03-22 Codex rendering/` | RENDERING_ARCHITECTURE_INTEGRITY_AUDIT, RENDERING_CLEAN_ARCH_MIGRATION_BLUEPRINT, RENDERING_VISUAL_SPEC_GDD, RENDERING_SYSTEM_AUDIT_MASTER, RENDERING_TECHNICAL_CANDIDATES_MATRIX |
| `research/2026-03-20 transition research/` | Morph boundary vertex research, Perplexity transition guidance |
| `research/reference/` | Pax_Galaxia_dev_notes_2026-02-08 |
| `research/permanent-references/` | Full territory deep-history archive (111 files) |
| `research/` (root) | PRISM critique improvements 2026-02-18 |

## _review-reconcile/
| Path | Contents |
|------|----------|
| `_review-reconcile/` | 10 files from SPECIFICATIONS: refactor steps (01-03), architecture principles (×2), geometry data shape, Perplexity rounds (×3), TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT, AGENT_WORKTREE_COORDINATION |

## _archive/
| Path | Contents |
|------|----------|
| `_archive/territory-recovery-2026-03-08/` | 22 territory recovery plan files (superseded) |
| `_archive/F-138-ModifiedVoronoi/` | F-138 feature implementation archive |
| `_archive/diagnostics/` | Diagnostic run outputs |
| `_archive/investigations/` | Investigation notes |
| `_archive/SEMANTIC_RENAME_PROPOSAL.md` | Archived (superseded by Ontology E) |
| `_archive/TERRITORY_CLEAN_ARCHITECTURE_RENAME_LEDGER.md` | Obsolete worktree rename ledger |

---

## Active Outside docs/

| Path | Purpose |
|------|---------|
| `.agent/AGENT.md` | System-level agent config (loaded by IDE) |
| `.agent/CURRENT_OBJECTIVE.md` | Active work objective |
| `.agent/CURRENT_SPRINT.md` | Current sprint tracking |
| `.agent/rules/` (22 files) | Active agent rules (must stay here for system effectiveness) |
| `.agent/workflows/` (68 BMAD files) | BMAD method docs — retained for reference, not indexed |
| `.atlas/` (17 files) | Original .atlas catalog — copies now in `docs/atlas/` + counterpart locations |
| `pax-fluxia/src/lib/config/THEMES_AGENT_DOC.md` | In-source theming doc (co-located with code) |
| `README.md` | Repo root readme |

---

## Known Gaps (Status)

- ~~`geometry-atlas/`~~ — **Resolved 2026-03-25.** Moved to `docs/game/territory/geometry-atlas/`.
- ~~`SPECIFICATIONS/` remnants~~ — **Resolved 2026-03-25.** Codex rendering → `research/`, _review-reconcile → `docs/`, images removed.
- ~~`SYSTEM/`~~ — **Resolved 2026-03-25.** Contents distributed to `docs/agentic/`.
- ~~`_archive_memory/`~~ — **Resolved 2026-03-25.** Moved to `docs/agentic/archive-memory/`.
- `_review-reconcile/` — 10 files pending deep-process triage (Step 2).
- `_atlas` suffix duplicates — Pending reconciliation (Step 2).
- `game/combat/`, `game/map/`, `game/audio/`, `game/theming/` — populated when specs authored.
- Rules audit — `.agent/rules/` stays as-is; dedicated phase to review and consolidate.
