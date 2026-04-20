# Perimeter Field Active Plan Revision

Date: 2026-04-16  
Status: Active implementation plan and operating contract  
Scope: `perimeter_field` only

This document replaces the previous active `perimeter_field` plan as the single operating contract. The older gap report and plan review remain useful as historical analysis, but this file is the authority for implementation and debugging.

Any bug or deficiency investigation must start from:

1. this active plan
2. the governing mode/spec docs
3. current implementation status against those docs

If current code contradicts this document, this document wins unless the user changes the design.

## Summary

Target outcomes:

- `perimeter_field` on `power_voronoi_0319` transitions from exact `PREV` to exact `NEXT` with no terminal snap and no synthetic local override path.
- Static territory and underlying-geometry diagnostics remain faithful to authoritative raw `Geometry_0319` loops.
- Scrub/preview/export are exact live truth and provide paused-map `PREV`, `NEXT`, and transition snapshots with vstar IDs, mover IDs, and clear prev-to-next vectors.
- User-facing behavior contains no legacy, hallucinated, or approximate transition model.

Hard rejects:

- no star-center angle matching
- no whole-loop or whole-region replacement when only changed fronts should move
- no `NEXT-after-settle` concept
- no `freeze base`
- no reasoning from current implementation drift as if it were intended design
- no user-facing legacy transition selector in the accepted result

## Current Status Against Spec

Implemented and preserved:

- Stable geometry identity is split between gameplay anchors and virtual contributors.
- `buildPowerVoronoiFrontierTopology()` exists and is wired into adapted `power_voronoi_0319` geometry.
- `PerimeterFieldTransitionTruth` is captured upstream and consumed by `PerimeterFieldFamily` instead of rebuilding `PREV` from reverted stars.
- The active `power_voronoi` renderer path now runs through the plan-driven transition scene, not the legacy star-angle bridge.
- `power_voronoi` sample coordinates now come from authoritative visible source loops while section/loop identity still comes from topology.
- Transition mover vectors now terminate on actual sampled `PREV` and `NEXT` coordinates instead of synthetic resample coordinates.
- Paused snapshot overlay controls exist for `prev`, `next`, `transition`, and `compare`, with alpha/ID/vector options.
- Export and diagnostics carry compact plan metadata, mover vectors, and changed-front chain data.
- Governance corrections already exist:
  - plan/spec/status-first rule
  - post-mortem documenting the reasoning/process failures
  - `NEXT` truth captured at conquest start
  - `freeze base` expunged
  - `appearing` / `disappearing` marked provisional and residual-only

Still requiring validation or follow-through:

- In-browser visual validation of the corrected `power_voronoi_0319` transition path and paused overlay is still required.
- `appearing` / `disappearing` remains provisional; the design may still tighten toward total changed-`PREV`/`NEXT` matching.
- Workspace-wide `bun run check` still has unrelated baseline failures outside `perimeter_field`; they are not acceptance gates for this mode.

## Implementation Changes

### 1. Make this plan the only active contract

- Treat any missing “execution plan” concept as obsolete.
- Keep this file as the single active contract.
- Require `Current Status Against Spec` to be updated whenever the implementation meaningfully changes.

### 2. Move truth capture upstream and make transition state pure

- Capture `PREV` and `NEXT` together at conquest start in the render-family transition/session layer.
- The capture hook lives upstream of the family renderer because that layer owns:
  - active conquest events
  - previous-frame capture
  - replay/bundle history
  - access to both pre-mutation and post-mutation family inputs
- Replace “family rebuilds old geometry from reverted stars” with “family consumes captured truth payload.”
- Public truth payload:
  - `PerimeterFieldTransitionTruth`
  - `conquestKey`
  - `prevGeometry`
  - `nextGeometry`
  - `prevOwnership`
  - `nextOwnership`
  - `prevVSet`
  - `nextVSet`
  - `changedFronts`
- `PerimeterFieldFamily` must not derive `PREV` internally.

### 3. Separate authoritative visible geometry from topology/correspondence substrate

- For `power_voronoi_0319`, raw `Geometry_0319` loops remain authoritative for:
  - static visible territory
  - underlying-geometry overlay
  - prev/next snapshot overlays
  - visible perimeter sample coordinates
- Frontier topology is used for:
  - section identity
  - changed-front extraction
  - correspondence planning
  - crossing checks
- Reconstructed topology is not the authoritative visible geometry source unless parity is explicitly proven.

### 4. Replace the active legacy transition path on `power_voronoi_0319`

- Delete the active gate that disabled the plan engine for `power_voronoi`.
- Remove the legacy synthetic bridge from the active default path:
  - no `buildTransitionSamples()` dispatch
  - no star-angle matcher
  - no local old/new source substitution as the live transition model
- Any temporary rollback path must be dev-only, non-default, unsurfaced, and removed before acceptance.

### 5. Add conquest-scoped changed-front extraction

- Inputs:
  - `prevTopology`
  - `nextTopology`
  - `prevGeometry`
  - `nextGeometry`
  - `conquestEvents`
- Output:
  - `ChangedFrontSelectionResult`
  - ordered `ChangedFrontChain[]`
