# Territory Transition Diagnosis v17

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

The diagnostics overlay needed two concrete fixes:

- a visible top-left HUD legend so the active-front colors and markers are readable in steady-state and at conquest pause
- one last hardening pass on runtime-output scope so the debug overlay path no longer depends on any callback-local `canonicalRuntimeOutput`

## Correction

- added a compact top-left `AF Diagnostics` legend in `GameCanvas.svelte`
- the legend shows:
  - active-front evaluation summary
  - fronts / pairs / no-motion / defects counts
  - line and marker keys for:
    - `PRE source`
    - `NEXT active`
    - `Active subspan`
    - `No-motion`
    - `Stable anchor`
    - `Front anchor`
    - `Defect`
    - `Sample points`
- promoted `canonicalRuntimeOutput` to component scope and reset it at the start of each queued territory render pass

## Active File

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

## Validation

- `bun run build`
