# Metaball Grid Phase-Field Transition Plan

## Purpose

Implement the "new Perplexity transition render mode ideas v2" plan after gathering the context needed for success.

## Governing Docs

- `.agent/AGENT.md`
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `.agent/docs/plans/2026-04-08/TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md`
- `C:\Users\mikep\Documents\Obsidian Vault\2026-04-29 new Perplexity transition render mode ideas v2.md`

## Current Status Before Implementation

- The live repo is a mixed territory architecture.
- `metaball_grid` is the only meaningful mode already on the render-family shell.
- `metaball_grid` already had the core ingredients the proposal needs:
  - PRE/NEXT ownership classification on a world-anchored grid
  - per-cell flip-time planning
  - render-family lifecycle, caching, worker offload, and tuning UI
- The existing planner was still mostly "seed + rank geometry" oriented:
  - `grid_bfs`
  - `euclidean_band`

## Implementation Decision

- Do not create a parallel territory runtime.
- Evolve the existing `metaball_grid` planner so `flipTimeByVId` becomes the phase-field truth surface.
- Keep the old grid modes as fallback/comparison modes.
- Ship the new default as `pre_to_post_frontier`.

## Implemented Scope

1. Corrected conquest-event attribution for emergent/vacating cells so changed cells stay attached to the right event when one ownership side is missing.
2. Added two new `GridWaveGeometry` modes:
   - `conquered_star_radial`
   - `pre_to_post_frontier`
3. Generalized `planGridWave.ts` so some geometries emit continuous flip times directly instead of only normalizing integer ranks.
4. Updated config/type/runtime/UI surfaces to expose the new modes.
5. Updated tests to lock the new planner behavior and the attribution fix.

## Assumptions

- The safest first implementation path is inside `metaball_grid`, not as a brand-new family or pipeline branch.
- Existing names like `waveGeometry` and `flipTimeByVId` can remain as compatibility surfaces even though the richer modes are conceptually phase-field generators.
- `pre_to_post_frontier` may ignore seed selection by design; the UI should say so instead of pretending the control still matters.

## Validation

- Targeted metaball-grid Bun tests passed.
- Full client compile validation was blocked by missing local Svelte build artifacts and adapter package availability in this workspace.

## User Verification Needed

- Verify that the new default looks correct in live conquest transitions on real maps.
- Verify whether `pre_to_post_frontier` reads better than `conquered_star_radial` in the exact scenarios that motivated the original external plan.

