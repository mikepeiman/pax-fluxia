# 2026-05-05 Territory Runtime Recovery Plan v6

## Purpose

The user's goal is to eliminate snap and, before more transition work proceeds, get equally clear on exactly what the shared geometry constraints and tuning surfaces mean and how they will be implemented.

This v6 plan keeps the `v5` correction, but improves two more things:

1. the definitions are rewritten in simpler game terms
2. the baseline geometry principle is made explicit: plain power-Voronoi geometry is already mostly correct, and these constraints are local adjustments and edge-case guards

## Summary

No more transition algorithm work should proceed until the geometry constraints are semantically correct and exported truthfully.

Target doctrine correction:

- there is no valid snap class in the target design
- if the transition classifier cannot account for a boundary, that is a defect
- diagnostics mode should freeze on that defect and present highlights and labels of how the map boundaries and regions are currently categorized and understood by the engine. Any relevant diagnostics data should be packaged for download, and/or output to console. 

The intended shared geometry constraint model is:

- `starWeight`
  - base real-site weight in the power / Voronoi solve
- `MSR`
  - protected territory-painting range around a star
- `CX`
  - same-player corridor connection
- `LP`
  - opposing-player corridor connection on a contested lane
- `DX`
  - disconnect zone between same-owner stars that are not lane-connected

All territory modes should consume the same constraint records through one shared ownership and geometry path.

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
- the border should adapt and curve naturally around the outermost vertice of that circle (perpendicular to lane vector), not simply merging that circle-arc into the border

Implementation v1:

1. rename current relevant MSR variable to `geometry_constraint_MSR`
2. when building helper geometry for other constraints, do not place those helper points inside another star's MSR range
3. draw the circle around star at MSR radius;
   1. if a boundary (border) intersects, take the furthest vertex of the MSR ring, as found by a line radiating from the star center perpendicular to the border
   2. use that vertex to redraw that boundary and replace the original boundary with it in the next-iteration modified geometry


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
2. place helper points along the actual lane path so the solved territory stays connected along that lane
3. keep those helper points out of other stars' protected `MSR` circles
4. count and spacing semantics:
   - explicit count overrides spacing when present
   - otherwise spacing determines how many samples are emitted

### `LP`: Lane Pairs

Purpose: opposing-player corridor connection
- Definition:
  - a contested lane is owned by precisely two players, so no third player's territory should intrude on that lane, and they should meet in the middle

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

1. derive one `geometry_constraint_LP` for every cross-owner lane
2. place helper points on each side of the contested lane so the solved territory stays limited to those two players along that lane
3. optionally add extra helper points farther along each side of the lane if needed
4. keep those helper points out of other stars' protected `MSR` circles

Retirement rule:

- the old `CP` naming and the old `CX contest` phrasing are semantic debt
- `LP` should be the explicit shorthand name for this rule

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
2. the geometry compiler temporarily converts that zone into helper geometry that keeps the painted territory from connecting across it
3. render families may later render the zone directly from that shared data, but the shared truth must exist first

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
- optional internal-only guard-ring density if needed, but not as a primary user knob

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
- `GEOMETRY_DX_WEIGHT`

## Diagnostics Freeze Mode

### Purpose

This mode exists to eliminate silent classification holes during transition work.

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

This v4 sequence supersedes v3 when constraint semantics are involved.

1. semantic cleanup
2. locked conquest casebook
3. shared truth pipeline
4. full diagnostics export
5. shared geometry constraint normalization
6. section influence attribution
7. diagnostics freeze-on-unclassified instrumentation
8. PV transition rebuild
9. DX explicit-zone rendering migration + field-family migration
10. performance hardening

## Sprint 0 - Semantic Cleanup

- remove centroid-derived region IDs
- remove stale `pvv2:` residue
- remove `starMargin` as semantic naming
- retire `CP` / `CX contest` naming in favor of `LP`
- clean diagnostic labels that over-compress or mislead

## Sprint 1 - Locked Conquest Casebook

No runtime transition behavior changes are accepted until the casebook exists for:

1. simple `1:1`
2. dual conquest
3. `1:2`
4. `2:1`
5. single-star final-region disappearance
6. multi-star full-region disappearance
7. snap-no-front
8. topology-gap
9. DX-trigger case
10. LP-contested-lane case

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

## Sprint 5 - Section Influence Attribution

For each foundational section, derive:

- left/right owner IDs
- primary influencing star per side
- optional ranked influence list
- sampled-point influence metadata where required

This truth must come from the geometry solve / site attribution path, not from later presentation heuristics.

## Sprint 6 - Freeze-On-Unclassified Instrumentation

Add the diagnostics mode and make it consume:

- foundational-section metadata
- section classification records
- active-front plan
- transition-truth export

No silent fallthrough from unclassified boundary to snap is allowed while this mode is enabled.

## Sprint 7 - PV Transition Rebuild

Keep the existing v3 motion rules and rebuild around:

1. stable structural anchor pairs
2. conquest-local eligible frontier envelope
3. inward point walks to find change anchors
4. exact active-front span between change anchors
5. explicit split handling at 3-way junctions

If a case cannot be bounded locally and cleanly, the runtime should freeze in diagnostics mode and the defect must be fixed. The target design does not admit snap as a valid end-state class.

## Sprint 8 - DX Rendering And Field-Family Migration

- keep DX shared truth explicit
- let each mode derive its own visual style from the same shared data
- move phase-field, phase-edges, and perimeter-field onto the same ownership, geometry, transition, and constraint truth

## Sprint 9 - Performance Hardening

- cache geometry by ownership/tuning fingerprint
- cache constraint records by shared frame identity
- cache derived substrates by transition-truth identity
- keep per-frame work to sampling and drawing

## Test Plan

### Constraint truth

- `MSR` is no longer implemented only as site weight
- `starWeight` changes solve shaping without redefining `MSR`
- `CX` only affects same-owner connected lanes
- `LP` only affects contested lanes
- `DX` only triggers for same-owner non-lane-connected midpoint-owned cases

### Diagnostics freeze

- an unclassified foundational section freezes territory transition progression
- the game pauses
- the export is written
- the offending sections and anchors are highlighted
- no snap class is considered valid target behavior
- any live snap observed during this workstream is treated as evidence of a classification or transition defect

### Shared runtime

- field families no longer stub `contestedLaneIds`
- field families no longer rebuild PREV locally
- all families consume the same constraint records

### PV transition

- unchanged tails stay fixed
- split cases are explicit or snap cleanly
- no whole-region birth
- only true final-region disappearance collapses
- `borderFrame` becomes truthful shared moving-border output

## Assumptions

- `Freeze On Unclassified Boundary` is a diagnostics mode, not a shipping mode
- the current CX / LP / DX virtual-site logic is a temporary adapter path, not the target semantic truth model
