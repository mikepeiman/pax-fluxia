# 2026-05-05 Territory Runtime Recovery Plan v5

## Purpose

The user's goal is to eliminate snap and, before more transition work proceeds, get equally clear on exactly what the shared geometry constraints and tuning surfaces mean and how they will be implemented.

This v5 plan keeps the v4 recovery sequence, but corrects three misstatements from `v4`:

1. snap is not a valid target classification or fallback path
2. the current `starMargin` control is not to be thrown away; it remains the current implementation control for base site weight until semantic renaming lands
3. `MSR` is rewritten in plain language and defined more directly

## Summary

No more transition algorithm work should proceed until the geometry constraints are semantically correct and exported truthfully.

Target doctrine correction:

- there is no valid snap class in the target design
- if the transition classifier cannot account for a boundary, that is a defect
- diagnostics mode should freeze on that defect instead of turning it into a named fallback

The intended shared geometry constraint model is:

- `starWeight`
  - base real-site weight in the power / Voronoi solve
- `MSR`
  - explicit star-protection constraint
- `CX`
  - same-owner lane corridor reinforcement
- `LP`
  - opposing-owner lane-pair seam constraint
- `DX`
  - explicit disconnect-zone constraint

All territory modes should consume the same constraint descriptors through one shared ownership and geometry path.

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
- a keep-out radius around each star
- territory boundaries must not cut inside that radius
- lanes and supplemental geometry samples that do not belong to that star must stay outside that radius

Shared truth descriptor:

```ts
interface StarProtectionConstraint {
  starId: string;
  ownerId: string;
  center: { x: number; y: number };
  radiusPx: number;
}
```

Implementation v1:

1. derive one `StarProtectionConstraint` per star from `msrPx`
2. reject any `CX`, `LP`, or `DX` sample that would land inside another star's `MSR` disk unless that star is the explicit endpoint/source of that constraint
3. feed the current solver a support ring of same-owner samples on or just outside the `MSR` radius so the boundary stays outside the keep-out disk

Implementation v2:

- once the geometry compiler is ready for a more direct constraint stage, replace the guard-ring adapter with direct disk-aware frontier clipping or ownership-floor enforcement

Important rule:

- `MSR` is a keep-out rule
- `starWeight` is a solve-shaping term
- they are different controls and must not be conflated

### `CX`

Meaning:

- same-player corridor connection
- if two stars of the same owner are lane-connected, the owner's territory should remain connected along that lane corridor

Shared truth descriptor:

```ts
interface CXCorridorConstraint {
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

1. derive one `CXCorridorConstraint` for every same-owner lane
2. materialize it into distributed same-owner supplemental samples along the actual lane polyline
3. respect `MSR`:
   - corridor samples may not intrude into non-endpoint star-protection disks
4. count and spacing semantics:
   - explicit count overrides spacing when present
   - otherwise spacing determines how many samples are emitted

### `LP`

Meaning:

- opposing-player corridor connection
- more precisely: the lane-pair seam constraint on a contested lane
- this is the cross-owner counterpart to `CX`

Shared truth descriptor:

```ts
interface LPLanePairConstraint {
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

1. derive one `LPLanePairConstraint` for every cross-owner lane
2. materialize it into paired owner-attributed samples around the lane midpoint along lane arc length
3. optionally add distributed half-lane reinforcement samples on each owner's side of the lane
4. respect `MSR`:
   - no lane-pair sample may intrude into a non-endpoint star-protection disk

Retirement rule:

- the old `CP` naming and the old `CX contest` phrasing are semantic debt
- `LP` should be the explicit name for the contested-lane seam constraint

### `DX`

Meaning:

- disconnect zone
- if two same-owner stars are not lane-connected, but the space between them is still owned by that same owner, the geometry must not falsely imply a corridor connection

Shared truth descriptor:

```ts
interface DXZoneConstraint {
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
3. if that midpoint still belongs to that owner, emit a `DXZoneConstraint`

Implementation v1:

1. shared truth emits the explicit `DXZoneConstraint`
2. the geometry compiler temporarily adapts that descriptor into the current virtual-site style carve pattern so the live solve can honor it
3. render families may later render the zone directly from the descriptor, but the shared truth must exist first

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

- `TERRITORY_MSR_PX`
- optional internal-only guard-ring density if needed, but not as a primary user knob

### `starWeight`

- `TERRITORY_STAR_WEIGHT`

### `CX`

- `TERRITORY_CX_ENABLED`
- `TERRITORY_CX_SAMPLE_SPACING_PX`
- `TERRITORY_CX_SAMPLE_COUNT`
- `TERRITORY_CX_WEIGHT`

### `LP`

- `TERRITORY_LP_ENABLED`
- `TERRITORY_LP_PAIR_COUNT`
- `TERRITORY_LP_PAIR_SPACING_PX`
- `TERRITORY_LP_WEIGHT`
- `TERRITORY_LP_DISTRIBUTED_SAMPLES_ENABLED`

### `DX`

- `TERRITORY_DX_ENABLED`
- `TERRITORY_DX_MAX_DISTANCE_PX`
- `TERRITORY_DX_DEPTH_FACTOR`
- `TERRITORY_DX_LANE_GAP_FACTOR`
- `TERRITORY_DX_FALLBACK_WIDTH_FACTOR`
- `TERRITORY_DX_WEIGHT`

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

Anything else is an unclassified boundary fault.

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

- `StarProtectionConstraint[]`
- `CXCorridorConstraint[]`
- `LPLanePairConstraint[]`
- `DXZoneConstraint[]`

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
- let each mode derive its own visual style from the same descriptor
- move phase-field, phase-edges, and perimeter-field onto the same ownership, geometry, transition, and constraint truth

## Sprint 9 - Performance Hardening

- cache geometry by ownership/tuning fingerprint
- cache constraint descriptors by shared frame identity
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
- all families consume the same constraint descriptors

### PV transition

- unchanged tails stay fixed
- split cases are explicit or snap cleanly
- no whole-region birth
- only true final-region disappearance collapses
- `borderFrame` becomes truthful shared moving-border output

## Assumptions

- `Freeze On Unclassified Boundary` is a diagnostics mode, not a shipping mode
- the current CX / LP / DX virtual-site logic is a temporary adapter path, not the target semantic truth model
