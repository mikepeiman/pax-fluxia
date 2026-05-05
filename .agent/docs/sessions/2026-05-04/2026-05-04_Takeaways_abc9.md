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
- Shared tunables must have visible renderer consequences or they become fake knobs; `animationSpeed`, `scale`, `edgeSoftness`, and `vignette` now need to be treated as first-class rendering inputs, not metadata.
- The repo's file-discipline rule mattered immediately once all 8 gameplay modes landed; splitting the presenter into focused runtime modules was the right correction instead of normalizing an 800-line renderer file.
- The capability matrix only becomes trustworthy once the UI and runtime both enforce it; leaving it as catalog metadata would have preserved the same ambiguity the feature was meant to remove.
- Runtime-scope drift is easiest to introduce during “hardening” passes; the capability matrix has to be checked against the agreed render-mode target list before expanding support.
- A backward-compatible default can make a feature look nonexistent. If the default path preserves old behavior, the UI must visibly advertise the new behavior and give the user a direct activation path.
- Wide control ranges require wide render math. If the slider metadata grows but the renderer still clamps to `0..1`, the product lies about its actual tuning range.
