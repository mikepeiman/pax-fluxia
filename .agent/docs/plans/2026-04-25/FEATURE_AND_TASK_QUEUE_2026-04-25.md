# Feature And Task Queue - 2026-04-25

## Active Focus

1. Dense-map gameplay performance and visual pacing
   - The user still sees ship motion as visually janky even when the FPS indicator looks materially better.
   - First-round fixes helped, but the product requirement is still smoother real motion, not merely acceptable reported FPS.

2. Renderer correctness under performance pressure
   - Territory/metaball behavior has been corrected enough to continue, but this remains a high-risk surface for correctness/perf interactions.
   - Keep instrumentation and visible diagnostics available while performance work continues.

3. Process discipline and local-run hygiene
   - Orphaned local test/dev servers caused CPU saturation.
   - Benchmark/diagnostic runs must now remain single-instance, PID-tracked, and explicitly torn down in the same turn.

4. Worktree-safe architecture audit and refactor planning
   - A dedicated audit is now queued to restructure ownership boundaries for parallel multi-agent work with minimal merge conflicts.

## Verified Current State

- Recent verified benchmark artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-latest.json`

- Verified improvements already in place:
  - saved-map lane polyline rebuild moved off the main thread via worker
  - `StarRenderer` no longer accumulates graphics geometry frame-over-frame
  - star visual redraw now skips unchanged stars between coarse animation buckets
  - ship attack-heading lane math is cached instead of being recomputed inside the per-star presentation loop
  - traveling-ship cadence now favors smoother presentation under the same render cost

- Remaining visible product problem:
  - dense-map motion quality still feels too coarse relative to the reported frame rate

## Important Queued Task

### Multi-Agent Worktree Architecture Audit

Purpose:

- maximize separation of files and ownership boundaries so parallel work in separate worktrees can merge cleanly and quickly

Required parallel lanes:

- AI
- renderer performance
- new renderer/mode development and tuning
- overall gameplay performance
- VFX and animation
- UI:
  - control panel
  - Main Menu
  - landing page / website
  - Map Editor
  - in-game UI

Deliverable for the audit:

- a concrete ownership map showing which files/modules belong to which lane
- a proposed target refactor that reduces cross-lane edits to shared files
- a merge discipline plan that favors fast-forward or trivial merges across independent slices

Key architecture question to answer during the audit:

- renderer work should likely split by both shared concern and surfaced product slice:
  - per-family or runtime-infrastructure ownership for core implementation/perf work
  - per-mode or mode-adapter ownership for development/tuning work
- the audit should confirm whether that hybrid split is actually the least-conflict approach

## Next Queue

1. Continue dense-map gameplay performance work, with ship-motion quality as the first visible priority.
2. Repair the browser benchmark harness failure:
   - `Runtime.evaluate failed: Extension type application already has a handler`
3. Profile the remaining heavy presentation paths after the lane-worker, star redraw gating, and ship-heading cache fixes.
4. Audit the current ownership hot spots that would create worktree conflicts:
   - `GameCanvas.svelte`
   - renderer family dispatch/wiring
   - territory family modules
   - shared performance instrumentation
   - UI settings/control surfaces
5. Turn the queued multi-agent architecture audit into a concrete refactor plan with file ownership boundaries and merge rules.

## Not Yet Proven

- Reported FPS is not yet a trustworthy proxy for perceived smoothness.
- Current renderer boundaries are not yet safe enough for large parallel worktree-based development.
- The correct renderer split axis has not yet been formally chosen.
