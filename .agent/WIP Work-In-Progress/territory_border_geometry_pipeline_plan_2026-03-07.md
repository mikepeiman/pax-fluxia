# Territory Border Geometry Pipeline Plan (2026-03-07)

## Why This Plan Exists
- Current canonical two-pass DF path is aligned but still texture-quantized at high zoom.
- Super-sampling (`DF_BORDER_HQ`) improves quality but is too expensive for gameplay.
- Requirement is explicit: clean, even-width, SVG-like borders with fluid morph support, without breaking ownership alignment.

## Cross-Check With Research Note (`2026-03-07 territory render research.md`)

### What We Keep From That Analysis
- C+ core direction is correct: low-res ownership field as canonical truth + cheap fill/border passes.
- Ping-pong ownership textures are the right morph primitive.
- Ownership pass must be change-gated in steady state (not full recompute every frame).
- Zoom-adaptive quality is required, but must be scoped to visible content to avoid runaway cost.

### What We Adjust
- We do **not** replace canonical borders with simple 4-neighbor edge detect as final solution; it is too grid-dependent for SVG-like quality.
- We keep distance-based border masking (current field path) as a fallback while geometry borders are brought online.
- We treat geometry borders as a first-class renderer over the same ownership snapshot contract, not a separate visual experiment.

## Non-Negotiable Constraints
- Border and fill must remain in one coordinate contract (no drift).
- Border must be center-stroked on the ownership interface.
- Style updates (width/softness/alpha/color/blend) must be cheap and not force topology recompute.
- Topology rebuilds only on geometry/topology deltas, not every frame.

## Direction to Success (Revised)

### Track A: C+ Runtime Stabilization (Immediate)
1. Ownership pass invalidation
- Recompute ownership RT only on geometry/topology change and while morphing.
- Visual-only slider edits update pass-2 uniforms only.

2. Ping-pong ownership textures
- Maintain `prevOwnershipRT` and `currOwnershipRT`.
- On ownership change: swap, render new current, start morph timer.

3. Morph shading at texture level
- Fill morph blends computed fill colors from prev/curr ownership textures.
- Border morph blends prev/curr border masks similarly; do not decode owner from blended owner index.

4. Adaptive RT sizing (viewport-scoped)
- Scale ownership RT quality by zoom but cap by viewport dimensions and max budget.
- Reallocate only when crossing hysteresis thresholds to avoid thrash.

### Track B: Geometry Border Canonicalization (Primary Quality Goal)
5. Centerline graph extraction from ownership snapshot
- Build owner-pair boundary graph with sub-texel crossing localization.
- Keep deterministic ordering and stable IDs for morph correspondence.

6. Stroke mesh renderer (world-space)
- Render even-width, round-join/cap border meshes in world space.
- Style controls become material/uniform updates, not graph rebuilds.

7. Border families over shared centerline
- `straight`: constrained line fit with max-error.
- `curved`: deterministic biarc/cubic fit.
- `segmented`: angle-quantized fit.

### Track C: Safety/Perf Controls
8. Fallbacks and guards
- If centerline extraction confidence drops locally, fallback to field border for that boundary fragment.
- Keep canonical ownership fill active in all modes.

9. Dirty-bucket invalidation
- `topology`: rebuild graph + mesh.
- `geometry-style`: rebuild fitter/mesh.
- `visual-style`: uniforms only.

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
2. Implement ownership pass invalidation + ping-pong RT morph baseline.
3. Implement viewport-scoped adaptive RT sizing and hysteresis.
4. Implement centerline graph extraction from canonical ownership snapshot.
5. Implement `straight` family fitter with deterministic error bounds.
6. Implement stroke mesh builder and gate into canonical path.
7. Add curved/segmented fitters with same deterministic contracts.

## Acceptance Criteria
- Borders are visually centered on ownership interfaces at all zoom levels.
- Border edges are smooth and geometry-clean (no texture stair-step look in normal gameplay zooms).
- Fill/border alignment remains exact under static and changing ownership.
- No frame-time spikes from per-frame border recompute during steady state.
