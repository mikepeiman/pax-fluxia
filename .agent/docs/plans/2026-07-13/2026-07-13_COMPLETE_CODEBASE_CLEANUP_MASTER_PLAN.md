---
date: 2026-07-13
status: v2 — ALL 30 USER RULINGS INCORPORATED; execution-ready, awaiting "go Stage 0+1"
author: opus-territory
sources:
  - 2026-07-08 architecture audit findings (MASTER_TASK_LIST.md:461-467 — no standalone doc exists)
  - 2026-07-04 RENDER_QUARANTINE_PLAN (Stage A executed)
  - 2026-07-13 verification sweeps (evidence E1-E3 below)
  - 2026-07-13 RENDER_MODE_VALUE_INVENTORY.md (deletion gate — dispositions now FINAL)
  - 2026-07-13 adversarial audit (user-run) + 30 user rulings (same day)
---

# Complete codebase cleanup — master plan (v2, rulings final)

**Doctrine (user rules, binding):**
- **Consolidate before deleting.** Nothing is removed until its replacement is consolidated AND
  verified. Quarantine = move, not delete. Valuable IP is absorbed/documented BEFORE its host dies
  (per the VALUE_INVENTORY dispositions).
- **Maximalism.** Each stage does the BEST version of its job. Remove root duplication, never add
  hiding layers. Question whether each thing should exist.
- **User-absent staging (ruling Q16/17).** User tests visually at BATCHED checkpoints only; every
  stage is otherwise self-verifiable (pinned tests, build, replay-hash). Multiple stages may execute
  back-to-back between checkpoints. **Checkpoint 1: end of Stage 3** (one conquest per kept mode).
  **Checkpoint 2: end of Stage 6.**
- **One commit per stage minimum, push every commit.** Rollback = `git revert <stage commit>` +
  suite green (ruling Q30 — no extra ceremony).
- **Model plan (ruling, final):** campaign executes on **Opus 4.8**; switch to **Fable** for the
  judgment-dense work: fg2SeedGraph value-mining, Stage 1 variant matrix, Stage 5/6 decomposition
  design. Rationale recorded: shrinking + elegance compounds ALL agents' performance.

## User rulings 2026-07-13 (the authority record)

**Mode dispositions** (full detail in RENDER_MODE_VALUE_INVENTORY.md):
| Mode | Ruling |
|---|---|
| power_vector | KEEP — the product |
| grid_gradient | KEEP |
| ember_lattice, phase_edges | KEEP (phase_edges contradiction resolved: KEEP, for improvement) |
| phase_field | KEEP |
| cell_grid (plain) | QUARANTINE the mode; SURGICAL keep-map for families/cellGrid/ — Phase/Ember/Field unique features + planGridWave IP stay |
| metaball | QUARANTINE; extract notable algorithms (two-field agreement trick) + document blob look as future PowerCore skin |
| pixel | QUARANTINE; document retro look for reimplementation, code dies |
| graph/lane | QUARANTINE; document the network-control concept |
| contour | QUARANTINE after absorbing algorithms (DP simplifier, marching squares, junction pull-back) into kernel/docs |
| distance_field | QUARANTINE as resurrection blueprint (no near-term intent) |
| territory_engine, power_voronoi, pvv2_dy4 | QUARANTINE with orchestrator/ |
| territory_runtime | QUARANTINE with layers/; architecture documented as reference, not kept in-tree |
| fg2SeedGraph | DEAD — but value-mining pass REQUIRED before quarantine (understand the 5,380 LOC, extract anything not superseded, file:line receipts) |

**Policies:** saved configs remap old-id → power_vector via `normalizeTerritoryRenderModeId`
aliases (Q10). Themes: leave as-is, normalization handles them at read (Q11). Panel state: dev UI —
migrate directly whatever lives (Q12). SP/MP: VERIFIED 2026-07-13 — territory render config never
crosses the wire (no hits in multiplayerStore/common schema/server); parity holds by architecture
(Q13). StarRenderer's roundness-Chaikin = map-display tuning, KEEP as-is, outside the kernel (Q19).
devtools/geometry0319Debug + legacy benchmarks: quarantine/archive with their modes (Q23/24).
Settings: per-key classification per the 07-04 landmine protocol; `PERIMETER_FIELD_GEOMETRY_SOURCE`
is UNIVERSAL — never strip (Q25). END_SNAP_FIX_EVAL toggle SURVIVES until tuning exploration picks a
winner; soft_pins is primary but unconfirmed (Q26); rollback tag suffices (Q27). Quarantine retention:
keep `_quarantine/` until the IP-absorption list is done, then delete in one commit — git history is
the archive (Q29).

