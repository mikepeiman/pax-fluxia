# Takeaways - 2026-04-28

## Pending
- The client-only `pax-fluxia/` build is the reliable validation target for this lane right now. The repo-root workspace build still fails in `pax-server` for an unrelated Bun/browser bundling issue.
- The fresh 20-minute pre-patch soak improved yesterday's late-game result enough to restore `p95` to `16.8ms`, which confirmed the interaction-overlay churn fix held in long-run conditions.
- The ship follow-up that cached orbit slot direction and radius data, plus a small phase-amplitude lookup table, produced another meaningful improvement:
  - `17.516ms avg` -> `17.127ms avg`
  - `3388` -> `1862` frames over `33ms`
- The remaining late-game failure is no longer a clear measured hot loop. Current misses are dominated by fully unattributed `50ms - 83ms` frame stalls, so the next lane needs better browser-level attribution or a different steady-state scene cost target.
- Star presentation remains the cleanest next measured scene-layer candidate once the current ship pass is checkpointed:
  - `game.renderFrame.stars`: `0.968ms avg`
  - `game.renderFrame.stars.labels`: `0.630ms avg`
