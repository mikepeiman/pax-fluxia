# 2026-05-05 Territory Runtime Recovery Plan v7

## Purpose

The goal is buttery-smooth conquest transitions for power-Voronoi vector frontiers.

Before more transition work proceeds, the shared geometry constraints and tuning surfaces must be defined clearly and implemented in the right layer of the pipeline.

This `v7` plan keeps the `v6` baseline, but improves four things:

1. the purpose is corrected to match the real project goal
2. the constraint implementations are placed explicitly in the pipeline
3. `CX`, `LP`, `DX`, and `MSR` are separated into solve-shaping rules versus explicit geometry rules
4. the constraint work is tied back to the larger ownership -> geometry -> topology -> transition architecture so it does not drift into a side system

## Summary

No more transition algorithm work should proceed until the geometry constraints are semantically correct, exported truthfully, and implemented in the correct stage of the shared geometry pipeline.

Target doctrine:

- there is no valid snap class in the target design
- if the transition classifier cannot account for a boundary, that is a defect
- diagnostics mode should freeze on that defect and present highlights and labels of how the map boundaries and regions are currently categorized and understood by the engine
- any relevant diagnostics data should be packaged for download and may also be written to console

The intended shared geometry constraint model is:

- `starWeight`
  - base real-site weight in the power-Voronoi solve
- `MSR`
  - protected territory-painting range around a star
- `CX`
  - same-player corridor connection
- `LP`
  - opposing-player corridor connection on a contested lane
- `DX`
  - disconnect zone between same-owner stars that are not lane-connected

All territory modes should consume the same shared ownership, geometry, topology, transition, and constraint truth.

## Baseline Geometry Principle

Plain power-Voronoi geometry is already most of the answer.

These constraints are not a second geometry system. They are:

- small local adjustments
- local protections
- edge-case guards

So the default attitude must be:

- start from plain PV
- keep the majority of the border exactly as plain PV would produce it
- apply `MSR`, `CX`, `LP`, and `DX` only where they are actually needed

## Pipeline Placement

The shared pipeline remains:

1. `TerritoryFrameInput`
2. shared `OwnershipSnapshot`
3. shared geometry constraints
4. plain power-Voronoi base solve
5. merged territory geometry
6. explicit post-solve geometry corrections
7. foundational sections and topology
8. shared transition truth
9. presentation

Constraint placement:

- `starWeight`
  - input to the plain power-Voronoi solve
- `CX`
  - solve-shaping rule along same-owner lanes
- `LP`
  - solve-shaping rule along contested lanes
- `DX`
  - explicit post-solve geometry correction
- `MSR`
  - explicit post-solve border rewrite

This split is intentional:

- `CX` and `LP` describe how territory should behave along lanes
- `DX` and `MSR` describe geometry that must not exist after the base solve

## Geometry Constraint Definitions

### `starWeight`

Meaning:

- the base real-site weight used by the geometry solve for a star's own site
- pure solve shaping only
- not a substitute for `MSR`
- not a corridor or disconnect rule

Implementation:

- keep it as a separate scalar on the star-site input to the geometry solve
- the current live control/key may still be named `starMargin` for the moment
- semantically, that control is the base site-weight control
- later cleanup should rename it truthfully, but the control and its utility remain

### `MSR`

Meaning:

- Minimum Star Range
- a protected region around a star
- its main job is visual:
  - keep a buffer of that star's territory around the star
  - keep the border and fill from cutting too close to the star
- its secondary job is topological:
  - when lane-margin mode is active, the same value can be used to force lanes to bend around stars where needed

Definition:

```ts
interface geometry_constraint_MSR {
  starId: string;
  ownerId: string;
  center: { x: number; y: number };
  radiusPx: number;
}
```

What this means in plain terms:

- every star has a circle around it
- inside that circle, the owning player's territory should remain visible
- the border should stay outside that circle
- if the border enters that circle, the bad border section must be replaced with a new section that runs around the outside of the circle

Implementation v1:

1. keep `geometry_constraint_MSR` as shared truth per star
2. after the plain PV solve and territory merge, inspect borders near each star
3. if a border section enters that star's `MSR` circle:
   1. find the border entry point
   2. find the border exit point
   3. find the outside apex on the `MSR` circle using the perpendicular direction from the star to the local border run
   4. replace the bad border section with a new curve from entry -> apex -> exit
