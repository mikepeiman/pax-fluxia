# Merge Note

- source worktree: `c2f3`
- source commit: `cad080942cd19c311f7954fe342e3213663ce1dd`
- merge intent: fold deltas into the canonical unsuffixed master doc, do not overwrite it

# 2026-04-28 Session â€” worktree `c2f3`

## Focus

Implement the Settings UI audit and reorganization, unify diagnostics into a single Settings-owned surface, restore the lower-right diagnostics launcher, split Territory into three top-level sections, and fix the Power Voronoi tuning/correctness/performance issues from the cleaned-up UI.

## Ground Truth Established

- This worktree is on detached HEAD `cad08094`.
- Master already has unsuffixed `2026-04-28` queue/session/takeaways docs.
- The current Settings shell still uses implicit subsection scanning from rendered `h4.sub-heading` text.
- The lower-right diagnostics launcher styling still exists, but the action is not wired into the in-game shell.
- The current diagnostics workflow still depends on a separate floating panel and a separate `Debug` section.
- Territory remains a single oversized Settings section with duplicated topology controls and contradictory mode controls.
- Perimeter Field diagnostics are mounted into the diagnostics surface regardless of active mode.

## Implementation Intent

- Use merge-safe additive worktree docs only.
- Refactor the Settings shell before changing the lower-level territory tuning behavior.
- Preserve existing in-flight territory runtime work in this worktree; integrate rather than revert.

## Implemented

- Added an explicit Settings registry and removed subsection-chip discovery from DOM heading scanning.
- Reorganized top-level Settings into intent-first sections, including:
  - `Match Flow`
  - `Combat Tuning`
  - `Economy`
  - `Travel & Orders`
  - `Conquest & Effects`
  - `Map Options & Tuning`
  - `Territory Modes & Transition`
  - `Territory Tuning & Constraints`
  - `Territory Styles`
  - `Diagnostics`
- Replaced the old `Debug` section with a single Settings-owned `Diagnostics` surface.
- Restored the lower-right diagnostics launcher via `GameHudFloatingActions.svelte` and wired it to open Settings directly to `Diagnostics`.
- Removed the separate floating diagnostics/debug product path from `GameContainer.svelte`.
- Made recorder bundles reactive through `transitionSnapshotRecorderStore`, so captured bundles now appear in the visible list.
- Fixed `Ruler OFF` to clear ruler state and drawn measurements.
- Split Territory into three top-level sections using `ControlsSection-Territory.svelte` view routing.
- Made Territory module chips mode-aware so hidden cards do not leave behind dead navigation.
- Re-homed duplicated MSR/CX/DX controls out of Diagnostics and out of derived-geometry subpanels.
- Simplified `TerritoryGeometrySourceTuning.svelte` and the Perimeter Field source block so they only own derived-geometry selection, not shared topology tuning.
- Added topology compile feedback through `territoryTuningStatusStore.ts` and surfaced it in Territory and Diagnostics.
- Deferred heavy topology commits so:
  - CX/DX toggles update UI first, then compile on the next frame
  - topology sliders update UI immediately and commit with a short debounce
- Added missing shared topology controls in the main Territory tuning owner, including `Lane Midpoint Pair Count` and `Lane Midpoint Pair Weight`.
- Renamed remaining user-facing theme routing terms away from `Canonical` / `Legacy` into `Layered Runtime` / `compat inferred`.

## Verification

- `bun run check` from `pax-fluxia/` shows no targeted type errors on the touched UI/settings/diagnostics files; remaining output is CSS unused-selector warnings.
- Targeted Vitest suite passed from `pax-fluxia/`:
  - `src/lib/config/themeRouting.test.ts`
  - `src/lib/territory/runtime/TerritoryRuntimeCoordinator.test.ts`
  - `src/lib/territory/layers/transition/TransitionLayerCoordinator.test.ts`
  - `src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`

## Remaining Compatibility Debt

- Internal ids for the new direct-runtime PV path still use older compatibility stems such as `power_voronoi_canonical`, `canonical_power_voronoi`, and `pv_frontline`.
- User-facing labels have been cleaned up, but a full internal id migration to a `0427/PVV4` semantic stem would still require a broader compatibility alias pass across runtime, diagnostics, and persistence.

## Follow-up Investigation

- The clean territory runtime still models transition selection as a split between `fillTransitionMode` and `borderTransitionMode`, even though the direct-runtime path no longer runs an independent border-transition planner.
- `power_voronoi_canonical` already proves the architectural point:
  - runtime normalization forces `fillTransitionMode='pv_frontline'`
  - runtime normalization forces `borderTransitionMode='off'`
  - the transition coordinator samples fill geometry and emits an empty border frame
  - visible borders still come from polygon stroke styling on the fill presenter
