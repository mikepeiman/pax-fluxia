# Handoff: `codex/2026-04-30-phase-edges-catchup` -> `master`

**Date:** 2026-04-30  
**Branch:** `codex/2026-04-30-phase-edges-catchup`  
**Merge target:** `master`  
**Merge base:** `f4bc81a9` (`fix: restore phase-edges as a separate session-overlay mode`)  
**This branch tip:** `81451e3dc` (`Restore star-fit centering for territory presentation`)  
**Master tip (at time of writing):** `f4bc81a9` (`fix: restore phase-edges as a separate session-overlay mode`)  
**Commits ahead of master:** 13

This is the additive handoff record for eventually rolling this worktree back into `master`.
Update this file in place. Do not replace it with a new summary doc each turn.

---

## 1. Current branch payload

### Commit stack

1. `58efa694` - `Add phase-edges frontier matrix and runtime fixes`
2. `ab8cf80c` - `Re-home territory style controls and remove topology duplication`
3. `78678f78` - `Catch up 2026-04-30 session and post-mortem docs`
4. `18d39ac9` - `Remove session log ignore rule`
5. `3e13cf68` - `Add phase-edges merge handoff history`
6. `25b959ce` - `Fix phase-edges fill offset and junction controls`
7. `2f7d7ebcb` - `Narrow phase-edges frontier fill suppression`
8. `adc0b8b35` - `Fix map viewport world bounds alignment`
9. `89c9cdd69` - `Fix territory viewport presentation framing`
10. `bde7dd7c3` - `Update viewport fix handoff metadata`
11. `c2f3dcfb8` - `Align territory fit to map rect and add outer border toggle`
12. `36ef604d0` - `Document map-rect centering rethink and perimeter toggle`
13. `81451e3dc` - `Restore star-fit centering for territory presentation`

### Code scope

- Shared frontier processing layer:
  - `pax-fluxia/src/lib/territory/frontier/`