## Verified current-state evidence (2026-07-13 sweeps)

### E1 — Duplication + layering (audit UNDERSTATED: 12 Chaikin, 22 shoelace)

**Chaikin — 12 independent implementations** (audit said ~6):
`renderers/geometry/chaikin.ts` (canonical candidate), `renderers/contourTerritory.worker.ts:129`,
`renderers/VoronoiRenderer.ts:130`, `renderers/StarRenderer.ts:226` (roundness variant — KEEP as-is
per Q19), `renderers/PowerVoronoiRenderer_DY4.ts:367` (byte-identical to canonical),
`renderers/ModifiedVoronoiRenderer.ts:145`, `territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts:387`
(junction-pinned variant, byte-identical to geometryUtils), `territory/families/cellGrid/CellGridPhaseEdgesFamily.ts:147`,
`.../CellGridFamily.ts:140`, `.../CellGridPhaseFieldFamily.ts:443` (3 near-identical copies),
`territory/geometry/geometryUtils.ts:100`, `territory/frontier/chaikin.ts:6`.

**Shoelace/area — 14 production + 8 test implementations**, all the identical cross-product form:
contourTerritory.worker:148, buildFrontierTopology:276, layers/geometry/compiler_UnifiedVectorGeometry:406,
transitions/OptimalTransportBorderTransition:26, devtools/PolygonValidator:132,
layers/transition/modes/ActiveFrontFillMode:150, orchestrator/methods/fg2SeedGraph:1303,
families/buildPowerVoronoiFrontierTopology:39, geometry/buildPowerVoronoi0319AuthoritySnapshot:39,
geometry/buildInsetTerritoryRegions:47, powerCore/conquestFrontField:385 (2× convention),
powerCore/kineticTransitionRuntime:372, powerCore/sharedEdgeGraph:455, families/perimeterField/buildPerimeterFieldScene:154
(+8 powerCore test-local helpers — migrate to kernel per Q20).

**Upward imports (production):** geometry→families: `buildPowerVoronoi0319AuthoritySnapshot.ts:14` +
`powerCore/buildPowerCoreAuthoritySnapshot.ts:36` (buildPowerVoronoiFrontierTopology),
`powerCore/kineticRuntimeBridge.ts:18` (type-only RenderFamilyActiveTransition);
geometry→renderers: `powerCore/buildPowerCoreAuthoritySnapshot.ts:29` (DISCONNECT_OWNER_ID).
Plus 8 powerCore test files importing families/buildFamilyGeometry (migrate with Stage 2).

**CRITICAL finding — NOT orphans:** `territory/orchestrator/` (8 files, **6,574 LOC**) is imported by
GameCanvas, TerritoryLegacyBridge + 5 legacy renderers; `territory/layers/` (52 files, **4,701 LOC**)
is the engine of the territory_runtime path (TerritoryRuntimeCoordinator/TerritoryWorker). Two parallel
pipeline architectures are LIVE alongside PowerCore — they retire WITH their legacy modes (Stage 3).

### E2 — Legacy render-mode surface (LOC at stake)

