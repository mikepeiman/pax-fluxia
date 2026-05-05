# 2026-05-05 Decisions And Definitions

## Purpose

This document records the decisions, corrections, definitions, and challenged concepts established in the architecture dialogue.

## Definitions

### `bundle`

- Meaning:
  - the in-memory recorder artifact
- Concrete type:
  - `TransitionDebugBundle`
- Producer:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`

### `package`

- Meaning:
  - the exported diagnostic artifact built from a bundle
- Concrete type:
  - `DiagnosticPackageManifest`
- Producer:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`

### `anchorKey`

- Meaning:
  - the key for a pair of stable anchor vertex IDs
- Not:
  - a user-level change-anchor name
- Example:
  - `1029.77,473.03|1113.36,331.86`

### Stable anchors

- Meaning:
  - topology vertices used to bound and compare frontier chains
- Current ID form:
  - coordinate strings

### Change anchors

- Meaning:
  - local start and end points of actual motion inside a stable-anchor-bounded chain
- Current representation:
  - `changeAnchorWindow`
  - exported `fronts[].changeAnchors.startPoint` / `endPoint`

### `envelope`

- Meaning:
  - the lifecycle and timing record for one active transition
- Not:
  - geometry
- Carries:
  - `transitionId`
  - `startedAtMs`
  - `durationMs`
  - `progress`
  - `conquestEvents`

## Challenged / Corrected Terms

### “canonical”

- Status:
  - rejected as dialogue and semantic naming
- Acceptable replacements:
  - stable geometry
  - normalized geometry
  - runtime geometry contract
  - geometry adapter

### `pvv2` in geometry / topology versions

- Status:
  - identified as stale fingerprint residue
- Meaning:
  - obsolete naming embedded in current geometry fingerprint generation
- Not:
  - proof that the legacy PVV2 renderer is the active runtime path

### `evaluation = animated_fronts`

- Meaning:
  - at least one active front was planned
- Not:
  - proof that the transition is visually correct
  - proof that all conquests in the frame were handled acceptably

### `front`

- Meaning:
  - one planned active frontier window between a pair of stable anchors
- Consequence:
  - one conquest can create zero, one, or several fronts
  - `frontCount` is not the same thing as `conquest count`

## Decisions

### D-2026-05-05-01: Region identity must not derive from centroid

- Status:
  - active
- Rule:
  - a centroid cannot be the region ID
- Reason:
  - identity must survive local boundary changes
  - a centroid moves precisely when the boundary changes
  - therefore centroid-derived identity guarantees churn
- Consequence:
  - the current vector geometry region-ID heuristic is structurally wrong

### D-2026-05-05-02: Shared truth pipeline, multiple presentation substrates

- Status:
  - active architectural direction
- Rule:
  - there should be one shared ownership truth stage and one shared stable-geometry stage
  - mode-specific behavior should branch only after shared truth exists
- Valid derived substrates:
  - frontier topology / active-front transport
  - perimeter V-sets
  - grid classification / wave timing
- Invalid pattern:
  - family-local re-invention of ownership or prior geometry truth inside render families

### D-2026-05-05-03: Whole-region birth is invalid; region collapse is tightly constrained

- Status:
  - active
- Rules:
  - whole-region birth animation is always invalid
  - region collapse is only legitimate when the final star set of a region is conquered on that tick
  - single-star region disappearance collapses to the conquered star center
  - multi-star complete disappearance defaults to per-star collapse
  - alternate presentation variants may exist later as dev controls, but they are not part of shared PV transition truth

### D-2026-05-05-04: Export artifacts must preserve pipeline stages explicitly

- Status:
  - active diagnostic requirement
- Rule:
  - exported diagnostics should capture raw frame input, normalized ownership, derived geometry/topology, transition runtime, and rendered frames as separate stages
- Why:
  - current packages begin too late and compact too much
  - that prevents one artifact from fully explaining one conquest

### D-2026-05-05-05: `GameCanvas` must orchestrate presentation, not invent transition truth

- Status:
  - active architectural direction
- Rule:
  - `GameCanvas` may choose mode and supply frame input
  - it must not fabricate thin ownership snapshots or family-local transition truth that diverges from the shared runtime pipeline
- Consequence:
  - field families must consume the shared ownership and geometry stages
  - `contestedLaneIds: []` in family-local ownership is a deficiency to remove, not a valid data shape

## Current Failures

### Region IDs

