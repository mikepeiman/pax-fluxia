# Metaball Grid And Geometry Tunables Audit - 2026-04-19

## Purpose

Explain how `metaball_grid` works from the code, clarify the current behavior of the shared geometry tunables (`MSR`, `CX`, `CP`, `DX`), and identify what is partial, missing, broken, or needs improvement before grid mode becomes the default render mode.

## Scope

- Shared geometry tunables that feed `power_voronoi_0319`
- The `metaball_grid` render family on `master`
- Drift between `master` and the known-good `claude/goofy-raman` worktree

## Terminology Clarification

- `CP` does **not** mean "enemy-enemy lane only". In code it applies to any **cross-owner / contested lane**, regardless of whether the two owners are human or AI.
- `MSR` here means `MODIFIED_VORONOI_STAR_MARGIN`.
- `metaball_grid` is not a true metaball-field solver. It is a grid-of-vstars renderer layered on top of a geometry truth source.

## Executive Summary

### Shared geometry tunables

- `MSR` is currently a broad power-voronoi scale input, not an explicit geometric exclusion rule. In `power_voronoi_0319` it currently:
  - sets the base real-star site weight as `starMargin^2`
  - scales corridor and disconnect virtual-site absolute weights by the same squared base
  - expands the clip rectangle by `starMargin + boundaryPad`
  - sets contested midpoint-pair spacing in the corridor helper
- That means `MSR` currently influences multiple things at once. It does **not** currently implement the narrow semantics "push both the territory boundary and non-connected lanes outside this margin and only that".
- `CX`, `CP`, and `DX` are pre-metaball geometry controls, but their visibility depends heavily on ownership topology and geometry source.

### Metaball-grid on `master`

- The current grid mode is functional, but it is not equivalent to the worktree.
- `master` is missing three planner controls that exist on `claude/goofy-raman`:
  - `METABALL_GRID_DISTRIBUTION`
  - `METABALL_GRID_POSITION_JITTER`
  - `METABALL_GRID_MAX_CELLS`
- `master` is also missing the worktree's live perf/stats surface for grid tuning.
- On `master`, `cellShape='hex'` is only a paint primitive. The ownership classification grid itself remains square. The worktree had true sample-distribution control, so this is a real behavioral downgrade.

## Shared Geometry Tunables Audit

## `MSR` (`MODIFIED_VORONOI_STAR_MARGIN`)

### Current code path

- Read centrally in [geometryTuning.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/geometry/geometryTuning.ts)
- Passed into `Geometry_0319` settings through [buildFamilyGeometry.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts)
- Consumed in [Geometry_0319.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts) and [powerVoronoiTerritoryGeometryGenerator.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts)

### What it does today

In `computeGeometry0319(...)`, real owned stars become weighted-voronoi sites with:

- `weight = starMargin * starMargin`

Corridor and disconnect virtuals then get:

- `weight = starMargin * starMargin * virtualWeightMultiplier`

`MSR` also enters the clip bounds:

- `clipPad = starMargin + boundaryPad`

And `MSR` is used as contested midpoint-pair spacing when `CP` is enabled:

- `crossOwnerMidpointPairSpacing = config.starMargin`

### What this means in practice

- `MSR` is currently a coupled radius/weight/spacing scalar.
- It does **not** currently run an explicit "keep boundaries and unrelated lane influence outside this radius" pass.
- If the intended semantics are:
  - protect a star-centered interior disk
  - suppress lane influence inside that disk
  - force territory boundary onset outside that disk

then the current implementation is only an indirect approximation, not a direct implementation.

### Assessment

- Wired: yes
- Honest-to-spec: no
- Improvement needed: high

## `CX` (`TERRITORY_CX_COUNT`, `TERRITORY_CX_WEIGHT`, corridor spacing)

### Current code path

- Shared builder: [buildCorridorVirtualSites.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.ts)
- Legacy wrappers: [territoryFeatures.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/renderers/territoryFeatures.ts)
- `Geometry_0319` and metaball-family path both consume the shared builder

### Current behavior

- Same-owner lanes can emit distributed corridor samples.
- Cross-owner lanes can also emit distributed samples if enabled.
- If `TERRITORY_CX_COUNT > 0`, explicit count overrides spacing-derived auto count.
- If `TERRITORY_CX_COUNT = 0`, sample count is `max(0, floor(pathLen / spacingPx) - 1)`.

### Assessment

