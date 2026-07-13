---
date: 2026-07-13
status: PLAN — staged, approval-gated; no stage executes without user go
author: opus-territory
sources:
  - 2026-07-08 architecture audit findings (MASTER_TASK_LIST.md:461-467 — no standalone doc exists)
  - 2026-07-04 RENDER_QUARANTINE_PLAN (keep-set confirmed; Stage A settings strip executed)
  - 2026-07-13 fresh verification sweeps (3 parallel agents; evidence below)
---

# Complete codebase cleanup — master plan

**Doctrine (user rules, binding):**
- **Consolidate before deleting.** Nothing is removed until its replacement is consolidated AND the user has verified success live. Quarantine = move, not delete.
- **Maximalism.** Each stage does the BEST version of its job, not the least disruptive. No "hiding-layer" fixes; remove root duplication.
- **Plan-first per stage.** Each stage below gets its own short execution plan + user approval before edits.
- **One commit per stage, push immediately, gates between.** Verification = tests + `bun run check` + replay-hash where presentation-only + user's eyes for anything visual.
- **Question whether it should exist.** Every file touched gets the existence challenge, not just a tidy-up.

## Verified current-state evidence (2026-07-13 sweeps)

### E1 — Duplication + layering (audit UNDERSTATED: 12 Chaikin, 22 shoelace)

**Chaikin — 12 independent implementations** (audit said ~6):
`renderers/geometry/chaikin.ts` (canonical candidate), `renderers/contourTerritory.worker.ts:129`,
`renderers/VoronoiRenderer.ts:130`, `renderers/StarRenderer.ts:226` (roundness variant),
`renderers/PowerVoronoiRenderer_DY4.ts:367` (byte-identical to canonical),
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
(+8 powerCore test-local helpers).

**Upward imports (production):** geometry→families: `buildPowerVoronoi0319AuthoritySnapshot.ts:14` +
`powerCore/buildPowerCoreAuthoritySnapshot.ts:36` (buildPowerVoronoiFrontierTopology),
`powerCore/kineticRuntimeBridge.ts:18` (type-only RenderFamilyActiveTransition);
geometry→renderers: `powerCore/buildPowerCoreAuthoritySnapshot.ts:29` (DISCONNECT_OWNER_ID).
Plus 8 powerCore test files importing families/buildFamilyGeometry (migrate with Stage 2).

**CRITICAL finding — NOT orphans:** `territory/orchestrator/` (8 files, **6,574 LOC**) is imported by
GameCanvas, TerritoryLegacyBridge + 5 legacy renderers; `territory/layers/` (52 files, **4,701 LOC**)
is the engine of the territory_runtime path (TerritoryRuntimeCoordinator/TerritoryWorker). Two parallel
pipeline architectures are LIVE alongside PowerCore — they retire WITH their legacy modes (Stage 3),
not as free-floating "abandoned experiments."

### E2 — Legacy render-mode surface (LOC at stake)

