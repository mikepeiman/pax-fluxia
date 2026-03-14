# Territory Engine Modular Architecture + Interactive Step Mode (2026-03-12)

## 1) Architecture Goals
- Maximum interchangeability across static, dynamic, and hybrid territory methods.
- One pipeline contract regardless of active method.
- Deterministic stage-level tracing and step execution for debugging.
- Runtime switching without rewiring `GameCanvas`.

## 2) Core Module Layout
- `pax-fluxia/src/lib/territory-engine/types.ts`
  - Method IDs, mode IDs, stage IDs, descriptor contracts, trace schema.
- `pax-fluxia/src/lib/territory-engine/registry.ts`
  - Registries for FG1..FG5, DY1..DY5, HY1..HY5.
- `pax-fluxia/src/lib/territory-engine/engine.ts`
  - Selection resolution, stage execution, interactive step state, trace publication.
- `pax-fluxia/src/lib/territory-engine/index.ts`
  - Public API exports.

## 3) Runtime Selection Model
Config keys:
- `TERRITORY_ENGINE_ENABLED`
- `TERRITORY_ENGINE_MODE` (`static|dynamic|hybrid`)
- `TERRITORY_ENGINE_STATIC_METHOD`
- `TERRITORY_ENGINE_DYNAMIC_METHOD`
- `TERRITORY_ENGINE_HYBRID_PLAN`
- `TERRITORY_ENGINE_TRACE_MODE`
- `TERRITORY_ENGINE_STEP_MODE`
- `TERRITORY_ENGINE_STEP_ADVANCE_TOKEN`

UI wiring:
- `ControlsSection-Territory.svelte` exposes all keys.
- `settingsDefs.ts` maps panel keys to GAME_CONFIG.

## 4) Stage Pipeline Contract
Stage order:
1. `metric`
2. `world_extension`
3. `seed`
4. `topology`
5. `geometry`
6. `loop`
7. `animation`
8. `render`

Rules:
- Each stage writes artifacts to a shared runtime map.
- Each stage emits a trace step with duration and summary payload.
- Render stage is adapter-backed during bootstrap and is replaceable by native method implementation.

## 5) Interactive Step Mode Design
Current implemented scaffold:
- Engine keeps an interactive run state keyed by selection + world fingerprint.
- With step mode enabled, first stage runs immediately.
- Each increment of `TERRITORY_ENGINE_STEP_ADVANCE_TOKEN` executes exactly one additional stage.
- Trace run is published after each stage so debug UI can display function + data summaries.

Planned next increment:
- Dedicated inspector panel to show:
  - current stage
  - stage artifact payload
  - owner-pair frontier counts
  - per-stage timing histogram
- Controls:
  - Play/Pause
  - Step Forward
  - Reset Run
  - Jump to Stage

## 6) Difficulty Estimate (Interactive Full Fidelity)
Scope evaluated: pause every computational and visual step, show function name, arguments, outputs, and intermediate geometry overlays.

Estimated difficulty: **High but tractable**.

Breakdown:
- Stage-level stepping and trace payloads: **implemented baseline** (low remaining effort).
- Function-level instrumentation in all frontier algorithms: **medium-high** (many call sites).
- Visual overlays per stage artifact (seeds, topology graph, loops, mesh): **medium**.
- Deterministic replay capture for snapshots/events: **high**.
- Inspector UX with filtering/search/export: **medium**.

Effort estimate:
- Minimal usable inspector: 3-5 focused dev days.
- Full detailed interactive lab (function-level + replay + overlays): 2-3 weeks.

## 7) Epic Branch Strategy
- `codex/territory-engine-epic-architecture` (active): contracts, registry, runtime routing, step scaffold.
- `codex/territory-engine-epic-fg2-canonical` (next): implement first native canonical frontier path.
- `codex/territory-engine-epic-hy2-delta` (next): local delta patch hybrid runtime.
- `codex/territory-engine-epic-step-inspector` (next): UI and overlay debugger.
- `codex/territory-engine-epic-benchmarking` (next): perf harness + method comparison reports.

## 8) Non-Negotiable Validation
- Shared frontier/fill coincidence test per method.
- Ownership flip torture tests on high-density maps.
- Determinism checks with fixed random seed and repeated runs.
- Method swap during runtime without stale artifact bleed.