# Task Index

Each atomic task below has a unique ID, one owning epic, and one primary owning document. Foundation tasks are owned by root planning docs. Method tasks are owned by their mode docs. Backend and diagnostics tasks are owned by backend or validation docs.

## EPIC 01: Foundation And Contracts

| Task ID | Summary | Epic | Primary owning document |
| --- | --- | --- | --- |
| `DOC-001` | Create bundle folder, index, and reading order | `EPIC_01_foundation_and_contracts` | `00_INDEX_AND_READING_ORDER.md` |
| `DOC-002` | Write non-CompSci executive overview | `EPIC_01_foundation_and_contracts` | `01_EXECUTIVE_OVERVIEW_FOR_NON_CS.md` |
| `DOC-003` | Write glossary and mental-model reference | `EPIC_01_foundation_and_contracts` | `02_GLOSSARY_AND_MENTAL_MODEL.md` |
| `DOC-004` | Write architect-review document | `EPIC_01_foundation_and_contracts` | `03_ARCHITECT_REVIEW_V2.md` |
| `DOC-005` | Build current-state matrix for 15 modes x 3 backends | `EPIC_01_foundation_and_contracts` | `04_CURRENT_STATE_MATRIX.md` |
| `DOC-006` | Build validation and demo protocol | `EPIC_01_foundation_and_contracts` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
| `DOC-007` | Create all 15 mode docs with the fixed template | `EPIC_01_foundation_and_contracts` | `00_INDEX_AND_READING_ORDER.md` |
| `DOC-008` | Create all 3 backend docs with the fixed template | `EPIC_01_foundation_and_contracts` | `00_INDEX_AND_READING_ORDER.md` |
| `DOC-009` | Create the 5 epic docs and task index/template docs | `EPIC_01_foundation_and_contracts` | `tasks/TASK_INDEX.md` |
| `ARC-001` | Reclassify PVV3 as an active runtime/backend everywhere in the bundle | `EPIC_01_foundation_and_contracts` | `03_ARCHITECT_REVIEW_V2.md` |
| `ARC-002` | Define the method-vs-backend separation model | `EPIC_01_foundation_and_contracts` | `03_ARCHITECT_REVIEW_V2.md` |
| `ARC-003` | Define route-resolution and backend-resolution separately | `EPIC_01_foundation_and_contracts` | `03_ARCHITECT_REVIEW_V2.md` |
| `ARC-004` | Record the exact current live routing truth | `EPIC_01_foundation_and_contracts` | `04_CURRENT_STATE_MATRIX.md` |
| `ARC-005` | Record FG2 as the only native end-to-end method today | `EPIC_01_foundation_and_contracts` | `04_CURRENT_STATE_MATRIX.md` |
| `ARC-006` | Flag historical docs with stale wording or merge-conflict contamination | `EPIC_01_foundation_and_contracts` | `00_INDEX_AND_READING_ORDER.md` |

## EPIC 02: Static Methods

| Task ID | Summary | Epic | Primary owning document |
| --- | --- | --- | --- |
| `FG2-001` | Rename geometry language from shell/hole truth to holding/component truth | `EPIC_02_static_methods` | `modes/FG2_seed_graph.md` |
| `FG2-002` | Reproduce settled-state border/fill mismatch with dedicated screenshots | `EPIC_02_static_methods` | `modes/FG2_seed_graph.md` |
| `FG2-003` | Eliminate remaining FG2 fill-border misalignment | `EPIC_02_static_methods` | `modes/FG2_seed_graph.md` |
| `FG2-004` | Lock holding identity invariants across spawn, split, merge, vanish, and enclave cases | `EPIC_02_static_methods` | `modes/FG2_seed_graph.md` |
| `FG2-005` | Add deterministic screenshot and fixture coverage for canonical FG2 | `EPIC_02_static_methods` | `modes/FG2_seed_graph.md` |
| `FG1-001` | Implement modified-distance metric with MSR/CX/DX in the method contract | `EPIC_02_static_methods` | `modes/FG1_adaptive_field.md` |
| `FG1-002` | Implement adaptive ownership-field sampling | `EPIC_02_static_methods` | `modes/FG1_adaptive_field.md` |
| `FG1-003` | Implement shared-node zero-crossing extraction and holding publish | `EPIC_02_static_methods` | `modes/FG1_adaptive_field.md` |
| `FG1-004` | Validate FG1 on PVV2, PVV3, and DF | `EPIC_02_static_methods` | `modes/FG1_adaptive_field.md` |
| `FG3-001` | Implement pairwise implicit field construction | `EPIC_02_static_methods` | `modes/FG3_implicit_trace.md` |
| `FG3-002` | Implement predictor-corrector contour tracing and closure validation | `EPIC_02_static_methods` | `modes/FG3_implicit_trace.md` |
| `FG3-003` | Implement junction resolution and canonical publish | `EPIC_02_static_methods` | `modes/FG3_implicit_trace.md` |
| `FG3-004` | Validate FG3 on all three backends | `EPIC_02_static_methods` | `modes/FG3_implicit_trace.md` |
| `FG4-001` | Implement pairwise bisector primitive generation and clipping | `EPIC_02_static_methods` | `modes/FG4_pairwise_arrangement.md` |
| `FG4-002` | Implement planar arrangement graph and face labeling | `EPIC_02_static_methods` | `modes/FG4_pairwise_arrangement.md` |
| `FG4-003` | Publish canonical frontiers and holdings from arrangement faces | `EPIC_02_static_methods` | `modes/FG4_pairwise_arrangement.md` |
| `FG4-004` | Validate FG4 on all three backends | `EPIC_02_static_methods` | `modes/FG4_pairwise_arrangement.md` |
| `FG5-001` | Implement ownership RT pass and sub-texel transition extraction | `EPIC_02_static_methods` | `modes/FG5_rt_assisted_publish.md` |
| `FG5-002` | Implement centerline graph build and shared-edge-preserving vector publish | `EPIC_02_static_methods` | `modes/FG5_rt_assisted_publish.md` |
| `FG5-003` | Calibrate RT resolution and error budgets | `EPIC_02_static_methods` | `modes/FG5_rt_assisted_publish.md` |
| `FG5-004` | Validate FG5 on all three backends | `EPIC_02_static_methods` | `modes/FG5_rt_assisted_publish.md` |

