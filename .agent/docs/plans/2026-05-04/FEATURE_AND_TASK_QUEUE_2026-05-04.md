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

## Next

- Run real conquest cases in `power_voronoi_canonical + pv_frontline` with the recorder enabled.
- Inspect `Settings -> Diagnostics` for the live `AF Eval` / skip-count readout during snapped cases.
- Export diagnostic packages and compare which snapped cases are classifying as:
  - `snap_no_fronts`
  - `topology_unavailable`
  - specific pair-level skip mixes
- Only after that evidence exists, decide whether the first fix bet belongs in stable-anchor matching, split handling, or change-span detection.