- This means the current Runtime summary is semantically wrong for the new Power Voronoi mode. It reflects stale contract vocabulary, not the actual transition architecture.
- Recommended next refactor:
  - replace the direct-runtime `fillTransitionMode` / `borderTransitionMode` split with one semantically correct territory/surface transition concept
  - treat border width/alpha as presentation/style controls, not as a second transition engine
  - preserve old border-mode ids only as compatibility aliases for older comparison paths until they can be retired cleanly

## Additional UI Investigation

- The floating `Shell diag` dock is defined in the landing route shell, not in the in-game diagnostics system: `src/routes/+page.svelte`.
- Its payload is route-shell lifecycle telemetry:
  - whether the game shell was requested
  - whether the dynamic import succeeded
  - whether `GameContainer` mounted
  - recent route events and uncaught shell errors
- Its gate is broad in development:
  - visible whenever `import.meta.env.DEV` is true
  - or when `?diag=1` is present
  - or when the shell currently has an error
- No other active tooling depends on the visible dock itself. The useful underlying assets are:
  - `homeRouteDiagnostics.ts` global error/event capture
  - `window.__PAX_HOME_ROUTE_DIAG_LOG__`
  - `window.__PAX_GAME_SHELL_DIAG__`
- Recommendation:
  - do not keep the dock as a normal floating UI surface
  - keep the underlying shell/startup diagnostics data path
  - reduce the visible UI to failure-only or explicit opt-in startup diagnostics
  - if kept, rename semantically to `Startup Diagnostics` or `Route Diagnostics`, never `Shell diag`

## Implemented Follow-up

- Removed the always-visible development `Shell diag` dock from the landing route.
- Kept the underlying shell/startup diagnostics capture:
  - `homeRouteDiagnostics.ts`
  - `window.__PAX_HOME_ROUTE_DIAG_LOG__`
  - `window.__PAX_GAME_SHELL_DIAG__`
- Replaced the visible surface with:
  - an inline `Startup diagnostics` details block inside the startup error card when shell load fails
  - an explicit opt-in standalone diagnostics surface only when `?startupDiag=1` or legacy `?diag=1` is present
- Stopped showing the diagnostics UI by default in development.
- Fixed local `src/routes/+page.svelte` typing debt around browser-global diagnostics fields by replacing ambient declarations with a typed `HomeRouteWindow` helper.

## Gate Removal

- Removed `USE_RENDER_FAMILIES` from active code, settings UI, config defaults, territory fingerprints, and geometry debug summaries.
- The Territory `Render mode` row now exposes the maintained mode catalog directly without a family-adapter gate or readiness-based disabling.
- Removed the dead UI dependencies on `familyRegistryEpoch` and `getRegisteredFamilyAdapterModeIds`, then simplified `renderFamilyRegistry.ts` to the runtime responsibilities it still has.
- Stripped the stale `USE_RENDER_FAMILIES` key from the live settings snapshot and imported builtin theme snapshots so persistence no longer carries the retired setting.
- Verification:
  - residue search for `USE_RENDER_FAMILIES`, `useRenderFamilies`, and related gate helpers returned no active code hits
  - `bunx vitest run src/lib/config/geometry0319Debug.test.ts src/lib/config/themeRouting.test.ts` passed

## Metaball Grid Transition Debugging

- Investigated live `metaball_grid` jank against the current settings snapshot.
- Found the key failure mode in `MetaballGridFamily`:
  - on conquest start, the family could keep painting a stale pre-conquest cached plan while the new wave plan built off-thread
  - during that wait it also kept recomputing transition inputs unnecessarily
  - if the worker result arrived after the global transition window had mostly or fully elapsed, the fill could snap instead of animating
- Implemented a runtime fix:
  - freeze visible progress at PRE (`t=0`) while the requested plan is still pending
  - avoid rebuilding the same pending plan inputs every frame
  - when the worker result arrives, start a family-local visual transition clock so the animation still runs smoothly instead of missing the window
- Added clearer metaball-grid perf/transition diagnostics in the tuning UI:
  - classify / wave / total plan-build timings
  - worker pending vs idle
  - holding PRE vs plan ready
  - local clock vs scheduler clock
- Verification:
  - `bunx vitest run src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts` passed
  - narrow `svelte-check` on touched files showed only pre-existing unused-selector warnings in `MetaballGridTuning.svelte`

