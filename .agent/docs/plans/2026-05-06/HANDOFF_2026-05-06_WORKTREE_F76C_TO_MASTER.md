Merge note:
- Source worktree: `f76c`
- Source commit: `aebd45f93`
- Source branch state: detached worktree
- Source change state: dirty worktree, not a committed feature branch
- Merge intent: carry the live semantics/naming purge, communication-rule work, and runtime stability fixes into `master` with minimal conflict churn

# Merge Handoff - 2026-05-06 Worktree `f76c`

## Purpose

This worktree is not a single bugfix branch.
It contains three overlapping change sets that were developed together in one dirty worktree:

1. live semantics / naming cleanup across active code and definitive docs
2. new communication-rule and synthesis docs for future agents
3. runtime stability repairs discovered while validating the renamed territory/renderer surface

Do not blind-merge this worktree by full-file replacement.
Merge by subsystem and by intent.

## Source state and merge posture

This is not currently a clean commit series that can be merged by commit range.

Current truth:

- `HEAD` is `aebd45f93`
- the intended integration payload is in the uncommitted worktree delta on top of that commit
- `master...HEAD` can therefore appear empty even though the worktree contains substantial pending changes

Implication for the future merge agent:

- do not reason from branch ancestry alone
- do not assume there is a ready cherry-pickable branch
- treat this handoff doc plus the dirty worktree diff as the authoritative integration source

Working rule:

- port changes by intent and by file hunk from the worktree delta relative to `aebd45f93`
- preserve newer `master` behavior where it exists
- re-apply this worktree's semantics, naming, and lifecycle fixes on top

## Most important current truth

The most urgent runtime fix from today is:

- exit to menu
- start a new game
- switch back into the active territory mode
- old behavior: `Cannot read properties of null (reading 'clear')`

This was caused by a stale render-family instance surviving `GameCanvas` teardown through the module-global render-family registry.
The family instance was reused after its Pixi `Graphics` had already been destroyed by `app.destroy(...)`.

That repair is documented explicitly below because it is easy to lose in a large `GameCanvas.svelte` merge.

## Hard rules

1. Do not merge `common/resources/settings-live/current-settings.json`
2. Do not overwrite master session docs with worktree-local session docs
3. Treat `pax-fluxia/src/lib/components/game/GameCanvas.svelte` as a manual-merge file
4. Treat the territory compiler / runtime / transition files as manual-merge files if master has moved in the same area
5. Do not treat the restored corruption-repair files as blind replacements if master copies are already clean and newer
6. Prefer preserving master gameplay-loop changes, then re-apply this worktree's semantic and lifecycle intent on top
7. `common/dist/types.js` is generated output; regenerate if needed rather than hand-merging it
8. If a file changed here only because of broad wording cleanup or imported-theme churn, drop it first when conflict pressure is high
9. If a file changed here because it carries a runtime invariant or public vocabulary rename, port it deliberately even if the surrounding file has diverged

## Fast triage for the future merge agent

If time or conflict budget is tight, use this decision order:

1. Land additive rule and synthesis docs
2. Land the explicit runtime fixes with manual hunking
3. Land the active public naming surfaces that affect code, diagnostics, and UI labels
4. Drop generated output, live settings, imported theme churn, and low-value reference-doc churn unless they are specifically wanted

When choosing between "port" and "drop", ask:

- does this file carry a runtime invariant?
- does this file define the live public vocabulary?
- does this file only restate or snapshot data that can be regenerated?

If the answers are:

- runtime invariant: port
- live public vocabulary: port
- generated or snapshot churn: drop or regenerate

## New docs and rules to carry

These are additive and low-conflict.
Land them first.

- `.agent/rules/communication.md`
- `.agent/docs/sessions/2026-05-06/2026-05-06_semantics_naming_communication_synthesis.md`
- `.agent/docs/plans/2026-05-06/HANDOFF_2026-05-06_WORKTREE_F76C_TO_MASTER.md`

Important note:

