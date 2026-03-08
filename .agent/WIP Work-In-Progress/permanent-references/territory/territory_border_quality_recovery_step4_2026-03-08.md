# Border Quality Recovery - Step 4 (2026-03-08)

## Scope
Commit 4 of the Border Quality Recovery Plan:
- mesh-mode integration in DF renderer
- center-stroke alignment contract checks

## Implemented
1. Integrated mesh engine path into DF border routing:
- in two-pass border stage, when `DF_BORDER_ENGINE === 'mesh'`, renderer now executes `renderMeshBorderOverlay(...)`
- legacy geometry path remains active for `legacy_grid`
- field path remains active for `legacy_field`

2. Added mesh overlay cache/runtime structures:
- `cachedStrokeMeshContainer`
- per-owner-pair mesh records
- geometry/style fingerprints for controlled rebuilds

3. Added mesh rendering helpers in DF renderer:
- pair-color blend helper (ownerA/ownerB + brighten)
- shader uniform update helper logic
- mesh visibility lifecycle controls (`hideStrokeMeshOverlay`, `destroyStrokeMeshOverlay`)

4. Added center-stroke alignment checks:
- `assertMeshCenterStrokeAlignment(...)` samples centerline points against alignment/content bounds with margin derived from half border width
- assertion emits diagnostics on drift conditions

5. Added fallback behavior:
- if mesh path is not ready for a frame, fallback continues to field border overlay (local ladder)
- inactive overlay paths are explicitly hidden to prevent visual divergence

## Runtime Behavior
- Mesh engine is now live through existing `DF_BORDER_ENGINE` routing.
- Legacy field/grid paths remain intact and selectable via engine contract.

## Verification
- `bun run check` continues to report existing project-wide diagnostics not introduced by this step.
- No diagnostics were reported for:
  - `DistanceFieldTerritoryRenderer.ts`
  - `strokeMeshBorders.ts`
  - `centerlineGraph.ts`

## Next Step
Step 5: border morph lerp + local fallback ladder refinement.