- Selection rule:
  - start from changed sections whose owner pair involves the event’s previous owner or new owner
  - restrict to loops containing the conquered-star anchor in `PREV` or `NEXT`
  - expand only through adjacent changed sections
  - exclude unrelated changed sections elsewhere on the map

### 6. Replace exact-ID preservation with actual correspondence

- First pass: total changed-front matching
  - walk changed `PREV` and `NEXT` spans in boundary order
  - preserve a pair only when position, tangent, and monotone order compatibility all hold
- Second pass: unmatched span partitioning
  - cut changed fronts between preserved anchors
  - pair each unmatched `PREV` span only with the corresponding unmatched `NEXT` span in the same changed-front chain
- Third pass: local remesh / pairing
  - pair actual sampled `PREV` and `NEXT` V coordinates monotonically
  - if counts differ, expand the shorter side deterministically without inventing off-grid endpoint coordinates
  - assign deterministic mover IDs
- Fourth pass: residual classification
  - only after total matching and span pairing
  - `appearing` / `disappearing` remain residual-only and diagnostic

### 7. Keep motion routing constrained and deterministic

- Obstacle set for crossing rejection:
  - non-changed `NEXT` frontier polylines
- Within a span, monotone pairing is the primary anti-crossing guarantee.
- Route selection order:
  - straight
  - shallow tangent/lane-biased arc
  - stronger bow-away arc
  - polyline fallback if ever introduced
- Motion shaping may use attacker/victor tangent only after correspondence is fixed.

### 8. Build the paused snapshot overlay

- Add a paused-map overlay mode for `perimeter_field`.
- Public controls:
  - `PERIMETER_FIELD_DEBUG_SNAPSHOT_MODE`
  - `PERIMETER_FIELD_DEBUG_SNAPSHOT_ALPHA`
  - `PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_IDS`
  - `PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_VECTORS`
- Modes:
  - `prev`
  - `next`
  - `transition`
  - `compare`
- Overlay is composited over the paused live map and is separate from underlying-geometry diagnostics.

### 9. Finish diagnostics/export around the same truth model

- Recorder/export must package:
  - clean prev map
  - clean next map
  - transition snapshot map
  - compact topology pair
  - vector/mover metadata
- Compact diagnostics metadata must include:
  - stable V IDs
  - mover IDs
  - prev/current/next coordinates
  - residual unmatched classifications
  - changed-front chain IDs

### 10. Commit cadence is mandatory

- Commit after every completed checkpoint that changes externally inspectable behavior.
- Do not batch multiple checkpoints into one commit when avoidable.
- Preferred checkpoint sequence:
  1. plan/doc replacement and status baseline
  2. atomic conquest-start truth capture
  3. active-path switch from legacy to plan
  4. changed-front selector and actual correspondence
  5. paused snapshot overlay and export metadata
  6. legacy cleanup and final invariants

## Public Interfaces / Types

- `PerimeterFieldTransitionTruth`
- `ChangedFrontSelectionResult`
- `ChangedFrontChain`
- `PERIMETER_FIELD_DEBUG_SNAPSHOT_MODE`
- `PERIMETER_FIELD_DEBUG_SNAPSHOT_ALPHA`
- `PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_IDS`
- `PERIMETER_FIELD_DEBUG_SNAPSHOT_SHOW_VECTORS`

Retired or disallowed:

- `PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION`
- user-facing legacy transition-engine selection

## Test Plan

### Truth and purity

- `PREV` snapshot equals the exact live gameplay frame immediately before conquest transition begins.
- `NEXT` snapshot equals the exact conquest-result gameplay frame captured at conquest start.
- Transition rendering is a pure function of captured truth plus progress.

### Geometry and identity

- Raw `Geometry_0319` visible loops remain authoritative for `power_voronoi_0319`.
- Stable region/shell identity survives source adaptation.
- Gameplay anchor identity is not polluted by virtual contributors.

### Changed-front and correspondence

- Changed-front selection includes only conquest-relevant chains.
- Unchanged fronts do not move.
- Preserved V’s keep identity under MOE, tangent, and order rules.
- Actual mover endpoints land on actual sampled `PREV` and `NEXT` coordinates.
- Total matching is attempted before any `appearing` / `disappearing` residue.
- No star-center angle heuristic remains in the active path.

### Motion and terminal behavior

- Approved mover paths do not cross non-changed `NEXT` frontier polylines.
- The last active transition frame is visually near-identical to `NEXT`.
- No terminal snap like `F17 -> F18` remains.

### Diagnostics and overlay

- `prev`, `next`, `transition`, and `compare` snapshot modes render in paused gameplay.
- Alpha overlay works over the live paused map.
- IDs and vectors are present and legible.
- Exported compact metadata contains the same IDs and vectors shown on-map.

## Assumptions and Defaults

- Preferred source geometry remains `power_voronoi_0319`.
- `Geometry_0319` visible loops remain authoritative until explicit parity evidence justifies replacing them.
- `appearing` / `disappearing` stays provisional and residual-only.
- A temporary dev-only rollback path is acceptable only during implementation and is not part of acceptance.
