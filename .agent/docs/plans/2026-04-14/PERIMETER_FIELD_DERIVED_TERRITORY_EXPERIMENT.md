# Perimeter-Field Derived Territory Experiment

## Purpose
Try a new territory rendering approach because the current star-centered metaball transition work is not producing good visual results.

## Summary
- Add an experimental Territory render mode, `perimeter_field`.
- Generate base territory geometry from real ownership first.
- Derive perimeter vstars from that geometry.
- Real stars, CX, and DX contribute no displayed influence in this family after geometry derivation.
- Conquest animation uses a conquest-local radial override cache instead of changed-frontier extraction.

## Key Changes
- Add `perimeter_field` as a new Territory render mode.
- Extend `RenderFamilyInput` to carry optional base geometry.
- Use canonical vector geometry as the v1 base geometry source.
- Sample deterministic perimeter vstars from outer shell loops.
- Freeze the static `T0` perimeter field during transition and animate only a conquest-local radial handle set.
- At transition end, discard the local override and swap to the static `T1` perimeter field.

## Controls
- `Base Geometry Source`
- `Perimeter Sample Spacing`
- `Perimeter Influence Radius`
- `Perimeter Influence Weight`
- `Transition Ray Count`
- `Transition Duration`
- `Freeze Base Boundary During Transition`
- `Old Boundary Fade`
- `New Boundary Grow`

## Test Plan
- Identical ownership snapshots reproduce identical perimeter sample IDs and positions.
- Neutral-owned zero-ship stars still produce neutral territory.
- Only the conquest-local override moves during conquest.
- Non-local boundaries stay visually still.
- Final pre-settle frame is close to settled `T1`.
- No first-frame flash to `T1`.

## Alternatives Kept Alive
- Same idea as a fast Metaball-family spike.
- Full-loop T0/T1 pairing by loop ID and arc-length bin.
- SDF interface family.
- Boundary-handle deformation as presentation only.
