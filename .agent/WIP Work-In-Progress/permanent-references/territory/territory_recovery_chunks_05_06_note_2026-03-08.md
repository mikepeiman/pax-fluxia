# Territory Recovery Chunks 05-06 Note (2026-03-08)

## Scope
- Chunk 05: settings write-path inventory (territory/liveness relevant paths).
- Chunk 06: central settings bridge completion in panel layer.

## Findings (Chunk 05)
- `GameSettingsPanel.svelte` still used a broad replay path (`syncAllFromConfig`) after config patch apply.
- `panelSync.ts` still exports legacy replay helpers (`applyPanelToConfig`, `syncPanelFromConfig`).
- Territory panel controls primarily route writes through `updatePanel`, but broad replay from panel root could still rehydrate from runtime in ways that bypassed intended canonical flow.

## Changes Applied (Chunk 06)
1. Added read-only schema sync helper in `settingsState.ts`:
   - `syncPanelFromConfigPatch(currentPanel, configPatch, persist)`
   - updates panel values by schema mapping without mutating `GAME_CONFIG`.
2. Updated `GameSettingsPanel.svelte` to use settings-state schema bridge directly:
   - imports `syncPanelFromConfigPatch` from `settingsState.ts`.
   - removed runtime usage of `syncPanelFromConfig` from `panelSync.ts`.
3. Split config refresh behavior:
   - `syncRuntimeViewsFromConfig(...)` handles visuals/combat/anim/tick store updates.
   - `syncAllFromConfig(...)` now uses `syncPanelFromConfigPatch(...)` + `syncRuntimeViewsFromConfig(...)`.
4. Removed broad replay on patch apply:
   - `applyConfigPatch(...)` now calls:
     - `setSettingsFromConfigPatch(...)`
     - `syncRuntimeViewsFromConfig()`
   - it no longer calls full `syncAllFromConfig()`.

## Contract Impact
- Theme/preset/import patch application now stays on schema-backed patch bridge for panel sync.
- Runtime side effects still update through explicit runtime-view sync path.
- Legacy replay helpers remain in `panelSync.ts` for compatibility reference, but panel root no longer depends on them.

## Validation Notes
- Static usage check confirms `syncPanelFromConfig(...)` is now only defined in `panelSync.ts`, not used by panel runtime.
- `bun run check` currently fails in this environment due bun remap/bin process issue (not TS diagnostic output).
- `bun install --force` was re-run successfully, but remap failure persists in this shell.

## Divergence Notes
- This chunk intentionally did not remove every direct `GAME_CONFIG` write across non-territory UI sections yet.
- Remaining direct writes are scheduled for later chunks by file/section.