- Wired: yes
- Non-obvious semantics: yes
  - explicit count largely hides spacing effects
- Improvement needed: medium
  - UI should say more clearly that count overrides spacing

## `CP` (`TERRITORY_CX_CONTEST_*`)

### Current code path

- Same shared corridor builder as `CX`
- Explicitly fed into the metaball-family path via [metaballSceneBase.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaball/metaballSceneBase.ts)
- Explicitly fed into `Geometry_0319` via [Geometry_0319.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts)

### Current behavior

- `CP` emits paired midpoint contest vstars on any contested lane.
- The pair sits around lane mid-arc and is spaced by `MSR`.
- `CP` now survives even when distributed `CX` count resolves to `0`.

### Assessment

- Wired: yes
- Recently fixed shared bug: yes
- Improvement needed: low to medium
  - diagnostics should expose per-lane counts so contested-lane behavior is obvious

## `DX` (`MODIFIED_VORONOI_DISCONNECT_*`, `TERRITORY_DX_WEIGHT`)

### Current code path

- Shared builder: [buildDisconnectVirtualSites.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/disconnect/buildDisconnectVirtualSites.ts)
- Consumed by `Geometry_0319` and the metaball family

### Current behavior

- Works only when all of these are true:
  - there are at least two disconnected components for the same owner
  - stars from different components are within `disconnectDistance`
  - enemy stars exist to assign each side of the disconnect pair

### Assessment

- Wired: yes
- Often legitimately zero: yes
- Improvement needed: medium
  - needs visibility/debug counters so "inactive because topology says no" is obvious

## Metaball-Grid Audit

## How `metaball_grid` works on `master`

### 1. Truth geometry

`metaball_grid` does not compute ownership geometry itself. It asks for a geometry snapshot through [buildPerimeterFieldRenderFamilyGeometry()](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts).

That means the underlayer comes from:

- `power_voronoi_0319`, or
- `canonical_vector`

depending on `PERIMETER_FIELD_GEOMETRY_SOURCE`.

This is a non-obvious dependency because `PERIMETER_FIELD_GEOMETRY_SOURCE` is not a grid-specific setting.

### 2. PREV/NEXT geometry for transition

During a conquest transition, `metaball_grid` rebuilds PREV geometry by reverting star ownership and re-running the same geometry source. This happens in [MetaballGridFamily.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts).

This is explicitly documented in code as a known simplification rather than upstream truth capture.

### 3. Grid vstar classification

[buildGridClassification.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.ts) builds a world-anchored grid:

- `cols = ceil(world.width / spacingPx)`
- `rows = ceil(world.height / spacingPx)`
- total vstars = `cols * rows`

Coordinates on `master`:

- `centered`: `(ix * spacing + spacing/2, iy * spacing + spacing/2)`
- `corner`: `(ix * spacing, iy * spacing)`

Each grid point resolves `prevOwnerId` and `nextOwnerId` by:

- point-in-polygon against `territoryRegions`
- then nearest-owned-star fallback within `coverageRadius = spacingPx * 3`

That fallback currently exists specifically to fill ownership holes near star centers.

### 4. Wave planning

[planGridWave.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts) assigns per-cell flip times from:

- seeding mode
- wave geometry
- adjacency

These controls only matter during active conquest transitions.

### 5. Scene emission

[renderMetaballGridScene.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts) emits render cells from classification + wave plan.

- `native` cells render constantly
- `dispossessed`, `emergent`, and `vacating` cells flip according to transition mode
- `outside` cells are never emitted

### 6. Painting

[MetaballGridFamily.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts) paints direct PIXI primitives:

- square
- circle
- diamond
- hex

It does **not** use the general metaball compositor.

## What is fully wired on `master`

The following master keys are surfaced, panel-synced, and consumed:

- `METABALL_GRID_ENABLED`
- `METABALL_GRID_SPACING_PX`
- `METABALL_GRID_ORIGIN_MODE`
- `METABALL_GRID_ADJACENCY`
- `METABALL_GRID_WAVE_GEOMETRY`
- `METABALL_GRID_WAVE_SEEDING`
- `METABALL_GRID_FLIP_TRANSITION`
- `METABALL_GRID_FLIP_WINDOW`
- `METABALL_GRID_STRENGTH`
- `METABALL_GRID_INWARD_OFFSET_PX`
- `METABALL_GRID_CELL_SHAPE`
- `METABALL_GRID_CELL_INSET_PX`
- `METABALL_GRID_CELL_CORNER_PX`
- `METABALL_GRID_BORDER_MODE`
- `METABALL_GRID_BORDER_BLEND`
- `METABALL_GRID_BORDER_CHAIKIN_PASSES`
- `METABALL_GRID_WAVE_EASE`
- `METABALL_GRID_FLIP_WINDOW_JITTER`

