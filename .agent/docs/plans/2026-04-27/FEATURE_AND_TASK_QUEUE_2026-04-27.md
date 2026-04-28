# Feature And Task Queue - 2026-04-27

## Completed Today
- Extended the canonical gameplay benchmark to cover `metaball_grid`, `distance_field`, `vs_pvv3`, and `pixel` on a fixed saved map target.
- Upgraded transition diagnostics to the `pv-transition-diagnostics-v1` bundle shape with ordered `O01` through `R04` steps.
- Moved the `vs_pvv3` FG2 gate behind invalidation.
- Replaced `pixel` texture recreation with persistent resources.
- Added lane redraw caching.
- Split star visual and label measures.
- Added idle-cadence-aware star presentation throttling.
- Added interaction-overlay render-key caching.
- Added adaptive ship-pressure LOD plus richer ship diagnostics.
- Refreshed the permanent report in `pax-fluxia/docs/gameplay-performance-findings-and-plan-2026-04-27.md`.

## Current Artifacts
- Canonical short suite:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-49-11-967Z.json`
- Canonical screenshots:
  - `.agent-harness/metrics/browser-screenshots/2026-04-28T02-46-09-308Z`
- Latest 20-minute soak:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T02-36-41-475Z.json`
- Earlier comparison soak:
  - `.agent-harness/metrics/browser-gameplay-benchmark-2026-04-28T01-56-47-258Z.json`

## Carry-Over
- Rerun the 20-minute `distanceFieldGameplay` soak on the newest code, because the last soak predates the overlay render-key cache.
- Inspect the new soak for:
  - `avgFrameMs`
  - `p95FrameMs`
  - `longTasks.maxMs`
  - `game.renderFrame.ships`
  - `game.renderFrame.ships.orbitals`
  - `game.renderFrame.interactionOverlay`
  - frame-spike unattributed-gap metrics
- Validate one real conquest diagnostic bundle and inspect `debug/diagnostic.json`.
- Verify the `172 stars / 214 lanes / 428 runtime connections` mismatch directly in code.
- If the soak still fails, take the next ship-side win in `pax-fluxia/src/lib/renderers/ShipRenderer.ts` by hoisting attack-surge timing math fully to the per-star level.
