# 2026-05-05 Territory Runtime Recovery Plan v1

## Purpose

The user's actual goal is to fix the territory runtime and transition architecture so that:

- one shared ownership and geometry truth feeds every render mode
- PV transition behavior becomes minimal-transport and trustworthy
- diagnostics exports explain one conquest end to end
- semantic and architectural drift stop poisoning both implementation and reasoning

This plan groups small semantic cleanup work separately from the larger architectural and algorithm sprints.

## Summary

The current system has four core defects:

1. semantic drift on active paths:
   - centroid-derived region IDs
   - stale `pvv2:` residue
   - misleading tuning names
   - misleading diagnostics labels
2. duplicated truth construction:
   - `GameCanvas` and field families rebuild ownership/transition truth locally
3. incomplete diagnostics:
   - exported artifacts start after raw frame normalization and compact away critical truth
4. incorrect PV transition substrate use:
   - current change-span logic broadens motion
   - split cases are underdefined
   - moving borders are not first-class output

The recovery sequence is:

1. semantic cleanup
2. shared truth pipeline
3. full diagnostics export
4. PV transition rebuild
5. field-family migration onto shared truth
6. performance hardening

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
  - example: family-wide geometry builders must not carry perimeter-only names if they are shared
- Clean diagnostics labels so summary fields say exactly what they mean.
  - replace vague activity labels where needed
  - keep counts secondary to real structured data

### Rule/documentation changes

- Update `AGENT.md` to lock:
  - semantic-debt intercept behavior
  - no anthropomorphizing code in dialogue
  - versioned session-plan docs when direction changes materially
  - avoid `canonical` in dialogue/semantic naming except when quoting existing code symbols

## Sprint 1 - Shared Truth Pipeline

### Target architecture

All territory modes must consume the same shared truth stages:

1. `TerritoryFrameInput`
2. `OwnershipSnapshot`
3. stable runtime `GeometrySnapshot`
4. `TransitionTruthBundle`
5. derived substrate(s)
6. presenter

### Required changes

- Make `GameCanvas` presentation-only for territory truth.
  - It may select a render mode and pass frame input.
  - It must not fabricate thin ownership snapshots or family-local transition truth.
- Create a shared `TransitionTruthBundle` that carries:
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
  - If collapse presentation needs star centers, derive them directly from real conquered stars and region membership.
- Restore real ownership derivation for all families.
  - `contestedLaneIds` must be computed, not stubbed as `[]`
  - ownership snapshots must be the same shape across PV and field families

## Sprint 2 - Diagnostics Truth Export

### Export pipeline

One export must be sufficient to explain one conquest from source frame to rendered result.

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

### Rules

- Keep compact exports, but label them as compact.
- Keep `bundle` = in-memory capture and `package` = exported artifact.
- Export real moving border data if `borderFrame` remains in the transition contract.

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

### Corrective changes

- Replace base-path divergence plus point-padding as the primary transport algorithm.
- Treat 3-way junctions as first-class stable-anchor candidates.
- Implement explicit `1:2` and `2:1` split planning.
- Remove broad "activate all overlapping sections" behavior.
- Remove split-mode broadening that activates every next-side section.
- Generate `borderFrame` from the same sampled frontier sections that rebuild `fillFrame`.

## Sprint 4 - Region Disappearance And Identity Truth

- Determine disappearing regions from region identity and star membership, not centroid or raw loop-id churn.
- For single-star final-region loss:
  - collapse to that conquered star center
- For multi-star full-region loss in one tick:
  - default to per-star collapse
- Surface alternate dev controls only after shared truth is correct.
- Never synthesize a whole-region birth path.

## Sprint 5 - Field-Family Migration

- Make phase-field, phase-edges, and perimeter-field consume the shared ownership, geometry, and transition truth stages.
- Keep these as derived substrates, not separate base geometry pipelines:
  - grid classification / wave timing
  - perimeter control-point plans
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

### PV transition

- long `1:1` frontiers move only inside the change-anchor span
- unchanged tails stay fixed
- `1:2` / `2:1` cases use explicit split planning or snap cleanly
- `borderFrame` matches `fillFrame`'s moving borders

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
