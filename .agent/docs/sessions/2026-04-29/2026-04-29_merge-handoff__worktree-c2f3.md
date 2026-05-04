Merge note:
- Source worktree: `c2f3`
- Source commit: `cad08094`
- Merge intent: fold deltas into master with minimal conflicts; do not overwrite master session docs

# Merge Handoff

## Purpose

This worktree contains four overlapping change sets:

1. Settings IA refactor and Diagnostics unification
2. Territory runtime / Power Voronoi 0427 (PVV4) integration work
3. Metaball-grid performance work
4. Startup diagnostics cleanup on the landing route

Because these were developed in one dirty worktree, the merge agent should **not** do a blind full-file copy. Merge by subsystem in the order below.

## Hard rules

1. Do **not** merge `common/resources/settings-live/current-settings.json`
2. Do **not** overwrite unsuffixed master docs with worktree-suffixed docs
3. Treat `pax-fluxia/src/lib/components/game/GameCanvas.svelte` and `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` as manual-merge files
4. Repo-wide `svelte-check` is not clean on this branch or master baseline; use targeted tests and behavioral verification

## Recommended merge order

### Phase 1: additive low-conflict files first

Bring in these new files before touching existing high-conflict files:

- `pax-fluxia/src/lib/components/ui/GameHudFloatingActions.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
- `pax-fluxia/src/lib/stores/territoryTuningStatusStore.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/modes/CanonicalPowerVoronoiGeometryMode.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.test.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts`
- `pax-fluxia/src/lib/territory/pvCanonical/` entire folder

These are the lowest-conflict units and define most of the new surface area.

### Phase 2: Settings / Diagnostics IA

Merge these together as one coherent unit:

- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte`
- `pax-fluxia/src/lib/components/ui/TopBar.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Visuals.svelte`
- `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/config/themeNames.ts`
- `pax-fluxia/src/lib/config/themeRouting.ts`
- `pax-fluxia/src/lib/config/themeRouting.test.ts`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`

Carry these deletions only if the new Diagnostics surface lands:

- delete `pax-fluxia/src/lib/components/ui/TransitionDebugPanel.svelte`
- delete `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Debug.svelte`

Notes:

- This phase removes the old split `Debug`/`Diagnostics` model
- It restores the lower-right Diagnostics launcher through `GameHudFloatingActions.svelte`
- It renames and redistributes settings ownership substantially

### Phase 3: Territory runtime / PVV4

Merge these as the runtime-contract block:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/config/geometry0319Debug.ts`
- `pax-fluxia/src/lib/config/geometry0319Debug.test.ts`
- `pax-fluxia/src/lib/stores/territoryRenderStatusStore.ts`
- `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.ts`
- `pax-fluxia/src/lib/territory/contracts/DiagnosticsContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeCatalog.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
- `pax-fluxia/src/lib/territory/devtools/rulerTool.ts`
- `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.test.ts`
- `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`
- `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.test.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/registry.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryCompatibilityMatrix.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeState.ts`

Notes:

- This phase adds the new Power Voronoi 0427 / PVV4 path and related diagnostics plumbing
- It also removes `USE_RENDER_FAMILIES`
- `GameCanvas.svelte` is the highest-conflict file in the entire merge; merge it by intent, not by hunk count

### Phase 4: metaball-grid perf work

Merge these files last, after the runtime block:

- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
- `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridStats.ts`

What this phase contains:

- family-local hold-PRE / local visual clock logic for delayed worker plan arrival
- clearer Perf-state reporting
- steady-state texture caching
- stricter cache gating around local visual transition
- static native-fill split so native cells are not repainted as live fills every transition frame

Important note:

- a later chat claim about a visible regression was **not confirmed local truth for this worktree**
- the stricter cache-gate code is still safe to keep; just do not describe it in master docs as a confirmed bug fix unless separately reproduced there

### Phase 5: startup diagnostics cleanup

Merge this file independently:

- `pax-fluxia/src/routes/+page.svelte`

Effect:

- removes the always-visible floating startup diagnostics dock
- keeps startup diagnostics only for failure or explicit query-param opt-in

## Files to skip unless intentionally wanted

### Local-only live state

- `common/resources/settings-live/current-settings.json`

### Imported theme snapshot churn

Skip these unless master explicitly wants the gate-key cleanup in imported themes:

- `pax-fluxia/src/lib/config/builtin-themes/imported/metaball/pax-theme-apr_09_metaball-2026-04-09T23-58-09.json`
- `pax-fluxia/src/lib/config/builtin-themes/imported/metaball/pax-theme-apr_13_metaballs_bladerunner-2026-04-13T23-59-26.json`
- `pax-fluxia/src/lib/config/builtin-themes/imported/metaball/pax-theme-metaball_haze-2026-04-14T00-10-40.json`
- `pax-fluxia/src/lib/config/builtin-themes/imported/perimeter-field/pax-theme-apr_15_metaball-2026-04-16T16-40-14.json`
- `pax-fluxia/src/lib/config/builtin-themes/imported/perimeter-field/pax-theme-metaball_perimeter_apr_14-2026-04-15T00-38-40.json`

### Session docs

These are additive and should be folded manually, not overwritten:

- `.agent/docs/sessions/2026-04-29/2026-04-29_metaball-grid-perf-trace-crash-report__worktree-c2f3.md`
- `.agent/docs/sessions/2026-04-29/2026-04-29_merge-handoff__worktree-c2f3.md`
- any worktree-suffixed `2026-04-27` / `2026-04-28` docs

## Conflict hotspots

### `GameCanvas.svelte`

Why high conflict:

- render-mode dispatch
- family geometry cache
- runtime route
- diagnostics capture
- territory render status

Merge guidance:

- preserve masterâ€™s latest unrelated gameplay/render-loop edits
- then re-apply the render-family geometry cache, territory status truth, and runtime-selection changes by intent

### `GameSettingsPanel.svelte`

Why high conflict:

- large section-routing refactor
- Diagnostics deep-link ownership
- top-level section restructuring

Merge guidance:

- land the new `settingsRegistry.ts` first
- then adapt `GameSettingsPanel.svelte` to that registry instead of accepting a blunt file replacement

### `ControlsSection-Territory.svelte`

Why high conflict:

- section split
- mode gating
- runtime summary
- perf status additions

Merge guidance:

- preserve the three-section Territory structure
- preserve the mode gating that hides irrelevant selectors in PVV4
- preserve the new Metaball Grid perf rows

### `TransitionBundleSerializer.ts`

Why high conflict:

- export pipeline was generalized away from perimeter-field-only assumptions

Merge guidance:

- if master has any concurrent snapshot/export work, merge this one functionally, not textually

## Verification after merge

### Tests already run in this worktree

- `bunx vitest run pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts`
- `bunx vitest run pax-fluxia/src/lib/config/geometry0319Debug.test.ts pax-fluxia/src/lib/config/themeRouting.test.ts`

### Post-merge verification to repeat on master

1. `bunx vitest run pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts`
2. `bunx vitest run pax-fluxia/src/lib/config/geometry0319Debug.test.ts pax-fluxia/src/lib/config/themeRouting.test.ts`
3. Manually verify:
   - Diagnostics launcher opens the Settings-owned Diagnostics surface
   - Canonical PV / PVV4 mode still routes correctly
   - `USE_RENDER_FAMILIES` is gone
   - metaball-grid Perf panel shows `Render cache`
   - metaball-grid conquest smoothness improved and no mode reports `unknown`

### Known baseline caveat

- repo-wide `svelte-check` is still red from unrelated pre-existing errors and warnings; do not use that alone to reject this merge

## One-line merge strategy

Merge additive files first, then Settings IA, then Territory runtime/PVV4, then metaball-grid perf, skip live settings and theme snapshot noise, and hand-merge `GameCanvas.svelte` and `GameSettingsPanel.svelte` by intent.