- `.agent/docs/sessions/2026-05-06/2026-05-06_semantic-audit-working-doc.md` is audit-scoped
- `.agent/docs/sessions/2026-05-06/2026-05-06_semantics_naming_communication_synthesis.md` is the separate semantics / naming / communication synthesis doc

Do not conflate those two again.

## Low-value churn that can be dropped first

These changed in the worktree but are not required to preserve the main intent if `master` has moved on:

- imported theme JSON snapshots under `pax-fluxia/src/lib/config/builtin-themes/imported/`
- `common/resources/reference/` research/reference notes
- `.agent/rules/2026-03-19 master geometry render pipeline refactor xyz.md`

These are lower priority than the runtime fixes and live terminology surfaces.

## Recommended merge order

### Phase 1: additive docs and rules

Bring in the new docs and rule file first:

- `.agent/rules/communication.md`
- `.agent/docs/sessions/2026-05-06/2026-05-06_semantics_naming_communication_synthesis.md`
- this handoff doc

Then merge the live rule/doc updates:

- `.agent/AGENT.md`
- `.agent/MULTI_LANE_WORKTREE_GUIDE.md`
- `.agent/docs/game/design/GAME_SPECIFICATION.md`
- `.agent/docs/game/design/TERMINOLOGY.md`
- `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md`
- `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
- `.agent/docs/game/territory/TERRITORY_TRANSITION_INVENTORY.md`
- `.agent/rules/logs-first.md`

Why first:

- these establish the vocabulary and communication contract the rest of the merge should follow

### Phase 2: live territory semantics / naming rename set

Merge the core rename surfaces together as one semantic block:

- territory compiler files
- territory contracts
- geometry mode registry
- orchestrator mode ids
- runtime compatibility matrix / router / settings bridge
- renderer naming surfaces
- relevant settings UI labels

Key files in this block:

- `pax-fluxia/src/lib/territory/compiler/TerritoryCompiler.ts`
- `pax-fluxia/src/lib/territory/compiler/TerritoryTransitionPlanner.ts`
- `pax-fluxia/src/lib/territory/compiler/buildFrontierMap.ts`
- `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`
- `pax-fluxia/src/lib/territory/compiler/frontierFitter.ts`
- `pax-fluxia/src/lib/territory/compiler/frontierStage.ts`
- `pax-fluxia/src/lib/territory/compiler/types.ts`
- `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/FrontierTopologyContracts.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeCatalog.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
- `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/registry.ts`
- `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
- `pax-fluxia/src/lib/territory/orchestrator/renderMode.ts`
- `pax-fluxia/src/lib/territory/orchestrator/types.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryCompatibilityMatrix.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- `pax-fluxia/src/lib/territory/transitions/buildSnapshotsFromTMAP.ts`

This phase also includes the associated tests.

### Phase 3: rename adds / deletes / moves

Handle these intentionally.
Do not let them disappear in conflict resolution.

New files:

- `pax-fluxia/src/lib/territory/compiler/frontierMapTypes.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/modes/ResolvedPowerVoronoiGeometryMode.ts`
- `pax-fluxia/src/lib/territory/layers/presentation/modes/VectorPolygonStyle.ts`
- `pax-fluxia/src/lib/territory/layers/presentation/modes/VectorSurfaceStyle.ts`
- `pax-fluxia/src/lib/territory/transitions/createFrontierTransitionPlan.ts`
- `pax-fluxia/src/lib/territory/pvFrontline/` entire folder

Deleted files:

- `pax-fluxia/src/lib/territory/compiler/canonicalTypes.ts`
- `pax-fluxia/src/lib/territory/layers/geometry/modes/CanonicalPowerVoronoiGeometryMode.ts`
- `pax-fluxia/src/lib/territory/layers/presentation/modes/CanonicalTerritoryStyle.ts`
- `pax-fluxia/src/lib/territory/layers/presentation/modes/CanonicalVectorStyle.ts`
- `pax-fluxia/src/lib/territory/transitions/createCanonicalTransitionPlan.ts`
- `pax-fluxia/src/lib/territory/pvCanonical/` entire folder