- Current implementation:
  - `region:${ownerId}:${roundedCentroid}`
- Why it fails:
  - couples identity to geometry motion
  - produces split/merge churn
  - degrades continuity matching and transition reasoning

### Topology IDs

- Current implementation:
  - vertex IDs are coordinate strings
  - section IDs are coordinate-composite strings
- Why this matters:
  - these are technically IDs, but they read as geometry data
  - diagnostics and transition reasoning become harder to interpret

### Package / bundle ambiguity

- Correction:
  - use `bundle` only for in-memory capture
  - use `package` only for exported diagnostic artifact

### `borderFrame` contract weakness

- Current state:
  - live PVV4 transition sampling makes `fillFrame` the meaningful moving payload while `borderFrame` stays empty
- Why this matters:
  - moving borders are not first-class transition truth
  - diagnostics and other render families cannot rely on one shared moving-border output
- Direction:
  - make `borderFrame` truthful, or remove it from the contract; leaving it empty by default is not an acceptable end state

## Proposed Identity Direction

Region identity should be derived from continuity in ownership/connectivity, not from centroid coincidence.

Candidate basis:

- owner ID
- deterministically sorted owned-star IDs for the region
- connected star-component membership
- previous-to-next continuity matching by star membership overlap and adjacency

## Files Most Relevant To These Decisions

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\compiler_UnifiedVectorGeometry.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\powerVoronoiTerritoryGeometryGenerator.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\planners\GeometryFingerprint.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\buildFrontierTopology.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`

## Geometry Constraint Definitions

### `starWeight`

- Meaning:
  - the base real-site weight used by the geometry solve
- It is not:
  - `MSR`
  - corridor truth
  - disconnect truth
- Consequence:
  - `starMargin` is a false semantic name and must be retired

### `MSR`

- Expansion:
  - Minimum Star Range
- Meaning:
  - star-protection constraint
  - non-origin boundaries and non-endpoint constraint samples must not intrude inside the protected disk around a star
- Required shared truth:
  - per-star protection descriptor with:
    - star ID
    - owner ID
    - center
    - radius in pixels
- Current live deficiency:
  - it is still partly faked through the site-weight term instead of being a first-class protection constraint

### `CX`

- Meaning:
  - same-player corridor connection
- Rule:
  - if two same-owner stars are lane-connected, the owner's territory should remain connected along that lane corridor
- Required shared truth:
  - lane-based corridor descriptor over the actual lane polyline

### `LP`

- Meaning:
  - opposing-player corridor connection
  - more precisely: the contested-lane lane-pair seam constraint
- Rule:
  - if two connected stars have opposing owners, only those two owners should own the contested lane seam
- Required shared truth:
  - explicit contested-lane pair descriptor
- Semantic cleanup:
  - old `CP` naming and old `CX contest` phrasing are drift and should be retired

### `DX`

- Meaning:
  - disconnect zone
- Trigger:
  - same-owner pair
  - not lane-connected
  - midpoint still owned by that owner
- Required shared truth:
  - explicit zone descriptor with:
    - midpoint
    - tangent axis
    - normal axis
    - depth
    - half-width
    - source star pair

## Diagnostics Freeze Definition

### `Freeze On Unclassified Boundary`

- Purpose:
  - catch classification holes before they silently degrade into snap or bad transport
- Trigger:
  - a foundational section inside the conquest-local eligible frontier envelope does not receive exactly one final classification
- Allowed final classifications:
  - `unchanged_section`
  - `active_front_section`
  - `split_branch_section`
  - `final_region_disappearance`
  - `explicit_snap_with_reason`
- Freeze behavior:
  - capture export
  - freeze territory transition progression
  - pause game
  - highlight offending sections and relevant anchors

## Corrections

### Snap

- Snap is not a valid target classification or fallback in this workstream.
- If snap occurs, it is treated as evidence of:
  - unclassified boundary truth
  - incomplete transition classification
  - or other transition defect

### `starMargin`

- The current `starMargin` control is not to be discarded.
- Its current utility remains:
  - it is the live base site-weight control in the solver path
- The semantic problem is not that the control exists.
- The semantic problem is:
  - it must not be confused with `MSR`
  - it should eventually be renamed truthfully

### `MSR`

- Plain definition:
  - `MSR` is a keep-out radius around a star
  - boundaries must stay outside it
  - lanes and supplemental samples that do not belong to that star must stay outside it
