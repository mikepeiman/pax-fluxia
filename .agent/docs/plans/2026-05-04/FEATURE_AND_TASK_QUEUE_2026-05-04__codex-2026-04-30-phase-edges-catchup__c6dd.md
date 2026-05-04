# Feature And Task Queue - 2026-05-04

## Active

- Fix the `Unknown geometry mode: canonical_power_voronoi` runtime crash without changing accepted territory visuals.
- Stop stale territory mode aliases from re-entering the unified runtime contract through UI state, saved config, or legacy render-mode bridge code.

## Current pass

- Trace the geometry-mode contract from settings/UI through `GameCanvas` into the territory worker runtime.
- Normalize retired geometry/fill ids at the runtime boundary.
- Remove retired geometry/fill ids from the live settings UI.
- Keep the legacy `power_voronoi_canonical` render-mode route alive, but make it emit current runtime ids.
- Start a fresh dated handoff from today onward:
  - `.agent/docs/plans/2026-05-04/HANDOFF_2026-05-04_RUNTIME_CONTRACT_REPAIR.md`

## Next

- Verify the crash no longer occurs in the active worktree.
- Recheck other worktrees for the same stale config/state pattern.
- Continue the queued Phase Edges end-transition jank audit after this runtime-contract repair is accepted.

