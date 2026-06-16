# Territory Transition Diagnosis v13

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

The diagnostics toggles were not producing a meaningful visible map change.

The geometry overlay worked because it draws through `GameCanvas` using the live
`debugGraphics` / `debugTextContainer` path.

The active-front diagnostics were still relying on a separate Pixi overlay path,
so the UI toggles were not using the same known-good render surface as the live
geometry overlay.

## Correction

Diagnostics overlay rendering was moved onto the same `GameCanvas` debug render
path as the geometry overlay.

## Active Files

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/integration/GameCanvasTerritoryBridge.ts`

## Exact Behavior Now

- `overlayConfig.enabled` now draws through `debugGraphics` every frame.
- The diagnostics overlay now renders in both steady-state and transition.
- It draws:
  - dashed `PRE` source sections
  - colored `NEXT` sections
  - active sub-sections
  - structural / stable / front / defect vertices
  - optional sample dots
  - optional labels
- The separate Pixi diagnostics overlay update call was removed from the bridge
  so the active path has one render owner.

## Validation

- `bun vitest run src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- `bun run build`

## Next Check

Re-test the map with diagnostics toggles on.

The success condition is simple:

- overlay master toggle visibly changes the map
- labels toggle visibly adds/removes labels
- vertices toggle visibly adds/removes structural points
- sample toggle visibly adds/removes sample dots
- overlay remains visible in steady-state and at conquest pause
