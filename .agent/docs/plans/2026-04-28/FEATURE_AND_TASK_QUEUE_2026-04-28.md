# Feature And Task Queue - 2026-04-28

## Purpose
Carry forward the gameplay-performance lane from 2026-04-27 and continue the late-game soak and diagnostics pass without re-deriving context.

## Carried Over
- Active plan artifact:
  - `pax-fluxia/docs/gameplay-performance-findings-and-plan-2026-04-27.md`
- Yesterday's handoff:
  - `.agent/docs/sessions/2026-04-27/2026-04-27_gameplay-performance-handoff.md`
- Current canonical short-suite artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-49-11-967Z.json`
- Current late-game soak artifact:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-36-41-475Z.json`

## Today's Starting Tasks
- Re-read the gameplay-performance handoff and permanent report.
- Run `bun run build`.
- Run `bun run debug:browser-gameplay-summary`.
- Rerun the 20-minute `distanceFieldGameplay` soak on the newest code.
- Inspect:
  - `avgFrameMs`
  - `p95FrameMs`
  - `longTasks.maxMs`
  - `game.renderFrame.ships`
  - `game.renderFrame.ships.orbitals`
  - `game.renderFrame.interactionOverlay`
  - frame-spike unattributed-gap metrics

## Next Likely Code Target
- `pax-fluxia/src/lib/renderers/ShipRenderer.ts`
- Hoist attack-surge timing math fully to the per-star level if the new soak still fails.

## Diagnostics Follow-Up
- Export a real conquest diagnostic bundle and inspect `debug/diagnostic.json`.
- Verify the `172 stars / 214 lanes / 428 runtime connections` mismatch directly in code.
