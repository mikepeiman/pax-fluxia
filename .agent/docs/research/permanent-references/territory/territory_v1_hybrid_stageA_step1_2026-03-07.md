# Territory Rendering V1 Hybrid - Stage A Step 1 (2026-03-07)

## Scope
Step 1 of the approved execution order:
- Ownership pass invalidation gating
- Ping-pong ownership textures for fill morph baseline
- Keep canonical alignment contract intact

## Implemented Changes
1. Added ping-pong ownership textures:
- `cachedOwnershipTexture` = current ownership snapshot
- `cachedPrevOwnershipTexture` = previous ownership snapshot

2. Added pass-2 fill morph blending from textures:
- Fill shader now samples both `uOwnershipTex` and `uPrevOwnershipTex`
- Added `uMorphFactor` in fill pass uniforms
- Fill color/coverage/smoothing blend between prev/current ownership snapshots

3. Added ownership/boundary invalidation state:
- `cachedOwnershipFieldValid`
- `cachedOwnershipFieldDirty`
- `cachedBoundaryDistanceDirty`
- Ownership pass mapping snapshot cache (`cachedOwnershipPassOrigin*`, `cachedOwnershipPassExtent*`)

4. Gated pass-1 recompute path:
- Ownership pass now reruns only when required by:
  - topology/geometry rebuild path
  - ownership-affecting controls (`DF_INFLUENCE_WEIGHT`, `DF_MIN_STAR_RADIUS`)
  - pass mapping changes
  - render texture size changes
  - invalid/dirty ownership cache
- Removed `isMorphing` from topology rebuild trigger for star-data packing.

5. Added ownership texture rotation for morph baseline:
- On ownership refresh with a valid existing field, swap current/previous ownership RTs before rendering new current snapshot.
- This preserves true previous ownership texture for pass-2 blend.

6. Gated boundary distance/JFA recompute:
- Boundary field recomputes only when ownership changes or cache invalidates.
- Avoids unnecessary steady-state per-frame JFA work.

## Guardrails Preserved
- No changes to non-DF territory mode dispatch.
- Alignment mapping remains based on existing render origin/extent contract.
- Two-pass fill remains canonical when two-pass is active.

## Notes
- Morph baseline now exists in fill path (texture blend) without requiring per-frame ownership re-rasterization.
- Border morph correspondence/mesh lerp remains for later stage commits.
