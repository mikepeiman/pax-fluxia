# Feature And Task Queue - 2026-04-29

## Active
- Validate in live play that successive conquests no longer re-mark settled territory as transition-active.
- Keep scope tight: verify this fix before resuming deeper perf work.

## Completed
- Fixed viewport-edge background continuity in the isolated worktree by syncing the shell extension layer to the live `BG_IMAGE_URL` / `BG_IMAGE_ALPHA` path instead of a hardcoded nebula asset.
- Kept the centered-cover `GameCanvas` nebula sprite update path so the world background now stays aligned with real content bounds while the shell fill stays visually continuous outside the fitted starmap.
- Added a guard so steady-state paint skipping is blocked while retained transition sprites are still live.
- Added a regression test covering the conquest-end cleanup frame.
- Wrote a dated post-mortem for the regression.
- Moved render-family PREV capture to the last presented authoritative frame.
- Removed synthetic default-bucket animation from `metaball_grid`.
- Added regression tests so unattributed changed cells render settled instead of animated.
- Isolated and fixed overlapping conquest batch progress coupling in render-family lifecycle composition.

## Next
- User verification in live `metaball_grid` play.
- If conquest timing still ignores the slider after this patch, inspect mounted runtime config state and panel lock/bind state next.

