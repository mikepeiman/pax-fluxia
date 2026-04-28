# Gameplay Performance Handoff - 2026-04-27

## Read First
1. `pax-fluxia/docs/gameplay-performance-findings-and-plan-2026-04-27.md`
2. `.agent/docs/plans/2026-04-27/FEATURE_AND_TASK_QUEUE_2026-04-27.md`

## Start Here Tomorrow
- Run `bun run build`
- Run `bun run debug:browser-gameplay-summary`
- Rerun the 20-minute `distanceFieldGameplay` soak on the newest code:
  - `$env:PAX_BENCH_ONLY='distanceFieldGameplay'`
  - `$env:PAX_BENCH_CAPTURE_TRACE='0'`
  - `$env:PAX_BENCH_CAPTURE_CPU='0'`
  - `$env:PAX_BENCH_GAMEPLAY_FRAME_MS='1200000'`
  - `$env:PAX_BENCH_TIMEOUT_MS='1500000'`
  - `bun run debug:browser-gameplay-perf`

## Inspect First
- `avgFrameMs`
- `p95FrameMs`
- `longTasks.maxMs`
- `game.renderFrame.ships`
- `game.renderFrame.ships.orbitals`
- `game.renderFrame.interactionOverlay`
- `frameSpikeDiagnostics.avgUnattributedGapMs`
- `frameSpikeDiagnostics.maxUnattributedGapMs`
- `frameSpikeDiagnostics.fullyUnattributedSpikeCount`

## Next Code Target If The Soak Still Fails
- `pax-fluxia/src/lib/renderers/ShipRenderer.ts`
- Hoist attack-surge timing math fully to the per-star level instead of recomputing the same timing envelope per ship.
- Decide whether star-glow behavior should participate in the pressure LOD path and instrument it explicitly if changed.

## Diagnostics Follow-Up
- Export one real conquest diagnostic bundle and inspect `debug/diagnostic.json`.
- Confirm the `O01` through `R04` capture order and `checks` / `failIf` payloads on live output.
- Verify the saved-map lane count versus runtime connection count mismatch directly in code.
