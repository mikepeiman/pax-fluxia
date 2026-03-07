# Territory Pipeline Unified Plan (Alignment + Performance + Morph)

Date: 2026-03-07
Owner: Codex + Mike
Scope: Distance Field (DF) canonical path, with vector borders enabled where configured

## Problem Statement
Current pipeline has three coupled failures:
1. Border/fill divergence and visible misalignment (UX-breaking).
2. Main-thread jank from ownership sampling / vector border rebuild path.
3. Missing or non-effective conquest morph animation in current DF path.

These are not independent. We must enforce a single ownership snapshot contract, then optimize compute around that contract, then layer morph + blend features on top.

## Non-Negotiable Constraints
1. Territory fill and borders must align with starmap ownership semantics.
2. Borders and fill must render from the same ownership snapshot identity.
3. Frame rendering continues every frame; heavy ownership recompute does not.
4. Any stale async/incremental border build must be canceled if snapshot changes.
5. Determinism is preserved for topology and virtual-site generation.

## Locked Decisions
1. Ownership source of truth is a typed `OwnershipSnapshot` with unique snapshot ID.
2. Border/fill swap is atomic by snapshot ID (no mixed-state draw).
3. Incremental compute is allowed only inside a snapshot build job.
4. Dirty-region recompute is preferred over full-map rebuild for delta updates.
5. Morph timeline drives both fill and border using synchronized factors.

## Execution Steps (Commit-per-step)

### Step 1 - Shared Snapshot Contract
Commit message: `Lock fill and vector borders to shared ownership snapshot contract`

Changes:
- Add typed ownership snapshot structure in DF renderer containing:
  - `snapshotId`
  - canonicalized stars/connections/player IDs
  - virtual-site set fingerprint
  - ownership grid metadata (origin, extents, resolution)
  - build state flags (`building`, `ready`, `stale`)
- Ensure both fill path and vector border path read only active snapshot.
- Replace loose static fingerprint usage in vector path with explicit snapshot ID checks.
- Cancel/discard in-progress vector build jobs on snapshot mismatch.

Acceptance:
- No frame where fill from snapshot N and border from snapshot N-1 are mixed.
- Slider changes no longer cause brief border/fill de-sync artifacts.

### Step 2 - Divergence Diagnostics + Guardrail
Commit message: `Add border fill divergence diagnostics and assert guardrails`

Changes:
- Add diagnostics payload for:
  - active fill snapshot ID
n  - active border snapshot ID
  - mismatch count, max drift estimate
  - optional sampled mismatch points for debug
- Add optional debug overlay toggle to visualize mismatch samples.
- Add dev assert/warn when snapshot IDs diverge beyond one frame transient.

Acceptance:
- Drift location and magnitude are measurable and loggable.
- Regression becomes detectable immediately during tuning.

### Step 3 - Chunked Compute with Atomic Swap
Commit message: `Move vector ownership rebuild to cancelable chunked job with atomic publish`

Changes:
- Keep chunked ownership sampling but publish result only when complete and snapshot IDs still match.
- While build in progress, continue drawing previous fully-valid border snapshot (not partial new snapshot).
- Ensure partial grids never flow into extraction/draw.

Acceptance:
- Long tasks from `sampleOwnerFromSites` materially reduced.
- No wobble/flicker from partial border publications.

### Step 4 - Dirty Region Recompute
Commit message: `Implement dirty region ownership and border recompute`

Changes:
- Compute dirty regions from changed ownership/topology inputs:
  - stars that changed owner
  - immediate connected neighbors
  - corridor/DX influence radius
  - MSR influence radius
- Recompute ownership only for dirty tiles.
- Re-extract polylines for affected tiles and merge with cached unaffected geometry.

Acceptance:
- Rebuild cost scales with changed area, not map area.
- Small conquest updates avoid full-grid recompute.

### Step 5 - Synchronized Morph Timeline
Commit message: `Implement synchronized conquest morph timeline for fill and border`