- Phase Edges family/runtime integration:
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridStats.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`
  - `pax-fluxia/src/lib/territory/families/metaball/config.ts`
  - `pax-fluxia/src/lib/config/game.config.ts`
  - `pax-fluxia/src/lib/config/territory.config.ts`
- Render-infra touch points:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- Territory settings/UI ownership cleanup:
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritoryGeometrySourceTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/TerritorySurfaceStyleTuning.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/settingMetadata.ts`
  - `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
  - `pax-fluxia/src/lib/components/ui/settingsDefs.ts`
- Tests / diagnostics:
  - `pax-fluxia/src/lib/territory/frontier/frontier.test.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts`
  - `pax-fluxia/tools/debug/benchmark-frontier-techniques.test.ts`

### Non-code / process payload

- Daily queue/session/takeaway/chat docs for `2026-04-30`
- Post-mortem:
  - `.agent/docs/project/post-mortems/2026-04-30_phase-edges-delivery-integrity-and-protocol-drift.md`
- Repo protocol fix:
  - `.gitignore` no longer ignores `.agent/docs/sessions/` via a broad `sessions/` rule

---

## 2. What this branch is trying to solve

- Add a reusable frontier-processing layer for Phase Edges instead of a one-off family hack.
- Expose frontier technique comparison options for effect/performance evaluation.
- Stop settings/UI contract drift:
  - no duplicated topology ownership
  - no fake style controls with no consumer
  - no duplicate subsection navigation inside child panels
- Move toward a single geometry decision driving both fill and border behavior instead of allowing steady-state/transition divergence and fill/border divergence.

---

## 3. High-value history from this session

This section is intentionally long. It exists to preserve context that will be lost once the active chat is gone.

### Initial request and architectural intent

- The user explicitly asked for the border/frontier techniques from their external design note to be implemented faithfully, as options, with no corner-cutting and no pollution from existing code/plans.
- The work was supposed to fit the existing Render Mode Families + 4-Layer-Pipeline + VFX architecture and be reusable as a utility/library, not a Phase Edges one-off.
- The resulting plan was to build `src/lib/territory/frontier/` as a shared frontier-processing layer and wire the first consumer into `MetaballGridPhaseEdgesFamily.ts`.

### First implementation payload

- Shared frontier modules were added under `pax-fluxia/src/lib/territory/frontier/`.
- Phase Edges family integration, tests, diagnostics, and benchmark scaffolding were added.
- A territory UI surface for the new frontier technique options was also added.

### First major failure: controls existed but had no effect

The user immediately reported that the following surfaced controls did nothing:

- `shared edge smoothing`
- `shared edge trim`
- `wave geometry`

The important context:

- The renderer code did read those values.
- The live app still behaved as if the defaults were locked.
- I initially described the code location instead of the actual UI experience, which the user correctly called out as a role failure.

What was later diagnosed:

- `GameCanvas.svelte` was feeding Phase Edges a config source that re-applied mode defaults every frame.
- That overwrote user-edited values before the render family received them.
- This made several controls effectively inert even though the renderer code referenced them.

Additional UI-side contributing defects at that stage:

- the `Frontier` subsection was missing or hidden in the UI path the user was actually looking at
- `Wave Geometry` was hard-disabled in Phase Edges at the UI layer

### Supervisory/process interpretation of that failure

This was not just a rendering bug. It was a senior-level delivery failure:

- validated code presence more than user-visible behavior
- allowed runtime defaults to override live user intent
- reported completion before proving the user could change the UI and see a result

That failure produced the post-mortem now stored at:
- `.agent/docs/project/post-mortems/2026-04-30_phase-edges-delivery-integrity-and-protocol-drift.md`

### Wrong-worktree / invisible-work problem

The user later discovered they had been looking at `master`, while the work was happening in this detached worktree. Then the worktree app itself failed to load because `GameContainer.svelte` still imported a missing `TransitionDebugPanel.svelte`.

What happened:

- the user could not see any of the work
- this was partly worktree confusion and partly a real import-resolution break in the detached worktree
- the dead `TransitionDebugPanel` import and related code were removed from `GameContainer.svelte`

This matters for merge-back because it is part of why trust dropped: some complaints were about behavior, others were about the user not even being in the same checkout.

### Fill/border geometry mismatch work

After the worktree was visible, the user reported the next major architectural defect:

- the borders in Phase Edges were taking on more interesting geometry
- the fills were not cut or smoothed to the same frontier
- steady-state and conquest-state border behavior also differed

This triggered several iterations.

#### Attempt 1

- Tried to unify control-path fill and border through a shared occupancy/frontier source.
- Result was bad:
  - steady-state fills were effectively turned off
  - transition borders disappeared globally except in the local transition region

This is an important historical point: there was a real regression where the attempted unification replaced core control-path presentation instead of augmenting it.

#### Attempt 2

- Restored base control fills and base control borders.
- Shifted the control-path frontier smoothing toward an additive boundary fill overlay instead of full replacement.
- Drew the control borders above the overlay again.

This improved things, but did not fully satisfy the user’s deeper invariant.

#### User-preferred geometry split

The user explicitly said:

- conquest borders were preferred because they were rounded and fit the fills
- steady-state borders were a different, straighter option
- the user wanted a toggle between those options
- whichever option was selected, fills had to be cut/smoothed to match it

In response:

- a border-geometry toggle was added for Phase Edges
- the intent was:
  - `Rounded contour-matched`
  - `Straight shared edge`
- the control-path fill suppression/replacement was rewired so the selected border style would also drive the fill frontier

Important honesty note:

- even after this, the user still stated that borders and fills were diverging, and that stable-area steady-state and transition borders should never diverge architecturally
- that means this branch should not be treated as having fully proven the invariant yet

### Paused-state rendering note

The user reported that the new territory modes/settings did not present while paused, only after play resumed.

- a paused-state territory rerender fix was implemented in `GameCanvas.svelte`
- later, the user clarified that the prompt had actually been intended for a different worktree/chat

Preserve both facts:

- a paused-state reactivity change was made here
- the original report may not have been sourced from this worktree’s visible behavior

### Runtime crash fixed during this session

The user reported:

- `connections is not defined`
- thrown from `GameCanvas.svelte` during `measurePerf`

What was fixed:

- an out-of-scope `connections` identifier was replaced with the live source from `activeGameStore`

This is not central to frontier architecture, but it is part of the branch history and must not be forgotten during integration review.

### Territory settings/UI architecture audit

The user then pushed hard on the settings UI architecture, and correctly so.

The user’s objections included:

- topology does not belong in `Territory Styles`
- `Territory Styles` had broken UX with no real subsection toggles except `ALL | NONE`
- duplicated `geometry source` and `source constraints`
- duplicate toggle rows in `Territory Styles`
- a theme select was incorrectly inserted there
- style controls like `show border`, `show fills`, and `blur affects borders` had no visible effect

What was found:

- topology/source ownership had drifted into multiple panels
- parent and child panels were both trying to own subsection navigation
- shared style UI was being rendered for Phase Edges without confirming the family actually consumed those values
- `blur affects borders` was a false inherited control for Phase Edges

What was changed:

- topology ownership was moved out of styles and back to one place
- duplicated source-constraint surfaces were removed
- duplicate subsection/nav controls were removed from child panels
- the theme bar/theme select was removed from `Territory Styles`
- real paint-time controls were re-homed into `Territory Styles`
- fake/inapplicable `Finish` surfaces were filtered out for Metaball Grid / Phase Edges
- `show fill` and `show border` were wired into the actual Phase Edges presentation path

Remaining UI debt explicitly noted during the session:

- `MetaballGridTuning.svelte` still contains dead legacy shape UI behind `false`

### Deeper architectural demand from the user

The user stated a stronger invariant than any single local bug fix:

- there should never be a mode where borders and fills diverge
- there should never be a mode where steady-state and transition-state borders diverge for stable areas
- this requires a deep audit and an encapsulated architectural solution, not one-off hacks

That demand is still the correct merge-back acceptance bar.

### Protocol / process failures that happened in this same session

- work continued too long without commits
- required daily session docs were not being kept
- the `.agent/AGENT.md` protocol was missed until the user pointed it out
- `.gitignore` contained a broad `sessions/` rule that silently caused `.agent/docs/sessions/...` to be ignored

What was done:

- created branch `codex/2026-04-30-phase-edges-catchup`
- split the work into four auditable commits
- wrote queue/session/chat/takeaways/post-mortem docs
- removed the bad `.gitignore` rule

This process history matters because the branch is not only code. It is also a trust-repair and traceability branch.

---

## 4. User-ground-truth observations to preserve

These observations came from the user seeing the live app and should be treated as higher-signal than code assumptions:

- frontier-related controls initially had zero effect
- the user could not initially see the work because they were on `master` and the worktree also had a broken import
- conquest borders looked better than steady-state borders
- fills and borders were not using the same frontier shape
- one attempted fix caused steady-state fills to disappear and transition borders to disappear globally
- `Territory Styles` was architecturally wrong before cleanup
- some surfaced style controls were fake or non-functional
- the user does not accept separate structural geometry for fill vs border or for stable-area steady-state vs transition presentation

---

## 5. Merge guidance

### Recommended merge order

1. Merge `58efa694` first and treat it as the architectural payload.
2. Merge `ab8cf80c` second and treat it as the settings-ownership/UI cleanup.
3. Merge `78678f78` and `18d39ac9` after the code path is accepted; they are process/protocol commits.

### Why this order

- The frontier utility and Phase Edges runtime changes define the new contract.
- The UI cleanup assumes that contract exists and removes duplicated surfaces around it.
- The docs and `.gitignore` fix are independent and low-risk, but should not obscure code review of the runtime/UI changes.

### Choke points to read carefully during merge

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/game/GameContainer.svelte`
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`
- `pax-fluxia/src/lib/config/territory.config.ts`

Those are shared choke points from the multi-lane guide and should be merged intentionally, not rubber-stamped.

---

## 6. Known integration risks

### Risk: Phase Edges behavioral parity is not fully closed

The branch improves the architecture and fixes multiple inert-control and UI-ownership failures, but the user has already identified that fill/border and steady-state/transition parity are still not fully solved. Treat this branch as an active integration branch, not as “ready for blind fast-forward to master.”

### Risk: Phase Edges settings surface still needs live user validation

The build/tests pass, but the user is the source of truth for the live scene. Any merge to `master` should preserve the current expectation:
- no inert style controls
- no duplicated topology controls
- no hidden or duplicated subsection navigation

### Risk: stale live-state file

`common/resources/settings-live/current-settings.json` is modified in this worktree outside the committed branch delta. Do not assume the current unstaged local version should be merged. Reconcile intentionally, or ignore it if the target branch already carries the desired live settings.

### Risk: generated diagnostics output

`pax-fluxia/.agent-harness/` is local generated output and should not be merged.

---

## 7. What not to do on merge

- Do not treat docs/process commits as proof that the runtime behavior is done.
- Do not reintroduce a broad ignore rule that suppresses `.agent/docs/sessions/`.
- Do not split topology ownership back across `Territory Styles`, generic source cards, and family-specific source cards.
- Do not merge `common/resources/settings-live/current-settings.json` mechanically.
- Do not merge `pax-fluxia/.agent-harness/`.

---

## 8. Validation expected before merge to master

- `bun x vite build` in `pax-fluxia/`
- `bun x vitest run src/lib/territory/frontier/frontier.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts tools/debug/benchmark-frontier-techniques.test.ts`
- Live UI smoke in Phase Edges:
  - territory render appears while paused when settings change
  - `Territory Tuning & Constraints` has no duplicated topology ownership
  - `Territory Styles` has no duplicate subsection controls
  - surfaced fill/border controls visibly affect the live render
- Live render smoke in Phase Edges:
  - no border-only steady-state regression
- no transition-only border visibility regression
- no obvious fill/border frontier mismatch when the selected geometry is supposed to be shared

---

## 9. Open debt to keep visible

- `MetaballGridTuning.svelte` still contains dead legacy shape UI behind `false`; it should be physically removed in a cleanup pass.
- `Shared Edge Trim` remains overloaded: it influences visible junction gaps and also contributes to fill pullback on the straight shared-edge path.
- The deeper architectural invariant is still the right north star:
- no mode where fills and borders diverge structurally
- no mode where stable-area steady-state borders and transition borders diverge structurally

---

## 10. Additive update log

### 2026-04-30

- Created the initial merge-back handoff for the `codex/2026-04-30-phase-edges-catchup` branch.
- Captured the 4-commit stack, conflict zones, merge order, and known unresolved architectural risks.
- Added the high-value session history so the eventual merge reviewer can see:
  - what the user actually observed
  - which fixes were later found inadequate or regressive
  - which UI/process failures happened alongside the code work
- Explicitly recorded that the current worktree also has uncommitted local-only noise:
  - `common/resources/settings-live/current-settings.json`
  - `pax-fluxia/.agent-harness/`

### 2026-04-30 - additive update after live Phase Edges review

- The user identified a new preferred visual candidate: the current Phase Edges default look in this worktree now reads as attractive and consistent overall, but still had three important defects:
  - fill sat inside the border with no working control over that pullback
  - `per_cell` borders brought fill back to the edge but lost the blended opposing-force frontier
  - the low-pixel three-way junction gap control was no longer discoverable in the styles UI
- Runtime changes made in response:
  - `METABALL_GRID_INWARD_OFFSET_PX` was wired into the active phase-fill replacement path by offsetting the shader fill threshold instead of leaving the control trapped in the legacy base-cell paint branch
  - explicit `per_cell` borders were split from frontier-recipe ownership so a phase-derived frontier technique can no longer suppress them
  - centered-blended boundary drawing was widened to operate in `per_cell` mode on square grids, overlaying one shared opposing-owner frontier stroke on top of the per-cell lattice
  - blended boundary color now uses occupancy-weighted pairing rather than a blind 50/50 owner blend, so PRE/POST influence can move across the transition
  - new straight-shared-edge junction tunables were added:
    - `TERRITORY_FRONTIER_JUNCTION_RENDER_MODE`
    - `TERRITORY_FRONTIER_JUNCTION_RADIUS_PX`
  - straight shared-edge junctions can now stay as a trimmed low-pixel gap or render an experimental multi-owner color bubble at 3+ owner junctions
- UI changes made in response:
  - `Territory Styles` now explicitly surfaces:
    - `Junction Render`
    - `Junction Gap Trim`
    - `Junction Bubble Radius`
  - `Shared Edge Trim` was relabeled in the visible UI to make it discoverable as the three-way-junction gap slider the user remembered
  - `MetaballGridTuning.svelte` now explicitly states that `Grid | Frontier | Wave | Flip | Perf` are panel sections only, not renderer/effect switches
- Validation after this additive update:
  - `bun x vite build`
  - `bun x vitest run src/lib/territory/frontier/frontier.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts tools/debug/benchmark-frontier-techniques.test.ts`
- Remaining acceptance bar after this additive update:
  - live user confirmation that `Inward Offset` now visibly changes the active Phase Edges fill frontier
  - live user evaluation of the new `per_cell` blended frontier overlay
  - live user evaluation of gap-trim versus bubble junction treatment

### 2026-04-30 - additive update after centered-blended fill-offset audit

- A further live user report narrowed the main remaining defect:
  - `Centered-blended borders` still caused a significant general fill pullback
  - turning that blend path off made fills reach the boundary again
  - `Inward Offset` had become effectively hidden by the subsectioned styles UI because it lives under `Fill`
- Root cause:
  - the Phase Edges fill-suppression path was using `validMask`, which marks the broader neighborhood required for contour extraction
  - that mask is wider than the set of cells that should have their base fill replaced
  - result: a border presentation option could erase too much base fill and create an inward pull even when `Inward Offset = 0`
- Architectural fix:
  - added `suppressMask` to `TerritoryFrontierPhaseFieldLayer`
  - Phase Edges pair layers now populate `suppressMask` only for the true frontier-pair cells, while `validMask` remains the broader contour domain
  - `shouldSuppressSceneCellForFrontierFill()` now prefers `suppressMask` when present
  - this explicitly separates:
    - contour extraction support area
    - base-fill replacement area
- UI follow-up:
  - the border section now tells the user that `Inward Offset` lives in `Fill`, which avoids another false “the control was removed” read without duplicating the control
- Validation after this additive update:
  - `bun x vitest run src/lib/territory/frontier/frontier.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts tools/debug/benchmark-frontier-techniques.test.ts`
  - `bun x vite build`

### 2026-05-01 - additive update after map/viewport contract audit

- The user reported a new presentation defect in the currently preferred Phase Edges look:
  - the map was visibly off-center in the canvas/grid area
  - territory fills reached the top and left viewport bounds but not the bottom and right
- The important diagnosis is architectural:
  - `GameCanvas.svelte` was fitting the world to a star-derived bounding box
  - territory renderers also consume `GAME_WIDTH` / `GAME_HEIGHT` as their world size
  - when those values come from star extents instead of the canonical map rectangle, the viewport and territory surfaces drift apart
- This is a portable anti-pattern to avoid on merge-back:
  - using star bbox as a proxy for map/world bbox
  - allowing camera-fit logic and surface-render logic to infer their own separate extents
- Runtime changes made:
  - added `pax-fluxia/src/lib/components/game/worldRect.ts`
  - `resolveViewportWorldRect()` now resolves one authoritative world rect for presentation:
    - prefer configured map width/height when present
    - expand stale configured extents if live stars exceed them
    - fall back to star extents only when no configured map rectangle exists
  - `GameCanvas.svelte` now centers/fits against that resolved world rect and mirrors it into `GAME_WIDTH` / `GAME_HEIGHT`
  - `gameStore.svelte.ts` now seeds `_MAP_WIDTH`, `_MAP_HEIGHT`, `_MAP_PADDING_X`, `_MAP_PADDING_Y` for debug and saved-map flows as well, not only standard generated maps
- Tests/validation added:
  - `pax-fluxia/src/lib/components/game/worldRect.test.ts`
  - `bun x vitest run src/lib/components/game/worldRect.test.ts`
  - `bun x vite build`
- Acceptance still depends on live user confirmation in the running app, but this fix moves the issue out of one-off offset tweaking and into a shared world-rect contract that should port cleanly across worktrees.

### 2026-05-01 - additive correction after the first viewport fix failed live

- The user immediately rejected the first 2026-05-01 viewport fix:
  - fills now showed margins on all edges
  - the map still was not centered
  - the user explicitly called out the conceptual error: the star map / game map is not the same contract as the territory fill bounds
- That rejection matters for merge review:
  - the earlier idea of making one world rect do everything was itself wrong for this surface
  - do not merge the earlier viewport work as though it were the finished design
- Corrected architectural model:
  - `star-fit camera rect`
    - follows the live star field
    - owns camera centering / scale fit
  - `stable authored/display map rect`
    - rooted at `(0,0)`
    - owns map/world-space truth for geometry derivation and other stable systems
  - `viewport-aligned territory presentation frame`
    - centered on the fitted star content
    - sized to the live canvas viewport at the current fit scale
    - owns only territory presentation, not geometry truth
- The deeper implementation bug that the first fix missed:
  - once `voronoiContainer` is shifted into the viewport-aligned territory frame, every territory renderer inside it must consume coordinates localized into that same frame
  - shifting the container alone while leaving stars/geometry in absolute display-space guarantees drift
- Runtime corrections made:
  - added `pax-fluxia/src/lib/components/game/territoryPresentationSpace.ts`
  - the helper localizes:
    - display-space stars into the territory presentation frame
    - canonical geometry into the same local frame
    - region/frontier/shell/topology coordinates all move together
  - localized geometry is cached by raw geometry reference + frame key to reduce unnecessary plan rebuild churn
  - `GameCanvas.svelte` now:
    - builds a `territoryPresentationFrameKey`
    - includes that frame key in `buildTerritoryPresentationRequestSignature()`
    - passes localized stars to direct territory renderers
    - passes localized stars + localized geometry to render-family inputs
    - passes localized stars/world size to canonical bridge and canonical controller presentation paths
- Why this merge guidance matters:
  - this is not a Phase Edges-specific hack
  - it is a presentation-space adapter pattern for any territory renderer that must fill the viewport while the star-fit camera remains centered on live content
  - if another worktree touches `GameCanvas.svelte`, preserve the separation between:
    - stable geometry truth
    - camera fit
    - territory presentation frame
- Tests/validation added for the correction:
  - `pax-fluxia/src/lib/components/game/territoryPresentationSpace.test.ts`
  - `bun x vitest run src/lib/components/game/worldRect.test.ts src/lib/components/game/territoryPresentationSpace.test.ts`
  - `bun x vite build`

### 2026-05-01 - additive rethink after the presentation-frame correction was also rejected live

- The user later provided a screenshot and a more precise correction:
  - the map was now closer to centered, but still not perfectly centered
  - fills showed margins on all sides
  - a visible outer border had leaked onto only one side of the map
  - the user wanted outer borders as a real option:
    - full-map
    - consistent
    - optional by toggle
- This invalidated an important part of the earlier 2026-05-01 correction:
  - centering the territory presentation on a viewport-sized frame around the star-fit rect was still the wrong owner for this surface
  - the user’s requirement is that the authored/display map rect, not the star cloud, owns the visible filled map area
- Revised architectural decision:
  - keep the star-fit rect only as diagnostic/gameplay context
  - use the authoritative map rect for stage fit/centering
  - keep territory presentation locked to that same map rect
  - preserve `territoryPresentationSpace.ts` as a reusable localization adapter, but do not let it own the visible fill bounds for this preferred path
- Runtime changes made in `GameCanvas.svelte` and `worldRect.ts`:
  - added `resolveMapFitWorldRect()` to convert the stable world rect into the fit/center contract used by the stage
  - changed:
    - `handleResize()`
    - `applyZoomTransform()`
    - `clampPan()`
    - `handleWheel()`
    - `navigateToStar()`
    so their baseline fit/centering uses the map rect instead of the star-fit rect
  - changed `updateTerritoryViewportFrame()` so the territory frame is the authoritative map rect again, not a viewport-sized world-space frame
- Why this matters for merge-back:
  - do not merge the viewport-aligned territory-frame theory as though it were the final architectural answer
  - the durable invariant for this branch is now:
    - stage fit == map rect
    - territory presentation rect == map rect
    - star-fit rect is no longer allowed to own visible map centering
- Outer-border audit/fix made in the same step:
  - identified that the centered-blended Phase Edges pass only collected owner-owner edges from right and bottom neighbours
  - that meant owner-vs-world perimeter was never a first-class feature and could leak asymmetrically
  - added shared runtime config `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED`
  - surfaced it in `Territory Styles > Border` as `Outer perimeter border`
  - updated `MetaballGridPhaseEdgesFamily.ts` so:
    - out-of-bounds neighbours only count as edges when outer perimeter is enabled
    - owner-vs-world perimeter edges are collected explicitly on all four sides
    - those outer edges are stroked in their own owner-colored perimeter pass instead of piggybacking on the owner-owner blended pass
- Validation after this additive rethink:
  - `bun x vitest run src/lib/components/game/worldRect.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts`
  - `bun x vite build`
- Remaining acceptance bar:
  - live user verification that the map is now exactly centered
  - live user verification that fills reach the intended map-area bounds
  - live user verification that outer perimeter is either fully off or fully consistent around the whole map

### 2026-05-01 - additive correction after the map-rect centering step was rejected

- The user then clarified that the previous summary sentence had inverted the intended ownership model:
  - the star-map bounds are what must be centered
  - the fill must extend equally in all directions around that centered star-map view
- This means commit `c2f3dcfb8` should not be treated as the final centering architecture. It preserved the outer-perimeter work, but its map-rect centering change was a semantic misread of the user requirement.
- Corrective runtime change in `81451e3dc`:
  - restored star-fit/content-rect centering in `GameCanvas.svelte`
  - restored star-fit/content-rect sizing for `baseScale`, zoom baseline, wheel-anchor baseline, and pan clamping
  - kept the explicit `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED` toggle/path from `c2f3dcfb8`
- Merge guidance:
  - keep the outer-perimeter feature from `c2f3dcfb8`
  - do not keep its map-rect centering baseline
  - the active branch tip returns to star-fit centering while still using a viewport-aligned territory fill frame around that star-fit center
