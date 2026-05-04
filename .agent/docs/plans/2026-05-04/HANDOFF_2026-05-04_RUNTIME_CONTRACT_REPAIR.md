# Handoff - 2026-05-04 Runtime Contract Repair

**Date:** 2026-05-04  
**Branch:** `codex/2026-04-30-phase-edges-catchup`  
**Scope start:** today only  
**Primary commit:** `794abd8cc` - `Normalize retired territory runtime mode ids`

This handoff starts fresh from today's work. It does not try to retell the earlier Phase Edges history.

## What changed today

Fixed a clean-runtime crash:

- `Unknown geometry mode: canonical_power_voronoi`

The runtime contract had already been unified onto:

- `geometryMode = unified_vector`
- `fillTransitionMode = topology_fill_rebuild` and other maintained ids

But legacy seams were still emitting retired ids.

## Root cause

Three layers were out of sync:

1. `GameCanvas.svelte`
- legacy `power_voronoi_canonical` dispatch synthesized:
  - `geometryMode = canonical_power_voronoi`
  - `fillTransitionMode = pv_frontline`

2. `ControlsSection-Territory.svelte`
- still surfaced retired geometry/fill ids in the live settings UI
- could also preserve stale saved state as active-looking buttons

3. `TerritoryConfigNormalizer.ts`
- did not defensively normalize direct caller selections
- so stale callers could still reach the worker and crash it

The worker-side geometry registry only contains the unified geometry mode, so `canonical_power_voronoi` had no consumer and threw immediately.

## Files changed

- `pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.test.ts`
- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`
- `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.test.ts`

## Behavioral contract after today

- Legacy callers may still provide stale ids.
- Runtime must normalize them to maintained ids before worker dispatch.
- UI should only present maintained ids.
- Legacy render-mode bridge paths may still exist, but they must emit maintained ids.

## Validation

Ran:

- `bun x vitest run pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.test.ts pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.test.ts`
- `bun x vite build`

Build passed with existing non-blocking warnings.

## What still needs user verification

- Reload the affected worktree and confirm the browser no longer throws:
  - `Unknown geometry mode: canonical_power_voronoi`
- If another worktree still shows it, check whether it is missing this exact repair set.

## Merge / port guidance

If porting this fix elsewhere, do not patch only the geometry registry.

Port all three boundaries together:

1. runtime normalizer
2. direct bridge selection builder(s)
3. settings UI alias surface

If only one or two are patched, stale ids will re-enter from another seam.

## Next tasks from this handoff forward

- Verify runtime crash resolution in active and other affected worktrees.
- Then return to the queued Phase Edges end-transition pop/jank audit.

