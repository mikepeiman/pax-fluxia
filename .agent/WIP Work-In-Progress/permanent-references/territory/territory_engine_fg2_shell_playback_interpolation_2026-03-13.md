# Territory Engine FG2 Shell Playback Interpolation

Date: 2026-03-13
Worktree: `C:\Users\mikep\Desktop\WebDev\PRISM-territory-work`
Branch: `codex/territory-active`

## Goal

Move FG2 from discrete owner-shell replacement toward actual geometry playback, while keeping visible borders synchronized with whatever geometry is currently being displayed.

This slice addressed two linked problems:

1. The new shell-transition implementation had become syntactically broken during an earlier patch splice and was not runnable.
2. Even after shell interpolation existed conceptually, render playback still showed the target frontier strokes too early, which recreated the border/fill desynchronization problem during active morphs.

## Implemented

### 1. Repaired the broken interpolation slice

`pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts`

Replaced the corrupted helper/transition block with a coherent implementation that restores:

- point-on-segment and point-in-polygon helpers
- stable owner-shell frame sorting
- shell-frame snapshot construction
- shell-frame fingerprinting
- shell animation progress/easing helpers
- contour interpolation helpers
- owner-shell snapshot generation
- owner-shell transition matching across frames

The earlier breakage had left partial function signatures, duplicated fragments, and missing contour assignment. Those are now removed.

### 2. Added active shell playback state

FG2 now maintains runtime shell playback state through:

- previous shell frame snapshot
- target shell frame snapshot
- transition list
- playback start time
- duration
- target fingerprint

Playback is keyed off `TERRITORY_TRANSITION_MS` and is re-seeded when the shell-frame fingerprint changes.

### 3. Added contour-based shell correspondence

For matched shells, FG2 now:

- resamples previous/current shell contours
- aligns them by orientation + cyclic offset
- records mean/max contour distance
- stores the aligned contour pair on the transition artifact

For spawn/vanish events, FG2 now uses a centroid-collapsed contour fallback so every transition can still produce interpolated geometry.

### 4. Published displayed shell artifacts

The animation artifact now exposes displayed playback data, not just target-state data:

- `displayedOwnerShells`
- `displayedOwnerShellFrame`
- `ownerShellTransitionActive`
- `ownerShellTransitionProgress`
- `ownerShellTransitionEasedProgress`
- transition counts by kind
- contour sample counts and matched-distance diagnostics

This matters for both trace inspection and later step-debug tooling, because the UI can now inspect what is actually being rendered mid-transition.

### 5. Switched active border presentation to animated shell contours

During active shell playback, the render stage now uses animated shell contours as the displayed border source instead of the target frame's static pair-frontier polylines.

Current behavior:

- settled state: render canonical `frontiers`
- active shell morph: render animated shell-contour borders

This is intentionally a playback-alignment measure. It is not yet the final frontier-native interpolation solution, but it keeps the visible border temporally aligned with the moving shell fill instead of showing the future border too early.

## Why This Matters

This slice materially improves the path from static FG2 geometry to dynamic territory playback:

- shell changes are now a transition problem, not a hard swap problem
- displayed fill geometry can evolve continuously over time
- displayed borders can follow the displayed geometry rather than the target state
- trace/debug tooling can inspect actual playback geometry and progress

It also establishes a modular stepping stone toward later work:

- shell split/merge hardening
- shell-to-shell matching improvements
- true pair-frontier playback derived from animated geometry or direct frontier correspondences

## Validation

Validation run from:
`C:\Users\mikep\Desktop\WebDev\PRISM-territory-work\pax-fluxia`

Results:

- `bun run check` → `0 errors and 468 warnings in 19 files`
- `bun run build` → success

The remaining warnings are the existing repo baseline, mostly Svelte a11y / unused CSS warnings unrelated to this FG2 slice.

## Demo Expectation

With:

- `TERRITORY_ENGINE_ENABLED=true`
- `TERRITORY_ENGINE_STATIC_METHOD='fg2_seed_graph'`
- gameplay ownership/topology changes that trigger territory updates

You should now expect:

- shell fills to morph instead of hard-cutting
- visible borders to stay with the moving shell geometry during the active morph
- trace summaries to expose whether the renderer is showing `pair_frontiers` or `animated_shell_contours`

## Next

Highest-value follow-on work:

1. Harden shell correspondence through splits, merges, and difficult world-edge cases.
2. Replace the current animated-shell border fallback with true pair-frontier playback interpolation.
3. Push the same displayed-geometry semantics deeper into step-debug UI so the user can inspect the currently rendered geometry stage-by-stage.
