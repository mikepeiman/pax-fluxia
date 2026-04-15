# Worktree 4ADC Audit Summary - 2026-04-14

## Scope

- Current repo head audited: `0a6582d7`
- Worktree audited: `C:\Users\mikep\.codex\worktrees\4adc\pax-fluxia`
- Worktree branch/tip audited: `codex/perimeter-field-audit-20260414` @ `fda16a8a2f930b1cd51e4897080c4192706000a7`

## Exact Merge Method Previously Used

- The earlier import was **not** a merge.
- The repo history shows a normal commit on `master`: `21cd56fc` `feat: import perimeter field audit renderer slice`
- That commit is a **selective manual import** of a subset of files from the worktree tip, not a merge commit and not a cherry-pick of the branch history.
- Later follow-up import from the same worktree was `0a6582d7` `fix: surface perimeter territory tuning and identity`

## Exact Audit Artifacts

- Name/status diff:
  - `C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\project\implementation-plans\2026-04-14\WORKTREE_4ADC_NAME_STATUS_DIFF_2026-04-14.txt`
- Diffstat:
  - `C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\project\implementation-plans\2026-04-14\WORKTREE_4ADC_DIFFSTAT_2026-04-14.txt`
- Full lossless patch:
  - `C:\Users\mikep\Desktop\WebDev\pax-fluxia\.agent\docs\project\implementation-plans\2026-04-14\WORKTREE_4ADC_LOSSLESS_PATCH_2026-04-14.patch`

## Head Relationship

- `master` is `37` commits ahead of `fda16a8a`
- `master` is `32` commits behind `fda16a8a`

This means the worktree is neither fully subsumed nor cleanly merge-equivalent to current `master`.

## Findings Relevant To The User Report

### Perimeter mode / tuning controls

- The perimeter-field tuning files are already present in current `master`.
- The key files exist on both sides:
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
  - `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- The current user-facing failure is therefore not explained by those files being absent.
- A concrete UI reachability bug was found and fixed in `ControlsSection-Territory.svelte`: changing render mode could leave the renderer subsection filter stuck on a different module, hiding the perimeter card.

### Conquest capture diagnostics

- The perimeter-field conquest capture and replay wiring is present in current `master` and in the audited worktree:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
  - `pax-fluxia/src/lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore.ts`
- If the feature is still not behaving in-browser, the problem is wiring/behavior, not simple absence of the imported files.

### Confirmed regressions found after the selective import

- `ControlsSection-Debug.svelte` still dispatched `pax-open-transition-debug-panel`, but current `GameContainer.svelte` no longer mounted `TransitionDebugPanel` or listened for that event.
- Current `GameCanvas.svelte` still had the ruler store and top-bar toggle path elsewhere in the app, but had lost the actual canvas-side ruler integration:
  - no lane hit-testing
  - no point placement
  - no overlay rendering
- Current `TransitionDebugPanel.svelte` had also lost the ZIP package actions that were present in the audited worktree.

These are the concrete regressions restored in the reconciliation slice after this audit.

### Ruler / diagnostics UI

- The audited worktree tip would actually delete:
  - `pax-fluxia/src/lib/territory/devtools/diagnosticsUi.ts`
  - `pax-fluxia/src/lib/territory/devtools/rulerTool.ts`
- Therefore, the current ruler failure is not a missing import from `4adc`. It is a current-regression problem on `master`.

## High-Signal Divergence Categories

### Files where the worktree still differs materially from current `master`

- Main menu / menu theming / topbar / modal surfaces
- Territory UI surfaces:
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/TransitionDebugPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- Runtime/rendering:
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts`
  - `pax-fluxia/src/lib/renderers/LaneRenderer.ts`
  - `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
  - `common/src/mapgen/*`
  - `pax-server/src/index.ts`
  - `pax-server/src/prod.ts`
  - `pax-server/src/rooms/GameRoom.ts`

### Files present in current `master` but absent in the audited worktree

- Ruler/diagnostics surface files
- Preview worker path
- Patched Bun websocket transport
- Lane-audit/perf harness tools
- Saved lane test maps
- License file

## Conclusion

- The earlier `4adc` import was incomplete by design because it was selective, not a merge.
- The worktree is not a clean source of truth for all current missing behavior because it is also stale relative to current `master`.
- The correct next step is not another assumption-based partial import. It is to use the saved lossless patch and name/status diff to decide, file by file, whether to:
  - import the worktree version
  - keep current `master`
  - or do a manual reconciliation