Interpret these as vocabulary and ownership replacements, not just file churn.

### Phase 4: runtime stability fixes

Merge these after the semantic rename block:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`
- `pax-fluxia/src/lib/lanes/lanePolylineCache.ts`
- `pax-fluxia/src/lib/renderers/strokeMeshBorders.ts`
- `pax-fluxia/src/lib/renderers/centerlineGraph.ts`

These files contain the concrete stability repairs that were needed to make the renamed live surface build and run.

Treat the first two as mandatory intent ports:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`

Treat the next three as "port if still needed after comparing with master":

- `pax-fluxia/src/lib/lanes/lanePolylineCache.ts`
- `pax-fluxia/src/lib/renderers/strokeMeshBorders.ts`
- `pax-fluxia/src/lib/renderers/centerlineGraph.ts`

### Phase 5: lower-priority UI / config / theme consistency

These are useful, but if master has diverged heavily they can be merged last:

- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-FrontierFx.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
- `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/config/territory.config.ts`
- `pax-fluxia/src/lib/config/themeNames.ts`
- `pax-fluxia/src/lib/config/themeRouting.ts`
- builtin theme JSON files
- imported theme JSON files

## Explicit runtime crash handoff: exit to menu -> new game -> active mode

### Symptom

Browser error after exiting to menu, starting a new game, and returning to the active mode:

- `Cannot read properties of null (reading 'clear')`
- stack pointed into:
  - `MetaballGridPhaseEdgesFamily.update`
  - `GameCanvas.svelte`
  - async territory presentation queue

### Root cause

The render-family registry is module-global:

- `pax-fluxia/src/lib/territory/families/renderFamilyRegistry.ts`

`GameCanvas` destroyed the Pixi app and its children on teardown, but did not dispose the registered render families first.

Result:

- old family instances remained in the registry
- their `PIXI.Graphics` children were destroyed by `app.destroy(...)`
- a later `GameCanvas` mount reused the stale family from `getRenderFamily(...)`
- `MetaballGridPhaseEdgesFamily.update()` then called `clear()` on a destroyed `Graphics`

This is a lifecycle / ownership bug.
It is not an active-mode algorithm bug.

### Fix landed here

In:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

The teardown now calls:

- `disposeAllRenderFamilies()`

before:

- `app.destroy(true, { children: true })`

Intent:

- if `GameCanvas` dies, all registered family instances die with it
- a later mount must create fresh family instances instead of reusing destroyed ones

### Merge guidance for this fix

Do not take a blunt full-file replacement of `GameCanvas.svelte`.

Port this exact intent:

1. import `disposeAllRenderFamilies`
2. call it in `onDestroy`
3. call it before `app.destroy(...)`
4. preserve any newer master-side render-loop or teardown changes

If master has independently changed teardown ordering, keep the invariant:

- registered families must be disposed before the Pixi application destroys their display objects

### Post-merge runtime verification

Repeat this exact user flow:

1. start a game
2. exit to menu
3. start a new game
4. switch back into the active territory mode that previously crashed

Expected result:

- no `Graphics.clear()` null-context crash
- no `homeRouteDiagnostics` unhandled rejection from this path

If this exact flow is not tested after merge, the fix should not be considered verified.

## Explicit compiler / build repairs from this worktree

### 1. `DistanceFieldTerritoryRenderer.ts`

Problem:

- two distinct build-state caches had collapsed onto the same identifier
- duplicate declaration:
  - `cachedVectorBuildJob`

Actual ownership split:

- legacy vector-border overlay job
- newer published vector-frontier in-flight build state

Fix:

- restore separate legacy cache name:
  - `cachedLegacyBuildJob`
- keep vector-frontier published build state as:
  - `cachedVectorBuildJob`

Merge guidance:

- preserve the ownership split
- do not let later merge conflict resolution collapse those caches back into one symbol

