# Worktree Multi-Agent Architecture Audit Queue - 2026-04-25

## Purpose

Prepare an architectural audit and refactor plan so parallel work in separate worktrees can proceed with minimal conflicts and easy merges across the main gameplay codebase.

The user requirement is explicit: the project needs cleaner separation so multiple agents can work in parallel and merge back quickly across distinct lanes of work.

## Requested Parallel Work Lanes

1. AI
2. renderer performance
3. new renderer / mode development and tuning
4. overall gameplay performance
5. VFX and animation
6. UI
   - control panel
   - Main Menu
   - landing page / website
   - Map Editor
   - in-game UI

## Audit Goal

Produce a file-ownership and module-boundary map that minimizes overlap between those lanes, with special attention to the oversized shared surfaces that currently force unrelated work into the same files.

## Likely Conflict Hot Spots To Audit

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
- territory family wiring and family implementations
- shared renderer/presentation modules
- benchmark and diagnostic harness files
- settings UI / panel synchronization files
- shared engine / AI integration points in `common/`

## Initial Boundary Hypotheses

### AI

- Prefer ownership under `common/src/ai/**` plus narrow engine-facing adapters.
- Keep AI heuristics/workflow changes out of client presentation files.

### Renderer performance

- Prefer ownership of shared renderer infrastructure, frame scheduling, batching, cache policy, worker boundaries, and instrumentation.
- Avoid mixing this lane with per-mode tuning UI in the same edits where possible.

### New renderer / mode development and tuning

- Prefer one module root per renderer family or mode package.
- Keep family internals, tunables, presets, and visual specs together.
- Minimize required edits to shared runtime dispatch when adding or tuning a mode.

### Overall gameplay performance

- Prefer ownership of input path, store orchestration, scheduling/yielding, workerization, benchmark harness, and frame-budget instrumentation.
- Keep this separate from visual style and non-performance UI work.

### VFX and animation

- Prefer ownership of FX clocks, timing models, animation surfaces, shader/effect orchestration, and other non-core-territory visual feedback paths.

### UI

- Split by product surface instead of a single shared bucket:
  - control panel / settings
  - Main Menu
  - landing page / website
  - Map Editor
  - in-game HUD / overlays

## Open Design Question

Renderer ownership may need a hybrid split:

- per-family or infrastructure ownership for low-level performance work
- per-mode or adapter ownership for mode-specific development and tuning

This should be decided by audit evidence, not by guesswork.

## Expected Audit Outputs

1. A current-state file map showing which domains currently collide.
2. A target-state ownership map showing cleaner lane boundaries.
3. A recommended refactor sequence that reduces shared-file pressure first.
4. Merge rules for parallel worktrees:
   - branch naming
   - slice ownership
   - conflict escalation rules
   - smoke-test gates per slice

## Suggested First Refactor Targets

1. Reduce `GameCanvas.svelte` ownership sprawl by extracting distinct surfaces:
   - interaction/input orchestration
   - territory presentation bridge
   - ship / connection presentation coordination
   - benchmark / diagnostic hooks

2. Separate settings/control-panel definitions from renderer implementation details where they are still entangled.

3. Ensure renderer families can evolve with local files rather than repeated edits to a central monolith.

4. Keep UI route/surface work from colliding with gameplay-renderer work.

## Status

- Queued
- Not yet audited
- Ready for a dedicated planning pass

