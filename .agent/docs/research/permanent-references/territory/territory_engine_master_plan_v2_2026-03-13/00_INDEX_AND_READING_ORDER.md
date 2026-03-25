# Territory Engine Master Plan Bundle V2

## Purpose

This bundle is the new planning source of truth for territory work.

It keeps the 15 method IDs, treats `PVV2`, `PVV3`, and `DF` as equal maintained backends, and separates:

- method identity
- route resolution
- backend execution
- validation and demo protocol

It is written to support both:

- one-shot execution by strong LLM agents
- high-level review by humans and non-specialist readers

## Reading Order

1. [01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md](01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md)
2. [02_GLOSSARY_AND_MENTAL_MODEL.md](02_GLOSSARY_AND_MENTAL_MODEL.md)
3. [03_ARCHITECT_REVIEW_V2.md](03_ARCHITECT_REVIEW_V2.md)
4. [04_CURRENT_STATE_MATRIX.md](04_CURRENT_STATE_MATRIX.md)
5. [05_VALIDATION_AND_DEMO_PROTOCOL.md](05_VALIDATION_AND_DEMO_PROTOCOL.md)
6. Backend docs
7. Mode docs
8. Epic docs
9. Task docs

## Terminology Rules

- `FG*`, `DY*`, and `HY*` are method and orchestration contracts.
- `PVV2`, `PVV3`, and `DF` are backends.
- `PVV3` is not to be described as legacy in new planning language.
- `holding` is the preferred gameplay-facing term for one connected owned territory component.
- `hole` is render-cutout language only, not gameplay truth.
- `mode` means runtime exclusivity choice: `static`, `dynamic`, or `hybrid`.
- `route` means the resolved live combination of method identity plus backend execution.

## Bundle Contents

### Root Docs

- [00_INDEX_AND_READING_ORDER.md](00_INDEX_AND_READING_ORDER.md)
- [01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md](01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md)
- [02_GLOSSARY_AND_MENTAL_MODEL.md](02_GLOSSARY_AND_MENTAL_MODEL.md)
- [03_ARCHITECT_REVIEW_V2.md](03_ARCHITECT_REVIEW_V2.md)
- [04_CURRENT_STATE_MATRIX.md](04_CURRENT_STATE_MATRIX.md)
- [05_VALIDATION_AND_DEMO_PROTOCOL.md](05_VALIDATION_AND_DEMO_PROTOCOL.md)

### Backend Docs

- [backends/PVV2_backend.md](backends/PVV2_backend.md)
- [backends/PVV3_backend.md](backends/PVV3_backend.md)
- [backends/DF_backend.md](backends/DF_backend.md)

### Mode Docs

- [modes/FG1_adaptive_field.md](modes/FG1_adaptive_field.md)
- [modes/FG2_seed_graph.md](modes/FG2_seed_graph.md)
- [modes/FG3_implicit_trace.md](modes/FG3_implicit_trace.md)
- [modes/FG4_pairwise_arrangement.md](modes/FG4_pairwise_arrangement.md)
- [modes/FG5_rt_assisted_publish.md](modes/FG5_rt_assisted_publish.md)
- [modes/DY1_span_graph_morph.md](modes/DY1_span_graph_morph.md)
- [modes/DY2_local_delta_patch.md](modes/DY2_local_delta_patch.md)
- [modes/DY3_field_interp_stabilized.md](modes/DY3_field_interp_stabilized.md)
- [modes/DY4_optimal_transport.md](modes/DY4_optimal_transport.md)
- [modes/DY5_corridor_event_decomposition.md](modes/DY5_corridor_event_decomposition.md)
- [modes/HY1_static_backbone_dynamic_refine.md](modes/HY1_static_backbone_dynamic_refine.md)
- [modes/HY2_seed_graph_local_delta.md](modes/HY2_seed_graph_local_delta.md)
- [modes/HY3_implicit_field_transport.md](modes/HY3_implicit_field_transport.md)
- [modes/HY4_pairwise_patch_transport.md](modes/HY4_pairwise_patch_transport.md)
- [modes/HY5_rt_publish_corridor_events.md](modes/HY5_rt_publish_corridor_events.md)

### Epic Docs

- [epics/EPIC_01_foundation_and_contracts.md](epics/EPIC_01_foundation_and_contracts.md)
- [epics/EPIC_02_static_methods.md](epics/EPIC_02_static_methods.md)
- [epics/EPIC_03_dynamic_methods.md](epics/EPIC_03_dynamic_methods.md)
- [epics/EPIC_04_hybrid_orchestration.md](epics/EPIC_04_hybrid_orchestration.md)
- [epics/EPIC_05_backends_diagnostics_and_validation.md](epics/EPIC_05_backends_diagnostics_and_validation.md)

### Task Docs

- [tasks/TASK_INDEX.md](tasks/TASK_INDEX.md)
- [tasks/TASK_PACKET_TEMPLATE.md](tasks/TASK_PACKET_TEMPLATE.md)

## Historical Source Docs And Disposition

| Source | Disposition |
|---|---|
| [../TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md](../TERRITORY_FRONTIER_TOP5_IMPLEMENTATION_PLAN_2026-03-12.md) | Absorbed into the 15 mode docs and Epic 02 |
| [../TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md](../TERRITORY_DYNAMIC_HYBRID_TOP5_PLAN_2026-03-12.md) | Absorbed into the dynamic, hybrid, and Epic 03/04 docs |
| [../TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md](../TERRITORY_ENGINE_MODULAR_ARCHITECTURE_AND_STEP_MODE_2026-03-12.md) | Revised into the architect review, validation protocol, and Epic 01/05 docs |
| [../territory_engine_15_mode_plan_review_2026-03-13.md](../territory_engine_15_mode_plan_review_2026-03-13.md) | Absorbed into the architect review and state matrix |
| [../territory_engine_fg2_epic_step1_2026-03-12.md](../territory_engine_fg2_epic_step1_2026-03-12.md) | Historical but contaminated by merge-conflict markers; explicitly tracked by `ARC-006` |
| [../Power Voronoi V3 Region-Graph Plan (Codex).md](../Power%20Voronoi%20V3%20Region-Graph%20Plan%20(Codex).md) | Historical conceptual source |
| [../PVV2 Frontier-Track Plan 2026-03-09.md](../PVV2%20Frontier-Track%20Plan%202026-03-09.md) | Historical conceptual source |
| [../IMPLEMENTATION_DIRECTIVE_v2.md](../IMPLEMENTATION_DIRECTIVE_v2.md) | Historical directive source |
| [../Pax Fluxia standalone territory spec and research prompt 2026-03-12.md](../Pax%20Fluxia%20standalone%20territory%20spec%20and%20research%20prompt%202026-03-12.md) | Historical spec source |
| [../2026-03-12 Perplexity Maximum options for unified frontier generation.md](../2026-03-12%20Perplexity%20Maximum%20options%20for%20unified%20frontier%20generation.md) | Historical research source |

## How To Use This Bundle

- Use the root docs to understand intent, terminology, architecture, and current truth.
- Use the mode docs to understand each method family as its own bounded workstream.
- Use the backend docs to understand execution surfaces and parity requirements.
- Use the epic docs to schedule work.
- Use the task docs to hand off one-shot implementation packets to other agents.
