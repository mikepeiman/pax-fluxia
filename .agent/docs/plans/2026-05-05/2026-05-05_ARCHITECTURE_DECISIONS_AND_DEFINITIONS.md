# 2026-05-05 Architecture Decisions And Definitions

## Purpose

This tracked document records the decisions, corrections, definitions, and challenged concepts established in the architecture/data-shape dialogue.

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

### D-2026-05-05-03: Export artifacts must preserve pipeline stages explicitly

- Status:
  - active diagnostic requirement
- Rule:
  - exported diagnostics should capture raw frame input, normalized ownership, derived geometry/topology, transition runtime, and rendered frames as separate stages
- Why:
  - current packages begin too late and compact too much
  - that prevents one artifact from fully explaining one conquest

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

## Proposed Identity Direction

Region identity should be derived from continuity in ownership/connectivity, not from centroid coincidence.

Candidate basis:

- owner ID
- connected star-component membership
- previous-to-next continuity matching by star membership overlap and adjacency

## Files Most Relevant To These Decisions

- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\compiler_UnifiedVectorGeometry.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\powerVoronoiTerritoryGeometryGenerator.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\layers\geometry\planners\GeometryFingerprint.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\compiler\buildFrontierTopology.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionSnapshotRecorder.ts`
- `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia\pax-fluxia\src\lib\territory\devtools\TransitionBundleSerializer.ts`
