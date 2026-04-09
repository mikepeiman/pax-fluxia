# Territory Rendering: Fresh-Start Jumpstart Document

**Single entry point** for the territory documentation epic (ingestion + ideas). There is no separate onboarding file: **start here at Section 0**, then continue through the sections below in order.

**Date**: 2026-04-08  
**Purpose**: Onboarding for a new agent or reset session. **Do not** implement production code unless the architect explicitly directs it. Ingest, surface **ideas** (rendering, geometry, VFX, features, architecture, …), reconcile, and support directional decisions.

---

## 0. Fresh-context entry point (start here — only file to assign)

### 0.0 Path (give agents this one file)

`.agent/docs/project/implementation-plans/2026-04-08/territory-rendering-jumpstart.md`

### 0.A Verbatim instruction (architect copy-paste)

> Start at **Section 0** of this file. Follow the **Suggested load order** below. **Current phase:** **Impl 0** (doc epic complete) — confirm against **Phase status** (0.B). **Ideas before plans before code** still applies to any *new* doc work; for **implementation**, follow the unified plan + `handoff_doc_c.md` and only write code when the architect directs it.

### 0.B Phase status (keep this table in sync when a phase finishes)

| Phase | Status | Handoff to read next |
|-------|--------|----------------------|
| P0 | Done | `handoff_p0.md` (historical) |
| Doc A | Done | `handoff_doc_a.md` |
| Doc B | Done | `handoff_doc_b.md` |
| Doc C | Done | `handoff_doc_c.md` |
| Impl 0–3 | **Next** (after architect locks direction) | [handoff_doc_c.md](./handoff_doc_c.md) + [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) Impl 0 |

**Doc epic (P0 + Doc A–C) is complete.** Deliverables: `artifacts_doc_c/`, `BRAINSTORMING_IDEAS_INDEX_FINAL.md`, `RECOMMENDATIONS_FOR_ARCHITECT.md`, `handoff_doc_c.md`. **Impl 0** may start when the architect greenlights code (default: after reading RECOMMENDATIONS + SYNTHESIS_FINAL).

### 0.C Companion files in this folder (not separate entry points)

| File | Role |
|------|------|
| [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) | Phase checklist; ideas epic (Doc A–C) then Impl 0–3; Parts I–II = proposed engineering direction. |
| [BRAINSTORMING_IDEAS_INDEX_FINAL.md](./BRAINSTORMING_IDEAS_INDEX_FINAL.md) | **Frozen** idea row ledger; §C links each row to [master inventory](./doc-audit/MARKDOWN_MASTER_INDEX.csv) paths + `git_last_commit`. Narrative story layer: [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./doc-audit/TERRITORY_IDEA_CORPUS_NARRATIVE.md). |
| [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md) | Working draft / same lineage; use if reopening ingestion. |
| [RECOMMENDATIONS_FOR_ARCHITECT.md](./RECOMMENDATIONS_FOR_ARCHITECT.md) | Post–Doc C decisions backlog. |
| `handoff_p0.md` | P0 checkpoint only; skip if you already loaded `condensed/`. |
| `handoff_doc_a.md` … `handoff_doc_c.md` | **Continuity** — read **`handoff_doc_c.md`** before Impl 0. |
| `artifacts_doc_a/`, `artifacts_doc_b/`, `artifacts_doc_c/`, `condensed/` | Ledgers, synthesis, short summaries. |

**Deprecated alias:** [AGENT_ENTRYPOINT.md](./AGENT_ENTRYPOINT.md) redirects here — do not add new content there.

### 0.D Doc B completion criteria (reference for auditors)

Doc B is complete when: (1) `artifacts_doc_b/` exists with v2 ledgers, (2) `BRAINSTORMING_IDEAS_INDEX.md` is v2 with expanded manifests, (3) `handoff_doc_b.md` lists deliverables and Doc C next steps. *(Already satisfied in this repo snapshot.)*

### 0.E Related hubs

- [PLANNING_DOCS_AUDIT.md](../../process/PLANNING_DOCS_AUDIT.md) — ideas → plans → implementation + manifest links.  
- [`_INDEX.md`](../../../_INDEX.md) — *Major documentation audit (2026-04)*.

---

### Suggested load order

1. [`.agent/AGENT.md`](../../../../AGENT.md) — non-negotiable behaviors and file ontology.
2. **This file** — Sections **0** (above), **1**, **2**, **3**, then **6** (ingestion strategy and checklist). For **new doc ingestion**, surface *ideas* into artifacts + brainstorming; for **Impl**, skim §6 only if you need exclusion rules.
3. **Unified plan** **[TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md)** — phase spine, Parts I–II, **Impl** sequencing. Short mirror: [condensed/PLAN_CONDENSED.md](condensed/PLAN_CONDENSED.md). **Doc epic outputs:** [artifacts_doc_a/](artifacts_doc_a/) + [artifacts_doc_b/](artifacts_doc_b/) + [artifacts_doc_c/](artifacts_doc_c/) + [BRAINSTORMING_IDEAS_INDEX.md](./BRAINSTORMING_IDEAS_INDEX.md). **Impl prelude (read before coding):** [handoff_doc_c.md](./handoff_doc_c.md), [BRAINSTORMING_IDEAS_INDEX_FINAL.md](./BRAINSTORMING_IDEAS_INDEX_FINAL.md) (§E), [RECOMMENDATIONS_FOR_ARCHITECT.md](./RECOMMENDATIONS_FOR_ARCHITECT.md), [artifacts_doc_c/SYNTHESIS_FINAL.md](./artifacts_doc_c/SYNTHESIS_FINAL.md).
4. Latest **handoff** for your phase (`handoff_doc_c.md` before **Impl 0**, etc.) — see unified plan Part V–VI.

