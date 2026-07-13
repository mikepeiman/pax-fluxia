---
date: 2026-07-13
status: INVENTORY — deletion gate for Cleanup Stage 3; user reviews BEFORE any quarantine move
author: opus-territory
purpose: What each render mode (kept AND legacy) uniquely computes/offers, so nothing valuable dies in the big deletion.
grounding: file headers + dispatch arms read 2026-07-13; catalog (themeRouting.ts); user-authored transition design history; hands-on session knowledge. Entries marked ⚠ need user confirmation of visual value — code says what it does, only you know what it's worth.
---

# Render mode value inventory (all 15 dispatch modes)

## ⚑ FINAL DISPOSITIONS — user rulings 2026-07-13 (all ⚠ items below RESOLVED)

KEEP: power_vector, grid_gradient, ember_lattice, phase_edges (contradiction resolved: KEEP),
phase_field. QUARANTINE everything else, with absorption duties BEFORE each move:
- **metaball** → blob look documented as future PowerCore skin; two-field agreement trick extracted.
- **pixel** → retro look documented for reimplementation; code dies.
- **graph/lane** → network-control concept documented; code dies.
- **contour** → DP simplifier + marching squares + junction pull-back absorbed into kernel/docs first.
- **cell_grid (plain)** → mode dies; SURGICAL keep-map for families/cellGrid/ (Phase/Ember/Field
  families + planGridWave IP stay).
- **distance_field** → quarantined intact as the resurrection blueprint (no near-term intent).
- **fg2SeedGraph** → DEAD, but a value-mining pass over its 5,380 LOC is REQUIRED before quarantine
  (extract non-superseded work, file:line receipts, into this doc).