This is a compile-time blocker.
If the merged file reintroduces the duplicate symbol, the build will fail immediately.

### 2. Corruption-repair files

The following files were text-corrupted and had to be restored to clean compileable source:

- `pax-fluxia/src/lib/lanes/lanePolylineCache.ts`
- `pax-fluxia/src/lib/renderers/strokeMeshBorders.ts`
- `pax-fluxia/src/lib/renderers/centerlineGraph.ts`

These are not conceptual feature rewrites.
They are source-integrity repairs plus minor wording cleanup.

If master already has clean, newer versions of these files:

- do not blindly overwrite master
- port only any intended behavior deltas that are still missing

Behavior worth preserving from the repaired lane cache:

- normalized lane-waypoint storage direction
- directed retrieval via `getDirectedLanePolyline`
- retained waypoint normalization test coverage

## Highest-conflict files

### `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

Why high conflict:

- render-family dispatch
- async territory presentation queue
- session reset logic
- Pixi teardown ordering
- new lifecycle fix from today

Merge guidance:

- preserve master gameplay/render-loop changes first
- then re-apply:
  - `disposeAllRenderFamilies()` teardown fix
  - any live terminology changes still needed
  - any runtime-mode naming alignment still missing

### `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`

Why high conflict:

- central geometry authority naming
- contract types
- mode registry references

Merge guidance:

- merge by vocabulary and contract ownership, not by line count

### `pax-fluxia/src/lib/territory/contracts/GeometryContracts.ts`

Why high conflict:

- type renames and public surface vocabulary

Merge guidance:

- preserve the final live type names
- then update consumers coherently in the same merge pass

### `pax-fluxia/src/lib/territory/orchestrator/renderMode.ts`

Why high conflict:

- runtime mode ids
- legacy bridge naming
- UI-facing mode routing

Merge guidance:

- verify that route ids, display labels, and mode-selection contracts all agree after merge

## Files to skip unless intentionally wanted

### Local live settings

- `common/resources/settings-live/current-settings.json`

### Generated output

- `common/dist/types.js`

### Imported theme snapshot churn

If conflict pressure is high, skip imported theme JSON files first and backfill later only if the live terminology consistency is still desired.

### Session docs

These are additive reference artifacts.
Do not overwrite unrelated master session docs with them.

## Suggested merge procedure

1. Start from a fresh integration branch on top of current `master`
2. Read this handoff doc before opening conflicts
3. Land the additive docs/rules first to establish vocabulary and communication expectations
4. Manually port the `GameCanvas.svelte` teardown invariant and the `DistanceFieldTerritoryRenderer.ts` cache split
5. Merge the live territory naming block as a coherent vocabulary pass, not as isolated word substitutions
6. Compare the three corruption-repair files against current `master` and only port missing behavior or integrity fixes
7. Regenerate generated output instead of merging it
8. Run `bun run build`
9. Perform the exit-to-menu -> new game -> active mode runtime retest

## Validation completed in this worktree

### Build

Ran:

- `bun run build`

Result:

- passes

### Corruption scan

Known corruption token scan across `pax-fluxia/src` returned no remaining live hits after the repairs.

### Earlier active-surface naming check

Earlier active-surface targeted `canonical` grep was reduced to zero matches across the intended live scope.
Archive and dated historical materials were intentionally left alone.

## What still needs human verification

1. Runtime retest of the exit-to-menu / new-game / active-mode crash path
2. Spot-check of the renamed territory mode labels and diagnostics surfaces in the UI
3. Merge-side review of any master divergence in `GameCanvas.svelte`, the territory compiler, and runtime routing files

## One-line merge strategy

Land the new rules/docs first, then merge the live territory naming block, then manually port the `GameCanvas` teardown lifecycle fix and `DistanceFieldTerritoryRenderer` cache split, treat the three restored corruption-repair files as source-integrity repairs rather than feature rewrites, and skip live settings / generated output / low-value imported theme churn unless intentionally wanted.