**Do not start by loading** raw harness logs (`.agent-harness/logs/*.jsonl`), code snapshots under `research/.../pipeline-snapshot-*`, or entire `node_modules` / `.svelte-kit` — see Section 6.4.

### 0.1 Ingestion roots checklist (for exhaustive brainstorming file lists)

**Canonical enumeration (mining):** [MARKDOWN_MASTER_INDEX.md](./doc-audit/MARKDOWN_MASTER_INDEX.md) and [MARKDOWN_MASTER_INDEX.csv](./doc-audit/MARKDOWN_MASTER_INDEX.csv) under `.agent/docs/project/implementation-plans/2026-04-08/doc-audit/` — one row per **git-tracked** `.md` at `HEAD` (category, git first/last touch, Mar22/Mar24 **tree** flags, default `processing_status`). Regenerate with `doc-audit/_generate_markdown_master_index.ps1`. That inventory is the ground truth for “every tracked doc”; the bucket table below is a **human triage** map on top of it.

**Primary reader consolidation (ordering principle #1 — Ideas):** [TERRITORY_IDEA_CORPUS_NARRATIVE.md](./doc-audit/TERRITORY_IDEA_CORPUS_NARRATIVE.md) — prose + sourced bullets across rendering, geometry, transition, VFX, feature, architecture, UX, diagnostic, and process (snapshot; does not replace `BRAINSTORMING_IDEAS_INDEX*`).

Use **buckets + keyword search** under each path to build **candidate lists** (then read in **date bands**, Section 6.2). Group the list by bucket in `BRAINSTORMING_IDEAS_INDEX*.md` or a `FILE_MANIFEST` section.

| Bucket | Path (from repo root) |
|--------|------------------------|
| Process acceleration | `.agent/docs/project/process/` — `TRANCHE_*_FINDINGS.md`, `planning-docs-chronological-index.md`; **master markdown index** lives in `implementation-plans/2026-04-08/doc-audit/` (`MARKDOWN_MASTER_INDEX.csv` + `.md`) |
| Ground truth | `.agent/docs/project/sessions/notes/`, `sessions/chats/` |
| WIP / scratch | `.agent/WIP Work-In-Progress/` (also indexed in the master CSV as category `WIP`) |
| Decisions / post-mortems | `.agent/docs/project/decisions/`, `project/post-mortems/` |
| Territory specs (canonical tree) | `.agent/docs/game/territory/` (include `geometry-atlas/` and `_archive/` when indexing) |
| Implementation plans (dated) | `.agent/docs/project/implementation-plans/2026-04-07/`, `2026-04-08/` |
| Plans | `.agent/docs/plans/` (root + dated subfolders), `plans/frontier-topology/`, `plans/geometry-refactor/` |
| PVV reference commit | `.agent/docs/plans/PVV2_REFERENCE_COMMIT.md` |
| Review / reconcile | `.agent/docs/_review-reconcile/` |
| Research | `.agent/docs/research/permanent-references/territory/` (all subfolders **except** excluded trees in 6.4), `research/2026-03-20 transition research/` |
| Archives | `.agent/docs/_archive/` (territory-related subtrees) |
| Engineering | `.agent/docs/engineering/architecture/` (e.g. `RENDERER_WIRING_PLAN.md`) |
| Agentic context (optional) | `.agent/docs/agentic/context/`, `agentic/atlas-harness/` |
| Atlas duplicates (cross-check) | `.atlas/`, `pax-fluxia/.atlas/` |
| Tool memory (skim) | `.gemini/MEMORY/*.md` |
| Canonical atlas mirror | `.agent/docs/atlas/` |

**Documentation audit baselines (do not skip for Doc B/C):** [PLANNING_DOCS_AUDIT.md](../../process/PLANNING_DOCS_AUDIT.md) (hub), [2026-03-25__1018 PLANNING_DOCS_AUDIT.md](../../process/2026-03-25__1018%20PLANNING_DOCS_AUDIT.md) (dated token/triage + 2026-04-08 meta-audit), [doc-audit/README.md](./doc-audit/README.md) (inventory folder index), [MARKDOWN_FULL_MANIFEST_VS_HEAD.md](./doc-audit/MARKDOWN_FULL_MANIFEST_VS_HEAD.md), **[MARKDOWN_MASTER_INDEX.md](./doc-audit/MARKDOWN_MASTER_INDEX.md)** (full tracked `.md` inventory + processing queue columns), [IDEA_MINING_PIPELINE_POSTMORTEM.md](./doc-audit/IDEA_MINING_PIPELINE_POSTMORTEM.md) (why brainstorming rows ≠ exhaustive index), pre-ontology [RECOVERED_LEGACY_DOC_LIST.md](../../../_archive/pre-ontology-md-recovery-2026-03-22-24/RECOVERED_LEGACY_DOC_LIST.md) (**basename-deduped** recovery only — not a complete Mar 22 export), master [`_INDEX.md`](../../../_INDEX.md) (*Major documentation audit*).

Code locations for renderer inventory (not prose ingestion): `pax-fluxia/src/lib/renderers/`, `pax-fluxia/src/lib/territory/` — listed in Sections 4–5 of this file.

---

## 1. Mission Brief

You are entering a project with 2+ months of partial, conflicting agentic work on territory rendering. Multiple agents across multiple sessions have attempted various approaches, often contradicting each other, often claiming things work when they do not.

**Your job this session (ordering: ideas → plans → implementation):**
1. Follow the **ingestion roots checklist** (Section 0.1) and strategy (Section 6): enumerate candidate files per bucket (exhaustive lists for brainstorming), then read in **date bands** — not a single undifferentiated “read everything” pass. **Prioritize capturing ideas** (including wild, abandoned, or contradictory ones) in the brainstorming index and registries; implementation plans come **after** the architect synthesizes those.
2. Organize findings by theme and date
3. Identify contradictions and redundancies across documents
4. Tally mentions of what worked vs. what failed (see Section 9)
5. Produce a reconciled summary for the human architect
6. Do NOT implement any code until explicitly directed

**Critical warnings:**
- Do NOT trust agentic commit messages about "what was fixed" -- agents have constantly assumed working states when they were broken
- The human architect's observations ARE ground truth -- they see the running app
- Absence of feedback is NOT confirmation
- Weight user feedback and session notes more heavily than agent-authored status docs

---

## 2. Thinking Models (Read FIRST, then think independently)

These documents define how you should reason about problems in this project. They are short and essential.
Use them as lenses, not cages: absorb them, then challenge them.

- [`.agent/docs/agentic/mental-models/2026-04-07 master_debug_prompt.md`](.agent/docs/agentic/mental-models/2026-04-07%20master_debug_prompt.md) (216 lines) -- Full systems debugging mental model. Covers: first-principles, system boundaries, dataflow, state transitions, invariants, root cause analysis, implementation review checklist.
- [`.agent/docs/agentic/mental-models/2026-04-07 innovative_thinking.md`](.agent/docs/agentic/mental-models/2026-04-07%20innovative_thinking.md) (17 lines) -- Bias toward non-incremental solutions. Generate obvious/robust/elegant/weird solutions, then evaluate.
- [`.agent/docs/agentic/mental-models/AI_mental_models_article.md`](.agent/docs/agentic/mental-models/AI_mental_models_article.md) (359 lines) -- Extended reference on mental models for AI agents.
- [`.agent/AGENT.md`](.agent/AGENT.md) (208 lines) -- Master project context. Non-negotiable agent behaviors, code standards, architecture overview, debugging rules. READ THIS.

**Mental-model operating rule:**
1. Load model
2. Apply model
3. Try one counter-model that could falsify your first interpretation
4. Record both in artifacts

---

## 3. Core Specs (understand requirements before reviewing implementations)

- [`.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md`](.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md) -- Hard constraints: fills derive from frontier truth, unchanged borders must not jitter, timing is tick-bound, borders should feel rope-like/organic - or crystalline/chemistry (more angular, crystalline-chemical in how they would grow/shrink/change).
- [`.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`](.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md) -- 4-layer pipeline: Ownership > Geometry > Transition > Presentation. NOTE: This doc may be stale in its transition-layer details. Contracts as specified, implemented, or speculated, may be more hindrance than benefit. Greenfield thinking, nothing is sacrosanct.
- [`.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`](.agent/docs/game/territory/2026-04-04%20Perplexity%20GPT-5.4%20design%20plan%20for%20territory%20render.md) -- Most recent design thinking (as of 2026-04-04). Considered more up-to-date than TERRITORY_ARCHITECTURE.md. But nothing is sacrosanct except the requirements - and even there, don't get stuck in descriptive language but rather the core desired behavior and effect.

---

## 4. All Legacy Renderer Implementations

These are the actual runnable renderers in `pax-fluxia/src/lib/renderers/`. Each represents a distinct approach to territory rendering. ALL are still in the codebase. **40 files total.**

### Renderers (root)

| File | Approach |
|------|----------|
| `DistanceFieldTerritoryRenderer.ts` | GPU Dijkstra + fragment shader + temporal blend + stroke mesh (~5100 lines) |
| `MetaballRenderer.ts` | CPU influence grid, PIXI rectangles, blur filter (~390 lines) |
| `ContourTerritoryRenderer.ts` | Host for contour worker (~200 lines) |
| `contourTerritory.worker.ts` | Marching squares > vector polygons, Chaikin, corner rounding (~700 lines) |
| `GraphTerritoryRenderer.ts` | Graph/lane influence renderer |
| `graphTerritory.worker.ts` | Graph distance worker |
| `PowerVoronoiRenderer.ts` | Power Voronoi diagram |
| `ModifiedVoronoiRenderer.ts` | Modified Voronoi |
| `PVV3Renderer.ts` | Power Voronoi V3 |
| `RefactoredPVV2Renderer.ts` | Refactored PVV2 |
| `PowerVoronoiRenderer_DY4.ts` | PVV with DY4 OT border transitions |
| `VoronoiRenderer.ts` | Basic Voronoi |
| `PixelTerritoryRenderer.ts` | Pixel ownership grid |
| `pixelTerritory.worker.ts` | Pixel territory worker |
| `LaneTerritoryRenderer.ts` | Lane-based territory |
| `LaneRenderer.ts` | Lane renderer |
| `laneTerritory.worker.ts` | Lane territory worker |
| `strokeMeshBorders.ts` | Custom GL programs for stroke mesh borders (SDF) |
| `frontierGraph.ts` | Canonical frontier polyline extraction |
| `centerlineGraph.ts` | Centerline graph module |
| `territoryFeatures.ts` | Corridor virtuals, disconnect virtuals |
| `territoryUtils.ts` | Connected cluster detection, shared utilities |
| `colorUtils.ts` | Color utilities |
| `containerFactory.ts` | PIXI container factory |
| `RenderContext.ts` | Render context |
| `ShipRenderer.ts` | Ship rendering |
| `StarRenderer.ts` | Star rendering |
| `StarPowerRenderer.ts` | Star power rendering |
| `orbModes.ts` | Orb mode configuration |
| `index.ts` | Barrel export |

### Geometry Pipeline (`renderers/geometry/` — 10 files)

`borderPipeline.ts`, `borderTransition.ts`, `chaikin.ts`, `frontierLoops.ts`, `geometryModifiers.ts`, `mergeUtils.ts`, `morphUtils.ts`, `polyUtils.ts`, `types.ts`, `index.ts`

---

## 5. Clean-Architecture Territory System

The "new" architecture at `pax-fluxia/src/lib/territory/` (~159 `.ts` files). This is the 4-layer pipeline that has been the focus of recent work. The transition layer is what has been failing persistently.

### `territory/contracts/` (9 files)
`OwnershipContracts.ts`, `GeometryContracts.ts`, `TransitionContracts.ts`, `PresentationContracts.ts`, `FrontierTopologyContracts.ts`, `TerritoryFrameInput.ts`, `TerritoryModeSelection.ts`, `TerritoryModeCatalog.ts`, `DiagnosticsContracts.ts`

### `territory/compiler/` (13 files)
`TerritoryCompiler.ts`, `TerritoryTransitionPlanner.ts`, `buildFrontierTopology.ts`, `buildFrontierMap.ts`, `chainWalkCore.ts`, `canonicalTypes.ts`, `Geometry_0319.ts`, `frontierStage.ts`, `frontierFitter.ts`, `metricStage.ts`, `regionStage.ts`, `powerVoronoiTerritoryGeometryGenerator.ts`, `types.ts`

### `territory/runtime/` (7 files)
`TerritoryRuntimeCoordinator.ts`, `TerritoryRuntimeState.ts`, `TerritoryWorker.ts`, `TerritoryWorkerProtocol.ts`, `TerritoryCompatibilityMatrix.ts`, `TerritoryConfigNormalizer.ts`, `LayerCache.ts`

### `territory/layers/ownership/` (5 files)
`OwnershipLayerCoordinator.ts`, `OwnershipMode.ts`, `registry.ts`, modes: `StarOwnershipSnapshotMode.ts`, `VirtualStarOwnershipMode.ts`

### `territory/layers/geometry/` (15 files)
`GeometryLayerCoordinator.ts`, `GeometryMode.ts`, `compiler_UnifiedVectorGeometry.ts`, `registry.ts`, modes: `UnifiedVectorGeometryMode.ts`, `PowerVoronoiGeometryMode.ts`, `WeightedPowerVoronoiGeometryMode.ts`, `SeedGraphGeometryMode.ts`, `SeedGraphClusterSplitGeometryMode.ts`, `BoundaryAwareFrontierGeometryMode.ts`, `BoundaryConstrainedFrontierGeometryMode.ts`, `BoundaryAwareFrontierMode.ts`, `geometryModeUtils.ts`, planners: `FrontierTopologyBuilder.ts`, `GeometryFingerprint.ts`

### `territory/layers/transition/` (21 files) ← THE PROBLEM AREA
Root: `TransitionLayerCoordinator.ts`, `ActiveFrontTransition.ts`, `TopologyFrameSampler.ts`, `interpolatePolylines.ts`, `SharedTransitionClock.ts`, `FillTransitionMode.ts`, `BorderTransitionMode.ts`, `registry.ts`
Fill modes: `FrontierMorphFillMode.ts`, `FrontierTopologyMorphFillMode.ts`, `ActiveFrontFillMode.ts`, `CrossfadeFillMode.ts`, `AlphaCrossfadeFillMode.ts`
Border modes: `OptimalTransportBorderMode.ts`, `OptimalTransportCorrespondenceBorderMode.ts`, `RopeMorphBorderMode.ts`, `RopeInterpolatedBorderMode.ts`
Planners: `TerritoryTransitionPlanner.ts`, `FrontierTopologyPlanner.ts`, `GeometryTopologyDiff.ts`, `CorrespondencePlanner.ts`

### `territory/layers/presentation/` (12 files)
`PresentationLayerCoordinator.ts`, `TerritoryStyleMode.ts`, `registry.ts`, builders: `FillDrawCommandBuilder.ts`, `BorderDrawCommandBuilder.ts`, modes: `CanonicalVectorStyle.ts`, `CanonicalTerritoryStyle.ts`, `DistanceFieldStyle.ts`, `SignedDistanceFieldMeshStyle.ts`, `PixelTerritoryStyle.ts`, `PixelQuantizedMeshStyle.ts`, `VectorPolygonMeshStyle.ts`

### `territory/adapters/` (9 files)
`pixi/PixiFillPresenter.ts`, `pixi/PixiBorderPresenter.ts`, `pixi/PixiTerritoryPresenter.ts`, `pixi/PixiTerritoryDebugOverlay.ts`, `legacy/DistanceFieldLegacyAdapter.ts`, `legacy/PowerVoronoiAdapter.ts`, `legacy/PowerVoronoiLegacyAdapter.ts`, `legacy/PVV3LegacyAdapter.ts`, `legacy/SeedGraphAdapter.ts`

### `territory/integration/` (8 files)
`TerritorySettingsBridge.ts`, `TerritorySettingsBridge.test.ts`, `TerritoryArchitectureRouter.ts`, `TerritoryArchitectureRouter.test.ts`, `GameCanvasBridge.ts`, `GameCanvasTerritoryBridge.ts`, `TerritoryFxBridge.ts`, `TerritoryVFXBridge.ts`

### `territory/devtools/` (10 files)
`TransitionSnapshotRecorder.ts`, `TransitionBundleSerializer.ts`, `TransitionFrontierFrameRenderer.ts`, `TransitionGeometryRenderer.ts`, `TransitionDebugOverlay.ts`, `overlayConfig.ts`, `snapshotExport.ts`, `TerritoryTraceStore.ts`, `TerritoryStepRunner.ts`, `PolygonValidator.ts`

### `territory/transitions/` (15 files) — older transition implementations
`buildPatchMorphPlan.ts`, `buildSnapshotsFromTMAP.ts`, `buildTerritoryBoundarySnapshots.ts`, `classifyRingTransitionKind.ts`, `computeTerritoryDeltaContext.ts`, `createCanonicalTransitionPlan.ts`, `createTerritoryTransitionPlan.ts`, `diffFrontierMaps.ts`, `drawTerritoryFrame.ts`, `findRingSpliceWindow.ts`, `findRingSpliceWindowTopological.ts`, `OptimalTransportBorderTransition.ts`, `refineSpliceWindowGeometrically.ts`, `sampleTransitionFrame.ts`, `types.ts`

### `territory/render/` (5 files)
`TerritoryRenderer.ts`, `OwnerFillLayerRenderer.ts`, `BorderLayerRenderer.ts`, `buildFillMeshCache.ts`, `buildBorderMeshCache.ts`

### `territory/orchestrator/` (9 files)
`engine.ts`, `renderMode.ts`, `registry.ts`, `traceStore.ts`, `types.ts`, `index.ts`, methods: `fg2SeedGraph.ts`, `index.ts`

### `territory/engine/` (1 file)
`TerritoryEngineController.ts`

### `territory/geometry/` (2 files)
`geometryUtils.ts`, `morphUtils.ts`

### `territory/vfx/` (3 files)
`VFXBus.ts`, `VFXContracts.ts`, `handlers/ConquestParticles.ts`

### `territory/legacy/` (1 file)
`TerritoryLegacyBridge.ts`

---

## 6. Document Ingestion Strategy (date-first, exhaustive lists where required)

This section mandates **structured** ingestion: **enumerate** relevant files per bucket (especially for the brainstorming index — exhaustive file list), then **prioritize** by date band and evidence tier. Comprehensive coverage does not mean reading low-signal artifacts (Section 6.4).

### 6.1 Prior Work to Reuse First (MANDATORY)

Before broad ingestion, read and extract from:
- `process/TRANCHE_A_FINDINGS.md`
- `process/TRANCHE_B_FINDINGS.md`
- `process/TRANCHE_C_FINDINGS.md`
- `process/TRANCHE_D_FINDINGS.md`
- `project/planning-docs-chronological-index.md`

Use tranche findings as acceleration artifacts:
1. Import their gold nuggets into your working ledger
2. Mark each as `verified`, `unverified`, or `contradicted`
3. Avoid rereading source docs unless tranche confidence is low or conflicting

### 6.2 Date Bands (work newest-to-oldest)

Process documents in strict date bands:
1. **Band 0 (2026-04-08 to 2026-04-01)**: current pivot and active architecture direction
2. **Band 1 (2026-03-31 to 2026-03-23)**: transition/topology redesign wave
3. **Band 2 (2026-03-22 to 2026-03-08)**: high-activity experimentation and failures
4. **Band 3 (2026-03-07 to 2026-02-17)**: foundational context and early assumptions
5. **Band 4 (pre-2026-02-17)**: read only when needed to resolve contradictions

Within each band, priority order:
1. Session notes/chats (human evidence)
2. Decisions/post-mortems/process findings
3. Architecture/spec docs
4. Plans/research
5. Archives

### 6.3 Tiered Corpus Categories (A/B/C/D + Overview aligned)

#### Tier 0: Ground Truth and Steering (always include)
- `project/sessions/notes/`
- `project/sessions/chats/`
- `project/decisions/DECISIONS.md`
- `project/post-mortems/`
- `project/process/TRANCHE_A_FINDINGS.md`, `TRANCHE_B_FINDINGS.md`, `TRANCHE_C_FINDINGS.md`, `TRANCHE_D_FINDINGS.md`
- `project/planning-docs-chronological-index.md`

#### Tier 1: Architecture and Implementation Truth (include after Tier 0)
- `game/territory/CONQUEST_ANIMATION_SPEC.md`
- `game/territory/TERRITORY_ARCHITECTURE.md`
- `game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- Active plans in `project/implementation-plans/2026-04-08/` and `2026-04-07/`
- `plans/frontier-topology/` and `plans/geometry-refactor/`

#### Tier 2: Contextual Supporting Corpus (read selectively after Tier 0+1; **do** exhaustively **enumerate** for brainstorming index, then read by priority)
- `_review-reconcile/` (dedupe-heavy)
- `research/permanent-references/territory/` (high volume)
- `game/territory/geometry-atlas/_archive/`

#### Tier 3: Background/Low Leverage (defer by default)
- Older archive clusters unrelated to territory transition
- Generic agentic memory/rules archives that duplicate `AGENT.md`
- UI-only docs unless directly tied to territory settings reactivity

### 6.4 Low-signal and exclusion policy

Exclude from routine ingestion unless a specific question requires them:
1. Console log dumps and raw diagnostics transcripts (example: `console logs*.md`)
2. Generated/build outputs (`.svelte-kit/`, `node_modules/`, tool cache files)
3. Duplicate variants of the same external research round unless latest supersedes are unclear
4. Archived prompts/persona docs that do not contain factual project evidence
5. Large image folders and binary artifacts without accompanying textual analysis
6. **`.agent-harness/logs/*.jsonl`** — raw session transcripts; only open a **single** file if a specific incident is cited
7. **`research/.../territory/pipeline-snapshot-*`** (and similar) — huge code dumps; exclude from default passes

If excluded docs are needed later, rehydrate on demand and record why.

### 6.5 Artifact protocol (multi-session / handoff resilience)

At the end of every substantial ingestion block, produce/update these artifacts:

1. `project/process/INGESTION_LEDGER_YYYY-MM-DD.md`
   - Fields: doc, date, category, confidence, key claims, contradictions, action

2. `project/process/CLAIMS_REGISTRY_YYYY-MM-DD.md`
   - One claim per row with source type (`human`, `agent`, `spec`, `code`) and verification status

3. `project/process/CONTRADICTION_REGISTER_YYYY-MM-DD.md`
   - Pairwise contradictions with adjudication and confidence

4. `project/process/TIMELINE_CANON_YYYY-MM-DD.md`
   - Chronological event stream of attempts, decisions, and outcomes

5. `project/process/APPROACH_EVIDENCE_SCORECARD_YYYY-MM-DD.md`
   - Approach-level evidence, weighted by source reliability

6. `project/process/BRAINSTORMING_IDEAS_INDEX.md` (evolve to `BRAINSTORMING_IDEAS_INDEX_FINAL.md` by end of doc epic)
   - **Exhaustive file list** per bucket (Section 0.1) + one row per substantive idea/document; aligns with unified plan Part III.3

### 6.6 Operating Loop (repeat until complete)

1. Load next date band
2. Ingest only Tier 0+1 docs in that band
3. Update the **five core** artifacts + **brainstorming index** (expand file list / rows as buckets are enumerated)
4. Run contradiction and missing-evidence checks
5. Decide whether Tier 2 docs are needed for unresolved questions
6. Continue to older band only when current band is reconciled

### 6.7 Stop Conditions and Escalation

Stop ingestion and escalate to architect when:
- A decision requires product intent not derivable from evidence
- Two high-confidence human-grounded sources conflict
- Evidence remains inconclusive after Tier 0+1 and targeted Tier 2 sampling

Escalation packet must include:
- precise question
- top 2 interpretations
- implications of each
- recommended default if no response

---

## 7. Configuration Reference

- `pax-fluxia/src/lib/config/game.config.ts` -- All territory config keys: `TERRITORY_*`, `METABALL_*`, `DF_*`, `CONTOUR_*`, `GRAPH_*`, `LANE_*`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts` -- UI slider/toggle definitions and panel key mappings
- `pax-fluxia/src/lib/components/ui/panelSync.ts` -- Config-to-panel bridging and localStorage persistence
- `common/resources/settings-live/current-settings.json` -- Live runtime settings

---

## 8. Current Strategic Context (updated 2026-04-08)

### 8.1 Architectural Pivot: Render Family Model

The "universal 4-layer linear pipeline" has been evaluated and found to be optimized for one paradigm (vector polygon → polyline morph → draw commands) while being structurally incompatible with the DistanceField renderer -- which has the strongest track record.

**Decision (2026-04-08):** Replace the universal pipeline with a **Render Family** model:
- **Tier 1 (shared):** Ownership layer + runtime transition clock + VFX event emission
- **Tier 2 (per-family):** Each Render Family owns its geometry, transition, and presentation internally
- The existing 4-layer pipeline becomes VectorPolygonFamily's internal implementation
- DistanceField wrapping is the Phase 1 priority

See: **[TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md)** — **proposed** architecture (Parts I–II), resolved decisions **as of 2026-04-08**, and **Impl** phase spine. **Not** the authority on the full **idea** space; **canonical for Impl ordering and handoffs** once the architect locks direction. Cursor-only plan copies are optional; refresh from this file after edits.

### 8.2 Key Decisions Already Made
- **PVV** stays inside VectorPolygonFamily as a transition-mode variant (not its own family)
- **SharedTransitionClock** moves to runtime level; families receive `activeTransition.progress`
- **VFX** triggers fire from runtime based on ownership changes, not from inside families
- **Diagnostics** built incrementally alongside renderer work; `DiagnosticProvider` interface per family

### 8.3 What the Audit Should Verify

The following recollections MUST be verified against the document corpus:
- **Distance field (DF)**: Believed to be the strongest implementation for stability, cleanness, tunability, and performance -- **verify and quantify**
- **Metaballs**: Believed to have worked in principle but never tuned aesthetically -- **verify**
- **Marching squares**: Believed abandoned, never produced clean edges -- **verify or contradict**
- **Polygon morph (per-region)**: Believed to be the most reliably broken approach -- **verify**
- **Active-front topology matching**: Most recent attempt, persistent structural failures -- **verify timeline and specific failure modes**

### 8.4 Audit Lens: Render Family Mapping

When reviewing each document, additionally ask:
1. **Which Render Family does this approach belong to?** (DistanceField, VectorPolygon, Metaball, Contour, or a new family?)
2. **What transition technique does this approach use?** (GPU morph, polyline interpolation, grid lerp, crossfade, none?)
3. **What tunables does this approach use?** (Map to per-family tunable declarations)
4. **What diagnostics were available or requested?** (Map to diagnostics menu items D1-D13)
5. **What failure modes were observed?** (Map to family-level concerns vs shared concerns)

---

## 9. REQUIRED OUTPUT: Approach Tally and Family Mapping

**Methodology**: Using the date-band ingestion strategy (Section 6), produce a section that tallies mentions of each rendering approach with explicit counts. Use the tiered corpus (Section 6.3) to weight sources appropriately. Do NOT attempt to read all 706 files -- use tranche findings as acceleration and only dive into source docs when tranche confidence is low.

**Source weighting**: User feedback (session notes, chats) > post-mortems > planning docs > agent-authored status docs. Do NOT count agent claims of "fixed" as "worked" unless corroborated by user feedback.

**Family mapping**: For each approach, additionally record which Render Family it maps to, and what transition technique it uses. This directly feeds the migration plan.

**Fuzzy matching guide for tallying**:
- "distance field", "DF", "SDF", "signed distance field", "Dijkstra distance" → **Distance Field**
- "metaball", "influence field", "field-based", "influence grid" → **Metaball/Influence**
- "marching squares", "contour", "iso-contour", "isoline" → **Marching Squares/Contour**
- "power voronoi", "PVV", "PVV2", "PVV3", "weighted voronoi" → **Power Voronoi**
- "modified voronoi", "F-138" → **Modified Voronoi**
- "optimal transport", "OT", "earth mover", "Wasserstein" → **Optimal Transport**
- "active front", "topology match", "anchor", "change anchor", "walk-and-compare" → **Active Front/Topology**
- "frontier morph", "polyline morph", "arc-length", "lerp aligned" → **Frontier Morph**
- "crossfade", "alpha blend", "opacity transition" → **Crossfade**
- "rope morph", "rope interpolat" → **Rope Morph**
- "pixel", "raster grid", "ownership grid" → **Pixel/Raster**
- "graph", "lane", "seed graph", "FG2" → **Graph/Lane**
- "shader", "fragment shader", "GPU", "WebGL", "GL program" → **GPU Shader**
- "stroke mesh", "SDF border", "stroke border" → **Stroke Mesh**
- "chaikin", "smoothing", "corner rounding" → **Smoothing (Chaikin)**

### Template (fill in after document review):

| Approach | Render Family | Transition Technique | Positive | Negative | Worked (user) | Failed (user) | Net | Key docs |
|----------|--------------|---------------------|----------|----------|---------------|---------------|-----|----------|
| Distance Field (DF/SDF) | DistanceField | GPU uMorphFactor | | | | | | |
| Metaball / Influence Field | Metaball | Grid snap / lerp | | | | | | |
| Marching Squares / Contour | Contour | Async swap | | | | | | |
| Power Voronoi (PVV2/PVV3) | VectorPolygon | Weight-lerp / splice | | | | | | |
| Modified Voronoi | VectorPolygon | ? | | | | | | |
| Optimal Transport (OT) | VectorPolygon | Per-polyline OT | | | | | | |
| Active Front / Topology Match | VectorPolygon | Topology interpolation | | | | | | |
| Frontier Morph (per-polyline) | VectorPolygon | Arc-length lerp | | | | | | |
| Per-Region Polygon Morph | VectorPolygon | Polygon vertex morph | | | | | | |
| Crossfade / Alpha Blend | Any (fallback) | Alpha fade | | | | | | |
| Rope Morph / Interpolated | VectorPolygon | Rope interpolation | | | | | | |
| Pixel / Raster Grid | Pixel (new?) | Grid snap | | | | | | |
| Graph / Lane Influence | VectorPolygon | ? | | | | | | |
| GPU Shader (fragment) | DistanceField | Shader uniform | | | | | | |
| Stroke Mesh Borders | Shared utility | Vertex morph mix | | | | | | |
| Smoothing (Chaikin) | Shared utility | N/A | | | | | | |

Also tally by specific CONCERN:
| Concern | Total mentions | Positive | Negative | Key docs |
|---------|---------------|----------|----------|----------|
| Border-fill mismatch | | | | |
| Jittery/unstable borders | | | | |
| Clean vector borders | | | | |
| Smooth conquest animation | | | | |
| Performance | | | | |
| Tunability (sliders) | | | | |
| Corner/junction quality | | | | |
| Topology matching fragility | | | | |
| Birth/death effects | | | | |
| Visual appeal / aesthetics | | | | |
| Stroke effects / rounding | | | | |
| State overwrite bugs | | | | |
| Orientation/winding issues | | | | |
| Lines criss-crossing | | | | |
| Vertices jumping to (0,0) or top-left | | | | |

---

## 10. REQUIRED OUTPUT: Reconciled Timeline

Produce a chronological timeline of major events, decisions, and pivots. Include:
- Date
- What was decided/attempted
- Who decided it (human or agent)
- What happened (outcome)
- Source document

---

## 11. REQUIRED OUTPUT: Contradiction Register

List every pair of documents that contradict each other, with:
- Document A path and claim
- Document B path and claim
- Which is more likely correct and why

---

## 12. REQUIRED OUTPUT: Recommendations for the Architect

After completing the review, present:
1. **Family priority ranking** -- which Render Families have the strongest evidence of working, ranked by human-observed evidence (not agent claims)
2. **Failure patterns by family** -- do failures cluster by rendering paradigm or by transition approach? Does this validate the "family owns its transition" decision?
3. **Untried combinations** -- what combinations of geometry + transition + presentation have never been attempted? Are any of these promising under the Render Family model?
4. **DistanceField assessment** -- specific evidence for/against DF as the Phase 1 priority. What tunables does it use? What diagnostics exist? What's its transition story?
5. **Per-family tunable inventory** -- for each legacy renderer, what `GAME_CONFIG` keys does it actually read? This feeds the per-family `tunableKeys` declaration.
6. **Code salvageability by family** -- which existing code is directly wrappable (thin adapter) vs. needs refactoring vs. reference-only?
7. **Hidden render ideas** -- approaches discussed in older documents that were never implemented and might map to a new family or improve an existing one
8. **Open questions** that only the human architect can answer

---

## 13. Additional Context: Current Chat Transcript

The agent transcript from the 2026-04-07/08 session is available at:
`agent-transcripts/75b7f546-92b0-4e88-9e92-3b0bd60056c8/75b7f546-92b0-4e88-9e92-3b0bd60056c8.jsonl`

This transcript contains the most recent dialogue where the "active front topology matching" approach was finally abandoned after weeks of failure. It documents:
- The specific bugs encountered (vertices jumping to top-left, orientation mismatches, state overwrite)
- The pivot to considering influence-field boundaries
- The human architect's explicit frustration with repeated failures
- Identification of `DistanceFieldTerritoryRenderer.ts` and `contourTerritory.worker.ts` as promising existing implementations

Search this transcript for: "greenfield", "influence field", "distance field", "going around in circles", "DF", "metaball", "marching squares", "contour"

---

## 14. Project Tech Stack (quick reference)

- **Client**: SvelteKit 5 + PixiJS 8 + TypeScript (at `pax-fluxia/`)
- **Server**: Colyseus 0.15 + Bun (at `pax-server/`)
- **Shared**: `@pax/common` monorepo package (at `common/`)
- **Build/Shell**: Bun only, PowerShell (Windows), do NOT use `&&` to chain commands
- **Config**: `pax-fluxia/src/lib/config/game.config.ts` — all territory config keys (`TERRITORY_*`, `METABALL_*`, `DF_*`, `CONTOUR_*`, `GRAPH_*`, `LANE_*`)
- **UI Settings**: `settingsDefs.ts`, `panelSync.ts`, `GameSettingsPanel.svelte`

---

## 15. Non-Negotiable Requirements (from specs, updated for Render Family model)

These have been stated repeatedly across multiple documents. Verify them against source docs and flag any that are contradicted:

1. Territory fills must derive from frontier geometry (same point arrays) -- **applies to VectorPolygonFamily; DF achieves this differently via shader**
2. Unchanged borders must NOT jitter during transitions -- **universal across all families**
3. Conquest transitions must be smooth morphing animations (not crossfades, not teleports) -- **universal; each family achieves this its own way**
4. Borders must be clean, vector-quality, joined at corners (not butting) -- **applies to vector families; DF/Metaball achieve border quality differently**
5. Rounding and stroke effects are desired -- **universal aspiration; implementation varies by family**
6. The system must be tunable via runtime sliders -- **universal; per-family `tunableKeys` declarations replace fixed `TerritoryTunables`**
7. Performance must be acceptable (real-time, 60fps target) -- **universal**
8. Architecture must separate ownership from rendering -- **Render Family model: shared ownership + per-family rendering pipeline. The 4-layer internal structure is optional per family.**
9. Birth/death of sections is architecturally invalid; frontiers MOVE, they don't appear/disappear -- **applies to VectorPolygonFamily; verify whether this constraint holds for field-based families**
10. One active front per conquest, bounded by change anchors -- **applies to VectorPolygonFamily topology transitions; DF handles this implicitly via field evolution**
