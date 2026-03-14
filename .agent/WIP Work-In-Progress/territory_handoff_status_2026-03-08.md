# Territory Handoff Status - 2026-03-08

## Committed State
- Latest committed recovery docs:
  - `c9c0f31` `Add territory recovery planning docs`
- Permanent references:
  - `/.agent/WIP Work-In-Progress/permanent-references/territory/territory_liveness_and_settings_recovery_2026-03-08.md`
  - `/.agent/WIP Work-In-Progress/permanent-references/territory/territory_canonical_frontier_border_fill_plan_2026-03-08.md`

## Current Conclusions
- The current DF `mesh` border path is not canonical quality.
- It is still sourced from sampled ownership-grid/lattice centerlines, not true world-space frontiers.
- The immediate blocker is not border math alone; it is liveness/state architecture.

## Key Findings
- `GameSettingsPanel.svelte` is still half-migrated.
- It has duplicate `onMount` config replay.
- It still uses legacy broad sync helpers plus a large manual `syncAllFromConfig()`.
- `resetToDefaults()` is not a true reset; it mostly re-syncs current `GAME_CONFIG`.
- Full themes and category presets still bypass the canonical settings API in committed code.
- In `DistanceFieldTerritoryRenderer.ts`, `buildVisualFp()` is missing `DF_BORDER_ENGINE`, so border-engine changes can bypass normal visual invalidation.

## Uncommitted Partial Work Present
These files are currently modified and were left mid-pass during liveness/settings recovery:

- `pax-fluxia/src/lib/components/ui/settingsState.ts`
- `pax-fluxia/src/lib/components/ui/panelSync.ts`
- `pax-fluxia/src/lib/config/categoryThemes.ts`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/stores/themeStore.svelte.ts`

### Intent of the Partial Edits
- `settingsState.ts`
  - adds `setSettingsFromConfigPatch(...)`
  - intended to apply config-key patches through one canonical bridge while keeping reactive `panel` state aligned
- `game.config.ts`
  - adds `DEFAULT_GAME_CONFIG`
  - intended as an immutable pristine defaults source for real reset behavior
- `themeStore.svelte.ts`
  - adds `registerApplyCallback(...)`
  - intended to let the settings panel own full-theme application so `panel` and runtime stay in sync
- `categoryThemes.ts`
  - adds `registerCategoryPresetApplyCallback(...)`
  - intended to do the same for category presets
- `panelSync.ts`
  - currently only has a trivial newline diff; no substantive recovery edit landed there

## Important Caution
- `GameSettingsPanel.svelte` was not patched before interruption.
- The repo is therefore in a mixed intermediate state:
  - some bridge primitives exist as uncommitted edits,
  - but the main panel still runs old behavior.
- Do not commit the current partial state as-is.
- The next agent should either finish the liveness pass coherently or discard the partial edits and reimplement cleanly.

## Recommended Next Execution Order
1. Finish Document 1 first:
   - singular settings mutation path
   - panel-owned full-theme apply
   - panel-owned category preset apply
   - real reset source from `DEFAULT_GAME_CONFIG`
   - remove duplicate mount replay
   - replace manual `syncAllFromConfig()` with schema-driven sync
   - add `DF_BORDER_ENGINE` to DF visual fingerprint
2. Verify live territory updates and slider/theme reactivity.
3. Then execute Document 2:
   - demote owner-grid centerline path to legacy
   - build canonical frontier graph
   - route mesh borders from true frontier geometry
   - later backfill fills from the same geometry truth

## One Architectural Conclusion
- Border-quality work should not continue on the current sampled-grid centerline source.
- The correct long-term path remains:
  - canonical world-space frontier graph
  - border mesh derived from that frontier
  - visible fill derived from the same geometry truth
