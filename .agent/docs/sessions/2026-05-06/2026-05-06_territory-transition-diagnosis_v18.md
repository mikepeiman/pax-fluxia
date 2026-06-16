# Territory Transition Diagnosis v18

Date: 2026-05-06
Branch: `codex/render-infra/pvv4-transition-bets`

## Problem

The AF legend was visible, but it was still being drawn inside Pixi debug space.
That made its placement wrong for a HUD element.

The user specifically wanted a normal UI overlay, anchored by the existing layout
system rather than ad hoc world-space positioning.

## Correction

- removed the Pixi-drawn AF legend
- moved the AF legend into `GameCanvas.svelte` markup as a normal HTML HUD overlay
- added a named grid HUD layer:
  - `canvas-hud`
  - `grid-template-areas`
  - legend anchored at `top-left`
- kept the live summary bound to `canonicalDebugRuntimeOutput.activeFrontDebug`
- made `canonicalDebugRuntimeOutput` reactive with `$state(...)` so HUD updates
  render correctly

## Active File

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`

## Validation

- `bun run build`
