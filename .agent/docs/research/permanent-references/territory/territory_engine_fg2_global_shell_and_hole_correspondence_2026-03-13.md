# FG2 Global Shell and Hole Correspondence — 2026-03-13

## Scope

This slice hardens FG2 dynamic shell playback by replacing greedy contour pairing with global one-to-one correspondence for both owner shells and shell holes.

It also adds a validity filter for animated hole geometry so the displayed cutout set remains a clean subset of the displayed shell during playback.

## Problem

Before this slice, FG2 playback had three structural weaknesses:
- shell matching was greedy by current-shell iteration
- hole matching was greedy by current-hole iteration inside a shell transition
- interpolated hole loops could survive even when they had become degenerate or visibly escaped the displayed shell polygon

Those behaviors were acceptable as a first playback bridge, but they are unstable once shell topology changes more aggressively. In practice they can produce shell identity flicker, incorrect enclave pairing, and invalid negative geometry during morph frames.

## Implementation

### 1. Global shell correspondence per owner
- Added `selectOwnerShellMatches(...)`.
- The function builds all previous/current shell match candidates for an owner.
- Candidates are scored using overlap, contour cost, and stable ordering heuristics.
- Candidate selection is then performed globally, one-to-one, so no previous shell can be assigned to multiple current shells.

This replaces the earlier greedy "walk current shells and grab the best previous shell" behavior.

### 2. Global hole correspondence inside a shell transition
- Added `selectOwnerShellHoleMatches(...)`.
- The same pattern now applies to hole loops inside an already matched shell transition.
- Hole candidates are collected, scored, globally sorted, and selected without conflict.

This stabilizes enclave pairing during shell transitions where hole counts or placement change.

### 3. Transition classification remains explicit
- `buildOwnerShellTransitions(...)` now consumes the selected shell matches.
- `buildOwnerShellHoleTransitions(...)` now consumes the selected hole matches.
- Matched items become `persist` transitions.
- Unmatched current items become `spawn` transitions.
- Unmatched previous items become `vanish` transitions.
- Spawn and vanish still use the existing collapsed-contour fallback behavior.

### 4. Animated hole sanitization
- Added `sanitizeInterpolatedOwnerShellHoleLoops(...)`.
- `buildInterpolatedOwnerShellArtifact(...)` now computes raw interpolated hole loops first, then filters them.
- Degenerate loops and loops that no longer sit meaningfully inside the displayed shell polygon are dropped.

This prevents invalid cutout geometry from reaching render-stage fill subtraction.

### 5. Expanded diagnostics
- Animation-side artifacts now expose:
  - `ownerShellHoleTransitions`
  - `ownerShellHoleTransitionCount`
  - `persistedOwnerShellHoleCount`
  - `spawnedOwnerShellHoleCount`
  - `vanishedOwnerShellHoleCount`
  - `ownerShellHoleContourSampleCount`
- Render-side summaries now also expose:
  - `ownerShellHoleTransitionCount`
  - `ownerShellHoleContourSampleCount`

This makes shell-hole playback inspectable instead of remaining opaque.

## Outcome

FG2 playback is now materially more stable in the exact area where topology changes tend to become visually wrong:
- shell identity selection is less likely to flicker
- hole identity selection is less likely to pair the wrong enclave
- displayed negative space is less likely to become visibly invalid during the transition

This is still not full split/merge topology solving, but it is a much stronger modular playback foundation than the earlier greedy bridge.

## Verification

Worktree:
- `C:\Users\mikep\Desktop\WebDev\PRISM-territory-work`

Validation after this slice:
- `bun run check` → `0 errors and 468 warnings in 19 files`
- `bun run build` → success

The remaining output is the known repo-baseline warning set only.

## Demo Status

Recommended demo config:
- `TERRITORY_ENGINE_ENABLED=true`
- `TERRITORY_ENGINE_STATIC_METHOD='fg2_seed_graph'`
- `TERRITORY_ENGINE_TRACE_MODE=true`

What should now be more visible:
- shell playback should be less likely to jump identities across update frames
- animated enclave holes should be less likely to pair incorrectly
- invalid cutout shapes should be suppressed rather than rendered

## Next

The next highest-value step is to push this from stronger correspondence into stronger shell validity:
- harden split/merge handling further
- tighten world-edge shell validity and containment checks
- surface the new shell-hole transition diagnostics more explicitly in the trace inspector
