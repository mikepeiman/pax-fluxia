# Feature And Task Queue - 2026-05-02

## Active

- Phase Edges fill/border divergence:
  - make `Centered-blended borders` border-only
  - keep the non-blended fill path as the canonical fill path
  - move boundary fill ownership from transition scene roles to ownership-frontier classification
  - verify `Inward Offset` and `Flush Boundary Fill` change fill coverage in both centered-blended states
- Preserve outer-perimeter behavior after the fill ownership change
- Keep the merge-back handoff current so this worktree can be rolled into `master` without losing the renderer contract

## Completed Today

- Removed the active directional square fill branch from both Metaball Grid families
- Added shared ownership-boundary classification helper for fill/border ownership
- Added renderer-level regression tests comparing centered-blended on/off fill coverage
- Updated style help text so `Centered-blended borders` is explicitly described as border-only

## Next

- User verification in the live app:
  - does the missing-margin / inset gap finally disappear when `Centered-blended borders` is on?
  - do `Inward Offset` and `Flush Boundary Fill` now visibly affect the fill?
- After fill acceptance, continue the already-queued transition-end smoothness / end-of-transition jank audit as a separate pass
