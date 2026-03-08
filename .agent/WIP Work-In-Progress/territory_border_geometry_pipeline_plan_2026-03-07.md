# Territory Border Geometry Pipeline Plan (2026-03-07)

## Why This Plan Exists
- Current canonical two-pass DF path is aligned but still texture-quantized at high zoom.
- Super-sampling (`DF_BORDER_HQ`) improves quality but is too expensive for gameplay.
- Requirement is explicit: clean, even-width, SVG-like borders with fluid morph support, without breaking ownership alignment.

## Non-Negotiable Constraints
- Border and fill must remain in one coordinate contract (no drift).
- Border must be center-stroked on the ownership interface.
- Style updates (width/softness/alpha/color/blend) must be cheap and not force topology recompute.
- Topology rebuilds only on geometry/topology deltas, not every frame.

## Decision
- Keep ownership-field fill as canonical source of truth.
- Introduce a **geometry border pipeline** as the canonical border renderer (replacing texture-distance border rendering when enabled).
- Geometry pipeline consumes ownership snapshots and emits stroke primitives in world space.

## Border Families (Shared Contracts)
- `straight`: piecewise linear segments, round joins/caps, even width.
- `curved`: biarc/cubic fit over same centerline graph with deterministic error bounds.
- `segmented`: quantized-angle line family for stylized "faceted" borders.

All families share:
- same centerline graph input,
- same owner-pair color blend input,
- same stroke width/softness/alpha/brighten controls.

## Pipeline Architecture
1. Ownership Snapshot (existing canonical pass)
- Build ownership + enemy + gap field from DF influence pipeline.
- Snapshot identity is fingerprinted and reused for border cache keys.

2. Centerline Graph Extraction (new)
- Extract owner-pair boundary graph from ownership snapshot.
- Use sub-texel edge localization (gap-assisted) to avoid block-step stair artifacts.
- Emit deterministic graph nodes/edges with owner-pair labels.

3. Family Fitter (new)
- `straight`: constrained line fitting with max-error threshold.
- `curved`: deterministic biarc/cubic fitting under max-error threshold.
- `segmented`: angle-quantized simplifier under max-error threshold.

4. Stroke Geometry Builder (new)
- Build stroke mesh (triangle strips + join/cap geometry) in world space.
- Preserve centerline exactly; width expands symmetrically.
- Border softness rendered as halo pass or fragment falloff in stroke shader.

5. Render & Caching (new)
- Render border mesh each frame (cheap).
- Rebuild graph/mesh only when snapshot/topology changes or family-specific geometry controls change.
- Style-only control updates mutate uniforms/material only.

## Morphing Strategy
- Keep ownership/fill morph source unchanged.
- During conquest morph window, rebuild centerline graph at controlled cadence and interpolate stroke geometry between previous/current graph states.
- If correspondence confidence is low at a junction, degrade locally to short-lived field border fallback for that junction only.

## Performance Strategy
- No per-frame full recompute of border graph.
- Dirty buckets:
  - `topology`: rebuild centerline + mesh.
  - `geometry-style`: rebuild fitter/mesh only.
  - `visual-style`: uniforms only.
- Optional quality scaler:
  - extraction density follows zoom with clamps,
  - fit tolerance auto-tightens at high zoom.

## Immediate Execution Steps
1. Done: center-stroke correction in current field border path (half-width per side + boundary center bias).
2. Implement centerline graph extraction from canonical ownership snapshot.
3. Implement `straight` family fitter with deterministic error bounds.
4. Implement stroke mesh builder and gate into canonical path.
5. Add family switch plumbing (`straight/curved/segmented`) over shared graph contracts.
6. Add curved/segmented fitters with same deterministic constraints.

## Acceptance Criteria
- Borders are visually centered on ownership interfaces at all zoom levels.
- Border edges are smooth and geometry-clean (no texture stair-step look in normal gameplay zooms).
- Fill/border alignment remains exact under static and changing ownership.
- No frame-time spikes from per-frame border recompute during steady state.