## Non-obvious but active dependencies

These materially affect grid mode but are not clearly "grid-only" from the UI:

- `PERIMETER_FIELD_GEOMETRY_SOURCE`
- shared `METABALL_*` HSLA knobs for fill and border color energy
- live conquest transition progress itself

## What is partial or misleading on `master`

### 1. Hex is visual-only on master

On `master`, `cellShape='hex'` changes the draw primitive and adds a per-row paint offset, but the ownership classification grid is still square.

Consequence:

- hex visuals do not mean hex-distributed sampling
- the sampled vstar lattice and the painted lattice are no longer conceptually the same thing

This is the biggest current grid-mode architectural mismatch on `master`.

### 2. Inward offset is not underlying geometry

`METABALL_GRID_INWARD_OFFSET_PX` is a post-classification visual shift based on 4-neighbor owner comparisons in [metaballGridRuntime.ts](C:/Users/mikep/Desktop/WebDev/pax-fluxia/pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.ts).

It does **not** move grid vstar classification points or change ownership truth.

### 3. Several grid knobs are transition-only

These will appear dead outside an active conquest:

- `METABALL_GRID_ADJACENCY`
- `METABALL_GRID_WAVE_GEOMETRY`
- `METABALL_GRID_WAVE_SEEDING`
- `METABALL_GRID_FLIP_TRANSITION`
- `METABALL_GRID_FLIP_WINDOW`
- `METABALL_GRID_WAVE_EASE`
- `METABALL_GRID_FLIP_WINDOW_JITTER`

This is correct behavior, but the panel does not currently make it clear enough.

### 4. Hidden nearest-star fill heuristic

`buildGridClassification.ts` uses:

- `coverageRadiusPx ?? spacingPx * 3`

This is not surfaced. It strongly affects whether star-centered ownership holes get filled or remain empty.

## What exists on the worktree but is missing on `master`

The `claude/goofy-raman` worktree contains three grid-planner settings that are absent on `master`:

- `METABALL_GRID_DISTRIBUTION`
  - `square | hex_offset | jittered`
- `METABALL_GRID_POSITION_JITTER`
  - deterministic scatter amplitude
- `METABALL_GRID_MAX_CELLS`
  - coarsens spacing upward to respect a total-cell cap

The worktree also contains:

- `metaballGridStats.ts`
- a Perf tab / stats UI
- requested vs effective spacing readout
- total / emittable / painted cell counts

These are not small cosmetic differences. They affect:

- render appearance
- sampling pattern
- performance behavior
- tuning observability

## Audit Verdict

## Shared geometry tunables

- `CP`: materially improved and now properly wired through the metaball-family path
- `CX`: wired, but semantics are easy to misread because explicit count hides spacing
- `DX`: wired, but lacks user-facing diagnostics
- `MSR`: wired, but not aligned with the narrow intended semantics described by the user

## Metaball-grid on `master`

- Functional: yes
- Equivalent to the worktree: no
- Ready to become the first default mode without further work: no

## Highest-priority improvements

1. Restore true grid distribution controls from the worktree.
   - `METABALL_GRID_DISTRIBUTION`
   - `METABALL_GRID_POSITION_JITTER`
   - `METABALL_GRID_MAX_CELLS`

2. Restore grid perf/stats observability from the worktree.
   - total cells
   - emittable cells
   - painted cells
   - requested vs effective spacing
   - update cost

3. Decide what `MSR` is supposed to mean, then implement that semantics directly.
   - If it is meant to be a star-centered clearance / lane-clearance constraint, it should become an explicit geometry constraint, not just a shared site-weight scalar.

4. Expose or at least label hidden dependencies in the UI.
   - `PERIMETER_FIELD_GEOMETRY_SOURCE`
   - shared `METABALL_*` color-energy controls
   - transition-only knobs

5. Consolidate duplicate control surfaces for shared geometry tunables.
   - `MSR`, `CX`, `CP`, `DX` are currently editable from multiple panels and menus, which increases drift risk.

