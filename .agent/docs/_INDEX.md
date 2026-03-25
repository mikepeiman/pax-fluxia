# docs/ — Master Index (Ontology E)
**Generated:** 2026-03-25
**Structure:** Game System + Meta

---

## game/
| Path | Contents |
|------|----------|
| `game/design/` | GAME_SPECIFICATION, MECHANICS, PRD_ACTIVE |
| `game/territory/` | TERRITORY_ARCHITECTURE, TERRITORY_TRANSITION_INVENTORY, CONQUEST_ANIMATION_SPEC, TRANSITION_SNAPSHOT_RECORDER, geometry-atlas/, conquest-animation-archive/ |
| `game/vfx/` | ANIMATION_GUIDE, SURGE_ANIMATION, SURGE_ANIMATION_V2, VFX_TIMING_MODEL, FX_ANIMATION_ARCHITECTURE_PROPOSAL |
| `game/ui/` | CONTROLS, WIP-UI/ |
| `game/visual/` | gdd/ |
| `game/combat/` | *(empty — ship lifecycle specs not yet migrated)* |
| `game/map/` | *(empty — stars/lanes specs not yet migrated)* |
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
| `agentic/prompts/` | HEURISTIC_gold-mining, Agent Council V2.2 |
| `agentic/context/` | architecture, code-standards, debugging, game-design, model-selection, tech-gotchas, ui-patterns, workflow |
| `agentic/mental-models/` | AI_mental_models_article, theory and explanations/ |
| `agentic/rules/` | *(NOT here — active rules stay in `.agent/rules/` for system effectiveness)* |
| `agentic/heuristics/` | *(empty — heuristics in prompts/ for now)* |

## project/
| Path | Contents |
|------|----------|
| `project/decisions/` | DECISIONS (D-nn log) |
| `project/post-mortems/` | POST_MORTEMS, POST_MORTEM_2026-03-24_FRONTIER_DEDUP, POST_MORTEM_ANIMATION_SPEED, POST_MORTEM_V1_FALLACIOUS, POST_MORTEM_V2_CORRECTED |
| `project/features/` | FEATURE_IDEAS, FEATURE_STATUS |
| `project/process/` | PROCESS_IMPROVEMENTS, DEFECT_PREVENTION, PLANNING_DOCS_AUDIT, DEEP_INGESTION_FINDINGS, SECOND_PASS_ONTOLOGY_AND_INGESTION |
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
| `research/permanent-references/` | Full territory deep-history archive (211 files) |

## _archive/
| Path | Contents |
|------|----------|
| `_archive/territory-recovery-2026-03-08/` | 22 territory recovery plan files (superseded) |
| `_archive/F-138-ModifiedVoronoi/` | F-138 feature implementation archive |
| `_archive/diagnostics/` | Diagnostic run outputs |
| `_archive/investigations/` | Investigation notes |
| `_archive/SEMANTIC_RENAME_PROPOSAL.md` | Archived (superseded by Ontology E) |

---

## Known Gaps (pending manual close)

- `geometry-atlas/` — still in `.agent/SPECIFICATIONS/` due to VS Code file locks. Move to `docs/game/territory/` when those files are closed.
- `game/combat/`, `game/map/`, `game/audio/`, `game/theming/` — populated when specs for those systems are authored.
- Rules audit — `.agent/rules/` stays as-is; dedicated phase to review and consolidate.
