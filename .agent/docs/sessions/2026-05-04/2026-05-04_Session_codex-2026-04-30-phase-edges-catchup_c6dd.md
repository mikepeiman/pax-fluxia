# Session - 2026-05-04

## Territory runtime crash: unknown geometry mode

- User reported a runtime crash from the clean territory runtime path:
  - `Unknown geometry mode: canonical_power_voronoi`
- User also stated they have seen the same failure in more than one worktree, so the working assumption was cross-worktree contract drift, not a local typo.

## Findings

- The territory runtime contract has already been collapsed to:
  - `geometryMode = unified_vector`
  - current fill transition ids like `topology_fill_rebuild`
- The worker-side geometry registry only contains `UnifiedVectorGeometryMode`.
- Two stale seams survived:
  - `GameCanvas.svelte` special-cased `power_voronoi_canonical` to synthesize:
    - `geometryMode = canonical_power_voronoi`
    - `fillTransitionMode = pv_frontline`
  - `ControlsSection-Territory.svelte` still surfaced retired UI ids:
    - `canonical_power_voronoi`
    - `pv_frontline`
    - other old aliases
- `TerritoryConfigNormalizer.ts` was not defensively normalizing direct caller selections, so any stale caller could still crash the worker.

## Implemented

- Added runtime-side selection normalization in:
  - `pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.ts`
- Updated the legacy canonical bridge route in:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - legacy PVV4 dispatch now emits current runtime ids instead of retired ones
- Cleaned the active settings UI in:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
  - geometry options now only surface maintained runtime ids
  - fill transition options now surface maintained runtime ids
  - active button state normalizes stale saved aliases back onto current ids
- Extended settings-bridge alias handling in:
  - `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`

## Validation

- `bun x vitest run pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.test.ts pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.test.ts`
- `bun x vite build`

## Current status

- Implemented and repo-validated.
- User verification is still required on the live worktree because the original failure was browser/runtime-visible, not just type-level.
- Created a new dated handoff for work from today onward:
  - `.agent/docs/plans/2026-05-04/HANDOFF_2026-05-04_RUNTIME_CONTRACT_REPAIR.md`

