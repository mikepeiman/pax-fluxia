# Takeaways - 2026-05-04

- The right product direction is `regional ambient signature FX`, not more conquest spectacle.
- Region ambience must stay presentation-only and must consume existing territory truth.
- The repo already has two useful VFX seams:
  - global `FXRegistry` / `FXOrchestrator`
  - territory-local `TerritoryVFXBridge` / `VFXBus`
- The mixed territory runtime means phase 1 should target shared presentation seams first and avoid bespoke support for every direct legacy renderer.
- Frontier treatment is the highest identity-per-cost layer; particles should come later and stay sparse.
- Single-clock discipline still applies: ambient motion must use game time, not raw wall time.
- The same `BackgroundSelection` contract now drives both menu and gameplay, which keeps mode policy out of `MainMenu.svelte` and `GameCanvas.svelte`.
- The gameplay presenter can stay cheap if it consumes canonical/render-family geometry directly and renders below territory presentation instead of forking the territory pipeline.
- Config sync was a real integration risk: preserving live background selections through `panelSync` and `GameSettingsPanel.svelte` matters as much as the renderers themselves.
