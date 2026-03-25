# Territory Engine FG2 Animated Hole Carryover — 2026-03-13

## Scope
This slice extends FG2 owner-shell playback so hole information is no longer reduced to `holeCount` only.

## Problem
Static owner-shell fills had already gained correct hole subtraction, but animated shell playback still degraded hole behavior because interpolated displayed shells did not carry hole geometry. That created two remaining failures:
1. Hole-only topology changes could fail to trigger shell playback because frame fingerprints only tracked the outer shell plus hole count.
2. Animated displayed shells could revert to solid fills because render-stage cutout logic had no direct hole geometry to cut from interpolated shells.

## What changed
- `FG2OwnerShellFrameShell` now carries `holeLoops` geometry instead of just `holeCount`.
- `FG2OwnerShellTransitionArtifact` now carries `currentHoleLoops` and `previousHoleLoops`.
- `FG2InterpolatedOwnerShellArtifact` now carries `holeLoops`.
- Shell-frame fingerprinting now includes hole-loop geometry, not only hole count.
- `executeAnimationStage(...)` now snapshots current `ownerShellLoops` into the shell frame.
- Render-stage cutout logic now accepts either:
  - static shell hole ids resolved through current `ownerShellLoops`, or
  - direct hole-loop geometry from interpolated displayed shells.

## Current behavior
- Static shell fills still cut holes authoritatively.
- Animated displayed shells now keep a usable hole-loop set during playback.
- Hole selection currently uses previous/current fallback based on transition progress.
- This means animated holes are now present, but they still hand off discretely instead of morphing continuously.

## Why this matters
This is the first playback slice where enclave holes are part of the displayed shell artifact itself rather than an exclusively static render feature. It also makes shell playback sensitive to hole-only geometry changes, which was a real blind spot in the previous fingerprint logic.

## Validation
- `npm run check`: success, `0 errors`, warnings only.
- `npm run build`: success.

## Remaining gap
True hole-to-hole correspondence and interpolation is still not implemented. The next upgrade should match hole loops across previous/current shells and interpolate those contours directly instead of switching between two discrete hole sets.
