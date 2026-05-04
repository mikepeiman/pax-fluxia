# Feature And Task Queue - 2026-05-04

## Active

- PVV4 transition bets are now UI-first on branch `codex/render-infra/pvv4-transition-bets`.
- Worktree:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia`
- Canonical tracked handoff:
  - `.agent/docs/project/process/worktree-handoffs/2026-05-03_pvv4-transition-bets_handoff.md`

## Today

- Implemented a new developer-tier top-level settings section:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-PVV4Transition.svelte`
  - surfaced via:
    - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
    - `pax-fluxia/src/lib/components/ui/settings/settingsRegistry.ts`
- Added and persisted Phase 1 PVV4 experiment controls:
  - `PVV4_PROGRESS_PROFILE`
  - `PVV4_PROGRESS_BLEND`
  - `PVV4_STABLE_ANCHOR_EPS`
  - `PVV4_CHANGE_SPAN_EPS`
  - `PVV4_CHANGE_SPAN_PAD_POINTS`
- Wired Phase 1 runtime consumption:
  - Bet A timing:
    - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
  - Bet B motion isolation:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - settings/tunable bridge:
    - `pax-fluxia/src/lib/territory/integration/TerritorySettingsBridge.ts`
    - `pax-fluxia/src/lib/territory/runtime/TerritoryConfigNormalizer.ts`
- Validation:
  - `bun run build` succeeds end to end
  - `bunx vitest run src/lib/territory/integration/TerritorySettingsBridge.test.ts` passes
- Implemented PVV4 active-front diagnostics across the live/runtime/export path:
  - planner diagnostics and compact export:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - runtime classification and recorder payload:
    - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
    - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
    - `pax-fluxia/src/lib/territory/integration/GameCanvasTerritoryBridge.ts`
  - live in-game diagnostics surface:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
    - `pax-fluxia/src/lib/stores/territoryRenderStatusStore.ts`
    - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - exported package adapter + tests:
    - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
    - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
- New snap/transition classifications now available:
  - `animated_fronts`
  - `collapse_only`
  - `snap_no_fronts`
  - `topology_unavailable`
  - pair-level skip reasons:
    - `skipped_topology_gap`
    - `skipped_unsupported_split_mode`
    - `skipped_no_change_span`
- Validation:
  - `bun run build` succeeds end to end
  - `bunx vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts` passes
- Restored the missing diagnostics control for perimeter-field geometry overlays:
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - the `Show underlying geometry` toggle now writes:
    - `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY`
    - `panel.perimeterFieldDebugShowGeometry`
  - the write path bumps the territory visual epoch so paused/live canvases refresh immediately
- Added a dedicated rule for UI-anchored diagnostics communication:
  - `.agent/rules/diagnostics-ui-communication.md`
  - reinforced in:
    - `.agent/AGENT.md`
  - purpose:
    - force future debug asks to tell the user exactly where to click, what to do, what to expect, what artifact to return, and what the artifact will tell the agent
- Fixed the `Show underlying geometry` regression for PVV4/canonical runtime modes:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - the toggle now draws canonical runtime geometry loops in `power_voronoi_canonical`
    and clean-bridge `territory_canonical`, instead of only working for perimeter-field
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
    now labels the control as current-mode geometry, not perimeter-field-only geometry
- Added direct diagnostics export folder support:
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Analyzed a user-supplied PVV4 diagnostic package as a true snap case:
  - capture showed:
    - `AF eval: snap_no_fronts`
    - `pairs: 34`
    - `planned fronts: 0`
    - `split skips: 13`
    - `no-span skips: 17`
    - `gap skips: 4`
  - purpose:
    - confirm that this conquest did not partially animate badly; it fully fell off the active-front planner and snapped
- Replaced ambiguous conquest/package naming across diagnostics surfaces with explicit conquest sentences:
  - new naming rule:
    - `attackerStar(newOwner)_conquers_targetStar(previousOwner)`
  - new shared helper:
    - `pax-fluxia/src/lib/territory/devtools/conquestNaming.ts`
  - updated surfaces:
    - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
    - `pax-fluxia/src/lib/territory/devtools/PerimeterFieldConquestPackage.ts`
    - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- Preserved attacker metadata on more conquest capture paths so the new naming has a stable source of truth:
  - `pax-fluxia/src/lib/territory/contracts/OwnershipContracts.ts`
  - `pax-fluxia/src/lib/territory/integration/TerritoryFxBridge.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- Validation:
  - `bun run build` succeeds end to end
  - `bunx vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/integration/TerritorySettingsBridge.test.ts` passes
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - exports can now be written straight to a chosen folder via the browser File System
    Access API, with browser-download fallback when unsupported or unset
- Changed diagnostic artifact timestamps to human-readable local capture time:
  - `pax-fluxia/src/lib/territory/devtools/snapshotExport.ts`
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
  - `pax-fluxia/src/lib/territory/devtools/PerimeterFieldConquestPackage.ts`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - filenames now use file-safe local time:
    - `hh-mm-ss---mmm`
  - visible labels / README text now use:
    - `hh:mm:ss---mmm`
- Wrote post-mortem for the false-positive toggle restore and poor artifact request:
  - `.agent/docs/project/post-mortems/2026-05-04_diagnostics-toggle-and-artifact-ask.md`
- Fixed a real PVV4 active-front overextension bug and corrected the frame-render diagnostics so exported artifacts match runtime behavior:
  - runtime/sampling changes:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
      - active-front sampling now pins unchanged tails inside long sections instead of replacing an entire overlapping section with fully interpolated geometry
      - final change spans are clamped away from matched stable-anchor endpoints so stable anchors do not enter the moving interval
      - compact diagnostic output now includes explicit `changeAnchors`
  - artifact renderer changes:
    - `pax-fluxia/src/lib/territory/devtools/TransitionFrontierFrameRenderer.ts`
      - active-section overlays now draw the real sampled section geometry instead of a naive full-section `prev -> next` lerp
      - stable-anchor labels are now `SA*`
      - change-anchor labels are now `AF*`
  - targeted coverage:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
      - asserts that near-identical section tails remain pinned while only the interior moving span morphs
- Validation:
  - `bunx vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts` passes
  - `bun run build` succeeds end to end

## Current Best Read

- The branch still preserves the earlier narrow easing bet as its behavioral baseline:
  - `smoothstep`
  - blend `0.4`
- The branch can now distinguish:
  - a conquest that animated with planned fronts
  - a conquest that only collapsed a removed loop
  - a conquest that snapped because no active front was planned
  - a conquest that never got a topology-driven plan
- The new UI surface should let the user judge the remaining work in the right order:
  1. timing feel
  2. moving-span isolation
  3. only then consider anti-kink smoothing or correspondence work
- The newly supplied `15-28-02---366_transition-diagnostic-package` is an `animated_fronts` case, but it exposed a genuine active-front bug:
  - the planner found one changed span on a long `ai-5|human-player` section
  - sampling and diagnostics were both overextending that local span across the full overlapping section
  - the latest fix narrows the moving geometry back to the local change interval and marks stable anchors separately from change anchors

## Next

- Re-export the same or similar `animated_fronts` conquest package after this fix.
- Check whether the exported debug frames now show:
  - active geometry only in the local changed span
  - `SA*` labels at stable anchor pair endpoints
  - `AF*` labels at the pinned local change anchors
- If the runtime still shows endpoint drift after this fix, inspect the remaining change-span detection itself, not just section replacement.
- Continue comparing snapped packages separately:
  - `snap_no_fronts`
  - `topology_unavailable`
  - specific pair-level skip mixes