4. rebuild the affected territory loop and affected foundational sections from the corrected border

Lane-margin use:

1. when lane-margin mode is enabled, apply the same `MSR` circle test to lane geometry
2. if a lane enters another star's `MSR` circle, replace that lane section with a new outside curve
3. do not create a second lane-margin rule with different geometry logic; it should reuse the same `MSR` math

### `CX`

Purpose: same-player corridor connection

- if two stars of the same owner are lane-connected, the owner's territory should remain connected along that lane corridor

Shared truth record:

```ts
interface geometry_constraint_CX {
  laneId: string;
  ownerId: string;
  starA: string;
  starB: string;
  polyline: ReadonlyArray<readonly [number, number]>;
  sampleSpacingPx: number;
  sampleCount: number | null;
  weight: number;
}
```

Implementation v1:

1. derive one `geometry_constraint_CX` for every same-owner lane
2. before the plain PV solve, place helper points along the actual lane path
3. those helper points belong to the lane owner's solve input
4. explicit count overrides spacing when present
5. otherwise spacing determines how many helper points are emitted

Important note:

- `CX` is a solve-shaping rule
- it should not be treated as a post-solve border rewrite

### `LP`: Lane Pairs

Purpose: opposing-player corridor connection

- a contested lane is owned by precisely two players, so no third player's territory should intrude on that lane, and the two lane owners should meet in the middle

Shared truth record:

```ts
interface geometry_constraint_LP {
  laneId: string;
  ownerA: string;
  ownerB: string;
  starA: string;
  starB: string;
  polyline: ReadonlyArray<readonly [number, number]>;
  pairCount: number;
  pairSpacingPx: number;
  weight: number;
  includeDistributedHalfLaneSamples: boolean;
}
```

Implementation v1:

1. derive one `geometry_constraint_LP` for every contested lane
2. before the plain PV solve, place paired helper points on opposite sides of the lane path
3. one side belongs to owner A
4. the other side belongs to owner B
5. optionally add more paired points farther along the lane if needed

Important note:

- `LP` is a solve-shaping rule
- it is not a synonym for `CX`
- it replaces the older mixed `CX contest` naming and logic

### `DX`: Disconnect Zones

- if two same-owner stars are not lane-connected, the territory painting must not create a misleading visual corridor between them

Shared truth record:

```ts
interface geometry_constraint_DX {
  sourceStarA: string;
  sourceStarB: string;
  ownerId: string;
  midpoint: { x: number; y: number };
  tangentAxis: { x: number; y: number };
  normalAxis: { x: number; y: number };
  depthPx: number;
  halfWidthPx: number;
  triggerReason: 'same_owner_midpoint_owned';
}
```

Trigger rule:

1. evaluate every same-owner pair that is not lane-connected
2. test ownership at the center-to-center midpoint
3. if that midpoint still belongs to that owner, emit a `geometry_constraint_DX`

Implementation v1:

1. shared truth emits the explicit `geometry_constraint_DX`
2. after the plain PV solve and merge, build a real disconnect shape at that midpoint
3. subtract that disconnect shape from the owner's merged territory
4. rebuild the affected territory loop and foundational sections from the corrected geometry

Sizing defaults:

- `depthPx = dxDepthFactor * |StarA-StarB|`
- `halfWidthPx = dxLaneGapFactor * localLaneGapPx`
- if `localLaneGapPx` cannot yet be measured reliably:
  - fallback to `dxFallbackWidthFactor * |StarA-StarB|`

Initial default factors:

- `dxDepthFactor = 0.15`
- `dxLaneGapFactor = 0.60`
- `dxFallbackWidthFactor = 0.30`

## Constraint Tuning Surfaces

These should become the explicit shared geometry tuning surfaces.

### `MSR`

- `GEOMETRY_MSR_PX`
- `GEOMETRY_LM_ENABLED`

### `starWeight`

- `GEOMETRY_STAR_WEIGHT`

### `CX`

- `GEOMETRY_CX_ENABLED`
- `GEOMETRY_CX_SAMPLE_SPACING_PX`
- `GEOMETRY_CX_SAMPLE_COUNT`
- `GEOMETRY_CX_WEIGHT`

