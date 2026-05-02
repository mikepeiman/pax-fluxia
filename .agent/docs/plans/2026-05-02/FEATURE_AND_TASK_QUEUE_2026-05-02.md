# Feature And Task Queue - 2026-05-02

## Active

- Phase Edges fill/border divergence:
  - make `Centered-blended borders` border-only
  - keep the non-blended fill path as the canonical fill path
  - move boundary fill ownership from transition scene roles to ownership-frontier classification
  - move centered-blended border geometry onto the same visible fill boundary instead of the abstract grid edge
  - verify `Inward Offset` and `Flush Boundary Fill` change fill coverage in both centered-blended states
- Preserve outer-perimeter behavior after the visible-boundary geometry change
- Keep the merge-back handoff current so this worktree can be rolled into `master` without losing the renderer contract

## Completed Today

- Removed the active directional square fill branch from both Metaball Grid families
- Added shared ownership-boundary classification helper for fill/border ownership
- Added renderer-level regression tests comparing centered-blended on/off fill coverage
- Updated style help text so `Centered-blended borders` is explicitly described as border-only
- Rebuilt centered-blended border segments in both Metaball Grid families from visible square cell bounds instead of abstract lattice vertices
- Routed outer perimeter interval collection through those same visible square cell bounds
- Audited the live settings path and confirmed the running mode was `marching_triangles_gradient`, not the shared-edge control path
- Corrected the contour-technique surface contract so `Centered-blended borders` no longer grants phase-fill ownership to contour techniques
- Split pair-layer border generation from fill-layer generation in Phase Edges so pairwise blended contour borders do not silently swap fill geometry

## Next

- User verification in the live app:
  - does the missing-margin / inset gap finally disappear when `Centered-blended borders` is on?
  - do `Inward Offset` and `Flush Boundary Fill` now visibly affect the fill?
  - does the centered-blended outer perimeter still behave correctly after the visible-boundary geometry change?
- After fill acceptance, continue the already-queued transition-end smoothness / end-of-transition jank audit as a separate pass
