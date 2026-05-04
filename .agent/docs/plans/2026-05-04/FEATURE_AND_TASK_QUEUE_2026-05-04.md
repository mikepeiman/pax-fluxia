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

## Current Best Read

- The branch still preserves the earlier narrow easing bet as its behavioral baseline:
  - `smoothstep`
  - blend `0.4`
- The new UI surface should let the user judge the remaining work in the right order:
  1. timing feel
  2. moving-span isolation
  3. only then consider anti-kink smoothing or correspondence work

## Next

- Verify the new `PVV4 Transition` section in-game.
- Judge the default Bet A read before changing values.
- Try motion-isolation values against the fixed conquest-case set instead of stacking another code change immediately.
