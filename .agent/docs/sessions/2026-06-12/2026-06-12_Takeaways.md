# Takeaways - 2026-06-12

- A visible transition-data path is not enough; frame-to-frame timing must also be stable across preview and active transition ownership.
- Star glow is a separate presentation surface from territory fill. It needs explicit transition input rather than relying on delayed owner state.
- Pending conquest preview state must keep a stable first-seen time when pre-consume frames repeat.
- Conquest transition visuals must share the same duration source unless a separate user-facing control explicitly says otherwise.
- A transition terminal frame must use the same coordinate, sizing, offset, and seed path as the settled NEXT frame.
- Grid Gradient performance jank is dominated by synchronous plan/classification work, not shader draw work; major fixes should move planning off the main thread and then replace per-cell point-in-polygon classification.
- Grid Gradient plan performance needs two layers: off-thread planning to protect animation frames, and typed/raster classification to reduce the plan work itself.
- Transition worker commits must keep the original conquest start time and duration; starting at commit time would desynchronize conquest visuals.
- Existing diagnostics should show worker scheduling, classifier path, cache hits, and build splits so performance claims can be checked from the UI.
