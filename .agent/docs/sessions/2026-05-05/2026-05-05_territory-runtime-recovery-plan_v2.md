# 2026-05-05 Territory Runtime Recovery Plan v2

## Purpose

The user's goal remains:

- one shared ownership and geometry truth for every render mode
- PV transition behavior that is local, deterministic, and minimal-transport
- diagnostics that explain one conquest end to end
- removal of semantic and architectural drift that is currently poisoning both implementation and reasoning

This v2 plan keeps the v1 structure but incorporates two new contributory concepts from the dialogue:

1. active-front selection should be bounded from conquest-local star ownership and foundational border sections
2. DX should evolve from pure virtual-site nudging into an explicit disconnect-zone construct

## Summary

The recovery still has six major work streams:

1. semantic cleanup
2. shared truth pipeline
3. full diagnostics export
4. PV transition rebuild
5. field-family migration onto shared truth
6. performance hardening

The new v2 additions are:

- the geometry/topology foundation should explicitly treat the section between any 3-way or world-edge junction pair as the foundational section
- PV active-front planning should gain deterministic per-section/per-point star influence attribution
- DX should gain an explicit zone representation and rendering/styling model

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

### Rule/documentation changes

- Keep the new `AGENT.md` rules active:
  - semantic-debt intercept
  - no anthropomorphizing code
  - versioned session-plan docs
  - no casual `canonical` jargon in dialogue

## Sprint 1 - Shared Truth Pipeline

### Target architecture

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

### New v2 geometry/topology requirement

- Promote the existing topology section model into an explicit architectural truth:
  - a foundational section is the border section between two structural vertices
  - structural vertices include:
    - 3-way junctions
    - world-edge intersections
    - world corners / closures where applicable
- Preserve richer sub-segment line-shape detail inside each foundational section, but do not treat that detail as the primary section identity.

## Sprint 2 - Diagnostics Truth Export

### Export pipeline

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

### New v2 diagnostic requirement

- Export real foundational-section influence data once it exists:
  - per-section owner-pair
  - per-section star influence attribution
  - change-anchor selection inputs and outputs
- Export DX zone truth once it exists:
  - source star pair
  - midpoint test result
  - zone depth/width inputs
  - zone geometry

## Sprint 3 - PV Transition Rebuild

### Locked transition rules

- snap is preferable to gross deformation
- whole-region birth is invalid
- collapse is only legitimate when the final star set of a region disappears on that tick
- single-star disappearance collapses to star center
- multi-star complete disappearance defaults to per-star collapse

### Algorithm rebuild

Implement the intended active-front algorithm directly:

1. determine the stable PRE/POST vertex pairs that bracket the changed boundary
2. walk inward from both ends point-by-point until the last non-diverging coordinates
3. define those points as the change anchors
4. define the active front strictly as the span between those change anchors

### New v2 active-front additions

- Add deterministic per-section/per-point star influence attribution.
  - This answers the user's question directly:
    - yes, the system should attempt to know which star(s) own or dominate each boundary section and its interior points
    - no, the current live topology does not yet carry real influence data; it is still stubbed
- For a conquest `StarA(owner A) -> StarB(owner B)`:
  - identify the foundational sections within reach of both stars
  - identify which PRE/POST boundaries in that local area still bear A ownership
  - use that set to bound the maximum changed frontier for that conquest
- Use the foundational section as the coarse transition unit and the change-anchor span as the fine motion unit inside it.
- Treat 3-way junctions as first-class stable-anchor candidates.
- Implement explicit `1:2` and `2:1` split planning instead of broad section activation.
- Replace broad next-side activation with exact sub-section activation.
- Generate `borderFrame` from the same sampled frontier sections that rebuild `fillFrame`.

## Sprint 4 - Region Disappearance And Identity Truth

- Determine disappearing regions from region identity and star membership, not centroid or raw loop-id churn.
- For single-star final-region loss:
  - collapse to that conquered star center
- For multi-star full-region loss in one tick:
  - default to per-star collapse
- Surface alternate dev controls only after shared truth is correct.
- Never synthesize a whole-region birth path.

## Sprint 5 - DX And Field-Family Migration

### DX rebuild

- Keep the current DX heuristic only as a temporary upstream nudge.
- Add an explicit DX-zone model:
  1. evaluate every same-owner pair that is not lane-connected
  2. test the center-to-center midpoint ownership
  3. if the midpoint still belongs to that owner, require a disconnect zone
  4. construct the zone using:
     - depth as a percentage of star-to-star span
     - width as a percentage of adjacent-lane spacing
  5. render/fill the zone in the same style family as the active mode
- Support fill options later:
  - neutral fill
  - patterned fill
  - other mode-consistent styling variants

### Field-family migration

- Make phase-field, phase-edges, and perimeter-field consume the shared ownership, geometry, and transition truth stages.
- Keep these as derived substrates, not separate base geometry pipelines:
  - grid classification / wave timing
  - perimeter control-point plans
  - explicit DX zones where applicable
- Remove family-local PREV reconstruction and ownership stubbing.
- Preserve each family's unique presentation logic while unifying truth and diagnostics.

## Sprint 6 - Performance Hardening

- Cache shared geometry by ownership/tunable fingerprint.
- Cache derived substrates by shared transition-truth identity.
- Recompute ownership/geometry only when source state or geometry tunables change.
- Keep per-frame work to:
  - sampling
  - sequencing
  - draw-command generation
- Validate that the unified pipeline does not regress 60fps transition playback.

## Test Plan

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
- exported `transition_snapshot` and `active_front_plan` match the runtime state actually used for rendering
- compact exports remain available but are clearly labeled as secondary
- foundational-section influence data and DX-zone data are exported once implemented

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
- zone depth and width respond predictably to their tuning inputs
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
