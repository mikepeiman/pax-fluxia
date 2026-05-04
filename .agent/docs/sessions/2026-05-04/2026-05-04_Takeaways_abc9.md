# Takeaways - 2026-05-04

- The right product direction is `regional ambient signature FX`, not more conquest spectacle.
- Region ambience must stay presentation-only and must consume existing territory truth.
- The repo already has two useful VFX seams:
  - global `FXRegistry` / `FXOrchestrator`
  - territory-local `TerritoryVFXBridge` / `VFXBus`
- The mixed territory runtime means phase 1 should target shared presentation seams first and avoid bespoke support for every direct legacy renderer.
- Frontier treatment is the highest identity-per-cost layer; particles should come later and stay sparse.
- Single-clock discipline still applies: ambient motion must use game time, not raw wall time.