## EPIC 03: Dynamic Methods

| Task ID | Summary | Epic | Primary owning document |
| --- | --- | --- | --- |
| `DY-000` | Add persistent frontier and holding IDs plus a shared delta-event substrate | `EPIC_03_dynamic_methods` | `epics/EPIC_03_dynamic_methods.md` |
| `DY1-001` | Implement span-graph morph correspondences | `EPIC_03_dynamic_methods` | `modes/DY1_span_graph_morph.md` |
| `DY1-002` | Implement constrained span playback and fallback rules | `EPIC_03_dynamic_methods` | `modes/DY1_span_graph_morph.md` |
| `DY2-001` | Implement local recompute-window detection from conquest and order events | `EPIC_03_dynamic_methods` | `modes/DY2_local_delta_patch.md` |
| `DY2-002` | Implement patch stitching with locked boundary zones and seam validation | `EPIC_03_dynamic_methods` | `modes/DY2_local_delta_patch.md` |
| `DY3-001` | Implement field interpolation cache and anti-flutter stabilizer | `EPIC_03_dynamic_methods` | `modes/DY3_field_interp_stabilized.md` |
| `DY3-002` | Implement correction pass near high-error zones | `EPIC_03_dynamic_methods` | `modes/DY3_field_interp_stabilized.md` |
| `DY4-001` | Implement optimal-transport approximation for holding motion | `EPIC_03_dynamic_methods` | `modes/DY4_optimal_transport.md` |
| `DY4-002` | Implement control-point advection and correction publish | `EPIC_03_dynamic_methods` | `modes/DY4_optimal_transport.md` |
| `DY5-001` | Define corridor-event taxonomy and dirty-region manager | `EPIC_03_dynamic_methods` | `modes/DY5_corridor_event_decomposition.md` |
| `DY5-002` | Implement event-driven recompute and publish path with explicit anchor rules | `EPIC_03_dynamic_methods` | `modes/DY5_corridor_event_decomposition.md` |

## EPIC 04: Hybrid Orchestration

| Task ID | Summary | Epic | Primary owning document |
| --- | --- | --- | --- |
| `HY-000` | Define the common hybrid route contract and exclusivity semantics | `EPIC_04_hybrid_orchestration` | `epics/EPIC_04_hybrid_orchestration.md` |
| `HY1-001` | Compose FG1 + DY1 and validate localized updates | `EPIC_04_hybrid_orchestration` | `modes/HY1_static_backbone_dynamic_refine.md` |
| `HY2-001` | Compose FG2 + DY2 and validate patch stitching | `EPIC_04_hybrid_orchestration` | `modes/HY2_seed_graph_local_delta.md` |
| `HY3-001` | Compose FG3 + DY4 and validate smoothness vs cost | `EPIC_04_hybrid_orchestration` | `modes/HY3_implicit_field_transport.md` |
| `HY4-001` | Compose FG4 + DY2/DY4 gating and exactness rules | `EPIC_04_hybrid_orchestration` | `modes/HY4_pairwise_patch_transport.md` |
| `HY5-001` | Compose FG5 + DY5 and validate high-load dirty-region updates | `EPIC_04_hybrid_orchestration` | `modes/HY5_rt_publish_corridor_events.md` |

## EPIC 05: Backends, Diagnostics, And Validation

| Task ID | Summary | Epic | Primary owning document |
| --- | --- | --- | --- |
| `BKD-001` | Define PVV3 as a first-class backend that consumes native artifacts and supports fallback routes | `EPIC_05_backends_diagnostics_and_validation` | `backends/PVV3_backend.md` |
| `BKD-002` | Define PVV2 as a maintained backend with explicit artifact-consumption and fallback responsibilities | `EPIC_05_backends_diagnostics_and_validation` | `backends/PVV2_backend.md` |
| `BKD-003` | Define DF as a maintained backend with explicit artifact-consumption and fallback responsibilities | `EPIC_05_backends_diagnostics_and_validation` | `backends/DF_backend.md` |
| `BKD-004` | Add backend-parity acceptance criteria for all demo-ready modes | `EPIC_05_backends_diagnostics_and_validation` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
| `BKD-005` | Add a backend comparison matrix for route truth, artifact use, border path, fill path, and animation path | `EPIC_05_backends_diagnostics_and_validation` | `04_CURRENT_STATE_MATRIX.md` |
| `DBG-001` | Expand step inspector planning to include backend-aware route truth and artifact stages | `EPIC_05_backends_diagnostics_and_validation` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
| `DBG-002` | Define browser/screenshot workflow as a mandatory validation surface | `EPIC_05_backends_diagnostics_and_validation` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
| `DBG-003` | Define benchmark fixture sets for territory validation | `EPIC_05_backends_diagnostics_and_validation` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
| `DBG-004` | Define the route-truth demo checklist | `EPIC_05_backends_diagnostics_and_validation` | `05_VALIDATION_AND_DEMO_PROTOCOL.md` |