- **territory_runtime + layers/** → architecture documented as reference; quarantined, not kept in-tree.
- StarRenderer's roundness-Chaikin is map-display tuning — KEEP as-is, outside the territory kernel.

Execution contract: 2026-07-13_COMPLETE_CODEBASE_CLEANUP_MASTER_PLAN.md (v2).

**The design-history frame (user-authored, binding):** metaball and the grid modes exist
*because vector transitions were hard* — they were transition workarounds, not aesthetic goals.
The feel target was always the water/ripple vector morph, which PowerCore/power_vector now delivers.
So "value" below = what each mode contributed that the unified path does NOT yet have.

## KEPT modes

### power_vector (DEFAULT) — the PowerCore vector skin
ONE representation for idle AND morph: per-owner region rings + chained frontier/world-border
polylines, Chaikin-smoothed from the single shared-edge graph; every transition frame is a complete
watertight owner-merged rounded map (`PowerVectorFamily.ts` header). This IS the destination
architecture. **Value: the product.**

### grid_gradient — GPU ownership-grid gradient
Ownership grid + frontier distance field buffers + border dots; GPU shader fill (the mode whose
first shader LINK caused the 3-6s cold-load, now fixed). **Unique value:** the only KEPT mode with a
true per-pixel gradient fill + frontier-distance shading — a *look* power_vector doesn't offer.
Also the proven ownership-grid → distance-field buffer machinery.

### ember_lattice / phase_edges — cell-grid lattice looks
CellGridPhaseEdges family: classification → wave plan → direct PIXI rects (deliberately bypasses the
metaball compositor for O(N) rendering — header documents the perf lesson). Two distinct visual
identities (restored as separate looks 2026-07-01, task #6). **Unique value:** the discrete-cell
lattice aesthetic + the **grid wave planner** (`planGridWave.ts`) — pre/post frontier BFS flip-times,
radial fallback for engulfed islands. This planner is the REFERENCE mechanism PowerCore's island
collapse was modeled on (2026-07-13). Whatever happens to the modes, planGridWave's algorithms are
proven IP.

### phase_field — smooth constraint-aligned field fill
CellGridPhaseField family: constraint-aligned geometry → smooth field fill (LINEAR phase sampling
lesson lives here). **Unique value:** the soft field-fill look over exact PowerCore-aligned geometry;
the smoothing/sampling lessons are encoded in memory + settings.

## LEGACY modes (quarantine candidates) — what each one uniquely has

### metaball — CPU influence-field blobs (2,315 LOC + family)
Influence fields on a coarse CPU grid; organic blobby regions. Sophisticated corridor/disconnect
handling: CX/DX virtuals affect geometry/borders ONLY (excluded from `infReal`), fill drawn only
where geom-field and real-star-field AGREE on the winner — borders move without fill bleeding into
corridor-only cells. Optional blur pipeline (fill-only vs fill+borders).
**Unique value:** (a) the organic blob AESTHETIC (nothing kept looks like it); (b) the two-field
agreement trick for virtual-site containment — a genuinely clever pattern worth documenting even if
never re-implemented; (c) field-morph transitions (its original reason to exist — SUPERSEDED by
PowerCore kinetic morph). **⚠ confirm:** is the blob look wanted as a future PowerCore skin?

### distance_field (DF_*, via territory_engine route) — GPU distance-field territory (5,119 LOC)
CPU multi-source Dijkstra (K-best per star, ~5ms on ownership change) + GPU fragment-shader
rasterization + border blend (~1ms/frame) + GPU temporal blend for conquest (~0ms steady state).
**Unique value:** the only fully GPU-resident territory pipeline in the codebase — per-pixel quality
at near-zero frame cost, lane-distance (not euclidean) territory semantics via Dijkstra over the
star graph. If territory ever needs to be cheaper or softer than vector rendering, THIS is the
architecture to resurrect. The Dijkstra K-best field is also the natural substrate for fog-of-war /
influence overlays. Strongest resurrection candidate of everything legacy.

### power_voronoi (PVV2) — the ancestor (1,809 LOC)
d3-weighted-voronoi power diagram; star margin baked as site weights; shared-edge-graph
architecture ("modifications move shared edges, not polygon vertices"). **Unique value:** none
remaining — this IS PowerCore's direct ancestor; its ideas (power diagram, shared edges, corridor
virtuals) were absorbed. Pure history.

### pvv2_dy4 — PVV2 + DY4 dynamics fork (1,585 LOC)
Byte-identical Chaikin/pipeline to PVV2 (E1 confirmed) plus the DY4 experiment layer.
**Unique value:** none not in PVV2/PowerCore. History.

### pvv3 (PVV3Renderer) — frontier-first experiment
"Territory polygons built from merged Voronoi regions, not border polylines" — the frontier-first
idea. **Unique value:** the concept shipped INTO PowerCore (region loops from shared edges). History.

### refactored_pvv2 — A/B harness shell
Class-encapsulated PVV2 clone with isolated state for instant A/B against legacy ("non-destructive
refactor... zero crosstalk"). **Unique value:** the isolated-state A/B PATTERN (worth one paragraph
in an engineering doc), not the code.

### territory_engine — orchestrator/DY4OT route (6,574 LOC incl. fg2SeedGraph 5,380)
The orchestrator pipeline (engine/registry/renderMode/traceStore + fg2SeedGraph). Drives
DistanceField/PowerVoronoi renderers through a method registry with tracing.
**Unique value:** fg2SeedGraph's seed-graph territory decomposition experiments + the trace-store
diagnostics pattern. ⚠ Largely superseded; confirm nothing in fg2 (seed-graph frontier logic) is
still wanted — it's the only implementation of that approach.

### territory_runtime — layers/ worker pipeline (4,701 LOC)
The layered coordinator route (geometry/ownership/presentation/transition coordinators + modes +
planners) running through TerritoryRuntimeCoordinator/TerritoryWorker — territory OFF the main
thread. **Unique value:** the only WORKER-BASED territory pipeline — the layering/coordinator
discipline (clean geometry→ownership→presentation→transition separation) is the architectural
best-practice reference the monolith paths lack, and its ActiveFrontFillMode/planners contain
transition-mode ideas. If main-thread cost ever forces territory into a worker, this is the map.

### perimeter_field — metaball-compositor field over 0319 geometry
Samples a v-set from geometry and renders via the shared metaball runtime; its config namespace
became the accidental home of UNIVERSAL keys (`PERIMETER_FIELD_GEOMETRY_SOURCE` — the confirmed
Stage-A landmine). **Unique value:** none visual beyond metaball; its role was the bridge era.
Its config keys need the per-key classification from the quarantine plan, NOT prefix deletion.

### pixel — pixel-grid territory
`renderPixelTerritoryModule`: retro pixel-grid fill. **Unique value:** a cheap distinct retro
aesthetic. ⚠ confirm whether the look matters to you; zero architectural value.

### graph — lane-graph territory
`renderLaneTerritoryModule`: territory drawn along the lane graph itself (edges, not areas).
**Unique value:** the only AREAL-FREE territory representation — reads ownership as network control.
Conceptually interesting for a strategic-map/minimap view. ⚠ confirm.

### contour — marching-squares vector territory
Worker: low-res ownership grid → binary masks → marching squares with INTEGER edge keys → chained
polygons → junction pull-back (F-135) → Douglas-Peucker → optional Chaikin.
**Unique value:** (a) integer-edge-key marching squares (robust, hash-exact chaining); (b) the
multi-owner junction pull-back algorithm; (c) Douglas-Peucker simplification — the only simplifier
in the codebase (PowerCore has none; long borders could want it someday). Algorithms worth kernel
adoption; the mode itself superseded.

## Cross-cutting valuable IP (survives regardless of mode fate)
1. **planGridWave** flip-time planner (BFS pre/post frontier + radial engulfed fallback) — already
   the island-collapse reference; keep with cellGrid (kept).
2. **DF GPU pipeline** (Dijkstra K-best + shader raster + temporal blend) — resurrection blueprint.
3. **Metaball two-field agreement** (geom vs real influence) for virtual-site containment.
4. **Integer-edge-key marching squares + junction pull-back + Douglas-Peucker** (contour).
5. **layers/ coordinator discipline + worker execution** (territory_runtime) — architecture reference.
6. **Isolated-state A/B harness pattern** (RefactoredPVV2).
7. The **trace-store diagnostics** pattern (orchestrator).
→ Quarantine (move), never hard-delete, until each is either absorbed into the kernel/docs or
   user-waived. This is the doctrine's "consolidation before deletion" applied to IDEAS, not just code.

## Architecture review (folded into cleanup, per user directive 2026-07-13)
Review is not spec-conformance only (specs have diverged) — apply general + contextual best practice
at every stage. **God-object census (E3):** GameCanvas.svelte 8,555 (dispatch + lifecycle + input +
FX + scheduling); fg2SeedGraph.ts 5,380 (retires w/ Stage 3); CellGridPhaseEdgesFamily 4,949;
CellGridFamily 3,375; GameSettingsPanel.svelte 2,946; CellGridPhaseFieldFamily 2,645; gameStore 2,168;
GameContainer 2,145; ControlsSection-Territory 1,939; mapEditorStore 1,813; MainMenu 1,724.
Per-stage lenses added to the master plan: single-responsibility (Stage 5 extracts by responsibility
map, and the surviving cellGrid families get the same treatment), dependency direction (Stage 2),
single-source-of-truth (Stage 1 kernel; settings registry precedent), temporary-code hygiene
(Stage 4), dead-config hygiene (Stage 3D per-key classification).