Changes:
- Add explicit morph state machine with:
  - `prevSnapshotId`, `nextSnapshotId`
  - start time, duration, easing mode
  - shared `morphFactor`
- Fill and border sample from same morph timeline.
- Expose tuning controls:
  - morph duration
  - easing function

Acceptance:
- Visible smooth conquest transition.
- Border and fill transition in lockstep without divergence.

### Step 6 - DX/Corridor/MSR Stabilization in Snapshot Model
Commit message: `Stabilize DX corridor and MSR under ownership snapshot lifecycle`

Changes:
- Ensure DX virtual-site generation persists after slider release.
- Keep deterministic ordering + dedupe in snapshot fingerprints.
- Validate corridor/MSR interactions under dirty-region updates.

Acceptance:
- No transient DX effect that reverts next frame.
- Virtual site counts stable for stable inputs.

### Step 7 - Border Blend Modes (HSLA + Force Weighting)
Commit message: `Add HSLA border blend modes with optional force weighting`

Changes:
- Add tunable border color blending modes:
  - equal blend
  - weighted by neighboring star force/active ships
  - HSLA shaping controls
- Blend computed in border shading stage only (ownership geometry untouched).

Acceptance:
- User can tune blend style without geometry drift.
- Blend transitions remain stable during morph.

### Step 8 - Final Hardening + Docs
Commit message: `Territory V1 hardening pass for alignment performance and morph`

Changes:
- Baseline/perf matrix before/after.
- Add known limits and tuning guidance.
- Update WIP/session docs and feature status.

Acceptance:
- No UX-breaking border/fill divergence in normal play.
- Jank materially reduced versus pre-plan baseline.
- Morph is visibly active and tunable.

## Risk Register
1. Tile-merge seams in dirty-region extraction.
   - Mitigation: overlap margin + seam reconciliation pass.
2. Snapshot churn under rapid slider motion.
   - Mitigation: cancel older build jobs; only latest snapshot publishable.
3. Morph + dirty-region interaction complexity.
   - Mitigation: lock morph against snapshot pair, forbid partial pair publication.

## Instrumentation to Track Progress
1. Snapshot IDs currently displayed (fill vs border).
2. Ownership sampling rows processed per frame.
3. Rebuild wall time and chunk count.
4. Dirty tile count per update.
5. Long-task incidence in Performance panel.

## Current Status at Plan Freeze
- Existing callsite-gate regression was reverted.
- Chunked vector build exists, but snapshot atomicity and divergence guardrails still incomplete.
- Perf improved but still janky under dense scenes/tuning.

## Immediate Next Action
Start Step 1 implementation in `DistanceFieldTerritoryRenderer.ts` and related callsites.

## Progress Update (2026-03-07)
- Implemented ownership snapshot contract for vector borders in DistanceFieldTerritoryRenderer.ts.
- Added explicit snapshot IDs to vector build jobs and render context, plus stale-job publish guard.
- Extended vector rebuild fingerprint to include influence/min-star-radius and player ID ordering.
- Added clear inline comments for future maintainers/agents around the fill/border snapshot lock semantics.
- Gated high-volume DF debug logs behind DF_DEBUG_LOGS=false to reduce runtime overhead.
- Reset path now clears vector published snapshot state to avoid stale carryover after cache resets.
- Added low-risk perf cut: gated high-frequency DF topology/debug console logging behind DF_DEBUG_LOGS to prevent log-induced frame stalls during ticks and slider adjustments.
- Implemented vector border pipeline split into geometry vs style invalidation:
  - expensive ownership sampling/polyline extraction only on geometry/topology/morph/snapshot changes,
  - style-only slider changes redraw existing cached polylines without resampling.
- Added zoom-aware vector grid scaling and raised vector grid quality ceiling (`DF_VECTOR_MAX_GRID=1024`, floor `DF_VECTOR_MIN_GRID=128`) to reduce visible fill/border drift at close zoom.
- Added cached vector polyline state + geometry/style fingerprints for deterministic reuse across frames.
- Updated reset path to clear new vector cache buckets (`geometry/style/polylines`).
