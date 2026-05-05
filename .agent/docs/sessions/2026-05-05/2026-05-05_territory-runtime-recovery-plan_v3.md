# 2026-05-05 Territory Runtime Recovery Plan v3

## Purpose

The user's goal is to make the territory runtime decision-complete and trustworthy:

- one shared ownership and geometry truth feeds every render mode
- PV transition behavior is local, deterministic, and minimal-transport
- diagnostics exports explain one conquest from raw frame to rendered result
- semantic and architectural drift are removed instead of worked around

This v3 plan keeps the v2 structure but tightens four unresolved implementation decisions:

1. motion work is gated behind a locked conquest casebook
2. `foundational section` is defined precisely
3. conquest-local eligible frontier selection is defined more concretely
4. DX shared truth is defined as a descriptor instead of a vague future shape

## Summary

The recovery has eight ordered work streams:

1. semantic cleanup
2. locked conquest casebook
3. shared truth pipeline
4. full diagnostics export
5. section influence attribution
6. PV transition rebuild
7. DX explicit-zone model + field-family migration
8. performance hardening

Hard sequencing rule:

- no runtime transition behavior changes before:
  - semantic cleanup is complete enough to remove false labels/IDs
  - the conquest casebook exists
  - the export pipeline can explain one conquest end to end

## Definitions

### Foundational section

A foundational section is the maximal contiguous border chain between two structural vertices.

Structural vertices are:

- 3-way junctions
- world-edge intersections
- world-corner / loop-closure vertices where the border model requires them

A foundational section has:

- stable section identity
- ordered sampled points
- owner-pair identity
- structural start/end vertices

Anything finer than that is a sub-section or sub-segment inside a foundational section, not a new foundational section.

### Eligible frontier envelope for one conquest

For conquest `StarA(owner A) -> StarB(owner B)`, the maximum admissible changed frontier envelope is:

- the union of foundational sections in PRE or POST where:
  - the owner pair includes `A` or `B`
  - the section influence attribution includes `StarA` or `StarB`
  - the section still bears `A` ownership on at least one relevant side in PRE or POST

This is the coarse upper bound only.

The actual active front is the change-anchor span inside that envelope.

### DX zone descriptor

DX shared truth should not be a hidden site hack. It should be a descriptor with:

- `sourceStarA`
- `sourceStarB`
- `ownerId`
- `midpoint`
- `tangentAxis`
- `normalAxis`
- `depthPx`
- `halfWidthPx`
- `triggerReason`

Each render mode may style the zone differently, but all render modes consume the same descriptor.

## Sprint 0 - Semantic Cleanup And Contract Repair

### Trivial / grouped cleanup

- Remove centroid-derived region IDs from the stable geometry compiler.
  - Replace with deterministic region identity based on:
    - owner ID
    - sorted owned-star IDs
  - Keep continuity matching layered on top for split/merge handling.
- Remove stale `pvv2:` residue from geometry and topology version/fingerprint strings.
- Rename geometry/tuning terms to their real meanings:
  - `starMargin` -> `starWeight`
  - `msrStarBias` -> `msrPx` or equivalent true MSR name
  - lane-pair controls grouped under explicit `LP` naming
- Rename misleading helpers and export labels on active paths.
- Clean diagnostics labels so summary fields say exactly what they mean.

## Sprint 1 - Locked Conquest Casebook

Before runtime behavior changes, create and freeze a conquest casebook with exported artifacts for at least:

1. simple `1:1` local conquest
2. dual conquest
3. `1:2` split
4. `2:1` merge
5. single-star final-region disappearance
6. multi-star full-region disappearance
7. snap-no-front case
8. topology-gap case

Each casebook entry must include:

- raw frame input
- prev/next ownership
- prev/next geometry
- prev/next topology
- transition truth
- rendered frames
- short acceptance note describing what should and should not move

## Sprint 2 - Shared Truth Pipeline

All territory modes consume the same shared truth stages:

1. `TerritoryFrameInput`
2. `OwnershipSnapshot`
3. stable runtime `GeometrySnapshot`
4. `TransitionTruthBundle`
5. derived substrate(s)
6. presenter

### Required changes

- Make `GameCanvas` presentation-only for territory truth.
- Create a shared `TransitionTruthBundle` carrying:
  - `tickId`
  - `nowMs`
  - conquest batch
  - previous ownership
  - next ownership
  - previous geometry
  - next geometry
  - previous topology
  - next topology
- Remove `virtualStars` from the shared PV transition contract.
- Restore real ownership derivation for all families, including real `contestedLaneIds`.
- Promote the existing section model into explicit shared geometry truth.

## Sprint 3 - Diagnostics Truth Export

One export must explain one conquest from source frame to rendered result.

Add stage-ordered exports:

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
11. `06_render_frames/...`

### Required export truths

- foundational-section metadata
- section influence attribution
- stable-anchor selection inputs/outputs
- change-anchor selection inputs/outputs
- DX zone descriptors once implemented

Compact exports remain available but are secondary.

## Sprint 4 - Section Influence Attribution

The live topology currently stubs section influence. Replace that with deterministic attribution.

### Required shared truth

For each foundational section:

