# Takeaways - 2026-05-04

## Cause

- This crash was caused by territory contract drift after the geometry runtime was consolidated.
- The runtime had already retired legacy geometry ids, but:
  - a legacy render-mode bridge still synthesized retired selection ids
  - the settings UI still surfaced retired ids
  - the runtime normalizer did not defend itself against stale direct callers

## Rule

- When a runtime contract is collapsed or unified, do all three or the bug will come back:
  1. remove or remap stale UI ids
  2. normalize stale ids at the runtime boundary
  3. audit any legacy dispatch bridge that synthesizes mode selections directly

## Important detail

- This was not only a `geometryMode` problem.
- The same stale bridge path also emitted `pv_frontline`, which is no longer the maintained fill-transition id.

## Follow-up

- If the user reports this from another worktree again, first inspect:
  - `GameCanvas.svelte`
  - `ControlsSection-Territory.svelte`
  - `TerritoryConfigNormalizer.ts`
  - `TerritorySettingsBridge.ts`
- Use the new dated handoff for post-2026-05-04 merge work:
  - `.agent/docs/plans/2026-05-04/HANDOFF_2026-05-04_RUNTIME_CONTRACT_REPAIR.md`
- The next separate queued task remains the Phase Edges end-transition pop/jank audit.

