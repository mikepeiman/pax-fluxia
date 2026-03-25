# Territory Renderer Re-Architecture (2026-03-07)

## Why Re-Architecture Is Required
Observed behavior confirms the current mismatch class:
- Territory fill and border can diverge under vector overlay settings (`Vector Grid`, `Vector Straighten`, simplify).
- This is structural, not tuning: CPU-extracted/simplified polylines are an approximation of a continuous ownership field.
- Any simplification/straightening pass can move the path off true ownership boundaries.

Invariant to enforce:
- Borders and fills must be generated from the same canonical ownership field every frame.
- There must be no user setting that can break border/fill alignment.

## Root Cause (First-Principles)
Current architecture has two boundary generators:
1. GPU ownership/influence evaluation (single-pass fill and two-pass ownership/border pipeline)
2. CPU ownership sampling + vector path extraction + simplification/straightening

When #2 is enabled, border geometry is no longer mathematically identical to #1.
Result: unavoidable drift.

## Canonical Architecture (Ownership-First)
Single source of truth:
1. Pass A (GPU): compute ownership field texture from star data, influence weight, MSR, corridor/disconnect, morph factor.
2. Pass B (GPU): compute boundary distance / border mask from ownership field.
3. Pass C (GPU): render borders from boundary field.
4. Pass D (GPU): render fills from ownership field (or keep fill in Pass A-compatible shader only if parity-proven).

Policy:
- Any optional border family (straight/curved/segmented) must consume the same ownership field.
- No family may own an independent winner function.

## Border Families Under Canonical Ownership
- `aligned` (default/canonical): even-width SDF/JFA border directly from ownership texture.
- `straight` (future): stylistic post-process constrained to ownership cells; cannot alter ownership boundary itself.
- `curved` (future): smoothing constrained to ownership iso-boundary corridor.
- `segmented` (future): decorative segmentation along canonical boundary path only.

## What Was Changed Immediately
- Production path now routes borders through two-pass ownership field rendering when renderer exists.
- CPU vector overlay path is debug-gated only because it can break the invariant by design.

## Migration Plan
1. Lock canonical path (done): two-pass ownership border path is authoritative in production.
2. Fill parity lock: render fill from ownership texture (backfill) to guarantee strict fill/border parity.
3. Remove/retire user controls that imply non-canonical geometry mutation (`straighten/simplify`) unless constrained to canonical boundary corridor.
4. Add strict alignment diagnostics (sampled parity checks between displayed fill owner and border-owner pairs).
5. Reintroduce advanced styles as visual-only overlays constrained by canonical boundary field.

## Performance Strategy (after parity lock)
- Keep ownership pass at adaptive internal resolution with HQ cap.
- Update ownership/boundary only on topology+active morph ticks; style-only changes do not recompute ownership.
- Optional dirty-region updates for conquest-local changes.
- Avoid per-frame CPU contour extraction for canonical borders.

## Acceptance Criteria
- At max zoom, border centerline overlays canonical ownership boundary with no perceptible offset.
- Changing visual style controls cannot alter ownership topology.
- No slider combination produces border/fill divergence.
- Conquest morph updates fill and border in lockstep from shared ownership snapshots.