- left/right owner IDs
- primary influencing star ID on each side
- optional ranked influence list on each side
- sampled-point influence metadata where needed for high-change areas

### Source of truth

This attribution should come from the origin geometry solve / site ownership, not from later presentation heuristics.

This sprint exists so conquest-local frontier selection stops being a guess.

## Sprint 5 - PV Transition Rebuild

### Locked transition rules

- snap is preferable to gross deformation
- whole-region birth is invalid
- collapse is only legitimate when the final star set of a region disappears on that tick
- single-star disappearance collapses to star center
- multi-star complete disappearance defaults to per-star collapse

### Algorithm rebuild

Implement the intended active-front algorithm directly:

1. determine the stable PRE/POST structural vertex pairs that bracket the changed boundary
2. choose the eligible frontier envelope for the conquest from section influence attribution
3. walk inward from both ends point-by-point until the last non-diverging coordinates
4. define those points as the change anchors
5. define the active front strictly as the span between those change anchors

### Required changes

- treat 3-way junctions as first-class stable-anchor candidates
- implement explicit `1:2` and `2:1` split planning instead of broad section activation
- replace broad next-side activation with exact sub-section activation
- generate `borderFrame` from the same sampled frontier sections that rebuild `fillFrame`
- if a case cannot be bounded locally and cleanly, snap instead of broadening transport

## Sprint 6 - DX Explicit-Zone Model And Field-Family Migration

### DX rebuild

Keep the current DX heuristic only as a temporary upstream nudge.

Add an explicit DX-zone trigger rule:

1. evaluate every same-owner pair that is not lane-connected
2. test the center-to-center midpoint ownership
3. if the midpoint still belongs to that owner, require a DX zone

### Initial DX v1 descriptor defaults

- center = midpoint of `StarA` and `StarB`
- tangent axis = normalized `StarA -> StarB`
- normal axis = perpendicular
- `depthPx = 0.15 * |StarA-StarB|`
- `halfWidthPx` initial rule:
  - measure local perpendicular clearance on both sides from the midpoint
  - use `0.30 * min(clearanceLeft, clearanceRight)` as the default half-width
  - if that clearance cannot yet be measured reliably, fallback to `0.30 * |StarA-StarB|`

### Rendering rule

- shared truth exports the descriptor
- each mode derives its own zone geometry/fill from that descriptor
- initial fill default:
  - neutral fill
- later options:
  - patterned fill
  - mode-specific stylistic variants

### Field-family migration

- Make phase-field, phase-edges, and perimeter-field consume the shared ownership, geometry, and transition truth stages.
- Keep these as derived substrates, not separate base geometry pipelines:
  - grid classification / wave timing
  - perimeter control-point plans
  - explicit DX zones where applicable
- Remove family-local PREV reconstruction and ownership stubbing.

## Sprint 7 - Performance Hardening

- Cache shared geometry by ownership/tunable fingerprint.
- Cache derived substrates by shared transition-truth identity.
- Recompute ownership/geometry only when source state or geometry tunables change.
- Keep per-frame work to:
  - sampling
  - sequencing
  - draw-command generation
- Validate that the unified pipeline does not regress 60fps transition playback.

## Test Plan

### Casebook gate

- no motion algorithm changes are accepted until the locked casebook artifacts exist
- every later transition change is judged against the same casebook entries

### Identity and collapse

- same owned-star set keeps the same region identity across boundary drift
- centroid movement alone never changes region identity
- only final-region disappearance triggers collapse
- single-star final-region disappearance collapses to star center
- multi-star final-region disappearance defaults to per-star collapse
- no whole-region birth path exists anywhere

### Shared runtime

- PVV4, phase-field, phase-edges, and perimeter-field all consume the same ownership and geometry truth
- `contestedLaneIds` is real in field-family paths
- `GameCanvas` no longer fabricates family-local territory truth

### Diagnostics

- one exported artifact captures raw frame input through rendered frames
- exported `transition_snapshot` and `active_front_plan` match runtime truth
- foundational-section metadata, influence attribution, and DX descriptors are exported once implemented

### PV transition

- long `1:1` frontiers move only inside the change-anchor span
- unchanged tails stay fixed
- `1:2` / `2:1` cases use explicit split planning or snap cleanly
- active-front bounds are explainable in terms of:
  - stable anchors
  - change anchors
  - foundational sections
  - conquest-local star influence
- `borderFrame` matches `fillFrame`'s moving borders

### DX

- same-owner non-lane-connected pairs are tested deterministically
- midpoint-owned cases create a DX zone
- zone depth and width respond predictably to their descriptor inputs
- DX zone rendering matches the style language of the active mode

### Performance

- no duplicate geometry recomputation per family per frame
- derived substrates are reused across render modes when truth is unchanged
- active transitions maintain frame-rate targets under normal play

## Assumptions

- The semantic cleanup is part of the real work, not optional polish.
- The user's rule remains binding:
  - snap is preferable to gross deformation
- The default complete multi-star region disappearance mode is per-star collapse.
- `borderFrame` should remain in the contract and become truthful, rather than being deleted.
- Foundational sections remain the correct coarse structural unit for transition planning.