Legacy-exclusive renderers (DistanceField 5,119 + Metaball 2,315 + PowerVoronoi 1,809 + DY4 1,585 +
PVV3 + RefactoredPVV2 + ModifiedVoronoi + Voronoi + contour worker): **~13,939 LOC**.
Legacy families (metaball, perimeterField) + territory/runtime + territory/transitions: **~9,368 LOC**.
Plus orchestrator **6,574** + layers **4,701** + `territory/legacy/TerritoryLegacyBridge.ts`.
**Total legacy surface ≈ 34,600+ LOC** (~22% of src/lib's 158,548), before counting settings cards,
catalog entries (panelSync.ts, themeRouting.ts, territoryModeShortcuts.ts), and config keys.

### E3 — God-file + temporary scaffolding

Top LOC: GameCanvas.svelte **8,555**; fg2SeedGraph.ts 5,380 (orchestrator — goes with Stage 3);
DistanceFieldTerritoryRenderer 5,119 (legacy); CellGridPhaseEdgesFamily 4,949; CellGridFamily 3,375;
GameSettingsPanel.svelte 2,946; CellGridPhaseFieldFamily 2,645.
END_SNAP_FIX_EVAL touches **10 production files**: GameCanvas, HudTopbar, game.config, territory.config,
PowerVectorFamily, powerCore/{buildSurfaceFromCells, conquestFrontField, kineticRuntimeBridge,
kineticTypes, sampleKineticFrame}. TODO/FIXME density is trivial (13, all aurelia-hud) — the debt is
structural, not comment-level.

## Stages (dependency-ordered)

### Stage 0 — Baseline freeze (no code changes)
Capture the safety net every later stage is judged against: full territory suite run recorded,
`bun run check` clean, replay hash captured on a fixture capture, current LOC inventory (from E3).
**Gate:** all green, numbers recorded in this doc. **Risk: none.**

### Stage 1 — Geometry kernel consolidation (consolidation FIRST, per doctrine)
Fold the duplicate primitive implementations (Chaikin ×~6, shoelace/area ×~6, plus point-in-ring /
segment-key/quantize copies found in E1) into ONE geometry kernel module under
`src/lib/territory/geometry/kernel/`. Every consumer imports the kernel; duplicates become
re-exports first (zero-behavior-change commit), then call sites migrate, then the re-exports drop.
**Gate:** territory suite + typecheck after EACH sub-step; replay hash unchanged (pure refactor).
**Risk: low-medium** (mechanical, but wide).

### Stage 2 — Layering repair (upward imports)
Invert the two audit-flagged upward dependencies:
- `geometry → families` (`buildPowerVoronoiFrontierTopology`) — move the topology builder down into
  geometry (it is geometry), families re-export during migration.
- `geometry → renderers` (`DISCONNECT_OWNER_ID`) — the constant belongs in a shared
  geometry-layer identity module (it already governs cell ownership semantics).
Plus any additional upward imports E1 finds. **Gate:** suite + check; no behavior change expected.
**Risk: low.**

### Stage 3 — Render quarantine, Stages B→D (A already executed 2026-07-04)
**PRECONDITION (user directive 2026-07-13):** the RENDER_MODE_VALUE_INVENTORY
(2026-07-13_RENDER_MODE_VALUE_INVENTORY.md) is user-reviewed — every ⚠ entry answered — before any
mode is quarantined. Quarantine = move; the inventory's "cross-cutting valuable IP" list must be
absorbed (kernel/docs) or explicitly user-waived before any later hard delete.
Execute the confirmed RENDER_QUARANTINE_PLAN remainder against the keep-set
(power_vector, grid_gradient, ember_lattice, phase_edges*, phase_field + PowerCore):
- **B — dispatch fallback:** remove quarantined `case`s from the GameCanvas render switch;
  `default` → power_vector so saved configs cannot crash.
- **C — quarantine files:** move legacy family dirs + legacy renderers (E2 inventory) to
  `src/lib/territory/_quarantine/`; tests move with code.
- **D — catalog/config:** strip quarantined ids from the render-mode catalog, config defaults, themes.
*Note: the 07-04 plan body lists phase_edges in both keep and quarantine lines — resolve with user
before B (memory + keep-set line say KEEP ember_lattice/phase_edges; the quarantine line appears stale).
**Gate per sub-stage:** build + replay hash + territory suite; after D, user confirms the topbar
selector shows exactly the keep-set and each kept mode renders. **Risk: medium** (wide but staged).

### Stage 4 — Temporary scaffolding retirement
- **END_SNAP_FIX_EVAL:** user judged `soft_pins` "closest yet / passable" — pending explicit winner
  confirmation, promote the winner to THE behavior and strip the 4-mode toggle + topbar chip + the
  losing branches (E3 lists every touch point).
- **Orchestrator + layers:** E1 disproved "abandoned" — both are LIVE legacy-pipeline engines, so they
  quarantine WITH their modes in Stage 3C (orchestrator with territory_engine/power_voronoi/pvv2;
  layers with territory_runtime), not here. This stage only strips eval toggles + probes.
- Any TEMP/eval probes E3 surfaces.
**Gate:** suite + check + user visual pass on conquest end-snap after the toggle strip. **Risk: low.**

### Stage 5 — God-object decomposition (LAST because highest risk)
Primary: thin the 8,555-LOC GameCanvas into a coordinator — extract render-family lifecycle,
geometry-build scheduling, and transition scheduling into dedicated modules; component keeps wiring
only. One extraction per commit, suite + manual smoke between.
Census beyond GameCanvas (from E3 + inventory; each gets an existence-challenge + decomposition
assessment, best-practice lens not just spec conformance): GameSettingsPanel 2,946; gameStore 2,168;
GameContainer 2,145; ControlsSection-Territory 1,939; mapEditorStore 1,813; MainMenu 1,724; surviving
cellGrid families (4,949/3,375/2,645) get single-responsibility extraction of their pure cores
(classification / wave plan / scene already exist as pure functions — the adapters are the bloat).
**Gate:** suite + check + user plays a full conquest cycle per extraction. **Risk: high — never batched.**

### Stage 6 — Docs/tests alignment + final audit
Update TERRITORY_ARCHITECTURE.md + geometry atlas to the post-cleanup reality; delete stale docs into
`_archive/`; re-run the E1-E3 sweeps and diff against this doc's evidence — the deltas ARE the
completion proof; record final LOC vs Stage 0 baseline.

## Sequencing rationale
Consolidation (1) precedes deletion (3,4) per doctrine. Layering (2) before quarantine (3) so moved
files don't carry broken imports. GameCanvas (5) last: every earlier stage shrinks its import surface,
making the decomposition smaller and safer. 0 and 6 bracket everything with measurement.
