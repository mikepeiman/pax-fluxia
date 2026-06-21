---
date created: 2026-06-19
last updated: 2026-06-19
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-17/2026-06-17_TERRITORY_ARCHITECTURE_CONSOLIDATED.md
  - .agent/docs/project/post-mortems/2026-06-19_logging-channel-gating-violation.md
superseding docs:
---

# 2026-06-19 — Autonomous work session

User stepped away for several hours and asked for maximum progress across the major fronts
(PVV4 geometry/render/transition pipeline; Grid Gradient + Phase Field/Edges/Ember performance;
any other issues/improvements), with full autonomy, clear documentation, and proper git hygiene.

## Operating guardrails (from memory + AGENT.md)
- **Visual sign-off is the gate** for geometry/transition *correctness*. I cannot run the live game
  headlessly (menu START GAME needs players/map; PIXI blocks long evals; screenshots hang). So any
  geometry/transition change is committed as a **documented candidate for visual verification**, never
  declared "fixed".
- Bias to **verifiable** work: deterministic tests, benchmarks, repros, type-checks.
- No deletions of user-facing controls; behind flags where risky; commit + push each unit.
- Telemetry logger only (no raw `console.log`); diagnostics on a channel the user has on (`renderer`).

## Priority order (verifiability-weighted)
1. Phase Edges/Ember blank (#1 blessed task) — code root cause + safe candidate fix.  ← in progress
2. Grid-family performance (classification / scene) — measurable via benchmarks.
3. Pre-existing test failures (settings starMargin; constructFillsFromFrontierChain).
4. Code hygiene (raw console.log in travelTrace; dead perimeter-field download fns).
5. PVV4 pipeline — document the trace + fix concrete bugs only (no unverifiable rewrites).

---

## 1. Phase Edges / Ember blank — diagnosis + candidate fix

### Symptom (user, verbatim)
Complete absence of rendered territory (zero fill, zero borders) on **Phase Edges** and **Ember**.
Phase Field, Grid Gradient, PVV4, DY4 all render. Live `[PHASE-DIAG]` probe data:

| Mode | renders | fillInstructions | drBounds |
|---|---|---|---|
| Grid Gradient | yes | 24 | real (w 790, h 1207) |
| Phase Field | yes | 260 | real |
| Ember | **no** | **0** | **{0,0,0,0}** |
| Phase Edges | **no** | **0** | **{0,0,0,0}** |

So the blank set = exactly **`MetaballGridPhaseEdgesFamily`** (Phase Edges + Ember are the same class,
same `buildEdgeForwardRenderFamilyConfigSource`, byte-identical dispatch — only id/label differ).

### Ruled OUT (deterministic vitest with real 0319 geometry)
- Geometry: real 0319 → 2 regions. ✓
- Classification (`buildGridClassification`): steady-state → **405 native cells** (2508 at live spacing). ✓
- Family render in isolation: full family + real config (with/without a mock renderer) → **1618 visible
  fill instructions**, `displayRoot.visible=true`. ✓
- Coordinates: localized (origin-0) regions + the live `worldMin(85.75, −857)` → 2508 cells, same as
  `worldMin(0,0)`. The grid subtracts `worldMin`; localized geometry aligns. **Coordinates are not it.** ✓
- Config gates (`METABALL_FILL_ENABLED`, `METABALL_ALPHA`): real config → still 1618 fills. ✓

### Root-cause hypothesis (the live-only difference)
The family builds its plan via an **async Web Worker** (`metaballGridPlan.worker.ts`) that my node tests
never exercise (no `Worker` in node → sync fallback → renders). In the browser:
1. `update()` line 2768 calls `commitPendingWorkerPlan()` at the top — it **overwrites `this.cachedPlan`**
   with the worker's result.
2. Frame 1 renders the good **sync** steady plan (`buildSteadyStatePlan`, wave `grid_bfs`/`winner_natives`,
   1618 cells).
3. The worker computes the steady plan but the request (`buildWorkerRequest`) sent
   `waveGeometry = settings.waveGeometry` = **`pre_to_post_frontier`** (a *transition* wave), NOT the steady
   `grid_bfs`. When it commits, it replaces the good sync plan → suspected blank.

The worker classification itself is NOT empty (same `buildGridClassification`, same inputs → cells). The
divergence is the **wave params**: steady worker plan ≠ sync steady plan.

### Candidate fix (committed; needs visual verification)
`MetaballGridPhaseEdgesFamily.buildWorkerRequest` now accepts a `waveOverride`; the **steady-state** worker
request passes `{ waveSeeding:'winner_natives', waveGeometry:'grid_bfs', adjacency:'8' }` so the worker's
steady plan is **identical to `buildSteadyStatePlan`**. The transition branch is unchanged (still uses the
configured wave). This preserves the worker offload (perf) and is safe either way: worker steady == sync
steady, both proven to render.

**Status: CANDIDATE.** If Phase Edges/Ember still blank after this, the next datum is the live probe's
`geomRegions` / `planPresent` / `planNative` (already instrumented) which separates empty-geometry vs
absent/empty-plan vs scene-step. The probe logs on the `renderer` channel as `[PHASE-DIAG]`.

---

## 2–5. (appended below as completed)
