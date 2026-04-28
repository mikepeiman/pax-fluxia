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

## Completed This Morning
- Refreshed the canonical benchmark pointer with `bun run debug:browser-gameplay-summary`.
- Confirmed the repo-root workspace build still fails outside this lane in `pax-server`; used `pax-fluxia/` for build validation instead.
- Captured a fresh 20-minute pre-patch soak:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T12-29-39-403Z.json`
  - `17.516ms avg`, `16.8ms p95`, `3388` frames over `33ms`
- Landed the ship-path cache pass in:
  - `pax-fluxia/src/lib/renderers/ShipRenderer.ts`
  - `pax-fluxia/src/lib/utils/render.utils.ts`
- Captured a fresh 20-minute post-patch soak:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T12-56-54-746Z.json`
  - `17.127ms avg`, `16.8ms p95`, `1862` frames over `33ms`

## Next Queue
- Commit the ship-path cache pass and today's docs as the next gameplay-performance checkpoint.
- Decide whether the next autonomous lane should be:
  - targeted browser-attribution capture for the remaining fully unattributed `50ms - 83ms` stalls
  - star presentation cost reduction, since stars plus labels now sit around `1.598ms avg`
- Keep the conquest diagnostic-bundle validation task live:
  - export a real bundle
  - inspect `debug/diagnostic.json`
  - verify `O01` through `R04` on live capture output

## Diagnostics Follow-Up
- Export a real conquest diagnostic bundle and inspect `debug/diagnostic.json`.
- Verify the `172 stars / 214 lanes / 428 runtime connections` mismatch directly in code.