### `LP`

- `GEOMETRY_LP_ENABLED`
- `GEOMETRY_LP_PAIR_COUNT`
- `GEOMETRY_LP_PAIR_SPACING_PX`
- `GEOMETRY_LP_WEIGHT`
- `GEOMETRY_LP_DISTRIBUTED_SAMPLES_ENABLED`

### `DX`

- `GEOMETRY_DX_ENABLED`
- `GEOMETRY_DX_MAX_DISTANCE_PX`
- `GEOMETRY_DX_DEPTH_FACTOR`
- `GEOMETRY_DX_LANE_GAP_FACTOR`
- `GEOMETRY_DX_FALLBACK_WIDTH_FACTOR`

## Diagnostics Freeze Mode

### Purpose

This mode exists to expose classification defects during transition work.

If a conquest-local boundary cannot be classified, the runtime should freeze and export truth instead of continuing into an unexplained defect state.

### Shared classification rule

For every foundational section inside the conquest-local eligible frontier envelope, the transition truth must assign exactly one final classification:

1. `unchanged_section`
2. `active_front_section`
3. `split_branch_section`
4. `final_region_disappearance`

Anything else is a defect.

Fault conditions:

- no classification assigned
- more than one conflicting classification assigned
- a section is referenced by transition output but absent from the classification set

### Diagnostics mode behavior

When `Freeze On Unclassified Boundary` is enabled:

1. capture the full truth export for the current conquest
2. freeze territory transition progression at the first offending frame
3. pause the game clock
4. highlight:
   - offending foundational sections
   - relevant structural vertices
   - relevant stable anchors
   - relevant change anchors if they exist
5. surface a fault summary in Diagnostics with:
   - conquest batch
   - section IDs
   - classification hole type
   - active path

This mode is diagnostic-only. It is not a shipping runtime mode.

## Ordered Work Streams

This `v7` sequence supersedes `v6`.

1. semantic cleanup
2. locked conquest casebook
3. shared truth pipeline
4. full diagnostics export
5. shared geometry constraint normalization
6. `CX` / `LP` solve-shaping implementation
7. `DX` / `MSR` explicit geometry implementation
8. section influence attribution
9. diagnostics freeze-on-unclassified instrumentation
10. PV transition rebuild
11. field-family migration
12. performance hardening

## Sprint 0 - Semantic Cleanup

- remove centroid-derived region IDs
- remove stale `pvv2:` residue
- clean up semantic naming drift in geometry tuning and diagnostics
- retire `CP` / `CX contest` naming in favor of `LP`
- keep the current `starMargin` control working while moving toward truthful semantic naming

## Sprint 1 - Locked Conquest Casebook

No runtime transition behavior changes are accepted until the casebook exists for:

1. simple `1:1`
2. dual conquest
3. `1:2`
4. `2:1`
5. single-star final-region disappearance
6. multi-star full-region disappearance
7. topology-gap
8. DX-trigger case
9. LP-contested-lane case
10. MSR-intersection case

## Sprint 2 - Shared Truth Pipeline

All modes consume:

1. `TerritoryFrameInput`
2. `OwnershipSnapshot`
3. stable runtime `GeometrySnapshot`
4. shared `TransitionTruthBundle`
5. derived substrates
6. presenter

`GameCanvas` does not invent ownership or transition truth.

## Sprint 3 - Full Diagnostics Export

One export must explain one conquest from source frame through rendered result.

Required stage exports:

1. `01_frame_input.json`
2. `02_ownership_prev.json`
3. `02_ownership_next.json`
4. `03_geometry_prev_full.json`
5. `03_geometry_next_full.json`
6. `04_topology_prev_full.json`
7. `04_topology_next_full.json`
8. `05_transition_snapshot.json`
9. `05_transition_truth.json`
10. `05_active_front_plan.json`
11. `05_geometry_constraints.json`
12. `06_render_frames/...`

## Sprint 4 - Shared Geometry Constraint Normalization

Replace the current drifted tunables with the explicit shared constraint model.

Required outputs:

- `geometry_constraint_MSR[]`
- `geometry_constraint_CX[]`
- `geometry_constraint_LP[]`
- `geometry_constraint_DX[]`

