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

## ✅ UPDATE 2 (2026-06-19, after user perf feedback) — Edges/Ember blank RESOLVED + perf findings

**Blank ROOT CAUSE (real, via the live probe + git archaeology — supersedes §1's worker hypothesis):**
The live `[PHASE-DIAG]` showed Ember `geomRegions:10` (geometry FINE) but `planPresent:false` — `cachedPlan`
never built. `MetaballGridPhaseEdgesFamily.update()` (~line 2807) **early-returns blank** when the legacy
`METABALL_GRID_ENABLED` master gate is off, and its default `(TERRITORY_RENDER_MODE === 'metaball_grid')` never
enabled the dedicated phase modes — regression from **f4bc81a93**. My node tests masked it by forcing
`METABALL_GRID_ENABLED:true`. **Fixed (98c517457):** `enabled = enabledTunable || TERRITORY_RENDER_MODE ===
this.id`. Proven by `phaseEdgesEnabledGate.test.ts` (fails without the fix — verified by neutralizing it).
My earlier worker-empty-plan guard + steady-wave candidates were the WRONG hypothesis (geometry was never empty);
the guard remains as a harmless defensive net but is not the fix.

**Performance findings (benchmark `gridFamilyPerf.bench.test.ts`, since deleted — results recorded here):**
With a realistic ~10k-cell grid, ALL three families SKIP unchanged steady frames — per-frame steady cost
≈0.1–0.4ms (well under the 6.9ms/144fps budget). One-shot plan+scene BUILD is 42–77ms but is offloaded to the
plan Worker (the sync fallback only runs the very first frame). The geometry cache key (`id:owner:x:y` per star,
NOT ship counts) is stable between frames, so geometry isn't rebuilt per-frame. **So I could NOT reproduce
continuous lag headless — it is live-specific:** most likely (a) GridGradient's shader-field backend (only runs
when `document` exists — node falls back to graphics, so it's unmeasured here), and/or (b) a live input that
breaks the per-frame skip during active transitions. **Needs live profiling** (the 36s bottoms-up self-time names
the function — capture it). My one-shot `[PHASE-DIAG]` probe was NOT a per-frame cost; removed it anyway (it was
in the render path). The real perf work needs the profiler's function name, which I can't get headless.

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

### Candidate fixes (committed; need visual verification)
Two complementary changes in `MetaballGridPhaseEdgesFamily`:

**(A) Worker-plan empty guard (PRIMARY, robust).** `commitPendingWorkerPlan` now refuses to replace a
non-empty cached plan with an **empty** worker plan (0 emittable cells). This is the clearest node-vs-live
difference: node tests have no `Worker` and render 1600+ cells; the live `Worker` can return a 0-cell plan
that blanks the family. The guard triggers ONLY when the sync plan produced cells but the worker did not, so
it never masks a legitimately-empty territory (sync would be empty too). Covered by a unit test
(`phaseEdgesWorkerPlanGuard.test.ts`). This handles *any* worker-produces-empty cause.

**(B) Steady wave consistency (secondary).** `buildWorkerRequest` accepts a `waveOverride`; the steady-state
request passes `{ waveSeeding:'winner_natives', waveGeometry:'grid_bfs', adjacency:'8' }` so the worker's
steady plan matches `buildSteadyStatePlan` (which uses `grid_bfs`), instead of the configured transition wave
`pre_to_post_frontier`. A real consistency bug, though at steady `rawProgress===1` the scene likely ignores
the wave — so this is probably not the root, but it is correct and safe.

**Caveat:** if the live cause is **empty geometry** (`geomRegions: 0` — edge-forward 0319 produces no regions
for the live map), neither fix helps (sync would be empty too); that would be a geometry-generation issue
needing the live map. The probe's `geomRegions` distinguishes this.

**Status: CANDIDATE.** If Phase Edges/Ember still blank after this, the next datum is the live probe's
`geomRegions` / `planPresent` / `planNative` (already instrumented) which separates empty-geometry vs
absent/empty-plan vs scene-step. The probe logs on the `renderer` channel as `[PHASE-DIAG]`.

---

## 2. Pre-existing test failures (diagnosed, NOT auto-fixed — both are geometry-visual)

Two failures in the territory suite (baseline, predate this session). Both are geometry-visual decisions
in the user's domain, so I diagnosed precisely but did **not** change geometry without visual sign-off.

### 2a. `TerritorySettingsBridge` — `starMargin` default
- Test `reads tunables from config and falls back safely` expects default `starMargin: 75`; code returns `0`.
- Source: `geometryTuning.ts:41` `const DEFAULT_STAR_MARGIN = 0;`.
- **Git forensics:** `040634c08` (ember split) *deliberately* introduced `DEFAULT_STAR_MARGIN = 75`
  (replacing an inline `45`). Then `6a67a5d34` ("refactor: decouple lane clearance and trim telemetry",
  a 44-file / −2345-line refactor) changed `75 → 0` — a value change unrelated to the commit's stated
  purpose. The test was NOT touched. → **Almost certainly accidental drift.**
- **Recommendation:** restore `DEFAULT_STAR_MARGIN = 75` (matches the deliberate value + the test-as-spec).
  Low real-world impact (themes set `MODIFIED_VORONOI_STAR_MARGIN` explicitly, overriding the default).
  Left for your call because it's a geometry-visual default. Verify no other geometry snapshot tests rely on 0.

### 2b. `powerVoronoiTerritoryGeometryGenerator` — `constructFillsFromFrontierChain` junction walk
- Test `walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur`
  expects `fills.length === 1`; gets `0` (empty).
- This is the known **junction-walk bug** ("broken fills = executeChainWalk junction bug"). The test
  encodes the **angular-order** clockwise-adjacent walk — which YOU reverted (`07c343ef7`) in favor of the
  greedy baseline. Re-implementing angular-order would contradict that revert.
- The greedy path returning *empty* (rather than a differently-shaped fill) is a genuine bug, but it's
  core geometry you have specific direction on + visually verified. **Not auto-touched.** Decide: update
  the test to the greedy expectation, or fix greedy to not return empty at junctions (needs your call on
  the intended junction behavior).

## 3. Audit / hygiene notes (not changed)
- `TerritoryRuntimeCoordinator` PVV4 auto-download + raw `console.log` already removed earlier this session
  (`b737e1fd8`); geometry dump now opt-in on the `renderer` channel.
- `travelTrace.ts` uses raw `console.log` (§5.2) — but it is an explicitly-armed dev trace tool whose
  console output IS its product; converting to a gated channel would hide it. Left as-is.
- `downloadPerimeterFieldGeometryArtifact` / `downloadPerimeterFieldConquestPackage` /
  `...ContactSheet` are exported but have **no callers** (dead/manual). Deletion candidates — left intact
  (no deletions without sign-off).

## 4. Verification constraint (why this session is candidate-fix + docs heavy)
The live game cannot be driven headlessly here: `/bench` stubs `openGameShell`; `/play` START GAME needs
players/map (canvas mounts then unmounts at players:0); PIXI blocks long `preview_eval`; screenshots hang.
So geometry/transition **correctness** and **per-frame performance** can't be verified by me — they need
your visual sign-off / live profiling. I therefore committed one safe candidate fix and otherwise produced
precise diagnoses + recommendations rather than unverifiable geometry changes.

## 5. Prioritized action list for the user (on return)
1. **Run the `[PHASE-DIAG]` probe on Phase Edges** (Renderer channel on; filter `PHASE-DIAG`). The fields
   `geomRegions` / `planPresent` / `planNative` decide the blank's true cause:
   - `geomRegions: 0` → edge-forward 0319 geometry is empty for the live map (geometry-gen issue).
   - `geomRegions > 0`, `planNative: 0` → classification/plan empties live (worker serialization?).
   - `planNative > 0`, `fillInstructions: 0` → scene step. (My committed wave fix targets a related
     consistency issue but, given steady `rawProgress===1`, is likely not the root — confirm with the probe.)
2. **starMargin**: restore `DEFAULT_STAR_MARGIN = 75` if you agree it was accidental (2a).
3. **Junction walk**: decide greedy junction behavior (2b) — re-spec the test or fix greedy-returns-empty.
4. **Provenance experiment (`power_voronoi_frontier`)**: ready to build collaboratively — additive, behind a
   flag, Grid Gradient consumes first. Held back from blind autonomous build (needs visual gate).
5. **Performance**: needs live profiling (classification is already bucketed + cached one-shot; the per-frame
   cost is scene-building, which I can't profile headless).
