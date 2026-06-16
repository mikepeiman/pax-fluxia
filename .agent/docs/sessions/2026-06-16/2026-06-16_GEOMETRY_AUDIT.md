---
date created: 2026-06-16
last updated: 2026-06-16
last updated by: AI
relevant prior docs:
  - .agent/docs/sessions/2026-06-13/2026-06-13_RENDERING_CONSOLIDATION_9f22_dcc7_AUDIT.md
  - .agent/docs/sessions/2026-06-13/2026-06-13_PROPOSAL_generator-animated-territory-rendering.md
  - .agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md
superseding docs:
---

# Territory Geometry Audit — what runs, what's available, why it's broken

Scope: perf / geometry / render (Settings/layout is a separate agent's lane). Audited on
branch `claude/grid-gradient-perf` (geometry code is identical to consolidation/master here —
the perf pass changed no geometry behavior, all parity-proven). Findings verified by code read
+ a reproduced failing test.

## 0. Executive summary

- **The engine running for everything you see is one generator: `computeGeometry0319`
  (the "power_voronoi_0319" power-Voronoi vector pipeline).** Every render-family mode —
  `metaball`, `metaball_grid`, `metaball_grid_phase_edges`, `metaball_grid_phase_field`,
  `metaball_grid_ember_lattice` (the default mode), `grid_gradient`, `perimeter_field` — is
  **forced** through it. The families differ only in how they *render* that one geometry, not
  in how it's produced. The default boot mode is `metaball_grid_ember_lattice`.
- **There is one dominant root cause for "regions missing fill" and "glitchy bits":** the
  fill-reconstruction chain walk (`executeChainWalk`) picks the wrong edge at 3-way junctions
  (it takes the first edge by insertion order instead of the clockwise-adjacent one). This is
  **confirmed by a failing test** that I reproduced: an owner that should be one closed square
  fill gets **zero fill**. The rest of the codebase already solved this with
  `pickClockwiseAdjacentArc`; the shared walk dropped it during an extraction (a regression).
- **"Pointy/jagged" is a separate cluster:** render-time re-smoothing that doesn't pin
  world-boundary/junction vertices, plus min-star-margin repairs that fall back to raw spiky
  geometry when a repair can't be validated.
- Many other geometry generators exist but are legacy/prototype, reachable only via
  ui-hidden or non-family modes (see §3).

## 1. Active pipeline (mode → geometry)

Dispatch (in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`):
`getCurrentRenderFamilyGeometry()` (:2767) → `buildPerimeterFieldRenderFamilyGeometry()`
(`territory/families/buildFamilyGeometry.ts:135`) → `buildPowerVoronoi0319RenderFamilyGeometry()`
(:95) → **`computeGeometry0319()`** (:111) → wrapped by `buildPowerVoronoi0319AuthoritySnapshot()`
(:124), which then adds frontier topology (`families/buildPowerVoronoiFrontierTopology.ts:150`)
and seam resolution (`geometry/resolveConstraintAlignedTerritoryGeometry.ts`).

**The geometry source is hardcoded, not selected.** `normalizePerimeterFieldGeometrySource()`
(`territory/geometry/geometrySource.ts:10-14`) ignores its argument and always returns
`power_voronoi_0319`. So `PERIMETER_FIELD_GEOMETRY_SOURCE` (config default `power_voronoi_0319`,
`config/game.config.ts:396`) is inert, and the alternate `compileVectorGeometry` branch in
`buildPerimeterFieldRenderFamilyGeometry` (:172) is effectively dead. There is **no config
switch that changes a family mode's geometry source.**

Legacy/runtime modes keep their own geometry (independent of 0319): `power_voronoi_runtime`
(PVV4 runtime worker), `vs_pvv3` (fg2 seed graph), `distance_field` (GPU distance field),
`voronoi`/`graph`/`contour`/`pixel`/`modified_voronoi`/`pvv2_dy4` (dedicated renderers), and the
ui-hidden `territory_engine`/`territory_runtime`.

## 2. Stages inside `computeGeometry0319` (`territory/compiler/Geometry_0319.ts`)

1. Build sites + per-star/virtual weights (:247) — incl. corridor + disconnect virtuals.
2. Power diagram via `weightedVoronoi` (d3-weighted-voronoi), clipped to padded world (:359).
3. Cells → `TerritoryCell[]` (:369).
4. Extract inter-owner shared edges (`extractSharedEdges`, :406).
5. Cluster + merge same-owner cells (`mergeSameOwnerCells`, :409) — **uses
   `pickClockwiseAdjacentArc`** (correct junction handling).
6. World-boundary edge extraction (:439).
7. Chain edges into polylines + **Chaikin smoothing** (`chainSharedEdgesIntoPolylines`, :444) —
   raw (passes=0) and smoothed; **also uses `pickClockwiseAdjacentArc`**.
8. Split shared vs world-border polylines (:450).
9. Min-star-margin repair (`applyExplicitMinStarMargin`, :478), validated.
10. **Fill reconstruction:** `executeChainWalk` (once, :523) → `constructFillsFromFrontierChain`
    (:523) → `mergedTerritories`. **`executeChainWalk` does NOT use `pickClockwiseAdjacentArc`
    — this is the bug.**
11. Frontier map/topology (`buildFrontierMap`, :545, shares the same walk result).
12. Enclave detection on actual fills (:556); closure diagnostics; return.

## 3. Generator inventory (what else is available)

| Generator | Entry (`file:line`) | Output | Status |
|---|---|---|---|
| **Power-Voronoi 0319** | `computeGeometry0319` `compiler/Geometry_0319.ts:227` | vector regions + frontier/world polylines | **PRIMARY — all family modes** |
| 0319 authority wrapper | `buildPowerVoronoi0319AuthoritySnapshot.ts:298` | `ResolvedGeometrySnapshot` | active (wraps 0319) |
| Legacy PVV2 generator | `generateVoronoiTerritoryGeometry` `powerVoronoiTerritoryGeometryGenerator.ts:1063` | vector regions | legacy |
| Unified vector compiler | `compiler_UnifiedVectorGeometry.ts` (calls 0319) | snapshot | legacy/fallback (dead under forced source) |
| fg2 seed graph | `orchestrator/methods/fg2SeedGraph.ts` | seed graph → owner shells | legacy (vs_pvv3 / engine) |
| Distance field | `renderers/DistanceFieldTerritoryRenderer.ts` | GPU scalar field | active (own mode) |
| Metaball field | `renderers/MetaballRenderer.ts:1492` | CPU influence field | legacy renderer (family no longer uses it) |
| Contour (marching squares) | `renderers/contourTerritory.worker.ts` | grid → polylines | active (own mode) |
| Graph / Lane | `renderers/graphTerritory.worker.ts` / `laneTerritory.worker.ts` | ownership grid | active (graph mode) |
| Pixel | `renderers/pixelTerritory.worker.ts` | pixel grid | active (own mode) |
| Basic Voronoi | `renderers/VoronoiRenderer.ts` | nearest-star cells | active (own mode) |
| Modified/weighted Voronoi | `renderers/ModifiedVoronoiRenderer.ts` | weighted regions | **deprecated** (superseded) |
| PVV2-DY4 reference | `renderers/PowerVoronoiRenderer_DY4.ts` | power-Voronoi | legacy reference |
| Runtime worker geometry | `runtime/TerritoryWorker.ts:37` | resolved geometry | active (PVV4 runtime) |

## 4. Defect diagnosis (ranked, verified)

### (a) Regions missing fill — ROOT CAUSE CONFIRMED
`executeChainWalk` (`compiler/chainWalkCore.ts:187-225`) chooses the next frontier segment at a
vertex by **insertion order** (`for (const cand of candidates) … break` on the first unused
same-owner segment). At a ≥3-way junction this routinely takes a **spur into a neighboring
region** instead of continuing along the current owner's perimeter. Consequences:
- the owner's perimeter fractures into multiple **open** chains;
- open chains are dropped by the closure filter (`!closed && !nearClosed → continue`,
  `LOOP_CLOSURE_TOLERANCE_PX = 6`, `powerVoronoiTerritoryGeometryGenerator.ts:792`);
- → the region renders **no fill**.

Reproduced via the failing unit test
`compiler/powerVoronoiTerritoryGeometryGenerator.test.ts` → *"walks the clockwise-adjacent owner
boundary at a junction instead of taking the first spur"*: owner `red` should be one closed
square `[[0,0],[10,0],[10,10],[0,10],[0,0]]`; **actual = `[]` (no fill)**. `bun x vitest run`
that file = **1 failed / 4 passed**.

The fix is already known to the codebase: `mergeSameOwnerCells` (:708) and
`chainSharedEdgesIntoPolylines` (:965) both use `pickClockwiseAdjacentArc` for junction
selection, and `planarWalk.ts:1-9` explicitly warns that greedy first-unused-edge walks "jump
across a junction, producing bogus polylines or closure chords." `chainWalkCore.ts` neither
imports nor uses it — the angle-sorted selection was dropped when the walk was extracted into
the shared core (its comment at :95 falsely claims it "mirrors the original … exactly").

Other (secondary) missing-fill drop sites: world-border extraction gaps
(`…Generator.ts:526,539`), `looksLikeJunctionSpur` short-segment drop
(`resolveConstraintAlignedTerritoryGeometry.ts:825`), and the renderer-side loop gate
`length < 4` (`frontierLoops.ts`).

### (c) Glitchy bits polluting regions — SAME ROOT + duplicates
When a spur endpoint happens to land within 6px of the start, the open chain is **force-closed
with a chord** across the spur (`…Generator.ts:797-800`) → a stray sliver/notch. Compounding:
- `frontierLoops.ts:146-170` (renderer path, used by `PVV3Renderer`) **duplicates the same
  greedy walk** with no clockwise selection, plus a fragile boundary force-close (:270-324).
- `resolveConstraintAlignedTerritoryGeometry.ts:543-547,749-806` has its own junction walk that
  selects by **unsigned** "straightest" angle (not signed most-clockwise), so it can't reliably
  tell a left spur from a right spur; `looksLikeJunctionSpur` (:820) is a band-aid.

### (b) Pointy / jagged edges — SEPARATE cluster
1. **`PVV3Renderer.ts:771-773`** re-smooths fills at render time with `chaikinSmoothPolygon`
   **without passing world bounds or `pinnedPtKeys`**, so world-boundary vertices are cut inward
   while borders are drawn separately → jagged seams along world edges (fill/border divergence).
2. **Min-star-margin rejection leaves raw geometry:** every rejection path in
   `applyIntervalRepairs` does `continue` and keeps `ref.currentPoints` unchanged
   (`minStarMargin.ts:1363,1506,1526,1544,…`), so a star near a jagged border whose repair can't
   be validated renders the raw spike. Also `polylineHasSelfIntersection` skips **adjacent**
   segment pairs (`minStarMargin.ts:1013`), so a true needle fold between adjacent segments is
   never caught.
3. Open-polyline Chaikin pins only endpoints and is config-gated (`VORONOI_BORDER_SMOOTH`); with
   passes = 0, raw Voronoi spikes render unaltered.

## 5. Recommended fix order

1. **PRIME (fixes a + the chord form of c):** make `executeChainWalk` select the
   clockwise-adjacent segment at junctions via `pickClockwiseAdjacentArc`, matching
   `mergeSameOwnerCells` / `chainSharedEdgesIntoPolylines`. Objective gate: the failing junction
   test goes green; full territory suite stays green; user visual check (fills return, junction
   slivers gone). This is the single highest-leverage fix.
2. Align the **duplicate** walks to the same convention: `frontierLoops.ts` greedy walk and the
   unsigned-angle selection in `resolveConstraintAlignedTerritoryGeometry.ts` (removes remaining
   c-class slivers). Lower-risk after #1.
3. **(b)** pin world-boundary + junction vertices in the render-time `chaikinSmoothPolygon` call
   (`PVV3Renderer.ts:771`), and decide a policy for MSR-rejected intervals (don't render raw
   spikes — at minimum clamp/round). Add adjacent-segment needle detection to
   `polylineHasSelfIntersection`.

## 6. Strategic note
This whole defect class lives in **reconstructing fills from frontier chains** — the fragile
step the [generator-animated rendering proposal](.agent/docs/sessions/2026-06-13/2026-06-13_PROPOSAL_generator-animated-territory-rendering.md)
removes by deriving fills from the field directly (always a valid planar partition; no chain
walk, no junction spur, no closure-tolerance drops). The chain-walk fix above is the correct
*immediate* repair; the proposal is the durable structural answer.