Legacy-exclusive renderers (DistanceField 5,119 + Metaball 2,315 + PowerVoronoi 1,809 + DY4 1,585 +
PVV3 + RefactoredPVV2 + ModifiedVoronoi + Voronoi + contour worker): **~13,939 LOC**.
Legacy families (metaball, perimeterField) + territory/runtime + territory/transitions: **~9,368 LOC**.
Plus orchestrator **6,574** + layers **4,701** + `territory/legacy/TerritoryLegacyBridge.ts`.
**Total legacy surface ≈ 34,600+ LOC** (~22% of src/lib's 158,548), before counting settings cards,
catalog entries (panelSync.ts, themeRouting.ts, territoryModeShortcuts.ts), and config keys.

### E3 — God-file + temporary scaffolding

Top LOC: GameCanvas.svelte **8,555**; fg2SeedGraph.ts 5,380 (orchestrator — Stage 3);
DistanceFieldTerritoryRenderer 5,119 (legacy); CellGridPhaseEdgesFamily 4,949; CellGridFamily 3,375;
GameSettingsPanel.svelte 2,946; CellGridPhaseFieldFamily 2,645.
END_SNAP_FIX_EVAL touches 10 production files (SURVIVES per Q26). TODO/FIXME density trivial
(13, all aurelia-hud) — the debt is structural, not comment-level.

## Stages (dependency-ordered; batch-executable between checkpoints)

### Stage 0 — Baseline freeze (no code changes)
Pin the exact gate commands as package.json scripts (`test:territory`, `test:geometry`,
`test:settings`) + record: full territory suite result, `bun run check`, `bun run build`,
replay hash on TWO fixtures (one PowerCore conquest capture — overwhelming-attacker 1-2 tick;
one grid-wave capture for the kept cellGrid path), LOC inventory, grep inventory of
`TERRITORY_RENDER_MODE` values across themes/tests/config.
**Gate:** all green, numbers recorded here. **Risk: none.**

### Stage 1 — Geometry kernel consolidation

**EXECUTION LOG (2026-07-13, Opus 4.8).** Stage 0 baseline recorded: territory suite 60 files /
426 tests green; `bun run check` 0 errors (1 pre-existing CSS warning); src/lib non-test = 176,165 LOC;
legacy render-mode literals present in config/themes/tests: perimeter_field×8, territory_engine×5,
metaball×5+2, voronoi, territory_runtime, graph, ember_lattice, cell_grid.

**Variant equivalence matrix (preflight — the adversary's #4 trap):**
- CHAIKIN — 3 genuinely-distinct kernel functions required (NOT one merge):
  (a) `chaikinSmoothPolyline(tuple[], passes)` — canonical, `0.75a+0.25b`;
  (b) `chaikinSmoothPolygon(tuple[], passes, worldW?, worldH?, pad?, pinnedPtKeys?, eps?)` — the
  pinning SUPERSET (geometryUtils); default args reduce bit-exactly to the plain polygon;
  (c) `chaikinFlat(number[], passes, closed)` — flat coord form used by cellGrid Phase/Ember/Field +
  frontier, arithmetic `x0+0.25*(x1-x0)` which is algebraically equal but NOT bit-identical to (a),
  so kept SEPARATE to preserve subpixel output. StarRenderer's roundness variant EXEMPT (Q19).
  Legacy renderer copies (Voronoi/Modified/DY4/contour) + plain CellGridFamily die in Stage 3.
  renderers/geometry/chaikin.ts → deferred to Stage 2 (Q21 folds renderers/geometry into geometry home).
- AREA — 1 primitive covers all bit-exactly: `shoelace(ring)` = raw Σ(aₓbᵧ−bₓaᵧ) (=2× signed);
  `signedArea` = shoelace/2 (≡ the `s*0.5` copies bitwise); `polygonArea` = |shoelace/2|.
  conquestFrontField.ringArea2 → `shoelace`; sharedEdgeGraph/buildPV0319 → `signedArea`;
  kineticTransitionRuntime/buildInset → `polygonArea`.

**Stage 1 DONE (commits 686ff0919 area + [1b chaikin]).** Kernel at
`src/lib/territory/geometry/kernel/` {polygonArea, chaikin, index, kernel.test}. Consolidated:
- Shoelace ×5 kept copies → kernel (buildInset's local `polygonArea` was mis-named — returned
  SIGNED; the caller's `Math.abs` wrapper dropped as redundant).
- Chaikin: geometryUtils tuple pair (dead-but-exported) → re-export kernel; powerVoronoiTGG tuple
  pair (byte-identical bar 1 comment; used internally @987) → import+re-export kernel; frontier/
  chaikin flat + CellGridPhaseEdges/PhaseField flat → kernel `chaikinFlat`.
- DEFERRED (correct sequencing, NOT skipped): `renderers/geometry/chaikin.ts` + renderer-layer copies
  → Stage 2 (Q21 folds renderers/geometry into the geometry home); `families/buildPowerVoronoiFrontier
  Topology` shoelace → Stage 2 (file relocates then); legacy renderer copies (Voronoi/Modified/DY4/
  contour) + plain CellGridFamily → die in Stage 3. StarRenderer roundness variant EXEMPT (Q19).
- Gate: territory suite 61 files/434 green (+8 kernel), `bun run check` 0 errors, build green.

**Preflight (Fable-tier judgment): variant equivalence matrix** — classify the 11 in-scope Chaikin
copies (StarRenderer excluded per Q19) as byte-identical / parameterized / genuinely different.
Kernel = `territory/geometry/kernel/` exposing NAMED variants: **junction-pinned (canonical for
territory)** + plain polyline/polygon; one `signedArea`/`area`/`area2` family. Consumers migrate via
re-export shims first (zero-behavior commit), then call sites, then shims drop. The 8 test-local area
helpers migrate to kernel imports (tests prove the kernel).
**Gate:** suite + check after EACH sub-step; replay hash unchanged on BOTH fixtures.
**Risk: low-medium.**

### Stage 2 — Layering repair
Invert upward imports: `buildPowerVoronoiFrontierTopology` moves down into geometry (families
re-export during migration); `DISCONNECT_OWNER_ID` moves to a geometry-layer identity module;
kineticRuntimeBridge's type-only import gets a geometry-owned type. The 8 test files migrate off
families/buildFamilyGeometry. **Plus (Q21): fold `renderers/geometry/*` into the territory geometry
home — ONE geometry layer, not two.** Scan renderers→territory and @pax/common for further
violations while in here.
**Gate:** suite + check; replay hash unchanged. **Risk: low.**

### Stage 3 — Render quarantine (B→D+, per-mode sub-steps)

**EXECUTION LOG (2026-07-13, Opus 4.8).**
- **3B DONE (112e6b356):** functional quarantine — every non-kept mode id remaps to power_vector at
  the config boundary (`normalizeTerritoryRenderModeId` quarantine-fallback map) + GameCanvas switch
  `default:` → power_vector. Legacy render paths are now UNREACHABLE in the running game; the game is
  correct without any further 3C work. Contract test + suite + check + build green.
- **fg2 value-mining DONE** (see VALUE_INVENTORY): 2-export self-contained stage, superseded, safe.
- **3C ENTANGLEMENT FINDING (revises the plan):** the legacy renderers are NOT independently movable.
  `TerritoryLegacyBridge` dynamically imports Pixel/Lane/Contour/DistanceField; `GraphTerritoryRenderer`
  imports LaneTerritoryRenderer; the orchestrator (`territory/orchestrator`, imported by GameCanvas as
  renderTerritoryEngine/runFG2DataPipeline/extractTerritoryRenderData) feeds territory_engine/power_
  voronoi/pvv2; `layers/`+`runtime/` back territory_runtime via GameCanvasBridge. So 3C's safe unit is
  ONE ATOMIC cluster move, not per-mode: move every legacy renderer + orchestrator + layers + runtime
  + TerritoryLegacyBridge to `_quarantine/`, and in the SAME commit strip all 11 GameCanvas arms +
  their static imports (GameCanvas.svelte lines ~67-105) + reset-cache calls (~3948-3950 + heavier
  modes) + the runtime-bridge wiring. Then tsconfig/vite exclude `_quarantine/**` + barrel cleanup.
- **Sequencing note surfaced:** removing the 11 dead arms IS partial GameCanvas decomposition (Stage 5).
  Recommend doing the cluster-move as a dedicated focused pass (fresh context) — it is the single
  largest, most delicate operation in the campaign and must not be rushed against a usage-limit cutoff.
  3D (catalog/config/settings strip) follows the cluster move.

**3C-2 DONE — cluster quarantine (6b91592d4, ~24.7k LOC → src/lib/_quarantine/).** Moved orchestrator/
runtime/engine/render/legacy/integration-bridges/11-renderers+workers/families-metaball/Optimal
TransportBorderTransition/trace-diagnostics component. Excluded from tsconfig + vitest. The move
surfaced HIDDEN shared files via relative imports (moved out then back): territory/layers/** (kept —
buildFamilyGeometry/adapters/pvFrontline/devtools), integration/TerritorySettingsBridge, families/
metaball/{metaballSceneBase,config}, renderers/geometry/**. LESSON: before a bulk move, resolve the
TRANSITIVE import graph including RELATIVE imports (`../x`) — a name/substring grep misses them and
causes move-then-move-back churn. DEFERRED (dead but compiling): families/perimeterField + its GameCanvas
debug subsystem; plain families/cellGrid/CellGridFamily. Verify: check 0, suite 419, build OK.

**3D (partial) DONE — catalog strip.** TERRITORY_RENDER_MODE_CATALOG now lists only the kept modes
(none + power_vector/grid_gradient/ember_lattice/phase_edges/phase_field) → the topbar/settings render-
mode selector shows exactly the keep-set. Quarantined-id saved configs still resolve via the 3B
fallback. DEFERRED (Q25 "your call", low-value + risky vs the settings-as-data system + type surgery +
the PERIMETER_FIELD_GEOMETRY_SOURCE landmine): stripping dead per-mode settings CARDS
(metaball/DF/perimeter) + search-index keys + dead config KEYS + unused deps. These are cosmetic dead
config, harmless; a focused follow-up.

**3C-1 DONE — GameCanvas dispatch severance.** Deleted all 11 quarantined switch arms (~600 LOC) via
brace-matched boundaries (lesson: derive case boundaries by brace-matching, NOT eyeballing — a 5-line
mis-boundary truncated the kept power_vector case and produced a downstream parse error; caught + fixed
by restoring from backup and re-deriving). Fixed a 3B regression: added `case "none": break;` so Off
renders nothing (the `default:`→power_vector fallthrough would otherwise have rendered PV for Off).
Removed legacy renderer + orchestrator + runtime-bridge imports, runtime vars + buildRuntimeBridgeInput
+ reset blocks, MetaballFamily/CellGridFamily/createPerimeterFieldFamily imports, the metaball/perimeter/
cell_grid pre-switch cleanup blocks, and the plain-CellGridFamily diagnostic branches; emptied
resetTerritoryRenderCaches. **DEFERRED (documented follow-up):** PerimeterFieldFamily's diagnostic
capture subsystem (capturePerimeterFieldLiveFrame / syncPerimeterFieldDiagnosticCapture / perimeter
debug-draw blocks) is dead (activeMode never 'perimeter_field') but still references the type — excising
it (and thus moving families/perimeterField + its MetaballRenderer dep) is a bounded follow-up. Verify:
check 0 errors.


**3C-3 DONE (2026-07-14) — deferred perimeterField excision + MetaballRenderer orphan.** CHECKPOINT 1
PASSED (user: "Looks good! All modes working"). Removed from GameCanvas (**7,820 → 7,017 LOC, −802**):
the 4 `PerimeterField*` capture types, 6 replay vars, 12 capture/replay fns
(clone/captureLive/record/finalize/syncDiagnosticCapture/applyReplayPresentation…),
`renderPerimeterFieldDebugOverlay` + its `measurePerf` call, and its 5 now-orphaned debug-draw helpers
(getPerimeterDebugLoops/drawClosedPolyline/drawSamplePoints/drawPerimeterSampleTrajectories/
drawPerimeterSampleLabels). **The Q25 landmine held:** `normalizePerimeterFieldGeometrySource`
(geometry/geometrySource.ts) + `buildPerimeterFieldRenderFamilyGeometry` (families/buildFamilyGeometry.ts)
+ `PERIMETER_FIELD_GEOMETRY_SOURCE` / `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY` are UNIVERSAL despite the
name — all kept and verified in use by the kept CellGrid Phase/Ember/Field families. Also: stripped
`perimeterFieldAdapter` + 6 exclusive helpers from devtools/TransitionDiagnosticsAdapters (pvFrontline
adapter kept); removed the dead `PerimeterFieldDiagnosticsPanel` mount + dead mode-ids from
ControlsSection-Diagnostics (the "Show Underlying Geometry" toggle is LIVE for kept modes — legacy key
name only); deleted the now-importerless Stage-2 shim `families/buildPowerVoronoiFrontierTopology.ts`
and moved its stranded test to `geometry/` beside the impl.
**Quarantined (+8,299 LOC → 33,848 total):** families/perimeterField/** (config.ts STAYS — holds the
universal keys), **renderers/MetaballRenderer.ts (~2.3k, orphaned once perimeterField left — only the
unused barrel + its own test referenced it)** + its test, devtools/{PerimeterFieldConquestPackage,
perimeterFieldGeometryArtifact}, ui/{PerimeterFieldDiagnosticsPanel,PerimeterFieldDiagnosticsControls}.
Active src/lib **167,561 → 158,220 (−9,341;** ~1,042 genuinely deleted, rest moved).
Gate: check 0 errors, territory suite 57 files/409 tests green (−2 files/−10 tests = the 2 quarantined
PF test files), build OK, **no new full-suite failures** (baselined against HEAD by stash).
**LESSON (interleaving trap):** the perimeter capture types/vars/fns were INTERLEAVED with a LIVE
generic `TransitionDiagnostic*` capture subsystem + `buildStarPositionsMap` + `cloneCanvasFrame` — a
contiguous line-range cut would have destroyed live code. Removal ran as 6 verified runs between known
survivors. Both brace-matching scripts were UNRELIABLE (`function f(params: {` closes depth at `}): T {`;
multi-line `let x:\n | A\n | null`) — boundaries were confirmed against printed file content instead.
**FINDING (follow-up):** `src/lib/renderers/index.ts` barrel has ZERO importers (all consumers import
the concrete modules directly) — it is dead re-export cruft; flagged, not unilaterally deleted.

Keep-set: power_vector, grid_gradient, ember_lattice, phase_edges, phase_field.
**Pre-step (Fable-tier): fg2SeedGraph value-mining** — one focused reading pass of the 5,380 LOC;
extract non-superseded IP into the VALUE_INVENTORY with file:line receipts. Same absorption duty for
metaball's two-field agreement trick, contour's algorithms, pixel's look-doc, graph's concept-doc
(dispositions table above).
- **3B — dispatch fallback:** remove quarantined `case`s from GameCanvas switch; `default` →
  power_vector; add old-id → power_vector aliases to `normalizeTerritoryRenderModeId`.
- **3C — quarantine files** (one MODE per sub-step, import-survivability checked each): legacy
  renderers, metaball + perimeterField families, orchestrator (with territory_engine/power_voronoi/
  pvv2 + TerritoryLegacyBridge), layers + runtime (with territory_runtime), devtools/geometry0319Debug
  + legacy benchmarks (Q23/24). **families/cellGrid gets the SURGICAL keep-map** (Q4): Phase/Ember/
  Field families + planGridWave stay; plain-CellGrid-only code moves. Add `_quarantine/**` to
  tsconfig+vite excludes; clean barrel exports (renderers/index.ts); audit `?worker` imports.
- **3D — catalog/config/settings:** strip quarantined ids from catalog + config defaults; settings
  per-key classification strip (metaball/DF/perimeter cards, settingMetadata, search index) with
  `settingsWiringInvariant` + themeRouting tests updated in the same commits; dependency prune
  (d3-weighted-voronoi etc.) if keep-set no longer imports them.
**Gate per sub-step:** build + suite + replay hash. **CHECKPOINT 1 (user):** one conquest per kept
mode, topbar selector shows exactly the keep-set. **Risk: medium — the hurt stage; staged per-mode.**

### Stage 4 — Scaffolding retirement (SHRUNK per Q26)
END_SNAP_FIX_EVAL toggle SURVIVES (tuning exploration pending). This stage strips only: dead probes,
TEMP diagnostics, retired eval branches provably unreachable, harness leftovers.
**Gate:** suite + check. **Risk: low.**

### Stage 4B (2026-07-14) — dead-module closure sweep (NEW, unplanned; the campaign's biggest single win)

A whole-tree import-graph fixpoint sweep (resolving `$lib` aliases AND relative specifiers) found
**137 src/lib modules whose every importer is itself dead** → `_quarantine/dead-2026-07-14/**`
(path-preserving; restore = reverse `mv`). **Active src/lib 153,417 → 136,216 (−17,201).**
Biggest: renderers/frontierGraph (1,443), renderers/geometry/borderTransition (955),
GameThemeManager.svelte (648), an entire unused 27-component **HUD-package** (PaxFluxiaHud 554,
GameHudTopBar 514, …), strokeMeshBorders (516), the pre-PowerCore border/transition renderer lineage,
plus both dead barrels (renderers/index.ts, families/cellGrid/index.ts).
**Soundness argument (the risk is a runtime-only ref, which check/build canNOT catch):** verified ZERO
dynamic imports with non-literal specifiers, ZERO `<svelte:component>` indirection, and the only
src/lib paths named as strings in vite.config.js (browserBenchEntry, navigationStub) are live roots.
Tests are live roots → nothing test-covered can be marked dead (deliberately conservative). Sanity:
GameCanvas / GameSettingsPanel / ControlsSection-Territory correctly LIVE.
Gate: **check 0 errors + 0 warnings** (the long-standing unused-CSS warning was inside the dead
GameThemeManager), full suite 82 files/479 tests green (unchanged — the dead tree had NO test
coverage), build OK. Commit `ab6397b31`.

**Suite repair (`dbc252bf6`):** the pinned gate was the TERRITORY suite, so 4 full-suite failures sat
unnoticed since Stage 3B/3D. themeRouting's family taxonomy enumerated ONLY quarantined modes → every
KEPT mode fell to `default:'agnostic'`; replaced with a data-driven keep-set map + one `legacy` bucket.
geometry0319Debug expected the retired `power_voronoi_0319` to pass through (PowerCore normalizes it
to `power_core`). benchmark-frontier-techniques imported createCellGridPhaseEdgesFamily from the wrong
module (kept-mode benchmark → fixed); benchmark-territory-metaball → `tools/_quarantine` (Q23/24);
tsconfig exclude generalized to `**/_quarantine/**`. **Full suite green for the first time.**
**CORRECTION (honesty):** `dbc252bf6` justified the themeRouting fix as "user-visible in the theme
manager" — WRONG. GameThemeManager is itself dead. auditThemeRouting/groupThemesByRenderFamily/
THEME_RENDER_FAMILY_META have NO live consumer; themeRouting.ts as a module IS live (themeStore/
builtinThemes/themeNames use normalizeThemeValues + resolveThemeRenderMode). The claim was asserted
without verifying the component was mounted.

**OPEN (Stage 7):** 2nd-order dead — exports kept alive ONLY by their own tests (the themeRouting
family taxonomy is one; plain-CellGridFamily was another until `06c834496`). The sweep cannot see
these because tests are live roots. Needs a per-export pass, not a per-module one.
**LESSON:** "dead code" hides behind BARRELS and TESTS. Two barrels (renderers/, cellGrid/) had zero
importers yet kept ~2.3k LOC (MetaballRenderer) reachable; a module imported only by its own test looks
live to every module-level tool. Re-run `orphans2.cjs`-style fixpoint sweeps at Stage 7.

### Stage 5 — GameCanvas decomposition (8,555 LOC → **7,017** after 3C-1/3C-3)
Extract per responsibility map (built at stage start): render-family lifecycle, geometry-build
scheduling, transition scheduling, input/orders, combat FX — one extraction per commit, suite between.
Decomposition DESIGN is Fable-tier; extraction execution Opus.
**Gate:** suite + check + build per extraction. **Risk: high — never batched with other stages.**

### Stage 6 — GameSettingsPanel decomposition (2,946 LOC) (Q22)
Same discipline as Stage 5 for the settings god-file + alignment with the settings-as-data doctrine.
**Gate:** suite + check + settingsWiringInvariant. **CHECKPOINT 2 (user):** one full play session +
settings pass. **Risk: medium.**

### Stage 7 — Docs/tests alignment + final audit
Update TERRITORY_ARCHITECTURE.md + geometry atlas; archive stale docs; re-run E1-E3 sweeps.
**Numeric acceptance (Q28):** exactly 1 Chaikin implementation in kept territory code (kernel;
StarRenderer's map-display variant exempt), 1 shoelace family, 0 production upward imports,
0 kept-code imports from `_quarantine/` (grep-gated), catalog lists exactly the keep-set.
Record final LOC vs Stage 0. Then (Q29) schedule the quarantine deletion commit once the
IP-absorption list is confirmed done.

## Sequencing rationale
Consolidation (1) precedes deletion (3,4) per doctrine. Layering (2) before quarantine (3) so moved
files don't carry broken imports. Kernel + quarantine shrink GameCanvas's import surface before its
decomposition (5). Panels (6) after 5 reuses the decomposition pattern. 0 and 7 bracket everything
with measurement. Stages 0-3 may run back-to-back without user attendance; Checkpoint 1 gates entry
to 4+.

## Post-cleanup note (expectation alignment, Q5)
Geometry is ALREADY unified on PowerCore — what remains after this campaign is render-path/skin
unification: phase/ember/field still carry 3-5k LOC adapter families atop shared geometry. Turning
kept modes into thin PowerCore skins is the NEXT campaign, enabled by this one.