These are shared geometry truth, not family-local presentation hints.

## Sprint 5 - `CX` / `LP` Solve-Shaping Implementation

Implement lane-based solve shaping without changing the larger architecture.

Required behavior:

- `CX` keeps same-owner lane-connected stars connected along their lane
- `LP` keeps contested lanes owned only by the two lane owners
- the rest of the map remains as close as possible to plain PV

## Sprint 6 - `DX` / `MSR` Explicit Geometry Implementation

Implement explicit post-solve geometry corrections.

Required behavior:

- `DX` removes false same-owner corridors between stars that are not lane-connected
- `MSR` replaces border sections that cut too close to a star with new sections that run around the outside of the star's protected range
- lane-margin mode reuses the same `MSR` logic on lane geometry

## Sprint 7 - Section Influence Attribution

For each foundational section, derive:

- left/right owner IDs
- primary influencing star per side
- optional ranked influence list
- sampled-point influence metadata where required

This truth must come from the geometry solve / site attribution path, not from later presentation heuristics.

## Sprint 8 - Freeze-On-Unclassified Instrumentation

Add the diagnostics mode and make it consume:

- foundational-section metadata
- section classification records
- active-front plan
- transition-truth export

No silent fallthrough from unclassified boundary to any unnamed failure mode is allowed while this mode is enabled.

## Sprint 9 - PV Transition Rebuild

Rebuild around:

1. stable structural anchor pairs
2. conquest-local eligible frontier envelope
3. inward point walks to find change anchors
4. exact active-front span between change anchors
5. explicit split handling at 3-way junctions

If a case cannot be bounded locally and cleanly, the runtime should freeze in diagnostics mode and the defect must be fixed.

## Sprint 10 - Field-Family Migration

- move phase-field, phase-edges, and perimeter-field onto the same ownership, geometry, transition, and constraint truth
- keep their distinct visual substrates
- remove family-local truth reconstruction

## Sprint 11 - Performance Hardening

- cache geometry by ownership/tuning fingerprint
- cache constraint records by shared frame identity
- cache derived substrates by transition-truth identity
- keep per-frame work to sampling and drawing

## Test Plan

### Constraint truth

- `starWeight` changes solve shaping without redefining `MSR`
- `CX` only affects same-owner connected lanes
- `LP` only affects contested lanes
- `DX` only triggers for same-owner non-lane-connected midpoint-owned cases
- `MSR` rewrites only the border sections that violate the protected star range

### Diagnostics freeze

- an unclassified foundational section freezes territory transition progression
- the game pauses
- the export is written
- the offending sections and anchors are highlighted
- any live snap observed during this workstream is treated as evidence of a classification or transition defect

### Shared runtime

- field families no longer stub `contestedLaneIds`
- field families no longer rebuild PREV locally
- all families consume the same constraint records

### PV transition

- unchanged tails stay fixed
- split cases are explicit and locally bounded
- no whole-region birth
- only true final-region disappearance collapses
- `borderFrame` becomes truthful shared moving-border output

## Assumptions

- `Freeze On Unclassified Boundary` is a diagnostics mode, not a shipping mode
- the current CX / LP / DX virtual-site logic is a temporary adapter path, not the target semantic truth model
- constraint work does not replace the larger ownership -> geometry -> topology -> transition reset; it is one part of that reset

## Implementation Status

- Completed:
  - Sprint 0 semantic cleanup on active region identity and fingerprinting
  - casebook v1 and staged truth export expansion
  - Sprint 4 shared geometry-constraint normalization
  - Sprint 5 explicit `CX` / `LP` solve-shaping split
  - Sprint 6 active shared-generator cutover to explicit `DX` plus stronger `MSR`
  - post-Sprint-6 regression fix for blank PVV4 rendering caused by stale disconnect-owner checks in shared helpers
  - shared section-influence attribution
  - freeze-on-unclassified diagnostics trap
  - first bounded `1:1` active-front sampler rewrite with truthful `borderFrame`
  - bounded `1:2` / `2:1` split-front support on the active PVV4 path
  - shared ownership derivation for render families, including real contested-lane truth and deterministic ownership version
- Current remaining major work:
  - performance hardening
