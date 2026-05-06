# Territory Transition Diagnosis v14

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

The new diagnostics overlay path had two concrete regressions:

- `GameCanvas.svelte` referenced `canonicalRuntimeOutput` from a helper that was
  outside that variable's scope, causing a live browser crash.
- Diagnostics toggles were not using the existing persisted panel-state pattern,
  so overlay settings did not reliably survive reload.

## Correction

- `renderActiveFrontDebugOverlay(...)` now takes
  `TerritoryRuntimeOutput | null` explicitly.
- `renderPerimeterFieldDebugOverlay(...)` now threads the active
  `canonicalRuntimeOutput` into the overlay helper from the live frame.
- diagnostics toggle state now persists through the shared panel-storage path
  and rehydrates into `overlayConfig` on reload.

## Active Files

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/components/ui/panelSync.ts`
- `pax-fluxia/src/lib/territory/devtools/overlayConfig.ts`

## Expected Behavior Now

- enabling diagnostics no longer throws `canonicalRuntimeOutput is not defined`
- steady-state and transition overlay rendering can run continuously
- diagnostics toggle state persists through the same localStorage-backed panel
  system as the rest of the controls

## Validation

- `bun vitest run src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`
